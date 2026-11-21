<?php

namespace Tests\Feature;

use App\Models\EvidenciaClinica;
use App\Models\Paciente;
use App\Models\User;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Laravel\Sanctum\Sanctum;
use League\Flysystem\UnableToWriteFile;
use Tests\TestCase;

class EvidenciasArchivosTest extends TestCase
{
    private Paciente $paciente;

    private User $doctora;

    private User $pacienteUser;

    protected function setUp(): void
    {
        parent::setUp();

        foreach ([
            '0001_01_01_000000_create_users_table.php',
            '2026_09_25_012937_create_pacientes_table.php',
            '2026_09_25_163636_add_username_and_role_to_users_table.php',
            '2026_09_25_164339_add_paciente_id_to_users_table.php',
            '2026_10_03_043148_create_evidencia_clinicas_table.php',
            '2026_10_03_191429_create_accion_registradas_table.php',
            '2026_10_18_000001_add_subido_por_to_evidencias_clinicas_table.php',
        ] as $migration) {
            (require database_path('migrations/'.$migration))->up();
        }

        Storage::fake('ftp');

        $this->paciente = Paciente::create([
            'codigo_paciente' => '001',
            'nombres' => 'Paciente de prueba',
            'cedula' => '1234567890',
        ]);
        $this->doctora = User::create([
            'name' => 'Doctora', 'email' => 'doctora@example.test',
            'password' => 'password-prueba', 'role' => 'doctora',
        ]);
        $this->pacienteUser = User::create([
            'name' => 'Paciente', 'email' => 'paciente@example.test',
            'password' => 'password-prueba', 'role' => 'paciente',
            'paciente_id' => $this->paciente->id,
        ]);
    }

    public function test_doctora_uploads_radiograph_to_file_server_and_downloads_it(): void
    {
        Sanctum::actingAs($this->doctora);

        $respuesta = $this->postJson('/api/evidencias-clinicas', [
            'paciente_id' => $this->paciente->id,
            'tipo' => 'rx',
            'archivo' => UploadedFile::fake()->image('panoramica.png', 800, 600),
            'descripcion' => 'Radiografía panorámica',
        ])->assertCreated()
            ->assertJsonPath('data.nombre_archivo', 'panoramica.png')
            ->assertJsonPath('data.mime_type', 'image/png')
            ->assertJsonPath('data.subido_por.role', 'doctora');

        $evidencia = EvidenciaClinica::findOrFail($respuesta->json('data.id'));

        $this->assertStringStartsWith("clinica/pacientes/{$this->paciente->id}/evidencias/", $evidencia->ruta_archivo);
        Storage::disk('ftp')->assertExists($evidencia->ruta_archivo);

        $descarga = $this->get("/api/evidencias-clinicas/{$evidencia->id}/archivo")
            ->assertOk()
            ->assertHeader('Content-Type', 'image/png');
        $this->assertSame(Storage::disk('ftp')->get($evidencia->ruta_archivo), $descarga->streamedContent());
    }

    public function test_client_cannot_choose_the_storage_path_or_upload_other_types(): void
    {
        Sanctum::actingAs($this->doctora);

        $this->postJson('/api/evidencias-clinicas', [
            'paciente_id' => $this->paciente->id,
            'tipo' => 'rx',
            'ruta_archivo' => '../../etc/passwd',
            'archivo' => UploadedFile::fake()->create('script.php', 10, 'application/x-php'),
        ])->assertUnprocessable()->assertJsonValidationErrors('archivo');

        $this->postJson('/api/evidencias-clinicas', [
            'paciente_id' => $this->paciente->id,
            'tipo' => 'rx',
        ])->assertUnprocessable()->assertJsonValidationErrors('archivo');

        $this->assertSame(0, EvidenciaClinica::count());
    }

    public function test_deleting_evidence_removes_the_file(): void
    {
        Sanctum::actingAs($this->doctora);

        $id = $this->postJson('/api/evidencias-clinicas', [
            'paciente_id' => $this->paciente->id,
            'tipo' => 'documento',
            'archivo' => UploadedFile::fake()->create('consentimiento.pdf', 50, 'application/pdf'),
        ])->assertCreated()->json('data.id');
        $ruta = EvidenciaClinica::findOrFail($id)->ruta_archivo;

        $this->deleteJson("/api/evidencias-clinicas/{$id}")->assertOk();

        Storage::disk('ftp')->assertMissing($ruta);
        $this->assertNull(EvidenciaClinica::find($id));
    }

    public function test_upload_returns_503_and_saves_nothing_when_file_server_is_down(): void
    {
        Sanctum::actingAs($this->doctora);
        Storage::shouldReceive('disk->put')
            ->andThrow(UnableToWriteFile::atLocation('clinica/x.png', 'FTP caído'));

        $this->postJson('/api/evidencias-clinicas', [
            'paciente_id' => $this->paciente->id,
            'tipo' => 'rx',
            'archivo' => UploadedFile::fake()->image('rx.png'),
        ])->assertStatus(503);

        $this->assertSame(0, EvidenciaClinica::count());
    }

    public function test_patient_uploads_and_sees_only_own_files(): void
    {
        $otro = Paciente::create([
            'codigo_paciente' => '002', 'nombres' => 'Otro paciente', 'cedula' => '0987654321',
        ]);
        $ajena = EvidenciaClinica::create([
            'paciente_id' => $otro->id, 'tipo' => 'rx', 'nombre_archivo' => 'ajena.png',
            'ruta_archivo' => 'clinica/ajena.png', 'mime_type' => 'image/png', 'tamano' => 1,
            'fecha' => '2026-10-01',
        ]);
        Storage::disk('ftp')->put('clinica/ajena.png', 'x');

        Sanctum::actingAs($this->pacienteUser);

        $id = $this->postJson('/api/paciente/mis-evidencias', [
            'tipo' => 'rx',
            'paciente_id' => $otro->id,
            'archivo' => UploadedFile::fake()->image('mi-rx.jpg'),
        ])->assertCreated()
            ->assertJsonPath('data.paciente_id', $this->paciente->id)
            ->assertJsonPath('data.subido_por.role', 'paciente')
            ->json('data.id');

        $this->getJson('/api/paciente/mis-evidencias')
            ->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.id', $id);

        $this->get("/api/paciente/mis-evidencias/{$id}/archivo")->assertOk();
        $this->getJson("/api/paciente/mis-evidencias/{$ajena->id}/archivo")->assertNotFound();
        $this->getJson("/api/evidencias-clinicas/{$ajena->id}/archivo")->assertForbidden();

        $this->postJson('/api/paciente/mis-evidencias', [
            'tipo' => 'caso_clinico',
            'archivo' => UploadedFile::fake()->image('caso.jpg'),
        ])->assertUnprocessable()->assertJsonValidationErrors('tipo');
    }
}
