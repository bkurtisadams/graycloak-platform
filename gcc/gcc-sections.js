// gcc-sections.js — shared session/issue section (comic panel) layout model + renderer.
// Used by campaign-detail.html (editor live preview, journal export) and recap.html.
window.GCCSections=(()=>{
  const POS=['above','below','left','right','inset-left','inset-right'];
  const WIDTHS=['quarter','third','half','full'];
  const WIDTH_LABELS={quarter:'¼',third:'⅓',half:'½',full:'█'};
  const WIDTH_PCT={quarter:25,third:33.333,half:50,full:100};
  const ASPECTS=['none','16/10','4/3','1/1','2/3'];
  const ASPECT_LABELS={none:'Whole','16/10':'16:10','4/3':'4:3','1/1':'1:1','2/3':'2:3'};
  const PRESETS=['splash','strip','grid','inset','sidebar'];
  const PRESET_LABELS={splash:'Splash',strip:'Strip',grid:'Grid',inset:'Inset',sidebar:'Sidebar'};
  const POS_LABELS={above:'Above text',below:'Below text',left:'Left of text',right:'Right of text','inset-left':'Inset left','inset-right':'Inset right'};

  const esc=s=>String(s==null?'':s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

  function pos(sec){return POS.includes(sec&&sec.imagePos)?sec.imagePos:'below'}
  function imgWidth(img){return WIDTHS.includes(img&&img.width)?img.width:'third'}
  function fit(sec){return aspect(sec)==='none'?'contain':'cover'}
  function aspect(sec){
    if(sec&&ASPECTS.includes(sec.aspect))return sec.aspect;
    return sec&&sec.fit==='cover'?'16/10':'none';
  }
  function focus(img){
    const f=img&&img.focus;
    const x=f&&isFinite(f.x)?Math.min(1,Math.max(0,+f.x)):0.5;
    const y=f&&isFinite(f.y)?Math.min(1,Math.max(0,+f.y)):0.5;
    return{x,y};
  }
  // Cover image (session.image): aspect + focus live on the session itself.
  function coverAspect(s){return s&&ASPECTS.includes(s.imageAspect)?s.imageAspect:null}
  function coverStyle(s,defaultAspect){
    const asp=coverAspect(s)||defaultAspect||'none';
    if(asp==='none')return'aspect-ratio:auto;object-fit:contain';
    const f=focus({focus:s&&s.imageFocus});
    return`aspect-ratio:${asp};object-fit:cover;object-position:${Math.round(f.x*100)}% ${Math.round(f.y*100)}%`;
  }
  function side(sec){const p=pos(sec);return p.endsWith('left')?'left':p.endsWith('right')?'right':''}
  function railPct(sec){
    const imgs=(sec&&sec.images)||[];
    const w=imgWidth(imgs[0]);
    return w==='full'?50:WIDTH_PCT[w];
  }

  // Collapses the legacy per-image pos/size and section layout/columns models
  // into imagePos + per-image width, then normalises aspect/fit.
  function migrate(sec){
    if(!sec)return false;
    let changed=false;
    if(!sec.imagePos){
      const imgs=sec.images||[];
      const L=sec.layout||'legacy';
      let p;
      if(L==='legacy'){const q=(imgs[0]&&imgs[0].pos)||'right';p=(q==='left'||q==='right')?q:'above'}
      else if(L==='images-first'||L==='gallery')p='above';
      else if(L==='text-left')p='right';
      else if(L==='images-left')p='left';
      else p='below';
      const colW={'1':'full','2':'half','3':'third'}[String(sec.columns)];
      const sizeW={sm:'quarter',md:'third',lg:'half',full:'full'};
      imgs.forEach(img=>{if(!img.width)img.width=L==='legacy'?(sizeW[img.size]||'third'):(colW||'third')});
      sec.imagePos=p;
      changed=true;
    }
    if(!ASPECTS.includes(sec.aspect)){sec.aspect=sec.fit==='cover'?'16/10':'none';changed=true}
    const f=sec.aspect==='none'?'contain':'cover';
    if(sec.fit!==f){sec.fit=f;changed=true}
    return changed;
  }

  function detectPreset(sec){
    const imgs=(sec&&sec.images)||[];const n=imgs.length;const p=pos(sec);
    if(!n)return'';
    if(p.startsWith('inset'))return'inset';
    if(p==='left'||p==='right')return'sidebar';
    const ws=imgs.map(imgWidth);const same=ws.every(w=>w===ws[0]);
    if(n===1&&ws[0]==='full')return'splash';
    if(same&&ws[0]==='full')return'splash';
    if(same&&ws[0]==='half'&&n>=3)return'grid';
    if(same&&({2:'half',3:'third',4:'quarter'}[n]===ws[0]))return'strip';
    return'';
  }

  function applyPreset(sec,name){
    if(!sec)return;
    const imgs=sec.images||[];const n=imgs.length;
    const cur=pos(sec);
    if(name==='splash'){sec.imagePos='below';imgs.forEach(i=>i.width='full')}
    else if(name==='strip'){sec.imagePos=(cur==='above')?'above':'below';const w=n<=1?'full':n===2?'half':n===3?'third':'quarter';imgs.forEach(i=>i.width=w)}
    else if(name==='grid'){sec.imagePos=(cur==='above')?'above':'below';imgs.forEach(i=>i.width='half')}
    else if(name==='inset'){sec.imagePos=cur.endsWith('left')?'inset-left':'inset-right';imgs.forEach(i=>i.width='third')}
    else if(name==='sidebar'){sec.imagePos=cur.endsWith('left')?'left':'right';imgs.forEach(i=>i.width='third')}
  }
  function flipSide(sec){
    const p=pos(sec);
    if(p==='left')sec.imagePos='right';else if(p==='right')sec.imagePos='left';
    else if(p==='inset-left')sec.imagePos='inset-right';else if(p==='inset-right')sec.imagePos='inset-left';
  }

  // opts: {resolve(src)->url|'', comic:bool, escape(fn)}
  function render(sec,opts){
    opts=opts||{};
    const E=opts.escape||esc;
    const resolve=opts.resolve||(s=>s);
    migrate(sec);
    const imgs=sec.images||[];
    const p=pos(sec),asp=aspect(sec),ft=fit(sec);
    let ih='';
    imgs.forEach(img=>{
      const src=resolve(img.src);if(!src)return;
      const f=focus(img);
      const style=asp==='none'?'':`aspect-ratio:${asp};object-position:${Math.round(f.x*100)}% ${Math.round(f.y*100)}%`;
      ih+=`<figure class="gsec-img-wrap w-${imgWidth(img)}"><img class="gsec-img fit-${ft}" src="${src}" alt="" loading="lazy"${style?` style="${style}"`:''}>`;
      if(img.caption)ih+=`<figcaption class="gsec-cap">${E(img.caption)}</figcaption>`;
      ih+=`</figure>`;
    });
    const imagesHtml=ih?`<div class="gsec-images${opts.comic?' comic':''}">${ih}</div>`:'';
    const textHtml=sec.text?`<div class="gsec-text">${E(sec.text)}</div>`:'';
    let style='';
    if(imagesHtml){
      const r=railPct(sec);
      if(p==='left')style=`grid-template-columns:minmax(0,${r}%) minmax(0,1fr)`;
      else if(p==='right')style=`grid-template-columns:minmax(0,1fr) minmax(0,${r}%)`;
      else if(p.startsWith('inset'))style=`--gsec-inset:${r}%`;
    }
    return`<div class="gsec-content ip-${imagesHtml?p:'below'}"${style?` style="${style}"`:''}>${imagesHtml}${textHtml}</div>`;
  }

  // Sizing is driven by --gsec-* variables so the card list (defaults) and the
  // recap page can share one renderer; override them on any ancestor.
  const CSS=`
.gsec-content{--gsec-gap:8px;--gsec-side-gap:10px;--gsec-img-gap:6px;--gsec-text-size:12px;--gsec-text-lh:1.5;--gsec-text-color:var(--tx2,#ccc);--gsec-cap-size:10px;--gsec-inset-margin:12px;--gsec-radius:3px;--gsec-comic-gap:4px;
  display:flex;flex-direction:column;gap:var(--gsec-gap)}
.gsec-content.ip-above .gsec-images{order:1}.gsec-content.ip-above .gsec-text{order:2}
.gsec-content.ip-below .gsec-text{order:1}.gsec-content.ip-below .gsec-images{order:2}
.gsec-content.ip-left,.gsec-content.ip-right{display:grid;gap:var(--gsec-side-gap);align-items:start}
.gsec-content.ip-left .gsec-images{grid-column:1;grid-row:1}.gsec-content.ip-left .gsec-text{grid-column:2;grid-row:1}
.gsec-content.ip-right .gsec-text{grid-column:1;grid-row:1}.gsec-content.ip-right .gsec-images{grid-column:2;grid-row:1}
.gsec-content.ip-left .gsec-img-wrap,.gsec-content.ip-right .gsec-img-wrap{flex:0 0 100%!important}
.gsec-content.ip-inset-left,.gsec-content.ip-inset-right{display:block}
.gsec-content.ip-inset-left::after,.gsec-content.ip-inset-right::after{content:'';display:table;clear:both}
.gsec-content.ip-inset-left .gsec-images,.gsec-content.ip-inset-right .gsec-images{width:var(--gsec-inset,33.333%);max-width:60%;flex-direction:column;flex-wrap:nowrap}
.gsec-content.ip-inset-left .gsec-images{float:left;margin:0 var(--gsec-inset-margin) calc(var(--gsec-inset-margin)/2) 0}
.gsec-content.ip-inset-right .gsec-images{float:right;margin:0 0 calc(var(--gsec-inset-margin)/2) var(--gsec-inset-margin)}
.gsec-content.ip-inset-left .gsec-img-wrap,.gsec-content.ip-inset-right .gsec-img-wrap{flex:0 0 auto!important;width:100%}
.gsec-images{display:flex;flex-wrap:wrap;gap:var(--gsec-img-gap);align-content:start;margin:0}
.gsec-img-wrap{min-width:0;margin:0;text-align:center}
.gsec-img-wrap.w-full{flex:0 1 100%}
.gsec-img-wrap.w-half{flex:0 1 calc(50% - var(--gsec-img-gap)/2)}
.gsec-img-wrap.w-third{flex:0 1 calc(33.333% - var(--gsec-img-gap)*2/3)}
.gsec-img-wrap.w-quarter{flex:0 1 calc(25% - var(--gsec-img-gap)*3/4)}
.gsec-img{width:100%;height:auto;border-radius:var(--gsec-radius);border:1px solid var(--brd,#333);display:block;background:var(--bg2,#111)}
.gsec-img.fit-cover{object-fit:cover}
.gsec-img.fit-contain{object-fit:contain}
.gsec-cap{display:block;font-size:var(--gsec-cap-size);color:var(--tx3,#888);font-style:italic;margin-top:calc(var(--gsec-cap-size)/4);text-align:center;max-width:100%}
.gsec-text{font-size:var(--gsec-text-size);color:var(--gsec-text-color);line-height:var(--gsec-text-lh);white-space:pre-line}
.gsec-images.comic{background:#0d0d0d;padding:var(--gsec-comic-gap);gap:var(--gsec-comic-gap);border-radius:0;align-items:stretch}
.gsec-images.comic .gsec-img-wrap.w-half{flex-basis:calc(50% - var(--gsec-comic-gap)/2)}
.gsec-images.comic .gsec-img-wrap.w-third{flex-basis:calc(33.333% - var(--gsec-comic-gap)*2/3)}
.gsec-images.comic .gsec-img-wrap.w-quarter{flex-basis:calc(25% - var(--gsec-comic-gap)*3/4)}
.gsec-images.comic .gsec-img{border:2px solid #0d0d0d;border-radius:0;background:#fff}
.gsec-images.comic .gsec-cap{margin:0;padding:2px 6px;background:#f3e28a;color:#1a1a1a;font-style:normal;font-family:var(--fsc,inherit);font-size:calc(var(--gsec-cap-size) - 1px);letter-spacing:.4px;text-align:left;text-transform:uppercase}
.gsec-images.comic .gsec-img-wrap{display:flex;flex-direction:column}
@media(max-width:600px){
  .gsec-content.ip-left,.gsec-content.ip-right{display:flex;flex-direction:column;grid-template-columns:none!important}
  .gsec-content.ip-left .gsec-images,.gsec-content.ip-right .gsec-images{grid-row:auto}
  .gsec-content.ip-left .gsec-img-wrap,.gsec-content.ip-right .gsec-img-wrap{flex:0 1 calc(50% - var(--gsec-img-gap)/2)!important}
  .gsec-content.ip-left .gsec-img-wrap:only-child,.gsec-content.ip-right .gsec-img-wrap:only-child{flex-basis:100%!important}
  .gsec-img-wrap.w-third,.gsec-img-wrap.w-quarter{flex:0 1 calc(50% - var(--gsec-img-gap)/2)}
  .gsec-content.ip-inset-left .gsec-images,.gsec-content.ip-inset-right .gsec-images{max-width:50%}
}`;
  let injected=false;
  function inject(){
    if(injected||typeof document==='undefined')return;
    const st=document.createElement('style');st.id='gcc-sections-css';st.textContent=CSS;
    document.head.appendChild(st);injected=true;
  }

  return{POS,WIDTHS,WIDTH_LABELS,WIDTH_PCT,ASPECTS,ASPECT_LABELS,PRESETS,PRESET_LABELS,POS_LABELS,
    pos,imgWidth,fit,aspect,focus,coverAspect,coverStyle,side,railPct,migrate,detectPreset,applyPreset,flipSide,render,inject,css:CSS};
})();
