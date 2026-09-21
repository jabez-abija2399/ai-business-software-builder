# AI Business Software Builder

An AI-powered platform that transforms business requirements into production-ready software through an intelligent pipeline of blueprinting, design, building, quality checks, and deployment.

## Features

- **Authentication**: Email/password, Google OAuth, GitHub OAuth
- **Project Management**: Create, view, update, and archive projects
- **Business Blueprint**: AI-generated business analysis from natural language descriptions
- **Design Generation**: UI/UX, architecture, and database design artifacts
- **Build Pipeline**: Automated code generation and scaffolding
- **Quality Checks**: Test execution, security scans, accessibility, and performance analysis
- **Preview & Deployment**: Preview builds and production deployments

## Tech Stack

- **Framework**: Next.js 15 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS v3
- **UI Components**: Radix UI primitives
- **Authentication**: NextAuth v5
- **ORM**: Prisma 6 (PostgreSQL / Supabase)
- **Validation**: Zod

## Getting Started

### Prerequisites

- Node.js 18+
- PostgreSQL database
- npm

### Installation

```bash
npm install
```

### Environment Variables

Create a `.env` file in the root directory:

```env
# Supabase transaction pooler URI (recommended for Prisma)
DATABASE_URL="postgresql://postgres.<project-ref>:<db-password>@aws-1-eu-west-1.pooler.supabase.com:6543/postgres?pgbouncer=true"
NEXTAUTH_SECRET="your-secret-key"
NEXTAUTH_URL="https://your-app.vercel.app"
GOOGLE_CLIENT_ID=""
GOOGLE_CLIENT_SECRET=""
GITHUB_ID=""
GITHUB_SECRET=""
```

`DATABASE_URL` is managed centrally in `prisma.config.ts`. Copy the exact URI from Supabase → Project → **Connect** → **Transaction pooler** → **URI**.

### Database Setup

```bash
npm run db:generate
npm run db:deploy   # applies prisma/migrations (baseline + schema)
npm run db:seed
```

Use `npm run db:deploy` (a wrapper for `prisma migrate deploy`) on every environment — it applies committed migrations in order. `db:push` is only for throwaway/draft schema changes.

### Development

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## Available Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start development server |
| `npm run build` | Build for production |
| `npm run start` | Start production server |
| `npm run lint` | Run ESLint |
| `npm run typecheck` | Run TypeScript type checking |
| `npm run db:generate` | Generate Prisma client |
| `npm run db:push` | Push schema changes to database (draft) |
| `npm run db:deploy` | Apply committed migrations (`prisma migrate deploy`) |
| `npm run db:migrate` | Create & apply migrations in dev |
| `npm run db:seed` | Seed the database |
| `npm run db:studio` | Open Prisma Studio |
| `npm run test` | Run tests |
| `npm run test:ui` | Run tests with UI |
| `npm run test:coverage` | Run tests with coverage |

## Project Structure

See [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) for the full technical architecture, approved package stack, authentication/authorization model, and phased roadmap.

```
src/
├── app/                    # Next.js App Router pages
│   ├── (auth)/            # Authentication pages
│   ├── (dashboard)/       # Dashboard pages
│   └── api/               # API routes
├── components/            # Reusable UI components
├── lib/                   # Utility functions and configurations
├── server/                # Server-side logic
│   └── db/                # Database operations
├── types/                 # TypeScript type definitions
├── validations/           # Zod validation schemas
└── auth.ts                # NextAuth configuration
```

## License

MIT
