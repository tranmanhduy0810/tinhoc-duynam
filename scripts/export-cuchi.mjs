// Xuất bộ đề "Lớp học Củ Chi" thành HTML (đề + đáp án) để chuyển sang Word/PDF.
// Chạy: node scripts/export-cuchi.mjs <thư mục ra>
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { fileURLToPath, pathToFileURL } from 'node:url';
import path from 'node:path';
const root = fileURLToPath(new URL('../', import.meta.url));
const outDir = path.resolve(process.argv[2] || path.join(root, 'xuat-de'));
await mkdir(outDir, { recursive: true });
const set = JSON.parse(await readFile(path.join(root, 'site/data/lop-cu-chi.json'), 'utf8'));
const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
const letters = ['A', 'B', 'C', 'D'];
const style = `<style>body{font-family:'Times New Roman';font-size:13pt;line-height:1.35}h1{text-align:center;font-size:18pt;margin:0}p.sub{text-align:center;margin:4pt 0 14pt}.q{margin:0 0 9pt}.q b{font-weight:bold}.opt{margin:0 0 0 18pt}img{max-width:420px}table{border-collapse:collapse}td{border:1px solid #000;padding:3pt 8pt;text-align:center}</style>`;
const head = `<h1>${esc(set.title.toUpperCase())}</h1><p class="sub">Đề ôn tập ${set.questions.length} câu · ${esc(set.topicCodes.join(', '))} (Word, Excel, PowerPoint)</p><p>Họ và tên: ................................................ Lớp: ....................</p>`;
const body = set.questions.map((q, i) => {
  const img = q.imageUrl ? `<p class="opt"><img src="${pathToFileURL(path.join(root, 'site', q.imageUrl)).href}"></p>` : '';
  return `<div class="q"><p><b>Câu ${i + 1}.</b> ${esc(q.text)}</p>${img}${q.options.map((o, j) => `<p class="opt">${letters[j]}. ${esc(o)}</p>`).join('')}</div>`;
}).join('\n');
await writeFile(path.join(outDir, 'de.html'), `<html><head><meta charset="utf-8">${style}</head><body>${head}${body}</body></html>`);
const rows = [];
for (let i = 0; i < set.questions.length; i += 10) {
  const chunk = set.questions.slice(i, i + 10);
  rows.push(`<tr>${chunk.map((_, j) => `<td><b>${i + j + 1}</b></td>`).join('')}</tr><tr>${chunk.map(q => `<td>${letters[q.answer]}</td>`).join('')}</tr>`);
}
await writeFile(path.join(outDir, 'dapan.html'), `<html><head><meta charset="utf-8">${style}</head><body><h1>ĐÁP ÁN · ${esc(set.title.toUpperCase())}</h1><p class="sub">${set.questions.length} câu</p><table>${rows.join('')}</table></body></html>`);
console.log(`Đã tạo HTML trong ${outDir}`);
