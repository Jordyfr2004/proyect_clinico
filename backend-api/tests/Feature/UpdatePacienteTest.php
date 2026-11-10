<?php

namespace Tests\Feature;

use App\Models\Paciente;
use App\Models\User;
use Illuminate\Support\Str;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class UpdatePacienteTest extends TestCase
{
    protected function setUp(): void
    {
        parent::setUp();

        foreach ([
            '0001_01_01_000000_create_users_table.php',
            '2026_09_25_012937_create_pacientes_table.php',
            '2026_09_25_163636_add_username_and_role_to_users_table.php',
            '2026_10_03_191429_create_accion_registradas_table.php',
        ] as $migration) {
            (require database_path('migrations/'.$migration))->up();
        }
    }

    private function paciente(): Paciente
    {
        return Paciente::create([
            'codigo_paciente' => '001',
            'nombres' => 'Paciente original',
            'cedula' => '1234567890',
            'telefono' => '0999999999',
            'direccion' => 'Dirección original',
        ]);
    }

    public function test_staff_can_update_only_supplied_patient_fields(): void
    {
        $paciente = $this->paciente();

        foreach (['doctora', 'asistente'] as $role) {
            Sanctum::actingAs(User::factory()->create(['role' => $role]));

            $this->putJson('/api/pacientes/'.$paciente->id, [
                'nombres' => 'Actualizado por '.$role,
                'cedula' => $paciente->cedula,
                'telefono' => null,
                'codigo_paciente' => '999',
            ])->assertOk()
                ->assertJsonPath('data.nombres', 'Actualizado por '.$role)
                ->assertJsonPath('data.codigo_paciente', '001')
                ->assertJsonPath('data.telefono', null);

            $this->assertDatabaseHas('pacientes', [
                'id' => $paciente->id,
                'nombres' => 'Actualizado por '.$role,
                'cedula' => $paciente->cedula,
                'direccion' => 'Dirección original',
                'telefono' => null,
            ]);
        }
    }

    public function test_invalid_updates_do_not_change_the_patient(): void
    {
        $paciente = $this->paciente();
        Paciente::create([
            'codigo_paciente' => '002',
            'nombres' => 'Otro paciente',
            'cedula' => '0987654321',
        ]);
        Sanctum::actingAs(new User(['role' => 'doctora']));

        $this->putJson('/api/pacientes/'.$paciente->id, [
            'nombres' => '',
            'cedula' => '0987654321',
            'fecha_nacimiento' => now()->addDay()->toDateString(),
        ])->assertUnprocessable()
            ->assertJsonValidationErrors(['nombres', 'cedula', 'fecha_nacimiento']);

        $this->assertDatabaseHas('pacientes', [
            'id' => $paciente->id,
            'nombres' => 'Paciente original',
            'cedula' => '1234567890',
        ]);
    }

    public function test_missing_patient_returns_not_found(): void
    {
        Sanctum::actingAs(new User(['role' => 'doctora']));

        $this->putJson('/api/pacientes/'.Str::uuid(), [
            'nombres' => 'Actualizado',
        ])->assertNotFound();
    }

    public function test_guests_and_patients_cannot_update_patients(): void
    {
        $paciente = $this->paciente();
        $url = '/api/pacientes/'.$paciente->id;

        $this->putJson($url, ['nombres' => 'Actualizado'])->assertUnauthorized();

        Sanctum::actingAs(new User(['role' => 'paciente']));
        $this->putJson($url, ['nombres' => 'Actualizado'])->assertForbidden();
    }
}
