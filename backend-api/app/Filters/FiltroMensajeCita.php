<?php

namespace App\Filters;

use Illuminate\Support\Facades\Log;

class FiltroMensajeCita
{
    /** Solo las actualizaciones genéricas carecen de destino en esta práctica. */
    public function permite(array $mensaje): bool
    {
        if ($mensaje['tipo'] !== 'actualizada') {
            return true;
        }

        Log::notice('enrutamiento_cita.filtrado', [
            'evento_id' => $mensaje['evento_id'],
            'tipo' => $mensaje['tipo'],
            'motivo' => 'tipo_actualizada',
        ]);

        return false;
    }
}
