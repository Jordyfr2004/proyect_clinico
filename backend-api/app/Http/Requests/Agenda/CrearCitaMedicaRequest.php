<?php

namespace App\Http\Requests\Agenda;

use Illuminate\Contracts\Validation\Validator;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Http\Exceptions\HttpResponseException;

/**
 * Validación del contrato de solicitud "Registrar cita médica".
 *
 * Contrato: docs/contratos/cita-medica/solicitud.schema.json
 * Si una regla falla, la petición se rechaza con HTTP 422 ANTES de llegar
 * al servicio, por lo que nunca se persisten datos inválidos.
 *
 * Práctica 2.2 – William Cabrera.
 */
class CrearCitaMedicaRequest extends FormRequest
{
    /**
     * La autorización por rol (doctora) ya la aplican los middlewares
     * auth:sanctum y role:doctora definidos en routes/api.php.
     */
    public function authorize(): bool
    {
        return true;
    }

    /**
     * @return array<string, array<int, string>>
     */
    public function rules(): array
    {
        return [
            'codigo_paciente' => [
                'bail',
                'nullable',
                'string',
                'max:20',
                'required_without:nombre_reserva',
                'prohibits:nombre_reserva',
                'exists:pacientes,codigo_paciente',
            ],
            'nombre_reserva' => [
                'bail',
                'nullable',
                'string',
                'max:255',
                'required_without:codigo_paciente',
                'prohibits:codigo_paciente',
            ],
            'fecha' => ['bail', 'required', 'string', 'date_format:Y-m-d'],
            'hora_inicio' => ['bail', 'required', 'string', 'date_format:H:i'],
            'hora_fin' => ['bail', 'required', 'string', 'date_format:H:i', 'after:hora_inicio'],
            'descripcion' => ['bail', 'nullable', 'string', 'max:1000'],
        ];
    }

    /**
     * @return array<string, string>
     */
    public function messages(): array
    {
        return [
            'required' => 'El campo :attribute es obligatorio.',
            'string' => 'El campo :attribute debe ser texto (string).',
            'max' => 'El campo :attribute no debe superar :max caracteres.',
            'date_format' => 'El campo :attribute debe tener el formato :format.',
            'after' => 'El campo :attribute debe ser posterior a :date.',
            'exists' => 'El :attribute indicado no existe.',
            'required_without' => 'Debe enviar :attribute cuando no se envía :values.',
            'prohibits' => 'El campo :attribute no puede enviarse junto con :other.',
        ];
    }

    /**
     * @return array<string, string>
     */
    public function attributes(): array
    {
        return [
            'codigo_paciente' => 'codigo_paciente',
            'nombre_reserva' => 'nombre_reserva',
            'fecha' => 'fecha',
            'hora_inicio' => 'hora_inicio',
            'hora_fin' => 'hora_fin',
            'descripcion' => 'descripcion',
        ];
    }

    /**
     * Respuesta de error del contrato: siempre JSON con HTTP 422,
     * aunque el cliente no envíe la cabecera Accept: application/json.
     */
    protected function failedValidation(Validator $validator): void
    {
        throw new HttpResponseException(response()->json([
            'message' => 'Los datos enviados no cumplen el contrato de la cita médica.',
            'errors' => $validator->errors(),
        ], 422));
    }
}
