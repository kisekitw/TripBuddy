/**
 * M-1: 互動式地圖底圖
 * BDD Integration Tests — TDD Red → Green
 *
 * 使用 vi.mock 取代 react-leaflet，讓 jsdom 可測試地圖元件。
 * 每個 Marker → data-testid="map-marker"
 * Popup 內容 inline 展開（永遠在 DOM）
 * Polyline → data-testid="map-polyline"
 * MapContainer wrapper → data-testid="map-container"
 */
import React from "react";
import { describe, it, expect, afterEach, beforeEach, vi } from "vitest";
import { render, screen, within, cleanup } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import App from "../App";

beforeEach(() => localStorage.clear());
afterEach(() => cleanup());

// ── react-leaflet mock ───────────────────────────────────────────
vi.mock("react-leaflet", () => ({
  MapContainer: ({ children }: { children?: React.ReactNode }) => (
    <div>{children}</div>
  ),
  TileLayer: () => null,
  Marker: ({ children, interactive, "aria-label": ariaLabel }: any) => (
    <div
      data-testid={interactive === false ? "map-transit-label" : "map-marker"}
      aria-label={ariaLabel}
    >
      {children}
    </div>
  ),
  Popup: ({ children }: { children?: React.ReactNode }) => (
    <div data-testid="map-popup">{children}</div>
  ),
  Polyline: () => <div data-testid="map-polyline" />,
  useMap: () => ({ fitBounds: vi.fn(), setView: vi.fn() }),
}));

// ── Helpers ──────────────────────────────────────────────────────
/** Login as guest → enter Sample Trip Editor */
async function gotoSampleEditor() {
  const user = userEvent.setup();
  render(<App />);
  await user.click(screen.getByText("先逛逛，稍後再登入"));
  await user.click(screen.getByText("2026 義大利北部環狀行程"));
  return user;
}

/** gotoSampleEditor + select Day 4（佛羅倫斯博物館日，6 個景點） */
async function selectD4() {
  const user = await gotoSampleEditor();
  await user.click(screen.getByText("D4"));
  return user;
}

// ─────────────────────────────────────────────────────────────────
describe("M-1: 互動式地圖底圖", () => {

  // ── TC-M1-01 ────────────────────────────────────────────────────
  describe("TC-M1-01 ｜ 未選天時地圖顯示空狀態", () => {
    /**
     * Given  Editor 已開啟，未選擇任何天
     * When   進入 Editor
     * Then   顯示「選擇一天以顯示地圖」，無 map-container
     */
    it("should show empty state when no day is selected", async () => {
      await gotoSampleEditor();

      expect(screen.getByText("選擇一天以顯示地圖")).toBeInTheDocument();
      expect(screen.queryByTestId("map-container")).not.toBeInTheDocument();
    });
  });

  // ── TC-M1-02 ────────────────────────────────────────────────────
  describe("TC-M1-02 ｜ 選擇有景點的天後顯示地圖容器", () => {
    /**
     * Given  Editor 已開啟
     * When   點擊 D4（佛羅倫斯博物館日）
     * Then   data-testid="map-container" 出現，空狀態消失
     */
    it("should render map-container when a day with spots is selected", async () => {
      await selectD4();

      expect(screen.getByTestId("map-container")).toBeInTheDocument();
      expect(screen.queryByText("選擇一天以顯示地圖")).not.toBeInTheDocument();
    });
  });

  // ── TC-M1-03 ────────────────────────────────────────────────────
  describe("TC-M1-03 ｜ 景點以標記顯示在地圖上", () => {
    /**
     * Given  D4（6 個景點皆有座標）已選取
     * When   地圖渲染
     * Then   出現 6 個 data-testid="map-marker"
     */
    it("should render 6 markers for D4 which has 6 spots", async () => {
      await selectD4();

      const markers = screen.getAllByTestId("map-marker");
      expect(markers).toHaveLength(6);
    });
  });

  // ── TC-M1-04 ────────────────────────────────────────────────────
  describe("TC-M1-04 ｜ 標記 popup 顯示景點名稱", () => {
    /**
     * Given  D4 已選取，地圖顯示
     * When   查看第 1 個標記的 popup 內容
     * Then   「烏菲茲美術館」出現在第 1 個 marker 的 popup 中
     */
    it("should show spot name in the popup of the first marker", async () => {
      await selectD4();

      const markers = screen.getAllByTestId("map-marker");
      const firstPopup = within(markers[0]).getByTestId("map-popup");
      expect(firstPopup).toHaveTextContent("烏菲茲美術館");
    });
  });

  // ── TC-M1-05 ────────────────────────────────────────────────────
  describe("TC-M1-05 ｜ 多景點時顯示路徑連線", () => {
    /**
     * Given  D4（6 景點）已選取
     * When   地圖渲染
     * Then   data-testid="map-polyline" 存在
     */
    it("should render a polyline path when multiple spots exist", async () => {
      await selectD4();

      expect(screen.getAllByTestId("map-polyline").length).toBeGreaterThanOrEqual(1);
    });
  });
});
