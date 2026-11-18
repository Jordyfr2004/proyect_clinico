<?php

namespace Tests\Feature;

use App\Models\User;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

/**
 * Tema 2.3 - Pruebas mínimas obligatorias P1, P2 y P3.
 */
class NormalizacionPacienteTest extends TestCase
{
    // Origen A: formulario web
    private array $entradaA = [
        'nombreCompleto' => 'Ana López',
        'numeroCedula' => '0102030405',
        'celular' => '099-123-4567',
        'domicilio' => 'Av. Principal 123',
        'fechaNacimiento' => '15/03/1990',
    ];

    // Origen B: sistema externo (mismo paciente, otra estructura)
    private array $entradaB = [
        'patient' => ['full_name' => 'Ana López', 'id_number' => '0102030405'],
        'contact' => ['phone' => '+593991234567', 'address' => 'Av. Principal 123'],
        'birth_date' => '1990-03-15',
    ];

    private array $contratoEsperado = [
        'nombres' => 'Ana López',
        'cedula' => '0102030405',
        'telefono' => '0991234567',
        'direccion' => 'Av. Principal 123',
        'fecha_nacimiento' => '1990-03-15',
    ];

    protected function setUp(): void
    {
        parent::setUp();
        Sanctum::actingAs(new User(['role' => 'doctora']));
    }

    public function test_p1_entrada_a_valida_genera_contrato_comun(): void
    {
        $this->postJson('/api/integracion/pacientes/web', $this->entradaA)
            ->assertOk()
            ->assertExactJson(['data' => $this->contratoEsperado]);
    }

    public function test_p2_entrada_b_equivalente_genera_el_mismo_contrato(): void
    {
        $salidaA = $this->postJson('/api/integracion/pacientes/web', $this->entradaA)->json('data');
        $salidaB = $this->postJson('/api/integracion/pacientes/externo', $this->entradaB)->json('data');

        $this->assertSame($salidaA, $salidaB);
    }

    public function test_p3_campo_faltante_o_invalido_devuelve_error_explicito(): void
    {
        // Falta el nombre
        $sinNombre = $this->entradaA;
        unset($sinNombre['nombreCompleto']);
        $this->postJson('/api/integracion/pacientes/web', $sinNombre)
            ->assertStatus(422)
            ->assertJson(['message' => 'El nombre del paciente es obligatorio.']);

        // Fecha en formato equivocado (no se convierte en silencio)
        $fechaMala = $this->entradaB;
        $fechaMala['birth_date'] = '15/03/1990';
        $this->postJson('/api/integracion/pacientes/externo', $fechaMala)
            ->assertStatus(422)
            ->assertJson(['message' => 'La fecha de nacimiento debe tener el formato Y-m-d.']);

        // Cédula con letras
        $cedulaMala = $this->entradaA;
        $cedulaMala['numeroCedula'] = '01020A0405';
        $this->postJson('/api/integracion/pacientes/web', $cedulaMala)
            ->assertStatus(422)
            ->assertJson(['message' => 'La cédula debe tener exactamente 10 dígitos.']);
    }
}