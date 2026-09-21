<?php

namespace App\Http\Controllers\Api\Inventario;

use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;

class MovimientoInventarioController extends Controller
{
    public function index(): JsonResponse
    {
        return response()->json([
            'message' => 'Listado de movimientos de inventario'
        ]);
    }

    public function porInsumo($insumoId): JsonResponse
    {
        return response()->json([
            'message' => 'Movimientos del insumo',
            'insumo_id' => $insumoId
        ]);
    }

    public function show($id): JsonResponse
    {
        return response()->json([
            'message' => 'Información del movimiento de inventario',
            'id' => $id
        ]);
    }

    public function store(): JsonResponse
    {
        return response()->json([
            'message' => 'Movimiento de inventario registrado'
        ], 201);
    }
}

