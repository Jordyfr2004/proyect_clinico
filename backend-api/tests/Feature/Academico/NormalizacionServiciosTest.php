<?php

namespace Tests\Feature\Academico;

use Tests\TestCase;

class NormalizacionServiciosTest extends TestCase
{
    private const UUID = '123e4567-e89b-42d3-a456-426614174000';

    private function web(): array
    {
        return ['categoriaId' => ' '.self::UUID.' ', 'nombreServicio' => ' Limpieza dental ',
            'detalle' => ' Profilaxis ', 'imagenUrl' => ' servicios/limpieza.png ',
            'precioTexto' => ' 35,50 ', 'duracionMinutos' => ' 45 '];
    }

    private function externo(): array
    {
        return ['category_uuid' => self::UUID, 'service_name' => 'Limpieza dental',
            'description' => 'Profilaxis', 'image_url' => 'servicios/limpieza.png',
            'amount' => '35.50', 'duration_minutes' => 45];
    }

    public function test_p1_formulario_web_se_normaliza(): void
    {
        $this->postJson('/api/practica-normalizacion-servicios/formulario-web', $this->web())
            ->assertOk()->assertExactJson(['categoria_id' => self::UUID, 'nombre' => 'Limpieza dental',
                'descripcion' => 'Profilaxis', 'imagen' => 'servicios/limpieza.png',
                'precio' => 35.5, 'duracion_minutos' => 45]);
    }

    public function test_p2_servicio_externo_es_identico(): void
    {
        $web = $this->postJson('/api/practica-normalizacion-servicios/formulario-web', $this->web());
        $externo = $this->postJson('/api/practica-normalizacion-servicios/servicio-externo', $this->externo());
        $externo->assertOk();
        $this->assertSame($web->json(), $externo->json());
    }

    public function test_p3_entrada_invalida_devuelve_errores_por_campo(): void
    {
        $this->postJson('/api/practica-normalizacion-servicios/formulario-web', ['categoriaId' => 'no-uuid', 'nombreServicio' => ' ', 'detalle' => ' '])
            ->assertUnprocessable()->assertJsonValidationErrors(['categoria_id', 'nombre', 'descripcion']);
    }

    public function test_tipos_incorrectos_y_campos_desconocidos(): void
    {
        $datos = $this->externo();
        $datos['service_name'] = ['nombre'];
        $datos['image_url'] = 15;
        $datos['extra'] = true;
        $this->postJson('/api/practica-normalizacion-servicios/servicio-externo', $datos)
            ->assertUnprocessable()->assertJsonValidationErrors(['nombre', 'imagen', 'extra']);
    }

    public function test_precio_negativo_y_duracion_invalida(): void
    {
        $datos = $this->web();
        $datos['precioTexto'] = '-1,50';
        $datos['duracionMinutos'] = '1.5';
        $this->postJson('/api/practica-normalizacion-servicios/formulario-web', $datos)
            ->assertUnprocessable()->assertJsonValidationErrors(['precio', 'duracion_minutos']);
    }

    public function test_opcionales_ausentes_o_vacios_son_null(): void
    {
        $datos = $this->web();
        unset($datos['imagenUrl'], $datos['precioTexto'], $datos['duracionMinutos']);
        $this->postJson('/api/practica-normalizacion-servicios/formulario-web', $datos)
            ->assertOk()->assertJsonPath('imagen', null)->assertJsonPath('precio', null)
            ->assertJsonPath('duracion_minutos', null);
        $datos = $this->externo();
        $datos['image_url'] = '  ';
        $datos['amount'] = '';
        $datos['duration_minutes'] = null;
        $this->postJson('/api/practica-normalizacion-servicios/servicio-externo', $datos)
            ->assertOk()->assertJsonPath('imagen', null)->assertJsonPath('precio', null)
            ->assertJsonPath('duracion_minutos', null);
    }
}
