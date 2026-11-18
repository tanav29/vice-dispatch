import { authenticated, correctPassword, passwordReady, sessionCookie } from '../server/session.js';
import { storageReady } from '../server/store.js';
import { json, readJson, sameOrigin } from '../server/http.js';

export default {
  async fetch(request) {
    if (!passwordReady() || !storageReady()) {
      return json({ error: 'Set EDITOR_PASSWORD and connect a private Blob store on Vercel to enable the editor.' }, 503);
    }
    if (request.method === 'GET') return json({ signedIn: authenticated(request) });
    if (!sameOrigin(request)) return json({ error: 'Open the editor from the site to sign in.' }, 403);
    if (request.method === 'DELETE') return json({ signedIn: false }, 200, { 'Set-Cookie': sessionCookie(true) });
    if (request.method !== 'POST') return json({ error: 'Method not allowed.' }, 405, { Allow: 'GET, POST, DELETE' });
    const input = await readJson(request, 8192);
    if (!correctPassword(input?.password)) return json({ error: 'That password did not match.' }, 401);
    return json({ signedIn: true }, 200, { 'Set-Cookie': sessionCookie() });
  }
};
