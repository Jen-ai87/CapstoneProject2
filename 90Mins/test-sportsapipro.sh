#!/bin/bash
# Quick Start: Test SportsAPIPro Provider

echo "🏆 Football App - API Provider Test Script"
echo "==========================================="
echo ""

# Check if .env file exists
if [ ! -f .env ]; then
  echo "📝 Creating .env file from .env.example..."
  cp .env.example .env
fi

echo "✏️  Updating .env to use SportsAPIPro provider..."
# Use sed to update or add the VITE_API_PROVIDER line
if grep -q "VITE_API_PROVIDER" .env; then
  sed -i 's/VITE_API_PROVIDER=.*/VITE_API_PROVIDER=sportsapipro/' .env
else
  echo "VITE_API_PROVIDER=sportsapipro" >> .env
fi

# Ensure the API key is set
if grep -q "VITE_SPORTSAPIPRO_API_KEY" .env; then
  echo "✅ SportsAPIPro API key already configured"
else
  echo "VITE_SPORTSAPIPRO_API_KEY=dc2a8076-6e55-4835-bb15-45273ed19411" >> .env
  echo "✅ SportsAPIPro API key added to .env"
fi

echo ""
echo "🚀 Ready to test! Run:"
echo "   npm run dev"
echo ""
echo "📍 Then check the browser console for:"
echo "   🏆 Football API Provider: sportsapipro"
echo ""
echo "💡 To switch back to football-data.org:"
echo "   Edit .env and set: VITE_API_PROVIDER=football-data-org"
