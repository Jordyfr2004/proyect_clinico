<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('agenda', function (Blueprint $table) {
            $table->text('diagnostico')->nullable();
            $table->text('tratamiento')->nullable();
            $table->text('observacion')->nullable();
        });
    }

    public function down(): void
    {
        Schema::table('agenda', function (Blueprint $table) {
            $table->dropColumn([
                'diagnostico',
                'tratamiento',
                'observacion',
            ]);
        });
    }
};