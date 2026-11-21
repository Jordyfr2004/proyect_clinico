<?php

namespace Tests\Feature;

use App\Models\AccionRegistrada;
use App\Models\Actividad;
use App\Models\Agenda;
use App\Models\Egreso;
use App\Models\Paciente;
use App\Models\User;
use App\Services\AgendaService;
use Illuminate\Support\Facades\DB;
use Laravel\Sanctum\Sanctum;
use RuntimeException;
use Tests\TestCase;

class ConsultaCajaTest extends TestCase
{
    private User $doctora;
    private Paciente $paciente;

    protected function setUp(): void
    {
        parent::setUp();
        config(['database.default' => 'sqlite', 'database.connections.sqlite.database' => ':memory:']);
        DB::purge('sqlite');
        foreach ([
            '0001_01_01_000000_create_users_table.php',
            '2026_09_25_012937_create_pacientes_table.php',
            '2026_09_25_163636_add_username_and_role_to_users_table.php',
            '2026_10_02_043042_create_actividads_table.php',
            '2026_10_02_191138_create_agendas_table.php',
            '2026_10_03_030037_add_clinical_fields_to_agenda_table.php',
            '2026_10_03_050424_create_egresos_table.php',
            '2026_10_03_191429_create_accion_registradas_table.php',
            '2026_10_29_000001_add_agenda_id_to_actividades_table.php',
        ] as $migration) {
            (require database_path('migrations/'.$migration))->up();
        }
        $this->doctora = User::create([
            'name' => 'Doctora', 'email' => 'doctora@example.test',
            'password' => 'password', 'role' => 'doctora',
        ]);
        $this->paciente = Paciente::create([
            'codigo_paciente' => '001', 'nombres' => 'Paciente', 'cedula' => '1234567890',
        ]);
        Sanctum::actingAs($this->doctora);
    }

    private function cita(array $datos = []): Agenda
    {
        return Agenda::create(array_merge([
            'paciente_id' => $this->paciente->id, 'tipo' => 'cita_medica',
            'estado' => 'programada', 'fecha' => '2026-10-29',
            'hora_inicio' => '10:00', 'hora_fin' => '11:00',
            'diagnostico' => 'Diagnostico', 'tratamiento' => 'Tratamiento',
        ], $datos));
    }

    public function test_completion_creates_paid_activity_once_and_lists_it(): void
    {
        $cita = $this->cita();
        $url = '/api/agenda/'.$cita->id.'/completar';
        $datos = ['actividad' => 'Consulta y revision', 'precio' => '100.25'];
        $this->putJson($url, $datos)->assertOk()
            ->assertJsonPath('data.estado', 'completada')
            ->assertJsonPath('data.actividad.agenda_id', $cita->id)
            ->assertJsonPath('data.actividad.precio', '100.25')
            ->assertJsonPath('data.actividad.fecha', '2026-10-29');
        $this->putJson($url, $datos)->assertConflict();
        $this->assertDatabaseCount('actividades', 1);
        $this->assertDatabaseCount('acciones_registradas', 2);
        $this->getJson('/api/actividades?codigo_paciente=001')->assertOk()
            ->assertJsonPath('data.0.actividad', 'Consulta y revision')
            ->assertJsonPath('data.0.paciente.codigo_paciente', '001');
    }

    public function test_price_validation_and_clinical_requirements_do_not_create_income(): void
    {
        $cita = $this->cita();
        $url = '/api/agenda/'.$cita->id.'/completar';
        foreach ([[], ['precio' => -1], ['precio' => '1.234'], ['precio' => 'abc'], ['precio' => '100000000.00']] as $datos) {
            $this->putJson($url, $datos)->assertUnprocessable()->assertJsonValidationErrors('precio');
        }
        $cita->update(['diagnostico' => null]);
        $this->putJson($url, ['precio' => '20.50'])->assertConflict();
        $this->assertDatabaseCount('actividades', 0);
        $this->assertSame('programada', $cita->fresh()->estado);
    }

    public function test_cash_filters_days_months_years_and_keeps_each_expense_separate(): void
    {
        $cita = $this->cita();
        $this->putJson('/api/agenda/'.$cita->id.'/completar', ['precio' => '100.25'])->assertOk();
        foreach ([['2026-10-29', '20.10'], ['2026-10-29', '10.15'], ['2026-10-30', '5.00']] as [$fecha, $monto]) {
            Egreso::create(['fecha' => $fecha, 'concepto' => 'Materiales', 'monto' => $monto]);
        }
        foreach ([['2026-10-30', '60.50'], ['2026-11-01', '10.00'], ['2027-01-01', '999.00']] as [$fecha, $precio]) {
            Actividad::create(['paciente_id' => $this->paciente->id, 'fecha' => $fecha, 'actividad' => 'Consulta', 'precio' => $precio]);
        }
        foreach ([
            ['periodo=dia&fecha=2026-10-29', '100.25', '30.25', '70.00', 3],
            ['periodo=dia&fecha=2026-10-30', '60.50', '5.00', '55.50', 2],
            ['periodo=dia&fecha=2026-10-31', '0.00', '0.00', '0.00', 0],
            ['periodo=mes&mes=10&anio=2026', '160.75', '35.25', '125.50', 5],
            ['periodo=anio&anio=2026', '170.75', '35.25', '135.50', 6],
        ] as [$query, $ingresos, $egresos, $saldo, $cantidad]) {
            $this->getJson('/api/reportes/caja?'.$query)->assertOk()
                ->assertJsonPath('ingresos', $ingresos)->assertJsonPath('egresos', $egresos)
                ->assertJsonPath('saldo', $saldo)->assertJsonCount($cantidad, 'movimientos');
        }
    }

    public function test_audit_failure_rolls_back_completion_and_income(): void
    {
        $cita = $this->cita();
        AccionRegistrada::creating(function ($accion) {
            if ($accion->modulo === 'agenda') {
                throw new RuntimeException('Fallo de auditoria');
            }
        });
        try {
            app(AgendaService::class)->completarCita($cita->id, $this->doctora, ['precio' => '25.50']);
            $this->fail('Debe fallar la auditoria');
        } catch (RuntimeException $e) {
            $this->assertSame('Fallo de auditoria', $e->getMessage());
        } finally {
            AccionRegistrada::flushEventListeners();
        }
        $this->assertSame('programada', $cita->fresh()->estado);
        $this->assertDatabaseCount('actividades', 0);
        $this->assertDatabaseCount('acciones_registradas', 0);
    }

    public function test_date_correction_moves_income_and_price_can_be_corrected(): void
    {
        $cita = $this->cita();
        $this->putJson('/api/agenda/'.$cita->id.'/completar', ['precio' => '30.50'])->assertOk();
        $actividad = $cita->actividad;
        $this->putJson('/api/actividades/'.$actividad->id, ['fecha' => '2026-10-30'])->assertUnprocessable();
        $this->putJson('/api/agenda/'.$cita->id, ['fecha' => '2026-10-30'])->assertOk();
        $this->putJson('/api/actividades/'.$actividad->id, ['precio' => '40.75'])->assertOk();
        $this->assertSame('2026-10-30', $actividad->fresh()->fecha->toDateString());
        $this->getJson('/api/reportes/caja?periodo=dia&fecha=2026-10-29')->assertJsonPath('saldo', '0.00');
        $this->getJson('/api/reportes/caja?periodo=dia&fecha=2026-10-30')->assertJsonPath('saldo', '40.75');
    }
}
