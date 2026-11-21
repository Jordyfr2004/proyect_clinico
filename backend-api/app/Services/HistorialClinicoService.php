<?php

namespace App\Services;

use App\Models\HistorialClinico;
use App\Models\Paciente;
use App\Models\User;
use Illuminate\Support\Facades\DB;

class HistorialClinicoService
{
    public function listar()
    {
        return HistorialClinico::all();
    }

    public function obtenerPorPaciente(
        string $pacienteId
    ): ?HistorialClinico {
        return HistorialClinico::where(
            'paciente_id',
            $pacienteId
        )->first();
    }

    public function obtenerPorId(
        string $id
    ): ?HistorialClinico {
        return HistorialClinico::find($id);
    }

    public function crear(
        array $datos,
        User $user
    ): HistorialClinico {
        return DB::transaction(function () use ($datos, $user) {
            $historial = HistorialClinico::create(
                $datos
            );

            $paciente = Paciente::findOrFail(
                $historial->paciente_id
            );

            AuditoriaService::registrarAccion(
                $user,
                'historial_clinico',
                'crear',
                "Registraste el historial clínico del paciente {$paciente->codigo_paciente}."
            );

            return $historial;
        });
    }

    public function actualizar(
        string $id,
        array $datos,
        User $user
    ): ?HistorialClinico {
        return DB::transaction(function () use ($id, $datos, $user) {
            $historial = HistorialClinico::find($id);

            if (!$historial) {
                return null;
            }

            $historial->update($datos);

            $paciente = Paciente::findOrFail(
                $historial->paciente_id
            );

            AuditoriaService::registrarAccion(
                $user,
                'historial_clinico',
                'actualizar',
                "Actualizaste el historial clínico del paciente {$paciente->codigo_paciente}."
            );

            return $historial->fresh();
        });
    }

    public function obtenerMiHistorial(
        User $user
    ): ?HistorialClinico {
        if (!$user->paciente_id) {
            return null;
        }

        return HistorialClinico::where(
            'paciente_id',
            $user->paciente_id
        )->first();
    }
}