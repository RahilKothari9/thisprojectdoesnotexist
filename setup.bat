@echo off
title ThisProjectDoesNotExist Setup

echo 🚀 Setting up ThisProjectDoesNotExist...
echo.

REM Check if Node.js is installed
node --version >nul 2>&1
if errorlevel 1 (
    echo ❌ Node.js is not installed. Please install Node.js 18+ first.
    echo    Visit: https://nodejs.org/
    pause
    exit /b 1
)

echo ✅ Node.js found
node --version

REM Check if npm is installed
npm --version >nul 2>&1
if errorlevel 1 (
    echo ❌ npm is not installed. Please install npm first.
    pause
    exit /b 1
)

echo ✅ npm found
npm --version
echo.

REM Install frontend dependencies
echo 📦 Installing frontend dependencies...
call npm install

if errorlevel 1 (
    echo ❌ Failed to install frontend dependencies
    pause
    exit /b 1
)

echo ✅ Frontend dependencies installed
echo.

REM Install backend dependencies
echo 📦 Installing backend dependencies...
cd backend
call npm install

if errorlevel 1 (
    echo ❌ Failed to install backend dependencies
    pause
    exit /b 1
)

echo ✅ Backend dependencies installed
echo.

REM Create .env file from example
if not exist .env (
    echo 📝 Creating .env file from example...
    copy .env.example .env >nul
    echo ✅ .env file created
) else (
    echo ⚠️  .env file already exists, skipping...
)

cd ..

echo.
echo 🎉 Setup complete!
echo.
echo 📋 Next steps:
echo 1. Get your Gemini API key from: https://makersuite.google.com/app/apikey
echo 2. Edit backend\.env and replace the placeholder API key
echo 3. Start the backend: cd backend ^&^& npm run dev
echo 4. Start the frontend: npm run dev
echo 5. Visit http://localhost:5173 in your browser
echo.
echo 🔒 Security reminder: Never commit your actual API key to git!
echo.
echo Happy creating! ✨
echo.
pause
