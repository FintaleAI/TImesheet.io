@echo off

REM Go to script folder (important)
cd /d "%~dp0"

REM Activate virtual environment
call venv\Scripts\activate

REM Run Streamlit app
python -m streamlit run fintale_timesheet_app.py

pause
