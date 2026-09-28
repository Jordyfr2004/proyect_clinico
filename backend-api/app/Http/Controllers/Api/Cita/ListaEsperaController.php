<?php

namespace App\Http\Controllers\Api\Cita;

use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;

class ListaEsperaController extends Controller
{
    public function index(): JsonResponse
    {
        return response()->json([
            'message' => 'Listado de pacientes en espera'
        ]);
    }

    public function store(): JsonResponse
    {
        return response()->json([
            'message' => 'Paciente agregado a la lista de espera'
        ], 201);
    }

    public function destroy($id): JsonResponse
    {
        return response()->json([
            'message' => 'Paciente retirado de la lista de espera',
            'id' => $id
        ]);
    }
}