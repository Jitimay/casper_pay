#!/bin/bash

cd "$(dirname "$0")"

echo "🚀 Starting CasperPay Bridge Demo"
echo "================================"

# Check if dependencies are installed
if [ ! -d "relayer/node_modules" ]; then
    echo "📦 Installing relayer dependencies..."
    cd relayer
    npm install
    cd ..
fi

if [ ! -d "frontend/node_modules" ]; then
    echo "📦 Installing frontend dependencies..."
    cd frontend
    npm install
    cd ..
fi

echo ""
echo "🔧 Starting services..."
echo ""

# Start relayer in background
echo "🔄 Starting relayer service on port 3001..."
cd relayer
node index.js &
RELAYER_PID=$!
cd ..

# Wait a moment for relayer to start
sleep 3

# Start frontend
echo "🌐 Starting frontend on port 3000..."
cd frontend
npm start &
FRONTEND_PID=$!
cd ..

echo ""
echo "🎉 CasperPay Bridge is starting!"
echo ""
echo "📊 Services:"
echo "├─ Relayer API: http://localhost:3001"
echo "├─ Frontend: http://localhost:3000"
echo "└─ Casper Testnet: Connected"
echo ""
echo "🌐 Open your browser to: http://localhost:3000"
echo ""
echo "⏹️  To stop services, press Ctrl+C"

# Wait for user to stop
trap "echo ''; echo '🛑 Stopping services...'; kill $RELAYER_PID $FRONTEND_PID 2>/dev/null; exit 0" INT

wait