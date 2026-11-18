import { access, readdir, readFile } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import { artwork } from '../public/content.js';
import { validateContent } from '../server/validate.js';

const directories = ['api', 'public', 'scripts', 'server'];
for (const directory of directories) {
  for (const file of await readdir(directory)) {
    if (!file.endsWith('.js')) continue;
    const result = spawnSync(process.execPath, ['--check', directory + '/' + file], { stdio: 'inherit' });
    if (result.status !== 0) process.exit(result.status || 1);
  }
}
const publicFiles = ['index.html', 'editor.html', 'styles.css', 'assets/favicon.png',
  'assets/barlow-latin-400-normal.woff2', 'assets/barlow-condensed-latin-700-normal.woff2',
  'assets/barlow-condensed-latin-900-normal.woff2', ...Object.keys(artwork).map(path => path.slice(1))];
await Promise.all(publicFiles.map(file => access('public/' + file)));
validateContent(JSON.parse(await readFile('public/data/seed.json', 'utf8')));
console.log('JavaScript syntax, bundled assets, and starter content passed.');
