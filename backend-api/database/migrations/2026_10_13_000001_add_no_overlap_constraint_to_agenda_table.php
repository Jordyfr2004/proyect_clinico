<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        DB::statement(<<<'SQL'
            ALTER TABLE agenda
            ADD CONSTRAINT agenda_sin_solapamientos
            EXCLUDE USING gist (
                tsrange(fecha + hora_inicio, fecha + hora_fin, '[)') WITH &&
            )
            WHERE (
                fecha IS NOT NULL
                AND hora_inicio IS NOT NULL
                AND hora_fin IS NOT NULL
                AND (
                    tipo = 'personal'
                    OR (tipo = 'cita_medica' AND estado IN ('programada', 'completada'))
                )
            )
            SQL);
    }

    public function down(): void
    {
        DB::statement('ALTER TABLE agenda DROP CONSTRAINT agenda_sin_solapamientos');
    }
};
