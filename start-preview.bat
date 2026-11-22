@echo off
cd /d "%~dp0"
echo K-tours now needs Node.js and a local PostgreSQL database.
echo 1) Run: npm install
echo 2) Copy .env.example to .env and set DATABASE_URL, ADMIN_PASSWORD and SESSION_SECRET.
echo 3) Run: npm run dev
echo 4) Open http://localhost:10000
pause
