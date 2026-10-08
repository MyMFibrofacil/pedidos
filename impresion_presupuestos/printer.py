"""Envía el PDF al controlador de impresión predeterminado de Windows."""

from __future__ import annotations

import os
from pathlib import Path

import win32print

from .config import DATA_DIR, Settings


def check_printer(settings: Settings) -> None:
    actual = win32print.GetDefaultPrinter()
    if actual != settings.printer_name:
        raise RuntimeError(f"La impresora predeterminada es {actual!r}; se esperaba {settings.printer_name!r}.")


def submit_pdf(settings: Settings, transaccion_id: int, pdf_data: bytes) -> Path:
    """Conserva el PDF porque el lector de Windows puede imprimirlo de forma asíncrona."""
    check_printer(settings)
    pdf_dir = DATA_DIR / "pdf_enviados"
    pdf_dir.mkdir(parents=True, exist_ok=True)
    pdf_path = pdf_dir / f"presupuesto_{transaccion_id}.pdf"
    pdf_path.write_bytes(pdf_data)
    try:
        os.startfile(str(pdf_path), "print")
    except OSError as exc:
        raise RuntimeError(f"Windows no pudo enviar el presupuesto {transaccion_id} a imprimir: {exc}") from exc
    return pdf_path
