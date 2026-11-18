import { authenticated } from '../server/session.js';
import { EditConflict, readContent, saveContent, storageReady } from '../server/store.js';
import { InvalidContent, validateContent } from '../server/validate.js';
import { json, readJson, sameOrigin } from '../server/http.js';

export default {
  async fetch(request) {
    try {
      if (request.method === 'GET') return json(await readContent());
      if (request.method !== 'PUT') return json({ error: 'Method not allowed.' }, 405, { Allow: 'GET, PUT' });
      if (!sameOrigin(request)) return json({ error: 'Open the editor from the site to publish.' }, 403);
      if (!authenticated(request)) return json({ error: 'Sign in to publish changes.' }, 401);
      if (!storageReady()) return json({ error: 'Connect a private Vercel Blob store to publish changes.' }, 503);
      const body = await readJson(request, 2_000_000);
      if (typeof body?.revision !== 'string' || body.revision.length > 256) {
        return json({ error: 'Could not read this edit. Check its size and try again.' }, 400);
      }
      return json(await saveContent(validateContent(body.data), body.revision));
    } catch (error) {
      if (error instanceof InvalidContent) return json({ error: error.message }, 400);
      if (error instanceof EditConflict) {
        return json({ error: 'Someone published a newer version. Copy your unsaved changes, reload, and try again.' }, 409);
      }
      console.error('Content storage error:', error.name);
      return json({ error: 'Content storage is unavailable. Try again shortly.' }, 503);
    }
  }
};
