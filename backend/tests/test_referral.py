"""Backend tests for the Referral system (iteration 4)."""
import os
import uuid
import asyncio
import pytest
import requests
from motor.motor_asyncio import AsyncIOMotorClient

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "https://devotional-explorer.preview.emergentagent.com").rstrip("/")
API = f"{BASE_URL}/api"

ADMIN_EMAIL = "admin@biblebio.com"
ADMIN_PASSWORD = "BibleAdmin2024!"

MONGO_URL = "mongodb://localhost:27017"
DB_NAME = "test_database"


# ---------- Fixtures ----------
@pytest.fixture(scope="session")
def mongo_db():
    client = AsyncIOMotorClient(MONGO_URL)
    return client[DB_NAME]


@pytest.fixture(scope="session")
def admin_session():
    s = requests.Session()
    r = s.post(f"{API}/auth/login", json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD})
    assert r.status_code == 200, f"Admin login failed: {r.status_code} {r.text}"
    return s


@pytest.fixture(scope="session")
def admin_headers(admin_session):
    # Return a callable-like object; but tests expect a dict of headers.
    # Since JWT auth may accept Bearer token OR cookie, we use cookie via session.
    # For test compatibility, return None and switch tests to use admin_session.
    return {}


def _run(coro):
    return asyncio.get_event_loop().run_until_complete(coro)


@pytest.fixture(scope="session", autouse=True)
def reset_admin(mongo_db):
    """Reset admin referral fields at start."""
    _run(mongo_db.users.update_one(
        {"email": ADMIN_EMAIL},
        {"$set": {"premium_credits": 3}, "$unset": {"referral_code": "", "referred_by": ""}}
    ))
    yield
    # cleanup TEST_ users after suite
    _run(mongo_db.users.delete_many({"email": {"$regex": "^TEST_"}}))


# ---------- Tests ----------
class TestReferralBackend:

    def test_01_referral_null_when_no_premium_use(self, admin_session, mongo_db):
        # ensure no referral_code
        _run(mongo_db.users.update_one({"email": ADMIN_EMAIL}, {"$unset": {"referral_code": ""}}))
        r = admin_session.get(f"{API}/user/referral")
        assert r.status_code == 200, r.text
        data = r.json()
        assert data["referral_code"] is None
        assert data["referred_count"] == 0

    def test_02_referral_code_generated_on_premium_use(self, admin_session, mongo_db):
        # Ensure at least 1 credit
        _run(mongo_db.users.update_one({"email": ADMIN_EMAIL}, {"$set": {"premium_credits": 3}, "$unset": {"referral_code": ""}}))
        # Trigger premium bio
        payload = {"character_name": "Moses", "focus": "leadership", "depth": "detailed", "use_premium": True}
        r = admin_session.post(f"{API}/generate/bio", json=payload, stream=True, timeout=30)
        # Streaming - may return 200 even without consuming full body
        assert r.status_code == 200, r.text
        # Read a little to allow route to run
        try:
            for _ in r.iter_content(chunk_size=256):
                break
        except Exception:
            pass
        r.close()
        # Small delay
        import time; time.sleep(1)
        user = _run(mongo_db.users.find_one({"email": ADMIN_EMAIL}))
        assert user.get("referral_code"), f"referral_code missing after premium use: {user}"
        assert isinstance(user["referral_code"], str) and len(user["referral_code"]) > 0

    def test_03_referral_endpoint_returns_full_payload(self, admin_session):
        r = admin_session.get(f"{API}/user/referral")
        assert r.status_code == 200
        data = r.json()
        assert data["referral_code"] is not None
        assert data["referred_count"] == 0
        assert data["credits_earned"] == 0
        assert "referral_url" in data

    def test_04_idempotent_code(self, admin_session):
        r1 = admin_session.get(f"{API}/user/referral").json()
        r2 = admin_session.get(f"{API}/user/referral").json()
        assert r1["referral_code"] == r2["referral_code"]
        assert r1["referral_code"] is not None

    def test_05_index_on_referral_code(self, mongo_db):
        indexes = _run(mongo_db.users.index_information())
        # Look for sparse index on referral_code
        found = False
        for name, info in indexes.items():
            keys = info.get("key", [])
            if any(k[0] == "referral_code" for k in keys):
                found = True
                assert info.get("sparse", False), f"Index on referral_code should be sparse: {info}"
        assert found, f"No index found on users.referral_code. Indexes: {indexes}"

    def test_06_referred_count_updates_when_user_referred(self, admin_session, mongo_db):
        # Get admin's referral code + id
        admin_user = _run(mongo_db.users.find_one({"email": ADMIN_EMAIL}))
        code = admin_user.get("referral_code")
        assert code, "Admin should have referral_code by now"
        referrer_id = admin_user.get("user_id") or admin_user.get("email")

        # Insert a fake referred user
        fake_email = f"TEST_referred_{uuid.uuid4().hex[:6]}@example.com"
        _run(mongo_db.users.insert_one({
            "user_id": f"user_{uuid.uuid4().hex[:12]}",
            "email": fake_email,
            "name": "Referred User",
            "role": "user",
            "referred_by": referrer_id,
            "premium_credits": 3
        }))

        r = admin_session.get(f"{API}/user/referral")
        data = r.json()
        assert data["referred_count"] == 1, f"Expected 1 referred, got {data}"
        assert data["credits_earned"] == 1

    def test_07_existing_user_with_ref_header_not_credited(self, mongo_db):
        """Verifies logic: existing user path in /auth/session does NOT process X-Referral-Code.
        We cannot call the real emergent auth endpoint, so we validate via source inspection:
        the referral crediting only appears within the `else` branch (new user creation)."""
        src = open("/app/backend/server.py").read()
        # Find the /auth/session function boundaries and confirm ref_code handling only inside new-user branch.
        idx_else = src.find("# Create new user - grant welcome gift")
        idx_refcode = src.find('request.headers.get("X-Referral-Code")')
        assert idx_else > 0 and idx_refcode > idx_else, (
            "X-Referral-Code handling must appear AFTER the 'new user' branch marker"
        )
        # Confirm referral incrementing not present in the existing-user update block
        existing_block = src[src.find("existing = await db.users.find_one"):idx_else]
        assert "X-Referral-Code" not in existing_block
        assert "referral_code" not in existing_block  # no crediting logic here
