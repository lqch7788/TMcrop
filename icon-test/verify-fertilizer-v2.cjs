/**
 * 验证施肥弹窗修复：字段校验 + API 保存 + 小数输入
 */
const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  let passed = 0, failed = 0;
  function check(n, c, d = '') { if (c) { console.log(`  ✅ ${n}`); passed++; } else { console.log(`  ❌ ${n} ${d}`); failed++; } }

  try {
    // ============ 测试 1: 通过种植关联自动填充必填字段 ============
    console.log('=== 测试 1: 关联种植保存 ===');
    await page.goto('http://localhost:5188/crop/fertilizer', { waitUntil: 'networkidle' });
    await page.waitForTimeout(1500);
    const initialCount = await page.locator('table tbody tr').count();
    console.log(`初始行数: ${initialCount}`);

    // 打开弹窗
    await page.getByRole('button', { name: '新增' }).click();
    await page.waitForTimeout(1000);
    check('弹窗打开', await page.locator('text=新增施肥记录').count() > 0);

    // 选种植 tab（默认已是）+ 点搜索框看是否有数据
    const searchInput = page.locator('input[placeholder*="搜索种植批号"]');
    if (await searchInput.count() > 0) {
      await searchInput.click();
      await page.waitForTimeout(500);
      // 看下拉是否有种植选项
      const dropdownItems = page.locator('button:has(p.text-sm.font-medium)');
      const itemCount = await dropdownItems.count();
      console.log(`种植关联选项数: ${itemCount}`);
      if (itemCount > 0) {
        // 选第一条
        await dropdownItems.first().click();
        await page.waitForTimeout(500);
        // 验证自动填充
        const ghValue = await page.locator('input[readonly]').first().inputValue().catch(() => '');
        check('greenhouseName 自动填充', ghValue.length > 0, `值: "${ghValue}"`);
      }
    }

    // 填肥料类型
    await page.locator('select').first().selectOption('organic');
    await page.waitForTimeout(300);

    // 切换到手动输入
    await page.locator('input[value="manual"]').click();
    await page.waitForTimeout(300);
    const nameInput = page.locator('input[placeholder="请输入肥料名称"]');
    if (await nameInput.count() > 0) {
      await nameInput.fill('E2E测试-' + Date.now());
    }

    // 填稀释比例
    await page.locator('input[placeholder="如 1:500"]').fill('1:500');
    await page.waitForTimeout(200);

    // 填施肥量
    const qtyInputs = page.locator('input[inputmode="decimal"]');
    if (await qtyInputs.count() > 0) {
      await qtyInputs.first().fill('0.5');
      await page.waitForTimeout(200);
      check('施肥量 0.5 显示', await qtyInputs.first().inputValue() === '0.5');
    }

    // 填施肥时间
    const dtInput = page.locator('input[type="datetime-local"]');
    if (await dtInput.count() > 0) {
      const d = new Date();
      const l = new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
      await dtInput.first().fill(l);
      await page.waitForTimeout(200);
    }

    // 保存
    await page.getByRole('button', { name: '保存' }).click();
    await page.waitForTimeout(2500);

    const modalGone = await page.locator('text=新增施肥记录').count() === 0;
    // 如果弹窗还在，可能是 alert 弹窗挡住了
    if (!modalGone) {
      // 尝试关闭 alert 弹窗
      const alertOk = page.locator('button:has-text("确定")').first();
      if (await alertOk.count() > 0 && await alertOk.isVisible()) {
        await alertOk.click();
        await page.waitForTimeout(500);
      }
    }

    const newCount = await page.locator('table tbody tr').count();
    check('保存后列表有新增', newCount > initialCount, `before=${initialCount} after=${newCount}`);

  } catch (e) {
    console.error('错误:', e.message);
    await page.screenshot({ path: 'D:/TMcrop/yuanxingtu/V1.1/icon-test/fertilizer-final-err.png', fullPage: true });
  } finally {
    console.log(`\n============ ${passed} PASS / ${failed} FAIL ============`);
    await browser.close();
    process.exit(failed > 0 ? 1 : 0);
  }
})();
