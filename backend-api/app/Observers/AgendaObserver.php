<?php

namespace App\Observers;

use App\Events\CitaCambioEstado;
use App\Models\Agenda;
use Illuminate\Contracts\Events\ShouldHandleEventsAfterCommit;

/**
 * Productor de eventos: convierte cada cambio relevante de una cita médica en
 * un evento de dominio CitaCambioEstado.
 *
 * Al estar en el modelo, cubre todos los casos de uso (paciente que solicita,
 * cancela o reprograma; doctora que programa, edita, cancela o completa) sin
 * tocar cada servicio. Implementa ShouldHandleEventsAfterCommit: si la
 * transacción se revierte, no se publica nada.
 */
class AgendaObserver implements ShouldHandleEventsAfterCommit
{
    private const CAMPOS_RELEVANTES = ['estado', 'fecha', 'hora_inicio', 'hora_fin'];

    public function created(Agenda $cita): void
    {
        if (! $this->esCitaDePaciente($cita)) {
            return;
        }

        $this->publicar($cita, $cita->estado === 'pendiente' ? 'solicitada' : 'creada');
    }

    public function updated(Agenda $cita): void
    {
        if (! $this->esCitaDePaciente($cita) || ! $cita->wasChanged(self::CAMPOS_RELEVANTES)) {
            return;
        }

        $this->publicar($cita, $this->tipoDeCambio($cita));
    }

    private function tipoDeCambio(Agenda $cita): string
    {
        if (! $cita->wasChanged('estado')) {
            return 'reprogramada';
        }

        $anterior = $cita->getPrevious()['estado'] ?? null;

        return match ($cita->estado) {
            'programada' => $anterior === 'pendiente' ? 'programada' : 'actualizada',
            'pendiente' => 'reprogramacion_solicitada',
            'cancelada' => 'cancelada',
            'completada' => 'completada',
            default => 'actualizada',
        };
    }

    private function esCitaDePaciente(Agenda $cita): bool
    {
        return $cita->tipo === 'cita_medica' && $cita->paciente_id !== null;
    }

    private function publicar(Agenda $cita, string $tipo): void
    {
        $cita->loadMissing('paciente');

        event(CitaCambioEstado::desdeCita($cita, $tipo));
    }
}
