<?php

namespace App\Http\Controllers\Api\Reporte;

use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;

class ReporteController extends Controller
{
    public function clinicos(): JsonResponse
    {
        return response()->json([
            'message' => 'Reporte clínico'
        ]);
    }

    public function economicos(): JsonResponse
    {
        return response()->json([
            'message' => 'Reporte económico'
        ]);
    }

    public function financieros(): JsonResponse
    {
        return response()->json([
            'message' => 'Reporte financiero'
        ]);
    }

    public function ingresos(): JsonResponse
    {
        return response()->json([
            'message' => 'Estadísticas de ingresos'
        ]);
    }

    public function dashboard(): JsonResponse
    {
        return response()->json([
            'message' => 'Datos del dashboard'
        ]);
    }
}
