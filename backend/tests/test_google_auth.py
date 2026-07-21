"""Backend tests for Google OAuth + JWT dual-auth integration for Bible Bio X."""
import os
import time
import pytest
import requests
from datetime import datetime, timezone, timedelta
from motor.motor_asyncio import AsyncIOMotorClient
import asyncio

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "https://devotional-explorer.preview.emergentagent.com").rstrip("/")
MONGO_URL = os.environ.get("MONGO_URL", "mongodb://localhost:27017")
DB_NAME = os.environ.get("DB_NAME", "test_database")

ADMIN_EMAIL = "admin@biblebio.com"
ADMIN_PASSWORD = "BibleAdmin2024!"


# ==================== JWT auth regression ====================
@pytest.fixture(scope="module")
def jwt_session():
    s = requests.Session()
    r = s.post(f"{BASE_URL}/api/auth/login",
               json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD})
    assert r.status_code == 200, f"JWT login failed: {r.status_code} {r.text}"
    data = r.json()
    assert data["email"] == ADMIN_EMAIL
    assert "access_token" in s.cookies
    return s


def test_jwt_login_sets_access_cookie(jwt_session):
    assert jwt_session.cookies.get("access_token")
    assert jwt_session.cookies.get("refresh_token")


def test_jwt_me_works(jwt_session):
    r = jwt_session.get(f"{BASE_URL}/api/auth/me")
    assert r.status_code == 200
    data = r.json()
    assert data["email"] == ADMIN_EMAIL
    assert data["role"] == "admin"


# ==================== Google session endpoint ====================
def test_google_session_missing_header():
    r = requests.post(f"{BASE_URL}/api/auth/session")
    # Backend returns 400 for missing header
    assert r.status_code in (400, 422), f"Expected 400/422, got {r.status_code}"


def test_google_session_invalid_id():
    r = requests.post(f"{BASE_URL}/api/auth/session",
                      headers={"X-Session-ID": "invalid_fake_session_id_12345"})
    assert r.status_code == 401, f"Expected 401, got {r.status_code}: {r.text}"


# ==================== Google session_token auth (simulated) ====================
_google_test_user_id = f"user_google_test_{int(time.time())}"
_google_session_token = f"test_session_token_{int(time.time())}"


@pytest.fixture(scope="module")
def seeded_google_session():
    """Insert a test user + valid session in MongoDB, yield the token, cleanup after."""
    async def _seed():
        client = AsyncIOMotorClient(MONGO_URL)
        db = client[DB_NAME]
        await db.users.insert_one({
            "user_id": _google_test_user_id,
            "email": f"{_google_test_user_id}@example.com",
            "name": "Google Test User",
            "picture": "",
            "role": "user",
            "auth_provider": "google",
            "created_at": datetime.now(timezone.utc)
        })
        await db.user_sessions.insert_one({
            "user_id": _google_test_user_id,
            "session_token": _google_session_token,
            "expires_at": datetime.now(timezone.utc) + timedelta(days=7),
            "created_at": datetime.now(timezone.utc)
        })
        client.close()

    async def _cleanup():
        client = AsyncIOMotorClient(MONGO_URL)
        db = client[DB_NAME]
        await db.users.delete_one({"user_id": _google_test_user_id})
        await db.user_sessions.delete_many({"user_id": _google_test_user_id})
        client.close()

    asyncio.run(_seed())
    yield _google_session_token
    asyncio.run(_cleanup())


def test_session_token_authenticates_me(seeded_google_session):
    s = requests.Session()
    s.cookies.set("session_token", seeded_google_session, domain="devotional-explorer.preview.emergentagent.com")
    r = s.get(f"{BASE_URL}/api/auth/me")
    assert r.status_code == 200, f"me failed: {r.status_code} {r.text}"
    data = r.json()
    assert data["email"] == f"{_google_test_user_id}@example.com"
    assert data.get("auth_provider") == "google"


def test_session_token_can_access_protected_prayer(seeded_google_session):
    s = requests.Session()
    s.cookies.set("session_token", seeded_google_session, domain="devotional-explorer.preview.emergentagent.com")
    r = s.post(
        f"{BASE_URL}/api/generate/prayer",
        json={"topic": "peace", "tone": "gentle"},
        stream=True,
        timeout=30,
    )
    assert r.status_code == 200, f"prayer failed: {r.status_code} {r.text[:300]}"
    # Read a couple chunks to verify SSE stream
    got_data = False
    start = time.time()
    for chunk in r.iter_lines():
        if chunk and chunk.startswith(b"data:"):
            got_data = True
            break
        if time.time() - start > 20:
            break
    r.close()
    assert got_data, "No SSE data received from prayer endpoint"


def test_logout_clears_session_and_deletes_db(seeded_google_session):
    s = requests.Session()
    s.cookies.set("session_token", seeded_google_session, domain="devotional-explorer.preview.emergentagent.com")
    r = s.post(f"{BASE_URL}/api/auth/logout")
    assert r.status_code == 200
    # Verify DB session removed
    async def _check():
        client = AsyncIOMotorClient(MONGO_URL)
        db = client[DB_NAME]
        doc = await db.user_sessions.find_one({"session_token": seeded_google_session})
        client.close()
        return doc
    doc = asyncio.run(_check())
    assert doc is None, "Session was NOT deleted from DB after logout"

    # Session_token cookie should no longer authenticate
    s2 = requests.Session()
    s2.cookies.set("session_token", seeded_google_session, domain="devotional-explorer.preview.emergentagent.com")
    r2 = s2.get(f"{BASE_URL}/api/auth/me")
    assert r2.status_code == 401


# ==================== JWT logout regression ====================
def test_jwt_logout_clears_cookies():
    s = requests.Session()
    r = s.post(f"{BASE_URL}/api/auth/login",
               json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD})
    assert r.status_code == 200
    r2 = s.post(f"{BASE_URL}/api/auth/logout")
    assert r2.status_code == 200
    # Set-Cookie should include deletions
    set_cookie = r2.headers.get("set-cookie", "").lower()
    assert "access_token=" in set_cookie
    assert "session_token=" in set_cookie
