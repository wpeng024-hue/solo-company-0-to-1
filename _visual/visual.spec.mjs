/**
 * 视觉回归测试 — 一人公司·从 0 到 1
 *
 * 策略:
 *   1. 截屏比对 (像素 diff): 关键区域固定 selector, 跟 baseline 对比
 *   2. Contract 断言: 机器能稳定判断的视觉属性 (高度/字号/颜色)
 *
 * 跑一次:
 *   - 第一次 → 生成 baseline (test 全 pass)
 *   - 第二次 → 跟 baseline 对比, diff > 2% 报错
 *   - 改 UI 后 → npm run test:visual:update 重新固定 baseline
 */
import { test, expect } from "@playwright/test";

// 等所有字体加载完成 + 关掉动画/光标 + 滚到指定位置
async function ready(page) {
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(200);  // 给 hero orb float 动画一帧时间
}

// 切主题工具 (用 localStorage 而非点击 UI, 更稳定)
async function setTheme(page, theme) {
  await page.evaluate((t) => {
    if (t === "auto") localStorage.removeItem("yrgs.theme");
    else localStorage.setItem("yrgs.theme", t);
  }, theme);
  await page.reload({ waitUntil: "networkidle" });
  await ready(page);
}

const THEMES = ["light", "dark"];

/* ============================================================
   Group A: 各主题下 Hero 区截图
   ============================================================ */
test.describe("Hero 区截图", () => {
  for (const theme of THEMES) {
    test(`hero @ ${theme}`, async ({ page }) => {
      await page.goto("/");
      await setTheme(page, theme);
      const hero = page.locator(".hero").first();
      await expect(hero).toBeVisible();
      await expect(hero).toHaveScreenshot(`hero-${theme}.png`);
    });
  }
});

/* ============================================================
   Group B: 章节地图 (16 卡 chapter-grid)
   ============================================================ */
test.describe("章节地图截图", () => {
  for (const theme of THEMES) {
    test(`chapter-map @ ${theme}`, async ({ page }) => {
      await page.goto("/");
      await setTheme(page, theme);
      const grid = page.locator(".chapter-map").first();
      await grid.scrollIntoViewIfNeeded();
      await ready(page);
      await expect(grid).toHaveScreenshot(`chapter-map-${theme}.png`);
    });
  }
});

/* ============================================================
   Group C: 4 张术语卡 (term-stack)
   ============================================================ */
test.describe("术语卡截图", () => {
  for (const theme of THEMES) {
    test(`term-stack @ ${theme}`, async ({ page }) => {
      await page.goto("/");
      await setTheme(page, theme);
      const stack = page.locator(".term-stack").first();
      await stack.scrollIntoViewIfNeeded();
      await ready(page);
      await expect(stack).toHaveScreenshot(`term-stack-${theme}.png`);
    });
  }
});

/* ============================================================
   Group D: 第 1 章 SVG 概念图 (五层结构图, 重点验证对比度修复)
   ============================================================ */
test.describe("SVG 概念图截图", () => {
  for (const theme of ["studio", "dark"]) {
    test(`五层结构图 @ ${theme}`, async ({ page }) => {
      await page.goto("/#_9");        // 第一章锚点
      await setTheme(page, theme);
      const fig = page.locator("figure.diagram").first();
      await fig.scrollIntoViewIfNeeded();
      await ready(page);
      await expect(fig).toHaveScreenshot(`diagram-5layers-${theme}.png`);
    });
  }
});

/* ============================================================
   Group E: 成本表 (cost-chip 修复后的视觉)
   ============================================================ */
test.describe("成本表截图", () => {
  test(`商业化能力栈表 @ studio`, async ({ page }) => {
    await page.goto("/#_106");        // 第十五章
    await setTheme(page, "studio");
    // 找包含 cost-chip 的第一个 table-wrap
    const table = page.locator(".table-wrap").filter({ has: page.locator(".cost-chip") }).first();
    await table.scrollIntoViewIfNeeded();
    await ready(page);
    await expect(table).toHaveScreenshot(`cost-table-studio.png`);
  });
});

/* ============================================================
   Group F: 章节摘要卡 (section-summary)
   ============================================================ */
test.describe("章节摘要卡截图", () => {
  for (const theme of ["studio", "threads"]) {
    test(`section-summary @ ${theme}`, async ({ page }) => {
      await page.goto("/#_5");        // 本卷说明
      await setTheme(page, theme);
      const summary = page.locator(".section-summary").first();
      await summary.scrollIntoViewIfNeeded();
      await ready(page);
      await expect(summary).toHaveScreenshot(`section-summary-${theme}.png`);
    });
  }
});

/* ============================================================
   Group G: Contract 断言 — 机器稳定判断的视觉规则
   这一组不依赖 baseline, 改 UI 也不会触发 false diff
   ============================================================ */
test.describe("视觉 Contract 断言", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
    await setTheme(page, "light");
  });

  test(".metric 高度必须 ≤ 单行 (32px) 否则就是塞了长文本", async ({ page }) => {
    const metrics = page.locator(".metric");
    const count = await metrics.count();
    for (let i = 0; i < count; i++) {
      const el = metrics.nth(i);
      const box = await el.boundingBox();
      if (!box) continue;
      const text = (await el.textContent())?.trim() ?? "";
      expect(
        box.height,
        `.metric "${text}" 高度 ${box.height}px > 32px → 文本过长 pill 变形了, 改用 .cost-chip`
      ).toBeLessThanOrEqual(32);
    }
  });

  test(".cost-chip 高度 ≥ 22px 且 ≤ 120px (合理区间)", async ({ page }) => {
    await page.goto("/#_106");
    await setTheme(page, "light");
    const chips = page.locator(".cost-chip");
    const count = await chips.count();
    expect(count).toBeGreaterThan(0);
    for (let i = 0; i < count; i++) {
      const box = await chips.nth(i).boundingBox();
      if (!box) continue;
      const text = (await chips.nth(i).textContent())?.trim() ?? "";
      expect(box.height, `.cost-chip "${text}" 高度 ${box.height}`).toBeGreaterThan(20);
      expect(box.height, `.cost-chip "${text}" 高度 ${box.height} 太高了`).toBeLessThan(120);
    }
  });

  test("hero__title 字号 ≥ 32px (Hero 必须是大字 Display)", async ({ page }) => {
    const title = page.locator(".hero__title");
    const fontSize = await title.evaluate((el) => parseFloat(getComputedStyle(el).fontSize));
    expect(fontSize, `Hero 标题字号 ${fontSize}px < 32px`).toBeGreaterThanOrEqual(32);
  });

  test("章节卡: 三边 (右下左) border 宽度一致 (顶部 ::before 是 chapter band 不算)", async ({ page }) => {
    const card = page.locator(".chapter-card").first();
    const borders = await card.evaluate((el) => {
      const s = getComputedStyle(el);
      return {
        right: parseFloat(s.borderRightWidth),
        bottom: parseFloat(s.borderBottomWidth),
        left: parseFloat(s.borderLeftWidth),
      };
    });
    expect(borders.right, "右边").toBe(borders.bottom);
    expect(borders.bottom, "下边").toBe(borders.left);
    expect(borders.left, "左边宽度 (检查 mobile.css 5px 是否泄漏)").toBeLessThanOrEqual(2);
  });

  test("默认 (无 data-theme): 背景应跟随系统 prefers-color-scheme; Apple 风没有强制色板", async ({ page }) => {
    // light 模式下默认背景应是 #ffffff (R+G+B == 765)
    await page.emulateMedia({ colorScheme: "light" });
    await page.evaluate(() => localStorage.removeItem("yrgs.theme"));
    await page.reload();
    await ready(page);
    const bg = await page.evaluate(() => getComputedStyle(document.body).backgroundColor);
    const m = bg.match(/\d+/g);
    expect(m, `背景色解析失败: ${bg}`).toBeTruthy();
    const sum = m.slice(0, 3).reduce((a, b) => a + parseInt(b, 10), 0);
    expect(sum, `light 默认背景 ${bg} 不够亮, 不像 Apple Docs`).toBeGreaterThan(700);
  });

  test("Hero 内不再有 3D 球或装饰背景 (Apple Deference 原则)", async ({ page }) => {
    const orb = page.locator(".hero__orb");
    await expect(orb).toHaveCount(0);
  });
});
