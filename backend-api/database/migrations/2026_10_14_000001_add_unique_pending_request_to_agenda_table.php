<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        DB::statement(<<<'SQL'
            CREATE UNIQUE INDEX agenda_paciente_pendiente_unico
            ON agenda (paciente_id)
            WHERE tipo = 'cita_medica' AND estado = 'pendiente'
            SQL);
    }

    public function down(): void
    {
        DB::statement('DROP INDEX agenda_paciente_pendiente_unico');
    }
};
