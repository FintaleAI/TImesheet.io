# Backend Setup

## Install

```powershell
cd backend
python -m venv .venv
.\.venv\Scripts\activate
python -m pip install -r requirements.txt
```

## Configure

1. Copy `.env.example` to `.env`
2. Set `DATABASE_URL` to your Neon connection string
3. Set a strong `SECRET_KEY`

## Migrate

```powershell
alembic upgrade head
```

## Seed First Admin

```powershell
python -m app.scripts.seed_admin
```

## Run API

```powershell
uvicorn app.main:app --reload
```

## First Auth Endpoints

- `POST /api/v1/auth/login`
- `GET /api/v1/auth/me`
