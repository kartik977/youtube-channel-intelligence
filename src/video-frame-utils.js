// These timestamps are representative stills, not a full-video/audio analysis.
export function sampleTimestamps(duration){
 if(!Number.isFinite(duration)||duration<=0||duration>7200)throw Error('Choose a video between 1 second and 2 hours.');
 const fractions=duration<3?[.2,.5,.8]:[.13,.5,.87];
 return fractions.map(f=>Math.max(.05,Math.min(duration-.03,duration*f)));
}
export function videoOrientation(width,height){
 return width===height?'Square':height>width?'Vertical':'Horizontal';
}
export function formatVideoDuration(seconds){
 const total=Math.floor(Math.max(0,Number(seconds)||0));
 return String(Math.floor(total/60)).padStart(2,'0')+':'+String(total%60).padStart(2,'0');
}
const waitVideo=(video,name,ms=14000)=>new Promise((resolve,reject)=>{
 const timeout=setTimeout(()=>done(Error('Your browser could not decode this video in time. Try MP4 (H.264) or WebM.')),ms);
 const success=()=>done(null),failure=()=>done(Error('Your browser could not read this video. Try MP4 (H.264) or WebM.'));
 function done(error){
   clearTimeout(timeout);
   video.removeEventListener(name,success);video.removeEventListener('error',failure);
   if(error)reject(error);else resolve();
 }
 video.addEventListener(name,success,{once:true});
 video.addEventListener('error',failure,{once:true});
});
function compressedFrame(video,canvas,context,maxSize,quality){
 const scale=Math.min(1,maxSize/Math.max(video.videoWidth,video.videoHeight));
 canvas.width=Math.max(1,Math.round(video.videoWidth*scale));
 canvas.height=Math.max(1,Math.round(video.videoHeight*scale));
 context.drawImage(video,0,0,canvas.width,canvas.height);
 return canvas.toDataURL('image/jpeg',quality);
}
export async function captureVideoFrames(objectUrl){
 if(!objectUrl)throw Error('Choose a video first.');
 const video=document.createElement('video');
 video.muted=true;video.preload='auto';video.playsInline=true;video.crossOrigin='anonymous';
 try{
   const loading=waitVideo(video,'loadedmetadata');
   video.src=objectUrl;
   video.load();
   await loading;
   const {videoWidth:width,videoHeight:height,duration}=video;
   if(!width||!height||!Number.isFinite(duration)||duration<=0||duration>7200)
     throw Error('Could not read video dimensions or duration. Try a shorter MP4 video.');
   const canvas=document.createElement('canvas'),context=canvas.getContext('2d');
   if(!context)throw Error('Your browser does not support video frame extraction.');
   const frames=[];
   for(const timestamp of sampleTimestamps(duration)){
     const seek=waitVideo(video,'seeked');
     video.currentTime=timestamp;
     await seek;
     let encoded=compressedFrame(video,canvas,context,640,.64);
     if(encoded.length>200000)encoded=compressedFrame(video,canvas,context,440,.45);
     if(encoded.length>200000)throw Error('These frames are too detailed to process. Try a lower-resolution video.');
     frames.push(encoded);
   }
   return {frames,width,height,duration};
 }finally{
   video.pause();video.removeAttribute('src');video.load();
 }
}
