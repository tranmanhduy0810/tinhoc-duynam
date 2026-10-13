import { test, expect } from '@playwright/test';
import { readFile } from 'node:fs/promises';
const bank = JSON.parse(await readFile(new URL('../../site/data/questions.json', import.meta.url)));
const key = 'duynam.learning.v1';
async function savedAttempt(page, draftKey = 'basics') { return page.evaluate(({ key, draftKey }) => JSON.parse(localStorage.getItem(key)).drafts[draftKey], { key, draftKey }); }
async function openPractice(page) { await page.goto('/#practice/basics'); await expect(page.locator('.answer-option')).toHaveCount(4); }
async function submit(page) { await page.locator('[data-action="submit"]').first().click(); await page.locator('[data-action="confirm-dialog"]').click(); await expect(page.locator('.result-score')).toBeVisible(); }
async function startExam(page, name = 'Duy Nấm') {
  await page.goto('/#exam'); await page.locator('[data-action="new-exam"]').click();
  if (await page.locator('[data-action="confirm-dialog"]').isVisible()) await page.locator('[data-action="confirm-dialog"]').click();
  await page.locator('#player-name').fill(name); await page.locator('#exam-name-form button[type="submit"]').click();
  await expect(page.locator('.q-cell')).toHaveCount(30);
}
test('Trang chủ hiển thị 6 chủ đề, tìm không dấu và trạng thái rỗng', async ({ page }) => {
  await page.goto('/'); await expect(page.locator('.topic-card[data-search]')).toHaveCount(6);
  await page.getByRole('searchbox').fill('bang tinh'); await expect(page.locator('.topic-card[data-search]:visible')).toHaveCount(1);
  await page.getByRole('searchbox').fill('khong-tim-thay'); await expect(page.locator('#topic-empty')).toBeVisible();
  await page.locator('#topic-empty [data-action="clear-search"]').click(); await expect(page.locator('.topic-card[data-search]:visible')).toHaveCount(6);
});
test('Lựa chọn, cờ và vị trí câu được giữ sau reload; xem đáp án ngay', async ({ page }) => {
  await openPractice(page); const initial = await savedAttempt(page); await page.locator('[data-answer="0"]').click(); await page.locator('[data-action="flag"]').click();
  await page.locator('#instant-check').check(); await expect(page.locator('.explanation')).toBeVisible();
  await page.locator('[data-action="next"]').click(); await page.reload();
  await expect(page.locator('#question-title')).toContainText((await savedAttempt(page)).questions[1].text);
  await page.locator('[data-action="previous"]').click(); await expect(page.locator('[data-answer="0"]')).toHaveAttribute('aria-pressed', 'true');
  await expect(page.locator('[data-action="flag"]')).toHaveAttribute('aria-pressed', 'true'); await expect(page.locator('.explanation')).toBeVisible();
});
test('Nộp một câu đúng, 49 câu trống; xem lại và luyện đúng các câu chưa đúng', async ({ page }) => {
  await openPractice(page); const a = await savedAttempt(page); await page.locator(`[data-answer="${a.questions[0].answer}"]`).click(); await submit(page);
  await expect(page.locator('.result-score')).toContainText('0,2'); await expect(page.locator('.correct-stat')).toHaveText('1');
  await page.getByRole('link', { name: 'Xem đáp án & giải thích' }).click(); await expect(page.locator('.answer-option.correct')).toHaveCount(1); await expect(page.locator('.answer-option').first()).toBeDisabled();
  await page.getByRole('link', { name: 'Về kết quả', exact: true }).click(); await page.locator('[data-action="retry-wrong"]').click(); await expect(page.locator('#answer-count')).toHaveText('0/49');
});
test('Nộp đúng hết được 10 điểm, lịch sử được giữ sau reload', async ({ page }) => {
  await openPractice(page);
  const questions = (await savedAttempt(page)).questions;
  for (let i = 0; i < questions.length; i++) { await page.locator(`[data-answer="${questions[i].answer}"]`).click(); if (i < questions.length - 1) await page.locator('[data-action="next"]').click(); }
  await submit(page); await expect(page.locator('.result-score')).toContainText('10'); await expect(page.locator('.correct-stat')).toHaveText('50');
  await page.goto('/#history'); await page.reload(); await expect(page.locator('.history-row')).toHaveCount(1);
});
test('Thi thử tạo 30 câu cân bằng, không lộ đáp án; đồng hồ không reset', async ({ page }) => {
  await startExam(page);
  await expect(page.locator('#instant-check')).toHaveCount(0); await page.locator('[data-answer="0"]').click(); await expect(page.locator('.explanation')).toHaveCount(0);
  const first = await page.evaluate(k => JSON.parse(localStorage.getItem(k)).drafts.exam, key);
  expect(new Set(first.questions.map(q => q.id)).size).toBe(30);
  for (const topic of bank.topics) expect(first.questions.filter(q => q.topicId === topic.id).length).toBe(5);
  await page.reload(); const second = await page.evaluate(k => JSON.parse(localStorage.getItem(k)).drafts.exam, key); expect(second.deadline).toBe(first.deadline);
});
test('Thi hết giờ tự nộp sau khi mở lại trang', async ({ page }) => {
  await startExam(page); await expect(page.locator('#timer-value')).toBeVisible();
  await page.addInitScript(k => { const s = JSON.parse(localStorage.getItem(k)); if (s?.drafts?.exam) { s.drafts.exam.startedAt = Date.now() - 1900000; s.drafts.exam.deadline = Date.now() - 1000; localStorage.setItem(k, JSON.stringify(s)); } }, key);
  await page.reload(); await expect(page.locator('.result-score')).toBeVisible(); await expect(page.getByText('Tự động nộp khi hết giờ', { exact: false })).toBeVisible();
});
test('Thi hết giờ khi đang ôn chủ đề khác không làm mất bài đang ôn', async ({ page }) => {
  await startExam(page); await expect(page.locator('#timer-value')).toBeVisible();
  await page.addInitScript(k => { const s = JSON.parse(localStorage.getItem(k)); if (s?.drafts?.exam) { s.drafts.exam.startedAt = Date.now() - 1900000; s.drafts.exam.deadline = Date.now() - 1000; localStorage.setItem(k, JSON.stringify(s)); } }, key);
  await page.goto('/#practice/basics'); await page.reload(); await expect(page.locator('.answer-option')).toHaveCount(4);
  await expect.poll(() => page.evaluate(k => JSON.parse(localStorage.getItem(k)).history.length, key)).toBe(1); await expect(page.locator('#question-title')).toContainText((await savedAttempt(page)).questions[0].text);
});
test('Nhập tên trước khi thi và xếp hạng theo số câu đúng rồi thời gian', async ({ page }) => {
  await startExam(page, 'Duy Nấm');
  const attempt = await savedAttempt(page, 'exam'); expect(attempt.playerName).toBe('Duy Nấm');
  for (let i = 0; i < attempt.questions.length; i++) {
    await page.locator(`[data-answer="${attempt.questions[i].answer}"]`).click();
    if (i < attempt.questions.length - 1) await page.locator('[data-action="next"]').click();
  }
  await submit(page);
  await page.evaluate(key => {
    const state = JSON.parse(localStorage.getItem(key)), best = state.history[0];
    const slower = structuredClone(best); slower.id = 'slower'; slower.playerName = 'Anh Chậm'; slower.startedAt = slower.submittedAt - 90000;
    const lessCorrect = structuredClone(best); lessCorrect.id = 'less-correct'; lessCorrect.playerName = 'Bình Nhanh'; lessCorrect.startedAt = lessCorrect.submittedAt - 10000; delete lessCorrect.answers[lessCorrect.questions[0].id];
    state.history = [lessCorrect, slower, best]; localStorage.setItem(key, JSON.stringify(state));
  }, key);
  await page.reload(); await page.goto('/#practice');
  await expect(page.locator('.home-ranking-card')).toHaveCount(3);
  await expect(page.locator('.home-ranking-card').nth(0)).toContainText('Duy Nấm');
  await expect(page.locator('.home-ranking-card').nth(1)).toContainText('Anh Chậm');
  await expect(page.locator('.home-ranking-card').nth(2)).toContainText('Bình Nhanh');
  await page.goto('/#ranking');
  await expect(page.locator('.ranking-table tbody tr')).toHaveCount(3);
  await expect(page.locator('.ranking-table tbody tr').nth(0)).toContainText('Duy Nấm');
  await expect(page.locator('.ranking-table tbody tr').nth(1)).toContainText('Anh Chậm');
  await expect(page.locator('.ranking-table tbody tr').nth(2)).toContainText('Bình Nhanh');
});
test('Thêm câu hỏi, xuất ngân hàng, khôi phục bộ mẫu', async ({ page }) => {
  await page.goto('/#library'); await page.locator('[data-action="add-question"]').click();
  await page.locator('#new-question').fill('Câu hỏi kiểm thử: 2 + 2 bằng bao nhiêu?');
  for (let i = 0; i < 4; i++) await page.locator(`#new-option-${i}`).fill(String(i + 2));
  await page.locator('#new-answer').selectOption('2'); await page.locator('#new-explanation').fill('Hai cộng hai bằng bốn.');
  await page.getByRole('button', { name: 'Lưu câu hỏi', exact: true }).click(); await expect(page.getByRole('heading', { name: '301 câu hỏi · 6 chủ đề' })).toBeVisible();
  const download = page.waitForEvent('download'); await page.locator('[data-action="export-bank"]').click(); expect((await download).suggestedFilename()).toBe('questions.json');
  await page.locator('[data-action="reset-bank"]').click(); await page.locator('[data-action="confirm-dialog"]').click(); await expect(page.getByRole('heading', { name: '300 câu hỏi · 6 chủ đề' })).toBeVisible();
});
test('JSON lỗi không ghi đè ngân hàng hiện tại', async ({ page }) => {
  await page.goto('/#library'); await page.locator('#bank-file').setInputFiles({ name: 'bad.json', mimeType: 'application/json', buffer: Buffer.from('{"version":1}') });
  await expect(page.locator('#toast')).toContainText('Không nhập được'); await expect(page.getByRole('heading', { name: '300 câu hỏi · 6 chủ đề' })).toBeVisible();
});
test('Nhập ngân hàng hợp lệ, nội dung HTML được hiển thị như chữ, không thực thi', async ({ page }) => {
  const imported = structuredClone(bank); imported.questions[0].text = '<img src=x onerror="window.xss=1"> Câu hỏi an toàn';
  await page.goto('/#library'); await page.locator('#bank-file').setInputFiles({ name: 'bank.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(imported)) });
  await page.locator('[data-action="confirm-dialog"]').click(); await page.goto('/#practice/basics'); const a = await savedAttempt(page); const i = a.questions.findIndex(q => q.id === imported.questions[0].id); await page.locator(`[data-action="jump"][data-index="${i}"]`).click(); await expect(page.locator('#question-title')).toContainText('<img');
  expect(await page.evaluate(() => window.xss)).toBeUndefined(); await expect(page.locator('#question-title img')).toHaveCount(0);
});
test('Dữ liệu localStorage hỏng không làm sập ứng dụng', async ({ page }) => {
  await page.addInitScript(k => localStorage.setItem(k, '{bad json'), key); await page.goto('/'); await expect(page.locator('.topic-card[data-search]')).toHaveCount(6); await expect(page.locator('#storage-notice')).toBeVisible();
});
test('Bộ nhớ bị chặn vẫn làm và nộp bài được, có thông báo', async ({ page }) => {
  await page.addInitScript(() => { Storage.prototype.setItem = () => { throw new DOMException('Blocked', 'QuotaExceededError'); }; });
  await openPractice(page); await page.locator('[data-answer="0"]').click(); await expect(page.locator('#storage-notice')).toBeVisible(); await submit(page); await expect(page.locator('.result-score')).toBeVisible();
});
test('Phím 1–4, điều hướng và hủy hộp thoại hoạt động', async ({ page }) => {
  await openPractice(page); await page.keyboard.press('2'); await expect(page.locator('[data-answer="1"]')).toHaveAttribute('aria-pressed', 'true');
  await page.keyboard.press('ArrowRight'); await expect(page.locator('#question-title')).toContainText((await savedAttempt(page)).questions[1].text);
  await page.locator('[data-action="submit"]').first().click(); await page.keyboard.press('Escape'); await expect(page.locator('#dialog')).not.toBeVisible(); await expect(page.locator('.answer-option')).toHaveCount(4);
});
test('Đường dẫn practice.html và tài nguyên tương đối hoạt động', async ({ page }) => {
  await page.goto('/practice.html#practice'); await expect(page.locator('.topic-card[data-search]')).toHaveCount(6); expect(await page.evaluate(() => document.fonts.check('14px Inter'))).toBeTruthy();
});
test('Không có lỗi JavaScript hoặc tài nguyên lỗi trên các màn chính', async ({ page }) => {
  const errors = []; page.on('pageerror', e => errors.push(e.message)); page.on('response', r => { if (r.status() >= 400) errors.push(`${r.status()} ${r.url()}`); });
  for (const route of ['practice', 'exam', 'ranking', 'history', 'library', 'practice/excel']) { await page.goto(`/#${route}`); await expect(page.locator('h1')).toHaveCount(1); }
  expect(errors).toEqual([]);
});
test('Hai tab nhận thay đổi và không ghi đè bài đã nộp', async ({ page, context }) => {
  await openPractice(page); const other = await context.newPage(); await other.goto('/#practice/basics');
  await page.locator('[data-answer="0"]').click(); await expect(other.locator('[data-answer="0"]')).toHaveAttribute('aria-pressed', 'true');
  await submit(page); await expect(other.locator('.result-score')).toBeVisible();
  await other.goto('/#history'); await expect(other.locator('.history-row')).toHaveCount(1); await other.close();
});
test('Lượt ôn mới trộn đủ 50 câu, giữ lựa chọn; reload không trộn lại', async ({ page }) => {
  await openPractice(page); const first = await savedAttempt(page);
  expect(first.questions).toHaveLength(50); expect(new Set(first.questions.map(q => q.id)).size).toBe(50);
  expect(first.questions.map(q => q.id)).not.toEqual(bank.questions.filter(q => q.topicId === 'basics').map(q => q.id));
  await page.locator('[data-action="new-practice"]').click(); await page.locator('[data-action="confirm-dialog"]').click();
  const second = await savedAttempt(page); expect(second.id).not.toBe(first.id); expect(second.questions.map(q => q.id)).not.toEqual(first.questions.map(q => q.id));
  expect([...second.questions.map(q => q.id)].sort()).toEqual([...first.questions.map(q => q.id)].sort());
  for (const q of second.questions) expect(q.options).toEqual(bank.questions.find(old => old.id === q.id).options);
  await page.reload(); const third = await savedAttempt(page); expect(third.id).toBe(second.id); expect(third.questions).toEqual(second.questions);
});
test('Mỗi đề thi mới rút và trộn lại, vẫn đúng 5 câu mỗi module', async ({ page }) => {
  await startExam(page, 'Lượt một'); const first = await savedAttempt(page, 'exam');
  await startExam(page, 'Lượt hai');
  const second = await savedAttempt(page, 'exam'); expect(second.id).not.toBe(first.id); expect(second.questions.map(q => q.id)).not.toEqual(first.questions.map(q => q.id));
  for (const t of bank.topics) expect(second.questions.filter(q => q.topicId === t.id)).toHaveLength(5);
});
test('Câu gốc có 3 lựa chọn hiển thị đủ, phím 4 không tạo đáp án ảo', async ({ page }) => {
  const special = bank.questions.find(q => q.options.length === 3);
  await page.goto(`/#practice/${special.topicId}`); await page.locator('.answer-option').first().waitFor(); const a = await savedAttempt(page, special.topicId);
  const index = a.questions.findIndex(q => q.id === special.id); await page.locator(`[data-action="jump"][data-index="${index}"]`).click();
  await expect(page.locator('.answer-option')).toHaveCount(3); await page.keyboard.press('4');
  expect((await savedAttempt(page, special.topicId)).answers[special.id]).toBeUndefined();
  await page.locator('#instant-check').check(); await page.locator(`[data-answer="${special.answer}"]`).click(); await expect(page.locator('.answer-option.correct')).toHaveCount(1);
});
test('Tất cả 17 hình của câu hỏi tải được; hiển thị đúng hình theo câu sau trộn', async ({ page, request }) => {
  const illustrated = bank.questions.filter(q => q.imageUrl);
  expect(illustrated).toHaveLength(17);
  for (const q of illustrated) { const r = await request.get(`/${q.imageUrl}`); expect(r.status()).toBe(200); expect(r.headers()['content-type']).toMatch(/^image\//); }
  const q = illustrated[0]; await page.goto(`/#practice/${q.topicId}`); await page.locator('.answer-option').first().waitFor(); const a = await savedAttempt(page, q.topicId);
  await page.locator(`[data-action="jump"][data-index="${a.questions.findIndex(item => item.id === q.id)}"]`).click();
  await expect(page.locator('.question-image')).toHaveAttribute('src', `./${q.imageUrl}`);
  await expect.poll(() => page.locator('.question-image').evaluate(img => img.complete && img.naturalWidth > 0)).toBe(true);
  await page.screenshot({ path: 'artifacts/workspace-v2/question-with-image.png', fullPage: true });
});
test('Đổi bộ 120 cũ sang bộ 300 giữ bản sao nháp và lịch sử cũ', async ({ page }) => {
  const draft = { id: 'legacy-draft', mode: 'practice', topicId: 'basics', title: 'Bài cũ', questions: bank.questions.slice(0, 20), answers: {}, flags: [], current: 0, instant: false, startedAt: 1700000000000, deadline: null, submittedAt: null, schema: 1 };
  await page.addInitScript(({ key, draft }) => { if (!localStorage.getItem(key)) localStorage.setItem(key, JSON.stringify({ drafts: { basics: draft }, history: [{ ...draft, id: 'legacy-result', submittedAt: 1700000300000 }] })); }, { key, draft });
  await openPractice(page); await expect(page.locator('.q-cell')).toHaveCount(50);
  const stored = await page.evaluate(key => JSON.parse(localStorage.getItem(key)), key);
  expect(stored.archivedDrafts[0].questions).toHaveLength(20); expect(stored.history[0].id).toBe('legacy-result');
  await page.goto('/#library'); await expect(page.locator('[data-action="export-archived"]')).toBeVisible();
});
test('Tên Ôn tập tin học và bố cục khớp ảnh ở màn 1200×550', async ({ page }) => {
  await page.setViewportSize({ width: 1200, height: 550 }); await openPractice(page);
  await expect(page.locator('.brand-name')).toHaveText('Ôn tập tin học'); await expect(page).toHaveTitle(/Ôn tập tin học/);
  const sidebar = await page.locator('.question-sidebar').boundingBox(), question = await page.locator('.question-pane').boundingBox(), answers = await page.locator('.answers-pane').boundingBox();
  expect(sidebar.x + sidebar.width).toBeLessThanOrEqual(question.x); expect(question.y + question.height).toBeLessThan(answers.y);
  const nav = await page.locator('.question-nav').boundingBox(); expect(nav.y + nav.height).toBeLessThanOrEqual(551);
  await expect(page.locator('#instant-check')).toBeVisible();
  const bottom = await page.locator('.workspace-version').boundingBox(); expect(bottom.y + bottom.height).toBeLessThanOrEqual(551);
});
for (const width of [375, 768, 1280, 1920]) test(`Không tràn ngang ở ${width}px trên mọi màn chính`, async ({ page }) => {
  await page.setViewportSize({ width, height: 900 });
  for (const route of ['practice', 'exam', 'ranking', 'history', 'library', 'practice/word']) {
    await page.goto(`/#${route}`); await expect(page.locator('h1')).toBeVisible();
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1); expect(overflow, route).toBe(false);
  }
  await page.screenshot({ path: `artifacts/workspace-${width}.png`, fullPage: true });
  await page.goto('/'); await expect(page.locator('.topic-card[data-search]')).toHaveCount(6); await page.screenshot({ path: `artifacts/home-${width}.png`, fullPage: true });
});
test('Bộ đề Lớp học Củ Chi có 100 câu từ IU03, IU04, IU05', async ({ page }) => {
  const set = JSON.parse(await readFile(new URL('../../site/data/lop-cu-chi.json', import.meta.url)));
  expect(set.title).toBe('Lớp học Củ Chi'); expect(set.questions).toHaveLength(100); expect(new Set(set.questions.map(q => q.id)).size).toBe(100);
  expect(set.questions.every(q => ['word', 'excel', 'powerpoint'].includes(q.topicId))).toBe(true);
  await page.goto('/'); await expect(page.locator('.class-set-card h3')).toHaveText('Lớp học Củ Chi');
  await page.locator('.class-set-card a').click(); await expect(page.locator('.q-cell')).toHaveCount(100);
  expect((await savedAttempt(page, 'cuchi')).title).toBe('Lớp học Củ Chi');
});