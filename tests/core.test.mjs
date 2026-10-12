import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { validateBank, selectExam, selectPractice, createAttempt, grade, secondsLeft, formatTime, escapeHtml, isAttempt } from '../site/core.js';
const bank = JSON.parse(await readFile(new URL('../site/data/questions.json', import.meta.url)));
test('Ngân hàng có 300 câu theo ID, 50 câu mỗi chủ đề, đáp án hợp lệ', () => {
  assert.equal(validateBank(bank).questions.length, 300);
  for (const topic of bank.topics) assert.equal(bank.questions.filter(q => q.topicId === topic.id).length, 50);
  assert.equal(new Set(bank.questions.map(q => q.id)).size, 300);
});
test('30 câu thi không trùng và phân bổ 5 câu mỗi chủ đề trong 100 lần tạo', () => {
  for (let i = 0; i < 100; i++) {
    const exam = selectExam(bank); assert.equal(exam.length, 30); assert.equal(new Set(exam.map(q => q.id)).size, 30);
    for (const topic of bank.topics) assert.equal(exam.filter(q => q.topicId === topic.id).length, 5);
  }
});
test('Từ chối số câu vượt ngân hàng hoặc không hợp lệ', () => { for (const count of [0, -1, 301, 2.5]) assert.throws(() => selectExam(bank, count)); });
test('Chấm bài có câu đúng, sai và bỏ trống', () => {
  const a = createAttempt(bank.questions.slice(0, 4)); a.answers[a.questions[0].id] = a.questions[0].answer; a.answers[a.questions[1].id] = (a.questions[1].answer + 1) % 4;
  assert.deepEqual(grade(a), { total: 4, correct: 1, answered: 2, wrong: 1, unanswered: 2, percent: 25, score: 2.5 });
});
test('Thời hạn tuyệt đối không đặt lại theo mỗi lần tính', () => {
  const a = createAttempt(bank.questions.slice(0, 2), { mode: 'exam', minutes: 30, now: 1000 });
  assert.equal(secondsLeft(a, 1000), 1800); assert.equal(secondsLeft(a, 61000), 1740); assert.equal(secondsLeft(a, 1900000), 0);
  assert.equal(formatTime(65), '01:05'); assert.equal(secondsLeft(createAttempt(bank.questions)), null);
});
test('Bài lưu giữ snapshot câu hỏi và không bị đổi theo ngân hàng', () => {
  const input = structuredClone(bank.questions.slice(0, 2)); const a = createAttempt(input); input[0].text = 'Đã thay'; assert.notEqual(a.questions[0].text, input[0].text); assert.equal(isAttempt(a), true);
});
test('Từ chối dữ liệu nhập lỗi, trùng ID, đáp án ngoài 0..3 và thiếu chủ đề', () => {
  for (const change of [b => b.questions[0].answer = 4, b => b.questions[1].id = b.questions[0].id, b => b.questions[0].options[1] = b.questions[0].options[0], b => b.questions[0].topicId = 'invalid', b => b.topics.pop(), b => b.questions[0].explanation = '', b => b.questions[0].id = '<script>']) { const b = structuredClone(bank); change(b); assert.throws(() => validateBank(b)); }
});
test('Mỗi chủ đề cần ít nhất 5 câu để tạo đề cân bằng', () => {
  const b = structuredClone(bank); b.questions = b.questions.filter(q => q.topicId !== 'basics').concat(bank.questions.slice(0, 4)); assert.throws(() => validateBank(b));
});
test('Escape nội dung HTML và thuộc tính không cho chạy mã nhập', () => { assert.equal(escapeHtml('<img onerror="x">&'), '&lt;img onerror=&quot;x&quot;&gt;&amp;'); });
test('Bài lưu sai cấu trúc hoặc vị trí câu không hợp lệ bị loại', () => { assert.equal(isAttempt({}), false); const a = createAttempt(bank.questions); a.current = 999; assert.equal(isAttempt(a), false); });
test('Ôn tập trộn đủ 50 câu, không sửa đáp án hoặc thứ tự lựa chọn gốc', () => {
  const original = bank.questions.filter(q => q.topicId === 'basics');
  const one = selectPractice(bank, 'basics', 50, () => .12), two = selectPractice(bank, 'basics', 50, () => .78);
  assert.equal(new Set(one.map(q => q.id)).size, 50);
  assert.notDeepEqual(one.map(q => q.id), original.map(q => q.id)); assert.notDeepEqual(one.map(q => q.id), two.map(q => q.id));
  for (const q of one) assert.deepEqual(q, original.find(o => o.id === q.id));
});
test('Nguồn có một câu 3 lựa chọn và 17 ảnh, schema giữ nguyên', () => {
  const converted = validateBank(bank);
  assert.equal(converted.questions.filter(q => q.options.length === 3).length, 1);
  assert.equal(converted.questions.find(q => q.options.length === 3).id, 'tinhockp-247');
  assert.equal(converted.questions.filter(q => q.imageUrl).length, 17);
  assert.equal(isAttempt(createAttempt([converted.questions.find(q => q.options.length === 3)])), true);
});
test('Từ chối URL ảnh bên ngoài, đường dẫn vượt thư mục và SVG', () => {
  for (const imageUrl of ['https://example.com/x.jpg', 'assets/images/../../secret.jpg', 'assets/images/x.svg', 'javascript:alert(1)']) { const b = structuredClone(bank); b.questions[0].imageUrl = imageUrl; assert.throws(() => validateBank(b)); }
});
test('Không nhận các ID đặc biệt gây đụng thuộc tính đối tượng', () => { for (const id of ['__proto__', 'constructor', 'prototype']) { const b = structuredClone(bank); b.questions[0].id = id; assert.throws(() => validateBank(b)); } });
