"""Authentication service - password hashing and JWT token management."""

import hashlib
import hmac
import os
import secrets
from datetime import datetime, timezone, timedelta
from typing import Optional, Any

import jwt
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.models.user_model import User


from pymongo import ReturnDocument
from app.database.mongodb import get_mongo_db, COLL_USERS, COLL_COUNTERS


def _doc_to_user(doc: dict) -> User:
    """Convert a MongoDB user document to a User model instance."""
    created_at = doc.get("created_at")
    if isinstance(created_at, str):
        try:
            created_at = datetime.fromisoformat(created_at.replace("Z", "+00:00"))
        except Exception:
            pass
    return User(
        id=int(doc["id"]),
        name=doc["name"],
        phone=doc["phone"],
        password_hash=doc["password_hash"],
        role=doc["role"],
        created_at=created_at,
    )


class AuthService:
    """Handles password hashing and JWT operations."""

    def hash_password(self, password: str) -> str:
        """Hash a password using PBKDF2-HMAC-SHA256 with a random salt.
        
        Uses Python's built-in hashlib which is available everywhere.
        Format: salt$iterations$hash
        """
        salt = secrets.token_hex(32)
        iterations = 260000
        dk = hashlib.pbkdf2_hmac(
            "sha256",
            password.encode("utf-8"),
            salt.encode("utf-8"),
            iterations,
        )
        hash_hex = dk.hex()
        return f"{salt}${iterations}${hash_hex}"

    def verify_password(self, password: str, password_hash: str) -> bool:
        """Verify a password against a stored hash."""
        try:
            parts = password_hash.split("$")
            if len(parts) != 3:
                return False
            salt, iterations_str, stored_hash = parts
            iterations = int(iterations_str)
            dk = hashlib.pbkdf2_hmac(
                "sha256",
                password.encode("utf-8"),
                salt.encode("utf-8"),
                iterations,
            )
            return hmac.compare_digest(dk.hex(), stored_hash)
        except Exception:
            return False

    def create_access_token(self, user_id: int, phone: str, role: str) -> str:
        """Create a JWT access token."""
        now = datetime.now(timezone.utc)
        expire = now + timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
        payload = {
            "sub": str(user_id),
            "phone": phone,
            "role": role,
            "iat": now,
            "exp": expire,
        }
        return jwt.encode(payload, settings.JWT_SECRET_KEY, algorithm=settings.JWT_ALGORITHM)

    def decode_token(self, token: str) -> Optional[dict]:
        """Decode and validate a JWT token."""
        try:
            payload = jwt.decode(
                token,
                settings.JWT_SECRET_KEY,
                algorithms=[settings.JWT_ALGORITHM],
            )
            return payload
        except jwt.ExpiredSignatureError:
            return None
        except jwt.InvalidTokenError:
            return None

    async def get_user_by_phone(
        self,
        arg1: Any = None,
        arg2: Optional[str] = None,
        session: Optional[AsyncSession] = None,
        phone: Optional[str] = None,
    ) -> Optional[User]:
        """Find a user by phone. Queries MongoDB users collection with SQLite fallback."""
        target_phone = phone
        target_session = session

        if arg2 is not None:
            target_session = arg1
            target_phone = arg2
        elif isinstance(arg1, str):
            target_phone = arg1
        elif arg1 is not None and target_phone is None:
            target_session = arg1

        db = get_mongo_db()
        if db is not None and target_phone:
            doc = await db[COLL_USERS].find_one({"phone": target_phone})
            if doc:
                return _doc_to_user(doc)
            return None

        # Fallback to SQLite (only if MongoDB unavailable)
        if target_phone:
            if target_session is not None:
                result = await target_session.execute(select(User).where(User.phone == target_phone))
                return result.scalar_one_or_none()
            else:
                from app.database.db import async_session_maker
                async with async_session_maker() as sess:
                    result = await sess.execute(select(User).where(User.phone == target_phone))
                    return result.scalar_one_or_none()
        return None

    async def get_user_by_id(
        self,
        arg1: Any = None,
        arg2: Optional[int] = None,
        session: Optional[AsyncSession] = None,
        user_id: Optional[int] = None,
    ) -> Optional[User]:
        """Find a user by ID. Queries MongoDB users collection with SQLite fallback."""
        target_id = user_id
        target_session = session

        if arg2 is not None:
            target_session = arg1
            target_id = arg2
        elif isinstance(arg1, int):
            target_id = arg1
        elif arg1 is not None and target_id is None:
            target_session = arg1

        db = get_mongo_db()
        if db is not None and target_id is not None:
            doc = await db[COLL_USERS].find_one({"id": target_id})
            if doc:
                return _doc_to_user(doc)
            return None

        # Fallback to SQLite (only if MongoDB unavailable)
        if target_id is not None:
            if target_session is not None:
                result = await target_session.execute(select(User).where(User.id == target_id))
                return result.scalar_one_or_none()
            else:
                from app.database.db import async_session_maker
                async with async_session_maker() as sess:
                    result = await sess.execute(select(User).where(User.id == target_id))
                    return result.scalar_one_or_none()
        return None

    async def create_user(
        self,
        session: Optional[AsyncSession] = None,
        name: str = "",
        phone: str = "",
        password: str = "",
        role: str = "PASSENGER",
        *args,
        **kwargs,
    ) -> User:
        """Create a new user with hashed password and atomic sequential integer ID."""
        # Handle positional arguments if passed as (session, name, phone, password, role)
        if args:
            all_args = [session, name, phone, password, role] + list(args)
            if len(all_args) >= 5:
                session = all_args[0] if isinstance(all_args[0], AsyncSession) else None
                name = all_args[1] if session else all_args[0]
                phone = all_args[2] if session else all_args[1]
                password = all_args[3] if session else all_args[2]
                role = all_args[4] if session else all_args[3]

        password_hash = self.hash_password(password)
        now = datetime.now(timezone.utc)
        db = get_mongo_db()

        if db is not None:
            # Atomic integer autoincrement sequence
            counter = await db[COLL_COUNTERS].find_one_and_update(
                {"_id": "user_id"},
                {"$inc": {"seq": 1}},
                upsert=True,
                return_document=ReturnDocument.AFTER,
            )
            new_id = int(counter["seq"])
            user_doc = {
                "id": new_id,
                "name": name,
                "phone": phone,
                "password_hash": password_hash,
                "role": role,
                "created_at": now.isoformat(),
            }
            await db[COLL_USERS].insert_one(user_doc)
            return User(
                id=new_id,
                name=name,
                phone=phone,
                password_hash=password_hash,
                role=role,
                created_at=now,
            )

        # Fallback to SQLite (only if MongoDB unavailable)
        user = User(
            name=name,
            phone=phone,
            password_hash=password_hash,
            role=role,
        )
        if session is not None:
            session.add(user)
            await session.commit()
            await session.refresh(user)
            return user
        else:
            from app.database.db import async_session_maker
            async with async_session_maker() as sess:
                sess.add(user)
                await sess.commit()
                await sess.refresh(user)
                return user


auth_service = AuthService()
