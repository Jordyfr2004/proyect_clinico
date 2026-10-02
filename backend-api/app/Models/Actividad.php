<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Actividad extends Model
{
    use HasFactory, HasUuids;

    protected $table = 'actividades';

    protected $fillable = [
        'paciente_id',
        'fecha',
        'actividad',
        'precio',
    ];

    public function paciente(): BelongsTo
    {
        return $this->belongsTo(Paciente::class);
    }

    protected function casts(): array
    {
        return [
            'fecha' => 'date:Y-m-d',
            'precio' => 'decimal:2',
        ];
    }
}
