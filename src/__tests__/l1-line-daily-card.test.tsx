/**
 * L-1: LINE 每日行程卡推播
 * TDD Integration + Unit Tests — Red → Green
 */
import { describe, it, expect, afterEach, beforeEach, vi } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import App from "../App";
import { formatDayCard } from "../utils/lineCard";
import { fetchWeather } from "../utils/weather";
import type { Day } from "../types";
import type { WeatherData } from "../utils/weather";

beforeEach(() => {
  localStorage.clear();
  sessionStorage.clear();
});
afterEach(() => cleanup());

/** Navigate from Login view → Trips list view as guest */
async function gotoTripsPage() {
  const user = userEvent.setup();
  render(<App />);
  await user.click(screen.getByText("先逛逛，稍後再登入"));
  return user;
}

/** Navigate to editor with sample trip's first day selected */
async function gotoEditorWithDay() {
  const user = userEvent.setup();
  render(<App />);
  await user.click(screen.getByText("先逛逛，稍後再登入"));
  // Click the first trip card
  const cards = screen.getAllByTestId("trip-card");
  await user.click(cards[0]);
  // Select day 1
  await user.click(screen.getByText("D1"));
  return user;
}

// ── Sample data ──────────────────────────────────────────────────
const sampleDay: Day = {
  id: 4,
  n: 4,
  dt: "8/12 三",
  st: "c",
  lb: "佛羅倫斯博物館日",
  sp: [
    { id: "d1", nm: "烏菲茲美術館", t: 540, d: 180, tr: 10, la: 43.77, ln: 11.26 },
    { id: "d2", nm: "領主廣場", t: 730, d: 60, tr: 5, la: 43.77, ln: 11.26 },
  ],
};

const sampleWeather: WeatherData = {
  maxTemp: 32,
  minTemp: 18,
  weatherCode: 0,
  emoji: "☀️",
  desc: "晴天",
};

// ─────────────────────────────────────────────────────────────────
describe("L-1: LINE 每日行程卡推播", () => {

  // ── TC-L1-01 ────────────────────────────────────────────────────
  describe("TC-L1-01 ｜ trips view 有 LINE 設定按鈕", () => {
    /**
     * Given  用戶在旅程列表頁
     * When   頁面載入
     * Then   顯示含 "LINE" 字樣的按鈕
     */
    it("should show a LINE button in trips view", async () => {
      await gotoTripsPage();
      expect(screen.getByRole("button", { name: /LINE/ })).toBeInTheDocument();
    });
  });

  // ── TC-L1-02 ────────────────────────────────────────────────────
  describe("TC-L1-02 ｜ 輸入 token 儲存後 localStorage 更新", () => {
    /**
     * Given  LINE 設定 modal 已開啟
     * When   輸入 token 並儲存
     * Then   localStorage["tb_line_token"] === "test-token"
     */
    it("should persist token to localStorage on save", async () => {
      const user = await gotoTripsPage();
      await user.click(screen.getByRole("button", { name: /LINE/ }));
      const input = screen.getByPlaceholderText(/貼上個人存取權杖|Paste personal access token/);
      await user.clear(input);
      await user.type(input, "test-token");
      await user.click(screen.getByRole("button", { name: /儲存|Save/ }));
      expect(localStorage.getItem("tb_line_token")).toBe("test-token");
    });
  });

  // ── TC-L1-03 ────────────────────────────────────────────────────
  describe("TC-L1-03 ｜ formatDayCard 含景點名與日期", () => {
    /**
     * Given  sampleDay（8/12 三）
     * When   formatDayCard(sampleDay, 2026, null)
     * Then   結果含日期 "2026/8/12" 與景點名 "烏菲茲美術館"
     */
    it("should include date and spot names in the card", () => {
      const card = formatDayCard(sampleDay, 2026, null);
      expect(card).toContain("2026/8/12");
      expect(card).toContain("烏菲茲美術館");
      expect(card).toContain("領主廣場");
    });
  });

  // ── TC-L1-04 ────────────────────────────────────────────────────
  describe("TC-L1-04 ｜ formatDayCard 含天氣資訊", () => {
    /**
     * Given  sampleDay + sampleWeather
     * When   formatDayCard(sampleDay, 2026, sampleWeather)
     * Then   結果含 emoji "☀️" 及 "32"（maxTemp）
     */
    it("should include weather data when provided", () => {
      const card = formatDayCard(sampleDay, 2026, sampleWeather);
      expect(card).toContain("☀️");
      expect(card).toContain("32");
      expect(card).toContain("18");
    });
  });

  // ── TC-L1-05 ────────────────────────────────────────────────────
  describe("TC-L1-05 ｜ fetchWeather 呼叫正確 Open-Meteo URL", () => {
    /**
     * Given  mock fetch
     * When   fetchWeather(43.77, 11.26, "2026-08-12")
     * Then   fetch 呼叫的 URL 含 latitude=43.77 & longitude=11.26
     */
    it("should call Open-Meteo API with correct lat/lng", async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          daily: {
            time: ["2026-08-12"],
            weathercode: [0],
            temperature_2m_max: [32],
            temperature_2m_min: [18],
          },
        }),
      });
      vi.stubGlobal("fetch", mockFetch);

      await fetchWeather(43.77, 11.26, "2026-08-12");

      expect(mockFetch).toHaveBeenCalled();
      const url: string = mockFetch.mock.calls[0][0];
      expect(url).toContain("latitude=43.77");
      expect(url).toContain("longitude=11.26");
      expect(url).toContain("open-meteo.com");

      vi.unstubAllGlobals();
    });
  });

  // ── TC-L1-06 ────────────────────────────────────────────────────
  describe("TC-L1-06 ｜ editor 出現「傳送今日行程」按鈕", () => {
    /**
     * Given  已在 editor 並選擇有景點的天
     * When   頁面渲染完成
     * Then   頂部顯示「傳送今日行程」按鈕
     */
    it("should show send-today button when a day with spots is selected", async () => {
      await gotoEditorWithDay();
      expect(
        screen.getByRole("button", { name: /傳送今日行程|Send today/ })
      ).toBeInTheDocument();
    });
  });
});
