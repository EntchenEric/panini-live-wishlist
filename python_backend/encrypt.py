import os
from Crypto.Cipher import AES
from Crypto.Util.Padding import pad
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

def encrypt(text: str) -> str:
    cipher = AES.new(key, AES.MODE_CBC, iv)
    encrypted = cipher.encrypt(pad(text.encode('utf-8'), AES.block_size))
    return encrypted.hex()

def encrypt_base64(text: str) -> str:
    cipher = AES.new(key, AES.MODE_CBC, iv)
    encrypted = cipher.encrypt(pad(text.encode('utf-8'), AES.block_size))
    return base64.b64encode(encrypted).decode('utf-8')