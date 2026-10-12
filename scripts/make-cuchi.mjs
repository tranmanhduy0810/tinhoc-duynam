// Tạo bộ đề "Lớp học Củ Chi": 100 câu từ IU03 (Word), IU04 (Excel), IU05 (PowerPoint).
// Chạy: node scripts/make-cuchi.mjs  → ghi site/data/lop-cu-chi.json
import { readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
const root = fileURLToPath(new URL('../', import.meta.url));
const bank = JSON.parse(await readFile(path.join(root, 'site/data/questions.json'), 'utf8'));
const plan = [['word', 34], ['excel', 33], ['powerpoint', 33]];
const seen = new Set(), questions = [];
for (const [topicId, count] of plan) {
  const pool = bank.questions.filter(q => q.topicId === topicId).filter(q => {
    const key = q.text.trim().toLowerCase().replace(/\s+/g, ' ');
    if (seen.has(key)) return false; seen.add(key); return true;
  });
  if (pool.length < count) throw new Error(`Chủ đề ${topicId} chỉ có ${pool.length} câu không trùng.`);
  questions.push(...pool.slice(0, count));
}
const set = { version: 1, id: 'cuchi', title: 'Lớp học Củ Chi', description: '100 câu ôn tập Word (IU03), Excel (IU04) và PowerPoint (IU05) dành cho lớp Củ Chi.', topicCodes: ['IU03', 'IU04', 'IU05'], questions };
await writeFile(path.join(root, 'site/data/lop-cu-chi.json'), JSON.stringify(set, null, 2) + '\n');
console.log(`Đã tạo bộ đề ${set.title}: ${questions.length} câu (${plan.map(([t, c]) => `${t} ${c}`).join(', ')}).`);
