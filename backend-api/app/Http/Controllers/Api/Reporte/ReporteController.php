<?php

namespace App\Http\Controllers\Api\Reporte;

use App\Http\Controllers\Controller;
use App\Services\ReporteService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ReporteController extends Controller
{
    public function __construct(
        private ReporteService $reporteService
    ) {
    }

    public function clinicos(): JsonResponse
    {
        $resultado = $this
            ->reporteService
            ->clinicos();

        return response()->json(
            $resultado
        );
    }

    public function economicos(): JsonResponse
    {
        $resultado = $this
            ->reporteService
            ->economicos();

        return response()->json(
            $resultado
        );
    }

    public function financieros(
        Request $request
    ): JsonResponse {
        $datos = $request->validate([
            'anio' => [
                'required',
                'integer',
            ],
        ]);

        $resultado = $this
            ->reporteService
            ->financieros(
                $datos['anio']
            );

        return response()->json(
            $resultado
        );
    }

    public function ingresos(): JsonResponse
    {
        $resultado = $this
            ->reporteService
            ->ingresos();

        return response()->json(
            $resultado
        );
    }

    public function dashboard(): JsonResponse
    {
        $resultado = $this
            ->reporteService
            ->dashboard();

        return response()->json(
            $resultado
        );
    }

    public function resumenCaja(
        Request $request
    ): JsonResponse {
        $datos = $request->validate([
            'periodo' => [
                'required',
                'in:dia,semana,mes,anio',
            ],
            'fecha' => [
                'required_if:periodo,dia,semana',
                'nullable',
                'date',
            ],
            'mes' => [
                'required_if:periodo,mes',
                'nullable',
                'integer',
                'between:1,12',
            ],
            'anio' => [
                'required_if:periodo,mes,anio',
                'nullable',
                'integer',
            ],
        ]);

        $resultado = $this
            ->reporteService
            ->resumenCaja($datos);

        return response()->json(
            $resultado
        );
    }
}
