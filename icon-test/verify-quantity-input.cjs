/**
 * 验证施肥量 input 是否支持小数输入
 * 2026-07-05: 自验证脚本
 */
const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  try {
    // 1. 打开施肥页面
    await page.goto('http://localhost:5188/crop/fertilizer', { waitUntil: 'networkidle' });
    console.log('✓ 施肥页面加载');

    // 2. 点击"新增"按钮
    await page.getByRole('button', { name: '新增' }).click();
    await page.waitForTimeout(1000);
    console.log('✓ 弹窗打开');

    // 3. 找到施肥量 input
    const qtyInput = page.locator('input[inputmode="decimal"]');
    const count = await qtyInput.count();
    console.log(`✓ 找到 input[inputmode="decimal"] 数量: ${count}`);
    if (count === 0) {
      console.log('✗ 没找到施肥量 input！');
      await page.screenshot({ path: 'D:/TMcrop/yuanxingtu/V1.1/icon-test/pest-qty-fail.png', fullPage: true });
      return;
    }

    // 4. 测试输入 0.5
    console.log('\n--- 测试 1: 输入 0.5 ---');
    await qtyInput.first().fill('0.5');
    await page.waitForTimeout(300);
    const v1 = await qtyInput.first().inputValue();
    console.log(`输入 "0.5" 后 input.value = "${v1}"`);
    console.log(v1 === '0.5' ? '✅ PASS' : '❌ FAIL');

    // 5. 测试输入 0.12
    console.log('\n--- 测试 2: 输入 0.12 ---');
    await qtyInput.first().fill('');
    await qtyInput.first().fill('0.12');
    await page.waitForTimeout(300);
    const v2 = await qtyInput.first().inputValue();
    console.log(`输入 "0.12" 后 input.value = "${v2}"`);
    console.log(v2 === '0.12' ? '✅ PASS' : '❌ FAIL');

    // 6. 测试输入 1.5（默认是 kg 单位，看转换预览）
    console.log('\n--- 测试 3: 输入 1.5 ---');
    await qtyInput.first().fill('1.5');
    await page.waitForTimeout(300);
    const v3 = await qtyInput.first().inputValue();
    console.log(`输入 "1.5" 后 input.value = "${v3}"`);
    console.log(v3 === '1.5' ? '✅ PASS' : '❌ FAIL');

    // 7. 测试输入 0（边界值）
    console.log('\n--- 测试 4: 输入 0 ---');
    await qtyInput.first().fill('0');
    await page.waitForTimeout(300);
    const v4 = await qtyInput.first().inputValue();
    console.log(`输入 "0" 后 input.value = "${v4}"`);
    console.log(v4 === '0' ? '✅ PASS（0 能显示）' : '❌ FAIL（0 显示不出来！）');

    // 8. 测试输入空
    console.log('\n--- 测试 5: 清空 ---');
    await qtyInput.first().fill('');
    await page.waitForTimeout(300);
    const v5 = await qtyInput.first().inputValue();
    console.log(`清空后 input.value = "${v5}"`);
    console.log(v5 === '' ? '✅ PASS（清空）' : '❌ FAIL');

    // 9. 截图保存
    await page.screenshot({ path: 'D:/TMcrop/yuanxingtu/V1.1/icon-test/pest-qty-final.png', fullPage: false });
    console.log('\n✓ 截图保存');

  } catch (e) {
    console.error('错误:', e.message);
    await page.screenshot({ path: 'D:/TMcrop/yuanxingtu/V1.1/icon-test/pest-qty-err.png', fullPage: true });
  } finally {
    await browser.close();
  }
})();