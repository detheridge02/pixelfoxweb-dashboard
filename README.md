# 🦊 PixelFoxWeb Lead Generation Dashboard

A Next.js app with Google OAuth authentication, Monday.com CRM integration, and AI-powered lead generation using Claude Haiku.

## Features

- 🔐 **Google OAuth** — sign in with hello@pixelfoxweb.com
- 📊 **Pipeline Dashboard** — live stats from your Monday.com CRM
- 🤖 **One-Click Lead Gen** — finds 5 new local businesses, researches contact details, drafts personalised outreach, saves everything to CRM
- 📧 **Draft Management** — all outreach stored as CRM updates, never sent without your approval

---

## Setup

### 1. Clone and install

```bash
cd pixelfoxweb-dashboard
npm install
```

### 2. Environment variables

```bash
cp .env.example .env.local
```

Fill in `.env.local`:

| Variable | Where to get it |
|---|---|
| `NEXTAUTH_SECRET` | Run: `openssl rand -base64 32` |
| `GOOGLE_CLIENT_ID` | [Google Cloud Console](https://console.cloud.google.com/apis/credentials) |
| `GOOGLE_CLIENT_SECRET` | Same as above |
| `MONDAY_API_TOKEN` | [Monday.com Apps](https://pixelfoxweb.monday.com/apps/manage/tokens) |
| `ANTHROPIC_API_KEY` | [Anthropic Console](https://console.anthropic.com/) |

### 3. Google OAuth setup

1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Create a new project (or use existing)
3. Enable **Google Calendar API**
4. Create OAuth 2.0 credentials (Web application)
5. Add authorised redirect URIs:
   - `http://localhost:3000/api/auth/callback/google` (dev)
   - `https://yourdomain.com/api/auth/callback/google` (prod)

### 4. Run locally

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

---

## Deployment (Vercel — recommended)

```bash
npm install -g vercel
vercel
```

Add all environment variables in the Vercel dashboard, updating `NEXTAUTH_URL` to your production URL.

---

## Project Structure

```
├── app/
│   ├── api/
│   │   ├── auth/[...nextauth]/  # Google OAuth handler
│   │   ├── leads/               # GET leads from Monday.com
│   │   └── run-leadgen/         # POST trigger lead gen workflow
│   ├── auth/signin/             # Sign in page
│   ├── dashboard/               # Main dashboard
│   └── layout.tsx
├── lib/
│   ├── monday.ts                # Monday.com API client
│   └── leadgen.ts               # Claude Haiku lead gen runner
└── types/
    └── next-auth.d.ts           # Session type extensions
```

---

## How it works

1. **Sign in** with Google (hello@pixelfoxweb.com)
2. Dashboard loads your live CRM pipeline from Monday.com
3. Click **Run Lead Gen** →
   - Fetches existing leads (dedup check)
   - Calls Claude Haiku with the lead gen prompt
   - Haiku researches 5 new local businesses
   - Creates each lead in Monday.com CRM
   - Posts personalised draft outreach as a CRM update
   - Dashboard refreshes with new leads
4. Review drafts in Monday.com, send when ready

---

## Monday.com Board IDs

- **Leads Board:** `5094493706`
- **Prompt Doc:** `5094495336`
