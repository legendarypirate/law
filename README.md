# Law Firm Portal

Internal system for case management, client management, user management, and role management. Built with Next.js (App Router), PostgreSQL, and Prisma.

## Setup

### 1. Database

Create a PostgreSQL database named `law`:

```bash
createdb law
```

Or in `psql`:

```sql
CREATE DATABASE law;
```

### 2. Environment

Copy `.env` and set your PostgreSQL URL (user/password/host as needed):

```
DATABASE_URL="postgresql://USER:PASSWORD@localhost:5432/law?schema=public"
```

### 3. Migrate and seed

```bash
npm run db:migrate   # creates tables
npm run db:seed      # seeds roles + admin user (admin@law.local / admin123)
```

### 4. Run the app

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Scripts

- `npm run dev` — Start dev server
- `npm run build` — Generate Prisma client and build Next.js
- `npm run start` — Start production server
- `npm run db:generate` — Generate Prisma client
- `npm run db:migrate` — Run migrations (interactive)
- `npm run db:seed` — Seed roles and default admin user
- `npm run db:studio` — Open Prisma Studio

## Features

- **Dashboard** — Quick links to Cases, Clients, Users, Roles
- **Cases** — Create/edit/delete matters; link to client and assign to user; filter by status (Open, In progress, Pending, Closed)
- **Clients** — CRUD with name, email, phone, company, address, notes; search
- **Users** — CRUD with email, name, password, role, active flag
- **Roles** — CRUD with name and description (create roles before users)

## Tech stack

- Next.js 16 (App Router), React 19, TypeScript
- Tailwind CSS 4
- Prisma 7 + PostgreSQL
- bcryptjs for password hashing
