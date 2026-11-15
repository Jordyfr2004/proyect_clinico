<?php

namespace App\PracticaNormalizacionHache;

use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class NormalizacionPacienteController
{
    public function web(Request $request, NormalizadorPaciente $normalizador): JsonResponse
    {
        return response()->json($normalizador->desdeWeb($request->all()));
    }

    public function externo(Request $request, NormalizadorPaciente $normalizador): JsonResponse
    {
        return response()->json($normalizador->desdeExterno($request->all()));
    }
}
