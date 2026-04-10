/**
 * T-3: 時區自動推算（Timezone Auto-Inference）
 * BDD Integration Tests — TDD Red → Green
 *
 * 使用情境：用戶在新增交通 modal 填入出發地/目的地機場代碼，
 * 系統自動計算時區差並預填欄位。
 */
import { describe, it, expect, afterEach, beforeEach } from "vitest";
import { render, screen, cleanup, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import App from "../App";

beforeEach(() => localStorage.clear());
afterEach(() => cleanup());

async function openTransitModal() {
  const user = userEvent.setup();
  render(<App />);
  await user.click(screen.getByText("先逛逛，稍後再登入"));
  await user.click(screen.getByText("2026 義大利北部環狀行程"));
  await user.click(screen.getByText("D1"));
  await user.click(screen.getByText("+ 交通"));
  return user;
}

describe("TC-AUTO-01: TPE → DXB 自動推算 -4", () => {
  it("填入 dep=TPE, dest=DXB → tzOffset=-4，顯示確認標籤", async () => {
    const user = await openTransitModal();

    const depInput = screen.getByLabelText("出發地機場代碼");
    const destInput = screen.getByLabelText("目的地機場代碼");

    await user.clear(depInput);
    await user.type(depInput, "TPE");
    await user.clear(destInput);
    await user.type(destInput, "DXB");

    // tzOffset should auto-fill to -4
    const tzInput = screen.getByLabelText(/時區差/);
    expect(tzInput).toHaveValue("-4");

    // Confirmation labels
    expect(screen.getByText(/台北桃園.*UTC\+8/)).toBeInTheDocument();
    expect(screen.getByText(/杜拜.*UTC\+4/)).toBeInTheDocument();
  });
});

describe("TC-AUTO-02: NRT → CDG 自動推算 -8", () => {
  it("填入 dep=NRT, dest=CDG → tzOffset=-8", async () => {
    const user = await openTransitModal();

    await user.clear(screen.getByLabelText("出發地機場代碼"));
    await user.type(screen.getByLabelText("出發地機場代碼"), "NRT");
    await user.clear(screen.getByLabelText("目的地機場代碼"));
    await user.type(screen.getByLabelText("目的地機場代碼"), "CDG");

    const tzInput = screen.getByLabelText(/時區差/);
    expect(tzInput).toHaveValue("-8");
  });
});

describe("TC-AUTO-03: 兩欄位皆空 → tzOffset=0，無自動標籤", () => {
  it("兩欄位為空時 tzOffset 預設為 0", async () => {
    await openTransitModal();

    const tzInput = screen.getByLabelText(/時區差/);
    expect(tzInput).toHaveValue("0");
    // Should not show auto-detected badge
    expect(screen.queryByText(/自動推算/)).not.toBeInTheDocument();
  });
});

describe("TC-AUTO-04: TPE → SIN 同時區 → tzOffset=0，兩標籤均顯示", () => {
  it("同時區時 tzOffset=0 且兩端均顯示確認標籤", async () => {
    const user = await openTransitModal();

    await user.clear(screen.getByLabelText("出發地機場代碼"));
    await user.type(screen.getByLabelText("出發地機場代碼"), "TPE");
    await user.clear(screen.getByLabelText("目的地機場代碼"));
    await user.type(screen.getByLabelText("目的地機場代碼"), "SIN");

    const tzInput = screen.getByLabelText(/時區差/);
    expect(tzInput).toHaveValue("0");
    expect(screen.getByText(/台北桃園.*UTC\+8/)).toBeInTheDocument();
    expect(screen.getByText(/新加坡.*UTC\+8/)).toBeInTheDocument();
  });
});

describe("TC-AUTO-05: 自動填入後手動修改", () => {
  it("自動推算 -4 後用戶手動改為 -3，最終儲存 -3", async () => {
    const user = await openTransitModal();

    await user.clear(screen.getByLabelText("出發地機場代碼"));
    await user.type(screen.getByLabelText("出發地機場代碼"), "TPE");
    await user.clear(screen.getByLabelText("目的地機場代碼"));
    await user.type(screen.getByLabelText("目的地機場代碼"), "DXB");

    const tzInput = screen.getByLabelText(/時區差/);
    expect(tzInput).toHaveValue("-4");

    // User manually overrides
    await user.clear(tzInput);
    await user.type(tzInput, "-3");

    expect(tzInput).toHaveValue("-3");
  });
});

describe("TC-AUTO-06: 未知目的地代碼 → 無自動填入，顯示錯誤", () => {
  it("dep=TPE, dest=XYZ → 不自動填入，顯示「無法辨識」提示", async () => {
    const user = await openTransitModal();

    await user.clear(screen.getByLabelText("出發地機場代碼"));
    await user.type(screen.getByLabelText("出發地機場代碼"), "TPE");
    await user.clear(screen.getByLabelText("目的地機場代碼"));
    await user.type(screen.getByLabelText("目的地機場代碼"), "XYZ");

    // tzOffset should NOT auto-fill (stays at 0)
    const tzInput = screen.getByLabelText(/時區差/);
    expect(tzInput).toHaveValue("0");

    // Should show unknown warning
    expect(screen.getAllByText(/無法辨識/).length).toBeGreaterThan(0);
  });
});
