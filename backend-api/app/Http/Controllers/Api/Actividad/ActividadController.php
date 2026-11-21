<?php

namespace App\Http\Controllers\Api\Actividad;

use App\Http\Controllers\Controller;
use App\Services\ActividadService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ActividadController extends Controller
{
    public function __construct(
        private ActividadService $actividadService
    ) {
    }

    public function index(Request $request): JsonResponse
    {
        $actividades = $this->actividadService->listar(
            $request->only([
                'fecha',
                'semana',
                'mes',
                'anio',
                'codigo_paciente',
            ])
        );

        return response()->json([
            'data' => $actividades,
        ]);
    }

    public function show(string $id): JsonResponse
    {
        $actividad = $this->actividadService->obtenerPorId($id);

        if (!$actividad) {
            return response()->json([
                'message' => 'Actividad no encontrada.',
            ], 404);
        }

        return response()->json([
            'data' => $actividad,
        ]);
    }

    public function store(Request $request): JsonResponse
    {
        $datos = $request->validate([
            'codigo_paciente' => [
                'required',
                'string',
                'exists:pacientes,codigo_paciente',
            ],
            'fecha' => [
                'required',
                'date',
            ],
            'actividad' => [
                'required',
                'string',
                'max:255',
            ],
            'precio' => [
                'required',
                'numeric',
                'decimal:0,2',
                'max:99999999.99',
                'min:0',
            ],
        ]);

        $actividad = $this->actividadService->crear(
            $datos,
            $request->user()
        );

        return response()->json([
            'message' => 'Actividad registrada correctamente.',
            'data' => [
                'id' => $actividad->id,
                'codigo_paciente' => $actividad->paciente->codigo_paciente,
                'nombres' => $actividad->paciente->nombres,
                'fecha' => $actividad->fecha,
                'actividad' => $actividad->actividad,
                'precio' => $actividad->precio,
            ],
        ], 201);
    }

    public function update(
        Request $request,
        string $id
    ): JsonResponse {
        $datos = $request->validate([
            'codigo_paciente' => [
                'sometimes',
                'required',
                'string',
                'exists:pacientes,codigo_paciente',
            ],
            'fecha' => [
                'sometimes',
                'required',
                'date',
            ],
            'actividad' => [
                'sometimes',
                'required',
                'string',
                'max:255',
            ],
            'precio' => [
                'sometimes',
                'required',
                'numeric',
                'decimal:0,2',
                'max:99999999.99',
                'min:0',
            ],
        ]);

        $actividad = $this->actividadService->actualizar(
            $id,
            $datos,
            $request->user()
        );

        if (!$actividad) {
            return response()->json([
                'message' => 'Actividad no encontrada.',
            ], 404);
        }

        return response()->json([
            'message' => 'Actividad actualizada correctamente.',
            'data' => $actividad,
        ]);
    }

    public function destroy(
        Request $request,
        string $id
    ): JsonResponse {
        $eliminada = $this->actividadService->eliminar(
            $id,
            $request->user()
        );

        if (!$eliminada) {
            return response()->json([
                'message' => 'Actividad no encontrada.',
            ], 404);
        }

        return response()->json([
            'message' => 'Actividad eliminada correctamente.',
        ]);
    }

    public function buscarPacientePorCodigo(
        string $codigo
    ): JsonResponse {
        $paciente = $this->actividadService
            ->buscarPacientePorCodigo($codigo);

        if (!$paciente) {
            return response()->json([
                'message' => 'Paciente no encontrado.',
            ], 404);
        }

        return response()->json([
            'data' => [
                'codigo_paciente' => $paciente->codigo_paciente,
                'nombres' => $paciente->nombres,
            ],
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

        $total = $this->actividadService->resumen(
            $datos
        );

        return response()->json([
            'periodo' => $datos['periodo'],
            'total' => $total,
        ]);
    }
}
