<?php

namespace App\Services;

use App\Models\Odontograma;
use App\Models\Paciente;
use App\Models\User;
use Illuminate\Support\Facades\DB;

class OdontogramaService
{
    public function obtenerPorPaciente(
        string $pacienteId
    ): array {
        $paciente = Paciente::find($pacienteId);

        if (!$paciente) {
            return [
                'paciente' => null,
                'odontograma' => null,
            ];
        }

        $odontograma = Odontograma::where(
            'paciente_id',
            $pacienteId
        )->first();

        return [
            'paciente' => $paciente,
            'odontograma' => $odontograma,
        ];
    }

    public function guardar(
        string $pacienteId,
        array $datos,
        User $user
    ): ?Odontograma {
        return DB::transaction(function () use ($pacienteId, $datos, $user) {
            $paciente = Paciente::find($pacienteId);

            if (!$paciente) {
                return null;
            }

            $odontogramaExistente = Odontograma::where(
                'paciente_id',
                $pacienteId
            )->exists();

            $odontograma = Odontograma::updateOrCreate(
                [
                    'paciente_id' => $pacienteId,
                ],
                [
                    'datos' => $datos['datos'],
                ]
            );

            if ($odontogramaExistente) {
                AuditoriaService::registrarAccion(
                    $user,
                    'odontograma',
                    'actualizar',
                    "Actualizaste el odontograma del paciente {$paciente->codigo_paciente}."
                );
            } else {
                AuditoriaService::registrarAccion(
                    $user,
                    'odontograma',
                    'crear',
                    "Registraste el odontograma del paciente {$paciente->codigo_paciente}."
                );
            }

            return $odontograma;
        });
    }

    public function eliminar(
        string $pacienteId,
        User $user
    ): string {
        return DB::transaction(function () use ($pacienteId, $user) {
            $paciente = Paciente::find($pacienteId);

            if (!$paciente) {
                return 'paciente_no_encontrado';
            }

            $odontograma = Odontograma::where(
                'paciente_id',
                $pacienteId
            )->first();

            if (!$odontograma) {
                return 'odontograma_no_encontrado';
            }

            $odontograma->delete();

            AuditoriaService::registrarAccion(
                $user,
                'odontograma',
                'eliminar',
                "Eliminaste el odontograma del paciente {$paciente->codigo_paciente}."
            );

            return 'eliminado';
        });
    }
}
