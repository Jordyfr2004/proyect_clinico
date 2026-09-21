<?php

namespace App\Http\Controllers\Api\Clinica;

use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;

class TratamientoController extends Controller
{
    public function index(): JsonResponse
    {
        return response()->json([
            'message' => 'Listado de tratamientos'
        ]);
    }

    public function porPaciente($pacienteId): JsonResponse
    {
        return response()->json([
            'message' => 'Tratamientos del paciente',
            'paciente_id' => $pacienteId
        ]);
    }

    public function show($id): JsonResponse
    {
        return response()->json([
            'message' => 'Información del tratamiento',
            'id' => $id
        ]);
    }

    public function store(): JsonResponse
    {
        return response()->json([
            'message' => 'Tratamiento registrado'
        ], 201);
    }

    public function update($id): JsonResponse
    {
        return response()->json([
            'message' => 'Tratamiento actualizado',
            'id' => $id
        ]);
    }
}
