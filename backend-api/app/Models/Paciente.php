<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasOne;

class Paciente extends Model
{
    use HasFactory, HasUuids;

    protected $hidden = ['usuario'];

    public function usuario(): HasOne
    {
        return $this->hasOne(User::class)->where('role', 'paciente');
    }

    public function getFotoPerfilUrlAttribute(): ?string
    {
        return $this->usuario?->foto_perfil_url;
    }

    protected $fillable = [
        'codigo_paciente',
        'nombres',
        'cedula',
        'telefono',
        'direccion',
        'fecha_nacimiento',
    ];

    protected function casts(): array
    {
        return [
            'fecha_nacimiento' => 'date',
        ];
    }
}
