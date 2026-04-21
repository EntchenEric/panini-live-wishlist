import contextlib
import json
import os
import threading
import time
from typing import Any

from dotenv import load_dotenv
from flask import Flask, jsonify, request
from flask_cors import CORS

from decrypt_string import decrypt_string
from get_comic_information import get_information
from get_wishlist import get_wishlist
from send_wishlist import send_wishlist
from test_account import handle_login

load_dotenv()

port = os.getenv('BACKEND_PORT')
flask_api_key = os.getenv('FLASK_API_KEY')

app = Flask(__name__)
app.config['MAX_CONTENT_LENGTH'] = 1 * 1024 * 1024  # 1MB

frontend_url = os.getenv('FRONTEND_URL', 'http://localhost:3004')
CORS(app, origins=[frontend_url])

# Thread-safe rate limiting for /get_shared_wishlist
_rate_limit_lock = threading.Lock()
_shared_wishlist_attempts: dict[str, list[float]] = {}
_SHARED_WISHLIST_RATE_LIMIT = 10
_SHARED_WISHLIST_RATE_WINDOW = 60

# Thread-safe comic cache with size limit
_cache_lock = threading.Lock()
comic_cache: dict[str, tuple[float, dict[str, Any]]] = {}
CACHE_MAX_ENTRIES = 500
CACHE_TTL_SECONDS = 86400  # 24 hours


def _check_rate_limit(client_ip: str) -> bool:
    with _rate_limit_lock:
        now = time.time()
        attempts = _shared_wishlist_attempts.get(client_ip, [])
        attempts = [t for t in attempts if now - t < _SHARED_WISHLIST_RATE_WINDOW]
        if len(attempts) >= _SHARED_WISHLIST_RATE_LIMIT:
            _shared_wishlist_attempts[client_ip] = attempts
            return False
        attempts.append(now)
        _shared_wishlist_attempts[client_ip] = attempts
        return True


def _get_cached_comic(url: str) -> dict[str, Any] | None:
    with _cache_lock:
        if url in comic_cache:
            cache_time, cache_data = comic_cache[url]
            if time.time() - cache_time < CACHE_TTL_SECONDS:
                return cache_data
            del comic_cache[url]
    return None


def _set_cached_comic(url: str, data: dict[str, Any]) -> None:
    with _cache_lock:
        # Evict oldest entries if cache is full
        if len(comic_cache) >= CACHE_MAX_ENTRIES:
            sorted_entries = sorted(comic_cache.items(), key=lambda x: x[1][0])
            for key, _ in sorted_entries[: len(comic_cache) - CACHE_MAX_ENTRIES + 50]:
                del comic_cache[key]
        comic_cache[url] = (time.time(), data)


def _validate_json_body(required_fields: list[str]) -> tuple[dict[str, Any] | None, str | None]:
    data = request.json
    if not data:
        return None, "Request body must be JSON"
    for field in required_fields:
        if not data.get(field):
            return None, f"{field} is required"
    return data, None


_BOT_PATHS = frozenset({
    '/wp-includes', '/xmlrpc.php', '/wp-admin', '/wp-content',
    '/wordpress', '/blog', '/web', '/news', '/cms', '/sito',
    '/wp1', '/wp2', '/test', '/site', '/website',
})


@app.before_request
def verify_api_key() -> tuple[str, int] | None:
    path = request.path.lower()
    if any(path.startswith(p) for p in _BOT_PATHS):
        return '', 404
    if not flask_api_key:
        return jsonify({"error": "Server configuration error: API key not set"}), 500
    if request.headers.get('X-API-Key') != flask_api_key:
        return jsonify({"error": "Unauthorized"}), 401
    return None


@app.after_request
def add_security_headers(response: Any) -> Any:
    response.headers['X-Content-Type-Options'] = 'nosniff'
    response.headers['X-Frame-Options'] = 'DENY'
    response.headers['Referrer-Policy'] = 'strict-origin-when-cross-origin'
    response.headers['Strict-Transport-Security'] = 'max-age=63072000; includeSubDomains'
    return response


@app.route('/test_account', methods=['POST'])
def login() -> tuple[str, int]:
    data, error = _validate_json_body(['email', 'password'])
    if error:
        return jsonify({"error": error}), 400

    email = decrypt_string(data['email'])
    password = decrypt_string(data['password'])

    if not email or not password:
        return jsonify({"error": "Email and password are required"}), 400

    try:
        result = handle_login(email, password)
        if result == "Login failed":
            return jsonify({"message": "Login failed"}), 400
        return jsonify({"message": "Login successful"}), 200
    except Exception as e:
        app.logger.error(f"Error in login: {e}")
        return jsonify({"error": "An internal error occurred"}), 500


@app.route('/send_wishlist', methods=['POST'])
def send_wishlist_api() -> tuple[str, int]:
    data, error = _validate_json_body(['email', 'password'])
    if error:
        return jsonify({"error": error}), 400

    email = decrypt_string(data['email'])
    password = decrypt_string(data['password'])

    if not email or not password:
        return jsonify({"error": "Email and password are required"}), 400

    try:
        result = send_wishlist(email, password)
        if result == "Login failed":
            return jsonify({"message": "Login failed"}), 400
        return jsonify({"message": "Wishlist send successful"}), 200
    except Exception as e:
        app.logger.error(f"Error in send_wishlist: {e}")
        return jsonify({"error": "An internal error occurred"}), 500


@app.route('/get_wishlist', methods=['POST'])
def get_wishlist_api() -> tuple[str, int]:
    data, error = _validate_json_body(['email'])
    if error:
        return jsonify({"error": error}), 400

    email = decrypt_string(data['email'])
    password = decrypt_string(data.get('password', '')) if data.get('password') else None

    if not email:
        return jsonify({"error": "Email is required"}), 400

    try:
        result = get_wishlist(email, password) if password else get_wishlist(email)
        return jsonify({"message": "Got Wishlist successfully", "result": json.dumps(result)}), 200
    except Exception as e:
        app.logger.error(f"Error in get_wishlist: {e}")
        return jsonify({"error": "An internal error occurred"}), 500


@app.route('/get_wishlist_complete', methods=['POST'])
def get_wishlist_complete_api() -> tuple[str, int]:
    data, error = _validate_json_body(['email', 'password'])
    if error:
        return jsonify({"error": error}), 400

    email = decrypt_string(data['email'])
    password = decrypt_string(data['password'])

    if not email or not password:
        return jsonify({"error": "Email and password are required"}), 400

    try:
        result = get_wishlist(email, password)
        return jsonify({"message": "Got Wishlist successfully", "result": json.dumps(result)}), 200
    except Exception as e:
        app.logger.error(f"Error in get_wishlist_complete: {e}")
        return jsonify({"error": "An internal error occurred"}), 500


@app.route('/get_comic_information', methods=['POST'])
def get_comic_information_route() -> tuple[str, int]:
    data, error = _validate_json_body(['url'])
    if error:
        return jsonify({"error": error}), 400

    url: str = data['url'].strip().lower()
    if not url.startswith('http'):
        url = 'https://' + url

    cached = _get_cached_comic(url)
    if cached is not None:
        return jsonify({"message": "Comic information fetched from cache", "result": cached}), 200

    try:
        result = get_information(url)

        if isinstance(result, dict) and "error" in result:
            return jsonify({"error": result["error"]}), 400

        _set_cached_comic(url, result)
        return jsonify({"message": "Comic information fetched successfully", "result": result}), 200
    except Exception as e:
        app.logger.error(f"Error fetching comic information: {e}")
        return jsonify({"error": "An internal error occurred"}), 500


@app.route('/get_comic_information_api', methods=['GET', 'POST'])
def get_comic_information_api() -> tuple[str, int]:
    if request.method == 'POST':
        data = request.json
        url = data.get('url') if data else None
    else:
        url = request.args.get('url')
        if url and '%' in url:
            try:
                import urllib.parse
                url = urllib.parse.unquote(url)
            except Exception:
                pass

    if not url:
        return jsonify({"error": "URL is required"}), 400

    url = url.strip().lower()
    if not url.startswith('http'):
        url = 'https://' + url

    cached = _get_cached_comic(url)
    if cached is not None:
        return jsonify({"message": "Comic information fetched from cache", "result": cached}), 200

    try:
        result = get_information(url)

        if isinstance(result, dict) and "error" in result:
            return jsonify({"error": result["error"]}), 400

        if isinstance(result, str):
            with contextlib.suppress(json.JSONDecodeError):
                result = json.loads(result)

        _set_cached_comic(url, result)
        return jsonify({"message": "Comic information fetched successfully", "result": result}), 200
    except Exception as e:
        app.logger.error(f"Error fetching comic information: {e}")
        return jsonify({"error": "An internal error occurred"}), 500


@app.route('/get_comic_information_api/<path:subpath>', methods=['GET', 'POST'])
@app.route('/get_comic_information/<path:subpath>', methods=['GET', 'POST'])
def get_comic_information_wildcard(subpath: str | None = None) -> tuple[str, int]:
    if 'api' in request.path:
        return get_comic_information_api()
    else:
        return get_comic_information_route()


@app.route('/get_shared_wishlist', methods=['GET'])
def get_shared_wishlist_api() -> tuple[str, int]:
    client_ip = request.remote_addr or 'unknown'

    if not _check_rate_limit(client_ip):
        return jsonify({"error": "Rate limit exceeded"}), 429

    try:
        shared_email = os.getenv("SHARED_EMAIL")
        shared_password = os.getenv("SHARED_PASSWORD")

        if not shared_email or not shared_password:
            return jsonify({"error": "Shared wishlist access not configured"}), 500

        result = get_wishlist(shared_email, shared_password)

        if result.get("data"):
            result["message"] = "Shared Wishlist"

        return jsonify({"message": "Got shared wishlist successfully", "result": json.dumps(result)}), 200
    except Exception as e:
        app.logger.error(f"Error getting shared wishlist: {e}")
        return jsonify({"error": "An internal error occurred"}), 500


if __name__ == '__main__':
    print("Available routes:")
    for rule in app.url_map.iter_rules():
        print(f"  {rule.endpoint}: {rule.methods} - {rule.rule}")

    @app.errorhandler(404)
    def not_found(e: Exception) -> tuple[str, int]:
        if request.path.startswith('/get_comic_information'):
            return get_comic_information_api()

        return jsonify({"error": "Not found"}), 404

    app.run(debug=False, port=port)
