/**
 * E-3: 新增 / 編輯 / 刪除景點
 * BDD Integration Tests — TDD Red → Green
 *
 * TC-E3-01..04: 新增景點 modal
 * TC-E3-05    : 刪除景點
 * TC-E3-06..07: 編輯景點
 *
 * 前置條件：進入 SAMPLE_TRIP Editor，選擇 D1（有景點「桃園機場出發」）
 */
import { describe, it, expect, afterEach, beforeEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import App from "../App";

beforeEach(() => localStorage.clear());
afterEach(() => cleanup());

// ── Helpers ──────────────────────────────────────────────────────
/** Login → open sample trip editor → click D1 */
async function selectD1() {
  const user = userEvent.setup();
  render(<App />);
  await user.click(screen.getByText("先逛逛，稍後再登入"));
  await user.click(screen.getByText("2026 義大利北部環狀行程"));
  await user.click(screen.getByText("D1"));
  return user;
}

// ─────────────────────────────────────────────────────────────────
describe("E-3: 新增 / 編輯 / 刪除景點", () => {

  // ── TC-E3-01 ────────────────────────────────────────────────────
  describe("TC-E3-01 ｜ 點擊「+ 新增景點」出現 modal", () => {
    /**
     * Given  Editor 已開啟，已選 D1
     * When   點擊「+ 新增景點」
     * Then   出現 modal（role="dialog"），含景點名稱輸入框
     */
    it("should open add-spot modal with name input", async () => {
      const user = await selectD1();

      await user.click(screen.getByRole("button", { name: "+ 新增景點" }));

      expect(screen.getByRole("dialog")).toBeInTheDocument();
      expect(screen.getByLabelText("景點名稱")).toBeInTheDocument();
    });
  });

  // ── TC-E3-02 ────────────────────────────────────────────────────
  describe("TC-E3-02 ｜ 填入景點名稱後成功新增", () => {
    /**
     * Given  新增景點 modal 已開啟
     * When   輸入「帕拉提尼山丘」並點「新增」
     * Then   modal 關閉，景點出現在當日清單
     */
    it("should add spot and close modal on valid submission", async () => {
      const user = await selectD1();

      await user.click(screen.getByRole("button", { name: "+ 新增景點" }));
      await user.type(screen.getByLabelText("景點名稱"), "帕拉提尼山丘");
      await user.click(screen.getByRole("button", { name: "新增" }));

      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
      expect(screen.getByText("帕拉提尼山丘")).toBeInTheDocument();
    });
  });

  // ── TC-E3-03 ────────────────────────────────────────────────────
  describe("TC-E3-03 ｜ 未填景點名稱直接送出顯示驗證錯誤", () => {
    /**
     * Given  新增景點 modal 已開啟，名稱欄位空白
     * When   點「新增」
     * Then   modal 不關閉，顯示「請輸入景點名稱」
     */
    it("should show validation error when name is empty", async () => {
      const user = await selectD1();

      await user.click(screen.getByRole("button", { name: "+ 新增景點" }));
      await user.click(screen.getByRole("button", { name: "新增" }));

      expect(screen.getByRole("dialog")).toBeInTheDocument();
      expect(screen.getByText("請輸入景點名稱")).toBeInTheDocument();
    });
  });

  // ── TC-E3-04 ────────────────────────────────────────────────────
  describe("TC-E3-04 ｜ 取消新增景點", () => {
    /**
     * Given  新增景點 modal 已開啟
     * When   點「取消」
     * Then   modal 關閉，景點清單無變化
     */
    it("should close modal without adding spot when cancel is clicked", async () => {
      const user = await selectD1();
      // D1 has 1 spot initially
      const spotsBefore = screen.getAllByRole("button", { name: /^刪除景點/ }).length;

      await user.click(screen.getByRole("button", { name: "+ 新增景點" }));
      await user.type(screen.getByLabelText("景點名稱"), "不應出現的景點");
      await user.click(screen.getByRole("button", { name: "取消" }));

      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
      expect(screen.queryByText("不應出現的景點")).not.toBeInTheDocument();
      expect(screen.getAllByRole("button", { name: /^刪除景點/ }).length).toBe(spotsBefore);
    });
  });

  // ── TC-E3-05 ────────────────────────────────────────────────────
  describe("TC-E3-05 ｜ 刪除景點", () => {
    /**
     * Given  D1 已選取（含景點「桃園機場出發」）
     * When   點擊「刪除景點 桃園機場出發」
     * Then   景點從清單消失
     */
    it("should remove spot from the day when delete button is clicked", async () => {
      const user = await selectD1();

      await user.click(screen.getByRole("button", { name: "刪除景點 桃園機場出發" }));

      expect(screen.queryByText("桃園機場出發")).not.toBeInTheDocument();
    });
  });

  // ── TC-E3-06 ────────────────────────────────────────────────────
  describe("TC-E3-06 ｜ 點擊編輯按鈕開啟 modal 並帶入現有名稱", () => {
    /**
     * Given  D1 已選取（含景點「桃園機場出發」）
     * When   點擊「編輯景點 桃園機場出發」
     * Then   modal 開啟，景點名稱欄位預填「桃園機場出發」
     */
    it("should open edit modal pre-filled with current spot name", async () => {
      const user = await selectD1();

      await user.click(screen.getByRole("button", { name: "編輯景點 桃園機場出發" }));

      expect(screen.getByRole("dialog")).toBeInTheDocument();
      expect(screen.getByLabelText("景點名稱")).toHaveValue("桃園機場出發");
    });
  });

  // ── TC-E3-07 ────────────────────────────────────────────────────
  describe("TC-E3-07 ｜ 儲存編輯後景點名稱更新", () => {
    /**
     * Given  編輯景點 modal 已開啟
     * When   修改名稱為「松山機場出發」並點「儲存」
     * Then   modal 關閉，景點名稱更新
     */
    it("should update spot name after saving edit", async () => {
      const user = await selectD1();

      await user.click(screen.getByRole("button", { name: "編輯景點 桃園機場出發" }));
      const input = screen.getByLabelText("景點名稱");
      await user.clear(input);
      await user.type(input, "松山機場出發");
      await user.click(screen.getByRole("button", { name: "儲存" }));

      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
      expect(screen.getByText("松山機場出發")).toBeInTheDocument();
      expect(screen.queryByText("桃園機場出發")).not.toBeInTheDocument();
    });
  });
});
