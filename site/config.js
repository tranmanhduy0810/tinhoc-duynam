// Đổi tên, mô tả, thời gian và số câu thi thử tại đây, rồi chạy npm run build.
export const CONFIG = Object.freeze({
  name: 'Ôn tập tin học',
  examQuestions: 30,
  examMinutes: 30,
  passPercent: 50,
  practiceLimit: 50,
  bankLabel: '300 câu / 6 module',
  bankRevision: 'tinhockp-300-v1',
  // Endpoint Cloudflare Worker; để trống thì bảng xếp hạng chỉ dùng dữ liệu trên thiết bị.
  leaderboardApiUrl: 'https://tinhoc-duynam-leaderboard.tranmanhduy2107.workers.dev',
});
