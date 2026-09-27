#!/usr/bin/env sh

if ! command -v npm >/dev/null 2>&1; then
    echo "ERROR: npm not found. Install Node.js first."
    echo "https://nodejs.org/"
    echo "or, if you have a package manager:"
    echo "sudo apt install nodejs npm"
    exit 1
fi

if [ ! -d client/node_modules ]; then
    echo "Installing client dependencies..."
    cd client || exit 1

    if [ -f package-lock.json ]; then
        npm ci --no-save --no-audit --no-fund --loglevel=error
    else
        echo "ERROR: client/package-lock.json not found."
        cd .. || exit 1
        exit 1
    fi

    cd .. || exit 1
fi

if [ ! -d server/node_modules ]; then
    echo "Installing server dependencies..."
    cd server || exit 1

    if [ -f package-lock.json ]; then
        npm ci --no-save --no-audit --no-fund --loglevel=error
    else
        echo "ERROR: server/package-lock.json not found."
        cd .. || exit 1
        exit 1
    fi

    cd .. || exit 1
fi

cd server || exit 1

if [ ! -f .env ]; then
    cp .env.example .env
fi

npm run dev