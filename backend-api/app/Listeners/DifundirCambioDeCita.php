<?php

namespace App\Listeners;

use App\Events\CitaActualizada;
use App\Events\CitaCambioEstado;
use Illuminate\Support\Facades\Log;
use Throwable;

/**
 * Consumidor 1 (síncrono): difunde el evento por WebSocket a los clientes
 * conectados (panel web de la doctora, app del paciente).
 *
 * Si el servidor de WebSockets (Reverb) no responde, la cita ya quedó
 * guardada: se registra una advertencia y la petición termina bien. Los
 * clientes se ponen al día en su siguiente consulta (degradación controlada).
 */
class DifundirCambioDeCita
{
    public function handle(CitaCambioEstado $evento): void
    {
        try {
            broadcast(new CitaActualizada($evento));
        } catch (Throwable $e) {
            Log::warning('No se pudo difundir el evento de la cita por WebSocket.', [
                'evento_id' => $evento->eventoId,
                'tipo' => $evento->tipo,
                'error' => $e->getMessage(),
            ]);
        }
    }
}
