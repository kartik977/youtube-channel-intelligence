// Cloudflare Workers entrypoint. Reuse the Pages-compatible API handler,
// while allowing Workers Static Assets to serve the React dashboard.
import { onRequestGet } from '../functions/api/channel.js';
import { onRequestPost } from '../functions/api/advisor.js';
import { onRequestPost as optimizeVideo } from '../functions/api/video-optimizer.js';
import { onRequestGet as getVideo } from '../functions/api/video.js';
import { onRequestPost as getOpportunities } from '../functions/api/opportunities.js';
import { onRequestPost as instagramStudio } from '../functions/api/instagram.js';

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

    if (path === '/api/advisor') {
      if (request.method !== 'POST') {
        return json({ error: 'Method not allowed.' }, 405);
      }
      return onRequestPost({ request, env, waitUntil: (promise) => ctx.waitUntil(promise) });
    }

    if (path === '/api/video') {
      if (request.method !== 'GET') return json({ error: 'Method not allowed.' }, 405);
      return getVideo({ request, env, waitUntil: (promise) => ctx.waitUntil(promise) });
    }

    if (path === '/api/video-optimizer') {
      if (request.method !== 'POST') return json({ error: 'Method not allowed.' }, 405);
      return optimizeVideo({ request, env });
    }

    if (path === '/api/opportunities') {
      if (request.method !== 'POST') return json({ error: 'Method not allowed.' }, 405);
      return getOpportunities({ request, env });
    }

    if (path === '/api/instagram') {
      if (request.method !== 'POST') return json({ error: 'Method not allowed.' }, 405);
      return instagramStudio({request,env});
    }

    if (path.startsWith('/api/')) {
      return json({ error: 'Unknown API endpoint.' }, 404);
    }

    return env.ASSETS.fetch(request);
  },
};
