<?php

namespace App\Http\Controllers\Api\Clinica;

use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;

class HistorialClinicoController extends Controller
{
    public function index(): JsonResponse
    {
        return response()->json([
            'message' => 'Listado de historiales clínicos'
        ]);
    }

    public function porPaciente($pacienteId): JsonResponse
    {
        return response()->json([
            'message' => 'Historial clínico del paciente',
            'paciente_id' => $pacienteId
        ]);
    }

    public function show($id): JsonResponse
    {
        return response()->json([
            'message' => 'Información del historial clínico',
            'id' => $id
        ]);
    }

    public function store(): JsonResponse
    {
        return response()->json([
            'message' => 'Historial clínico registrado'
        ], 201);
    }

    public function update($id): JsonResponse
    {
        return response()->json([
            'message' => 'Historial clínico actualizado',
            'id' => $id
        ]);
    }
}