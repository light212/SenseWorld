"""
Encryption utilities for sensitive fields.
"""

from __future__ import annotations

import base64
import os

from cryptography.hazmat.primitives.ciphers.aead import AESGCM

from app.config import settings


def _load_key() -> bytes:
    """Load AES-256 key from settings."""
    if not settings.encryption_key:
        raise ValueError("ENCRYPTION_KEY is not configured")

    raw_key = settings.encryption_key.encode()
    try:
        decoded = base64.b64decode(settings.encryption_key)
        if len(decoded) == 32:
            return decoded
    except ValueError:
        decoded = b""

    if len(raw_key) == 32:
        return raw_key

    raise ValueError("ENCRYPTION_KEY must be 32 bytes (base64 or raw)")


def encrypt_text(plaintext: str) -> str:
    """Encrypt text with AES-256-GCM and return base64 string."""
    key = _load_key()
    aesgcm = AESGCM(key)
    nonce = os.urandom(12)
    ciphertext = aesgcm.encrypt(nonce, plaintext.encode(), None)
    return base64.b64encode(nonce + ciphertext).decode()


def decrypt_text(encrypted: str) -> str:
    """Decrypt base64 AES-256-GCM payload."""
    key = _load_key()
    data = base64.b64decode(encrypted)
    nonce, ciphertext = data[:12], data[12:]
    aesgcm = AESGCM(key)
    return aesgcm.decrypt(nonce, ciphertext, None).decode()


def mask_secret(value: str) -> str:
    """Mask a secret for display (e.g., sk-****1234)."""
    if len(value) < 8:
        return "****"
    return f"{value[:3]}****{value[-4:]}"
