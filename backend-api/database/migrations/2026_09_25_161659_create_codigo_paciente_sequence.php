<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        // Puede seguir en el esquema "clinica" tras un migrate:fresh (que no borra
        // secuencias sueltas); crearla en "public" haría fallar organizar_esquemas.
        if (DB::getDriverName() === 'pgsql'
            && DB::selectOne("SELECT to_regclass('codigo_paciente_seq') AS existe")->existe) {
            return;
        }

        DB::statement(
            'CREATE SEQUENCE IF NOT EXISTS codigo_paciente_seq START 1'
        );
    }

    public function down(): void
    {
        DB::statement(
            'DROP SEQUENCE IF EXISTS codigo_paciente_seq'
        );
    }
};