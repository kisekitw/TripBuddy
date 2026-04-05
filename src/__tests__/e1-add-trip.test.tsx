/**
 * E-1: 新增旅程
 * BDD Integration Tests — TDD Red → Green
 *
 * Convention:
 *   Given / When / Then per test case
 */
import { describe, it, expect, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import App from "../App";

afterEach(() => cleanup());

// ─── Helper ───────────────────────────────────────────────────────
/** Navigate from Login view → Trips list view as guest */
async function gotoTripsPage() {
  const user = userEvent.setup();
  render(<App />);
  await user.click(screen.getByText("先逛逛，稍後再登入"));
  return user;
}

// ─────────────────────────────────────────────────────────────────
describe("E-1: 新增旅程", () => {

  // ── TC-E1-01 ────────────────────────────────────────────────────
  describe("TC-E1-01 ｜ 點擊「+ 新增行程」出現建立表單", () => {
    /**
     * Given  用戶在旅程列表頁
     * When   點擊「+ 新增行程」按鈕
     * Then   出現含「旅程名稱」輸入欄的 modal（role="dialog"）
     */
    it("should show a create-trip modal with a title input", async () => {
      const user = await gotoTripsPage();

      await user.click(screen.getByRole("button", { name: "+ 新增行程" }));

      expect(screen.getByRole("dialog")).toBeInTheDocument();
      expect(screen.getByLabelText("旅程名稱")).toBeInTheDocument();
    });
  });

  // ── TC-E1-02 ────────────────────────────────────────────────────
  describe("TC-E1-02 ｜ 填入必填欄位後成功建立旅程", () => {
    /**
     * Given  建立旅程 modal 已開啟
     * When   輸入旅程標題並點「建立」
     * Then   modal 關閉，旅程列表出現新卡片
     */
    it("should close modal and add a new trip card on valid submission", async () => {
      const user = await gotoTripsPage();

      await user.click(screen.getByRole("button", { name: "+ 新增行程" }));
      await user.type(screen.getByLabelText("旅程名稱"), "東京五日遊");
      await user.click(screen.getByRole("button", { name: "建立" }));

      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
      expect(screen.getByText("東京五日遊")).toBeInTheDocument();
    });
  });

  // ── TC-E1-03 ────────────────────────────────────────────────────
  describe("TC-E1-03 ｜ 未填標題直接送出顯示驗證錯誤", () => {
    /**
     * Given  建立旅程 modal 已開啟，標題欄位空白
     * When   點「建立」
     * Then   modal 不關閉，顯示「請輸入旅程名稱」
     */
    it("should show validation error and keep modal open when title is empty", async () => {
      const user = await gotoTripsPage();

      await user.click(screen.getByRole("button", { name: "+ 新增行程" }));
      await user.click(screen.getByRole("button", { name: "建立" }));

      expect(screen.getByRole("dialog")).toBeInTheDocument();
      expect(screen.getByText("請輸入旅程名稱")).toBeInTheDocument();
    });
  });

  // ── TC-E1-04 ────────────────────────────────────────────────────
  describe("TC-E1-04 ｜ 取消建立旅程", () => {
    /**
     * Given  建立旅程 modal 已開啟
     * When   點「取消」
     * Then   modal 關閉，旅程卡片數量不變
     */
    it("should close modal without adding a trip when cancel is clicked", async () => {
      const user = await gotoTripsPage();
      const before = screen.getAllByTestId("trip-card").length;

      await user.click(screen.getByRole("button", { name: "+ 新增行程" }));
      await user.type(screen.getByLabelText("旅程名稱"), "不應出現");
      await user.click(screen.getByRole("button", { name: "取消" }));

      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
      expect(screen.queryByText("不應出現")).not.toBeInTheDocument();
      expect(screen.getAllByTestId("trip-card").length).toBe(before);
    });
  });

  // ── TC-E1-05 ────────────────────────────────────────────────────
  describe("TC-E1-05 ｜ 建立後可立即進入編輯器", () => {
    /**
     * Given  成功建立新旅程
     * When   點擊新旅程卡片
     * Then   進入 Editor，側欄顯示 DAYS (1)
     */
    it("should open editor with 1 default day after clicking the new trip card", async () => {
      const user = await gotoTripsPage();

      await user.click(screen.getByRole("button", { name: "+ 新增行程" }));
      await user.type(screen.getByLabelText("旅程名稱"), "東京五日遊");
      await user.click(screen.getByRole("button", { name: "建立" }));

      await user.click(screen.getByText("東京五日遊"));

      expect(screen.getByText("DAYS (1)")).toBeInTheDocument();
    });
  });
});
