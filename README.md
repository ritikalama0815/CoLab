# CoLab for **TruHacks 2026**

CoLab is a web app for **fairer group-project grading**. Instructors create projects and groups; students collaborate on GitHub repos, shared Google Docs, and in-app chat. The app tracks contributions (commits, self-reported doc work), and **instructors can generate contribution reports** with charts and **Gemini**-written overviews and suggested grades because we are all tired of people who contribute less but get same grades as us.


## Tech stack

| Layer | Stack |
|--------|--------|
| Framework | **Next.js** (App Router), **React**, **TypeScript** |
| Styling | **Tailwind CSS**, **Radix UI**, **Framer Motion** |
| Auth & data | **Supabase** (Auth, Postgres, Row Level Security, Storage) |
| AI | **Google Gemini** |
| Charts | **Recharts** |

## Prerequisites

- **Node.js** 18+ (20+ recommended)
- A **Supabase** project (URL + anon key; optional service role key for storage uploads)
- **Gemini API key** (for live reports and other AI features; optional if using dummy reports in dev)

## Quick start

### 1. Clone and install

```bash
git clone https://github.com/ritikalama0815/h26
cd h26
npm install
**May need gsasp, shadcn, lucide-react**
```

### 2. Environment variables

Copy the example file and fill in values:

```bash
cp .env.example .env
```

| Variable | Required | Description |
|----------|----------|-------------|
| `NEXT_PUBLIC_SUPABASE_URL` | Yes | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Yes | Supabase anon (public) key |
| `SUPABASE_SERVICE_ROLE_KEY` | Recommended | Server-only; auto-creates the `submission-files` storage bucket and enables upload fallbacks. **Never expose to the client.** |
| `GEMINI_API_KEY` | For live AI reports | Google AI Studio / Gemini API key |
| `USE_DUMMY_REPORT` | Optional | `false` to force real Gemini + data in dev. In production, dummy reports are off unless set to `true`. |
| `NEXT_PUBLIC_SITE_URL` | Optional | Site URL for emails/links (default `http://localhost:3000`) |
| `RESEND_API_KEY` / `EMAIL_FROM` | Optional | Instructor notifications via Resend |

### 3. Database schema (Supabase)

1. Open the **Supabase SQL Editor** for your project.
2. Run **`scripts/RUN_THIS.sql`** to create tables, RLS policies, and core indexes.

### 4. Optional: docs activity + storage

For **Google Docs/Slides logging** and **submission file uploads** (bucket + policies):

- Run **`scripts/add_docs_activity_and_storage.sql`** in the SQL Editor.

If you skip this, doc logging and uploads may fail until the bucket and `docs_activity` table exist. Adding **`SUPABASE_SERVICE_ROLE_KEY`** lets the app create the **`submission-files`** bucket on first upload when possible.

### 5. Run locally

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### Production build

```bash
npm run build
npm start
```

## Roles and main flows

- **Instructor**: Able to create projects and groups; view submissions, answer questions, and **Generate report** (contribution breakdown, charts, Gemini overview + suggested grades).
- **Student**: Groups, workspace (resources, **submit work** with link and/or **file upload**, **log Docs/Slides** activity), teammates, chat with AI and team mates, and ask questions to prodessor.

## Reports

- **Development**: At the moment, the API may return a **demo** report so the UI can be previewed without syncing GitHub or calling Gemini. Set `USE_DUMMY_REPORT=false` in `.env` to use real data and Gemini locally.
- **Production**: Live reports are the default unless `USE_DUMMY_REPORT=true`.

GitHub sync runs **server-side** (`/api/github/sync`) against the configured repo URL. **Google Docs** metrics in reports use **self-reported** entries from students unless you integrate a Google API separately.

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start dev server |
| `npm run build` | Production build |
| `npm run start` | Start production server |
| `npm run lint` | Run ESLint |

## Project layout (high level)

```
app/                 # Next.js App Router (pages, layouts, API routes)
components/          # UI (dashboard, student, instructor, landing, etc.)
lib/                   # Supabase clients, Gemini helpers, report helpers
scripts/               # SQL migrations (RUN_THIS.sql, add_docs_activity_and_storage.sql)
```

