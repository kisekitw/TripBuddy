## 1. State & persistence

- [x] 1.1 Add `mapOpen` state in `App.tsx`, initialized from `localStorage.getItem("tb_map_open") === "true"`
- [x] 1.2 Add `toggleMap` handler: flips `mapOpen` and syncs to `localStorage`

## 2. Layout

- [x] 2.1 Change editor grid from `"210px 1fr 1fr"` to `mapOpen ? "210px 1fr 1fr" : "210px 1fr"` (conditional)
- [x] 2.2 Wrap the Map panel `<div>` in `{mapOpen && (...)}` so it's removed from DOM when collapsed

## 3. Header toggle button

- [x] 3.1 Add map toggle button to editor header bar (after the LINE send button), styled as a pill matching existing buttons
- [x] 3.2 Button shows active/inactive state based on `mapOpen`
- [x] 3.3 Add i18n keys `toggleMap` to `zh-TW.ts` and `en.ts`

## 4. Verify

- [x] 4.1 Editor loads with map collapsed by default (no localStorage entry)
- [x] 4.2 Clicking toggle opens map, clicking again closes it
- [x] 4.3 Refreshing the page restores the last map open/closed state
- [x] 4.4 When map is open and a day is selected, MapView renders correctly
