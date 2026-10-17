// Cloudflare Workers entrypoint. Reuse the Pages-compatible API handler,
// while allowing Workers Static Assets to serve the React dashboard.
import { onRequestGet } from '../functions/api/channel.js';

const json = (body, status) => new Response(JSON.stringify(body), {
  status,
  headers: {
    'content-type': 'application/json; charset=utf-8',
    'cache-control': 'no-store',
    'x-content-type-options': 'nosniff',
  },
});

export default {
  async fetch(request, env, ctx) {
    const path = new URL(request.url).pathname;

    if (path === '/api/channel') {
      if (request.method !== 'GET') {
        return json({ error: 'Method not allowed.' }, 405);
      }
      return onRequestGet({
        request,
        env,
        waitUntil: (promise) => ctx.waitUntil(promise),
      });
    }

    if (path.startsWith('/api/')) {
      return json({ error: 'Unknown API endpoint.' }, 404);
    }

    return env.ASSETS.fetch(request);
  },
};
