<?php

namespace Tests\Feature;

use Tests\TestCase;

class PracticaNormalizacionHacheTest extends TestCase
{
    private const ESPERADO = [
        'nombres' => 'Carlos Mendoza',
        'cedula' => '1312345678',
        'telefono' => '0991234567',
        'direccion' => 'Manta',
        'fecha_nacimiento' => '2002-08-15',
    ];

    public function test_p1_formulario_web_produce_el_contrato_comun(): void
    {
        $this->postJson('/api/practica-normalizacion-hache/web', [
            'nombreCompleto' => '  Carlos   Mendoza  ',
            'numeroCedula' => '1312345678',
            'telefono' => '0991234567',
            'direccion' => ' Manta ',
            'fechaNacimiento' => '15/08/2002',
        ])->assertOk()->assertExactJson(self::ESPERADO);
    }

    public function test_p2_servicio_externo_produce_salida_identica_a_p1(): void
    {
        $this->postJson('/api/practica-normalizacion-hache/externo', [
            'full_name' => 'Carlos Mendoza',
            'document_number' => '1312345678',
            'phone' => '0991234567',
            'address' => 'Manta',
            'birth_date' => '2002-08-15',
        ])->assertOk()->assertExactJson(self::ESPERADO);
    }

    public function test_p3_campo_obligatorio_faltante_produce_error_explicito(): void
    {
        $this->postJson('/api/practica-normalizacion-hache/web', [
            'nombreCompleto' => 'Carlos Mendoza',
        ])->assertStatus(422)->assertJsonValidationErrors('numeroCedula');
    }

    public function test_p3_fecha_invalida_produce_error_explicito(): void
    {
        $this->postJson('/api/practica-normalizacion-hache/web', [
            'nombreCompleto' => 'Carlos Mendoza',
            'numeroCedula' => '1312345678',
            'fechaNacimiento' => '31/02/2002',
        ])->assertStatus(422)->assertJsonValidationErrors('fechaNacimiento');
    }

    public function test_rechaza_fecha_futura_y_formato_ambiguo(): void
    {
        foreach (['2999-01-01', '15/08/2002'] as $fecha) {
            $this->postJson('/api/practica-normalizacion-hache/externo', [
                'full_name' => 'Carlos Mendoza',
                'document_number' => '1312345678',
                'birth_date' => $fecha,
            ])->assertStatus(422)->assertJsonValidationErrors('birth_date');
        }
    }

    public function test_rechaza_identificadores_numericos_y_exceso_de_longitud(): void
    {
        $this->postJson('/api/practica-normalizacion-hache/web', [
            'nombreCompleto' => str_repeat('A', 256),
            'numeroCedula' => 1312345678,
            'telefono' => 991234567,
        ])->assertStatus(422)->assertJsonValidationErrors([
            'nombreCompleto', 'numeroCedula', 'telefono',
        ]);
    }

    public function test_campos_opcionales_ausentes_son_null(): void
    {
        $this->postJson('/api/practica-normalizacion-hache/externo', [
            'full_name' => 'Carlos Mendoza',
            'document_number' => '1312345678',
        ])->assertOk()->assertExactJson([
            'nombres' => 'Carlos Mendoza',
            'cedula' => '1312345678',
            'telefono' => null,
            'direccion' => null,
            'fecha_nacimiento' => null,
        ]);
    }

    public function test_rechaza_claves_ajenas_al_origen_para_evitar_ambiguedad(): void
    {
        $this->postJson('/api/practica-normalizacion-hache/web', [
            'nombreCompleto' => 'Carlos Mendoza',
            'numeroCedula' => '1312345678',
            'document_number' => 'OTRO',
        ])->assertStatus(422)->assertJsonValidationErrors('document_number');
    }
}
