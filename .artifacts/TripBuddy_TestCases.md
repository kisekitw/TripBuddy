# TripBuddy Test Cases

> **版本**：v0.3（2026-04-14）
> **使用方式**：每個 User Story 完成實作後，逐一執行對應 TC，並將狀態欄從 ⬜ 更新為 ✅（通過）或 ❌（失敗）。
> **ID 命名規則**：`TC-{功能碼}-{兩位序號}`，例如 `TC-E1-01`。
> **自動化測試**：`npm test`（Vitest + React Testing Library）

---

## SB：Supabase Auth + 雲端持久化

### User Story
> 身為用戶，我想用 Google 帳號登入，讓行程存在雲端，換裝置也能存取。

### 前置條件 / 測試環境
- `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY` 已設定
- Supabase project 已建立 `trips` 資料表 + RLS policy
- Google OAuth provider 已在 Supabase 啟用

### Test Cases

| ID | 測試情境 | 操作步驟 | 預期結果 | 狀態 |
|---|---------|---------|---------|------|
| TC-SB-01 | App 啟動時顯示 loading 狀態 | mock `getSession` 不 resolve；render App | 出現 `data-testid="auth-loading"` | ✅ |
| TC-SB-02 | 點擊 Google 登入觸發 `signInWithOAuth` | 無 session 時點「使用 Google 帳號登入」 | `signInWithOAuth` 以 `provider: "google"` 被呼叫 | ✅ |
| TC-SB-03 | auth session 存在時，trips 從 Supabase 載入 | mock `fetchTrips` 回傳「雲端旅程」；render App | 顯示雲端旅程，不顯示 localStorage 的本機旅程 | ✅ |
| TC-SB-04 | Guest 模式仍使用 localStorage | localStorage 有本機旅程；點「先逛逛」 | 顯示本機旅程 | ✅ |
| TC-SB-05 | 登出後清空 trips state，返回登入頁 | 登入後點「登出」 | `signOut` 被呼叫；回到登入頁 | ✅ |
| TC-SB-06 | 首次登入且本機有行程，顯示遷移詢問 modal | localStorage 有行程；Supabase 回傳空陣列 | 出現「匯入本機行程？」modal | ✅ |

### 實作位置
| 元件 | 說明 |
|------|------|
| `src/lib/supabase.ts` | Supabase client 初始化 |
| `src/lib/db.ts` | `fetchTrips` / `upsertTrip` / `deleteTrip` CRUD 集中層 |
| `applySession()` | `src/App.tsx` — 登入後載入雲端 trips，觸發遷移 modal |
| `doLogin()` | `src/App.tsx` — `signInWithOAuth({ provider: "google" })` |
| `doGuest()` | `src/App.tsx` — `isGuest=true`，維持 localStorage 行為 |
| Guest banner | trips 頁頂部，提示登入以同步雲端 |
| 遷移 modal | `migrationOpen` state，匯入本機行程到 Supabase |
| `src/test/setup.ts` | 全域 mock supabase + db，讓既有測試不受影響 |

---

## E-1：新增旅程

### User Story
> 身為用戶，我想新增一趟旅程，以便規劃新行程。

### 前置條件 / 測試環境
- 應用程式已啟動（`npm run dev`）
- 目前位於旅程列表頁（`view === "trips"`）
- 至少已有一張旅程卡片（SAMPLE_TRIP）

### Test Cases

| ID | 測試情境 | 操作步驟 | 預期結果 | 狀態 |
|---|---------|---------|---------|------|
| TC-E1-01 | 點擊「+ 新增行程」出現建立表單/modal | 在旅程列表頁點擊右上角「+ 新增行程」按鈕 | 畫面出現 modal（role="dialog"），包含可輸入旅程名稱、目的地欄位，以及「建立」與「取消」按鈕 | ✅ |
| TC-E1-02 | 填入必填欄位後成功建立旅程 | 1. 點擊「+ 新增行程」<br>2. 輸入旅程標題（e.g. "東京五日遊"）<br>3. 點擊「建立」 | 1. modal 關閉<br>2. 旅程列表出現新旅程卡片<br>3. 新旅程自動帶入至少 1 個預設天數 | ✅ |
| TC-E1-03 | 未填標題直接送出 | 1. 點擊「+ 新增行程」<br>2. 不輸入任何標題<br>3. 點擊「建立」 | 1. modal 不關閉<br>2. 標題欄位旁顯示「請輸入旅程名稱」<br>3. 列表無新增任何旅程 | ✅ |
| TC-E1-04 | 取消建立旅程 | 1. 點擊「+ 新增行程」<br>2. 輸入任意標題<br>3. 點擊「取消」 | 1. modal 關閉<br>2. 旅程列表無任何變化<br>3. 原有旅程卡片數量不變 | ✅ |
| TC-E1-05 | 建立後可立即進入編輯器 | 1. 點擊「+ 新增行程」並成功建立新旅程<br>2. 點擊新出現的旅程卡片 | 1. 進入 Editor 頁（`view === "editor"`）<br>2. 側欄顯示 DAYS (1)（預設 1 個空天數） | ✅ |

---

## E-2：新增 / 刪除天數

### User Story
> 身為用戶，我想在行程中新增或刪除天數，以便彈性調整旅遊天數。

### 前置條件 / 測試環境
- 應用程式已啟動（`npm run dev`）
- 已進入 Editor 頁（`view === "editor"`）
- 預設載入 SAMPLE_TRIP（16 天行程）

### Test Cases

| ID | 測試情境 | 操作步驟 | 預期結果 | 狀態 |
|---|---------|---------|---------|------|
| TC-E2-01 | 在編輯器新增一天 | 在側欄底部點擊「+ 新增天數」按鈕 | 1. 側欄計數從 DAYS (16) 變為 DAYS (17)<br>2. 天序（n）自動遞增 | ✅ |
| TC-E2-02 | 新增天數有正確預設值 | 1. 點擊「+ 新增天數」<br>2. 查看新天的資料 | 1. `id` 為唯一值<br>2. `n` = 目前最大值 +1（顯示 D17）<br>3. `st` 預設 `"c"`<br>4. `sp` 為空陣列 | ✅ |
| TC-E2-03 | 刪除一個有景點的天數需確認 | 1. 點擊含景點天（D1）的刪除按鈕 | 1. 出現確認 alertdialog<br>2. 點「確認刪除」→ 天數移除，DAYS (15)<br>3. 點「取消」→ 天數保留，DAYS (16) | ✅ |
| TC-E2-04 | 刪除空天數直接移除 | 1. 新增一個空天數 D17<br>2. 點擊 D17 的刪除按鈕 | 1. 不出現 alertdialog<br>2. 天數直接移除，回到 DAYS (16) | ✅ |
| TC-E2-05 | 只剩一天時不可刪除 | 1. 新建旅程進入 Editor（只有 D1）<br>2. 查看 D1 的刪除按鈕 | 刪除按鈕為 disabled | ✅ |

---

## M-1：互動式地圖底圖

### User Story
> 身為用戶，我想在互動式地圖（Leaflet / OpenStreetMap）上看到真實位置，以便感受地理距離。

### 前置條件 / 測試環境
- 應用程式已啟動（`npm run dev`）
- 已進入 Editor 頁
- 選擇有景點的天（e.g. D4 佛羅倫斯博物館日，6 個景點）

### Test Cases

| ID | 測試情境 | 操作步驟 | 預期結果 | 狀態 |
|---|---------|---------|---------|------|
| TC-M1-01 | 未選天時地圖顯示空狀態 | 進入 Editor，不選擇任何天 | 顯示「選擇一天以顯示地圖」，無地圖容器 | ✅ |
| TC-M1-02 | 選擇有景點的天後顯示地圖容器 | 點擊 D4（佛羅倫斯博物館日） | 地圖容器（`data-testid="map-container"`）出現，取代純灰背景 | ✅ |
| TC-M1-03 | 景點以編號標記顯示在地圖上 | 選 D4（6 個景點皆有座標） | 地圖上出現 6 個標記（`data-testid="map-marker"`） | ✅ |
| TC-M1-04 | 標記 popup 顯示景點名稱 | 選 D4，查看標記 popup 內容 | 第 1 個景點「烏菲茲美術館」名稱出現在 popup 中 | ✅ |
| TC-M1-05 | 多景點時顯示路徑連線 | 選 D4（6 景點） | polyline 路徑線存在（`data-testid="map-polyline"`） | ✅ |

---

## E-3：新增 / 編輯 / 刪除景點

### User Story
> 身為用戶，我想新增 / 編輯 / 刪除景點，以便管理每日行程內容。

### 前置條件 / 測試環境
- 應用程式已啟動（`npm run dev`）
- 已進入 Editor 頁，選擇 D1（台北 → 杜拜，含景點「桃園機場出發」）

### Test Cases

| ID | 測試情境 | 操作步驟 | 預期結果 | 狀態 |
|---|---------|---------|---------|------|
| TC-E3-01 | 點擊「+ 新增景點」出現 modal | 在 D1 已選取時點「+ 新增景點」 | modal（role="dialog"）出現，含景點名稱輸入框 | ✅ |
| TC-E3-02 | 填入景點名稱後成功新增 | 輸入「帕拉提尼山丘」，點「新增」 | modal 關閉，景點出現在當日清單 | ✅ |
| TC-E3-03 | 未填名稱直接送出顯示驗證錯誤 | 不輸入名稱，點「新增」 | modal 不關閉，顯示「請輸入景點名稱」 | ✅ |
| TC-E3-04 | 取消新增景點 | 輸入名稱後點「取消」 | modal 關閉，清單無變化 | ✅ |
| TC-E3-05 | 刪除景點 | 點「刪除景點 桃園機場出發」 | 景點從清單消失 | ✅ |
| TC-E3-06 | 點擊編輯按鈕開啟 modal 帶入現有名稱 | 點「編輯景點 桃園機場出發」 | modal 開啟，名稱欄位預填「桃園機場出發」 | ✅ |
| TC-E3-07 | 儲存編輯後景點名稱更新 | 改名「松山機場出發」，點「儲存」 | modal 關閉，景點名稱更新 | ✅ |

---

## E-4：直接修改景點時間與停留時長

### User Story
> 身為用戶，我想直接修改景點時間與停留時長，以便手動微調行程。

### 前置條件 / 測試環境
- 已進入 Editor 頁，選擇 D4（佛羅倫斯博物館日）
- tMode 預設為 `"auto"`
- D4 第 1 景點：烏菲茲美術館 t=540（09:00）, d=180, tr=10
- D4 第 2 景點：領主廣場/舊宮/野豬噴泉 t=730（12:10）

### Test Cases

| ID | 測試情境 | 操作步驟 | 預期結果 | 狀態 |
|---|---------|---------|---------|------|
| TC-E4-01 | 點擊時間欄位出現可編輯輸入框 | 點擊「09:00」時間按鈕 | text input 出現，原按鈕消失 | ✅ |
| TC-E4-02 | 修改開始時間後顯示新時間 | 清除並輸入「10:00」，按 Enter | 按鈕恢復並顯示「10:00」 | ✅ |
| TC-E4-03 | 點擊停留時長欄位出現可編輯輸入框 | 點擊「180分鐘」時長按鈕 | number input 出現，原按鈕消失 | ✅ |
| TC-E4-04 | 修改時長後 cascade 調整下游景點 | 將烏菲茲時長改為 60，按 Enter | 領主廣場時間從 12:10 變為 10:10 | ✅ |
| TC-E4-05 | 輸入無效時間格式不更新 | 輸入「25:00」，按 Enter | 按鈕恢復並仍顯示「09:00」 | ✅ |

---

## E-5：儲存行程（localStorage）

### User Story
> 身為用戶，我想儲存行程，讓資料不因重新整理而消失。

### 前置條件 / 測試環境
- 應用程式已啟動（`npm run dev`）
- localStorage 已清空（每個測試前 `beforeEach(() => localStorage.clear())`）

### Test Cases

| ID | 測試情境 | 操作步驟 | 預期結果 | 狀態 |
|---|---------|---------|---------|------|
| TC-E5-01 | 建立旅程後重新掛載 App 仍顯示旅程 | 建立「東京行」→ cleanup + re-render → 登入 | 旅程列表仍顯示「東京行」 | ✅ |
| TC-E5-02 | 新增天數後重新掛載 App 天數保留 | 新增天數 → 返回列表 → cleanup + re-render → 進入旅程 | 側欄顯示 DAYS (17) | ✅ |
| TC-E5-03 | localStorage 空時 fallback 顯示預設旅程 | localStorage.clear() → render App → 登入 | 顯示「2026 義大利北部環狀行程」 | ✅ |

---

## E-6：Cascade Delta Badge

### User Story
> 身為用戶，我想看到 cascade 調整後各景點的時間差異 badge（如 +30 分鐘），以便了解影響範圍。

### 前置條件 / 測試環境
- 應用程式已啟動（`npm run dev`）
- 已進入 Editor 頁，選擇 D4（佛羅倫斯博物館日）
- tMode 預設為 `"auto"`
- D4 共 6 景點：d1 烏菲茲(t=540,d=180,tr=10)、d2 領主廣場(t=730)、d3 午餐isA(t=795)、d4 百花聖殿(t=890)、d5 喬托鐘樓(t=1045)、d6 老橋(t=1140)

### Test Cases

| ID | 測試情境 | 操作步驟 | 預期結果 | 狀態 |
|---|---------|---------|---------|------|
| TC-E6-01 | 縮短停留時間後下游景點出現負數 delta badge | 將烏菲茲時長 180→60，按 Enter | d2~d6（5 個景點）各出現 "-120分鐘" badge（data-testid="delta-badge"） | ✅ |
| TC-E6-02 | 延長停留時間後下游景點出現正數 delta badge | 將烏菲茲時長 180→240，按 Enter | d2~d6（5 個景點）各出現 "+60分鐘" badge | ✅ |
| TC-E6-03 | 修改開始時間後所有景點出現 delta badge | 將烏菲茲開始時間 09:00→09:30，按 Enter | d1~d6（6 個景點）各出現 "+30分鐘" badge | ✅ |
| TC-E6-04 | 切換到另一天後 delta badge 消失 | D4 做過修改後，點擊側欄 D1 | 畫面上不再有任何 delta-badge | ✅ |
| TC-E6-05 | Lock 模式下修改時長不出現 delta badge | 切換 lock 模式，修改烏菲茲時長，按 Enter | 畫面上不出現任何 delta-badge | ✅ |

---

## 附錄：關鍵程式位置（v0.4 更新）

| 功能 | 位置 |
|-----|------|
| 「+ 新增行程」按鈕 + handler | `src/App.tsx` → `setNewTripOpen(true)` |
| Trip 列表狀態 | `src/App.tsx` — `useState<Trip[]>([SAMPLE_TRIP])` |
| tripDaysMap 狀態 | `src/App.tsx` — `useState<Record<number, Day[]>>` |
| `handleCreateTrip()` handler | `src/App.tsx` |
| `addDay()` handler | `src/App.tsx` |
| `requestDeleteDay()` / `confirmDeleteDay()` | `src/App.tsx` |
| Day 型別定義 | `src/types/index.ts:30-40` |
| 自動化測試 E-1 | `src/__tests__/e1-add-trip.test.tsx` |
| 自動化測試 E-2 | `src/__tests__/e2-add-delete-day.test.tsx` |
| 自動化測試 M-1 | `src/__tests__/m1-map-view.test.tsx` |
| MapView（react-leaflet） | `src/components/MapView.tsx` |
| 自動化測試 E-3 | `src/__tests__/e3-spot-crud.test.tsx` |
| 自動化測試 E-4 | `src/__tests__/e4-spot-time-edit.test.tsx` |
| 自動化測試 E-5 | `src/__tests__/e5-persistence.test.tsx` |
| E-3/E-4 handlers | `src/App.tsx` → `handleSaveSpot`, `deleteSpot`, `updateSpotTime`, `updateSpotDuration` |
| E-5 persistence | `src/App.tsx` → lazy `useState` initializers + `useEffect` → `localStorage` |
| 自動化測試 E-6 | `src/__tests__/e6-delta-badge.test.tsx` |
| E-6 spotDeltas state | `src/App.tsx` → `useState<Record<string, number>>({})` |
| E-6 delta 計算 | `src/App.tsx` → `updateSpotTime` / `updateSpotDuration`（同步計算 oldTimes → newTimes diff） |
| E-6 day-switch clear | `src/App.tsx` → `useEffect(() => setSpotDeltas({}), [selDay])` |

---

## C-1：AI 自動調整

### User Story
> 身為用戶，當衝突嚴重時，我想一鍵「AI 自動調整」讓 AI 重排景點。

### Test Cases

| ID | 測試情境 | 操作步驟 | 預期結果 | 狀態 |
|---|---------|---------|---------|------|
| TC-C1-01 | 點擊「AI 自動調整」後消除所有 Level-2 衝突 | 1. 開啟含 2 個 Level-2 衝突的 D1<br>2. 點擊「AI 自動調整」 | 衝突面板消失（所有衝突降至 Level-0） | ✅ |

### 實作位置
| 元件 | 說明 |
|------|------|
| 自動化測試 C-1 | `src/__tests__/c1-c5-conflict-resolve.test.tsx` |
| `autoAdjustDay` | `src/utils/index.ts` — Level-2: t=cl-d; Level-1: d=cl-t; 再 recalcDay |
| `handleAutoAdjust` | `src/App.tsx` — onClick of「AI 自動調整」button |

---

## C-2：維持不變

### User Story
> 身為用戶，我想「無論如何保留」景點以忽略衝突警告。

### Test Cases

| ID | 測試情境 | 操作步驟 | 預期結果 | 狀態 |
|---|---------|---------|---------|------|
| TC-C2-01 | 點擊「維持不變」隱藏衝突面板（spots 不改變） | 1. 開啟含衝突的 D1<br>2. 點擊「維持不變」 | 衝突面板消失，景點時間不變 | ✅ |
| TC-C2-02 | 切換天數再切回，忽略狀態保留 | 1. 點擊「維持不變」<br>2. 切換至 D2 再切回 D1 | D1 衝突面板仍然不顯示 | ✅ |

### 實作位置
| 元件 | 說明 |
|------|------|
| `ignoredConflicts` | `src/App.tsx` — `useState<Set<string>>(new Set())` |
| `handleKeepAnyway` | `src/App.tsx` — 將所有 Level-2 spotId 加入 Set |
| `conflictSpots` filter | `src/App.tsx` — nC 計算排除 ignoredConflicts 中的 spots |

---

## C-3：縮短時長

### User Story
> 身為用戶，我想縮短景點停留時間來解決時間衝突。

### Test Cases

| ID | 測試情境 | 操作步驟 | 預期結果 | 狀態 |
|---|---------|---------|---------|------|
| TC-C3-01 | 衝突面板對每個 Level-2 景點顯示「縮短時長」按鈕 | 開啟含 2 個 Level-2 衝突的 D1 | 至少有 1 個「縮短時長」按鈕 | ✅ |
| TC-C3-02 | 點擊「縮短時長」後衝突數減少 | 點擊第一個「縮短時長」 | 「縮短時長」按鈕數減少 | ✅ |

### 實作位置
| 元件 | 說明 |
|------|------|
| `handleShortenDuration` | `src/App.tsx` — Level-2: t=cl-d; Level-1: d=cl-t; recalcDay |
| per-spot 按鈕 | 衝突面板中每個 conflictSpot 顯示「縮短時長」button |

---

## C-4：移至他日

### User Story
> 身為用戶，我想把景點移到另一天來解決衝突。

### Test Cases

| ID | 測試情境 | 操作步驟 | 預期結果 | 狀態 |
|---|---------|---------|---------|------|
| TC-C4-01 | 衝突面板對每個 Level-2 景點顯示「移至他日」按鈕 | 開啟含衝突的 D1 | 至少有 1 個「移至他日」按鈕 | ✅ |
| TC-C4-02 | 點擊「移至他日」顯示含其他天數的 day picker | 點擊第一個「移至他日」 | 出現 data-testid="move-day-picker"，含「D2」選項 | ✅ |
| TC-C4-03 | 選擇目標天數後景點移走，衝突數減少 | 點「D2 目標日」 | 「縮短時長」按鈕數減少 | ✅ |

### 實作位置
| 元件 | 說明 |
|------|------|
| `moveSpotPickerSpotId` | `src/App.tsx` — `useState<string | null>(null)` |
| `handleMoveSpotToDay` | `src/App.tsx` — 從 source day 刪除，append 到 target day，各自 recalcDay |
| day picker UI | `data-testid="move-day-picker"` 下拉，列出所有非目前天的 days |

---

## C-5：Level-3 解決精靈

### User Story
> 身為用戶，當多個景點連鎖崩潰（Level 3），我想啟動完整的解決精靈來一次性處理。

### 定義：Level 3 = 同一天 ≥ 3 個 Level-2 衝突景點

### Test Cases

| ID | 測試情境 | 操作步驟 | 預期結果 | 狀態 |
|---|---------|---------|---------|------|
| TC-C5-01 | ≥3 個 Level-2 衝突時顯示「解決精靈」按鈕 | 開啟含 3 個 Level-2 衝突的 D1 | 衝突面板出現「解決精靈」按鈕 | ✅ |
| TC-C5-02 | 點擊「解決精靈」開啟 wizard dialog | 點擊「解決精靈」 | 出現 role="dialog" aria-label="衝突解決精靈" | ✅ |
| TC-C5-03 | Wizard modal 列出所有衝突景點名稱 | 查看 dialog 內容 | 景點X1, X2, X3 均出現於 dialog 內 | ✅ |

### 實作位置
| 元件 | 說明 |
|------|------|
| `wizardOpen` | `src/App.tsx` — `useState(false)` |
| 「解決精靈」button | 衝突面板 nC >= 3 時顯示 |
| Wizard modal | role="dialog" aria-label={t.conflictWizardTitle}，列出所有 conflictSpots + 操作按鈕 |
