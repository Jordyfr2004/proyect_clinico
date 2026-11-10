<?php

namespace App\Services;

use App\Models\Actividad;
use App\Models\Paciente;
use App\Models\User;
use Carbon\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class ActividadService
{
    public function listar(array $filtros)
    {
        $query = Actividad::query()
            ->with('paciente');

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

        if (!empty($filtros['codigo_paciente'])) {
            $query->whereHas(
                'paciente',
                function ($q) use ($filtros) {
                    $q->where(
                        'codigo_paciente',
                        $filtros['codigo_paciente']
                    );
                }
            );
        }

        return $query
            ->orderBy('fecha', 'desc')
            ->get();
    }

    public function obtenerPorId(
        string $id
    ): ?Actividad {
        return Actividad::with('paciente')
            ->find($id);
    }

    public function crear(
        array $datos,
        User $user
    ): Actividad {
        return DB::transaction(function () use ($datos, $user) {
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

            $detalle = $user->role === 'doctora'
                ? "Registraste una actividad para el paciente {$paciente->codigo_paciente}."
                : "Asistente registró una actividad para el paciente {$paciente->codigo_paciente}.";

            AuditoriaService::registrarAccion(
                $user,
                'actividades',
                'crear',
                $detalle
            );

            return $actividad->load('paciente');
        });
    }

    public function actualizar(
        string $id,
        array $datos,
        User $user
    ): ?Actividad {
        return DB::transaction(function () use ($id, $datos, $user) {
            $actividad = Actividad::find($id);

            if (!$actividad) {
                return null;
            }

            if ($actividad->agenda_id) {
                $errores = [];
                if (isset($datos['codigo_paciente']) && $datos['codigo_paciente'] !== $actividad->paciente->codigo_paciente) {
                    $errores['codigo_paciente'] = 'El paciente corresponde a la cita vinculada.';
                }
                if (isset($datos['fecha']) && Carbon::parse($datos['fecha'])->toDateString() !== $actividad->fecha->toDateString()) {
                    $errores['fecha'] = 'Corrige la fecha desde la cita vinculada.';
                }
                if ($errores) {
                    throw ValidationException::withMessages($errores);
                }
            }

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

            $detalle = $user->role === 'doctora'
                ? "Actualizaste una actividad del paciente {$actividad->paciente->codigo_paciente}."
                : "Asistente actualizó una actividad del paciente {$actividad->paciente->codigo_paciente}.";

            AuditoriaService::registrarAccion(
                $user,
                'actividades',
                'actualizar',
                $detalle
            );

            return $actividad;
        });
    }

    public function eliminar(
        string $id,
        User $user
    ): bool {
        return DB::transaction(function () use ($id, $user) {
            $actividad = Actividad::with('paciente')
                ->find($id);

            if (!$actividad) {
                return false;
            }

            $codigoPaciente =
                $actividad->paciente->codigo_paciente;

            $actividad->delete();

            $detalle = $user->role === 'doctora'
                ? "Eliminaste una actividad del paciente {$codigoPaciente}."
                : "Asistente eliminó una actividad del paciente {$codigoPaciente}.";

            AuditoriaService::registrarAccion(
                $user,
                'actividades',
                'eliminar',
                $detalle
            );

            return true;
        });
    }

    public function buscarPacientePorCodigo(
        string $codigo
    ): ?Paciente {
        return Paciente::where(
            'codigo_paciente',
            $codigo
        )->first();
    }

    public function resumen(
        array $datos
    ): string {
        $query = Actividad::query();

        if ($datos['periodo'] === 'dia') {
            $fecha = Carbon::parse(
                $datos['fecha']
            );

            $query->whereDate(
                'fecha',
                $fecha
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
            (float) $query->sum('precio'),
            2,
            '.',
            ''
        );
    }
}