"""Migra una vez las credenciales a un almacén local protegido de Windows."""

from __future__ import annotations

import argparse
from pathlib import Path

from dotenv import dotenv_values

from .config import Settings, save_settings


def main() -> None:
    parser = argparse.ArgumentParser(description="Configurar la impresión independiente de presupuestos web")
    parser.add_argument("--from-env", type=Path, required=True, help="Archivo .env actual con credenciales IMAP y Xubio")
    args = parser.parse_args()
    if not args.from_env.is_file():
        raise FileNotFoundError(args.from_env)
    source = dotenv_values(args.from_env)
    settings = Settings(
        email_user=(source.get("FABRICAAPP_GMAIL_PRINT_IMAP_USER") or source.get("FABRICAAPP_GMAIL_PEDIDOS_IMAP_USER") or "").strip(),
        email_password=(source.get("FABRICAAPP_GMAIL_PRINT_IMAP_PASSWORD") or source.get("FABRICAAPP_GMAIL_IMAP_PASSWORD") or "").strip(),
        xubio_client_id=(source.get("FABRICAAPP_XUBIO_CLIENT_ID") or "").strip(),
        xubio_client_secret=(source.get("FABRICAAPP_XUBIO_CLIENT_SECRET") or "").strip(),
        imap_server=(source.get("FABRICAAPP_GMAIL_IMAP_SERVER") or "imap.gmail.com").strip(),
        imap_port=int(source.get("FABRICAAPP_GMAIL_IMAP_PORT") or 993),
    )
    if settings.email_user.lower() != "mymfibrofacil@gmail.com":
        raise RuntimeError("La casilla de avisos de impresión debe ser mymfibrofacil@gmail.com.")
    if not all((settings.email_password, settings.xubio_client_id, settings.xubio_client_secret)):
        raise RuntimeError("El archivo .env no contiene todas las credenciales necesarias.")
    save_settings(settings)
    print("Configuración local protegida creada para mymfibrofacil@gmail.com.")


if __name__ == "__main__":
    main()
