// Public YouTube video metadata lookup. Never fetch a pasted URL directly;
// parse an 11-character video ID and call Google's trusted videos.list endpoint.
const API='https://www.googleapis.com/youtube/v3/videos';
const CACHE_SECONDS=900;
const ID=/^[A-Za-z0-9_-]{11}$/;
const VALID_HOSTS=new Set(['youtube.com','www.youtube.com','m.youtube.com','music.youtube.com','youtu.be','www.youtu.be','youtube-nocookie.com','www.youtube-nocookie.com']);

function result(data,status=200){
  return new Response(JSON.stringify(data),{status,headers:{
    'content-type':'application/json; charset=utf-8',
    'cache-control':status===200?'public, max-age=60, s-maxage=900':'no-store',
    'x-content-type-options':'nosniff'
  }});
}

export function parseYouTubeVideo(input){
  let value=String(input??'').trim();
  if(!value||value.length>600)throw new Error('Paste a valid YouTube video, Shorts, or livestream URL.');
  if(ID.test(value))return {id:value,shortUrl:false};
  if(/^(?:www\.|m\.|music\.)?youtube\.com\//i.test(value)||/^(?:www\.)?youtu\.be\//i.test(value)||
     /^(?:www\.)?youtube-nocookie\.com\//i.test(value))value='https://'+value;
  let parsed;
  try{parsed=new URL(value);}
  catch{throw new Error('Paste a YouTube link such as youtube.com/watch?v=…, youtu.be/…, /shorts/…, or /live/….');}
  const host=parsed.hostname.toLowerCase();
  if(!['https:','http:'].includes(parsed.protocol)||!VALID_HOSTS.has(host)||parsed.username||parsed.password||parsed.port){
    throw new Error('Only public YouTube video URLs are supported.');
  }
  const parts=parsed.pathname.split('/').filter(Boolean);
  let id=null,shortUrl=false;
  if(host==='youtu.be'||host==='www.youtu.be'){
    if(parts.length===1)id=parts[0];
  }else if(parts.length===1 && parts[0]==='watch'){
    id=parsed.searchParams.get('v');
  }else if(parts.length===2 && ['shorts','live','embed','v'].includes(parts[0])){
    id=parts[1];shortUrl=parts[0]==='shorts';
  }
  if(!id||!ID.test(id)){
    throw new Error('Could not find a video ID. Use a YouTube watch, Shorts, livestream, or youtu.be link.');
  }
  return {id,shortUrl};
}
function clean(text,max){
  return typeof text==='string'?text.replace(/[\u0000-\u001f\u007f]+/g,' ').replace(/\s+/g,' ').trim().slice(0,max):'';
}
export function summarizeVideo(item,id,shortUrl=false) {
  const snippet=item.snippet||{},live=item.liveStreamingDetails||{};
  const liveState=snippet.liveBroadcastContent;
  const isStream=Boolean(item.liveStreamingDetails)||['live','upcoming'].includes(liveState);
  const kind=isStream?'live':shortUrl?'short':'video';
  const liveStatus=liveState==='live'?'live':liveState==='upcoming'?'upcoming':
    live.actualEndTime?'ended':isStream?'stream (public metadata)':'not-live';
  const originalDescription=snippet.description||'';
  return {
    source:'youtube',
    id,
    url:'https://www.youtube.com/watch?v='+id,
    kind,
    // YouTube videos.list does not explicitly certify a video's Shorts classification.
    shortUrl,
    title:clean(snippet.title,120),
    description:clean(originalDescription,650),
    descriptionTruncated:originalDescription.length>650,
    channelTitle:clean(snippet.channelTitle,100),
    publishedAt:snippet.publishedAt||null,
    liveStatus,
    thumbnail:'https://i.ytimg.com/vi/'+id+'/mqdefault.jpg',
    note:shortUrl&&!isStream?'Shorts format inferred from the URL.':!isStream?
      'YouTube does not provide a reliable Shorts flag in this API response. You can change the format manually.':
      'Livestream status is based on YouTube public metadata; no footage or transcript was analyzed.'
  };
}
export async function onRequestGet({request,env={},waitUntil}) {
  let parsed;
  try{parsed=parseYouTubeVideo(new URL(request.url).searchParams.get('input'));}
  catch(e){return result({error:e.message},400);}
  if(!env.YOUTUBE_API_KEY)return result({error:'YouTube API key is not configured on this Worker.'},503);
  const cache=typeof caches!=='undefined'?caches.default:null;
  const cacheUrl=new URL(request.url);
  cacheUrl.pathname='/api/video';
  cacheUrl.search=new URLSearchParams({id:parsed.id,short:parsed.shortUrl?'1':'0'}).toString();
  const cacheKey=new Request(cacheUrl.toString(),{method:'GET'});
  if(cache){
    const match=await cache.match(cacheKey);
    if(match)return match;
  }
  const url=new URL(API);
  url.searchParams.set('part','snippet,contentDetails,liveStreamingDetails');
  url.searchParams.set('id',parsed.id);
  url.searchParams.set('key',env.YOUTUBE_API_KEY);
  try{
    const response=await fetch(url.toString(),{headers:{accept:'application/json'}});
    const data=await response.json().catch(()=>({}));
    if(!response.ok){
      const reason=data?.error?.errors?.[0]?.reason;
      if(['quotaExceeded','dailyLimitExceeded'].includes(reason))return result({error:'YouTube API quota has been reached. Please try later.'},429);
      if(response.status===403||response.status===401)return result({error:'YouTube API access denied. Check the Worker API key and Google project restrictions.'},502);
      return result({error:'Could not retrieve YouTube video metadata right now.'},502);
    }
    const video=data.items?.[0];
    if(!video)return result({error:'Video not found or unavailable publicly. Try an accessible public video URL.'},404);
    const output=result(summarizeVideo(video,parsed.id,parsed.shortUrl));
    if(cache&&typeof waitUntil==='function')waitUntil(cache.put(cacheKey,output.clone()));
    return output;
  }catch(e){
    console.warn('ChannelScope video metadata lookup failed',{type:e?.name==='AbortError'?'timeout':'network'});
    return result({error:'Could not contact YouTube. Try again shortly.'},502);
  }
}
