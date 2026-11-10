<?php

namespace Tests\Feature;

use Illuminate\Database\QueryException;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;
use Illuminate\Support\Facades\Storage;
use League\Flysystem\UnableToCheckExistence;
use PDOException;
use Tests\TestCase;

class ResilienciaTest extends TestCase
{
    protected function setUp(): void
    {
        parent::setUp();

        // Sin FTP real: cada prueba que lo necesite lo configura o lo simula.
        config(['app.instancia' => 'backend-prueba', 'filesystems.disks.ftp.host' => null]);
    }

    public function test_health_reports_instance_and_services(): void
    {
        config(['filesystems.disks.ftp.host' => null]);

        $this->getJson('/api/health')
            ->assertOk()
            ->assertHeader('X-Backend-Instance', 'backend-prueba')
            ->assertJsonPath('estado', 'ok')
            ->assertJsonPath('instancia', 'backend-prueba')
            ->assertJsonPath('servicios.base_datos.estado', 'ok')
            ->assertJsonPath('servicios.archivos.estado', 'no_configurado');
    }

    public function test_health_is_degraded_when_file_server_is_down(): void
    {
        config(['filesystems.disks.ftp.host' => '192.0.2.50']);
        Storage::shouldReceive('disk->directoryExists')
            ->andThrow(UnableToCheckExistence::forLocation('/'));

        $this->getJson('/api/health')
            ->assertOk()
            ->assertJsonPath('estado', 'degradado')
            ->assertJsonPath('servicios.base_datos.estado', 'ok')
            ->assertJsonPath('servicios.archivos.estado', 'caido');
    }

    public function test_health_fails_when_database_is_down(): void
    {
        config([
            'filesystems.disks.ftp.host' => null,
            'database.connections.sqlite.database' => '/ruta/que/no/existe/clinica.sqlite',
        ]);
        app('db')->purge('sqlite');

        $this->getJson('/api/health')
            ->assertStatus(503)
            ->assertJsonPath('estado', 'error')
            ->assertJsonPath('servicios.base_datos.estado', 'caido')
            ->assertJsonMissingPath('servicios.base_datos.error');
    }

    public function test_request_id_is_propagated_or_generated(): void
    {
        $this->getJson('/api/health', ['X-Request-ID' => 'abc12345-nginx'])
            ->assertHeader('X-Request-ID', 'abc12345-nginx');

        $generado = $this->getJson('/api/health', ['X-Request-ID' => 'no válido!'])
            ->headers->get('X-Request-ID');

        $this->assertMatchesRegularExpression('/^[0-9a-f-]{36}$/', $generado);
    }

    public function test_database_connection_errors_return_controlled_503(): void
    {
        Route::get('/api/_prueba/bd-caida', function () {
            $pdo = new PDOException('SQLSTATE[08006] [7] could not connect to server');
            // pdo_pgsql usa el SQLSTATE como código; el constructor solo acepta enteros.
            (new \ReflectionProperty(PDOException::class, 'code'))->setValue($pdo, '08006');

            throw new QueryException('pgsql', 'select 1', [], $pdo);
        });

        // Así llega realmente cuando PostgreSQL está apagado: código del driver y SQLSTATE en el mensaje.
        Route::get('/api/_prueba/bd-apagada', function () {
            $pdo = new PDOException('SQLSTATE[08006] [7] connection to server at "127.0.0.1", port 5432 failed: Connection refused', 7);

            throw new QueryException('pgsql', 'select * from personal_access_tokens', [], $pdo);
        });

        $this->getJson('/api/_prueba/bd-apagada')->assertStatus(503);

        $this->getJson('/api/_prueba/bd-caida')
            ->assertStatus(503)
            ->assertHeader('Retry-After', '30')
            ->assertJsonPath('message', 'La base de datos no está disponible en este momento. Intenta nuevamente en unos minutos.');
    }

    public function test_file_server_errors_return_controlled_503(): void
    {
        Route::get('/api/_prueba/ftp-caido', function () {
            throw UnableToCheckExistence::forLocation('clinica/foto.png');
        });

        $this->getJson('/api/_prueba/ftp-caido')
            ->assertStatus(503)
            ->assertJsonPath('message', 'El servidor de archivos no está disponible en este momento. Intenta nuevamente en unos minutos.');
    }

    public function test_client_ip_comes_from_trusted_balancer_only(): void
    {
        Route::get('/api/_prueba/ip', fn (Request $request) => ['ip' => $request->ip()]);
        config(['trustedproxy.proxies' => ['192.0.2.10']]);

        $this->withServerVariables(['REMOTE_ADDR' => '192.0.2.10'])
            ->getJson('/api/_prueba/ip', ['X-Forwarded-For' => '198.51.100.7'])
            ->assertJsonPath('ip', '198.51.100.7');

        $this->withServerVariables(['REMOTE_ADDR' => '192.0.2.99'])
            ->getJson('/api/_prueba/ip', ['X-Forwarded-For' => '198.51.100.7'])
            ->assertJsonPath('ip', '192.0.2.99');
    }
}
