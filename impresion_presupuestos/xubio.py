"""Descarga el PDF del presupuesto ya creado en Xubio."""

from __future__ import annotations

import requests

from .config import Settings


TOKEN_URL = "https://xubio.com/API/1.1/TokenEndpoint"
PDF_URL = "https://xubio.com/API/1.1/imprimirPDF"


def get_token(settings: Settings) -> str:
    response = requests.post(
        TOKEN_URL,
        data={"grant_type": "client_credentials"},
        auth=(settings.xubio_client_id, settings.xubio_client_secret),
        timeout=30,
    )
    response.raise_for_status()
    token = response.json().get("access_token")
    if not token:
        raise RuntimeError("Xubio no devolvió un token de acceso.")
    return str(token)


def download_budget_pdf(token: str, transaccion_id: int) -> bytes:
    """Obtiene el documento existente; no crea ni modifica presupuestos."""
    response = requests.get(
        PDF_URL,
        headers={"accept": "application/json", "authorization": f"Bearer {token}"},
        params={"idtransaccion": transaccion_id, "tipoimpresion": 1},
        timeout=60,
    )
    response.raise_for_status()
    pdf_url = str(response.json().get("urlPdf") or "").strip()
    if not pdf_url.startswith("https://"):
        raise RuntimeError("Xubio no devolvió una URL HTTPS válida para el PDF.")
    pdf_response = requests.get(pdf_url, timeout=60)
    pdf_response.raise_for_status()
    if not pdf_response.content.startswith(b"%PDF-"):
        raise RuntimeError("Xubio no devolvió un PDF válido.")
    return pdf_response.content
