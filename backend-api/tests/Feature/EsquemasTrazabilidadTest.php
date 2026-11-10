<?php

namespace Tests\Feature;

use App\Models\Paciente;
use App\Models\User;
use Illuminate\Database\QueryException;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\DB;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

/**
 * Esquemas por área y trazabilidad con triggers: solo existen en PostgreSQL.
 * Requiere una base vacía cuyo nombre termine en _test, por ejemplo:
 * CLINICA_TEST_PGSQL_URL=postgresql://usuario:clave@127.0.0.1:5432/proyect_clinico_test
 */
class EsquemasTrazabilidadTest extends TestCase
{
    private User $doctora;

    protected function setUp(): void
    {
        parent::setUp();

        $url = getenv('CLINICA_TEST_PGSQL_URL');
        if (!$url) {
            $this->markTestSkipped('Define CLINICA_TEST_PGSQL_URL para probar los esquemas en PostgreSQL.');
        }
        if (!str_ends_with((string) parse_url($url, PHP_URL_PATH), '_test')) {
            $this->fail('CLINICA_TEST_PGSQL_URL debe apuntar a una base cuyo nombre termine en _test: se borra en cada prueba.');
        }

        config([
            'database.default' => 'pgsql',
            'database.connections.pgsql.url' => $url,
            'filesystems.disks.ftp.host' => null,
        ]);
        DB::purge('pgsql');

        // Base limpia en cada prueba: se eliminan todos los esquemas del sistema.
        DB::unprepared('DROP SCHEMA IF EXISTS seguridad, clinica, citas, finanzas, catalogo, auditoria, private CASCADE;
                        DROP SCHEMA IF EXISTS public CASCADE; CREATE SCHEMA public;');
        Artisan::call('migrate', ['--force' => true]);

        $this->doctora = User::create([
            'name' => 'Doctora', 'email' => 'doctora@example.test', 'username' => 'doctora',
            'password' => 'password-prueba', 'role' => 'doctora',
        ]);
    }

    private function esquemaDe(string $tabla): ?string
    {
        return DB::selectOne(
            "SELECT n.nspname FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
             WHERE c.relname = ? AND c.relkind IN ('r', 'S')",
            [$tabla]
        )?->nspname;
    }

    public function test_tables_are_organized_by_area(): void
    {
        foreach ([
            'users' => 'seguridad', 'personal_access_tokens' => 'seguridad',
            'pacientes' => 'clinica', 'recetas' => 'clinica', 'codigo_paciente_seq' => 'clinica',
            'agenda' => 'citas', 'actividades' => 'finanzas', 'servicios_consultorio' => 'catalogo',
            'acciones_registradas' => 'auditoria', 'registro_cambios' => 'auditoria', 'migrations' => 'public',
        ] as $tabla => $esquema) {
            $this->assertSame($esquema, $this->esquemaDe($tabla), "La tabla {$tabla} debería estar en {$esquema}.");
        }

        $this->assertNull(DB::selectOne("SELECT 1 FROM pg_namespace WHERE nspname = 'private'"));
    }

    public function test_changes_are_traced_with_user_ip_and_previous_values(): void
    {
        Sanctum::actingAs($this->doctora);
        $paciente = Paciente::create(['codigo_paciente' => '001', 'nombres' => 'Ana', 'cedula' => '1234567890']);

        $this->withServerVariables(['REMOTE_ADDR' => '192.0.2.30'])
            ->putJson("/api/pacientes/{$paciente->id}", ['nombres' => 'Ana María', 'cedula' => '1234567890'])
            ->assertOk();

        $cambio = DB::table('registro_cambios')
            ->where('tabla', 'pacientes')->where('operacion', 'UPDATE')->sole();

        $this->assertSame($this->doctora->id, $cambio->usuario_id);
        $this->assertSame('192.0.2.30', $cambio->ip);
        $this->assertSame('{nombres}', $cambio->campos_modificados);
        $this->assertSame('Ana', json_decode($cambio->datos_anteriores, true)['nombres']);
        $this->assertSame('Ana María', json_decode($cambio->datos_nuevos, true)['nombres']);

        $this->getJson("/api/configuracion/cambios?tabla=pacientes&registro_id={$paciente->id}")
            ->assertOk()
            ->assertJsonPath('cambios.0.usuario', 'Doctora')
            ->assertJsonPath('cambios.0.campos_modificados', ['nombres']);
    }

    public function test_history_never_stores_passwords_and_skips_touch_only_updates(): void
    {
        $this->doctora->update(['password' => 'otra-clave-segura']);
        $this->doctora->touch();

        $cambios = DB::table('registro_cambios')->where('tabla', 'users')->orderBy('id')->get();

        // El cambio de contraseña queda registrado, pero sin su valor; touch() no deja registro.
        $this->assertSame(['INSERT', 'UPDATE'], $cambios->pluck('operacion')->all());
        $this->assertSame('{password}', $cambios[1]->campos_modificados);
        foreach ($cambios as $cambio) {
            $this->assertStringNotContainsString('password', (string) $cambio->datos_nuevos);
            $this->assertStringNotContainsString('password', (string) $cambio->datos_anteriores);
        }
    }

    public function test_history_cannot_be_altered(): void
    {
        $this->expectException(QueryException::class);
        $this->expectExceptionMessage('no se puede modificar ni eliminar');

        DB::table('registro_cambios')->delete();
    }
}
