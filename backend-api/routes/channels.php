<?php

use App\Models\User;
use Illuminate\Support\Facades\Broadcast;

Broadcast::channel('clinica.doctora', function (User $user) {
    return $user->role === 'doctora'
        && $user->activo;
});

Broadcast::channel('paciente.{pacienteId}', function (
    User $user,
    string $pacienteId
) {
    return $user->role === 'paciente'
        && $user->activo
        && (string) $user->paciente_id === $pacienteId;
});
