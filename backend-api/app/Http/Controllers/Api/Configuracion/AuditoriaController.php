<?php

namespace App\Http\Controllers\Api\Configuracion;

use App\Http\Controllers\Controller;
use App\Models\AccionRegistrada;
use App\Models\SesionRegistrada;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class AuditoriaController extends Controller
{
    public function acciones(Request $request): JsonResponse
    {
        $query = AccionRegistrada::query()
            ->where('visible', true);

        if ($request->filled('fecha')) {
            $query->whereDate('created_at', $request->fecha);
        }

        $acciones = $query
            ->orderByDesc('created_at')
            ->get();

        return response()->json([
            'acciones' => $acciones,
        ]);
    }

    public function sesiones(Request $request): JsonResponse
    {
        $query = SesionRegistrada::query();

        if ($request->filled('fecha')) {
            $query->whereDate('created_at', $request->fecha);
        }

        $sesiones = $query
            ->orderByDesc('created_at')
            ->get();

        return response()->json([
            'sesiones' => $sesiones,
        ]);
    }

    public function ocultarAccion(string $id): JsonResponse
    {
        $accion = AccionRegistrada::findOrFail($id);

        $accion->update([
            'visible' => false,
        ]);

        return response()->json([
            'message' => 'Acción eliminada de la vista correctamente.',
        ]);
    }
}