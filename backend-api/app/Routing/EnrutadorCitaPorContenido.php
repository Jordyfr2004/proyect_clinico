<?php

namespace App\Routing;

use App\Events\CitaCambioEstado;
use App\Filters\FiltroMensajeCita;
use App\Listeners\AtenderCancelacionCita;
use App\Listeners\AtenderProgramacionCita;
use App\Listeners\AtenderSolicitudCita;
use Illuminate\Support\Facades\Log;

class EnrutadorCitaPorContenido
{
    private const CAMPOS_OBLIGATORIOS = [
        'evento_id', 'tipo', 'cita_id', 'paciente_id', 'estado', 'instancia', 'ocurrido_en',
    ];

    public function __construct(
        private readonly FiltroMensajeCita $filtro,
        private readonly AtenderSolicitudCita $solicitudes,
        private readonly AtenderProgramacionCita $programaciones,
        private readonly AtenderCancelacionCita $cancelaciones,
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
            Log::warning('enrutamiento_cita.rechazado', [
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
            'solicitada' => $this->solicitudes->handle($mensaje),
            'programada' => $this->programaciones->handle($mensaje),
            'cancelada' => $this->cancelaciones->handle($mensaje),
            default => $this->registrarSinDestino($mensaje),
        };
    }

    private function registrarSinDestino(array $mensaje): void
    {
        $contexto = [
            'evento_id' => $mensaje['evento_id'],
            'tipo' => $mensaje['tipo'],
            'motivo' => in_array($mensaje['tipo'], CitaCambioEstado::TIPOS, true)
                ? 'tipo_reconocido_sin_destino'
                : 'tipo_desconocido',
        ];

        if ($contexto['motivo'] === 'tipo_desconocido') {
            Log::warning('enrutamiento_cita.no_enrutables', $contexto);
        } else {
            Log::notice('enrutamiento_cita.no_enrutables', $contexto);
        }
    }
}
