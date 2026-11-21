<?php

return [

    /*
    |--------------------------------------------------------------------------
    | Proxies de confianza
    |--------------------------------------------------------------------------
    |
    | IPs del balanceador NGINX (Laptop 1), separadas por coma. Sin esto
    | $request->ip() devuelve la IP del balanceador y los límites de intentos
    | de login se compartirían entre todos los usuarios.
    |
    */

    'proxies' => array_values(array_filter(array_map(
        'trim',
        explode(',', (string) env('TRUSTED_PROXIES', ''))
    ))),

];
