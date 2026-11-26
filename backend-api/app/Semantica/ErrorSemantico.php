<?php

namespace App\Semantica;

use Illuminate\Http\JsonResponse;
use RuntimeException;

/**
 * Error de intercambio expresado como FHIR OperationOutcome, el formato
 * estándar con el que un sistema de salud explica por qué rechazó un recurso.
 */
final class ErrorSemantico extends RuntimeException
{
    /**
     * @param  list<array{code: string, expression: string, diagnostics: string}>  $problemas
     */
    public function __construct(
        public readonly array $problemas,
        public readonly int $httpStatus = 422,
    ) {
        parent::__construct($problemas[0]['diagnostics'] ?? 'Recurso FHIR inválido.');
    }

    public static function uno(string $code, string $expression, string $diagnostics, int $httpStatus = 422): self
    {
        return new self([compact('code', 'expression', 'diagnostics')], $httpStatus);
    }

    /**
     * @return array<string, mixed>
     */
    public function operationOutcome(): array
    {
        return [
            'resourceType' => 'OperationOutcome',
            'issue' => array_map(fn (array $p) => [
                'severity' => 'error',
                'code' => $p['code'],
                'diagnostics' => $p['diagnostics'],
                'expression' => [$p['expression']],
            ], $this->problemas),
        ];
    }

    public function respuesta(): JsonResponse
    {
        return response()
            ->json($this->operationOutcome(), $this->httpStatus, [], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES)
            ->header('Content-Type', VocabularioClinico::CONTENT_TYPE);
    }
}
