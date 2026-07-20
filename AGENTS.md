# AGENTS.md

Esports tournament platform — React 19 + NestJS 10, no monorepo tooling.

## Structure

```
client/   React 19, Vite 8, Ant Design 6, Zustand, TypeScript 6 (ESM)
server/   NestJS 10, TypeORM, better-sqlite3, Passport JWT, TypeScript 5 (CJS)
server.js Production static file server + API proxy (port 8000 → 3001)
```

No root `package.json`. Each package has independent `node_modules`.

## Dev commands

```bash
# Start both (frontend :3000, backend :3001)
bash start.sh

# Or individually:
cd client && npm run dev        # Vite dev server on :3000, proxies /api → :3001
cd server && npm run start:dev  # NestJS with --watch
```

## Build

```bash
cd client && npm run build   # tsc -b && vite build → client/dist/
cd server && npm run build   # nest build → server/dist/
```

## Lint

```bash
cd client && npm run lint    # ESLint (TS + React hooks)
# Server has no lint script
```

No test suite exists anywhere in the repo.

## Architecture notes

- **API proxy**: Both Vite dev (`vite.config.ts` proxy) and production (`server.js`) forward `/api/*` to `localhost:3001`.
- **Database**: SQLite via better-sqlite3 at `server/data/esports.db`. TypeORM `synchronize: true` — schema auto-migrates from entities on startup. Foreign keys are explicitly disabled via pragma.
- **Auth**: JWT (30-day expiry) via Passport. Default secret: `esports-platform-secret-key-change-in-production`. Override with `JWT_SECRET` env var.
- **Uploads**: Served from `server/uploads/` at `/uploads` prefix.
- **Roles**: `user.role` — 0 = user, 1 = admin. Guard: `jwt-auth.guard.ts`.
- **No seed data or migrations** — entities define the schema, synchronize applies it.

## Server modules

Each module follows `*.entity.ts`, `*.service.ts`, `*.controller.ts`, `*.module.ts`:
user, tournament, registration, bracket, match, team, notification, ranking, announcement, honor-roll

`bracket-engine.service.ts` handles single/double elimination and round-robin bracket generation (complex, ~400 lines).

## Client architecture

- **State**: Zustand store at `store/auth.ts` — token + user in localStorage.
- **API layer**: `api/client.ts` — Axios with `/api` baseURL, auto-attaches Bearer token, redirects to `/login` on 401.
- **Routing**: React Router 7, protected routes via `ProtectedRoute` component checking auth store.
- **Locale**: Ant Design configured for `zh_CN`.

## Production deploy

```bash
# On Aliyun server (requires root):
sudo bash deploy-aliyun.sh
```

Installs Node 22, PM2, builds both packages, configures Nginx reverse proxy. PM2 config at `ecosystem.config.json` (paths reference `/opt/esports-platform` on server, `/workspace/esports-platform` in checked-in config).

## Gotchas

- `ecosystem.config.json` in the repo has hardcoded paths (`/workspace/esports-platform`) for a different environment. The deploy script overwrites it with `/opt/esports-platform` paths.
- `server/tsconfig.json` has `strictNullChecks: false` and `noImplicitAny: false` — TypeScript won't catch null errors.
- Client `tsconfig.app.json` has `noUnusedLocals: true` and `noUnusedParameters: true` — unused variables will fail `tsc -b` (which runs as part of `npm run build`).
- `verbatimModuleSyntax: true` in client — must use `import type` for type-only imports.
- No `.env` file in the repo. Server reads `JWT_SECRET`, `PORT`, `DB_TYPE` from environment.
- The `start.sh` script runs `ts-node` for the server (dev mode), not the compiled `dist/`.
