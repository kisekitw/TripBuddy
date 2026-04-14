# TripBuddy

*Your trip, always one step ahead.*

**Product Requirements · SWOT Analysis · Marketing Plan**

April 2026

---

## Table of contents

- [1. Functional requirements](#1-functional-requirements)
- [2. Non-functional requirements](#2-non-functional-requirements)
- [3. Development phases](#3-development-phases)
- [SWOT analysis — 10 iterations](#swot-analysis--10-iterations)
- [Marketing plan](#marketing-plan--tripbuddy)

---

# TripBuddy — Requirements specification

Product: TripBuddy — Personal trip planning platform with LINE Bot companion

Version: 1.4 | Date: April 2026

---

## 1. Functional requirements

### 1.1 Trip editor (web)

The core web interface provides a drag-and-drop daily itinerary builder. Users can create trips, add days, and populate each day with spots. Spots support reordering via drag-and-drop, and the timeline auto-recalculates when order or duration changes.

### 1.2 Uncertainty management

**Type A — Day-level uncertainty:** An entire day can be marked as uncertain (e.g. geopolitical risk, weather). Users attach backup variants (Plan A / Plan B) and toggle between them. A lock mechanism finalises the choice.

**Type B — Spot-level alternatives:** Within a single time slot, multiple candidate spots are grouped. Users switch between alternatives; the selected spot appears on the map and feeds into time calculations.

### 1.3 Cascade time adjustment

When a spot's duration or transit time changes, all downstream spots recalculate automatically. Two modes are offered:

- **Auto-adjust:** times shift proportionally; downstream spots show delta badges (e.g. "+30 min").
- **Lock-times:** times stay fixed; system flags gaps or overlaps and prompts user to resolve.

Transit times are fetched from Google Directions API and cached per spot-pair. Each SpotOption stores `transit_to_next` and `transit_from_prev` so switching alternatives triggers an immediate recalculation.

### 1.4 Conflict detection and alerting

Four severity levels:

| Level | Name | Trigger | Visual | Resolution options |
|-------|------|---------|--------|-------------------|
| 0 | No conflict | Everything fits | Normal display | — |
| 1 | Soft warning | Near closing time, day running long, arriving before "best after" | Yellow border + badge | Acknowledge |
| 2 | Hard conflict | Spot closed before arrival, time overlap | Red border + alert panel | AI auto-adjust, shorten duration, move to another day, keep anyway |
| 3 | Cascade collapse | Multiple spots broken by one change | Red panel + full resolution wizard | AI reorder entire day, revert change |

Each SpotOption carries constraints:

```
constraints: {
  hard: [
    { type: "closing_time", value: 1020 },
    { type: "last_entry", value: 960 }
  ],
  soft: [
    { type: "best_before", value: 990, reason: "crowds after 16:30" },
    { type: "best_after", value: 1020, reason: "evening atmosphere" }
  ]
}
```

### 1.5 Map integration

Interactive map (Leaflet or Google Maps JS SDK) shows:

- Spots as colour-coded markers per day.
- Polyline routes between spots with transit time labels.
- Semi-transparent markers for unselected alternatives (Type B).
- Full marker/route swap animation when switching Day Variants (Type A).

Map updates in real time as the itinerary changes.

### 1.6 File upload and parsing

Users upload existing itineraries in .md, .docx, or .pdf format, or link a Google Drive document. The backend extracts text, sends it to Claude API for structured parsing into the Day/Spot JSON schema, and returns it to the editor for review.

### 1.7 AI-powered features

- **Spot recommendation** based on destination, travel style, and remaining time.
- **One-click route optimisation** to minimise transit (constraint-aware scheduling).
- **Conversational editing** via natural language (e.g. "swap lunch to a seafood restaurant").
- **Tiered model routing:** Claude Haiku for quick tasks (spot lookup, simple reorder), Claude Sonnet for complex planning. Pre-computed and cached recommendations per destination. Streaming responses for long operations.

### 1.8 LINE Bot companion

A LINE Official Account bot that acts as a real-time travel assistant during the trip:

- **Morning push:** daily itinerary Flex Message card sent at 07:00 local time with weather forecast, spot list, and "Edit in web" button.
- **Context-aware replies:** user asks "what's next" and bot responds with the upcoming spot, transit info, crowd level, and navigation options. Intent router parses: next spot, nearby POI, crowd check, navigation.
- **Proactive crowd alerts:** background poller checks crowd data (BestTime API primary, Google Popular Times secondary) every 15 min; if crowd > 80%, bot suggests reordering via Flex Message with Accept / Keep buttons.
- **Live camera:** bot links to nearby webcams (Windy Webcams API) so users can visually assess crowding before heading out.
- **Navigation:** one-tap Google Maps directions from current location, with walking/transit/driving comparison.
- **Flex Message cards** with quick-reply actions (Navigate, Live cam, Skip, Accept swap).
- **LINE group chat support:** co-travellers in the same LINE group receive the same daily push and can vote on spot alternatives.

### 1.9 Photo capture and management (NEW)

The LINE Bot doubles as a trip media manager. Users send photos during the trip; the system classifies, extracts information, and organises them automatically.

#### 1.9.1 AI image classification

Photos sent to the LINE Bot are processed by Claude Vision API and classified into five categories:

| Category | Detection logic | Extracted data |
|----------|----------------|----------------|
| Receipt | OCR on printed/handwritten amounts, store logos, tax lines | amount, currency, merchant name, item list, payment method |
| Locker | Numeric codes, QR codes, barcodes, key-tag patterns | locker number, PIN/code, location (GPS or inferred from itinerary) |
| Scenery | Landscape, architecture, street scenes | description, linked spot (by time + GPS), auto-generated caption |
| Food | Plated dishes, drinks, menus | dish name (best guess), restaurant (from itinerary or OCR), meal period |
| Document | Tickets, boarding passes, reservation confirmations, maps | document type, booking reference, date/time, extracted key fields |

#### 1.9.2 LINE Bot interaction flow

1. User sends a photo (with optional text caption).
2. Bot replies within 2 seconds with a classification confirmation card:
   - Detected type + extracted data summary.
   - "Linked to: Day X — [spot name]" (auto-matched by timestamp and GPS).
   - Quick-reply buttons: Correct / Change type / Delete.
3. For **receipts**, bot adds to the trip expense tracker and confirms the amount.
4. For **lockers**, bot stores the code and schedules a proactive reminder before the user leaves the city/station (based on itinerary end time for that location).
5. For **scenery/food**, bot tags the photo to the corresponding spot on the timeline.

#### 1.9.3 Web gallery and organisation

Photos sync to the web interface and are browsable in three modes:

- **Gallery mode:** grid layout grouped by day, colour-coded type badges (receipt = amber, locker = blue, scenery = green, food = coral, document = gray). Click to enlarge, edit tags, change category.
- **Expenses mode:** filtered view showing only receipts. Each row shows thumbnail, merchant, amount, category, and linked spot. Bottom summary: daily total, trip total, breakdown by category (food, transport, shopping, etc.). Exportable as CSV.
- **Timeline mode:** all media laid out on the itinerary timeline, each photo aligned to its spot slot. This becomes the raw material for the post-trip journal.

#### 1.9.4 Locker reminder system

- On capture: store locker code, PIN, location, and estimated retrieval time (inferred from itinerary).
- 60 minutes before estimated departure from the area: push a LINE reminder with the locker code, PIN, and a one-tap navigation button to the locker location.
- If user confirms retrieval, mark as "collected". If not confirmed by departure time, escalate with a second reminder.
- All active locker codes visible in a dedicated "Locker codes" panel on both LINE (quick reply) and web.

#### 1.9.5 Post-trip journal generation

After the trip ends, AI auto-generates a travel journal:

- Selects the best photos per spot (scenery + food prioritised, receipts excluded unless user opts in).
- Writes a short narrative per day based on itinerary, photos, and user captions.
- Includes an expense summary with charts (spending by day, by category).
- Outputs as a shareable web page or exportable PDF.
- User can edit, add text, reorder photos before publishing.

#### 1.9.6 Privacy and storage

- Photos stored in S3/MinIO with per-user encryption keys.
- Receipt OCR data (amounts, merchant names) stored in PostgreSQL; original receipt images deletable independently.
- Locker codes auto-deleted 48 hours after the trip ends (user can extend).
- Users can bulk-delete all media for a trip via a single "Delete trip data" action.
- EXIF GPS data stripped from photos before any sharing/publishing.

### 1.10 Gamification and quest system (NEW)

A location-aware quest engine that auto-generates challenges based on the user's itinerary, adds entertainment value to the trip, and opens a B2B revenue channel through sponsored quests from local businesses.

#### 1.10.1 Quest generation

Quests are generated automatically by AI when a trip is created or updated. The system analyses the spots in each day and produces contextually relevant challenges. Three sources of quests:

| Source | Description | Example |
|--------|-------------|---------|
| System-generated | AI creates quests from itinerary spots, time-of-day, and travel style | "Walk all torii gates at Fushimi Inari and photo at the summit viewpoint" |
| Sponsor-created | Local businesses design branded quests with rewards | "Try 3 stalls at Nishiki Market (Sponsored by Nishiki Market Assoc.) — unlock free matcha" |
| Community | Popular quests from other users' completed trips, voteable | "Find the hidden fox shrine behind the main hall" |

#### 1.10.2 Quest categories

Five quest types, each tied to a different engagement mechanic:

- **Exploration quests:** Visit specific locations, reach viewpoints, walk a minimum distance. Verified by GPS proximity check.
- **Photography quests:** Take a photo matching a condition (golden hour, specific landmark, food collection). Verified by photo timestamp + GPS + AI image recognition (reuses the 1.9 photo classification pipeline).
- **Efficiency quests:** Arrive at a spot when crowd < 30%, use three transport types in one day, complete all spots before 17:00. Verified by itinerary data + crowd cache.
- **Cultural quests:** Answer a trivia question about the spot, learn a local phrase, try a regional dish. Verified by user self-report or photo proof.
- **Sponsor quests:** Visit a partner store, make a purchase (receipt photo), rent equipment, book an experience. Verified by receipt OCR or partner API callback.

#### 1.10.3 Rewards and progression

```
quest_reward {
  points: number,              -- universal currency
  badge_id: string (nullable), -- unlockable achievement
  coupon: {                    -- sponsor-provided (nullable)
    type: "percentage" | "fixed" | "freebie",
    value: number,
    merchant: string,
    valid_until: date
  }
}
```

**Points** accumulate across trips. Users can redeem points for partner rewards (Klook discounts, JR Pass upgrades, local experience vouchers) or in-app perks (extended photo storage, premium journal templates).

**Badges** are collectible achievements displayed on the user's profile:

- Per-spot badges: "Fushimi Inari Summit", "Golden Hour Kinkaku-ji"
- City badges: "Kyoto Explorer" (complete 8/12 quests in a city)
- Meta badges: "3-Country Traveller", "100 Quests Completed", "Streak Master" (3 consecutive trips)

**Leaderboards** per destination and per time period (weekly, all-time). Users can opt out of public ranking.

#### 1.10.4 Integration with existing features

The quest system is not a standalone module — it connects to every major feature:

- **Itinerary planner:** When AI suggests a route, it can factor in available quests. "Kinkaku-ji has a golden hour quest at 16:00 — want me to schedule it then?"
- **LINE Bot:** Geofence-triggered quest notifications. When user is within 200m of a quest location, Bot pushes: "You're near a quest! Thousand Gates Challenge — walk to the summit for +80 pts."
- **Photo system:** Photo uploads are automatically cross-checked against active photography quests. If the photo matches (correct spot, correct time window), the quest auto-completes.
- **Expense tracker:** Receipt photos at sponsor merchants auto-complete sponsor quests. No manual check-in needed.
- **Post-trip journal:** Completed quests and earned badges are highlighted in the auto-generated journal.

#### 1.10.5 Sponsor quest platform (B2B)

A self-serve dashboard for local businesses to create, manage, and track sponsored quests:

| Tier | Includes | Price |
|------|----------|-------|
| Basic Quest | 1 branded quest, coupon distribution, basic analytics | TWD 3,000/mo |
| Featured Quest | Homepage placement, 3 quests, detailed conversion report, A/B testing | TWD 8,000/mo |
| City Partner | Full city quest collection, co-branded badges, tourism board integration | Custom pricing |

**Business model:** CPA (Cost Per Action) — sponsors pay only when a user completes their quest. Base fee covers listing; completion fee is TWD 10–30 per action depending on quest complexity. This aligns incentives: sponsors pay for foot traffic that actually arrives.

**Analytics dashboard for sponsors:**
- Quest impressions (shown in itinerary / LINE Bot)
- Quest starts vs. completions (conversion funnel)
- Coupon redemption rate
- User demographics (age range, origin country, travel style)
- Heatmap of completion times (helps merchants optimise staffing)

#### 1.10.6 Anti-gaming and fairness

- GPS spoofing detection: cross-reference with LINE Bot location, network signals, and photo EXIF data.
- Photo verification: AI checks that submitted photos genuinely match the quest requirement (not stock photos or screenshots).
- Rate limiting: max 20 quests completable per day to prevent point farming.
- Sponsor quest transparency: all sponsored quests clearly labelled with "Sponsored" badge. Users can filter them out if preferred.
- Points expiry: points expire 12 months after earning to encourage redemption and maintain program economics.

#### 1.10.7 Data model

```
quests {
  id, destination_id, spot_id (nullable),
  type: "exploration" | "photography" | "efficiency" | "cultural" | "sponsor",
  source: "system" | "sponsor" | "community",
  title, description, icon,
  conditions: {
    gps_target: { lat, lng, radius_m },
    time_window: { start, end } (nullable),
    photo_required: boolean,
    receipt_required: boolean,
    trivia_question: string (nullable),
    min_crowd_below: number (nullable)
  },
  reward: { points, badge_id, coupon },
  sponsor_id (nullable),
  is_active: boolean,
  difficulty: "easy" | "medium" | "hard"
}

user_quests {
  user_id, quest_id, trip_id,
  status: "available" | "in_progress" | "completed" | "expired",
  progress: { current: number, target: number },
  started_at, completed_at,
  verification_data: { photo_id, gps_log, receipt_id }
}

badges {
  id, name, icon, category,
  unlock_condition: "quest_id" | "quest_count" | "city_collection" | "streak"
}

user_badges {
  user_id, badge_id, earned_at, trip_id
}

sponsor_accounts {
  id, business_name, contact, tier,
  active_quests[], analytics_access: boolean
}
```

---

## 2. Non-functional requirements

### 2.1 Technology stack

| Layer | Technology |
|-------|-----------|
| Frontend (Year 1) | React 18 + TypeScript + Vite + TailwindCSS + dnd-kit, deployed as **PWA** (Service Worker + manifest.json + IndexedDB) |
| Frontend (Year 2, conditional) | React Native (iOS + Android), sharing business logic with web codebase |
| Auth & Backend (MVP) | **Supabase** — Google OAuth, PostgreSQL + Row Level Security, real-time subscriptions |
| Backend (Phase 3+) | Node.js (Fastify) or Python (FastAPI), REST + WebSocket — added when AI features require server-side processing |
| Database | **Supabase PostgreSQL** (trips stored as JSONB `days[]`); Redis (cache + real-time crowd, Phase 4+); S3/MinIO (file + photo storage, Phase 5+) |
| AI | Claude API (Sonnet for complex, Haiku for simple), Claude Vision API (photo classification + OCR) |
| External APIs | Google Maps, Google Directions, Google Drive, LINE Messaging API, Windy Webcams API, BestTime API (crowd data) |

### 2.2 Data model (core entities)

```
users → trips → days → spots
                     → trip_media (photos, receipts, documents)
                     → user_quests (quest progress per trip)

days: status (confirmed/uncertain/cancelled), optional variants[]
spots: belong to optional SpotSlots for alternatives
SpotOptions: carry constraints (hard: closing_time, last_entry; soft: best_before, best_after)

trip_media {
  id, trip_id, day_id, spot_id (nullable),
  type: "receipt" | "locker" | "scenery" | "food" | "document",
  file_url (S3), thumbnail_url,
  captured_at, lat, lng,
  ai_metadata: {
    receipt: { amount, currency, merchant, items[] }
    locker: { code, pin, location, reminder_sent, collected }
    scenery: { description, linked_spot }
    food: { dish_name, restaurant }
    document: { doc_type, extracted_text, booking_ref }
  },
  user_caption, tags[]
}

quests: id, destination_id, spot_id, type, source, conditions, reward, sponsor_id
user_quests: user_id, quest_id, trip_id, status, progress, verification_data
badges: id, name, icon, unlock_condition
user_badges: user_id, badge_id, earned_at
sponsor_accounts: id, business_name, tier, active_quests[]

spot_realtime_cache (Redis, TTL 15min): place_id, current_popularity, usual_popularity, wait_minutes
spot_webcams: spot_id → webcam_id, stream_url, thumbnail_url, distance_m
line_user_binding: user_id → line_uid, active_trip_id, timezone, push_enabled
```

### 2.3 Performance and scale

| Metric | Target |
|--------|--------|
| API response (itinerary CRUD) | < 200 ms |
| Photo classification + OCR | < 3 s end-to-end |
| Crowd data polling | Every 15 min, Redis TTL 15 min |
| LINE webhook latency | < 1 s (avoid timeout) |
| Photo upload to S3 | < 2 s for images up to 10 MB |
| Quest verification (GPS + photo) | < 2 s end-to-end |
| Concurrent users (Phase 1) | 10,000 |

### 2.4 Platform strategy

#### Year 1: Web (PWA) + LINE Bot

TripBuddy adopts a **dual-surface architecture** matching the product's two usage modes:

| Surface | Usage mode | Covers |
|---------|-----------|--------|
| Web app (React PWA) | Pre-trip planning (desktop/tablet) | Itinerary editor, drag-drop, map, file upload, gallery, expense view, quest dashboard, sponsor admin |
| LINE Bot | In-trip execution (mobile) | Daily push, context-aware replies, photo capture, crowd alerts, quest notifications, navigation, locker reminders |

**Why not a native app in Year 1:**

- LINE Bot already covers the core mobile use case. Users don't need to install a separate app — they just add TripBuddy as a LINE friend. In TW/JP/TH markets, LINE open rate far exceeds any third-party travel app.
- PWA closes the gap on the three advantages native apps have over web: offline access (Service Worker + IndexedDB), push notifications (Web Push API), and home screen presence (manifest.json install prompt).
- Development velocity: one codebase (React) instead of three (React + iOS + Android). Every feature ships to all users simultaneously. At the current 7-phase roadmap, adding native would roughly double the engineering timeline.

**PWA technical implementation:**

```
PWA capabilities:
- manifest.json: app name, icons, theme color, display: standalone
- Service Worker:
  - Cache-first: static assets, map tiles, itinerary JSON
  - Network-first: crowd data, quest status, photo uploads
  - Background sync: queue photo uploads when offline, sync on reconnect
- IndexedDB: full day itinerary + spot details for offline browsing
- Web Push API: re-engagement notifications (trip reminders, quest expiry)
- Install prompt: triggered after user creates their first trip
```

**What PWA cannot do (accepted trade-offs in Year 1):**

- Background GPS tracking (needed for automatic geofence quest triggers — workaround: LINE Bot location messages)
- Deep camera integration (AR overlays — not needed in Year 1)
- NFC / Bluetooth (contactless ticket scanning — future consideration)
- iOS Safari limits Web Push to iOS 16.4+ and restricts some Service Worker behaviours — acceptable given target demographic skews young and tech-savvy

#### Year 2: Native app evaluation (conditional)

A native app (React Native or Flutter) enters the roadmap only if **two or more** of the following triggers are met by Q1 2027:

| Trigger | Metric | Rationale |
|---------|--------|-----------|
| User demand | > 20% of feedback mentions "want an app" | Genuine pull, not assumed need |
| PWA install ceiling | PWA install rate plateaus below 15% of MAU | Users resist "Add to Home Screen" flow |
| Feature blocker | A planned feature requires native-only APIs | Background GPS, AR, NFC, HealthKit |
| B2B requirement | Enterprise/agency partner requires SDK embedding | White-label distribution |
| Retention gap | LINE Bot DAU < 30% of active trip users | Users not opening LINE enough during trips |

**If triggers are met — native app scope (Phase 8):**

| Phase | Scope | Duration | Key deliverable |
|-------|-------|----------|-----------------|
| 8a | Native shell: auth, itinerary viewer, offline maps, push | 4–5 weeks | Read-only trip companion app |
| 8b | Photo capture with native camera, background geofence, quest AR | 3–4 weeks | Full-featured native app |

**Technical approach if native is greenlit:**

- **React Native** preferred over Flutter: the existing React web codebase allows significant component reuse (business logic, API layer, state management). UI components need native rewrites but data layer is shared.
- **Shared backend:** the REST + WebSocket API is already platform-agnostic. Native app is just another client — no backend changes required.
- **LINE Bot continues:** the native app supplements but does not replace the LINE Bot. Users who prefer LINE keep using it. The app adds capabilities LINE cannot provide (background GPS, AR, richer offline).
- **Code sharing estimate:** ~40% of React web code reusable in React Native (hooks, API calls, state logic, utils). UI components: 0% reuse (must be rewritten with React Native primitives).

**What stays web-only even with a native app:**

- Itinerary drag-drop editor (complex desktop interaction, not suited for mobile)
- Sponsor quest admin dashboard (B2B tool, desktop-first)
- Post-trip journal editor (rich text editing, better on large screen)
- File upload and AI parsing (typically done at a desk before the trip)

---

## 3. Development phases

| Phase | Scope | Duration | Key deliverable | 狀態 |
|-------|-------|----------|-----------------|------|
| 0 ✅ | Client-side SPA: trip editor, drag-sort, conflict detection, map, i18n, LINE push | — | 純前端 MVP | ✅ 完成 |
| SB ✅ | Supabase Auth (Google OAuth) + cloud persistence; guest mode; migration modal | — | 真實登入 + 跨裝置同步 | ✅ 完成 |
| 1 | File upload, AI parsing, Google Drive import | 2–3 weeks | Import pipeline | ⬜ |
| 2 | AI spot recommendation, route optimisation, collaborative editing | 2–3 weeks | Smart planner | ⬜ |
| 3 | LINE Bot companion: morning push, context-aware replies, crowd alerts | 3–4 weeks | Travel companion | ⬜ |
| 4 | Photo capture, AI classification, expense tracker, locker reminders | 2–3 weeks | Trip media manager | ⬜ |
| 5 | Post-trip journal, PDF export, sharing links, offline PWA | 2–3 weeks | Polish + launch | ⬜ |
| 6 | Quest engine, badge system, sponsor dashboard, reward redemption | 3–4 weeks | Gamification platform | ⬜ |
| 7 *(conditional)* | *Native app (React Native): itinerary viewer, offline maps, camera, background geofence, quest AR* | *7–9 weeks* | *Native companion app* | ⬜ |

> **Phase 8 gate:** Triggered only if ≥ 2 of 5 evaluation criteria met at Q1 2027 review. See section 2.4 for trigger definitions. If not triggered, resources redirect to community features and market expansion.

---

# SWOT analysis — 10 iterations

Each iteration analyses the current state, identifies the primary weakness, and proposes specific improvements that feed into the next iteration.

## Iteration 1

| Strengths | Weaknesses |
|-----------|-----------|
| Unique combo of web planner + LINE Bot real-time companion covers full travel lifecycle. | Heavy API dependency (Google, LINE, Claude, Windy) creates single-point-of-failure risk and high running cost. |
| **Opportunities** | **Threats** |
| Asia-Pacific LINE user base (200M+) is underserved by English-centric travel tools. | Google Maps Platform pricing changes could blow up unit economics overnight. |

**Weakness addressed:** Heavy API dependency (Google, LINE, Claude, Windy) creates single-point-of-failure risk and high running cost.

**Improvement applied:** Add fallback providers: OpenStreetMap + OSRM for routing, open webcam aggregators. Implement circuit breakers and graceful degradation per API. Cache aggressively to reduce call volume.

## Iteration 2

| Strengths | Weaknesses |
|-----------|-----------|
| Graceful degradation now built in; service stays functional even if one API goes down. | No monetisation model defined. Free tools attract users but burn cash on API calls. |
| **Opportunities** | **Threats** |
| Travel SaaS willingness-to-pay is proven (TripIt Pro, Wanderlog Pro charge USD 5–10/mo). | Free alternatives (Google Travel, Notion templates) set user expectations to zero cost. |

**Weakness addressed:** No monetisation model defined. Free tools attract users but burn cash on API calls.

**Improvement applied:** Introduce freemium: free tier (3 trips, no LINE Bot), Pro tier (unlimited trips, LINE companion, AI features) at TWD 150/mo. AI and LINE push are the value gates.

## Iteration 3

| Strengths | Weaknesses |
|-----------|-----------|
| Clear freemium wedge: AI + LINE are premium, basic planning is free. Monetisation path exists. | Popular Times data relies on scraping, which violates Google ToS and can break without notice. |
| **Opportunities** | **Threats** |
| BestTime.app and similar third-party crowd APIs offer legal, stable alternatives. | Legal risk if Google enforces ToS; user trust damaged if crowd data suddenly disappears. |

**Weakness addressed:** Popular Times data relies on scraping, which violates Google ToS and can break without notice.

**Improvement applied:** Switch to BestTime API (or Outscraper) as primary crowd source. Use Google Popular Times only as secondary validation. Store historical crowd patterns locally to provide offline estimates.

## Iteration 4

| Strengths | Weaknesses |
|-----------|-----------|
| Legal crowd-data pipeline secured. Historical crowd patterns enable predictive scheduling. | Single-user positioning limits viral growth. No sharing or collaboration features. |
| **Opportunities** | **Threats** |
| Group travel planning (friends, family) is a top pain point; collaborative features drive word-of-mouth. | Competitors like Wanderlog already have collaborative editing; late entry means feature parity pressure. |

**Weakness addressed:** Single-user positioning limits viral growth. No sharing or collaboration features.

**Improvement applied:** Add trip sharing via link (read-only) in Phase 1, collaborative editing (real-time cursors, comment threads) in Phase 3. LINE group chat integration lets co-travellers receive the same daily push.

## Iteration 5

| Strengths | Weaknesses |
|-----------|-----------|
| Collaboration and sharing now in roadmap. LINE group integration is a differentiator. | No offline capability. Travellers often lose connectivity abroad. |
| **Opportunities** | **Threats** |
| PWA + service worker can cache itinerary data for offline access without a native app. | Users in rural/mountain areas lose all functionality; negative reviews on reliability. |

**Weakness addressed:** No offline capability. Travellers often lose connectivity abroad.

**Improvement applied:** Build as PWA with IndexedDB cache. Pre-download day itinerary + map tiles for offline. Sync back when online. LINE Bot naturally requires connectivity, but web app works offline.

## Iteration 6

| Strengths | Weaknesses |
|-----------|-----------|
| PWA with offline mode ensures reliability in any network condition. | AI features (Claude API) are expensive per call and add latency to user interactions. |
| **Opportunities** | **Threats** |
| Smaller local models (e.g. Claude Haiku) can handle simpler tasks at 10x lower cost. | Slow AI responses (>3s) during trip editing frustrate users and increase abandonment. |

**Weakness addressed:** AI features (Claude API) are expensive per call and add latency to user interactions.

**Improvement applied:** Route by complexity: use Claude Haiku for quick tasks (spot lookup, simple reorder), Claude Sonnet for complex planning. Pre-compute and cache common recommendations per destination. Show streaming responses for long operations.

## Iteration 7

| Strengths | Weaknesses |
|-----------|-----------|
| Tiered AI routing reduces cost 60–70% while maintaining quality for complex tasks. | No content beyond user-generated itineraries. No editorial voice, guides, or community. |
| **Opportunities** | **Threats** |
| Curated destination guides and user-submitted tips create SEO flywheel and community stickiness. | Without content moat, product is easily replicated by any team with API access. |

**Weakness addressed:** No content beyond user-generated itineraries. No editorial voice, guides, or community.

**Improvement applied:** Add community layer: users can publish and fork itineraries (like GitHub repos). AI generates destination quick-guides seeded with local tips. SEO-optimised landing pages per destination drive organic traffic.

## Iteration 8

| Strengths | Weaknesses |
|-----------|-----------|
| Community itinerary library creates network effect and organic SEO content. | Privacy concerns: GPS tracking, LINE message history, and Google location data are sensitive. |
| **Opportunities** | **Threats** |
| GDPR/APPI compliance and transparent privacy controls can be a trust differentiator. | Data breach or perceived surveillance erodes trust instantly in privacy-conscious Asian markets. |

**Weakness addressed:** Privacy concerns: GPS tracking, LINE message history, and Google location data are sensitive.

**Improvement applied:** Implement privacy-by-design: location data processed ephemerally (never stored beyond session), LINE messages not logged, end-to-end encryption for trip data, clear data-deletion flow, annual privacy audit. Photo EXIF GPS stripped before sharing.

## Iteration 9

| Strengths | Weaknesses |
|-----------|-----------|
| Privacy-first architecture builds trust. Data-deletion flow meets GDPR/APPI requirements. | LINE Bot is Asia-only. No support for WhatsApp, Telegram, or other messaging platforms. |
| **Opportunities** | **Threats** |
| WhatsApp Business API covers SE Asia, India, Latin America — massive TAM expansion. | LINE user growth has plateaued in Japan/Taiwan; long-term growth requires platform diversification. |

**Weakness addressed:** LINE Bot is Asia-only. No support for WhatsApp, Telegram, or other messaging platforms.

**Improvement applied:** Abstract messaging layer: create a platform-agnostic bot interface (intent router + card builder) with adapters for LINE, WhatsApp, Telegram. Launch LINE first (core market), WhatsApp in Phase 6.

## Iteration 10

| Strengths | Weaknesses |
|-----------|-----------|
| Platform-agnostic messaging architecture enables global expansion without rebuilding. | No analytics or post-trip features. User engagement drops to zero after the trip ends. |
| **Opportunities** | **Threats** |
| Post-trip features (travel journal, expense summary, photo timeline) extend LTV and drive re-engagement. | Users churn after each trip; reactivation cost is high without ongoing value. |

**Weakness addressed:** No analytics or post-trip features. User engagement drops to zero after the trip ends.

**Improvement applied:** Add post-trip module: auto-generated travel journal from itinerary + photos + expense data, photo timeline, and a "Next trip" recommendation based on travel history. Push a monthly "travel inspiration" via LINE to maintain engagement between trips. The photo capture system (1.9) provides the raw material, and the gamification quest system (1.10) adds ongoing motivation — badge collections, city completion goals, and leaderboard rankings give users reasons to keep planning and travelling with TripBuddy. Sponsor quests also open a B2B revenue channel (CPA model) that diversifies income beyond Pro subscriptions.

---

# Marketing plan — TripBuddy

Prepared by: Marketing Division | Target launch: Q3 2026

## 1. Executive summary

TripBuddy is a personal trip-planning platform that combines an intelligent web editor with a LINE Bot real-time travel companion. It targets tech-savvy independent travellers aged 22–40 in Taiwan, Japan, and Thailand — markets where LINE penetration exceeds 80%. The product differentiates through four pillars: drag-and-drop itinerary building with uncertainty management, AI-powered scheduling that adapts to real-time crowd data, a LINE Bot that acts as a pocket tour guide during the trip, and a gamification quest system that turns sightseeing into an interactive adventure while opening B2B revenue via sponsored quests. The freemium model gates AI features and LINE push behind a Pro subscription at TWD 150/month (approx. USD 5), supplemented by CPA-based sponsor quest revenue.

## 2. Market analysis

### 2.1 Target market

**Primary:** Taiwanese millennials and Gen-Z (22–35) who plan 2–4 international trips per year. They use LINE daily, research trips on social media, and value convenience over price.

**Secondary:** Japanese domestic travellers and Thai outbound travellers.

### 2.2 Competitive landscape

| Competitor | Strength | Weakness | Our edge |
|------------|----------|----------|----------|
| Google Travel | Free, deep Maps integration | No real-time alerts, no LINE | Proactive crowd alerts + LINE companion |
| Wanderlog | Polished UI, collaboration | No messaging bot, English-centric | LINE-native, CJK localisation, uncertainty mgmt |
| TripIt | Auto-parse confirmations | Business focus, no crowd data | Leisure focus, live cam, crowd-aware reorder |
| Notion templates | Flexible, free | No map, no AI, no real-time | Purpose-built UX, zero setup |

### 2.3 TAM / SAM / SOM

- **TAM:** 15M active international travellers in Taiwan + Japan + Thailand who use LINE.
- **SAM:** 4M who currently use digital planning tools (spreadsheets, Notion, Google Maps).
- **SOM (Year 1):** 40,000 registered users, 4,000 Pro subscribers = TWD 7.2M ARR.

## 3. Positioning and messaging

**Tagline:** "Your trip, always one step ahead."

**Core message:** TripBuddy is the only travel planner that thinks ahead for you — it warns you before a spot gets crowded, swaps your schedule when plans change, and whispers the next move to your LINE while you're still enjoying the view.

### 3.1 Value propositions by persona

- **The planner:** "I can drag, drop, and lock my perfect itinerary with backup plans built in."
- **The spontaneous traveller:** "I upload a rough draft and AI fills in the gaps."
- **The anxious traveller:** "It tells me when a spot is too crowded and offers a better order."
- **The memory keeper:** "I snap receipts and scenery on LINE — it organises everything and builds my travel journal."
- **The adventurer:** "Every trip has quests and badges to collect — it makes sightseeing feel like a game."

## 4. Go-to-market strategy

### 4.1 Launch phases

| Phase | Timeline | Activity | KPI |
|-------|----------|----------|-----|
| Seed | Q2 2026 | Closed beta with 200 travel bloggers in TW/JP. Collect feedback, iterate. Secure 10 KOL partnerships. | NPS > 50, 80% D7 retention |
| Launch | Q3 2026 | Public launch. KOL unboxing videos on YouTube/IG. LINE OA friend campaign. Product Hunt launch. | 10K signups in 30 days |
| Growth | Q4 2026 | SEO destination guides, community itinerary sharing, referral programme (invite 3 friends = 1 month Pro free). | 1K Pro subs, CAC < TWD 200 |
| Expand | Q1 2027 | Launch JP/TH localisation. WhatsApp adapter for SE Asia pilot. B2B travel agency API. | 3 markets live, 4K Pro subs |

### 4.2 Channel strategy

- **Social media (40% of budget):** Instagram Reels and TikTok short-form videos showing "before/after" itinerary makeovers. Partner with 10 mid-tier travel KOLs (50K–200K followers) in Taiwan for authentic content. Budget: TWD 600K.
- **SEO and content (25% of budget):** AI-generated destination guides optimised for long-tail keywords ("Kyoto 3-day itinerary 2026"). Community-published itineraries create a content flywheel. Budget: TWD 375K.
- **LINE OA growth (20% of budget):** Run "Add friend" campaigns with coupon incentives. Cross-promote with LINE Travel and LINE Shopping. Rich menu drives trial of Pro features. Budget: TWD 300K.
- **PR and partnerships (15% of budget):** Product Hunt launch, Hacker News Show HN, tech media coverage in Taiwan (e.g. Inside, TechOrange). Partnership with JR Pass / Klook for cross-promotion. Budget: TWD 225K.

## 5. Pricing strategy

| Tier | Includes | Price |
|------|----------|-------|
| Free | 3 active trips, drag-sort editor, map view, file upload (2/mo), basic conflict alerts, **system quests (3/day limit)** | TWD 0 |
| Pro (monthly) | Unlimited trips, AI recommend + optimise, LINE Bot companion, crowd alerts, live cam, collaborative editing, offline PWA, photo capture + expense tracker + journal, **unlimited quests + badges + sponsor rewards + leaderboard** | TWD 150/mo |
| Pro (annual) | Same as Pro monthly | TWD 1,200/yr (save 33%) |

**Conversion trigger:** after the user creates their first trip, a contextual prompt shows how AI could optimise their route (with a preview diff), gated behind Pro.

## 6. Key metrics and dashboard

| Metric | Target (Month 3) | Target (Month 12) |
|--------|-------------------|-------------------|
| Registered users | 10,000 | 40,000 |
| Monthly active users | 4,000 | 15,000 |
| Pro subscribers | 500 | 4,000 |
| Free-to-Pro conversion | 5% | 10% |
| LINE Bot DAU | 800 | 5,000 |
| Photos captured per trip | — | 30+ (Pro avg) |
| Quests completed per trip | — | 8+ (Pro avg) |
| Sponsor quest completion rate | — | > 25% |
| B2B sponsor accounts | — | 50+ |
| NPS | > 45 | > 55 |
| CAC (Pro) | < TWD 300 | < TWD 150 |
| Monthly churn (Pro) | < 8% | < 5% |

## 7. Budget summary (Year 1)

| Category | Annual budget (TWD) |
|----------|-------------------|
| Social media + KOL | 600,000 |
| SEO + content creation | 375,000 |
| LINE OA growth campaigns | 300,000 |
| PR + partnerships | 225,000 |
| **Total marketing spend** | **1,500,000** |
| **Projected ARR (4K Pro subs)** | **7,200,000** |
| **Projected B2B sponsor revenue (50 accounts avg TWD 5K/mo)** | **3,000,000** |
| **Total projected revenue** | **10,200,000** |

## 8. Risk mitigation

- **API cost overrun:** tiered AI routing (Haiku for simple, Sonnet for complex) reduces Claude costs 60–70%. Redis caching cuts Google API calls by 80%. Vision API calls for photo classification batched and throttled.
- **Low conversion:** if free-to-Pro < 3% at Month 2, activate "7-day Pro trial on first trip" to let users experience the LINE Bot + photo features before committing.
- **Competitor response:** if Google Travel adds crowd alerts, double down on LINE-native experience, photo management, and CJK localisation as defensible moats.
- **Privacy incident:** privacy-by-design architecture, annual third-party audit, transparent data-deletion flow, EXIF stripping on shared photos build trust before an incident occurs.
- **Photo storage costs:** aggressive thumbnail generation + original-quality images only retained for 90 days post-trip (user can extend with Pro). Estimated S3 cost: TWD 0.3/user/month.
- **Gamification fatigue:** keep quests optional, never block core planning features behind quest gates. Rotate quest content seasonally. A/B test quest frequency to find the sweet spot (target: 3–5 quests/day without overwhelming). If completion rates drop below 15%, reduce quest density.
- **Sponsor quest quality:** all sponsor quests reviewed before going live; reject anything that feels like pure advertising without genuine user value. Maintain a minimum reward threshold. Users can report low-quality quests; sponsors with >20% report rate are suspended.
- **Native app premature investment:** the conditional Phase 8 gate prevents sinking resources into a native app before product-market fit is proven. If PWA + LINE Bot cover >90% of user needs, those resources are better spent on content, community, and market expansion.

## 9. Timeline and milestones

| Date | Milestone | Owner |
|------|-----------|-------|
| May 2026 | KOL outreach and closed-beta recruitment | Marketing |
| Jun 2026 | Closed beta launch (200 users), feedback loop | Product + Mkt |
| Jul 2026 | Product Hunt + public launch, LINE OA campaign | Marketing |
| Aug 2026 | First conversion analysis, pricing A/B test | Growth |
| Sep 2026 | Photo capture + expense tracker beta | Product |
| Oct 2026 | Community itinerary feature, referral programme | Product + Mkt |
| Nov 2026 | Post-trip journal generation launch | Product |
| Dec 2026 | **Quest engine beta — system-generated quests only** | Product |
| Jan 2027 | JP/TH localisation launch, WhatsApp pilot | Expansion |
| Feb 2027 | **Sponsor quest dashboard launch, first 10 B2B partners onboarded** | Product + Biz Dev |
| Mar 2027 | **Badge collection + leaderboard + community quests** | Product |
| Q1 2027 | **Native app evaluation: review 5 trigger metrics, go/no-go decision** | Product + Engineering |
| Q2 2027 *(if triggered)* | *Phase 8a: native shell (auth, itinerary viewer, offline maps, push)* | Engineering |
| Q3 2027 *(if triggered)* | *Phase 8b: native camera, background geofence, quest AR* | Engineering |
