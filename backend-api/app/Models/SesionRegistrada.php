<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class SesionRegistrada extends Model
{
    use HasFactory, HasUuids;

    protected $table = 'sesiones_registradas';

    protected $fillable = [
        'user_id',
        'usuario',
        'rol',
        'accion',
    ];

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}
