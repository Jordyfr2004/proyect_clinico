<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('sesiones_registradas', function (Blueprint $table) {
            $table->uuid('id')->primary();

            $table->foreignUuid('user_id')
                ->nullable()
                ->constrained('users')
                ->nullOnDelete();

            $table->string('usuario');
            $table->string('rol');

            $table->string('accion');

            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('sesiones_registradas');
    }
};
