<?php

namespace App\Services;

use App\Models\CategoriaServicio;
use App\Models\User;
use Illuminate\Support\Facades\DB;

class CategoriaServicioService
{
    public function listar()
    {
        return CategoriaServicio::query()
            ->orderBy('nombre')
            ->get();
    }

    public function listarActivas()
    {
        return CategoriaServicio::query()
            ->where('activo', true)
            ->orderBy('nombre')
            ->get();
    }

    public function obtenerPorId(
        string $id
    ): ?CategoriaServicio {
        return CategoriaServicio::find($id);
    }

    public function crear(
        array $datos,
        User $user
    ): CategoriaServicio {
        return DB::transaction(function () use ($datos, $user) {
            $categoria = CategoriaServicio::create([
                'nombre' => $datos['nombre'],
                'activo' => true,
            ]);

            AuditoriaService::registrarAccion(
                $user,
                'servicios',
                'crear_categoria_servicio',
                "Creaste la categoría de servicio {$categoria->nombre}."
            );

            return $categoria;
        });
    }

    public function actualizar(
        string $id,
        array $datos,
        User $user
    ): ?CategoriaServicio {
        return DB::transaction(function () use ($id, $datos, $user) {
            $categoria = CategoriaServicio::find($id);

            if (!$categoria) {
                return null;
            }

            $categoria->update([
                'nombre' => $datos['nombre'],
            ]);

            AuditoriaService::registrarAccion(
                $user,
                'servicios',
                'actualizar_categoria_servicio',
                "Actualizaste la categoría de servicio {$categoria->nombre}."
            );

            return $categoria->fresh();
        });
    }

    public function desactivar(
        string $id,
        User $user
    ): ?CategoriaServicio {
        return DB::transaction(function () use ($id, $user) {
            $categoria = CategoriaServicio::find($id);

            if (!$categoria) {
                return null;
            }

            $categoria->update([
                'activo' => false,
            ]);

            AuditoriaService::registrarAccion(
                $user,
                'servicios',
                'desactivar_categoria_servicio',
                "Desactivaste la categoría de servicio {$categoria->nombre}."
            );

            return $categoria->fresh();
        });
    }

    public function activar(
        string $id,
        User $user
    ): ?CategoriaServicio {
        return DB::transaction(function () use ($id, $user) {
            $categoria = CategoriaServicio::find($id);

            if (!$categoria) {
                return null;
            }

            $categoria->update([
                'activo' => true,
            ]);

            AuditoriaService::registrarAccion(
                $user,
                'servicios',
                'activar_categoria_servicio',
                "Activaste la categoría de servicio {$categoria->nombre}."
            );

            return $categoria->fresh();
        });
    }

    public function eliminar(
        string $id,
        User $user
    ): string {
        return DB::transaction(function () use ($id, $user) {
            $categoria = CategoriaServicio::find($id);

            if (!$categoria) {
                return 'no_existe';
            }

            if ($categoria->servicios()->exists()) {
                return 'tiene_servicios';
            }

            $nombre = $categoria->nombre;

            $categoria->delete();

            AuditoriaService::registrarAccion(
                $user,
                'servicios',
                'eliminar_categoria_servicio',
                "Eliminaste la categoría de servicio {$nombre}."
            );

            return 'eliminado';
        });
    }
}
