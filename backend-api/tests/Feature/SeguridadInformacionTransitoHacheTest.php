<?php

namespace Tests\Feature;

use App\Models\HistorialClinico;
use App\Models\Paciente;
use App\Models\User;
use Illuminate\Support\Facades\DB;
use Laravel\Sanctum\Sanctum;
use Symfony\Component\Process\Process;
use Tests\TestCase;

class SeguridadInformacionTransitoHacheTest extends TestCase
{
    protected function setUp(): void
    {
        parent::setUp();

        // Impide que una configuración local apunte las pruebas a una base real.
        config()->set('database.default', 'sqlite');
        config()->set('database.connections.sqlite.database', ':memory:');
        config()->set('database.connections.sqlite.url', null);
        DB::purge('sqlite');

        $this->assertSame('sqlite', DB::connection()->getDriverName());
        $this->assertSame(':memory:', DB::connection()->getDatabaseName());

        // Las migraciones de secuencia y exclusión de agenda usan SQL de PostgreSQL.
        // Estas son las tablas reales necesarias para los endpoints de la práctica.
        foreach ([
            '0001_01_01_000000_create_users_table.php',
            '2026_09_25_012937_create_pacientes_table.php',
            '2026_09_25_163636_add_username_and_role_to_users_table.php',
            '2026_09_25_164339_add_paciente_id_to_users_table.php',
            '2026_10_02_004540_create_historiales_clinicos_table.php',
            '2026_10_03_191429_create_accion_registradas_table.php',
            '2026_09_19_182046_create_personal_access_tokens_table.php',
        ] as $migration) {
            (require database_path('migrations/'.$migration))->up();
        }
    }

    private function usuario(string $role, ?Paciente $paciente = null): User
    {
        return User::create([
            'name' => ucfirst($role),
            'email' => uniqid($role.'-', true).'@example.test',
            'password' => 'clave-solo-pruebas',
            'role' => $role,
            'paciente_id' => $paciente?->id,
        ]);
    }

    private function paciente(string $codigo): Paciente
    {
        return Paciente::create([
            'codigo_paciente' => $codigo,
            'nombres' => 'Paciente de prueba '.$codigo,
            'cedula' => str_pad($codigo, 10, '0', STR_PAD_LEFT),
        ]);
    }

    public function test_p1_doctora_y_asistente_pueden_consultar_historiales(): void
    {
        Sanctum::actingAs($this->usuario('doctora'));
        $this->getJson('/api/historiales-clinicos')->assertOk()->assertJsonCount(0, 'data');

        Sanctum::actingAs($this->usuario('asistente'));
        $this->getJson('/api/historiales-clinicos')->assertOk()->assertJsonCount(0, 'data');
    }

    public function test_p1_solo_doctora_puede_crear_historial(): void
    {
        $paciente = $this->paciente('1');
        Sanctum::actingAs($this->usuario('doctora'));

        $this->postJson('/api/historiales-clinicos', [
            'paciente_id' => $paciente->id,
            'sexo' => 'F',
        ])->assertCreated()->assertJsonPath('data.paciente_id', $paciente->id);

        $this->assertDatabaseHas('historiales_clinicos', ['paciente_id' => $paciente->id]);
    }

    public function test_p1_token_bearer_real_de_sanctum_autoriza_la_consulta(): void
    {
        $token = $this->usuario('doctora')->createToken('practica-2-4')->plainTextToken;

        $this->withToken($token)
            ->getJson('/api/historiales-clinicos')
            ->assertOk()
            ->assertJsonCount(0, 'data');
    }

    public function test_p2_sin_autenticacion_recibe_401_en_los_tres_endpoints(): void
    {
        $this->getJson('/api/historiales-clinicos')->assertUnauthorized();
        $this->postJson('/api/historiales-clinicos', [])->assertUnauthorized();
        $this->getJson('/api/paciente/mi-historial')->assertUnauthorized();
    }

    public function test_p3_paciente_no_puede_listar_y_asistente_no_puede_crear(): void
    {
        Sanctum::actingAs($this->usuario('paciente', $this->paciente('2')));
        $this->getJson('/api/historiales-clinicos')->assertForbidden();
        $this->postJson('/api/historiales-clinicos', [])->assertForbidden();

        Sanctum::actingAs($this->usuario('asistente'));
        $this->postJson('/api/historiales-clinicos', [])->assertForbidden();
        $this->getJson('/api/paciente/mi-historial')->assertForbidden();
    }

    public function test_paciente_solo_recibe_el_historial_vinculado_a_su_cuenta(): void
    {
        $propio = $this->paciente('3');
        $ajeno = $this->paciente('4');
        $miHistorial = HistorialClinico::create(['paciente_id' => $propio->id, 'sexo' => 'F']);
        $otroHistorial = HistorialClinico::create(['paciente_id' => $ajeno->id, 'sexo' => 'M']);

        Sanctum::actingAs($this->usuario('paciente', $propio));
        $respuesta = $this->getJson('/api/paciente/mi-historial')
            ->assertOk()
            ->assertJsonPath('data.id', $miHistorial->id)
            ->assertJsonPath('data.paciente_id', $propio->id);
        $this->assertNotSame($otroHistorial->id, $respuesta->json('data.id'));

        Sanctum::actingAs($this->usuario('paciente', $ajeno));
        $this->getJson('/api/paciente/mi-historial')
            ->assertOk()->assertJsonPath('data.id', $otroHistorial->id);
    }

    public function test_p4_env_esta_ignorado_y_no_hay_secretos_evidentes_versionados(): void
    {
        $raiz = dirname(base_path());
        $archivos = new Process(['git', 'ls-files', '-z'], $raiz);
        $archivos->mustRun();
        $rutas = array_filter(explode("\0", $archivos->getOutput()));

        $this->assertNotEmpty($rutas);
        foreach ($rutas as $ruta) {
            $nombre = basename(str_replace('\\', '/', $ruta));
            $this->assertFalse(
                preg_match('/^\.env(?:\..+)?$/i', $nombre) === 1 && $nombre !== '.env.example',
                'Archivo de entorno versionado: '.$ruta
            );
            $this->assertFalse(
                preg_match('/\.(?:pem|p12|pfx|key)$/i', $nombre) === 1,
                'Archivo de clave versionado: '.$ruta
            );

            $contenido = file_get_contents($raiz.DIRECTORY_SEPARATOR.str_replace('/', DIRECTORY_SEPARATOR, $ruta));
            $this->assertIsString($contenido);
            $this->assertFalse(
                preg_match('/-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----|\b(?:ghp_[A-Za-z0-9]{36}|glpat-[A-Za-z0-9_-]{20,}|sk_live_[A-Za-z0-9]{16,}|xox[baprs]-[A-Za-z0-9-]{20,})\b/', $contenido) === 1,
                'Posible secreto versionado en '.$ruta
            );
        }

        $ignorado = new Process(['git', 'check-ignore', '-q', '--', 'backend-api/.env'], $raiz);
        $ignorado->run();
        $this->assertTrue($ignorado->isSuccessful(), 'backend-api/.env debe estar ignorado por Git');
    }
}
