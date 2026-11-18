<?php

namespace App\Services\Integracion;

use Carbon\Carbon;
use InvalidArgumentException;

/**
 * Tema 2.3 - Traductor de datos de paciente.
 *
 * Convierte dos estructuras distintas al contrato común del backend:
 *   - Origen A: formulario web (camelCase, fecha dd/mm/aaaa, teléfono con guiones)
 *   - Origen B: sistema externo simulado (inglés, snake_case, anidado, fecha ISO, +593)
 *
 * Contrato común (mismos campos que el modelo Paciente):
 *   { nombres, cedula, telefono, direccion, fecha_nacimiento }
 */
class NormalizadorPaciente
{
    /** Origen A: formulario web */
    public function desdeFormularioWeb(array $entrada): array
    {
        return $this->construirContrato(
            nombres: $entrada['nombreCompleto'] ?? null,
            cedula: $entrada['numeroCedula'] ?? null,
            telefono: $entrada['celular'] ?? null,
            direccion: $entrada['domicilio'] ?? null,
            fechaTexto: $entrada['fechaNacimiento'] ?? null,
            formatoFecha: 'd/m/Y',
        );
    }

    /** Origen B: sistema externo (estructura anidada) */
    public function desdeSistemaExterno(array $entrada): array
    {
        return $this->construirContrato(
            nombres: $entrada['patient']['full_name'] ?? null,
            cedula: $entrada['patient']['id_number'] ?? null,
            telefono: $entrada['contact']['phone'] ?? null,
            direccion: $entrada['contact']['address'] ?? null,
            fechaTexto: $entrada['birth_date'] ?? null,
            formatoFecha: 'Y-m-d',
        );
    }

    /** Valida y arma el contrato común (una sola regla para ambos orígenes). */
    private function construirContrato(
        mixed $nombres,
        mixed $cedula,
        mixed $telefono,
        mixed $direccion,
        mixed $fechaTexto,
        string $formatoFecha,
    ): array {
        // nombres: obligatorio
        $nombres = trim((string) $nombres);
        if ($nombres === '') {
            throw new InvalidArgumentException('El nombre del paciente es obligatorio.');
        }

        // cedula: obligatoria, exactamente 10 dígitos
        $cedula = trim((string) $cedula);
        if (!preg_match('/^\d{10}$/', $cedula)) {
            throw new InvalidArgumentException('La cédula debe tener exactamente 10 dígitos.');
        }

        // telefono: opcional; se normaliza a 09XXXXXXXX
        $telefonoNormalizado = null;
        if ($telefono !== null && trim((string) $telefono) !== '') {
            $soloDigitos = preg_replace('/[\s\-()]/', '', (string) $telefono);
            if (str_starts_with($soloDigitos, '+593')) {
                $soloDigitos = '0' . substr($soloDigitos, 4);
            }
            if (!preg_match('/^09\d{8}$/', $soloDigitos)) {
                throw new InvalidArgumentException('El teléfono no tiene un formato válido.');
            }
            $telefonoNormalizado = $soloDigitos;
        }

        // fecha_nacimiento: opcional; se convierte a Y-m-d y no puede ser futura
        $fechaNormalizada = null;
        if ($fechaTexto !== null && trim((string) $fechaTexto) !== '') {
            try {
                $fecha = Carbon::createFromFormat('!' . $formatoFecha, trim((string) $fechaTexto));
            } catch (\Throwable) {
                $fecha = false;
            }
            if ($fecha === false ||$fecha->format($formatoFecha) !== trim((string) $fechaTexto)) {
                throw new InvalidArgumentException("La fecha de nacimiento debe tener el formato {$formatoFecha}.");
            }
            if ($fecha->isFuture()) {
                throw new InvalidArgumentException('La fecha de nacimiento no puede ser futura.');
            }
            $fechaNormalizada = $fecha->format('Y-m-d');
        }

        $direccion = trim((string) $direccion);

        return [
            'nombres' => $nombres,
            'cedula' => $cedula,
            'telefono' => $telefonoNormalizado,
            'direccion' => $direccion === '' ? null : $direccion,
            'fecha_nacimiento' => $fechaNormalizada,
        ];
    }
}