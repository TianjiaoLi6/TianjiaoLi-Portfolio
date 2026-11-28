// Warm only the nearest upcoming clip, preserving the original media quality.
(()=>{
 let videos=[],pending=false;
 function source(v){return v.dataset.demo||v.dataset.caseSrc||(v.closest('.bsa-player')?.dataset.base? v.closest('.bsa-player').dataset.base+'-480.mp4':'');}
 function ahead(v){for(let i=0;i<v.buffered.length;i++)if(v.buffered.start(i)<=v.currentTime+.1&&v.buffered.end(i)>v.currentTime)return v.buffered.end(i)-v.currentTime;return 0;}
 function update(){pending=false;if(document.hidden||document.querySelector('#home-page')?.hidden===false)return;
 const busy=!!document.querySelector('.bili-player[data-active="true"],.media-viewer[open]')||videos.some(v=>!v.paused);
 const candidates=busy?[]:videos.filter(v=>{const r=v.getBoundingClientRect();return v.isConnected&&r.bottom>0&&r.top<innerHeight+900&&ahead(v)<4;}).sort((a,b)=>Math.abs(a.getBoundingClientRect().top-innerHeight*.5)-Math.abs(b.getBoundingClientRect().top-innerHeight*.5));
 const next=candidates[0];
 for(const v of videos){if(!v.paused)continue;if(v!==next){if(v.hasAttribute('src'))v.preload='metadata';continue;}const url=source(v);if(!url)continue;v.preload='auto';if(!v.hasAttribute('src')){v.src=url;v.load();}}
 }
 function schedule(){if(!pending){pending=true;requestAnimationFrame(update);}}
 function setup(){videos=[...document.querySelectorAll('#inner-page .detail-demo,#inner-page .unmoored-video,#inner-page .bsa-player video')];for(const v of videos){v.addEventListener('progress',()=>{if(v.paused&&ahead(v)>=4)v.preload='metadata';});v.addEventListener('pause',schedule);v.addEventListener('play',schedule);}schedule();}
 addEventListener('scroll',schedule,{passive:true});addEventListener('resize',schedule);addEventListener('hashchange',()=>setTimeout(setup,0));document.addEventListener('DOMContentLoaded',setup);document.addEventListener('visibilitychange',schedule);document.addEventListener('fullvideochange',schedule);document.addEventListener('viewerchange',schedule);
})();
