## Context

編輯器目前使用固定三欄 grid（`210px 1fr 1fr`），地圖佔右側 1/2 行程區域，無論用戶是否需要地圖都永遠可見。地圖在以下常見操作中毫無貢獻：新增/編輯景點、調整時間、拖曳排序、新增天數。而在查看景點位置、計算交通路線時才有實際價值。

現有 `MapView` 組件已正確處理「無景點」狀態（顯示空白提示），也支援 `apiKey` 選填（無 key 仍可渲染 Leaflet 底圖）。

## Goals / Non-Goals

**Goals:**
- 地圖預設收合，編輯器版面讓行程清單有更多空間
- 用戶可一鍵展開地圖，展開後行為與現在相同
- 展開/收合狀態跨 session 持久化（localStorage）
- 視覺上有明確的展開/收合動畫提示

**Non-Goals:**
- 可拖曳調整地圖寬度（過度工程，首版不做）
- 地圖浮窗/drawer 模式（保持 inline 佈局）
- 行動裝置響應式（現有版本不針對手機優化）

## Decisions

### Decision 1: 用 `mapOpen` boolean state 控制佈局，而非 CSS visibility

**選擇**：`mapOpen` 為 `false` 時，grid 改為 `"210px 1fr"`，MapView 組件從 DOM 移除。

**理由**：
- 移除 DOM 避免 Leaflet 在隱藏狀態下仍執行 tile 請求、動畫 loop
- Grid column 方式比 `width: 0` + `overflow: hidden` 更簡潔，不需要 wrapper
- 重新展開時 `key` 不變（用 `dd.id`），Leaflet 重新 mount 即自動重算尺寸

**替代方案**：CSS `display: none` / `width: 0` — 拒絕，因 Leaflet 在隱藏容器中 resize 行為不可靠。

### Decision 2: 切換按鈕放在 editor header bar

**選擇**：在現有 header（含「自動調整」「鎖定時間」「傳送今日行程」的那排）最右端加入地圖切換按鈕，樣式與 `tMode` 按鈕一致（pill 形狀）。

**理由**：按鈕與地圖面板上下對應，視覺直覺；不需要額外 UI 區域；符合現有按鈕群組語言。

### Decision 3: localStorage key `tb_map_open`，預設 `false`

**選擇**：初始 state `() => localStorage.getItem("tb_map_open") === "true"`，toggle 時同步寫入。

**理由**：與現有 `tb_line_token` 的 localStorage 模式一致；`false` 為預設值，新用戶自然看到收合狀態。

## Risks / Trade-offs

- **Leaflet 重新 mount 效能**：展開地圖時重新渲染 MapView，tile 會重新載入。→ 可接受，因地圖展開是低頻操作，且 Leaflet tile cache 存在。
- **用戶習慣改變**：現有用戶可能覺得地圖「消失了」。→ 以 localStorage 預設 `false` 而非強制，並在按鈕加 tooltip 說明。
