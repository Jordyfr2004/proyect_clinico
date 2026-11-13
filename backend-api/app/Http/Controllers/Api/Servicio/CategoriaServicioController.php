<?php

namespace App\Http\Controllers\Api\Servicio;

use App\Http\Controllers\Controller;
use App\Services\CategoriaServicioService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class CategoriaServicioController extends Controller
{
    public function __construct(
        private CategoriaServicioService $categoriaServicioService
    ) {
    }

    public function index(): JsonResponse
    {
        $categorias = $this
            ->categoriaServicioService
            ->listar();

        return response()->json([
            'data' => $categorias,
        ]);
    }

    public function activas(): JsonResponse
    {
        $categorias = $this
            ->categoriaServicioService
            ->listarActivas();

        return response()->json([
            'data' => $categorias,
        ]);
    }

    public function show(
        string $id
    ): JsonResponse {
        $categoria = $this
            ->categoriaServicioService
            ->obtenerPorId($id);

        if (!$categoria) {
            return response()->json([
                'message' => 'Categoría no encontrada.',
            ], 404);
        }

        return response()->json([
            'data' => $categoria,
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
                'unique:categorias_servicios,nombre',
            ],
        ]);

        $categoria = $this
            ->categoriaServicioService
            ->crear(
                $datos,
                $request->user()
            );

        return response()->json([
            'message' => 'Categoría creada correctamente.',
            'data' => $categoria,
        ], 201);
    }

    public function update(
        Request $request,
        string $id
    ): JsonResponse {
        $datos = $request->validate([
            'nombre' => [
                'required',
                'string',
                'max:255',
                'unique:categorias_servicios,nombre,' . $id,
            ],
        ]);

        $categoria = $this
            ->categoriaServicioService
            ->actualizar(
                $id,
                $datos,
                $request->user()
            );

        if (!$categoria) {
            return response()->json([
                'message' => 'Categoría no encontrada.',
            ], 404);
        }

        return response()->json([
            'message' => 'Categoría actualizada correctamente.',
            'data' => $categoria,
        ]);
    }

    public function desactivar(
        Request $request,
        string $id
    ): JsonResponse {
        $categoria = $this
            ->categoriaServicioService
            ->desactivar(
                $id,
                $request->user()
            );

        if (!$categoria) {
            return response()->json([
                'message' => 'Categoría no encontrada.',
            ], 404);
        }

        return response()->json([
            'message' => 'Categoría desactivada correctamente.',
            'data' => $categoria,
        ]);
    }

    public function activar(
        Request $request,
        string $id
    ): JsonResponse {
        $categoria = $this
            ->categoriaServicioService
            ->activar(
                $id,
                $request->user()
            );

        if (!$categoria) {
            return response()->json([
                'message' => 'Categoría no encontrada.',
            ], 404);
        }

        return response()->json([
            'message' => 'Categoría activada correctamente.',
            'data' => $categoria,
        ]);
    }

    public function destroy(
        Request $request,
        string $id
    ): JsonResponse {
        $resultado = $this
            ->categoriaServicioService
            ->eliminar(
                $id,
                $request->user()
            );

        if ($resultado === 'no_existe') {
            return response()->json([
                'message' => 'Categoría no encontrada.',
            ], 404);
        }

        if ($resultado === 'tiene_servicios') {
            return response()->json([
                'message' => 'No se puede eliminar la categoría porque tiene servicios asociados.',
            ], 409);
        }

        return response()->json([
            'message' => 'Categoría eliminada correctamente.',
        ]);
    }
}