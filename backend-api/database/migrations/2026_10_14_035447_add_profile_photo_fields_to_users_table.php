<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->string('foto_perfil_ruta')->nullable();
            $table->string('foto_perfil_nombre')->nullable();
            $table->string('foto_perfil_mime')->nullable();
            $table->unsignedBigInteger('foto_perfil_tamano')->nullable();
        });
    }

    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropColumn([
                'foto_perfil_ruta',
                'foto_perfil_nombre',
                'foto_perfil_mime',
                'foto_perfil_tamano',
            ]);
        });
    }
};
