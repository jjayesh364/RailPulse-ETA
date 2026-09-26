"""Authentication service - password hashing and JWT token management."""

import hashlib
import hmac
import os
import secrets
from datetime import datetime, timezone, timedelta
from typing import Optional

import jwt
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.models.user_model import User


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

    async def get_user_by_phone(self, session: AsyncSession, phone: str) -> Optional[User]:
        """Find a user by phone."""
        result = await session.execute(select(User).where(User.phone == phone))
        return result.scalar_one_or_none()

    async def get_user_by_id(self, session: AsyncSession, user_id: int) -> Optional[User]:
        """Find a user by ID."""
        result = await session.execute(select(User).where(User.id == user_id))
        return result.scalar_one_or_none()

    async def create_user(
        self, session: AsyncSession, name: str, phone: str, password: str, role: str
    ) -> User:
        """Create a new user with hashed password."""
        password_hash = self.hash_password(password)
        user = User(
            name=name,
            phone=phone,
            password_hash=password_hash,
            role=role,
        )
        session.add(user)
        await session.commit()
        await session.refresh(user)
        return user


auth_service = AuthService()
