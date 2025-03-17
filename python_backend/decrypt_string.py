import os
from Crypto.Cipher import AES
from Crypto.Util.Padding import unpad
import base64
from dotenv import load_dotenv

load_dotenv()

secret_key = os.getenv('SECRET_KEY')
secret_buffer = os.getenv('SECRET_BUFFER')

if not secret_key or not secret_buffer:
    raise ValueError('SECRET_KEY or SECRET_BUFFER is missing in environment variables')

if len(secret_key) != 32:
    raise ValueError('SECRET_KEY must be 32 bytes')
if len(secret_buffer) != 16:
    raise ValueError('SECRET_BUFFER must be 16 bytes')

key = bytes(secret_key, 'utf-8')
iv = bytes(secret_buffer, 'utf-8')

def decrypt_string(encrypted_text: str) -> str:
    cipher = AES.new(key, AES.MODE_CBC, iv)
    encrypted_bytes = bytes.fromhex(encrypted_text)
    decrypted = unpad(cipher.decrypt(encrypted_bytes), AES.block_size)
    return decrypted.decode('utf-8')

def decrypt_base64(encrypted_text: str) -> str:
    cipher = AES.new(key, AES.MODE_CBC, iv)
    encrypted_bytes = base64.b64decode(encrypted_text)
    decrypted = unpad(cipher.decrypt(encrypted_bytes), AES.block_size)
    return decrypted.decode('utf-8')