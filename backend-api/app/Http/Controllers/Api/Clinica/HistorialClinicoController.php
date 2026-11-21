<?php

namespace App\Http\Controllers\Api\Clinica;

use App\Http\Controllers\Controller;
use App\Services\HistorialClinicoService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class HistorialClinicoController extends Controller
{
    public function __construct(
        private HistorialClinicoService $historialClinicoService
    ) {
    }

    public function index(): JsonResponse
    {
        $historiales = $this
            ->historialClinicoService
            ->listar();

        return response()->json([
            'data' => $historiales,
        ]);
    }

    public function porPaciente(
        string $pacienteId
    ): JsonResponse {
        $historial = $this
            ->historialClinicoService
            ->obtenerPorPaciente($pacienteId);

        if (!$historial) {
            return response()->json([
                'message' => 'El paciente no tiene historial clínico registrado.',
            ], 404);
        }

        return response()->json([
            'data' => $historial,
        ]);
    }

    public function show(
        string $id
    ): JsonResponse {
        $historial = $this
            ->historialClinicoService
            ->obtenerPorId($id);

        if (!$historial) {
            return response()->json([
                'message' => 'Historial clínico no encontrado.',
            ], 404);
        }

        return response()->json([
            'data' => $historial,
        ]);
    }

    public function store(
        Request $request
    ): JsonResponse {
        $datos = $request->validate([
            'paciente_id' => [
                'required',
                'uuid',
                'exists:pacientes,id',
                'unique:historiales_clinicos,paciente_id',
            ],
            'sexo' => [
                'nullable',
                'string',
                'max:255',
            ],
            'lugar_nacimiento' => [
                'nullable',
                'string',
                'max:255',
            ],
            'antecedentes_enfermedades' => [
                'nullable',
                'string',
            ],
            'cirugias' => [
                'nullable',
                'string',
            ],
            'medicacion_actual' => [
                'nullable',
                'string',
            ],
        ]);

        $historial = $this
            ->historialClinicoService
            ->crear(
                $datos,
                $request->user()
            );

        return response()->json([
            'message' => 'Historial clínico registrado correctamente.',
            'data' => $historial,
        ], 201);
    }

    public function update(
        Request $request,
        string $id
    ): JsonResponse {
        $datos = $request->validate([
            'sexo' => [
                'sometimes',
                'nullable',
                'string',
                'max:255',
            ],
            'lugar_nacimiento' => [
                'sometimes',
                'nullable',
                'string',
                'max:255',
            ],
            'antecedentes_enfermedades' => [
                'sometimes',
                'nullable',
                'string',
            ],
            'cirugias' => [
                'sometimes',
                'nullable',
                'string',
            ],
            'medicacion_actual' => [
                'sometimes',
                'nullable',
                'string',
            ],
        ]);

        $historial = $this
            ->historialClinicoService
            ->actualizar(
                $id,
                $datos,
                $request->user()
            );

        if (!$historial) {
            return response()->json([
                'message' => 'Historial clínico no encontrado.',
            ], 404);
        }

        return response()->json([
            'message' => 'Historial clínico actualizado correctamente.',
            'data' => $historial,
        ]);
    }

    public function miHistorial(
        Request $request
    ): JsonResponse {
        $user = $request->user();

        if (!$user->paciente_id) {
            return response()->json([
                'message' => 'La cuenta no está vinculada a un paciente.',
            ], 404);
        }

        $historial = $this
            ->historialClinicoService
            ->obtenerMiHistorial($user);

        if (!$historial) {
            return response()->json([
                'message' => 'No tienes un historial clínico registrado.',
            ], 404);
        }

        return response()->json([
            'data' => $historial,
        ]);
    }
}