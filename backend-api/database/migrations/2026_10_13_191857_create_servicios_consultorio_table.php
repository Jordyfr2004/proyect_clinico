<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('servicios_consultorio', function (Blueprint $table) {
            $table->uuid('id')->primary();

            $table->uuid('categoria_id');

            $table->string('nombre');

            $table->text('descripcion');

            $table->string('imagen')->nullable();

            $table->decimal('precio', 10, 2)->nullable();

            $table->unsignedInteger('duracion_minutos')->nullable();

            $table->boolean('activo')->default(true);

            $table->timestamps();

            $table->foreign('categoria_id')
                ->references('id')
                ->on('categorias_servicios')
                ->restrictOnDelete()
                ->cascadeOnUpdate();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('servicios_consultorio');
    }
};