import { createHash, createHmac, randomBytes, timingSafeEqual } from 'node:crypto';

const lifetime = 8 * 60 * 60;
const password = () => process.env.EDITOR_PASSWORD || '';
const digest = value => createHash('sha256').update(value).digest();
const sign = value => createHmac('sha256', password()).update('vice-dispatch:session:' + value).digest('base64url');
const now = () => Math.floor(Date.now() / 1000);
const cookieName = () => process.env.VERCEL ? '__Host-vice-editor' : 'vice-editor';

export function passwordReady() {
  return password().length >= 24;
}

export function correctPassword(candidate) {
  return passwordReady() && typeof candidate === 'string' && candidate.length <= 512 &&
    timingSafeEqual(digest(candidate), digest(password()));
}

export function authenticated(request) {
  if (!passwordReady()) return false;
  const prefix = cookieName() + '=';
  const cookie = request.headers.get('cookie')?.split(';').map(part => part.trim()).find(part => part.startsWith(prefix));
  const match = cookie?.slice(prefix.length).match(/^(\d{1,12}\.[\w-]{22})\.([\w-]{43})$/);
  return Boolean(match && Number(match[1].split('.')[0]) > now() &&
    timingSafeEqual(digest(match[2]), digest(sign(match[1]))));
}

export function sessionCookie(clear = false) {
  const value = (now() + lifetime) + '.' + randomBytes(16).toString('base64url');
  const token = clear ? '' : value + '.' + sign(value);
  return cookieName() + '=' + token + '; Path=/; HttpOnly; SameSite=Strict; Max-Age=' +
    (clear ? 0 : lifetime) + (process.env.VERCEL ? '; Secure' : '');
}
