@echo off
REM WhatsApp Bridge Deployment Script for Railway (Windows)
REM Since the Railway project is not connected to Git, use `railway up` for manual deployment

echo.
echo 🚂 Deploying WhatsApp Bridge to Railway...
echo.

REM Check if Railway CLI is installed
where railway >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo ❌ Railway CLI not found!
    echo 📦 Install it with: npm install -g @railway/cli
    echo 🔗 Or visit: https://docs.railway.app/develop/cli
    exit /b 1
)

REM Check if logged in
railway whoami >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo ❌ Not logged in to Railway
    echo 🔑 Run: railway login
    exit /b 1
)

REM Check if linked to a project
railway status >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo ❌ Not linked to a Railway project
    echo 🔗 Run: railway link
    exit /b 1
)

echo ✅ Railway CLI ready
echo.

REM Show current project info
echo 📊 Current project:
railway status
echo.

REM Confirm deployment
set /p CONFIRM="🤔 Deploy to Railway now? (y/n) "
if /i not "%CONFIRM%"=="y" (
    echo ❌ Deployment cancelled
    exit /b 0
)

REM Deploy using railway up (manual upload)
REM IMPORTANT: Use --no-gitignore because parent .gitignore excludes sessions/ directory
REM but we need sessions/manager.js (source code) to be uploaded
echo.
echo 📤 Uploading and deploying...
railway up --no-gitignore

echo.
echo ✅ Deployment complete!
echo.
echo 🔍 Check logs with: railway logs
echo 🌐 Open dashboard: railway open
echo ⚙️  Set environment variables in Railway dashboard if needed
