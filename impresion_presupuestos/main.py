"""Punto de entrada de la tarea independiente de impresión de Bongiovanni."""

from __future__ import annotations

import argparse
import logging
import sys

from .config import DATA_DIR, load_settings
from .mailbox import mark_seen, open_mailbox, pending_ids, read_job
from .printer import check_printer, submit_pdf
from .state import load_processed, save_processed
from .xubio import download_budget_pdf, get_token


LOGGER = logging.getLogger("impresion_presupuestos")


def run(*, check_only: bool = False) -> int:
    settings = load_settings()
    check_printer(settings)
    with open_mailbox(settings) as mailbox:
        if check_only:
            get_token(settings)
            LOGGER.info("Conexiones IMAP y Xubio verificadas; impresora: %s", settings.printer_name)
            return 0
        processed = load_processed()
        token = None
        failures = 0
        message_ids = pending_ids(mailbox)
        if not message_ids:
            LOGGER.info("No hay avisos de impresión pendientes.")
        for uid in message_ids:
            try:
                job = read_job(mailbox, uid)
                order_id = str(job["orderId"])
                transaccion_id = int(job["transaccionId"])
                if order_id not in processed:
                    token = token or get_token(settings)
                    pdf = download_budget_pdf(token, transaccion_id)
                    submit_pdf(settings, transaccion_id, pdf)
                    processed[order_id] = transaccion_id
                    save_processed(processed)
                    LOGGER.info("Presupuesto enviado a impresión: transaccion=%s pedido=%s", transaccion_id, order_id)
                elif processed[order_id] != transaccion_id:
                    raise RuntimeError("El pedido ya figura impreso con otra transacción de Xubio.")
                mark_seen(mailbox, uid)
            except Exception:
                failures += 1
                LOGGER.exception("No se pudo procesar el aviso de impresión UID=%s", uid.decode(errors="replace"))
        return 1 if failures else 0


def main() -> int:
    parser = argparse.ArgumentParser(description="Imprimir presupuestos Bongiovanni sin FabricaApp")
    parser.add_argument("--check", action="store_true", help="Verificar conexiones sin imprimir ni modificar correos")
    args = parser.parse_args()
    DATA_DIR.mkdir(parents=True, exist_ok=True)
    logging.basicConfig(
        filename=DATA_DIR / "impresion.log",
        level=logging.INFO,
        format="%(asctime)s %(levelname)s %(message)s",
        encoding="utf-8",
    )
    try:
        return run(check_only=args.check)
    except Exception:
        LOGGER.exception("Falló la ejecución de la tarea de impresión")
        return 1


if __name__ == "__main__":
    sys.exit(main())
