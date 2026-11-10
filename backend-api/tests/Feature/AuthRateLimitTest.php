<?php

namespace Tests\Feature;

use Tests\TestCase;

class AuthRateLimitTest extends TestCase
{
    protected function setUp(): void
    {
        parent::setUp();

        foreach ([
            '0001_01_01_000000_create_users_table.php',
            '2026_09_25_163636_add_username_and_role_to_users_table.php',
        ] as $migration) {
            (require database_path('migrations/'.$migration))->up();
        }
    }

    public function test_login_is_limited_per_user_and_recovers_after_a_minute(): void
    {
        $credentials = ['username' => 'usuario', 'password' => 'incorrecta'];

        for ($attempt = 0; $attempt < 5; $attempt++) {
            $this->postJson('/api/auth/login', $credentials)->assertUnprocessable();
        }

        $blocked = $this->postJson('/api/auth/login', $credentials)
            ->assertStatus(429)
            ->assertHeader('Retry-After')
            ->assertJsonStructure(['message']);
        $this->assertGreaterThan(0, (int) $blocked->headers->get('Retry-After'));

        $this->postJson('/api/auth/login', [
            'username' => 'USUARIO', 'password' => 'incorrecta',
        ])->assertStatus(429);

        $this->postJson('/api/auth/login', [
            'username' => 'otro', 'password' => 'incorrecta',
        ])->assertUnprocessable();

        $this->travel(61)->seconds();
        $this->postJson('/api/auth/login', $credentials)->assertUnprocessable();
    }

    public function test_ip_limit_blocks_attempts_against_many_users(): void
    {
        for ($attempt = 0; $attempt < 30; $attempt++) {
            $this->postJson('/api/auth/login', [
                'username' => 'usuario'.$attempt, 'password' => 'incorrecta',
            ])->assertUnprocessable();
        }

        $this->postJson('/api/auth/login', [
            'username' => 'nuevo', 'password' => 'incorrecta',
        ])->assertStatus(429)->assertHeader('Retry-After');

        $this->withServerVariables(['REMOTE_ADDR' => '192.0.2.2'])
            ->postJson('/api/auth/login', [
                'username' => 'nuevo', 'password' => 'incorrecta',
            ])->assertUnprocessable();
    }

    public function test_registration_is_limited_by_ip_and_recovers_after_an_hour(): void
    {
        for ($attempt = 0; $attempt < 3; $attempt++) {
            $this->postJson('/api/auth/register-paciente', [])->assertUnprocessable();
        }

        $this->postJson('/api/auth/register-paciente', [])
            ->assertStatus(429)
            ->assertHeader('Retry-After')
            ->assertJsonStructure(['message']);

        $this->postJson('/api/auth/login', [
            'username' => 'usuario', 'password' => 'incorrecta',
        ])->assertUnprocessable();

        $this->withServerVariables(['REMOTE_ADDR' => '192.0.2.2'])
            ->postJson('/api/auth/register-paciente', [])->assertUnprocessable();

        $this->travel(3601)->seconds();
        $this->withServerVariables(['REMOTE_ADDR' => '127.0.0.1'])
            ->postJson('/api/auth/register-paciente', [])->assertUnprocessable();
    }

    public function test_invalid_username_types_return_validation_errors(): void
    {
        $this->postJson('/api/auth/login', [
            'username' => ['usuario'], 'password' => 'incorrecta',
        ])->assertUnprocessable()->assertJsonValidationErrors('username');
    }
}
