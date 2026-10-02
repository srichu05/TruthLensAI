import os
import sys
import uuid
import pytest
from datetime import datetime, timedelta, timezone
from fastapi.testclient import TestClient
from jose import jwt
from sqlalchemy import text

# Ensure backend root is on sys.path
sys.path.insert(0, os.path.abspath(os.path.dirname(__file__)))

from app.main import app
from app.core.config import settings
from app.db.session import engine, SessionLocal
from app.models.user import User
from app.models.analysis import Analysis
from app.models.real_article import RealArticle

client = TestClient(app)

def create_test_jwt(user_id: str, email: str, name: str = "Test User", expired: bool = False):
    secret = settings.SUPABASE_JWT_SECRET or settings.SECRET_KEY
    if expired:
        exp = int((datetime.now(timezone.utc) - timedelta(hours=2)).timestamp())
    else:
        exp = int((datetime.now(timezone.utc) + timedelta(hours=2)).timestamp())

    payload = {
        "sub": user_id,
        "email": email,
        "aud": "authenticated",
        "role": "authenticated",
        "exp": exp,
        "user_metadata": {
            "name": name
        }
    }
    return jwt.encode(payload, secret, algorithm="HS256")


def test_unauthenticated_protected_routes_return_401():
    """Verify that every protected endpoint rejects unauthenticated requests with HTTP 401."""
    # 1. /api/history
    res = client.get("/api/history")
    assert res.status_code == 401, f"Expected 401 for unauthenticated /api/history, got {res.status_code}"
    assert res.json().get("detail") == "Authentication required"

    # 2. /api/dashboard/stats
    res = client.get("/api/dashboard/stats")
    assert res.status_code == 401, f"Expected 401 for unauthenticated /api/dashboard/stats, got {res.status_code}"
    assert res.json().get("detail") == "Authentication required"

    # 3. /api/real-articles
    res = client.get("/api/real-articles")
    assert res.status_code == 401, f"Expected 401 for unauthenticated /api/real-articles, got {res.status_code}"
    assert res.json().get("detail") == "Authentication required"

    # 4. /api/real-articles/{id}
    res = client.get("/api/real-articles/999999")
    assert res.status_code == 401, f"Expected 401 for unauthenticated /api/real-articles/999999, got {res.status_code}"

    # 5. /api/history/{id} DELETE
    res = client.delete("/api/history/999999")
    assert res.status_code == 401, f"Expected 401 for unauthenticated DELETE /api/history/999999, got {res.status_code}"

    # 6. /api/history/{id}/bookmark PATCH
    res = client.patch("/api/history/999999/bookmark")
    assert res.status_code == 401, f"Expected 401 for unauthenticated PATCH /api/history/999999/bookmark, got {res.status_code}"

    # 7. /api/auth/me
    res = client.get("/api/auth/me")
    assert res.status_code == 401, f"Expected 401 for unauthenticated /api/auth/me, got {res.status_code}"

    print("[OK] Verified: All protected routes strictly return HTTP 401 when unauthenticated.")


def test_invalid_or_expired_jwt_rejected():
    """Verify that malformed or expired JWT tokens are rejected with 401."""
    # Malformed token
    headers = {"Authorization": "Bearer not-a-valid-jwt-token"}
    res = client.get("/api/history", headers=headers)
    assert res.status_code == 401
    assert res.json().get("detail") == "Authentication required"

    # Expired token
    expired_token = create_test_jwt(str(uuid.uuid4()), "expired@test.com", expired=True)
    headers = {"Authorization": f"Bearer {expired_token}"}
    res = client.get("/api/history", headers=headers)
    assert res.status_code == 401
    assert res.json().get("detail") == "Authentication required"

    print("[OK] Verified: Invalid and expired JWT tokens are rejected with HTTP 401.")


def test_anonymous_analysis_allowed_but_isolated():
    """Verify that anonymous users CAN run news analysis, but it does not leak into user history."""
    payload = {
        "mode": "text",
        "content": "A verified scientific trial was conducted across twenty university laboratories in 2024."
    }
    res = client.post("/api/analyze", json=payload)
    assert res.status_code == 200, f"Expected 200 for anonymous analysis, got {res.status_code}"
    data = res.json()
    assert "verdict" in data
    assert "conf" in data
    assert "summary" in data

    # Verify anonymous caller still cannot access /api/history
    hist_res = client.get("/api/history")
    assert hist_res.status_code == 401
    print("[OK] Verified: Anonymous analysis works without exposing protected account data.")


def test_authenticated_user_access_and_isolation():
    """Verify that authenticated users with valid JWT can access protected routes and only see their data."""
    user_a_id = str(uuid.uuid4())
    user_b_id = str(uuid.uuid4())
    email_a = f"usera_{user_a_id[:8]}@truthlens.ai"
    email_b = f"userb_{user_b_id[:8]}@truthlens.ai"

    # Register in Supabase auth.users for FK satisfaction
    with engine.begin() as conn:
        conn.execute(
            text("INSERT INTO auth.users (id, email) VALUES (:uid, :email);"),
            {"uid": user_a_id, "email": email_a}
        )
        conn.execute(
            text("INSERT INTO auth.users (id, email) VALUES (:uid, :email);"),
            {"uid": user_b_id, "email": email_b}
        )

    try:
        token_a = create_test_jwt(user_a_id, email_a, name="User A")
        token_b = create_test_jwt(user_b_id, email_b, name="User B")
        
        headers_a = {"Authorization": f"Bearer {token_a}"}
        headers_b = {"Authorization": f"Bearer {token_b}"}

        # Verify /api/auth/me auto-provisions and returns the profile
        me_a = client.get("/api/auth/me", headers=headers_a)
        assert me_a.status_code == 200, f"Expected 200, got {me_a.status_code}: {me_a.text}"
        assert me_a.json()["id"] == user_a_id
        assert me_a.json()["email"] == email_a

        # Create analysis as User A
        analyze_res = client.post(
            "/api/analyze",
            headers=headers_a,
            json={
                "mode": "text",
                "content": "NASA scientists confirmed the atmospheric readings taken by telescope."
            }
        )
        assert analyze_res.status_code == 200
        item_id = analyze_res.json().get("id")

        # User A should see the item in their history
        hist_a = client.get("/api/history", headers=headers_a)
        assert hist_a.status_code == 200
        items_a = hist_a.json()
        assert any(i["id"] == item_id for i in items_a)

        # User B should NOT see User A's item in their history
        hist_b = client.get("/api/history", headers=headers_b)
        assert hist_b.status_code == 200
        items_b = hist_b.json()
        assert not any(i["id"] == item_id for i in items_b)

        # User B cannot delete User A's item
        del_b = client.delete(f"/api/history/{item_id}", headers=headers_b)
        assert del_b.status_code == 404, "User B should not be able to delete User A's analysis record"

        # User A can delete their own item
        del_a = client.delete(f"/api/history/{item_id}", headers=headers_a)
        assert del_a.status_code == 204

        # Dashboard stats works for authenticated user
        stats_a = client.get("/api/dashboard/stats", headers=headers_a)
        assert stats_a.status_code == 200
        assert "total_scans" in stats_a.json()

        print("[OK] Verified: Authenticated user flow, data persistence, and cross-user isolation.")
    finally:
        with engine.begin() as conn:
            conn.execute(text("DELETE FROM auth.users WHERE id IN (:a, :b);"), {"a": user_a_id, "b": user_b_id})
