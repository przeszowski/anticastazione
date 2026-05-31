@echo off
echo === Antica Nuxt — Git + npm setup ===
cd /d "%~dp0"

echo.
echo [1/4] npm install...
call npm install

echo.
echo [2/4] git init...
git init
git branch -M main

echo.
echo [3/4] git remote add origin...
git remote add origin https://github.com/przeszowski/anticastazione.git
git fetch origin
git merge --allow-unrelated-histories origin/main -m "Merge initial README"

echo.
echo [4/4] git add + commit + push...
git add .
git commit -m "feat: initial Nuxt 3 project setup — Antica Procedury module"
git push -u origin main

echo.
echo === GOTOWE! Uruchom: npm run dev ===
pause
