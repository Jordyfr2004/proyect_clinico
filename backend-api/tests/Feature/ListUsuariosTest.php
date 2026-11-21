<?php

namespace Tests\Feature;

use App\Models\User;
use App\Models\Paciente;
use Illuminate\Support\Facades\Storage;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class ListUsuariosTest extends TestCase
{
    protected function setUp(): void
    {
        parent::setUp();

        foreach ([
            '0001_01_01_000000_create_users_table.php',
            '2026_09_25_012937_create_pacientes_table.php',
            '2026_09_25_163636_add_username_and_role_to_users_table.php',
            '2026_09_25_164339_add_paciente_id_to_users_table.php',
            '2026_09_30_034413_add_activo_to_users_table.php',
            '2026_10_14_035447_add_profile_photo_fields_to_users_table.php',
        ] as $migration) {
            (require database_path('migrations/'.$migration))->up();
        }
    }

    public function test_doctora_can_navigate_twenty_users_per_page_without_duplicates(): void
    {
        $ids = [];

        for ($numero = 1; $numero <= 25; $numero++) {
            $user = User::factory()->create([
                'id' => sprintf('00000000-0000-4000-8000-%012d', $numero),
                'username' => 'usuario'.$numero,
                'role' => $numero <= 5 ? 'asistente' : 'paciente',
                'activo' => $numero % 2 === 0,
                'created_at' => $numero <= 5 ? '2026-01-01 10:00:00' : '2026-01-02 10:00:00',
            ]);
            $ids[] = $user->id;
        }

        Sanctum::actingAs(new User(['role' => 'doctora']));

        $first = $this->getJson('/api/usuarios')
            ->assertOk()
            ->assertJsonCount(20, 'data')
            ->assertJsonPath('current_page', 1)
            ->assertJsonPath('per_page', 20)
            ->assertJsonPath('total', 25)
            ->assertJsonPath('last_page', 2)
            ->assertJsonPath('prev_page_url', null)
            ->assertJsonPath('data.0.username', 'usuario25')
            ->assertJsonPath('data.0.activo', false)
            ->assertJsonStructure(['data' => ['*' => [
                'id', 'name', 'email', 'username', 'role', 'paciente_id', 'activo', 'created_at',
            ]]]);

        $second = $this->getJson($first->json('next_page_url'))
            ->assertOk()
            ->assertJsonCount(5, 'data')
            ->assertJsonPath('current_page', 2)
            ->assertJsonPath('next_page_url', null);

        $expected = array_reverse($ids);
        $this->assertSame(array_slice($expected, 0, 20), array_column($first->json('data'), 'id'));
        $this->assertSame(array_slice($expected, 20), array_column($second->json('data'), 'id'));
        $this->assertSame($first->json('first_page_url'), $second->json('prev_page_url'));

        foreach (array_merge($first->json('data'), $second->json('data')) as $user) {
            $this->assertArrayNotHasKey('password', $user);
            $this->assertArrayNotHasKey('remember_token', $user);
        }

        $this->getJson('/api/usuarios?page=3')
            ->assertOk()
            ->assertJsonCount(0, 'data')
            ->assertJsonPath('total', 25);
    }

    public function test_profile_photos_are_served_only_to_the_owner_and_patient_staff(): void
    {
        Storage::fake('ftp');
        $paciente = Paciente::create([
            'codigo_paciente' => '001', 'nombres' => 'Ana', 'cedula' => '1234567890',
        ]);
        $owner = User::factory()->create([
            'role' => 'paciente', 'paciente_id' => $paciente->id,
            'foto_perfil_ruta' => 'perfil/ana.png', 'foto_perfil_mime' => 'image/png',
        ]);
        $image = base64_decode('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aX1sAAAAASUVORK5CYII=');
        Storage::disk('ftp')->put($owner->foto_perfil_ruta, $image);
        $url = $owner->foto_perfil_url;

        $this->getJson($url)->assertUnauthorized();
        Sanctum::actingAs($owner);
        $this->getJson('/api/user')->assertJsonPath('foto_perfil_url', $url);
        $this->get($url)->assertOk()->assertHeader('Content-Type', 'image/png')
            ->assertStreamedContent($image);

        foreach (['doctora', 'asistente'] as $role) {
            $staff = User::factory()->create(['role' => $role]);
            Sanctum::actingAs($staff);
            $this->get($url)->assertOk()->assertStreamedContent($image);
            $this->getJson('/api/pacientes')->assertOk()->assertJsonPath('data.0.foto_perfil_url', $url);
            $this->getJson('/api/pacientes/'.$paciente->id)->assertOk()->assertJsonPath('data.foto_perfil_url', $url);
            $staff->update(['foto_perfil_ruta' => $owner->foto_perfil_ruta, 'foto_perfil_mime' => 'image/png']);
            $this->get($staff->foto_perfil_url)->assertOk()->assertStreamedContent($image);
            Sanctum::actingAs($owner);
            $this->getJson($staff->foto_perfil_url)->assertForbidden();
        }

        Sanctum::actingAs(User::factory()->create(['role' => 'paciente']));
        $this->getJson($url)->assertForbidden();
        Sanctum::actingAs($staff);
        $otherStaff = User::factory()->create(['role' => 'doctora', 'foto_perfil_ruta' => 'perfil/otra.png']);
        $this->getJson($otherStaff->foto_perfil_url)->assertForbidden();
        $owner->update(['paciente_id' => null]);
        $this->getJson($url)->assertForbidden();

        Sanctum::actingAs($owner);
        Storage::disk('ftp')->delete($owner->foto_perfil_ruta);
        $this->getJson($url)->assertNotFound();
        $owner->update(['foto_perfil_ruta' => null]);
        $this->assertNull($owner->foto_perfil_url);
        $this->getJson($url)->assertNotFound();
    }

    public function test_empty_list_keeps_pagination_metadata(): void
    {
        Sanctum::actingAs(new User(['role' => 'doctora']));

        $this->getJson('/api/usuarios')
            ->assertOk()
            ->assertJsonCount(0, 'data')
            ->assertJsonPath('current_page', 1)
            ->assertJsonPath('per_page', 20)
            ->assertJsonPath('total', 0)
            ->assertJsonPath('next_page_url', null);
    }

    public function test_search_finds_older_records_by_each_field_and_treats_wildcards_literally(): void
    {
        $target = User::factory()->create(['name' => 'Ana 100%_!', 'username' => 'cuenta-001', 'email' => 'ana@example.test']);
        $target->forceFill(['created_at' => '2020-01-01 00:00:00'])->save();
        for ($i = 1; $i <= 25; $i++) {
            User::factory()->create(['name' => 'Otro', 'username' => 'otro'.$i, 'email' => 'otro'.$i.'@other.test']);
        }
        Sanctum::actingAs(new User(['role' => 'doctora']));

        foreach ([' ana ', 'CUENTA-001', 'EXAMPLE.TEST', '%', '_', '!'] as $buscar) {
            $this->getJson('/api/usuarios?'.http_build_query(['buscar' => $buscar]))
                ->assertOk()->assertJsonPath('total', 1)->assertJsonPath('data.0.id', $target->id);
        }

        $this->getJson('/api/usuarios?buscar=0')->assertOk()->assertJsonPath('total', 3);
        $this->getJson('/api/usuarios?'.http_build_query(['buscar' => "' OR 1=1 --"]))
            ->assertOk()->assertJsonCount(0, 'data')->assertJsonPath('total', 0);
        $this->getJson('/api/usuarios?buscar=%20%20')
            ->assertOk()->assertJsonPath('total', 26)->assertJsonCount(20, 'data');
    }

    public function test_search_is_preserved_when_navigating_pages(): void
    {
        for ($i = 1; $i <= 21; $i++) {
            User::factory()->create(['name' => 'Coincide '.$i]);
        }
        User::factory()->create(['name' => 'Sin resultado', 'email' => 'none@example.test']);
        Sanctum::actingAs(new User(['role' => 'doctora']));

        $first = $this->getJson('/api/usuarios?buscar=coincide')
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
            $this->getJson('/api/usuarios?'.http_build_query(['buscar' => $buscar]))
                ->assertUnprocessable()->assertJsonValidationErrors('buscar');
        }
    }

    public function test_guests_and_other_roles_cannot_list_users(): void
    {
        $this->getJson('/api/usuarios')->assertUnauthorized();

        foreach (['asistente', 'paciente'] as $role) {
            Sanctum::actingAs(new User(['role' => $role]));
            $this->getJson('/api/usuarios')->assertForbidden();
        }
    }
}
