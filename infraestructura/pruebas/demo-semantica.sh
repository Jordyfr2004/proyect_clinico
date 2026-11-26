#!/usr/bin/env bash
# Demostración en vivo de la capa de intercambio de información semántica (HL7 FHIR).
# Práctica de William Cabrera. Guía completa:
#   backend-api/docs/practica-capa-semantica-cita-medica.md
#
# Uso:  ./demo-semantica.sh [URL_BALANCEADOR]
#       ./demo-semantica.sh                         # http://100.102.99.114
#       ./demo-semantica.sh http://127.0.0.1:8000   # backend local (ensayo)
#
# Variables opcionales:
#   DOCTORA_USUARIO=doctora   DOCTORA_CLAVE=...   (si falta la clave, la pide sin mostrarla)
#   PACIENTE_CEDULA=13...     usar ese paciente   (por defecto, el primero que tenga cédula)
#   DIAS=7                    la cita se crea dentro de DIAS días, de 07:00 en adelante
#   SIN_PAUSAS=1              no espera Enter entre pasos (para ensayar)
#   MANTENER_CITA=1           no borra la cita de prueba al terminar
#
# Requiere: bash, curl y python3. No modifica nada más que la cita de prueba,
# que se borra al final (también si se interrumpe con Ctrl+C).
set -uo pipefail

URL="${1:-http://100.102.99.114}"
API="${URL%/}/api"
USUARIO="${DOCTORA_USUARIO:-doctora}"
DIAS="${DIAS:-7}"
TMP="$(mktemp -d)"
TOKEN=""
CITA_ID=""

# ---------- utilidades ----------
c_titulo=$'\033[1;36m'; c_ok=$'\033[1;32m'; c_mal=$'\033[1;31m'; c_nota=$'\033[0;33m'; c_fin=$'\033[0m'

titulo() { printf '\n%s━━ %s ━━%s\n' "$c_titulo" "$1" "$c_fin"; }
ok()     { printf '%s✔ %s%s\n' "$c_ok" "$1" "$c_fin"; }
nota()   { printf '%s➜ %s%s\n' "$c_nota" "$1" "$c_fin"; }
falla()  { printf '%s✘ %s%s\n' "$c_mal" "$1" "$c_fin"; }
pausa()  { [[ "${SIN_PAUSAS:-0}" == 1 ]] || read -rp $'\n   [Enter] para continuar... ' _; }
bonito() { python3 -c 'import json,sys; print(json.dumps(json.load(sys.stdin), indent=2, ensure_ascii=False))' 2>/dev/null || cat; }
# Lee un valor del último JSON recibido: leer 'd["data"][0]["cedula"]'
leer()   { python3 -c "import json,sys; d=json.load(open(sys.argv[1])); print($1)" "$TMP/cuerpo" 2>/dev/null; }

# pedir MÉTODO RUTA [archivo_json] [content-type]  -> deja CODIGO, $TMP/cuerpo y $TMP/cabeceras
pedir() {
    local metodo="$1" ruta="$2" archivo="${3:-}" tipo="${4:-application/fhir+json}"
    local args=(-s -m 20 -X "$metodo" -o "$TMP/cuerpo" -D "$TMP/cabeceras" -w '%{http_code}'
                -H 'Accept: application/fhir+json, application/json')
    [[ -n "$TOKEN" ]] && args+=(-H "Authorization: Bearer $TOKEN")
    [[ -n "$archivo" ]] && args+=(-H "Content-Type: $tipo" --data-binary "@$archivo")
    CODIGO="$(curl "${args[@]}" "$API$ruta")" || CODIGO=000
}
cabecera() { grep -i "^$1:" "$TMP/cabeceras" | head -1 | cut -d' ' -f2- | tr -d '\r'; }
instancia() { local i; i="$(cabecera X-Backend-Instance)"; [[ -n "$i" ]] && printf '   (atendió %s)\n' "$i"; }

limpiar() {
    if [[ -n "$CITA_ID" && "${MANTENER_CITA:-0}" != 1 && -n "$TOKEN" ]]; then
        curl -s -m 10 -o /dev/null -X DELETE -H 'Accept: application/json' \
             -H "Authorization: Bearer $TOKEN" "$API/agenda/$CITA_ID" \
            && printf '\n%s✔ Cita de prueba %s borrada.%s\n' "$c_ok" "$CITA_ID" "$c_fin"
    fi
    rm -rf "$TMP"
}
trap limpiar EXIT
trap 'echo; exit 130' INT

# ---------- 0. el sistema responde ----------
titulo "0. Estado del sistema ($URL)"
pedir GET /health
if [[ "$CODIGO" == 000 ]]; then
    falla "No hay respuesta de $URL. ¿Tailscale conectado? ¿NGINX activo (sudo systemctl status nginx)?"
    exit 1
fi
bonito <"$TMP/cuerpo"; instancia
estado="$(leer 'd["estado"]')"
case "$estado" in
    ok)        ok "Base de datos y archivos en línea." ;;
    degradado) nota "El servidor de archivos (L5) no responde. La demostración no lo necesita: se continúa." ;;
    *)         falla "El backend no llega a la base de datos (HTTP $CODIGO). Revise L4 (PostgreSQL) antes de seguir."; exit 1 ;;
esac

# ---------- 1. sesión de la doctora ----------
titulo "1. Inicio de sesión de la doctora"
if [[ -z "${DOCTORA_CLAVE:-}" ]]; then
    read -rsp "   Clave de '$USUARIO': " DOCTORA_CLAVE; echo
fi
python3 -c 'import json,sys; print(json.dumps({"username": sys.argv[1], "password": sys.argv[2]}))' \
    "$USUARIO" "$DOCTORA_CLAVE" >"$TMP/login.json"
pedir POST /auth/login "$TMP/login.json" application/json
rm -f "$TMP/login.json"
TOKEN="$(leer 'd["access_token"]')"
if [[ "$CODIGO" != 200 || -z "$TOKEN" ]]; then
    falla "Login rechazado (HTTP $CODIGO): $(leer 'd.get("message","")')"
    nota "Si dice 'verificar tu correo': la cuenta de la doctora no está verificada (ver la guía, sección Problemas)."
    exit 1
fi
ok "Sesión iniciada como $USUARIO."

pedir GET /semantica/vocabulario
if [[ "$CODIGO" == 404 ]]; then
    falla "El backend no tiene la capa semántica: falta la rama practica-semantica-cita-medica en la L3."
    exit 1
fi

# ---------- 2. vocabulario ----------
titulo "2. Vocabulario compartido (qué significa cada dato)"
nota "Cada valor interno se asocia a un código de un vocabulario público identificado por su URI."
leer 'json.dumps({"estandar": d["estandar"], "zona_horaria": d["zona_horaria"], "estados": d["estados"], "no_se_comparten": d["no_se_comparten"]}, indent=2, ensure_ascii=False)'
pausa

# ---------- 3. cita que llega de otro sistema ----------
titulo "3. Otro sistema envía una cita en HL7 FHIR"
if [[ -n "${PACIENTE_CEDULA:-}" ]]; then
    CEDULA="$PACIENTE_CEDULA"
else
    pedir GET /pacientes
    CEDULA="$(leer 'next((p["cedula"] for p in d.get("data", []) if p.get("cedula")), "")')"
fi
if [[ -z "$CEDULA" ]]; then
    falla "No hay pacientes con cédula. Registre uno desde la web (Pacientes → Nuevo) y vuelva a ejecutar."
    exit 1
fi

# Arma la cita: el día local (Ecuador) dentro de DIAS días, expresada en UTC (Z).
generar() {  # generar HORA_LOCAL archivo
    python3 - "$CEDULA" "$DIAS" "$1" >"$2" <<'PY'
import json, sys
from datetime import datetime, timedelta, timezone
from zoneinfo import ZoneInfo
cedula, dias, hora = sys.argv[1], int(sys.argv[2]), int(sys.argv[3])
ec = ZoneInfo("America/Guayaquil")
dia = (datetime.now(ec) + timedelta(days=dias)).date()
ini = datetime(dia.year, dia.month, dia.day, hora, 0, tzinfo=ec).astimezone(timezone.utc)
fin = ini + timedelta(minutes=30)
z = lambda t: t.strftime("%Y-%m-%dT%H:%M:%SZ")
print(json.dumps({
    "resourceType": "Appointment",
    "status": "booked",
    "serviceCategory": [{"coding": [{"system": "http://terminology.hl7.org/CodeSystem/service-category", "code": "10", "display": "Dental"}]}],
    "description": "Cita enviada por un sistema externo (demostración FHIR)",
    "start": z(ini), "end": z(fin),
    "participant": [{"actor": {"type": "Patient", "identifier": {"system": "urn:proyect-clinico:cedula-ecuador", "value": cedula}}, "status": "accepted"}],
}, indent=2, ensure_ascii=False))
PY
}

for hora in 7 8 9 10 11 12 13 14 15 16 17; do
    generar "$hora" "$TMP/entrada.json"
    pedir POST /semantica/fhir/Appointment "$TMP/entrada.json"
    [[ "$CODIGO" == 409 ]] || break
done
cat "$TMP/entrada.json"
nota "El paciente viene por CÉDULA (no conocen nuestro código interno) y la hora en UTC (Z)."
pausa

titulo "4. Respuesta de la clínica: HTTP $CODIGO"
if [[ "$CODIGO" != 201 ]]; then
    bonito <"$TMP/cuerpo"
    falla "Se esperaba 201."
    exit 1
fi
bonito <"$TMP/cuerpo"; instancia
CITA_ID="$(leer 'd["id"]')"
FECHA="$(leer 'd["start"][:10]')"
cp "$TMP/entrada.json" "$TMP/repetir.json"
ok "Location: $(cabecera Location)"
nota "La misma cita, ya interpretada: start $(leer 'd["start"]') (hora local de Ecuador)."
nota "El paciente quedó identificado con nuestro código: $(leer 'd["participant"][0]["actor"]["identifier"]["value"]') · $(leer 'd["participant"][0]["actor"].get("display","")')."
nota "Ahora abran la web de la doctora → Agenda → $FECHA: la cita está ahí."
pausa

# ---------- 5. exportar ----------
titulo "5. La clínica publica las citas del $FECHA como Bundle FHIR"
pedir GET "/semantica/fhir/Appointment?date=$FECHA"
leer 'json.dumps({"resourceType": d["resourceType"], "type": d["type"], "total": d["total"], "citas": [{"status": e["resource"]["status"], "start": e["resource"].get("start"), "paciente": e["resource"]["participant"][0]["actor"].get("display")} for e in d["entry"]]}, indent=2, ensure_ascii=False)'
nota "No viajan diagnóstico, tratamiento ni entradas personales de la doctora."
pausa

# ---------- 6. datos sin significado ----------
titulo "6. Un sistema envía datos que no significan nada para la clínica"
cat >"$TMP/invalida.json" <<'JSON'
{
  "resourceType": "Appointment",
  "status": "arrived-late",
  "serviceCategory": [{"coding": [{"system": "http://terminology.hl7.org/CodeSystem/service-category", "code": "27", "display": "Mental Health"}]}],
  "start": "2026-11-20 10:00",
  "end": "2026-11-20T10:30:00-05:00",
  "participant": [{"actor": {"type": "Patient", "identifier": {"system": "urn:otro-hospital:historia-clinica", "value": "9"}}}]
}
JSON
cat "$TMP/invalida.json"
pausa
pedir POST /semantica/fhir/Appointment "$TMP/invalida.json"
printf 'HTTP %s\n' "$CODIGO"
bonito <"$TMP/cuerpo"
[[ "$CODIGO" == 422 ]] && ok "Rechazada con 4 problemas a la vez (OperationOutcome) y sin guardar nada."
pausa

# ---------- 7. conflicto ----------
titulo "7. La misma cita otra vez → el horario ya está ocupado"
pedir POST /semantica/fhir/Appointment "$TMP/repetir.json"
printf 'HTTP %s\n' "$CODIGO"
bonito <"$TMP/cuerpo"
[[ "$CODIGO" == 409 ]] && ok "La regla de negocio es la misma que usan la web y el móvil."

titulo "Fin de la demostración"
