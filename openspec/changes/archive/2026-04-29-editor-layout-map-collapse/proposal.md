## Why

地圖面板在編輯器佔據 1/3 版面寬度，但多數使用情境（新增景點、調整時間、拖曳排序）根本不需要地圖；預設展開的地圖擠壓了行程清單的閱讀空間，降低編輯效率。作為有 20 年經驗的 UI/UX 設計師，這是典型的「為功能而功能」佈局——地圖應該是按需呼出的輔助工具，而非永遠霸占畫面的主角。

## What Changes

- 地圖面板預設**收合**，編輯器變為兩欄（Sidebar 210px + 行程面板 flex）
- 在 header bar 加入「地圖」切換按鈕，點擊後從右側滑出地圖面板（寬度可調，預設 40%）
- 地圖面板可獨立關閉（面板右上角 × 按鈕）
- 地圖展開/收合狀態保存在 `localStorage`，下次開啟維持用戶偏好
- 選擇某天且地圖已展開時，地圖自動對焦該天景點（現有行為保留）

## Capabilities

### New Capabilities
- `map-panel-toggle`: 用戶可隨時展開/收合地圖面板，狀態持久化

### Modified Capabilities

## Impact

- `src/App.tsx`: 新增 `mapOpen` state、toggle handler、header 按鈕、grid layout 條件切換
- `src/i18n/zh-TW.ts` / `src/i18n/en.ts`: 新增地圖切換按鈕文字
