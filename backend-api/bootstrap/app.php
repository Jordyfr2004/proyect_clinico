<?php

use App\Http\Middleware\ContextoAuditoria;
use App\Http\Middleware\IdentificarInstancia;
use App\Http\Middleware\RoleMiddleware;
use Illuminate\Auth\Middleware\Authenticate;
use Illuminate\Database\QueryException;
use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Exceptions;
use Illuminate\Foundation\Configuration\Middleware;
use Illuminate\Http\Request;
use League\Flysystem\FilesystemException;

return Application::configure(basePath: dirname(__DIR__))
    ->withRouting(
        web: __DIR__.'/../routes/web.php',
        api: __DIR__.'/../routes/api.php',
        commands: __DIR__.'/../routes/console.php',
        health: '/up',
    )
    ->withMiddleware(function (Middleware $middleware): void {
        $middleware->alias([
            'role' => RoleMiddleware::class,
        ]);

        // Los proxies de confianza se leen de config/trustedproxy.php (TRUSTED_PROXIES).
        $middleware->prepend(IdentificarInstancia::class);

        // Trazabilidad en PostgreSQL: necesita al usuario ya autenticado.
        $middleware->appendToGroup('api', ContextoAuditoria::class);
        $middleware->appendToPriorityList(Authenticate::class, ContextoAuditoria::class);
    })
    ->withExceptions(function (Exceptions $exceptions): void {
        // Respuestas controladas cuando cae un servicio externo, en lugar de un 500 genérico.
        $exceptions->render(function (QueryException $e, Request $request) {
            // SQLSTATE clase 08: errores de conexión con la base de datos. Al fallar la
            // conexión, PDO usa el código del driver (p. ej. 7) y el SQLSTATE solo está en el mensaje.
            $conexion = str_starts_with((string) $e->getCode(), '08')
                || preg_match('/SQLSTATE\[08/', $e->getMessage()) === 1;

            if (! $conexion || ! $request->is('api/*')) {
                return null;
            }

            return response()->json([
                'message' => 'La base de datos no está disponible en este momento. Intenta nuevamente en unos minutos.',
            ], 503, ['Retry-After' => '30']);
        });

        $exceptions->render(function (FilesystemException $e, Request $request) {
            if (! $request->is('api/*')) {
                return null;
            }

            return response()->json([
                'message' => 'El servidor de archivos no está disponible en este momento. Intenta nuevamente en unos minutos.',
            ], 503, ['Retry-After' => '30']);
        });
    })
    ->create();
