<?php

namespace App\Http\Controllers\Api\Clinica;

use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;

class RecetaController extends Controller
{
    public function porPaciente($pacienteId): JsonResponse
    {
        return response()->json([
            'message' => 'Recetas del paciente',
            'paciente_id' => $pacienteId
        ]);
    }

    public function show($id): JsonResponse
    {
        return response()->json([
            'message' => 'Información de la receta',
            'id' => $id
        ]);
    }

    public function store(): JsonResponse
    {
        return response()->json([
            'message' => 'Receta registrada'
        ], 201);
    }

    public function update($id): JsonResponse
    {
        return response()->json([
            'message' => 'Receta actualizada',
            'id' => $id
        ]);
    }
}
