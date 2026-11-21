<?php

namespace App\Http\Controllers\Api\Auth;

use App\Http\Controllers\Controller;
use App\Http\Requests\Auth\RegisterPacienteRequest;
use App\Services\AuthService;
use App\Services\EmailVerificationService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class AuthController extends Controller
{
    public function __construct(
        private AuthService $authService,
        private EmailVerificationService $emailVerificationService
    ) {
    }

    public function login(
        Request $request
    ): JsonResponse {
        $datos = $request->validate([
            'username' => [
                'required',
                'string',
            ],
            'password' => [
                'required',
                'string',
            ],
        ]);

        $resultado = $this
            ->authService
            ->login(
                $datos['username'],
                $datos['password']
            );

        $user = $resultado['user'];

        return response()->json([
            'message' => 'Inicio de sesión correcto.',
            'token_type' => 'Bearer',
            'access_token' => $resultado['token'],
            'user' => [
                'id' => $user->id,
                'name' => $user->name,
                'username' => $user->username,
                'email' => $user->email,
                'role' => $user->role,
                'foto_perfil_url' => $user->foto_perfil_url,
                'paciente_id' => $user->paciente_id,
                'activo' => $user->activo,
                'email_verified_at' => $user->email_verified_at,
            ],
        ]);
    }

    public function logout(
        Request $request
    ): JsonResponse {
        $this
            ->authService
            ->logout(
                $request->user()
            );

        return response()->json([
            'message' => 'Sesión cerrada correctamente.',
        ]);
    }

    public function registerPaciente(
        RegisterPacienteRequest $request
    ): JsonResponse {
        $resultado = $this
            ->authService
            ->registrarPaciente(
                $request->validated()
            );

        $user = $resultado['user'];

        $this
            ->emailVerificationService
            ->enviarCodigo($user);

        return response()->json([
            'message' => 'Cuenta creada correctamente. Revisa tu correo para verificarla.',
            'requires_verification' => true,
            'email' => $user->email,
            'user' => [
                'id' => $user->id,
                'name' => $user->name,
                'username' => $user->username,
                'email' => $user->email,
                'role' => $user->role,
                'foto_perfil_url' => $user->foto_perfil_url,
                'paciente_id' => $resultado['paciente']->id,
                'codigo_paciente' => $resultado['paciente']->codigo_paciente,
                'activo' => $user->activo,
                'email_verified_at' => $user->email_verified_at,
            ],
        ], 201);
    }

    public function verifyEmail(
        Request $request
    ): JsonResponse {
        $datos = $request->validate([
            'email' => [
                'required',
                'email',
            ],
            'code' => [
                'required',
                'string',
                'size:6',
            ],
        ]);

        $user = $this
            ->emailVerificationService
            ->verificar(
                $datos['email'],
                $datos['code']
            );

        $token = $user
            ->createToken('auth_token')
            ->plainTextToken;

        return response()->json([
            'message' => 'Correo verificado correctamente.',
            'token_type' => 'Bearer',
            'access_token' => $token,
            'user' => [
                'id' => $user->id,
                'name' => $user->name,
                'username' => $user->username,
                'email' => $user->email,
                'role' => $user->role,
                'foto_perfil_url' => $user->foto_perfil_url,
                'paciente_id' => $user->paciente_id,
                'activo' => $user->activo,
                'email_verified_at' => $user->email_verified_at,
            ],
        ]);
    }

    public function resendVerificationCode(
        Request $request
    ): JsonResponse {
        $datos = $request->validate([
            'email' => [
                'required',
                'email',
            ],
        ]);

        $this
            ->emailVerificationService
            ->reenviarCodigo(
                $datos['email']
            );

        return response()->json([
            'message' => 'Código de verificación reenviado correctamente.',
        ]);
    }
}