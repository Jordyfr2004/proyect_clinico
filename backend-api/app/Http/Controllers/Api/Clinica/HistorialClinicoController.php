<?php

namespace App\Http\Controllers\Api\Clinica;

use App\Http\Controllers\Controller;
use App\Models\HistorialClinico;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class HistorialClinicoController extends Controller
{
    public function index(): JsonResponse
    {
        $historiales = HistorialClinico::all();

        return response()->json([
            'data' => $historiales,
        ]);
    }

    public function porPaciente($pacienteId): JsonResponse
    {
        $historial = HistorialClinico::where(
            'paciente_id',
            $pacienteId
        )->first();

        if (!$historial) {
            return response()->json([
                'message' => 'El paciente no tiene historial clínico registrado.',
            ], 404);
        }

        return response()->json([
            'data' => $historial,
        ]);
    }

    public function show($id): JsonResponse
    {
        $historial = HistorialClinico::find($id);

        if (!$historial) {
            return response()->json([
                'message' => 'Historial clínico no encontrado.',
            ], 404);
        }

        return response()->json([
            'data' => $historial,
        ]);
    }

    public function store(Request $request): JsonResponse
    {
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

        $historial = HistorialClinico::create($datos);

        return response()->json([
            'message' => 'Historial clínico registrado correctamente.',
            'data' => $historial,
        ], 201);
    }

    public function update(
        Request $request,
        $id
    ): JsonResponse {
        $historial = HistorialClinico::find($id);

        if (!$historial) {
            return response()->json([
                'message' => 'Historial clínico no encontrado.',
            ], 404);
        }

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

        $historial->update($datos);

        return response()->json([
            'message' => 'Historial clínico actualizado correctamente.',
            'data' => $historial->fresh(),
        ]);
    }

    public function miHistorial(Request $request): JsonResponse
    {
        $pacienteId = $request->user()->paciente_id;

        if (!$pacienteId) {
            return response()->json([
                'message' => 'La cuenta no está vinculada a un paciente.',
            ], 404);
        }

        $historial = HistorialClinico::where(
            'paciente_id',
            $pacienteId
        )->first();

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