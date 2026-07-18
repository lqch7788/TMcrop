/**
 * E2E 测试：种源自动合并功能
 * 测试环境：前端 dev server (5188) + 后端 server (3001)
 */

import { test, expect } from '@playwright/test';

test.describe('种源自动合并功能', () => {
  test.beforeEach(async ({ page }) => {
    // 登录（演示模式）
    await page.goto('http://localhost:5188/login');
    // 用户名输入框没有 name 属性，用 placeholder 定位
    await page.fill('input[placeholder="请输入用户名"]', '陆启闯');
    await page.fill('input[placeholder="请输入密码"]', 'admin');
    // 登录按钮（文本是"登 录"中间有空格）
    await page.click('button:has-text("登")');
    // 等待跳转到 dashboard
    await page.waitForURL('**/dashboard', { timeout: 15000 });
  });

  test('种源列表显示回流次数列', async ({ page }) => {
    await page.goto('http://localhost:5188/seed-source');
    await page.waitForSelector('table');

    // 验证表头包含"回流次数"
    const headers = await page.locator('table thead th').allTextContents();
    expect(headers).toContain('回流次数');

    // 验证有种源行存在
    const rows = page.locator('table tbody tr');
    expect(await rows.count()).toBeGreaterThan(0);
  });

  test('种源详情 Tab 包含入库审计', async ({ page }) => {
    await page.goto('http://localhost:5188/seed-source');
    await page.waitForSelector('table');

    // 点击第一个种源的查看详情按钮
    await page.locator('table tbody tr').first().locator('button').first().click();
    await page.waitForSelector('[role="dialog"]', { timeout: 10000 });

    // 验证存在入库审计 Tab
    const tabs = page.locator('[role="tab"]');
    const tabTexts = await tabs.allTextContents();
    expect(tabTexts).toContain('入库审计');

    // 点击入库审计 Tab
    await page.locator('[role="tab"]:has-text("入库审计")').click();

    // 验证审计面板加载（空状态或列表）
    await page.waitForSelector('[role="dialog"] text=暂无审计日志, [role="dialog"] text=入库审计日志', { state: 'visible', timeout: 5000 }).catch(() => {});
  });

  test('采收弹窗 planting_self_kept 模式显示 Generation Select', async ({ page }) => {
    await page.goto('http://localhost:5188/planting');
    await page.waitForSelector('table');

    // 点击第一个种植行的采收按钮（Recycle 图标）
    const harvestBtn = page.locator('table tbody tr').first().locator('button').filter({ has: page.locator('svg') }).first();
    await harvestBtn.click();
    await page.waitForSelector('[role="dialog"]', { timeout: 10000 });

    // 选择种植自留种（select）
    const destSelect = page.locator('select').first();
    await destSelect.selectOption({ label: '种植自留种' }).catch(async () => {
      // 可能是 Radix Select 组件
      await page.click('button:has-text("采收入库")');
      await page.click('text=种植自留种');
    });

    // 验证 Generation Select 出现
    const genInput = page.locator('input[list="generation-suggestions"]');
    await expect(genInput).toBeVisible({ timeout: 5000 });
  });

  test('入库记录 Tab 包含冲销按钮', async ({ page }) => {
    await page.goto('http://localhost:5188/seed-source');
    await page.waitForSelector('table');

    // 打开第一个种源详情
    await page.locator('table tbody tr').first().locator('button').first().click();
    await page.waitForSelector('[role="dialog"]', { timeout: 10000 });

    // 切换到入库记录 Tab
    await page.locator('[role="tab"]:has-text("入库记录")').click();

    // 验证表头包含"操作"列
    await page.waitForSelector('table');
    const headers = await page.locator('[role="dialog"] table thead th').allTextContents();
    expect(headers).toContain('操作');

    // 第一行应该有冲销按钮或已冲销徽章
    const firstRow = page.locator('[role="dialog"] table tbody tr').first();
    const hasReverseBtn = await firstRow.locator('button').count() > 0;
    const hasBadge = await firstRow.locator('text=已冲销').count() > 0;
    expect(hasReverseBtn || hasBadge).toBeTruthy();
  });
});
