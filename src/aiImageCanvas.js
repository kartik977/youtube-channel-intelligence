import { thumbnailDimensions } from './thumbnailRenderer.js';
const clean = v=>String(v||'').replace(/\s+/g,' ').trim();
const fit=(ctx,words,maxWidth,maxLines)=>{
  const lines=[];let line='';
  for(const word of clean(words).split(' ')){
    const tryLine=line?line+' '+word:word;
    if(ctx.measureText(tryLine).width<=maxWidth||!line)line=tryLine;
    else {lines.push(line);line=word;}
  }
  if(line)lines.push(line);
  if(lines.length>maxLines){
    const last=lines.slice(0,maxLines);
    let x=last[maxLines-1];
    while(x.length>1 && ctx.measureText(x+'…').width>maxWidth)x=x.slice(0,-1);
    last[maxLines-1]=x+'…';return last;
  }
  return lines;
};
export function paintGeneratedThumbnail(canvas,image,{kind='video',headline='',subline='',showText=true}={}){
  const {width,height}=thumbnailDimensions(kind);
  canvas.width=width;canvas.height=height;
  const ctx=canvas.getContext('2d');
  if(!ctx||!image)return;
  const iw=image.naturalWidth||image.width,ih=image.naturalHeight||image.height;
  if(!iw||!ih)return;
  const ratio=Math.max(width/iw,height/ih);
  const sw=width/ratio,sh=height/ratio;
  ctx.drawImage(image,(iw-sw)/2,(ih-sh)/2,sw,sh,0,0,width,height);
  if(!showText)return;
  const vertical=kind==='short';
  // Editable text is composited *after* image generation to remain crisp.
  const gradient=ctx.createLinearGradient(0,height*.26,0,height);
  gradient.addColorStop(0,'#080b1600');gradient.addColorStop(.62,'#070a14cc');gradient.addColorStop(1,'#050712ed');
  ctx.fillStyle=gradient;ctx.fillRect(0,0,width,height);
  const pad=vertical?72:72;
  if(kind==='live'){
    ctx.fillStyle='#eb1748';ctx.fillRect(pad,vertical?130:60,vertical?295:226,vertical?78:65);
    ctx.textBaseline='middle';ctx.font='900 '+(vertical?42:36)+'px Arial, sans-serif';
    ctx.fillStyle='#ffffff';ctx.fillText('● LIVE NOW',pad+24,vertical?169:92);
  }
  const size=vertical?103:86;
  ctx.font='900 '+size+'px Arial, sans-serif';
  ctx.fillStyle='#ffffff';ctx.textAlign='left';ctx.textBaseline='top';
  ctx.shadowColor='#000000c7';ctx.shadowBlur=14;ctx.shadowOffsetY=5;
  const lines=fit(ctx,clean(headline).toUpperCase()||'NEW VIDEO',width-pad*2,vertical?4:3);
  const lineH=size*1.12;
  const y=Math.max(vertical?height*.64:height*.55,height-pad-135-(lines.length*lineH));
  for(let i=0;i<lines.length;i++)ctx.fillText(lines[i],pad,y+i*lineH);
  ctx.shadowBlur=0;ctx.shadowOffsetY=0;
  if(clean(subline)){
    ctx.font='800 '+(vertical?39:30)+'px Arial,sans-serif';ctx.fillStyle='#ffc4d4';
    const shortLine=fit(ctx,subline,width-pad*2,1);
    ctx.fillText(shortLine[0]||'',pad,Math.min(height-pad-37,y+lines.length*lineH+22));
  }
}
