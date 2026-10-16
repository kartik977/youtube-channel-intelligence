const API_ROOT = 'https://www.googleapis.com/youtube/v3';
const CACHE_SECONDS = 900;

function json(data, status = 200, extra = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'cache-control': status === 200 ? `public, max-age=60, s-maxage=${CACHE_SECONDS}` : 'no-store',
      'x-content-type-options': 'nosniff',
      ...extra,
    },
  });
}

function normalizeInput(value) {
  let input = String(value ?? '').trim();
  if (!input || input.length > 250) {
    throw new Error('Enter a YouTube @handle, channel ID, or channel URL.');
  }

  // People often paste the address without https:// or paste the /videos tab.
  if (/^(?:www\.|m\.)?youtube\.com\//i.test(input)) input = `https://${input}`;
  if (/^https?:\/\//i.test(input)) {
    let url;
    try { url = new URL(input); } catch { throw new Error('Enter a valid YouTube channel URL.'); }
    if (!['youtube.com', 'www.youtube.com', 'm.youtube.com'].includes(url.hostname.toLowerCase())) {
      throw new Error('Only youtube.com channel URLs are supported.');
    }
    const parts = url.pathname.split('/').filter(Boolean);
    if (parts.length >= 1 && parts.length <= 2 && parts[0].startsWith('@') &&
        (parts.length === 1 || ['videos', 'shorts', 'streams', 'featured'].includes(parts[1]))) {
      input = parts[0];
    } else if (parts.length === 2 && parts[0] === 'channel') {
      input = parts[1];
    } else if (parts.length === 3 && parts[0] === 'channel' &&
               ['videos', 'shorts', 'streams', 'featured'].includes(parts[2])) {
      input = parts[1];
    } else {
      throw new Error('Use a channel link with /@handle or /channel/UC...');
    }
  }

  if (/^UC[\w-]{22}$/.test(input)) return { parameter: 'id', value: input };
  if (/^@?[A-Za-z0-9_.-]{3,30}$/.test(input)) {
    return { parameter: 'forHandle', value: input.startsWith('@') ? input : `@${input}` };
  }
  throw new Error('Use a YouTube @handle or channel ID. Plain channel names are not supported.');
}

async function youtube(method, params, apiKey) {
  const url = new URL(`${API_ROOT}/${method}`);
  for (const [name, value] of Object.entries({ ...params, key: apiKey })) url.searchParams.set(name, value);
  const response = await fetch(url, { headers: { accept: 'application/json' } });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) {
    const reason = body?.error?.errors?.[0]?.reason;
    if (reason === 'quotaExceeded' || reason === 'dailyLimitExceeded') {
      throw Object.assign(new Error('YouTube API daily quota reached. Please try again tomorrow.'), { status: 429 });
    }
    if (response.status === 403) {
      throw Object.assign(new Error('YouTube API access was denied. Check the API key and API restrictions.'), { status: 502 });
    }
    throw Object.assign(new Error('YouTube could not return this channel right now.'), { status: 502 });
  }
  return body;
}

function toNumber(value) {
  return value == null || value === '' ? null : Number(value);
}

export async function onRequestGet(context) {
  const { request, env } = context;
  const input = new URL(request.url).searchParams.get('input');
  let parsed;
  try { parsed = normalizeInput(input); }
  catch (error) { return json({ error: error.message }, 400); }

  if (!env.YOUTUBE_API_KEY) {
    return json({ error: 'API key not configured. You can still explore the sample dashboard.' }, 503);
  }

  // Cache based on normalized channel input (no API key appears in the cache URL).
  const cacheUrl = new URL(request.url);
  cacheUrl.pathname = '/api/channel';
  cacheUrl.search = new URLSearchParams({ input: parsed.value }).toString();
  const cacheRequest = new Request(cacheUrl.toString(), { method: 'GET' });
  const cache = typeof caches !== 'undefined' ? caches.default : null;
  if (cache) {
    const hit = await cache.match(cacheRequest);
    if (hit) return hit;
  }

  try {
    const channelResult = await youtube('channels', {
      part: 'snippet,statistics,contentDetails,brandingSettings',
      [parsed.parameter]: parsed.value,
    }, env.YOUTUBE_API_KEY);
    const channel = channelResult.items?.[0];
    if (!channel) return json({ error: 'Channel not found. Check the handle or channel ID.' }, 404);

    const uploadsPlaylist = channel.contentDetails?.relatedPlaylists?.uploads;
    const playlistResult = uploadsPlaylist
      ? await youtube('playlistItems', { part: 'contentDetails', playlistId: uploadsPlaylist, maxResults: '30' }, env.YOUTUBE_API_KEY)
      : { items: [] };
    const ids = (playlistResult.items || []).map(item => item.contentDetails?.videoId).filter(Boolean);
    const videoResult = ids.length
      ? await youtube('videos', { part: 'snippet,statistics,contentDetails', id: ids.join(',') }, env.YOUTUBE_API_KEY)
      : { items: [] };
    const videosById = new Map((videoResult.items || []).map(video => [video.id, video]));
    const videos = ids.map(id => videosById.get(id)).filter(Boolean).map(video => ({
      id: video.id,
      title: video.snippet?.title || 'Untitled',
      description: video.snippet?.description || '',
      publishedAt: video.snippet?.publishedAt || null,
      thumbnail: video.snippet?.thumbnails?.medium?.url || video.snippet?.thumbnails?.default?.url || null,
      views: toNumber(video.statistics?.viewCount),
      likes: toNumber(video.statistics?.likeCount),
      comments: toNumber(video.statistics?.commentCount),
      duration: video.contentDetails?.duration || null,
      url: `https://www.youtube.com/watch?v=${video.id}`,
    })).sort((a, b) => new Date(b.publishedAt || 0) - new Date(a.publishedAt || 0));

    const result = json({
      source: 'youtube',
      fetchedAt: new Date().toISOString(),
      sampleLimit: 30,
      channel: {
        id: channel.id,
        title: channel.snippet?.title || 'YouTube Channel',
        handle: channel.snippet?.customUrl || '',
        description: channel.snippet?.description || '',
        avatar: channel.snippet?.thumbnails?.high?.url || channel.snippet?.thumbnails?.default?.url || null,
        banner: channel.brandingSettings?.image?.bannerExternalUrl || null,
        subscribers: channel.statistics?.hiddenSubscriberCount ? null : toNumber(channel.statistics?.subscriberCount),
        subscribersHidden: Boolean(channel.statistics?.hiddenSubscriberCount),
        views: toNumber(channel.statistics?.viewCount),
        videoCount: toNumber(channel.statistics?.videoCount),
        createdAt: channel.snippet?.publishedAt || null,
        url: `https://www.youtube.com/channel/${channel.id}`,
      },
      videos,
    });
    if (cache && typeof context.waitUntil === 'function') {
      context.waitUntil(cache.put(cacheRequest, result.clone()));
    }
    return result;
  } catch (error) {
    return json({ error: error.message || 'Unexpected server error.' }, error.status || 502);
  }
}
