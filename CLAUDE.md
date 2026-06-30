# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

TACS is a sticker collection trading platform (FIFA World Cup figuritas) with auctions, peer-to-peer exchanges, and user ratings. It consists of a Java Spring Boot backend and a React + Vite frontend, orchestrated with Docker Compose.

## Running the Application

```bash
# Start everything (recommended)
docker compose up --build

# Start in background
docker compose up --build -d

# View logs
docker compose logs -f
docker compose logs -f backend

# Stop
docker compose down
```

Frontend accessible at `http://localhost` (port 80), backend API at `http://localhost:8080`.

**Required:** a `.env` file at the repo root provides `SPRING_MONGODB_URI` (the MongoDB Atlas connection string), consumed by the backend service in `docker-compose.yml`. See `.env.example` for the format. Without it the backend boots but every data operation fails. Connecting to Atlas requires the running machine's public IP to be in the cluster's Network Access list and valid Database Access credentials in the URI.

### Production deploy (AWS EC2 + HTTPS + Cloudflare)

Live at **https://tacs-g3-figuritas.dev/** — the domain is `tacs-g3-figuritas.dev` (Name.com, free via GitHub Student Pack), delegated to Cloudflare (proxy/CDN/DDoS) → EC2. **DuckDNS is deprecated** (`tacs-g3-figuritas.duckdns.org` may still resolve as a leftover, but is no longer used). The base `docker-compose.yml` + `nginx.conf` are **HTTP-only for local dev**; production HTTPS is a committed override:

```bash
# On the EC2 (one-time cert bootstrap): ./init-letsencrypt.sh
docker compose -f docker-compose.yml -f docker-compose.prod.yml up --build -d
```

`docker-compose.prod.yml` exposes 443, adds a `certbot` renewal container, and mounts TLS material. `frontend/nginx.prod.conf` serves `tacs-g3-figuritas.dev` via a 443 server block with a Cloudflare Origin Certificate (selected by SNI, Full strict); a legacy DuckDNS server block (Let's Encrypt) is still present as default but deprecated. TLS secrets live under `./certbot/` and `./cloudflare/` on the EC2 — both **gitignored**, never committed. Full details (DNS records, cert rotation, Security Group) are in `README.md` (§ Online (AWS)). Deploy/infra specifics are in the agent's memory, not the repo.

## Task Management (Trello)

The project's tasks/user stories live on the [Trello board TACS](https://trello.com/b/OjLlcKiN/tacs). A local helper to read it from the CLI/Claude lives in `scripts/trello/` (the whole `/scripts/` folder is **gitignored** — credentials are never committed):

```bash
node scripts/trello/trello.mjs cards   # cards grouped by list (JSON)
node scripts/trello/trello.mjs lists   # board columns
node scripts/trello/trello.mjs board   # board info (validates credentials)
```

Credentials (Trello API key + token) go in `scripts/trello/trello.config.json`. The bundled `trello.mjs` only does GETs (read), but the token has **write scope** too — moving cards or posting comments works via direct `PUT`/`POST` to the Trello API (used in past sessions to move cards to "Hecho"). Setup details: `scripts/trello/README.md`. If that folder is missing on a fresh checkout, follow its README to recreate it.

## Frontend Commands

```bash
cd frontend
npm run dev       # Vite dev server
npm run build     # TypeScript compile + production build
npm run lint      # ESLint
npm run preview   # Preview production build
```

## Backend Commands

```bash
cd backend
./mvnw clean package -DskipTests   # Build JAR
./mvnw test                         # Run tests
./mvnw test -Dtest=ClassName#method # Run single test
```

## Architecture

**Two-service setup:**
- **Backend** (Spring Boot, port 8080): REST API with layered architecture — Controller → Service → Repository. Persistence via MongoDB Atlas (Spring Data MongoDB); repositories extend `MongoRepository`. JWT-based auth with Spring Security.
- **Frontend** (React + Nginx, port 80): Nginx serves the SPA and reverse-proxies `/api/*` to the backend, eliminating CORS issues. All API calls go through Nginx.

**Auth flow:** JWT tokens stored in localStorage, decoded client-side to extract user ID and roles. Admin role gates the `/admin` route.

**Backend package structure:** `com.grupo3.tp.{controller,service,repository,models}`

**Frontend structure:** `src/pages/` (feature-based), `src/components/`, `src/services/` (API layer + mappers), `src/auth/` (JWT context), `src/types/`, `src/router/`.

**Key domain entities:** `Usuario`, `Figurita`, `FiguritaBase`, `Subasta` (auction), `Oferta` (bid), `Intercambio` (trade), `SolicitudDeIntercambio`, `Seleccion`, `Equipo`, `Calificacion`, `Alerta`.

> **Implementation status (do not over-trust the entity list):** `Alerta`/`GeneradorAlerta` are **stubs** — plain POJOs without `@Document`, whose generators return `null`, with no repository/service/controller wiring. `Calificacion` has CRUD only (no reputation/average computation). So US10 (reputation) and the proactive part of US11 (alerts) are **not** implemented. **US4 (auto-suggestions) IS implemented**: `Sugerencia` is now a real `@Document` with `SugerenciaService` (bidirectional matching), `SugerenciaRepository`, `SugerenciaController` (`POST /api/sugerencias/regenerar`, admin), a daily `@Scheduled` job (`SugerenciaScheduler`, 3 AM) and `GET /api/usuarios/{userName}/sugerencias`; the old `GestionadorSugerencias` stub was removed. Full US coverage map lives in `README.md` (§ Cobertura de User Stories).

## Tech Stack

| Layer | Technology |
|---|---|
| Backend | Java 21, Spring Boot 4.0.5, Spring Data MongoDB (Atlas), Spring Security + JWT (jjwt 0.12.6), Lombok, Maven |
| Frontend | React 19, Vite 8, TypeScript 6, TailwindCSS v4 (Vite plugin), React Router 6, Axios |
| Infra | Docker, Docker Compose, Nginx |

## Key Design Decisions

- Persistence uses MongoDB Atlas via Spring Data MongoDB. The connection string is injected through `SPRING_MONGODB_URI` (from `.env`); the `docker` profile (`application-docker.properties`) reads it. An earlier in-memory HashMap implementation was replaced by this MongoDB migration.
- Secrets are injected via env vars, never hardcoded: `SPRING_MONGODB_URI` and `JWT_SECRET` (the JWT signing key, bound to `jwt.secret`). Only `.env.example` (placeholders) is committed; the real `.env` is gitignored.
- All pages are lazy-loaded via `React.lazy()` for code splitting.
- Frontend auth state uses React Context API (no Redux/Zustand).
- Axios is configured with a JWT interceptor for all API calls.
- Nginx has an SPA fallback (`try_files $uri /index.html`) — required for client-side routing to work correctly.