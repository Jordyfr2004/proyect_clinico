<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('agenda', function (Blueprint $table) {
            $table->uuid('id')->primary();

            $table->foreignUuid('paciente_id')
                ->nullable()
                ->constrained('pacientes')
                ->cascadeOnDelete();

            $table->date('fecha')->nullable();

            $table->time('hora_inicio')->nullable();

            $table->time('hora_fin')->nullable();

            $table->string('tipo');

            $table->text('descripcion')->nullable();

            $table->string('estado')->nullable();

            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('agenda');
    }
};