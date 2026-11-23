<?php

namespace App\Listeners;

use Illuminate\Support\Facades\Log;

class AtenderCitaCompletadaAndres
{
    public function handle(array $mensaje): void
    {
        Log::info('enrutamiento_andres.completada', [
            'evento_id' => $mensaje['evento_id'],
            'cita_id' => $mensaje['cita_id'],
        ]);
    }
}
