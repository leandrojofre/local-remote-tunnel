@echo off
setlocal

where npm >nul 2>&1
if %ERRORLEVEL% neq 0 (
    echo ERROR: npm not found. Install Node.js first.
    echo https://nodejs.org/
    echo or, if you have Chocolatey:
    echo choco install nodejs-lts -y
    exit /b 1
)

if not exist client\node_modules (
    echo Installing client dependencies...
    pushd client
    if exist package-lock.json (
        call npm ci --no-save --no-audit --no-fund --loglevel=error
    ) else (
        echo ERROR: client\package-lock.json not found.
        popd
        exit /b 1
    )
    popd
)

if not exist server\node_modules (
    echo Installing server dependencies...
    pushd server
    if exist package-lock.json (
        call npm ci --no-save --no-audit --no-fund --loglevel=error
    ) else (
        echo ERROR: server\package-lock.json not found.
        popd
        exit /b 1
    )
    popd
)

cd server

if not exist .env copy .env.example .env

npm run dev