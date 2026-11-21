<?php

namespace Tests\Feature;

use App\Models\Agenda;
use App\Models\Paciente;
use App\Models\Receta;
use App\Models\User;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class RecetasTest extends TestCase
{
    private Paciente $paciente;

    private User $doctora;

    protected function setUp(): void
    {
        parent::setUp();

        foreach ([
            '0001_01_01_000000_create_users_table.php',
            '2026_09_25_012937_create_pacientes_table.php',
            '2026_09_25_163636_add_username_and_role_to_users_table.php',
            '2026_09_25_164339_add_paciente_id_to_users_table.php',
            '2026_10_02_191138_create_agendas_table.php',
            '2026_10_03_191429_create_accion_registradas_table.php',
            '2026_10_18_000002_create_recetas_tables.php',
        ] as $migration) {
            (require database_path('migrations/'.$migration))->up();
        }

        $this->paciente = Paciente::create([
            'codigo_paciente' => '001', 'nombres' => 'Paciente', 'cedula' => '1234567890',
        ]);
        $this->doctora = User::create([
            'name' => 'Doctora', 'email' => 'doctora@example.test',
            'password' => 'password-prueba', 'role' => 'doctora',
        ]);
    }

    private function medicamentos(): array
    {
        return [[
            'nombre' => 'Amoxicilina',
            'dosis' => '500 mg',
            'frecuencia' => 'Cada 8 horas',
            'duracion' => '7 días',
            'indicaciones' => 'Después de las comidas',
        ]];
    }

    public function test_doctora_creates_template_and_prescription(): void
    {
        Sanctum::actingAs($this->doctora);

        $plantilla = $this->postJson('/api/plantillas-receta', [
            'nombre' => 'Post extracción',
            'medicamentos' => $this->medicamentos(),
            'indicaciones' => 'No enjuagarse durante 24 horas.',
        ])->assertCreated()->json('data');

        $this->postJson('/api/plantillas-receta', [
            'nombre' => 'Post extracción', 'medicamentos' => $this->medicamentos(),
        ])->assertUnprocessable()->assertJsonValidationErrors('nombre');

        $cita = Agenda::create([
            'paciente_id' => $this->paciente->id, 'tipo' => 'cita_medica',
            'estado' => 'completada', 'fecha' => '2026-10-18',
        ]);

        $this->postJson('/api/recetas', [
            'paciente_id' => $this->paciente->id,
            'agenda_id' => $cita->id,
            'diagnostico' => 'Extracción de tercer molar',
            'medicamentos' => $plantilla['medicamentos'],
            'indicaciones' => $plantilla['indicaciones'],
        ])->assertCreated()
            ->assertJsonPath('data.paciente.codigo_paciente', '001')
            ->assertJsonPath('data.emitida_por.name', 'Doctora')
            ->assertJsonPath('data.medicamentos.0.nombre', 'Amoxicilina');

        $this->getJson("/api/recetas?paciente_id={$this->paciente->id}")
            ->assertOk()
            ->assertJsonCount(1, 'data');
    }

    public function test_prescription_validation(): void
    {
        Sanctum::actingAs($this->doctora);
        $otro = Paciente::create(['codigo_paciente' => '002', 'nombres' => 'Otro', 'cedula' => '0987654321']);
        $citaAjena = Agenda::create([
            'paciente_id' => $otro->id, 'tipo' => 'cita_medica', 'estado' => 'completada', 'fecha' => '2026-10-18',
        ]);

        $this->postJson('/api/recetas', [
            'paciente_id' => $this->paciente->id,
            'agenda_id' => $citaAjena->id,
            'medicamentos' => [['nombre' => 'Ibuprofeno']],
        ])->assertUnprocessable()
            ->assertJsonValidationErrors(['agenda_id', 'medicamentos.0.dosis', 'medicamentos.0.frecuencia']);

        $this->postJson('/api/recetas', [
            'paciente_id' => $this->paciente->id,
            'medicamentos' => [],
        ])->assertUnprocessable()->assertJsonValidationErrors('medicamentos');
    }

    public function test_patient_sees_only_own_prescriptions_and_cannot_write(): void
    {
        $otro = Paciente::create(['codigo_paciente' => '002', 'nombres' => 'Otro', 'cedula' => '0987654321']);
        $mia = Receta::create([
            'paciente_id' => $this->paciente->id, 'fecha' => '2026-10-18',
            'medicamentos' => $this->medicamentos(), 'emitida_por_id' => $this->doctora->id,
        ]);
        $ajena = Receta::create([
            'paciente_id' => $otro->id, 'fecha' => '2026-10-18', 'medicamentos' => $this->medicamentos(),
        ]);

        Sanctum::actingAs(User::create([
            'name' => 'Paciente', 'email' => 'paciente@example.test', 'password' => 'password-prueba',
            'role' => 'paciente', 'paciente_id' => $this->paciente->id,
        ]));

        $this->getJson('/api/paciente/mis-recetas')
            ->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.id', $mia->id)
            ->assertJsonPath('data.0.emitida_por.name', 'Doctora');
        $this->getJson("/api/paciente/mis-recetas/{$mia->id}")->assertOk();
        $this->getJson("/api/paciente/mis-recetas/{$ajena->id}")->assertNotFound();

        $this->getJson('/api/recetas')->assertForbidden();
        $this->postJson('/api/recetas', [])->assertForbidden();
    }

    public function test_assistant_can_read_but_not_write(): void
    {
        Sanctum::actingAs(User::create([
            'name' => 'Asistente', 'email' => 'asistente@example.test',
            'password' => 'password-prueba', 'role' => 'asistente',
        ]));

        $this->getJson('/api/recetas')->assertOk();
        $this->getJson('/api/plantillas-receta?activas=1')->assertOk();
        $this->postJson('/api/recetas', [])->assertForbidden();
        $this->postJson('/api/plantillas-receta', [])->assertForbidden();
    }
}
