<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // Plantillas reutilizables (por ejemplo "Post extracción") que la doctora aplica al recetar.
        Schema::create('plantillas_receta', function (Blueprint $table) {
            $table->uuid('id')->primary();

            $table->string('nombre')->unique();

            // Lista de medicamentos: [{nombre, dosis, frecuencia, duracion, indicaciones}]
            $table->json('medicamentos');

            $table->text('indicaciones')->nullable();

            $table->boolean('activo')->default(true);

            $table->timestamps();
        });

        Schema::create('recetas', function (Blueprint $table) {
            $table->uuid('id')->primary();

            $table->foreignUuid('paciente_id')
                ->constrained('pacientes')
                ->cascadeOnDelete();

            // Cita en la que se emitió (opcional).
            $table->foreignUuid('agenda_id')
                ->nullable()
                ->constrained('agenda')
                ->nullOnDelete();

            $table->foreignUuid('emitida_por_id')
                ->nullable()
                ->constrained('users')
                ->nullOnDelete();

            $table->date('fecha');

            $table->text('diagnostico')->nullable();

            $table->json('medicamentos');

            $table->text('indicaciones')->nullable();

            $table->timestamps();

            $table->index(['paciente_id', 'fecha']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('recetas');
        Schema::dropIfExists('plantillas_receta');
    }
};
