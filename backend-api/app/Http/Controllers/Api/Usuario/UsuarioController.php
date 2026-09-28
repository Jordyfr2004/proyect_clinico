<?php

namespace App\Http\Controllers\Api\Usuario;

use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;

class UsuarioController extends Controller
{
    public function index(): JsonResponse
    {
        return response()->json([
            'message' => 'Listado de usuarios'
        ]);
    }

    public function show($id): JsonResponse
    {
        return response()->json([
            'message' => 'Información del usuario',
            'id' => $id
        ]);
    }

    public function store(): JsonResponse
    {
        return response()->json([
            'message' => 'Crear usuario'
        ]);
    }

    public function update($id): JsonResponse
    {
        return response()->json([
            'message' => 'Actualizar usuario',
            'id' => $id
        ]);
    }

    public function destroy($id): JsonResponse
    {
        return response()->json([
            'message' => 'Eliminar usuario',
            'id' => $id
        ]);
    }
}
