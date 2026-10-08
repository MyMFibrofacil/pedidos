"""Registro local para no volver a enviar una orden ya procesada."""

from __future__ import annotations

import json
import os
from pathlib import Path

from .config import DATA_DIR


STATE_PATH = DATA_DIR / "procesados.json"


def load_processed() -> dict[str, int]:
    if not STATE_PATH.exists():
        return {}
    value = json.loads(STATE_PATH.read_text(encoding="utf-8"))
    if not isinstance(value, dict):
        raise RuntimeError("El registro de impresión local es inválido.")
    return {str(key): int(transaction_id) for key, transaction_id in value.items()}


def save_processed(processed: dict[str, int]) -> None:
    DATA_DIR.mkdir(parents=True, exist_ok=True)
    temporary = Path(str(STATE_PATH) + ".tmp")
    temporary.write_text(json.dumps(processed, ensure_ascii=False, indent=2), encoding="utf-8")
    os.replace(temporary, STATE_PATH)
