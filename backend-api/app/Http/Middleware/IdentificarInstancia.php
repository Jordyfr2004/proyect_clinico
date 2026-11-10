<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Context;
use Illuminate\Support\Str;
use Symfony\Component\HttpFoundation\Response;

class IdentificarInstancia
{
    /**
     * Marca cada petición con la instancia del backend que la atendió y un
     * identificador de petición, para seguirla en los logs de NGINX y Laravel.
     */
    public function handle(Request $request, Closure $next): Response
    {
        $instancia = (string) config('app.instancia');

        $requestId = $request->headers->get('X-Request-ID');

        if (! is_string($requestId) || ! preg_match('/^[A-Za-z0-9-]{8,64}$/', $requestId)) {
            $requestId = (string) Str::uuid();
        }

        // Context agrega estos datos a cada línea de log de la petición.
        Context::add([
            'instancia' => $instancia,
            'request_id' => $requestId,
        ]);

        $response = $next($request);

        $response->headers->set('X-Backend-Instance', $instancia);
        $response->headers->set('X-Request-ID', $requestId);

        return $response;
    }
}
