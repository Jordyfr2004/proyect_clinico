<?php

namespace App\Http\Controllers\Api\Clinica;

use App\Http\Controllers\Controller;
use App\Models\Odontograma;
use App\Models\Paciente;
use App\Services\AuditoriaService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class OdontogramaController extends Controller
{
    public function porPaciente(string $pacienteId): JsonResponse
    {
        $paciente = Paciente::find($pacienteId);

        if (!$paciente) {
            return response()->json([
                'message' => 'Paciente no encontrado.',
            ], 404);
        }

        $odontograma = Odontograma::where(
            'paciente_id',
            $pacienteId
        )->first();

        return response()->json([
            'paciente' => [
                'id' => $paciente->id,
                'codigo_paciente' => $paciente->codigo_paciente,
                'nombres' => $paciente->nombres,
            ],
            'odontograma' => $odontograma,
        ]);
    }

    public function guardar(
        Request $request,
        string $pacienteId
    ): JsonResponse {
        $paciente = Paciente::find($pacienteId);

        if (!$paciente) {
            return response()->json([
                'message' => 'Paciente no encontrado.',
            ], 404);
        }

        $datos = $request->validate([
            'datos' => [
                'required',
                'array',
            ],
        ]);

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

        $user = $request->user();

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

        return response()->json([
            'message' => 'Odontograma guardado correctamente.',
            'data' => $odontograma,
        ]);
    }

    public function eliminarDatos(
        Request $request,
        string $pacienteId
    ): JsonResponse {
        $paciente = Paciente::find($pacienteId);

        if (!$paciente) {
            return response()->json([
                'message' => 'Paciente no encontrado.',
            ], 404);
        }

        $odontograma = Odontograma::where(
            'paciente_id',
            $pacienteId
        )->first();

        if (!$odontograma) {
            return response()->json([
                'message' => 'El paciente no tiene un odontograma registrado.',
            ], 404);
        }

        $odontograma->delete();

        AuditoriaService::registrarAccion(
            $request->user(),
            'odontograma',
            'eliminar',
            "Eliminaste el odontograma del paciente {$paciente->codigo_paciente}."
        );

        return response()->json([
            'message' => 'Odontograma eliminado correctamente.',
        ]);
    }
}