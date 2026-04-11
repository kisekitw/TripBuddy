/**
 * M-2: 地圖景點路線 + 交通時間標籤
 * BDD Integration Tests — TDD Red → Green
 *
 * 使用 D5（托斯卡尼一日遊）：4 個景點，3 段路線
 * e1.tr=0（無標籤），e2.tr=60（"1h"），e3.tr=40（"40m"） → 2 個標籤
 */
import React from "react";
import { describe, it, expect, afterEach, beforeEach, vi } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
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
async function gotoSampleEditor() {
  const user = userEvent.setup();
  render(<App />);
  await user.click(screen.getByText("先逛逛，稍後再登入"));
  await user.click(screen.getByText("2026 義大利北部環狀行程"));
  return user;
}

/** gotoSampleEditor + select Day 5（托斯卡尼一日遊，4 個景點） */
async function selectD5() {
  const user = await gotoSampleEditor();
  await user.click(screen.getByText("D5"));
  return user;
}

// ─────────────────────────────────────────────────────────────────
describe("M-2: 地圖景點路線 + 交通時間標籤", () => {

  // ── TC-M2-01 ────────────────────────────────────────────────────
  describe("TC-M2-01 ｜ 正確顯示 N-1 段路線", () => {
    /**
     * Given  D5（4 個景點）已選取
     * When   地圖渲染
     * Then   出現 3 段 data-testid="map-polyline"（N-1 = 4-1 = 3）
     */
    it("should render N-1 polyline segments for D5 with 4 spots", async () => {
      await selectD5();

      const polylines = screen.getAllByTestId("map-polyline");
      expect(polylines.length).toBe(3);
    });
  });

  // ── TC-M2-02 ────────────────────────────────────────────────────
  describe("TC-M2-02 ｜ tr=0 的路段不顯示標籤", () => {
    /**
     * Given  D5（e1.tr=0，e2.tr=60，e3.tr=40）已選取
     * When   地圖渲染
     * Then   只顯示 2 個 map-transit-label（e1 那段不顯示）
     */
    it("should show only 2 transit labels (tr=0 segment skipped)", async () => {
      await selectD5();

      const labels = screen.getAllByTestId("map-transit-label");
      expect(labels.length).toBe(2);
    });
  });

  // ── TC-M2-03 ────────────────────────────────────────────────────
  describe("TC-M2-03 ｜ tr=60 顯示 '1h' 標籤", () => {
    /**
     * Given  D5 已選取，e2.tr=60
     * When   地圖渲染
     * Then   第 1 個 map-transit-label 的 aria-label === "1h"
     */
    it("should display '1h' label for the 60-minute transit segment", async () => {
      await selectD5();

      const labels = screen.getAllByTestId("map-transit-label");
      expect(labels[0]).toHaveAttribute("aria-label", "1h");
    });
  });

  // ── TC-M2-04 ────────────────────────────────────────────────────
  describe("TC-M2-04 ｜ tr=40 顯示 '40m' 標籤", () => {
    /**
     * Given  D5 已選取，e3.tr=40
     * When   地圖渲染
     * Then   第 2 個 map-transit-label 的 aria-label === "40m"
     */
    it("should display '40m' label for the 40-minute transit segment", async () => {
      await selectD5();

      const labels = screen.getAllByTestId("map-transit-label");
      expect(labels[1]).toHaveAttribute("aria-label", "40m");
    });
  });
});
