/**
 * M-5: Google Directions API 取得真實交通時間
 * BDD Tests — TDD Red → Green
 *
 * TC-M5-01: fetchTransitMinutes 在 apiKey 為空時回傳 null
 * TC-M5-02: fetchTransitMinutes 呼叫正確 URL 並回傳分鐘數
 * TC-M5-03: fetchTransitMinutes 在網路錯誤時回傳 null
 * TC-M5-04: MapView 掛載後（apiKey 有效）對每段路線呼叫 fetch
 * TC-M5-05: onTransitUpdate 以正確 spotId 與分鐘數被呼叫
 */
import React from "react";
import { describe, it, expect, afterEach, beforeEach, vi } from "vitest";
import { render, cleanup, waitFor } from "@testing-library/react";
import { fetchTransitMinutes } from "../utils/directions";
import { MapView } from "../components/MapView";
import { SAMPLE_DAYS } from "../data/sampleTrip";

beforeEach(() => localStorage.clear());
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

vi.mock("react-leaflet", () => ({
  MapContainer: ({ children }: { children?: React.ReactNode }) => (
    <div>{children}</div>
  ),
  TileLayer: () => null,
  Marker: ({ children, "aria-label": ariaLabel, "data-testid": testId, interactive }: any) => (
    <div
      data-testid={testId ?? (interactive === false ? "map-transit-label" : "map-marker")}
      aria-label={ariaLabel}
    >
      {children}
    </div>
  ),
  Popup: ({ children }: { children?: React.ReactNode }) => (
    <div>{children}</div>
  ),
  Polyline: () => <div />,
  useMap: () => ({ fitBounds: vi.fn(), setView: vi.fn() }),
}));

// ── Unit tests: fetchTransitMinutes ──────────────────────────────

describe("M-5: Directions API", () => {

  // ── TC-M5-01 ────────────────────────────────────────────────────
  describe("TC-M5-01 ｜ apiKey 為空時回傳 null", () => {
    /**
     * Given  apiKey = ""
     * When   呼叫 fetchTransitMinutes
     * Then   回傳 null，不發出 fetch 請求
     */
    it("should return null without fetching when apiKey is empty", async () => {
      const mockFetch = vi.fn();
      vi.stubGlobal("fetch", mockFetch);

      const result = await fetchTransitMinutes([43.77, 11.26], [43.72, 10.40], "");

      expect(result).toBeNull();
      expect(mockFetch).not.toHaveBeenCalled();
    });
  });

  // ── TC-M5-02 ────────────────────────────────────────────────────
  describe("TC-M5-02 ｜ 呼叫正確 URL 並回傳分鐘數", () => {
    /**
     * Given  apiKey = "test-key"，Google 回傳 duration.value = 2400（秒）
     * When   呼叫 fetchTransitMinutes([43.77, 11.26], [43.72, 10.40], "test-key")
     * Then   fetch URL 包含 origin / destination / key；回傳 40（分鐘）
     */
    it("should call Google Directions URL and return duration in minutes", async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: vi.fn().mockResolvedValue({
          routes: [{ legs: [{ duration: { value: 2400 } }] }],
        }),
      });
      vi.stubGlobal("fetch", mockFetch);

      const result = await fetchTransitMinutes([43.77, 11.26], [43.72, 10.40], "test-key");

      expect(result).toBe(40);
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining("maps.googleapis.com/maps/api/directions"),
      );
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining("key=test-key"),
      );
    });
  });

  // ── TC-M5-03 ────────────────────────────────────────────────────
  describe("TC-M5-03 ｜ 網路錯誤時回傳 null", () => {
    /**
     * Given  fetch 拋出錯誤
     * When   呼叫 fetchTransitMinutes
     * Then   回傳 null（不拋出例外）
     */
    it("should return null when fetch throws a network error", async () => {
      vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("Network error")));

      const result = await fetchTransitMinutes([43.77, 11.26], [43.72, 10.40], "test-key");

      expect(result).toBeNull();
    });
  });

  // ── TC-M5-04 ────────────────────────────────────────────────────
  describe("TC-M5-04 ｜ MapView 掛載後對每段路線呼叫 fetch", () => {
    /**
     * Given  D5（4 個景點，3 段路線），apiKey="test-key"
     * When   MapView 掛載
     * Then   fetch 被呼叫 3 次（每段路線一次）
     */
    it("should call fetch once per segment on mount", async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: vi.fn().mockResolvedValue({
          routes: [{ legs: [{ duration: { value: 1800 } }] }],
        }),
      });
      vi.stubGlobal("fetch", mockFetch);

      const day = SAMPLE_DAYS[4]; // D5: 4 spots → 3 segments
      render(
        <MapView day={day} dayIndex={4} apiKey="test-key" onTransitUpdate={vi.fn()} />,
      );

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledTimes(3);
      });
    });
  });

  // ── TC-M5-05 ────────────────────────────────────────────────────
  describe("TC-M5-05 ｜ onTransitUpdate 以正確 spotId 與分鐘數被呼叫", () => {
    /**
     * Given  D5，duration.value = 1800（30 分鐘），apiKey="test-key"
     * When   MapView 掛載並 fetch 完成
     * Then   onTransitUpdate 被呼叫，第一次呼叫傳入 "e1" 與 30
     */
    it("should call onTransitUpdate with correct spotId and minutes", async () => {
      vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
        ok: true,
        json: vi.fn().mockResolvedValue({
          routes: [{ legs: [{ duration: { value: 1800 } }] }],
        }),
      }));

      const day = SAMPLE_DAYS[4]; // D5: spots e1, e2, e3, e4
      const onTransitUpdate = vi.fn();
      render(
        <MapView day={day} dayIndex={4} apiKey="test-key" onTransitUpdate={onTransitUpdate} />,
      );

      await waitFor(() => {
        expect(onTransitUpdate).toHaveBeenCalledWith("e1", 30);
      });
    });
  });
});
