"""DeMaxtore Sprint 1 backend API tests.

Covers: health, auth (login/refresh/me/logout/forgot+reset), notifications.
Uses public REACT_APP_BACKEND_URL via /api prefix.
"""
import os
import pytest
import requests

BASE_URL = os.environ.get(
    "REACT_APP_BACKEND_URL",
    "https://demaxstore-platform.preview.emergentagent.com",
).rstrip("/")

BUYER = {"email": "buyer@demaxtore.com", "password": "Buyer@123"}
SUPPLIER = {"email": "supplier@demaxtore.com", "password": "Supplier@123"}
ADMIN = {"email": "admin@demaxtore.com", "password": "Admin@123"}


@pytest.fixture(scope="module")
def client():
    s = requests.Session()
    s.headers.update({"Content-Type": "application/json"})
    return s


def _login(client, creds):
    return client.post(f"{BASE_URL}/api/auth/login", json=creds, timeout=20)


# ---- Health ----
class TestHealth:
    def test_health_ok(self, client):
        r = client.get(f"{BASE_URL}/api/health", timeout=15)
        assert r.status_code == 200
        data = r.json()
        assert data.get("status") == "ok"
        assert "time" in data


# ---- Auth / Login ----
class TestLogin:
    @pytest.mark.parametrize("creds,role", [
        (BUYER, "buyer"),
        (SUPPLIER, "supplier"),
        (ADMIN, "admin"),
    ])
    def test_login_each_seeded_account(self, client, creds, role):
        r = _login(client, creds)
        assert r.status_code == 200, r.text
        data = r.json()
        for k in ("access_token", "refresh_token", "user"):
            assert k in data
        u = data["user"]
        assert u["email"] == creds["email"]
        assert u["role"] == role
        assert u["id"] and u["name"]
        assert isinstance(data["access_token"], str) and len(data["access_token"]) > 20

    def test_login_wrong_password(self, client):
        r = _login(client, {"email": BUYER["email"], "password": "WrongPass!"})
        assert r.status_code == 401

    def test_login_unknown_user(self, client):
        r = _login(client, {"email": "nobody@demaxtore.com", "password": "whatever"})
        assert r.status_code == 401


# ---- /me + logout ----
class TestMeLogout:
    def test_me_with_token(self, client):
        tok = _login(client, BUYER).json()["access_token"]
        r = client.get(
            f"{BASE_URL}/api/auth/me",
            headers={"Authorization": f"Bearer {tok}"},
            timeout=15,
        )
        assert r.status_code == 200
        assert r.json()["email"] == BUYER["email"]

    def test_me_without_token(self, client):
        r = requests.get(f"{BASE_URL}/api/auth/me", timeout=15)
        assert r.status_code in (401, 403)

    def test_logout_requires_auth(self, client):
        r = requests.post(f"{BASE_URL}/api/auth/logout", timeout=15)
        assert r.status_code in (401, 403)

    def test_logout_ok(self, client):
        tok = _login(client, BUYER).json()["access_token"]
        r = client.post(
            f"{BASE_URL}/api/auth/logout",
            headers={"Authorization": f"Bearer {tok}"},
            timeout=15,
        )
        assert r.status_code == 200


# ---- Refresh token ----
class TestRefresh:
    def test_refresh_returns_new_access(self, client):
        login = _login(client, BUYER).json()
        r = client.post(
            f"{BASE_URL}/api/auth/refresh",
            json={"refresh_token": login["refresh_token"]},
            timeout=15,
        )
        assert r.status_code == 200, r.text
        new_access = r.json()["access_token"]
        assert isinstance(new_access, str) and len(new_access) > 20
        # New access token should be usable on /me
        me = client.get(
            f"{BASE_URL}/api/auth/me",
            headers={"Authorization": f"Bearer {new_access}"},
            timeout=15,
        )
        assert me.status_code == 200

    def test_access_token_rejected_as_refresh(self, client):
        login = _login(client, BUYER).json()
        r = client.post(
            f"{BASE_URL}/api/auth/refresh",
            json={"refresh_token": login["access_token"]},
            timeout=15,
        )
        assert r.status_code == 401


# ---- Forgot / Reset password ----
class TestForgotReset:
    def test_forgot_unknown_returns_null_token(self, client):
        r = client.post(
            f"{BASE_URL}/api/auth/forgot-password",
            json={"email": "ghost@demaxtore.com"},
            timeout=15,
        )
        assert r.status_code == 200
        assert r.json().get("reset_token") is None

    def test_forgot_and_reset_flow_then_restore(self, client):
        # 1. Request reset for buyer
        r = client.post(
            f"{BASE_URL}/api/auth/forgot-password",
            json={"email": BUYER["email"]},
            timeout=15,
        )
        assert r.status_code == 200
        token = r.json().get("reset_token")
        assert token, "reset_token must be present in Sprint 1"

        # 2. Short password should fail
        bad = client.post(
            f"{BASE_URL}/api/auth/reset-password",
            json={"token": token, "new_password": "short"},
            timeout=15,
        )
        assert bad.status_code == 400

        # 3. Valid reset to a new password
        new_pwd = "NewBuyerPass!9"
        ok = client.post(
            f"{BASE_URL}/api/auth/reset-password",
            json={"token": token, "new_password": new_pwd},
            timeout=15,
        )
        assert ok.status_code == 200, ok.text

        # 4. Login with new password
        ln = _login(client, {"email": BUYER["email"], "password": new_pwd})
        assert ln.status_code == 200

        # 5. Reusing the same token should fail
        reuse = client.post(
            f"{BASE_URL}/api/auth/reset-password",
            json={"token": token, "new_password": "AnotherPass!9"},
            timeout=15,
        )
        assert reuse.status_code == 400

        # 6. RESTORE original password via a fresh reset cycle
        r2 = client.post(
            f"{BASE_URL}/api/auth/forgot-password",
            json={"email": BUYER["email"]},
            timeout=15,
        )
        restore_token = r2.json().get("reset_token")
        assert restore_token
        restore = client.post(
            f"{BASE_URL}/api/auth/reset-password",
            json={"token": restore_token, "new_password": BUYER["password"]},
            timeout=15,
        )
        assert restore.status_code == 200
        # confirm original credentials work again
        ln2 = _login(client, BUYER)
        assert ln2.status_code == 200


# ---- Notifications ----
@pytest.fixture(scope="module")
def buyer_token(client):
    return _login(client, BUYER).json()["access_token"]


@pytest.fixture(scope="module")
def supplier_token(client):
    return _login(client, SUPPLIER).json()["access_token"]


@pytest.fixture(scope="module")
def admin_token(client):
    return _login(client, ADMIN).json()["access_token"]


class TestNotifications:
    def _list(self, client, token):
        return client.get(
            f"{BASE_URL}/api/notifications",
            headers={"Authorization": f"Bearer {token}"},
            timeout=15,
        )

    def test_buyer_sees_buyer_notifs(self, client, buyer_token):
        r = self._list(client, buyer_token)
        assert r.status_code == 200
        items = r.json()
        assert isinstance(items, list) and len(items) > 0
        # role-filter: every role-tagged notif must be buyer or untagged
        for n in items:
            for k in ("id", "type", "title", "message", "read", "created_at"):
                assert k in n
            if n.get("role"):
                assert n["role"] == "buyer"

    def test_supplier_sees_supplier_notifs(self, client, supplier_token):
        r = self._list(client, supplier_token)
        assert r.status_code == 200
        for n in r.json():
            if n.get("role"):
                assert n["role"] == "supplier"

    def test_admin_sees_admin_notifs(self, client, admin_token):
        r = self._list(client, admin_token)
        assert r.status_code == 200
        for n in r.json():
            if n.get("role"):
                assert n["role"] == "admin"

    def test_mark_one_read(self, client, buyer_token):
        items = self._list(client, buyer_token).json()
        target = items[0]
        r = client.post(
            f"{BASE_URL}/api/notifications/{target['id']}/read",
            headers={"Authorization": f"Bearer {buyer_token}"},
            timeout=15,
        )
        assert r.status_code == 200
        # verify persistence
        items2 = self._list(client, buyer_token).json()
        match = next((n for n in items2 if n["id"] == target["id"]), None)
        assert match is not None and match["read"] is True

    def test_mark_one_read_404(self, client, buyer_token):
        r = client.post(
            f"{BASE_URL}/api/notifications/nonexistent-id-xyz/read",
            headers={"Authorization": f"Bearer {buyer_token}"},
            timeout=15,
        )
        assert r.status_code == 404

    def test_mark_all_read(self, client, supplier_token):
        r = client.post(
            f"{BASE_URL}/api/notifications/read-all",
            headers={"Authorization": f"Bearer {supplier_token}"},
            timeout=15,
        )
        assert r.status_code == 200
        items = self._list(client, supplier_token).json()
        for n in items:
            if n.get("role") in (None, "supplier"):
                assert n["read"] is True

    def test_notifications_requires_auth(self, client):
        r = requests.get(f"{BASE_URL}/api/notifications", timeout=15)
        assert r.status_code in (401, 403)
