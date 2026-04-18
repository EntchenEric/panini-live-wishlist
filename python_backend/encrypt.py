import os
from Crypto.Cipher import AES
from dotenv import load_dotenv

load_dotenv()

secret_key = os.getenv('SECRET_KEY')

if not secret_key:
    raise ValueError('SECRET_KEY is missing in environment variables')

if len(secret_key) != 32:
    raise ValueError('SECRET_KEY must be 32 bytes')

key = bytes(secret_key, 'utf-8')

def encrypt(text: str) -> str:
    """Encrypt using AES-256-GCM with random IV. Format: iv:authTag:ciphertext (all hex)"""
    iv = os.urandom(12)
    cipher = AES.new(key, AES.MODE_GCM, nonce=iv)
    ciphertext, auth_tag = cipher.encrypt_and_digest(text.encode('utf-8'))
    return f"{iv.hex()}:{auth_tag.hex()}:{ciphertext.hex()}"