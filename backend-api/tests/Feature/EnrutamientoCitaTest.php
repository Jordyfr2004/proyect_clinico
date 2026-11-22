<?php

namespace Tests\Feature;

use App\Events\CitaCambioEstado;
use App\Listeners\AtenderCancelacionCita;
use App\Listeners\AtenderProgramacionCita;
use App\Listeners\AtenderSolicitudCita;
use App\Routing\EnrutadorCitaPorContenido;
use Illuminate\Support\Facades\Event;
use Illuminate\Support\Facades\Log;
use Mockery;
use Tests\TestCase;

class EnrutamientoCitaTest extends TestCase
{
    private function evento(string $tipo): CitaCambioEstado
    {
        return new CitaCambioEstado(
            eventoId: 'evento-1',
            tipo: $tipo,
            citaId: 'cita-1',
            pacienteId: 'paciente-1',
            pacienteNombre: 'Ana',
            estado: 'pendiente',
            fecha: null,
            horaInicio: null,
            instancia: 'backend-prueba',
            ocurridoEn: '2026-11-21T10:00:00-05:00',
        );
    }

    private function esperarConsumidores(?string $destino): void
    {
        foreach ([
            'solicitada' => AtenderSolicitudCita::class,
            'programada' => AtenderProgramacionCita::class,
            'cancelada' => AtenderCancelacionCita::class,
        ] as $tipo => $clase) {
            $consumidor = Mockery::mock($clase)->makePartial();

            if ($tipo === $destino) {
                $consumidor->shouldReceive('handle')->once()->withArgs(
                    fn (array $mensaje): bool => $mensaje['tipo'] === $tipo
                        && $mensaje['evento_id'] === 'evento-1'
                        && $mensaje['cita_id'] === 'cita-1',
                )->passthru();
            } else {
                $consumidor->shouldNotReceive('handle');
            }

            $this->app->instance($clase, $consumidor);
        }
    }

    public function test_solicitada_llega_solo_al_consumidor_de_solicitudes(): void
    {
        Log::spy();
        $this->esperarConsumidores('solicitada');

        app(EnrutadorCitaPorContenido::class)->handle($this->evento('solicitada'));

        Log::shouldHaveReceived('info')->once()->with('enrutamiento_cita.solicitada', [
            'evento_id' => 'evento-1', 'cita_id' => 'cita-1',
        ]);
        Log::shouldHaveReceived('info')->once();
        Log::shouldNotHaveReceived('warning');
        Log::shouldNotHaveReceived('notice');
    }

    public function test_programada_llega_solo_al_consumidor_de_programaciones(): void
    {
        Log::spy();
        $this->esperarConsumidores('programada');

        app(EnrutadorCitaPorContenido::class)->handle($this->evento('programada'));

        Log::shouldHaveReceived('info')->once()->with('enrutamiento_cita.programada', [
            'evento_id' => 'evento-1', 'cita_id' => 'cita-1',
        ]);
        Log::shouldHaveReceived('info')->once();
        Log::shouldNotHaveReceived('warning');
        Log::shouldNotHaveReceived('notice');
    }

    public function test_cancelada_llega_solo_al_consumidor_de_cancelaciones(): void
    {
        Log::spy();
        $this->esperarConsumidores('cancelada');

        app(EnrutadorCitaPorContenido::class)->handle($this->evento('cancelada'));

        Log::shouldHaveReceived('info')->once()->with('enrutamiento_cita.cancelada', [
            'evento_id' => 'evento-1', 'cita_id' => 'cita-1',
        ]);
        Log::shouldHaveReceived('info')->once();
        Log::shouldNotHaveReceived('warning');
        Log::shouldNotHaveReceived('notice');
    }

    public function test_tipo_desconocido_se_registra_sin_consumidor(): void
    {
        Log::spy();
        $this->esperarConsumidores(null);

        app(EnrutadorCitaPorContenido::class)->handle($this->evento('desconocido'));

        Log::shouldHaveReceived('warning')->once()->with('enrutamiento_cita.no_enrutables', [
            'evento_id' => 'evento-1', 'tipo' => 'desconocido', 'motivo' => 'tipo_desconocido',
        ]);
        Log::shouldNotHaveReceived('info');
        Log::shouldNotHaveReceived('notice');
    }

    public function test_actualizada_se_filtra_y_registra_sin_consumidor(): void
    {
        Log::spy();
        $this->esperarConsumidores(null);

        app(EnrutadorCitaPorContenido::class)->handle($this->evento('actualizada'));

        Log::shouldHaveReceived('notice')->once()->with('enrutamiento_cita.filtrado', [
            'evento_id' => 'evento-1', 'tipo' => 'actualizada', 'motivo' => 'tipo_actualizada',
        ]);
        Log::shouldNotHaveReceived('info');
        Log::shouldNotHaveReceived('warning');
    }

    public function test_sin_cita_id_se_rechaza_antes_del_filtro_y_se_registra(): void
    {
        Log::spy();
        $this->esperarConsumidores(null);
        $mensaje = $this->evento('actualizada')->aArreglo();
        unset($mensaje['cita_id']);

        app(EnrutadorCitaPorContenido::class)->enrutar($mensaje);

        Log::shouldHaveReceived('warning')->once()->with('enrutamiento_cita.rechazado', [
            'evento_id' => 'evento-1', 'motivo' => 'contrato_invalido', 'campos' => ['cita_id'],
        ]);
        Log::shouldNotHaveReceived('info');
        Log::shouldNotHaveReceived('notice');
    }

    public function test_otros_tipos_del_contrato_tienen_destino_controlado(): void
    {
        Log::spy();
        $this->esperarConsumidores(null);
        $registros = [];
        Log::shouldReceive('notice')->times(4)->andReturnUsing(
            function (string $mensaje, array $contexto) use (&$registros): void {
                $registros[] = [$mensaje, $contexto];
            },
        );

        foreach (['creada', 'reprogramacion_solicitada', 'reprogramada', 'completada'] as $tipo) {
            app(EnrutadorCitaPorContenido::class)->handle($this->evento($tipo));
        }

        $this->assertSame([
            ['enrutamiento_cita.no_enrutables', ['evento_id' => 'evento-1', 'tipo' => 'creada', 'motivo' => 'tipo_reconocido_sin_destino']],
            ['enrutamiento_cita.no_enrutables', ['evento_id' => 'evento-1', 'tipo' => 'reprogramacion_solicitada', 'motivo' => 'tipo_reconocido_sin_destino']],
            ['enrutamiento_cita.no_enrutables', ['evento_id' => 'evento-1', 'tipo' => 'reprogramada', 'motivo' => 'tipo_reconocido_sin_destino']],
            ['enrutamiento_cita.no_enrutables', ['evento_id' => 'evento-1', 'tipo' => 'completada', 'motivo' => 'tipo_reconocido_sin_destino']],
        ], $registros);
        Log::shouldNotHaveReceived('info');
        Log::shouldNotHaveReceived('warning');
    }

    public function test_router_esta_suscrito_al_evento_real(): void
    {
        Event::fake();

        Event::assertListening(CitaCambioEstado::class, EnrutadorCitaPorContenido::class);
    }
}
