<?php

namespace App\Services;

use App\Models\Agenda;
use App\Models\Paciente;
use App\Models\User;
use Carbon\Carbon;
use Closure;
use Illuminate\Database\QueryException;
use Illuminate\Support\Facades\DB;

class AgendaService
{
    private function horarioOcupado(
        string $fecha,
        string $horaInicio,
        string $horaFin,
        ?string $excluirId = null
    ): bool {
        return Agenda::whereDate('fecha', $fecha)
            ->whereTime(
                'hora_inicio',
                '<',
                substr($horaFin, 0, 5) . ':00'
            )
            ->whereTime(
                'hora_fin',
                '>',
                substr($horaInicio, 0, 5) . ':00'
            )
            ->where(function ($query) {
                $query->where('tipo', 'personal')
                    ->orWhere(function ($q) {
                        $q->where('tipo', 'cita_medica')
                            ->whereIn(
                                'estado',
                                ['programada', 'completada']
                            );
                    });
            })
            ->when(
                $excluirId,
                function ($query) use ($excluirId) {
                    $query->where(
                        'id',
                        '!=',
                        $excluirId
                    );
                }
            )
            ->exists();
    }

    /**
     * Indica si la excepción es la violación de una restricción concreta. El nombre
     * se busca sin comillas porque PostgreSQL las cambia según el idioma del servidor
     * ("nombre" en inglés, «nombre» en español).
     */
    private function violaRestriccion(
        QueryException $exception,
        string $sqlstate,
        string $restriccion
    ): bool {
        return ($exception->errorInfo[0] ?? null) === $sqlstate
            && preg_match('/\b' . preg_quote($restriccion, '/') . '\b/u', $exception->errorInfo[2] ?? '') === 1;
    }

    private function ejecutarConControlDeHorario(
        Closure $operacion,
        ?string $registroId = null
    ): array {
        try {
            return DB::transaction($operacion);
        } catch (QueryException $exception) {
            if (
                !$this->violaRestriccion($exception, '23P01', 'agenda_sin_solapamientos')
            ) {
                throw $exception;
            }

            // La transaccion ya hizo rollback; consultar aqui evita usar datos revertidos.
            return [
                'estado' => 'horario_ocupado',
                'registro' => $registroId ? Agenda::find($registroId) : null,
            ];
        }
    }

    public function listar(array $filtros)
    {
        $query = Agenda::query()
            ->with('paciente')
            ->orderBy('fecha')
            ->orderBy('hora_inicio');

        if (!empty($filtros['fecha'])) {
            $query->whereDate(
                'fecha',
                $filtros['fecha']
            );
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

        if (!empty($filtros['tipo'])) {
            $query->where(
                'tipo',
                $filtros['tipo']
            );
        }

        if (!empty($filtros['estado'])) {
            $query->where(
                'estado',
                $filtros['estado']
            );
        }

        return $query->get();
    }

    public function obtenerPorId(
        string $id
    ): ?Agenda {
        return Agenda::with('paciente')
            ->find($id);
    }

    public function crearPersonal(
        array $datos,
        User $user
    ): array {
        return $this->ejecutarConControlDeHorario(function () use ($datos, $user) {
            if (
                $this->horarioOcupado(
                    $datos['fecha'],
                    $datos['hora_inicio'],
                    $datos['hora_fin']
                )
            ) {
                return [
                    'estado' => 'horario_ocupado',
                    'registro' => null,
                ];
            }

            $registro = Agenda::create([
                'paciente_id' => null,
                'fecha' => $datos['fecha'],
                'hora_inicio' => $datos['hora_inicio'],
                'hora_fin' => $datos['hora_fin'],
                'tipo' => 'personal',
                'descripcion' => $datos['descripcion'],
                'estado' => null,
            ]);

            AuditoriaService::registrarAccion(
                $user,
                'agenda',
                'crear',
                'Registraste una actividad personal en la agenda.'
            );

            return [
                'estado' => 'creado',
                'registro' => $registro,
            ];
        });
    }

    public function crearCitaMedica(
        array $datos,
        User $user
    ): array {
        return $this->ejecutarConControlDeHorario(function () use ($datos, $user) {
            $paciente = Paciente::where(
                'codigo_paciente',
                $datos['codigo_paciente']
            )->firstOrFail();

            if (
                $this->horarioOcupado(
                    $datos['fecha'],
                    $datos['hora_inicio'],
                    $datos['hora_fin']
                )
            ) {
                return [
                    'estado' => 'horario_ocupado',
                    'registro' => null,
                ];
            }

            $registro = Agenda::create([
                'paciente_id' => $paciente->id,
                'fecha' => $datos['fecha'],
                'hora_inicio' => $datos['hora_inicio'],
                'hora_fin' => $datos['hora_fin'],
                'tipo' => 'cita_medica',
                'descripcion' => $datos['descripcion'] ?? null,
                'estado' => 'programada',
            ]);

            AuditoriaService::registrarAccion(
                $user,
                'agenda',
                'crear_cita',
                "Programaste una cita médica para el paciente {$paciente->codigo_paciente}."
            );

            return [
                'estado' => 'creado',
                'registro' => $registro->load('paciente'),
            ];
        });
    }

    public function solicitarCita(
        User $user
    ): array {
        if (!$user->paciente_id) {
            return [
                'estado' => 'sin_paciente',
                'registro' => null,
            ];
        }

        $pendiente = Agenda::where(
            'paciente_id',
            $user->paciente_id
        )
            ->where(
                'tipo',
                'cita_medica'
            )
            ->where(
                'estado',
                'pendiente'
            )
            ->exists();

        if ($pendiente) {
            return [
                'estado' => 'solicitud_existente',
                'registro' => null,
            ];
        }

        try {
            $registro = DB::transaction(fn () => Agenda::create([
                'paciente_id' => $user->paciente_id,
                'fecha' => null,
                'hora_inicio' => null,
                'hora_fin' => null,
                'tipo' => 'cita_medica',
                'descripcion' => null,
                'estado' => 'pendiente',
            ]));
        } catch (QueryException $exception) {
            if (
                !$this->violaRestriccion($exception, '23505', 'agenda_paciente_pendiente_unico')
            ) {
                throw $exception;
            }

            return [
                'estado' => 'solicitud_existente',
                'registro' => null,
            ];
        }

        return [
            'estado' => 'creado',
            'registro' => $registro,
        ];
    }

    public function programarSolicitud(
        string $id,
        array $datos,
        User $user
    ): array {
        return $this->ejecutarConControlDeHorario(function () use ($id, $datos, $user) {
            $registro = Agenda::find($id);

            if (!$registro) {
                return [
                    'estado' => 'no_encontrado',
                    'registro' => null,
                ];
            }

            if (
                $registro->tipo !== 'cita_medica' ||
                $registro->estado !== 'pendiente'
            ) {
                return [
                    'estado' => 'no_pendiente',
                    'registro' => $registro,
                ];
            }

            if (
                $this->horarioOcupado(
                    $datos['fecha'],
                    $datos['hora_inicio'],
                    $datos['hora_fin']
                )
            ) {
                return [
                    'estado' => 'horario_ocupado',
                    'registro' => $registro,
                ];
            }

            $registro->update([
                'fecha' => $datos['fecha'],
                'hora_inicio' => $datos['hora_inicio'],
                'hora_fin' => $datos['hora_fin'],
                'estado' => 'programada',
            ]);

            $registro->load('paciente');

            AuditoriaService::registrarAccion(
                $user,
                'agenda',
                'programar_cita',
                "Programaste una solicitud de cita del paciente {$registro->paciente->codigo_paciente}."
            );

            return [
                'estado' => 'programado',
                'registro' => $registro,
            ];
        }, $id);
    }

    public function actualizar(
        string $id,
        array $datos,
        User $user
    ): array {
        return $this->ejecutarConControlDeHorario(function () use ($id, $datos, $user) {
            $registro = Agenda::lockForUpdate()->find($id);

            if (!$registro) {
                return [
                    'estado' => 'no_encontrado',
                    'registro' => null,
                ];
            }

            $cambiaHorario =
                array_key_exists('fecha', $datos) ||
                array_key_exists('hora_inicio', $datos) ||
                array_key_exists('hora_fin', $datos);

            if (
                $cambiaHorario &&
                $registro->estado === 'pendiente'
            ) {
                return [
                    'estado' => 'solicitud_pendiente',
                    'registro' => $registro,
                ];
            }

            $fecha = $datos['fecha']
                ?? $registro->fecha?->toDateString();

            $horaInicio = $datos['hora_inicio']
                ?? $registro->hora_inicio;

            $horaFin = $datos['hora_fin']
                ?? $registro->hora_fin;

            if (
                $cambiaHorario &&
                (!$fecha || !$horaInicio || !$horaFin)
            ) {
                return [
                    'estado' => 'horario_incompleto',
                    'registro' => $registro,
                ];
            }

            if (
                $cambiaHorario &&
                substr($horaFin, 0, 5)
                    <= substr($horaInicio, 0, 5)
            ) {
                return [
                    'estado' => 'hora_invalida',
                    'registro' => $registro,
                ];
            }

            if (
                $cambiaHorario &&
                $registro->estado !== 'cancelada' &&
                $this->horarioOcupado(
                    $fecha,
                    $horaInicio,
                    $horaFin,
                    $registro->id
                )
            ) {
                return [
                    'estado' => 'horario_ocupado',
                    'registro' => $registro,
                ];
            }

            $registro->update($datos);

            // La fecha contable sigue la fecha de atención corregida.
            if (isset($datos['fecha']) && $registro->estado === 'completada') {
                $registro->actividad()->update(['fecha' => $registro->fecha->toDateString()]);
            }

            $registro->load('paciente');

            if ($registro->tipo === 'personal') {
                $detalle =
                    'Actualizaste una actividad personal de la agenda.';
            } else {
                $detalle =
                    "Actualizaste una cita médica del paciente {$registro->paciente->codigo_paciente}.";
            }

            AuditoriaService::registrarAccion(
                $user,
                'agenda',
                'actualizar',
                $detalle
            );

            return [
                'estado' => 'actualizado',
                'registro' => $registro,
            ];
        }, $id);
    }

    public function registrarDatosClinicos(
        string $id,
        array $datos,
        User $user
    ): array {
        return DB::transaction(function () use ($id, $datos, $user) {
            $registro = Agenda::find($id);

            if (!$registro) {
                return [
                    'estado' => 'no_encontrado',
                    'registro' => null,
                ];
            }

            if ($registro->tipo !== 'cita_medica') {
                return [
                    'estado' => 'no_es_cita',
                    'registro' => $registro,
                ];
            }

            if ($registro->estado === 'pendiente') {
                return [
                    'estado' => 'pendiente',
                    'registro' => $registro,
                ];
            }

            if ($registro->estado === 'cancelada') {
                return [
                    'estado' => 'cancelada',
                    'registro' => $registro,
                ];
            }

            $registro->update([
                'diagnostico' => $datos['diagnostico'],
                'tratamiento' => $datos['tratamiento'],
                'observacion' => $datos['observacion'] ?? null,
            ]);

            $registro->load('paciente');

            AuditoriaService::registrarAccion(
                $user,
                'agenda',
                'datos_clinicos',
                "Registraste datos clínicos de la cita del paciente {$registro->paciente->codigo_paciente}."
            );

            return [
                'estado' => 'registrado',
                'registro' => $registro,
            ];
        });
    }

    public function cancelarCita(
        string $id,
        User $user
    ): array {
        return DB::transaction(function () use ($id, $user) {
            $registro = Agenda::find($id);

            if (!$registro) {
                return [
                    'estado' => 'no_encontrado',
                    'registro' => null,
                ];
            }

            if ($registro->tipo !== 'cita_medica') {
                return [
                    'estado' => 'no_es_cita',
                    'registro' => $registro,
                ];
            }

            if ($registro->estado === 'cancelada') {
                return [
                    'estado' => 'ya_cancelada',
                    'registro' => $registro,
                ];
            }

            if ($registro->estado === 'completada') {
                return [
                    'estado' => 'completada',
                    'registro' => $registro,
                ];
            }

            $registro->update([
                'estado' => 'cancelada',
            ]);

            $registro->load('paciente');

            AuditoriaService::registrarAccion(
                $user,
                'agenda',
                'cancelar_cita',
                "Cancelaste una cita médica del paciente {$registro->paciente->codigo_paciente}."
            );

            return [
                'estado' => 'cancelada',
                'registro' => $registro,
            ];
        });
    }

    public function completarCita(
        string $id,
        User $user,
        array $datos
    ): array {
        return DB::transaction(function () use ($id, $user, $datos) {
            $registro = Agenda::lockForUpdate()->find($id);

            if (!$registro) {
                return [
                    'estado' => 'no_encontrado',
                    'registro' => null,
                ];
            }

            if (
                $registro->tipo !== 'cita_medica' ||
                $registro->estado !== 'programada'
            ) {
                return [
                    'estado' => 'no_programada',
                    'registro' => $registro,
                ];
            }

            if (
                !$registro->diagnostico ||
                !$registro->tratamiento
            ) {
                return [
                    'estado' => 'sin_datos_clinicos',
                    'registro' => $registro,
                ];
            }

            $registro->update([
                'estado' => 'completada',
            ]);

            $registro->load('paciente');

            $actividad = app(ActividadService::class)->crear([
                'codigo_paciente' => $registro->paciente->codigo_paciente,
                'fecha' => $registro->fecha->toDateString(),
                'actividad' => $datos['actividad'] ?? 'Consulta médica',
                'precio' => $datos['precio'],
            ], $user);
            $actividad->agenda()->associate($registro);
            $actividad->save();
            $registro->load('actividad');

            AuditoriaService::registrarAccion(
                $user,
                'agenda',
                'completar_cita',
                "Marcaste como completada la cita médica del paciente {$registro->paciente->codigo_paciente}."
            );

            return [
                'estado' => 'completada',
                'registro' => $registro,
            ];
        });
    }

    public function misCitas(
        User $user
    ): array {
        if (!$user->paciente_id) {
            return [
                'estado' => 'sin_paciente',
                'citas' => [],
            ];
        }

        $citas = Agenda::where(
            'paciente_id',
            $user->paciente_id
        )
            ->where(
                'tipo',
                'cita_medica'
            )
            ->orderBy('fecha')
            ->orderBy('hora_inicio')
            ->get();

        return [
            'estado' => 'ok',
            'citas' => $citas,
        ];
    }

    /**
     * Cita médica del paciente autenticado, o null si no le pertenece.
     */
    private function citaDelPaciente(
        string $id,
        User $user
    ): ?Agenda {
        return Agenda::where('id', $id)
            ->where('paciente_id', $user->paciente_id)
            ->where('tipo', 'cita_medica')
            ->lockForUpdate()
            ->first();
    }

    private function yaInicio(
        Agenda $registro
    ): bool {
        if (!$registro->fecha || !$registro->hora_inicio) {
            return false;
        }

        $inicio = Carbon::parse(
            $registro->fecha->format('Y-m-d') . ' ' . $registro->hora_inicio,
            config('app.timezone')
        );

        return $inicio->lessThanOrEqualTo(now());
    }

    public function cancelarMiCita(
        string $id,
        User $user
    ): array {
        if (!$user->paciente_id) {
            return [
                'estado' => 'sin_paciente',
                'registro' => null,
            ];
        }

        return DB::transaction(function () use ($id, $user) {
            $registro = $this->citaDelPaciente($id, $user);

            if (!$registro) {
                return [
                    'estado' => 'no_encontrado',
                    'registro' => null,
                ];
            }

            if ($registro->estado === 'cancelada') {
                return [
                    'estado' => 'ya_cancelada',
                    'registro' => $registro,
                ];
            }

            if ($registro->estado === 'completada') {
                return [
                    'estado' => 'completada',
                    'registro' => $registro,
                ];
            }

            if ($this->yaInicio($registro)) {
                return [
                    'estado' => 'ya_inicio',
                    'registro' => $registro,
                ];
            }

            $registro->update([
                'estado' => 'cancelada',
            ]);

            AuditoriaService::registrarAccion(
                $user,
                'agenda',
                'cancelar_cita_paciente',
                'Cancelaste tu cita médica.'
            );

            return [
                'estado' => 'cancelada',
                'registro' => $registro->fresh(),
            ];
        });
    }

    /**
     * El paciente pide otra fecha: la cita vuelve a "pendiente", se libera el
     * horario y la doctora la programa de nuevo con programarSolicitud().
     */
    public function reprogramarMiCita(
        string $id,
        User $user,
        ?string $motivo = null
    ): array {
        if (!$user->paciente_id) {
            return [
                'estado' => 'sin_paciente',
                'registro' => null,
            ];
        }

        try {
            return DB::transaction(function () use ($id, $user, $motivo) {
                $registro = $this->citaDelPaciente($id, $user);

                if (!$registro) {
                    return [
                        'estado' => 'no_encontrado',
                        'registro' => null,
                    ];
                }

                if ($registro->estado !== 'programada') {
                    return [
                        'estado' => 'no_programada',
                        'registro' => $registro,
                    ];
                }

                if ($this->yaInicio($registro)) {
                    return [
                        'estado' => 'ya_inicio',
                        'registro' => $registro,
                    ];
                }

                $pendiente = Agenda::where('paciente_id', $user->paciente_id)
                    ->where('tipo', 'cita_medica')
                    ->where('estado', 'pendiente')
                    ->exists();

                if ($pendiente) {
                    return [
                        'estado' => 'solicitud_existente',
                        'registro' => $registro,
                    ];
                }

                $nota = 'Reprogramación solicitada por el paciente. Fecha anterior: '
                    . $registro->fecha->format('Y-m-d') . ' '
                    . substr($registro->hora_inicio, 0, 5) . '.';

                if ($motivo) {
                    $nota .= " Motivo: {$motivo}";
                }

                $registro->update([
                    'fecha' => null,
                    'hora_inicio' => null,
                    'hora_fin' => null,
                    'estado' => 'pendiente',
                    'descripcion' => trim(($registro->descripcion ?? '') . "\n" . $nota),
                ]);

                AuditoriaService::registrarAccion(
                    $user,
                    'agenda',
                    'reprogramar_cita_paciente',
                    'Solicitaste reprogramar tu cita médica.'
                );

                return [
                    'estado' => 'reprogramacion_solicitada',
                    'registro' => $registro->fresh(),
                ];
            });
        } catch (QueryException $exception) {
            if (
                !$this->violaRestriccion($exception, '23505', 'agenda_paciente_pendiente_unico')
            ) {
                throw $exception;
            }

            return [
                'estado' => 'solicitud_existente',
                'registro' => null,
            ];
        }
    }

    public function eliminar(
        string $id,
        User $user
    ): bool {
        return DB::transaction(function () use ($id, $user) {
            $registro = Agenda::with('paciente')
                ->find($id);

            if (!$registro) {
                return false;
            }

            if ($registro->tipo === 'personal') {
                $detalle =
                    'Eliminaste una actividad personal de la agenda.';
            } else {
                $codigoPaciente =
                    $registro->paciente?->codigo_paciente;

                $detalle =
                    "Eliminaste una cita médica del paciente {$codigoPaciente}.";
            }

            $registro->delete();

            AuditoriaService::registrarAccion(
                $user,
                'agenda',
                'eliminar',
                $detalle
            );

            return true;
        });
    }
}
