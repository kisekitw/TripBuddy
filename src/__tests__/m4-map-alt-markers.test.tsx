/**
 * M-4: 替代景點 (Type B) 未選中時以半透明標記顯示在地圖上
 * BDD Integration Tests — TDD Red → Green
 *
 * 使用 D4（佛羅倫斯博物館日）:
 *   d3 = "Osteria Nuvoli 午餐"，isA:true，3 個選項 (si:0)
 *   → 未選中 ao[1]「Zà Zà 牛排」和 ao[2]「Dall'Oste 丁骨」應顯示半透明標記
 *
 * TC-M4-01: D4 選取 → 2 個 map-alt-marker（ao[1] ao[2]）
 * TC-M4-02: 切換至 ao[1] 後，仍有 2 個 map-alt-marker（ao[0] ao[2]）
 * TC-M4-03: D5（無 isA 景點）→ 0 個 map-alt-marker
 */
import React from "react";
import { describe, it, expect, afterEach, beforeEach, vi } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import App from "../App";

beforeEach(() => localStorage.clear());
afterEach(() => cleanup());

// Marker mock: honour explicit data-testid prop first, then fall back to interactive check
vi.mock("react-leaflet", () => ({
  MapContainer: ({ children }: { children?: React.ReactNode }) => (
    <div>{children}</div>
  ),
  TileLayer: () => null,
  Marker: ({ children, interactive, "aria-label": ariaLabel, "data-testid": testId }: any) => (
    <div
      data-testid={testId ?? (interactive === false ? "map-transit-label" : "map-marker")}
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

async function selectD4() {
  const user = userEvent.setup();
  render(<App />);
  await user.click(screen.getByText("先逛逛，稍後再登入"));
  await user.click(screen.getByText("2026 義大利北部環狀行程"));
  await user.click(screen.getByText("D4"));
  return user;
}

async function selectD5() {
  const user = userEvent.setup();
  render(<App />);
  await user.click(screen.getByText("先逛逛，稍後再登入"));
  await user.click(screen.getByText("2026 義大利北部環狀行程"));
  await user.click(screen.getByText("D5"));
  return user;
}

describe("M-4: 替代景點半透明地圖標記", () => {

  // ── TC-M4-01 ──────────────────────────────────────────────────────
  describe("TC-M4-01 ｜ D4 有 isA 景點 → 2 個半透明標記", () => {
    /**
     * Given  D4 已選取（d3 為 isA，si:0，共 3 個選項）
     * When   地圖渲染
     * Then   顯示 2 個 data-testid="map-alt-marker"（ao[1], ao[2]）
     */
    it("should render 2 semi-transparent alt markers for the 2 unselected options", async () => {
      await selectD4();

      const altMarkers = screen.getAllByTestId("map-alt-marker");
      expect(altMarkers).toHaveLength(2);
    });
  });

  // ── TC-M4-02 ──────────────────────────────────────────────────────
  describe("TC-M4-02 ｜ 切換替代選項後仍顯示 2 個半透明標記", () => {
    /**
     * Given  D4 已選取，初始 si:0
     * When   點擊「Zà Zà 牛排」切換至 ao[1]
     * Then   仍顯示 2 個 map-alt-marker（現在是 ao[0] 與 ao[2]）
     */
    it("should still show 2 alt markers after switching to a different option", async () => {
      const user = await selectD4();

      await user.click(screen.getByRole("button", { name: "Zà Zà 牛排" }));

      const altMarkers = screen.getAllByTestId("map-alt-marker");
      expect(altMarkers).toHaveLength(2);
    });
  });

  // ── TC-M4-03 ──────────────────────────────────────────────────────
  describe("TC-M4-03 ｜ 無 isA 景點的天不顯示半透明標記", () => {
    /**
     * Given  D5 已選取（無 isA 景點）
     * When   地圖渲染
     * Then   0 個 map-alt-marker
     */
    it("should show no alt markers when day has no isA spots", async () => {
      await selectD5();

      expect(screen.queryAllByTestId("map-alt-marker")).toHaveLength(0);
    });
  });
});
