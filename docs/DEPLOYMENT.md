# Deployment Guide

## 1. Prerequisites

- **Docker Desktop** (Compose v2+) — for the recommended path.
- Or, for a manual run: **Node.js 20+** and **PostgreSQL 14+**.
- Ports free on the host: `8080` (gateway), `4001–4005` (services), `5432`
  (Postgres), `3000` (frontend).

## 2. Configuration

```bash
cp .env.example .env        # PowerShell: Copy-Item .env.example .env
```

Edit `.env` and, **for any non-local deployment, change**:

- `JWT_SECRET`, `JWT_REFRESH_SECRET` → long random strings
- `PGPASSWORD` → a strong password
- `CORS_ORIGIN` → your frontend origin (not `*`)

## 3. Run with Docker Compose (recommended)

```bash
docker compose up --build -d        # start detached
docker compose ps                   # check status
docker compose logs -f gateway      # follow logs
```

Startup order is enforced automatically:
`postgres` (healthcheck) → `migrate` (applies migrations + seed, then exits) →
the five services → `gateway`.

Verify:

```bash
curl http://localhost:8080/health
curl -X POST http://localhost:8080/api/auth/login \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"admin@tzw.com\",\"password\":\"Password123!\"}"
```

Stop:

```bash
docker compose down          # keep data
docker compose down -v       # also wipe the database volume
```

## 4. Run the frontend

```bash
cd frontend
npm install
# Ensure NEXT_PUBLIC_API_URL points at the gateway (default http://localhost:8080/api)
npm run dev      # dev:  http://localhost:3000
# or
npm run build && npm start   # production
```

## 5. Manual run (no Docker)

```bash
# 0. Start PostgreSQL locally and ensure .env DATABASE_URL points at it.

# 1. Shared lib
cd shared && npm install && cd ..

# 2. Migrate + seed
cd db && npm install && npm run migrate && npm run seed && cd ..

# 3. Each service (separate terminals)
cd services/user-service        && npm install && npm start
cd services/extinguisher-service && npm install && npm start
cd services/inspection-service   && npm install && npm start
cd services/reporting-service    && npm install && npm start
cd services/notification-service && npm install && npm start
cd services/gateway              && npm install && npm start
```

> When running manually, the gateway defaults each upstream to `localhost:<port>`,
> so no extra env is needed.

## 6. Database backup & restore

```bash
# Backup (writes db/backups/fems_<timestamp>.sql)
./db/backup.sh            # bash
./db/backup.ps1           # PowerShell

# Restore
./db/restore.sh ./db/backups/fems_<timestamp>.sql
```

A point-in-time export is also provided at
[`db/backups/fems_export.sql`](../db/backups/) when generated for handover.

## 7. Production hardening checklist

- [ ] Rotate `JWT_SECRET` / `JWT_REFRESH_SECRET`; store in a secrets manager.
- [ ] Put the gateway behind TLS (reverse proxy / load balancer).
- [ ] Restrict `CORS_ORIGIN` to known frontends.
- [ ] Remove the direct `4001–4005` host port mappings (keep only the gateway public).
- [ ] Use managed Postgres with automated backups; set `PG_POOL_MAX` appropriately.
- [ ] Wire a real email provider for `forgot-password` (the demo returns the token in the response).
- [ ] Add centralized logging/metrics and per-service horizontal scaling.

## 8. Troubleshooting

| Symptom | Fix |
|---|---|
| `dockerDesktopLinuxEngine ... cannot find` | Start Docker Desktop and wait for the engine. |
| Service can't reach DB | Confirm `migrate` completed: `docker compose logs migrate`. |
| `502 Upstream unavailable` from gateway | The target service is still starting or crashed — `docker compose logs <service>`. |
| Port already in use | Change the host port in `docker-compose.yml` / `.env`. |
