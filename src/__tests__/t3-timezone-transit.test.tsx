/**
 * T-3: 時區感知交通（Timezone-aware Transit）
 * BDD Integration Tests — TDD Red → Green
 *
 * TC-T3-01: depTz=arrTz（台北→台北），23:50 + 8h45m → 次日 08:35（行為不變）
 * TC-T3-02: 台北(UTC+8) → 杜拜(UTC+4)，23:50 + 8h45m → 次日 04:35
 * TC-T3-03: 出發卡顯示時區差 badge（-4h）
 * TC-T3-04: 新加坡(UTC+8) → 東京(UTC+9)，同天→跨夜
 * TC-T3-05: 日本(UTC+9) → 杜拜(UTC+4)，跨夜→同天
 */
import { describe, it, expect, afterEach, beforeEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import App from "../App";

beforeEach(() => localStorage.clear());
afterEach(() => cleanup());

async function selectD1() {
  const user = userEvent.setup();
  render(<App />);
  await user.click(screen.getByText("先逛逛，稍後再登入"));
  await user.click(screen.getByText("2026 義大利北部環狀行程"));
  await user.click(screen.getByText("D1"));
  return user;
}

/**
 * @param dep   出發地 IATA 代碼（如 "TPE"），undefined = 不填
 * @param dest  目的地 IATA 代碼（如 "DXB"），undefined = 不填
 */
async function fillTransitForm(
  user: ReturnType<typeof userEvent.setup>,
  name: string,
  time: string,
  hours: number,
  mins: number,
  dep?: string,
  dest?: string,
) {
  await user.click(screen.getByRole("button", { name: "+ 交通" }));
  await user.type(screen.getByLabelText("交通名稱"), name);

  const timeInput = screen.getByLabelText("開始時間");
  await user.clear(timeInput);
  await user.type(timeInput, time);

  const hoursInput = screen.getByLabelText("小時");
  await user.clear(hoursInput);
  await user.type(hoursInput, String(hours));

  const minsInput = screen.getByLabelText("分鐘");
  await user.clear(minsInput);
  await user.type(minsInput, String(mins));

  if (dep !== undefined) {
    const depInput = screen.getByLabelText("出發地機場代碼");
    await user.clear(depInput);
    await user.type(depInput, dep);
  }
  if (dest !== undefined) {
    const destInput = screen.getByLabelText("目的地機場代碼");
    await user.clear(destInput);
    await user.type(destInput, dest);
  }

  await user.click(screen.getByRole("button", { name: "新增" }));
}

// ─────────────────────────────────────────────────────────────────
describe("T-3: 時區感知交通", () => {

  // ── TC-T3-01 ─────────────────────────────────────────────────────
  describe("TC-T3-01 ｜ 出發=目的地時區（無時差），行為不變", () => {
    /**
     * Given  D1 已選取
     * When   新增交通「阿聯酋 EK068」23:50 + 8h45m，出發地=目的地=台北(UTC+8)
     * Then   出發卡顯示 08:35 次日（不受時區影響）
     */
    it("should show 08:35 next day when departure and arrival tz are the same", async () => {
      const user = await selectD1();
      await fillTransitForm(user, "阿聯酋 EK068", "23:50", 8, 45, "TPE", "TSA");

      const depCard = screen.getByTestId("transit-departure");
      expect(depCard).toHaveTextContent("08:35");
      expect(depCard).toHaveTextContent("+1天");
    });
  });

  // ── TC-T3-02 ─────────────────────────────────────────────────────
  describe("TC-T3-02 ｜ 台北(UTC+8) → 杜拜(UTC+4)，23:50 + 8h45m → 次日 04:35", () => {
    /**
     * Given  D1 已選取
     * When   新增交通「阿聯酋 EK068」23:50 + 8h45m，出發=TPE(UTC+8)，目的=DXB(UTC+4)
     * Then   出發卡顯示 04:35 次日（時差 -4h 修正後）
     */
    it("should show 04:35 next day when flying Taipei(+8) to Dubai(+4)", async () => {
      const user = await selectD1();
      await fillTransitForm(user, "阿聯酋 EK068", "23:50", 8, 45, "TPE", "DXB");

      const depCard = screen.getByTestId("transit-departure");
      expect(depCard).toHaveTextContent("04:35");
      expect(depCard).toHaveTextContent("+1天");
    });
  });

  // ── TC-T3-03 ─────────────────────────────────────────────────────
  describe("TC-T3-03 ｜ 出發卡顯示時差 badge（如「-4h」）", () => {
    /**
     * Given  台北→杜拜（時差 -4h）
     * When   查看出發卡
     * Then   出發卡內含「-4h」badge
     */
    it("should show -4h badge on departure card for Taipei→Dubai", async () => {
      const user = await selectD1();
      await fillTransitForm(user, "阿聯酋 EK068", "23:50", 8, 45, "TPE", "DXB");

      const depCard = screen.getByTestId("transit-departure");
      expect(depCard).toHaveTextContent("-4h");
    });
  });

  // ── TC-T3-04 ─────────────────────────────────────────────────────
  describe("TC-T3-04 ｜ 新加坡(UTC+8) → 東京(UTC+9)，同天→跨夜", () => {
    /**
     * Given  D1 已選取
     * When   新增交通 22:00 + 2h，出發=SIN(UTC+8)，目的=NRT(UTC+9)
     *        純飛行時間：22:00+2h=24:00（+1h）= 次日 01:00
     * Then   出現 transit-departure 卡片，顯示 01:00 與 +1天
     */
    it("should create cross-midnight transit when timezone pushes arrival past midnight", async () => {
      const user = await selectD1();
      await fillTransitForm(user, "酷航 TR810", "22:00", 2, 0, "SIN", "NRT");

      const depCard = screen.getByTestId("transit-departure");
      expect(depCard).toBeInTheDocument();
      expect(depCard).toHaveTextContent("01:00");
      expect(depCard).toHaveTextContent("+1天");
    });
  });

  // ── TC-T3-05 ─────────────────────────────────────────────────────
  describe("TC-T3-05 ｜ 日本(UTC+9) → 杜拜(UTC+4)，跨夜→同天", () => {
    /**
     * Given  D1 已選取
     * When   新增交通 23:00 + 2h，出發=NRT(UTC+9)，目的=DXB(UTC+4)
     *        純飛行：23:00+2h=01:00 次日；時差 -5h：01:00-5h=20:00 同天
     * Then   出現 transit-item（同天），不出現 transit-departure
     */
    it("should create same-day transit when negative timezone pulls arrival before midnight", async () => {
      const user = await selectD1();
      await fillTransitForm(user, "阿聯酋 EK318", "23:00", 2, 0, "NRT", "DXB");

      expect(screen.getByTestId("transit-item")).toBeInTheDocument();
      expect(screen.queryByTestId("transit-departure")).not.toBeInTheDocument();
    });
  });
});
