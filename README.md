This is a Next.js 16 application configured for Drizzle ORM and SQLite-compatible libSQL.

## Local development

```bash
pnpm install
cp .env.example .env
pnpm db:sync
pnpm dev
```

Open http://localhost:3000.

By default the app uses `world-current-demo.db` in the operating system's temporary directory. If an old non-SQLite `DATABASE_URL` is present locally, it is ignored and the demo SQLite file is used.

## Vercel Demo Deployment

For the current demo setup, the app can use file SQLite on Vercel with code defaults. You can deploy without database env vars. Override these only when needed:

```bash
SQLITE_DATABASE_URL=file:/tmp/world-current-demo.db
AUTH_SECRET=your-production-secret
AUTH_URL=https://your-domain.com
NEXT_PUBLIC_SITE_URL=https://your-domain.com
SEED_ADMIN_EMAIL=admin@example.com
SEED_ADMIN_PASSWORD=change-me-locally
COMMENT_AUTO_APPROVE=true
```

`pnpm build` runs `pnpm db:sync` first. The runtime also checks the file DB on cold start and applies migrations plus demo seed data if the file is missing or empty.

This is intentionally demo-only. Vercel function storage is ephemeral, so data can reset between deployments, cold starts, regions, or function instances. User-created content should not be treated as durable in this mode.

For durable SQLite-compatible deployment later, switch to libSQL/Turso:

```bash
TURSO_DATABASE_URL=libsql://your-database.turso.io
TURSO_AUTH_TOKEN=your-token
```

## Bunny media storage

Newsroom uploads require Bunny Storage. The application does not silently fall back to local disk, so an incorrectly configured deployment cannot create media that disappears after a restart.

Create a Bunny Storage Zone, connect it to a Pull Zone, then configure:

```bash
BUNNY_STORAGE_ZONE=your-storage-zone-name
BUNNY_STORAGE_ACCESS_KEY=your-storage-zone-password
BUNNY_STORAGE_HOSTNAME=storage.bunnycdn.com
BUNNY_PULL_ZONE_URL=https://your-pull-zone.b-cdn.net
BUNNY_UPLOAD_MAX_BYTES=15728640
```

Use the regional API hostname shown on the Storage Zone Access page, such as `uk.storage.bunnycdn.com` or `ny.storage.bunnycdn.com`. `BUNNY_STORAGE_ACCESS_KEY` is the Storage Zone password, not the global Bunny account API key. Keep it server-side and never expose it with a `NEXT_PUBLIC_` prefix.

The article editor searches media through a cursor-paginated authenticated API. Editors can also upload from the picker; the server verifies the file, uploads it to Bunny with a SHA-256 checksum, creates the central media record, and inserts it into the article. Public delivery uses the Pull Zone CDN URL.

## Database

```bash
pnpm db:generate
pnpm db:migrate
pnpm db:sync
pnpm db:push
pnpm db:studio
pnpm db:seed
```

Use `pnpm db:sync` for demo deployments. It runs migrations and seed data. `db:push` is only for local schema iteration.

## Backups and recovery

For local demo SQLite, back up `/tmp/world-current-demo.db`. For Vercel/libSQL, use the provider backup/export workflow and test restores regularly.

Bunny.net media is not stored permanently in the app container. Back up Bunny Storage separately using Bunny’s storage APIs or a scheduled sync to another durable object store.
