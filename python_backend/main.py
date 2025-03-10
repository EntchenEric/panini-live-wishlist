from flask import Flask, request, jsonify
from test_account import handle_login
from send_wishlist import send_wishlist
from get_wishlist import get_wishlist
from encrypt import encrypt
from decrypt import decrypt
from flask_cors import CORS

app = Flask(__name__)
CORS(app)

@app.route('/test_account', methods=['POST'])
def login():
    data = request.json
    email = data.get('email')
    password = data.get('password')

    email = decrypt(email)
    password = decrypt(password)

    if not email or not password:
        return jsonify({"error": "Email and password are required"}), 400

    try:
        result = handle_login(email, password)
        if result == "Login failed":
            return jsonify({"message": "Login failed"}), 400
        return jsonify({"message": "Login successful"}), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/send_wishlist', methods=['POST'])
def send_wishlist_api():
    data = request.json
    email = data.get('email')
    password = data.get('password')

    email = decrypt(email)
    password = decrypt(password)

    if not email or not password:
        return jsonify({"error": "Email and password are required"}), 400

    try:
        result = send_wishlist(email, password)
        if result == "Login failed":
            return jsonify({"message": "Login failed"}), 400
        return jsonify({"message": "Wishlist send successfull"}), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500
    
@app.route('/get_wishlist', methods=['POST'])
def get_wishlist_api():
    data = request.json
    email = data.get('email')

    email = decrypt(email)

    if not email:
        return jsonify({"error": "Email and password are required"}), 400
    try:
        result = get_wishlist(email)
        return jsonify({"message": "Got Wishlist successfull", "result": str(result)}), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500

    
@app.route('/get_wishlist_complete', methods=['POST'])
def get_wishlist_complete_api():
    data = request.json
    email = data.get('email')
    password = data.get('password')

    email = decrypt(email)
    password = decrypt(password)

    if not email:
        return jsonify({"error": "Email and password are required"}), 400

    try:
        result = send_wishlist(email, password)
        if result == "Login failed":
            return jsonify({"message": "Login failed"}), 400
        result = get_wishlist(email)
        return jsonify({"message": "Got Wishlist successfull", "result": encrypt(str(result))}), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500

if __name__ == '__main__':
    app.run(debug=True)
