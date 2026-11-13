<?php

namespace Tests\Feature;

use App\Models\PasswordResetCode;
use App\Models\User;
use App\Services\PasswordService;
use Brevo\Brevo;
use GuzzleHttp\Client;
use GuzzleHttp\Exception\ConnectException;
use GuzzleHttp\Handler\MockHandler;
use GuzzleHttp\HandlerStack;
use GuzzleHttp\Middleware;
use GuzzleHttp\Psr7\Request;
use GuzzleHttp\Psr7\Response;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Log;
use PHPUnit\Framework\Attributes\DataProvider;
use Tests\TestCase;

class PasswordRecoveryTest extends TestCase
{
    private User $user;

    private MockHandler $responses;

    private array $requests = [];

    protected function setUp(): void
    {
        parent::setUp();
        config([
            'services.brevo.api_key' => 'test-api-key',
            'mail.from.address' => 'clinic@example.test',
            'mail.from.name' => 'Clínica de prueba',
        ]);
        $this->responses = new MockHandler(array_map(
            fn () => new Response(201, [], '{"messageId":"test-message"}'), range(1, 20)
        ));
        $handler = HandlerStack::create($this->responses);
        $handler->push(Middleware::history($this->requests));
        $this->app->instance(Brevo::class, new Brevo(apiKey: 'test-api-key', options: [
            'client' => new Client(['handler' => $handler, 'http_errors' => false, 'allow_redirects' => false]),
            'maxRetries' => 0, 'timeout' => 15,
        ]));
        foreach ([
            '0001_01_01_000000_create_users_table.php',
            '2026_09_19_182046_create_personal_access_tokens_table.php',
            '2026_09_30_034413_add_activo_to_users_table.php',
            '2026_10_13_230949_create_password_reset_codes_table.php',
            '2026_10_14_000002_add_attempts_to_password_reset_codes_table.php',
        ] as $migration) {
            (require database_path('migrations/'.$migration))->up();
        }
        $this->user = User::create([
            'name' => 'Paciente', 'email' => 'patient@example.test',
            'password' => 'Original123!', 'activo' => true,
        ]);
    }

    private function issue(): string
    {
        $this->postJson('/api/auth/forgot-password', ['email' => $this->user->email])->assertOk();
        $request = $this->requests[array_key_last($this->requests)]['request'];
        $this->assertSame('POST', $request->getMethod());
        $this->assertSame('https://api.brevo.com/v3/smtp/email', (string) $request->getUri());
        $this->assertSame('test-api-key', $request->getHeaderLine('api-key'));
        $message = json_decode((string) $request->getBody(), true, flags: JSON_THROW_ON_ERROR);
        $this->assertSame($this->user->email, $message['to'][0]['email']);
        $this->assertSame('clinic@example.test', $message['sender']['email']);
        $this->assertSame('Clínica de prueba', $message['sender']['name']);
        preg_match('/\b[0-9]{6}\b/', $message['textContent'], $matches);
        $this->assertStringContainsString($matches[0], $message['htmlContent']);
        $this->assertStringContainsString('Clínica de prueba', $message['htmlContent']);

        return $matches[0];
    }

    private function payload(string $code): array
    {
        return [
            'email' => $this->user->email, 'code' => $code,
            'password' => 'NewPassword123!', 'password_confirmation' => 'NewPassword123!',
        ];
    }

    public function test_success_hashes_password_revokes_tokens_and_prevents_reuse(): void
    {
        $this->user->createToken('existing');
        $code = $this->issue();
        $this->assertTrue(Hash::check($code, PasswordResetCode::first()->code_hash));
        $this->postJson('/api/auth/reset-password', $this->payload($code))->assertOk();
        $this->assertTrue(Hash::check('NewPassword123!', $this->user->fresh()->password));
        $this->assertSame(0, $this->user->tokens()->count());
        $this->assertNotNull(PasswordResetCode::first()->used_at);
        $this->postJson('/api/auth/reset-password', $this->payload($code))->assertUnprocessable();
    }

    public function test_five_incorrect_attempts_permanently_exhaust_the_code(): void
    {
        $code = $this->issue();
        for ($i = 0; $i < 5; $i++) {
            $this->postJson('/api/auth/reset-password', $this->payload('000000'))->assertUnprocessable();
        }
        $this->assertSame(5, PasswordResetCode::first()->attempts);
        $this->postJson('/api/auth/reset-password', $this->payload($code))->assertStatus(429);
        $this->travel(61)->seconds();
        $this->postJson('/api/auth/reset-password', $this->payload($code))->assertUnprocessable();
        $this->assertTrue(Hash::check('Original123!', $this->user->fresh()->password));
    }

    public function test_code_expires_at_five_minutes(): void
    {
        $code = $this->issue();
        $this->travelTo(PasswordResetCode::first()->expires_at);
        $this->postJson('/api/auth/reset-password', $this->payload($code))->assertUnprocessable();
    }

    public function test_unknown_and_inactive_accounts_receive_the_same_response(): void
    {
        $active = $this->postJson('/api/auth/forgot-password', ['email' => $this->user->email])->assertOk()->json();
        $missing = $this->postJson('/api/auth/forgot-password', ['email' => 'missing@example.test'])->assertOk()->json();
        $this->user->update(['activo' => false]);
        $this->travel(61)->seconds();
        $inactive = $this->postJson('/api/auth/forgot-password', ['email' => $this->user->email])->assertOk()->json();
        $this->assertSame($active, $missing);
        $this->assertSame($active, $inactive);
        $this->assertCount(1, $this->requests);
    }

    public function test_resend_cooldown_applies_across_ips_and_case_variants(): void
    {
        $this->issue();
        $this->withServerVariables(['REMOTE_ADDR' => '192.0.2.3'])
            ->postJson('/api/auth/forgot-password', ['email' => strtoupper($this->user->email)])
            ->assertStatus(429)->assertHeader('Retry-After');
        $this->assertSame(1, PasswordResetCode::count());
    }

    public function test_hourly_limit_and_resend_replacement(): void
    {
        $this->issue();
        $firstId = PasswordResetCode::first()->id;
        for ($i = 0; $i < 4; $i++) {
            $this->travel(61)->seconds();
            $this->issue();
        }
        $this->assertSame(1, PasswordResetCode::count());
        $this->assertNotSame($firstId, PasswordResetCode::first()->id);
        $this->travel(61)->seconds();
        $this->postJson('/api/auth/forgot-password', ['email' => $this->user->email])->assertStatus(429);
    }

    public function test_api_failure_preserves_previous_code_and_hides_provider_details(): void
    {
        $code = $this->issue();
        $id = PasswordResetCode::first()->id;
        $this->travel(61)->seconds();
        $this->responses->reset();
        $this->responses->append(new Response(401, [], '{"message":"sensitive provider details"}'));
        Log::shouldReceive('error')->once()->with('password_reset_mail_failed', [
            'provider' => 'brevo_api', 'http_status' => 401, 'reason' => 'invalid_api_key',
        ]);
        $this->postJson('/api/auth/forgot-password', ['email' => $this->user->email])
            ->assertStatus(503)->assertDontSee('sensitive provider details');
        $this->assertSame($id, PasswordResetCode::first()->id);
        $this->postJson('/api/auth/reset-password', $this->payload($code))->assertOk();
    }

    public function test_missing_api_key_returns_service_unavailable_even_for_unknown_email(): void
    {
        $this->app->instance('env', 'production');
        config(['services.brevo.api_key' => '']);
        $this->postJson('/api/auth/forgot-password', ['email' => 'missing@example.test'])->assertStatus(503);
        $this->assertSame(0, PasswordResetCode::count());
        $this->assertCount(0, $this->requests);
    }

    public function test_validation_requires_digits_and_matching_password_confirmation(): void
    {
        $this->postJson('/api/auth/reset-password', $this->payload('abcdef'))
            ->assertUnprocessable()->assertJsonValidationErrors('code');
        $this->postJson('/api/auth/reset-password', array_replace($this->payload('123456'), [
            'password_confirmation' => 'different',
        ]))->assertUnprocessable()->assertJsonValidationErrors('password');
    }

    public function test_deactivated_account_cannot_redeem_an_existing_code(): void
    {
        $code = $this->issue();
        $this->user->update(['activo' => false]);
        $this->postJson('/api/auth/reset-password', $this->payload($code))->assertUnprocessable();
    }

    public function test_multibyte_password_cannot_exceed_bcrypt_byte_limit(): void
    {
        $password = str_repeat('ñ', 40);
        $this->postJson('/api/auth/reset-password', array_replace($this->payload('123456'), [
            'password' => $password, 'password_confirmation' => $password,
        ]))->assertUnprocessable()->assertJsonValidationErrors('password');
    }

    public function test_ip_limit_blocks_requests_for_many_different_addresses(): void
    {
        for ($i = 0; $i < 10; $i++) {
            $this->postJson('/api/auth/forgot-password', ['email' => "missing$i@example.test"])->assertOk();
        }
        $this->postJson('/api/auth/forgot-password', ['email' => 'another@example.test'])
            ->assertStatus(429)->assertHeader('Retry-After');
    }

    public function test_service_cooldown_preserves_code_without_relying_on_cache(): void
    {
        $this->issue();
        $id = PasswordResetCode::first()->id;
        app(PasswordService::class)->enviarCodigoRecuperacion($this->user->email);
        $this->assertSame($id, PasswordResetCode::first()->id);
        $this->assertCount(1, $this->requests);
    }

    public function test_reset_is_atomic_when_token_revocation_fails(): void
    {
        $code = $this->issue();
        DB::statement('DROP TABLE personal_access_tokens');
        $this->postJson('/api/auth/reset-password', $this->payload($code))->assertStatus(500);
        $this->assertNull(PasswordResetCode::first()->used_at);
        $this->assertTrue(Hash::check('Original123!', $this->user->fresh()->password));
    }

    public static function failedResponses(): array
    {
        return [
            [400, '{"message":"private data"}', 'invalid_request_or_sender'],
            [403, '{}', 'account_or_ip_not_authorized'],
            [429, '{}', 'provider_rate_limit'],
            [500, '{}', 'provider_error'],
            [201, '{}', 'connection_or_invalid_response'],
            [201, 'invalid json', 'connection_or_invalid_response'],
            [204, '', 'connection_or_invalid_response'],
        ];
    }

    #[DataProvider('failedResponses')]
    public function test_failed_delivery_does_not_create_a_code_or_retry(int $status, string $body, string $reason): void
    {
        $this->responses->reset();
        $this->responses->append(new Response($status, [], $body));
        Log::shouldReceive('error')->once()->with('password_reset_mail_failed', [
            'provider' => 'brevo_api', 'http_status' => $status >= 400 ? $status : null, 'reason' => $reason,
        ]);
        $this->postJson('/api/auth/forgot-password', ['email' => $this->user->email])
            ->assertStatus(503)->assertDontSee('private data')->assertDontSee('test-api-key');
        $this->assertSame(0, PasswordResetCode::count());
        $this->assertCount(1, $this->requests);
    }

    public function test_network_failure_is_handled_without_exposing_credentials(): void
    {
        $this->responses->reset();
        $this->responses->append(new ConnectException('private connection details', new Request('POST', 'https://api.brevo.com/v3/smtp/email')));
        $this->postJson('/api/auth/forgot-password', ['email' => $this->user->email])
            ->assertStatus(503)->assertDontSee('private connection details');
        $this->assertSame(0, PasswordResetCode::count());
        $this->assertCount(1, $this->requests);
    }

    public function test_api_delivery_works_in_production_even_when_mailer_is_log(): void
    {
        $this->app->instance('env', 'production');
        config(['mail.default' => 'log']);
        $this->issue();
        $this->assertCount(1, $this->requests);
    }
}
