"""Pruebas aisladas del aviso y del envío a impresión independiente."""

from __future__ import annotations

import unittest
from contextlib import contextmanager
from email.message import EmailMessage
from unittest.mock import MagicMock, patch

from impresion_presupuestos import mailbox as mail, main as worker


def make_notice(client_key: str = "5482024", customer: str = "Bongiovanni") -> bytes:
    message = EmailMessage()
    message["Subject"] = f"[IMPRIMIR XUBIO] {customer} - 08/10/2026"
    message.set_content(
        'Orden interna\nXUBIO_PRINT_JOB: '
        f'{{"transaccionId":123,"orderId":"pedido-1","clientKey":"{client_key}"}}'
    )
    return message.as_bytes()


class PrintFlowTests(unittest.TestCase):
    def test_acepta_cuatro_clientes_y_rechaza_rivadavia(self):
        inbox = MagicMock()
        for client_id, customer in (
            ("5482024", "Bongiovanni"),
            ("5481719", "Moreira"),
            ("5482182", "Valeria Lotz"),
            ("5481712", "Pedido Alan Alfonsín"),
        ):
            inbox.uid.return_value = ("OK", [(b"1 (BODY[] {100}", make_notice(client_id, customer))])
            job = mail.read_job(inbox, b"1")
            self.assertEqual(job["transaccionId"], 123)
            self.assertEqual(job["clientId"], client_id)
            inbox.uid.assert_called_with("fetch", b"1", "(BODY.PEEK[])")
        inbox.uid.return_value = ("OK", [(b"1 (BODY[] {100}", make_notice("7756831", "Rivadavia"))])
        with self.assertRaises(RuntimeError):
            mail.read_job(inbox, b"1")

    def test_impresion_y_confirmacion_en_orden(self):
        events = []
        inbox = MagicMock()

        @contextmanager
        def opened(_settings):
            yield inbox

        with patch.object(worker, "load_settings", return_value=MagicMock()), \
             patch.object(worker, "check_printer"), \
             patch.object(worker, "open_mailbox", opened), \
             patch.object(worker, "pending_ids", return_value=[b"1"]), \
             patch.object(worker, "read_job", return_value={"transaccionId": 123, "orderId": "pedido-1", "clientId": "5481719"}), \
             patch.object(worker, "load_processed", return_value={}), \
             patch.object(worker, "get_token", return_value="token"), \
             patch.object(worker, "download_budget_pdf", return_value=b"%PDF-1"), \
             patch.object(worker, "submit_pdf", side_effect=lambda *_: events.append("print")), \
             patch.object(worker, "save_processed", side_effect=lambda *_: events.append("state")), \
             patch.object(worker, "mark_seen", side_effect=lambda *_: events.append("seen")):
            self.assertEqual(worker.run(), 0)
        self.assertEqual(events, ["print", "state", "seen"])

    def test_error_de_impresion_deja_correo_pendiente(self):
        inbox = MagicMock()

        @contextmanager
        def opened(_settings):
            yield inbox

        with patch.object(worker, "load_settings", return_value=MagicMock()), \
             patch.object(worker, "check_printer"), \
             patch.object(worker, "open_mailbox", opened), \
             patch.object(worker, "pending_ids", return_value=[b"1"]), \
             patch.object(worker, "read_job", return_value={"transaccionId": 123, "orderId": "pedido-1", "clientId": "5482182"}), \
             patch.object(worker, "load_processed", return_value={}), \
             patch.object(worker, "get_token", return_value="token"), \
             patch.object(worker, "download_budget_pdf", side_effect=RuntimeError("sin PDF")), \
             patch.object(worker, "submit_pdf") as submit, \
             patch.object(worker, "mark_seen") as seen:
            self.assertEqual(worker.run(), 1)
        submit.assert_not_called()
        seen.assert_not_called()


if __name__ == "__main__":
    unittest.main()
