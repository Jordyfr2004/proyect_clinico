<?php

namespace Tests\Feature;

use App\Models\Agenda;
use App\Models\Paciente;
use App\Models\User;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

/**
 * Capa de intercambio de información semántica (HL7 FHIR R4 Appointment).
 * Práctica de William Cabrera, sobre el contrato de la cita médica (Práctica 2.2).
 *
 * S1: exportar una cita interna como Appointment con vocabulario estándar.
 * S2: importar un Appointment de otro sistema y registrarlo en la agenda.
 * S3: el mismo instante con otra zona horaria significa la misma cita.
 * S4: un código que no tiene significado para el consultorio se rechaza
 *     con OperationOutcome, sin guardar nada.
 */
class SemanticaCitaFhirTest extends TestCase
{
    private const FHIR = '/api/semantica/fhir/Appointment';

    private const CODIGO = 'urn:proyect-clinico:codigo-paciente';

    private const CEDULA = 'urn:proyect-clinico:cedula-ecuador';

    private const CATEGORIA = 'http://terminology.hl7.org/CodeSystem/service-category';

    private Paciente $paciente;

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

        $this->paciente = Paciente::create([
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
    private function appointment(array $cambios = []): array
    {
        return array_replace([
            'resourceType' => 'Appointment',
            'status' => 'booked',
            'serviceCategory' => [['coding' => [['system' => self::CATEGORIA, 'code' => '10', 'display' => 'Dental']]]],
            'description' => 'Control de ortodoncia',
            'start' => '2026-11-20T10:00:00-05:00',
            'end' => '2026-11-20T10:30:00-05:00',
            'participant' => [[
                'actor' => ['type' => 'Patient', 'identifier' => ['system' => self::CODIGO, 'value' => '001']],
                'status' => 'accepted',
            ]],
        ], $cambios);
    }

    private function cita(array $datos = []): Agenda
    {
        return Agenda::create([
            'paciente_id' => $this->paciente->id,
            'fecha' => '2026-11-20',
            'hora_inicio' => '10:00:00',
            'hora_fin' => '10:30:00',
            'tipo' => 'cita_medica',
            'descripcion' => 'Control de ortodoncia',
            'estado' => 'programada',
            'diagnostico' => 'Dato clínico privado',
            ...$datos,
        ]);
    }

    public function test_s1_exporta_la_cita_como_appointment_con_vocabulario_estandar(): void
    {
        $cita = $this->cita();

        $this->getJson(self::FHIR.'/'.$cita->id)
            ->assertOk()
            ->assertHeader('Content-Type', 'application/fhir+json')
            ->assertJsonPath('resourceType', 'Appointment')
            ->assertJsonPath('id', $cita->id)
            ->assertJsonPath('status', 'booked')
            ->assertJsonPath('serviceCategory.0.coding.0.system', self::CATEGORIA)
            ->assertJsonPath('serviceCategory.0.coding.0.code', '10')
            ->assertJsonPath('start', '2026-11-20T10:00:00-05:00')
            ->assertJsonPath('end', '2026-11-20T10:30:00-05:00')
            ->assertJsonPath('participant.0.actor.type', 'Patient')
            ->assertJsonPath('participant.0.actor.identifier.system', self::CODIGO)
            ->assertJsonPath('participant.0.actor.identifier.value', '001')
            ->assertJsonPath('participant.0.actor.display', 'María López')
            ->assertDontSee('Dato clínico privado')
            ->assertJsonMissingPath('estado')
            ->assertJsonMissingPath('codigo_paciente');
    }

    public function test_s1b_cada_estado_interno_tiene_su_codigo_fhir(): void
    {
        foreach (['pendiente' => 'proposed', 'programada' => 'booked', 'completada' => 'fulfilled', 'cancelada' => 'cancelled'] as $interno => $fhir) {
            $cita = $this->cita(['estado' => $interno, 'hora_inicio' => null, 'hora_fin' => null]);

            $this->getJson(self::FHIR.'/'.$cita->id)
                ->assertOk()
                ->assertJsonPath('status', $fhir)
                ->assertJsonMissingPath('start');
        }
    }

    public function test_s1c_reserva_sin_paciente_registrado_solo_lleva_el_nombre(): void
    {
        $cita = $this->cita(['paciente_id' => null, 'nombre_reserva' => 'Carlos Pérez']);

        $this->getJson(self::FHIR.'/'.$cita->id)
            ->assertOk()
            ->assertJsonPath('participant.0.actor', ['type' => 'Patient', 'display' => 'Carlos Pérez']);
    }

    public function test_s1d_no_expone_entradas_personales_ni_ids_invalidos(): void
    {
        $personal = $this->cita(['tipo' => 'personal', 'paciente_id' => null]);

        $this->getJson(self::FHIR.'/'.$personal->id)
            ->assertNotFound()
            ->assertJsonPath('resourceType', 'OperationOutcome')
            ->assertJsonPath('issue.0.code', 'not-found');

        $this->getJson(self::FHIR.'/no-es-uuid')->assertNotFound();
    }

    public function test_s1e_busqueda_por_dia_devuelve_un_bundle(): void
    {
        $this->cita();
        $this->cita(['fecha' => '2026-11-21']);
        $this->cita(['tipo' => 'personal', 'paciente_id' => null, 'hora_inicio' => '12:00:00', 'hora_fin' => '13:00:00']);

        $this->getJson(self::FHIR.'?date=2026-11-20')
            ->assertOk()
            ->assertJsonPath('resourceType', 'Bundle')
            ->assertJsonPath('type', 'searchset')
            ->assertJsonPath('total', 1)
            ->assertJsonPath('entry.0.resource.resourceType', 'Appointment');

        $this->getJson(self::FHIR)
            ->assertStatus(422)
            ->assertJsonPath('issue.0.expression.0', 'date');
    }

    public function test_s2_importa_un_appointment_y_lo_registra_en_la_agenda(): void
    {
        $respuesta = $this->postJson(self::FHIR, $this->appointment())
            ->assertCreated()
            ->assertHeader('Content-Type', 'application/fhir+json')
            ->assertJsonPath('resourceType', 'Appointment')
            ->assertJsonPath('status', 'booked')
            ->assertJsonPath('start', '2026-11-20T10:00:00-05:00')
            ->assertJsonPath('participant.0.actor.display', 'María López');

        $cita = Agenda::sole();
        $respuesta->assertHeader('Location', url(self::FHIR.'/'.$cita->id));

        $this->assertSame($this->paciente->id, $cita->paciente_id);
        $this->assertSame('cita_medica', $cita->tipo);
        $this->assertSame('programada', $cita->estado);
        $this->assertSame('2026-11-20', $cita->fecha->format('Y-m-d'));
        $this->assertSame('10:00', substr($cita->hora_inicio, 0, 5));
        $this->assertSame('Control de ortodoncia', $cita->descripcion);
        $this->assertDatabaseCount('acciones_registradas', 1);
    }

    public function test_s2b_identifica_al_paciente_por_cedula_de_otro_sistema(): void
    {
        $this->postJson(self::FHIR, $this->appointment([
            'participant' => [['actor' => ['type' => 'Patient', 'identifier' => ['system' => self::CEDULA, 'value' => '1312345678']]]],
        ]))
            ->assertCreated()
            ->assertJsonPath('participant.0.actor.identifier.value', '001');

        $this->assertSame($this->paciente->id, Agenda::sole()->paciente_id);
    }

    public function test_s2c_paciente_no_registrado_se_guarda_como_reserva(): void
    {
        $this->postJson(self::FHIR, $this->appointment([
            'serviceCategory' => null,
            'participant' => [
                ['actor' => ['reference' => 'Practitioner/odontologa', 'display' => 'Doctora']],
                ['actor' => ['reference' => 'Patient/externo-77', 'display' => '  Ana Mera  ']],
            ],
        ]))->assertCreated();

        $cita = Agenda::sole();
        $this->assertNull($cita->paciente_id);
        $this->assertSame('Ana Mera', $cita->nombre_reserva);
    }

    public function test_s3_el_mismo_instante_en_utc_se_guarda_en_hora_local(): void
    {
        $this->postJson(self::FHIR, $this->appointment([
            'start' => '2026-11-20T15:00:00Z',
            'end' => '2026-11-20T15:30:00.000Z',
        ]))
            ->assertCreated()
            ->assertJsonPath('start', '2026-11-20T10:00:00-05:00');

        $cita = Agenda::sole();
        $this->assertSame('2026-11-20', $cita->fecha->format('Y-m-d'));
        $this->assertSame('10:00', substr($cita->hora_inicio, 0, 5));
        $this->assertSame('10:30', substr($cita->hora_fin, 0, 5));
    }

    public function test_s3b_utc_que_cruza_la_medianoche_cambia_el_dia_local(): void
    {
        $this->postJson(self::FHIR, $this->appointment([
            'start' => '2026-11-21T02:00:00Z',
            'end' => '2026-11-21T02:30:00Z',
        ]))->assertCreated();

        $this->assertSame('2026-11-20', Agenda::sole()->fecha->format('Y-m-d'));
        $this->assertSame('21:00', substr(Agenda::sole()->hora_inicio, 0, 5));
    }

    public function test_s4_codigos_sin_significado_se_rechazan_con_operation_outcome(): void
    {
        $this->postJson(self::FHIR, $this->appointment([
            'status' => 'arrived-late',
            'serviceCategory' => [['coding' => [['system' => self::CATEGORIA, 'code' => '27', 'display' => 'Mental Health']]]],
            'start' => '2026-11-20 10:00',
            'participant' => [['actor' => ['type' => 'Patient', 'identifier' => ['system' => 'urn:otro-hospital:hc', 'value' => '9']]]],
        ]))
            ->assertStatus(422)
            ->assertHeader('Content-Type', 'application/fhir+json')
            ->assertJsonPath('resourceType', 'OperationOutcome')
            ->assertJsonCount(4, 'issue')
            ->assertJsonFragment(['code' => 'code-invalid', 'expression' => ['Appointment.status']])
            ->assertJsonFragment(['code' => 'code-invalid', 'expression' => ['Appointment.serviceCategory']])
            ->assertJsonFragment(['code' => 'value', 'expression' => ['Appointment.start']])
            ->assertJsonFragment(['code' => 'code-invalid', 'expression' => ['Appointment.participant.actor.identifier.system']]);

        $this->assertDatabaseCount('agenda', 0);
        $this->assertDatabaseCount('acciones_registradas', 0);
    }

    public function test_s4b_reglas_de_significado(): void
    {
        $casos = [
            'estado que no es una cita confirmada' => [['status' => 'proposed'], 'not-supported', 'Appointment.status'],
            'paciente que no existe' => [['participant' => [['actor' => ['type' => 'Patient', 'identifier' => ['system' => self::CEDULA, 'value' => '0999999999']]]]], 'not-found', 'Appointment.participant.actor.identifier'],
            'sin participante paciente' => [['participant' => [['actor' => ['reference' => 'Practitioner/1']]]], 'business-rule', 'Appointment.participant'],
            'fin antes del inicio' => [['end' => '2026-11-20T09:00:00-05:00'], 'business-rule', 'Appointment.end'],
            'segundos distintos de cero' => [['start' => '2026-11-20T10:00:30-05:00'], 'value', 'Appointment.start'],
            'otro tipo de recurso' => [['resourceType' => 'Patient'], 'invalid', 'resourceType'],
        ];

        foreach ($casos as $caso => [$cambios, $codigo, $ruta]) {
            $this->postJson(self::FHIR, $this->appointment($cambios))
                ->assertStatus(422)
                ->assertJsonPath('issue.0.code', $codigo, $caso)
                ->assertJsonPath('issue.0.expression.0', $ruta, $caso);
        }

        $this->assertDatabaseCount('agenda', 0);
    }

    public function test_s4c_horario_ocupado_responde_409_en_formato_fhir(): void
    {
        $this->cita();

        $this->postJson(self::FHIR, $this->appointment([
            'start' => '2026-11-20T15:15:00Z',
            'end' => '2026-11-20T15:45:00Z',
        ]))
            ->assertConflict()
            ->assertJsonPath('resourceType', 'OperationOutcome')
            ->assertJsonPath('issue.0.code', 'conflict');

        $this->assertSame(1, Agenda::count());
    }

    public function test_ida_y_vuelta_exportar_e_importar_conserva_el_significado(): void
    {
        $original = $this->getJson(self::FHIR.'/'.$this->cita()->id)->json();
        Agenda::query()->delete();

        $copia = $this->postJson(self::FHIR, $original)->assertCreated()->json();

        foreach (['status', 'start', 'end', 'description', 'serviceCategory', 'participant'] as $campo) {
            $this->assertEquals($original[$campo], $copia[$campo], $campo);
        }
    }

    public function test_vocabulario_publica_la_tabla_de_mapeo(): void
    {
        $this->getJson('/api/semantica/vocabulario')
            ->assertOk()
            ->assertJsonPath('zona_horaria', 'America/Guayaquil')
            ->assertJsonFragment(['interno' => 'programada', 'fhir' => 'booked', 'importable' => true])
            ->assertJsonFragment(['no_se_comparten' => ['diagnostico', 'tratamiento', 'observacion', 'citas de tipo personal']]);
    }

    public function test_solo_la_doctora_usa_la_capa_semantica(): void
    {
        Sanctum::actingAs(User::create([
            'name' => 'Paciente',
            'email' => 'paciente@example.test',
            'password' => 'password-prueba',
            'role' => 'paciente',
        ]));

        $this->getJson('/api/semantica/vocabulario')->assertForbidden();
        $this->postJson(self::FHIR, $this->appointment())->assertForbidden();
    }
}
