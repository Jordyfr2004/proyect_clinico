<?php

namespace Tests\Feature;

use App\Models\Paciente;
use App\Models\User;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class ListPacientesTest extends TestCase
{
    protected function setUp(): void
    {
        parent::setUp();

        (require database_path('migrations/2026_09_25_012937_create_pacientes_table.php'))->up();
        foreach ([
            '0001_01_01_000000_create_users_table.php',
            '2026_09_25_163636_add_username_and_role_to_users_table.php',
            '2026_09_25_164339_add_paciente_id_to_users_table.php',
            '2026_10_14_035447_add_profile_photo_fields_to_users_table.php',
        ] as $migration) {
            (require database_path('migrations/'.$migration))->up();
        }
    }

    public function test_staff_can_navigate_twenty_patients_per_page_without_duplicates(): void
    {
        $ids = [];

        for ($numero = 1; $numero <= 25; $numero++) {
            $paciente = new Paciente([
                'codigo_paciente' => (string) $numero,
                'nombres' => 'Paciente '.$numero,
                'cedula' => (string) $numero,
            ]);
            $paciente->id = sprintf('00000000-0000-4000-8000-%012d', $numero);
            $paciente->created_at = $numero <= 5 ? '2026-01-01 10:00:00' : '2026-01-02 10:00:00';
            $paciente->save();
            $ids[] = $paciente->id;
        }

        $expected = array_reverse($ids);

        foreach (['doctora', 'asistente'] as $role) {
            Sanctum::actingAs(new User(['role' => $role]));

            $first = $this->getJson('/api/pacientes')
                ->assertOk()
                ->assertJsonCount(20, 'data')
                ->assertJsonPath('current_page', 1)
                ->assertJsonPath('per_page', 20)
                ->assertJsonPath('total', 25)
                ->assertJsonPath('last_page', 2)
                ->assertJsonPath('prev_page_url', null);

            $second = $this->getJson($first->json('next_page_url'))
                ->assertOk()
                ->assertJsonCount(5, 'data')
                ->assertJsonPath('current_page', 2)
                ->assertJsonPath('next_page_url', null);

            $this->assertSame(array_slice($expected, 0, 20), array_column($first->json('data'), 'id'));
            $this->assertSame(array_slice($expected, 20), array_column($second->json('data'), 'id'));
            $this->assertSame($first->json('first_page_url'), $second->json('prev_page_url'));

            $this->getJson('/api/pacientes?page=3')
                ->assertOk()
                ->assertJsonCount(0, 'data')
                ->assertJsonPath('total', 25);
        }
    }

    public function test_empty_list_keeps_pagination_metadata(): void
    {
        Sanctum::actingAs(new User(['role' => 'doctora']));

        $this->getJson('/api/pacientes')
            ->assertOk()
            ->assertJsonCount(0, 'data')
            ->assertJsonPath('current_page', 1)
            ->assertJsonPath('per_page', 20)
            ->assertJsonPath('total', 0)
            ->assertJsonPath('next_page_url', null);
    }

    public function test_search_finds_older_records_by_each_field_and_treats_wildcards_literally(): void
    {
        $target = Paciente::create(['nombres' => 'Ana 100%_!', 'cedula' => '0912345678', 'codigo_paciente' => 'PAC-001']);
        $target->forceFill(['created_at' => '2020-01-01 00:00:00'])->save();
        for ($i = 1; $i <= 25; $i++) {
            Paciente::create(['nombres' => 'Otro', 'codigo_paciente' => 'OTRO-'.$i, 'cedula' => 'otro'.$i]);
        }
        Sanctum::actingAs(new User(['role' => 'doctora']));

        foreach ([' ana ', '123456', 'pac-001', '%', '_', '!'] as $buscar) {
            $this->getJson('/api/pacientes?'.http_build_query(['buscar' => $buscar]))
                ->assertOk()->assertJsonPath('total', 1)->assertJsonPath('data.0.id', $target->id);
        }

        $this->getJson('/api/pacientes?buscar=0')->assertOk()->assertJsonPath('total', 3);
        $this->getJson('/api/pacientes?'.http_build_query(['buscar' => "' OR 1=1 --"]))
            ->assertOk()->assertJsonCount(0, 'data')->assertJsonPath('total', 0);
        $this->getJson('/api/pacientes?buscar=%20%20')
            ->assertOk()->assertJsonPath('total', 26)->assertJsonCount(20, 'data');
    }

    public function test_search_is_preserved_when_navigating_pages(): void
    {
        for ($i = 1; $i <= 21; $i++) {
            Paciente::create(['nombres' => 'Coincide '.$i, 'codigo_paciente' => 'C'.$i, 'cedula' => 'C'.$i]);
        }
        Paciente::create(['nombres' => 'Sin resultado', 'codigo_paciente' => 'X', 'cedula' => 'X']);
        Sanctum::actingAs(new User(['role' => 'doctora']));

        $first = $this->getJson('/api/pacientes?buscar=coincide')
            ->assertOk()->assertJsonPath('total', 21)->assertJsonCount(20, 'data');
        $this->assertStringContainsString('buscar=coincide', $first->json('next_page_url'));
        $second = $this->getJson($first->json('next_page_url'))
            ->assertOk()->assertJsonPath('total', 21)->assertJsonCount(1, 'data')
            ->assertJsonPath('current_page', 2)->assertJsonPath('next_page_url', null);
        $this->assertNotContains($second->json('data.0.id'), array_column($first->json('data'), 'id'));
    }

    public function test_search_rejects_arrays_and_excessive_length(): void
    {
        Sanctum::actingAs(new User(['role' => 'doctora']));
        foreach ([['ana'], str_repeat('a', 256)] as $buscar) {
            $this->getJson('/api/pacientes?'.http_build_query(['buscar' => $buscar]))
                ->assertUnprocessable()->assertJsonValidationErrors('buscar');
        }
    }

    public function test_guests_and_patients_cannot_list_patients(): void
    {
        $this->getJson('/api/pacientes')->assertUnauthorized();

        Sanctum::actingAs(new User(['role' => 'paciente']));
        $this->getJson('/api/pacientes')->assertForbidden();
    }
}
