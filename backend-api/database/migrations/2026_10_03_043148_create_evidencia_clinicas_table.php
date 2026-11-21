<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('evidencias_clinicas', function (Blueprint $table) {
            $table->uuid('id')->primary();

            $table->foreignUuid('paciente_id')
                ->constrained('pacientes')
                ->cascadeOnDelete();

            $table->string('tipo');

            $table->string('nombre_archivo');

            $table->string('ruta_archivo');

            $table->string('mime_type');

            $table->unsignedBigInteger('tamano');

            $table->text('descripcion')->nullable();

            $table->date('fecha');

            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('evidencias_clinicas');
    }
};