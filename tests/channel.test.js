import test, { afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { onRequestGet } from '../functions/api/channel.js';

const originalFetch = globalThis.fetch;
afterEach(() => { globalThis.fetch = originalFetch; });

const oneVideo = {
  id: 'hExampleVid1',
  snippet: { title: 'Building a web app', publishedAt: '2026-10-01T12:00:00Z', thumbnails: { medium: { url: 'https://i.ytimg.com/demo.jpg' } } },
  statistics: { viewCount: '310', likeCount: '22', commentCount: '4' },
  contentDetails: { duration: 'PT3M41S' },
};
function mockYouTube(calls) {
  globalThis.fetch = async (url) => {
    const address = new URL(url);
    calls.push(address);
    const endpoint = address.pathname.split('/').pop();
    const items = endpoint === 'channels' ? [{
      id: 'UC1234567890123456789012',
      snippet: { title: 'Test Channel', customUrl: '@testchannel', description: 'A public channel', publishedAt: '2023-01-01T00:00:00Z' },
      statistics: { subscriberCount: '11100', viewCount: '1200000', videoCount: '82' },
      contentDetails: { relatedPlaylists: { uploads: 'UU1234567890123456789012' } },
    }] : endpoint === 'playlistItems'
      ? [{ contentDetails: { videoId: oneVideo.id } }]
      : [oneVideo];
    return new Response(JSON.stringify({ items }), { status: 200 });
  };
}
const ctx = (input, key='FAKE_TEST_KEY') => ({
  request: new Request(`https://example.pages.dev/api/channel?input=${encodeURIComponent(input)}`),
  env: key ? { YOUTUBE_API_KEY: key } : {},
  waitUntil: () => {},
});

test('valid @handle retrieves channel stats and public video metrics', async () => {
  const calls = []; mockYouTube(calls);
  const result = await onRequestGet(ctx('@testchannel'));
  assert.equal(result.status, 200);
  const data = await result.json();
  assert.equal(data.source, 'youtube');
  assert.equal(data.channel.subscribers, 11100);
  assert.equal(data.channel.views, 1200000);
  assert.equal(data.videos[0].views, 310);
  assert.equal(data.videos[0].likes, 22);
  assert.equal(data.videos[0].url, `https://www.youtube.com/watch?v=${oneVideo.id}`);
  assert.deepEqual(calls.map(c => c.pathname.split('/').pop()), ['channels','playlistItems','videos']);
  assert.equal(calls[0].searchParams.get('forHandle'), '@testchannel');
  assert.equal(calls[1].searchParams.get('playlistId'), 'UU1234567890123456789012');
});

test('handles YouTube URLs with and without scheme and with /videos', async () => {
  for (const input of ['youtube.com/@testchannel', 'https://www.youtube.com/@testchannel/videos', 'https://m.youtube.com/@testchannel?feature=shared']) {
    const calls = []; mockYouTube(calls);
    const result = await onRequestGet(ctx(input));
    assert.equal(result.status, 200);
    assert.equal(calls[0].searchParams.get('forHandle'), '@testchannel');
  }
});

test('channel id and /channel/ links use the id endpoint', async () => {
  for (const input of ['UC1234567890123456789012','https://www.youtube.com/channel/UC1234567890123456789012']) {
    const calls=[]; mockYouTube(calls);
    assert.equal((await onRequestGet(ctx(input))).status, 200);
    assert.equal(calls[0].searchParams.get('id'), 'UC1234567890123456789012');
  }
});

test('rejects other hosts, empty input, and invalid channel links before calling YouTube', async () => {
  for (const input of ['https://notyoutube.com/@testchannel', ' ', 'https://youtube.com/watch?v=123', '@bad handle', '@x']) {
    const calls=[]; mockYouTube(calls);
    const result = await onRequestGet(ctx(input));
    assert.equal(result.status, 400, input);
    assert.equal(calls.length, 0);
    assert.ok((await result.json()).error);
  }
});

test('returns a helpful message when no secret is configured', async () => {
  const response = await onRequestGet(ctx('@testchannel', ''));
  assert.equal(response.status, 503);
  assert.match((await response.json()).error, /key not configured/i);
});

test('returns 404 for an unknown channel', async () => {
  globalThis.fetch=async()=>new Response(JSON.stringify({items: []}), {status:200});
  const response=await onRequestGet(ctx('@doesnotexist'));
  assert.equal(response.status,404);
});

test('returns 429 on YouTube API quota exceeded', async () => {
  globalThis.fetch=async()=>new Response(JSON.stringify({error:{errors:[{reason:'quotaExceeded'}]}}),{status:403});
  const response=await onRequestGet(ctx('@testchannel'));
  assert.equal(response.status,429);
  assert.match((await response.json()).error,/quota/i);
});

test('hidden subscribers and missing video counts remain unavailable, not zero', async () => {
  globalThis.fetch=async url=>{
    if (new URL(url).pathname.endsWith('/channels')) return new Response(JSON.stringify({items:[{
      id:'UC1234567890123456789012',snippet:{title:'Hidden'},
      statistics:{hiddenSubscriberCount:true,videoCount:'4'},
      contentDetails:{relatedPlaylists:{uploads:'UU1234567890123456789012'}}
    }]}));
    if(new URL(url).pathname.endsWith('/playlistItems')) return new Response(JSON.stringify({items:[{contentDetails:{videoId:'hExampleVid1'}}]}));
    return new Response(JSON.stringify({items:[{id:'hExampleVid1',snippet:{title:'Video'},statistics:{viewCount:'5'}}]}));
  };
  const response=await onRequestGet(ctx('@hidden'));
  assert.equal(response.status,200);
  const data=await response.json();
  assert.equal(data.channel.subscribers, null);
  assert.equal(data.channel.subscribersHidden,true);
  assert.equal(data.videos[0].likes,null);
  assert.equal(data.videos[0].comments,null);
});
