<?php

namespace App\Http\Controllers\Api\Receta;

use App\Http\Controllers\Controller;
use App\Services\RecetaService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class RecetaController extends Controller
{
    public function __construct(
        private RecetaService $recetaService
    ) {
    }

    /**
     * Reglas de la lista de medicamentos, compartidas con las plantillas.
     */
    public static function reglasMedicamentos(
        bool $parcial = false
    ): array {
        return [
            'medicamentos' => [
                ...($parcial ? ['sometimes'] : []),
                'required',
                'array',
                'min:1',
                'max:20',
            ],
            'medicamentos.*.nombre' => ['required', 'string', 'max:255'],
            'medicamentos.*.dosis' => ['required', 'string', 'max:100'],
            'medicamentos.*.frecuencia' => ['required', 'string', 'max:100'],
            'medicamentos.*.duracion' => ['nullable', 'string', 'max:100'],
            'medicamentos.*.indicaciones' => ['nullable', 'string', 'max:500'],
        ];
    }

    public function index(
        Request $request
    ): JsonResponse {
        $request->validate([
            'paciente_id' => [
                'nullable',
                'uuid',
            ],
        ]);

        return response()->json([
            'data' => $this
                ->recetaService
                ->listar($request->only(['paciente_id'])),
        ]);
    }

    public function show(
        string $id
    ): JsonResponse {
        $receta = $this
            ->recetaService
            ->obtenerPorId($id);

        if (!$receta) {
            return response()->json([
                'message' => 'Receta no encontrada.',
            ], 404);
        }

        return response()->json([
            'data' => $receta,
        ]);
    }

    public function store(
        Request $request
    ): JsonResponse {
        $datos = $request->validate([
            'paciente_id' => [
                'required',
                'uuid',
                'exists:pacientes,id',
            ],
            // La cita debe ser del mismo paciente.
            'agenda_id' => [
                'nullable',
                'uuid',
                Rule::exists('agenda', 'id')
                    ->where('paciente_id', $request->input('paciente_id'))
                    ->where('tipo', 'cita_medica'),
            ],
            'fecha' => [
                'nullable',
                'date',
            ],
            'diagnostico' => [
                'nullable',
                'string',
                'max:2000',
            ],
            'indicaciones' => [
                'nullable',
                'string',
                'max:2000',
            ],
            ...self::reglasMedicamentos(),
        ]);

        $receta = $this
            ->recetaService
            ->crear(
                $datos,
                $request->user()
            );

        return response()->json([
            'message' => 'Receta emitida correctamente.',
            'data' => $receta,
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
            'diagnostico' => [
                'sometimes',
                'nullable',
                'string',
                'max:2000',
            ],
            'indicaciones' => [
                'sometimes',
                'nullable',
                'string',
                'max:2000',
            ],
            ...self::reglasMedicamentos(parcial: true),
        ]);

        $receta = $this
            ->recetaService
            ->actualizar(
                $id,
                $datos,
                $request->user()
            );

        if (!$receta) {
            return response()->json([
                'message' => 'Receta no encontrada.',
            ], 404);
        }

        return response()->json([
            'message' => 'Receta actualizada correctamente.',
            'data' => $receta,
        ]);
    }

    public function destroy(
        Request $request,
        string $id
    ): JsonResponse {
        $eliminada = $this
            ->recetaService
            ->eliminar(
                $id,
                $request->user()
            );

        if (!$eliminada) {
            return response()->json([
                'message' => 'Receta no encontrada.',
            ], 404);
        }

        return response()->json([
            'message' => 'Receta eliminada correctamente.',
        ]);
    }

    public function misRecetas(
        Request $request
    ): JsonResponse {
        if (!$request->user()->paciente_id) {
            return response()->json([
                'message' => 'La cuenta no está vinculada a un paciente.',
            ], 422);
        }

        return response()->json([
            'data' => $this
                ->recetaService
                ->listarDelPaciente($request->user()),
        ]);
    }

    public function miReceta(
        Request $request,
        string $id
    ): JsonResponse {
        $receta = $this
            ->recetaService
            ->obtenerDelPaciente(
                $id,
                $request->user()
            );

        if (!$receta) {
            return response()->json([
                'message' => 'Receta no encontrada.',
            ], 404);
        }

        return response()->json([
            'data' => $receta,
        ]);
    }
}
