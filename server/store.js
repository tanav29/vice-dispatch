import { createHash, randomUUID } from 'node:crypto';
import { mkdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { BlobPreconditionFailedError, get, put } from '@vercel/blob';
import seed from '../public/data/seed.json' with { type: 'json' };

const key = process.env.VERCEL_ENV === 'preview' ? 'vice-dispatch/preview.json' : 'vice-dispatch/content.json';
const initial = { revision: 'seed', data: seed };
const localDir = process.env.DISPATCH_DATA_DIR || '.local';
const localFile = join(localDir, 'dispatch.json');

export function storageReady() {
  return Boolean(process.env.BLOB_READ_WRITE_TOKEN) || !process.env.VERCEL;
}

function readLocal() {
  try {
    const raw = readFileSync(localFile, 'utf8');
    return { revision: createHash('sha256').update(raw).digest('hex'), data: JSON.parse(raw) };
  } catch (error) {
    if (error.code === 'ENOENT') return initial;
    throw error;
  }
}

export async function readContent() {
  if (!storageReady()) return initial;
  if (!process.env.BLOB_READ_WRITE_TOKEN) return readLocal();
  const result = await get(key, { access: 'private', useCache: false });
  if (!result) return initial;
  if (result.statusCode !== 200) throw new Error('Unexpected content storage response.');
  return { revision: result.blob.etag, data: await new Response(result.stream).json() };
}

export class EditConflict extends Error {}

export async function saveContent(data, revision) {
  const raw = JSON.stringify(data);
  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    // Local development runs in one process. Keep the version check and atomic swap synchronous.
    if (revision !== readLocal().revision) throw new EditConflict();
    mkdirSync(localDir, { recursive: true });
    const pending = join(localDir, randomUUID() + '.json');
    writeFileSync(pending, raw);
    renameSync(pending, localFile);
    return readLocal();
  }
  try {
    const blob = await put(key, raw, {
      access: 'private', contentType: 'application/json', addRandomSuffix: false,
      allowOverwrite: revision !== 'seed', ...(revision === 'seed' ? {} : { ifMatch: revision })
    });
    return { revision: blob.etag, data };
  } catch (error) {
    if (error instanceof BlobPreconditionFailedError ||
        (revision === 'seed' && (await readContent()).revision !== 'seed')) throw new EditConflict();
    throw error;
  }
}
