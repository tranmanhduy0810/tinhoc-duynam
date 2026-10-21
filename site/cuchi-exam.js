import { CONFIG } from './config.js';
import { escapeHtml as esc, shuffle, createAttempt, grade, isAttempt, secondsLeft, formatTime } from './core.js';

const KEY = 'duynam.cuchi.exam.v1';
const CLASSES = ['Lớp tin học 1 + 2', 'Lớp tin học 3 + 4'];
const API = ['localhost', '127.0.0.1'].includes(location.hostname) ? '' : CONFIG.leaderboardApiUrl;

const main = document.querySelector('#main');
let bank, attempt, storageWarning = false, syncing = false;

function save() {
  try { localStorage.setItem(KEY, JSON.stringify(attempt)); }
  catch { storageWarning = true; }
}

function shell(body) {
  main.innerHTML = '<a href="./#practice">← Trang ôn tập</a><h1 class="section-gap">Thi tin học Củ Chi</h1><p class="muted">15 câu ngẫu nhiên từ bộ 50 câu · 30 phút</p>' + (storageWarning ? '<p role="alert">Không lưu được tiến độ trên trình duyệt này. Đừng đóng trang khi đang thi.</p>' : '') + '<div class="section-gap">' + body + '</div>';
}

function landing() {
  shell('<section class="panel"><h2>Thông tin học viên</h2><p>Nhập họ tên và chọn lớp trước khi bắt đầu. Họ tên, lớp và kết quả được gửi về hệ thống của lớp; không đưa lên bảng xếp hạng chung.</p><form id="entry-form"><div class="form-field"><label for="full-name">Họ và tên</label><input id="full-name" name="fullName" required minlength="2" maxlength="80" autocomplete="name"></div><div class="form-field"><label for="class-name">Lớp</label><select id="class-name" name="className" required><option value="">-- Chọn lớp --</option>' + CLASSES.map(c => '<option>' + c + '</option>').join('') + '</select></div><p id="form-error" role="alert"></p><button class="btn primary" type="submit">Bắt đầu thi</button></form><a class="btn section-gap" href="./#practice/cuchi">Ôn bộ 50 câu trước khi thi</a></section>');
}

function render() {
  if (!attempt) return landing();
  if (attempt.submittedAt) return result();
  if (secondsLeft(attempt) === 0) return finish(true);
  const q = attempt.questions[attempt.current];
  shell('<section class="panel"><div class="row spread"><strong>' + esc(attempt.playerName) + ' · ' + esc(attempt.className) + '</strong><span id="timer" class="timer">' + formatTime(secondsLeft(attempt)) + '</span></div><div class="question-grid">' + attempt.questions.map((q, i) => '<button class="q-cell ' + (i === attempt.current ? 'current ' : '') + (Number.isInteger(attempt.answers[q.id]) ? 'answered' : '') + '" data-jump="' + i + '">' + (i + 1) + '</button>').join('') + '</div><h2 id="question-title" class="question-text">Câu ' + (attempt.current + 1) + ': ' + esc(q.text) + '</h2>' + (q.imageUrl ? '<img src="./' + esc(q.imageUrl) + '" alt="Hình minh họa câu hỏi">' : '') + q.options.map((o, i) => '<button class="answer-option ' + (attempt.answers[q.id] === i ? 'selected' : '') + '" data-answer="' + i + '" aria-pressed="' + (attempt.answers[q.id] === i) + '">' + String.fromCharCode(65 + i) + '. ' + esc(o) + '</button>').join('') + '<div class="row spread section-gap"><button class="btn" data-step="-1" ' + (attempt.current === 0 ? 'disabled' : '') + '>Câu trước</button><button class="btn" data-step="1" ' + (attempt.current === 14 ? 'disabled' : '') + '>Câu tiếp</button><button class="btn primary" id="submit-exam">Nộp bài</button></div><p class="small muted section-gap">Đã trả lời ' + grade(attempt).answered + '/15 câu. Tiến độ được lưu trên thiết bị này.</p></section>');
}

function finish(auto = false) {
  if (!attempt || attempt.submittedAt) return;
  attempt.submittedAt = auto ? attempt.deadline : Date.now();
  attempt.autoSubmitted = auto;
  save();
  result();
  void sync();
}

function result() {
  const g = grade(attempt);
  shell('<section class="panel"><h2>Kết quả bài thi</h2><p>' + esc(attempt.playerName) + ' · ' + esc(attempt.className) + '</p><div class="result-score">' + g.score.toLocaleString('vi-VN') + ' / 10</div><p>' + g.correct + '/15 câu đúng · ' + formatTime(Math.min(1800, Math.round((attempt.submittedAt - attempt.startedAt) / 1000))) + '</p>' + (attempt.autoSubmitted ? '<p>Tự động nộp khi hết giờ.</p>' : '') + '<p id="sync-status" role="status" class="section-gap">' + (attempt.synced ? 'Đã lưu kết quả về hệ thống lớp.' : API ? 'Kết quả đã lưu trên máy; đang chờ gửi về hệ thống.' : 'Bản local: kết quả chỉ lưu trên trình duyệt.') + '</p>' + (!attempt.synced && API ? '<button class="btn section-gap" id="retry-sync">Gửi lại kết quả</button>' : '') + '<div class="row section-gap"><button class="btn" id="download-result">Tải kết quả</button><button class="btn" id="new-exam">Làm bài mới</button></div></section>');
}

async function sync() {
  if (!API || !attempt?.submittedAt || attempt.synced || syncing) return;
  const current = attempt;
  syncing = true;
  try {
    const r = await fetch(API + '/api/cuchi/results', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      signal: AbortSignal.timeout(15000),
      body: JSON.stringify({
        attemptId: current.id,
        playerName: current.playerName,
        className: current.className,
        questionIds: current.questions.map(q => q.id),
        answers: current.answers,
        duration: Math.min(1800, Math.max(0, Math.round((current.submittedAt - current.startedAt) / 1000)))
      })
    });
    if (!r.ok) throw Error('HTTP ' + r.status);
    current.synced = true;
    if (attempt === current) { save(); result(); }
  } catch {
    const el = document.querySelector('#sync-status');
    if (el) el.textContent = 'Chưa gửi được kết quả. Bài đã lưu trên máy; bấm Gửi lại kết quả khi có mạng.';
  } finally { syncing = false; }
}

main.addEventListener('submit', e => {
  if (e.target.id !== 'entry-form') return;
  e.preventDefault();
  const f = new FormData(e.target);
  const name = String(f.get('fullName')).trim().replace(/\s+/g, ' ');
  const className = f.get('className');
  if (name.length < 2 || name.length > 80 || !CLASSES.includes(className)) {
    document.querySelector('#form-error').textContent = 'Vui lòng nhập đầy đủ họ tên và chọn lớp.';
    return;
  }
  attempt = {
    ...createAttempt(shuffle(bank.questions).slice(0, 15), { mode: 'exam', topicId: 'cuchi', title: 'Thi tin học Củ Chi', minutes: 30 }),
    playerName: name,
    className
  };
  save();
  render();
});

main.addEventListener('click', e => {
  const b = e.target.closest('button');
  if (!b) return;
  if (b.id === 'retry-sync') return void sync();
  if (b.id === 'new-exam') {
    if (!attempt.synced && API && !confirm('Kết quả chưa gửi lên hệ thống. Hãy tải kết quả trước. Vẫn làm bài mới?')) return;
    attempt = null;
    save();
    return landing();
  }
  if (b.id === 'download-result') {
    const blob = new Blob([JSON.stringify({ ...attempt, result: grade(attempt) }, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'ket-qua-cu-chi.json';
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    return;
  }
  if (!attempt || attempt.submittedAt) return;
  if (secondsLeft(attempt) === 0) return finish(true);
  if (b.dataset.answer !== undefined) {
    attempt.answers[attempt.questions[attempt.current].id] = Number(b.dataset.answer);
  } else if (b.dataset.jump !== undefined) {
    attempt.current = Number(b.dataset.jump);
  } else if (b.dataset.step) {
    attempt.current = Math.max(0, Math.min(14, attempt.current + Number(b.dataset.step)));
  } else if (b.id === 'submit-exam') {
    if (confirm('Nộp bài? Bạn đã trả lời ' + grade(attempt).answered + '/15 câu.')) finish();
    return;
  }
  save();
  render();
});

setInterval(() => {
  if (!attempt || attempt.submittedAt) return;
  const n = secondsLeft(attempt);
  if (n === 0) finish(true);
  else {
    const el = document.querySelector('#timer');
    if (el) el.textContent = formatTime(n);
  }
}, 1000);

window.addEventListener('online', () => void sync());

async function init() {
  try {
    const r = await fetch('./data/lop-cu-chi.json');
    if (!r.ok) throw Error();
    bank = await r.json();
    if (bank.questions.length !== 50) throw Error();
    try {
      const a = JSON.parse(localStorage.getItem(KEY));
      if (isAttempt(a) && a.questions.length === 15 && new Set(a.questions.map(q => q.id)).size === 15 && a.questions.every(q => bank.questions.some(b => b.id === q.id)) && CLASSES.includes(a.className) && typeof a.playerName === 'string') attempt = a;
    } catch { storageWarning = true; }
    render();
    void sync();
  } catch {
    shell('<p role="alert">Không tải được bộ câu hỏi. Hãy kiểm tra mạng và tải lại trang.</p>');
  }
}

init();