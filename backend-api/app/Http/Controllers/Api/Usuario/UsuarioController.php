<?php

namespace App\Http\Controllers\Api\Usuario;

use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

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

    public function crearAsistente(Request $request): JsonResponse
    {
        $datos = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'email' => [
                'required',
                'email',
                'max:255',
                'unique:users,email',
            ],
            'username' => [
                'required',
                'string',
                'max:255',
                'unique:users,username',
            ],
            'password' => [
                'required',
                'string',
                'min:8',
            ],
        ]);

        $asistenteExistente = User::where(
            'role',
            'asistente'
        )->first();

        if ($asistenteExistente) {
            return response()->json([
                'message' => 'Ya existe una cuenta de asistente registrada.',
            ], 409);
        }

        $asistente = User::create([
            'name' => $datos['name'],
            'email' => $datos['email'],
            'username' => $datos['username'],
            'password' => $datos['password'],
            'role' => 'asistente',
            'paciente_id' => null,
            'activo' => true,
        ]);

        return response()->json([
            'message' => 'Cuenta de asistente creada correctamente.',
            'data' => [
                'id' => $asistente->id,
                'name' => $asistente->name,
                'email' => $asistente->email,
                'username' => $asistente->username,
                'role' => $asistente->role,
                'activo' => $asistente->activo,
            ],
        ], 201);
    }
}
