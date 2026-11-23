<?php

namespace App\Routing;

use App\Events\CitaCambioEstado;
use App\Filters\FiltroSeguimientoAndres;
use App\Listeners\AtenderSolicitudReprogramacionAndres;
use App\Listeners\AtenderCitaReprogramadaAndres;
use App\Listeners\AtenderCitaCompletadaAndres;
use Illuminate\Support\Facades\Log;

/** Content-Based Router de la práctica individual de Andrés García. */
class EnrutadorSeguimientoAndres
{
    private const CAMPOS_OBLIGATORIOS = [
        'evento_id', 'tipo', 'cita_id', 'paciente_id', 'estado', 'instancia', 'ocurrido_en',
    ];

    public function __construct(
        private readonly FiltroSeguimientoAndres $filtro,
        private readonly AtenderSolicitudReprogramacionAndres $solicitudes,
        private readonly AtenderCitaReprogramadaAndres $reprogramadas,
        private readonly AtenderCitaCompletadaAndres $completadas,
    ) {}

    public function handle(CitaCambioEstado $evento): void
    {
        $this->enrutar($evento->aArreglo());
    }

    public function enrutar(array $mensaje): void
    {
        $faltantes = array_values(array_filter(
            self::CAMPOS_OBLIGATORIOS,
            fn (string $campo): bool => ! isset($mensaje[$campo])
                || ! is_string($mensaje[$campo])
                || trim($mensaje[$campo]) === '',
        ));

        if ($faltantes !== []) {
            Log::warning('enrutamiento_andres.rechazado', [
                'evento_id' => $mensaje['evento_id'] ?? null,
                'motivo' => 'contrato_invalido',
                'campos' => $faltantes,
            ]);

            return;
        }

        if (! $this->filtro->permite($mensaje)) {
            return;
        }

        match ($mensaje['tipo']) {
            'reprogramacion_solicitada' => $this->solicitudes->handle($mensaje),
            'reprogramada' => $this->reprogramadas->handle($mensaje),
            'completada' => $this->completadas->handle($mensaje),
            default => $this->registrarSinDestino($mensaje),
        };
    }

    private function registrarSinDestino(array $mensaje): void
    {
        $motivo = in_array($mensaje['tipo'], CitaCambioEstado::TIPOS, true)
            ? 'tipo_reconocido_sin_destino'
            : 'tipo_desconocido';

        $contexto = [
            'evento_id' => $mensaje['evento_id'],
            'tipo' => $mensaje['tipo'],
            'motivo' => $motivo,
        ];

        if ($motivo === 'tipo_desconocido') {
            Log::warning('enrutamiento_andres.no_enrutables', $contexto);
        } else {
            Log::notice('enrutamiento_andres.no_enrutables', $contexto);
        }
    }
}
