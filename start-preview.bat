@echo off
cd /d "%~dp0"
echo Starting K-tours local preview at http://localhost:4173
py -m http.server 4173
pause
