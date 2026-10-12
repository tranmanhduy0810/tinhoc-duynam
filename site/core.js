export function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]);
}
export function validateBank(bank) {
  if (!bank || bank.version !== 1 || !Array.isArray(bank.topics) || !Array.isArray(bank.questions)) throw new Error('Tệp cần có version: 1, topics và questions.');
  if (bank.topics.length !== 6) throw new Error('Ngân hàng cần đúng 6 chủ đề.');
  if (bank.questions.length < 30 || bank.questions.length > 10000) throw new Error('Ngân hàng cần từ 30 đến 10.000 câu hỏi.');
  const topicIds = new Set();
  const isText = (s, max) => typeof s === 'string' && s.trim().length > 0 && s.length <= max;
  const safeId = s => /^[a-zA-Z0-9_-]+$/.test(s) && !['__proto__', 'constructor', 'prototype'].includes(s);
  for (const topic of bank.topics) {
    if (!isText(topic.id, 40) || !safeId(topic.id) || topicIds.has(topic.id) || !isText(topic.title, 120) || !isText(topic.description, 400) || !isText(topic.code, 30)) throw new Error('Chủ đề không hợp lệ hoặc trùng mã.');
    topicIds.add(topic.id);
  }
  const ids = new Set();
  for (const [index, q] of bank.questions.entries()) {
    if (!isText(q.id, 80) || !safeId(q.id) || ids.has(q.id) || !topicIds.has(q.topicId) || !isText(q.text, 3000) || !Array.isArray(q.options) || q.options.length < 2 || q.options.length > 4 || q.options.some(o => !isText(o, 1500)) || new Set(q.options.map(o => o.trim())).size !== q.options.length || !Number.isInteger(q.answer) || q.answer < 0 || q.answer >= q.options.length || !isText(q.explanation, 4000)) throw new Error(`Câu ${index + 1} không hợp lệ: cần ID riêng, 2–4 lựa chọn khác nhau, answer là chỉ số lựa chọn đúng và giải thích.`);
    if (q.imageUrl && (typeof q.imageUrl !== 'string' || !/^assets\/images\/[a-zA-Z0-9_-]+\.(png|jpg|jpeg|webp|gif)$/.test(q.imageUrl))) throw new Error(`Hình ảnh câu ${index + 1} phải là đường dẫn cục bộ assets/images/ hợp lệ.`);
    ids.add(q.id);
  }
  for (const id of topicIds) if (bank.questions.filter(q => q.topicId === id).length < 5) throw new Error(`Chủ đề ${id} cần ít nhất 5 câu để tạo đề thi.`);
  // Whitelist fields: imported files are data, never scripts or markup.
  return { version: 1, topics: bank.topics.map(({ id, code, title, description, icon }) => ({ id, code, title, description, icon: typeof icon === 'string' ? icon : 'book-open' })), questions: bank.questions.map(({ id, topicId, text, options, answer, explanation, imageUrl }) => ({ id, topicId, text, options, answer, explanation, ...(imageUrl ? { imageUrl } : {}) })) };
}
export function shuffle(items, random = Math.random) {
  const result = [...items];
  for (let i = result.length - 1; i > 0; i--) { const j = Math.floor(random() * (i + 1)); [result[i], result[j]] = [result[j], result[i]]; }
  return result;
}
export function selectExam(bank, count = 30, random = Math.random) {
  if (!Number.isInteger(count) || count < 1 || count > bank.questions.length) throw new Error('Số câu thi vượt quá ngân hàng câu hỏi.');
  const pools = bank.topics.map(t => shuffle(bank.questions.filter(q => q.topicId === t.id), random));
  const selected = [];
  while (selected.length < count) for (const pool of pools) if (pool.length && selected.length < count) selected.push(pool.pop());
  return shuffle(selected, random);
}
export function selectPractice(bank, topicId, count = 50, random = Math.random) {
  const pool = bank.questions.filter(q => q.topicId === topicId);
  if (!pool.length || !Number.isInteger(count) || count < 1) throw new Error('Chủ đề hoặc số câu ôn tập không hợp lệ.');
  return shuffle(pool, random).slice(0, count);
}
export function createAttempt(questions, { mode = 'practice', topicId = null, title, minutes = 30, now = Date.now() } = {}) {
  return { id: crypto.randomUUID(), mode, topicId, title, questions: structuredClone(questions), answers: {}, flags: [], current: 0, instant: false, startedAt: now, deadline: mode === 'exam' ? now + minutes * 60000 : null, submittedAt: null, schema: 1 };
}
export function grade(attempt) {
  let correct = 0, answered = 0;
  for (const q of attempt.questions) {
    if (Number.isInteger(attempt.answers[q.id])) { answered++; if (attempt.answers[q.id] === q.answer) correct++; }
  }
  const total = attempt.questions.length;
  return { total, correct, answered, wrong: answered - correct, unanswered: total - answered, percent: Math.round(correct / total * 100), score: Number((correct / total * 10).toFixed(1)) };
}
export function secondsLeft(attempt, now = Date.now()) { return attempt.deadline ? Math.max(0, Math.ceil((attempt.deadline - now) / 1000)) : null; }
export function formatTime(seconds) { return `${String(Math.floor(seconds / 60)).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`; }
export function isAttempt(value) {
  return !!value && value.schema === 1 && typeof value.id === 'string' && ['practice', 'exam', 'retry'].includes(value.mode) && Array.isArray(value.questions) && value.questions.length > 0 && value.questions.every(q => typeof q.id === 'string' && typeof q.text === 'string' && Array.isArray(q.options) && q.options.length >= 2 && q.options.length <= 4 && Number.isInteger(q.answer) && q.answer >= 0 && q.answer < q.options.length) && value.answers && typeof value.answers === 'object' && Array.isArray(value.flags) && Number.isInteger(value.current) && value.current >= 0 && value.current < value.questions.length && Number.isFinite(value.startedAt) && (value.mode !== 'exam' || Number.isFinite(value.deadline));
}
