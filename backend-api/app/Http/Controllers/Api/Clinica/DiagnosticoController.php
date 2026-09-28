<?php

namespace App\Http\Controllers\Api\Clinica;

use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;

class DiagnosticoController extends Controller
{
    public function index(): JsonResponse
    {
        return response()->json([
            'message' => 'Listado de diagnósticos'
        ]);
    }

    public function porPaciente($pacienteId): JsonResponse
    {
        return response()->json([
            'message' => 'Diagnósticos del paciente',
            'paciente_id' => $pacienteId
        ]);
    }

    public function show($id): JsonResponse
    {
        return response()->json([
            'message' => 'Información del diagnóstico',
            'id' => $id
        ]);
    }

    public function store(): JsonResponse
    {
        return response()->json([
            'message' => 'Diagnóstico registrado'
        ], 201);
    }

    public function update($id): JsonResponse
    {
        return response()->json([
            'message' => 'Diagnóstico actualizado',
            'id' => $id
        ]);
    }
}