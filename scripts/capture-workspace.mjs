import { chromium } from 'playwright';
import { mkdir } from 'node:fs/promises';
const browser = await chromium.launch({ headless: true });
await mkdir('artifacts/workspace-v2', { recursive: true });
for (const [width, height] of [[1200,550],[1280,800],[1917,883],[375,850],[768,1024]]) {
  const page = await browser.newPage({ viewport: { width, height } });
  await page.goto('http://127.0.0.1:4173/#practice/basics'); await page.locator('.answer-option').first().waitFor();
  await page.locator('#instant-check').check();
  const correct = await page.evaluate(() => { const a = JSON.parse(localStorage.getItem('duynam.learning.v1')).drafts.basics; return a.questions[a.current].answer; });
  await page.locator(`[data-answer="${correct}"]`).click();
  await page.screenshot({ path: `artifacts/workspace-v2/practice-${width}.png`, fullPage: true });
  console.log(JSON.stringify({ width, height, overflow: await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1), title: await page.title(), grid: await page.locator('.q-cell').count() }));
  await page.close();
}
await browser.close();
