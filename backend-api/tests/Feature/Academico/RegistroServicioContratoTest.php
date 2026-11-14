<?php

namespace Tests\Feature\Academico;

use App\Academic\ServiciosConsultorio\RegistroServicioEntradaDto;
use App\Academic\ServiciosConsultorio\RegistroServicioSalidaDto;
use App\Models\CategoriaServicio;
use App\Models\User;
use Illuminate\Support\Facades\DB;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class RegistroServicioContratoTest extends TestCase
{
    private CategoriaServicio $categoria;

    protected function setUp(): void
    {
        parent::setUp();

        config(['database.default' => 'sqlite', 'database.connections.sqlite.database' => ':memory:']);
        DB::purge('sqlite');

        foreach ([
            '0001_01_01_000000_create_users_table.php',
            '2026_09_25_163636_add_username_and_role_to_users_table.php',
            '2026_10_03_191429_create_accion_registradas_table.php',
            '2026_10_13_191421_create_categorias_servicios_table.php',
            '2026_10_13_191857_create_servicios_consultorio_table.php',
        ] as $migration) {
            (require database_path('migrations/'.$migration))->up();
        }

        $doctora = User::create([
            'name' => 'Doctora de prueba',
            'email' => 'doctora-servicios@example.test',
            'password' => 'clave-de-prueba',
            'role' => 'doctora',
        ]);
        Sanctum::actingAs($doctora);

        $this->categoria = CategoriaServicio::create([
            'nombre' => 'Odontología de prueba',
            'activo' => true,
        ]);
    }

    private function solicitudValida(): array
    {
        $json = json_encode([
            'categoria_id' => $this->categoria->id,
            'nombre' => 'Limpieza dental',
            'descripcion' => 'Profilaxis de prueba',
            'imagen' => 'servicios/limpieza.png',
            'precio' => 35.5,
            'duracion_minutos' => 45,
        ], JSON_THROW_ON_ERROR);

        return RegistroServicioEntradaDto::fromJson($json)->toArray();
    }

    private function mostrarCaso(string $caso, array $solicitud, $respuesta, string $comparacion): void
    {
        echo json_encode([
            'caso' => $caso,
            'solicitud' => $solicitud,
            'estado_http' => $respuesta->status(),
            'respuesta' => $respuesta->json(),
            'comparacion_contrato' => $comparacion,
        ], JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES | JSON_THROW_ON_ERROR).PHP_EOL;
    }

    public function test_p1_registro_valido_devuelve_201_y_contrato_de_salida(): void
    {
        $solicitud = $this->solicitudValida();
        $respuesta = $this->postJson('/api/servicios-consultorio', $solicitud);

        $respuesta->assertCreated()
            ->assertJsonPath('message', 'Servicio creado correctamente.')
            ->assertJsonPath('data.categoria_id', $this->categoria->id)
            ->assertJsonPath('data.nombre', 'Limpieza dental')
            ->assertJsonPath('data.descripcion', 'Profilaxis de prueba')
            ->assertJsonPath('data.imagen', 'servicios/limpieza.png')
            ->assertJsonPath('data.precio', '35.50')
            ->assertJsonPath('data.duracion_minutos', 45)
            ->assertJsonPath('data.activo', true)
            ->assertJsonPath('data.categoria.nombre', 'Odontología de prueba');

        $salida = RegistroServicioSalidaDto::fromJson($respuesta->getContent());
        $this->assertSame($respuesta->json(), $salida->toArray());
        $this->assertSame($respuesta->json('data.id'), $salida->id);
        $this->assertDatabaseCount('servicios_consultorio', 1);
        $this->assertDatabaseCount('acciones_registradas', 1);
        $this->mostrarCaso('P1', $solicitud, $respuesta, '201; data coincide con el DTO de salida; 1 servicio y 1 auditoría');
    }

    public function test_p2_sin_nombre_devuelve_422_y_no_crea_registros(): void
    {
        $solicitud = $this->solicitudValida();
        unset($solicitud['nombre']);
        $respuesta = $this->postJson('/api/servicios-consultorio', $solicitud);

        $respuesta->assertUnprocessable()->assertJsonValidationErrors('nombre');
        $this->assertDatabaseCount('servicios_consultorio', 0);
        $this->assertDatabaseCount('acciones_registradas', 0);
        $this->mostrarCaso('P2', $solicitud, $respuesta, '422; errors.nombre presente; 0 servicios y 0 auditorías');
    }

    public function test_p3_duracion_con_tipo_incorrecto_devuelve_422_y_no_crea_registros(): void
    {
        $solicitud = $this->solicitudValida();
        $solicitud['duracion_minutos'] = ['cuarenta y cinco'];
        $respuesta = $this->postJson('/api/servicios-consultorio', $solicitud);

        $respuesta->assertUnprocessable()->assertJsonValidationErrors('duracion_minutos');
        $this->assertDatabaseCount('servicios_consultorio', 0);
        $this->assertDatabaseCount('acciones_registradas', 0);
        $this->mostrarCaso('P3', $solicitud, $respuesta, '422; errors.duracion_minutos presente; 0 servicios y 0 auditorías');
    }
}
