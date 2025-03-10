from Crypto.Cipher import AES
from Crypto.Util.Padding import pad
import base64
from dotenv import load_dotenv
import os

load_dotenv()

secret_key = os.getenv("SECRET_KEY")

def encrypt(text: str) -> str:
    key = secret_key.encode('utf-8')
    while len(key) < 32:
        key += b'\0' 

    iv = os.urandom(AES.block_size)

    cipher = AES.new(key, AES.MODE_CBC, iv)

    encrypted = cipher.encrypt(pad(text.encode('utf-8'), AES.block_size))

    encrypted_bytes = iv + encrypted
    encrypted_base64 = base64.b64encode(encrypted_bytes).decode('utf-8')

    return encrypted_base64