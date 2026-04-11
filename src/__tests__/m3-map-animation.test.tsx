/**
 * M-3: 切換日方案 (Type A) 時地圖景點路線切換動畫
 * BDD Integration Tests — TDD Red → Green
 *
 * 使用 D8（威尼斯→東多洛米蒂，不確定天）:
 *   方案A — 密蘇里那湖＋布萊埃斯湖：6 個景點
 *   方案B — Cortina小鎮半日：4 個景點
 *
 * TC-M3-01: D8 (方案A active) → 6 markers
 * TC-M3-02: 切換至方案B → 4 markers
 * TC-M3-03: map-container 含 data-variant="0"（方案A）
 * TC-M3-04: 切換後 data-variant="1"（方案B）
 */
import React from "react";
import { describe, it, expect, afterEach, beforeEach, vi } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import App from "../App";

beforeEach(() => localStorage.clear());
afterEach(() => cleanup());

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

async function selectD8() {
  const user = userEvent.setup();
  render(<App />);
  await user.click(screen.getByText("先逛逛，稍後再登入"));
  await user.click(screen.getByText("2026 義大利北部環狀行程"));
  await user.click(screen.getByText("D8"));
  return user;
}

describe("M-3: 切換日方案時地圖切換動畫", () => {

  // ── TC-M3-01 ──────────────────────────────────────────────────────
  describe("TC-M3-01 ｜ D8 方案A 初始顯示 6 個地圖標記", () => {
    /**
     * Given  Editor 已開啟，選取 D8（不確定天）
     * When   預設方案A（av=0）active
     * Then   地圖顯示 6 個 map-marker
     */
    it("should render 6 markers for variant A (6 spots)", async () => {
      await selectD8();

      const markers = screen.getAllByTestId("map-marker");
      expect(markers).toHaveLength(6);
    });
  });

  // ── TC-M3-02 ──────────────────────────────────────────────────────
  describe("TC-M3-02 ｜ 切換至方案B 後地圖顯示 4 個標記", () => {
    /**
     * Given  D8 已選取，目前顯示方案A（6 markers）
     * When   點擊「方案B — Cortina小鎮半日」
     * Then   地圖更新為 4 個 map-marker
     */
    it("should update to 4 markers after switching to variant B", async () => {
      const user = await selectD8();

      await user.click(screen.getByText("方案B — Cortina小鎮半日"));

      const markers = screen.getAllByTestId("map-marker");
      expect(markers).toHaveLength(4);
    });
  });

  // ── TC-M3-03 ──────────────────────────────────────────────────────
  describe("TC-M3-03 ｜ map-container 初始帶有 data-variant=\"0\"", () => {
    /**
     * Given  D8 已選取，方案A active
     * When   地圖渲染
     * Then   data-testid="map-container" 元素有 data-variant="0"
     */
    it("should have data-variant='0' attribute on map container for variant A", async () => {
      await selectD8();

      expect(screen.getByTestId("map-container")).toHaveAttribute("data-variant", "0");
    });
  });

  // ── TC-M3-04 ──────────────────────────────────────────────────────
  describe("TC-M3-04 ｜ 切換方案B 後 data-variant 更新為 \"1\"", () => {
    /**
     * Given  D8 已選取，目前 data-variant="0"
     * When   點擊「方案B」
     * Then   map-container 的 data-variant 更新為 "1"
     */
    it("should update data-variant to '1' after switching to variant B", async () => {
      const user = await selectD8();

      await user.click(screen.getByText("方案B — Cortina小鎮半日"));

      expect(screen.getByTestId("map-container")).toHaveAttribute("data-variant", "1");
    });
  });
});
