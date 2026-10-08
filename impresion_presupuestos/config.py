"""Configuración local y credenciales protegidas del proceso de impresión."""

from __future__ import annotations

import json
import os
from dataclasses import dataclass
from pathlib import Path

import win32crypt


DATA_DIR = Path(os.environ.get("LOCALAPPDATA", Path.home() / "AppData" / "Local")) / "PedidosMedida" / "impresion_presupuestos"
SETTINGS_PATH = DATA_DIR / "config.json"
CREDENTIALS_PATH = DATA_DIR / "credenciales.dpapi"


@dataclass(frozen=True)
class Settings:
    email_user: str
    email_password: str
    xubio_client_id: str
    xubio_client_secret: str
    printer_name: str = "Impresora Pablo Nico"
    imap_server: str = "imap.gmail.com"
    imap_port: int = 993


def save_settings(settings: Settings) -> None:
    """Guarda secretos cifrados para el usuario actual de Windows."""
    DATA_DIR.mkdir(parents=True, exist_ok=True)
    public = {
        "email_user": settings.email_user,
        "printer_name": settings.printer_name,
        "imap_server": settings.imap_server,
        "imap_port": settings.imap_port,
    }
    secrets = {
        "email_password": settings.email_password,
        "xubio_client_id": settings.xubio_client_id,
        "xubio_client_secret": settings.xubio_client_secret,
    }
    SETTINGS_PATH.write_text(json.dumps(public, ensure_ascii=False, indent=2), encoding="utf-8")
    CREDENTIALS_PATH.write_bytes(
        win32crypt.CryptProtectData(json.dumps(secrets).encode("utf-8"), "Pedidos Medida", None, None, None, 0)
    )


def load_settings() -> Settings:
    """Lee la configuración sin necesitar archivos de FabricaApp."""
    if not SETTINGS_PATH.exists() or not CREDENTIALS_PATH.exists():
        raise RuntimeError("Falta configurar la impresión local; ejecutá setup.py.")
    public = json.loads(SETTINGS_PATH.read_text(encoding="utf-8"))
    _, cleartext = win32crypt.CryptUnprotectData(CREDENTIALS_PATH.read_bytes(), None, None, None, 0)
    secrets = json.loads(cleartext.decode("utf-8"))
    settings = Settings(**public, **secrets)
    if not all((settings.email_user, settings.email_password, settings.xubio_client_id, settings.xubio_client_secret)):
        raise RuntimeError("La configuración de impresión tiene credenciales incompletas.")
    return settings
