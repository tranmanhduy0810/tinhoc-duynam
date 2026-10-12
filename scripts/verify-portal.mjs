import { chromium } from 'playwright';
import { mkdir } from 'node:fs/promises';
const browser = await chromium.launch({ headless: true });
try {
  const page = await browser.newPage({ viewport: { width: 1440, height: 1100 } });
  const errors = []; page.on('pageerror', () => errors.push('pageerror'));
  const response = await page.goto(process.argv[2] || 'http://127.0.0.1:4173', { waitUntil: 'networkidle' });
  await page.locator('.topic-card').first().waitFor();
  const count = await page.locator('.topic-card').count();
  await mkdir('artifacts', { recursive: true });
  await page.screenshot({ path: 'artifacts/portal-preview.png', fullPage: true });
  await page.locator('.topic-card a').first().click();
  await page.locator('.answer-option').first().waitFor();
  const answers = await page.locator('.answer-option').count();
  console.log(JSON.stringify({ status: response.status(), topics: count, choices: answers, pageErrors: errors.length, portalAppRendered: count === 6 && answers === 4 }, null, 2));
  if (count !== 6 || answers !== 4 || errors.length) process.exitCode = 1;
} catch { console.error('Không xác minh được ứng dụng trong portal.'); process.exitCode = 1; }
finally { await browser.close(); }
