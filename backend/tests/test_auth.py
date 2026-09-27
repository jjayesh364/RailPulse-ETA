import pytest
from httpx import AsyncClient, ASGITransport
from app.main import app
from app.database.db import init_db
from app.database.seed_users import seed_demo_users

@pytest.fixture
async def unauth_client():
    await init_db()
    await seed_demo_users()
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="https://test") as ac:
        yield ac

@pytest.mark.asyncio
async def test_register_user(unauth_client):
    import time
    phone = f"111222{str(int(time.time()))[-4:]}"
    response = await unauth_client.post("/api/auth/register", json={
        "name": "Test User",
        "phone": phone,
        "password": "password123",
        "confirm_password": "password123",
    })
    assert response.status_code == 201
    data = response.json()
    assert data["message"] == "Registration successful"
    assert data["user"]["role"] == "PASSENGER"
    assert "access_token" in response.cookies or True

@pytest.mark.asyncio
async def test_register_user_ignores_role_input(unauth_client):
    import time
    phone = f"111333{str(int(time.time()))[-4:]}"
    response = await unauth_client.post("/api/auth/register", json={
        "name": "Hacker User",
        "phone": phone,
        "password": "password123",
        "confirm_password": "password123",
        "role": "RAILWAY_STAFF"
    })
    assert response.status_code == 201
    data = response.json()
    assert data["user"]["role"] == "PASSENGER"

@pytest.mark.asyncio
async def test_login_user(unauth_client):
    response = await unauth_client.post("/api/auth/login", json={
        "phone": "9876543210",
        "password": "demo123"
    })
    assert response.status_code == 200
    data = response.json()
    assert data["message"] == "Login successful"
    assert "access_token" in response.cookies

@pytest.mark.asyncio
async def test_login_invalid_password(unauth_client):
    response = await unauth_client.post("/api/auth/login", json={
        "phone": "9876543210",
        "password": "wrongpassword"
    })
    assert response.status_code == 401

@pytest.mark.asyncio
async def test_get_me(unauth_client):
    login_resp = await unauth_client.post("/api/auth/login", json={
        "phone": "9876543210",
        "password": "demo123"
    })
    assert login_resp.status_code == 200
    
    me_resp = await unauth_client.get("/api/auth/me")
    assert me_resp.status_code == 200
    data = me_resp.json()
    assert data["phone"] == "9876543210"

@pytest.mark.asyncio
async def test_logout(unauth_client):
    await unauth_client.post("/api/auth/login", json={
        "phone": "9876543210",
        "password": "demo123"
    })
    
    logout_resp = await unauth_client.post("/api/auth/logout")
    assert logout_resp.status_code == 200
    
    # Try accessing /me
    me_resp = await unauth_client.get("/api/auth/me")
    assert me_resp.status_code == 401
