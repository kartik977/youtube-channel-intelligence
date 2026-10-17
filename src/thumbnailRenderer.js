// Browser-only thumbnail artwork renderer. Nothing is uploaded to an image service.
// All three layouts support 1280x720 video/live and 1080x1920 vertical Shorts artwork.
export const THUMBNAIL_SIZES = Object.freeze({
  video: { width: 1280, height: 720, label: 'Video · 16:9' },
  live: { width: 1280, height: 720, label: 'Live · 16:9' },
  short: { width: 1080, height: 1920, label: 'Short · 9:16' },
});
export const THUMBNAIL_STYLES = Object.freeze({
  gaming: { label: 'Gaming', dark:'#090f25', mid:'#23274b', accent:'#ff4f85', secondary:'#65edff' },
  sports: { label: 'Sports', dark:'#041c19', mid:'#194635', accent:'#bbff48', secondary:'#5edbcf' },
  dramatic: { label: 'Dramatic', dark:'#180b17', mid:'#472037', accent:'#ffbb42', secondary:'#ff5d7d' },
  energetic: { label: 'Energetic', dark:'#16112d', mid:'#3a2375', accent:'#f96afa', secondary:'#5df5ff' },
  tech: { label: 'Tech', dark:'#091626', mid:'#133e53', accent:'#48d9ff', secondary:'#9e9cff' },
  minimal: { label: 'Minimal', dark:'#111722', mid:'#303d4a', accent:'#ffffff', secondary:'#9de0cb' },
});
export function cleanThumbnailText(input, max=80) {
  return String(input ?? '').replace(/[\r\n\t]+/g,' ').replace(/\s+/g,' ').trim().slice(0,max);
}
export function thumbnailDimensions(kind) {
  return THUMBNAIL_SIZES[kind] || THUMBNAIL_SIZES.video;
}
export function thumbnailPalette(style) {
  return THUMBNAIL_STYLES[style] || THUMBNAIL_STYLES.gaming;
}
function rounded(ctx, x, y, w, h, r, fill, stroke) {
  ctx.beginPath();
  ctx.roundRect(x,y,w,h,r);
  if(fill) {ctx.fillStyle=fill;ctx.fill();}
  if(stroke) {ctx.strokeStyle=stroke;ctx.lineWidth=2;ctx.stroke();}
}
function cover(ctx, image, x,y,w,h) {
  if(!image?.naturalWidth || !image?.naturalHeight) return false;
  const iw=image.naturalWidth, ih=image.naturalHeight;
  const scale=Math.max(w/iw,h/ih), sw=w/scale, sh=h/scale;
  ctx.drawImage(image,(iw-sw)/2,(ih-sh)/2,sw,sh,x,y,w,h);
  return true;
}
function linesOf(ctx, text, maxWidth, maxLines) {
  const words=cleanThumbnailText(text,150).split(' ').filter(Boolean), lines=[];
  let line='';
  for(const word of words) {
    const next=line?line+' '+word:word;
    if(ctx.measureText(next).width<=maxWidth || !line) {line=next;continue;}
    lines.push(line);line=word;
  }
  if(line)lines.push(line);
  if(lines.length>maxLines) {
    const kept=lines.slice(0,maxLines);
    let last=kept[maxLines-1];
    while(last.length>1&&ctx.measureText(last+'…').width>maxWidth)last=last.slice(0,-1);
    kept[maxLines-1]=last+'…';
    return kept;
  }
  return lines.length?lines:['YOUR NEXT VIDEO'];
}
function headline(ctx,text,x,y,maxWidth,fontSize,maxLines,lineHeight) {
  ctx.textAlign='left';ctx.textBaseline='top';
  let lines;
  while(fontSize>48) {
    ctx.font='900 '+fontSize+'px system-ui, Arial, sans-serif';
    lines=linesOf(ctx,text,maxWidth,maxLines);
    if(lines.every(l=>ctx.measureText(l).width<=maxWidth))break;
    fontSize-=5;
  }
  ctx.shadowColor='#0000009a';ctx.shadowBlur=22;ctx.shadowOffsetY=6;
  lines.forEach((line,i)=>ctx.fillText(line,x,y+i*fontSize*lineHeight));
  ctx.shadowBlur=0;ctx.shadowOffsetY=0;
  return y+lines.length*fontSize*lineHeight;
}
function radial(ctx,x,y,r,color) {
  const g=ctx.createRadialGradient(x,y,0,x,y,r);
  g.addColorStop(0,color);g.addColorStop(1,'#ffffff00');
  ctx.fillStyle=g;ctx.fillRect(x-r,y-r,r*2,r*2);
}
function shapes(ctx,W,H,palette,layout) {
  radial(ctx,W*.8,H*.27,W*.8,palette.accent+'77');
  radial(ctx,W*.24,H*.86,W*.65,palette.secondary+'55');
  ctx.save();ctx.translate(W*.83,H*.4);ctx.rotate(-.24);
  ctx.strokeStyle=palette.secondary+'44';ctx.lineWidth=5;
  for(let i=0;i<6;i++)ctx.strokeRect(-W*.35+i*28,-H*.32+i*28,W*.65,H*.65);
  ctx.restore();
  ctx.save();ctx.translate(W*.52,H*.84);ctx.rotate(-.24);
  ctx.fillStyle=palette.accent+'23';ctx.fillRect(-W,-25,2*W,80);
  ctx.restore();
}
function drawLogo(ctx, logo, x, y, size) {
  if(!logo?.naturalWidth)return;
  ctx.save();ctx.beginPath();ctx.roundRect(x,y,size,size,18);ctx.clip();
  cover(ctx,logo,x,y,size,size);ctx.restore();
}
export function renderThumbnail(canvas, options={}) {
  if(!canvas?.getContext) return;
  const {width,height}=thumbnailDimensions(options.kind);
  if(canvas.width!==width)canvas.width=width;
  if(canvas.height!==height)canvas.height=height;
  const ctx=canvas.getContext('2d');
  if(!ctx) return;
  const vertical=options.kind==='short', H=vertical?1777.78:562.5, W=1000;
  ctx.setTransform(width/1000,0,0,height/H,0,0);
  ctx.clearRect(0,0,W,H);
  const p=thumbnailPalette(options.style), layout=Math.max(0,Math.min(2,Math.trunc(options.layout||0)));
  const gradient=ctx.createLinearGradient(0,0,W,H);
  gradient.addColorStop(0,p.dark);gradient.addColorStop(.57,p.mid);gradient.addColorStop(1,p.dark);
  ctx.fillStyle=gradient;ctx.fillRect(0,0,W,H);
  shapes(ctx,W,H,p,layout);

  const image=options.subjectImage;
  if(image?.naturalWidth) {
    ctx.save();
    if(layout===0) {
      if(vertical) {cover(ctx,image,0,0,W,H*.67);}
      else {cover(ctx,image,430,0,570,H);}
    } else if(layout===1) {
      if(vertical){cover(ctx,image,0,0,W,H*.76);}
      else {cover(ctx,image,0,0,590,H);}
    } else {cover(ctx,image,0,0,W,H);}
    ctx.restore();
    const tint=ctx.createLinearGradient(vertical?0:layout===1?0:260,vertical?H*.3:0,vertical?0:W,vertical?H:H);
    if(vertical) {
      tint.addColorStop(0,'#00000000');tint.addColorStop(.4,p.dark+'aa');tint.addColorStop(1,p.dark);
    } else if(layout===1) {
      tint.addColorStop(0,p.dark+'10');tint.addColorStop(.55,p.dark+'99');tint.addColorStop(1,p.dark);
    } else {
      tint.addColorStop(0,p.dark);tint.addColorStop(1,p.dark+'11');
    }
    ctx.fillStyle=tint;ctx.fillRect(0,0,W,H);
  }

  const pad=vertical?70:58;
  if(layout===1) {
    ctx.fillStyle=p.accent;ctx.fillRect(0,0,vertical?18:13,H);
  }
  if(layout===2) {
    ctx.strokeStyle=p.accent+'ee';ctx.lineWidth=5;ctx.strokeRect(30,30,W-60,H-60);
  }

  const badge=options.kind==='live'?'● LIVE NOW':options.kind==='short'?'SHORTS':'NEW VIDEO';
  ctx.font='800 '+(vertical?42:25)+'px system-ui, Arial, sans-serif';
  const badgeW=Math.max(184,ctx.measureText(badge).width+48);
  rounded(ctx,pad,vertical?105:55,badgeW,vertical?79:53,vertical?17:12,options.kind==='live'?'#d6283f':p.accent);
  ctx.textBaseline='middle';ctx.fillStyle=options.kind==='live'?'#ffffff':p.dark;
  ctx.fillText(badge,pad+24,(vertical?105:55)+(vertical?39:26));
  const channel=cleanThumbnailText(options.channel,40).toUpperCase() || 'CHANNELSCOPE';
  ctx.fillStyle='#ffffffc6';ctx.font='700 '+(vertical?32:18)+'px system-ui,Arial,sans-serif';
  const channelY=vertical?H-170:H-70;
  ctx.fillText(channel,pad,channelY);
  drawLogo(ctx,options.logoImage,W-pad-(vertical?96:54),vertical?H-223:H-100,vertical?88:59);

  const chosen=cleanThumbnailText(options.headline || options.topic,120).toUpperCase() || 'YOUR NEXT VIDEO';
  const secondary=cleanThumbnailText(options.subline,70);
  let y,maxW,fs,maxLines,lineHeight;
  if(vertical) {
    y=layout===2?H*.82-330:H*.71;
    maxW=W-pad*2;fs=110;maxLines=4;lineHeight=1.12;
  } else if(layout===0) {
    y=190;maxW=530;fs=69;maxLines=3;lineHeight=1.12;
  } else if(layout===1) {
    y=175;maxW=750;fs=75;maxLines=3;lineHeight=1.10;
  } else {
    y=183;maxW=850;fs=79;maxLines=3;lineHeight=1.10;
  }
  ctx.fillStyle='#ffffff';
  const bottom=headline(ctx,chosen,pad,y,maxW,fs,maxLines,lineHeight);
  ctx.fillStyle=p.accent;
  const decoY=Math.min(bottom+19,vertical?H-360:H-119);
  ctx.fillRect(pad,decoY,vertical?220:136,vertical?13:8);
  if(secondary) {
    const secY=decoY+(vertical?48:28);
    ctx.fillStyle='#f1f3ff';ctx.font='700 '+(vertical?39:25)+'px system-ui,Arial,sans-serif';
    const detail=linesOf(ctx,secondary,vertical?850:730,vertical?2:1);
    for(let i=0;i<detail.length;i++)ctx.fillText(detail[i],pad,secY+i*(vertical?53:34));
  }
  return canvas;
}
