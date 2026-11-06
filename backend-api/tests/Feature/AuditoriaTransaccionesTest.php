<?php

namespace Tests\Feature;

use App\Models\AccionRegistrada;
use App\Models\Actividad;
use App\Models\Agenda;
use App\Models\Egreso;
use App\Models\EvidenciaClinica;
use App\Models\HistorialClinico;
use App\Models\Odontograma;
use App\Models\Paciente;
use App\Models\SesionRegistrada;
use App\Models\User;
use Closure;
use Illuminate\Support\Facades\DB;
use Laravel\Sanctum\PersonalAccessToken;
use PHPUnit\Framework\Attributes\DataProvider;
use RuntimeException;
use Tests\TestCase;

class AuditoriaTransaccionesTest extends TestCase
{
    private User $doctora;

    private Paciente $paciente;

    protected function setUp(): void
    {
        parent::setUp();

        // Use the real schema on an isolated SQLite database, excluding PostgreSQL-only migrations.
        config(['database.default' => 'sqlite', 'database.connections.sqlite.database' => ':memory:']);
        DB::purge('sqlite');

        foreach ([
            '0001_01_01_000000_create_users_table.php',
            '2026_09_19_182046_create_personal_access_tokens_table.php',
            '2026_09_25_012937_create_pacientes_table.php',
            '2026_09_25_163636_add_username_and_role_to_users_table.php',
            '2026_09_25_164339_add_paciente_id_to_users_table.php',
            '2026_09_30_034413_add_activo_to_users_table.php',
            '2026_10_02_004540_create_historiales_clinicos_table.php',
            '2026_10_02_043042_create_actividads_table.php',
            '2026_10_02_191138_create_agendas_table.php',
            '2026_10_03_030037_add_clinical_fields_to_agenda_table.php',
            '2026_10_03_035322_create_odontogramas_table.php',
            '2026_10_03_043148_create_evidencia_clinicas_table.php',
            '2026_10_03_050424_create_egresos_table.php',
            '2026_10_03_191429_create_accion_registradas_table.php',
            '2026_10_29_000001_add_agenda_id_to_actividades_table.php',
            '2026_10_03_191440_create_sesion_registradas_table.php',
        ] as $migration) {
            (require database_path('migrations/'.$migration))->up();
        }

        // Only sequence allocation is simulated; writes and rollbacks use real transactions.
        DB::connection()->getPdo()->sqliteCreateFunction('nextval', fn ($sequence) => 2, 1);

        $this->doctora = User::create([
            'name' => 'Doctora',
            'email' => 'doctora@example.test',
            'username' => 'doctora',
            'password' => 'password-prueba',
            'role' => 'doctora',
            'activo' => true,
        ]);
        $this->paciente = Paciente::create([
            'codigo_paciente' => '001',
            'nombres' => 'Paciente original',
            'cedula' => '1234567890',
        ]);
    }

    protected function tearDown(): void
    {
        AccionRegistrada::flushEventListeners();
        SesionRegistrada::flushEventListeners();
        PersonalAccessToken::flushEventListeners();

        parent::tearDown();
    }

    public static function operacionesAuditadas(): iterable
    {
        $services = [
            'PacienteService' => ['crear', 'actualizar'],
            'ActividadService' => ['crear', 'actualizar', 'eliminar'],
            'EgresoService' => ['crear', 'actualizar', 'eliminar'],
            'EvidenciaClinicaService' => ['crear', 'actualizar', 'eliminar'],
            'HistorialClinicoService' => ['crear', 'actualizar'],
            'OdontogramaService' => ['guardar_nuevo', 'guardar_existente', 'eliminar'],
            'AgendaService' => [
                'crearPersonal', 'crearCitaMedica', 'programarSolicitud', 'actualizar',
                'registrarDatosClinicos', 'cancelarCita', 'completarCita', 'eliminar',
            ],
            'UsuarioService' => [
                'crearAsistente', 'desactivarAsistente', 'activarAsistente',
                'cambiarPasswordAsistente', 'eliminarAsistente', 'desactivarUsuario',
                'activarUsuario', 'desvincularPaciente',
            ],
            'AuthService' => ['login', 'logout'],
        ];

        foreach ($services as $service => $methods) {
            foreach ($methods as $method) {
                yield $service.'::'.$method => [$service, $method];
            }
        }
    }

    #[DataProvider('operacionesAuditadas')]
    public function test_audit_failure_rolls_back_the_operation_and_audit(string $service, string $method): void
    {
        $operation = $this->prepararOperacion($service, $method);
        $before = $this->estadoBaseDeDatos();
        $audit = $service === 'AuthService' ? SesionRegistrada::class : AccionRegistrada::class;

        // Fail after insertion to verify that even an inserted audit row is rolled back.
        $audit::created(function () {
            throw new RuntimeException('Fallo de auditoria simulado');
        });

        try {
            $operation();
            $this->fail('La operacion debio propagar el fallo de auditoria.');
        } catch (RuntimeException $exception) {
            $this->assertSame('Fallo de auditoria simulado', $exception->getMessage());
        }

        $this->assertSame($before, $this->estadoBaseDeDatos());
        $this->assertSame(0, DB::transactionLevel());
    }

    #[DataProvider('operacionesAuditadas')]
    public function test_success_commits_the_operation_and_audit(string $service, string $method): void
    {
        $operation = $this->prepararOperacion($service, $method);
        $before = $this->estadoBaseDeDatos();

        $operation();

        $after = $this->estadoBaseDeDatos();
        $auditTable = $service === 'AuthService' ? 'sesiones_registradas' : 'acciones_registradas';
        $expectedAudits = $service === 'AgendaService' && $method === 'completarCita' ? 2 : 1;
        $this->assertCount($expectedAudits, $after[$auditTable]);
        $this->assertSame($this->doctora->id, $after[$auditTable][0]['user_id']);
        unset($before['acciones_registradas'], $before['sesiones_registradas']);
        unset($after['acciones_registradas'], $after['sesiones_registradas']);
        $this->assertNotSame($before, $after);
        $this->assertSame(0, DB::transactionLevel());
    }

    public function test_logout_rolls_back_session_audit_when_token_deletion_fails(): void
    {
        $operation = $this->prepararOperacion('AuthService', 'logout');
        $before = $this->estadoBaseDeDatos();
        PersonalAccessToken::deleted(function () {
            throw new RuntimeException('Fallo al eliminar token');
        });

        try {
            $operation();
            $this->fail('La eliminacion del token debio fallar.');
        } catch (RuntimeException $exception) {
            $this->assertSame('Fallo al eliminar token', $exception->getMessage());
        }

        $this->assertSame($before, $this->estadoBaseDeDatos());
        $this->assertSame(0, DB::transactionLevel());
    }

    private function estadoBaseDeDatos(): array
    {
        $state = [];
        foreach ([
            'pacientes', 'users', 'personal_access_tokens', 'actividades', 'egresos',
            'evidencias_clinicas', 'historiales_clinicos', 'odontogramas', 'agenda',
            'acciones_registradas', 'sesiones_registradas',
        ] as $table) {
            $state[$table] = DB::table($table)->orderBy('id')->get()
                ->map(fn ($row) => (array) $row)->all();
        }

        return $state;
    }

    private function prepararOperacion(string $serviceName, string $method): Closure
    {
        $service = app('App\\Services\\'.$serviceName);
        $actor = $this->doctora;
        $paciente = $this->paciente;

        if ($serviceName === 'AuthService') {
            if ($method === 'login') {
                return fn () => $service->login($actor->username, 'password-prueba');
            }

            $actor->withAccessToken($actor->createToken('existente')->accessToken);

            return fn () => $service->logout($actor);
        }

        if ($serviceName === 'UsuarioService') {
            $data = [
                'name' => 'Asistente', 'email' => 'asistente@example.test',
                'username' => 'asistente', 'password' => 'password-original',
                'role' => 'asistente', 'activo' => true,
            ];
            if ($method === 'crearAsistente') {
                return fn () => $service->crearAsistente($data, $actor);
            }
            if (in_array($method, ['activarAsistente', 'activarUsuario'])) {
                $data['activo'] = false;
            }
            if (in_array($method, ['desactivarUsuario', 'activarUsuario', 'desvincularPaciente'])) {
                $data['role'] = 'paciente';
                $data['paciente_id'] = $paciente->id;
            }
            $target = User::create($data);
            $target->createToken('existente');

            return match ($method) {
                'cambiarPasswordAsistente' => fn () => $service->$method('password-nuevo', $actor),
                'desactivarUsuario', 'activarUsuario', 'desvincularPaciente' => fn () => $service->$method($target->id, $actor),
                default => fn () => $service->$method($actor),
            };
        }

        if ($serviceName === 'AgendaService') {
            $data = [
                'fecha' => '2026-10-20', 'hora_inicio' => '10:00', 'hora_fin' => '11:00',
                'descripcion' => 'Consulta', 'codigo_paciente' => $paciente->codigo_paciente,
            ];
            if (in_array($method, ['crearPersonal', 'crearCitaMedica'])) {
                return fn () => $service->$method($data, $actor);
            }
            $pending = $method === 'programarSolicitud';
            $record = Agenda::create([
                'paciente_id' => $paciente->id, 'tipo' => 'cita_medica',
                'estado' => $pending ? 'pendiente' : 'programada',
                'fecha' => $pending ? null : $data['fecha'],
                'hora_inicio' => $pending ? null : $data['hora_inicio'],
                'hora_fin' => $pending ? null : $data['hora_fin'],
                'diagnostico' => 'Diagnostico original', 'tratamiento' => 'Tratamiento original',
            ]);

            return match ($method) {
                'programarSolicitud' => fn () => $service->$method($record->id, array_intersect_key($data, array_flip(['fecha', 'hora_inicio', 'hora_fin'])), $actor),
                'actualizar' => fn () => $service->$method($record->id, ['descripcion' => 'Modificada'], $actor),
                'completarCita' => fn () => $service->$method($record->id, $actor, ['precio' => '30.50']),
                'registrarDatosClinicos' => fn () => $service->$method($record->id, ['diagnostico' => 'Nuevo', 'tratamiento' => 'Nuevo'], $actor),
                default => fn () => $service->$method($record->id, $actor),
            };
        }

        if ($serviceName === 'OdontogramaService') {
            if ($method !== 'guardar_nuevo') {
                Odontograma::create(['paciente_id' => $paciente->id, 'datos' => ['original' => true]]);
            }

            return $method === 'eliminar'
                ? fn () => $service->eliminar($paciente->id, $actor)
                : fn () => $service->guardar($paciente->id, ['datos' => ['nuevo' => true]], $actor);
        }

        [$model, $data, $changes] = match ($serviceName) {
            'PacienteService' => [Paciente::class, [
                'nombres' => 'Paciente nuevo', 'cedula' => '0987654321',
            ], ['nombres' => 'Paciente actualizado']],
            'ActividadService' => [Actividad::class, [
                'paciente_id' => $paciente->id, 'fecha' => '2026-10-20',
                'actividad' => 'Consulta', 'precio' => 10,
            ], ['precio' => 20]],
            'EgresoService' => [Egreso::class, [
                'fecha' => '2026-10-20', 'concepto' => 'Material', 'monto' => 10,
            ], ['monto' => 20]],
            'EvidenciaClinicaService' => [EvidenciaClinica::class, [
                'paciente_id' => $paciente->id, 'tipo' => 'rx',
                'nombre_archivo' => 'rx.png', 'ruta_archivo' => 'evidencias/rx.png',
                'mime_type' => 'image/png', 'tamano' => 10, 'fecha' => '2026-10-20',
            ], ['descripcion' => 'Actualizada']],
            'HistorialClinicoService' => [HistorialClinico::class, [
                'paciente_id' => $paciente->id, 'cirugias' => 'Ninguna',
            ], ['cirugias' => 'Actualizadas']],
        };

        if ($method === 'crear') {
            if ($serviceName === 'ActividadService') {
                unset($data['paciente_id']);
                $data['codigo_paciente'] = $paciente->codigo_paciente;
            }

            return fn () => $service->crear($data, $actor);
        }

        $record = $serviceName === 'PacienteService' ? $paciente : $model::create($data);

        return $method === 'actualizar'
            ? fn () => $service->actualizar($record->id, $changes, $actor)
            : fn () => $service->eliminar($record->id, $actor);
    }
}
