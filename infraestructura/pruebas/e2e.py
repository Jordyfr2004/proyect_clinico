"""Prueba de integración de extremo a extremo contra el sistema en vivo, siempre a través del balanceador.

Recorre los flujos principales con datos nuevos (un paciente "Paciente E2E ..." por ejecución):
autenticación, pacientes, cuenta móvil vinculada, citas, radiografías en el servidor de archivos,
recetas, auditoría, trazabilidad y reparto entre backend1 y backend2.

Uso (solo necesita Python 3, sin dependencias):
    DOC_PASS='contraseña de la doctora' python3 e2e.py http://100.102.99.114
    $env:DOC_PASS='...'; python e2e.py http://100.102.99.114          (Windows)
Opcional, en la Laptop 5: segundo argumento con la carpeta de archivos del FTP para verificar el archivo físico.
"""
import json, os, struct, sys, uuid, zlib, datetime, collections
import urllib.request, urllib.error

BASE = (sys.argv[1] if len(sys.argv) > 1 else "http://100.102.99.114").rstrip("/")
FTP_DIR = sys.argv[2] if len(sys.argv) > 2 else None
if not os.environ.get("DOC_PASS"):
    sys.exit("Define DOC_PASS con la contraseña de la cuenta 'doctora'.")
instancias = collections.Counter()
fallos = []


def pedir(metodo, ruta, token=None, json_body=None, multipart=None, esperado=None, crudo=False):
    headers = {"Accept": "application/json"}
    data = None
    if token:
        headers["Authorization"] = f"Bearer {token}"
    if json_body is not None:
        data = json.dumps(json_body).encode()
        headers["Content-Type"] = "application/json"
    if multipart is not None:
        limite = uuid.uuid4().hex
        partes = []
        for nombre, valor in multipart.items():
            if isinstance(valor, tuple):
                archivo, contenido, tipo = valor
                partes.append(f'--{limite}\r\nContent-Disposition: form-data; name="{nombre}"; filename="{archivo}"\r\nContent-Type: {tipo}\r\n\r\n'.encode() + contenido + b"\r\n")
            else:
                partes.append(f'--{limite}\r\nContent-Disposition: form-data; name="{nombre}"\r\n\r\n{valor}\r\n'.encode())
        data = b"".join(partes) + f"--{limite}--\r\n".encode()
        headers["Content-Type"] = f"multipart/form-data; boundary={limite}"
    req = urllib.request.Request(BASE + ruta, data=data, method=metodo, headers=headers)
    try:
        with urllib.request.urlopen(req, timeout=20) as r:
            codigo, cuerpo, cab = r.status, r.read(), r.headers
    except urllib.error.HTTPError as e:
        codigo, cuerpo, cab = e.code, e.read(), e.headers
    if cab.get("X-Backend-Instance"):
        instancias[cab["X-Backend-Instance"]] += 1
    if esperado is not None and codigo != esperado:
        fallos.append(f"{metodo} {ruta}: esperado {esperado}, obtenido {codigo} {cuerpo[:200]!r}")
        print(f"  ✗ {metodo} {ruta} -> {codigo} (esperado {esperado}) {cuerpo[:200]!r}")
    if crudo:
        return codigo, cuerpo, cab
    try:
        return codigo, json.loads(cuerpo or b"null")
    except ValueError:
        return codigo, None


def paso(texto, ok):
    print(("  ✓ " if ok else "  ✗ ") + texto)
    if not ok:
        fallos.append(texto)


def png():
    w = lambda t, d: struct.pack(">I", len(d)) + t + d + struct.pack(">I", zlib.crc32(t + d))
    return b"\x89PNG\r\n\x1a\n" + w(b"IHDR", struct.pack(">IIBBBBB", 2, 2, 8, 2, 0, 0, 0)) + w(b"IDAT", zlib.compress(b"\x00" + b"\xff\x00\x00" * 2 + b"\x00" + b"\x00\xff\x00" * 2)) + w(b"IEND", b"")


sufijo = uuid.uuid4().hex[:6]
cedula = str(int(uuid.uuid4().int % 10**10)).zfill(10)
manana = (datetime.date.today() + datetime.timedelta(days=2)).isoformat()

print("1. Autenticación")
c, r = pedir("POST", "/api/auth/login", json_body={"username": os.environ.get("DOC_USER", "doctora"), "password": os.environ["DOC_PASS"]}, esperado=200)
doc = r["access_token"]
paso("la doctora inicia sesión", bool(doc))
c, _ = pedir("GET", "/api/pacientes", esperado=401)

print("2. Pacientes (web) y cuenta móvil vinculada")
c, r = pedir("POST", "/api/pacientes", doc, {"nombres": f"Paciente E2E {sufijo}", "cedula": cedula, "telefono": "0991234567"}, esperado=201)
paciente_id = r["data"]["id"]
c, r = pedir("POST", "/api/auth/register-paciente", json_body={"nombres": f"Paciente E2E {sufijo}", "cedula": cedula, "email": f"e2e{sufijo}@example.test", "telefono": "0991234567", "direccion": "Manta", "fecha_nacimiento": "1995-05-05", "password": "Paciente-123", "password_confirmation": "Paciente-123"}, esperado=201)
pac = r["access_token"]
paso("la cuenta móvil queda vinculada al mismo expediente", r["user"]["paciente_id"] == paciente_id)
c, r = pedir("GET", "/api/paciente/mi-perfil", pac, esperado=200)
paso("el paciente ve su perfil desde la app", r["data"]["cedula"] == cedula)
pedir("GET", "/api/pacientes", pac, esperado=403)

print("3. Citas: solicitar, programar, reprogramar, cancelar")
c, r = pedir("POST", "/api/agenda/solicitar-cita", pac, esperado=201)
cita = r["data"]["id"]
pedir("PUT", f"/api/agenda/solicitud/{cita}/programar", doc, {"fecha": manana, "hora_inicio": "10:00", "hora_fin": "10:30"}, esperado=200)
c, r = pedir("GET", "/api/agenda/mis-citas", pac, esperado=200)
mia = next(x for x in r["data"] if x["id"] == cita)
paso("el paciente ve la cita programada con los campos fecha/tipo", mia["estado"] == "programada" and mia["fecha"] == manana and mia["tipo"] == "cita_medica")
c, r = pedir("POST", "/api/agenda/personal", doc, {"fecha": manana, "hora_inicio": "10:15", "hora_fin": "10:45", "descripcion": "Choque"})
paso("PostgreSQL impide solapar otra actividad en el mismo horario", c == 409)
pedir("PUT", f"/api/agenda/mis-citas/{cita}/reprogramar", pac, {"motivo": "Prueba E2E"}, esperado=200)
c, r = pedir("GET", "/api/agenda/mis-citas", pac)
mia = next(x for x in r["data"] if x["id"] == cita)
paso("reprogramar libera el horario y deja la cita pendiente", mia["estado"] == "pendiente" and mia["fecha"] is None)
pedir("PUT", f"/api/agenda/solicitud/{cita}/programar", doc, {"fecha": manana, "hora_inicio": "11:00", "hora_fin": "11:30"}, esperado=200)
pedir("PUT", f"/api/agenda/mis-citas/{cita}/cancelar", pac, esperado=200)
pedir("PUT", f"/api/agenda/mis-citas/{cita}/cancelar", pac, esperado=409)

print("4. Radiografías en el servidor de archivos")
imagen = png()
c, r = pedir("POST", "/api/evidencias-clinicas", doc, multipart={"paciente_id": paciente_id, "tipo": "rx", "descripcion": "Panorámica E2E", "archivo": ("panoramica.png", imagen, "image/png")}, esperado=201)
evid = r["data"]
if FTP_DIR:
    paso("el archivo está físicamente en el servidor FTP", open(os.path.join(FTP_DIR, evid["ruta_archivo"]), "rb").read() == imagen)
c, cuerpo, cab = pedir("GET", f"/api/evidencias-clinicas/{evid['id']}/archivo", doc, crudo=True)
paso("la doctora descarga el archivo idéntico", c == 200 and cuerpo == imagen)
c, r = pedir("GET", "/api/paciente/mis-evidencias", pac, esperado=200)
paso("el paciente ve la radiografía en la app", any(x["id"] == evid["id"] for x in r["data"]))
c, cuerpo, _ = pedir("GET", f"/api/paciente/mis-evidencias/{evid['id']}/archivo", pac, crudo=True)
paso("el paciente descarga su radiografía", c == 200 and cuerpo == imagen)
c, r = pedir("POST", "/api/paciente/mis-evidencias", pac, multipart={"tipo": "documento", "archivo": ("consentimiento.png", imagen, "image/png")}, esperado=201)
subida_paciente = r["data"]["id"]
c, r = pedir("GET", f"/api/evidencias-clinicas/paciente/{paciente_id}", doc, esperado=200)
paso("la doctora ve lo que subió el paciente", any(x["id"] == subida_paciente and x["subido_por"]["role"] == "paciente" for x in r["data"]))
pedir("POST", "/api/evidencias-clinicas", doc, multipart={"paciente_id": paciente_id, "tipo": "rx", "archivo": ("x.php", b"<?php echo 1;", "application/x-php")}, esperado=422)

print("5. Recetas")
c, r = pedir("POST", "/api/plantillas-receta", doc, {"nombre": f"Post extracción {sufijo}", "medicamentos": [{"nombre": "Amoxicilina", "dosis": "500 mg", "frecuencia": "Cada 8 horas", "duracion": "7 días"}], "indicaciones": "No enjuagarse 24 horas"}, esperado=201)
plantilla = r["data"]
c, r = pedir("POST", "/api/recetas", doc, {"paciente_id": paciente_id, "diagnostico": "Extracción", "medicamentos": plantilla["medicamentos"], "indicaciones": plantilla["indicaciones"]}, esperado=201)
receta = r["data"]["id"]
c, r = pedir("GET", "/api/paciente/mis-recetas", pac, esperado=200)
paso("el paciente ve la receta en la app", any(x["id"] == receta and x["medicamentos"][0]["nombre"] == "Amoxicilina" for x in r["data"]))
pedir("POST", "/api/recetas", pac, {}, esperado=403)

print("6. Auditoría")
c, r = pedir("GET", "/api/configuracion/acciones", doc, esperado=200)
acciones = json.dumps(r)
paso("queda registro de quién hizo los cambios", "reprogramar_cita_paciente" in acciones and "Emitiste una receta" in acciones)
c, r = pedir("GET", f"/api/configuracion/cambios?tabla=agenda&registro_id={cita}", doc, esperado=200)
cambios = r["cambios"]
paso("la trazabilidad guarda cada cambio de la cita con valor anterior y nuevo", len(cambios) >= 4 and any(x["campos_modificados"] and "estado" in x["campos_modificados"] for x in cambios))
cancelacion = cambios[0]
paso("identifica al paciente, su IP, la instancia y el request_id", cancelacion["usuario"] == f"Paciente E2E {sufijo}" and cancelacion["ip"] and cancelacion["instancia"] in ("backend1", "backend2") and cancelacion["request_id"])
paso("guarda el estado anterior (programada) y el nuevo (cancelada)", cancelacion["datos_anteriores"]["estado"] == "programada" and cancelacion["datos_nuevos"]["estado"] == "cancelada")
c, r = pedir("GET", "/api/configuracion/cambios?tabla=users", doc, esperado=200)
paso("las contraseñas nunca se guardan en el historial", r["cambios"] and all("password" not in (x["datos_nuevos"] or {}) and "password" not in (x["datos_anteriores"] or {}) for x in r["cambios"]))
pedir("GET", "/api/configuracion/cambios", pac, esperado=403)

print("7. Reparto del balanceador en esta prueba:", dict(instancias))
paso("las dos instancias atendieron peticiones", len(instancias) == 2)

print()
print("RESULTADO:", "TODO CORRECTO" if not fallos else f"{len(fallos)} FALLOS")
sys.exit(1 if fallos else 0)
