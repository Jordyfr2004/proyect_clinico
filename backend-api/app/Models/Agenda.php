<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasOne;

class Agenda extends Model
{
    use HasFactory, HasUuids;

    protected $table = 'agenda';

    protected $fillable = [
        'paciente_id',
        'nombre_reserva',
        'fecha',
        'hora_inicio',
        'hora_fin',
        'tipo',
        'descripcion',
        'estado',
        'diagnostico',
        'tratamiento',
        'observacion',
    ];

    protected function casts(): array
    {
        return [
            'fecha' => 'date:Y-m-d',
        ];
    }

    public function paciente(): BelongsTo
    {
        return $this->belongsTo(Paciente::class);
    }

    public function actividad(): HasOne
    {
        return $this->hasOne(Actividad::class);
    }
}
