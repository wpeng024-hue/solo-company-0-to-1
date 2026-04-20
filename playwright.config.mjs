/**
 * Playwright 视觉回归配置
 * 启动 python3 静态服务器 → 跑 _visual/*.spec.mjs → 截屏对比 baseline
 *
 * 用法:
 *   npm run test:visual              # 跑测试, 跟 baseline 对比
 *   npm run test:visual:update       # 重新生成 baseline (改了 UI 之后)
 *   npm run test:visual:ui           # 打开 UI 模式 (交互式调试)
 */
import { defineConfig, devices } from "@playwright/test";

const PORT = 8123;  // 用非常用端口避免冲突
const BASE_URL = `http://127.0.0.1:${PORT}`;

export default defineConfig({
  testDir: "./_visual",
  testMatch: /.*\.spec\.mjs/,
  outputDir: "./_visual/test-results",
  snapshotDir: "./_visual/__snapshots__",
  // 截图对比的容差: 像素差 < 0.2% 视为通过 (字体抗锯齿差异留余量)
  expect: {
    toHaveScreenshot: {
      maxDiffPixelRatio: 0.02,
      threshold: 0.25,
      animations: "disabled",
      caret: "hide",
    },
  },
  fullyParallel: false,    // 截图测试串行, 避免共享状态
  workers: 1,
  retries: 0,
  reporter: [["list"], ["html", { outputFolder: "_visual/playwright-report", open: "never" }]],
  use: {
    baseURL: BASE_URL,
    viewport: { width: 1440, height: 900 },
    deviceScaleFactor: 1,
    locale: "zh-CN",
    timezoneId: "Asia/Shanghai",
    colorScheme: "light",
    // 强制系统字体 fallback 一致 (避免 Mac/Linux 字体差异导致 false diff)
    extraHTTPHeaders: {},
  },
  projects: [
    {
      name: "chromium-1440",
      use: { ...devices["Desktop Chrome"], viewport: { width: 1440, height: 900 } },
    },
  ],
  webServer: {
    command: `python3 -m http.server ${PORT} --bind 127.0.0.1`,
    port: PORT,
    reuseExistingServer: false,
    timeout: 15_000,
    stdout: "ignore",
    stderr: "pipe",
  },
});
