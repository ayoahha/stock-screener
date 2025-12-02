#!/bin/bash

# Database Setup Script
# Sets up PostgreSQL via Docker for local development

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(dirname "$SCRIPT_DIR")"

echo "==================================="
echo "Stock Screener - Database Setup"
echo "==================================="

# Check if Docker is available
if ! command -v docker &> /dev/null; then
    echo "Error: Docker is not installed or not in PATH"
    echo "Please install Docker: https://docs.docker.com/get-docker/"
    exit 1
fi

# Check if docker compose is available
if ! docker compose version &> /dev/null; then
    echo "Error: Docker Compose is not available"
    echo "Please install Docker Compose: https://docs.docker.com/compose/install/"
    exit 1
fi

# Create .env file if it doesn't exist
if [ ! -f "$ROOT_DIR/.env" ]; then
    echo "Creating .env file from .env.docker.example..."
    cp "$ROOT_DIR/.env.docker.example" "$ROOT_DIR/.env"
    echo "Created .env file. You can customize it if needed."
fi

# Create apps/web/.env.local if it doesn't exist
if [ ! -f "$ROOT_DIR/apps/web/.env.local" ]; then
    echo "Creating apps/web/.env.local from .env.local.example..."
    cp "$ROOT_DIR/apps/web/.env.local.example" "$ROOT_DIR/apps/web/.env.local"
    echo "Created apps/web/.env.local file."
fi

echo ""
echo "Starting PostgreSQL container..."
cd "$ROOT_DIR"
docker compose up -d postgres

echo ""
echo "Waiting for PostgreSQL to be ready..."
for i in {1..30}; do
    if docker compose exec -T postgres pg_isready -U stockscreener -d stockscreener &> /dev/null; then
        echo "PostgreSQL is ready!"
        break
    fi
    if [ $i -eq 30 ]; then
        echo "Error: PostgreSQL did not become ready in time"
        exit 1
    fi
    echo "Waiting... ($i/30)"
    sleep 1
done

echo ""
echo "==================================="
echo "Database setup complete!"
echo "==================================="
echo ""
echo "PostgreSQL is running on localhost:5432"
echo "  Database: stockscreener"
echo "  User: stockscreener"
echo "  Password: stockscreener"
echo ""
echo "Connection string:"
echo "  postgresql://stockscreener:stockscreener@localhost:5432/stockscreener"
echo ""
echo "To start pgAdmin (optional):"
echo "  docker compose --profile admin up -d"
echo "  Then open: http://localhost:5050"
echo ""
echo "To stop the database:"
echo "  docker compose down"
echo ""
echo "To view logs:"
echo "  docker compose logs -f postgres"
echo ""
