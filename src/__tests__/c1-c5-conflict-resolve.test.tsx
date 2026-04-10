/**
 * C-1 ~ C-5: 衝突解決 Conflict Resolution
 * BDD Integration Tests — TDD Red → Green
 *
 * TC-C1-01: AI 自動調整消除所有 Level-2 衝突
 * TC-C2-01: 維持不變 → 隱藏衝突面板
 * TC-C2-02: 切換天數再切回，忽略狀態保留（面板依然不顯示）
 * TC-C3-01: Level-2 景點在衝突面板中顯示「縮短時長」按鈕
 * TC-C3-02: 點擊「縮短時長」後該景點衝突解除（按鈕數減少）
 * TC-C4-01: Level-2 景點在衝突面板中顯示「移至他日」按鈕
 * TC-C4-02: 點擊「移至他日」顯示包含其他天數的 day picker
 * TC-C4-03: 在 picker 選擇目標天後景點移走，衝突數減少
 * TC-C5-01: ≥3 個 Level-2 衝突時顯示「解決精靈」按鈕
 * TC-C5-02: 點擊「解決精靈」開啟 wizard dialog
 * TC-C5-03: Wizard 內列出所有衝突景點名稱
 *
 * 前置條件：預載含衝突景點的測試行程至 localStorage
 */
import { describe, it, expect, afterEach, beforeEach } from "vitest";
import { render, screen, cleanup, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import App from "../App";

beforeEach(() => {
  localStorage.clear();
  sessionStorage.clear();
});
afterEach(() => cleanup());

// ── Test data helpers ─────────────────────────────────────────────

/** Spots where t >= cl → Level-2 hard conflict */
const SPOTS_LEVEL2 = [
  { id: "x1", nm: "景點X1", t: 550, d: 60, tr: 0, la: 0, ln: 0, cl: 540 }, // 550 >= 540 → L2
  { id: "x2", nm: "景點X2", t: 620, d: 60, tr: 0, la: 0, ln: 0, cl: 610 }, // 620 >= 610 → L2
];

const SPOTS_LEVEL3 = [
  ...SPOTS_LEVEL2,
  { id: "x3", nm: "景點X3", t: 690, d: 60, tr: 0, la: 0, ln: 0, cl: 680 }, // 690 >= 680 → L2 (3rd)
];

function setupTrip(spots: typeof SPOTS_LEVEL2) {
  const trip = { id: 99, title: "衝突測試旅程", dest: "", dates: "", img: "⚠️" };
  const days = [
    { id: 1, n: 1, dt: "test", st: "c", lb: "衝突日", sp: spots },
    { id: 2, n: 2, dt: "other", st: "c", lb: "目標日", sp: [] },
  ];
  localStorage.setItem("tb_trips", JSON.stringify([trip]));
  localStorage.setItem("tb_tripDaysMap", JSON.stringify({ 99: days }));
}

/** Login as guest → open conflict trip → click D1 */
async function openConflictDay(spots = SPOTS_LEVEL2) {
  setupTrip(spots);
  const user = userEvent.setup();
  render(<App />);
  await user.click(screen.getByText("先逛逛，稍後再登入"));
  await user.click(screen.getByText("衝突測試旅程"));
  await user.click(screen.getByText("D1"));
  return user;
}

// ─────────────────────────────────────────────────────────────────
describe("C-1: AI 自動調整", () => {

  describe("TC-C1-01 ｜ 點擊「AI 自動調整」後消除所有 Level-2 衝突", () => {
    /**
     * Given  D1 有 2 個 Level-2 衝突，衝突面板顯示
     * When   點擊「AI 自動調整」
     * Then   衝突面板消失（所有衝突降至 Level-0）
     */
    it("should auto-adjust spots and clear all Level-2 conflicts", async () => {
      const user = await openConflictDay();

      // Conflict panel visible before action
      expect(screen.getByText(/偵測到.+個衝突/)).toBeInTheDocument();

      await user.click(screen.getByRole("button", { name: "AI 自動調整" }));

      // Conflict panel gone after auto-adjust
      expect(screen.queryByText(/偵測到.+個衝突/)).not.toBeInTheDocument();
    });
  });
});

// ─────────────────────────────────────────────────────────────────
describe("C-2: 維持不變 (Keep Anyway)", () => {

  describe("TC-C2-01 ｜ 點擊「維持不變」隱藏衝突面板（spots 不變）", () => {
    /**
     * Given  D1 衝突面板已顯示
     * When   點擊「維持不變」
     * Then   衝突面板消失，景點時間未改變
     */
    it("should hide conflict panel without modifying spots", async () => {
      const user = await openConflictDay();

      expect(screen.getByText(/偵測到.+個衝突/)).toBeInTheDocument();

      await user.click(screen.getByRole("button", { name: "維持不變" }));

      expect(screen.queryByText(/偵測到.+個衝突/)).not.toBeInTheDocument();
    });
  });

  describe("TC-C2-02 ｜ 切換到 D2 再切回 D1，忽略狀態保留", () => {
    /**
     * Given  已點擊「維持不變」，D1 衝突面板已隱藏
     * When   切換至 D2 再切回 D1
     * Then   D1 衝突面板仍然不顯示（ignoredConflicts 狀態保持）
     */
    it("should retain ignored state when switching days and back", async () => {
      const user = await openConflictDay();

      await user.click(screen.getByRole("button", { name: "維持不變" }));
      expect(screen.queryByText(/偵測到.+個衝突/)).not.toBeInTheDocument();

      // Switch to D2
      await user.click(screen.getByText("D2"));
      // Switch back to D1
      await user.click(screen.getByText("D1"));

      // Panel should still be hidden
      expect(screen.queryByText(/偵測到.+個衝突/)).not.toBeInTheDocument();
    });
  });
});

// ─────────────────────────────────────────────────────────────────
describe("C-3: 縮短時長解決衝突", () => {

  describe("TC-C3-01 ｜ 衝突面板對每個 Level-2 景點顯示「縮短時長」按鈕", () => {
    /**
     * Given  D1 有 2 個 Level-2 衝突
     * When   衝突面板呈現
     * Then   至少有 1 個「縮短時長」按鈕
     */
    it("should show shorten-duration button for each Level-2 spot", async () => {
      await openConflictDay();

      const btns = screen.getAllByRole("button", { name: "縮短時長" });
      expect(btns.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe("TC-C3-02 ｜ 點擊「縮短時長」後衝突數減少", () => {
    /**
     * Given  衝突面板有 2 個「縮短時長」按鈕
     * When   點擊第一個「縮短時長」
     * Then   「縮短時長」按鈕數量減少（至少解決了 1 個衝突）
     */
    it("should resolve at least one conflict when shorten-duration is clicked", async () => {
      const user = await openConflictDay();

      const before = screen.getAllByRole("button", { name: "縮短時長" }).length;

      await user.click(screen.getAllByRole("button", { name: "縮短時長" })[0]);

      const after = screen.queryAllByRole("button", { name: "縮短時長" }).length;
      expect(after).toBeLessThan(before);
    });
  });
});

// ─────────────────────────────────────────────────────────────────
describe("C-4: 移至他日解決衝突", () => {

  describe("TC-C4-01 ｜ 衝突面板對每個 Level-2 景點顯示「移至他日」按鈕", () => {
    it("should show move-to-day button for each Level-2 spot", async () => {
      await openConflictDay();

      const btns = screen.getAllByRole("button", { name: "移至他日" });
      expect(btns.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe("TC-C4-02 ｜ 點擊「移至他日」出現天數 picker，列出其他可選天數", () => {
    /**
     * Given  D1 衝突面板有「移至他日」按鈕（測試旅程共 2 天）
     * When   點擊第一個「移至他日」
     * Then   出現 day picker（data-testid="move-day-picker"），其中含「D2」的天數按鈕
     */
    it("should show day picker with other days when move-to-day is clicked", async () => {
      const user = await openConflictDay();

      await user.click(screen.getAllByRole("button", { name: "移至他日" })[0]);

      const picker = screen.getByTestId("move-day-picker");
      expect(picker).toBeInTheDocument();
      // D2 目標日 should be listed
      expect(within(picker).getByRole("button", { name: /D2/ })).toBeInTheDocument();
    });
  });

  describe("TC-C4-03 ｜ 選擇目標天數後景點移走，衝突數減少", () => {
    /**
     * Given  Day picker 已顯示
     * When   點擊「D2 目標日」
     * Then   景點從 D1 移走，「縮短時長」按鈕數減少（衝突減少）
     */
    it("should move spot to target day and reduce conflicts in source day", async () => {
      const user = await openConflictDay();

      const beforeCount = screen.getAllByRole("button", { name: "縮短時長" }).length;

      await user.click(screen.getAllByRole("button", { name: "移至他日" })[0]);
      const picker = screen.getByTestId("move-day-picker");
      await user.click(within(picker).getByRole("button", { name: /D2/ }));

      const afterCount = screen.queryAllByRole("button", { name: "縮短時長" }).length;
      expect(afterCount).toBeLessThan(beforeCount);
    });
  });
});

// ─────────────────────────────────────────────────────────────────
describe("C-5: Level-3 解決精靈", () => {

  describe("TC-C5-01 ｜ ≥3 個 Level-2 衝突時顯示「解決精靈」按鈕", () => {
    /**
     * Given  D1 有 3 個 Level-2 衝突
     * When   衝突面板呈現
     * Then   出現「解決精靈」按鈕
     */
    it("should show resolve-wizard button when 3+ Level-2 conflicts exist", async () => {
      await openConflictDay(SPOTS_LEVEL3);
      expect(screen.getByRole("button", { name: "解決精靈" })).toBeInTheDocument();
    });
  });

  describe("TC-C5-02 ｜ 點擊「解決精靈」開啟 wizard modal", () => {
    /**
     * Given  衝突面板有「解決精靈」按鈕
     * When   點擊「解決精靈」
     * Then   出現 role="dialog" aria-label="衝突解決精靈" 的 modal
     */
    it("should open wizard dialog on resolve-wizard click", async () => {
      const user = await openConflictDay(SPOTS_LEVEL3);

      await user.click(screen.getByRole("button", { name: "解決精靈" }));

      expect(screen.getByRole("dialog", { name: "衝突解決精靈" })).toBeInTheDocument();
    });
  });

  describe("TC-C5-03 ｜ Wizard modal 列出所有衝突景點名稱", () => {
    /**
     * Given  Wizard modal 已開啟（3 個 Level-2 衝突景點）
     * When   查看 dialog 內容
     * Then   景點X1、景點X2、景點X3 的名稱均出現於 dialog 內
     */
    it("should list all conflicting spot names inside the wizard dialog", async () => {
      const user = await openConflictDay(SPOTS_LEVEL3);

      await user.click(screen.getByRole("button", { name: "解決精靈" }));

      const dialog = screen.getByRole("dialog", { name: "衝突解決精靈" });
      expect(within(dialog).getByText("景點X1")).toBeInTheDocument();
      expect(within(dialog).getByText("景點X2")).toBeInTheDocument();
      expect(within(dialog).getByText("景點X3")).toBeInTheDocument();
    });
  });
});
