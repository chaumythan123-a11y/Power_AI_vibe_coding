import { createChatHandler, MAX_BODY } from './chatCore.mjs';

const send = (res, { status, payload, headers = {} }) => {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');
  for (const [key, value] of Object.entries(headers)) res.setHeader(key, value);
  res.end(JSON.stringify(payload));
};

export function createChatMiddleware(options) {
  const handle = createChatHandler(options);
  return async function chatMiddleware(req, res, next) {
    const path = (req.url || '').split('?')[0];
    if (path !== '/api/chat' && path !== '/api/chat/status') return next();
    if (path === '/api/chat' && req.method === 'POST') {
      // Reject oversize input before parsing; still count streamed bytes if the header is absent.
      if (Number(req.headers['content-length']) > MAX_BODY) return send(res, { status: 413, payload: { error: 'Nội dung yêu cầu quá dài.' } });
      let body;
      try {
        let size = 0; const chunks = [];
        for await (const chunk of req) {
          size += Buffer.byteLength(chunk);
          if (size > MAX_BODY) return send(res, { status: 413, payload: { error: 'Nội dung yêu cầu quá dài.' } });
          chunks.push(Buffer.from(chunk));
        }
        body = JSON.parse(Buffer.concat(chunks).toString('utf8'));
      } catch { return send(res, { status: 400, payload: { error: 'Nội dung yêu cầu không hợp lệ.' } }); }
      return send(res, await handle({ path, method: req.method, headers: req.headers, body, client: req.socket?.remoteAddress || 'local' }));
    }
    return send(res, await handle({ path, method: req.method, headers: req.headers, client: req.socket?.remoteAddress || 'local' }));
  };
}
