<?php

namespace App\Services;

use App\Models\CategoriaServicio;
use App\Models\ServicioConsultorio;
use App\Models\User;
use Illuminate\Support\Facades\DB;

class ServicioConsultorioService
{
    public function listar()
    {
        return ServicioConsultorio::query()
            ->with('categoria')
            ->orderBy('nombre')
            ->get();
    }

    public function listarActivos()
    {
        return ServicioConsultorio::query()
            ->with('categoria')
            ->where('activo', true)
            ->whereHas('categoria', function ($query) {
                $query->where('activo', true);
            })
            ->orderBy('nombre')
            ->get();
    }

    public function obtenerPorId(
        string $id
    ): ?ServicioConsultorio {
        return ServicioConsultorio::with('categoria')
            ->find($id);
    }

    public function crear(
        array $datos,
        User $user
    ): array {
        return DB::transaction(function () use ($datos, $user) {
            $categoria = CategoriaServicio::find(
                $datos['categoria_id']
            );

            if (!$categoria) {
                return [
                    'estado' => 'categoria_no_existe',
                    'servicio' => null,
                ];
            }

            if (!$categoria->activo) {
                return [
                    'estado' => 'categoria_inactiva',
                    'servicio' => null,
                ];
            }

            $servicio = ServicioConsultorio::create([
                'categoria_id' => $datos['categoria_id'],
                'nombre' => $datos['nombre'],
                'descripcion' => $datos['descripcion'],
                'imagen' => $datos['imagen'] ?? null,
                'precio' => $datos['precio'] ?? null,
                'duracion_minutos' => $datos['duracion_minutos'] ?? null,
                'activo' => true,
            ]);

            AuditoriaService::registrarAccion(
                $user,
                'servicios',
                'crear_servicio',
                "Creaste el servicio {$servicio->nombre}."
            );

            return [
                'estado' => 'creado',
                'servicio' => $servicio->load('categoria'),
            ];
        });
    }

    public function actualizar(
        string $id,
        array $datos,
        User $user
    ): array {
        return DB::transaction(function () use ($id, $datos, $user) {
            $servicio = ServicioConsultorio::find($id);

            if (!$servicio) {
                return [
                    'estado' => 'no_existe',
                    'servicio' => null,
                ];
            }

            if (
                isset($datos['categoria_id']) &&
                $datos['categoria_id'] !== $servicio->categoria_id
            ) {
                $categoria = CategoriaServicio::find(
                    $datos['categoria_id']
                );

                if (!$categoria) {
                    return [
                        'estado' => 'categoria_no_existe',
                        'servicio' => null,
                    ];
                }

                if (!$categoria->activo) {
                    return [
                        'estado' => 'categoria_inactiva',
                        'servicio' => null,
                    ];
                }
            }

            $servicio->update([
                'categoria_id' => $datos['categoria_id'] ?? $servicio->categoria_id,
                'nombre' => $datos['nombre'] ?? $servicio->nombre,
                'descripcion' => $datos['descripcion'] ?? $servicio->descripcion,
                'imagen' => array_key_exists('imagen', $datos)
                    ? $datos['imagen']
                    : $servicio->imagen,
                'precio' => array_key_exists('precio', $datos)
                    ? $datos['precio']
                    : $servicio->precio,
                'duracion_minutos' => array_key_exists('duracion_minutos', $datos)
                    ? $datos['duracion_minutos']
                    : $servicio->duracion_minutos,
            ]);

            AuditoriaService::registrarAccion(
                $user,
                'servicios',
                'actualizar_servicio',
                "Actualizaste el servicio {$servicio->nombre}."
            );

            return [
                'estado' => 'actualizado',
                'servicio' => $servicio->fresh()->load('categoria'),
            ];
        });
    }

    public function desactivar(
        string $id,
        User $user
    ): array {
        return DB::transaction(function () use ($id, $user) {
            $servicio = ServicioConsultorio::find($id);

            if (!$servicio) {
                return [
                    'estado' => 'no_existe',
                    'servicio' => null,
                ];
            }

            if (!$servicio->activo) {
                return [
                    'estado' => 'ya_desactivado',
                    'servicio' => $servicio,
                ];
            }

            $servicio->update([
                'activo' => false,
            ]);

            AuditoriaService::registrarAccion(
                $user,
                'servicios',
                'desactivar_servicio',
                "Desactivaste el servicio {$servicio->nombre}."
            );

            return [
                'estado' => 'desactivado',
                'servicio' => $servicio->fresh()->load('categoria'),
            ];
        });
    }

    public function activar(
        string $id,
        User $user
    ): array {
        return DB::transaction(function () use ($id, $user) {
            $servicio = ServicioConsultorio::find($id);

            if (!$servicio) {
                return [
                    'estado' => 'no_existe',
                    'servicio' => null,
                ];
            }

            $categoria = CategoriaServicio::find(
                $servicio->categoria_id
            );

            if (!$categoria || !$categoria->activo) {
                return [
                    'estado' => 'categoria_inactiva',
                    'servicio' => $servicio,
                ];
            }

            if ($servicio->activo) {
                return [
                    'estado' => 'ya_activo',
                    'servicio' => $servicio,
                ];
            }

            $servicio->update([
                'activo' => true,
            ]);

            AuditoriaService::registrarAccion(
                $user,
                'servicios',
                'activar_servicio',
                "Activaste el servicio {$servicio->nombre}."
            );

            return [
                'estado' => 'activado',
                'servicio' => $servicio->fresh()->load('categoria'),
            ];
        });
    }

    public function eliminar(
        string $id,
        User $user
    ): string {
        return DB::transaction(function () use ($id, $user) {
            $servicio = ServicioConsultorio::find($id);

            if (!$servicio) {
                return 'no_existe';
            }

            $nombre = $servicio->nombre;

            $servicio->delete();

            AuditoriaService::registrarAccion(
                $user,
                'servicios',
                'eliminar_servicio',
                "Eliminaste el servicio {$nombre}."
            );

            return 'eliminado';
        });
    }
}
