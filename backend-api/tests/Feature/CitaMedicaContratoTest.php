<?php

namespace Tests\Feature;

use App\DTO\Agenda\CitaMedicaRequestDTO;
use App\Models\Agenda;
use App\Models\Paciente;
use App\Models\User;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

/**
 * Pruebas del contrato JSON "Registrar cita médica" – Práctica 2.2 (William Cabrera).
 *
 * P1: JSON válido con campos obligatorios  -> 201 + respuesta con el contrato.
 * P2: Falta un campo obligatorio            -> 422 con detalle de validación.
 * P3: Tipo de dato incorrecto               -> 422 controlado, sin persistir datos.
 */
class CitaMedicaContratoTest extends TestCase
{
    private const URL = '/api/agenda/cita-medica';

    protected function setUp(): void
    {
        parent::setUp();

        foreach ([
            '0001_01_01_000000_create_users_table.php',
            '2026_09_25_012937_create_pacientes_table.php',
            '2026_09_25_163636_add_username_and_role_to_users_table.php',
            '2026_10_02_191138_create_agendas_table.php',
            '2026_10_03_030037_add_clinical_fields_to_agenda_table.php',
            '2026_10_03_191429_create_accion_registradas_table.php',
            '2026_11_10_202239_add_nombre_reserva_to_agenda_table.php',
        ] as $migration) {
            (require database_path('migrations/'.$migration))->up();
        }

        Paciente::create([
            'codigo_paciente' => '001',
            'nombres' => 'María López',
            'cedula' => '1312345678',
        ]);

        Sanctum::actingAs(User::create([
            'name' => 'Doctora de prueba',
            'email' => 'doctora@example.test',
            'password' => 'password-prueba',
            'role' => 'doctora',
        ]));
    }

    /** @return array<string, mixed> */
    private function solicitudValida(): array
    {
        return [
            'codigo_paciente' => '001',
            'fecha' => '2026-11-20',
            'hora_inicio' => '10:00',
            'hora_fin' => '10:30',
            'descripcion' => 'Control de ortodoncia',
        ];
    }

    public function test_p1_json_valido_devuelve_201_con_el_contrato_de_respuesta(): void
    {
        $this->postJson(self::URL, $this->solicitudValida())
            ->assertCreated()
            ->assertJsonStructure([
                'message',
                'data' => [
                    'id', 'tipo', 'estado', 'paciente_id',
                    'paciente' => ['codigo_paciente', 'nombres'],
                    'nombre_reserva', 'fecha', 'hora_inicio', 'hora_fin',
                    'descripcion', 'creado_en',
                ],
            ])
            ->assertJsonPath('message', 'Cita médica registrada correctamente.')
            ->assertJsonPath('data.tipo', 'cita_medica')
            ->assertJsonPath('data.estado', 'programada')
            ->assertJsonPath('data.paciente.codigo_paciente', '001')
            ->assertJsonPath('data.nombre_reserva', null)
            ->assertJsonPath('data.fecha', '2026-11-20')
            ->assertJsonPath('data.hora_inicio', '10:00')
            ->assertJsonPath('data.hora_fin', '10:30')
            ->assertJsonMissingPath('data.updated_at');

        $this->assertDatabaseCount('agenda', 1);
    }

    public function test_p1b_reserva_sin_paciente_registrado(): void
    {
        $this->postJson(self::URL, [
            'nombre_reserva' => '  Carlos Pérez  ',
            'fecha' => '2026-11-20',
            'hora_inicio' => '11:00',
            'hora_fin' => '11:30',
        ])
            ->assertCreated()
            ->assertJsonPath('data.paciente', null)
            ->assertJsonPath('data.nombre_reserva', 'Carlos Pérez')
            ->assertJsonPath('data.descripcion', null);
    }

    public function test_p2_falta_campo_obligatorio_devuelve_422_con_detalle(): void
    {
        $datos = $this->solicitudValida();
        unset($datos['fecha']);

        $this->postJson(self::URL, $datos)
            ->assertUnprocessable()
            ->assertJsonPath('message', 'Los datos enviados no cumplen el contrato de la cita médica.')
            ->assertJsonValidationErrors(['fecha' => 'El campo fecha es obligatorio.']);

        $this->assertDatabaseCount('agenda', 0);
    }

    public function test_p2b_sin_paciente_ni_nombre_de_reserva(): void
    {
        $datos = $this->solicitudValida();
        unset($datos['codigo_paciente']);

        $this->postJson(self::URL, $datos)
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['codigo_paciente', 'nombre_reserva']);
    }

    public function test_p3_tipo_de_dato_incorrecto_no_persiste_datos(): void
    {
        $this->postJson(self::URL, [
            'codigo_paciente' => 1,          // integer en vez de string
            'fecha' => '20/11/2026',         // formato distinto de YYYY-MM-DD
            'hora_inicio' => 1000,           // integer en vez de "HH:MM"
            'hora_fin' => '10:30',
            'descripcion' => ['no', 'texto'], // arreglo en vez de string
        ])
            ->assertUnprocessable()
            ->assertJsonValidationErrors([
                'codigo_paciente' => 'El campo codigo_paciente debe ser texto (string).',
                'fecha' => 'El campo fecha debe tener el formato Y-m-d.',
                'hora_inicio' => 'El campo hora_inicio debe ser texto (string).',
                'descripcion' => 'El campo descripcion debe ser texto (string).',
            ]);

        $this->assertDatabaseCount('agenda', 0);
        $this->assertDatabaseCount('acciones_registradas', 0);
    }

    public function test_respuesta_es_json_aunque_el_cliente_no_envie_accept(): void
    {
        $this->post(self::URL, ['fecha' => 'x'])
            ->assertStatus(422)
            ->assertHeader('Content-Type', 'application/json')
            ->assertJsonStructure(['message', 'errors']);
    }

    public function test_hora_fin_debe_ser_posterior_y_campos_excluyentes(): void
    {
        $this->postJson(self::URL, [
            ...$this->solicitudValida(),
            'nombre_reserva' => 'Otra persona',
            'hora_fin' => '09:00',
        ])
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['hora_fin', 'codigo_paciente', 'nombre_reserva']);
    }

    public function test_dto_deserializa_y_serializa_el_contrato(): void
    {
        $dto = CitaMedicaRequestDTO::fromArray([
            'nombre_reserva' => '  Ana  ',
            'fecha' => '2026-11-20',
            'hora_inicio' => '08:00',
            'hora_fin' => '08:30',
            'descripcion' => '',
        ]);

        $this->assertFalse($dto->esPacienteRegistrado());
        $this->assertSame('Ana', $dto->nombreReserva);
        $this->assertNull($dto->descripcion);
        $this->assertSame([
            'codigo_paciente' => null,
            'nombre_reserva' => 'Ana',
            'fecha' => '2026-11-20',
            'hora_inicio' => '08:00',
            'hora_fin' => '08:30',
            'descripcion' => null,
        ], $dto->toArray());
    }

    public function test_horario_ocupado_devuelve_409(): void
    {
        $this->postJson(self::URL, $this->solicitudValida())->assertCreated();
        $this->postJson(self::URL, $this->solicitudValida())
            ->assertConflict()
            ->assertJsonPath('message', 'Ese horario ya se encuentra ocupado.');

        $this->assertSame(1, Agenda::count());
    }
}
