<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Receta extends Model
{
    use HasUuids;

    protected $table = 'recetas';

    protected $fillable = [
        'paciente_id',
        'agenda_id',
        'emitida_por_id',
        'fecha',
        'diagnostico',
        'medicamentos',
        'indicaciones',
    ];

    protected function casts(): array
    {
        return [
            'fecha' => 'date:Y-m-d',
            'medicamentos' => 'array',
        ];
    }

    public function paciente(): BelongsTo
    {
        return $this->belongsTo(Paciente::class)
            ->select(['id', 'codigo_paciente', 'nombres', 'cedula']);
    }

    public function emitidaPor(): BelongsTo
    {
        return $this->belongsTo(User::class, 'emitida_por_id')
            ->select(['id', 'name', 'role']);
    }
}
