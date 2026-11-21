<?php

namespace App\Jobs;

use App\Services\Integracion\NotificadorCita;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Queue\Queueable;
use Throwable;

/**
 * Tema 3.1 - CONSUMIDOR.
 *
 * Lo ejecuta el worker:  php artisan queue:work --queue=notificaciones-cita
 * Si handle() termina sin error, Laravel borra el mensaje de la cola (ack).
 * Si lanza una excepción, el mensaje vuelve a la cola y se reintenta;
 * tras 3 intentos fallidos pasa a la tabla failed_jobs.
 */
class ProcesarNotificacionCita implements ShouldQueue
{
    use Queueable;

    public int $tries = 3;
    public int $backoff = 5;

    public function __construct(public array $mensaje)
    {
        $this->onQueue(NotificadorCita::COLA);
    }

    public function handle(NotificadorCita $notificador): void
    {
        $notificador->procesar($this->mensaje);
    }

    // Se ejecuta cuando se agotan los reintentos
    public function failed(?Throwable $e): void
    {
        app(NotificadorCita::class)->registrarEstado($this->mensaje, 'fallido', $e?->getMessage());
    }
}
