import { CONFIG } from './config.js';
import { escapeHtml as esc, validateBank, selectExam, selectPractice, shuffle, createAttempt, grade, secondsLeft, formatTime, isAttempt } from './core.js';

const STORE_KEY = 'duynam.learning.v1';
const LEADERBOARD_API_URL = ['localhost', '127.0.0.1'].includes(location.hostname) ? '' : CONFIG.leaderboardApiUrl.replace(/\/$/, '');
const BANK_KEY = 'duynam.bank.v1';
const $ = selector => document.querySelector(selector);
const iconNames = new Set(['cpu', 'monitor', 'globe', 'file-text', 'sheet', 'presentation', 'book-open', 'arrow-right', 'arrow-left', 'chevron-right', 'clock', 'check', 'circle-check', 'circle-help', 'check-check', 'flag', 'search', 'x', 'shield-check', 'history', 'library', 'graduation-cap', 'list-checks', 'download', 'upload', 'plus', 'rotate-ccw', 'play', 'trophy', 'info', 'save', 'printer', 'circle-x', 'target', 'hard-drive', 'timer', 'external-link']);
const icon = name => `<i data-lucide="${iconNames.has(name) ? name : 'book-open'}" aria-hidden="true"></i>`;
const btn = (label, action, { variant = '', data = '', glyph = '', disabled = false } = {}) => `<button class="btn ${variant}" data-action="${action}" ${data} ${disabled ? 'disabled' : ''}>${glyph ? icon(glyph) : ''}${label}</button>`;
const icons = () => window.lucide?.createIcons();
const dateLabel = timestamp => new Intl.DateTimeFormat('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }).format(timestamp);
const normalize = value => value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/g, 'd').toLowerCase();
const cleanPlayerName = value => typeof value === 'string' ? value.trim().replace(/\s+/g, ' ').slice(0, 30) : '';
const attemptDuration = attempt => Math.max(0, Math.round((attempt.submittedAt - attempt.startedAt) / 1000));
function sanitizeAttempt(attempt) {
  const clean = { ...attempt }, playerName = cleanPlayerName(attempt.playerName);
  if (playerName.length >= 2) clean.playerName = playerName; else delete clean.playerName;
  return clean;
}
function compareRankEntries(a, b) {
  return b.correct - a.correct || a.duration - b.duration || a.submittedAt - b.submittedAt;
}
function localRankEntries() {
  return state.history.filter(item => item.mode === 'exam' && cleanPlayerName(item.playerName).length >= 2).map(attempt => {
    const result = grade(attempt);
    return { playerName: cleanPlayerName(attempt.playerName), correct: result.correct, total: result.total, duration: attemptDuration(attempt), submittedAt: attempt.submittedAt };
  });
}
function rankedLeaderboardEntries() {
  const bestByName = new Map();
  for (const entry of [...sharedRanking, ...localRankEntries()]) {
    const key = normalize(entry.playerName);
    const current = bestByName.get(key);
    if (!current || compareRankEntries(entry, current) < 0) bestByName.set(key, entry);
  }
  return [...bestByName.values()].sort(compareRankEntries);
}
async function loadSharedRanking() {
  if (!LEADERBOARD_API_URL || leaderboardLoading || leaderboardLoaded) return;
  leaderboardLoading = true;
  try {
    const response = await fetch(`${LEADERBOARD_API_URL}/api/leaderboard?limit=20`, { headers: { accept: 'application/json' } });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const data = await response.json();
    sharedRanking = Array.isArray(data.entries) ? data.entries.filter(entry => cleanPlayerName(entry.playerName).length >= 2 && Number.isInteger(entry.correct) && Number.isInteger(entry.total) && Number.isInteger(entry.duration) && Number.isFinite(entry.submittedAt)).map(entry => ({ playerName: cleanPlayerName(entry.playerName), correct: entry.correct, total: entry.total, duration: entry.duration, submittedAt: entry.submittedAt })) : [];
    leaderboardLoaded = true;
    const route = (location.hash.slice(1) || 'practice').split('/')[0];
    if (!currentAttempt && ['practice', 'ranking'].includes(route)) render();
  } catch (error) { console.warn('Không tải được bảng xếp hạng dùng chung:', error); }
  finally { leaderboardLoading = false; }
}
async function submitSharedScore(attempt) {
  if (!LEADERBOARD_API_URL || attempt.mode !== 'exam' || cleanPlayerName(attempt.playerName).length < 2) return;
  const result = grade(attempt);
  try {
    const response = await fetch(`${LEADERBOARD_API_URL}/api/scores`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ playerName: cleanPlayerName(attempt.playerName), correct: result.correct, total: result.total, duration: attemptDuration(attempt), submittedAt: attempt.submittedAt, attemptId: attempt.id }), keepalive: true });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    leaderboardLoaded = false; await loadSharedRanking();
  } catch (error) { console.warn('Chưa đồng bộ được thành tích:', error); showToast('Thành tích đã lưu trên thiết bị nhưng chưa đồng bộ được lên bảng chung.'); }
}
let storageError = false;
let bank, defaultBank, customBank = false;
let classSet = null; // Bộ đề riêng "Lớp học Củ Chi" (site/data/lop-cu-chi.json)
let state = { drafts: {}, history: [], archivedDrafts: [], bankRevision: CONFIG.bankRevision };
let sharedRanking = [], leaderboardLoading = false, leaderboardLoaded = false;
let currentAttempt = null, currentDraftKey = null, reviewing = false;
let toastTimeout, pendingConfirm = null, dialogTrigger = null;
function sanitizeState(saved) {
  const drafts = saved?.drafts && typeof saved.drafts === 'object' && !Array.isArray(saved.drafts) ? saved.drafts : {};
  return {
    drafts: Object.fromEntries(Object.entries(drafts).filter(([key, a]) => /^[a-zA-Z0-9_-]+$/.test(key) && !['__proto__', 'constructor', 'prototype'].includes(key) && isAttempt(a) && !a.submittedAt).map(([key, a]) => [key, sanitizeAttempt(a)])),
    history: Array.isArray(saved?.history) ? saved.history.filter(a => isAttempt(a) && Number.isFinite(a.submittedAt)).slice(0, 50).map(sanitizeAttempt) : [],
    archivedDrafts: Array.isArray(saved?.archivedDrafts) ? saved.archivedDrafts.filter(isAttempt).map(sanitizeAttempt) : [],
    bankRevision: typeof saved?.bankRevision === 'string' ? saved.bankRevision : null,
  };
}

function readStored(key) {
  try { const value = localStorage.getItem(key); return value ? JSON.parse(value) : null; }
  catch { storageError = true; return null; }
}
function persist() {
  try { localStorage.setItem(STORE_KEY, JSON.stringify(state)); return true; }
  catch { storageError = true; showToast('Trình duyệt không lưu được dữ liệu. Hãy xuất kết quả trước khi đóng trang.'); updateStorageNotice(); return false; }
}
function updateStorageNotice() {
  if (storageError && !$('#storage-notice') && $('.page')) $('.page').insertAdjacentHTML('afterbegin', '<div id="storage-notice" class="storage-notice" role="status">Bộ nhớ trình duyệt không khả dụng hoặc dữ liệu cũ bị lỗi. Tiến độ có thể không được giữ sau khi đóng trang. Bạn vẫn có thể làm bài và xuất kết quả.</div>');
}
function showToast(message) {
  $('#toast').textContent = message; $('#toast').hidden = false;
  clearTimeout(toastTimeout); toastTimeout = setTimeout(() => { $('#toast').hidden = true; }, 4500);
}
function download(name, data, mime = 'application/json') {
  const blob = new Blob([typeof data === 'string' ? data : JSON.stringify(data, null, 2)], { type: `${mime};charset=utf-8` });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a'); a.href = url; a.download = name; a.click();
  setTimeout(() => URL.revokeObjectURL(url), 10000);
}
function closeDialog() { $('#dialog').close(); pendingConfirm = null; }
function openDialog(content) {
  dialogTrigger = document.activeElement;
  $('#dialog').innerHTML = `<div class="dialog-body">${content}</div>`;
  icons(); $('#dialog').showModal();
}
function confirmAction(title, message, label, callback, dangerous = false) {
  pendingConfirm = callback;
  openDialog(`<h2 id="dialog-title">${esc(title)}</h2><p>${esc(message)}</p><div class="dialog-actions">${btn('Quay lại', 'cancel-dialog')}${btn(esc(label), 'confirm-dialog', { variant: dangerous ? 'danger' : 'primary' })}</div>`);
}
function navigate(hash) { if (location.hash === hash) render(); else location.hash = hash; }
function renderHeader(active) {
  $('#header').innerHTML = `<div class="header-inner"><a class="brand" href="#practice" aria-label="${esc(CONFIG.name)} — trang chủ"><img class="brand-logo" src="./assets/logo.png" alt="" width="171" height="44"><span><span class="brand-name">${esc(CONFIG.name)}</span></span></a><nav class="nav-bar" aria-label="Điều hướng chính">${[['practice', 'Ôn theo chủ đề', 'Ôn tập', 'book-open'], ['exam', 'Phòng thi thử', 'Thi thử', 'timer'], ['ranking', 'Bảng xếp hạng', 'Xếp hạng', 'trophy'], ['history', 'Kết quả của bạn', 'Kết quả', 'history']].map(([id, label, short, glyph]) => `<a href="#${id}" class="nav-link ${active === id ? 'active' : ''}" ${active === id ? 'aria-current="page"' : ''}>${icon(glyph)}<span class="nav-full">${label}</span><span class="nav-short">${short}</span></a>`).join('')}</nav><div class="header-extra"><span class="local-label">${icon('shield-check')}Lưu trên thiết bị</span><a class="btn ${active === 'exam' ? '' : 'primary'}" href="#exam">${icon('play')}Thi thử ngay</a></div></div>`;
  $('#footer').innerHTML = `<span>© ${new Date().getFullYear()} ${esc(CONFIG.name)} · Tự tin hơn sau mỗi lần luyện tập.</span><span>Không cần tài khoản · Không đồng bộ giữa các thiết bị</span>`;
}
function page(content) { $('#main').innerHTML = `<div class="page">${content}</div>`; updateStorageNotice(); }
function overview() {
  const completed = bank.topics.filter(t => state.history.some(a => a.mode === 'practice' && a.topicId === t.id)).length;
  const latest = Object.entries(state.drafts).sort((a, b) => (b[1].updatedAt || b[1].startedAt) - (a[1].updatedAt || a[1].startedAt))[0];
  page(`<div class="breadcrumb">Góc học tập ${icon('chevron-right')}<span>Ôn luyện tin học cơ bản</span></div>
    <section class="hero"><div class="hero-copy"><div class="eyebrow"><span class="dot"></span>GÓC ÔN TẬP CỦA BẠN</div><h1>Vững tin học, từng chủ đề.</h1><p>Chọn phần cần củng cố, học theo nhịp riêng và xem lại lời giải sau mỗi câu.</p><div class="hero-points"><span>${icon('book-open')}6 chủ đề trọng tâm</span><span>${icon('clock')}Ôn tập không giới hạn</span><span>${icon('circle-check')}Có giải thích đáp án</span></div></div><div class="hero-art" aria-hidden="true"><div class="art-sheet"><div class="art-title"></div><div class="art-line"><i></i><span></span></div><div class="art-line good"><i></i><span></span></div><div class="art-line"><i></i><span></span></div><div class="art-line"><i></i><span></span></div></div><div class="art-circle">${icon('graduation-cap')}</div></div></section>
    <div class="overview-strip"><div class="progress-summary">${icon('list-checks')}<div><strong>Hành trình của bạn</strong><div class="small muted">Đã hoàn thành ${completed}/6 chủ đề</div></div></div><div class="progress-track" role="progressbar" aria-label="Chủ đề đã hoàn thành" aria-valuenow="${completed}" aria-valuemin="0" aria-valuemax="6"><span style="width:${completed / 6 * 100}%"></span></div><span class="small muted">${bank.questions.length} câu hỏi · ${customBank ? 'Ngân hàng tùy chỉnh' : 'Ngân hàng 300 câu'}</span></div>
    ${latest ? `<div class="restore-banner"><div><strong>Bạn còn một bài đang làm</strong><p>${esc(latest[1].title)} · Đã trả lời ${grade(latest[1]).answered}/${latest[1].questions.length} câu</p></div>${btn('Tiếp tục bài', 'resume', { data: `data-key="${esc(latest[0])}"`, glyph: 'arrow-right' })}</div>` : ''}
    ${homeRanking()}
    <section aria-labelledby="topics-heading"><div class="section-head"><div><h2 id="topics-heading">Bạn muốn ôn chủ đề nào?</h2><p class="small muted">Học theo thứ tự hoặc chọn phần bạn cần củng cố.</p></div><div class="search-box">${icon('search')}<input type="search" id="topic-search" placeholder="Tìm chủ đề, ví dụ: Excel" aria-label="Tìm chủ đề" autocomplete="off"><button class="btn ghost search-clear" id="search-clear" data-action="clear-search" aria-label="Xóa tìm kiếm" hidden>${icon('x')}</button></div></div><div class="topic-grid">${bank.topics.map(topicCard).join('')}<div id="topic-empty" class="empty-state panel" hidden>${icon('search')}<h3>Không tìm thấy chủ đề</h3><p>Thử một từ khóa khác hoặc xóa tìm kiếm để xem tất cả chủ đề.</p>${btn('Xóa tìm kiếm', 'clear-search')}</div></div></section>
    ${classSetCard()}
    <div class="note-line">${icon('info')}<span>${esc(customBank ? 'Đang sử dụng ngân hàng tùy chỉnh trên trình duyệt này.' : CONFIG.bankLabel)}. Tiến độ được lưu tự động khi trình duyệt cho phép.</span></div>`);
}
function homeRanking() {
  const leaders = rankedLeaderboardEntries().slice(0, 3);
  const labels = ['Hạng nhất', 'Hạng nhì', 'Hạng ba'];
  return `<section class="home-ranking" aria-labelledby="home-ranking-heading"><div class="section-head home-ranking-head"><div><div class="ranking-kicker">${icon('trophy')}THÀNH TÍCH THI THỬ</div><h2 id="home-ranking-heading">Top 3 hiện tại</h2><p class="small muted">Xếp theo số câu đúng, sau đó đến thời gian hoàn thành.</p></div><a class="btn" href="#ranking">Xem bảng đầy đủ${icon('arrow-right')}</a></div>${leaders.length ? `<div class="home-ranking-grid">${leaders.map((attempt, index) => { const result = attempt; return `<article class="home-ranking-card rank-${index + 1}"><span class="home-rank-number">${index + 1}</span><div class="home-rank-icon">${icon(index === 0 ? 'trophy' : 'graduation-cap')}</div><div class="home-rank-info"><span class="small muted">${labels[index]}</span><h3>${esc(attempt.playerName)}</h3><p><strong>${result.correct}/${result.total} câu đúng</strong><span> · ${formatTime(attempt.duration)}</span></p></div></article>`; }).join('')}</div>` : `<div class="home-ranking-empty panel"><div>${icon('trophy')}<span><strong>Chưa có thành tích thi thử</strong><small>Hoàn thành một bài thi để xuất hiện trong Top 3.</small></span></div><a class="btn primary" href="#exam">Thi thử ngay${icon('arrow-right')}</a></div>`}</section>`;
}
function topicCard(topic) {
  const count = Math.min(CONFIG.practiceLimit, bank.questions.filter(q => q.topicId === topic.id).length);
  const draft = state.drafts[topic.id];
  const completed = state.history.filter(a => a.mode === 'practice' && a.topicId === topic.id);
  const best = completed.length ? Math.max(...completed.map(a => grade(a).percent)) : null;
  const answered = draft ? grade(draft).answered : 0;
  const status = draft ? `Đang học · ${answered}/${draft.questions.length} câu` : best !== null ? 'Đã hoàn thành' : 'Sẵn sàng bắt đầu';
  return `<article class="topic-card" data-search="${esc(normalize(topic.title + ' ' + topic.description + ' ' + topic.code))}"><div class="topic-card-top"><div class="topic-icon">${icon(topic.icon)}</div><span class="code">${esc(topic.code)}</span></div><h3>${esc(topic.title)}</h3><p class="topic-description">${esc(topic.description)}</p><div class="topic-metadata"><span>${icon('file-text')}${count} câu hỏi</span><span>${icon('clock')}Tự do thời gian</span></div><div class="topic-progress-label"><span>${status}</span><span>${best !== null ? `Tốt nhất ${best}%` : '—'}</span></div><div class="progress-track"><span style="width:${draft ? answered / draft.questions.length * 100 : best !== null ? 100 : 0}%"></span></div><a class="btn" href="#practice/${esc(topic.id)}">${draft ? 'Tiếp tục ôn tập' : best !== null ? 'Ôn tập lại' : 'Bắt đầu ôn tập'}${icon('arrow-right')}</a></article>`;
}
function examLanding() {
  const draft = state.drafts.exam;
  page(`<div class="page-heading"><h1>Phòng thi thử</h1><p>Thử sức với đề tổng hợp và làm quen với áp lực thời gian.</p></div><div class="exam-layout"><section class="panel exam-intro"><div class="exam-symbol">${icon('timer')}</div><div><h2>Kiểm tra kiến thức tổng hợp</h2><p class="muted section-gap">Câu hỏi được chọn ngẫu nhiên, phân bổ đều giữa 6 chủ đề. Mỗi lượt thi là một cơ hội để biết mình đã tiến bộ ở đâu.</p></div><div class="exam-facts"><div><div class="fact-value">${CONFIG.examQuestions} câu</div><div class="fact-label">Trắc nghiệm nhiều lựa chọn</div></div><div><div class="fact-value">${CONFIG.examMinutes} phút</div><div class="fact-label">Tự nộp khi hết giờ</div></div><div><div class="fact-value">${CONFIG.passPercent}%</div><div class="fact-label">Mục tiêu luyện tập</div></div></div>${draft ? `<p class="muted">Có bài thi đang làm: ${grade(draft).answered}/${draft.questions.length} câu đã trả lời. Thời gian tiếp tục chạy khi bạn rời trang.</p><div class="row">${btn('Tiếp tục bài thi', 'resume', { variant: 'primary', glyph: 'play', data: 'data-key="exam"' })}${btn('Tạo đề mới', 'new-exam')}</div>` : btn('Bắt đầu thi thử', 'new-exam', { variant: 'primary', glyph: 'play' })}<span class="small muted">Bạn sẽ nhập tên hiển thị trước khi bắt đầu. Thành tích được lưu trên thiết bị này.</span></section><aside class="panel"><h2>Trước khi bắt đầu</h2><ol class="rules-list"><li>Nhập tên hiển thị để ghi nhận thành tích vào bảng xếp hạng.</li><li>Chọn một đáp án cho mỗi câu. Có thể đổi đáp án trước khi nộp.</li><li>Đánh dấu câu cần xem lại và điều hướng bằng bảng số câu.</li><li>Đáp án, giải thích chỉ xuất hiện sau khi nộp bài.</li><li>Đồng hồ không đặt lại khi tải lại hoặc rời trang.</li><li>Tiến độ và kết quả lưu riêng trên trình duyệt này.</li></ol><a class="btn" href="#ranking">${icon('trophy')}Xem bảng xếp hạng</a></aside></div>`);
}
function beginExam(playerName) {
  const questions = selectExam(bank, CONFIG.examQuestions);
  state.drafts.exam = { ...createAttempt(questions, { mode: 'exam', title: 'Thi thử tổng hợp', minutes: CONFIG.examMinutes }), playerName };
  persist(); navigate('#exam/run');
}
function startExam() {
  const askName = () => {
    openDialog(`<button class="btn ghost icon-button dialog-close" data-action="cancel-dialog" aria-label="Đóng">${icon('x')}</button><div class="name-dialog-icon">${icon('trophy')}</div><h2 id="dialog-title">Nhập tên trước khi thi</h2><p>Tên này sẽ xuất hiện trong bảng xếp hạng trên thiết bị này sau khi bạn nộp bài.</p><form id="exam-name-form"><div class="form-field"><label for="player-name">Tên hiển thị</label><input id="player-name" name="playerName" type="text" required minlength="2" maxlength="30" autocomplete="name" placeholder="Ví dụ: Nguyễn Minh Anh"></div><p class="small muted">Từ 2–30 ký tự. Không nhập số điện thoại hoặc thông tin riêng tư.</p><p id="name-error" class="error-text" role="alert"></p><div class="dialog-actions"><button type="button" class="btn" data-action="cancel-dialog">Quay lại</button><button type="submit" class="btn primary">Vào phòng thi${icon('arrow-right')}</button></div></form>`);
    $('#player-name').focus();
  };
  if (state.drafts.exam) confirmAction('Tạo đề thi mới?', 'Bài thi đang làm sẽ được thay bằng đề mới. Kết quả đã nộp trước đây vẫn được giữ.', 'Tạo đề mới', askName, true);
  else askName();
}
function classSetCard() {
  if (!classSet) return '';
  const draft = state.drafts[classSet.id], answered = draft ? grade(draft).answered : 0;
  const done = state.history.filter(a => a.topicId === classSet.id && a.mode === 'practice');
  const best = done.length ? Math.max(...done.map(a => grade(a).percent)) : null;
  const status = draft ? `Đang học · ${answered}/${draft.questions.length} câu` : best !== null ? 'Đã hoàn thành' : 'Sẵn sàng bắt đầu';
  return `<section class="section-gap" aria-labelledby="class-set-heading"><div class="section-head"><div><h2 id="class-set-heading">Bộ đề riêng</h2><p class="small muted">Bộ đề dành cho lớp học, gồm câu hỏi chọn lọc từ nhiều chủ đề.</p></div></div><div class="topic-grid"><article class="topic-card class-set-card"><div class="topic-card-top"><div class="topic-icon">${icon('graduation-cap')}</div><span class="code">${esc(classSet.topicCodes.join(' · '))}</span></div><h3>${esc(classSet.title)}</h3><p class="topic-description">${esc(classSet.description)}</p><div class="topic-metadata"><span>${icon('file-text')}${classSet.questions.length} câu hỏi</span><span>${icon('clock')}Tự do thời gian</span></div><div class="topic-progress-label"><span>${status}</span><span>${best !== null ? `Tốt nhất ${best}%` : '—'}</span></div><div class="progress-track"><span style="width:${draft ? answered / draft.questions.length * 100 : best !== null ? 100 : 0}%"></span></div><a class="btn ${draft ? 'primary' : ''}" href="#practice/${esc(classSet.id)}">${draft ? 'Tiếp tục ôn tập' : best !== null ? 'Ôn tập lại' : 'Bắt đầu ôn tập'}${icon('arrow-right')}</a></article></div></section>`;
}
function getPractice(id) {
  if (classSet && id === classSet.id) {
    if (state.drafts[id] && state.drafts[id].questions.length !== classSet.questions.length) { state.archivedDrafts.push(state.drafts[id]); delete state.drafts[id]; }
    if (!state.drafts[id]) { state.drafts[id] = createAttempt(shuffle(classSet.questions), { title: classSet.title, topicId: id }); persist(); }
    return state.drafts[id];
  }
  const topic = bank.topics.find(t => t.id === id);
  if (!topic) return null;
  if (!state.drafts[id]) {
    const questions = selectPractice(bank, id, CONFIG.practiceLimit);
    state.drafts[id] = createAttempt(questions, { title: topic.title, topicId: id }); persist();
  }
  return state.drafts[id];
}
function attemptRoute(key) { return key === 'exam' ? '#exam/run' : key.startsWith('retry-') ? `#retry/${key}` : `#practice/${key}`; }
function saveAttempt() { if (currentDraftKey && currentAttempt && !reviewing && !currentAttempt.submittedAt) { currentAttempt.updatedAt = Date.now(); state.drafts[currentDraftKey] = currentAttempt; persist(); } }
function expired() {
  if (currentAttempt && !currentAttempt.submittedAt && currentAttempt.mode === 'exam' && secondsLeft(currentAttempt) === 0) { submitAttempt(true); return true; }
  return false;
}
function workspace(attempt, key, review = false) {
  currentAttempt = attempt; currentDraftKey = key; reviewing = review;
  if (!review && expired()) return;
  document.body.classList.add('exam-workspace');
  const stats = grade(attempt);
  const moduleIndex = bank.topics.findIndex(t => t.id === attempt.topicId);
  const moduleName = attempt.mode === 'exam' ? 'Thi thử tổng hợp' : moduleIndex >= 0 ? `Module ${moduleIndex + 1}: ${attempt.title}` : attempt.title;
  $('#header').innerHTML = `<div class="exam-header"><a class="brand" href="#practice" aria-label="${esc(CONFIG.name)} — trang chủ"><img class="brand-logo" src="./assets/logo.png" alt="" width="155" height="40"><span><span class="brand-name">${esc(CONFIG.name)}</span><span class="brand-note">ÔN LUYỆN TIN HỌC CƠ BẢN</span></span></a><div class="exam-controls"><h1 class="module-title" title="${esc(moduleName)}">${icon('book-open')}${esc(moduleName)}</h1><span class="exam-counter" id="top-question-number">Câu 1/${stats.total}</span>${!review ? `<span id="workspace-flag"></span>` : ''}${!review && attempt.mode === 'exam' ? `<div class="timer" role="timer" aria-label="Thời gian còn lại">${icon('clock')}<span id="timer-value">${formatTime(secondsLeft(attempt))}</span></div>` : !review ? `<label class="check-label instant-mode"><input type="checkbox" id="instant-check" ${attempt.instant ? 'checked' : ''}>Xem đáp án ngay</label>` : `<a class="btn compact" href="#result/${esc(attempt.id)}">Về kết quả</a>`}<a href="#practice" class="btn compact exit-topic">${icon('x')}Đổi chủ đề</a><a href="#exam" class="btn compact exam-entry">${icon('target')}Thi thử</a></div></div>`;
  page(`<div class="workspace-layout"><aside class="question-sidebar"><div class="sidebar-status"><span>Đã trả lời</span><span id="answer-count">${stats.answered}/${stats.total}</span></div><div class="progress-track"><span id="answer-progress" style="width:${stats.answered / stats.total * 100}%"></span></div><nav class="question-grid" id="question-grid" aria-label="Bảng câu hỏi"></nav><div class="sidebar-buttons">${review ? `<a href="#result/${esc(attempt.id)}" class="btn primary">Xem kết quả tổng hợp</a>` : btn(attempt.mode === 'exam' ? 'Nộp bài thi' : 'Kiểm tra & Nộp bài Chủ đề này', 'submit', { variant: 'primary' })}${!review && attempt.mode !== 'exam' ? btn('Lượt mới (trộn câu)', 'new-practice', { glyph: 'rotate-ccw' }) : ''}<a href="#${attempt.mode === 'exam' ? 'exam' : 'practice'}" class="btn">${review ? 'Đổi sang chủ đề khác' : 'Lưu & đổi chủ đề'}</a><p class="study-mode">${review ? `ĐÚNG ${stats.correct}/${stats.total} CÂU` : attempt.mode === 'exam' ? 'THI THỬ · TỰ NỘP KHI HẾT GIỜ' : 'ÔN TẬP TỰ DO · KHÔNG ĐẾM GIỜ'}</p><p class="workspace-version">v1.1 · ${review ? 'Xem lại bài' : attempt.mode === 'exam' ? 'Chế độ thi thử' : 'Chế độ học tập'}</p></div></aside><div class="workspace-content"><section class="question-card" id="question-card" aria-label="Nội dung câu hỏi"></section></div></div>`);
  renderQuestion();
}
function renderQuestion(focus = false) {
  const a = currentAttempt; if (!a) return;
  const q = a.questions[a.current];
  const selected = a.answers[q.id];
  const reveal = reviewing || (a.mode !== 'exam' && a.instant && Number.isInteger(selected));
  const flag = a.flags.includes(q.id);
  $('#question-grid').innerHTML = a.questions.map((item, i) => {
    const answered = Number.isInteger(a.answers[item.id]);
    const showResult = reviewing || (a.instant && a.mode !== 'exam' && answered);
    const status = showResult ? (a.answers[item.id] === item.answer ? 'correct' : 'incorrect') : answered ? 'answered' : '';
    return `<button class="q-cell ${status} ${i === a.current ? 'current' : ''} ${a.flags.includes(item.id) ? 'flagged' : ''}" data-action="jump" data-index="${i}" ${i === a.current ? 'aria-current="step"' : ''} aria-label="Câu ${i + 1}${answered ? ', đã trả lời' : ', chưa trả lời'}${a.flags.includes(item.id) ? ', đã đánh dấu' : ''}">${i + 1}</button>`;
  }).join('');
  const stats = grade(a); $('#answer-count').textContent = `${stats.answered}/${stats.total}`; $('#answer-progress').style.width = `${stats.answered / stats.total * 100}%`;
  $('#top-question-number').textContent = `Câu ${a.current + 1}/${a.questions.length}`;
  if ($('#workspace-flag')) $('#workspace-flag').innerHTML = `<button class="btn compact flag-button ${flag ? 'is-flagged' : ''}" data-action="flag" aria-pressed="${flag}">${icon('flag')}${flag ? 'Đã đặt cờ' : 'Đặt cờ'}</button>`;
  const code = bank.topics.find(t => t.id === q.topicId)?.code || '';
  const imageUrl = typeof q.imageUrl === 'string' && /^assets\/images\/[a-zA-Z0-9_-]+\.(png|jpg|jpeg|webp|gif)$/.test(q.imageUrl) ? q.imageUrl : null;
  $('#question-card').innerHTML = `<div class="question-pane"><div class="question-heading"><span class="question-module-code">${esc(code)}</span><h2 id="question-title" class="question-text" tabindex="-1"><strong>Câu ${a.current + 1}:</strong> ${esc(q.text)}</h2></div>${imageUrl ? `<figure class="question-figure"><img class="question-image" src="./${esc(imageUrl)}" alt="Hình minh họa cho câu hỏi ${a.current + 1}" loading="eager"><figcaption>Hình minh họa của câu hỏi</figcaption></figure>` : ''}</div><div class="question-divider" aria-hidden="true">···</div><div class="answers-pane"><div class="answers" role="group" aria-labelledby="question-title">${q.options.map((option, index) => {
    const correct = reveal && index === q.answer, wrong = reveal && index === selected && selected !== q.answer;
    return `<button class="answer-option ${index === selected ? 'selected' : ''} ${correct ? 'correct' : ''} ${wrong ? 'incorrect' : ''}" data-action="answer" data-answer="${index}" aria-pressed="${index === selected}" ${reviewing ? 'disabled' : ''}><span class="answer-radio" aria-hidden="true"></span><span class="answer-letter sr-only">${'ABCD'[index]}.</span><span class="answer-text">${esc(option)}</span>${correct || wrong ? `<span class="answer-status" aria-label="${correct ? 'Đáp án đúng' : 'Đáp án sai'}">${icon(correct ? 'check' : 'x')}<span>${correct ? '(Đáp án đúng)' : '(Bạn đã chọn)'}</span></span>` : ''}</button>`;
  }).join('')}</div>${reveal ? `<div class="explanation ${selected === q.answer ? 'is-correct' : 'is-incorrect'}" role="status"><strong>${selected === q.answer ? `Chính xác! Bạn đã chọn đúng đáp án ${'ABCD'[q.answer]}.` : `Đáp án đúng: ${'ABCD'[q.answer]}. ${q.options[q.answer] ? esc(q.options[q.answer]) : ''}`}</strong><span>${esc(q.explanation)}</span></div>` : ''}</div><div class="question-nav">${btn('Câu trước', 'previous', { disabled: a.current === 0 })}${reviewing ? `<a class="btn score-button" href="#result/${esc(a.id)}">Kết quả (${stats.correct}/${stats.total})</a>` : btn(`${a.mode === 'exam' ? 'Nộp bài' : 'Kiểm tra điểm'} (${stats.answered}/${stats.total})`, 'submit', { variant: 'score-button' })}${a.current < a.questions.length - 1 ? btn('Câu tiếp theo', 'next', { variant: 'primary' }) : btn('Câu tiếp theo', 'next', { variant: 'primary', disabled: true })}</div>`;
  icons(); if (focus) $('#question-title').focus({ preventScroll: true });
}
function answer(index) {
  if (!currentAttempt || reviewing || expired() || !Number.isInteger(index) || index < 0 || index >= currentAttempt.questions[currentAttempt.current].options.length) return;
  currentAttempt.answers[currentAttempt.questions[currentAttempt.current].id] = index;
  saveAttempt(); renderQuestion();
  $(`[data-answer="${index}"]`)?.focus({ preventScroll: true });
}
function moveQuestion(index) {
  if (!currentAttempt || (!reviewing && expired())) return;
  currentAttempt.current = Math.max(0, Math.min(index, currentAttempt.questions.length - 1));
  saveAttempt(); renderQuestion(true);
  if (window.innerWidth < 768) $('#question-card').scrollIntoView({ behavior: 'smooth', block: 'start' });
}
function requestSubmit() {
  if (expired()) return;
  const { answered, total, unanswered } = grade(currentAttempt);
  confirmAction('Nộp bài và xem kết quả?', `Bạn đã trả lời ${answered}/${total} câu.${unanswered ? ` Còn ${unanswered} câu chưa trả lời và sẽ không được tính điểm.` : ''} Sau khi nộp, bạn có thể xem đáp án và giải thích.`, 'Nộp bài', () => submitAttempt());
}
function submitAttempt(automatic = false) {
  const a = currentAttempt; if (!a || a.submittedAt) return;
  a.submittedAt = automatic && a.deadline ? a.deadline : Date.now();
  a.autoSubmitted = automatic;
  if (!state.history.some(old => old.id === a.id)) state.history.unshift(structuredClone(a));
  state.history = state.history.slice(0, 50);
  if (currentDraftKey) delete state.drafts[currentDraftKey];
  persist(); if (a.mode === 'exam') void submitSharedScore(a); closeDialog(); navigate(`#result/${a.id}`);
  if (automatic) showToast('Hết thời gian. Bài thi đã được tự động nộp.');
}
function results(id) {
  const a = state.history.find(item => item.id === id); if (!a) return notFound();
  const s = grade(a), reached = s.percent >= CONFIG.passPercent;
  const duration = Math.max(0, Math.round((a.submittedAt - a.startedAt) / 1000));
  const topicResults = [...new Set(a.questions.map(q => q.topicId))].map(topicId => {
    const subset = a.questions.filter(q => q.topicId === topicId);
    return { title: bank.topics.find(t => t.id === topicId)?.title || topicId, correct: subset.filter(q => a.answers[q.id] === q.answer).length, total: subset.length };
  });
  page(`<div class="breadcrumb"><a href="#history">Kết quả của bạn</a>${icon('chevron-right')}<span>${esc(a.title)}</span></div><section class="panel results-hero"><div class="result-emblem">${icon(reached ? 'trophy' : 'target')}</div><h1>${reached ? 'Một bước tiến thật tốt!' : 'Mỗi lần luyện tập là một bước tiến.'}</h1><p class="muted" style="margin:8px auto 0">${esc(a.title)} · ${a.mode === 'exam' ? 'Thi thử' : a.mode === 'retry' ? 'Ôn lại câu chưa đúng' : 'Ôn theo chủ đề'}</p><div class="result-score">${s.score.toLocaleString('vi-VN')}<span> / 10 điểm</span></div><span class="pill ${reached ? 'green' : ''}">${s.percent}% chính xác${a.mode === 'exam' ? ` · ${reached ? 'Đạt' : 'Chưa đạt'} mục tiêu luyện tập` : ''}</span><div class="result-stats"><div><strong class="correct-stat">${s.correct}</strong><span>Trả lời đúng</span></div><div><strong class="wrong-stat">${s.wrong}</strong><span>Trả lời sai</span></div><div><strong>${s.unanswered}</strong><span>Chưa trả lời</span></div></div><div class="row result-actions"><a class="btn primary" href="#review/${esc(a.id)}">${icon('list-checks')}Xem đáp án & giải thích</a>${s.correct < s.total ? btn('Ôn lại câu chưa đúng', 'retry-wrong', { data: `data-id="${esc(a.id)}"`, glyph: 'rotate-ccw' }) : '<a class="btn" href="#practice">Ôn chủ đề khác</a>'}</div><p class="small muted" style="margin:24px auto 0">${a.autoSubmitted ? 'Tự động nộp khi hết giờ · ' : ''}${dateLabel(a.submittedAt)} · Thời gian từ lúc bắt đầu: ${formatTime(duration)}</p>${a.instant ? '<p class="small muted" style="margin:8px auto 0">Bài ôn tập đã bật xem đáp án ngay; điểm dùng để theo dõi việc học.</p>' : ''}</section><div class="panel result-details"><div class="row spread"><h2>Kết quả theo chủ đề</h2>${btn('Tải kết quả', 'export-result', { data: `data-id="${esc(a.id)}"`, glyph: 'download' })}</div>${topicResults.map(t => `<div class="result-detail-row"><span>${esc(t.title)}</span><strong>${t.correct}/${t.total} đúng</strong></div>`).join('')}</div>`);
}
function historyPage() {
  page(`<div class="section-head"><div><h1>Kết quả của bạn</h1><p class="muted">Xem lại hành trình và củng cố những phần chưa vững.</p></div>${state.history.length ? btn('Xuất lịch sử', 'export-history', { glyph: 'download' }) : ''}</div>${state.history.length ? `<div class="history-list">${state.history.map(a => { const s = grade(a); return `<article class="history-row"><div class="history-info"><div class="score-badge">${s.score.toLocaleString('vi-VN')}<div class="small">/ 10</div></div><div><h3>${esc(a.title)}</h3><p class="small muted">${dateLabel(a.submittedAt)} · ${a.mode === 'exam' ? 'Thi thử' : a.mode === 'retry' ? 'Ôn câu chưa đúng' : 'Ôn tập'}</p><p class="small muted">${s.correct}/${s.total} câu đúng${a.instant ? ' · Có xem đáp án ngay' : ''}</p></div></div><div class="history-actions"><span class="pill ${s.percent >= CONFIG.passPercent ? 'green' : ''}">${s.percent}% chính xác</span><a class="btn" href="#result/${esc(a.id)}">Xem kết quả${icon('arrow-right')}</a></div></article>`; }).join('')}</div><p class="note-line">Lưu tối đa 50 bài gần nhất trên trình duyệt này. Xuất lịch sử để giữ một bản sao riêng.</p>` : `<section class="panel empty-state">${icon('history')}<h2>Hành trình bắt đầu từ bài đầu tiên</h2><p>Sau khi nộp bài ôn tập hoặc thi thử, kết quả và đáp án sẽ xuất hiện ở đây.</p><a class="btn primary" href="#practice">Chọn chủ đề để bắt đầu${icon('arrow-right')}</a></section>`}`);
}
function rankingPage() {
  const ranked = rankedLeaderboardEntries();
  const medalLabels = ['Hạng nhất', 'Hạng nhì', 'Hạng ba'];
  const winners = ranked.slice(0, 3);
  page(`<div class="ranking-heading"><div><div class="ranking-kicker">${icon('trophy')}THÀNH TÍCH THI THỬ</div><h1>Bảng xếp hạng</h1><p class="muted">Ưu tiên số câu đúng; nếu bằng nhau, người hoàn thành nhanh hơn đứng trước.</p></div><a class="btn primary" href="#exam">${icon('play')}Thi thử ngay</a></div>${ranked.length ? `<section class="ranking-winners" aria-label="Ba thành tích dẫn đầu">${winners.map((attempt, index) => { const result = attempt; return `<article class="winner-card winner-${index + 1}"><span class="winner-rank">${index + 1}</span><div class="winner-icon">${icon(index === 0 ? 'trophy' : 'graduation-cap')}</div><div><span class="small muted">${medalLabels[index]}</span><h2>${esc(attempt.playerName)}</h2><p><strong>${result.correct}/${result.total} câu đúng</strong> · ${formatTime(attempt.duration)}</p></div></article>`; }).join('')}</section><section class="panel ranking-panel"><div class="ranking-table-scroll"><table class="ranking-table"><thead><tr><th scope="col">Hạng</th><th scope="col">Thí sinh</th><th scope="col">Kết quả</th><th scope="col">Điểm</th><th scope="col">Thời gian</th><th scope="col">Ngày thi</th></tr></thead><tbody>${ranked.slice(0, 20).map((attempt, index) => { const score = Math.round(attempt.correct / attempt.total * 100) / 10; return `<tr><td><span class="rank-badge">${index + 1}</span></td><td><strong>${esc(attempt.playerName)}</strong></td><td><span class="ranking-correct">${attempt.correct}/${attempt.total}</span></td><td>${score.toLocaleString('vi-VN')}</td><td>${formatTime(attempt.duration)}</td><td>${dateLabel(attempt.submittedAt)}</td></tr>`; }).join('')}</tbody></table></div><div class="ranking-footnote">${icon('info')}<span>Mỗi tên chỉ hiển thị thành tích tốt nhất. ${LEADERBOARD_API_URL ? 'Bảng được đồng bộ dùng chung giữa các thiết bị.' : 'Bảng đang lưu riêng trên trình duyệt hiện tại.'}</span></div></section>` : `<section class="panel empty-state ranking-empty">${icon('trophy')}<h2>Chưa có thành tích thi thử</h2><p>Nhập tên, hoàn thành một đề thi và vị trí đầu tiên sẽ xuất hiện tại đây.</p><a class="btn primary" href="#exam">Bắt đầu bài thi đầu tiên${icon('arrow-right')}</a></section>`}`);
}
function libraryPage() {
  page(`<div class="page-heading"><h1>Ngân hàng câu hỏi</h1><p>Tùy chỉnh bộ câu hỏi trên trình duyệt của bạn hoặc xuất tệp để dùng cho website.</p></div><div class="library-layout"><section class="panel"><div class="row spread"><h2>${bank.questions.length} câu hỏi · 6 chủ đề</h2><span class="pill blue">${customBank ? 'Bản tùy chỉnh' : 'Bộ 300 câu'}</span></div><p class="bank-label">${esc(customBank ? 'Ngân hàng được tùy chỉnh cục bộ trên trình duyệt này.' : CONFIG.bankLabel)}</p><table class="library-table"><caption class="small muted" style="text-align:left;margin-top:16px">Số câu hiện có theo từng chủ đề</caption><tbody>${bank.topics.map(t => `<tr><td>${esc(t.title)}</td><td>${bank.questions.filter(q => q.topicId === t.id).length} câu</td></tr>`).join('')}</tbody></table>${state.archivedDrafts.length ? `<div class="section-gap">${btn(`Tải bản sao ${state.archivedDrafts.length} bài cũ`, 'export-archived', { glyph: 'download' })}</div>` : ''}<div class="library-actions">${btn('Thêm câu hỏi', 'add-question', { variant: 'primary', glyph: 'plus' })}${btn('Nhập JSON', 'import-bank', { glyph: 'upload' })}${btn('Xuất JSON', 'export-bank', { glyph: 'download' })}</div><input id="bank-file" type="file" accept=".json,application/json" hidden>${customBank ? `<div class="section-gap">${btn('Dùng bộ 300 câu gốc', 'reset-bank', { variant: 'danger', glyph: 'rotate-ccw' })}</div>` : ''}</section><aside class="panel"><h2>Dùng bộ câu hỏi của bạn</h2><ol class="rules-list"><li>Xuất JSON để lấy đúng cấu trúc tệp.</li><li>Mỗi câu có 2–4 lựa chọn, một đáp án đúng và giải thích. Mỗi chủ đề tối thiểu 5 câu.</li><li>Nhập tệp đã chỉnh sửa hoặc thêm từng câu ngay tại đây.</li><li>Mỗi lượt ôn mới trộn và lấy tối đa ${CONFIG.practiceLimit} câu của chủ đề. Thi thử chọn ngẫu nhiên từ toàn bộ ngân hàng.</li></ol><div class="note-line">${icon('info')}<span>Thay đổi chỉ áp dụng trên thiết bị này. Muốn cập nhật cho mọi người, xuất JSON, thay tệp <strong>site/data/questions.json</strong> trong mã nguồn rồi dựng và đăng lại website.</span></div><p class="small muted section-gap">Đây là công cụ tự học, không phải khu vực quản trị có đăng nhập. Không lưu thông tin học viên hay đồng bộ điểm giữa các máy.</p></aside></div>`);
}
function replaceBank(next, useCustom = true) {
  try {
    if (useCustom) localStorage.setItem(BANK_KEY, JSON.stringify(next)); else localStorage.removeItem(BANK_KEY);
  } catch { showToast('Không đủ bộ nhớ để lưu ngân hàng. Bộ câu hỏi hiện tại chưa bị thay đổi.'); return; }
  bank = next; customBank = useCustom; state.drafts = {}; persist(); render(); showToast('Đã cập nhật ngân hàng câu hỏi trên trình duyệt này.');
}
function addQuestionDialog() {
  openDialog(`<button class="btn ghost icon-button dialog-close" data-action="cancel-dialog" aria-label="Đóng">${icon('x')}</button><h2 id="dialog-title">Thêm câu hỏi</h2><p>Lưu vào bộ câu hỏi trên trình duyệt này.</p><form id="question-form"><div class="form-field"><label for="new-topic">Chủ đề</label><select id="new-topic" name="topicId">${bank.topics.map(t => `<option value="${esc(t.id)}">${esc(t.title)}</option>`).join('')}</select></div><div class="form-field"><label for="new-question">Nội dung câu hỏi</label><textarea id="new-question" name="text" required maxlength="3000"></textarea></div>${[0, 1, 2, 3].map(i => `<div class="form-field"><label for="new-option-${i}">Lựa chọn ${'ABCD'[i]}</label><input type="text" id="new-option-${i}" name="option${i}" required maxlength="1500"></div>`).join('')}<div class="form-field"><label for="new-answer">Đáp án đúng</label><select id="new-answer" name="answer">${[0, 1, 2, 3].map(i => `<option value="${i}">${'ABCD'[i]}</option>`).join('')}</select></div><div class="form-field"><label for="new-explanation">Giải thích</label><textarea id="new-explanation" name="explanation" required maxlength="4000"></textarea></div><p id="form-error" class="error-text" role="alert"></p><p class="small muted section-gap">Lưu câu hỏi sẽ làm mới các bài chưa nộp để dùng ngân hàng mới. Lịch sử đã nộp được giữ nguyên.</p><div class="dialog-actions"><button type="button" class="btn" data-action="cancel-dialog">Hủy</button><button type="submit" class="btn primary">Lưu câu hỏi</button></div></form>`);
}
function retryWrong(id) {
  const original = state.history.find(a => a.id === id); if (!original) return;
  const questions = shuffle(original.questions.filter(q => original.answers[q.id] !== q.answer));
  if (!questions.length) return;
  const a = createAttempt(questions, { mode: 'retry', topicId: original.topicId, title: `Ôn lại · ${original.title.replace(/^Ôn lại · /, '')}` });
  const key = `retry-${a.id}`; state.drafts[key] = a; persist(); navigate(`#retry/${key}`);
}
function notFound() { page(`<section class="empty-state"><h1>Không tìm thấy nội dung</h1><p>Bài làm có thể đã nằm ngoài 50 kết quả gần nhất hoặc không có trên trình duyệt này.</p><a class="btn primary" href="#practice">Về trang ôn tập</a></section>`); }
function render() {
  document.body.classList.remove('exam-workspace');
  currentAttempt = null; currentDraftKey = null; reviewing = false;
  const [route = 'practice', param] = (location.hash.slice(1) || 'practice').split('/');
  renderHeader(['result', 'review'].includes(route) ? 'history' : route === 'retry' ? 'practice' : route);
  if (LEADERBOARD_API_URL && ['practice', 'ranking'].includes(route) && !leaderboardLoaded) void loadSharedRanking();
  try {
    if (route === 'practice' && !param) overview();
    else if (route === 'practice') { const a = getPractice(param); a ? workspace(a, param) : notFound(); }
    else if (route === 'exam' && !param) examLanding();
    else if (route === 'exam' && param === 'run') state.drafts.exam ? workspace(state.drafts.exam, 'exam') : examLanding();
    else if (route === 'retry') state.drafts[param] ? workspace(state.drafts[param], param) : notFound();
    else if (route === 'history') historyPage();
    else if (route === 'ranking') rankingPage();
    else if (route === 'result') results(param);
    else if (route === 'review') { const a = state.history.find(item => item.id === param); a ? workspace(structuredClone(a), null, true) : notFound(); }
    else if (route === 'library') libraryPage();
    else notFound();
    icons(); document.title = `${$('#main h1')?.textContent || 'Ôn luyện'} · ${CONFIG.name}`;
  } catch (error) { console.error(error); page(`<section class="empty-state"><h1>Chưa mở được nội dung</h1><p>Hãy tải lại trang. Nếu lỗi tiếp tục, xuất bản sao dữ liệu trước khi xóa dữ liệu trình duyệt.</p>${btn('Tải lại trang', 'reload')}</section>`); }
}

document.addEventListener('click', event => {
  const el = event.target.closest('[data-action]'); if (!el || el.disabled) return;
  const action = el.dataset.action;
  if (action === 'answer') answer(Number(el.dataset.answer));
  else if (action === 'jump') moveQuestion(Number(el.dataset.index));
  else if (action === 'next') moveQuestion(currentAttempt.current + 1);
  else if (action === 'previous') moveQuestion(currentAttempt.current - 1);
  else if (action === 'flag') {
    if (reviewing || expired()) return;
    const id = currentAttempt.questions[currentAttempt.current].id;
    currentAttempt.flags = currentAttempt.flags.includes(id) ? currentAttempt.flags.filter(old => old !== id) : [...currentAttempt.flags, id];
    saveAttempt(); renderQuestion(); $('[data-action="flag"]')?.focus({ preventScroll: true });
  }
  else if (action === 'submit') requestSubmit();
  else if (action === 'confirm-dialog') { const callback = pendingConfirm; closeDialog(); callback?.(); }
  else if (action === 'cancel-dialog') closeDialog();
  else if (action === 'new-exam') startExam();
  else if (action === 'new-practice') {
    if (!currentAttempt || reviewing || currentAttempt.mode === 'exam') return;
    confirmAction('Bắt đầu lượt mới?', 'Lượt mới sẽ trộn lại câu hỏi. Bài đang làm được giữ trong bản sao bài cũ, còn lịch sử đã nộp không thay đổi.', 'Trộn câu & bắt đầu', () => {
      const key = currentDraftKey, previous = currentAttempt;
      state.archivedDrafts.push(structuredClone(previous));
      const questions = previous.mode === 'retry' ? shuffle(previous.questions) : classSet && previous.topicId === classSet.id ? shuffle(classSet.questions) : selectPractice(bank, previous.topicId, CONFIG.practiceLimit);
      state.drafts[key] = createAttempt(questions, { mode: previous.mode, title: previous.title, topicId: previous.topicId });
      persist(); render();
    });
  }
  else if (action === 'resume') navigate(attemptRoute(el.dataset.key));
  else if (action === 'retry-wrong') retryWrong(el.dataset.id);
  else if (action === 'export-result') { const a = state.history.find(a => a.id === el.dataset.id); download(`ket-qua-${a.id.slice(0, 8)}.json`, { ...a, result: grade(a) }); }
  else if (action === 'export-history') download('lich-su-on-luyen.json', { exportedAt: new Date().toISOString(), attempts: state.history.map(a => ({ ...a, result: grade(a) })) });
  else if (action === 'clear-search') { $('#topic-search').value = ''; filterTopics(''); $('#topic-search').focus(); }
  else if (action === 'export-bank') download('questions.json', bank);
  else if (action === 'export-archived') download('ban-sao-bai-cu.json', { exportedAt: new Date().toISOString(), attempts: state.archivedDrafts });
  else if (action === 'import-bank') $('#bank-file').click();
  else if (action === 'add-question') addQuestionDialog();
  else if (action === 'reset-bank') confirmAction('Dùng lại bộ 300 câu gốc?', 'Ngân hàng tùy chỉnh và các bài chưa nộp trên trình duyệt này sẽ được thay thế. Bạn nên xuất JSON nếu muốn giữ lại. Lịch sử đã nộp vẫn còn.', 'Dùng bộ gốc', () => replaceBank(defaultBank, false), true);
  else if (action === 'reload') location.reload();
});
function filterTopics(query) {
  let count = 0; const text = normalize(query.trim());
  document.querySelectorAll('[data-search]').forEach(card => { card.hidden = !card.dataset.search.includes(text); if (!card.hidden) count++; });
  $('#topic-empty').hidden = count > 0; $('#search-clear').hidden = !query;
}
document.addEventListener('input', event => { if (event.target.id === 'topic-search') filterTopics(event.target.value); });
document.addEventListener('change', async event => {
  if (event.target.id === 'instant-check' && currentAttempt && currentAttempt.mode !== 'exam') { currentAttempt.instant = event.target.checked; saveAttempt(); renderQuestion(); }
  if (event.target.id === 'bank-file') {
    const file = event.target.files[0]; if (!file) return;
    try {
      if (file.size > 10 * 1024 * 1024) throw new Error('Tệp vượt giới hạn 10 MB.');
      const next = validateBank(JSON.parse(await file.text()));
      confirmAction('Thay ngân hàng câu hỏi?', `Tệp có ${next.questions.length} câu, 6 chủ đề. Thay ngân hàng sẽ làm mới các bài chưa nộp; lịch sử đã nộp vẫn được giữ. Thay đổi chỉ áp dụng trên trình duyệt này.`, 'Nhập ngân hàng', () => replaceBank(next), true);
    } catch (error) { showToast(`Không nhập được: ${error.message}`); }
    event.target.value = '';
  }
});
document.addEventListener('submit', event => {
  if (event.target.id === 'exam-name-form') {
    event.preventDefault();
    const playerName = cleanPlayerName(new FormData(event.target).get('playerName'));
    if (playerName.length < 2) { $('#name-error').textContent = 'Tên hiển thị cần ít nhất 2 ký tự.'; $('#player-name').focus(); return; }
    closeDialog(); beginExam(playerName); return;
  }
  if (event.target.id !== 'question-form') return;
  event.preventDefault(); const data = new FormData(event.target);
  try {
    const question = { id: `custom-${crypto.randomUUID()}`, topicId: data.get('topicId'), text: data.get('text').trim(), options: [0, 1, 2, 3].map(i => data.get(`option${i}`).trim()), answer: Number(data.get('answer')), explanation: data.get('explanation').trim() };
    const next = validateBank({ ...bank, questions: [...bank.questions, question] });
    // Save first; keep form data in place if the browser rejects the write.
    localStorage.setItem(BANK_KEY, JSON.stringify(next));
    bank = next; customBank = true; state.drafts = {}; persist(); closeDialog(); render(); showToast('Đã thêm câu hỏi. Nhớ xuất JSON để lưu bản sao.');
  } catch (error) { $('#form-error').textContent = error.message; }
});
document.addEventListener('keydown', event => {
  if (!currentAttempt || $('#dialog').open || /INPUT|TEXTAREA|SELECT/.test(event.target.tagName) || event.ctrlKey || event.metaKey || event.altKey) return;
  if (/^[1-4]$/.test(event.key) && !reviewing) { event.preventDefault(); answer(Number(event.key) - 1); }
  else if (event.key === 'ArrowRight') { event.preventDefault(); moveQuestion(currentAttempt.current + 1); }
  else if (event.key === 'ArrowLeft') { event.preventDefault(); moveQuestion(currentAttempt.current - 1); }
});
$('#dialog').addEventListener('cancel', () => { pendingConfirm = null; });
$('#dialog').addEventListener('close', () => { if (dialogTrigger?.isConnected) dialogTrigger.focus({ preventScroll: true }); });
// Bấm logo khi đang ở trang chủ: hash không đổi nên tự cuộn về đầu trang.
$('#header').addEventListener('click', event => {
  if (!event.target.closest('.brand')) return;
  const hash = location.hash || '#practice';
  if (hash === '#practice' || hash === '#') { event.preventDefault(); history.replaceState(null, '', '#practice'); window.scrollTo({ top: 0, behavior: 'smooth' }); }
});
window.addEventListener('hashchange', () => { closeDialog(); render(); window.scrollTo(0, 0); $('#main').focus({ preventScroll: true }); });
window.addEventListener('pagehide', () => { if (currentAttempt && !reviewing) saveAttempt(); });
window.addEventListener('storage', event => {
  if (event.key !== STORE_KEY && event.key !== BANK_KEY && event.key !== null) return;
  try {
    // Other tabs on the same origin share data. Reload state before any next write.
    const newState = readStored(STORE_KEY); state = sanitizeState(newState);
    const imported = readStored(BANK_KEY); bank = imported ? validateBank(imported) : defaultBank; customBank = !!imported;
    const previousId = currentAttempt?.id;
    if ($('#dialog').open) closeDialog();
    if (previousId && state.history.some(a => a.id === previousId) && !reviewing) navigate(`#result/${previousId}`);
    else render();
  } catch { showToast('Dữ liệu đã thay đổi ở tab khác. Hãy tải lại trang để cập nhật.'); }
});
document.addEventListener('visibilitychange', () => { if (!document.hidden && currentAttempt && !reviewing) expired(); });
setInterval(() => {
  // Also finalize an expired exam when the learner is on a different screen.
  const a = state.drafts.exam;
  if (a && !a.submittedAt && secondsLeft(a) === 0) {
    if (currentAttempt?.id === a.id && !reviewing) { submitAttempt(true); return; }
    a.submittedAt = a.deadline; a.autoSubmitted = true;
    state.history.unshift(structuredClone(a)); state.history = state.history.slice(0, 50); delete state.drafts.exam; persist(); void submitSharedScore(a);
    if (!currentAttempt) render(); showToast('Bài thi đang chờ đã hết giờ và được tự động nộp. Xem trong Kết quả của bạn.');
  }
  if (currentAttempt && !reviewing && currentAttempt.mode === 'exam') {
    const seconds = secondsLeft(currentAttempt);
    if ($('#timer-value')) { $('#timer-value').textContent = formatTime(seconds); $('.timer').classList.toggle('urgent', seconds < 120); }
  }
}, 1000);

async function init() {
  try {
    const response = await fetch(new URL('./data/questions.json', import.meta.url));
    if (!response.ok) throw new Error('Không tải được ngân hàng câu hỏi.');
    defaultBank = validateBank(await response.json()); bank = defaultBank;
    const imported = readStored(BANK_KEY);
    if (imported) { try { bank = validateBank(imported); customBank = true; } catch { storageError = true; } }
    try { const r = await fetch(new URL('./data/lop-cu-chi.json', import.meta.url)); if (r.ok) { const s = await r.json(); if (Array.isArray(s.questions) && s.questions.length) classSet = s; } } catch { classSet = null; }
    const saved = readStored(STORE_KEY);
    if (saved) state = sanitizeState(saved);
    if (state.bankRevision !== CONFIG.bankRevision) {
      if (!customBank) { state.archivedDrafts.push(...Object.values(state.drafts)); state.drafts = {}; }
      state.bankRevision = CONFIG.bankRevision;
      persist();
    }
    render();
  } catch (error) {
    renderHeader('practice'); page(`<section class="panel empty-state">${icon('circle-help')}<h1>Chưa tải được bộ câu hỏi</h1><p>${esc(error.message)} Hãy kiểm tra kết nối và mở website bằng đường dẫn máy chủ, không mở trực tiếp tệp HTML.</p>${btn('Thử lại', 'reload')}</section>`); icons();
  }
}
init();
