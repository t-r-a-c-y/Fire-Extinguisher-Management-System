# 🎤 Presentation-Day Runbook

A start-to-finish checklist for demoing the TZW Fire Extinguisher Management
System. Commands are for **PowerShell** on Windows, run from the project root:
`c:\Users\Administrator\Documents\practice of ne\_ne_restful`.

---

## 0. Before you start (once)

- Open **Docker Desktop** and wait until it says *"Engine running"*.
- That's the only prerequisite. Node is only needed for the frontend.

---

## 1. Start the backend (all services + database)

```powershell
docker compose up --build -d
```

Wait ~30–60s, then confirm everything is healthy:

```powershell
docker compose ps
```

You should see `postgres (healthy)` and the 6 services `Up`. The `migrate`
container will show `Exited (0)` — that's correct, it runs once and stops.

Quick API check:

```powershell
curl http://localhost:8080/health
```

---

## 2. Start the frontend

```powershell
cd frontend
npm install        # only the first time
npm run dev
```

Open **http://localhost:3000**.

> If you get `EADDRINUSE` / port 3000 busy, a stale server is running. Kill it:
> ```powershell
> Get-NetTCPConnection -LocalPort 3000 -ErrorAction SilentlyContinue |
>   ForEach-Object { Stop-Process -Id $_.OwningProcess -Force }
> ```
> then `npm run dev` again.

**Demo logins** (password `Password123!` for all):

| Email | Role | Use it to show |
|---|---|---|
| `admin@tzw.com` | admin | full system dashboard, add/delete, manage users |
| `inspector@tzw.com` | inspector | complete inspections, log maintenance (cannot add extinguishers) |
| `user@tzw.com` | user | personal (zero-scoped) dashboard, view details, send a request |

---

## 3. Suggested demo flow (5 minutes)

1. **Login as admin** → Dashboard (whole-system KPIs).
2. **Extinguishers** → Add one (show date validation: try expiry before
   installation → it's rejected). Click a serial → **detail page** with history.
3. **Inspections** → Schedule one, then **Complete** it with "needs maintenance"
   → show the extinguisher status flips to *maintenance*.
4. **Maintenance** → Log an activity.
5. **Reports** → switch tabs, click **Export PDF** and **Export CSV**.
6. **Notifications** (bell + page) → show the auto-generated messages.
7. **Dark mode** 🌙 and **mobile hamburger** ☰ (shrink the window).
8. **Logout, login as `user@tzw.com`** → dashboard shows **zeros** (personal
   scope); open an extinguisher → **Send a request**; log back in as admin to
   show the request notification arrived.

---

## 4. Prove the data is really in PostgreSQL

The database lives inside the `fems-postgres` container. You do **not** need psql
installed locally.

### Quick one-line checks
```powershell
# Row counts for every table
docker exec -i fems-postgres psql -U fems -d fems -c "SELECT 'users' t,count(*) FROM users UNION ALL SELECT 'fire_extinguishers',count(*) FROM fire_extinguishers UNION ALL SELECT 'inspections',count(*) FROM inspections UNION ALL SELECT 'maintenance_logs',count(*) FROM maintenance_logs UNION ALL SELECT 'notifications',count(*) FROM notifications ORDER BY 1;"
```

```powershell
# See the actual extinguishers (newest first)
docker exec -i fems-postgres psql -U fems -d fems -c "SELECT serial_number, location, type, status, expiry_date FROM fire_extinguishers ORDER BY created_at DESC;"

# See registered users
docker exec -i fems-postgres psql -U fems -d fems -c "SELECT first_name, last_name, email, role FROM users;"
```

### Live "it really saves" demo
1. In the UI (as admin) **add an extinguisher** (e.g. serial `FE-DEMO`).
2. Run:
   ```powershell
   docker exec -i fems-postgres psql -U fems -d fems -c "SELECT serial_number, location, created_at FROM fire_extinguishers WHERE serial_number = 'FE-DEMO';"
   ```
   The row appears instantly — that's proof it persisted to PostgreSQL.

### Interactive SQL shell (optional)
```powershell
docker exec -it fems-postgres psql -U fems -d fems
# then:  \dt   (list tables)   SELECT * FROM inspections;   \q  (quit)
```

### GUI option (optional, looks great on screen)
Connect **pgAdmin / DBeaver / TablePlus** to: host `localhost`, port `5432`,
db `fems`, user `fems`, password `fems_password`.

### Export the database (for handover)
```powershell
./db/backup.ps1     # writes db/backups/fems_<timestamp>.sql
```

---

## 5. Show / create the diagram images

Two diagrams live in `docs/diagrams/`.

### Easiest — open the ready-made pages
Double-click these in File Explorer (they open in your browser):
- `docs/diagrams/architecture.html` — system architecture
- `docs/diagrams/database-erd.html` — database model (ERD)

Each page has a **⬇ Download SVG** button → saves a crisp vector image you can
drop into slides or a report. (They load Mermaid from the internet, so be online
the first time.)

### To create a PNG/SVG from scratch
1. Go to **https://mermaid.live**.
2. Paste the diagram text (the code blocks are in `README`/`docs/ERD.md`, or copy
   from inside the two HTML files between `<pre class="mermaid"> … </pre>`).
3. Use **Actions → PNG** (or SVG) to download the image.

---

## 6. Swagger (live API docs) — optional to show

Each service has interactive docs:
- Users/Auth → http://localhost:4001/docs
- Extinguishers → http://localhost:4002/docs
- Inspections → http://localhost:4003/docs
- Reports → http://localhost:4004/docs
- Notifications → http://localhost:4005/docs

To call protected endpoints: log in via **POST /auth/login** on :4001, copy the
`accessToken`, click **Authorize** on any service, paste the token, then use
**Try it out** on any endpoint.

---

## 7. Shut down after the demo

```powershell
# Stop services but KEEP the data
docker compose down

# OR stop AND wipe the database (fresh start next time)
docker compose down -v
```

> `down -v` deletes all data; on the next `docker compose up` the seed runs again
> and restores the demo accounts + sample extinguishers.
