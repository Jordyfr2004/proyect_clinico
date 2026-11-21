<?php

namespace App\Events;

use App\Models\Agenda;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Support\Carbon;
use Illuminate\Support\Str;

/**
 * Evento de dominio: "algo le pasó a una cita médica".
 *
 * Lo publica AgendaObserver después de que la transacción se confirma en la
 * base de datos. Quien lo produce no sabe quién lo consume: cada consumidor
 * se registra por su cuenta en AppServiceProvider (publicador/suscriptor).
 */
class CitaCambioEstado
{
    use Dispatchable;

    public const TIPOS = [
        'solicitada',
        'creada',
        'programada',
        'reprogramacion_solicitada',
        'reprogramada',
        'cancelada',
        'completada',
        'actualizada',
    ];

    public function __construct(
        public readonly string $eventoId,
        public readonly string $tipo,
        public readonly string $citaId,
        public readonly string $pacienteId,
        public readonly ?string $pacienteNombre,
        public readonly string $estado,
        public readonly ?string $fecha,
        public readonly ?string $horaInicio,
        public readonly string $instancia,
        public readonly string $ocurridoEn,
    ) {}

    public static function desdeCita(Agenda $cita, string $tipo): self
    {
        return new self(
            eventoId: (string) Str::uuid(),
            tipo: $tipo,
            citaId: (string) $cita->id,
            pacienteId: (string) $cita->paciente_id,
            pacienteNombre: $cita->paciente?->nombres,
            estado: (string) $cita->estado,
            fecha: $cita->fecha?->format('Y-m-d'),
            horaInicio: $cita->hora_inicio ? substr((string) $cita->hora_inicio, 0, 5) : null,
            instancia: (string) config('app.instancia'),
            ocurridoEn: Carbon::now()->toIso8601String(),
        );
    }

    /** Representación pública del evento (lo que viaja por el WebSocket y a la bitácora). */
    public function aArreglo(): array
    {
        return [
            'evento_id' => $this->eventoId,
            'tipo' => $this->tipo,
            'cita_id' => $this->citaId,
            'paciente_id' => $this->pacienteId,
            'paciente_nombre' => $this->pacienteNombre,
            'estado' => $this->estado,
            'fecha' => $this->fecha,
            'hora_inicio' => $this->horaInicio,
            'instancia' => $this->instancia,
            'ocurrido_en' => $this->ocurridoEn,
        ];
    }
}
