from pathlib import Path
root = Path(__file__).resolve().parent.parent
p = root / 'site/app.js'
s = p.read_text(encoding='utf-8')
changes = {
    "customBank ? 'Ngân hàng tùy chỉnh' : 'Bộ luyện tập mẫu'": "customBank ? 'Ngân hàng tùy chỉnh' : 'Ngân hàng 300 câu'",
    "customBank ? 'Bản tùy chỉnh' : 'Bộ mẫu'": "customBank ? 'Bản tùy chỉnh' : 'Bộ 300 câu'",
    'Trắc nghiệm 4 lựa chọn': 'Trắc nghiệm nhiều lựa chọn',
    'Mỗi câu có 4 lựa chọn, một đáp án đúng và giải thích.': 'Mỗi câu có 2–4 lựa chọn, một đáp án đúng và giải thích.',
    'Mỗi lượt ôn lấy tối đa ${CONFIG.practiceLimit} câu đầu của chủ đề.': 'Mỗi lượt ôn mới trộn và lấy tối đa ${CONFIG.practiceLimit} câu của chủ đề.',
    "btn('Khôi phục bộ mẫu', 'reset-bank'": "btn('Dùng bộ 300 câu gốc', 'reset-bank'",
    "confirmAction('Khôi phục bộ câu hỏi mẫu?'": "confirmAction('Dùng lại bộ 300 câu gốc?'",
    "'Khôi phục bộ mẫu', () => replaceBank": "'Dùng bộ gốc', () => replaceBank",
    'Ngu?n c?u h?i:': 'Nguồn câu hỏi:',
    'T?i b?n sao ${state.archivedDrafts.length} b?i c?': 'Tải bản sao ${state.archivedDrafts.length} bài cũ',
    'Lượt mới · Trộn lại câu': 'Lượt mới (trộn câu)',
}
for old, new in changes.items():
    assert old in s, old
    s = s.replace(old, new)
p.write_text(s, encoding='utf-8')
p = root / 'site/data/NGUON_CAU_HOI.md'
p.write_text(p.read_text(encoding='utf-8').replace('logo riêng Tin học Duy Nấm', 'logo riêng Ôn tập tin học'), encoding='utf-8')
p = root / 'tests/browser/app.spec.mjs'
s = p.read_text(encoding='utf-8')
s = s.replace("const key = 'duynam.learning.v1';", "const key = 'duynam.learning.v1';\nasync function savedAttempt(page, draftKey = 'basics') { return page.evaluate(({ key, draftKey }) => JSON.parse(localStorage.getItem(key)).drafts[draftKey], { key, draftKey }); }")
s = s.replace("await openPractice(page); await page.locator('[data-answer=\"0\"]').click(); await page.locator('[data-action=\"flag\"]').click();", "await openPractice(page); const initial = await savedAttempt(page); await page.locator('[data-answer=\"0\"]').click(); await page.locator('[data-action=\"flag\"]').click();")
s = s.replace("await expect(page.locator('#question-title')).toContainText(bank.questions[1].text);", "await expect(page.locator('#question-title')).toContainText((await savedAttempt(page)).questions[1].text);")
s = s.replace("await expect(page.locator('#question-title')).toContainText(bank.questions[0].text);", "await expect(page.locator('#question-title')).toContainText((await savedAttempt(page)).questions[0].text);")
s = s.replace('Nộp một câu đúng, 19 câu trống', 'Nộp một câu đúng, 49 câu trống')
s = s.replace("await openPractice(page); await page.locator(`[data-answer=\"${bank.questions[0].answer}\"]`).click(); await submit(page);", "await openPractice(page); const a = await savedAttempt(page); await page.locator(`[data-answer=\"${a.questions[0].answer}\"]`).click(); await submit(page);")
s = s.replace("toContainText('0,5')", "toContainText('0,2')").replace("toHaveText('0/19')", "toHaveText('0/49')")
s = s.replace("const questions = bank.questions.filter(q => q.topicId === 'basics');", "const questions = (await savedAttempt(page)).questions;")
s = s.replace("toHaveText('20')", "toHaveText('50')")
s = s.replace('121 câu hỏi · 6 chủ đề', '301 câu hỏi · 6 chủ đề').replace('120 câu hỏi · 6 chủ đề', '300 câu hỏi · 6 chủ đề')
s = s.replace("await page.goto('/#practice/basics'); await expect(page.locator('#question-title')).toContainText('<img');", "await page.goto('/#practice/basics'); const a = await savedAttempt(page); const i = a.questions.findIndex(q => q.id === imported.questions[0].id); await page.locator(`[data-action=\"jump\"][data-index=\"${i}\"]`).click(); await expect(page.locator('#question-title')).toContainText('<img');")
p.write_text(s, encoding='utf-8')
print('Updated UTF-8 copy and browser test expectations.')
