<?php

namespace App\Http\Controllers\Api\Clinica;

use App\Http\Controllers\Controller;
use App\Services\OdontogramaService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class OdontogramaController extends Controller
{
    public function __construct(
        private OdontogramaService $odontogramaService
    ) {
    }

    public function porPaciente(
        string $pacienteId
    ): JsonResponse {
        $resultado = $this
            ->odontogramaService
            ->obtenerPorPaciente($pacienteId);

        if (!$resultado['paciente']) {
            return response()->json([
                'message' => 'Paciente no encontrado.',
            ], 404);
        }

        return response()->json([
            'paciente' => [
                'id' => $resultado['paciente']->id,
                'codigo_paciente' =>
                    $resultado['paciente']->codigo_paciente,
                'nombres' =>
                    $resultado['paciente']->nombres,
            ],
            'odontograma' => $resultado['odontograma'],
        ]);
    }

    public function guardar(
        Request $request,
        string $pacienteId
    ): JsonResponse {
        $datos = $request->validate([
            'datos' => [
                'required',
                'array',
            ],
        ]);

        $odontograma = $this
            ->odontogramaService
            ->guardar(
                $pacienteId,
                $datos,
                $request->user()
            );

        if (!$odontograma) {
            return response()->json([
                'message' => 'Paciente no encontrado.',
            ], 404);
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
        $resultado = $this
            ->odontogramaService
            ->eliminar(
                $pacienteId,
                $request->user()
            );

        if ($resultado === 'paciente_no_encontrado') {
            return response()->json([
                'message' => 'Paciente no encontrado.',
            ], 404);
        }

        if ($resultado === 'odontograma_no_encontrado') {
            return response()->json([
                'message' => 'El paciente no tiene un odontograma registrado.',
            ], 404);
        }

        return response()->json([
            'message' => 'Odontograma eliminado correctamente.',
        ]);
    }
}