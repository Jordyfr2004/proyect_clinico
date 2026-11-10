<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Quién subió cada archivo, para distinguir los cargados por el paciente
     * desde la app móvil de los cargados por el consultorio.
     */
    public function up(): void
    {
        Schema::table('evidencias_clinicas', function (Blueprint $table) {
            $table->foreignUuid('subido_por_id')
                ->nullable()
                ->constrained('users')
                ->nullOnDelete();
        });
    }

    public function down(): void
    {
        Schema::table('evidencias_clinicas', function (Blueprint $table) {
            $table->dropConstrainedForeignId('subido_por_id');
        });
    }
};
