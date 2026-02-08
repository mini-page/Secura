import base64
import os
from cryptography.hazmat.primitives.ciphers.aead import AESGCM


def _load_key() -> bytes:
    key_b64 = os.getenv('AES_KEY_BASE64')
    if key_b64:
        return base64.b64decode(key_b64)
    # Dev fallback: generate a volatile key (do not use in production)
    return AESGCM.generate_key(bit_length=256)


_KEY = _load_key()


def encrypt_bytes(raw: bytes) -> bytes:
    nonce = os.urandom(12)
    aes = AESGCM(_KEY)
    cipher = aes.encrypt(nonce, raw, None)
    return nonce + cipher


def decrypt_bytes(payload: bytes) -> bytes:
    nonce = payload[:12]
    cipher = payload[12:]
    aes = AESGCM(_KEY)
    return aes.decrypt(nonce, cipher, None)
