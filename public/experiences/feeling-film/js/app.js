/* =========================================================
   把感受剪成片：页面、路由与所有交互都在这里接起来。
   所有会给人看的字，都用中文。
   ========================================================= */
(function(){
  'use strict';

  var App = window.App = window.App || {};
  var U = App.util;
  var D = App.data;
  var Store = App.store;
  var F = App.Feelings;
  var Film = App.film;
  var Scenes = App.scenes;
  var Gestures = App.gestures;
  var Music = App.music;

  var COPY = D.copy;
  var view = document.getElementById('view');
  var topbar = document.getElementById('topbar');
  var boot = document.getElementById('boot');
  var topQuiet = document.getElementById('topbar-quiet');
  var sheet = document.getElementById('sheet');
  var menuToggle = document.getElementById('menu-toggle');
  var sheetClose = document.getElementById('sheet-close');

  var ROUTES = ['home', 'studio', 'library', 'calendar', 'healing', 'gestures', 'about'];
  var HASHES = {
    home: '',
    studio: '#剪片',
    library: '#片库',
    calendar: '#日历',
    healing: '#备用片',
    gestures: '#手势册',
    about: '#由来'
  };
  var TITLES = {
    home: '把感受剪成片',
    studio: '剪片',
    library: '片库',
    calendar: '情绪日历',
    healing: '治愈备用片',
    gestures: '手势册',
    about: '由来'
  };

  var DRAFT_KEY = 'ganshou.draft.v1';
  var ZH_NUM = ['零', '一', '二', '三', '四', '五', '六', '七', '八', '九', '十'];
  var WEEK_HEADS = ['一', '二', '三', '四', '五', '六', '日'];

  var state = {
    ready: false,
    route: 'home',
    draft: null,
    libFilter: 'all',
    libNewId: '',
    calMonth: null,
    calSelected: '',
    uploading: false
  };

  var pageCleanup = null;
  var activeModal = null;
  var activeSavePop = null;
  var activeTheater = null;
  var activeExport = null;
  var activeGeneration = null;
  var lastFocus = null;

  /* ---------------- 小工具 ---------------- */
  function h(value){
    return U.escapeHTML(value == null ? '' : value);
  }

  function clamp(n, lo, hi){ return Math.max(lo, Math.min(hi, n)); }

  function zhNum(n){
    n = Number(n) || 0;
    if (n >= 0 && n <= 10) return ZH_NUM[n];
    return String(n);
  }

  function safeName(title, suffix){
    var base = String(title || '一段片').replace(/[\\/:*?"<>|]/g, '').replace(/\s+/g, ' ').trim();
    if (!base) base = '一段片';
    return base + (suffix || '');
  }

  function todayLabel(){
    var now = new Date();
    return U.fmtDate(now) + '　' + U.weekday(now);
  }

  function filmStill(film){
    if (!film) return '';
    if (film.still) return film.still;
    if (film.poster) return film.poster;
    try{
      return Scenes.thumbnail('dusk-window', 640);
    }catch(e){ return ''; }
  }

  function shapeClass(film){
    var shape = film && film.format && film.format.shape;
    return shape === 'tall' || shape === 'square' ? ' is-' + shape : '';
  }

  function sceneOf(id){
    return Scenes && Scenes.get ? Scenes.get(id) : null;
  }

  function sceneMoodKey(scene){
    if (!scene || !scene.weights) return 'calm';
    var best = 'calm', score = -1;
    D.moodOrder.forEach(function(key){
      var value = scene.weights[key] || 0;
      if (value > score){ score = value; best = key; }
    });
    return best;
  }

  function sourceThumb(source, width){
    if (!source) return '';
    if (source.kind === 'scene'){
      try{ return Scenes.thumbnail(source.id, width || 480); }catch(e){ return ''; }
    }
    if (source.kind === 'upload'){
      var m = Store.getMaterial(source.id);
      if (m && m.src) return m.src;
      try{ return Scenes.thumbnail(source.fallback || 'morning-fog', width || 480); }catch(e){ return ''; }
    }
    return '';
  }

  function div(html, className){
    var el = document.createElement('div');
    if (className) el.className = className;
    el.innerHTML = html;
    return el.firstElementChild;
  }

  function icon(id){
    return '<svg aria-hidden="true" focusable="false"><use href="#i-' + id + '"/></svg>';
  }

  function moodTag(moodKey, extraClass){
    var mood = D.mood(moodKey);
    if (!mood) return '';
    return '<span class="mood-tag ' + (extraClass || '') + '" style="--mood-color:' + mood.color + '">' + h(mood.name) + '</span>';
  }

  function toast(message){
    var root = document.getElementById('toast-root');
    if (!root || !message) return;
    var el = document.createElement('div');
    el.className = 'toast';
    el.textContent = message;
    root.appendChild(el);
    while (root.children.length > 3) root.removeChild(root.firstElementChild);
    setTimeout(function(){
      el.classList.add('is-out');
      setTimeout(function(){ if (el.parentNode) el.parentNode.removeChild(el); }, 380);
    }, 2800);
  }

  /* ---------------- 草稿：关掉页面也接着上次 ---------------- */
  function freshDraft(){
    return {
      step: 0,
      sentence: '',
      template: 'diary',
      moodOverride: '',
      selected: [],
      answers: { firstTag: '', secondTag: '' },
      settings: {
        length: 'normal',
        shape: 'wide',
        quality: 'normal',
        musicMode: 'auto',
        musicPreset: 'calm',
        musicData: '',
        musicName: ''
      },
      doneId: ''
    };
  }

  function sanitizeSettings(raw){
    var defaults = freshDraft().settings;
    raw = raw && typeof raw === 'object' ? raw : {};
    var settings = {
      length: D.length(raw.length) ? raw.length : defaults.length,
      shape: D.shape(raw.shape) ? raw.shape : defaults.shape,
      quality: D.quality(raw.quality) ? raw.quality : defaults.quality,
      musicMode: raw.musicMode === 'preset' || raw.musicMode === 'upload' ? raw.musicMode : 'auto',
      musicPreset: 'calm',
      musicData: '',
      musicName: ''
    };
    var preset = D.musicChoice(raw.musicPreset);
    if (raw.musicPreset && preset.key === raw.musicPreset && preset.key !== 'auto') settings.musicPreset = preset.key;
    if (settings.musicMode === 'upload' && typeof raw.musicData === 'string' && /^data:audio\//.test(raw.musicData)){
      settings.musicData = raw.musicData;
      settings.musicName = typeof raw.musicName === 'string' ? raw.musicName.slice(0, 40) : '';
    } else if (settings.musicMode === 'upload'){
      settings.musicMode = 'auto';
    }
    return settings;
  }

  function sanitizeSelected(list){
    if (!Array.isArray(list)) return [];
    var seen = {};
    return list.filter(function(item){
      if (!item || (item.kind !== 'scene' && item.kind !== 'upload')) return false;
      if (!item.id) return false;
      var key = item.kind + ':' + item.id;
      if (seen[key]) return false;
      seen[key] = true;
      return true;
    }).map(function(item){
      return { kind: item.kind, id: String(item.id) };
    });
  }

  function loadDraft(){
    var draft = freshDraft();
    var wantedUpload = false;
    try{
      var raw = localStorage.getItem(DRAFT_KEY);
      if (!raw) return draft;
      var saved = JSON.parse(raw);
      if (!saved || typeof saved !== 'object') return draft;
      draft.step = clamp(Number(saved.step) || 0, 0, 3);
      draft.sentence = typeof saved.sentence === 'string' ? saved.sentence.slice(0, 120) : '';
      draft.template = D.template(saved.template) ? saved.template : 'diary';
      draft.moodOverride = D.mood(saved.moodOverride) ? saved.moodOverride : '';
      draft.selected = sanitizeSelected(saved.selected);
      draft.answers = {
        firstTag: saved.answers && typeof saved.answers.firstTag === 'string' ? saved.answers.firstTag : '',
        secondTag: saved.answers && typeof saved.answers.secondTag === 'string' ? saved.answers.secondTag : ''
      };
      wantedUpload = !!(saved.settings && saved.settings.musicMode === 'upload');
      draft.settings = sanitizeSettings(saved.settings);
      if (wantedUpload && draft.settings.musicMode !== 'upload'){
        var keptAudio = Store.getDraftAudio();
        if (keptAudio && keptAudio.data){
          draft.settings.musicMode = 'upload';
          draft.settings.musicData = keptAudio.data;
          draft.settings.musicName = keptAudio.name || '你带来的音乐';
        }
      }
      draft.doneId = typeof saved.doneId === 'string' ? saved.doneId : '';
    }catch(e){ /* 记不住就从头来 */ }
    return draft;
  }

  function saveDraft(){
    if (!state.draft) return;
    var text;
    try{ text = JSON.stringify(state.draft); }catch(e){ return; }
    try{
      localStorage.setItem(DRAFT_KEY, text);
      return;
    }catch(e){ /* 带来的音乐太大时，先把别的记住 */ }
    try{
      var copy = JSON.parse(text);
      copy.settings = copy.settings || {};
      copy.settings.musicData = '';
      copy.settings.musicName = '';
      localStorage.setItem(DRAFT_KEY, JSON.stringify(copy));
    }catch(e){ /* 空间满了也不打断 */ }
  }

  function resetDraft(){
    state.draft = freshDraft();
    Store.clearDraftAudio();
    saveDraft();
  }

  function validDoneFilm(){
    var id = state.draft && state.draft.doneId;
    return id ? Store.getFilm(id) : null;
  }

  function cleanDraft(){
    var draft = state.draft || freshDraft();
    draft.settings = sanitizeSettings(draft.settings);
    draft.selected = sanitizeSelected(draft.selected).filter(function(ref){
      if (ref.kind === 'upload') return !!Store.getMaterial(ref.id);
      return !!sceneOf(ref.id);
    });
    if (draft.doneId && !Store.getFilm(draft.doneId)) draft.doneId = '';
    if (draft.step === 3 && !draft.doneId) draft.step = 2;
    if (draft.step > 0 && draft.sentence.trim().length < 2) draft.step = 0;
    state.draft = draft;
    return draft;
  }

  /* ---------------- 路由与外壳 ---------------- */
  function decodeHash(hash){
    var raw = hash || '';
    try{ return decodeURIComponent(raw); }catch(e){ return raw; }
  }

  function routeFromHash(){
    var hash = decodeHash(location.hash || '');
    if (!hash || hash === '#' || hash === '#序') return 'home';
    for (var i = 0; i < ROUTES.length; i++){
      if (HASHES[ROUTES[i]] === hash) return ROUTES[i];
    }
    return 'home';
  }

  function navigate(route){
    if (ROUTES.indexOf(route) < 0) route = 'home';
    closeSheet();
    var hash = HASHES[route];
    var current = decodeHash(location.hash || '');
    if (hash === current || (!hash && (!location.hash || location.hash === '#'))){
      renderRoute(route);
      return;
    }
    if (!hash){
      try{
        history.pushState(null, '', location.pathname + location.search);
        renderRoute(route);
      }catch(e){
        location.hash = '';
      }
      return;
    }
    location.hash = hash;
  }

  function updateNav(route){
    U.$$('.nav button, .sheet-nav button').forEach(function(btn){
      if (btn.getAttribute('data-go') === route) btn.setAttribute('aria-current', 'page');
      else btn.removeAttribute('aria-current');
    });
  }

  function renderTopbarMeta(){
    if (!topQuiet) return;
    var count = Store.get().films.length;
    topQuiet.textContent = count ? '已收好 ' + count + ' 段片' : '第一段片，等你开口';
    topQuiet.classList.add('is-on');
  }

  function renderRoute(route, keepScroll){
    if (!state.ready) return;
    route = ROUTES.indexOf(route) >= 0 ? route : 'home';
    closeAllOverlays();
    if (typeof pageCleanup === 'function'){
      try{ pageCleanup(); }catch(e){}
      pageCleanup = null;
    }
    state.route = route;
    state.draft = cleanDraft();
    var html = '';
    if (route === 'home') html = renderHome();
    else if (route === 'studio') html = renderStudio();
    else if (route === 'library') html = renderLibrary();
    else if (route === 'calendar') html = renderCalendar();
    else if (route === 'healing') html = renderHealing();
    else if (route === 'gestures') html = renderGestures();
    else if (route === 'about') html = renderAbout();
    view.innerHTML = html;
    view.classList.remove('is-entering');
    void view.offsetWidth;
    view.classList.add('is-entering');
    document.title = route === 'home' ? TITLES.home : TITLES[route] + ' · ' + TITLES.home;
    updateNav(route);
    renderTopbarMeta();

    if (route === 'home') bindHome();
    else if (route === 'studio') bindStudio();
    else if (route === 'library') bindLibrary();
    else if (route === 'calendar') bindCalendar();
    else if (route === 'healing') bindHealing();
    else if (route === 'gestures') bindGestures();
    else if (route === 'about') bindAbout();

    if (!keepScroll){
      window.scrollTo(0, 0);
      try{ view.focus({ preventScroll: true }); }catch(e){ view.focus(); }
    }
  }

  /* ---------------- 首页 ---------------- */
  function currentMonthFilms(){
    var now = new Date();
    return Store.get().films.filter(function(film){
      var d = U.parseKey(film.dateKey || U.dateKey(film.createdAt));
      return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth();
    });
  }

  function renderHome(){
    var films = Store.get().films;
    var healing = Store.get().healing;
    var latest = films[0] || null;
    var monthFilms = currentMonthFilms();
    var latestMood = Store.latestMood() || 'calm';
    var samples = [
      '今天有点累，但回家的路上风很轻',
      '光落在桌上，我坐了一会儿',
      '忽然很想念一个人',
      '今天什么也没做成，心里有点慌'
    ];

    var fragments = healing.slice(0, 3);
    var fallbackFragments = [
      { scene: 'morning-fog', label: '清晨的雾' },
      { scene: 'table-flower', label: '桌上的花' },
      { scene: 'night-shop', label: '深夜的店' }
    ];
    var fragmentHTML = [0, 1, 2].map(function(i){
      var item = fragments[i];
      var src = item ? sourceThumb(item.source, 480) : Scenes.thumbnail(fallbackFragments[i].scene, 480);
      var label = item ? item.title : fallbackFragments[i].label;
      return '<figure class="fragment-paper f' + (i + 1) + '">' +
        (src ? '<img src="' + h(src) + '" alt="">' : '<span class="fp-art"></span>') +
        '<figcaption class="fp-label">' + h(label) + '</figcaption>' +
        '</figure>';
    }).join('');

    var firstCard;
    if (latest){
      firstCard = '<button class="remember-card" data-film="' + h(latest.id) + '">' +
        '<span class="rc-arrow">' + icon('arrow') + '</span>' +
        '<div class="rc-body"><span class="rc-label">最近剪的片</span>' +
        '<div class="rc-main">' + h(latest.title) + '</div>' +
        '<div class="rc-sub">' + h(U.fmtRelative(latest.createdAt)) + ' · ' + h(U.durationLabel(latest.duration)) + ' · ' + h(latest.moodName || '') + '</div></div>' +
        (filmStill(latest) ? '<span class="rc-thumb" style="background-image:url(\'' + h(filmStill(latest)) + '\')"></span>' : '') +
        '</button>';
    } else {
      firstCard = '<button class="remember-card is-empty" data-go="studio">' +
        '<span class="rc-arrow">' + icon('arrow') + '</span>' +
        '<div class="rc-body"><span class="rc-label">还没有剪过片</span>' +
        '<div class="rc-main">从一句今天开始。</div>' +
        '<div class="rc-sub">不用准备素材，也不用先学会剪辑。</div></div>' +
        '</button>';
    }

    return '<section class="home">' +
      '<section class="hero">' +
        '<div class="hero-grid">' +
          '<div class="hero-stage">' +
            '<div class="film-frame">' +
              '<div class="film-canvas-wrap">' +
                '<canvas id="hero-canvas" width="1280" height="720" aria-label="一段正在循环放映的画面"></canvas>' +
                '<span class="frame-corner tl"></span><span class="frame-corner tr"></span>' +
                '<span class="frame-corner bl"></span><span class="frame-corner br"></span>' +
                '<div class="frame-overlay">' +
                  '<p class="frame-caption" id="hero-caption">黄昏站台，风把一天吹慢。</p>' +
                  '<div class="frame-meta"><span class="live">正在放映</span><span>循环 · 无声</span></div>' +
                '</div>' +
                '<div class="beam" aria-hidden="true"></div>' +
              '</div>' +
            '</div>' +
            '<div class="hero-frame-note"><span>今日片头</span><span>十二段画面里的五段</span></div>' +
          '</div>' +
          '<div class="hero-copy">' +
            '<h1 class="hero-title"><span>把感受</span><span class="thin">剪成片</span></h1>' +
            '<p class="hero-lead">丢的是碎片，它还给你的故事。<br>' +
              '<span class="quote">不用苦练剪辑，说出你的感受。</span></p>' +
            '<form class="quick-cut" id="quick-form">' +
              '<div class="quick-label"><span>今天大概是这样</span><span>写一句，就可以开始</span></div>' +
              '<div class="quick-row">' +
                '<input id="quick-input" type="text" maxlength="80" autocomplete="off" placeholder="今天有点累，但窗外的光很好" aria-label="写下今天的感受">' +
                '<button class="btn btn-amber" type="submit">剪这一句' + icon('arrow') + '</button>' +
              '</div>' +
              '<div class="quick-chips">' +
                samples.map(function(text, i){
                  return '<button class="chip' + (i === 0 ? ' is-on' : '') + '" type="button" data-fill="' + h(text) + '">' + h(text) + '</button>';
                }).join('') +
              '</div>' +
            '</form>' +
            '<p class="hero-fine"><span class="seal">剪</span>素材、片子和情绪，只留在这台电脑里。</p>' +
            '<div class="quote-strip"><p class="q-main">把说不出的，剪成看得见的。</p><p class="q-right">七个人 · 一种剪法</p></div>' +
          '</div>' +
        '</div>' +
      '</section>' +
      '<section class="band" aria-labelledby="home-flow-title">' +
        '<div class="band-head"><h2 id="home-flow-title">三步，<br>把一天收进一段片。</h2>' +
          '<p>不是模板填空。你只负责说出感受，剩下的结构由它搭。片段、声音、字幕和节奏，会在同一次里完成。</p></div>' +
        '<ol class="flow">' +
          '<li><span class="flow-num">其一</span><h3>丢下你有的</h3><p>几张照片、几段视频，或者只是今天的一句话。没有素材也可以开始。</p><span class="flow-mark">碎</span></li>' +
          '<li><span class="flow-num">其二</span><h3>回答两道问题</h3><p>它先确认听见的情绪，再问它最不确定的两件事。不是考试，只是把方向说清。</p><span class="flow-mark">问</span></li>' +
          '<li><span class="flow-num">其三</span><h3>收下你的故事</h3><p>片段、配乐、字幕、海报，还有一式情绪手势，一起交还给你。</p><span class="flow-mark">片</span></li>' +
        '</ol>' +
      '</section>' +
      '<section class="band" aria-labelledby="home-remember-title">' +
        '<div class="band-head"><h2 id="home-remember-title">它记得你留下的东西。</h2>' +
          '<p>不是数据报表。只是你剪过的片、放过的日子，和那些当时没用上、却被悄悄留下来的亮处。</p></div>' +
        '<div class="remember-grid">' +
          firstCard +
          '<button class="remember-card" data-go="calendar">' +
            '<span class="rc-arrow">' + icon('arrow') + '</span>' +
            '<div class="rc-body"><span class="rc-label">这个月</span>' +
            '<div class="rc-main">' + (monthFilms.length ? monthFilms.length + ' 段片子' : '还没有落下一段') + '</div>' +
            '<div class="rc-sub">' + (monthFilms.length ? '翻一翻情绪日历，看看它们落在哪几天。' : '日子先过着，想剪的时候再来。') + '</div></div>' +
          '</button>' +
          '<button class="remember-card" data-go="healing">' +
            '<span class="rc-arrow">' + icon('arrow') + '</span>' +
            '<div class="rc-body"><span class="rc-label">治愈备用片</span>' +
            '<div class="rc-main">' + (healing.length ? healing.length + ' 小片亮光' : '还空着') + '</div>' +
            '<div class="rc-sub">' + (healing.length ? '你低落时，它替你收下的好片段。' : '等你剪过一段低落的片子，它才会开始收。') + '</div></div>' +
          '</button>' +
        '</div>' +
      '</section>' +
      '<section class="hidden-band" aria-labelledby="home-hidden-title">' +
        '<div class="hidden-panel">' +
          '<div class="hidden-copy">' +
            '<p class="hp-kicker">它没有丢的东西</p>' +
            '<h2 id="home-hidden-title">你低落时没用上的亮处，<br>它悄悄收在这里。</h2>' +
            '<p>' + h(COPY.healingIntro) + '</p>' +
            '<button class="btn btn-dark" data-go="healing">去看治愈备用片' + icon('arrow') + '</button>' +
          '</div>' +
          '<div class="hidden-fragments" aria-hidden="true">' + fragmentHTML + '</div>' +
        '</div>' +
      '</section>' +
    '</section>';
  }

  function bindHome(){
    var canvas = document.getElementById('hero-canvas');
    var caption = document.getElementById('hero-caption');
    var hero = null;
    var capTimer = 0;
    var fadeTimer = 0;

    if (canvas){
      try{
        hero = Film.heroLoop(canvas, { mood: Store.latestMood() || 'calm' });
      }catch(e){}
      var lines = [
        '黄昏站台，风把一天吹慢。',
        '窗台还留着下午的暖。',
        '桌上的花，今天也开了一点。',
        '雾散之前，路是软的。',
        '深夜的店，还亮着一盏灯。'
      ];
      var index = 0;
      capTimer = setInterval(function(){
        if (!caption) return;
        caption.classList.add('is-fading');
        fadeTimer = setTimeout(function(){
          index = (index + 1) % lines.length;
          caption.textContent = lines[index];
          caption.classList.remove('is-fading');
        }, 680);
      }, 5600);
    }

    pageCleanup = function(){
      if (hero) hero.destroy();
      clearInterval(capTimer);
      clearTimeout(fadeTimer);
    };

    var form = document.getElementById('quick-form');
    var input = document.getElementById('quick-input');
    if (form && input){
      form.addEventListener('submit', function(e){
        e.preventDefault();
        var sentence = input.value.trim();
        if (sentence.length < 2){
          toast('先说一句今天大概的样子。');
          input.focus();
          return;
        }
        state.draft = freshDraft();
        state.draft.sentence = sentence.slice(0, 120);
        Store.clearDraftAudio();
        saveDraft();
        navigate('studio');
      });
      U.$$('.quick-chips .chip', form).forEach(function(chip){
        chip.addEventListener('click', function(){
          input.value = chip.getAttribute('data-fill') || chip.textContent;
          U.$$('.quick-chips .chip', form).forEach(function(other){ other.classList.remove('is-on'); });
          chip.classList.add('is-on');
          input.focus();
        });
      });
    }
  }

  /* ---------------- 剪辑台 ---------------- */
  var STEP_NAMES = ['说一句', '挑画面', '答两问', '收下片'];
  var STEP_NOTES = [
    '写下一句就够。它先听，不评价。',
    '选不选都可以，剩下的它会补。',
    '两道都答完，就可以收片。',
    '已经收好了。可以放，也可以带走。'
  ];

  function sentenceReady(sentence){
    return String(sentence || '').trim().length >= 2;
  }

  function scoresFromWeights(weights){
    var sum = 0;
    var list = D.moodOrder.map(function(key){
      var value = Math.max(0, weights && weights[key] || 0);
      sum += value;
      return { key: key, name: D.mood(key).name, score: value };
    });
    list.forEach(function(item){ item.share = sum ? item.score / sum : 0; });
    return list.sort(function(a, b){ return b.score - a.score; });
  }

  function applyMoodOverride(analysis, override){
    if (!analysis || !override || !D.mood(override)) return analysis;
    var mood = D.mood(override);
    if (analysis.primary === override){
      analysis.heard = mood.heard;
      analysis.colors = mood;
      return analysis;
    }
    analysis.primary = override;
    analysis.moodName = mood.name;
    analysis.heard = mood.heard;
    analysis.colors = mood;
    var weights = {};
    D.moodOrder.forEach(function(key){
      weights[key] = (analysis.weights && analysis.weights[key]) || 0;
      if (key !== override) weights[key] *= .36;
    });
    weights[override] = Math.max(weights[override] || 0, .86);
    analysis.weights = weights;
    analysis.scores = scoresFromWeights(weights);
    analysis.secondary = analysis.scores[1] && analysis.scores[1].score > .2 ? analysis.scores[1].key : null;
    return analysis;
  }

  function analysisNow(){
    var sentence = (state.draft && state.draft.sentence || '').trim();
    if (!sentence) return null;
    var analysis = F.analyze(sentence);
    applyMoodOverride(analysis, state.draft.moodOverride);
    return analysis;
  }

  function currentMoodKey(){
    var analysis = analysisNow();
    return analysis ? analysis.primary : 'calm';
  }

  function reconcileAnswers(moodKey){
    if (!state.draft) return;
    var qs = F.questions(moodKey || currentMoodKey());
    var first = qs.first.options.some(function(opt){ return opt.tag === state.draft.answers.firstTag; });
    var second = qs.second.options.some(function(opt){ return opt.tag === state.draft.answers.secondTag; });
    if (!first) state.draft.answers.firstTag = '';
    if (!second) state.draft.answers.secondTag = '';
  }

  function answerOptions(moodKey){
    var qs = F.questions(moodKey || currentMoodKey());
    var firstTag = state.draft.answers.firstTag;
    var secondTag = state.draft.answers.secondTag;
    var first = qs.first.options.filter(function(opt){ return opt.tag === firstTag; })[0] || null;
    var second = qs.second.options.filter(function(opt){ return opt.tag === secondTag; })[0] || null;
    return { qs: qs, first: first, second: second };
  }

  function selectedCount(){
    return state.draft ? state.draft.selected.length : 0;
  }

  function isPicked(kind, id){
    return state.draft.selected.some(function(ref){ return ref.kind === kind && ref.id === id; });
  }

  function addPick(kind, id){
    if (isPicked(kind, id)) return;
    if (state.draft.selected.length >= 12){
      toast('先放十二段就好，剩下的它来补。');
      return;
    }
    state.draft.selected.push({ kind: kind, id: id });
  }

  function dropPick(kind, id){
    state.draft.selected = state.draft.selected.filter(function(ref){
      return !(ref.kind === kind && ref.id === id);
    });
  }

  function sampleSentences(){
    return [
      '今天有点累，但回家的路上风很轻',
      '光落在桌上，我坐了一会儿',
      '忽然很想念一个人',
      '今天什么也没做成，心里有点慌'
    ];
  }

  function stepperHTML(){
    var draft = state.draft;
    var hasDone = !!validDoneFilm();
    return '<ol class="stepper">' + STEP_NAMES.map(function(name, i){
      var current = draft.step === i;
      var done = i < draft.step;
      var disabled = (i > 0 && !sentenceReady(draft.sentence)) || (i === 3 && !hasDone);
      if (i > draft.step && i < 3) disabled = true;
      return '<li data-step-go="' + i + '" role="button" tabindex="' + (disabled ? -1 : 0) + '"' +
        ' aria-current="' + (current ? 'step' : 'false') + '"' +
        (disabled ? ' aria-disabled="true" disabled' : '') +
        ' class="' + (current ? 'is-current' : (done ? 'is-done' : '')) + '">' +
        '<span class="st-num">' + zhNum(i + 1) + '</span><span>' + h(name) + '</span></li>';
    }).join('') + '</ol>';
  }

  function renderStudio(){
    var draft = state.draft;
    if (draft.step === 3 && !validDoneFilm()) draft.step = 2;
    return '<div class="page studio-page">' +
      '<div class="studio-head">' +
        '<div><h1>剪片</h1><p>把今天大概的样子说出来，剩下的交给它。</p></div>' +
        '<div class="head-note">不必先学会剪辑。<br>素材、声音、字幕，它会在同一次里替你完成。</div>' +
      '</div>' +
      '<div id="stepper-slot">' + stepperHTML() + '</div>' +
      '<div class="studio-grid">' +
        '<div class="studio-main" id="studio-main">' + studioPanelHTML() + '</div>' +
        '<aside class="studio-aside" id="studio-aside">' + studioAsideHTML() + '</aside>' +
      '</div>' +
    '</div>';
  }

  function studioPanelHTML(){
    var step = state.draft.step;
    if (step === 1) return stepMaterialsHTML();
    if (step === 2) return stepQuestionsHTML();
    if (step === 3){
      var film = validDoneFilm();
      if (film) return stepDoneHTML(film);
      state.draft.step = 2;
      return stepQuestionsHTML();
    }
    return stepSentenceHTML();
  }

  function studioFootHTML(prevLabel, nextLabel, nextAttrs, extra){
    return '<div class="studio-foot">' +
      '<div class="foot-left">' +
        (prevLabel ? '<button class="btn btn-ghost btn-sm" type="button" data-prev-step>' + h(prevLabel) + '</button>' : '') +
        '<span class="foot-note">' + h(extra || STEP_NOTES[state.draft.step]) + '</span>' +
      '</div>' +
      '<div class="foot-right">' +
        (nextLabel ? '<button class="btn btn-amber" type="button" ' + (nextAttrs || 'data-next-step') + '>' + h(nextLabel) + icon('arrow') + '</button>' : '') +
      '</div>' +
    '</div>';
  }

  function stepSentenceHTML(){
    var draft = state.draft;
    var analysis = analysisNow();
    var ready = sentenceReady(draft.sentence);
    return '<section class="panel">' +
      '<h2 class="panel-title">今天，大概是这样。</h2>' +
      '<p class="panel-note">不用组织语言，也不用先挑素材。写下一句最靠近今天的感受，<span class="kai">哪怕它很不完整。</span></p>' +
      '<div class="sentence-box">' +
        '<textarea id="sentence-input" maxlength="120" placeholder="我今天大概是这样……" aria-label="写下今天的感受">' + h(draft.sentence) + '</textarea>' +
        '<div class="sentence-foot"><span id="sf-count">' + h(draft.sentence.length + ' 字') + '</span>' +
          '<span class="sf-state' + (ready ? ' is-on' : '') + '" id="sf-state">' + (ready ? '它听见了' : '还没落笔') + '</span></div>' +
      '</div>' +
      '<div class="chip-row">' + sampleSentences().map(function(text, i){
        return '<button class="chip' + (i === 0 && !draft.sentence ? ' is-on' : '') + '" type="button" data-sample="' + h(text) + '">' + h(text) + '</button>';
      }).join('') + '</div>' +
      '<div id="heard-slot">' + heardHTML(analysis) + '</div>' +
      studioFootHTML('先回首页', '下一步，挑画面',
        ready ? 'data-next-step' : 'data-next-step disabled aria-disabled="true"',
        ready ? '写一句就够，它会先听一遍。' : '写上两个字，就可以往下走。') +
    '</section>';
  }

  function heardHTML(analysis){
    if (!analysis){
      return '<div class="heard-empty">写下今天大概的样子。它会先听一遍，不打断，也不评价。</div>';
    }
    var override = state.draft.moodOverride;
    var mood = D.mood(analysis.primary);
    var weights = {};
    (analysis.scores || []).forEach(function(item){ weights[item.key] = item.score; });
    return '<div class="heard">' +
      '<div class="heard-top"><div><div class="heard-label">它听见的</div>' +
        '<div class="heard-mood">' + h(mood.name) + '<small>先这么理解</small></div></div>' +
        moodTag(mood.key) +
      '</div>' +
      '<p class="heard-line">' + h(analysis.heard) + '</p>' +
      '<div class="heard-bars">' + D.moodOrder.map(function(key){
        var m = D.mood(key);
        var value = weights[key] || 0;
        var width = clamp(Math.round((value / .9) * 100), 2, 100);
        return '<div class="heard-bar" style="--mood-color:' + m.color + '">' +
          '<span>' + h(m.name) + '</span>' +
          '<span class="hb-line"><span class="hb-fill" style="width:' + width + '%"></span></span>' +
        '</div>';
      }).join('') + '</div>' +
      '<div class="heard-swap"><span class="hs-label">如果听错了</span>' +
        '<button class="mood-chip' + (!override ? ' is-on' : '') + '" type="button" data-mood="">让它自己听</button>' +
        D.moodOrder.map(function(key){
          var m = D.mood(key);
          var on = override ? override === key : analysis.primary === key;
          return '<button class="mood-chip' + (on ? ' is-on' : '') + '" type="button" data-mood="' + key + '" style="--mood-color:' + m.color + '">' + h(m.name) + '</button>';
        }).join('') +
      '</div>' +
    '</div>';
  }

  function musicNameOf(settings){
    if (settings.musicMode === 'upload' && settings.musicData) return '你带来的音乐';
    if (settings.musicMode === 'preset') return D.musicChoice(settings.musicPreset).name;
    return '随感受';
  }

  function settingChipHTML(group, key, name, note, on, mark){
    return '<button class="setting-chip' + (on ? ' is-on' : '') + '" type="button" data-setting="' + group + '" data-value="' + key + '">' +
      (mark || '') +
      '<span class="sc-name">' + h(name) + '</span>' +
      '<span class="sc-note">' + h(note) + '</span>' +
    '</button>';
  }

  function filmSettingsHTML(){
    var settings = state.draft.settings;
    var length = D.length(settings.length);
    var shape = D.shape(settings.shape);
    var quality = D.quality(settings.quality);
    var uploadOn = settings.musicMode === 'upload' && settings.musicData;
    return '<div class="film-settings">' +
      '<div class="block-label"><span>片子的样子</span><span class="bl-aux">多长、什么画幅、多清楚</span></div>' +
      '<div class="setting-groups">' +
        '<div class="setting-group">' +
          '<div class="sg-label">片长</div>' +
          '<div class="setting-options">' + D.lengthOrder.map(function(key){
            var item = D.length(key);
            return settingChipHTML('length', key, item.name, item.note, length.key === key);
          }).join('') + '</div>' +
        '</div>' +
        '<div class="setting-group">' +
          '<div class="sg-label">画幅</div>' +
          '<div class="setting-options">' + D.shapeOrder.map(function(key){
            var item = D.shape(key);
            return settingChipHTML('shape', key, item.name, item.note, shape.key === key,
              '<span class="shape-mark shape-' + key + '"></span>');
          }).join('') + '</div>' +
        '</div>' +
        '<div class="setting-group">' +
          '<div class="sg-label">清晰度</div>' +
          '<div class="setting-options">' + D.qualityOrder.map(function(key){
            var item = D.quality(key);
            return settingChipHTML('quality', key, item.name, item.note, quality.key === key);
          }).join('') + '</div>' +
        '</div>' +
      '</div>' +
      '<div class="music-block">' +
        '<div class="block-label"><span>配乐</span><span class="bl-aux">可以自己选，也可以带来一段</span></div>' +
        '<div class="music-options">' + D.musicChoices.map(function(choice){
          var on = choice.key === 'auto' ? settings.musicMode === 'auto' : (settings.musicMode === 'preset' && settings.musicPreset === choice.key);
          return '<button class="music-chip' + (on ? ' is-on' : '') + '" type="button" data-music-choice="' + choice.key + '">' +
            '<span class="mu-name">' + h(choice.name) + '</span>' +
            '<span class="mu-note">' + h(choice.note) + '</span>' +
          '</button>';
        }).join('') + '</div>' +
        '<div class="music-upload' + (uploadOn ? ' is-on' : '') + '">' +
          '<label class="music-drop">' +
            '<input id="music-input" type="file" accept="audio/*">' +
            '<span class="md-mark">' + icon('sound') + '</span>' +
            '<span class="md-text"><span class="md-main">' + (uploadOn ? '你带来的音乐' : '带来一段自己的音乐') + '</span>' +
              '<span class="md-sub">' + (uploadOn ? '已经放进这一段，导出时会一起带上' : '从这台电脑里选，不会传到别处') + '</span></span>' +
            (uploadOn ? '<span class="md-state">已选</span>' : '') +
          '</label>' +
          (uploadOn ? '<button class="music-clear" type="button" data-music-clear>不用了</button>' : '') +
        '</div>' +
        '<div class="music-status" id="music-status"></div>' +
      '</div>' +
    '</div>';
  }

  function stepMaterialsHTML(){
    var draft = state.draft;
    var analysis = analysisNow();
    var weights = analysis ? analysis.weights : { calm: 1 };
    var suggested = Scenes.suggest(weights, 8);
    var materials = Store.get().materials.slice(0, 8);
    var selected = draft.selected.length;

    return '<section class="panel">' +
      '<h2 class="panel-title">想放进去的画面。</h2>' +
      '<p class="panel-note">有照片或视频就丢进来；没有也没关系，它会从十二段画面里替你挑。<span class="kai">你只需要说「像不像今天」。</span></p>' +
      '<label class="upload-drop" id="upload-drop">' +
        '<span class="ud-icon">' + icon('plus') + '</span>' +
        '<span><span class="ud-main">把照片或视频放在这里</span><span class="ud-sub">一次可以选好几段，也可以什么都不放</span></span>' +
        '<input id="upload-input" type="file" accept="image/*,video/*" multiple>' +
      '</label>' +
      '<div class="upload-status" id="upload-status"></div>' +
      '<div class="material-block">' +
        '<div class="material-head"><h3>它替你挑的画面</h3><p>按这一句的感受挑的</p></div>' +
        '<div class="material-grid">' + suggested.map(function(id){
          var scene = sceneOf(id);
          if (!scene) return '';
          var key = sceneMoodKey(scene);
          var mood = D.mood(key);
          var on = isPicked('scene', id);
          return '<button class="material-card is-suggest' + (on ? ' is-on' : '') + '" type="button" data-pick-kind="scene" data-pick-id="' + h(id) + '" style="--mood-color:' + mood.color + '">' +
            '<span class="mc-art" style="background-image:url(\'' + h(Scenes.thumbnail(id, 480)) + '\')"></span>' +
            '<span class="mc-shade"></span>' +
            '<span class="mc-mood">' + h(mood.name) + '</span>' +
            '<span class="mc-name">' + h(scene.name) + '</span>' +
            '<span class="mc-check">' + icon('check') + '</span>' +
            '<span class="mc-suggest">它挑的</span>' +
          '</button>';
        }).join('') + '</div>' +
        '<div class="material-foot"><span>已选 ' + selected + ' 段</span><span class="mf-hint">不选也可以，它会补齐五到六段。</span></div>' +
      '</div>' +
      (materials.length ? '<div class="material-block">' +
        '<div class="material-head"><h3>你带来的</h3><p>最近八段，旧素材仍在本地</p></div>' +
        '<div class="material-grid">' + materials.map(function(m){
          var mood = D.mood(m.mood || 'calm');
          var on = isPicked('upload', m.id);
          return '<div class="material-card is-upload' + (on ? ' is-on' : '') + '" role="button" tabindex="0" data-pick-kind="upload" data-pick-id="' + h(m.id) + '" style="--mood-color:' + mood.color + '">' +
            '<button class="mc-del" type="button" data-del-material="' + h(m.id) + '" aria-label="删掉这段素材">' + icon('close') + '</button>' +
            '<span class="mc-art" style="background-image:url(\'' + h(m.src) + '\')"></span>' +
            '<span class="mc-shade"></span>' +
            '<span class="mc-mood">' + h(mood.name) + '</span>' +
            '<span class="mc-name">' + h(m.name || '你带来的照片') + '</span>' +
            '<span class="mc-check">' + icon('check') + '</span>' +
          '</div>';
        }).join('') + '</div>' +
        '<div class="material-foot"><span>素材只留在这台电脑里</span><span class="mf-hint">点一下选上，再点一下放下。</span></div>' +
      '</div>' : '') +
      '<div class="template-block">' +
        '<div class="block-label"><span>用哪一种说法</span><span class="bl-aux">决定开头和结尾的语气</span></div>' +
        '<div class="templates">' + D.templateOrder.map(function(key){
          var t = D.template(key);
          var on = draft.template === key;
          return '<button class="template-card' + (on ? ' is-on' : '') + '" type="button" data-template="' + key + '">' +
            '<span class="tc-check">' + icon('check') + '</span>' +
            '<div class="tc-name">' + h(t.name) + '</div>' +
            '<div class="tc-line">' + h(t.sub) + '</div>' +
          '</button>';
        }).join('') + '</div>' +
      '</div>' +
      filmSettingsHTML() +
      studioFootHTML('上一步', '去回答两道问题', 'data-next-step', '不选素材也行，它会替你补。') +
    '</section>';
  }

  function stepQuestionsHTML(){
    var moodKey = currentMoodKey();
    var analysis = analysisNow();
    var mood = D.mood(moodKey);
    var options = answerOptions(moodKey);
    var firstTag = state.draft.answers.firstTag;
    var secondTag = state.draft.answers.secondTag;
    var ready = !!(options.first && options.second);
    var template = D.template(state.draft.template);

    return '<section class="panel">' +
      '<h2 class="panel-title">还有两件事，想确认一下。</h2>' +
      '<p class="panel-note">不是考试。只是有些感受，它不敢替你决定。</p>' +
      '<div class="q-intro">' +
        '<div class="qi-left">它先听见了「' + h(mood.name) + '」。<br>如果不对，可以回到上一步改。</div>' +
        '<div class="qi-tags">' + moodTag(moodKey) + (analysis && analysis.secondary ? moodTag(analysis.secondary) : '') + '</div>' +
      '</div>' +
      '<fieldset class="question">' +
        '<legend><span class="q-no">第一问</span>' + h(options.qs.first.text) + '</legend>' +
        '<div class="choices">' + options.qs.first.options.map(function(opt){
          return '<button class="choice' + (firstTag === opt.tag ? ' is-on' : '') + '" type="button" data-answer="first" data-tag="' + h(opt.tag) + '" aria-pressed="' + (firstTag === opt.tag) + '">' +
            '<span class="ch-mark"></span>' +
            '<span class="ch-label">' + h(opt.label) + '</span>' +
            '<span class="ch-hint">' + h(opt.hint) + '</span>' +
          '</button>';
        }).join('') + '</div>' +
      '</fieldset>' +
      '<fieldset class="question">' +
        '<legend><span class="q-no">第二问</span>' + h(options.qs.second.text) + '</legend>' +
        '<div class="choices">' + options.qs.second.options.map(function(opt){
          return '<button class="choice' + (secondTag === opt.tag ? ' is-on' : '') + '" type="button" data-answer="second" data-tag="' + h(opt.tag) + '" aria-pressed="' + (secondTag === opt.tag) + '">' +
            '<span class="ch-mark"></span>' +
            '<span class="ch-label">' + h(opt.label) + '</span>' +
            '<span class="ch-hint">' + h(opt.hint) + '</span>' +
          '</button>';
        }).join('') + '</div>' +
      '</fieldset>' +
      '<div class="q-summary" id="q-summary">' + qSummaryHTML() + '</div>' +
      '<div class="studio-foot">' +
        '<div class="foot-left"><button class="btn btn-ghost btn-sm" type="button" data-prev-step>上一步</button>' +
          '<span class="foot-note">' + (ready ? '方向清楚了，可以收片。' : '两道都选一下，它才敢动手。') + '</span></div>' +
        '<div class="foot-right"><button class="btn btn-amber" type="button" id="make-film"' + (ready ? '' : ' disabled aria-disabled="true"') + '>收好这一段' + icon('arrow') + '</button></div>' +
      '</div>' +
      '<input type="hidden" id="template-note" value="' + h(template.name) + '">' +
    '</section>';
  }

  function qSummaryHTML(){
    var moodKey = currentMoodKey();
    var mood = D.mood(moodKey);
    var options = answerOptions(moodKey);
    var template = D.template(state.draft.template);
    return '<div class="qs-item"><div class="qs-k">这一天的感受</div><div class="qs-v">' + h(mood.name) + '</div></div>' +
      '<div class="qs-item"><div class="qs-k">说法的样子</div><div class="qs-v">' + h(template.name) + '</div></div>' +
      '<div class="qs-item"><div class="qs-k">片子会去哪里</div><div class="qs-v">' + h(options.second ? options.second.label : '还没定') + '</div></div>';
  }

  function stepDoneHTML(film){
    var still = filmStill(film);
    var mood = D.mood(film.mood);
    var gesture = film.gestureUnlocked ? D.gesture(film.gestureUnlocked) : null;
    var notes = '';
    if (film.healingAdded){
      notes += '<p class="dn-row"><span class="amber">它悄悄留下了 ' + film.healingAdded + ' 片亮着的光</span>，放进了治愈备用片。当时用不上，以后也许需要。</p>';
    } else if (film.healingSeen){
      notes += '<p class="dn-row">今天素材里那几片亮光，它已经替你收着了。<span class="amber">没有重复提醒。</span></p>';
    } else {
      notes += '<p class="dn-row">今天这一段，没有惊动治愈备用片。它只在低落的时候，才替你收起亮处。</p>';
    }
    if (gesture){
      notes += '<p class="dn-row">你学会了「' + h(gesture.name) + '」。<span class="amber">去手势册，看看手怎么讲这句话。</span></p>';
    } else {
      notes += '<p class="dn-row">六式都已经学会了。以后不用它教，你也能自己说出来。</p>';
    }

    return '<section class="panel">' +
      '<h2 class="panel-title">这一段，收好了。</h2>' +
      '<p class="panel-note">片段、配乐、字幕都已经在里面。<span class="kai">你可以现在放一遍，也可以先放着。</span></p>' +
      '<div class="done-card">' +
        '<div class="done-art' + shapeClass(film) + '">' +
          '<img src="' + h(still) + '" alt="这一段片子的静帧">' +
          '<div class="done-title">' + h(film.title) + '</div>' +
          '<div class="done-mood">' + moodTag(film.mood) + '</div>' +
        '</div>' +
        '<div class="done-body">' +
          '<p class="done-line">' + h(film.outro && film.outro.lines && film.outro.lines[0] || film.intro.caption) + '</p>' +
          '<div class="done-facts">' +
            '<span>片长 <b>' + h(U.durationLabel(film.duration)) + '</b></span>' +
            '<span>画面 <b>' + h(film.shots.length + ' 段') + '</b></span>' +
            '<span>画幅 <b>' + h(film.format ? film.format.shapeName : '横屏') + '</b></span>' +
            '<span>清晰度 <b>' + h(film.format ? film.format.qualityName : '正好') + '</b></span>' +
            '<span>配乐 <b>' + h(film.music ? film.music.name : '随感受') + '</b></span>' +
            '<span>说法 <b>' + h(film.templateName) + '</b></span>' +
            '<span>日子 <b>' + h(U.fmtDate(film.dateKey)) + '</b></span>' +
          '</div>' +
          '<div class="done-actions">' +
            '<button class="btn btn-amber" type="button" data-play-film="' + h(film.id) + '">' + icon('play') + '放一遍</button>' +
            '<button class="btn btn-ghost" type="button" data-save-poster="' + h(film.id) + '">' + icon('poster') + '存一张海报</button>' +
            '<button class="btn btn-ghost" type="button" data-save-film="' + h(film.id) + '">' + icon('download') + '存下影片</button>' +
            '<button class="btn btn-ghost" type="button" data-new-draft>再剪一段</button>' +
          '</div>' +
          '<div class="done-note">' + notes + '<p class="dn-row">所有内容只留在这台电脑里。</p></div>' +
        '</div>' +
      '</div>' +
      '<div class="studio-foot"><div class="foot-left"><span class="foot-note">想改一句、换一段，都可以回到前面。</span></div>' +
        '<div class="foot-right"><button class="btn btn-ghost btn-sm" type="button" data-go="library">去片库看看</button></div></div>' +
    '</section>';
  }

  function studioAsideHTML(){
    var draft = state.draft;
    var analysis = analysisNow();
    var moodKey = analysis ? analysis.primary : '';
    var template = D.template(draft.template);
    var options = answerOptions(moodKey || 'calm');
    var pickCount = draft.selected.length;
    var film = draft.step === 3 ? validDoneFilm() : null;
    var caption = '';
    if (film) caption = film.title;
    else if (draft.sentence.trim()) caption = (U.shortClauses(draft.sentence)[0] || draft.sentence).slice(0, 26);
    else caption = '一段还没有开始的光';

    var moodCell = analysis
      ? '<b class="aside-moods">' + moodTag(analysis.primary) + (analysis.secondary ? moodTag(analysis.secondary) : '') + '</b>'
      : '<b>还没听见</b>';
    var materialCell = pickCount ? '<b>已选 ' + pickCount + ' 段</b>' : '<b>让它来补</b>';
    var whereCell = options.second ? '<b>' + h(options.second.label) + '</b>' : '<b>还没定</b>';
    var settings = draft.settings;
    var formCell = '<b>' + h(D.length(settings.length).name + ' · ' + D.shape(settings.shape).name + ' · ' + D.quality(settings.quality).name) + '</b>';
    var note = analysis ? D.mood(analysis.primary).note : '它不催你。等你写好一句，它才开始看素材。';

    return '<div class="aside-card">' +
      '<div class="aside-mini"><canvas id="aside-canvas" width="640" height="360"></canvas>' +
        '<p class="am-caption">' + h(caption) + '</p></div>' +
      '<div class="aside-body">' +
        '<div class="aside-label">正在剪的</div>' +
        '<p class="aside-sentence">' + h(draft.sentence.trim() || '还没有一句具体的话。') + '</p>' +
        '<div class="aside-rows">' +
          '<div class="aside-row"><span>感受</span>' + moodCell + '</div>' +
          '<div class="aside-row"><span>说法</span><b>' + h(template.name) + '</b></div>' +
          '<div class="aside-row"><span>样子</span>' + formCell + '</div>' +
          '<div class="aside-row"><span>素材</span>' + materialCell + '</div>' +
          '<div class="aside-row"><span>去向</span>' + whereCell + '</div>' +
        '</div>' +
        '<p class="aside-note">' + h(note) + '</p>' +
      '</div>' +
    '</div>';
  }

  function bindStudio(){
    var stepper = document.getElementById('stepper-slot');
    if (stepper){
      stepper.addEventListener('click', function(e){
        var item = e.target.closest('[data-step-go]');
        if (!item || item.hasAttribute('disabled')) return;
        setStudioStep(Number(item.getAttribute('data-step-go')));
      });
      stepper.addEventListener('keydown', function(e){
        if (e.key !== 'Enter' && e.key !== ' ') return;
        var item = e.target.closest('[data-step-go]');
        if (!item || item.hasAttribute('disabled')) return;
        e.preventDefault();
        setStudioStep(Number(item.getAttribute('data-step-go')));
      });
    }
    bindStudioPanel();
    paintAside();
  }

  function bindStudioPanel(){
    var step = state.draft.step;
    var prev = view.querySelector('[data-prev-step]');
    var next = view.querySelector('[data-next-step]');
    if (prev) prev.addEventListener('click', function(){
      if (step <= 0){ navigate('home'); return; }
      setStudioStep(step - 1);
    });
    if (next) next.addEventListener('click', function(){
      if (next.hasAttribute('disabled')) return;
      setStudioStep(Math.min(3, step + 1));
    });
    if (step === 0) bindSentenceStep();
    else if (step === 1) bindMaterialsStep();
    else if (step === 2) bindQuestionsStep();
    else if (step === 3) bindDoneStep();
  }

  function bindSentenceStep(){
    var input = document.getElementById('sentence-input');
    var heardSlot = document.getElementById('heard-slot');
    var next = view.querySelector('[data-next-step]');
    if (!input) return;

    function syncReady(){
      var ready = sentenceReady(state.draft.sentence);
      var count = document.getElementById('sf-count');
      var status = document.getElementById('sf-state');
      if (count) count.textContent = state.draft.sentence.length + ' 字';
      if (status){
        status.textContent = ready ? '它听见了' : '还没落笔';
        status.classList.toggle('is-on', ready);
      }
      if (next){
        next.disabled = !ready;
        if (ready) next.removeAttribute('aria-disabled');
        else next.setAttribute('aria-disabled', 'true');
      }
    }

    function refreshHeard(){
      if (!heardSlot) return;
      heardSlot.innerHTML = heardHTML(analysisNow());
    }

    var saveTimer = 0;
    input.addEventListener('input', function(){
      state.draft.sentence = input.value.slice(0, 120);
      state.draft.doneId = '';
      if (state.draft.step > 2) state.draft.step = 0;
      saveTimer && clearTimeout(saveTimer);
      saveTimer = setTimeout(saveDraft, 320);
      syncReady();
      refreshHeard();
      reconcileAnswers(currentMoodKey());
      scheduleAside();
      updateStepper();
    });

    U.$$('[data-sample]').forEach(function(chip){
      chip.addEventListener('click', function(){
        input.value = chip.getAttribute('data-sample') || '';
        input.dispatchEvent(new Event('input', { bubbles: true }));
        input.focus();
      });
    });

    if (heardSlot){
      heardSlot.addEventListener('click', function(e){
        var chip = e.target.closest('.mood-chip');
        if (!chip) return;
        var key = chip.getAttribute('data-mood') || '';
        state.draft.moodOverride = D.mood(key) ? key : '';
        reconcileAnswers(currentMoodKey());
        saveDraft();
        refreshHeard();
        scheduleAside();
        updateStepper();
      });
    }
    syncReady();
  }

  function bindMaterialsStep(){
    var drop = document.getElementById('upload-drop');
    var fileInput = document.getElementById('upload-input');
    var status = document.getElementById('upload-status');

    if (drop && fileInput){
      drop.addEventListener('dragover', function(e){
        e.preventDefault();
        drop.classList.add('is-over');
      });
      drop.addEventListener('dragleave', function(){ drop.classList.remove('is-over'); });
      drop.addEventListener('drop', function(e){
        e.preventDefault();
        drop.classList.remove('is-over');
        handleUploads(e.dataTransfer && e.dataTransfer.files, status);
      });
      fileInput.addEventListener('change', function(){
        handleUploads(fileInput.files, status);
        fileInput.value = '';
      });
    }

    U.$$('[data-pick-kind]').forEach(function(card){
      function toggle(){
        var kind = card.getAttribute('data-pick-kind');
        var id = card.getAttribute('data-pick-id');
        if (isPicked(kind, id)) dropPick(kind, id);
        else addPick(kind, id);
        saveDraft();
        refreshStudio(false);
      }
      card.addEventListener('click', function(e){
        if (e.target.closest('[data-del-material]')) return;
        toggle();
      });
      card.addEventListener('keydown', function(e){
        if (card.getAttribute('role') !== 'button') return;
        if (e.key !== 'Enter' && e.key !== ' ') return;
        e.preventDefault();
        toggle();
      });
    });

    U.$$('[data-del-material]').forEach(function(btn){
      btn.addEventListener('click', function(e){
        e.stopPropagation();
        var id = btn.getAttribute('data-del-material');
        var material = Store.getMaterial(id);
        if (!material) return;
        askRemoveMaterial(material);
      });
    });

    U.$$('[data-template]').forEach(function(btn){
      btn.addEventListener('click', function(){
        state.draft.template = btn.getAttribute('data-template');
        saveDraft();
        U.$$('[data-template]').forEach(function(other){
          other.classList.toggle('is-on', other === btn);
        });
        scheduleAside();
      });
    });

    U.$$('[data-setting]').forEach(function(btn){
      btn.addEventListener('click', function(){
        var group = btn.getAttribute('data-setting');
        var value = btn.getAttribute('data-value');
        var settings = state.draft.settings;
        var valid = false;
        if (group === 'length'){ valid = !!D.length(value); }
        else if (group === 'shape'){ valid = !!D.shape(value); }
        else if (group === 'quality'){ valid = !!D.quality(value); }
        if (!valid) return;
        settings[group] = value;
        saveDraft();
        U.$$('[data-setting="' + group + '"]').forEach(function(other){
          other.classList.toggle('is-on', other === btn);
        });
        scheduleAside();
      });
    });

    U.$$('[data-music-choice]').forEach(function(btn){
      btn.addEventListener('click', function(){
        var choice = D.musicChoice(btn.getAttribute('data-music-choice'));
        var settings = state.draft.settings;
        if (choice.key === 'auto'){
          settings.musicMode = 'auto';
        } else {
          settings.musicMode = 'preset';
          settings.musicPreset = choice.key;
        }
        settings.musicData = '';
        settings.musicName = '';
        Store.clearDraftAudio();
        saveDraft();
        refreshStudio(false);
      });
    });

    var musicInput = document.getElementById('music-input');
    if (musicInput){
      musicInput.addEventListener('change', function(){
        var file = musicInput.files && musicInput.files[0];
        musicInput.value = '';
        if (file) handleMusicUpload(file);
      });
    }
    var musicClear = document.querySelector('[data-music-clear]');
    if (musicClear){
      musicClear.addEventListener('click', function(){
        var settings = state.draft.settings;
        settings.musicMode = 'auto';
        settings.musicData = '';
        settings.musicName = '';
        Store.clearDraftAudio();
        saveDraft();
        refreshStudio(false);
        toast('换回它替你配的声音。');
      });
    }
  }

  function handleMusicUpload(file){
    var status = document.getElementById('music-status');
    function say(text){ if (status) status.textContent = text; }
    if (!file) return;
    if (file.size > 12 * 1024 * 1024){
      say('这段音乐有点大，换一段小一点的试试。');
      return;
    }
    if (file.type && file.type.indexOf('audio/') !== 0){
      say('这好像不是一段声音，换一段试试。');
      return;
    }
    say('正在把这段音乐放进来……');
    U.readFile(file, true).then(function(data){
      return probeAudio(data).then(function(duration){
        if (duration && duration < 1) throw new Error('太短了');
        var settings = state.draft.settings;
        settings.musicMode = 'upload';
        settings.musicName = '你带来的音乐';
        settings.musicData = data;
        Store.setDraftAudio({ data: data, name: '你带来的音乐' });
        saveDraft();
        refreshStudio(false);
        toast('音乐放好了，会和画面一起收进片子。');
      });
    }).catch(function(){
      say('这段声音暂时放不进来，换一段试试。');
    });
  }

  function probeAudio(data){
    return new Promise(function(resolve, reject){
      var probe = new Audio();
      var timer = setTimeout(function(){ cleanup(); reject(new Error('等不到声音')); }, 6000);
      function cleanup(){
        clearTimeout(timer);
        probe.onloadedmetadata = null;
        probe.onerror = null;
        probe.removeAttribute('src');
        try{ probe.load(); }catch(e){}
      }
      probe.preload = 'metadata';
      probe.onloadedmetadata = function(){
        var duration = probe.duration;
        cleanup();
        resolve(isFinite(duration) ? duration : 0);
      };
      probe.onerror = function(){
        cleanup();
        reject(new Error('读不进来'));
      };
      probe.src = data;
    });
  }

  function setUploadStatus(text){
    var status = document.getElementById('upload-status');
    if (status) status.textContent = text || '';
  }

  function handleUploads(files, statusEl){
    if (state.uploading) return;
    var list = Array.prototype.slice.call(files || []).slice(0, 9);
    if (!list.length) return;
    state.uploading = true;
    if (statusEl) statusEl.textContent = '正在看这些素材……';
    var added = 0;
    var failed = 0;
    var photos = 0;
    var chain = Promise.resolve();

    list.forEach(function(file){
      chain = chain.then(function(){
        if (U.isImageFile(file)){
          return processPhoto(file).then(function(material){
            if (material){ added++; photos++; }
          }).catch(function(){ failed++; });
        }
        if (U.isVideoFile(file)){
          return processVideo(file).then(function(materials){
            added += materials.length;
          }).catch(function(){ failed++; });
        }
        failed++;
      });
    });

    chain.then(function(){
      state.uploading = false;
      if (statusEl) statusEl.textContent = added ? '收好了，往下挑也行。' : '';
      if (added) toast('收好了 ' + added + ' 段素材。');
      if (failed) toast('有 ' + failed + ' 段暂时放不进来。');
      refreshStudio(false);
    }).catch(function(){
      state.uploading = false;
      if (statusEl) statusEl.textContent = '';
      toast('这些素材暂时放不进来，换一段试试。');
    });
  }

  function uploadFallback(moodKey){
    var ids = Scenes.suggest((function(){ var w = {}; w[moodKey] = 1; return w; })(), 1);
    return ids[0] || 'morning-fog';
  }

  function processPhoto(file){
    return U.readFile(file, true).then(function(src){
      return U.loadImage(src).then(function(img){
        var mood = Scenes.inferMood(img);
        var data = U.compressImage(img, 1280, .82);
        var total = Store.get().materials.filter(function(m){ return m.kind === 'upload'; }).length + 1;
        var material = {
          id: U.uid('m'),
          kind: 'upload',
          src: data,
          mood: mood,
          fallback: uploadFallback(mood),
          name: '你带来的第 ' + zhNum(total) + ' 张照片',
          createdAt: new Date().toISOString()
        };
        Store.addMaterial(material);
        addPick('upload', material.id);
        return material;
      });
    });
  }

  function processVideo(file){
    return Scenes.extractVideoFrames(file).then(function(frames){
      return Promise.all(frames.map(function(frame, i){
        return U.loadImage(frame.src).then(function(img){
          var mood = Scenes.inferMood(img);
          var material = {
            id: U.uid('m'),
            kind: 'upload',
            src: frame.src,
            mood: mood,
            fallback: uploadFallback(mood),
            name: '影片里的一帧' + (frames.length > 1 ? ' · 其' + zhNum(i + 1) : ''),
            createdAt: new Date().toISOString()
          };
          Store.addMaterial(material);
          addPick('upload', material.id);
          return material;
        });
      }));
    });
  }

  function askRemoveMaterial(material){
    openModal({
      title: '把这段素材放下？',
      sub: '只会从本地素材里删掉',
      body: '<p>「' + h(material.name || '这段素材') + '」会从素材里删掉。已经剪进片子的，不会受影响。</p>',
      actions: [
        { label: '还留着', kind: 'ghost' },
        { label: '删掉', kind: 'amber', onClick: function(){
          Store.removeMaterial(material.id);
          dropPick('upload', material.id);
          saveDraft();
          toast('删掉了，不留在素材里。');
          refreshStudio(false);
        } }
      ]
    });
  }

  function bindQuestionsStep(){
    U.$$('[data-answer]').forEach(function(btn){
      btn.addEventListener('click', function(){
        var which = btn.getAttribute('data-answer');
        var tag = btn.getAttribute('data-tag');
        if (which === 'first') state.draft.answers.firstTag = tag;
        else state.draft.answers.secondTag = tag;
        saveDraft();
        U.$$('[data-answer="' + which + '"]').forEach(function(other){
          var on = other === btn;
          other.classList.toggle('is-on', on);
          other.setAttribute('aria-pressed', on ? 'true' : 'false');
        });
        var summary = document.getElementById('q-summary');
        if (summary) summary.innerHTML = qSummaryHTML();
        var make = document.getElementById('make-film');
        if (make){
          var ready = !!(answerOptions(currentMoodKey()).first && answerOptions(currentMoodKey()).second);
          make.disabled = !ready;
          if (ready) make.removeAttribute('aria-disabled');
          else make.setAttribute('aria-disabled', 'true');
        }
        scheduleAside();
      });
    });
    var make = document.getElementById('make-film');
    if (make) make.addEventListener('click', function(){ startGeneration(); });
  }

  function bindDoneStep(){
    var film = validDoneFilm();
    if (!film) return;
    U.$$('[data-play-film="' + film.id + '"]').forEach(function(btn){
      btn.addEventListener('click', function(){ openTheater(film); });
    });
    U.$$('[data-save-poster="' + film.id + '"]').forEach(function(btn){
      btn.addEventListener('click', function(){ savePoster(film); });
    });
    U.$$('[data-save-film="' + film.id + '"]').forEach(function(btn){
      btn.addEventListener('click', function(){ startExport(film); });
    });
    U.$$('[data-new-draft]').forEach(function(btn){
      btn.addEventListener('click', function(){
        resetDraft();
        refreshStudio(true);
        toast('换一页，重新开始。');
      });
    });
  }

  function setStudioStep(step){
    var draft = state.draft;
    step = clamp(Number(step) || 0, 0, 3);
    if (step > 0 && !sentenceReady(draft.sentence)){
      toast('先写一句今天大概的样子。');
      return;
    }
    if (step === 3 && !validDoneFilm()){
      toast('先把这一段落下来。');
      return;
    }
    draft.step = step;
    saveDraft();
    refreshStudio(true);
  }

  function refreshStudio(scrollToTop){
    if (state.route !== 'studio') return;
    var panel = document.getElementById('studio-main');
    if (panel){
      panel.innerHTML = studioPanelHTML();
      bindStudioPanel();
    }
    updateStepper();
    refreshAside();
    if (scrollToTop) window.scrollTo({ top: 0, behavior: U.reduceMotion() ? 'auto' : 'smooth' });
  }

  function updateStepper(){
    var slot = document.getElementById('stepper-slot');
    if (!slot) return;
    slot.innerHTML = stepperHTML();
  }

  function refreshAside(){
    var aside = document.getElementById('studio-aside');
    if (!aside) return;
    aside.innerHTML = studioAsideHTML();
    paintAside();
  }

  var asideTimer = 0;
  function scheduleAside(){
    clearTimeout(asideTimer);
    asideTimer = setTimeout(refreshAside, 180);
  }

  function paintAside(){
    var canvas = document.getElementById('aside-canvas');
    if (!canvas) return;
    var ctx = canvas.getContext('2d');
    var w = canvas.width, h = canvas.height;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, w, h);

    var film = state.draft.step === 3 ? validDoneFilm() : null;
    if (film && film.still){
      U.loadImage(film.still).then(function(img){
        if (!canvas.isConnected) return;
        coverDraw(ctx, img, w, h);
      }).catch(function(){});
      return;
    }

    var ref = null;
    state.draft.selected.some(function(item){
      if (item.kind === 'scene'){ ref = { kind: 'scene', id: item.id }; return true; }
      var m = Store.getMaterial(item.id);
      if (m){ ref = { kind: 'upload', id: m.id, fallback: m.fallback }; return true; }
      return false;
    });
    if (!ref){
      var ids = Scenes.suggest(analysisNow() ? analysisNow().weights : { calm: 1 }, 1);
      ref = { kind: 'scene', id: ids[0] || 'dusk-window' };
    }
    if (ref.kind === 'upload'){
      var material = Store.getMaterial(ref.id);
      if (material && material.src){
        Scenes.loadImage(material.src).then(function(){
          if (canvas.isConnected) Scenes.drawSource(ctx, ref, w, h, 2.2);
        }).catch(function(){
          if (canvas.isConnected) Scenes.drawSource(ctx, ref, w, h, 2.2);
        });
        return;
      }
    }
    Scenes.drawSource(ctx, ref, w, h, 2.2);
  }

  function coverDraw(ctx, img, w, h){
    var iw = img.naturalWidth || img.width;
    var ih = img.naturalHeight || img.height;
    if (!iw || !ih) return;
    var scale = Math.max(w / iw, h / ih);
    var dw = iw * scale, dh = ih * scale;
    ctx.drawImage(img, (w - dw) / 2, (h - dh) / 2, dw, dh);
  }

  /* ---------------- 剪片：把选择变成一段片子 ---------------- */
  function buildRecipe(){
    var draft = state.draft;
    var analysis = analysisNow();
    if (!analysis || !sentenceReady(draft.sentence)) return null;
    var moodKey = analysis.primary;
    var options = answerOptions(moodKey);
    if (!options.first || !options.second) return null;

    var selectedMaterials = draft.selected.map(function(ref){
      if (ref.kind === 'scene') return { kind: 'scene', id: ref.id };
      return Store.getMaterial(ref.id);
    }).filter(Boolean);

    var materialPool = Scenes.list.map(function(scene){
      return { kind: 'scene', id: scene.id };
    }).concat(Store.get().materials.map(function(m){ return m; }));

    var settings = draft.settings;
    var music;
    if (settings.musicMode === 'upload' && settings.musicData){
      music = { mode: 'upload', data: settings.musicData };
    } else if (settings.musicMode === 'preset'){
      music = { mode: 'preset', key: settings.musicPreset };
    } else {
      music = { mode: 'auto' };
    }

    return F.recipe({
      analysis: analysis,
      sentence: analysis.sentence,
      mood: moodKey,
      template: draft.template,
      answers: { first: options.first, second: options.second },
      materials: selectedMaterials,
      materialPool: materialPool,
      lengthKey: settings.length,
      shapeKey: settings.shape,
      qualityKey: settings.quality,
      music: music,
      dateKey: U.todayKey(),
      id: U.uid('f'),
      createdAt: new Date().toISOString()
    });
  }

  function startGeneration(){
    if (activeGeneration) return;
    var recipe = buildRecipe();
    if (!recipe){
      toast('还差一点信息，再看看前面的两步。');
      return;
    }

    var stillPromise = Scenes.warmRecipe(recipe).then(function(){
      return Film.stillDataURL(recipe, Math.min(2.4, recipe.duration * .35), 800);
    });

    var frames = recipe.shots.map(function(shot){
      var src = sourceThumb(shot.ref, 240);
      return '<div class="gen-frame" style="background-image:url(\'' + h(src) + '\');background-size:cover;background-position:center"></div>';
    }).join('');
    var veil = document.createElement('div');
    veil.className = 'gen-veil';
    veil.id = 'gen-veil';
    veil.innerHTML = '<div class="gen-card">' +
      '<p class="gen-kicker">正在把这一句剪成片</p>' +
      '<h2 class="gen-title">先别动，它在看素材。</h2>' +
      '<p class="gen-stage" id="gen-stage">听见了「' + h(recipe.moodName) + '」。</p>' +
      '<div class="gen-strip" id="gen-strip">' + frames + '</div>' +
      '<div class="gen-progress"><span class="gp-fill" id="gp-fill"></span></div>' +
      '<ol class="gen-stages" id="gen-stages">' +
        '<li class="is-on">分辨情绪</li><li>挑画面</li><li>配声音</li><li>写字幕</li>' +
      '</ol>' +
    '</div>';
    document.body.appendChild(veil);
    document.body.classList.add('gen-open');

    var timers = [];
    var frameEls = U.$$('.gen-frame', veil);
    frameEls.forEach(function(el, i){
      timers.push(setTimeout(function(){ el.classList.add('is-in'); }, 420 + i * 460));
    });
    var fill = document.getElementById('gp-fill');
    var stages = U.$$('#gen-stages li');
    var stageText = document.getElementById('gen-stage');
    function setProgress(pct, stageIndex, text){
      if (fill) fill.style.width = pct + '%';
      if (text && stageText) stageText.textContent = text;
      if (stageIndex != null){
        stages.forEach(function(li, i){
          li.classList.toggle('is-on', i === stageIndex);
          li.classList.toggle('is-done', i < stageIndex);
        });
      }
    }
    timers.push(setTimeout(function(){ setProgress(34, 1, '在素材里挑了几段。'); }, 1100));
    timers.push(setTimeout(function(){ setProgress(62, 2, '配一段慢慢呼吸的声音。'); }, 2200));
    timers.push(setTimeout(function(){ setProgress(84, 3, '把想说的话写成字幕。'); }, 3200));
    timers.push(setTimeout(function(){ setProgress(96, 4, '快好了。'); }, 4100));

    var minWait = new Promise(function(resolve){ setTimeout(resolve, 4700); });
    activeGeneration = { veil: veil, timers: timers };

    Promise.all([stillPromise, minWait]).then(function(res){
      var still = res[0];
      var healing = recipe.healingPicks.length ? Store.addHealing(recipe.healingPicks, recipe.id) : { added: [], seen: [] };
      var gestureKey = Store.unlockGesture(recipe.gestureKey, recipe.id);
      var film = Object.assign({}, recipe, {
        still: still,
        healingAdded: healing.added.length,
        healingSeen: healing.seen.length,
        gestureUnlocked: gestureKey || '',
        healingPicks: []
      });
      Store.addFilm(film);
      state.draft.step = 3;
      state.draft.doneId = film.id;
      saveDraft();
      closeGeneration();
      refreshStudio(true);
      renderTopbarMeta();
      toast('这一段，收好了。');
    }).catch(function(){
      closeGeneration();
      toast('刚才没剪成，再试一次。');
    });
  }

  function closeGeneration(){
    if (!activeGeneration) return;
    activeGeneration.timers.forEach(function(t){ clearTimeout(t); });
    if (activeGeneration.veil && activeGeneration.veil.parentNode){
      activeGeneration.veil.parentNode.removeChild(activeGeneration.veil);
    }
    document.body.classList.remove('gen-open');
    activeGeneration = null;
  }

  /* ---------------- 片库 ---------------- */
  function filmCardHTML(film){
    var mood = D.mood(film.mood);
    return '<article class="film-card' + (state.libNewId === film.id ? ' is-new' : '') + '" data-film-open="' + h(film.id) + '" tabindex="0" role="button">' +
      '<div class="film-poster' + shapeClass(film) + '"><img src="' + h(filmStill(film)) + '" alt="' + h(film.title) + ' 的静帧">' +
        '<span class="fp-play" aria-hidden="true">' + icon('play') + '</span>' +
        '<span class="fp-duration">' + h(U.timecode(film.duration || 0)) + '</span>' +
      '</div>' +
      '<div class="film-info">' +
        '<div class="fi-top">' + moodTag(film.mood) + '<span class="fp-duration" style="position:static;background:none;color:var(--ivory-dim)">' + h(U.fmtMd(film.dateKey)) + '</span></div>' +
        '<h3>' + h(film.title) + '</h3>' +
        '<p class="fi-date">' + h(U.fmtDate(film.dateKey)) + ' · ' + h(film.templateName) + '</p>' +
        '<p class="fi-line">' + h((film.outro && film.outro.lines && film.outro.lines[0]) || (film.intro && film.intro.caption) || '') + '</p>' +
        '<span class="fi-mood" style="--mood-color:' + mood.color + '">' + h(mood.name) + '</span>' +
      '</div>' +
    '</article>';
  }

  function renderLibrary(){
    var films = Store.get().films;
    var filters = [{ key: 'all', name: '全部', count: films.length }].concat(D.moodOrder.map(function(key){
      return {
        key: key,
        name: D.mood(key).name,
        count: films.filter(function(f){ return f.mood === key; }).length
      };
    }));
    var shown = state.libFilter === 'all' ? films : films.filter(function(f){ return f.mood === state.libFilter; });

    return '<div class="page"><div class="library-wrap">' +
      '<div class="page-head"><div><h1>片库</h1><p class="page-sub">每一段都在这里。你可以重新打开，也可以第一次看它。</p></div>' +
        '<div class="head-side"><strong>' + h(films.length + ' 段') + '</strong><span>本地留存</span></div></div>' +
      '<div class="lib-bar">' +
        '<div class="filters">' + filters.map(function(f){
          return '<button class="filter' + (state.libFilter === f.key ? ' is-on' : '') + '" type="button" data-filter="' + f.key + '">' +
            h(f.name) + '<span class="f-count">' + f.count + '</span></button>';
        }).join('') + '</div>' +
        '<span class="lib-sort">按剪好的时候排</span>' +
      '</div>' +
      (shown.length
        ? '<div class="film-grid">' + shown.map(filmCardHTML).join('') + '</div>'
        : '<div class="empty-state"><div class="es-mark">' + icon('film') + '</div>' +
            '<h2>' + (films.length ? '这一种感受，还没有片。' : '片库还是空的。') + '</h2>' +
            '<p>' + (films.length ? '换一个感受看看，或者现在剪一段。' : '说出今天大概的样子，它会替你剪成一段。') + '</p>' +
            '<button class="btn btn-amber" type="button" data-go="studio">开始剪一段</button></div>') +
    '</div></div>';
  }

  function bindLibrary(){
    U.$$('[data-filter]').forEach(function(btn){
      btn.addEventListener('click', function(){
        state.libFilter = btn.getAttribute('data-filter');
        state.libNewId = '';
        renderRoute('library', true);
      });
    });
    U.$$('[data-film-open]').forEach(function(card){
      function open(){
        var film = Store.getFilm(card.getAttribute('data-film-open'));
        if (film) openTheater(film);
      }
      card.addEventListener('click', open);
      card.addEventListener('keydown', function(e){
        if (e.key === 'Enter' || e.key === ' '){ e.preventDefault(); open(); }
      });
    });
    state.libNewId = '';
  }

  /* ---------------- 情绪日历 ---------------- */
  function monthAnchor(){
    if (!state.calMonth){
      var now = new Date();
      state.calMonth = { year: now.getFullYear(), month: now.getMonth() + 1 };
    }
    return state.calMonth;
  }

  function renderCalendar(){
    var anchor = monthAnchor();
    var films = Store.get().films;
    var byDay = {};
    films.forEach(function(film){
      (byDay[film.dateKey] = byDay[film.dateKey] || []).push(film);
    });
    var days = U.daysInMonth(anchor.year, anchor.month);
    var first = new Date(anchor.year, anchor.month - 1, 1);
    var lead = (first.getDay() + 6) % 7;
    var today = U.todayKey();
    var monthFilms = films.filter(function(f){
      var d = U.parseKey(f.dateKey);
      return d && d.getFullYear() === anchor.year && d.getMonth() + 1 === anchor.month;
    });
    var monthCounts = Store.countMoods(monthFilms);
    var monthMoods = D.moodOrder.map(function(key){
      return { key: key, name: D.mood(key).name, count: monthCounts[key] || 0 };
    });
    var cells = [];
    var prevMonth = anchor.month === 1 ? { year: anchor.year - 1, month: 12 } : { year: anchor.year, month: anchor.month - 1 };
    var nextMonth = anchor.month === 12 ? { year: anchor.year + 1, month: 1 } : { year: anchor.year, month: anchor.month + 1 };
    var prevDays = U.daysInMonth(prevMonth.year, prevMonth.month);
    var prevKey = function(day){ return prevMonth.year + '-' + pad2(prevMonth.month) + '-' + pad2(day); };
    var nextKey = function(day){ return nextMonth.year + '-' + pad2(nextMonth.month) + '-' + pad2(day); };

    for (var i = 0; i < lead; i++){
      var pday = prevDays - lead + i + 1;
      cells.push({ day: pday, out: true, key: prevKey(pday), films: byDay[prevKey(pday)] || [] });
    }
    for (var d = 1; d <= days; d++){
      var key = anchor.year + '-' + pad2(anchor.month) + '-' + pad2(d);
      cells.push({ day: d, out: false, key: key, films: byDay[key] || [], today: key === today });
    }
    while (cells.length % 7 !== 0){
      var nday = cells.length - lead - days + 1;
      cells.push({ day: nday, out: true, key: nextKey(nday), films: byDay[nextKey(nday)] || [] });
    }

    var selected = state.calSelected;
    if (selected){
      var sd = U.parseKey(selected);
      if (!sd || sd.getFullYear() !== anchor.year || sd.getMonth() + 1 !== anchor.month){
        selected = '';
        state.calSelected = '';
      }
    }
    var selectedFilms = selected ? (byDay[selected] || []) : [];
    var topMoods = monthMoods.sort(function(a, b){ return b.count - a.count; }).filter(function(m){ return m.count > 0; });

    return '<div class="page"><div class="calendar-wrap">' +
      '<div class="cal-main">' +
        '<div class="page-head"><div><h1>情绪日历</h1><p class="page-sub">不是打卡，只是回头看看，哪几天你替自己留下过一段。</p></div>' +
          '<div class="head-side"><strong>' + h(monthFilms.length + ' 段') + '</strong><span>这个月</span></div></div>' +
        '<div class="cal-top">' +
          '<div class="cal-month">' + h(U.fmtMonth(new Date(anchor.year, anchor.month - 1, 1))) + '<small>' + h(monthFilms.length ? '这个月有 ' + monthFilms.length + ' 段被留了下来。' : '这个月还很安静。') + '</small></div>' +
          '<div class="cal-nav">' +
            '<button class="icon-btn" type="button" data-cal-nav="-1" aria-label="上个月">' + icon('left') + '</button>' +
            '<button class="icon-btn" type="button" data-cal-nav="0" aria-label="回到这个月">' + icon('calendar') + '</button>' +
            '<button class="icon-btn" type="button" data-cal-nav="1" aria-label="下个月">' + icon('right') + '</button>' +
          '</div>' +
        '</div>' +
        '<div class="cal-grid">' + WEEK_HEADS.map(function(w){ return '<div class="cal-head">' + w + '</div>'; }).join('') +
          cells.map(function(cell){
            var dots = cell.films.slice(0, 4).map(function(f){
              return '<i style="background:' + D.mood(f.mood).color + '"></i>';
            }).join('');
            var selectedCell = selected === cell.key;
            return '<button class="cal-cell' + (cell.out ? ' is-out' : '') + (cell.today ? ' is-today' : '') + (selectedCell ? ' is-selected' : '') + '" type="button" data-cal-day="' + h(cell.key) + '"' + (cell.films.length ? '' : ' aria-label="' + h(U.fmtDate(cell.key)) + '，没有留下片子"') + '>' +
              '<span class="cc-day">' + cell.day + '</span>' +
              (cell.films.length ? '<span class="cc-count">' + cell.films.length + ' 段</span><span class="cal-dots">' + dots + '</span>' : '') +
            '</button>';
          }).join('') +
        '</div>' +
        '<div class="cal-legend">' + D.moodOrder.map(function(key){
          var m = D.mood(key);
          return '<span><i style="display:inline-block;width:7px;height:7px;border-radius:50%;background:' + m.color + ';margin-right:7px"></i>' + h(m.name) + '</span>';
        }).join('') + '</div>' +
      '</div>' +
      '<aside class="cal-side">' +
        '<h3>' + (selected ? h(U.fmtDate(selected)) : '这个月的样子') + '</h3>' +
        '<p class="cs-sub">' + (selected ? (selectedFilms.length ? '这一天留下了 ' + selectedFilms.length + ' 段。' : '这一天没有留下片子。') : (topMoods.length ? '出现得最多的，是「' + topMoods[0].name + '」。' : '还没有足够的片段，来画出一个样子。')) + '</p>' +
        (selected
          ? (selectedFilms.length
              ? selectedFilms.map(function(film){
                  return '<button class="cal-entry" type="button" data-film-open="' + h(film.id) + '">' +
                    '<span class="ce-thumb" style="background-image:url(\'' + h(filmStill(film)) + '\');background-size:cover;background-position:center;display:block"></span>' +
                    '<span class="ce-body"><span class="ce-title">' + h(film.title) + '</span><span class="ce-meta">' + h(D.mood(film.mood).name) + ' · ' + h(U.durationLabel(film.duration || 0)) + '</span></span>' +
                  '</button>';
                }).join('')
              : '<div class="cs-empty">这一天没有片子。想补一段，也可以。</div>')
          : '<div class="cal-summary">' + (topMoods.length
              ? topMoods.slice(0, 6).map(function(m){
                  return '<div class="cal-summary-row"><span>' + h(m.name) + '</span><span>' + h(m.count + ' 段') + '</span></div>';
                }).join('')
              : '<div class="cs-empty">说一句话，日历就会慢慢有颜色。</div>') + '</div>') +
        '<div style="margin-top:22px"><button class="btn btn-amber btn-block" type="button" data-go="studio">现在剪一段</button></div>' +
      '</aside>' +
    '</div></div>';
  }

  function pad2(n){ return (n < 10 ? '0' : '') + n; }

  function bindCalendar(){
    U.$$('[data-cal-nav]').forEach(function(btn){
      btn.addEventListener('click', function(){
        var dir = Number(btn.getAttribute('data-cal-nav'));
        if (dir === 0){
          var now = new Date();
          state.calMonth = { year: now.getFullYear(), month: now.getMonth() + 1 };
          state.calSelected = U.todayKey();
        } else {
          var anchor = monthAnchor();
          var date = new Date(anchor.year, anchor.month - 1 + dir, 1);
          state.calMonth = { year: date.getFullYear(), month: date.getMonth() + 1 };
          state.calSelected = '';
        }
        renderRoute('calendar', true);
      });
    });
    U.$$('[data-cal-day]').forEach(function(cell){
      cell.addEventListener('click', function(){
        state.calSelected = cell.getAttribute('data-cal-day');
        renderRoute('calendar', true);
      });
    });
    U.$$('[data-film-open]').forEach(function(btn){
      btn.addEventListener('click', function(){
        var film = Store.getFilm(btn.getAttribute('data-film-open'));
        if (film) openTheater(film);
      });
    });
  }

  /* ---------------- 治愈备用片 ---------------- */
  function renderHealing(){
    var items = Store.get().healing.slice().sort(function(a, b){
      return new Date(b.createdAt) - new Date(a.createdAt);
    });
    var count = items.length;
    return '<div class="paper-page"><div class="paper-inner">' +
      '<div class="paper-head"><div><h1>治愈备用片</h1><p class="paper-lead">' + h(COPY.healingIntro) + '</p></div>' +
        '<div class="ph-side"><strong>' + h(count + ' 片') + '</strong><span>亮着的光</span></div></div>' +
      '<div class="healing-actions">' +
        '<button class="btn btn-amber" type="button" data-heal-play' + (count ? '' : ' disabled aria-disabled="true"') + '>' + icon('play') + '放一遍这些亮处</button>' +
        '<span class="ha-note">' + h(COPY.healingHow) + '</span>' +
      '</div>' +
      '<div class="healing-count"><strong>' + count + '</strong><span>片亮着的光，在你不知道的时候被收了下来。</span></div>' +
      (count
        ? '<div class="fragment-field">' + items.map(function(item, i){
            var mood = D.mood(item.mood || 'bright');
            var isScene = item.source && item.source.kind === 'scene';
            var art = '';
            if (isScene){
              art = '<span class="fr-art" style="background-image:url(\'' + h(Scenes.thumbnail(item.source.id, 420)) + '\');background-size:cover;background-position:center;display:block;width:100%;height:100%"></span>';
            } else {
              var material = Store.getMaterial(item.source && item.source.id);
              art = material && material.src
                ? '<span class="fr-art" style="background-image:url(\'' + h(material.src) + '\');background-size:cover;background-position:center;display:block;width:100%;height:100%"></span>'
                : '<span class="fr-art" style="background-image:url(\'' + h(Scenes.thumbnail(item.source && item.source.fallback || 'table-flower', 420)) + '\');background-size:cover;background-position:center;display:block;width:100%;height:100%"></span>';
            }
            return '<button class="fragment' + (isNewHealing(item) ? ' is-new' : '') + '" type="button" data-heal-item="' + h(item.id) + '">' +
              '<span class="fr-tape" aria-hidden="true"></span>' + art +
              '<span class="fr-label" style="--mood-color:' + mood.color + '">' + h(item.caption || item.title) + '</span>' +
            '</button>';
          }).join('') + '</div>'
        : '<div class="healing-empty"><p class="he-line">' + h(COPY.healingEmpty) + '</p>' +
            '<p class="he-small">' + h(COPY.healingWhen) + '</p>' +
            '<button class="btn btn-ghost btn-sm" type="button" data-go="studio">先去剪一段</button></div>') +
      '<div class="healing-note"><div><h3>它什么时候会收</h3><p>' + h(COPY.healingWhen) + '</p></div>' +
        '<div><h3>这里的东西从哪来</h3><p>' + h(COPY.healingHow) + '</p></div></div>' +
    '</div></div>';
  }

  function isNewHealing(item){
    var t = new Date(item.createdAt).getTime();
    return Date.now() - t < 36e5 * 24;
  }

  function bindHealing(){
    var play = view.querySelector('[data-heal-play]');
    if (play && !play.hasAttribute('disabled')){
      play.addEventListener('click', function(){
        var items = Store.get().healing;
        if (!items.length) return;
        var recipe = F.healRecipe(items, { id: U.uid('h'), dateKey: U.todayKey() });
        openTheater(recipe, { healing: true });
      });
    }
    U.$$('[data-heal-item]').forEach(function(btn){
      btn.addEventListener('click', function(){
        var id = btn.getAttribute('data-heal-item');
        var items = Store.get().healing;
        var item = items.filter(function(it){ return it.id === id; })[0];
        if (!item) return;
        var ordered = [item].concat(items.filter(function(it){ return it.id !== id; }));
        var recipe = F.healRecipe(ordered, { id: U.uid('h'), dateKey: U.todayKey() });
        Store.markHealingPlayed([item.id]);
        openTheater(recipe, { healing: true });
      });
    });
  }

  /* ---------------- 手势册 ---------------- */
  function renderGestures(){
    var unlocked = Store.get().gestures;
    var total = D.gestureOrder.length;
    return '<div class="page"><div class="gesture-wrap">' +
      '<div class="page-head"><div><h1>手势册</h1><p class="page-sub">' + h(COPY.gestureIntro) + '</p></div>' +
        '<div class="head-side"><strong>' + unlocked.length + ' / ' + total + '</strong><span>式已经学会</span></div></div>' +
      '<div class="gesture-grid">' + D.gestureOrder.map(function(key){
        var g = D.gesture(key);
        var learned = Store.isGestureUnlocked(key);
        var date = learned ? learned.dateKey : '';
        return '<button class="gesture-card' + (learned ? '' : ' is-locked') + '" type="button" data-gesture="' + key + '" aria-label="' + h(g.name) + (learned ? '，已经学会' : '，还没有学会') + '">' +
          '<span class="gc-bg" aria-hidden="true"></span>' +
          '<span class="gc-top"><span class="gc-mood">' + h(D.mood(g.mood).name) + '</span>' +
            '<span class="gc-state' + (learned ? ' on' : '') + '">' + (learned ? '已学会' : '还没学会') + '</span></span>' +
          '<span class="gc-art">' + Gestures.art(key, { locked: !learned }) + '</span>' +
          '<span class="gc-name">' + h(learned ? g.name : '未学会的手势') + '</span>' +
          '<span class="gc-meaning">' + h(learned ? g.meaning : COPY.gestureLocked) + '</span>' +
          (date ? '<span class="gc-date">' + h(U.fmtDate(date) + ' 学会') + '</span>' : '') +
          '<span class="gc-hover">看看这一式</span>' +
        '</button>';
      }).join('') + '</div>' +
      (unlocked.length === total ? '<p class="gesture-empty-note">' + h(COPY.gestureAll) + '</p>' : '') +
    '</div></div>';
  }

  function bindGestures(){
    U.$$('[data-gesture]').forEach(function(card){
      card.addEventListener('click', function(){
        var key = card.getAttribute('data-gesture');
        openGestureModal(key);
      });
    });
  }

  function openGestureModal(key){
    var g = D.gesture(key);
    var learned = Store.isGestureUnlocked(key);
    var body = '<div class="gesture-detail">' +
      '<div class="gd-art">' + Gestures.art(key, { locked: !learned }) + '</div>' +
      '<div class="gd-side">' +
        '<p class="gd-meaning">' + h(learned ? g.meaning : COPY.gestureLocked) + '</p>' +
        (learned
          ? '<ol class="gesture-steps">' + g.steps.map(function(step, i){
              return '<li><span class="gs-n">' + h(zhNum(i + 1)) + '</span><span>' + h(step) + '</span></li>';
            }).join('') + '</ol>' +
            '<p class="gd-origin">' + h(g.origin) + '</p>'
          : '<p class="gd-origin">剪完一段低落、疲惫或不安的片子，它会把这一式交给你。</p>') +
      '</div>' +
    '</div>';
    openModal({
      title: learned ? g.name : '这一式，还没有交给你',
      sub: learned ? ('对应「' + D.mood(g.mood).name + '」') : '',
      body: body,
      actions: [{ label: learned ? '收好' : '知道了', kind: 'amber' }]
    });
  }

  /* ---------------- 由来 ---------------- */
  function renderAbout(){
    return '<div class="paper-page"><div class="paper-inner">' +
      '<div class="paper-head"><div><h1>由来</h1><p class="paper-lead">' + h(COPY.aboutWho) + '</p></div>' +
        '<div class="ph-side"><strong>把感受剪成片</strong><span>给还不会剪片的人</span></div></div>' +
      '<div class="about-grid">' +
        '<aside class="about-side">' +
          '<div class="as-seal">感受<br>剪片</div>' +
          '<p class="as-line">丢的是碎片，<br>它还给你的故事。</p>' +
          '<p class="as-note">不用苦练剪辑。<br>说出你的感受，<br>它把琐碎瞬间剪成短片。</p>' +
        '</aside>' +
        '<div class="about-body">' +
          '<section class="about-block"><p class="big-line">有些感受说不出，<br>不是因为你不会说。</p><p>' + h(COPY.aboutProblem) + '</p></section>' +
          '<section class="about-block"><h2>这中间缺的，是一段说法</h2><p>' + h(COPY.aboutAbility) + '</p>' +
            '<ol class="about-steps">' +
              '<li><span class="as-num">一</span><div>把今天大概的样子说给它听。它先听完，再分辨情绪。</div></li>' +
              '<li><span class="as-num">二</span><div>回答两道选择题，确认这段感受的形状和去处。</div></li>' +
              '<li><span class="as-num">三</span><div>素材、音乐、字幕一起落成一段片子。不用的亮处，它悄悄替你收进治愈备用片。</div></li>' +
            '</ol>' +
          '</section>' +
          '<section class="about-block"><h2>一个不声张的副作用</h2><p>' + h(COPY.aboutSide) + '</p>' +
            '<p>' + h(COPY.aboutDeaf) + '</p></section>' +
          '<section class="about-block"><h2>一起把这件事做出来的人</h2>' +
            '<ul class="about-credits">' + D.credits.map(function(c){
              return '<li><b>' + h(c.name) + '</b><span>' + h(c.note) + '</span></li>';
            }).join('') + '</ul>' +
          '</section>' +
          '<p class="about-slogan">' + h(COPY.sloganLong) + '</p>' +
          '<p class="about-end">' + h(COPY.aboutFine) + '</p>' +
          '<p class="about-fine">这段字写在一间不大的房间里。<br>如果你也有一句说不出口的感受，就把它放在这里。</p>' +
        '</div>' +
      '</div>' +
    '</div></div>';
  }

  function bindAbout(){}

  /* ---------------- 打开一段片子 ---------------- */
  function openTheater(film, opts){
    opts = opts || {};
    if (activeTheater) closeTheater();
    lastFocus = document.activeElement;
    var mood = D.mood(film.mood || 'calm');
    var healing = !!opts.healing || !!film.isHealingFilm;
    var notes = '';
    if (!healing && !opts.plain){
      notes = '<div class="after-notes">' +
        '<h3>看完了，再回头看看这两处</h3>' +
        '<div class="after-card"><div class="ac-k">当时的感受</div><div class="ac-main">' + h(film.moodName) + '</div><div class="ac-sub">' + h(film.sentence || '') + '</div></div>' +
        (film.answers && film.answers.first
          ? '<button class="after-card" type="button" data-after="first"><div class="ac-k">你替这一段选的说法</div><div class="ac-main">' + h(film.answers.first.label) + '</div><div class="ac-sub">' + h(film.answers.first.line) + '</div><span class="ac-link">' + icon('arrow') + '</span></button>'
          : '') +
        (film.answers && film.answers.second
          ? '<button class="after-card" type="button" data-after="second"><div class="ac-k">你让它去的地方</div><div class="ac-main">' + h(film.answers.second.label) + '</div><div class="ac-sub">' + h(film.answers.second.line) + '</div><span class="ac-link">' + icon('arrow') + '</span></button>'
          : '') +
      '</div>' +
      '<div class="after-actions">' +
        '<button class="btn btn-ghost btn-sm" type="button" data-theater-poster="' + h(film.id) + '">' + icon('poster') + '存一张海报</button>' +
        '<button class="btn btn-ghost btn-sm" type="button" data-theater-save="' + h(film.id) + '">' + icon('download') + '存下影片</button>' +
      '</div>';
    } else if (healing){
      notes = '<div class="after-notes"><h3>这些亮处，是你在低谷时替自己留下的</h3>' +
        '<div class="after-card"><div class="ac-k">它们一直都在</div><div class="ac-main">需要的时候，再回来。</div><div class="ac-sub">不用等心情好，才配看亮的东西。</div></div></div>' +
        '<div class="after-actions"><button class="btn btn-ghost btn-sm" type="button" data-go="studio">剪一段新的</button></div>';
    }

    var mask = '';
    if (!healing && opts.maskLine) mask = opts.maskLine;

    var html = '<div class="theater" id="theater" role="dialog" aria-modal="true" tabindex="-1" aria-label="' + h(film.title) + '">' +
      '<div class="theater-inner">' +
        '<div class="theater-bar">' +
          '<div class="tb-title"><h2>' + h(film.title) + '</h2>' +
            '<p>' + h(U.fmtDate(film.dateKey)) + ' · ' + h(film.templateName || '一段片子') + ' · ' + h(U.durationLabel(film.duration)) + '</p></div>' +
          '<div class="tb-actions">' +
            '<button class="btn btn-ghost btn-sm" type="button" data-theater-close>关上</button>' +
            '<button class="icon-btn" type="button" data-theater-close aria-label="关上">' + icon('close') + '</button>' +
          '</div>' +
        '</div>' +
        '<div class="theater-stage"><div class="film-frame"><div class="film-canvas-wrap"><canvas id="theater-canvas" width="1280" height="720"></canvas></div>' +
          '<div class="frame-corner tl"></div><div class="frame-corner tr"></div><div class="frame-corner bl"></div><div class="frame-corner br"></div></div></div>' +
        '<div class="theater-controls">' +
          '<button class="play-btn" type="button" data-tp aria-label="播放">' + icon('play') + '</button>' +
          '<div class="scrub"><div class="scrub-track"><div class="scrub-fill"></div><div class="scrub-knob"></div></div></div>' +
          '<span class="time">00:00 / ' + h(U.timecode(film.duration)) + '</span>' +
          '<button class="ctrl-label" type="button" data-sound aria-label="声音">' + icon('sound') + '声音</button>' +
        '</div>' +
        '<div class="theater-below">' +
          '<div class="transcript"><h3>它写的字幕</h3><ol id="transcript-list"></ol></div>' +
          '<div class="film-facts">' +
            '<div class="ac-k">这一段</div>' +
            '<div><span>画面</span><b>' + h(film.shots.length + ' 段') + '</b></div>' +
            '<div><span>画幅</span><b>' + h(film.format ? film.format.shapeName + ' · ' + film.format.qualityName : '横屏 · 正好') + '</b></div>' +
            '<div><span>感受</span><b>' + h(film.moodName) + '</b></div>' +
            '<div><span>配乐</span><b>' + h(film.music ? film.music.name : '随感受') + '</b></div>' +
            '<div><span>说法</span><b>' + h(film.templateName || '') + '</b></div>' +
            '<div><span>去向</span><b>' + h(film.answers && film.answers.second ? film.answers.second.label : '只留给自己') + '</b></div>' +
            '<div><span>日子</span><b>' + h(U.fmtDate(film.dateKey)) + '</b></div>' +
          '</div>' +
        '</div>' +
        notes +
        '<div class="theater-close-wrap"><button class="btn btn-ghost" type="button" data-theater-close>关上，回到这里</button></div>' +
      '</div>' +
    '</div>';

    var wrapEl = div(html);
    document.body.appendChild(wrapEl);
    document.body.classList.add('theater-open');
    activeTheater = { el: wrapEl, film: film, player: null, healing: healing };

    var canvas = wrapEl.querySelector('#theater-canvas');
    var transcript = wrapEl.querySelector('#transcript-list');
    if (transcript){
      var cursor = (film.intro && film.intro.dur) || 0;
      transcript.innerHTML = (film.shots || []).map(function(shot, i){
        var line = '<li data-shot="' + i + '"><time>' + h(U.timecode(shot.start != null ? shot.start : cursor)) + '</time><span>' + h(shot.caption || '') + '</span></li>';
        cursor += shot.dur || 0;
        return line;
      }).join('');
    }

    var player = Film.player(canvas, film, {
      music: true,
      onTick: function(time, duration){
        updateTheaterTime(wrapEl, time, duration);
        markTranscript(wrapEl, film, time);
      },
      onState: function(playing){
        var btn = wrapEl.querySelector('[data-tp]');
        if (btn){
          btn.innerHTML = playing ? icon('pause') : icon('play');
          btn.setAttribute('aria-label', playing ? '暂停' : '播放');
        }
      },
      onEnd: function(){
        var btn = wrapEl.querySelector('[data-tp]');
        if (btn) btn.innerHTML = icon('play');
      }
    });
    activeTheater.player = player;
    syncSoundButton(wrapEl);

    wrapEl.querySelectorAll('[data-tp]').forEach(function(btn){
      btn.addEventListener('click', function(){ player.toggle(); });
    });
    var scrub = wrapEl.querySelector('.scrub');
    if (scrub){
      scrub.addEventListener('click', function(e){
        var rect = scrub.getBoundingClientRect();
        var ratio = clamp((e.clientX - rect.left) / rect.width, 0, 1);
        player.seek(ratio * player.duration());
      });
    }
    wrapEl.querySelectorAll('[data-sound]').forEach(function(btn){
      btn.addEventListener('click', function(){
        var muted = !Store.get().prefs.muted;
        Store.setMuted(muted);
        Music.setMuted(muted);
        syncSoundButton(wrapEl);
      });
    });
    wrapEl.querySelectorAll('[data-theater-close]').forEach(function(btn){
      btn.addEventListener('click', closeTheater);
    });
    wrapEl.querySelectorAll('[data-theater-poster]').forEach(function(btn){
      btn.addEventListener('click', function(){ savePoster(film); });
    });
    wrapEl.querySelectorAll('[data-theater-save]').forEach(function(btn){
      btn.addEventListener('click', function(){ startExport(film); });
    });
    wrapEl.querySelectorAll('[data-after]').forEach(function(btn){
      btn.addEventListener('click', function(){
        var which = btn.getAttribute('data-after');
        var answer = film.answers && film.answers[which];
        if (!answer) return;
        openModal({
          title: which === 'first' ? answer.label : answer.label,
          sub: which === 'first' ? '当时替这段感受选的说法' : '当时让它去的地方',
          body: '<p>' + h(answer.line) + '</p>',
          actions: [{ label: '知道了', kind: 'amber' }]
        });
      });
    });
    wrapEl.addEventListener('keydown', function(e){
      if (e.key === 'Escape') closeTheater();
      if (e.key === ' ' || e.code === 'Space'){
        if (/^(BUTTON|INPUT|TEXTAREA|A)$/.test(document.activeElement.tagName)) return;
        e.preventDefault();
        player.toggle();
      }
    });

    player.play(0);
    setTimeout(function(){ wrapEl.focus(); }, 30);
  }

  function updateTheaterTime(wrapEl, time, duration){
    var fill = wrapEl.querySelector('.scrub-fill');
    var knob = wrapEl.querySelector('.scrub-knob');
    var label = wrapEl.querySelector('.time');
    var ratio = duration ? clamp(time / duration, 0, 1) : 0;
    if (fill) fill.style.width = (ratio * 100) + '%';
    if (knob) knob.style.left = (ratio * 100) + '%';
    if (label) label.textContent = U.timecode(time) + ' / ' + U.timecode(duration);
  }

  function markTranscript(wrapEl, film, time){
    var shots = film.shots || [];
    var at = time - (film.intro ? film.intro.dur : 0);
    var index = -1;
    var cursor = 0;
    shots.forEach(function(shot, i){
      if (at >= cursor - .1) index = i;
      cursor += shot.dur;
    });
    wrapEl.querySelectorAll('#transcript-list li').forEach(function(li, i){
      li.classList.toggle('is-on', i === index);
    });
  }

  function syncSoundButton(wrapEl){
    var btn = wrapEl.querySelector('[data-sound]');
    if (!btn) return;
    var muted = Store.get().prefs.muted;
    btn.innerHTML = icon(muted ? 'mute' : 'sound') + (muted ? '静音' : '声音');
    btn.classList.toggle('is-on', !muted);
  }

  function closeTheater(){
    if (!activeTheater) return;
    var t = activeTheater;
    activeTheater = null;
    if (t.player) t.player.destroy();
    if (t.el && t.el.parentNode) t.el.parentNode.removeChild(t.el);
    document.body.classList.remove('theater-open');
    if (lastFocus && lastFocus.focus) lastFocus.focus();
    lastFocus = null;
  }

  /* ---------------- 存下影片 / 存一张海报 ---------------- */
  function savePoster(film){
    Scenes.warmRecipe(film).catch(function(){}).then(function(){
      try {
        var data = Film.posterDataURL(film);
        U.downloadDataURL(data, safeName(film.title) + '-海报.jpg');
        toast('海报存好了。');
      } catch (err){
        toast('这张海报暂时没画出来。');
      }
    });
  }

  function startExport(film){
    if (activeExport) return;
    if (!Film.canExport()){
      toast('这个浏览器暂时不能导出影片，可以先把它放完。');
      return;
    }
    try { if (activeTheater && activeTheater.player) activeTheater.player.pause(); } catch (err){}
    lastFocus = document.activeElement;
    var veil = document.createElement('div');
    veil.className = 'veil save-veil';
    veil.innerHTML = '<div class="save-card">' +
      '<h3>正在存下这一段</h3>' +
      '<p>别关页面。它一边放，一边把画面和声音收好。</p>' +
      '<div class="save-progress"><span class="sp-fill"></span></div>' +
      '<div class="sp-time"><span data-sp-time>0 秒</span><span data-sp-pct>0%</span></div>' +
      '<button class="btn btn-ghost btn-sm" type="button" data-sp-stop>先停下</button>' +
    '</div>';
    document.body.appendChild(veil);
    var fill = veil.querySelector('.sp-fill');
    var timeEl = veil.querySelector('[data-sp-time]');
    var pctEl = veil.querySelector('[data-sp-pct]');
    var abort = typeof AbortController !== 'undefined' ? new AbortController() : null;
    var controller = { abort: abort };
    activeExport = controller;
    veil.querySelector('[data-sp-stop]').addEventListener('click', function(){
      if (abort) abort.abort();
      else closeExport(veil);
    });

    Scenes.warmRecipe(film).catch(function(){}).then(function(){
      if (activeExport !== controller) return;
      return Film.export(film, {
        music: !Store.get().prefs.muted,
        signal: abort ? abort.signal : undefined,
        onProgress: function(ratio, elapsed){
          if (fill) fill.style.width = Math.round(clamp(ratio, 0, 1) * 100) + '%';
          if (timeEl) timeEl.textContent = U.durationLabel(elapsed);
          if (pctEl) pctEl.textContent = Math.round(clamp(ratio, 0, 1) * 100) + '%';
        }
      }).then(function(out){
        U.downloadBlob(out.blob, safeName(film.title) + '.' + out.ext);
        closeExport(veil);
        toast('影片存好了。');
      }).catch(function(err){
        closeExport(veil);
        if (err && err.message === '已经停下') toast('停下了，影片没有存。');
        else toast('刚才没存成功，可以再试一次。');
      });
    });
  }

  function closeExport(veil){
    activeExport = null;
    if (veil && veil.parentNode) veil.parentNode.removeChild(veil);
    if (lastFocus && lastFocus.focus) lastFocus.focus();
    lastFocus = null;
  }

  /* ---------------- 通用弹层 / 轻提示 ---------------- */
  function openModal(opts){
    closeModal();
    var html = '<div class="veil" id="modal-veil"><div class="modal" role="dialog" aria-modal="true" aria-label="' + h(opts.title || '') + '">' +
      '<div class="modal-head"><div><h3>' + h(opts.title || '') + '</h3>' + (opts.sub ? '<span class="mh-sub">' + h(opts.sub) + '</span>' : '') + '</div>' +
        '<button class="icon-btn" type="button" data-modal-close aria-label="关上">' + icon('close') + '</button></div>' +
      '<div class="modal-body">' + (opts.body || '') + '</div>' +
      '<div class="modal-foot">' + (opts.actions || [{ label: '知道了', kind: 'amber' }]).map(function(action, i){
        return '<button class="btn btn-' + (action.kind || 'ghost') + ' btn-sm" type="button" data-modal-action="' + i + '">' + h(action.label) + '</button>';
      }).join('') + '</div>' +
    '</div></div>';
    var veil = div(html);
    document.body.appendChild(veil);
    document.body.classList.add('sheet-open');
    activeModal = veil;
    lastFocus = document.activeElement;

    veil.addEventListener('click', function(e){
      if (e.target === veil) closeModal();
    });
    U.$$('[data-modal-close]', veil).forEach(function(btn){
      btn.addEventListener('click', closeModal);
    });
    U.$$('[data-modal-action]', veil).forEach(function(btn){
      btn.addEventListener('click', function(){
        var index = Number(btn.getAttribute('data-modal-action'));
        var action = opts.actions && opts.actions[index];
        closeModal();
        if (action && action.onClick) action.onClick();
      });
    });
    var focusTarget = veil.querySelector('[data-modal-action]');
    if (focusTarget) setTimeout(function(){ focusTarget.focus(); }, 40);
  }

  function closeModal(){
    if (!activeModal) return;
    var veil = activeModal;
    activeModal = null;
    if (veil.parentNode) veil.parentNode.removeChild(veil);
    if (!activeTheater && !activeSavePop) document.body.classList.remove('sheet-open');
    if (lastFocus && lastFocus.focus) lastFocus.focus();
    lastFocus = null;
  }

  /* ---------------- 首页快捷入口 ---------------- */
  function homeGo(sentence){
    state.draft = freshDraft();
    state.draft.sentence = String(sentence || '').slice(0, 120);
    state.draft.step = sentenceReady(state.draft.sentence) ? 0 : 0;
    Store.clearDraftAudio();
    saveDraft();
    navigate('studio');
  }

  function bindHomeQuick(){
    /* 已由 bindHome 接管 */
  }

  /* ---------------- 收尾：所有全局的事件 ---------------- */
  function closeSavePop(){
    if (!activeSavePop) return;
    var pop = activeSavePop;
    activeSavePop = null;
    if (pop.el && pop.el.parentNode) pop.el.parentNode.removeChild(pop.el);
    if (!activeTheater && !activeModal) document.body.classList.remove('sheet-open');
  }

  function closeSheet(){
    if (!sheet || !sheet.classList.contains('is-open')) return;
    sheet.classList.remove('is-open');
    document.body.classList.remove('sheet-open');
    if (menuToggle) menuToggle.setAttribute('aria-expanded', 'false');
  }

  function openSheet(){
    if (!sheet) return;
    sheet.classList.add('is-open');
    document.body.classList.add('sheet-open');
    if (menuToggle) menuToggle.setAttribute('aria-expanded', 'true');
  }

  function closeAllOverlays(){
    if (activeExport && activeExport.abort) activeExport.abort.abort();
    closeTheater();
    closeModal();
    closeSavePop();
    closeExport(null);
    closeGeneration();
    closeSheet();
  }

  function bindGlobal(){
    document.addEventListener('click', function(e){
      var go = e.target.closest('[data-go]');
      if (go){
        e.preventDefault();
        navigate(go.getAttribute('data-go'));
        return;
      }
      if (menuToggle && menuToggle.contains(e.target)){
        if (sheet && sheet.classList.contains('is-open')) closeSheet();
        else openSheet();
        return;
      }
      if (sheetClose && sheetClose.contains(e.target)){ closeSheet(); return; }
      if (sheet && sheet.contains(e.target)){
        var navBtn = e.target.closest('[data-sheet-go]');
        if (navBtn){
          closeSheet();
          navigate(navBtn.getAttribute('data-sheet-go'));
          return;
        }
        if (e.target === sheet){ closeSheet(); }
      }
      if (e.target.closest('[data-quiet]')){
        var quiet = Store.get().prefs.muted;
        Store.setMuted(!quiet);
        Music.setMuted(!quiet);
        renderTopbarMeta();
        toast(!quiet ? '安静了。' : '声音回来了。');
      }
    });

    document.addEventListener('keydown', function(e){
      if (e.key !== 'Escape') return;
      if (activeModal){ closeModal(); return; }
      if (activeSavePop){ closeSavePop(); return; }
      if (activeTheater){ closeTheater(); return; }
      if (sheet && sheet.classList.contains('is-open')){ closeSheet(); return; }
    });

    window.addEventListener('scroll', function(){
      if (!topbar) return;
      topbar.classList.toggle('is-solid', window.scrollY > 24);
    }, { passive: true });

    window.addEventListener('hashchange', function(){
      var route = routeFromHash();
      if (route !== state.route || !state.ready) renderRoute(route, false);
    });

    window.addEventListener('beforeunload', function(){
      saveDraft();
      Store.flush();
    });
  }

  /* ---------------- 尘土 / 光 ---------------- */
  function startDust(){
    var canvas = document.getElementById('dust');
    if (!canvas) return;
    var ctx = canvas.getContext('2d');
    var dots = [];
    var width = 0, height = 0;
    var raf = 0;
    var reduced = U.reduceMotion();

    function resize(){
      width = canvas.width = window.innerWidth * Math.min(window.devicePixelRatio || 1, 2);
      height = canvas.height = window.innerHeight * Math.min(window.devicePixelRatio || 1, 2);
      canvas.style.width = window.innerWidth + 'px';
      canvas.style.height = window.innerHeight + 'px';
      var count = reduced ? 18 : Math.round((window.innerWidth * window.innerHeight) / 26000);
      dots = [];
      for (var i = 0; i < count; i++){
        dots.push({
          x: Math.random() * width,
          y: Math.random() * height,
          r: (Math.random() * 1.6 + .5) * Math.min(window.devicePixelRatio || 1, 2),
          vx: (Math.random() - .5) * .08,
          vy: -(Math.random() * .16 + .03),
          a: Math.random() * .32 + .05
        });
      }
    }

    function tick(){
      ctx.clearRect(0, 0, width, height);
      dots.forEach(function(dot){
        dot.x += dot.vx;
        dot.y += dot.vy;
        if (dot.y < -10){ dot.y = height + 10; dot.x = Math.random() * width; }
        if (dot.x < -10) dot.x = width + 10;
        if (dot.x > width + 10) dot.x = -10;
        ctx.beginPath();
        ctx.arc(dot.x, dot.y, dot.r, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(224,185,121,' + dot.a + ')';
        ctx.fill();
      });
      raf = requestAnimationFrame(tick);
    }

    resize();
    window.addEventListener('resize', U.debounce(resize, 220));
    if (reduced) tick(); else raf = requestAnimationFrame(tick);
  }

  /* ---------------- 引导 ---------------- */
  function bootApp(){
    if (boot){
      setTimeout(function(){
        boot.classList.add('is-done');
        setTimeout(function(){ if (boot.parentNode) boot.parentNode.removeChild(boot); }, 700);
      }, 520);
    }
  }

  /* ---------------- 初始化 ---------------- */
  function init(){
    Store.onError = function(message){ toast(message); };
    Store.on(function(){
      if (state.ready) renderTopbarMeta();
      if (state.route === 'home') { /* 首页在下次进入时刷新 */ }
    });

    Store.init().then(function(){
      state.ready = true;
      state.draft = loadDraft();
      cleanDraft();
      state.route = routeFromHash();
      renderRoute(state.route, false);
      bindGlobal();
      startDust();
      bootApp();
      Music.setMuted(Store.get().prefs.muted);
      document.addEventListener('visibilitychange', function(){
        if (document.hidden) Store.flush();
      });
    });
  }

  init();

})();
