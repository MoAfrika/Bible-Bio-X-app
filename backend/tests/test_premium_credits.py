"""Tests for the First-time Gift / Premium Credits feature."""
import os
import pytest
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "https://devotional-explorer.preview.emergentagent.com").rstrip("/")
ADMIN_EMAIL = "admin@biblebio.com"
ADMIN_PASSWORD = "BibleAdmin2024!"


@pytest.fixture(scope="module")
def admin_session():
    s = requests.Session()
    r = s.post(f"{BASE_URL}/api/auth/login", json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD})
    assert r.status_code == 200, f"Login failed: {r.status_code} {r.text}"
    return s


def _reset_admin_credits(credits: int, is_new_user: bool = True):
    """Reset admin credits directly via mongosh."""
    import subprocess
    cmd = (
        f'db=db.getSiblingDB("test_database"); '
        f'db.users.updateOne({{email:"{ADMIN_EMAIL}"}}, '
        f'{{$set:{{premium_credits:{credits},is_new_user:{str(is_new_user).lower()}}}}});'
    )
    subprocess.run(["mongosh", "--quiet", "--eval", cmd], capture_output=True, check=True)


def _consume_stream(response) -> str:
    """Read SSE stream fully and return concatenated content."""
    content = ""
    for line in response.iter_lines(decode_unicode=True):
        if line and line.startswith("data:"):
            data = line[5:].lstrip()
            if data == "[DONE]":
                break
            content += data
    return content


# ==================== GET /api/user/credits ====================
class TestGetCredits:
    def test_get_credits_returns_correct_shape(self, admin_session):
        _reset_admin_credits(3, True)
        r = admin_session.get(f"{BASE_URL}/api/user/credits")
        assert r.status_code == 200
        data = r.json()
        assert "premium_credits" in data
        assert "auth_provider" in data
        assert data["premium_credits"] == 3

    def test_get_credits_unauthenticated(self):
        r = requests.get(f"{BASE_URL}/api/user/credits")
        assert r.status_code == 401


# ==================== POST /api/user/dismiss-welcome ====================
class TestDismissWelcome:
    def test_dismiss_welcome_sets_flag_false(self, admin_session):
        _reset_admin_credits(3, True)
        # Verify is_new_user=true before
        me = admin_session.get(f"{BASE_URL}/api/auth/me").json()
        assert me.get("is_new_user") is True

        r = admin_session.post(f"{BASE_URL}/api/user/dismiss-welcome")
        assert r.status_code == 200

        me2 = admin_session.get(f"{BASE_URL}/api/auth/me").json()
        assert me2.get("is_new_user") is False


# ==================== Premium credit consumption ====================
class TestPremiumBio:
    def test_bio_no_premium_does_not_consume_credit(self, admin_session):
        _reset_admin_credits(2, False)
        before = admin_session.get(f"{BASE_URL}/api/user/credits").json()["premium_credits"]
        r = admin_session.post(
            f"{BASE_URL}/api/generate/bio",
            json={"character_name": "Moses", "focus": "Faith", "depth": "Standard", "use_premium": False},
            stream=True,
            timeout=60,
        )
        assert r.status_code == 200
        _consume_stream(r)
        after = admin_session.get(f"{BASE_URL}/api/user/credits").json()["premium_credits"]
        assert before == after == 2, f"Non-premium bio should not consume credit; before={before}, after={after}"

    def test_bio_premium_with_credits_decrements(self, admin_session):
        _reset_admin_credits(2, False)
        before = admin_session.get(f"{BASE_URL}/api/user/credits").json()["premium_credits"]
        r = admin_session.post(
            f"{BASE_URL}/api/generate/bio",
            json={"character_name": "David", "focus": "Kingship", "depth": "Standard", "use_premium": True},
            stream=True,
            timeout=60,
        )
        assert r.status_code == 200
        content = _consume_stream(r)
        assert len(content) > 50, f"Premium bio content unexpectedly short: {content[:200]}"
        after = admin_session.get(f"{BASE_URL}/api/user/credits").json()["premium_credits"]
        assert after == before - 1, f"Expected credit decrement: before={before}, after={after}"

    def test_bio_premium_no_credits_returns_402(self, admin_session):
        _reset_admin_credits(0, False)
        r = admin_session.post(
            f"{BASE_URL}/api/generate/bio",
            json={"character_name": "Paul", "focus": "Mission", "depth": "Standard", "use_premium": True},
        )
        assert r.status_code == 402, f"Expected 402, got {r.status_code}: {r.text}"


class TestPremiumTheologian:
    def test_theologian_premium_no_credits_returns_402(self, admin_session):
        _reset_admin_credits(0, False)
        r = admin_session.post(
            f"{BASE_URL}/api/generate/theologian",
            json={"question": "What is grace?", "complexity": "Simplified", "use_premium": True},
        )
        assert r.status_code == 402

    def test_theologian_premium_with_credits_decrements(self, admin_session):
        _reset_admin_credits(2, False)
        before = admin_session.get(f"{BASE_URL}/api/user/credits").json()["premium_credits"]
        r = admin_session.post(
            f"{BASE_URL}/api/generate/theologian",
            json={"question": "What is the trinity?", "complexity": "Simplified", "use_premium": True},
            stream=True,
            timeout=60,
        )
        assert r.status_code == 200
        _consume_stream(r)
        after = admin_session.get(f"{BASE_URL}/api/user/credits").json()["premium_credits"]
        assert after == before - 1

    def test_theologian_no_premium_no_consume(self, admin_session):
        _reset_admin_credits(2, False)
        before = admin_session.get(f"{BASE_URL}/api/user/credits").json()["premium_credits"]
        r = admin_session.post(
            f"{BASE_URL}/api/generate/theologian",
            json={"question": "What is love?", "complexity": "Simplified", "use_premium": False},
            stream=True,
            timeout=60,
        )
        assert r.status_code == 200
        _consume_stream(r)
        after = admin_session.get(f"{BASE_URL}/api/user/credits").json()["premium_credits"]
        assert before == after


# ==================== Non-premium tools never consume credits ====================
class TestNonPremiumTools:
    @pytest.mark.parametrize("endpoint,payload", [
        ("prayer", {"topic": "peace", "tone": "gentle"}),
        ("sermon", {"topic": "grace", "audience": "adults", "style": "expository"}),
        ("parable", {"parable_name": "Prodigal Son", "focus": "forgiveness"}),
        ("devotional", {"date": "2026-01-15"}),
        ("story", {"topic": "Noah"}),
        ("explainer", {"reference": "John 3:16", "style": "practical"}),
    ])
    def test_non_premium_tool_does_not_consume(self, admin_session, endpoint, payload):
        _reset_admin_credits(2, False)
        before = admin_session.get(f"{BASE_URL}/api/user/credits").json()["premium_credits"]
        r = admin_session.post(f"{BASE_URL}/api/generate/{endpoint}", json=payload, stream=True, timeout=60)
        assert r.status_code == 200
        _consume_stream(r)
        after = admin_session.get(f"{BASE_URL}/api/user/credits").json()["premium_credits"]
        assert before == after == 2, f"{endpoint} should not consume credits"


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
