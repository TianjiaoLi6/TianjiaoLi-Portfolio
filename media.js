(() => {
  const previews = new Map([...document.querySelectorAll('.project-preview')].map(video => [video, {visible:false}]));
  const players = new Map(), demos = new Map();
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const onHome = () => !document.querySelector('#home-page').hidden;
  let demoObserver;
  const release = video => {
    video.pause();
    players.get(video)?.destroy();
    players.delete(video);
    video.removeAttribute('src');
    video.load();
  };
  function playPreview(video) {
    const wanted = onHome() && previews.get(video).visible && !document.hidden && !document.querySelector('.media-viewer[open]') && !reduced.matches;
    if (!wanted) { video.pause(); return; }
    if (!video.getAttribute('src')) {
      video.muted = true;
      video.loop = true;
      video.src = video.dataset.previewBase + Math.floor(Math.random()*4) + '.mp4';
    }
    video.play().catch(()=>{});
  }
  const previewObserver = new IntersectionObserver(entries => {
    for (const entry of entries) {
      previews.get(entry.target).visible = entry.isIntersecting;
      playPreview(entry.target);
    }
  }, {rootMargin:'120px 0px'});
  for (const [video] of previews) previewObserver.observe(video);

  function updateDemos() {
    const candidates = onHome() || (!!document.querySelector('.detail-video') && !document.querySelector('.detail-video').paused) || document.hidden || document.querySelector('.media-viewer[open]') || reduced.matches ? [] : [...demos]
      .filter(([video,visible]) => visible && video.isConnected)
      .sort(([a],[b]) => Math.abs(a.getBoundingClientRect().top+a.clientHeight/2-innerHeight/2)-Math.abs(b.getBoundingClientRect().top+b.clientHeight/2-innerHeight/2))
      .slice(0,1).map(([video])=>video);
    // Release old requests before starting at most two nearby examples.
    for(const [video] of demos) if(!candidates.includes(video)) video.pause();
    for(const video of candidates){
      if (!video.hasAttribute('src')) { video.muted=true;video.preload='auto';video.src=video.dataset.demo; }
      video.play().catch(()=>{});
    }
  }
  function setupFullVideo(video) {
    const wrapper = document.createElement('div');
    wrapper.className = 'detail-player';
    video.before(wrapper);
    wrapper.append(video);
    const button = document.createElement('button');
    button.className = 'detail-start';
    button.type = 'button';
    button.textContent = '▶ 播放完整视频';
    wrapper.append(button);
    const options = document.createElement('div');
    options.className = 'video-options';
    const status = document.createElement('span');
    status.className = 'video-status';
    status.setAttribute('aria-live','polite');
    const label = document.createElement('div');
    label.className = 'quality-switch';
    label.setAttribute('role','group');
    label.setAttribute('aria-label','视频画质');
    const heading = document.createElement('span');
    heading.className = 'quality-label';
    heading.textContent = '画质';
    const tags = document.createElement('div');
    tags.className = 'quality-tags';
    const quality = document.createElement('select');
    quality.innerHTML = '<option value="auto">自动（推荐）</option><option value="0">流畅 · 480p</option><option value="1">高清 · 1080p</option>';
    for(const [value,text,title] of [['auto','自动','按网速自动选择画质，推荐'],['0','流畅 · 480p','适合较慢网络'],['1','高清 · 1080p','以高清画质播放']]){
      const tag=document.createElement('button');
      tag.type='button';tag.className='quality-tag';tag.dataset.quality=value;
      tag.textContent=text;tag.title=title;tag.setAttribute('aria-pressed',String(value==='auto'));
      tag.addEventListener('click',()=>{
        if(quality.value===value)return;
        quality.value=value;
        for(const item of tags.children)item.setAttribute('aria-pressed',String(item===tag));
        quality.dispatchEvent(new Event('change'));
      });
      tags.append(tag);
    }
    const speed = document.createElement('div');
    speed.className = 'playback-speed';
    speed.setAttribute('role','group');
    speed.setAttribute('aria-label','播放速度');
    const speedLabel=document.createElement('span');
    speedLabel.textContent='播放速度';speed.append(speedLabel);
    let selectedRate=1;
    const applyRate=()=>{video.defaultPlaybackRate=selectedRate;video.playbackRate=selectedRate;video.preservesPitch=true;};
    for(const rate of [1,1.5,2,4]){
      const tag=document.createElement('button');
      tag.type='button';tag.className='quality-tag';tag.dataset.rate=rate;
      tag.textContent=rate+'×';tag.setAttribute('aria-pressed',String(rate===1));
      tag.addEventListener('click',()=>{selectedRate=rate;applyRate();for(const item of speed.querySelectorAll('button'))item.setAttribute('aria-pressed',String(item===tag));});
      speed.append(tag);
    }
    video.addEventListener('loadedmetadata',applyRate);
    video.addEventListener('playing',applyRate);
    video.addEventListener('ratechange',()=>{if(video.playbackRate!==selectedRate)applyRate();});
    label.append(heading,tags);options.append(speed,label,status);wrapper.append(options);
    const name = video.dataset.stream.split('/').slice(-2)[0];
    const adaptive = './assets/adaptive/'+name+'/master.m3u8';
    const original = adaptive;
    let started=false,isOriginal=false,generation=0,waitingTimer;
    const clearWaiting=()=>{clearTimeout(waitingTimer);status.textContent='';};
    const failed = () => {
      if (!video.isConnected) return;
      release(video);
      clearWaiting();
      started=false;
      button.hidden = false;
      button.disabled = false;
      button.textContent = '▶ 重新播放';
    };
    video.addEventListener('playing', () => {button.hidden=true;button.disabled=false;clearWaiting();});
    video.addEventListener('error',()=>{if(started)failed();});
    video.addEventListener('waiting',()=>{
      clearTimeout(waitingTimer);
      waitingTimer=setTimeout(()=>{
        if(!video.isConnected||video.paused)return;
        status.textContent=isOriginal?'原画质缓冲中，可切换“自动”':'正在缓冲…';
        const hls=players.get(video);
        if(hls&&quality.value==='auto')hls.nextLoadLevel=0;
      },1500);
    });
    video.addEventListener('play',()=>{
      if(video.dataset.networkSuspended){delete video.dataset.networkSuspended;players.get(video)?.startLoad(video.currentTime);}
    });
    function start(position=0,shouldPlay=true){
      const visit=++generation;
      release(video);clearWaiting();applyRate();
      delete video.dataset.networkSuspended;
      isOriginal=false;started=true;
      button.disabled = true;
      button.textContent = '正在加载…';
      const source=isOriginal?original:adaptive;
      if (window.Hls?.isSupported()) {
        const hls = new Hls({progressive:true,startPosition:position,startLevel:isOriginal?-1:quality.value==='auto'?0:Number(quality.value),maxBufferLength:30,maxMaxBufferLength:60,backBufferLength:10,maxBufferSize:24*1024*1024,abrEwmaDefaultEstimate:800000,abrBandWidthFactor:.65,abrBandWidthUpFactor:.5,maxStarvationDelay:2,maxLoadingDelay:2});
        players.set(video,hls);
        let pendingPlay=shouldPlay;
        const beginPlayback=()=>{
          if(!pendingPlay||visit!==generation)return;
          if(!isOriginal){
            let ahead=0;
            for(let i=0;i<video.buffered.length;i++)if(video.buffered.start(i)<=position+.2&&video.buffered.end(i)>position)ahead=video.buffered.end(i)-position;
            const needed=Number.isFinite(video.duration)?Math.min(1.5,Math.max(.1,video.duration-position-.1)):1.5;
            if(ahead<needed)return;
          }
          pendingPlay=false;
          applyRate();
          video.play().catch(()=>{button.hidden=false;button.disabled=false;button.textContent='▶ 播放完整视频';});
        };
        hls.on(Hls.Events.BUFFER_APPENDED,beginPlayback);
        hls.on(Hls.Events.MANIFEST_PARSED, () => {
          if(visit!==generation)return;
          if(!isOriginal&&quality.value!=='auto')hls.currentLevel=Number(quality.value);
          if(shouldPlay)beginPlayback();
          else {button.disabled=false;button.hidden=true;}
        });
        let recoveries=0;
        hls.on(Hls.Events.ERROR, (_,data) => {
          if(!data.fatal||visit!==generation)return;
          if(data.type===Hls.ErrorTypes.MEDIA_ERROR&&recoveries++<1)hls.recoverMediaError();
          else failed();
        });
        hls.loadSource(source);
        hls.attachMedia(video);
      } else {
        players.set(video,null);
        video.src = !isOriginal&&quality.value!=='auto'?adaptive.replace('master.m3u8',quality.value==='0'?'480.m3u8':'1080.m3u8'):source;
        video.addEventListener('loadedmetadata',()=>{if(visit!==generation)return;video.currentTime=position;if(shouldPlay)video.play().catch(failed);},{once:true});
        video.load();
      }
    }
    button.addEventListener('click', () => {
      if(started&&players.has(video)){video.play().catch(failed);return;}
      start();
    });
    quality.addEventListener('change',()=>{
      if(!started)return;
      const originalRequested=quality.value==='original',hls=players.get(video);
      if(hls&&!isOriginal&&!originalRequested){hls.nextLevel=quality.value==='auto'?-1:Number(quality.value);return;}
      start(video.currentTime,!video.paused);
    });
  }
  function routeMedia() {
    demoObserver?.disconnect();
    for (const [video] of demos) release(video);
    demos.clear();
    for (const [video] of players) release(video);
    for (const [video] of previews) {
      if (!onHome()) { if(video.hasAttribute('src')) release(video); }
      else playPreview(video);
    }
    if (onHome()) return;
    const fullVideo = document.querySelector('.detail-video');
    if(fullVideo) setupFullVideo(fullVideo);
    demoObserver = new IntersectionObserver(entries => {
      for (const entry of entries) {
        if(demos.has(entry.target)) demos.set(entry.target,entry.isIntersecting);
      }
      updateDemos();
    }, {rootMargin:'0px',threshold:[0,.25,.5,1]});
    for (const video of document.querySelectorAll('.detail-demo')) {
      demos.set(video,false);
      demoObserver.observe(video);
    }
  }
  function visibility() {
    for (const [video] of previews) playPreview(video);
    updateDemos();
    if (document.hidden) for(const [video,hls] of players){video.pause();hls?.stopLoad();video.dataset.networkSuspended='1';}
  }
  addEventListener('hashchange',routeMedia);
  document.addEventListener('visibilitychange',visibility);
  document.addEventListener('viewerchange',visibility);
  reduced.addEventListener('change',visibility);
  routeMedia();
})();
