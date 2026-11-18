<?php

namespace App\Services\Integracion;

use Illuminate\Http\Client\ConnectionException;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use RuntimeException;

/**
 * Práctica de orquestación.
 *
 * Consulta dos servicios HTTP independientes (usuarios y estados)
 * y compone una sola respuesta. Si alguno falla, devuelve null
 * y deja el detalle en storage/logs/laravel.log.
 */
class OrquestadorSolicitud
{
    // Este laboratorio usa siempre el usuario 7 (Ana).
    private const USUARIO_ID = 7;

    /**
     * @return array|null  Resumen compuesto, o null si una dependencia falló.
     */
    public function resumen(string $solicitudId, string $correlationId): ?array
    {
        $encabezados = ['X-Correlation-ID' => $correlationId];
        $urlUsuario = config('orquestacion.usuarios_url') . '/usuarios/' . self::USUARIO_ID;
        $urlEstado = config('orquestacion.estados_url') . '/estados/' . $solicitudId;

        try {
            // 1. Consultar el servicio de usuarios (máximo 3 segundos)
            $respuestaUsuarios = Http::acceptJson()
                ->withHeaders($encabezados)
                ->connectTimeout(3)
                ->timeout(3)
                ->get($urlUsuario);

            // 2. Consultar el servicio de estados (máximo 3 segundos)
            $respuestaEstados = Http::acceptJson()
                ->withHeaders($encabezados)
                ->connectTimeout(3)
                ->timeout(3)
                ->get($urlEstado);

            // 3. Validar los códigos HTTP (solo se aceptan 200-299)
            if (!$respuestaUsuarios->successful() || !$respuestaEstados->successful()) {
                throw new RuntimeException('Respuesta HTTP no exitosa');
            }

            // 4. Validar el contenido del JSON
            $usuario = $respuestaUsuarios->json();
            $estado = $respuestaEstados->json();

            $usuarioValido = is_array($usuario)
                && ($usuario['id'] ?? null) === self::USUARIO_ID
                && is_string($usuario['nombre'] ?? null);

            $estadoValido = is_array($estado)
                && (string) ($estado['solicitud_id'] ?? '') === $solicitudId
                && is_string($estado['estado'] ?? null);

            if (!$usuarioValido || !$estadoValido) {
                throw new RuntimeException('Respuesta remota inválida');
            }

            // 5. Componer la respuesta unificada
            return [
                'solicitud_id' => (int) $solicitudId,
                'usuario' => $usuario,
                'estado' => $estado,
                'correlation_id' => $correlationId,
            ];
        } catch (ConnectionException | RuntimeException $e) {
            // 6. Registrar la falla para diagnóstico (sin mostrarla al cliente)
            Log::warning('Falla de orquestación', [
                'cid' => $correlationId,
                'solicitud_id' => $solicitudId,
                'tipo' => $e::class,
                'detalle' => $e->getMessage(),
            ]);

            return null;
        }
    }
}
