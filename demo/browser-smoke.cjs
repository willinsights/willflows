const { chromium, expect } = require('@playwright/test');
const { spawn } = require('node:child_process');
const server = spawn('python3', ['-m', 'http.server', '8765', '--bind', '127.0.0.1'], { stdio: 'ignore' });
(async () => {
  let browser;
  try {
    browser = await chromium.launch({ headless: true });
    const page = await browser.newPage({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
    const base = 'http://127.0.0.1:8765/demo/willflow20.html';
    for (let retry=0; retry<15; retry++) {
      try { await page.goto(base); break; }
      catch (error) { if (retry===14) throw error; await new Promise(resolve=>setTimeout(resolve,300)); }
    }
    await page.locator('.kpi-card').first().click();
    await expect(page).toHaveURL(/#financeiro$/);
    for (const section of ['captacao', 'crm', 'media', 'pagamentos', 'faturacao', 'contratos', 'equipa', 'planos']) {
      await page.goto(base + '#' + section);
      const selector = section==='captacao' ? '.project.clickable-card'
        : section==='crm' || section==='pagamentos' || section==='faturacao' ? '.clickable-row'
        : '.clickable-card';
      await page.locator(selector).first().click();
      await expect(page.getByRole('dialog')).toBeVisible();
      await page.getByRole('button', {name:'Fechar', exact:true}).click();
      await expect(page.getByRole('dialog')).toHaveCount(0);
    }
    console.log('PASS: Mobile Safari-sized viewport; 8 card detail types and dashboard KPI navigation');
  } finally {
    if (browser) await browser.close();
    server.kill('SIGTERM');
  }
})().catch(error => { console.error(error); process.exitCode=1; });
