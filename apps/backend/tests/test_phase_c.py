"""
DeMaxtore Phase C backend test suite.
Covers: AUTH (login/refresh/logout/me/forgot/validation/lockout), RBAC,
        NOTIFICATIONS (list/pagination/read/read-all/isolation/filter),
        SOCKET.IO (handshake auth) and HEALTH.
Target backend: http://localhost:8002 (NOT legacy 8001).
"""
import os
import time
import uuid
import pytest
import requests

BASE_URL = os.environ.get("DMX_BACKEND_URL", "http://localhost:8002").rstrip("/")
PASSWORD = "Passw0rd!"
ADMIN = "admin@demaxtore.local"
BUYER1 = "buyer1@acme.test"
BUYER2 = "buyer2@beta.test"        # used for the brute-force lockout test
SUPPLIER1 = "supplier1@acme-mfg.test"


# ---------- helpers / fixtures ----------

def _login(session, email, password=PASSWORD):
    return session.post(
        f"{BASE_URL}/api/auth/login",
        json={"email": email, "password": password},
    )


@pytest.fixture(scope="module")
def admin_session():
    s = requests.Session()
    r = _login(s, ADMIN)
    assert r.status_code == 200, r.text
    s.headers.update({"Authorization": f"Bearer {r.json()['accessToken']}"})
    return s


@pytest.fixture(scope="module")
def buyer_session():
    s = requests.Session()
    r = _login(s, BUYER1)
    assert r.status_code == 200, r.text
    s.headers.update({"Authorization": f"Bearer {r.json()['accessToken']}"})
    return s


@pytest.fixture(scope="module")
def supplier_session():
    s = requests.Session()
    r = _login(s, SUPPLIER1)
    assert r.status_code == 200, r.text
    s.headers.update({"Authorization": f"Bearer {r.json()['accessToken']}"})
    return s


# ============ HEALTH ============

class TestHealth:
    def test_healthz_ok(self):
        r = requests.get(f"{BASE_URL}/api/healthz")
        assert r.status_code == 200
        body = r.json()
        assert body["status"] == "ok"
        assert body["db"] == "up"
        assert isinstance(body["uptimeSec"], (int, float))
        assert "timestamp" in body
        # ISO8601
        assert "T" in body["timestamp"]


# ============ AUTH ============

class TestAuthLogin:
    def test_login_admin(self):
        s = requests.Session()
        r = _login(s, ADMIN)
        assert r.status_code == 200
        data = r.json()
        assert "user" in data and "accessToken" in data and "expiresInSec" in data
        assert data["user"]["email"] == ADMIN
        assert data["user"]["role"] == "ADMIN"
        assert isinstance(data["accessToken"], str) and len(data["accessToken"]) > 20
        # httpOnly refresh cookie
        cookie = next((c for c in s.cookies if c.name == "dmx_refresh"), None)
        assert cookie is not None, "dmx_refresh cookie missing"
        assert cookie.path == "/api/auth", f"cookie path {cookie.path}"
        # httponly is in _rest
        assert cookie.has_nonstandard_attr("HttpOnly") or cookie._rest.get("HttpOnly") is not None

    def test_login_buyer(self):
        r = _login(requests.Session(), BUYER1)
        assert r.status_code == 200
        assert r.json()["user"]["role"] == "BUYER"

    def test_login_supplier(self):
        r = _login(requests.Session(), SUPPLIER1)
        assert r.status_code == 200
        assert r.json()["user"]["role"] == "SUPPLIER"

    def test_invalid_password(self):
        r = _login(requests.Session(), ADMIN, "wrong-password-zzz")
        assert r.status_code == 401
        body = r.json()
        assert body["error"]["code"] == "UNAUTHENTICATED"
        assert body["error"]["message"] == "Invalid email or password"

    def test_unknown_email_no_enumeration(self):
        r = _login(requests.Session(), f"nobody-{uuid.uuid4().hex}@test.example")
        assert r.status_code == 401
        body = r.json()
        assert body["error"]["code"] == "UNAUTHENTICATED"
        assert body["error"]["message"] == "Invalid email or password"

    def test_login_zod_validation(self):
        r = requests.post(f"{BASE_URL}/api/auth/login", json={})
        assert r.status_code == 400
        body = r.json()
        assert body["error"]["code"] == "VALIDATION_ERROR"
        assert "issues" in body["error"]["details"]
        assert isinstance(body["error"]["details"]["issues"], list)


class TestAuthMe:
    def test_me_without_token_401(self):
        r = requests.get(f"{BASE_URL}/api/auth/me")
        assert r.status_code == 401
        assert r.json()["error"]["code"] == "UNAUTHENTICATED"

    def test_me_admin(self, admin_session):
        r = admin_session.get(f"{BASE_URL}/api/auth/me")
        assert r.status_code == 200
        assert r.json()["email"] == ADMIN
        assert r.json()["role"] == "ADMIN"

    def test_me_buyer(self, buyer_session):
        r = buyer_session.get(f"{BASE_URL}/api/auth/me")
        assert r.status_code == 200
        assert r.json()["role"] == "BUYER"

    def test_me_supplier(self, supplier_session):
        r = supplier_session.get(f"{BASE_URL}/api/auth/me")
        assert r.status_code == 200
        assert r.json()["role"] == "SUPPLIER"


class TestAuthRefreshRotation:
    def test_refresh_rotates_and_reuse_is_revoked(self):
        s = requests.Session()
        r = _login(s, BUYER1)
        assert r.status_code == 200
        first_cookie = next(c for c in s.cookies if c.name == "dmx_refresh").value

        # First refresh — should succeed and rotate
        r1 = s.post(f"{BASE_URL}/api/auth/refresh")
        assert r1.status_code == 200, r1.text
        body = r1.json()
        assert "accessToken" in body
        rotated_cookie = next(c for c in s.cookies if c.name == "dmx_refresh").value
        assert rotated_cookie != first_cookie, "refresh cookie did not rotate"

        # Reuse of the ORIGINAL refresh token should be revoked
        replay = requests.Session()
        replay.cookies.set("dmx_refresh", first_cookie, path="/api/auth")
        r2 = replay.post(f"{BASE_URL}/api/auth/refresh")
        assert r2.status_code == 401, f"expected 401 on reuse, got {r2.status_code} {r2.text}"

    def test_logout_clears_refresh(self):
        s = requests.Session()
        assert _login(s, BUYER1).status_code == 200
        # logout
        r = s.post(f"{BASE_URL}/api/auth/logout")
        assert r.status_code == 200
        assert r.json().get("ok") is True
        # subsequent refresh should fail (cookie cleared by server)
        r2 = s.post(f"{BASE_URL}/api/auth/refresh")
        assert r2.status_code == 401


class TestForgotPassword:
    def test_known_email(self):
        r = requests.post(
            f"{BASE_URL}/api/auth/forgot-password",
            json={"email": BUYER1},
        )
        assert r.status_code == 200
        assert r.json().get("ok") is True

    def test_unknown_email_same_response(self):
        r = requests.post(
            f"{BASE_URL}/api/auth/forgot-password",
            json={"email": f"ghost-{uuid.uuid4().hex}@test.example"},
        )
        assert r.status_code == 200
        assert r.json().get("ok") is True


class TestBruteForce:
    """Uses buyer2@beta.test to avoid locking other test users."""

    def test_lockout_after_5_failures(self):
        # 5 bad attempts
        for i in range(5):
            r = _login(requests.Session(), BUYER2, "wrong-pass-xx")
            assert r.status_code == 401, f"attempt {i+1}: {r.status_code} {r.text}"
        # 6th attempt — even with correct password — should be rate-limited
        r = _login(requests.Session(), BUYER2, PASSWORD)
        assert r.status_code == 429, f"expected 429, got {r.status_code} {r.text}"
        body = r.json()
        assert body["error"]["code"] == "PRECONDITION_FAILED"
        assert "Retry in" in body["error"]["message"]


# ============ RBAC ============

class TestRBAC:
    def test_protected_route_without_auth(self):
        r = requests.get(f"{BASE_URL}/api/notifications")
        assert r.status_code == 401
        assert r.json()["error"]["code"] == "UNAUTHENTICATED"

    def test_role_field_present_for_three_roles(self, admin_session, buyer_session, supplier_session):
        assert admin_session.get(f"{BASE_URL}/api/auth/me").json()["role"] == "ADMIN"
        assert buyer_session.get(f"{BASE_URL}/api/auth/me").json()["role"] == "BUYER"
        assert supplier_session.get(f"{BASE_URL}/api/auth/me").json()["role"] == "SUPPLIER"

    def test_require_role_source_present(self):
        # Per Phase C spec, requireRole exists in middleware/auth.ts but no role-restricted
        # routes are mounted yet — verify the symbol is present.
        path = "/app/apps/backend/src/middleware/auth.ts"
        with open(path) as f:
            src = f.read()
        assert "requireRole" in src, "requireRole middleware not found in auth.ts"


# ============ NOTIFICATIONS ============

class TestNotifications:
    def test_list_as_buyer(self, buyer_session):
        r = buyer_session.get(f"{BASE_URL}/api/notifications")
        assert r.status_code == 200
        data = r.json()
        assert "items" in data
        assert isinstance(data["items"], list)
        assert "unreadCount" in data and isinstance(data["unreadCount"], int)
        assert "nextCursor" in data
        # sorted desc by createdAt
        if len(data["items"]) >= 2:
            assert data["items"][0]["createdAt"] >= data["items"][1]["createdAt"]

    def test_pagination(self, buyer_session):
        r = buyer_session.get(f"{BASE_URL}/api/notifications", params={"limit": 1})
        assert r.status_code == 200
        page1 = r.json()
        assert len(page1["items"]) == 1
        if page1["nextCursor"]:
            r2 = buyer_session.get(
                f"{BASE_URL}/api/notifications",
                params={"limit": 1, "cursor": page1["nextCursor"]},
            )
            assert r2.status_code == 200
            page2 = r2.json()
            assert len(page2["items"]) <= 1
            if page2["items"]:
                assert page2["items"][0]["id"] != page1["items"][0]["id"]

    def test_mark_read_and_idempotent(self, buyer_session):
        # use a fresh session so list reflects current state
        r = buyer_session.get(f"{BASE_URL}/api/notifications")
        items = r.json()["items"]
        target = next((n for n in items if not n.get("read")), items[0])
        nid = target["id"]
        r1 = buyer_session.post(f"{BASE_URL}/api/notifications/{nid}/read")
        assert r1.status_code == 200, r1.text
        body1 = r1.json()
        assert body1.get("read") is True
        assert body1.get("readAt")
        # idempotent
        r2 = buyer_session.post(f"{BASE_URL}/api/notifications/{nid}/read")
        assert r2.status_code == 200
        assert r2.json().get("read") is True

    def test_cross_user_isolation(self, buyer_session, supplier_session):
        # find a buyer notification id
        r = buyer_session.get(f"{BASE_URL}/api/notifications")
        items = r.json()["items"]
        if not items:
            pytest.skip("no buyer notifications to test isolation")
        nid = items[0]["id"]
        # supplier tries to read it
        rs = supplier_session.post(f"{BASE_URL}/api/notifications/{nid}/read")
        assert rs.status_code == 404
        assert rs.json()["error"]["code"] == "NOT_FOUND"

    def test_unread_filter(self, buyer_session):
        r = buyer_session.get(
            f"{BASE_URL}/api/notifications", params={"unreadOnly": "true"}
        )
        assert r.status_code == 200
        for it in r.json()["items"]:
            assert it.get("read") is False

    def test_read_all_then_unread_zero(self):
        # Use a dedicated session to avoid mutating other tests' state
        s = requests.Session()
        assert _login(s, BUYER1).status_code == 200
        s.headers.update({"Authorization": f"Bearer {s.cookies.get('x') or ''}"})
        # re-login cleanly
        r = _login(requests.Session(), BUYER1)
        token = r.json()["accessToken"]
        h = {"Authorization": f"Bearer {token}"}
        r2 = requests.post(f"{BASE_URL}/api/notifications/read-all", headers=h)
        assert r2.status_code == 200
        body = r2.json()
        assert "updated" in body and isinstance(body["updated"], int)
        r3 = requests.get(f"{BASE_URL}/api/notifications", headers=h)
        assert r3.status_code == 200
        assert r3.json()["unreadCount"] == 0


# ============ SOCKET.IO ============

class TestSocket:
    def _connect(self, token=None, timeout=5):
        import socketio
        client = socketio.Client(reconnection=False, logger=False, engineio_logger=False)
        errors = []

        @client.event
        def connect_error(data):
            errors.append(str(data))

        auth = {"token": token} if token else {}
        try:
            client.connect(
                BASE_URL,
                socketio_path="/socket.io",
                auth=auth,
                wait=True,
                wait_timeout=timeout,
                transports=["websocket"],
            )
            connected = client.connected
        except Exception as e:
            errors.append(str(e))
            connected = False
        return client, connected, errors

    def test_connect_without_token_rejected(self):
        client, connected, errors = self._connect(token=None)
        assert not connected
        # error should mention UNAUTHENTICATED
        assert any("UNAUTHENTICATED" in e or "authentication" in e.lower() for e in errors), errors
        try:
            client.disconnect()
        except Exception:
            pass

    def test_connect_with_invalid_token_rejected(self):
        client, connected, errors = self._connect(token="not-a-valid-jwt")
        assert not connected
        assert any("UNAUTHENTICATED" in e or "authentication" in e.lower() for e in errors), errors
        try:
            client.disconnect()
        except Exception:
            pass

    def test_connect_with_valid_token(self):
        r = _login(requests.Session(), BUYER1)
        token = r.json()["accessToken"]
        client, connected, errors = self._connect(token=token, timeout=6)
        assert connected, f"failed to connect: {errors}"
        # give server a moment to auto-join rooms
        time.sleep(0.3)
        client.disconnect()

    def test_socket_events_contract_present(self):
        path = "/app/packages/contracts/src/socket-events.ts"
        with open(path) as f:
            src = f.read()
        assert "SocketEvents" in src
        # WORKSPACE_SUBSCRIBE is referenced in spec
        assert "WORKSPACE_SUBSCRIBE" in src or "workspace:subscribe" in src
