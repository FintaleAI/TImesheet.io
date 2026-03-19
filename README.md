# Fintale Timesheet

This project started as a simple local role-based timesheet tool. The confirmed direction now is to turn it into a proper live internal company web app with a stronger architecture that is scalable, secure, and easier to improve over time.

## Confirmed Target Direction

These decisions are now locked in for the next version:

- Database: Neon PostgreSQL
- Config management: environment-based config is mandatory
- Authentication: strong production-grade authentication is mandatory
- Product direction: choose Option B, meaning a proper web app architecture instead of staying on Streamlit

## Confirmed Authentication Roadmap

The authentication plan is now:

- Phase 1: keep login with admin-created `username + password`
- Phase 2: add company domain-based email login for each employee
- Phase 3: optionally move fully to SSO later if the company wants it

This means the new system should not be built around usernames only. It should be built around a flexible user identity model that supports both username login now and company email-based login later.

## Recommended Final Stack

- Frontend: Next.js
- Backend API: FastAPI
- Database: Neon PostgreSQL
- ORM and migrations: SQLAlchemy + Alembic
- Auth: username/password now, designed to support company email login and later SSO, plus RBAC
- Deployment: Render for app hosting
- Access protection: Cloudflare Access in front of the app for employee-only access

This is the best balance of:

- long-term maintainability
- secure internal access
- easier feature growth
- clean separation between frontend, backend, auth, and database

## Current Tech Stack

- Frontend and backend: Python + Streamlit
- Database: SQLite (`fintale_timesheet.db`)
- Authentication: custom username/password logic inside the app
- Password hashing: `hashlib.sha256`
- Runtime: Python 3.11 virtual environment
- App launcher: `run_timesheet.bat`

## Current Features

- Admin login
- Employee login
- Project Master
- Employee Master
- Employee timesheet entry
- Admin read-only timesheet view
- Password change

## Current Project Files

- App file: `fintale_timesheet_app.py`
- Database file: `fintale_timesheet.db`
- Launcher: `run_timesheet.bat`
- Dependencies: `requirements.txt`
- Virtual environment: `venv/`

## Important Limitation Right Now

The current version is suitable for local or very small internal use, but it is not yet a proper live multi-user web app for all employees.

Main reasons:

- SQLite is a file-based database and is not ideal for concurrent access by many users.
- The app stores the database file locally on one machine.
- Authentication is very basic and has no password reset, no email verification, and no audit/security layer.
- The app has no deployment configuration for a server, domain, HTTPS, backups, or monitoring.
- `hashlib.sha256` with a custom salt works, but production apps should use stronger password hashing libraries like `bcrypt` or `passlib`.
- There is no environment variable setup for secrets and config.
- There are no automated tests.

## What Needs To Change To Make It Live

To make this usable as a live web app for all employees, these are the main changes required.

### 1. Move from SQLite to Neon PostgreSQL

Why:

- Better for multiple users
- Safer for concurrent writes
- Easier backups and hosting
- Better long-term fit for a live company system
- Neon gives managed Postgres with modern developer workflows

### 2. Store config in environment variables

Move things like these out of hardcoded app code:

- database URL
- admin seed credentials
- app secrets
- deployment settings

Recommended for local development:

- `.env`

Recommended for production:

- platform-managed environment variables
- no secrets hardcoded in source code

### 3. Improve authentication and security

Recommended changes:

- keep username/password for the first live version
- design the auth model so company email login can be added later without changing core user records
- support company domain email identities such as `name@company.com`
- make future SSO integration possible without a database redesign
- keep role-based access control inside the app
- use secure HTTP-only cookies or signed session tokens
- add session timeout
- remove default admin password behavior from production
- keep a proper audit trail for logins and critical admin actions

Recommended auth model:

- phase 1 identity comes from internal username/password
- phase 2 identity can come from company email/password or company email-based login
- phase 3 can move to SSO if needed
- app authorization comes from internal roles such as `Admin`, `Manager`, `Employee`

This lets you launch with the current company workflow while keeping the future path open.

### 4. Prepare the app for deployment

You need:

- a cloud host for the frontend and backend
- a company domain or internal subdomain
- HTTPS/SSL
- centralized secrets/config management
- database backups
- logging and monitoring
- employee-only access protection

## Deployment Recommendation

For your use case, my recommendation is:

- Host the Next.js frontend on Render
- Host the FastAPI backend on Render
- Use Neon for PostgreSQL
- Put Cloudflare Access in front of the application

### Why this is my recommendation

For a company-internal tool, the most important thing is not only deployment, but controlled access.

Render is a strong fit because it officially supports both Next.js and FastAPI deployments and gives you straightforward environment variable management, Git-based deploys, and custom domains. Render also supports private services and internal networking for service-to-service communication.

Cloudflare Access is the extra security layer I recommend because it is designed specifically for protecting internal applications. It can sit in front of your app and require company identity verification before any employee reaches the app. It supports SSO, MFA, session policies, and employee-only access flows.

### Why not rely only on Vercel protection

Based on current Vercel documentation, protecting production domains fully is more limited and tied to higher-tier protection features. For a company-internal business app, I would not choose that as the primary control layer.

### Best practical setup

- Render = where the app runs
- Neon = where the data lives
- Cloudflare Access = who is allowed to open the app
- Company SSO = how employees log in

## Final Architecture Plan

### Frontend

- Next.js
- role-aware UI
- dashboard pages
- project master pages
- employee master pages
- timesheet entry pages
- admin reporting pages

### Backend

- FastAPI
- REST API or hybrid REST-first architecture
- authentication/session validation
- RBAC authorization middleware
- input validation with Pydantic
- audit logging hooks

### Database

- Neon PostgreSQL
- normalized tables for users, employees, projects, timesheets, roles, sessions, auth identities, and audit logs
- Alembic migrations

### Authentication

- phase 1: admin-created username/password accounts
- phase 2: employee company email login
- phase 3: optional Microsoft Entra ID or Google Workspace SSO
- MFA-ready architecture
- internal app role mapping
- no default production password

### User Model Design Rule

To support the future change cleanly, the new backend should separate:

- `employee profile`
- `login identity`
- `authorization role`

Recommended structure:

- `employees` table = HR and employee profile data
- `users` table = app user account
- `auth_identities` table = login identifiers such as username, company email, or future SSO provider identity

This is important because:

- usernames may change
- company emails may be introduced later
- one employee may eventually have more than one login method
- role management should stay independent from login method

### Deployment

- Render web service for Next.js
- Render web service for FastAPI
- Neon managed PostgreSQL
- Cloudflare Access for employee-only protection

## Step-by-Step Guide To Build The New Live Version

This is now the recommended path, replacing the earlier Streamlit-first plan.

## Phase 1: Freeze and study the current app

1. Keep the current Streamlit app as the business logic reference.
2. Extract and document the existing modules:
   - users
   - employees
   - projects
   - timesheets
3. Identify all current fields, validations, and workflows.
4. Treat the current app as the source of business rules, not as the future architecture.

## Phase 2: Rebuild the backend properly with FastAPI

1. Create a new backend app structure.
2. Add environment-based configuration.
3. Add SQLAlchemy models.
4. Add Alembic migrations.
5. Connect to Neon PostgreSQL.
6. Create APIs for:
   - auth/session
   - employees
   - projects
   - timesheets
   - admin reports
7. Design the auth schema to support username now and company email later.
8. Add role-based authorization checks.
9. Add audit logging.

## Phase 3: Build the frontend with Next.js

1. Create the Next.js app.
2. Add login flow using username/password first.
3. Build these screens:
    - login
    - dashboard
    - project master
   - employee master
   - timesheet entry
   - admin timesheet view
4. Connect the frontend to FastAPI.
5. Add route protection and role-based UI behavior.

## Phase 4: Add strong authentication

1. Phase 1 live version:
   - keep admin-created username/password login
   - use strong password hashing such as `bcrypt` or `argon2`
   - use secure session cookies
2. Phase 2 upgrade:
   - add company email as a login identity
   - support email uniqueness per employee
   - optionally add email verification for company domain accounts
3. Phase 3 optional upgrade:
   - integrate Microsoft Entra ID if the company uses Microsoft 365
   - integrate Google Workspace if the company uses Google accounts
   - enforce MFA through the provider
4. Map authenticated users to internal app roles.
5. Store only the minimum identity data needed in your app database.

## Phase 5: Deploy for internal company use

1. Deploy backend to Render.
2. Deploy frontend to Render.
3. Connect both to Neon PostgreSQL.
4. Add the company domain.
5. Put Cloudflare Access in front of the app.
6. Configure employee-only access policy.
7. Configure environment variables and secrets.

## Phase 6: Test with real employees

1. Test admin flow.
2. Test employee flow.
3. Test concurrent usage by multiple employees.
4. Test current login flow and future email-login upgrade path.
5. Test role restrictions.
6. Test backup and restore of the database.

## Phase 7: Add production features

Recommended next improvements:

- forgot password
- user management screen
- employee activation/deactivation
- export to Excel or CSV
- monthly timesheet reports
- approval workflow
- email notifications
- dashboard charts
- logs and monitoring

## Best Choice For Your Confirmed Requirements

Based on your decisions, this is the architecture I recommend we build:

1. Rewrite the app into `Next.js + FastAPI`
2. Use `Neon PostgreSQL`
3. Use `.env` and platform environment variables
4. Launch with username/password, but design for company email login and later SSO
5. Deploy frontend and backend on Render
6. Protect access with Cloudflare Access

This is the strongest and most future-ready path for a company-only internal system.

## Local Run Guide

From this folder:

```powershell
cd C:\Users\finta\OneDrive\Desktop\Fintale-Tools\Timesheet
.\venv\Scripts\activate
python -m pip install -r requirements.txt
python -m streamlit run fintale_timesheet_app.py
```

Or run:

```powershell
.\run_timesheet.bat
```

## Suggested Immediate Build Tasks

The next implementation steps should be:

1. create the new backend folder with FastAPI
2. create the new frontend folder with Next.js
3. add environment-based config
4. add Neon database connection
5. design the new schema and migrations
6. implement username/password auth with future email/SSO-ready identity structure
7. migrate current business logic from the Streamlit app into API endpoints

## Summary

This app is currently a local Streamlit + SQLite tool. For the real live version, the confirmed target is:

- `Next.js + FastAPI`
- `Neon PostgreSQL`
- environment-based configuration
- username/password first, company email login later, SSO-ready structure
- Render deployment
- Cloudflare Access for employee-only protection

If you want, the next step I can take is to start the actual migration by scaffolding the new production-ready structure inside this repo:

- `frontend/` with Next.js
- `backend/` with FastAPI
- config/env support
- Neon-ready database layer
- auth and RBAC foundation
