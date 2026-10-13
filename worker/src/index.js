const JSON_HEADERS = { 'content-type': 'application/json; charset=utf-8' };

export function normalizeName(value) {
  return String(value || '').trim().replace(/\s+/g, ' ').normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/g, 'd').replace(/Đ/g, 'D').toLowerCase();
}

export function validateScore(input) {
  const playerName = String(input?.playerName || '').trim().replace(/\s+/g, ' ').slice(0, 30);
  const correct = Number(input?.correct), total = Number(input?.total), duration = Number(input?.duration), submittedAt = Number(input?.submittedAt);
  const attemptId = String(input?.attemptId || '').trim();
  if (playerName.length < 2 || playerName.length > 30) throw new Error('Tên hiển thị không hợp lệ.');
  if (!Number.isInteger(correct) || !Number.isInteger(total) || total !== 30 || correct < 0 || correct > total) throw new Error('Kết quả không hợp lệ.');
  if (!Number.isInteger(duration) || duration < 0 || duration > 1800) throw new Error('Thời gian không hợp lệ.');
  if (!Number.isFinite(submittedAt) || submittedAt < 1_600_000_000_000 || submittedAt > Date.now() + 300_000) throw new Error('Thời điểm nộp không hợp lệ.');
  if (!/^[a-zA-Z0-9-]{8,80}$/.test(attemptId)) throw new Error('Mã bài thi không hợp lệ.');
  return { playerName, nameKey: normalizeName(playerName), correct, total, duration, submittedAt: Math.round(submittedAt), attemptId };
}

function corsHeaders(request, env) {
  const origin = request.headers.get('origin') || '';
  const allowed = String(env.ALLOWED_ORIGINS || '').split(',').map(value => value.trim()).filter(Boolean);
  return { 'access-control-allow-origin': allowed.includes(origin) ? origin : allowed[0] || '*', 'access-control-allow-methods': 'GET, POST, OPTIONS', 'access-control-allow-headers': 'content-type', 'access-control-max-age': '86400', vary: 'Origin' };
}
function json(request, env, body, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { ...JSON_HEADERS, ...corsHeaders(request, env), 'cache-control': 'no-store' } });
}
async function listScores(request, env) {
  const url = new URL(request.url), limit = Math.min(20, Math.max(1, Number.parseInt(url.searchParams.get('limit') || '20', 10) || 20));
  const sql = 'SELECT player_name AS playerName, correct_answers AS correct, total_questions AS total, duration_seconds AS duration, submitted_at AS submittedAt FROM leaderboard_entries ORDER BY correct_answers DESC, duration_seconds ASC, submitted_at ASC LIMIT ?';
  const result = await env.DB.prepare(sql).bind(limit).all();
  return json(request, env, { entries: result.results || [] });
}
async function saveScore(request, env) {
  const origin = request.headers.get('origin') || '';
  const allowed = String(env.ALLOWED_ORIGINS || '').split(',').map(value => value.trim()).filter(Boolean);
  if (origin && !allowed.includes(origin)) return json(request, env, { error: 'Origin không được phép.' }, 403);
  let score;
  try { score = validateScore(await request.json()); } catch (error) { return json(request, env, { error: error.message }, 400); }
  const sql = 'INSERT INTO leaderboard_entries (name_key, player_name, correct_answers, total_questions, duration_seconds, submitted_at, attempt_id, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?) ON CONFLICT(name_key) DO UPDATE SET player_name = excluded.player_name, correct_answers = excluded.correct_answers, total_questions = excluded.total_questions, duration_seconds = excluded.duration_seconds, submitted_at = excluded.submitted_at, attempt_id = excluded.attempt_id, updated_at = excluded.updated_at WHERE excluded.correct_answers > leaderboard_entries.correct_answers OR (excluded.correct_answers = leaderboard_entries.correct_answers AND excluded.duration_seconds < leaderboard_entries.duration_seconds) OR (excluded.correct_answers = leaderboard_entries.correct_answers AND excluded.duration_seconds = leaderboard_entries.duration_seconds AND excluded.submitted_at < leaderboard_entries.submitted_at)';
  await env.DB.prepare(sql).bind(score.nameKey, score.playerName, score.correct, score.total, score.duration, score.submittedAt, score.attemptId, Date.now()).run();
  return json(request, env, { ok: true }, 201);
}
export default {
  async fetch(request, env) {
    if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: corsHeaders(request, env) });
    const path = new URL(request.url).pathname;
    try {
      if (path === '/api/leaderboard' && request.method === 'GET') return await listScores(request, env);
      if (path === '/api/scores' && request.method === 'POST') return await saveScore(request, env);
      if (path === '/health' && request.method === 'GET') return json(request, env, { ok: true });
      return json(request, env, { error: 'Không tìm thấy endpoint.' }, 404);
    } catch (error) { console.error(error); return json(request, env, { error: 'Máy chủ tạm thời chưa xử lý được yêu cầu.' }, 500); }
  },
};
