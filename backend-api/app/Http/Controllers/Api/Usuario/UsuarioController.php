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
            'name' => [
                'required',
                'string',
                'max:255',
            ],
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

    public function verAsistente(): JsonResponse
    {
        $asistente = User::where(
            'role',
            'asistente'
        )->first();

        if (!$asistente) {
            return response()->json([
                'message' => 'No existe una cuenta de asistente.',
            ], 404);
        }

        return response()->json([
            'data' => [
                'id' => $asistente->id,
                'name' => $asistente->name,
                'email' => $asistente->email,
                'username' => $asistente->username,
                'role' => $asistente->role,
                'activo' => $asistente->activo,
            ],
        ]);
    }

    public function desactivarAsistente(): JsonResponse
    {
        $asistente = User::where(
            'role',
            'asistente'
        )->first();

        if (!$asistente) {
            return response()->json([
                'message' => 'No existe una cuenta de asistente.',
            ], 404);
        }

        if (!$asistente->activo) {
            return response()->json([
                'message' => 'La cuenta de asistente ya está desactivada.',
            ], 409);
        }

        $asistente->update([
            'activo' => false,
        ]);

        $asistente->tokens()->delete();

        return response()->json([
            'message' => 'Cuenta de asistente desactivada correctamente.',
            'data' => [
                'id' => $asistente->id,
                'name' => $asistente->name,
                'username' => $asistente->username,
                'role' => $asistente->role,
                'activo' => $asistente->activo,
            ],
        ]);
    }

    public function activarAsistente(): JsonResponse
    {
        $asistente = User::where(
            'role',
            'asistente'
        )->first();

        if (!$asistente) {
            return response()->json([
                'message' => 'No existe una cuenta de asistente.',
            ], 404);
        }

        if ($asistente->activo) {
            return response()->json([
                'message' => 'La cuenta de asistente ya está activa.',
            ], 409);
        }

        $asistente->update([
            'activo' => true,
        ]);

        return response()->json([
            'message' => 'Cuenta de asistente activada correctamente.',
            'data' => [
                'id' => $asistente->id,
                'name' => $asistente->name,
                'username' => $asistente->username,
                'role' => $asistente->role,
                'activo' => $asistente->activo,
            ],
        ]);
    }

    public function cambiarPasswordAsistente(Request $request): JsonResponse
    {
        $datos = $request->validate([
            'password' => [
                'required',
                'string',
                'min:8',
                'confirmed',
            ],
        ]);

        $asistente = User::where(
            'role',
            'asistente'
        )->first();

        if (!$asistente) {
            return response()->json([
                'message' => 'No existe una cuenta de asistente.',
            ], 404);
        }

        $asistente->update([
            'password' => $datos['password'],
        ]);

        // Cierra cualquier sesión activa de la asistente
        $asistente->tokens()->delete();

        return response()->json([
            'message' => 'Contraseña de la asistente actualizada correctamente.',
        ]);
    }

    public function eliminarAsistente(): JsonResponse
    {
        $asistente = User::where(
            'role',
            'asistente'
        )->first();

        if (!$asistente) {
            return response()->json([
                'message' => 'No existe una cuenta de asistente.',
            ], 404);
        }

        // Elimina todos sus tokens/sesiones
        $asistente->tokens()->delete();

        // Elimina la cuenta
        $asistente->delete();

        return response()->json([
            'message' => 'Cuenta de asistente eliminada correctamente.',
        ]);
    }
}
