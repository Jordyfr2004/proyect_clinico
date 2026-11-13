<?php

namespace Tests\Feature;

use Tests\TestCase;

class CorsTest extends TestCase
{
    protected function setUp(): void
    {
        parent::setUp();

        config([
            'cors.allowed_origins' => ['https://clinica.vercel.app'],
            'filesystems.disks.ftp.host' => null,
        ]);
    }

    public function test_preflight_from_the_published_web_is_allowed(): void
    {
        $this->call('OPTIONS', '/api/auth/login', server: [
            'HTTP_ORIGIN' => 'https://clinica.vercel.app',
            'HTTP_ACCESS_CONTROL_REQUEST_METHOD' => 'POST',
            'HTTP_ACCESS_CONTROL_REQUEST_HEADERS' => 'authorization,content-type',
        ])
            ->assertNoContent()
            ->assertHeader('Access-Control-Allow-Origin', 'https://clinica.vercel.app')
            ->assertHeader('Access-Control-Max-Age', '3600');
    }

    public function test_instance_headers_are_exposed_to_the_browser(): void
    {
        $respuesta = $this->getJson('/api/health', ['Origin' => 'https://clinica.vercel.app'])->assertOk();

        $this->assertStringContainsString('X-Backend-Instance', (string) $respuesta->headers->get('Access-Control-Expose-Headers'));
    }

    public function test_other_origins_are_not_echoed_back(): void
    {
        config(['cors.allowed_origins' => ['https://clinica.vercel.app', 'https://otra.vercel.app']]);

        $respuesta = $this->getJson('/api/health', ['Origin' => 'https://atacante.example']);

        $this->assertNull($respuesta->headers->get('Access-Control-Allow-Origin'));
    }
}
