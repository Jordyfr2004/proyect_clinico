<?php

namespace Tests\Feature;

use App\Events\CitaActualizada;
use App\Events\CitaCambioEstado;
use App\Listeners\DifundirCambioDeCita;
use App\Listeners\RegistrarEventoDeCita;
use App\Models\Agenda;
use App\Models\Paciente;
use App\Models\User;
use Illuminate\Contracts\Broadcasting\Factory as BroadcastFactory;
use Illuminate\Events\CallQueuedListener;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Event;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Queue;
use Laravel\Sanctum\Sanctum;
use RuntimeException;
use Tests\TestCase;

/**
 * Práctica: arquitectura orientada a eventos de la cita médica.
 */
class EventosCitaTest extends TestCase
{
    private Paciente $paciente;

    private User $pacienteUser;

    private User $doctora;

    protected function setUp(): void
    {
        parent::setUp();

        foreach ([
            '0001_01_01_000000_create_users_table.php',
            '0001_01_01_000002_create_jobs_table.php',
            '2026_09_25_012937_create_pacientes_table.php',
            '2026_09_25_163636_add_username_and_role_to_users_table.php',
            '2026_09_25_164339_add_paciente_id_to_users_table.php',
            '2026_09_30_034413_add_activo_to_users_table.php',
            '2026_10_02_191138_create_agendas_table.php',
            '2026_10_03_030037_add_clinical_fields_to_agenda_table.php',
            '2026_10_03_191429_create_accion_registradas_table.php',
            '2026_11_10_202239_add_nombre_reserva_to_agenda_table.php',
        ] as $migration) {
            (require database_path('migrations/'.$migration))->up();
        }

        config(['app.timezone' => 'America/Guayaquil', 'app.instancia' => 'backend-prueba']);
        Carbon::setTestNow(Carbon::parse('2026-10-18 09:00', 'America/Guayaquil'));

        $this->paciente = Paciente::create([
            'codigo_paciente' => '001', 'nombres' => 'Ana Pérez', 'cedula' => '1234567890',
        ]);
        $this->pacienteUser = User::create([
            'name' => 'Ana', 'email' => 'paciente@example.test', 'password' => 'password-prueba',
            'role' => 'paciente', 'paciente_id' => $this->paciente->id, 'activo' => true,
        ]);
        $this->doctora = User::create([
            'name' => 'Doctora', 'email' => 'doctora@example.test', 'password' => 'password-prueba',
            'role' => 'doctora', 'activo' => true,
        ]);
    }

    protected function tearDown(): void
    {
        Carbon::setTestNow();

        parent::tearDown();
    }

    private function cita(string $estado, ?string $fecha = '2026-10-20', ?string $hora = '10:00'): Agenda
    {
        return Agenda::create([
            'paciente_id' => $this->paciente->id, 'tipo' => 'cita_medica', 'estado' => $estado,
            'fecha' => $fecha, 'hora_inicio' => $hora, 'hora_fin' => $hora ? '11:00' : null,
            'descripcion' => 'Limpieza',
        ]);
    }

    public function test_patient_request_publishes_a_solicitada_event(): void
    {
        Event::fake([CitaCambioEstado::class]);
        Sanctum::actingAs($this->pacienteUser);

        $this->postJson('/api/agenda/solicitar-cita')->assertCreated();

        Event::assertDispatched(CitaCambioEstado::class, fn (CitaCambioEstado $e) => $e->tipo === 'solicitada'
            && $e->pacienteId === $this->paciente->id
            && $e->pacienteNombre === 'Ana Pérez'
            && $e->estado === 'pendiente'
            && $e->instancia === 'backend-prueba');
        Event::assertDispatchedTimes(CitaCambioEstado::class, 1);
    }

    public function test_each_state_change_publishes_its_own_event_type(): void
    {
        $solicitud = $this->cita('pendiente', null, null);
        Event::fake([CitaCambioEstado::class]);

        Sanctum::actingAs($this->doctora);
        $this->putJson("/api/agenda/solicitud/{$solicitud->id}/programar", [
            'fecha' => '2026-10-21', 'hora_inicio' => '09:00', 'hora_fin' => '10:00',
        ])->assertOk();

        Sanctum::actingAs($this->pacienteUser);
        $this->putJson("/api/agenda/mis-citas/{$solicitud->id}/reprogramar")->assertOk();

        $otra = Agenda::withoutEvents(fn () => $this->cita('programada', '2026-10-22'));
        $this->putJson("/api/agenda/mis-citas/{$otra->id}/cancelar")->assertOk();

        $tipos = Event::dispatched(CitaCambioEstado::class)->map(fn ($args) => $args[0]->tipo)->all();
        $this->assertSame(['programada', 'reprogramacion_solicitada', 'cancelada'], $tipos);
    }

    public function test_changes_that_are_not_relevant_or_not_patient_appointments_publish_nothing(): void
    {
        $cita = Agenda::withoutEvents(fn () => $this->cita('programada'));
        Event::fake([CitaCambioEstado::class]);

        $cita->update(['descripcion' => 'Otra descripción']);
        Agenda::create(['tipo' => 'personal', 'estado' => null, 'fecha' => '2026-10-20', 'descripcion' => 'Reunión']);

        Event::assertNotDispatched(CitaCambioEstado::class);
    }

    public function test_no_event_is_published_when_the_transaction_rolls_back(): void
    {
        Event::fake([CitaCambioEstado::class]);

        try {
            DB::transaction(function () {
                $this->cita('pendiente', null, null);
                throw new RuntimeException('falla simulada');
            });
        } catch (RuntimeException) {
        }

        Event::assertNotDispatched(CitaCambioEstado::class);
        $this->assertSame(0, Agenda::count());
    }

    public function test_domain_event_has_two_independent_subscribers(): void
    {
        Event::fake();

        Event::assertListening(CitaCambioEstado::class, DifundirCambioDeCita::class);
        Event::assertListening(CitaCambioEstado::class, RegistrarEventoDeCita::class);
    }

    public function test_the_log_subscriber_runs_through_the_queue(): void
    {
        Queue::fake();

        $this->cita('pendiente', null, null);

        Queue::assertPushedOn('eventos', CallQueuedListener::class, fn ($job) => $job->class === RegistrarEventoDeCita::class);
    }

    public function test_broadcast_goes_to_the_doctor_and_to_the_patient_private_channels(): void
    {
        $evento = CitaCambioEstado::desdeCita($this->cita('pendiente', null, null)->load('paciente'), 'solicitada');
        $mensaje = new CitaActualizada($evento);

        $canales = array_map(fn ($canal) => $canal->name, $mensaje->broadcastOn());
        $this->assertSame(['private-clinica.doctora', 'private-paciente.'.$this->paciente->id], $canales);
        $this->assertSame('cita_actualizada', $mensaje->broadcastAs());
        $this->assertSame('solicitada', $mensaje->broadcastWith()['tipo']);
        $this->assertSame('Ana Pérez', $mensaje->broadcastWith()['paciente_nombre']);
    }

    public function test_a_websocket_failure_does_not_break_the_request(): void
    {
        $this->mock(BroadcastFactory::class, function ($mock) {
            $mock->shouldReceive('event')->andThrow(new RuntimeException('Reverb no responde'));
        });
        Log::spy();
        Log::shouldReceive('channel')->andReturnSelf();
        Sanctum::actingAs($this->pacienteUser);

        $this->postJson('/api/agenda/solicitar-cita')->assertCreated();

        $this->assertSame(1, Agenda::count());
        Log::shouldHaveReceived('warning')->withArgs(fn ($mensaje) => str_contains($mensaje, 'No se pudo difundir'))->once();
    }

    public function test_the_queued_subscriber_writes_the_event_log(): void
    {
        $evento = CitaCambioEstado::desdeCita($this->cita('pendiente', null, null)->load('paciente'), 'solicitada');
        Log::shouldReceive('channel')->once()->with('eventos')->andReturnSelf();
        Log::shouldReceive('info')->once()->withArgs(fn ($mensaje, $datos) => $mensaje === 'cita.solicitada'
            && $datos['paciente_nombre'] === 'Ana Pérez');

        (new RegistrarEventoDeCita)->handle($evento);
    }

    public function test_private_channels_are_authorized_only_for_their_owner(): void
    {
        config([
            'broadcasting.default' => 'reverb',
            'broadcasting.connections.reverb.key' => 'clave-prueba',
            'broadcasting.connections.reverb.secret' => 'secreto-prueba',
            'broadcasting.connections.reverb.app_id' => '1',
            'broadcasting.connections.reverb.options.host' => '127.0.0.1',
        ]);
        // Los canales se registraron al arrancar sobre el driver "null" de las pruebas.
        require base_path('routes/channels.php');
        $auth = fn (string $canal) => $this->postJson('/api/broadcasting/auth', [
            'socket_id' => '1234.5678', 'channel_name' => $canal,
        ]);

        Sanctum::actingAs($this->doctora);
        $auth('private-clinica.doctora')->assertOk()->assertJsonStructure(['auth']);
        $auth('private-paciente.'.$this->paciente->id)->assertForbidden();

        Sanctum::actingAs($this->pacienteUser);
        $auth('private-paciente.'.$this->paciente->id)->assertOk();
        $auth('private-clinica.doctora')->assertForbidden();
        $auth('private-paciente.otro-paciente')->assertForbidden();
    }
}
