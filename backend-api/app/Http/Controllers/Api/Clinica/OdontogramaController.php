<?php

namespace App\Http\Controllers\Api\Clinica;

use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;

class OdontogramaController extends Controller
{
    public function porPaciente($pacienteId): JsonResponse
    {
        return response()->json([
            'message' => 'Odontograma del paciente',
            'paciente_id' => $pacienteId
        ]);
    }

    public function show($id): JsonResponse
    {
        return response()->json([
            'message' => 'Información del odontograma',
            'id' => $id
        ]);
    }

    public function store(): JsonResponse
    {
        return response()->json([
            'message' => 'Odontograma registrado'
        ], 201);
    }

    public function update($id): JsonResponse
    {
        return response()->json([
            'message' => 'Odontograma actualizado',
            'id' => $id
        ]);
    }
}