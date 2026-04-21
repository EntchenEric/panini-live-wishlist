"""Manual login test — runs Selenium against the real Panini website."""
import os
import sys

os.environ.setdefault('SECRET_KEY', 'k0N33m31cmxSjPvHRF2Zo1sCV3d3YzLz')
os.environ.setdefault('FLASK_API_KEY', 'xC0jpasMkZBvGKzTurHXdhoSApXAMO9voyL9nQ9FQB0WmfoyffouJNTQKA87uaqT7IHKjVjre4JF1kN6mMZbW8vOB7mkp1M2vFTU7mXitAmjTSeOzg6NWb4ldUUvpGX')
os.environ.setdefault('FRONTEND_URL', 'http://localhost:3000')

from encrypt import encrypt
from test_account import handle_login

email = sys.argv[1] if len(sys.argv) > 1 else input("Email: ")
password = sys.argv[2] if len(sys.argv) > 2 else input("Password: ")

print(f"\n--- Testing login for {email[:3]}*** ---")
result = handle_login(email, password)
print(f"\nResult: {result}")