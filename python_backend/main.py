from flask import Flask, request, jsonify
from test_account import handle_login
from send_wishlist import send_wishlist
from get_wishlist import get_wishlist
from decrypt_string import decrypt_string
from flask_cors import CORS
import json
from dotenv import load_dotenv
import os
from get_comic_information import get_information
import threading
import time
from functools import lru_cache

load_dotenv()

port = os.getenv('BACKEND_PORT')

app = Flask(__name__)
CORS(app)

comic_cache = {}
comic_cache_lock = threading.Lock()

@lru_cache(maxsize=100)
def cached_get_information(url):
    return get_information(url)

@app.route('/test_account', methods=['POST'])
def login():
    data = request.json
    email = data.get('email')
    password = data.get('password')

    email = decrypt_string(email)
    password = decrypt_string(password)

    if not email or not password:
        print("returing 400")
        return jsonify({"error": "Email and password are required"}), 400

    try:
        result = handle_login(email, password)
        print(result)
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

    email = decrypt_string(email)
    password = decrypt_string(password)

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

    email = decrypt_string(email)

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

    email = decrypt_string(email)
    password = decrypt_string(password)

    if not email or not password:
        return jsonify({"error": "Email and password are required"}), 400

    print("sending wishlist...")
    result = send_wishlist(email, password)
    if result == "Login failed":
        return jsonify({"message": "Login failed"}), 400
    print("email send successfull.")
    result = get_wishlist(email)
    return jsonify({"message": "Got Wishlist successfull", "result": json.dumps(result)}), 200

@app.route('/get_comic_information', methods=['POST'])
def get_comic_information_route():
    data = request.json
    url = data.get('url')

    if not url:
        return jsonify({"error": "URL is required"}), 400

    normalized_url = url.strip().lower()
    if not normalized_url.startswith('http'):
        normalized_url = 'https://' + normalized_url

    with comic_cache_lock:
        if normalized_url in comic_cache:
            cache_time, cache_data = comic_cache[normalized_url]
            if time.time() - cache_time < 86400:  # 24 hours
                print(f"Returning cached data for URL: {normalized_url}")
                return jsonify({"message": "Comic information fetched from cache", "result": cache_data}), 200
            else:
                print(f"Cache expired for URL: {normalized_url}")

    try:
        print(f"Fetching fresh data for URL: {normalized_url}")
        result = get_information(normalized_url)
        
        if isinstance(result, str) and "failed" in result:
            print(f"Fetch failed: {result}")
            return jsonify({"error": result}), 400
        
        with comic_cache_lock:
            comic_cache[normalized_url] = (time.time(), result)
            print(f"Stored new data in cache for URL: {normalized_url}")
            
        return jsonify({"message": "Comic information fetched successfully", "result": result}), 200
    except Exception as e:
        print(f"Error fetching comic information: {str(e)}")
        return jsonify({"error": str(e)}), 500

@app.route('/get_comic_information_api', methods=['GET', 'POST'])
def get_comic_information_api():
    if request.method == 'POST':
        data = request.json
        url = data.get('url') if data else None
    else:
        url = request.args.get('url')
        if url and '%' in url:
            try:
                import urllib.parse
                url = urllib.parse.unquote(url)
                print(f"Decoded URL parameter: {url}")
            except Exception as e:
                print(f"Error decoding URL: {e}")

    if not url:
        print("Error: No URL provided to get_comic_information_api")
        return jsonify({"error": "URL is required"}), 400

    print(f"Received request for URL: {url}")
    
    try:
        normalized_url = url.strip().lower()
        if not normalized_url.startswith('http'):
            normalized_url = 'https://' + normalized_url
            print(f"Normalized URL to: {normalized_url}")

        with comic_cache_lock:
            if normalized_url in comic_cache:
                cache_time, cache_data = comic_cache[normalized_url]
                if time.time() - cache_time < 86400:  
                    print(f"Returning cached data for URL: {normalized_url}")
                    return jsonify({"message": "Comic information fetched from cache", "result": cache_data}), 200
                else:
                    print(f"Cache expired for URL: {normalized_url}")

        print(f"Fetching fresh data for URL: {normalized_url}")
        result = get_information(normalized_url)
        
        if isinstance(result, str) and "failed" in result:
            print(f"Fetch failed: {result}")
            return jsonify({"error": result}), 400
        
        if isinstance(result, str):
            try:
                result = json.loads(result)
            except json.JSONDecodeError:
                print(f"Result is not valid JSON: {result}")
        
        with comic_cache_lock:
            comic_cache[normalized_url] = (time.time(), result)
            print(f"Stored new data in cache for URL: {normalized_url}")
            
        return jsonify({"message": "Comic information fetched successfully", "result": result}), 200
    except Exception as e:
        error_message = str(e)
        print(f"Error fetching comic information: {error_message}")
        return jsonify({"error": error_message}), 500

@app.route('/get_comic_information_api/<path:subpath>', methods=['GET', 'POST'])
@app.route('/get_comic_information/<path:subpath>', methods=['GET', 'POST'])
def get_comic_information_wildcard(subpath=None):
    print(f"Wildcard comic information route hit with subpath: {subpath}")
    if 'api' in request.path:
        return get_comic_information_api()
    else:
        return get_comic_information_route()

if __name__ == '__main__':
    print("Available routes:")
    for rule in app.url_map.iter_rules():
        print(f"  {rule.endpoint}: {rule.methods} - {rule.rule}")
    
    @app.errorhandler(404)
    def not_found(e):
        if request.path.startswith('/get_comic_information'):
            print(f"404 Error for comic information request: {request.path} - {request.query_string}")
            url = request.args.get('url')
            if url:
                if request.method == 'GET':
                    print(f"Redirecting to get_comic_information_api with URL: {url}")
                    return get_comic_information_api()
                else:
                    print(f"Redirecting to get_comic_information_route with URL: {url}")
                    return get_comic_information_route()
            
        print(f"404 Error: {request.path} - Method: {request.method}")
        return jsonify({"error": f"Route not found: {request.path}"}), 404
    
    app.run(debug=False, port=port)
