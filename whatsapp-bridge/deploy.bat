@echo off
REM WhatsApp Bridge Deployment Guide for Render
REM Render auto-builds from Git — just push to your repo's branch.

echo.
echo 🌐 Kairo Bridge — Deploy to Render
echo.
echo Render deploys automatically from Git. No CLI needed.
echo.
echo Setup (one-time):
echo   1. Go to https://dashboard.render.com
echo   2. Create a new Web Service - connect your GitHub repo
echo   3. Set Root Directory to: whatsapp-bridge
echo   4. Build Command:      (auto-detected — Dockerfile)
echo   5. Start Command:      (auto-detected — Dockerfile CMD)
echo   6. Health Check Path:  /health
echo.
echo You can also use render.yaml (Blueprint) at the repo root
echo for fully automated infra setup.
echo.
echo Set these env vars in the Render dashboard:
echo   NODE_ENV=production
echo   GROQ_API_KEY=^<your-groq-key^>
echo   CALENDAR_URL=https://kairocalender.web.app
echo   ALLOWED_ORIGINS=https://kairocalender.web.app,https://kairocalender.firebaseapp.com
echo   BRIDGE_REQUIRE_AUTH=true
echo   BRIDGE_ADMIN_API_KEY=^<long-random-secret^>
echo.
echo Deploy:
echo   git push origin main
echo.
echo Your bridge URL will be: https://kairo-bridge.onrender.com
echo Update frontend .env: VITE_BRIDGE_URL=https://kairo-bridge.onrender.com
