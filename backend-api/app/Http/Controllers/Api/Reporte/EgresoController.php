<?php

namespace App\Http\Controllers\Api\Reporte;

use App\Http\Controllers\Controller;
use App\Models\Egreso;
use Carbon\Carbon;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class EgresoController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $query = Egreso::query()
            ->orderBy('fecha', 'desc');

        if ($request->filled('fecha')) {
            $query->whereDate('fecha', $request->fecha);
        }

        if ($request->filled('semana')) {
            $fecha = Carbon::parse($request->semana);

            $query->whereBetween('fecha', [
                $fecha->copy()->startOfWeek(),
                $fecha->copy()->endOfWeek(),
            ]);
        }

        if (
            $request->filled('mes') &&
            $request->filled('anio')
        ) {
            $query->whereMonth('fecha', $request->mes)
                ->whereYear('fecha', $request->anio);
        }

        if (
            $request->filled('anio') &&
            !$request->filled('mes')
        ) {
            $query->whereYear('fecha', $request->anio);
        }

        return response()->json([
            'data' => $query->get(),
        ]);
    }

    public function show(string $id): JsonResponse
    {
        $egreso = Egreso::find($id);

        if (!$egreso) {
            return response()->json([
                'message' => 'Egreso no encontrado.',
            ], 404);
        }

        return response()->json([
            'data' => $egreso,
        ]);
    }

    public function store(Request $request): JsonResponse
    {
        $datos = $request->validate([
            'fecha' => [
                'required',
                'date',
            ],
            'concepto' => [
                'required',
                'string',
                'max:255',
            ],
            'monto' => [
                'required',
                'numeric',
                'min:0.01',
            ],
        ]);

        $egreso = Egreso::create([
            'fecha' => $datos['fecha'],
            'concepto' => $datos['concepto'],
            'monto' => $datos['monto'],
        ]);

        return response()->json([
            'message' => 'Egreso registrado correctamente.',
            'data' => $egreso,
        ], 201);
    }

    public function update(
        Request $request,
        string $id
    ): JsonResponse {
        $egreso = Egreso::find($id);

        if (!$egreso) {
            return response()->json([
                'message' => 'Egreso no encontrado.',
            ], 404);
        }

        $datos = $request->validate([
            'fecha' => [
                'sometimes',
                'required',
                'date',
            ],
            'concepto' => [
                'sometimes',
                'required',
                'string',
                'max:255',
            ],
            'monto' => [
                'sometimes',
                'required',
                'numeric',
                'min:0.01',
            ],
        ]);

        $egreso->update($datos);

        return response()->json([
            'message' => 'Egreso actualizado correctamente.',
            'data' => $egreso,
        ]);
    }

    public function destroy(string $id): JsonResponse
    {
        $egreso = Egreso::find($id);

        if (!$egreso) {
            return response()->json([
                'message' => 'Egreso no encontrado.',
            ], 404);
        }

        $egreso->delete();

        return response()->json([
            'message' => 'Egreso eliminado correctamente.',
        ]);
    }

    public function resumen(Request $request): JsonResponse
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

        $query = Egreso::query();

        if ($datos['periodo'] === 'dia') {
            $query->whereDate(
                'fecha',
                $datos['fecha']
            );
        }

        if ($datos['periodo'] === 'semana') {
            $fecha = Carbon::parse($datos['fecha']);

            $query->whereBetween('fecha', [
                $fecha->copy()->startOfWeek(),
                $fecha->copy()->endOfWeek(),
            ]);
        }

        if ($datos['periodo'] === 'mes') {
            $query->whereMonth(
                'fecha',
                $datos['mes']
            )
                ->whereYear(
                    'fecha',
                    $datos['anio']
                );
        }

        if ($datos['periodo'] === 'anio') {
            $query->whereYear(
                'fecha',
                $datos['anio']
            );
        }

        return response()->json([
            'periodo' => $datos['periodo'],
            'total_egresos' => number_format(
                (float) $query->sum('monto'),
                2,
                '.',
                ''
            ),
        ]);
    }
}