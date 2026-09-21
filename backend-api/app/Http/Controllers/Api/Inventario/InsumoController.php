<?php

namespace App\Http\Controllers\Api\Inventario;

use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;

class InsumoController extends Controller
{
    public function index(): JsonResponse
    {
        return response()->json([
            'message' => 'Listado de insumos'
        ]);
    }

    public function stockBajo(): JsonResponse
    {
        return response()->json([
            'message' => 'Listado de insumos con stock bajo'
        ]);
    }

    public function show($id): JsonResponse
    {
        return response()->json([
            'message' => 'Información del insumo',
            'id' => $id
        ]);
    }

    public function store(): JsonResponse
    {
        return response()->json([
            'message' => 'Insumo registrado'
        ], 201);
    }

    public function update($id): JsonResponse
    {
        return response()->json([
            'message' => 'Insumo actualizado',
            'id' => $id
        ]);
    }
}
