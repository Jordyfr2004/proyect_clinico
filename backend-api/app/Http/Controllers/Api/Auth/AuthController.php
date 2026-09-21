<?php

namespace App\Http\Controllers\Api\Auth;

use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;

class AuthController extends Controller
{
    public function login(): JsonResponse
    {
        return response()->json([
            'message' => 'Endpoint de inicio de sesión'
        ]);
    }

    public function logout(): JsonResponse
    {
        return response()->json([
            'message' => 'Endpoint de cierre de sesión'
        ]);
    }
}