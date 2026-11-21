<?php

namespace App\Events;

use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Broadcasting\PrivateChannel;
use Illuminate\Contracts\Broadcasting\ShouldBroadcastNow;
use Illuminate\Foundation\Events\Dispatchable;

/**
 * Mensaje que se difunde por WebSocket (Laravel Reverb) a los clientes.
 *
 * Canales privados: solo los escucha quien autoriza routes/channels.php
 * (la doctora, o el paciente dueño de la cita).
 */
class CitaActualizada implements ShouldBroadcastNow
{
    use Dispatchable, InteractsWithSockets;

    public function __construct(public readonly CitaCambioEstado $evento) {}

    public function broadcastOn(): array
    {
        return [
            new PrivateChannel('clinica.doctora'),
            new PrivateChannel('paciente.'.$this->evento->pacienteId),
        ];
    }

    public function broadcastAs(): string
    {
        return 'cita_actualizada';
    }

    public function broadcastWith(): array
    {
        return $this->evento->aArreglo();
    }
}
