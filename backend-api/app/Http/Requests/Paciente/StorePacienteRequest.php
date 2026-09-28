<?php

namespace App\Http\Requests\Paciente;

use Illuminate\Foundation\Http\FormRequest;

class StorePacienteRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'nombre' => ['required', 'string', 'max:255'],
            'cedula' => ['required', 'string', 'max:20', 'unique:pacientes,cedula'],
            'telefono' => ['nullable', 'string', 'max:20'],
            'direccion' => ['nullable', 'string', 'max:255'],
            'fecha_nacimiento' => ['nullable', 'date', 'before_or_equal:today'],
        ];
    }

    public function messages(): array
    {
        return [
            'nombre.required' => 'El nombre del paciente es obligatorio.',
            'cedula.required' => 'La cédula del paciente es obligatoria.',
            'cedula.unique' => 'Ya existe un paciente registrado con esta cédula.',
            'fecha_nacimiento.date' => 'La fecha de nacimiento no es válida.',
            'fecha_nacimiento.before_or_equal' => 'La fecha de nacimiento no puede ser futura.',
        ];
    }
}
