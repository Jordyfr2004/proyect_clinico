<?php

namespace Tests\Feature;

use App\Models\Agenda;
use App\Models\Paciente;
use App\Models\User;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class AgendaHorariosTest extends TestCase
{
    protected function setUp(): void
    {
        parent::setUp();

        $pacientes = require database_path('migrations/2026_09_25_012937_create_pacientes_table.php');
        $pacientes->up();
        $agenda = require database_path('migrations/2026_10_02_191138_create_agendas_table.php');
        $agenda->up();

        Sanctum::actingAs(new User(['role' => 'doctora']));
    }

    private function paciente(): Paciente
    {
        return Paciente::create([
            'codigo_paciente' => '001',
            'nombres' => 'Paciente de prueba',
            'cedula' => '1234567890',
        ]);
    }

    private function bloque(string $tipo = 'personal', ?string $pacienteId = null): Agenda
    {
        return Agenda::create([
            'paciente_id' => $pacienteId,
            'fecha' => '2026-10-05',
            'hora_inicio' => '10:00',
            'hora_fin' => '11:00',
            'tipo' => $tipo,
            'descripcion' => 'Bloque ocupado',
            'estado' => $tipo === 'personal' ? null : 'programada',
        ]);
    }

    public function test_creating_personal_blocks_respects_minute_overlaps_and_boundaries(): void
    {
        $this->bloque();

        foreach ([['09:30', '10:30'], ['10:30', '11:40'], ['10:59', '11:00']] as [$inicio, $fin]) {
            $this->postJson('/api/agenda/personal', [
                'fecha' => '2026-10-05',
                'hora_inicio' => $inicio,
                'hora_fin' => $fin,
                'descripcion' => 'Cruce',
            ])->assertConflict();
        }

        foreach ([['09:00', '10:00'], ['11:00', '12:00']] as [$inicio, $fin]) {
            $this->postJson('/api/agenda/personal', [
                'fecha' => '2026-10-05',
                'hora_inicio' => $inicio,
                'hora_fin' => $fin,
                'descripcion' => 'Libre',
            ])->assertCreated();
        }

        $this->postJson('/api/agenda/personal', [
            'fecha' => '2026-10-06',
            'hora_inicio' => '10:30',
            'hora_fin' => '11:40',
            'descripcion' => 'Otro día',
        ])->assertCreated();
    }

    public function test_medical_creation_and_request_scheduling_check_personal_and_medical_blocks(): void
    {
        $paciente = $this->paciente();
        $this->bloque('cita_medica', $paciente->id);

        $this->postJson('/api/agenda/cita-medica', [
            'codigo_paciente' => '001',
            'fecha' => '2026-10-05',
            'hora_inicio' => '10:30',
            'hora_fin' => '11:40',
        ])->assertConflict();

        $pendiente = Agenda::create([
            'paciente_id' => $paciente->id,
            'tipo' => 'cita_medica',
            'estado' => 'pendiente',
        ]);

        $this->putJson('/api/agenda/solicitud/'.$pendiente->id.'/programar', [
            'fecha' => '2026-10-05',
            'hora_inicio' => '09:30',
            'hora_fin' => '10:30',
        ])->assertConflict();

        $this->putJson('/api/agenda/solicitud/'.$pendiente->id.'/programar', [
            'fecha' => '2026-10-05',
            'hora_inicio' => '11:00',
            'hora_fin' => '12:00',
        ])->assertOk();
    }

    public function test_editing_checks_combined_time_excludes_itself_and_rejects_reversed_time(): void
    {
        $this->bloque();
        $editable = Agenda::create([
            'fecha' => '2026-10-05',
            'hora_inicio' => '12:00',
            'hora_fin' => '13:00',
            'tipo' => 'personal',
            'descripcion' => 'Editar',
        ]);

        $url = '/api/agenda/'.$editable->id;

        $this->putJson($url, ['hora_inicio' => '10:30', 'hora_fin' => '11:40'])
            ->assertConflict();
        $this->putJson($url, ['hora_inicio' => '10:00', 'hora_fin' => '09:00'])
            ->assertUnprocessable();
        $this->putJson($url, ['hora_inicio' => '13:00'])
            ->assertUnprocessable();

        $this->assertDatabaseHas('agenda', [
            'id' => $editable->id,
            'hora_inicio' => '12:00',
            'hora_fin' => '13:00',
        ]);

        $this->putJson($url, ['descripcion' => 'Cambio de texto'])->assertOk();
        $this->putJson($url, ['hora_inicio' => '11:00'])->assertOk();
        $this->putJson($url, ['fecha' => '2026-10-06', 'hora_inicio' => '10:30'])
            ->assertOk();
    }

    public function test_cancelled_medical_appointment_frees_its_slot(): void
    {
        $paciente = $this->paciente();
        $cita = $this->bloque('cita_medica', $paciente->id);

        $this->putJson('/api/agenda/'.$cita->id.'/cancelar')->assertOk();
        $this->postJson('/api/agenda/personal', [
            'fecha' => '2026-10-05',
            'hora_inicio' => '10:30',
            'hora_fin' => '11:40',
            'descripcion' => 'Ahora libre',
        ])->assertCreated();
    }

    public function test_editing_medical_appointment_checks_personal_blocks_and_own_slot(): void
    {
        $paciente = $this->paciente();
        $this->bloque();
        $cita = Agenda::create([
            'paciente_id' => $paciente->id,
            'fecha' => '2026-10-05',
            'hora_inicio' => '12:00',
            'hora_fin' => '13:00',
            'tipo' => 'cita_medica',
            'estado' => 'programada',
        ]);

        $url = '/api/agenda/'.$cita->id;
        $this->putJson($url, ['hora_inicio' => '10:30'])->assertConflict();
        $this->putJson($url, ['hora_fin' => '12:00'])->assertUnprocessable();
        $this->putJson($url, ['hora_inicio' => '11:00'])->assertOk();
        $this->putJson($url, ['fecha' => '2026-10-06', 'hora_inicio' => '10:30'])
            ->assertOk();

        $this->assertDatabaseHas('agenda', [
            'id' => $cita->id,
            'fecha' => '2026-10-06',
            'hora_inicio' => '10:30',
            'hora_fin' => '13:00',
        ]);
    }

    public function test_completed_appointment_still_blocks_its_time(): void
    {
        $paciente = $this->paciente();
        $cita = $this->bloque('cita_medica', $paciente->id);

        $this->putJson('/api/agenda/'.$cita->id.'/completar')->assertOk();
        $this->postJson('/api/agenda/personal', [
            'fecha' => '2026-10-05',
            'hora_inicio' => '10:30',
            'hora_fin' => '11:40',
            'descripcion' => 'Cruce con cita completada',
        ])->assertConflict();
    }
}
