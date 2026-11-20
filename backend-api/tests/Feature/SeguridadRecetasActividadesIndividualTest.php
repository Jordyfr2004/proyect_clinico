<?php

namespace Tests\Feature;

use App\Models\Paciente;
use App\Models\Receta;
use App\Models\User;
use Illuminate\Support\Facades\DB;
use Laravel\Sanctum\Sanctum;
use Symfony\Component\Process\Process;
use Tests\TestCase;

class SeguridadRecetasActividadesIndividualTest extends TestCase
{
    protected function setUp(): void
    {
        parent::setUp();

        // Esta práctica nunca utiliza una base de datos persistente.
        config()->set('database.default', 'sqlite');
        config()->set('database.connections.sqlite.database', ':memory:');
        config()->set('database.connections.sqlite.url', null);
        DB::purge('sqlite');

        $this->assertSame('sqlite', DB::connection()->getDriverName());
        $this->assertSame(':memory:', DB::connection()->getDatabaseName());

        // Sólo las migraciones utilizadas por estos dos módulos reales.
        // Se omiten las migraciones completas dependientes de PostgreSQL.
        foreach ([
            '0001_01_01_000000_create_users_table.php',
            '2026_09_25_012937_create_pacientes_table.php',
            '2026_09_25_163636_add_username_and_role_to_users_table.php',
            '2026_09_25_164339_add_paciente_id_to_users_table.php',
            '2026_10_02_191138_create_agendas_table.php',
            '2026_10_02_043042_create_actividads_table.php',
            '2026_10_03_191429_create_accion_registradas_table.php',
            '2026_10_18_000002_create_recetas_tables.php',
            '2026_09_19_182046_create_personal_access_tokens_table.php',
        ] as $migration) {
            (require database_path('migrations/'.$migration))->up();
        }
    }

    private function usuario(string $rol, ?Paciente $paciente = null): User
    {
        return User::create([
            'name' => ucfirst($rol).' de prueba',
            'email' => uniqid($rol.'-', true).'@example.test',
            'password' => 'solo-para-pruebas-locales',
            'role' => $rol,
            'paciente_id' => $paciente?->id,
        ]);
    }

    private function paciente(string $codigo): Paciente
    {
        return Paciente::create([
            'codigo_paciente' => $codigo,
            'nombres' => 'Paciente ficticio '.$codigo,
            'cedula' => str_pad($codigo, 10, '0', STR_PAD_LEFT),
        ]);
    }

    public function test_p1_doctora_y_asistente_consultan_recetas(): void
    {
        Sanctum::actingAs($this->usuario('doctora'));
        $this->getJson('/api/recetas')->assertOk()->assertJsonCount(0, 'data');

        Sanctum::actingAs($this->usuario('asistente'));
        $this->getJson('/api/recetas')->assertOk()->assertJsonCount(0, 'data');
    }

    public function test_p1_doctora_registra_actividad_con_datos_ficticios(): void
    {
        $paciente = $this->paciente('101');
        Sanctum::actingAs($this->usuario('doctora'));

        $this->postJson('/api/actividades', [
            'codigo_paciente' => $paciente->codigo_paciente,
            'fecha' => '2026-11-20',
            'actividad' => 'Control odontologico de prueba',
            'precio' => 12.50,
        ])->assertCreated()
            ->assertJsonPath('data.codigo_paciente', '101')
            ->assertJsonPath('data.actividad', 'Control odontologico de prueba');

        $this->assertDatabaseHas('actividades', [
            'paciente_id' => $paciente->id,
            'actividad' => 'Control odontologico de prueba',
        ]);
    }

    public function test_p1_token_bearer_real_autoriza_consulta_recetas(): void
    {
        $token = $this->usuario('doctora')
            ->createToken('practica-recetas-actividades')->plainTextToken;

        $this->withToken($token)->getJson('/api/recetas')->assertOk();
        // El token solo se utiliza durante esta prueba; no se imprime ni se documenta.
    }

    public function test_p2_sin_autenticacion_se_rechazan_ambas_operaciones(): void
    {
        $this->getJson('/api/recetas')->assertUnauthorized();
        $this->postJson('/api/actividades', [])->assertUnauthorized();
    }

    public function test_p3_usuarios_autenticados_sin_permiso_reciben_403(): void
    {
        Sanctum::actingAs($this->usuario('asistente'));
        $this->postJson('/api/actividades', [])->assertForbidden();

        Sanctum::actingAs($this->usuario('paciente', $this->paciente('102')));
        $this->getJson('/api/recetas')->assertForbidden();
        $this->postJson('/api/actividades', [])->assertForbidden();
    }

    public function test_paciente_consulta_solo_sus_propias_recetas(): void
    {
        $primero = $this->paciente('103');
        $segundo = $this->paciente('104');
        $medicamentos = [[
            'nombre' => 'Medicamento ficticio',
            'dosis' => '1 unidad',
            'frecuencia' => 'Una vez',
        ]];

        $propia = Receta::create([
            'paciente_id' => $primero->id,
            'fecha' => '2026-11-20',
            'medicamentos' => $medicamentos,
        ]);
        $ajena = Receta::create([
            'paciente_id' => $segundo->id,
            'fecha' => '2026-11-20',
            'medicamentos' => $medicamentos,
        ]);

        Sanctum::actingAs($this->usuario('paciente', $primero));
        $this->getJson('/api/paciente/mis-recetas')
            ->assertOk()->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.id', $propia->id);
        $this->getJson('/api/paciente/mis-recetas/'.$ajena->id)
            ->assertNotFound();
    }

    public function test_p4_env_se_excluye_del_repositorio_y_no_hay_claves_privadas_evidentes(): void
    {
        $raiz = dirname(base_path());
        $listado = new Process(['git', 'ls-files', '-z'], $raiz);
        $listado->mustRun();
        $rutas = array_filter(explode("\0", $listado->getOutput()));
        $this->assertNotEmpty($rutas);

        foreach ($rutas as $ruta) {
            $nombre = basename(str_replace('\\', '/', $ruta));
            $this->assertFalse(
                preg_match('/^\.env(?:\..+)?$/i', $nombre) === 1 && $nombre !== '.env.example',
                'Se detecto archivo de entorno versionado: '.$ruta
            );
            $this->assertFalse(
                preg_match('/\.(?:pem|p12|pfx|key)$/i', $nombre) === 1,
                'Se detecto posible archivo de clave privada: '.$ruta
            );

            $contenido = file_get_contents(
                $raiz.DIRECTORY_SEPARATOR.str_replace('/', DIRECTORY_SEPARATOR, $ruta)
            );
            $this->assertIsString($contenido);
            $this->assertFalse(
                str_contains($contenido, '-----BEGIN PRIVATE KEY-----') ||
                str_contains($contenido, '-----BEGIN RSA PRIVATE KEY-----') ||
                str_contains($contenido, '-----BEGIN OPENSSH PRIVATE KEY-----'),
                'Posible clave privada en archivo versionado: '.$ruta
            );
        }

        $ignore = new Process(['git', 'check-ignore', '-q', '--', 'backend-api/.env'], $raiz);
        $ignore->run();
        $this->assertTrue($ignore->isSuccessful(), 'backend-api/.env debe estar ignorado por Git');
    }
}
