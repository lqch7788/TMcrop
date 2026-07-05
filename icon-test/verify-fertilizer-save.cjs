/**
 * 验证施肥弹窗完整保存流程（2026-07-05）
 * 测试：打开弹窗 → 填必填字段 → 保存 → 验证列表出现新记录
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
    await page.waitForTimeout(1500);
    console.log('✓ 施肥页面加载\n');

    // ============ 采集初始列表记录数 ============
    const initialRowCount = await page.locator('table tbody tr').count();
    console.log(`初始列表行数: ${initialRowCount}`);

    // ============ 步骤 1: 打开新增弹窗 ============
    await page.getByRole('button', { name: '新增' }).click();
    await page.waitForTimeout(800);
    check('弹窗打开', await page.locator('text=新增施肥记录').count() > 0);

    // ============ 步骤 2: 填基础信息 ============
    // 2a. 肥料类型
    const selects = page.locator('select');
    const typeSelect = selects.first();
    await typeSelect.selectOption('organic');
    await page.waitForTimeout(300);

    // 2b. 切换到手动输入模式 + 填肥料名
    await page.locator('input[value="manual"]').click();
    await page.waitForTimeout(300);
    const nameInput = page.locator('input[placeholder="请输入肥料名称"]');
    check('找到肥料名称输入框', await nameInput.count() > 0);
    if (await nameInput.count() > 0) {
      await nameInput.fill('E2E测试肥料-' + Date.now());
      await page.waitForTimeout(200);
    }

    // 2c. 填区域位置（手动输入，不关联业务）
    const greenhouseInputs = page.locator('input').filter({ has: page.locator('..') });
    // 找到区域位置的 input（readOnly=false 的那个 greenhouseName input）
    const allInputs = page.locator('input[type="text"]');
    const count = await allInputs.count();
    let ghInput = null;
    for (let i = 0; i < count; i++) {
      const inp = allInputs.nth(i);
      const ph = await inp.getAttribute('placeholder');
      if (ph && ph.includes('请先选择关联业务')) {
        ghInput = inp;
        break;
      }
    }
    if (ghInput) {
      await ghInput.fill('E2E测试温室');
      await page.waitForTimeout(200);
      check('区域位置已填写', true);
    } else {
      check('找到区域位置输入框', false);
    }

    // 2d. 填稀释比例
    const dilutionInputs = page.locator('input[placeholder="如 1:500"]');
    if (await dilutionInputs.count() > 0) {
      await dilutionInputs.first().fill('1:500');
      await page.waitForTimeout(200);
    }

    // 2e. 填施肥量（小数测试）
    const qtyInput = page.locator('input[inputmode="decimal"]');
    if (await qtyInput.count() > 0) {
      await qtyInput.first().fill('0.5');
      await page.waitForTimeout(200);
      const v = await qtyInput.first().inputValue();
      check('施肥量输入 0.5 保持', v === '0.5', `实际: "${v}"`);
    }

    // 2f. 填施肥时间
    const dtInputs = page.locator('input[type="datetime-local"]');
    if (await dtInputs.count() > 0) {
      const now = new Date();
      const tzOffset = now.getTimezoneOffset() * 60000;
      const localISO = new Date(now.getTime() - tzOffset).toISOString().slice(0, 16);
      await dtInputs.first().fill(localISO);
      await page.waitForTimeout(200);
    }

    // ============ 步骤 3: 保存 ============
    console.log('\n--- 保存 ---');
    const saveBtn = page.getByRole('button', { name: '保存' });
    check('保存按钮可用', await saveBtn.isEnabled());

    // 监听错误 toast
    let hasError = false;
    page.on('dialog', async () => { hasError = true; });

    await saveBtn.click();
    await page.waitForTimeout(2000);

    // 检查弹窗是否关闭（保存成功）
    const modalClosed = await page.locator('text=新增施肥记录').count() === 0;
    check('保存后弹窗关闭', modalClosed);

    // ============ 步骤 4: 验证列表 ============
    await page.waitForTimeout(1000);
    const newRowCount = await page.locator('table tbody tr').count();
    console.log(`保存后列表行数: ${newRowCount}`);
    check('列表有新记录', newRowCount > initialRowCount, `before=${initialRowCount} after=${newRowCount}`);

    // ============ 步骤 5: 小数输入验证 ============
    console.log('\n--- 小数输入验证 ---');
    await page.getByRole('button', { name: '新增' }).click();
    await page.waitForTimeout(800);

    const qtyInput2 = page.locator('input[inputmode="decimal"]');
    if (await qtyInput2.count() > 0) {
      await qtyInput2.first().fill('0.12');
      await page.waitForTimeout(200);
      check('输入 0.12 保持', await qtyInput2.first().inputValue() === '0.12');
    }

    // 关闭弹窗
    await page.getByRole('button', { name: '取消' }).click();
    await page.waitForTimeout(300);

    console.log(`\n============ 结果: ${passed} PASS / ${failed} FAIL ============`);
    await page.screenshot({ path: 'D:/TMcrop/yuanxingtu/V1.1/icon-test/fertilizer-save-result.png' });
  } catch (e) {
    console.error('错误:', e.message);
    await page.screenshot({ path: 'D:/TMcrop/yuanxingtu/V1.1/icon-test/fertilizer-save-err.png', fullPage: true });
  } finally {
    await browser.close();
    process.exit(failed > 0 ? 1 : 0);
  }
})();
