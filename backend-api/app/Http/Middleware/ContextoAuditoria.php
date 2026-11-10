<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Context;
use Illuminate\Support\Facades\DB;
use Symfony\Component\HttpFoundation\Response;

class ContextoAuditoria
{
    /**
     * Informa a PostgreSQL quién hace la petición, para que los triggers de
     * auditoria.registro_cambios registren al usuario, su IP y la instancia.
     * Se ejecuta después de la autenticación (ver bootstrap/app.php).
     */
    public function handle(Request $request, Closure $next): Response
    {
        $user = $request->user();

        if ($user && DB::getDriverName() === 'pgsql') {
            // false = vale para toda la conexión, que dura lo que dura la petición.
            DB::select(
                "SELECT set_config('clinica.usuario_id', ?, false),
                        set_config('clinica.ip', ?, false),
                        set_config('clinica.request_id', ?, false),
                        set_config('clinica.instancia', ?, false)",
                [
                    (string) $user->getAuthIdentifier(),
                    (string) $request->ip(),
                    (string) Context::get('request_id', ''),
                    (string) config('app.instancia'),
                ]
            );
        }

        return $next($request);
    }
}
