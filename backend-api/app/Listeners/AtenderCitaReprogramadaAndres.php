<?php

namespace App\Listeners;

use Illuminate\Support\Facades\Log;

class AtenderCitaReprogramadaAndres
{
    public function handle(array $mensaje): void
    {
        Log::info('enrutamiento_andres.reprogramada', [
            'evento_id' => $mensaje['evento_id'],
            'cita_id' => $mensaje['cita_id'],
        ]);
    }
}
