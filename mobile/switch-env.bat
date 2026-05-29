@echo off
REM switch-env.bat — Chuyển đổi giữa local và production
REM Dùng: switch-env local
REM       switch-env prod

if "%1"=="local" goto LOCAL
if "%1"=="dev" goto LOCAL
if "%1"=="prod" goto PROD
if "%1"=="production" goto PROD
if "%1"=="render" goto PROD

echo Cach dung: switch-env {local^|prod}
echo.
echo   local  - dung http://localhost:3000/api
echo   prod   - dung https://expense-tracker-app-ee14.onrender.com/api
goto END

:LOCAL
echo ^[1/2^] Copy .env.local -^> .env
copy /y ".env.local" ".env" >nul
echo ^[2/2^] Xong! File .env da duoc cap nhat.
echo -^> Chay: npx expo start
goto END

:PROD
echo ^[1/2^] Copy .env.production -^> .env
copy /y ".env.production" ".env" >nul
echo ^[2/2^] Xong! File .env da duoc cap nhat.
echo -^> Chay: npx expo start
goto END

:END
