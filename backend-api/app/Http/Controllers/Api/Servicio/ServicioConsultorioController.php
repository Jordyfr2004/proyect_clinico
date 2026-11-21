<?php

namespace App\Http\Controllers\Api\Servicio;

use App\Http\Controllers\Controller;
use App\Services\ServicioConsultorioService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ServicioConsultorioController extends Controller
{
    public function __construct(
        private ServicioConsultorioService $servicioConsultorioService
    ) {
    }

    public function index(): JsonResponse
    {
        $servicios = $this
            ->servicioConsultorioService
            ->listar();

        return response()->json([
            'data' => $servicios,
        ]);
    }

    public function activos(): JsonResponse
    {
        $servicios = $this
            ->servicioConsultorioService
            ->listarActivos();

        return response()->json([
            'data' => $servicios,
        ]);
    }

    public function show(
        string $id
    ): JsonResponse {
        $servicio = $this
            ->servicioConsultorioService
            ->obtenerPorId($id);

        if (!$servicio) {
            return response()->json([
                'message' => 'Servicio no encontrado.',
            ], 404);
        }

        return response()->json([
            'data' => $servicio,
        ]);
    }

    public function store(
        Request $request
    ): JsonResponse {
        $datos = $request->validate([
            'categoria_id' => [
                'required',
                'uuid',
            ],
            'nombre' => [
                'required',
                'string',
                'max:255',
            ],
            'descripcion' => [
                'required',
                'string',
            ],
            'imagen' => [
                'nullable',
                'string',
                'max:500',
            ],
            'precio' => [
                'nullable',
                'numeric',
                'min:0',
            ],
            'duracion_minutos' => [
                'nullable',
                'integer',
                'min:1',
            ],
        ]);

        $resultado = $this
            ->servicioConsultorioService
            ->crear(
                $datos,
                $request->user()
            );

        if ($resultado['estado'] === 'categoria_no_existe') {
            return response()->json([
                'message' => 'La categoría seleccionada no existe.',
            ], 404);
        }

        if ($resultado['estado'] === 'categoria_inactiva') {
            return response()->json([
                'message' => 'No se puede crear el servicio en una categoría inactiva.',
            ], 409);
        }

        return response()->json([
            'message' => 'Servicio creado correctamente.',
            'data' => $resultado['servicio'],
        ], 201);
    }

    public function update(
        Request $request,
        string $id
    ): JsonResponse {
        $datos = $request->validate([
            'categoria_id' => [
                'sometimes',
                'uuid',
            ],
            'nombre' => [
                'sometimes',
                'string',
                'max:255',
            ],
            'descripcion' => [
                'sometimes',
                'string',
            ],
            'imagen' => [
                'nullable',
                'string',
                'max:500',
            ],
            'precio' => [
                'nullable',
                'numeric',
                'min:0',
            ],
            'duracion_minutos' => [
                'nullable',
                'integer',
                'min:1',
            ],
        ]);

        $resultado = $this
            ->servicioConsultorioService
            ->actualizar(
                $id,
                $datos,
                $request->user()
            );

        if ($resultado['estado'] === 'no_existe') {
            return response()->json([
                'message' => 'Servicio no encontrado.',
            ], 404);
        }

        if ($resultado['estado'] === 'categoria_no_existe') {
            return response()->json([
                'message' => 'La categoría seleccionada no existe.',
            ], 404);
        }

        if ($resultado['estado'] === 'categoria_inactiva') {
            return response()->json([
                'message' => 'No se puede asignar el servicio a una categoría inactiva.',
            ], 409);
        }

        return response()->json([
            'message' => 'Servicio actualizado correctamente.',
            'data' => $resultado['servicio'],
        ]);
    }

    public function desactivar(
        Request $request,
        string $id
    ): JsonResponse {
        $resultado = $this
            ->servicioConsultorioService
            ->desactivar(
                $id,
                $request->user()
            );

        if ($resultado['estado'] === 'no_existe') {
            return response()->json([
                'message' => 'Servicio no encontrado.',
            ], 404);
        }

        if ($resultado['estado'] === 'ya_desactivado') {
            return response()->json([
                'message' => 'El servicio ya está desactivado.',
            ], 409);
        }

        return response()->json([
            'message' => 'Servicio desactivado correctamente.',
            'data' => $resultado['servicio'],
        ]);
    }

    public function activar(
        Request $request,
        string $id
    ): JsonResponse {
        $resultado = $this
            ->servicioConsultorioService
            ->activar(
                $id,
                $request->user()
            );

        if ($resultado['estado'] === 'no_existe') {
            return response()->json([
                'message' => 'Servicio no encontrado.',
            ], 404);
        }

        if ($resultado['estado'] === 'categoria_inactiva') {
            return response()->json([
                'message' => 'No se puede activar el servicio porque su categoría está inactiva.',
            ], 409);
        }

        if ($resultado['estado'] === 'ya_activo') {
            return response()->json([
                'message' => 'El servicio ya está activo.',
            ], 409);
        }

        return response()->json([
            'message' => 'Servicio activado correctamente.',
            'data' => $resultado['servicio'],
        ]);
    }

    public function destroy(
        Request $request,
        string $id
    ): JsonResponse {
        $resultado = $this
            ->servicioConsultorioService
            ->eliminar(
                $id,
                $request->user()
            );

        if ($resultado === 'no_existe') {
            return response()->json([
                'message' => 'Servicio no encontrado.',
            ], 404);
        }

        return response()->json([
            'message' => 'Servicio eliminado correctamente.',
        ]);
    }
}