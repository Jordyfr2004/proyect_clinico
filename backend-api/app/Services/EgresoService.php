<?php

namespace App\Services;

use App\Models\Egreso;
use App\Models\User;
use Carbon\Carbon;
use Illuminate\Support\Facades\DB;

class EgresoService
{
    public function listar(array $filtros)
    {
        $query = Egreso::query()
            ->orderBy('fecha', 'desc');

        if (!empty($filtros['fecha'])) {
            $query->whereDate(
                'fecha',
                $filtros['fecha']
            );
        }

        if (!empty($filtros['semana'])) {
            $fecha = Carbon::parse(
                $filtros['semana']
            );

            $query->whereBetween('fecha', [
                $fecha->copy()->startOfWeek(),
                $fecha->copy()->endOfWeek(),
            ]);
        }

        if (
            !empty($filtros['mes']) &&
            !empty($filtros['anio'])
        ) {
            $query->whereMonth(
                'fecha',
                $filtros['mes']
            )
                ->whereYear(
                    'fecha',
                    $filtros['anio']
                );
        }

        if (
            !empty($filtros['anio']) &&
            empty($filtros['mes'])
        ) {
            $query->whereYear(
                'fecha',
                $filtros['anio']
            );
        }

        return $query->get();
    }

    public function obtenerPorId(
        string $id
    ): ?Egreso {
        return Egreso::find($id);
    }

    public function crear(
        array $datos,
        User $user
    ): Egreso {
        return DB::transaction(function () use ($datos, $user) {
            $egreso = Egreso::create([
                'fecha' => $datos['fecha'],
                'concepto' => $datos['concepto'],
                'monto' => $datos['monto'],
            ]);

            AuditoriaService::registrarAccion(
                $user,
                'egresos',
                'crear',
                "Registraste un egreso de $" . number_format(
                    (float) $egreso->monto,
                    2,
                    '.',
                    ''
                ) . " por {$egreso->concepto}."
            );

            return $egreso;
        });
    }

    public function actualizar(
        string $id,
        array $datos,
        User $user
    ): ?Egreso {
        return DB::transaction(function () use ($id, $datos, $user) {
            $egreso = Egreso::find($id);

            if (!$egreso) {
                return null;
            }

            $egreso->update($datos);

            AuditoriaService::registrarAccion(
                $user,
                'egresos',
                'actualizar',
                "Actualizaste un egreso de $" . number_format(
                    (float) $egreso->monto,
                    2,
                    '.',
                    ''
                ) . " por {$egreso->concepto}."
            );

            return $egreso->fresh();
        });
    }

    public function eliminar(
        string $id,
        User $user
    ): bool {
        return DB::transaction(function () use ($id, $user) {
            $egreso = Egreso::find($id);

            if (!$egreso) {
                return false;
            }

            $monto = $egreso->monto;
            $concepto = $egreso->concepto;

            $egreso->delete();

            AuditoriaService::registrarAccion(
                $user,
                'egresos',
                'eliminar',
                "Eliminaste un egreso de $" . number_format(
                    (float) $monto,
                    2,
                    '.',
                    ''
                ) . " por {$concepto}."
            );

            return true;
        });
    }

    public function resumen(
        array $datos
    ): string {
        $query = Egreso::query();

        if ($datos['periodo'] === 'dia') {
            $query->whereDate(
                'fecha',
                $datos['fecha']
            );
        }

        if ($datos['periodo'] === 'semana') {
            $fecha = Carbon::parse(
                $datos['fecha']
            );

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

        return number_format(
            (float) $query->sum('monto'),
            2,
            '.',
            ''
        );
    }
}