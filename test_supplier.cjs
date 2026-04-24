const { chromium } = require('playwright-core');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  
  try {
    await page.goto('http://localhost:5188/#/supplier', { waitUntil: 'networkidle', timeout: 30000 });
    await page.waitForTimeout(2000);
    
    await page.screenshot({ path: 'public/temp/supplier_initial.png' });
    console.log('Initial screenshot saved');
    
    const checkbox = await page.$('input[type="checkbox"]');
    if (checkbox) {
      await checkbox.click();
      console.log('Clicked checkbox');
      await page.waitForTimeout(500);
    }
    
    const buttons = await page.$$('button');
    for (const btn of buttons) {
      const text = await btn.textContent();
      if (text && text.includes('编辑')) {
        await btn.click();
        console.log('Clicked Edit button');
        await page.waitForTimeout(1000);
        break;
      }
    }
    
    await page.screenshot({ path: 'public/temp/supplier_after_edit.png' });
    console.log('After Edit click screenshot saved');
    
    const toolbarButtons = await page.$$eval('button', btns => 
      btns.map(btn => btn.textContent.trim()).filter(t => t.length > 0)
    );
    console.log('All buttons:', toolbarButtons);
    
  } catch (error) {
    console.error('Error:', error.message);
  }
  
  await browser.close();
})();
