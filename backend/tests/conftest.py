"""
Pytest configuration for backend test isolation.
Ensures persistent development databases (SQLite and MongoDB) remain pristine
(exactly 42 users, counter seq=42; 157 alerts; 29 events; 10 demo train positions; 31 demo eta_predictions).
"""

import os
import sys
import sqlite3
import pytest
from sqlalchemy import delete

# Ensure project root is in sys.path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from app.database.db import async_session_maker
from app.models.user_model import User
from app.models.database_models import Alert, OperationalEvent, TrainPosition, ETAPrediction
from app.database.mongodb import (
    get_mongo_db,
    COLL_USERS,
    COLL_COUNTERS,
    COLL_ALERTS,
    COLL_OPERATIONAL_EVENTS,
    COLL_TRAIN_POSITIONS,
    COLL_ETA_PREDICTIONS,
)
from app.config import settings

DEMO_TRAIN_IDS = ("12951", "12301", "12002", "12622", "12860", "12903", "12627", "12723", "12259", "12433")


async def _purge_test_records():
    """Purge test-created records: users > 42, alerts > 157, events > 29,
    and train_positions / eta_predictions not belonging to the 10 demo trains.
    """
    # 1. SQLite cleanup
    try:
        async with async_session_maker() as session:
            await session.execute(delete(User).where(User.id > 42))
            await session.execute(delete(Alert).where(Alert.id > 157))
            await session.execute(delete(OperationalEvent).where(OperationalEvent.id > 29))
            await session.execute(delete(TrainPosition).where(TrainPosition.train_id.not_in(DEMO_TRAIN_IDS)))
            await session.execute(delete(ETAPrediction).where(ETAPrediction.train_id.not_in(DEMO_TRAIN_IDS)))
            await session.commit()
    except Exception:
        pass

    # 2. MongoDB cleanup (if connected)
    try:
        db = get_mongo_db()
        if db is not None:
            await db[COLL_USERS].delete_many({"id": {"$gt": 42}})
            u_count = await db[COLL_USERS].count_documents({})
            if u_count <= 42:
                await db[COLL_COUNTERS].update_one({"_id": "user_id"}, {"$set": {"seq": 42}})

            await db[COLL_ALERTS].delete_many({"id": {"$gt": 157}})
            a_count = await db[COLL_ALERTS].count_documents({})
            if a_count <= 157:
                await db[COLL_COUNTERS].update_one({"_id": "alert_id"}, {"$set": {"seq": 157}})

            await db[COLL_OPERATIONAL_EVENTS].delete_many({"id": {"$gt": 29}})
            e_count = await db[COLL_OPERATIONAL_EVENTS].count_documents({})
            if e_count <= 29:
                await db[COLL_COUNTERS].update_one({"_id": "event_id"}, {"$set": {"seq": 29}})

            await db[COLL_TRAIN_POSITIONS].delete_many({"_id": {"$nin": list(DEMO_TRAIN_IDS)}})
            # ETA predictions: only keep predictions for the 10 demo trains
            await db[COLL_ETA_PREDICTIONS].delete_many({"train_id": {"$nin": list(DEMO_TRAIN_IDS)}})
    except Exception:
        pass


@pytest.fixture(autouse=True)
async def isolate_test_database_records():
    """Autouse fixture ensuring no test records persist after any test across the suite."""
    yield
    await _purge_test_records()


def pytest_sessionfinish(session, exitstatus):
    """
    Synchronous pytest hook called after the entire test session completes.
    Guarantees cleanup of SQLite and MongoDB development databases even if async loops closed.
    """
    # SQLite cleanup
    db_paths = [
        "railpulse.db",
        os.path.join(os.path.dirname(__file__), "..", "railpulse.db"),
        os.path.join(os.path.dirname(__file__), "..", "..", "railpulse.db"),
    ]
    for path in db_paths:
        if os.path.exists(path):
            try:
                con = sqlite3.connect(path)
                con.execute("DELETE FROM users WHERE id > 42")
                con.execute("DELETE FROM alerts WHERE id > 157")
                con.execute("DELETE FROM operational_events WHERE id > 29")
                placeholders = ",".join("?" for _ in DEMO_TRAIN_IDS)
                con.execute(f"DELETE FROM train_positions WHERE train_id NOT IN ({placeholders})", list(DEMO_TRAIN_IDS))
                con.execute(f"DELETE FROM eta_predictions WHERE train_id NOT IN ({placeholders})", list(DEMO_TRAIN_IDS))
                con.commit()
                con.close()
            except Exception:
                pass

    # MongoDB cleanup
    if settings.MONGODB_URL:
        try:
            from pymongo import MongoClient
            client = MongoClient(
                settings.MONGODB_URL,
                serverSelectionTimeoutMS=5000,
                connectTimeoutMS=5000,
            )
            db = client[settings.MONGODB_DB_NAME]
            db[COLL_USERS].delete_many({"id": {"$gt": 42}})
            u_count = db[COLL_USERS].count_documents({})
            if u_count <= 42:
                db[COLL_COUNTERS].update_one({"_id": "user_id"}, {"$set": {"seq": 42}})

            db[COLL_ALERTS].delete_many({"id": {"$gt": 157}})
            a_count = db[COLL_ALERTS].count_documents({})
            if a_count <= 157:
                db[COLL_COUNTERS].update_one({"_id": "alert_id"}, {"$set": {"seq": 157}})

            db[COLL_OPERATIONAL_EVENTS].delete_many({"id": {"$gt": 29}})
            e_count = db[COLL_OPERATIONAL_EVENTS].count_documents({})
            if e_count <= 29:
                db[COLL_COUNTERS].update_one({"_id": "event_id"}, {"$set": {"seq": 29}})

            db[COLL_TRAIN_POSITIONS].delete_many({"_id": {"$nin": list(DEMO_TRAIN_IDS)}})
            # ETA predictions: only keep predictions for the 10 demo trains
            db[COLL_ETA_PREDICTIONS].delete_many({"train_id": {"$nin": list(DEMO_TRAIN_IDS)}})
            client.close()
        except Exception:
            pass
