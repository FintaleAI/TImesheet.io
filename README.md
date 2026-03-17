# Fintale Timesheet

This project is a simple role-based timesheet tool built for local use. Right now it runs as a Streamlit app with a SQLite database file stored in the same project folder.

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

### 1. Move from SQLite to a server database

Recommended:

- PostgreSQL

Why:

- Better for multiple users
- Safer for concurrent writes
- Easier backups and hosting

### 2. Store config in environment variables

Move things like these out of hardcoded app code:

- database URL
- admin seed credentials
- app secrets
- deployment settings

Recommended file for local development:

- `.env`

### 3. Improve authentication and security

Recommended changes:

- replace current password hashing with `bcrypt` or `passlib`
- add session timeout
- force admin to change default password
- remove hardcoded default admin password from production
- add role checks in a cleaner centralized way
- add login attempt protection if internet-facing

### 4. Prepare the app for deployment

You need:

- a cloud host or VPS
- a public domain or internal company URL
- HTTPS/SSL
- process/service management
- database backups
- error logging

### 5. Decide whether to keep Streamlit or migrate

You have two realistic paths:

#### Option A: Keep Streamlit

Best when:

- the app is for internal company use
- you want to go live quickly
- UI complexity is moderate

Pros:

- fastest path
- lowest rewrite effort

Cons:

- limited control compared with a full web framework
- less ideal for larger enterprise workflows

#### Option B: Rebuild using a web framework

Recommended stack:

- Backend: FastAPI or Django
- Frontend: React / Next.js
- Database: PostgreSQL

Best when:

- many employees will use it daily
- you want approvals, reports, exports, notifications, leave workflow, or future HR modules
- you want a more scalable long-term product

## Recommended Direction

For your current project, the best path is:

1. Keep Streamlit for phase 1
2. Replace SQLite with PostgreSQL
3. Secure authentication properly
4. Deploy internally first
5. Later migrate to FastAPI/Django only if business needs grow

This saves time and gets the app live faster.

## Step-by-Step Guide To Make It Live

## Phase 1: Clean up the current local app

1. Keep the current app working locally.
2. Add a `.env` file for configuration.
3. Remove hardcoded production credentials.
4. Add a `config.py` or similar settings file.
5. Replace direct SQLite use with a database layer that can switch to PostgreSQL.

## Phase 2: Upgrade the database

1. Create a PostgreSQL database.
2. Create the same tables there: `users`, `employees`, `projects`, `timesheets`.
3. Update the Python code to connect using a PostgreSQL driver such as `psycopg2` or `SQLAlchemy`.
4. Migrate existing data from SQLite into PostgreSQL.
5. Test login, project creation, employee creation, and timesheet entry with the new database.

## Phase 3: Secure the app

1. Replace `sha256` password hashing with `bcrypt` or `passlib`.
2. Force the initial admin password to be changed after first login.
3. Remove any public/default password before deployment.
4. Add secret keys through environment variables.
5. Add proper validation and basic audit logging.

## Phase 4: Prepare deployment

1. Choose a host:
   - Streamlit Community Cloud for demos only
   - Render, Railway, Azure, AWS, or a company VPS for internal production use
2. Set environment variables on the host.
3. Deploy the app code.
4. Connect it to PostgreSQL.
5. Configure HTTPS and domain access.
6. Restrict access if needed to office IP, company VPN, or employee login.

## Phase 5: Test with real users

1. Test admin flow.
2. Test employee flow.
3. Test two or more employees logging entries at the same time.
4. Test password change flow.
5. Test backup and restore of the database.

## Phase 6: Add production features

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

## Fastest Way To Put This Online

If you want the quickest live version with the least rewrite:

1. Keep Streamlit
2. Move to PostgreSQL
3. Add `.env` configuration
4. Improve password security
5. Deploy to Render, Railway, Azure, or a VPS

That is the shortest practical route.

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

## Suggested Next Technical Tasks

If you want to convert this project properly, do these next:

1. Add `.env` support
2. Add PostgreSQL support
3. Replace password hashing with `bcrypt`
4. Remove hardcoded default admin password for production
5. Add deployment files such as `Dockerfile` and `.gitignore`
6. Add basic tests

## Summary

This app is currently a local Streamlit + SQLite tool. It works as a prototype, but for live employee access the biggest required changes are:

- move from SQLite to PostgreSQL
- improve authentication/security
- add environment-based configuration
- deploy on a server with HTTPS

If you want, the next step I can take is to start Phase 1 for you by adding:

- `.env` support
- `.gitignore`
- `config.py`
- PostgreSQL-ready database connection structure

That would make the project much closer to live deployment.
