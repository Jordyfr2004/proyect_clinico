<?php

namespace App\Providers;

use Brevo\Brevo;
use GuzzleHttp\Client;
use Illuminate\Cache\RateLimiting\Limit;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\ServiceProvider;
use Illuminate\Support\Str;

class AppServiceProvider extends ServiceProvider
{
    /**
     * Register any application services.
     */
    public function register(): void
    {
        // Laravel no pasa statement_timeout al DSN de PostgreSQL; libpq lo lee de PGOPTIONS.
        // Así una consulta colgada no bloquea la instancia (el de conexión va en config/database.php).
        $pgsql = config('database.connections.pgsql');
        putenv('PGOPTIONS=-c statement_timeout='.max(1, (int) ($pgsql['statement_timeout'] ?? 15)).'s');

        $this->app->singleton(Brevo::class, fn () => new Brevo(
            apiKey: (string) config('services.brevo.api_key'),
            options: [
                'client' => new Client([
                    'connect_timeout' => 5,
                    'timeout' => 15,
                    'allow_redirects' => false,
                    'http_errors' => false,
                ]),
                // Retrying a send after a timeout can deliver duplicate codes.
                'maxRetries' => 0,
                'timeout' => 15,
            ],
        ));
    }

    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
        RateLimiter::for('password-forgot', function (Request $request): array {
            $email = $request->input('email');
            $key = hash('sha256', is_string($email) ? Str::lower(trim($email)) : '');

            return [
                Limit::perMinute(10)->by('forgot-ip:'.$request->ip()),
                Limit::perMinute(1)->by('forgot-minute:'.$key),
                Limit::perHour(5)->by('forgot-hour:'.$key),
            ];
        });

        RateLimiter::for('password-reset', function (Request $request): array {
            $email = $request->input('email');
            $key = hash('sha256', is_string($email) ? Str::lower(trim($email)) : '');

            return [
                Limit::perMinute(20)->by('reset-ip:'.$request->ip()),
                Limit::perMinute(5)->by('reset-email:'.$key),
            ];
        });

        RateLimiter::for('auth-login', function (Request $request): array {
            $username = $request->input('username');
            $username = is_string($username) ? Str::lower(trim($username)) : '';

            return [
                Limit::perMinute(30)->by('ip:'.$request->ip()),
                Limit::perMinute(5)->by('user:'.hash('sha256', $username).'|'.$request->ip()),
            ];
        });

        RateLimiter::for('auth-register', function (Request $request): Limit {
            return Limit::perHour(3)->by($request->ip());
        });
    }
}
