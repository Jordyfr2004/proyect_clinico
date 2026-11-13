<?php

namespace App\Http\Controllers\Api\Sistema;

use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Storage;
use Throwable;

class SaludController extends Controller
{
    /**
     * Estado de la instancia y de los servicios de los que depende.
     * Responde 503 si la base de datos no está disponible; el servidor de
     * archivos caído solo degrada el servicio.
     */
    public function __invoke(): JsonResponse
    {
        $baseDatos = $this->verificar('base_datos', function () {
            DB::select('select 1');
        });

        $archivos = config('filesystems.disks.ftp.host')
            ? $this->verificar('archivos', function () {
                Storage::disk('ftp')->directoryExists('/');
            })
            : ['estado' => 'no_configurado'];

        $estado = match (true) {
            $baseDatos['estado'] !== 'ok' => 'error',
            $archivos['estado'] === 'caido' => 'degradado',
            default => 'ok',
        };

        return response()->json([
            'estado' => $estado,
            'instancia' => config('app.instancia'),
            'fecha' => now()->toIso8601String(),
            'servicios' => [
                'base_datos' => $baseDatos,
                'archivos' => $archivos,
            ],
        ], $estado === 'error' ? 503 : 200);
    }

    private function verificar(string $servicio, callable $comprobacion): array
    {
        $inicio = microtime(true);

        try {
            $comprobacion();

            return [
                'estado' => 'ok',
                'latencia_ms' => (int) round((microtime(true) - $inicio) * 1000),
            ];
        } catch (Throwable $e) {
            Log::warning("Health check: {$servicio} no disponible", [
                'servicio' => $servicio,
                'error' => $e->getMessage(),
            ]);

            return ['estado' => 'caido'];
        }
    }
}
