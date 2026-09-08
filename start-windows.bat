@echo off
setlocal

cd /d "%~dp0"
set "ROOT=%~dp0"
set "BACKEND=%ROOT%backend"
set "FRONTEND=%ROOT%frontend"
set "VENV=%BACKEND%\.venv"
set "VENV_PYTHON=%VENV%\Scripts\python.exe"

color 0B

echo ===================================================
echo   RailPulse ETA - One-Click Startup
echo   Smart India Hackathon 2026 Prototype
echo ===================================================
echo.

echo [1/4] Checking required software...

where python >nul 2>&1
if %errorlevel%==0 goto PYTHON_OK
where py >nul 2>&1
if %errorlevel%==0 goto PYTHON_LAUNCHER_OK

echo.
echo ERROR: Python was not found.
echo Please install Python 3.10+ and make sure it is available from Command Prompt.
echo Then run this file again.
pause
exit /b 1

:PYTHON_OK
set "PYTHON_CMD=python"
goto PYTHON_READY

:PYTHON_LAUNCHER_OK
set "PYTHON_CMD=py"

echo Python found:
%PYTHON_CMD% --version

:PYTHON_READY
where node >nul 2>&1
if not %errorlevel%==0 goto NODE_ERROR
where npm >nul 2>&1
if not %errorlevel%==0 goto NODE_ERROR

echo Node found:
node --version
echo.

echo [2/4] Preparing Python environment...
if exist "%VENV_PYTHON%" goto VENV_READY

echo Creating backend virtual environment...
%PYTHON_CMD% -m venv "%VENV%"
if not exist "%VENV_PYTHON%" goto VENV_ERROR

:VENV_READY
echo Installing/checking backend dependencies...
"%VENV_PYTHON%" -m pip install -r "%BACKEND%\requirements.txt"
if not %errorlevel%==0 goto PIP_ERROR

echo.
echo [3/4] Installing/checking frontend dependencies...
if exist "%FRONTEND%\node_modules" goto NODE_MODULES_READY
npm.cmd install
if not %errorlevel%==0 goto NPM_ERROR

:NODE_MODULES_READY

echo.
echo [4/4] Starting RailPulse services...
echo.

echo Starting Backend on http://localhost:8000 ...
start "RailPulse Backend" cmd /k "cd /d ""%BACKEND%"" && ""%VENV_PYTHON%"" -m uvicorn app.main:app --host 0.0.0.0 --port 8000"

echo Waiting for backend startup...
timeout /t 10 /nobreak >nul

echo Starting Frontend on http://localhost:3000 ...
start "RailPulse Frontend" cmd /k "cd /d ""%FRONTEND%"" && npm.cmd run dev -- --host 127.0.0.1 --port 3000"

echo Waiting for frontend startup...
timeout /t 4 /nobreak >nul
start "" "http://localhost:3000"

echo.
echo ===================================================
echo  RailPulse ETA is running!
echo  Frontend: http://localhost:3000
echo  Backend:  http://localhost:8000
echo  API Docs: http://localhost:8000/docs
echo.
echo  Keep the Backend and Frontend windows open.
echo  Close those two windows to stop RailPulse.
echo ===================================================
echo.
pause
exit /b 0

:NODE_ERROR
echo.
echo ERROR: Node.js and npm were not found.
echo Please install Node.js 20+ and make sure node/npm are available from Command Prompt.
echo Then run this file again.
pause
exit /b 1

:VENV_ERROR
echo.
echo ERROR: Could not create the Python virtual environment.
echo Please verify that Python is installed correctly.
pause
exit /b 1

:PIP_ERROR
echo.
echo ERROR: Backend dependency installation failed.
echo Check the Backend window/output above and try again.
pause
exit /b 1

:NPM_ERROR
echo.
echo ERROR: Frontend dependency installation failed.
echo Check your internet connection and try again.
pause
exit /b 1
