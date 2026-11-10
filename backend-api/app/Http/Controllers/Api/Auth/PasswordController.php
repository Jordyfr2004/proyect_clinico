<?php

namespace App\Http\Controllers\Api\Auth;

use App\Http\Controllers\Controller;
use App\Services\PasswordService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class PasswordController extends Controller
{
    public function __construct(
        private PasswordService $passwordService
    ) {}

    public function forgotPassword(
        Request $request
    ): JsonResponse {
        $datos = $request->validate([
            'email' => [
                'required',
                'email',
                'max:254',
            ],
        ]);

        $this
            ->passwordService
            ->enviarCodigoRecuperacion(
                $datos['email']
            );

        return response()->json([
            'message' => 'Si existe una cuenta activa con ese correo, recibirás un código de recuperación.',
        ]);
    }

    public function resetPassword(
        Request $request
    ): JsonResponse {
        $datos = $request->validate([
            'email' => [
                'required',
                'email',
                'max:254',
            ],
            'code' => [
                'required',
                'string',
                'regex:/\A[0-9]{6}\z/',
            ],
            'password' => [
                'required',
                'string',
                'min:8',
                'max:72',
                function (string $attribute, mixed $value, \Closure $fail): void {
                    if (is_string($value) && strlen($value) > 72) {
                        $fail('La contraseña no puede superar 72 bytes.');
                    }
                },
                'confirmed',
            ],
        ]);

        $this
            ->passwordService
            ->restablecerPassword($datos);

        return response()->json([
            'message' => 'Contraseña restablecida correctamente.',
        ]);
    }
}
