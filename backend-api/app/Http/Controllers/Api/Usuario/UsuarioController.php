<?php

namespace App\Http\Controllers\Api\Usuario;

use App\Http\Controllers\Controller;
use App\Models\Paciente;
use App\Models\User;
use App\Services\AuditoriaService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class UsuarioController extends Controller
{
    public function index(): JsonResponse
    {
        $usuarios = User::query()
            ->select([
                'id',
                'name',
                'email',
                'username',
                'role',
                'paciente_id',
                'activo',
                'created_at',
            ])
            ->orderBy('created_at', 'desc')
            ->get();

        return response()->json([
            'data' => $usuarios,
        ]);
    }

    public function show($id): JsonResponse
    {
        $usuario = User::find($id);

        if (!$usuario) {
            return response()->json([
                'message' => 'Usuario no encontrado.',
            ], 404);
        }

        return response()->json([
            'data' => [
                'id' => $usuario->id,
                'name' => $usuario->name,
                'email' => $usuario->email,
                'username' => $usuario->username,
                'role' => $usuario->role,
                'paciente_id' => $usuario->paciente_id,
                'activo' => $usuario->activo,
                'created_at' => $usuario->created_at,
            ],
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

        AuditoriaService::registrarAccion(
            $request->user(),
            'usuarios',
            'crear_asistente',
            "Creaste la cuenta del asistente {$asistente->name}."
        );

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

    public function desactivarAsistente(
        Request $request
    ): JsonResponse {
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

        AuditoriaService::registrarAccion(
            $request->user(),
            'usuarios',
            'desactivar_asistente',
            "Desactivaste la cuenta del asistente {$asistente->name}."
        );

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

    public function activarAsistente(
        Request $request
    ): JsonResponse {
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

        AuditoriaService::registrarAccion(
            $request->user(),
            'usuarios',
            'activar_asistente',
            "Activaste la cuenta del asistente {$asistente->name}."
        );

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

    public function cambiarPasswordAsistente(
        Request $request
    ): JsonResponse {
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

        $asistente->tokens()->delete();

        AuditoriaService::registrarAccion(
            $request->user(),
            'usuarios',
            'cambiar_password_asistente',
            "Cambiaste la contraseña del asistente {$asistente->name}."
        );

        return response()->json([
            'message' => 'Contraseña de la asistente actualizada correctamente.',
        ]);
    }

    public function eliminarAsistente(
        Request $request
    ): JsonResponse {
        $asistente = User::where(
            'role',
            'asistente'
        )->first();

        if (!$asistente) {
            return response()->json([
                'message' => 'No existe una cuenta de asistente.',
            ], 404);
        }

        $nombreAsistente = $asistente->name;

        $asistente->tokens()->delete();

        $asistente->delete();

        AuditoriaService::registrarAccion(
            $request->user(),
            'usuarios',
            'eliminar_asistente',
            "Eliminaste la cuenta del asistente {$nombreAsistente}."
        );

        return response()->json([
            'message' => 'Cuenta de asistente eliminada correctamente.',
        ]);
    }

    public function desactivarUsuario(
        Request $request,
        string $id
    ): JsonResponse {
        $usuario = User::find($id);

        if (!$usuario) {
            return response()->json([
                'message' => 'Usuario no encontrado.',
            ], 404);
        }

        if ($usuario->id === $request->user()->id) {
            return response()->json([
                'message' => 'No puedes desactivar tu propia cuenta.',
            ], 409);
        }

        if (!$usuario->activo) {
            return response()->json([
                'message' => 'La cuenta ya se encuentra desactivada.',
            ], 409);
        }

        $usuario->update([
            'activo' => false,
        ]);

        $usuario->tokens()->delete();

        AuditoriaService::registrarAccion(
            $request->user(),
            'usuarios',
            'desactivar_usuario',
            "Desactivaste la cuenta de {$usuario->name}."
        );

        return response()->json([
            'message' => 'Cuenta desactivada correctamente.',
            'data' => [
                'id' => $usuario->id,
                'name' => $usuario->name,
                'username' => $usuario->username,
                'role' => $usuario->role,
                'paciente_id' => $usuario->paciente_id,
                'activo' => $usuario->activo,
            ],
        ]);
    }

    public function activarUsuario(
        Request $request,
        string $id
    ): JsonResponse {
        $usuario = User::find($id);

        if (!$usuario) {
            return response()->json([
                'message' => 'Usuario no encontrado.',
            ], 404);
        }

        if ($usuario->activo) {
            return response()->json([
                'message' => 'La cuenta ya se encuentra activa.',
            ], 409);
        }

        if (
            $usuario->role === 'paciente' &&
            !$usuario->paciente_id
        ) {
            return response()->json([
                'message' => 'La cuenta de paciente debe estar vinculada a un expediente antes de activarse.',
            ], 409);
        }

        $usuario->update([
            'activo' => true,
        ]);

        AuditoriaService::registrarAccion(
            $request->user(),
            'usuarios',
            'activar_usuario',
            "Activaste la cuenta de {$usuario->name}."
        );

        return response()->json([
            'message' => 'Cuenta activada correctamente.',
            'data' => [
                'id' => $usuario->id,
                'name' => $usuario->name,
                'username' => $usuario->username,
                'role' => $usuario->role,
                'paciente_id' => $usuario->paciente_id,
                'activo' => $usuario->activo,
            ],
        ]);
    }

    public function desvincularPaciente(
        Request $request,
        string $id
    ): JsonResponse {
        $usuario = User::find($id);

        if (!$usuario) {
            return response()->json([
                'message' => 'Usuario no encontrado.',
            ], 404);
        }

        if ($usuario->role !== 'paciente') {
            return response()->json([
                'message' => 'Solo se pueden desvincular cuentas de pacientes.',
            ], 409);
        }

        if (!$usuario->paciente_id) {
            return response()->json([
                'message' => 'La cuenta ya se encuentra desvinculada.',
            ], 409);
        }

        $paciente = Paciente::find(
            $usuario->paciente_id
        );

        $codigoPaciente = $paciente
            ? $paciente->codigo_paciente
            : null;

        $usuario->tokens()->delete();

        $usuario->update([
            'paciente_id' => null,
            'activo' => false,
        ]);

        $detalle = $codigoPaciente
            ? "Desvinculaste la cuenta del paciente {$codigoPaciente}."
            : "Desvinculaste la cuenta de {$usuario->name}.";

        AuditoriaService::registrarAccion(
            $request->user(),
            'usuarios',
            'desvincular_paciente',
            $detalle
        );

        return response()->json([
            'message' => 'Cuenta de paciente desvinculada correctamente.',
            'data' => [
                'id' => $usuario->id,
                'name' => $usuario->name,
                'username' => $usuario->username,
                'role' => $usuario->role,
                'paciente_id' => $usuario->paciente_id,
                'activo' => $usuario->activo,
            ],
        ]);
    }
}