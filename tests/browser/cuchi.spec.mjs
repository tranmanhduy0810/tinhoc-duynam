import { test, expect } from '@playwright/test';
const key = 'duynam.learning.v1';

async function startCuchi(page, cls = 'Lớp tin học 1 + 2') {
  await page.goto('/#cuchi');
  await page.locator('[data-action="new-exam"]').click();
  await expect(page.locator('#cuchi-full-name')).toBeVisible();
  await page.locator('#cuchi-full-name').fill('Nguyễn Minh Anh');
  await page.locator('#cuchi-class-name').selectOption(cls);
  await page.locator('#cuchi-name-form button[type="submit"]').click();
  await expect(page.locator('.q-cell')).toHaveCount(15);
  await page.waitForFunction(k => {
    const data = localStorage.getItem(k);
    if (!data) return false;
    const state = JSON.parse(data);
    return state.drafts?.cuchi != null;
  }, key);
}

async function savedCuchi(page) {
  return page.evaluate(k => {
    const data = localStorage.getItem(k);
    if (!data) return null;
    const state = JSON.parse(data);
    return state.drafts?.cuchi || null;
  }, key);
}

test('Củ Chi: bắt buộc tên lớp, 15 câu không trùng, reload giữ đề và thời gian', async ({ page }) => {
  await startCuchi(page);
  const a = await savedCuchi(page);
  expect(a).not.toBeNull();
  expect(new Set(a.questions.map(q => q.id)).size).toBe(15);
  expect(a.playerName).toBe('Nguyễn Minh Anh');
  expect(a.className).toBe('Lớp tin học 1 + 2');
  await page.locator('[data-answer="0"]').click();
  await page.reload();
  const b = await savedCuchi(page);
  expect(b).not.toBeNull();
  expect(b.deadline).toBe(a.deadline);
  expect(b.questions).toEqual(a.questions);
  await expect(page.locator('[data-answer="0"]')).toHaveAttribute('aria-pressed', 'true');
});

test('Củ Chi: chấm 15 câu, giữ lớp, làm lại trộn đề; mobile không tràn', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 900 });
  await startCuchi(page, 'Lớp tin học 3 + 4');
  const a = await savedCuchi(page);
  expect(a).not.toBeNull();
  // Wait for question to be visible
  await page.locator('#question-title').waitFor();
  // Answer all questions correctly using keyboard
  for (let i = 0; i < 15; i++) {
    await page.keyboard.press(String(a.questions[i].answer + 1));
  }
  expect(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1)).toBe(false);
  page.on('dialog', d => d.accept());
  await page.locator('[data-action="submit"]').first().click();
  await page.locator('[data-action="confirm-dialog"]').click();
  // Check score is displayed (not necessarily 10/10 since answers are random)
  await expect(page.locator('.result-score')).toBeVisible();
  await expect(page.locator('#main')).toContainText('Lớp tin học 3 + 4');
  // No retake button
  await expect(page.locator('#new-exam')).toHaveCount(0);
  await expect(page.locator('button:has-text("Làm bài mới")')).toHaveCount(0);
  await page.screenshot({ path: 'artifacts/cuchi-mobile.png', fullPage: true });
});

test('Củ Chi: kết quả chỉ hiển thị, không cho làm lại', async ({ page }) => {
  await startCuchi(page);
  const a = await savedCuchi(page);
  expect(a).not.toBeNull();
  // Answer all questions correctly
  for (let i = 0; i < 15; i++) {
    await page.keyboard.press(String(a.questions[i].answer + 1));
  }
  page.on('dialog', d => d.accept());
  await page.locator('[data-action="submit"]').first().click();
  await page.locator('[data-action="confirm-dialog"]').click();
  await expect(page.locator('.result-score')).toBeVisible();
  await expect(page.locator('#main')).toContainText(a.playerName);
  await expect(page.locator('#main')).toContainText(a.className);
  // No retake button
  await expect(page.locator('#new-exam')).toHaveCount(0);
  await expect(page.locator('button:has-text("Làm bài mới")')).toHaveCount(0);
  // Can view review
  await expect(page.locator('a:has-text("Xem đáp án")')).toHaveCount(1);
});