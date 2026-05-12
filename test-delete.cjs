/**
 * 删除任务自动化测试 - 简化版
 */

const { chromium } = require('@playwright/test');

async function testDelete() {
  console.log('='.repeat(50));
  console.log('删除任务自动化测试 - 简化版');
  console.log('='.repeat(50));

  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext();
  const page = await context.newPage();

  const logs = [];
  page.on('console', msg => {
    logs.push(`[${msg.type()}] ${msg.text()}`);
  });

  try {
    // 1. 打开农事任务中心
    console.log('\n1. 打开农事任务中心...');
    await page.goto('http://localhost:5188/farm-hub', { waitUntil: 'networkidle', timeout: 30000 });
    await page.waitForTimeout(5000);

    // 2. 检查初始数据
    console.log('\n2. 检查初始数据...');
    const initialTaskRows = await page.locator('table tbody tr').count();
    console.log('   初始任务行数:', initialTaskRows);

    // 3. 点击删除按钮进入批量模式
    console.log('\n3. 进入批量删除模式...');
    const deleteBtn = page.locator('button').filter({ hasText: /^删除$/ }).first();
    console.log('   删除按钮可见:', await deleteBtn.isVisible());
    await deleteBtn.click();
    await page.waitForTimeout(1500);

    // 4. 勾选最后一个任务的复选框
    console.log('\n4. 勾选最后一个任务...');
    const checkboxes = await page.locator('input[type="checkbox"]').all();
    console.log('   复选框数量:', checkboxes.length);

    if (checkboxes.length > 1) {
      // 点击最后一个复选框（最后一行数据）
      const lastCheckbox = checkboxes[checkboxes.length - 1];
      await lastCheckbox.click();
      await page.waitForTimeout(1000);
      console.log('   已勾选最后一个任务');
    }

    // 5. 点击确认删除
    console.log('\n5. 点击确认删除...');
    const confirmBtn = page.locator('button').filter({ hasText: /^确认删除$/ }).first();
    console.log('   确认删除按钮可见:', await confirmBtn.isVisible());
    await confirmBtn.click();
    await page.waitForTimeout(2000);

    // 6. 查找并点击弹窗中的确认按钮
    console.log('\n6. 处理删除确认弹窗...');
    // 等待弹窗出现
    await page.waitForTimeout(500);

    // 查找确认按钮（可能在弹窗内）
    const modalConfirmBtn = page.locator('button').filter({ hasText: /^确认$/ }).first();
    const modalVisible = await modalConfirmBtn.isVisible().catch(() => false);
    console.log('   弹窗确认按钮可见:', modalVisible);

    if (modalVisible) {
      await modalConfirmBtn.click();
      console.log('   已点击弹窗确认按钮');
      await page.waitForTimeout(3000);
    } else {
      // 尝试其他选择器
      const confirmDeleteBtn = page.locator('button').filter({ hasText: /^确认删除$/ }).first();
      if (await confirmDeleteBtn.isVisible().catch(() => false)) {
        await confirmDeleteBtn.click();
        console.log('   已点击确认删除按钮');
        await page.waitForTimeout(3000);
      }
    }

    // 7. 检查最终状态
    console.log('\n7. 检查最终状态...');
    const finalTaskRows = await page.locator('table tbody tr').count();
    console.log('   最终任务行数:', finalTaskRows);

    if (finalTaskRows < initialTaskRows) {
      console.log('   ✓ 删除成功！任务数从', initialTaskRows, '减少到', finalTaskRows);
    } else {
      console.log('   ✗ 删除失败，任务数未变化');
    }

    // 8. 输出关键日志
    console.log('\n8. 删除相关日志:');
    logs.forEach(l => {
      if (l.includes('delete') || l.includes('Delete') || l.includes('DeleteWarning')) {
        console.log('   ', l.slice(0, 150));
      }
    });

  } catch (error) {
    console.error('\n测试异常:', error.message);
  } finally {
    await browser.close();
    console.log('\n测试完成');
  }
}

testDelete();
