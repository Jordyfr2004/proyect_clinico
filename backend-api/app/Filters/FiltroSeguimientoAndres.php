<?php

namespace App\Filters;

use Illuminate\Support\Facades\Log;

/** Regla individual: se excluyen los mensajes genéricos 'creada'. */
class FiltroSeguimientoAndres
{
    public function permite(array $mensaje): bool
    {
        if ($mensaje['tipo'] !== 'creada') {
            return true;
        }

        Log::notice('enrutamiento_andres.filtrado', [
            'evento_id' => $mensaje['evento_id'],
            'tipo' => $mensaje['tipo'],
            'motivo' => 'tipo_creada_excluido',
        ]);

        return false;
    }
}
