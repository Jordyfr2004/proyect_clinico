<?php

namespace App\Http\Controllers\Api\Cita;

use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;

class HorarioController extends Controller
{
    public function index(): JsonResponse
    {
        return response()->json([
            'message' => 'Horarios de atención'
        ]);
    }

    public function disponibilidad(): JsonResponse
    {
        return response()->json([
            'message' => 'Disponibilidad de citas'
        ]);
    }
}