<?php

namespace App\Services;

use App\Models\AccionRegistrada;
use App\Models\SesionRegistrada;
use App\Models\User;
use Illuminate\Support\Facades\DB;

class AuditoriaService
{
    public static function registrarAccion(
        User $user,
        string $modulo,
        string $accion,
        string $detalle
    ): void {
        AccionRegistrada::create([
            'user_id' => $user->id,
            'usuario' => $user->name,
            'rol' => $user->role,
            'modulo' => $modulo,
            'accion' => $accion,
            'detalle' => $detalle,
            'visible' => true,
        ]);
    }

    public static function registrarSesion(
        User $user,
        string $accion
    ): void {
        SesionRegistrada::create([
            'user_id' => $user->id,
            'usuario' => $user->name,
            'rol' => $user->role,
            'accion' => $accion,
        ]);
    }

    public function listarAcciones(
        array $filtros
    ) {
        $query = AccionRegistrada::query()
            ->where('visible', true);

        if (!empty($filtros['fecha'])) {
            $query->whereDate(
                'created_at',
                $filtros['fecha']
            );
        }

        return $query
            ->orderByDesc('created_at')
            ->get();
    }

    public function listarSesiones(
        array $filtros
    ) {
        $query = SesionRegistrada::query();

        if (!empty($filtros['fecha'])) {
            $query->whereDate(
                'created_at',
                $filtros['fecha']
            );
        }

        return $query
            ->orderByDesc('created_at')
            ->get();
    }

    public function ocultarAccion(
        string $id
    ): bool {
        $accion = AccionRegistrada::find($id);

        if (!$accion) {
            return false;
        }

        $accion->update([
            'visible' => false,
        ]);

        return true;
    }

    /**
     * Historial de cambios registrado por los triggers de PostgreSQL
     * (auditoria.registro_cambios), del más reciente al más antiguo.
     */
    public function listarCambios(
        array $filtros
    ) {
        if (DB::getDriverName() !== 'pgsql') {
            return collect();
        }

        return DB::table('registro_cambios as c')
            ->leftJoin('users as u', 'u.id', '=', 'c.usuario_id')
            ->select('c.*', 'u.name as usuario', 'u.role as rol')
            ->when($filtros['tabla'] ?? null, fn ($q, $tabla) => $q->where('c.tabla', $tabla))
            ->when($filtros['registro_id'] ?? null, fn ($q, $id) => $q->where('c.registro_id', $id))
            ->when($filtros['usuario_id'] ?? null, fn ($q, $id) => $q->where('c.usuario_id', $id))
            ->when($filtros['fecha'] ?? null, fn ($q, $fecha) => $q->whereDate('c.fecha', $fecha))
            ->orderByDesc('c.id')
            ->limit(200)
            ->get()
            ->map(function ($fila) {
                $fila->datos_anteriores = json_decode($fila->datos_anteriores ?? 'null', true);
                $fila->datos_nuevos = json_decode($fila->datos_nuevos ?? 'null', true);
                $fila->campos_modificados = $fila->campos_modificados
                    ? str_getcsv(trim($fila->campos_modificados, '{}'))
                    : [];

                return $fila;
            });
    }
}
