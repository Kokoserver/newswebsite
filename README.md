This is a Next.js 16 application configured for Drizzle ORM, PostgreSQL, and Docker.

## Local development

```bash
pnpm install
cp .env.example .env
pnpm dev
```

Open http://localhost:3000.

## Docker

The complete local production-like platform runs with:

```bash
docker compose up --build
```

For source-mounted Docker development with hot reload:

```bash
docker compose -f docker-compose.development.yml up
```

For production:

```bash
docker compose -f docker-compose.production.yml up -d --build
```

Startup order is: wait for PostgreSQL, run generated Drizzle SQL migrations when `RUN_DATABASE_MIGRATIONS=true`, optionally seed only when `RUN_DATABASE_SEED=true`, then start `.next/standalone/server.js`.

## Database

```bash
pnpm db:generate
pnpm db:migrate
pnpm db:push
pnpm db:studio
pnpm db:seed
```

Use `pnpm db:migrate` for production deployments. `db:push` is only for local schema iteration.

## Backups and recovery

Docker volumes are persistent storage, not backups. Keep database backups outside the Docker host and test restores regularly.

Logical backup:

```bash
docker compose exec db pg_dump -U herald -d herald -Fc -f /tmp/herald.dump
docker compose cp db:/tmp/herald.dump ./backups/herald.dump
```

Restore:

```bash
docker compose cp ./backups/herald.dump db:/tmp/herald.dump
docker compose exec db pg_restore -U herald -d herald --clean --if-exists /tmp/herald.dump
```

Named-volume backup:

```bash
docker run --rm -v newwebsite_postgres_data:/volume -v "$PWD/backups:/backup" alpine tar czf /backup/postgres_data.tgz -C /volume .
```

Migration rollback strategy: prefer forward-only corrective migrations. If rollback is unavoidable, restore a tested backup to a new database, deploy the previous application image against it, and only then switch traffic.

Bunny.net media is not stored permanently in the app container. Back up Bunny Storage separately using Bunny’s storage APIs or a scheduled sync to another durable object store.
