<?php

namespace App\Http\Controllers\Api\Integracion;

use App\Http\Controllers\Controller;
use App\Services\Integracion\OrquestadorSolicitud;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Str;

/**
 * Práctica de orquestación.
 * GET /api/resumen-solicitud/{id}
 */
class ResumenSolicitudController extends Controller
{
    public function __construct(private OrquestadorSolicitud $orquestador)
    {
    }

    public function show(Request $request, string $id): JsonResponse
    {
        // Propagar el X-Correlation-ID recibido o generar uno nuevo
        $correlationId = $request->header('X-Correlation-ID');

        $valido = is_string($correlationId)
            && preg_match('/^[A-Za-z0-9._-]{1,100}$/D', $correlationId);

        if (!$valido) {
            $correlationId = (string) Str::uuid();
        }

        $resumen = $this->orquestador->resumen($id, $correlationId);

        // Si una dependencia falló: mensaje controlado, código 502 y sin trazas
        if ($resumen === null) {
            return response()->json([
                'error' => 'Dependencia no disponible',
                'correlation_id' => $correlationId,
            ], 502)->header('X-Correlation-ID', $correlationId);
        }

        return response()->json($resumen)
            ->header('X-Correlation-ID', $correlationId);
    }
}
