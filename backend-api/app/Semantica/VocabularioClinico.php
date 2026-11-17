<?php

namespace App\Semantica;

/**
 * Vocabulario compartido de la capa semántica (Práctica: capa de intercambio
 * de información semántica · William Cabrera).
 *
 * Aquí vive el "diccionario" que da significado común a los datos de la
 * agenda: cada valor interno se asocia a un código de un vocabulario
 * estándar (HL7 FHIR R4) identificado por su URI. Dos sistemas que usan los
 * mismos URI y códigos entienden lo mismo sin conocer la base de datos del
 * otro.
 */
final class VocabularioClinico
{
    /** Versión de FHIR con la que se publica el recurso. */
    public const FHIR_VERSION = '4.0.1';

    /** Tipo de contenido oficial de FHIR para JSON. */
    public const CONTENT_TYPE = 'application/fhir+json';

    /**
     * La agenda guarda fecha y hora locales sin zona; su significado real
     * es la hora de Ecuador continental (UTC-05:00, sin horario de verano).
     */
    public const ZONA_HORARIA = 'America/Guayaquil';

    /*
     * Sistemas de identificación (URI). Los dos primeros son convenciones
     * del proyecto (URN propios); el resto son vocabularios oficiales de HL7.
     */
    public const SISTEMA_AGENDA = 'urn:proyect-clinico:agenda';

    public const SISTEMA_CODIGO_PACIENTE = 'urn:proyect-clinico:codigo-paciente';

    public const SISTEMA_CEDULA = 'urn:proyect-clinico:cedula-ecuador';

    public const SISTEMA_CATEGORIA_SERVICIO = 'http://terminology.hl7.org/CodeSystem/service-category';

    public const SISTEMA_TIPO_CITA = 'http://terminology.hl7.org/CodeSystem/v2-0276';

    /** service-category 10 = Dental. Es lo único que atiende el consultorio. */
    public const CATEGORIA_DENTAL = ['code' => '10', 'display' => 'Dental'];

    /** v2-0276 ROUTINE = cita de rutina (consulta programada). */
    public const TIPO_CITA_RUTINA = ['code' => 'ROUTINE', 'display' => 'Routine appointment - default if not valued'];

    /**
     * estado interno de la agenda  =>  Appointment.status de FHIR.
     *
     * @var array<string, string>
     */
    public const ESTADOS = [
        'pendiente' => 'proposed',
        'programada' => 'booked',
        'completada' => 'fulfilled',
        'cancelada' => 'cancelled',
    ];

    /** Únicos estados FHIR que se pueden importar como cita nueva. */
    public const ESTADOS_IMPORTABLES = ['booked'];

    public static function estadoFhir(?string $estadoInterno): string
    {
        // FHIR exige un status; un valor interno desconocido no se inventa.
        return self::ESTADOS[$estadoInterno ?? ''] ?? 'entered-in-error';
    }

    public static function estadoInterno(string $estadoFhir): ?string
    {
        $interno = array_search($estadoFhir, self::ESTADOS, true);

        return $interno === false ? null : $interno;
    }

    /**
     * Tabla de mapeo publicada en GET /api/semantica/vocabulario.
     *
     * @return array<string, mixed>
     */
    public static function comoTabla(): array
    {
        return [
            'estandar' => 'HL7 FHIR R4 ('.self::FHIR_VERSION.') · recurso Appointment',
            'zona_horaria' => self::ZONA_HORARIA,
            'estados' => collect(self::ESTADOS)
                ->map(fn (string $fhir, string $interno) => [
                    'interno' => $interno,
                    'fhir' => $fhir,
                    'importable' => in_array($fhir, self::ESTADOS_IMPORTABLES, true),
                ])
                ->values()
                ->all(),
            'campos' => [
                ['interno' => 'id', 'fhir' => 'Appointment.id / identifier ('.self::SISTEMA_AGENDA.')'],
                ['interno' => 'estado', 'fhir' => 'Appointment.status'],
                ['interno' => 'tipo = cita_medica', 'fhir' => 'Appointment.serviceCategory = '.self::CATEGORIA_DENTAL['code'].' Dental'],
                ['interno' => 'fecha + hora_inicio', 'fhir' => 'Appointment.start (instante ISO 8601 con zona)'],
                ['interno' => 'fecha + hora_fin', 'fhir' => 'Appointment.end (instante ISO 8601 con zona)'],
                ['interno' => 'descripcion', 'fhir' => 'Appointment.description'],
                ['interno' => 'paciente.codigo_paciente', 'fhir' => 'participant.actor.identifier ('.self::SISTEMA_CODIGO_PACIENTE.')'],
                ['interno' => 'paciente.cedula', 'fhir' => 'participant.actor.identifier ('.self::SISTEMA_CEDULA.'), solo al importar'],
                ['interno' => 'paciente.nombres / nombre_reserva', 'fhir' => 'participant.actor.display'],
                ['interno' => 'created_at', 'fhir' => 'Appointment.created'],
            ],
            'no_se_comparten' => ['diagnostico', 'tratamiento', 'observacion', 'citas de tipo personal'],
            'sistemas' => [
                'agenda' => self::SISTEMA_AGENDA,
                'codigo_paciente' => self::SISTEMA_CODIGO_PACIENTE,
                'cedula' => self::SISTEMA_CEDULA,
                'categoria_servicio' => self::SISTEMA_CATEGORIA_SERVICIO,
                'tipo_cita' => self::SISTEMA_TIPO_CITA,
            ],
        ];
    }
}
