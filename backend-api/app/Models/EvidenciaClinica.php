<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class EvidenciaClinica extends Model
{
    use HasFactory, HasUuids;

    protected $table = 'evidencias_clinicas';

    protected $fillable = [
        'paciente_id',
        'tipo',
        'nombre_archivo',
        'ruta_archivo',
        'mime_type',
        'tamano',
        'descripcion',
        'fecha',
        'subido_por_id',
    ];

    protected function casts(): array
    {
        return [
            'fecha' => 'date:Y-m-d',
            'tamano' => 'integer',
        ];
    }

    public function paciente(): BelongsTo
    {
        return $this->belongsTo(Paciente::class);
    }

    public function subidoPor(): BelongsTo
    {
        return $this->belongsTo(User::class, 'subido_por_id')
            ->select(['id', 'name', 'role']);
    }
}