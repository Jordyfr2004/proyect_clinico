<?php

namespace App\Academic\NormalizacionServicios;

use App\Academic\ServiciosConsultorio\RegistroServicioEntradaDto;
use Illuminate\Support\Facades\Validator;
use Illuminate\Validation\ValidationException;

final class TraductorServicio
{
    private const WEB = [
        'categoriaId' => 'categoria_id', 'nombreServicio' => 'nombre',
        'detalle' => 'descripcion', 'imagenUrl' => 'imagen',
        'precioTexto' => 'precio', 'duracionMinutos' => 'duracion_minutos',
    ];

    private const EXTERNO = [
        'category_uuid' => 'categoria_id', 'service_name' => 'nombre',
        'description' => 'descripcion', 'image_url' => 'imagen',
        'amount' => 'precio', 'duration_minutes' => 'duracion_minutos',
    ];

    public function desdeFormularioWeb(array $entrada): RegistroServicioEntradaDto
    {
        return $this->traducir($entrada, self::WEB);
    }

    public function desdeServicioExterno(array $entrada): RegistroServicioEntradaDto
    {
        return $this->traducir($entrada, self::EXTERNO);
    }

    private function traducir(array $entrada, array $mapa): RegistroServicioEntradaDto
    {
        $desconocidos = array_diff(array_keys($entrada), array_keys($mapa));

        $datos = [];
        foreach ($mapa as $origen => $destino) {
            $valor = $entrada[$origen] ?? null;
            if (is_string($valor)) {
                $valor = trim($valor);
            }
            if (in_array($destino, ['imagen', 'precio', 'duracion_minutos'], true) && $valor === '') {
                $valor = null;
            }
            $datos[$destino] = $valor;
        }

        $precio = $datos['precio'];
        if (is_string($precio) && preg_match('/^\d+(?:[.,]\d{1,2})?$/D', $precio)) {
            $datos['precio'] = (float) str_replace(',', '.', $precio);
        }
        $duracion = $datos['duracion_minutos'];
        if (is_string($duracion) && preg_match('/^\d+$/D', $duracion) && (float) $duracion <= PHP_INT_MAX) {
            $datos['duracion_minutos'] = (int) $duracion;
        }

        $validador = Validator::make($datos, [
            'categoria_id' => ['required', 'string', 'uuid'],
            'nombre' => ['required', 'string', 'max:255'],
            'descripcion' => ['required', 'string'],
            'imagen' => ['nullable', 'string', 'max:500'],
            'precio' => ['nullable', 'numeric', 'min:0', function ($atributo, $valor, $fallo) {
                if (!is_int($valor) && !is_float($valor)) {
                    $fallo('El precio debe ser un número válido.');
                }
            }],
            'duracion_minutos' => ['nullable', 'integer', 'min:1'],
        ], [
            'required' => 'El campo :attribute es obligatorio.',
            'string' => 'El campo :attribute debe ser texto.',
            'uuid' => 'El campo :attribute debe ser un UUID válido.',
            'numeric' => 'El campo :attribute debe ser numérico.',
            'integer' => 'El campo :attribute debe ser un entero.',
            'min' => 'El campo :attribute debe ser al menos :min.',
            'max' => 'El campo :attribute excede el máximo de :max caracteres.',
        ]);
        $validador->fails();
        foreach ($desconocidos as $campo) {
            $validador->errors()->add($campo, 'Campo desconocido.');
        }
        if ($validador->errors()->isNotEmpty()) {
            throw new ValidationException($validador);
        }

        return new RegistroServicioEntradaDto(
            categoriaId: $datos['categoria_id'], nombre: $datos['nombre'],
            descripcion: $datos['descripcion'], imagen: $datos['imagen'],
            precio: $datos['precio'], duracionMinutos: $datos['duracion_minutos'],
        );
    }
}
