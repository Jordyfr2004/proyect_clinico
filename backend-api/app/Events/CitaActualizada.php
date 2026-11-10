<?php

namespace App\Events;

use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Broadcasting\PrivateChannel;
use Illuminate\Contracts\Broadcasting\ShouldBroadcastNow;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

class CitaActualizada implements ShouldBroadcastNow
{
    use Dispatchable, InteractsWithSockets, SerializesModels;

    public function __construct(
        public string $citaId,
        public string $pacienteId,
        public string $tipo
    ) {
    }

    public function broadcastOn(): array
    {
        return [
            new PrivateChannel('clinica.doctora'),
            new PrivateChannel(
                'paciente.' . $this->pacienteId
            ),
        ];
    }

    public function broadcastAs(): string
    {
        return 'cita_actualizada';
    }

    public function broadcastWith(): array
    {
        return [
            'cita_id' => $this->citaId,
            'paciente_id' => $this->pacienteId,
            'tipo' => $this->tipo,
        ];
    }
}
