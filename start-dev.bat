@echo off
REM Uruchamia serwer deweloperski ZAWSZE z głównego folderu projektu,
REM niezależnie od tego, skąd plik zostanie wywołany.
REM Dzięki temu Nuxt poprawnie wczytuje nuxt.config.ts oraz .env.

cd /d "%~dp0"
echo === L'Antica Procedury — start dev (folder: %CD%) ===
call npm run dev
pause
