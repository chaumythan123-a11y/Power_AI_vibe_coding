import { createChatHandler } from '../../server/chatCore.mjs';
import { knowledge } from '../../server/knowledge.mjs';

const handle = createChatHandler({ apiKey: process.env.GEMINI_API_KEY, knowledge });

export default async function status(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  const output = await handle({ path: '/api/chat/status', method: req.method, headers: req.headers });
  return res.status(output.status).json(output.payload);
}
