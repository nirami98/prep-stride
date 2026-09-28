# PrepStride

PrepStride is an AI-assisted interview preparation platform for practicing mock interviews, reviewing answers, and tracking progress over time.

The current repository contains the first working prototype. Users can authenticate, configure an interview, answer questions by text or voice, receive AI-generated feedback, review previous sessions, and compare results.

## Current features

- Clerk-based authentication
- Configurable job role, difficulty, and question count
- Text and microphone-based answers
- OpenAI-powered audio transcription
- AI-generated score, summary, strengths, weaknesses, and suggestions
- Interview history and performance dashboard
- Side-by-side session comparison
- Responsive React interface

## Product direction

PrepStride is being developed into a personalized interview coach. Planned work includes:

- Resume and job-description uploads
- Dynamic questions based on the role, company, resume, and job description
- Evidence-based scoring with question-specific rubrics
- Company interview-round research with cited web sources
- Custom interview and study plans
- Per-answer feedback and improved example answers
- Real-time conversational voice interviews
- More detailed competency and progress analytics

## Architecture

PrepStride is a pnpm workspace containing the following packages:

```text
artifacts/
  api-server/                 Express REST API
  interview-simulator/        React and Vite web application
  mockup-sandbox/             UI development sandbox

lib/
  api-spec/                   OpenAPI specification and Orval configuration
  api-client-react/           Generated React Query API client
  api-zod/                    Generated backend validation schemas
  db/                         PostgreSQL and Drizzle ORM schemas
  integrations-openai-ai-*    OpenAI client and audio integrations

scripts/                      Workspace utility scripts
```

## Technology stack

- Node.js 24 and TypeScript
- pnpm workspaces
- React 19 and Vite
- Tailwind CSS and shadcn/ui
- TanStack Query
- Express 5
- PostgreSQL and Drizzle ORM
- Clerk authentication
- OpenAI API
- OpenAPI, Orval, and Zod

## Prerequisites

Before running the project, install or provision:

- Node.js 24
- Corepack and pnpm
- PostgreSQL
- A Clerk application
- An OpenAI API key or compatible OpenAI proxy

Enable pnpm and install the dependencies:

```bash
corepack enable
pnpm install
```

## Environment variables

The API requires:

```bash
DATABASE_URL=postgresql://USER:PASSWORD@localhost:5432/prepstride
CLERK_PUBLISHABLE_KEY=pk_test_...
CLERK_SECRET_KEY=sk_test_...
AI_INTEGRATIONS_OPENAI_BASE_URL=https://api.openai.com/v1
AI_INTEGRATIONS_OPENAI_API_KEY=sk-...
```

The web application requires:

```bash
VITE_CLERK_PUBLISHABLE_KEY=pk_test_...
```

Never commit real credentials or local environment files.

## Database setup

Push the current Drizzle schema to a development database:

```bash
pnpm --filter @workspace/db run push
```

The prototype expects interview questions in the `questions` table. A repeatable seed command is part of the upcoming local-development work and is not yet included in this initial snapshot.

## Development

Start the API server:

```bash
PORT=8080 pnpm --filter @workspace/api-server run dev
```

Start the web application in another terminal:

```bash
PORT=25978 BASE_PATH=/ pnpm --filter @workspace/interview-simulator run dev
```

The API health check is available at:

```text
http://localhost:8080/api/healthz
```

### Current local-development note

The initial prototype was configured for Replit, which routes `/api` requests to the API service automatically. A standalone local environment currently needs an equivalent reverse proxy from the Vite server to `http://localhost:8080`. Adding that proxy and a unified root development command is part of the first stabilization milestone.

## Useful commands

```bash
# Type-check the complete workspace
pnpm run typecheck

# Build all packages and applications
pnpm run build

# Regenerate API clients and backend schemas
pnpm --filter @workspace/api-spec run codegen

# Push schema changes to the development database
pnpm --filter @workspace/db run push
```

## Current prototype limitations

- Questions currently come from a database-backed question bank rather than being generated for each role.
- The repository does not yet contain repeatable migrations or question seed data.
- Voice answers are uploaded after recording; voice interaction is not yet streamed in real time.
- Scoring is generated once at the end of a session and needs stronger rubric validation.
- Automated tests, production rate limiting, and background AI jobs are not yet implemented.
- The standalone local proxy and one-command development workflow still need to be added.

These limitations describe the initial baseline and are the focus of the next development phase.

## Repository

GitHub: [nirami98/prep-stride](https://github.com/nirami98/prep-stride)

