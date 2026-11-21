<?php

namespace App\Http\Requests\Paciente;

use App\Models\Paciente;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdatePacienteRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        $paciente = Paciente::findOrFail($this->route('id'));

        return [
            'nombres' => ['sometimes', 'required', 'string', 'max:255'],
            'cedula' => [
                'sometimes',
                'required',
                'string',
                'max:20',
                Rule::unique('pacientes', 'cedula')->ignore($paciente),
            ],
            'telefono' => ['sometimes', 'nullable', 'string', 'max:20'],
            'direccion' => ['sometimes', 'nullable', 'string', 'max:255'],
            'fecha_nacimiento' => ['sometimes', 'nullable', 'date', 'before_or_equal:today'],
        ];
    }

    public function messages(): array
    {
        return [
            'nombres.required' => 'Los nombres del paciente son obligatorios.',
            'cedula.required' => 'La cédula del paciente es obligatoria.',
            'cedula.unique' => 'Ya existe un paciente registrado con esta cédula.',
            'fecha_nacimiento.date' => 'La fecha de nacimiento no es válida.',
            'fecha_nacimiento.before_or_equal' => 'La fecha de nacimiento no puede ser futura.',
        ];
    }
}
