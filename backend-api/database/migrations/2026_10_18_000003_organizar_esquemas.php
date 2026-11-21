<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Esquemas de PostgreSQL por área del sistema. "public" queda solo para las
     * tablas internas de Laravel (migrations, cache, jobs).
     *
     * El código usa los nombres de tabla sin esquema: DB_SEARCH_PATH incluye
     * todos los esquemas. Una tabla nueva se crea en "public" y debe moverse a
     * su esquema en la misma migración (ALTER TABLE ... SET SCHEMA).
     */
    public const ESQUEMAS = [
        'seguridad' => ['users', 'personal_access_tokens', 'password_reset_tokens', 'password_reset_codes', 'sessions'],
        'clinica' => ['pacientes', 'historiales_clinicos', 'odontogramas', 'evidencias_clinicas', 'recetas', 'plantillas_receta'],
        'citas' => ['agenda'],
        'finanzas' => ['actividades', 'egresos'],
        'catalogo' => ['categorias_servicios', 'servicios_consultorio'],
        'auditoria' => ['acciones_registradas', 'sesiones_registradas'],
    ];

    public const SEARCH_PATH = 'public, seguridad, clinica, citas, finanzas, catalogo, auditoria';

    public function up(): void
    {
        if (DB::getDriverName() !== 'pgsql') {
            return;
        }

        foreach (self::ESQUEMAS as $esquema => $tablas) {
            DB::statement("CREATE SCHEMA IF NOT EXISTS {$esquema}");

            foreach ($tablas as $tabla) {
                $this->mover($tabla, $esquema, 'TABLE');
            }
        }

        $this->mover('codigo_paciente_seq', 'clinica', 'SEQUENCE');

        // Para que psql y otras herramientas encuentren las tablas sin escribir el esquema.
        DB::statement('ALTER ROLE CURRENT_USER SET search_path TO '.self::SEARCH_PATH);

        // El esquema "private" de versiones anteriores ya no se usa: se elimina solo si quedó vacío.
        $private = DB::selectOne(
            "SELECT pg_get_userbyid(n.nspowner) = current_user AS propio,
                    NOT EXISTS (SELECT 1 FROM pg_class c WHERE c.relnamespace = n.oid) AS vacio
             FROM pg_namespace n WHERE n.nspname = 'private'"
        );

        if ($private && $private->propio && $private->vacio) {
            DB::statement('DROP SCHEMA private');
        }
    }

    public function down(): void
    {
        if (DB::getDriverName() !== 'pgsql') {
            return;
        }

        foreach (self::ESQUEMAS as $esquema => $tablas) {
            foreach ($tablas as $tabla) {
                $this->mover($tabla, 'public', 'TABLE', $esquema);
            }
        }

        $this->mover('codigo_paciente_seq', 'public', 'SEQUENCE', 'clinica');
    }

    /**
     * Mueve el objeto a $destino desde cualquier esquema donde esté (o desde $origen).
     */
    private function mover(string $nombre, string $destino, string $tipo, ?string $origen = null): void
    {
        $actual = DB::selectOne(
            "SELECT n.nspname AS esquema
             FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
             WHERE c.relname = ? AND c.relkind = ? AND n.nspname <> ?
               AND (?::text IS NULL OR n.nspname = ?)
             LIMIT 1",
            [$nombre, $tipo === 'TABLE' ? 'r' : 'S', $destino, $origen, $origen]
        );

        if ($actual) {
            DB::statement("ALTER {$tipo} \"{$actual->esquema}\".\"{$nombre}\" SET SCHEMA {$destino}");
        }
    }
};
