# RSB Management

A production-grade internal operations web app for a company team of 20–100 people.

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 15 (App Router) + TypeScript |
| Styling | Tailwind CSS + shadcn/ui |
| API | tRPC v11 (type-safe) |
| Validation | Zod (every endpoint) |
| Database | Prisma ORM + PostgreSQL |
| Caching / Queues | Redis + BullMQ |
| Auth | NextAuth.js v4 (Credentials + RBAC) |
| Background Jobs | BullMQ (imports, exports, reports) |
| File Import | ExcelJS + Papa Parse (xlsx/csv) |
| Logging | Pino + pino-pretty |
| Error Tracking | Sentry |
| Local Dev | Docker Compose (PostgreSQL 16 + Redis 7) |
| Deployment | Railway |

## Project Structure

```
rsb-management/
├── prisma/
│   ├── schema.prisma          # DB schema: users, roles, permissions, audit_log, imports, jobs
│   └── migrations/            # Prisma migration files
├── src/
│   ├── app/                   # Next.js App Router
│   │   ├── (auth)/login/      # Login page
│   │   ├── (dashboard)/       # Protected dashboard pages
│   │   ├── api/auth/          # NextAuth.js routes
│   │   └── api/trpc/          # tRPC handler
│   ├── components/
│   │   ├── ui/                # shadcn/ui components
│   │   └── shared/            # Business components
│   ├── lib/
│   │   ├── auth.ts            # NextAuth config + RBAC
│   │   ├── db.ts              # Prisma client singleton
│   │   ├── logger.ts          # Pino structured logger
│   │   ├── redis.ts           # IORedis client singleton
│   │   ├── trpc/              # tRPC init, context, router, client
│   │   └── validations/       # Shared Zod schemas
│   ├── server/
│   │   ├── routers/           # tRPC routers (user, audit, import)
│   │   └── jobs/              # BullMQ queues + workers
│   ├── services/              # Business logic layer
│   │   ├── user.service.ts
│   │   ├── audit.service.ts
│   │   └── import.service.ts
│   └── types/
│       └── next-auth.d.ts     # NextAuth type extensions
├── .env.example               # Environment variable template
├── docker-compose.yml         # Local dev: PostgreSQL + Redis
├── Dockerfile                 # Production container
└── next.config.mjs            # Next.js config
```

## Backend Rules (Enforced)

1. **Zod validation** on every tRPC procedure before any logic runs
2. **Prisma transactions** for any operation touching multiple tables
3. **No raw DB errors** exposed to clients — mapped to typed TRPCError responses
4. **validate → preview → confirm** flow for all spreadsheet/CSV imports
5. **BullMQ jobs** for heavy operations (bulk imports, report generation, exports)
6. **Service layer** (`/src/services`) contains all business logic — tRPC calls services, never DB directly
7. **Soft deletes** (`deletedAt` timestamp) on all core tables
8. **Standard audit fields** (`createdAt`, `updatedAt`, `createdById`) on every table

## Database Schema

### Core Tables
- **User** — accounts with roles (ADMIN / MANAGER / MEMBER), soft delete, lastLoginAt
- **Account / Session / VerificationToken** — NextAuth.js adapter tables
- **Permission** — fine-grained `resource:action` permissions (e.g. `users:read`)
- **RolePermission** — maps Role enum to Permission records
- **AuditLog** — immutable record of every data-changing action (who, what, when, before/after)
- **Import** — tracks spreadsheet import jobs through validate→preview→confirm states
- **BackgroundJob** — mirrors BullMQ job state in the database

## Getting Started

### Prerequisites

- Node.js 20+
- Docker + Docker Compose

### 1. Clone and install

```bash
git clone https://github.com/sakhiiledev/rsb-management.git
cd rsb-management
npm install
```

### 2. Configure environment

```bash
cp .env.example .env
# Edit .env with your values
```

### 3. Start local services

```bash
docker compose up -d
```

### 4. Run database migration

```bash
npx prisma migrate dev --name init
```

### 5. Start the dev server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start development server |
| `npm run build` | Build for production |
| `npm run start` | Start production server |
| `npm run lint` | Lint with ESLint |
| `npx prisma studio` | Open Prisma Studio (DB GUI) |
| `npx prisma migrate dev` | Run pending migrations |
| `npx prisma generate` | Regenerate Prisma client |
| `docker compose up -d` | Start PostgreSQL + Redis |
| `docker compose down` | Stop local services |

## Roles & Access Control

| Role | Capabilities |
|------|-------------|
| `ADMIN` | Full access: manage users, view audit logs, all CRUD |
| `MANAGER` | View users, manage imports, view team activity |
| `MEMBER` | View own profile, limited access |

## Security Notes

- Passwords are hashed with bcrypt (cost factor 12)
- JWT sessions (no DB round-trip per request)
- All tRPC procedures validate input with Zod before any logic
- Soft deletes prevent accidental data loss
- Audit log is append-only — every mutation is recorded
