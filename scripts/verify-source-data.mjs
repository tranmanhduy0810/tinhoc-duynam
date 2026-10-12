import { readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import assert from 'node:assert/strict';
const raw = await readFile(new URL('../artifacts/reference-questions.js', import.meta.url), 'utf8');
const original = JSON.parse(raw.slice(raw.indexOf('[')).trim().replace(/;$/, ''));
const bank = JSON.parse(await readFile(new URL('../site/data/questions.json', import.meta.url), 'utf8'));
const manifest = JSON.parse(await readFile(new URL('../site/data/source-manifest.json', import.meta.url), 'utf8'));
const mapping = ['basics', 'computer', 'internet', 'word', 'excel', 'powerpoint'];
assert.equal(original.length, 300); assert.equal(bank.questions.length, 300);
for (const q of original) {
  const converted = bank.questions.find(item => item.id === `tinhockp-${String(q.id).padStart(3, '0')}`);
  assert.ok(converted); assert.equal(converted.topicId, mapping[q.module - 1]);
  assert.equal(converted.text, q.question); assert.deepEqual(converted.options, q.options);
  assert.equal(converted.answer, q.answer); assert.equal(converted.explanation, q.explanation); assert.equal(converted.imageUrl || null, q.imageUrl || null);
}
for (const asset of manifest.images) {
  const image = await readFile(new URL(`../site/${asset.path}`, import.meta.url));
  assert.equal(createHash('sha256').update(image).digest('hex'), asset.sha256);
}
console.log('Đối chiếu đạt: 300/300 câu giữ nguyên nội dung, lựa chọn, đáp án, giải thích và liên kết ảnh; 17/17 ảnh khớp SHA-256.');
