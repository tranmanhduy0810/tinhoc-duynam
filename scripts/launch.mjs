import { spawn } from 'node:child_process';
import { mkdirSync, openSync, closeSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
const root = path.resolve(fileURLToPath(new URL('../', import.meta.url)));
const port = Number(process.env.PORT || 4173);
const url = `http://127.0.0.1:${port}`;
async function ready() {
  try { const r = await fetch(url, { signal: AbortSignal.timeout(1000) }); const html = await r.text(); return r.ok && (html.includes('name="application-name" content="on-tap-tin-hoc"') || html.includes('Tin học Duy Nấm')); } catch { return false; }
}
if (!await ready()) {
  mkdirSync(path.join(root, 'artifacts'), { recursive: true });
  const out = openSync(path.join(root, 'artifacts/server.log'), 'a');
  const err = openSync(path.join(root, 'artifacts/server-error.log'), 'a');
  const child = spawn(process.execPath, ['scripts/serve.mjs'], { cwd: root, env: { ...process.env, PORT: String(port), PUBLIC_URL: process.env.PUBLIC_URL || url }, detached: true, windowsHide: true, stdio: ['ignore', out, err] });
  child.unref(); closeSync(out); closeSync(err);
  for (let i = 0; i < 30 && !await ready(); i++) await new Promise(resolve => setTimeout(resolve, 150));
  if (!await ready()) { console.error(`Không mở được website ở cổng ${port}. Xem artifacts/server-error.log hoặc chọn PORT khác.`); process.exit(1); }
}
console.log(`Website đã sẵn sàng: ${url}`);
if (process.argv.includes('--open')) {
  if (process.platform === 'win32') { const browser = spawn('rundll32.exe', ['url.dll,FileProtocolHandler', url], { detached: true, windowsHide: true, stdio: 'ignore' }); browser.unref(); }
  else console.log('Mở đường dẫn trên bằng trình duyệt.');
}
