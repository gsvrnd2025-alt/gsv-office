@echo off
REM GSV Office Desktop Client — Build Script
REM Run this to install dependencies and build the Windows installer

echo ============================================
echo   GSV Office Desktop Client Builder
echo ============================================
echo.

REM Check Node.js
where node >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] Node.js not found! Please install Node.js from https://nodejs.org
    pause
    exit /b 1
)

echo [1/3] Installing dependencies...
call npm install
if %errorlevel% neq 0 (
    echo [ERROR] npm install failed!
    pause
    exit /b 1
)

echo.
echo [2/3] Building Windows installer...
call npm run build
if %errorlevel% neq 0 (
    echo [ERROR] Build failed!
    pause
    exit /b 1
)

echo.
echo [3/3] Done!
echo.
echo Output files in: dist\
echo   - GSV Office Setup.exe      (installer)
echo   - GSVOffice-Portable.exe    (portable - no install needed)
echo.
echo Share either file with all PCs in the office.
echo They all connect to: http://192.168.0.177:8080
echo.
pause
