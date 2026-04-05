/**
 * E-2: 新增 / 刪除天數
 * BDD Integration Tests — TDD Red → Green
 *
 * TC-E2-05 依賴 E-1 的「建立旅程」功能，確保 1-day 狀態可進入 Editor
 */
import { describe, it, expect, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import App from "../App";

afterEach(() => cleanup());

// ─── Helpers ─────────────────────────────────────────────────────
/** Login as guest → click Sample Trip → enter Editor (16 days) */
async function gotoSampleEditor() {
  const user = userEvent.setup();
  render(<App />);
  await user.click(screen.getByText("先逛逛，稍後再登入"));
  await user.click(screen.getByText("2026 義大利北部環狀行程"));
  return user;
}

/** Login → create new trip → enter its Editor (1 default day) */
async function gotoNewTripEditor() {
  const user = userEvent.setup();
  render(<App />);
  await user.click(screen.getByText("先逛逛，稍後再登入"));
  await user.click(screen.getByRole("button", { name: "+ 新增行程" }));
  await user.type(screen.getByLabelText("旅程名稱"), "測試旅程");
  await user.click(screen.getByRole("button", { name: "建立" }));
  await user.click(screen.getByText("測試旅程"));
  return user;
}

// ─────────────────────────────────────────────────────────────────
describe("E-2: 新增 / 刪除天數", () => {

  // ── TC-E2-01 ────────────────────────────────────────────────────
  describe("TC-E2-01 ｜ 在編輯器新增一天", () => {
    /**
     * Given  Editor 已開啟（16 個範例天數）
     * When   點擊「+ 新增天數」
     * Then   側欄計數從 DAYS (16) 變為 DAYS (17)
     */
    it("should increment day count when '+ 新增天數' is clicked", async () => {
      const user = await gotoSampleEditor();

      expect(screen.getByText("DAYS (16)")).toBeInTheDocument();
      await user.click(screen.getByRole("button", { name: "+ 新增天數" }));
      expect(screen.getByText("DAYS (17)")).toBeInTheDocument();
    });
  });

  // ── TC-E2-02 ────────────────────────────────────────────────────
  describe("TC-E2-02 ｜ 新增天數有正確預設值", () => {
    /**
     * Given  Editor 已開啟（最大天序 n=16）
     * When   點擊「+ 新增天數」
     * Then   側欄出現 D17
     */
    it("should add a day with day number = max_n + 1", async () => {
      const user = await gotoSampleEditor();

      await user.click(screen.getByRole("button", { name: "+ 新增天數" }));

      expect(screen.getByText("D17")).toBeInTheDocument();
    });
  });

  // ── TC-E2-03 ────────────────────────────────────────────────────
  describe("TC-E2-03 ｜ 刪除有景點的天數需確認", () => {
    /**
     * Given  Day 1 含景點（桃園機場出發）
     * When   點擊 D1 刪除按鈕
     * Then   出現 alertdialog，顯示確認訊息
     */
    it("should show alertdialog when deleting a day with spots", async () => {
      const user = await gotoSampleEditor();

      await user.click(screen.getByRole("button", { name: "刪除 D1" }));

      expect(screen.getByRole("alertdialog")).toBeInTheDocument();
      expect(screen.getByText(/此天含有景點，確定要刪除/)).toBeInTheDocument();
    });

    /**
     * Given  alertdialog 已開啟
     * When   點「確認刪除」
     * Then   alertdialog 關閉，DAYS (15)
     */
    it("should remove the day after confirming deletion", async () => {
      const user = await gotoSampleEditor();

      await user.click(screen.getByRole("button", { name: "刪除 D1" }));
      await user.click(screen.getByRole("button", { name: "確認刪除" }));

      expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument();
      expect(screen.getByText("DAYS (15)")).toBeInTheDocument();
    });

    /**
     * Given  alertdialog 已開啟
     * When   點「取消」
     * Then   alertdialog 關閉，DAYS (16) 不變
     */
    it("should keep the day when cancelling deletion", async () => {
      const user = await gotoSampleEditor();

      await user.click(screen.getByRole("button", { name: "刪除 D1" }));
      await user.click(screen.getByRole("button", { name: "取消" }));

      expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument();
      expect(screen.getByText("DAYS (16)")).toBeInTheDocument();
    });
  });

  // ── TC-E2-04 ────────────────────────────────────────────────────
  describe("TC-E2-04 ｜ 刪除空天數直接移除（不需確認）", () => {
    /**
     * Given  新增一個空天數 D17
     * When   點擊 D17 的刪除按鈕
     * Then   不出現 alertdialog，直接移除，回到 DAYS (16)
     */
    it("should delete an empty day without confirmation dialog", async () => {
      const user = await gotoSampleEditor();

      await user.click(screen.getByRole("button", { name: "+ 新增天數" }));
      expect(screen.getByText("DAYS (17)")).toBeInTheDocument();

      await user.click(screen.getByRole("button", { name: "刪除 D17" }));

      expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument();
      expect(screen.getByText("DAYS (16)")).toBeInTheDocument();
    });
  });

  // ── TC-E2-05 ────────────────────────────────────────────────────
  describe("TC-E2-05 ｜ 只剩一天時不可刪除", () => {
    /**
     * Given  新建旅程進入 Editor（只有 D1）
     * When   查看 D1 的刪除按鈕
     * Then   按鈕為 disabled
     */
    it("should disable delete button when only one day remains", async () => {
      const user = await gotoNewTripEditor();

      const deleteBtn = screen.getByRole("button", { name: "刪除 D1" });
      expect(deleteBtn).toBeDisabled();
    });
  });
});
