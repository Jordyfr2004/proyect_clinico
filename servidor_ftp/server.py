import ipaddress
import logging
import os
import sys
from logging.handlers import RotatingFileHandler
from pathlib import Path

from pyftpdlib.authorizers import DummyAuthorizer
from pyftpdlib.handlers import FTPHandler
from pyftpdlib.servers import FTPServer


BASE_DIR = Path(__file__).resolve().parent

logger = logging.getLogger("servidor_ftp")


def cargar_env(ruta):
    """Carga variables desde un archivo .env sin sobrescribir las del sistema."""
    if not ruta.exists():
        return

    for linea in ruta.read_text(encoding="utf-8").splitlines():
        linea = linea.strip()

        if not linea or linea.startswith("#") or "=" not in linea:
            continue

        clave, valor = linea.split("=", 1)
        os.environ.setdefault(clave.strip(), valor.strip().strip("\"'"))


def obligatoria(nombre):
    valor = os.environ.get(nombre, "").strip()

    if not valor:
        sys.exit(f"Falta la variable de entorno {nombre} (ver .env.example).")

    return valor


def leer_redes(valor):
    """Convierte '192.168.1.30,100.64.0.0/10' en una lista de redes."""
    redes = []

    for parte in valor.split(","):
        parte = parte.strip()

        if parte:
            redes.append(ipaddress.ip_network(parte, strict=False))

    return redes


def leer_puertos(valor):
    """Convierte '60000-60100' en un rango de puertos pasivos."""
    inicio, _, fin = valor.partition("-")

    return range(int(inicio), int(fin or inicio) + 1)


def configurar_logs(ruta_log):
    formato = logging.Formatter("%(asctime)s [%(levelname)s] %(name)s: %(message)s")

    consola = logging.StreamHandler()
    consola.setFormatter(formato)

    ruta_log.parent.mkdir(parents=True, exist_ok=True)
    archivo = RotatingFileHandler(
        ruta_log, maxBytes=5 * 1024 * 1024, backupCount=5, encoding="utf-8"
    )
    archivo.setFormatter(formato)

    for nombre in ("pyftpdlib", "servidor_ftp"):
        registro = logging.getLogger(nombre)
        registro.setLevel(logging.INFO)
        registro.addHandler(consola)
        registro.addHandler(archivo)


class ClinicaFTPHandler(FTPHandler):
    # Redes autorizadas a conectarse (backend). Vacío = cualquiera.
    redes_permitidas = []

    def on_connect(self):
        if not self.redes_permitidas:
            return

        ip = ipaddress.ip_address(self.remote_ip)

        if not any(ip in red for red in self.redes_permitidas):
            logger.warning("Conexión rechazada desde %s: IP no autorizada", self.remote_ip)
            self.respond("421 Acceso no autorizado.")
            self.close_when_done()

    def on_login(self, username):
        logger.info("Inicio de sesión de %s desde %s", username, self.remote_ip)

    def on_login_failed(self, username, password):
        logger.warning("Inicio de sesión fallido de %s desde %s", username, self.remote_ip)

    def on_file_received(self, file):
        logger.info("Archivo recibido: %s", file)

    def on_incomplete_file_received(self, file):
        # Evita dejar archivos a medias si se corta la conexión.
        logger.warning("Archivo incompleto eliminado: %s", file)
        os.remove(file)


def main():
    cargar_env(BASE_DIR / ".env")

    host = os.environ.get("FTP_HOST", "0.0.0.0")
    puerto = int(os.environ.get("FTP_PORT", "2121"))
    usuario = obligatoria("FTP_USER")
    password = obligatoria("FTP_PASSWORD")
    directorio = Path(os.environ.get("FTP_DIR", BASE_DIR / "archivos")).resolve()
    ruta_log = Path(os.environ.get("FTP_LOG", BASE_DIR / "logs" / "ftp.log"))

    configurar_logs(ruta_log)
    directorio.mkdir(parents=True, exist_ok=True)

    authorizer = DummyAuthorizer()
    # Permisos completos: el backend sube, lee, renombra y elimina archivos.
    authorizer.add_user(usuario, password, str(directorio), perm="elradfmwMT")

    handler = ClinicaFTPHandler
    handler.authorizer = authorizer
    handler.banner = "Servicio de Archivos - Proyecto Clinico"
    handler.redes_permitidas = leer_redes(os.environ.get("FTP_ALLOWED_IPS", ""))
    handler.passive_ports = leer_puertos(os.environ.get("FTP_PASSIVE_PORTS", "60000-60100"))
    handler.masquerade_address = os.environ.get("FTP_MASQUERADE_ADDRESS") or None
    handler.timeout = int(os.environ.get("FTP_IDLE_TIMEOUT", "300"))

    server = FTPServer((host, puerto), handler)
    server.max_cons = int(os.environ.get("FTP_MAX_CONS", "100"))
    server.max_cons_per_ip = int(os.environ.get("FTP_MAX_CONS_PER_IP", "20"))

    logger.info("Servidor de archivos escuchando en %s:%s", host, puerto)
    logger.info("Directorio de archivos: %s", directorio)
    logger.info(
        "IPs autorizadas: %s",
        ", ".join(str(red) for red in handler.redes_permitidas) or "todas",
    )

    try:
        server.serve_forever()
    except KeyboardInterrupt:
        logger.info("Servidor de archivos detenido")
    finally:
        server.close_all()


if __name__ == "__main__":
    main()
