<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('odontogramas', function (Blueprint $table) {
            $table->uuid('id')->primary();

            $table->foreignUuid('paciente_id')
                ->unique()
                ->constrained('pacientes')
                ->cascadeOnDelete();

            $table->json('datos');

            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('odontogramas');
    }
};