<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Tablas cuyos cambios quedan registrados con su valor anterior y nuevo.
     */
    public const TABLAS = [
        'seguridad.users',
        'clinica.pacientes',
        'clinica.historiales_clinicos',
        'clinica.odontogramas',
        'clinica.evidencias_clinicas',
        'clinica.recetas',
        'clinica.plantillas_receta',
        'citas.agenda',
        'finanzas.actividades',
        'finanzas.egresos',
        'catalogo.categorias_servicios',
        'catalogo.servicios_consultorio',
    ];

    public function up(): void
    {
        if (DB::getDriverName() !== 'pgsql') {
            return;
        }

        DB::unprepared(<<<'SQL'
            CREATE TABLE auditoria.registro_cambios (
                id bigserial PRIMARY KEY,
                fecha timestamptz NOT NULL DEFAULT now(),
                esquema text NOT NULL,
                tabla text NOT NULL,
                operacion text NOT NULL CHECK (operacion IN ('INSERT', 'UPDATE', 'DELETE')),
                registro_id text,
                -- Quién y desde dónde: lo envía el backend en cada petición autenticada.
                usuario_id uuid,
                ip text,
                request_id text,
                instancia text,
                campos_modificados text[],
                datos_anteriores jsonb,
                datos_nuevos jsonb
            );

            CREATE INDEX registro_cambios_registro_idx ON auditoria.registro_cambios (tabla, registro_id);
            CREATE INDEX registro_cambios_usuario_idx ON auditoria.registro_cambios (usuario_id, fecha);
            CREATE INDEX registro_cambios_fecha_idx ON auditoria.registro_cambios (fecha);

            CREATE OR REPLACE FUNCTION auditoria.registrar_cambio() RETURNS trigger
            LANGUAGE plpgsql AS $$
            DECLARE
                -- Nunca se guardan credenciales en el historial.
                ocultos text[] := ARRAY['password', 'remember_token', 'token'];
                anterior jsonb;
                nuevo jsonb;
                modificados text[];
            BEGIN
                IF TG_OP <> 'INSERT' THEN anterior := to_jsonb(OLD); END IF;
                IF TG_OP <> 'DELETE' THEN nuevo := to_jsonb(NEW); END IF;

                IF TG_OP = 'UPDATE' THEN
                    -- Se compara la fila completa: un cambio de contraseña se registra
                    -- (aparece "password" en campos_modificados) aunque no se guarde su valor.
                    SELECT array_agg(clave ORDER BY clave) INTO modificados
                    FROM jsonb_object_keys(nuevo) AS clave
                    WHERE clave <> 'updated_at' AND nuevo -> clave IS DISTINCT FROM anterior -> clave;

                    -- Guardar sin cambios reales (solo updated_at) solo llenaría el historial.
                    IF modificados IS NULL THEN RETURN NULL; END IF;
                END IF;

                anterior := anterior - ocultos;
                nuevo := nuevo - ocultos;

                INSERT INTO auditoria.registro_cambios
                    (esquema, tabla, operacion, registro_id, usuario_id, ip, request_id, instancia,
                     campos_modificados, datos_anteriores, datos_nuevos)
                VALUES (
                    TG_TABLE_SCHEMA, TG_TABLE_NAME, TG_OP,
                    COALESCE(nuevo ->> 'id', anterior ->> 'id'),
                    NULLIF(current_setting('clinica.usuario_id', true), '')::uuid,
                    NULLIF(current_setting('clinica.ip', true), ''),
                    NULLIF(current_setting('clinica.request_id', true), ''),
                    NULLIF(current_setting('clinica.instancia', true), ''),
                    modificados, anterior, nuevo
                );

                RETURN NULL;
            END;
            $$;

            -- El historial solo admite inserciones: nadie puede alterarlo ni borrarlo.
            CREATE OR REPLACE FUNCTION auditoria.impedir_modificacion() RETURNS trigger
            LANGUAGE plpgsql AS $$
            BEGIN
                RAISE EXCEPTION 'El registro de auditoría no se puede modificar ni eliminar';
            END;
            $$;

            CREATE TRIGGER registro_cambios_inmutable
                BEFORE UPDATE OR DELETE ON auditoria.registro_cambios
                FOR EACH ROW EXECUTE FUNCTION auditoria.impedir_modificacion();

            CREATE TRIGGER registro_cambios_sin_truncate
                BEFORE TRUNCATE ON auditoria.registro_cambios
                FOR EACH STATEMENT EXECUTE FUNCTION auditoria.impedir_modificacion();
            SQL);

        foreach (self::TABLAS as $tabla) {
            DB::statement(
                "CREATE TRIGGER trazabilidad AFTER INSERT OR UPDATE OR DELETE ON {$tabla}
                 FOR EACH ROW EXECUTE FUNCTION auditoria.registrar_cambio()"
            );
        }
    }

    public function down(): void
    {
        if (DB::getDriverName() !== 'pgsql') {
            return;
        }

        foreach (self::TABLAS as $tabla) {
            DB::statement("DROP TRIGGER IF EXISTS trazabilidad ON {$tabla}");
        }

        DB::unprepared(<<<'SQL'
            DROP TABLE IF EXISTS auditoria.registro_cambios;
            DROP FUNCTION IF EXISTS auditoria.registrar_cambio();
            DROP FUNCTION IF EXISTS auditoria.impedir_modificacion();
            SQL);
    }
};
