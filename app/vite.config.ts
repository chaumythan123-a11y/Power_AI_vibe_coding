import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import { createChatMiddleware } from './server/chat.mjs';
import { knowledge } from './server/knowledge.mjs';

export default defineConfig(({mode}) => {
  // Loaded only into the local Node server; never injected into the browser.
  const env = loadEnv(mode, process.cwd(), 'GEMINI_');
  const middleware = createChatMiddleware({
    apiKey: env.GEMINI_API_KEY,
    model: 'gemini-2.5-flash',
    knowledge,
  });
  return { cacheDir: '.vite-cache', plugins: [react(), {
    name: 'studyconnect-local-chat-api',
    configureServer(server) { server.middlewares.use(middleware); },
    configurePreviewServer(server) { server.middlewares.use(middleware); },
  }], server: { host: '127.0.0.1' }, preview: { host: '127.0.0.1' } };
});
