<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class ServicioConsultorio extends Model
{
    use HasFactory, HasUuids;

    protected $table = 'servicios_consultorio';

    protected $fillable = [
        'categoria_id',
        'nombre',
        'descripcion',
        'imagen',
        'precio',
        'duracion_minutos',
        'activo',
    ];

    protected $casts = [
        'precio' => 'decimal:2',
        'duracion_minutos' => 'integer',
        'activo' => 'boolean',
    ];

    public function categoria()
    {
        return $this->belongsTo(
            CategoriaServicio::class,
            'categoria_id'
        );
    }
}
