"""Tests for Python backend — encryption, rate limiting, and request validation."""
import json
import time
import threading
import unittest
from unittest.mock import patch, MagicMock

# We need to set env vars before importing the app modules
import os
os.environ.setdefault('SECRET_KEY', '0123456789abcdef0123456789abcdef')
os.environ.setdefault('FLASK_API_KEY', 'test-api-key')
os.environ.setdefault('FRONTEND_URL', 'http://localhost:3000')
os.environ.setdefault('BACKEND_PORT', '5000')

from encrypt import encrypt
from decrypt_string import decrypt_string


class TestEncryption(unittest.TestCase):
    """Test AES-256-GCM encryption/decryption roundtrip."""

    def test_encrypt_decrypt_roundtrip(self) -> None:
        original = "hello@example.com"
        encrypted = encrypt(original)
        decrypted = decrypt_string(encrypted)
        self.assertEqual(decrypted, original)

    def test_encrypt_produces_different_ciphertexts(self) -> None:
        """Same plaintext should produce different ciphertexts (random IV)."""
        original = "same-input"
        e1 = encrypt(original)
        e2 = encrypt(original)
        self.assertNotEqual(e1, e2)
        # But both should decrypt to the same value
        self.assertEqual(decrypt_string(e1), original)
        self.assertEqual(decrypt_string(e2), original)

    def test_decrypt_invalid_format_raises(self) -> None:
        with self.assertRaises(ValueError):
            decrypt_string("invalid-no-colons")

    def test_decrypt_invalid_hex_raises(self) -> None:
        with self.assertRaises(Exception):
            decrypt_string("not-hex:not-hex:not-hex")

    def test_encrypt_empty_string(self) -> None:
        encrypted = encrypt("")
        self.assertEqual(decrypt_string(encrypted), "")

    def test_encrypt_special_characters(self) -> None:
        original = "test+user@example.com!#$%^&*()"
        encrypted = encrypt(original)
        self.assertEqual(decrypt_string(encrypted), original)


class TestRateLimiter(unittest.TestCase):
    """Test the thread-safe rate limiter logic."""

    def test_rate_limit_allows_under_limit(self) -> None:
        """_check_rate_limit should allow requests under the limit."""
        # We need to import main after env vars are set
        from main import _check_rate_limit, _shared_wishlist_attempts, _rate_limit_lock

        # Clean up any previous state
        with _rate_limit_lock:
            _shared_wishlist_attempts.clear()

        ip = "192.168.1.1"
        for i in range(10):
            self.assertTrue(_check_rate_limit(ip))

    def test_rate_limit_blocks_over_limit(self) -> None:
        """_check_rate_limit should block requests over the limit."""
        from main import _check_rate_limit, _shared_wishlist_attempts, _rate_limit_lock

        with _rate_limit_lock:
            _shared_wishlist_attempts.clear()

        ip = "10.0.0.1"
        for i in range(10):
            _check_rate_limit(ip)

        # 11th request should be blocked
        self.assertFalse(_check_rate_limit(ip))

    def test_rate_limit_different_ips_independent(self) -> None:
        """Different IPs should have independent rate limits."""
        from main import _check_rate_limit, _shared_wishlist_attempts, _rate_limit_lock

        with _rate_limit_lock:
            _shared_wishlist_attempts.clear()

        ip1 = "172.16.0.1"
        ip2 = "172.16.0.2"

        for i in range(10):
            _check_rate_limit(ip1)

        self.assertFalse(_check_rate_limit(ip1))
        self.assertTrue(_check_rate_limit(ip2))

    def test_rate_limit_thread_safety(self) -> None:
        """Rate limiter should be thread-safe under concurrent access."""
        from main import _check_rate_limit, _shared_wishlist_attempts, _rate_limit_lock

        with _rate_limit_lock:
            _shared_wishlist_attempts.clear()

        results: list[bool] = []
        lock = threading.Lock()

        def make_request(ip: str) -> None:
            result = _check_rate_limit(ip)
            with lock:
                results.append(result)

        threads = [threading.Thread(target=make_request, args=("10.0.0.1",)) for _ in range(15)]
        for t in threads:
            t.start()
        for t in threads:
            t.join()

        # Should have exactly 10 True (allowed) and 5 False (blocked)
        allowed = sum(1 for r in results if r)
        blocked = sum(1 for r in results if not r)
        self.assertEqual(allowed, 10)
        self.assertEqual(blocked, 5)


class TestComicCache(unittest.TestCase):
    """Test comic cache with size limits and TTL."""

    def test_cache_set_and_get(self) -> None:
        """Should be able to set and get cached data."""
        from main import _get_cached_comic, _set_cached_comic, _cache_lock, comic_cache

        with _cache_lock:
            comic_cache.clear()

        data = {"price": "9.99", "name": "Test Comic"}
        _set_cached_comic("https://example.com/comic1", data)
        result = _get_cached_comic("https://example.com/comic1")
        self.assertEqual(result, data)

    def test_cache_miss_returns_none(self) -> None:
        """Should return None for URLs not in cache."""
        from main import _get_cached_comic, _cache_lock, comic_cache

        with _cache_lock:
            comic_cache.clear()

        result = _get_cached_comic("https://example.com/nonexistent")
        self.assertIsNone(result)

    def test_cache_eviction_when_full(self) -> None:
        """Cache should evict old entries when full."""
        from main import _set_cached_comic, _get_cached_comic, _cache_lock, comic_cache, CACHE_MAX_ENTRIES

        with _cache_lock:
            comic_cache.clear()

        # Fill cache beyond max
        for i in range(CACHE_MAX_ENTRIES + 10):
            _set_cached_comic(f"https://example.com/comic{i}", {"name": f"Comic {i}"})

        # Cache should not exceed max entries
        with _cache_lock:
            self.assertLessEqual(len(comic_cache), CACHE_MAX_ENTRIES)

    def test_cache_ttl_expiry(self) -> None:
        """Expired cache entries should return None."""
        from main import _set_cached_comic, _get_cached_comic, _cache_lock, comic_cache

        with _cache_lock:
            comic_cache.clear()

        url = "https://example.com/expired"
        _set_cached_comic(url, {"name": "Expired Comic"})

        # Manually set the cache time to 25 hours ago
        with _cache_lock:
            cache_time, data = comic_cache[url]
            comic_cache[url] = (cache_time - 90000, data)  # 25 hours ago

        result = _get_cached_comic(url)
        self.assertIsNone(result)


class TestFlaskRoutes(unittest.TestCase):
    """Test Flask route validation and error handling."""

    @classmethod
    def setUpClass(cls) -> None:
        from main import app
        cls.app = app
        cls.client = app.test_client()
        cls.api_key = os.environ['FLASK_API_KEY']

    def _headers(self) -> dict[str, str]:
        return {"X-API-Key": self.api_key, "Content-Type": "application/json"}

    def test_api_key_required(self) -> None:
        """Requests without API key should return 401."""
        response = self.client.post('/test_account', json={"email": "test", "password": "test"})
        self.assertEqual(response.status_code, 401)

    def test_api_key_invalid(self) -> None:
        """Wrong API key should return 401."""
        headers = {"X-API-Key": "wrong-key", "Content-Type": "application/json"}
        response = self.client.post('/test_account', json={"email": "test", "password": "test"}, headers=headers)
        self.assertEqual(response.status_code, 401)

    def test_missing_email_returns_400(self) -> None:
        """Missing email field should return 400."""
        response = self.client.post('/get_wishlist', json={"password": "test"}, headers=self._headers())
        self.assertEqual(response.status_code, 400)

    def test_missing_url_returns_400(self) -> None:
        """Missing URL field should return 400."""
        response = self.client.post('/get_comic_information', json={}, headers=self._headers())
        self.assertEqual(response.status_code, 400)

    def test_get_shared_wishlist_rate_limit(self) -> None:
        """Should rate limit after 10 requests."""
        from main import _shared_wishlist_attempts, _rate_limit_lock

        with _rate_limit_lock:
            _shared_wishlist_attempts.clear()

        for i in range(10):
            response = self.client.get('/get_shared_wishlist', headers=self._headers())
            # May be 500 if shared credentials not configured
            self.assertIn(response.status_code, [200, 429, 500])

        # 11th should be rate limited
        response = self.client.get('/get_shared_wishlist', headers=self._headers())
        self.assertEqual(response.status_code, 429)


class TestChromeOptions(unittest.TestCase):
    """Test that Chrome options are configured correctly."""

    def test_chrome_options_type(self) -> None:
        from chrome_options import get_chrome_options
        from selenium.webdriver.chrome.options import Options
        opts = get_chrome_options()
        self.assertIsInstance(opts, Options)

    def test_chrome_options_has_headless(self) -> None:
        from chrome_options import get_chrome_options
        opts = get_chrome_options()
        caps = opts.to_capabilities()
        args = caps.get('chromeOptions', {}).get('args', []) or caps.get('goog:chromeOptions', {}).get('args', [])
        has_headless = any('headless' in arg for arg in args) or opts._arguments and any('headless' in arg for arg in opts._arguments)
        self.assertTrue(has_headless, f"Expected headless argument")

    def test_chrome_options_has_no_sandbox(self) -> None:
        from chrome_options import get_chrome_options
        opts = get_chrome_options()
        caps = opts.to_capabilities()
        args = caps.get('chromeOptions', {}).get('args', []) or caps.get('goog:chromeOptions', {}).get('args', [])
        has_no_sandbox = any('no-sandbox' in arg for arg in args) or opts._arguments and any('no-sandbox' in arg for arg in opts._arguments)
        self.assertTrue(has_no_sandbox, f"Expected no-sandbox argument")


if __name__ == '__main__':
    unittest.main()