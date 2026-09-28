<?php

namespace App\Http\Controllers\Api\Cita;

use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;

class CitaController extends Controller
{
    public function index(): JsonResponse
    {
        return response()->json([
            'message' => 'Listado de citas'
        ]);
    }

    public function show($id): JsonResponse
    {
        return response()->json([
            'message' => 'Información de la cita',
            'id' => $id
        ]);
    }

    public function store(): JsonResponse
    {
        return response()->json([
            'message' => 'Cita registrada'
        ], 201);
    }

    public function reprogramar($id): JsonResponse
    {
        return response()->json([
            'message' => 'Reprogramar cita',
            'id' => $id
        ]);
    }

    public function cancelar($id): JsonResponse
    {
        return response()->json([
            'message' => 'Cancelar cita',
            'id' => $id
        ]);
    }

    public function confirmar($id): JsonResponse
    {
        return response()->json([
            'message' => 'Confirmar asistencia a la cita',
            'id' => $id
        ]);
    }
}
