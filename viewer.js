(() => {
 const dialog=document.createElement('dialog');dialog.className='media-viewer';dialog.setAttribute('aria-label','放大查看');
 dialog.innerHTML='<button class="viewer-close" aria-label="关闭放大查看">关闭 ×</button><div class="viewer-content"></div>';
 document.body.append(dialog);const content=dialog.querySelector('.viewer-content');let opener;
 function close(){dialog.close();}
 dialog.querySelector('button').addEventListener('click',close);
 dialog.addEventListener('click',e=>{if(e.target===dialog||e.target===content)close();});
 dialog.addEventListener('close',()=>{content.querySelector('video')?.pause();content.replaceChildren();document.documentElement.style.overflow='';opener?.focus({preventScroll:true});document.dispatchEvent(new Event('viewerchange'));});
 document.addEventListener('click',e=>{const a=e.target.closest('#inner-page a');if(!a||a.hasAttribute('download')||!a.querySelector('img,video'))return;const url=new URL(a.href,location.href);if(!/\.(png|jpg|jpeg|webp|gif|mp4)$/i.test(url.pathname))return;e.preventDefault();opener=a;
 const isVideo=/\.mp4$/i.test(url.pathname),media=document.createElement(isVideo?'video':'img');
 if(isVideo){media.controls=true;media.loop=true;media.muted=true;media.playsInline=true;media.preload='auto';const inline=a.querySelector('video');if(inline){media.playbackRate=inline.playbackRate;media.addEventListener('loadedmetadata',()=>{media.currentTime=inline.currentTime;},{once:true});}}
 else{media.alt=a.querySelector('img')?.alt||'作品原图';media.addEventListener('click',()=>media.classList.toggle('actual-size'));}
 media.src=url.href;content.replaceChildren(media);document.querySelectorAll('video').forEach(v=>{if(v!==media)v.pause();});document.documentElement.style.overflow='hidden';dialog.showModal();document.dispatchEvent(new Event('viewerchange'));if(isVideo)media.play().catch(()=>{});
 });
 addEventListener('hashchange',()=>{if(dialog.open)close();});
})();
