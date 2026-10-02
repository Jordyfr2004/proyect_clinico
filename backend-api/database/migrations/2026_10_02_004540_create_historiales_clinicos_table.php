<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('historiales_clinicos', function (Blueprint $table) {
            $table->uuid('id')->primary();

            $table->foreignUuid('paciente_id')
                ->unique()
                ->constrained('pacientes')
                ->cascadeOnDelete();

            $table->string('sexo')->nullable();
            $table->string('lugar_nacimiento')->nullable();

            $table->text('antecedentes_enfermedades')->nullable();
            $table->text('cirugias')->nullable();
            $table->text('medicacion_actual')->nullable();

            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('historiales_clinicos');
    }
};
