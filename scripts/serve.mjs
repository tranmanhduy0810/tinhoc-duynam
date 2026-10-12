import http from 'node:http';
import path from 'node:path';
import { readFile, stat } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
const root = path.resolve(fileURLToPath(new URL('../dist/', import.meta.url)));
const portArg = process.argv.indexOf('--port');
const port = Number(portArg >= 0 ? process.argv[portArg + 1] : process.env.PORT || 4173);
const host = process.env.HOST || '127.0.0.1';
const publicPath = process.env.PUBLIC_URL ? new URL(process.env.PUBLIC_URL, `http://${host}:${port}`).pathname.replace(/\/$/, '') : '';
const types = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.json': 'application/json; charset=utf-8', '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.woff2': 'font/woff2', '.txt': 'text/plain; charset=utf-8' };
const server = http.createServer(async (req, res) => {
  if (!['GET', 'HEAD'].includes(req.method)) { res.writeHead(405); return res.end(); }
  try {
    let urlPath = decodeURIComponent(new URL(req.url, `http://${host}`).pathname);
    if (publicPath && (urlPath === publicPath || urlPath.startsWith(publicPath + '/'))) urlPath = urlPath.slice(publicPath.length) || '/';
    if (urlPath.endsWith('/')) urlPath += 'index.html';
    const target = path.resolve(root, '.' + urlPath);
    if (!target.startsWith(root + path.sep) && target !== root) { res.writeHead(403); return res.end('Forbidden'); }
    const info = await stat(target);
    if (!info.isFile()) throw new Error('Not a file');
    res.writeHead(200, { 'Content-Type': types[path.extname(target)] || 'application/octet-stream', 'Cache-Control': 'no-cache', 'X-Content-Type-Options': 'nosniff', 'Referrer-Policy': 'same-origin' });
    res.end(req.method === 'HEAD' ? undefined : await readFile(target));
  } catch { res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' }); res.end('Không tìm thấy trang.'); }
});
server.listen(port, host, () => console.log(`Tin học Duy Nấm đang chạy: http://${host}:${port}`));
server.on('error', error => { console.error(error.code === 'EADDRINUSE' ? `Cổng ${port} đã được sử dụng. Hãy chọn cổng khác.` : error.message); process.exitCode = 1; });
