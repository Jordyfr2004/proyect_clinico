<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class AccionRegistrada extends Model
{
    use HasFactory, HasUuids;

    protected $table = 'acciones_registradas';

    protected $fillable = [
        'user_id',
        'usuario',
        'rol',
        'modulo',
        'accion',
        'detalle',
        'visible',
    ];

    protected function casts(): array
    {
        return [
            'visible' => 'boolean',
        ];
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}
