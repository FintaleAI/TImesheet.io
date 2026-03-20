# Deployment Guide

This project is now structured for a two-service deployment:

- `frontend/` -> Next.js web app
- `backend/` -> FastAPI API
- `Neon` -> PostgreSQL database
- `Render` -> application hosting
- `Cloudflare Access` -> employee-only access in front of the app

## 1. Before You Deploy

Make sure these are ready:

- GitHub repo contains the latest code
- Neon database is created
- Neon connection string is available
- A strong production `SECRET_KEY` is generated
- Company domain or subdomain is decided

## 2. Required Production Secrets

### Backend

Set these in Render for the backend service:

- `SECRET_KEY`
- `DATABASE_URL`
- `CORS_ORIGINS`

Recommended values:

- `DATABASE_URL=postgresql+psycopg://...`
- `CORS_ORIGINS=https://your-frontend.onrender.com,https://timesheet.yourcompany.com`

### Frontend

Set this in Render for the frontend service:

- `NEXT_PUBLIC_API_BASE_URL`

Recommended value:

- `https://your-backend.onrender.com/api/v1`

## Local vs Live Config

Use separate values for local development and Render production.

### Local development

- [backend/.env](/c:/Users/finta/OneDrive/Desktop/Fintale-Tools/Timesheet/backend/.env)
  - `CORS_ORIGINS=http://localhost:3000,https://your-frontend.onrender.com`
- [frontend/.env.local](/c:/Users/finta/OneDrive/Desktop/Fintale-Tools/Timesheet/frontend/.env.local)
  - `NEXT_PUBLIC_API_BASE_URL=http://localhost:8000/api/v1`

### Render production

- Backend Render env var:
  - `CORS_ORIGINS=https://your-frontend.onrender.com,https://timesheet.yourcompany.com`
- Frontend Render env var:
  - `NEXT_PUBLIC_API_BASE_URL=https://your-backend.onrender.com/api/v1`

You should not point local frontend development to the live backend unless that is intentional for a specific test.

## 3. Render Deployment

This repo includes [render.yaml](/c:/Users/finta/OneDrive/Desktop/Fintale-Tools/Timesheet/render.yaml) so you can use a Render Blueprint deployment.

### Backend service

- Root directory: `backend`
- Build command: `pip install -r requirements.txt`
- Start command: `alembic upgrade head && uvicorn app.main:app --host 0.0.0.0 --port $PORT`
- Health check: `/api/v1/health`

### Frontend service

- Root directory: `frontend`
- Build command: `npm ci && npm run build`
- Start command: `npm run start -- --hostname 0.0.0.0 --port $PORT`

## 4. Neon Setup

Use the pooled or standard Neon connection string, but make sure the SQLAlchemy driver prefix is:

```text
postgresql+psycopg://
```

If Neon gives you `postgresql://...`, replace only the prefix.

## 5. First Production Database Setup

After backend deploy:

1. Render runs `alembic upgrade head`
2. Seed the first admin once

For the first admin, use a Render shell or one-time job:

```bash
cd backend
python -m app.scripts.seed_admin
```

Then immediately log in and change the password.

## 6. Cloudflare Access

Recommended setup:

1. Put the frontend domain behind Cloudflare
2. Create a Cloudflare Access application for the frontend URL
3. Allow only company users or approved email identities
4. Enable MFA in your identity provider policy

This gives you:

- employee-only access
- extra protection before the app even loads
- easier future move to company SSO

## 7. Go-Live Checklist

- Backend deploy succeeds
- Frontend deploy succeeds
- `GET /api/v1/health` returns OK
- Frontend can log in against production API
- Admin can create employee
- Employee can log in and change first password
- Employee can submit timesheet
- Admin can review and export timesheets
- Cloudflare Access blocks non-company users
- Secrets are not committed in Git

## 8. Important Security Actions

Do these before real employee rollout:

- rotate any secret or database credential used during development
- replace the seeded admin password immediately
- use production-only `SECRET_KEY`
- confirm `CORS_ORIGINS` contains only trusted frontend domains
- stop using any exposed development credentials
