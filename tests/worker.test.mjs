import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizeName, validateScore } from '../worker/src/index.js';
test('Chuẩn hóa tên để mỗi thí sinh chỉ có một thành tích tốt nhất', () => { assert.equal(normalizeName('  Nguyễn   Văn Đạt '), 'nguyen van dat'); });
test('Worker chỉ nhận kết quả thi hợp lệ', () => {
  const score = validateScore({ playerName: 'Duy Nấm', correct: 27, total: 30, duration: 800, submittedAt: Date.now(), attemptId: '12345678-abcd' });
  assert.equal(score.nameKey, 'duy nam');
  assert.throws(() => validateScore({ ...score, correct: 31 }), /Kết quả/);
  assert.throws(() => validateScore({ ...score, duration: 1801 }), /Thời gian/);
});
