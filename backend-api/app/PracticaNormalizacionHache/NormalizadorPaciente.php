<?php

namespace App\PracticaNormalizacionHache;

use DateTimeImmutable;
use Illuminate\Support\Carbon;
use Illuminate\Validation\ValidationException;

class NormalizadorPaciente
{
    public function desdeWeb(array $entrada): array
    {
        return $this->normalizar($entrada, [
            'nombres' => 'nombreCompleto',
            'cedula' => 'numeroCedula',
            'telefono' => 'telefono',
            'direccion' => 'direccion',
            'fecha_nacimiento' => 'fechaNacimiento',
        ], 'd/m/Y');
    }

    public function desdeExterno(array $entrada): array
    {
        return $this->normalizar($entrada, [
            'nombres' => 'full_name',
            'cedula' => 'document_number',
            'telefono' => 'phone',
            'direccion' => 'address',
            'fecha_nacimiento' => 'birth_date',
        ], 'Y-m-d');
    }

    private function normalizar(array $entrada, array $campos, string $formatoFecha): array
    {
        $errores = [];
        $salida = [];

        foreach (array_diff(array_keys($entrada), array_values($campos)) as $desconocido) {
            $errores[$desconocido] = ['El campo '.$desconocido.' no pertenece a este origen.'];
        }

        foreach ($campos as $destino => $origen) {
            $valor = $entrada[$origen] ?? null;
            $obligatorio = in_array($destino, ['nombres', 'cedula'], true);

            if ($valor === null || $valor === '') {
                if ($obligatorio) {
                    $errores[$origen] = ['El campo '.$origen.' es obligatorio.'];
                }
                $salida[$destino] = null;
                continue;
            }

            if (!is_string($valor)) {
                $errores[$origen] = ['El campo '.$origen.' debe ser texto.'];
                continue;
            }

            $valor = trim($valor);
            if (in_array($destino, ['nombres', 'direccion'], true)) {
                $valor = preg_replace('/\s+/u', ' ', $valor);
            }

            if ($valor === '') {
                if ($obligatorio) {
                    $errores[$origen] = ['El campo '.$origen.' es obligatorio.'];
                }
                $salida[$destino] = null;
                continue;
            }

            if ($destino === 'fecha_nacimiento') {
                $fecha = DateTimeImmutable::createFromFormat('!'.$formatoFecha, $valor);
                if (!$fecha || $fecha->format($formatoFecha) !== $valor) {
                    $errores[$origen] = ['La fecha debe ser válida y tener formato '.$formatoFecha.'.'];
                    continue;
                }
                if ($fecha->format('Y-m-d') > Carbon::today(config('app.timezone'))->format('Y-m-d')) {
                    $errores[$origen] = ['La fecha de nacimiento no puede ser futura.'];
                    continue;
                }
                $salida[$destino] = $fecha->format('Y-m-d');
                continue;
            }

            $maximo = $destino === 'cedula' || $destino === 'telefono' ? 20 : 255;
            if (mb_strlen($valor) > $maximo) {
                $errores[$origen] = ['El campo '.$origen.' no puede superar '.$maximo.' caracteres.'];
                continue;
            }
            if (in_array($destino, ['cedula', 'telefono'], true) && preg_match('/\s/u', $valor)) {
                $errores[$origen] = ['El campo '.$origen.' no puede contener espacios internos.'];
                continue;
            }
            $salida[$destino] = $valor;
        }

        if ($errores !== []) {
            throw ValidationException::withMessages($errores);
        }

        return $salida;
    }
}
