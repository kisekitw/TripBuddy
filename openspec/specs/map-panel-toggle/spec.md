# map-panel-toggle Specification

## Purpose
TBD - created by archiving change editor-layout-map-collapse. Update Purpose after archive.
## Requirements
### Requirement: 地圖面板預設收合

編輯器進入時地圖面板 SHALL 預設為收合狀態，佈局為兩欄（Sidebar + 行程面板）。

#### Scenario: 初次進入編輯器

- **WHEN** 用戶首次進入編輯器（無 localStorage 記錄）
- **THEN** 地圖面板 MUST 為收合狀態
- **AND** 行程面板 SHALL 佔滿右側可用空間

#### Scenario: 恢復上次狀態

- **WHEN** 用戶進入編輯器，且 `localStorage` 中 `tb_map_open` 為 `"true"`
- **THEN** 地圖面板 MUST 自動展開

---

### Requirement: Header 地圖切換按鈕

編輯器 header SHALL 提供一個切換按鈕，用於展開或收合地圖面板。

#### Scenario: 點擊按鈕展開地圖

- **WHEN** 地圖面板為收合狀態
- **AND** 用戶點擊 header 的地圖切換按鈕
- **THEN** 地圖面板 MUST 出現在畫面右側
- **AND** `localStorage` 中 `tb_map_open` SHALL 被設為 `"true"`

#### Scenario: 點擊按鈕收合地圖

- **WHEN** 地圖面板為展開狀態
- **AND** 用戶點擊 header 的地圖切換按鈕
- **THEN** 地圖面板 MUST 從佈局中移除
- **AND** `localStorage` 中 `tb_map_open` SHALL 被設為 `"false"`

---

### Requirement: 地圖展開時行為與現有一致

地圖面板展開後，其功能行為 SHALL 與改版前完全相同。

#### Scenario: 選擇天數後地圖對焦

- **WHEN** 地圖面板為展開狀態
- **AND** 用戶選擇左側某一天
- **THEN** MapView SHALL 顯示該天的景點

