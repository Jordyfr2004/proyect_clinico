<?php

namespace App\Http\Controllers\Api\Actividad;

use App\Http\Controllers\Controller;
use App\Models\Actividad;
use App\Models\Paciente;
use App\Services\AuditoriaService;
use Carbon\Carbon;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ActividadController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $query = Actividad::query()
            ->with('paciente');

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

        if ($request->filled('mes') && $request->filled('anio')) {
            $query->whereMonth('fecha', $request->mes)
                ->whereYear('fecha', $request->anio);
        }

        if ($request->filled('anio') && !$request->filled('mes')) {
            $query->whereYear('fecha', $request->anio);
        }

        if ($request->filled('codigo_paciente')) {
            $query->whereHas('paciente', function ($q) use ($request) {
                $q->where(
                    'codigo_paciente',
                    $request->codigo_paciente
                );
            });
        }

        $actividades = $query
            ->orderBy('fecha', 'desc')
            ->get();

        return response()->json([
            'data' => $actividades,
        ]);
    }

    public function show(string $id): JsonResponse
    {
        $actividad = Actividad::with('paciente')
            ->find($id);

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
                'min:0',
            ],
        ]);

        $paciente = Paciente::where(
            'codigo_paciente',
            $datos['codigo_paciente']
        )->firstOrFail();

        $actividad = Actividad::create([
            'paciente_id' => $paciente->id,
            'fecha' => $datos['fecha'],
            'actividad' => $datos['actividad'],
            'precio' => $datos['precio'],
        ]);

        $user = $request->user();

        $detalle = $user->role === 'doctora'
            ? "Registraste una actividad para el paciente {$paciente->codigo_paciente}."
            : "Asistente registró una actividad para el paciente {$paciente->codigo_paciente}.";

        AuditoriaService::registrarAccion(
            $user,
            'actividades',
            'crear',
            $detalle
        );

        return response()->json([
            'message' => 'Actividad registrada correctamente.',
            'data' => [
                'id' => $actividad->id,
                'codigo_paciente' => $paciente->codigo_paciente,
                'nombres' => $paciente->nombres,
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
        $actividad = Actividad::find($id);

        if (!$actividad) {
            return response()->json([
                'message' => 'Actividad no encontrada.',
            ], 404);
        }

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
                'min:0',
            ],
        ]);

        if (isset($datos['codigo_paciente'])) {
            $paciente = Paciente::where(
                'codigo_paciente',
                $datos['codigo_paciente']
            )->firstOrFail();

            $actividad->paciente_id = $paciente->id;
        }

        if (isset($datos['fecha'])) {
            $actividad->fecha = $datos['fecha'];
        }

        if (isset($datos['actividad'])) {
            $actividad->actividad = $datos['actividad'];
        }

        if (isset($datos['precio'])) {
            $actividad->precio = $datos['precio'];
        }

        $actividad->save();

        $actividad->load('paciente');

        $user = $request->user();

        $detalle = $user->role === 'doctora'
            ? "Actualizaste una actividad del paciente {$actividad->paciente->codigo_paciente}."
            : "Asistente actualizó una actividad del paciente {$actividad->paciente->codigo_paciente}.";

        AuditoriaService::registrarAccion(
            $user,
            'actividades',
            'actualizar',
            $detalle
        );

        return response()->json([
            'message' => 'Actividad actualizada correctamente.',
            'data' => $actividad,
        ]);
    }

    public function destroy(
        Request $request,
        string $id
    ): JsonResponse {
        $actividad = Actividad::with('paciente')
            ->find($id);

        if (!$actividad) {
            return response()->json([
                'message' => 'Actividad no encontrada.',
            ], 404);
        }

        $codigoPaciente = $actividad->paciente->codigo_paciente;

        $actividad->delete();

        $user = $request->user();

        $detalle = $user->role === 'doctora'
            ? "Eliminaste una actividad del paciente {$codigoPaciente}."
            : "Asistente eliminó una actividad del paciente {$codigoPaciente}.";

        AuditoriaService::registrarAccion(
            $user,
            'actividades',
            'eliminar',
            $detalle
        );

        return response()->json([
            'message' => 'Actividad eliminada correctamente.',
        ]);
    }

    public function buscarPacientePorCodigo(
        string $codigo
    ): JsonResponse {
        $paciente = Paciente::where(
            'codigo_paciente',
            $codigo
        )->first();

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

        $query = Actividad::query();

        if ($datos['periodo'] === 'dia') {
            $fecha = Carbon::parse($datos['fecha']);

            $query->whereDate('fecha', $fecha);
        }

        if ($datos['periodo'] === 'semana') {
            $fecha = Carbon::parse($datos['fecha']);

            $query->whereBetween('fecha', [
                $fecha->copy()->startOfWeek(),
                $fecha->copy()->endOfWeek(),
            ]);
        }

        if ($datos['periodo'] === 'mes') {
            $query->whereMonth('fecha', $datos['mes'])
                ->whereYear('fecha', $datos['anio']);
        }

        if ($datos['periodo'] === 'anio') {
            $query->whereYear('fecha', $datos['anio']);
        }

        return response()->json([
            'periodo' => $datos['periodo'],
            'total' => number_format(
                (float) $query->sum('precio'),
                2,
                '.',
                ''
            ),
        ]);
    }
}
