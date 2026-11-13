<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Odontograma extends Model
{
    use HasFactory, HasUuids;

    protected $fillable = [
        'paciente_id',
        'datos',
    ];

    protected function casts(): array
    {
        return [
            'datos' => 'array',
        ];
    }

    public function paciente(): BelongsTo
    {
        return $this->belongsTo(Paciente::class);
    }
}