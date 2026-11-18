import { createServer, IncomingMessage, ServerResponse } from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, isAbsolute, relative, resolve } from 'node:path';
import { Readable } from 'node:stream';
import content from '../api/content.js';
import session from '../api/session.js';
import config from '../vercel.json' with { type: 'json' };

const host = 'localhost';
const port = Number(process.env.PORT || 3000);
const origin = 'http://' + host + ':' + port;
const publicDir = resolve(import.meta.dirname, '../public');
const staticRoutes = new Map([['/', '/index.html'], ['/editor', '/editor.html']]);
const apiRoutes = new Map([['/api/content', content], ['/api/session', session]]);
const types = new Map([
  ['.html', 'text/html; charset=utf-8'], ['.css', 'text/css; charset=utf-8'],
  ['.js', 'text/javascript; charset=utf-8'], ['.json', 'application/json; charset=utf-8'],
  ['.webp', 'image/webp'], ['.png', 'image/png'], ['.woff2', 'font/woff2'],
  ['.txt', 'text/plain; charset=utf-8']
]);

async function route(request) {
  const path = new URL(request.url).pathname;
  if (apiRoutes.has(path)) return apiRoutes.get(path).fetch(request);
  if (!['GET', 'HEAD'].includes(request.method)) return new Response('Method not allowed', { status: 405 });
  const target = resolve(publicDir, '.' + decodeURIComponent(staticRoutes.get(path) || path));
  const child = relative(publicDir, target);
  const type = types.get(extname(target));
  if (isAbsolute(child) || child.startsWith('..') || !type) return new Response('Not found', { status: 404 });
  try {
    const file = await readFile(target);
    return new Response(request.method === 'HEAD' ? null : file, {
      headers: { 'Content-Type': type, 'Content-Length': String(file.length), 'Cache-Control': 'no-store' }
    });
  } catch (error) {
    if (['ENOENT', 'EISDIR'].includes(error.code)) return new Response('Not found', { status: 404 });
    throw error;
  }
}

/** @param {IncomingMessage} input @param {ServerResponse} output */
async function handle(input, output) {
  try {
    const request = new Request(new URL(input.url, origin), {
      method: input.method, headers: input.headers,
      ...(!['GET', 'HEAD'].includes(input.method) ? { body: Readable.toWeb(input), duplex: 'half' } : {})
    });
    const response = await route(request);
    for (const { key, value } of config.headers[0].headers) output.setHeader(key, value);
    for (const [key, value] of response.headers) output.setHeader(key, value);
    output.writeHead(response.status);
    if (response.body) Readable.fromWeb(response.body).pipe(output);
    else output.end();
  } catch (error) {
    console.error(error);
    output.writeHead(500).end('Server error');
  }
}

createServer(handle).listen(port, '127.0.0.1', () => console.log('Vice Dispatch at ' + origin));
