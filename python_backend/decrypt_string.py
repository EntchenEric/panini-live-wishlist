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

def decrypt_string(encrypted_text: str) -> str:
    """Decrypt AES-256-GCM format: iv:authTag:ciphertext"""
    parts = encrypted_text.split(':')

    if len(parts) != 3:
        raise ValueError('Invalid encrypted format. Expected GCM format: iv:authTag:ciphertext')

    iv = bytes.fromhex(parts[0])
    auth_tag = bytes.fromhex(parts[1])
    ciphertext = bytes.fromhex(parts[2])

    cipher = AES.new(key, AES.MODE_GCM, nonce=iv)
    decrypted = cipher.decrypt_and_verify(ciphertext, auth_tag)
    return decrypted.decode('utf-8')