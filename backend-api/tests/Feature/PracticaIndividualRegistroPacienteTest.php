<?php

namespace Tests\Feature;

use App\Models\Paciente;
use App\Models\User;
use App\PracticaIndividual\RegistroPaciente\RegistroPacienteEntradaDto;
use App\PracticaIndividual\RegistroPaciente\RegistroPacienteSalidaDto;
use Illuminate\Support\Facades\DB;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

/**
 * Práctica individual: contrato JSON del registro real, con SQLite en memoria.
 */
class PracticaIndividualRegistroPacienteTest extends TestCase
{
    protected function setUp(): void
    {
        parent::setUp();

        config(['database.default' => 'sqlite', 'database.connections.sqlite.database' => ':memory:']);
        DB::purge('sqlite');

        foreach ([
            '0001_01_01_000000_create_users_table.php',
            '2026_09_25_012937_create_pacientes_table.php',
            '2026_09_25_163636_add_username_and_role_to_users_table.php',
            '2026_10_03_191429_create_accion_registradas_table.php',
        ] as $migration) {
            (require database_path('migrations/'.$migration))->up();
        }

        // La única dependencia PostgreSQL del registro es nextval().
        DB::connection()->getPdo()->sqliteCreateFunction('nextval', fn ($sequence) => 1, 1);
        Sanctum::actingAs(User::factory()->create(['role' => 'doctora']));
    }

    public function test_registro_valido_devuelve_201_y_permite_representar_ambos_contratos(): void
    {
        $solicitud = [
            'nombres' => 'Ana Pérez',
            'cedula' => '0912345678',
            'telefono' => '0991234567',
            'direccion' => 'Quito',
            'fecha_nacimiento' => '2000-04-15',
        ];

        $entrada = RegistroPacienteEntradaDto::fromValidated($solicitud);
        $this->assertSame($solicitud, $entrada->toArray());

        $respuesta = $this->postJson('/api/pacientes', $entrada->toArray())
            ->assertCreated()
            ->assertJsonPath('message', 'Paciente registrado correctamente.')
            ->assertJsonPath('data.codigo_paciente', '001')
            ->assertJsonPath('data.nombres', 'Ana Pérez')
            ->assertJsonPath('data.cedula', '0912345678')
            ->assertJsonPath('data.telefono', '0991234567')
            ->assertJsonPath('data.direccion', 'Quito');

        $this->assertDatabaseCount('pacientes', 1);
        $this->assertDatabaseHas('pacientes', [
            'cedula' => '0912345678',
            'telefono' => '0991234567',
        ]);

        $paciente = Paciente::sole();
        $this->assertSame('2000-04-15', $paciente->fecha_nacimiento->toDateString());
        $this->assertEquals($respuesta->json(), RegistroPacienteSalidaDto::fromPaciente($paciente)->toArray());
        $this->assertIsString($respuesta->json('data.id'));
        $this->assertIsString($respuesta->json('data.fecha_nacimiento'));
        $this->assertIsString($respuesta->json('data.created_at'));
        $this->assertIsString($respuesta->json('data.updated_at'));
    }

    public function test_ausencia_de_nombres_devuelve_422_y_no_persiste(): void
    {
        $this->postJson('/api/pacientes', ['cedula' => '0912345678'])
            ->assertUnprocessable()
            ->assertJsonValidationErrors('nombres');

        $this->assertDatabaseCount('pacientes', 0);
        $this->assertDatabaseCount('acciones_registradas', 0);
    }

    public function test_telefono_numerico_devuelve_422_y_no_persiste(): void
    {
        $this->postJson('/api/pacientes', [
            'nombres' => 'Ana Pérez',
            'cedula' => '0912345678',
            'telefono' => 991234567,
        ])->assertUnprocessable()->assertJsonValidationErrors('telefono');

        $this->assertDatabaseCount('pacientes', 0);
        $this->assertDatabaseCount('acciones_registradas', 0);
    }
}
