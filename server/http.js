export const json = (data, status = 200, headers = {}) => Response.json(data, {
  status, headers: { 'Cache-Control': 'no-store', ...headers }
});

export function sameOrigin(request) {
  return request.headers.get('origin') === new URL(request.url).origin;
}

export async function readJson(request, maxBytes) {
  if (request.headers.get('content-type')?.split(';')[0] !== 'application/json' || !request.body) {
    return null;
  }
  const reader = request.body.getReader();
  const decoder = new TextDecoder();
  let length = 0;
  let result = '';
  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) return JSON.parse(result + decoder.decode());
      length += value.byteLength;
      if (length > maxBytes) {
        await reader.cancel();
        return null;
      }
      result += decoder.decode(value, { stream: true });
    }
  } catch {
    return null;
  } finally {
    reader.releaseLock();
  }
}
