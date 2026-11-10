<?php

namespace App\Http\Controllers\Api\Receta;

use App\Http\Controllers\Controller;
use App\Services\RecetaService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class PlantillaRecetaController extends Controller
{
    public function __construct(
        private RecetaService $recetaService
    ) {
    }

    public function index(
        Request $request
    ): JsonResponse {
        return response()->json([
            'data' => $this
                ->recetaService
                ->listarPlantillas($request->boolean('activas')),
        ]);
    }

    public function store(
        Request $request
    ): JsonResponse {
        $datos = $request->validate([
            'nombre' => [
                'required',
                'string',
                'max:255',
                'unique:plantillas_receta,nombre',
            ],
            'indicaciones' => [
                'nullable',
                'string',
                'max:2000',
            ],
            'activo' => [
                'sometimes',
                'boolean',
            ],
            ...RecetaController::reglasMedicamentos(),
        ]);

        $plantilla = $this
            ->recetaService
            ->crearPlantilla(
                $datos,
                $request->user()
            );

        return response()->json([
            'message' => 'Plantilla creada correctamente.',
            'data' => $plantilla,
        ], 201);
    }

    public function update(
        Request $request,
        string $id
    ): JsonResponse {
        $datos = $request->validate([
            'nombre' => [
                'sometimes',
                'required',
                'string',
                'max:255',
                Rule::unique('plantillas_receta', 'nombre')->ignore($id),
            ],
            'indicaciones' => [
                'sometimes',
                'nullable',
                'string',
                'max:2000',
            ],
            'activo' => [
                'sometimes',
                'boolean',
            ],
            ...RecetaController::reglasMedicamentos(parcial: true),
        ]);

        $plantilla = $this
            ->recetaService
            ->actualizarPlantilla(
                $id,
                $datos,
                $request->user()
            );

        if (!$plantilla) {
            return response()->json([
                'message' => 'Plantilla no encontrada.',
            ], 404);
        }

        return response()->json([
            'message' => 'Plantilla actualizada correctamente.',
            'data' => $plantilla,
        ]);
    }

    public function destroy(
        Request $request,
        string $id
    ): JsonResponse {
        $eliminada = $this
            ->recetaService
            ->eliminarPlantilla(
                $id,
                $request->user()
            );

        if (!$eliminada) {
            return response()->json([
                'message' => 'Plantilla no encontrada.',
            ], 404);
        }

        return response()->json([
            'message' => 'Plantilla eliminada correctamente.',
        ]);
    }
}
