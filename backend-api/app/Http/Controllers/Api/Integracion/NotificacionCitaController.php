<?php

namespace App\Http\Controllers\Api\Integracion;

use App\Http\Controllers\Controller;
use App\Jobs\ProcesarNotificacionCita;
use App\Services\Integracion\NotificadorCita;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Str;

/**
 * Tema 3.1 - PRODUCTOR.
 *
 * POST /api/notificaciones-cita            → asíncrono: publica en la cola y responde 202
 * POST /api/notificaciones-cita/sincrono   → síncrono: procesa y responde al terminar (200)
 * GET  /api/notificaciones-cita/{message_id} → consulta el estado del mensaje
 */
class NotificacionCitaController extends Controller
{
    public function __construct(private NotificadorCita $notificador)
    {
    }

    public function encolar(Request $request): JsonResponse
    {
        $mensaje = $this->construirMensaje($request);

        $this->notificador->registrarEstado($mensaje, 'encolado');
        ProcesarNotificacionCita::dispatch($mensaje);

        // 202: se recibió el pedido, pero todavía no se procesó
        return response()->json([
            'message' => 'Notificación recibida; se procesará en segundo plano.',
            'message_id' => $mensaje['message_id'],
            'correlation_id' => $mensaje['correlation_id'],
            'estado' => 'encolado',
        ], 202)->header('X-Correlation-ID', $mensaje['correlation_id']);
    }

    public function sincrono(Request $request): JsonResponse
    {
        $mensaje = $this->construirMensaje($request);

        // El cliente espera aquí hasta que termina el procesamiento
        $this->notificador->procesar($mensaje);

        return response()->json([
            'message' => 'Notificación procesada.',
            'message_id' => $mensaje['message_id'],
            'correlation_id' => $mensaje['correlation_id'],
            'estado' => 'procesado',
        ])->header('X-Correlation-ID', $mensaje['correlation_id']);
    }

    public function estado(string $messageId): JsonResponse
    {
        $estado = $this->notificador->estado($messageId);

        if (!$estado) {
            return response()->json(['message' => 'Mensaje no encontrado.'], 404);
        }

        return response()->json(['data' => $estado]);
    }

    /** Valida la entrada y arma el mensaje JSON con message_id y correlation_id. */
    private function construirMensaje(Request $request): array
    {
        $datos = $request->validate([
            'cita_id' => ['required', 'string', 'max:100'],
            'estado' => ['required', 'string', 'in:agendada,reprogramada,cancelada'],
            'canal' => ['required', 'string', 'in:correo,whatsapp,sms'],
        ]);

        // Preserva el X-Correlation-ID recibido o genera uno nuevo
        $correlationId = $request->header('X-Correlation-ID');
        if (!is_string($correlationId) || !preg_match('/^[A-Za-z0-9._-]{1,100}$/D', $correlationId)) {
            $correlationId = 'cita-' . $datos['cita_id'] . '-' . Str::lower(Str::random(6));
        }

        return [
            'message_id' => (string) Str::uuid(),
            'correlation_id' => $correlationId,
            'tipo' => 'notificacion_cita',
            'ocurrido_en' => now()->toIso8601String(),
            'payload' => $datos,
        ];
    }
}
