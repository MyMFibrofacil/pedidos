"""Lee avisos de los clientes autorizados y confirma los ya impresos."""

from __future__ import annotations

import email
import imaplib
import json
import re
from contextlib import contextmanager
from email.message import Message
from typing import Iterator

from .config import Settings


PRINT_JOB_PATTERN = re.compile(r"^XUBIO_PRINT_JOB:\s*(\{.+\})\s*$", re.MULTILINE)
SEARCH_QUERY = '(UNSEEN SUBJECT "IMPRIMIR XUBIO")'
CLIENT_SUBJECTS = {
    "5481719": "MOREIRA",
    "5482182": "VALERIA LOTZ",
    "5481712": "ALAN ALFONSÍN",
    "5482024": "BONGIOVANNI",
}


@contextmanager
def open_mailbox(settings: Settings) -> Iterator[imaplib.IMAP4_SSL]:
    """Abre INBOX y conserva los mensajes sin leer hasta confirmar impresión."""
    mailbox = imaplib.IMAP4_SSL(settings.imap_server, settings.imap_port)
    try:
        mailbox.login(settings.email_user, settings.email_password)
        status, _ = mailbox.select("INBOX")
        if status != "OK":
            raise RuntimeError("No se pudo abrir INBOX para imprimir presupuestos.")
        yield mailbox
    finally:
        try:
            mailbox.logout()
        except Exception:
            pass


def pending_ids(mailbox: imaplib.IMAP4_SSL) -> list[bytes]:
    status, data = mailbox.uid("search", None, SEARCH_QUERY)
    if status != "OK" or not data:
        raise RuntimeError("No se pudieron buscar los avisos de impresión.")
    return (data[0] or b"").split()


def read_job(mailbox: imaplib.IMAP4_SSL, uid: bytes) -> dict[str, str | int]:
    """Valida la transacción y el cliente indicado en el aviso interno."""
    status, data = mailbox.uid("fetch", uid, "(BODY.PEEK[])")
    if status != "OK" or not data or not isinstance(data[0], tuple):
        raise RuntimeError(f"No se pudo leer el aviso de impresión {uid.decode()}.")
    message: Message = email.message_from_bytes(data[0][1])
    subject = str(email.header.make_header(email.header.decode_header(message.get("Subject", ""))))
    if "IMPRIMIR XUBIO" not in subject.upper():
        raise RuntimeError("El asunto no corresponde a una orden de impresión.")
    body_parts = []
    for part in message.walk():
        if part.get_content_type() == "text/plain" and part.get_content_disposition() != "attachment":
            body_parts.append((part.get_payload(decode=True) or b"").decode(part.get_content_charset() or "utf-8", errors="replace"))
    match = PRINT_JOB_PATTERN.search("\n".join(body_parts))
    if not match:
        raise RuntimeError("El aviso no contiene XUBIO_PRINT_JOB.")
    try:
        payload = json.loads(match.group(1))
        transaccion_id = int(payload["transaccionId"])
        order_id = str(payload["orderId"]).strip()
        client_key = str(payload["clientKey"]).strip()
    except (ValueError, TypeError, KeyError, json.JSONDecodeError) as exc:
        raise RuntimeError("El aviso contiene datos de impresión inválidos.") from exc
    client_subject = CLIENT_SUBJECTS.get(client_key)
    if transaccion_id <= 0 or not order_id or not client_subject or client_subject not in subject.upper():
        raise RuntimeError("La orden de impresión no corresponde a un cliente habilitado.")
    return {"transaccionId": transaccion_id, "orderId": order_id, "clientId": client_key}


def mark_seen(mailbox: imaplib.IMAP4_SSL, uid: bytes) -> None:
    status, _ = mailbox.uid("store", uid, "+FLAGS", "\\Seen")
    if status != "OK":
        raise RuntimeError(f"No se pudo confirmar como leído el aviso {uid.decode()}.")
