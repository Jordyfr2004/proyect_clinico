<?php

namespace App\Http\Controllers\Api\Reporte;

use App\Http\Controllers\Controller;
use App\Models\Actividad;
use App\Models\Egreso;
use Carbon\Carbon;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ReporteController extends Controller
{
    public function clinicos(): JsonResponse
    {
        return response()->json([
            'message' => 'Reporte clínico',
        ]);
    }

    public function economicos(): JsonResponse
    {
        return response()->json([
            'message' => 'Reporte económico',
        ]);
    }

    public function financieros(): JsonResponse
    {
        return response()->json([
            'message' => 'Reporte financiero',
        ]);
    }

    public function ingresos(): JsonResponse
    {
        return response()->json([
            'message' => 'Estadísticas de ingresos',
        ]);
    }

    public function dashboard(): JsonResponse
    {
        return response()->json([
            'message' => 'Datos del dashboard',
        ]);
    }

    public function resumenCaja(Request $request): JsonResponse
    {
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

        $ingresosQuery = Actividad::query();
        $egresosQuery = Egreso::query();

        if ($datos['periodo'] === 'dia') {
            $ingresosQuery->whereDate(
                'fecha',
                $datos['fecha']
            );

            $egresosQuery->whereDate(
                'fecha',
                $datos['fecha']
            );
        }

        if ($datos['periodo'] === 'semana') {
            $fecha = Carbon::parse($datos['fecha']);

            $inicio = $fecha->copy()->startOfWeek();
            $fin = $fecha->copy()->endOfWeek();

            $ingresosQuery->whereBetween(
                'fecha',
                [$inicio, $fin]
            );

            $egresosQuery->whereBetween(
                'fecha',
                [$inicio, $fin]
            );
        }

        if ($datos['periodo'] === 'mes') {
            $ingresosQuery
                ->whereMonth('fecha', $datos['mes'])
                ->whereYear('fecha', $datos['anio']);

            $egresosQuery
                ->whereMonth('fecha', $datos['mes'])
                ->whereYear('fecha', $datos['anio']);
        }

        if ($datos['periodo'] === 'anio') {
            $ingresosQuery->whereYear(
                'fecha',
                $datos['anio']
            );

            $egresosQuery->whereYear(
                'fecha',
                $datos['anio']
            );
        }

        $ingresos = (float) $ingresosQuery->sum('precio');
        $egresos = (float) $egresosQuery->sum('monto');
        $saldo = $ingresos - $egresos;

        return response()->json([
            'periodo' => $datos['periodo'],
            'ingresos' => number_format(
                $ingresos,
                2,
                '.',
                ''
            ),
            'egresos' => number_format(
                $egresos,
                2,
                '.',
                ''
            ),
            'saldo' => number_format(
                $saldo,
                2,
                '.',
                ''
            ),
        ]);
    }
}
