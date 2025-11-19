## Quick orientation for AI coding agents

This repository is a Next.js 14 (App Router) HRMS web app with a custom Node server that runs Next and Socket.IO. Key runtime pieces you should be aware of:

- App code: `app/` (Next.js App Router)
- Custom server + Socket.IO bootstrap: `server.js` — this file starts the HTTP server, mounts Next, and creates a Socket.IO instance stored on `global.io` so API routes can broadcast messages.
- DB layer: `lib/mongodb.js` + `models/` (Mongoose schemas)
- Dev/build scripts: `package.json` scripts and many helper scripts under `scripts/` (see `scripts/seed.js`, `scripts/setup-vector-db.js`, `scripts/generate-embeddings-*.js`).
- Container & infra: `Dockerfile`, `docker-compose.yml`, and `Dockerfile.optimized` for production images.

## Primary workflows (concrete commands)
- Local dev with sockets (recommended for end-to-end):
  - `npm run dev`  -> runs `node server.js` (starts Next + Socket.IO). Use this when working on APIs that depend on `global.io` or realtime features.
- Next.js-only development (fast frontend iteration):
  - `npm run dev:next` -> runs `next dev`. Note: `next dev` alone will not initialize the custom Socket.IO instance in `server.js`.
- Build for production:
  - `npm run build`  (this uses `SKIP_ENV_VALIDATION=true next build` in package.json)
  - `npm run start`  -> `NODE_ENV=production node server.js` (starts production server + sockets)
- Helpful scripts:
  - `npm run seed` — seed DB (`scripts/seed.js`)
  - `npm run migrate` — migration helpers (`scripts/migrate-to-atlas.js`)
  - `npm run setup-local` / `npm run check-env` — environment helpers for local/Vercel

## Project-specific conventions and patterns
- Socket.IO is created in `server.js` and attached to `global.io`. Any API route or module that needs to push realtime events should reference `global.io` (e.g. `global.io.emit(...)` or `global.io.to(...).emit(...)`). When changing socket events, update both the server event names and any client listeners under `app/*`.
- The repo uses the Next.js App Router. Pages and server actions live under `app/`. Prefer App Router patterns (server components, route handlers) when adding new UI or API features.
- Many operational tasks are expressed as Node scripts in `scripts/`. Look there for vector/embedding setup (`setup-vector-db.js`, `generate-embeddings-openai.js`, `test-vector-search.js`) and for env fixes (`fix-vercel-env.js`).
- Environment variables: `.env.local` (root). Several scripts expect specific env vars — run `npm run check-env` or inspect `scripts/fix-vercel-env.js` before building.

## Integrations & external dependencies to note
- Database: MongoDB (Mongoose). Connection helper: `lib/mongodb.js`.
- Auth: NextAuth / JWT usage across API routes and models.
- Realtime: `socket.io` server + `socket.io-client` on front-end. Socket path is `/api/socketio`.
- Push/notifications: `firebase` / `firebase-admin`, `react-onesignal`, and `web-push` are present — watch `public/` for service worker and `app/api/*` for notification endpoints.
- Vector/AI: `openai` and `@xenova/transformers` are used. Embedding-related scripts live in `scripts/` and vector DB setup is explicit (see `scripts/setup-vector-db.js`).

## Quick examples (do this when editing code)
- To emit an event from an API route after saving a message:
  - ensure server running with `npm run dev`
  - inside the route handler: `if (global.io) global.io.to(`chat:${chatId}`).emit('new-message', payload)`
- When adding a page/API, place UI under `app/<module>/` and server routes under `app/api/<module>/` to keep the App Router layout consistent.

## Files to read first (high signal)
- `server.js`  — how sockets and the HTTP server are wired
- `package.json` — scripts you should run and deps
- `app/` — where UI and API route code lives (App Router)
- `lib/mongodb.js` and `models/` — database connection and schemas
- `scripts/` — operational tooling (seeding, embedding generation, migrations)
- `Dockerfile` / `docker-compose.yml` — containerization and prod config

If anything here looks incorrect or you want more detail (examples of API routes that call `global.io`, or the most important scripts under `scripts/`), tell me which area to expand and I will iterate. 
