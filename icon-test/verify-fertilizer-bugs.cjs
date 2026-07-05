/**
 * 验证施肥弹窗两个 bug 修复（2026-07-05）
 * Bug 1: 施肥量小数输入
 * Bug 2: greenhouseName 必填校验 + 保存结果检查
 */
const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  let passed = 0, failed = 0;

  function check(name, condition, detail = '') {
    if (condition) { console.log(`  ✅ ${name}`); passed++; }
    else { console.log(`  ❌ ${name} ${detail}`); failed++; }
  }

  try {
    await page.goto('http://localhost:5188/crop/fertilizer', { waitUntil: 'networkidle' });
    console.log('✓ 施肥页面加载\n');

    // ============ Bug 1: 小数输入测试 ============
    console.log('--- Bug 1: 小数输入 ---');
    await page.getByRole('button', { name: '新增' }).click();
    await page.waitForTimeout(800);

    // 找到施肥量 input
    const qtyInput = page.locator('input[inputmode="decimal"]');
    check('找到施肥量 input', await qtyInput.count() > 0);

    if (await qtyInput.count() > 0) {
      // 测试 1: 输入 0.5
      await qtyInput.first().fill('0.5');
      await page.waitForTimeout(200);
      const v1 = await qtyInput.first().inputValue();
      check('输入 "0.5" 保持为 "0.5"', v1 === '0.5', `实际: "${v1}"`);

      // 测试 2: 输入 0.12
      await qtyInput.first().fill('');
      await qtyInput.first().fill('0.12');
      await page.waitForTimeout(200);
      const v2 = await qtyInput.first().inputValue();
      check('输入 "0.12" 保持为 "0.12"', v2 === '0.12', `实际: "${v2}"`);

      // 测试 3: 输入 1.5
      await qtyInput.first().fill('1.5');
      await page.waitForTimeout(200);
      const v3 = await qtyInput.first().inputValue();
      check('输入 "1.5" 保持为 "1.5"', v3 === '1.5', `实际: "${v3}"`);

      // 测试 4: 输入 0.0（边界值）
      await qtyInput.first().fill('0.0');
      await page.waitForTimeout(200);
      const v4 = await qtyInput.first().inputValue();
      check('输入 "0.0" 保持为 "0.0"', v4 === '0.0', `实际: "${v4}"`);
    }

    // ============ Bug 2: 必填校验测试 ============
    console.log('\n--- Bug 2: greenhouseName 必填校验 ---');

    // 只填肥料名称（不填区域位置），直接点保存
    // 先填肥料类型 + 手动输入肥料名
    const selects = page.locator('select');
    // 肥料类型下拉
    const typeSelect = selects.first();
    await typeSelect.selectOption('organic');
    await page.waitForTimeout(200);

    // 切换到手动输入模式
    await page.locator('input[value="manual"]').click();
    await page.waitForTimeout(200);

    // 填肥料名称
    const nameInput = page.locator('input[placeholder="请输入肥料名称"]');
    if (await nameInput.count() > 0) {
      await nameInput.fill('测试肥料Bug2');
      await page.waitForTimeout(200);
    }

    // 点保存按钮（不填区域位置）
    const saveBtn = page.getByRole('button', { name: '保存' });
    await saveBtn.click();
    await page.waitForTimeout(500);

    // 应该弹出 alert 提示区域位置必填
    // 检查弹窗是否还在（没关闭 = 校验拦截成功）
    const modalStillOpen = await page.locator('text=新增施肥记录').count() > 0;
    check('greenhouseName 为空时弹窗未关闭（校验拦截）', modalStillOpen);

    // 关闭 alert 弹窗（showAlert 产生的 GlobalDialog）
    const alertOkBtn = page.locator('.fixed.inset-0 > div > div button:has-text("确定")');
    if (await alertOkBtn.count() > 0) {
      await alertOkBtn.first().click();
      await page.waitForTimeout(300);
    }
    // 关闭施肥新增弹窗
    const cancelBtn = page.getByRole('button', { name: '取消' });
    if (await cancelBtn.count() > 0) await cancelBtn.click();
    await page.waitForTimeout(300);

    console.log(`\n============ 结果: ${passed} PASS / ${failed} FAIL ============`);

    await page.screenshot({ path: 'D:/TMcrop/yuanxingtu/V1.1/icon-test/fertilizer-bugs-result.png' });
    console.log('截图已保存');
  } catch (e) {
    console.error('错误:', e.message);
    await page.screenshot({ path: 'D:/TMcrop/yuanxingtu/V1.1/icon-test/fertilizer-bugs-err.png', fullPage: true });
  } finally {
    await browser.close();
    process.exit(failed > 0 ? 1 : 0);
  }
})();
