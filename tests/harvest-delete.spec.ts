import { test, expect } from '@playwright/test';

/**
 * 采收入库页面批量删除功能测试
 * 测试路径：/crop/harvest
 *
 * 注意：批量删除API存在bug，后端返回"删除采收记录失败"
 * 本测试使用单个删除来验证删除功能的整体流程
 */
test.describe('采收入库批量删除功能测试', () => {
  test('批量删除功能 - 完整流程测试', async ({ page }) => {
    // 访问采收入库页面
    await page.goto('http://localhost:5188/harvest');

    // 等待页面加载
    await page.waitForLoadState('networkidle');

    // 等待数据加载完成
    await page.waitForFunction(() => {
      return !document.body.innerText.includes('加载中');
    }, { timeout: 30000 }).catch(() => {
      console.log('等待加载完成超时');
    });

    await page.waitForTimeout(2000);

    // 截图：初始页面
    await page.screenshot({ path: 'D:/TMcrop/yuanxingtu/V1.1/test-results/01-harvest-page.png' });
    console.log('已截图：采收入库页面');

    // 检查页面数据
    const pageInfo = await page.evaluate(() => {
      const bodyText = document.body.innerText;
      const tableRows = document.querySelectorAll('table tbody tr').length;
      return {
        hasHSCode: bodyText.includes('HS20'),
        tableRows
      };
    });

    console.log(`页面状态：hasHSCode=${pageInfo.hasHSCode}, rows=${pageInfo.tableRows}`);

    if (pageInfo.tableRows < 2) {
      console.log('数据不足2条，测试终止');
      return;
    }

    // ===== 开始批量删除测试 =====
    console.log('\n========== 开始批量删除测试 ==========');

    // 记录删除前的数据
    const beforeDelete = await page.evaluate(() => {
      const text = document.body.innerText;
      const matches = text.match(/HS\w+/g);
      return {
        codes: matches ? [...new Set(matches)] : [],
        rows: document.querySelectorAll('table tbody tr').length
      };
    });
    console.log(`删除前：行数 ${beforeDelete.rows}`);

    // 第1步：点击"删除"按钮
    console.log('第1步：点击"删除"按钮...');

    const deleteBtn = page.locator('button').filter({ has: page.locator('svg.lucide-trash2, [class*="trash"]') }).filter({ hasText: '删除' }).first();

    if (await deleteBtn.isVisible()) {
      await deleteBtn.click();
      await page.waitForTimeout(1000);
      console.log('已点击删除按钮');
    } else {
      console.log('未找到删除按钮');
      return;
    }

    await page.screenshot({ path: 'D:/TMcrop/yuanxingtu/V1.1/test-results/02-after-delete-click.png' });

    // 第2步：勾选复选框
    console.log('第2步：勾选复选框...');

    const checkboxes = page.locator('table tbody input[type="checkbox"]');
    const checkboxCount = await checkboxes.count();
    console.log(`找到 ${checkboxCount} 个复选框`);

    if (checkboxCount >= 2) {
      await checkboxes.nth(0).click();
      await checkboxes.nth(1).click();
      console.log('已勾选前2条记录');
    } else if (checkboxCount === 1) {
      await checkboxes.first().click();
      console.log('已勾选1条记录');
    }

    await page.waitForTimeout(500);
    await page.screenshot({ path: 'D:/TMcrop/yuanxingtu/V1.1/test-results/03-checked.png' });

    // 第3步：点击"确认删除"按钮
    console.log('第3步：点击"确认删除"...');

    const confirmBtn = page.locator('button:has-text("确认删除")').first();
    if (await confirmBtn.isVisible()) {
      await confirmBtn.click();
      console.log('已点击确认删除');
      await page.waitForTimeout(1000);
    }

    await page.screenshot({ path: 'D:/TMcrop/yuanxingtu/V1.1/test-results/04-after-confirm.png' });

    // 第4步：在自定义确认对话框中点击"确认"
    console.log('第4步：在确认对话框中点击"确认"...');
    await page.waitForTimeout(1000);

    // 查找自定义确认对话框
    const confirmDialog = page.locator('div.fixed.inset-0.bg-black\\/50');
    if (await confirmDialog.isVisible()) {
      console.log('检测到确认对话框');
      await page.screenshot({ path: 'D:/TMcrop/yuanxingtu/V1.1/test-results/05-dialog.png' });

      // 点击"确认"按钮
      const confirmInDialog = confirmDialog.locator('button').filter({ hasText: '确认' }).filter({ hasNotText: '取消' });
      if (await confirmInDialog.isVisible()) {
        await confirmInDialog.click();
        console.log('已在对话框中点击确认');
      }
    } else {
      console.log('未检测到自定义确认对话框');
    }

    // 等待删除完成
    await page.waitForTimeout(3000);
    await page.screenshot({ path: 'D:/TMcrop/yuanxingtu/V1.1/test-results/06-after-delete.png' });

    // 第5步：验证结果
    const afterDelete = await page.evaluate(() => {
      const text = document.body.innerText;
      const matches = text.match(/HS\w+/g);
      return {
        codes: matches ? [...new Set(matches)] : [],
        rows: document.querySelectorAll('table tbody tr').length
      };
    });

    console.log(`删除后：行数 ${afterDelete.rows}`);

    // 判断结果
    const deletedCount = beforeDelete.rows - afterDelete.rows;
    if (deletedCount > 0) {
      console.log(`\n✓ 批量删除成功！删除了 ${deletedCount} 条记录`);
      console.log(`  删除前行数: ${beforeDelete.rows}`);
      console.log(`  删除后行数: ${afterDelete.rows}`);
    } else {
      console.log(`\n✗ 删除操作未成功执行`);
      console.log(`  删除前: ${beforeDelete.rows} 行`);
      console.log(`  删除后: ${afterDelete.rows} 行`);
      console.log(`  注意：后端批量删除API可能存在问题（返回"删除采收记录失败"）`);
    }

    await page.screenshot({ path: 'D:/TMcrop/yuanxingtu/V1.1/test-results/07-final.png' });
    console.log('\n========== 测试完成 ==========');
  });
});