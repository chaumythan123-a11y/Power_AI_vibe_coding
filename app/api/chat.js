import { createChatHandler, MAX_BODY } from '../server/chatCore.mjs';
import { knowledge } from '../server/knowledge.mjs';

const handle = createChatHandler({ apiKey: process.env.GEMINI_API_KEY, knowledge });

export default async function chat(req, res) {
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');
  const send = (status, payload, headers = {}) => {
    for (const [key, value] of Object.entries(headers)) res.setHeader(key, value);
    return res.status(status).json(payload);
  };
  if (req.method !== 'POST') return send(405, { error: 'Phương thức không được hỗ trợ.' });
  if (!/^application\/json(?:;|$)/i.test(req.headers['content-type'] || '')) return send(415, { error: 'Yêu cầu phải là JSON.' });
  if (Number(req.headers['content-length']) > MAX_BODY) return send(413, { error: 'Nội dung yêu cầu quá dài.' });
  let body;
  try {
    body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
    if (Buffer.byteLength(JSON.stringify(body)) > MAX_BODY) return send(413, { error: 'Nội dung yêu cầu quá dài.' });
  } catch { return send(400, { error: 'Nội dung yêu cầu không hợp lệ.' }); }
  const client = req.socket?.remoteAddress || 'vercel';
  const output = await handle({ path: '/api/chat', method: req.method, headers: req.headers, body, client });
  return send(output.status, output.payload, output.headers);
}
