from Crypto.Cipher import AES
from Crypto.Util.Padding import unpad
import base64
from dotenv import load_dotenv
import os

load_dotenv()

secret_key = os.getenv("SECRET_KEY")

def decrypt(encrypted_text: str, secret_key: str) -> str:
    encrypted_bytes = base64.b64decode(encrypted_text)
    
    iv = encrypted_bytes[:16]
    ciphertext = encrypted_bytes[16:]

    cipher = AES.new(secret_key.encode('utf-8'), AES.MODE_CBC, iv)

    decrypted = unpad(cipher.decrypt(ciphertext), AES.block_size)

    return decrypted.decode('utf-8')