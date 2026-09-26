"""Seed demo users for authentication (idempotent)."""

from sqlalchemy import select
from app.database.db import async_session_maker
from app.models.user_model import User
from app.services.auth_service import auth_service


DEMO_USERS = [
    {
        "name": "Demo Passenger",
        "phone": "9876543210",
        "password": "demo123",
        "role": "PASSENGER",
    },
    {
        "name": "Demo Railway Staff",
        "phone": "9876543211",
        "password": "demo123",
        "role": "RAILWAY_STAFF",
    },
]


async def seed_demo_users():
    """Create demo users if they don't already exist. Idempotent."""
    async with async_session_maker() as session:
        for user_data in DEMO_USERS:
            result = await session.execute(
                select(User).where(User.phone == user_data["phone"])
            )
            existing = result.scalar_one_or_none()
            if existing:
                continue

            user = User(
                name=user_data["name"],
                phone=user_data["phone"],
                password_hash=auth_service.hash_password(user_data["password"]),
                role=user_data["role"],
            )
            session.add(user)
            print(f"  Created demo user: {user_data['phone']} ({user_data['role']})")

        await session.commit()
