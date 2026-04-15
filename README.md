# TripBuddy

> Your trip, always one step ahead. 你的旅程，永遠快人一步。

Personal trip planning platform with LINE Bot companion.

## Features (Implemented)

- Drag-and-drop daily itinerary builder
- Uncertainty management (day-level backup plans + spot-level alternatives)
- Cascade time adjustment with auto-recalculation
- 4-level conflict detection and resolution wizard
- Projected coordinate map with route visualization + Google Directions API
- File import (.md / .docx / .pdf)
- i18n (繁體中文 + English)
- Google OAuth + Supabase Auth (cloud persistence)
- **LINE Notify** — daily itinerary push at 07:00 (L-1)
- **LINE Bot** — two-way conversation: itinerary query, crowd check, navigation (LB)

## Tech Stack

React 18 + TypeScript + Vite + TailwindCSS + @dnd-kit + Supabase (Auth + DB + Edge Functions)

## Getting Started

```bash
npm install
npm run dev
```

Open http://localhost:5173

### Environment Variables

Copy `.env.example` to `.env` and fill in:

```
VITE_SUPABASE_URL=https://xxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJ...
VITE_LINE_BOT_ID=@your-bot-id   # LINE Bot basic ID (e.g. @765ffubm)
```

### LINE Bot Setup (Supabase Edge Function)

Set secrets in Supabase Dashboard → Edge Functions → Secrets:

```
LINE_CHANNEL_SECRET=...
LINE_CHANNEL_ACCESS_TOKEN=...
```

Deploy:
```bash
# Download supabase CLI binary (Windows)
curl -L --retry 5 -C - "https://github.com/supabase/cli/releases/download/v2.91.1/supabase_windows_amd64.tar.gz" -o supabase.tar.gz
tar -xzf supabase.tar.gz

SUPABASE_ACCESS_TOKEN=your-token ./supabase.exe functions deploy line-webhook --project-ref your-project-ref --no-verify-jwt
```

Required DB tables (run in Supabase SQL Editor):

```sql
create table user_line_bindings (
  user_id      uuid references auth.users primary key,
  line_user_id text not null unique,
  created_at   timestamptz default now()
);
alter table user_line_bindings enable row level security;
create policy "own binding"
  on user_line_bindings for all using (auth.uid() = user_id);

create table line_binding_codes (
  code       text primary key,
  user_id    uuid references auth.users not null,
  expires_at timestamptz not null
);
```

## LINE Bot Commands

| Message | Response |
|---------|----------|
| 接下來行程是? / next itinerary | Today's upcoming spots |
| 人潮如何 / busy / crowd | Google Maps link for next spot |
| 怎麼去 / navigate / directions | Google Maps directions to next spot |
| /link {code} | Bind LINE account to TripBuddy |

## Roadmap

| Phase | Scope | Status |
|-------|-------|--------|
| 1 | Trip editor, drag-sort, map, i18n, auth | ✅ Done |
| L-1 | LINE Notify daily push | ✅ Done |
| LB | LINE Bot two-way conversation | ✅ Done |
| 2 | File upload, AI parsing, Google Drive | Planned |
| 3 | AI recommend, route optimise | Planned |
| 4 | Crowd data, live cam, alerts | Planned |
| 5 | Photo capture, AI classification, expenses | Planned |
| 6 | Post-trip journal, PDF export, offline PWA | Planned |
| 7 | Quest engine, badges, sponsor dashboard | Planned |
| 8 | Native app (conditional, Q1 2027 eval) | Planned |

## License

MIT
