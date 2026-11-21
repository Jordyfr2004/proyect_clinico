<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;

class PlantillaReceta extends Model
{
    use HasUuids;

    protected $table = 'plantillas_receta';

    protected $fillable = [
        'nombre',
        'medicamentos',
        'indicaciones',
        'activo',
    ];

    protected function casts(): array
    {
        return [
            'medicamentos' => 'array',
            'activo' => 'boolean',
        ];
    }
}
