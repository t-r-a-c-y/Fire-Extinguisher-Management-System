# Architecture & Design Decisions

## 1. Style: RESTful microservices behind an API gateway

The system is decomposed into independently deployable services, each owning a
bounded slice of the domain and exposing a REST API. A single **API gateway**
is the only public surface; it routes `/api/<segment>` to the owning service and
forwards the caller's JWT unchanged.

```
Frontend ──► Gateway (8080) ──► { user, extinguisher, inspection, reporting, notification }
                                          └────────► PostgreSQL
```

| Concern | Where it lives |
|---|---|
| Routing / single entrypoint | gateway |
| Identity, RBAC, profiles | user-service |
| Equipment master data | extinguisher-service |
| Scheduling & maintenance | inspection-service |
| Analytics & exports | reporting-service |
| User notifications | notification-service |

## 2. Authentication & authorization

- **Access token** — short-lived JWT (`15m`), stateless, signed with `JWT_SECRET`.
  Every service validates it independently via the shared `authenticate`
  middleware, so no service depends on the user-service being reachable to
  authorize a request.
- **Refresh token** — longer-lived JWT whose SHA-256 hash is stored in
  `refresh_tokens`. Logout revokes it; password reset revokes all of a user's
  tokens. This gives real session termination on top of stateless access tokens.
- **RBAC** — `requireRole('admin', …)` guards each route. Roles: `admin`,
  `inspector`, `user`.

## 3. Data ownership

For this deliverable all services share **one PostgreSQL instance**. Reasons:

1. The **Reporting service** is inherently cross-cutting — it aggregates
   extinguishers, inspections and maintenance. A shared store keeps it a simple,
   correct read model instead of needing a data pipeline.
2. It keeps the demo runnable on a single machine.

Each service confines itself to its own tables, and inter-service side effects
(e.g. inspection-service writing a `notifications` row) go through table writes
rather than hidden coupling. Splitting into a database-per-service later is
therefore mechanical: give each service its own schema/DB and replace the
Reporting reads with events or a read replica.

## 4. Shared library (`@fems/shared`)

Cross-cutting infrastructure is factored into a small internal package consumed
by every service via a `file:` dependency (installed with `--install-links` in
Docker so it is copied, not symlinked):

- `db.js` — pooled `pg` client + `withTransaction`
- `auth.js` — `authenticate`, `optionalAuth`, `requireRole`
- `http.js` — `ApiError`, `asyncHandler`, 404 + central error handler (maps
  Postgres error codes to friendly HTTP responses)
- `validate.js` — dependency-free body validation
- `createApp.js` — Express app factory (helmet, cors, json, morgan, `/health`,
  Swagger UI at `/docs`, error tail)

## 5. Communication

- **Synchronous REST** through the gateway for all client traffic.
- **Asynchronous-ish via DB** for notifications: producers insert rows; the
  notification-service is the read/manage surface. In a larger deployment this
  is the seam where a message broker (e.g. RabbitMQ/Kafka) would slot in.

## 6. Resilience & ops

- `docker-compose` health checks gate startup ordering: Postgres → `migrate`
  (one-shot) → services → gateway.
- Each service exposes `/health` for liveness.
- The gateway returns `502` with a JSON body when an upstream is unavailable.
- Stateless services → horizontally scalable behind the gateway.

## 7. Security practices

- bcrypt password hashing (cost 10).
- Parameterised SQL everywhere (no value concatenation).
- `helmet` security headers, configurable CORS.
- Input validation with field-level error reporting.
- Secrets via environment variables (`.env`), never committed.

## 8. Technology choices

| Layer | Choice | Why |
|---|---|---|
| Frontend | Next.js (App Router) | SSR-capable React, file-based routing, easy API proxying |
| Services | Node.js + Express | Lightweight, ubiquitous, fast to iterate |
| DB | PostgreSQL | Relational integrity, enums, rich querying for reports |
| AuthN | JWT (`jsonwebtoken`) | Stateless, gateway-friendly |
| Docs | Swagger/OpenAPI (`swagger-ui-express`) | Interactive contract per service |
| Packaging | Docker Compose | One-command reproducible environment |
