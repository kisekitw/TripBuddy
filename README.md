# TripBuddy

> Your trip, always one step ahead. 你的旅程，永遠快人一步。

Personal trip planning platform with LINE Bot companion.

## Features (Phase 1 MVP)

- Drag-and-drop daily itinerary builder
- Uncertainty management (day-level backup plans + spot-level alternatives)
- Cascade time adjustment with auto-recalculation
- 4-level conflict detection and alerting
- Projected coordinate map with route visualization
- File import (.md / .docx / .pdf)
- i18n (繁體中文 + English)
- Google OAuth login (mock)

## Tech Stack

React 18 + TypeScript + Vite + TailwindCSS + @dnd-kit

## Getting Started

```bash
npm install
npm run dev
```

Open http://localhost:5173

## Roadmap

| Phase | Scope | Status |
|-------|-------|--------|
| 1 | Trip editor, drag-sort, map, i18n, auth | Current |
| 2 | File upload, AI parsing, Google Drive | Planned |
| 3 | AI recommend, route optimise, conflict engine | Planned |
| 4 | LINE Bot, crowd data, live cam, alerts | Planned |
| 5 | Photo capture, AI classification, expenses | Planned |
| 6 | Post-trip journal, PDF export, offline PWA | Planned |
| 7 | Quest engine, badges, sponsor dashboard | Planned |
| 8 | Native app (conditional, Q1 2027 eval) | Planned |

## License

MIT
