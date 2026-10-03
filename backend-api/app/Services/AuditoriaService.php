<?php

namespace App\Services;

use App\Models\AccionRegistrada;
use App\Models\SesionRegistrada;
use App\Models\User;

class AuditoriaService
{
    public static function registrarAccion(
        User $user,
        string $modulo,
        string $accion,
        string $detalle
    ): void {
        AccionRegistrada::create([
            'user_id' => $user->id,
            'usuario' => $user->name,
            'rol' => $user->role,
            'modulo' => $modulo,
            'accion' => $accion,
            'detalle' => $detalle,
            'visible' => true,
        ]);
    }

    public static function registrarSesion(
        User $user,
        string $accion
    ): void {
        SesionRegistrada::create([
            'user_id' => $user->id,
            'usuario' => $user->name,
            'rol' => $user->role,
            'accion' => $accion,
        ]);
    }
}