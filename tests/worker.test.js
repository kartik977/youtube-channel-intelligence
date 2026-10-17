import assert from 'node:assert/strict';
import { test } from 'node:test';
import worker from '../worker/index.js';

const app = (url, method = 'GET') => {
  const calls = [];
  const ctx = { waitUntil(promise) { calls.push(promise); } };
  const env = {
    ASSETS: {
      async fetch(request) { return new Response('dashboard asset: ' + new URL(request.url).pathname, {status: 200}); },
    },
  };
  return { request: new Request(url, { method }), env, ctx, calls };
};

test('Worker passes dashboard and assets to static asset binding', async () => {
  const { request, env, ctx } = app('https://channelscope.example/');
  const result = await worker.fetch(request, env, ctx);
  assert.equal(result.status, 200);
  assert.equal(await result.text(), 'dashboard asset: /');
});

test('Worker responds to channel lookup without key with JSON, not HTML', async () => {
  const { request, env, ctx } = app('https://channelscope.example/api/channel?input=%40YouTube');
  const result = await worker.fetch(request, env, ctx);
  assert.equal(result.status, 503);
  assert.match(result.headers.get('content-type'), /application\/json/);
  assert.match((await result.json()).error, /API key not configured/);
});

test('Worker rejects non-GET API calls and unknown API routes', async () => {
  let args = app('https://channelscope.example/api/channel', 'POST');
  let res = await worker.fetch(args.request, args.env, args.ctx);
  assert.equal(res.status, 405);
  args = app('https://channelscope.example/api/other');
  res = await worker.fetch(args.request, args.env, args.ctx);
  assert.equal(res.status, 404);
  assert.match(res.headers.get('content-type'), /application\/json/);
});
