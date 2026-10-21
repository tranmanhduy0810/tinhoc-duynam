import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const root = path.join(__dirname, '..');

const data = JSON.parse(fs.readFileSync(path.join(root, 'site/data/lop-cu-chi.json'), 'utf8'));

// Tạo CSV
const csvRows = [['STT', 'ID', 'Chủ đề', 'Câu hỏi', 'A', 'B', 'C', 'D', 'Đáp án đúng', 'Giải thích', 'Hình ảnh']];
data.questions.forEach((q, i) => {
  csvRows.push([
    i+1,
    q.id,
    q.topicId,
    q.text,
    q.options[0] || '',
    q.options[1] || '',
    q.options[2] || '',
    q.options[3] || '',
    q.options[q.answer] || '',
    q.explanation,
    q.imageUrl || ''
  ]);
});
const csv = csvRows.map(r => r.map(c => '"' + String(c).replace(/"/g, '""') + '"').join(',')).join('\r\n');
fs.writeFileSync(path.join(root, 'site/data/cuchi-50-cau.csv'), '\uFEFF' + csv); // BOM for Excel

// Tạo JSON full
fs.writeFileSync(path.join(root, 'site/data/cuchi-50-cau.json'), JSON.stringify({questions: data.questions}, null, 2));

console.log('Đã tạo: site/data/cuchi-50-cau.csv và site/data/cuchi-50-cau.json');
console.log('Truy cập: https://tranmanhduy0810.github.io/tinhoc-duynam/data/cuchi-50-cau.csv');
console.log('Hoặc local: http://127.0.0.1:4173/data/cuchi-50-cau.csv');