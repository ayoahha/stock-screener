# Docker Setup for Stock Screener

This guide explains how to run Stock Screener with a local PostgreSQL database using Docker.

## Prerequisites

- [Docker](https://docs.docker.com/get-docker/) (version 20.10+)
- [Docker Compose](https://docs.docker.com/compose/install/) (version 2.0+)
- Node.js 20+ and pnpm 8+

## Quick Start

### 1. Start the Database

```bash
# One-command setup (creates .env files and starts PostgreSQL)
pnpm db:setup

# Or manually:
docker compose up -d postgres
```

### 2. Configure the Application

The setup script creates `.env` files automatically. If you need to configure manually:

```bash
# Copy the Docker environment template
cp .env.docker.example .env

# Copy the web app environment template
cp apps/web/.env.local.example apps/web/.env.local
```

### 3. Install Dependencies and Run

```bash
# Install dependencies
pnpm install

# Run the development server
pnpm dev
```

The application will be available at `http://localhost:3000`.

## Database Commands

| Command | Description |
|---------|-------------|
| `pnpm db:setup` | One-command setup (creates configs, starts PostgreSQL) |
| `pnpm db:start` | Start the PostgreSQL container |
| `pnpm db:stop` | Stop the PostgreSQL container |
| `pnpm db:logs` | View PostgreSQL logs |
| `pnpm db:reset` | Reset the database (deletes all data) |
| `pnpm db:test` | Test the database connection |
| `pnpm db:admin` | Start pgAdmin web interface |

## Configuration

### Environment Variables

The application supports two database backends:

#### Option 1: PostgreSQL (Docker) - Recommended for Local Development

Set one of these in your `.env` or `apps/web/.env.local`:

```bash
# Connection string (preferred)
DATABASE_URL=postgresql://stockscreener:stockscreener@localhost:5432/stockscreener

# OR individual variables
POSTGRES_HOST=localhost
POSTGRES_PORT=5432
POSTGRES_DB=stockscreener
POSTGRES_USER=stockscreener
POSTGRES_PASSWORD=stockscreener
```

#### Option 2: Supabase (Cloud)

```bash
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=xxx
SUPABASE_SERVICE_ROLE_KEY=xxx
```

**Note:** If `DATABASE_URL` or `POSTGRES_HOST` is set, the PostgreSQL backend is used automatically, even if Supabase variables are present.

### Docker Compose Variables

Configure these in the root `.env` file:

```bash
# PostgreSQL
POSTGRES_USER=stockscreener
POSTGRES_PASSWORD=stockscreener
POSTGRES_DB=stockscreener
POSTGRES_PORT=5432

# pgAdmin (optional)
PGADMIN_EMAIL=admin@stockscreener.local
PGADMIN_PASSWORD=admin
PGADMIN_PORT=5050
```

## pgAdmin (Optional)

pgAdmin provides a web interface for managing PostgreSQL:

```bash
# Start pgAdmin alongside PostgreSQL
pnpm db:admin

# Or manually
docker compose --profile admin up -d
```

Access pgAdmin at `http://localhost:5050`:
- Email: `admin@stockscreener.local` (or your `PGADMIN_EMAIL`)
- Password: `admin` (or your `PGADMIN_PASSWORD`)

To connect to the database in pgAdmin:
- Host: `postgres` (Docker network name)
- Port: `5432`
- Database: `stockscreener`
- Username: `stockscreener`
- Password: `stockscreener`

## Database Schema

The database schema is automatically initialized when the PostgreSQL container first starts. The initialization script is located at:

```
docker/postgres/init/01_schema.sql
```

This includes all tables, indexes, views, functions, triggers, and seed data.

### Tables

| Table | Description |
|-------|-------------|
| `stock_history` | History of researched stocks with ratios and scores |
| `stock_cache` | Cache for scraped financial data (5-minute TTL) |
| `user_settings` | User preferences |
| `watchlists` | Stock watchlists |
| `custom_scoring_profiles` | Custom scoring configurations |
| `ai_usage_log` | AI API usage tracking |

### Views

| View | Description |
|------|-------------|
| `stock_history_stats` | Aggregate statistics |
| `recent_stock_updates` | 20 most recently updated stocks |
| `valid_stock_cache` | Non-expired cache entries |
| `ai_current_month_spend` | Current month AI spend |
| `ai_daily_stats` | Daily AI usage statistics |

## Data Persistence

PostgreSQL data is stored in a Docker volume named `stock-screener-postgres-data`. This persists across container restarts.

To completely reset the database:

```bash
# This deletes all data!
pnpm db:reset
```

## Troubleshooting

### Connection Refused

If you see "connection refused" errors:

1. Check if the container is running:
   ```bash
   docker compose ps
   ```

2. Check container logs:
   ```bash
   pnpm db:logs
   ```

3. Ensure the port is not in use:
   ```bash
   lsof -i :5432
   ```

### Permission Denied

If you see permission errors on Linux:

```bash
# Fix Docker socket permissions
sudo chmod 666 /var/run/docker.sock
```

### Database Not Initialized

If tables are missing, the init script may not have run. Reset the database:

```bash
pnpm db:reset
```

### Test Connection

Verify the database connection:

```bash
pnpm db:test
```

## Architecture

```
┌─────────────────────┐     ┌─────────────────────┐
│   Next.js App       │────▶│   PostgreSQL        │
│   (localhost:3000)  │     │   (localhost:5432)  │
└─────────────────────┘     └─────────────────────┘
                                     │
                                     ▼
                            ┌─────────────────────┐
                            │   Docker Volume     │
                            │   (Data Storage)    │
                            └─────────────────────┘
```

The application uses a unified database client that automatically detects and uses the PostgreSQL backend when `DATABASE_URL` is set. The same codebase works with both Supabase (cloud) and PostgreSQL (local).
