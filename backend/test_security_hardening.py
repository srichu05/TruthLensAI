import os
import sys
import pytest
from fastapi.testclient import TestClient

# Ensure backend root is on sys.path
sys.path.insert(0, os.path.abspath(os.path.dirname(__file__)))

def test_production_fails_without_secret_key():
    from pydantic_settings import BaseSettings, SettingsConfigDict
    from app.core.config import Settings
    
    # Test that ENVIRONMENT=production with empty/insecure secret raises RuntimeError
    try:
        Settings(ENVIRONMENT="production", SECRET_KEY="", _env_file=None)
        assert False, "Expected RuntimeError when SECRET_KEY is empty in production"
    except RuntimeError as e:
        assert "CRITICAL CONFIGURATION ERROR" in str(e)
        print("[OK] Verified: production fails safely if SECRET_KEY is missing/empty.")

    try:
        Settings(ENVIRONMENT="production", SECRET_KEY="your_strong_random_secret_key_here", _env_file=None)
        assert False, "Expected RuntimeError when placeholder SECRET_KEY is used in production"
    except RuntimeError as e:
        assert "CRITICAL CONFIGURATION ERROR" in str(e)
        print("[OK] Verified: production fails safely if SECRET_KEY is an insecure placeholder.")


def test_rate_limiting_auth_login():
    from app.main import app
    client = TestClient(app)
    
    # settings.RATE_LIMIT_LOGIN is 5/minute
    responses = []
    for i in range(7):
        res = client.post("/api/auth/login", json={"email": f"ratetest{i}@example.com", "password": "wrongpassword"})
        responses.append(res.status_code)
    
    print("Login status codes:", responses)
    # The first 5 should be 401 (invalid creds) or 400, but NOT 429
    assert all(code != 429 for code in responses[:5]), f"First 5 requests should not be 429: {responses[:5]}"
    # 6th and 7th requests MUST be 429 Too Many Requests
    assert responses[5] == 429, f"6th request should be 429, got {responses[5]}"
    assert responses[6] == 429, f"7th request should be 429, got {responses[6]}"
    
    last_res = client.post("/api/auth/login", json={"email": "ratetest_exceeded@example.com", "password": "wrong"})
    assert last_res.status_code == 429
    body = last_res.json()
    assert "Rate limit exceeded" in body.get("detail", "")
    assert body.get("error") == "rate_limit_exceeded"
    assert "Retry-After" in last_res.headers
    print("[OK] Verified: /api/auth/login rate limits at 5/minute and returns HTTP 429 with Retry-After header.")


def test_rate_limiting_auth_signup():
    from app.main import app
    client = TestClient(app)
    
    # settings.RATE_LIMIT_SIGNUP is 5/minute
    # Use a different IP via headers if necessary or verify hitting the limit
    # Note: TestClient by default sends from 'testclient' or 127.0.0.1
    # We can pass client host in headers or scope if needed, but let's test signup
    responses = []
    for i in range(7):
        res = client.post("/api/auth/signup", json={"name": f"User {i}", "email": f"signup_{i}@example.com", "password": "password123"})
        responses.append(res.status_code)
    
    print("Signup status codes:", responses)
    assert 429 in responses, "Signup should encounter HTTP 429 rate limit"
    assert responses[-1] == 429
    print("[OK] Verified: /api/auth/signup rate limits and returns HTTP 429.")


def test_rate_limiting_analyze():
    from app.main import app
    client = TestClient(app)
    
    # settings.RATE_LIMIT_ANALYZE is 20/minute
    # Make rapid requests
    responses = []
    for i in range(25):
        res = client.post("/api/analyze", json={
            "mode": "text",
            "content": f"This is an automated rate limit testing payload iteration {i} with sufficient text length.",
            "title": f"Test {i}"
        })
        responses.append(res.status_code)
        if res.status_code == 429:
            break
            
    print(f"Analyze sent {len(responses)} requests, final status: {responses[-1]}")
    assert responses[-1] == 429, f"Expected 429 on /api/analyze after exceeding limit, got {responses[-1]}"
def test_rate_limiting_analyze_upload():
    from io import BytesIO
    from app.main import app
    client = TestClient(app)
    
    # settings.RATE_LIMIT_UPLOAD is 10/minute
    responses = []
    for i in range(12):
        fake_file = ("test.txt", BytesIO(b"This is a valid test file content for rate limiting analysis upload verification."), "text/plain")
        res = client.post("/api/analyze/upload", files={"file": fake_file})
        responses.append(res.status_code)
        if res.status_code == 429:
            break
            
    print(f"Analyze upload sent {len(responses)} requests, final status: {responses[-1]}")
    assert responses[-1] == 429, f"Expected 429 on /api/analyze/upload after exceeding limit, got {responses[-1]}"
    print("[OK] Verified: /api/analyze/upload rate limits at 10/minute and returns HTTP 429.")


if __name__ == "__main__":
    print("Starting Security & Hardening automated tests...")
    test_production_fails_without_secret_key()
    test_rate_limiting_auth_login()
    test_rate_limiting_auth_signup()
    test_rate_limiting_analyze()
    test_rate_limiting_analyze_upload()
    print("\nALL SECURITY & HARDENING TESTS PASSED SUCCESSFULLY!")
