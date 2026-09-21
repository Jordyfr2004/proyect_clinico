<?php

namespace App\Http\Controllers\Api\Paciente;

use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;

class PacienteController extends Controller
{
    public function index(): JsonResponse
    {
        return response()->json([
            'message' => 'Listado de pacientes'
        ]);
    }

    public function show($id): JsonResponse
    {
        return response()->json([
            'message' => 'Información del paciente',
            'id' => $id
        ]);
    }

    public function store(): JsonResponse
    {
        return response()->json([
            'message' => 'Registrar paciente'
        ], 201);
    }

    public function update($id): JsonResponse
    {
        return response()->json([
            'message' => 'Actualizar información del paciente',
            'id' => $id
        ]);
    }
}



