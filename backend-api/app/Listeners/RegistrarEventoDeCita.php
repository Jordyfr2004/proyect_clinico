<?php

namespace App\Listeners;

use App\Events\CitaCambioEstado;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Support\Facades\Log;

/**
 * Consumidor 2 (asíncrono, por cola): deja cada evento en la bitácora
 * storage/logs/eventos.log.
 *
 * Va a la cola (QUEUE_CONNECTION=database, tabla jobs) y lo procesa un worker
 * aparte (php artisan queue:work). La petición del usuario no espera por él y,
 * si el worker está detenido, los eventos esperan en la cola sin perderse.
 */
class RegistrarEventoDeCita implements ShouldQueue
{
    public string $queue = 'eventos';

    public int $tries = 3;

    public function handle(CitaCambioEstado $evento): void
    {
        Log::channel('eventos')->info('cita.'.$evento->tipo, $evento->aArreglo());
    }
}
