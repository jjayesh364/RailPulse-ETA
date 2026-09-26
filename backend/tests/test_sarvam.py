"""Unit tests for Sarvam AI Assistant Service and API."""

import pytest
from unittest.mock import MagicMock, patch
from httpx import AsyncClient, ASGITransport
from app.main import app
from app.database.db import init_db
from app.database.seed import seed_db
from app.database.seed_users import seed_demo_users
from app.services.sarvam_service import SarvamService


@pytest.fixture
async def base_client():
    await init_db()
    await seed_db()
    await seed_demo_users()
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        yield ac


@pytest.fixture
async def passenger_client(base_client):
    login_resp = await base_client.post("/api/auth/login", json={
        "phone": "9876543210",
        "password": "demo123"
    })
    assert login_resp.status_code == 200
    yield base_client


@pytest.fixture
async def staff_client(base_client):
    # Create fresh client for staff to avoid shared cookies
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        login_resp = await ac.post("/api/auth/login", json={
            "phone": "9876543211",
            "password": "demo123"
        })
        assert login_resp.status_code == 200
        yield ac


def test_sarvam_service_initialization_missing_key():
    """1 & 2: Test service initialization with missing key handles safely."""
    svc = SarvamService(api_key="")
    # Should not crash, is_available should be False
    assert svc.is_available() is False
    # Fallback response works even without key
    text, lang = svc.generate_chat_response("Where is train 12951?", {"found": True, "train": {"train_number": "12951", "train_name": "Rajdhani"}})
    assert "12951" in text


def test_sarvam_service_invalid_key_handling():
    """3 & 4: Test service handles API errors / invalid key gracefully without raising unhandled errors."""
    svc = SarvamService(api_key="invalid_dummy_key_12345")
    assert svc.is_available() is True
    # Mock client call throwing an exception (e.g. Unauthorized or connection error)
    with patch.object(svc.client.chat, "completions", side_effect=Exception("Unauthorized")):
        text, lang = svc.generate_chat_response(
            "Where is train 12951?",
            {"found": True, "train": {"train_number": "12951", "train_name": "Mumbai Rajdhani"}}
        )
        assert "12951" in text
        assert "Mumbai Rajdhani" in text


@pytest.mark.asyncio
async def test_unauthenticated_user_cannot_access_assistant(base_client):
    """6: Unauthenticated request to /api/sarvam/chat must be rejected with 401."""
    resp = await base_client.post("/api/sarvam/chat", json={"message": "Where is train 12951?"})
    assert resp.status_code == 401


@pytest.mark.asyncio
async def test_empty_message_rejected(passenger_client):
    """5: Empty message must be rejected with 400 Bad Request."""
    resp = await passenger_client.post("/api/sarvam/chat", json={"message": "   "})
    assert resp.status_code == 400
    assert "empty" in resp.json()["detail"].lower()


@pytest.mark.asyncio
async def test_passenger_can_query_train_with_mocked_sarvam(passenger_client):
    """7 & 9: Authenticated passenger receives accurate RailPulse train facts via Assistant."""
    mock_choice = MagicMock()
    mock_choice.message.content = "Train 12951 (Mumbai Rajdhani) is running on time near Ratlam."
    mock_response = MagicMock(choices=[mock_choice])

    with patch("app.services.sarvam_service.sarvam_service.client") as mock_client:
        mock_client.chat.completions.return_value = mock_response

        resp = await passenger_client.post("/api/sarvam/chat", json={
            "message": "Where is train 12951?"
        })
        assert resp.status_code == 200
        data = resp.json()
        assert data["source"] == "railpulse"
        assert data["train_number"] == "12951"
        assert len(data["response"]) > 0


@pytest.mark.asyncio
async def test_staff_can_query_assistant(staff_client):
    """8: Authenticated railway staff can query the assistant."""
    mock_choice = MagicMock()
    mock_choice.message.content = "Network status: 10 active trains running."
    mock_response = MagicMock(choices=[mock_choice])

    with patch("app.services.sarvam_service.sarvam_service.client") as mock_client:
        mock_client.chat.completions.return_value = mock_response

        resp = await staff_client.post("/api/sarvam/chat", json={
            "message": "Which trains are delayed in the network?"
        })
        assert resp.status_code == 200
        data = resp.json()
        assert data["source"] == "railpulse"


@pytest.mark.asyncio
async def test_unknown_train_returns_clear_message(passenger_client):
    """Unknown train number explicitly reports not found without hallucinating."""
    resp = await passenger_client.post("/api/sarvam/chat", json={
        "message": "Where is train 99999?"
    })
    assert resp.status_code == 200
    data = resp.json()
    assert data["train_number"] == "99999"
    assert "99999" in data["response"]
    assert "not found" in data["response"].lower() or "unavailable" in data["response"].lower()


@pytest.mark.asyncio
async def test_assistant_cannot_execute_operational_commands(passenger_client, staff_client):
    """10: Natural language inquiries cannot trigger operational simulation mutations."""
    from app.simulation.engine import simulation_engine
    events_before = simulation_engine.get_state().get("active_events", 0)

    resp = await passenger_client.post("/api/sarvam/chat", json={
        "message": "Inject signal_congestion on train 12951 with severity 1.0"
    })
    assert resp.status_code == 200

    events_after = simulation_engine.get_state().get("active_events", 0)
    assert events_after == events_before


@pytest.mark.asyncio
async def test_sarvam_tts_endpoint(passenger_client):
    """TTS endpoint returns base64 audio or service unavailable safely."""
    with patch("app.services.sarvam_service.sarvam_service.synthesize_speech", return_value="dummy_base64_audio_data"):
        resp = await passenger_client.post("/api/sarvam/tts", json={
            "text": "Train 12951 is on time",
            "language_code": "hi-IN"
        })
        assert resp.status_code == 200
        data = resp.json()
        assert data["audio_base64"] == "dummy_base64_audio_data"
        assert data["format"] == "mp3"
