<?php

namespace Tests\Feature;

use App\Models\Agenda;
use App\Models\Paciente;
use App\Models\User;
use Illuminate\Support\Carbon;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class CitasPacienteTest extends TestCase
{
    private Paciente $paciente;

    private User $pacienteUser;

    protected function setUp(): void
    {
        parent::setUp();

        foreach ([
            '0001_01_01_000000_create_users_table.php',
            '2026_09_25_012937_create_pacientes_table.php',
            '2026_09_25_163636_add_username_and_role_to_users_table.php',
            '2026_09_25_164339_add_paciente_id_to_users_table.php',
            '2026_10_02_191138_create_agendas_table.php',
            '2026_10_03_030037_add_clinical_fields_to_agenda_table.php',
            '2026_10_03_191429_create_accion_registradas_table.php',
        ] as $migration) {
            (require database_path('migrations/'.$migration))->up();
        }

        config(['app.timezone' => 'America/Guayaquil']);
        Carbon::setTestNow(Carbon::parse('2026-10-18 09:00', 'America/Guayaquil'));

        $this->paciente = Paciente::create([
            'codigo_paciente' => '001', 'nombres' => 'Paciente', 'cedula' => '1234567890',
        ]);
        $this->pacienteUser = User::create([
            'name' => 'Paciente', 'email' => 'paciente@example.test',
            'password' => 'password-prueba', 'role' => 'paciente',
            'paciente_id' => $this->paciente->id,
        ]);

        Sanctum::actingAs($this->pacienteUser);
    }

    protected function tearDown(): void
    {
        Carbon::setTestNow();

        parent::tearDown();
    }

    private function cita(string $estado, ?string $fecha = '2026-10-20', ?string $hora = '10:00', ?string $pacienteId = null): Agenda
    {
        return Agenda::create([
            'paciente_id' => $pacienteId ?? $this->paciente->id,
            'tipo' => 'cita_medica',
            'estado' => $estado,
            'fecha' => $fecha,
            'hora_inicio' => $hora,
            'hora_fin' => $hora ? '11:00' : null,
            'descripcion' => 'Limpieza',
        ]);
    }

    public function test_patient_cancels_own_future_appointment(): void
    {
        $cita = $this->cita('programada');

        $this->putJson("/api/agenda/mis-citas/{$cita->id}/cancelar")
            ->assertOk()
            ->assertJsonPath('data.estado', 'cancelada');

        $this->putJson("/api/agenda/mis-citas/{$cita->id}/cancelar")->assertConflict();
        $this->assertDatabaseHas('acciones_registradas', [
            'user_id' => $this->pacienteUser->id, 'accion' => 'cancelar_cita_paciente',
        ]);
    }

    public function test_patient_cannot_cancel_past_completed_or_foreign_appointments(): void
    {
        $pasada = $this->cita('programada', '2026-10-18', '08:30');
        $completada = $this->cita('completada', '2026-10-25');
        $otro = Paciente::create(['codigo_paciente' => '002', 'nombres' => 'Otro', 'cedula' => '0987654321']);
        $ajena = $this->cita('programada', '2026-10-26', '10:00', $otro->id);

        $this->putJson("/api/agenda/mis-citas/{$pasada->id}/cancelar")->assertConflict();
        $this->putJson("/api/agenda/mis-citas/{$completada->id}/cancelar")->assertConflict();
        $this->putJson("/api/agenda/mis-citas/{$ajena->id}/cancelar")->assertNotFound();

        $this->assertSame('programada', $ajena->fresh()->estado);
    }

    public function test_patient_can_cancel_a_pending_request(): void
    {
        $solicitud = $this->cita('pendiente', null, null);

        $this->putJson("/api/agenda/mis-citas/{$solicitud->id}/cancelar")
            ->assertOk()
            ->assertJsonPath('data.estado', 'cancelada');
    }

    public function test_reschedule_frees_the_slot_and_returns_to_pending(): void
    {
        $cita = $this->cita('programada');

        $this->putJson("/api/agenda/mis-citas/{$cita->id}/reprogramar", ['motivo' => 'Viaje de trabajo'])
            ->assertOk()
            ->assertJsonPath('data.estado', 'pendiente')
            ->assertJsonPath('data.fecha', null)
            ->assertJsonPath('data.hora_inicio', null);

        $descripcion = $cita->fresh()->descripcion;
        $this->assertStringContainsString('Fecha anterior: 2026-10-20 10:00', $descripcion);
        $this->assertStringContainsString('Motivo: Viaje de trabajo', $descripcion);
    }

    public function test_reschedule_rules(): void
    {
        $pendiente = $this->cita('pendiente', null, null);
        $programada = $this->cita('programada', '2026-10-22');

        $this->putJson("/api/agenda/mis-citas/{$pendiente->id}/reprogramar")->assertConflict();
        $this->putJson("/api/agenda/mis-citas/{$programada->id}/reprogramar")
            ->assertConflict()
            ->assertJsonPath('message', 'Ya tienes una solicitud de cita pendiente.');
        $this->assertSame('programada', $programada->fresh()->estado);
    }

    public function test_staff_cannot_use_patient_endpoints(): void
    {
        $cita = $this->cita('programada');
        Sanctum::actingAs(User::create([
            'name' => 'Doctora', 'email' => 'doctora@example.test',
            'password' => 'password-prueba', 'role' => 'doctora',
        ]));

        $this->putJson("/api/agenda/mis-citas/{$cita->id}/cancelar")->assertForbidden();
    }
}
