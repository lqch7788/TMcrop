/**
 * Playwright E2E 配置 — 作物管理 V2 改造
 * 前端 port 5188, 后端 port 3001 (Vite 代理 /api → localhost:3001)
 */
import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  timeout: 30000,
  expect: { timeout: 10000 },
  retries: 0,
  use: {
    baseURL: 'http://localhost:5188',
    headless: true,
    viewport: { width: 1440, height: 900 },
    actionTimeout: 10000,
    screenshot: 'only-on-failure',
  },
  projects: [
    {
      name: 'chromium',
      use: { browserName: 'chromium' },
    },
  ],
});
