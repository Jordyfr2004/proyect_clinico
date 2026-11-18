<?php
namespace Tests\Feature;
use Illuminate\Support\Facades\Http;
use Tests\TestCase;
class OrquestacionTest extends TestCase
{
    public function test_orquesta_y_propaga_cid(): void
    {
        Http::preventStrayRequests();
        Http::fake(['*/usuarios/7' => Http::response(['id'=>7,'nombre'=>'Ana']), '*/estados/101' => Http::response(['solicitud_id'=>101,'estado'=>'pendiente'])]);
        $this->withHeader('X-Correlation-ID','clase-101')->getJson('/api/resumen-solicitud/101')->assertOk()->assertJsonPath('usuario.nombre','Ana')->assertJsonPath('estado.estado','pendiente')->assertJsonPath('correlation_id','clase-101')->assertHeader('X-Correlation-ID','clase-101');
        Http::assertSentCount(2);
        Http::assertSent(fn ($r) => str_ends_with($r->url(),'/usuarios/7') && $r->hasHeader('X-Correlation-ID','clase-101'));
        Http::assertSent(fn ($r) => str_ends_with($r->url(),'/estados/101') && $r->hasHeader('X-Correlation-ID','clase-101'));
    }
    public function test_http_fallido(): void
    {
        Http::fake(['*'=>Http::response([],503)]);
        $this->getJson('/api/resumen-solicitud/101')->assertStatus(502)->assertJsonPath('error','Dependencia no disponible')->assertJsonStructure(['correlation_id']);
    }
    public function test_conexion_fallida(): void
    {
        Http::fake(['*'=>Http::failedConnection()]);
        $this->getJson('/api/resumen-solicitud/101')->assertStatus(502);
    }
    public function test_contenido_invalido(): void
    {
        Http::fake(['*'=>Http::response('no es json',200)]);
        $this->getJson('/api/resumen-solicitud/101')->assertStatus(502);
    }
}
