<?php

namespace Tests\Feature;

use App\Jobs\ProcesarNotificacionCita;
use App\Models\User;
use App\Services\Integracion\NotificadorCita;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Queue;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

/**
 * Tema 3.1 - Productor, cola y consumidor de notificaciones de cita.
 */
class NotificacionCitaTest extends TestCase
{
    private array $valido = ['cita_id' => 'C-104', 'estado' => 'agendada', 'canal' => 'correo'];

    protected function setUp(): void
    {
        parent::setUp();
        NotificadorCita::$demoraSegundos = 0; // las pruebas no esperan 3 s
        Sanctum::actingAs(new User(['role' => 'asistente']));
    }

    // Mensaje válido: la API responde 202 y publica el mensaje en la cola
    public function test_mensaje_valido_se_publica_en_la_cola(): void
    {
        Queue::fake();

        $this->withHeader('X-Correlation-ID', 'cita-104')
            ->postJson('/api/notificaciones-cita', $this->valido)
            ->assertStatus(202)
            ->assertJsonPath('estado', 'encolado')
            ->assertJsonPath('correlation_id', 'cita-104')
            ->assertHeader('X-Correlation-ID', 'cita-104');

        Queue::assertPushedOn('notificaciones-cita', ProcesarNotificacionCita::class,
            fn ($job) => $job->mensaje['correlation_id'] === 'cita-104'
                && $job->mensaje['tipo'] === 'notificacion_cita'
                && isset($job->mensaje['message_id'], $job->mensaje['ocurrido_en']));
    }

    // El consumidor procesa el mensaje y actualiza el estado
    public function test_consumidor_procesa_y_actualiza_estado(): void
    {
        $id = $this->postJson('/api/notificaciones-cita', $this->valido)->json('message_id');

        // En pruebas la cola es síncrona: el consumidor ya se ejecutó
        $this->getJson("/api/notificaciones-cita/{$id}")
            ->assertOk()
            ->assertJsonPath('data.estado', 'procesado');
    }

    // Mensaje inválido: error de validación y nada en la cola
    public function test_mensaje_invalido_se_rechaza(): void
    {
        Queue::fake();

        $this->postJson('/api/notificaciones-cita', ['cita_id' => 'C-104', 'canal' => 'paloma'])
            ->assertStatus(422)
            ->assertJsonValidationErrors(['estado', 'canal']);

        Queue::assertNothingPushed();
    }

    // Correlación: el mismo correlation_id aparece en los registros de productor y consumidor
    public function test_correlation_id_aparece_en_todo_el_flujo(): void
    {
        Log::spy();

        $this->withHeader('X-Correlation-ID', 'cita-200')
            ->postJson('/api/notificaciones-cita', $this->valido)
            ->assertStatus(202);

        foreach (['Mensaje encolado', 'Mensaje procesando', 'Mensaje procesado'] as $evento) {
            Log::shouldHaveReceived('info')
                ->withArgs(fn ($msg, $ctx) => $msg === $evento && $ctx['correlation_id'] === 'cita-200')
                ->once();
        }
    }

    // Síncrono: responde 200 solo cuando terminó el procesamiento
    public function test_sincrono_responde_al_terminar(): void
    {
        $this->postJson('/api/notificaciones-cita/sincrono', $this->valido)
            ->assertOk()
            ->assertJsonPath('estado', 'procesado');
    }

    // Seguridad (Tema 2.4): solo personal autenticado
    public function test_paciente_no_puede_publicar(): void
    {
        Sanctum::actingAs(new User(['role' => 'paciente']));

        $this->postJson('/api/notificaciones-cita', $this->valido)->assertStatus(403);
    }
}
