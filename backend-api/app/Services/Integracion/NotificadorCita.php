<?php

namespace App\Services\Integracion;

use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Log;

/**
 * Tema 3.1 - Proceso que se ejecuta en segundo plano:
 * notificar al paciente que su cita fue registrada.
 *
 * Lo usan tanto el consumidor (Job) como el endpoint síncrono de comparación,
 * así ambos ejecutan exactamente el mismo trabajo.
 */
class NotificadorCita
{
    public const COLA = 'notificaciones-cita';

    // Simula el tiempo que tarda enviar la notificación (correo, WhatsApp, etc.)
    public static int $demoraSegundos = 3;

    public function procesar(array $mensaje): void
    {
        $this->registrarEstado($mensaje, 'procesando');

        sleep(self::$demoraSegundos);

        // Aquí iría el envío real. Para la práctica se deja la evidencia en el log.
        Log::info('Notificación de cita enviada', [
            'message_id' => $mensaje['message_id'],
            'correlation_id' => $mensaje['correlation_id'],
            'cita_id' => $mensaje['payload']['cita_id'],
        ]);

        $this->registrarEstado($mensaje, 'procesado');
    }

    /** Guarda el estado del mensaje y lo deja en el log con su correlation_id. */
    public function registrarEstado(array $mensaje, string $estado, ?string $detalle = null): void
    {
        Cache::put('mensaje:' . $mensaje['message_id'], [
            'message_id' => $mensaje['message_id'],
            'correlation_id' => $mensaje['correlation_id'],
            'estado' => $estado,
            'detalle' => $detalle,
            'actualizado_en' => now()->toIso8601String(),
        ], now()->addDay());

        Log::info('Mensaje ' . $estado, [
            'message_id' => $mensaje['message_id'],
            'correlation_id' => $mensaje['correlation_id'],
            'estado' => $estado,
        ]);
    }

    public function estado(string $messageId): ?array
    {
        return Cache::get('mensaje:' . $messageId);
    }
}
