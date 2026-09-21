<?php

namespace App\Http\Controllers\Api\Clinica;

use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;

class RadiografiaController extends Controller
{
    public function porPaciente($pacienteId): JsonResponse
    {
        return response()->json([
            'message' => 'Radiografías del paciente',
            'paciente_id' => $pacienteId
        ]);
    }

    public function show($id): JsonResponse
    {
        return response()->json([
            'message' => 'Información de la radiografía',
            'id' => $id
        ]);
    }

    public function store(): JsonResponse
    {
        return response()->json([
            'message' => 'Radiografía registrada'
        ], 201);
    }

    public function destroy($id): JsonResponse
    {
        return response()->json([
            'message' => 'Radiografía eliminada',
            'id' => $id
        ]);
    }
}
