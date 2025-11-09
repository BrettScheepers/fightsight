#!/bin/bash

# FightSight Test Runner
# Runs tests across all services

set -e

echo "🧪 Running FightSight Tests"
echo "==========================="
echo ""

FAILED=0

# Test API service
echo "Testing API service..."
if [ -d "services/api" ]; then
    cd services/api
    if [ -f "package.json" ]; then
        npm test || FAILED=$((FAILED+1))
    else
        echo "⚠ API package.json not found, skipping"
    fi
    cd ../..
else
    echo "⚠ API service not found, skipping"
fi

echo ""

# Test CV service
echo "Testing CV service..."
if [ -d "services/cv-service" ]; then
    cd services/cv-service
    if [ -f "requirements.txt" ]; then
        if command -v pytest &> /dev/null; then
            pytest || FAILED=$((FAILED+1))
        else
            echo "⚠ pytest not installed, skipping"
        fi
    else
        echo "⚠ CV service requirements.txt not found, skipping"
    fi
    cd ../..
else
    echo "⚠ CV service not found, skipping"
fi

echo ""

# Test Web service
echo "Testing Web service..."
if [ -d "services/web" ]; then
    cd services/web
    if [ -f "package.json" ]; then
        npm test || FAILED=$((FAILED+1))
    else
        echo "⚠ Web package.json not found, skipping"
    fi
    cd ../..
else
    echo "⚠ Web service not found, skipping"
fi

echo ""
echo "==========================="
if [ $FAILED -eq 0 ]; then
    echo "✅ All tests passed!"
    exit 0
else
    echo "❌ $FAILED test suite(s) failed"
    exit 1
fi
