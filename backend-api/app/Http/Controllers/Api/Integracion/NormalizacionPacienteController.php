<?php

namespace App\Http\Controllers\Api\Integracion;

use App\Http\Controllers\Controller;
use App\Services\Integracion\NormalizadorPaciente;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use InvalidArgumentException;

/**
 * Tema 2.3 - El controlador solo recibe y responde.
 * Toda la transformación vive en NormalizadorPaciente.
 */
class NormalizacionPacienteController extends Controller
{
    public function __construct(private NormalizadorPaciente $normalizador)
    {
    }

    // POST /api/integracion/pacientes/{origen}   (origen = web | externo)
    public function normalizar(Request $request, string $origen): JsonResponse
    {
        try {
            $contrato = match ($origen) {
                'web' => $this->normalizador->desdeFormularioWeb($request->all()),
                'externo' => $this->normalizador->desdeSistemaExterno($request->all()),
                default => throw new InvalidArgumentException('Origen no soportado. Use "web" o "externo".'),
            };
        } catch (InvalidArgumentException $e) {
            return response()->json(['message' => $e->getMessage()], 422);
        }

        return response()->json(['data' => $contrato]);
    }
}
