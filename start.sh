#!/bin/bash

# VROOM Docker Quick Start Script

echo "🚗 VROOM - Vehicle Routing Optimization"
echo "====================================="

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
    echo "❌ Docker is not running. Please start Docker first."
    exit 1
fi

# Check if we're in the right directory
if [ ! -f "docker-compose.yml" ]; then
    echo "❌ Please run this script from the vroom-docker directory."
    exit 1
fi

# Check if frontend directory exists
if [ ! -d "../vroom-frontend" ]; then
    echo "❌ Frontend directory not found at ../vroom-frontend"
    echo "Please clone the VROOM frontend first:"
    echo "cd .. && git clone https://github.com/VROOM-Project/vroom-frontend.git"
    exit 1
fi

echo "🔍 Checking services..."

# Check if map exists
if [ ! -f "data/map.osrm" ]; then
    echo "⚠️  No map file found in data/ directory."
    echo "Please download a pre-processed map from https://download.geofabrik.de/"
    echo "Or process your own OSM data (see data/README.md)"
    echo "Starting without map - OSRM will not be functional."
fi

# Start services based on user choice
case "${1:-all}" in
    "backend")
        echo "🚀 Starting backend services (VROOM + OSRM)..."
        docker-compose --profile all --profile osrm up --build
        ;;
    "frontend")
        echo "🚀 Starting frontend service..."
        docker-compose --profile all --profile frontend up --build
        ;;
    "all")
        echo "🚀 Starting all services..."
        docker-compose --profile all up --build
        ;;
    *)
        echo "Usage: $0 [backend|frontend|all]"
        echo ""
        echo "  backend  - Start only VROOM and OSRM"
        echo "  frontend - Start only the web interface"
        echo "  all      - Start everything (default)"
        exit 1
        ;;
esac