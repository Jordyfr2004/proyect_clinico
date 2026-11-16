<?php

namespace App\Academic\NormalizacionServicios;

use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

final class ControladorNormalizacionServicio
{
    public function formularioWeb(Request $request, TraductorServicio $traductor): JsonResponse
    {
        return response()->json($traductor->desdeFormularioWeb($request->all())->toArray());
    }

    public function servicioExterno(Request $request, TraductorServicio $traductor): JsonResponse
    {
        return response()->json($traductor->desdeServicioExterno($request->all())->toArray());
    }
}
