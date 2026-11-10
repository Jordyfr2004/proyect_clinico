<?php

namespace App\Http\Controllers\Api\Reporte;

use App\Http\Controllers\Controller;
use App\Services\EgresoService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class EgresoController extends Controller
{
    public function __construct(
        private EgresoService $egresoService
    ) {
    }

    public function index(
        Request $request
    ): JsonResponse {
        $egresos = $this->egresoService->listar(
            $request->only([
                'fecha',
                'semana',
                'mes',
                'anio',
            ])
        );

        return response()->json([
            'data' => $egresos,
        ]);
    }

    public function show(
        string $id
    ): JsonResponse {
        $egreso = $this->egresoService
            ->obtenerPorId($id);

        if (!$egreso) {
            return response()->json([
                'message' => 'Egreso no encontrado.',
            ], 404);
        }

        return response()->json([
            'data' => $egreso,
        ]);
    }

    public function store(
        Request $request
    ): JsonResponse {
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
                'decimal:0,2',
                'max:99999999.99',
                'min:0.01',
            ],
        ]);

        $egreso = $this->egresoService->crear(
            $datos,
            $request->user()
        );

        return response()->json([
            'message' => 'Egreso registrado correctamente.',
            'data' => $egreso,
        ], 201);
    }

    public function update(
        Request $request,
        string $id
    ): JsonResponse {
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
                'decimal:0,2',
                'max:99999999.99',
                'min:0.01',
            ],
        ]);

        $egreso = $this->egresoService->actualizar(
            $id,
            $datos,
            $request->user()
        );

        if (!$egreso) {
            return response()->json([
                'message' => 'Egreso no encontrado.',
            ], 404);
        }

        return response()->json([
            'message' => 'Egreso actualizado correctamente.',
            'data' => $egreso,
        ]);
    }

    public function destroy(
        Request $request,
        string $id
    ): JsonResponse {
        $eliminado = $this->egresoService->eliminar(
            $id,
            $request->user()
        );

        if (!$eliminado) {
            return response()->json([
                'message' => 'Egreso no encontrado.',
            ], 404);
        }

        return response()->json([
            'message' => 'Egreso eliminado correctamente.',
        ]);
    }

    public function resumen(
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

        $total = $this->egresoService->resumen(
            $datos
        );

        return response()->json([
            'periodo' => $datos['periodo'],
            'total_egresos' => $total,
        ]);
    }
}