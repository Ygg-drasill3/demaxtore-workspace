from dotenv import load_dotenv
from pathlib import Path

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / ".env")

import os
import logging
import secrets
import uuid
from datetime import datetime, timezone, timedelta
from typing import List, Literal, Optional

import bcrypt
import jwt
from fastapi import FastAPI, APIRouter, Depends, HTTPException, Request, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
from pydantic import BaseModel, Field, EmailStr, ConfigDict


# ---------- Logging ----------
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
)
logger = logging.getLogger("demaxtore")


# ---------- Mongo ----------
mongo_url = os.environ["MONGO_URL"]
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ["DB_NAME"]]


# ---------- App + Router ----------
app = FastAPI(title="DeMaxtore API", version="0.1.0")
api_router = APIRouter(prefix="/api")
auth_router = APIRouter(prefix="/api/auth", tags=["auth"])


# ---------- Auth Config ----------
JWT_SECRET = os.environ["JWT_SECRET"]
JWT_ALGORITHM = "HS256"
ACCESS_TTL = timedelta(minutes=int(os.environ.get("ACCESS_TOKEN_TTL_MIN", "60")))
REFRESH_TTL = timedelta(days=int(os.environ.get("REFRESH_TOKEN_TTL_DAYS", "7")))

Role = Literal["buyer", "supplier", "admin"]


# ---------- Models ----------
class UserPublic(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str
    email: EmailStr
    name: str
    role: Role
    created_at: datetime


class LoginIn(BaseModel):
    email: EmailStr
    password: str


class TokenPair(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    user: UserPublic


class RefreshIn(BaseModel):
    refresh_token: str


class AccessOut(BaseModel):
    access_token: str
    token_type: str = "bearer"


class ForgotPasswordIn(BaseModel):
    email: EmailStr


class ForgotPasswordOut(BaseModel):
    message: str
    # Sprint 1: returned in-response since no email provider wired
    reset_token: Optional[str] = None


class ResetPasswordIn(BaseModel):
    token: str
    new_password: str


class NotificationOut(BaseModel):
    id: str
    type: Literal["INFO", "SUCCESS", "WARNING", "ERROR"]
    title: str
    message: str
    read: bool
    created_at: datetime
    role: Optional[Role] = None
    link: Optional[str] = None


# ---------- Password Helpers ----------
def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")


def verify_password(plain: str, hashed: str) -> bool:
    try:
        return bcrypt.checkpw(plain.encode("utf-8"), hashed.encode("utf-8"))
    except Exception:
        return False


# ---------- JWT Helpers ----------
def _encode(payload: dict) -> str:
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)


def create_access_token(user_id: str, email: str, role: str) -> str:
    return _encode(
        {
            "sub": user_id,
            "email": email,
            "role": role,
            "type": "access",
            "exp": datetime.now(timezone.utc) + ACCESS_TTL,
            "iat": datetime.now(timezone.utc),
        }
    )


def create_refresh_token(user_id: str) -> str:
    return _encode(
        {
            "sub": user_id,
            "type": "refresh",
            "jti": secrets.token_urlsafe(16),
            "exp": datetime.now(timezone.utc) + REFRESH_TTL,
            "iat": datetime.now(timezone.utc),
        }
    )


def decode_token(token: str) -> dict:
    try:
        return jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")


# ---------- User serialization ----------
def user_to_public(doc: dict) -> UserPublic:
    return UserPublic(
        id=doc["id"],
        email=doc["email"],
        name=doc["name"],
        role=doc["role"],
        created_at=(
            datetime.fromisoformat(doc["created_at"])
            if isinstance(doc["created_at"], str)
            else doc["created_at"]
        ),
    )


# ---------- Auth Dependency ----------
bearer_scheme = HTTPBearer(auto_error=False)


async def get_current_user(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(bearer_scheme),
) -> UserPublic:
    if credentials is None or not credentials.credentials:
        raise HTTPException(status_code=401, detail="Not authenticated")
    payload = decode_token(credentials.credentials)
    if payload.get("type") != "access":
        raise HTTPException(status_code=401, detail="Invalid token type")
    user_id = payload.get("sub")
    if not user_id:
        raise HTTPException(status_code=401, detail="Invalid token")
    doc = await db.users.find_one({"id": user_id}, {"_id": 0})
    if not doc:
        raise HTTPException(status_code=401, detail="User not found")
    return user_to_public(doc)


def require_roles(*roles: str):
    async def dep(user: UserPublic = Depends(get_current_user)) -> UserPublic:
        if user.role not in roles:
            raise HTTPException(status_code=403, detail="Insufficient permissions")
        return user

    return dep


# ---------- Auth Endpoints ----------
@auth_router.post("/login", response_model=TokenPair)
async def login(body: LoginIn):
    email = body.email.lower().strip()
    doc = await db.users.find_one({"email": email}, {"_id": 0})
    if not doc or not verify_password(body.password, doc["password_hash"]):
        raise HTTPException(status_code=401, detail="Invalid email or password")
    access = create_access_token(doc["id"], doc["email"], doc["role"])
    refresh = create_refresh_token(doc["id"])
    return TokenPair(
        access_token=access,
        refresh_token=refresh,
        user=user_to_public(doc),
    )


@auth_router.post("/refresh", response_model=AccessOut)
async def refresh(body: RefreshIn):
    payload = decode_token(body.refresh_token)
    if payload.get("type") != "refresh":
        raise HTTPException(status_code=401, detail="Invalid token type")
    user_id = payload.get("sub")
    doc = await db.users.find_one({"id": user_id}, {"_id": 0})
    if not doc:
        raise HTTPException(status_code=401, detail="User not found")
    access = create_access_token(doc["id"], doc["email"], doc["role"])
    return AccessOut(access_token=access)


@auth_router.post("/logout")
async def logout(user: UserPublic = Depends(get_current_user)):
    # Stateless JWT — client discards tokens. Endpoint exists for symmetry.
    return {"message": "Logged out"}


@auth_router.get("/me", response_model=UserPublic)
async def me(user: UserPublic = Depends(get_current_user)):
    return user


@auth_router.post("/forgot-password", response_model=ForgotPasswordOut)
async def forgot_password(body: ForgotPasswordIn):
    email = body.email.lower().strip()
    doc = await db.users.find_one({"email": email}, {"_id": 0})
    # Always return success to avoid user enumeration; only insert token if user exists
    if not doc:
        return ForgotPasswordOut(
            message="If an account exists for that email, a reset link has been issued.",
            reset_token=None,
        )
    token = secrets.token_urlsafe(32)
    await db.password_reset_tokens.insert_one(
        {
            "id": str(uuid.uuid4()),
            "user_id": doc["id"],
            "token": token,
            "used": False,
            "expires_at": (datetime.now(timezone.utc) + timedelta(hours=1)).isoformat(),
            "created_at": datetime.now(timezone.utc).isoformat(),
        }
    )
    logger.info("Password reset token issued for %s: %s", email, token)
    # Sprint 1: return the token in the response (no email provider wired)
    return ForgotPasswordOut(
        message="Reset token issued. Sprint 1 returns the token in-response.",
        reset_token=token,
    )


@auth_router.post("/reset-password")
async def reset_password(body: ResetPasswordIn):
    record = await db.password_reset_tokens.find_one(
        {"token": body.token, "used": False}, {"_id": 0}
    )
    if not record:
        raise HTTPException(status_code=400, detail="Invalid or used token")
    expires_at = datetime.fromisoformat(record["expires_at"])
    if expires_at.tzinfo is None:
        expires_at = expires_at.replace(tzinfo=timezone.utc)
    if expires_at < datetime.now(timezone.utc):
        raise HTTPException(status_code=400, detail="Token expired")
    if len(body.new_password) < 8:
        raise HTTPException(
            status_code=400, detail="Password must be at least 8 characters"
        )
    await db.users.update_one(
        {"id": record["user_id"]},
        {"$set": {"password_hash": hash_password(body.new_password)}},
    )
    await db.password_reset_tokens.update_one(
        {"token": body.token}, {"$set": {"used": True}}
    )
    return {"message": "Password updated"}


# ---------- Notifications ----------
@api_router.get("/notifications", response_model=List[NotificationOut])
async def list_notifications(user: UserPublic = Depends(get_current_user)):
    cursor = db.notifications.find(
        {"$or": [{"role": user.role}, {"role": None}, {"role": {"$exists": False}}]},
        {"_id": 0},
    ).sort("created_at", -1)
    docs = await cursor.to_list(200)
    out: List[NotificationOut] = []
    for d in docs:
        out.append(
            NotificationOut(
                id=d["id"],
                type=d["type"],
                title=d["title"],
                message=d["message"],
                read=d.get("read", False),
                created_at=(
                    datetime.fromisoformat(d["created_at"])
                    if isinstance(d["created_at"], str)
                    else d["created_at"]
                ),
                role=d.get("role"),
                link=d.get("link"),
            )
        )
    return out


@api_router.post("/notifications/{notification_id}/read")
async def mark_read(
    notification_id: str, user: UserPublic = Depends(get_current_user)
):
    res = await db.notifications.update_one(
        {"id": notification_id}, {"$set": {"read": True}}
    )
    if res.matched_count == 0:
        raise HTTPException(status_code=404, detail="Notification not found")
    return {"message": "Marked as read"}


@api_router.post("/notifications/read-all")
async def mark_all_read(user: UserPublic = Depends(get_current_user)):
    await db.notifications.update_many(
        {"$or": [{"role": user.role}, {"role": None}]},
        {"$set": {"read": True}},
    )
    return {"message": "All marked as read"}


# ---------- Health ----------
@api_router.get("/")
async def root():
    return {"service": "DeMaxtore API", "status": "ok"}


@api_router.get("/health")
async def health():
    return {"status": "ok", "time": datetime.now(timezone.utc).isoformat()}


# ---------- Seeders ----------
SEED_USERS = [
    {
        "key": "BUYER",
        "name": "Bianca Buyer",
        "role": "buyer",
    },
    {
        "key": "SUPPLIER",
        "name": "Sanjay Supplier",
        "role": "supplier",
    },
    {
        "key": "ADMIN",
        "name": "Anna Admin",
        "role": "admin",
    },
]


async def seed_users():
    for spec in SEED_USERS:
        email = os.environ.get(f"SEED_{spec['key']}_EMAIL", "").lower().strip()
        password = os.environ.get(f"SEED_{spec['key']}_PASSWORD", "")
        if not email or not password:
            continue
        existing = await db.users.find_one({"email": email})
        if existing:
            # Keep the hash in sync if env password changed
            if not verify_password(password, existing.get("password_hash", "")):
                await db.users.update_one(
                    {"email": email},
                    {"$set": {"password_hash": hash_password(password)}},
                )
                logger.info("Updated password for seed user %s", email)
            continue
        await db.users.insert_one(
            {
                "id": str(uuid.uuid4()),
                "email": email,
                "name": spec["name"],
                "role": spec["role"],
                "password_hash": hash_password(password),
                "created_at": datetime.now(timezone.utc).isoformat(),
            }
        )
        logger.info("Seeded user %s (%s)", email, spec["role"])


async def seed_notifications():
    # Idempotent: skip if any seeded notifications already exist
    if await db.notifications.count_documents({"seeded": True}) > 0:
        return
    base_time = datetime.now(timezone.utc)
    samples = [
        ("buyer", "INFO", "Welcome to DeMaxtore", "Your buyer workspace is ready. Explore the sidebar to begin."),
        ("buyer", "SUCCESS", "Profile verified", "Your organisation profile has been verified."),
        ("buyer", "WARNING", "Documents pending", "Two purchase documents are awaiting your review."),
        ("supplier", "INFO", "Welcome, supplier", "You can now receive RFQ invitations."),
        ("supplier", "SUCCESS", "KYC complete", "Your supplier KYC is fully approved."),
        ("supplier", "ERROR", "Quotation rejected", "A buyer rejected your draft quotation."),
        ("admin", "INFO", "System healthy", "All subsystems are reporting green."),
        ("admin", "WARNING", "Pending approvals", "3 supplier onboardings are awaiting your review."),
        ("admin", "SUCCESS", "Nightly sync done", "Data warehouse sync completed successfully."),
    ]
    docs = []
    for i, (role, ntype, title, msg) in enumerate(samples):
        docs.append(
            {
                "id": str(uuid.uuid4()),
                "type": ntype,
                "title": title,
                "message": msg,
                "role": role,
                "read": False,
                "link": None,
                "seeded": True,
                "created_at": (base_time - timedelta(hours=i)).isoformat(),
            }
        )
    if docs:
        await db.notifications.insert_many(docs)
        logger.info("Seeded %d notifications", len(docs))


# ---------- Startup ----------
@app.on_event("startup")
async def on_startup():
    await db.users.create_index("email", unique=True)
    await db.users.create_index("id", unique=True)
    await db.notifications.create_index("created_at")
    await db.password_reset_tokens.create_index("token", unique=True)
    await seed_users()
    await seed_notifications()
    logger.info("DeMaxtore API started")


@app.on_event("shutdown")
async def on_shutdown():
    client.close()


# ---------- Register routers ----------
app.include_router(api_router)
app.include_router(auth_router)


# ---------- CORS ----------
_origins = os.environ.get("CORS_ORIGINS", "*").split(",")
app.add_middleware(
    CORSMiddleware,
    allow_origins=_origins,
    allow_credentials=False,  # using Bearer tokens, not cookies
    allow_methods=["*"],
    allow_headers=["*"],
)
