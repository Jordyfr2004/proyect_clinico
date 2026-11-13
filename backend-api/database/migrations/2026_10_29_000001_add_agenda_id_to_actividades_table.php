<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('actividades', function (Blueprint $table) {
            $table->foreignUuid('agenda_id')->nullable()->unique()
                ->constrained('agenda')->nullOnDelete();
        });
    }

    public function down(): void
    {
        Schema::table('actividades', function (Blueprint $table) {
            $table->dropForeign(['agenda_id']);
            $table->dropUnique(['agenda_id']);
            $table->dropColumn('agenda_id');
        });
    }
};
