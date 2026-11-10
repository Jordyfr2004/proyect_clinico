<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class HistorialClinico extends Model
{
    use HasFactory, HasUuids;

    protected $table = 'historiales_clinicos';

    protected $fillable = [
        'paciente_id',
        'sexo',
        'lugar_nacimiento',
        'antecedentes_enfermedades',
        'cirugias',
        'medicacion_actual',
    ];
}
