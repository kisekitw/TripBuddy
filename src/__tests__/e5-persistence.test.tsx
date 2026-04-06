/**
 * E-5: 儲存行程（localStorage），讓資料不因重新整理而消失
 * BDD Integration Tests — TDD Red → Green
 */
import { describe, it, expect, afterEach, beforeEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import App from "../App";

beforeEach(() => localStorage.clear());
afterEach(() => cleanup());

describe("E-5: 行程資料 localStorage 持久化", () => {

  // ── TC-E5-01 ────────────────────────────────────────────────────
  describe("TC-E5-01 ｜ 建立旅程後重新掛載 App 仍顯示旅程", () => {
    /**
     * Given  用戶建立新旅程「東京行」
     * When   cleanup + 重新 render App（模擬重新整理）
     * Then   旅程列表仍可見「東京行」
     */
    it("should persist new trip across App remount", async () => {
      const user = userEvent.setup();
      render(<App />);
      await user.click(screen.getByText("先逛逛，稍後再登入"));
      await user.click(screen.getByRole("button", { name: "+ 新增行程" }));
      await user.type(screen.getByLabelText("旅程名稱"), "東京行");
      await user.click(screen.getByRole("button", { name: "建立" }));
      expect(screen.getByText("東京行")).toBeInTheDocument();

      // Simulate refresh
      cleanup();
      render(<App />);
      await user.click(screen.getByText("先逛逛，稍後再登入"));

      expect(screen.getByText("東京行")).toBeInTheDocument();
    });
  });

  // ── TC-E5-02 ────────────────────────────────────────────────────
  describe("TC-E5-02 ｜ 新增天數後重新掛載 App 天數仍保留", () => {
    /**
     * Given  進入 SAMPLE_TRIP 編輯器，新增一天（DAYS 16→17），返回旅程列表
     * When   cleanup + 重新 render App（模擬重新整理）並再次進入旅程
     * Then   側欄顯示 DAYS (17)
     */
    it("should persist added day to localStorage after navigating back", async () => {
      const user = userEvent.setup();
      render(<App />);
      await user.click(screen.getByText("先逛逛，稍後再登入"));
      await user.click(screen.getByText("2026 義大利北部環狀行程"));
      await user.click(screen.getByRole("button", { name: "+ 新增天數" }));
      expect(screen.getByText("DAYS (17)")).toBeInTheDocument();
      // Navigate back — triggers setTripDaysMap which fires useEffect → localStorage
      await user.click(screen.getByText("← 我的行程"));

      // Simulate refresh
      cleanup();
      render(<App />);
      await user.click(screen.getByText("先逛逛，稍後再登入"));
      await user.click(screen.getByText("2026 義大利北部環狀行程"));

      expect(screen.getByText("DAYS (17)")).toBeInTheDocument();
    });
  });

  // ── TC-E5-03 ────────────────────────────────────────────────────
  describe("TC-E5-03 ｜ localStorage 清空後 fallback 顯示預設旅程", () => {
    /**
     * Given  localStorage 為空（beforeEach 已 clear）
     * When   render App → 進入旅程列表
     * Then   仍顯示預設範例旅程「2026 義大利北部環狀行程」
     */
    it("should show SAMPLE_TRIP when localStorage is empty", async () => {
      const user = userEvent.setup();
      render(<App />);
      await user.click(screen.getByText("先逛逛，稍後再登入"));

      expect(screen.getByText("2026 義大利北部環狀行程")).toBeInTheDocument();
    });
  });
});
