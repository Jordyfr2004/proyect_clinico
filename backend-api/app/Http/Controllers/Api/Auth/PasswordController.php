<?php

namespace App\Http\Controllers\Api\Auth;

use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;

class PasswordController extends Controller
{
    public function forgotPassword(): JsonResponse
    {
        return response()->json([
            'message' => 'Endpoint de recuperación de contraseña'
        ]);
    }

    public function resetPassword(): JsonResponse
    {
        return response()->json([
            'message' => 'Endpoint para restablecer contraseña'
        ]);
    }
}
