<?php

namespace Tests\Feature;

use App\Events\CitaCambioEstado;
use App\Listeners\AtenderSolicitudReprogramacionAndres;
use App\Listeners\AtenderCitaReprogramadaAndres;
use App\Listeners\AtenderCitaCompletadaAndres;
use App\Routing\EnrutadorSeguimientoAndres;
use Illuminate\Support\Facades\Event;
use Illuminate\Support\Facades\Log;
use Mockery;
use Tests\TestCase;

class EnrutamientoAndresTest extends TestCase
{
    private function evento(string $tipo): CitaCambioEstado
    {
        return new CitaCambioEstado(
            eventoId: 'evento-andres-01', tipo: $tipo,
            citaId: 'cita-andres-01', pacienteId: 'paciente-demo-01',
            pacienteNombre: 'Paciente de prueba', estado: 'programada',
            fecha: null, horaInicio: null, instancia: 'prueba-local',
            ocurridoEn: '2026-11-22T12:00:00-05:00',
        );
    }

    private function esperarConsumidor(?string $destino): void
    {
        foreach ([
            'reprogramacion_solicitada' => AtenderSolicitudReprogramacionAndres::class,
            'reprogramada' => AtenderCitaReprogramadaAndres::class,
            'completada' => AtenderCitaCompletadaAndres::class,
        ] as $tipo => $clase) {
            $mock = Mockery::mock($clase)->makePartial();
            if ($destino === $tipo) {
                $mock->shouldReceive('handle')->once()->withArgs(
                    fn (array $mensaje): bool => ($mensaje['tipo'] ?? null) === $tipo
                        && ($mensaje['evento_id'] ?? null) === 'evento-andres-01'
                        && ($mensaje['cita_id'] ?? null) === 'cita-andres-01',
                )->passthru();
            } else {
                $mock->shouldNotReceive('handle');
            }
            $this->app->instance($clase, $mock);
        }
    }

    public function test_solicitud_de_reprogramacion_va_a_su_consumidor(): void
    {
        Log::spy();
        $this->esperarConsumidor('reprogramacion_solicitada');
        app(EnrutadorSeguimientoAndres::class)->handle($this->evento('reprogramacion_solicitada'));
        Log::shouldHaveReceived('info')->once()->with('enrutamiento_andres.reprogramacion_solicitada', [
            'evento_id' => 'evento-andres-01', 'cita_id' => 'cita-andres-01',
        ]);
        Log::shouldNotHaveReceived('warning');
        Log::shouldNotHaveReceived('notice');
    }

    public function test_cita_reprogramada_va_a_su_consumidor(): void
    {
        Log::spy();
        $this->esperarConsumidor('reprogramada');
        app(EnrutadorSeguimientoAndres::class)->handle($this->evento('reprogramada'));
        Log::shouldHaveReceived('info')->once()->with('enrutamiento_andres.reprogramada', [
            'evento_id' => 'evento-andres-01', 'cita_id' => 'cita-andres-01',
        ]);
        Log::shouldNotHaveReceived('warning');
        Log::shouldNotHaveReceived('notice');
    }

    public function test_cita_completada_va_a_su_consumidor(): void
    {
        Log::spy();
        $this->esperarConsumidor('completada');
        app(EnrutadorSeguimientoAndres::class)->handle($this->evento('completada'));
        Log::shouldHaveReceived('info')->once()->with('enrutamiento_andres.completada', [
            'evento_id' => 'evento-andres-01', 'cita_id' => 'cita-andres-01',
        ]);
        Log::shouldNotHaveReceived('warning');
        Log::shouldNotHaveReceived('notice');
    }

    public function test_tipo_desconocido_se_registra_sin_consumidor(): void
    {
        Log::spy();
        $this->esperarConsumidor(null);
        app(EnrutadorSeguimientoAndres::class)->handle($this->evento('desconocido'));
        Log::shouldHaveReceived('warning')->once()->with('enrutamiento_andres.no_enrutables', [
            'evento_id' => 'evento-andres-01', 'tipo' => 'desconocido', 'motivo' => 'tipo_desconocido',
        ]);
        Log::shouldNotHaveReceived('info');
    }

    public function test_tipo_creada_se_filtra_sin_consumidor(): void
    {
        Log::spy();
        $this->esperarConsumidor(null);
        app(EnrutadorSeguimientoAndres::class)->handle($this->evento('creada'));
        Log::shouldHaveReceived('notice')->once()->with('enrutamiento_andres.filtrado', [
            'evento_id' => 'evento-andres-01', 'tipo' => 'creada', 'motivo' => 'tipo_creada_excluido',
        ]);
        Log::shouldNotHaveReceived('info');
    }

    public function test_falta_cita_id_se_rechaza_antes_del_filtro(): void
    {
        Log::spy();
        $this->esperarConsumidor(null);
        $mensaje = $this->evento('creada')->aArreglo();
        unset($mensaje['cita_id']);
        app(EnrutadorSeguimientoAndres::class)->enrutar($mensaje);
        Log::shouldHaveReceived('warning')->once()->with('enrutamiento_andres.rechazado', [
            'evento_id' => 'evento-andres-01', 'motivo' => 'contrato_invalido', 'campos' => ['cita_id'],
        ]);
        Log::shouldNotHaveReceived('notice');
        Log::shouldNotHaveReceived('info');
    }

    public function test_router_esta_registrado_en_evento_real(): void
    {
        Event::fake();
        Event::assertListening(CitaCambioEstado::class, EnrutadorSeguimientoAndres::class);
    }

    public function test_otro_tipo_conocido_se_registra_controladamente(): void
    {
        Log::spy();
        $this->esperarConsumidor(null);
        app(EnrutadorSeguimientoAndres::class)->handle($this->evento('programada'));
        Log::shouldHaveReceived('notice')->once()->with('enrutamiento_andres.no_enrutables', [
            'evento_id' => 'evento-andres-01', 'tipo' => 'programada', 'motivo' => 'tipo_reconocido_sin_destino',
        ]);
        Log::shouldNotHaveReceived('info');
    }
}
