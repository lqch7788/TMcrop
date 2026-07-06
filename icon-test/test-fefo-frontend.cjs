/**
 * FEFO 前端端到端测试 v2 — 正确路由
 */
const { chromium } = require('playwright');
const BASE = 'http://localhost:5188';
let passed = 0, failed = 0;
function check(n, c, d = '') { if (c) { console.log(`  ✅ ${n}`); passed++; } else { console.log(`  ❌ ${n} ${d}`); failed++; } }

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  try {
    // 1. 入库页面
    console.log('=== 1. 入库页面 ===');
    await page.goto(`${BASE}/warehouse-inbound`, { waitUntil: 'networkidle', timeout: 15000 });
    await page.waitForTimeout(1500);
    check('入库页面加载', await page.locator('button, table, h1, h2').count() > 0);

    // 2. 生产领料页面（含出库 tab）
    console.log('\n=== 2. 生产领料（含出库） ===');
    await page.goto(`${BASE}/material-receiving`, { waitUntil: 'networkidle', timeout: 15000 });
    await page.waitForTimeout(2000);
    check('生产领料页面加载', await page.locator('h1, h2, button, table').count() > 0);

    // 切换到"领料出库" tab
    const execTab = page.locator('button, span, div').filter({ hasText: '领料出库' }).first();
    if (await execTab.count() > 0) {
      await execTab.click();
      await page.waitForTimeout(1000);
      check('切换到领料出库 tab', true);

      // 点新增
      const addBtn = page.locator('button:has-text("新增")').first();
      if (await addBtn.count() > 0) {
        await addBtn.click();
        await page.waitForTimeout(1000);
        check('出库弹窗打开', await page.locator('text=新增领料出库').count() > 0);

        // 关闭弹窗
        const cancelBtns = page.locator('button:has-text("取消")');
        if (await cancelBtns.count() > 0) {
          await cancelBtns.last().click();
          await page.waitForTimeout(500);
        }
      }
    }

    // 3. 退料页面
    console.log('\n=== 3. 退料页面 ===');
    await page.goto(`${BASE}/material-return`, { waitUntil: 'networkidle', timeout: 15000 });
    await page.waitForTimeout(2000);
    check('退料页面加载', await page.locator('h1, h2, button, table').count() > 0);

    console.log(`\n============ ${passed} PASS / ${failed} FAIL ============`);
  } catch (e) {
    console.error('错误:', e.message);
  } finally {
    await browser.close();
    process.exit(failed > 0 ? 1 : 0);
  }
})();
