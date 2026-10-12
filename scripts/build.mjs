import { cp, mkdir, readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { validateBank } from '../site/core.js';
const root = fileURLToPath(new URL('../', import.meta.url));
const bank = JSON.parse(await readFile(path.join(root, 'site/data/questions.json'), 'utf8'));
validateBank(bank);
await mkdir(path.join(root, 'site/assets/fonts'), { recursive: true });
for (const subset of ['latin', 'vietnamese', 'latin-ext']) {
  await cp(path.join(root, `node_modules/@fontsource-variable/inter/files/inter-${subset}-wght-normal.woff2`), path.join(root, `site/assets/fonts/inter-${subset}.woff2`));
}
await cp(path.join(root, 'node_modules/@fontsource-variable/inter/LICENSE'), path.join(root, 'site/assets/fonts/LICENSE.txt'));
await cp(path.join(root, 'node_modules/lucide/dist/umd/lucide.min.js'), path.join(root, 'site/assets/lucide.min.js'));
await cp(path.join(root, 'node_modules/lucide/LICENSE'), path.join(root, 'site/assets/lucide-LICENSE.txt'));
await mkdir(path.join(root, 'dist'), { recursive: true });
await cp(path.join(root, 'site'), path.join(root, 'dist'), { recursive: true });
await cp(path.join(root, 'site/index.html'), path.join(root, 'dist/practice.html'));
await writeFile(path.join(root, 'dist/.nojekyll'), '');
console.log(`Build thành công: ${bank.questions.length} câu hỏi / ${bank.topics.length} chủ đề. Thư mục: dist/`);
