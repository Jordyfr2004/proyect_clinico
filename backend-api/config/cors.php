<?php

/*
|--------------------------------------------------------------------------
| CORS
|--------------------------------------------------------------------------
|
| La web oficial (Laptop 2) se sirve desde el mismo balanceador que el API y
| la app móvil no envía Origin, así que ninguna necesita CORS. Solo la copia
| de la web en Vercel llama al API desde otro dominio.
|
| CORS_ALLOWED_ORIGINS: orígenes separados por coma, por ejemplo
| https://clinica.vercel.app. Vacío = cualquiera (la autenticación es por
| token Bearer, no por cookies).
|
*/

$lista = fn (string $variable) => array_values(array_filter(array_map(
    'trim',
    explode(',', (string) env($variable, ''))
)));

return [

    'paths' => ['api/*'],

    'allowed_methods' => ['*'],

    'allowed_origins' => $lista('CORS_ALLOWED_ORIGINS') ?: ['*'],

    // Por ejemplo #^https://clinica-[a-z0-9-]+\.vercel\.app$# para las vistas previas de Vercel.
    'allowed_origins_patterns' => $lista('CORS_ALLOWED_ORIGINS_PATTERNS'),

    'allowed_headers' => ['*'],

    // Para que la web pueda mostrar qué instancia atendió cada petición.
    'exposed_headers' => ['X-Backend-Instance', 'X-Request-ID', 'Retry-After'],

    'max_age' => 3600,

    'supports_credentials' => false,

];
