/* =========================================================
   记忆抽屉：IndexedDB 为主，localStorage 为备，再不行就只记这一次
   ========================================================= */
(function(){
  'use strict';

  var App = window.App = window.App || {};
  var U = App.util;

  var DB_NAME = 'gan-shou-pian';
  var DB_STORE = 'root';
  var DB_KEY = 'state';
  var LS_KEY = 'ganshou.state.v1';
  var BACKUP_KEY = 'ganshou.backup.v1';

  var state = null;
  var db = null;
  var mode = 'idb';
  var listeners = [];
  var saveTimer = null;
  var saving = null;
  var store = {};

  function fresh(){
    return {
      version: 1,
      createdAt: new Date().toISOString(),
      films: [],
      materials: [],
      healing: [],
      gestures: [],
      draftAudio: null,
      prefs: { muted: false }
    };
  }

  function normalize(s){
    var base = fresh();
    if (!s || typeof s !== 'object') return base;
    base.createdAt = s.createdAt || base.createdAt;
    base.films = Array.isArray(s.films) ? s.films.filter(Boolean) : [];
    base.materials = Array.isArray(s.materials) ? s.materials.filter(Boolean) : [];
    base.healing = Array.isArray(s.healing) ? s.healing.filter(Boolean) : [];
    base.gestures = Array.isArray(s.gestures) ? s.gestures.filter(Boolean) : [];
    var keptAudio = s.draftAudio;
    base.draftAudio = keptAudio && typeof keptAudio === 'object' && typeof keptAudio.data === 'string' && /^data:audio\//.test(keptAudio.data)
      ? { data: keptAudio.data, name: typeof keptAudio.name === 'string' && keptAudio.name ? keptAudio.name.slice(0, 40) : '你带来的音乐' }
      : null;
    base.prefs = Object.assign({ muted: false }, s.prefs || {});
    base.version = 1;
    return base;
  }

  function emit(){
    listeners.forEach(function(fn){
      try{ fn(state); }catch(e){ console.warn(e); }
    });
  }

  function readLocal(key){
    try{
      var raw = localStorage.getItem(key);
      if (!raw) return null;
      return JSON.parse(raw);
    }catch(e){ return null; }
  }

  function writeBackup(){
    if (!state) return;
    try{
      var raw = JSON.stringify(state);
      if (raw.length < 3800000) localStorage.setItem(BACKUP_KEY, raw);
    }catch(e){ /* 放不下就不放 */ }
  }

  function openDB(){
    return new Promise(function(resolve, reject){
      if (!window.indexedDB){ reject(new Error('没有本地数据库')); return; }
      var req;
      try{
        req = indexedDB.open(DB_NAME, 1);
      }catch(e){ reject(e); return; }
      var settled = false;
      req.onupgradeneeded = function(){
        var d = req.result;
        if (!d.objectStoreNames.contains(DB_STORE)) d.createObjectStore(DB_STORE);
      };
      req.onsuccess = function(){
        if (settled) return;
        settled = true;
        resolve(req.result);
      };
      req.onerror = function(){
        if (settled) return;
        settled = true;
        reject(req.error || new Error('本地数据库打不开'));
      };
      req.onblocked = function(){
        if (settled) return;
        settled = true;
        reject(new Error('本地数据库被别的窗口占着'));
      };
      setTimeout(function(){
        if (settled) return;
        settled = true;
        reject(new Error('本地数据库没有回应'));
      }, 2600);
    });
  }

  function idbGet(){
    return new Promise(function(resolve, reject){
      var tx = db.transaction(DB_STORE, 'readonly');
      var req = tx.objectStore(DB_STORE).get(DB_KEY);
      req.onsuccess = function(){ resolve(req.result || null); };
      req.onerror = function(){ reject(req.error); };
    });
  }

  function idbPut(value){
    return new Promise(function(resolve, reject){
      var tx = db.transaction(DB_STORE, 'readwrite');
      tx.objectStore(DB_STORE).put(value, DB_KEY);
      tx.oncomplete = function(){ resolve(); };
      tx.onerror = function(){ reject(tx.error); };
      tx.onabort = function(){ reject(tx.error || new Error('没有存进去')); };
    });
  }

  function persistLocal(){
    try{
      localStorage.setItem(LS_KEY, JSON.stringify(state));
      return true;
    }catch(e){
      /* 空间不够的时候，先舍掉一些小东西，再试一次 */
      try{
        var slim = JSON.parse(JSON.stringify(state));
        slim.draftAudio = null;
        slim.materials = slim.materials.slice(0, 6).map(function(m){
          if (m.src && m.src.length > 240000){
            m = Object.assign({}, m);
            m.src = '';
            m.missing = true;
          }
          return m;
        });
        slim.films = slim.films.slice(0, 40).map(function(f, i){
          if (i > 8){
            f = Object.assign({}, f);
            f.poster = '';
          }
          return f;
        });
        localStorage.setItem(LS_KEY, JSON.stringify(slim));
        state = slim;
        if (store.onError) store.onError('空间有点满，它先收起了几张旧海报。');
        return true;
      }catch(e2){
        mode = 'memory';
        if (store.onError) store.onError('这台浏览器不让它存东西，这次的内容只留到关掉页面为止。');
        return false;
      }
    }
  }

  function persistNow(){
    if (!state) return Promise.resolve();
    if (saving) return saving;
    writeBackup();
    if (mode === 'idb' && db){
      saving = idbPut(JSON.parse(JSON.stringify(state)))
        .catch(function(){
          mode = 'local';
          persistLocal();
        })
        .then(function(){ saving = null; });
      return saving;
    }
    persistLocal();
    return Promise.resolve();
  }

  function scheduleSave(){
    clearTimeout(saveTimer);
    saveTimer = setTimeout(function(){ persistNow(); }, 320);
  }

  store.init = function(){
    return new Promise(function(resolve){
      var local = readLocal(LS_KEY);
      var backup = readLocal(BACKUP_KEY);
      openDB().then(function(database){
        db = database;
        return idbGet();
      }).then(function(data){
        if (data){
          state = normalize(data);
        } else if (local || backup){
          state = normalize(local || backup);
          scheduleSave();
        } else {
          state = fresh();
          scheduleSave();
        }
        resolve(state);
      }).catch(function(){
        mode = local ? 'local' : 'memory';
        state = normalize(local || backup || fresh());
        if (!local && !backup) scheduleSave();
        resolve(state);
      });
    }).then(function(s){
      writeBackup();
      return s;
    });
  };

  store.on = function(fn){
    listeners.push(fn);
    return function(){ store.remove(fn); };
  };

  store.remove = function(fn){
    listeners = listeners.filter(function(x){ return x !== fn; });
  };

  store.get = function(){ return state || fresh(); };
  store.mode = function(){ return mode; };
  store.onError = null;
  store.flush = persistNow;

  store.save = function(){ scheduleSave(); };

  store.addFilm = function(film){
    if (!film) return null;
    state.films.unshift(film);
    if (state.films.length > 200) state.films.length = 200;
    scheduleSave();
    emit();
    return film;
  };

  store.removeFilm = function(id){
    var before = state.films.length;
    state.films = state.films.filter(function(f){ return f.id !== id; });
    if (state.films.length !== before){
      scheduleSave();
      emit();
    }
  };

  store.getFilm = function(id){
    return state.films.filter(function(f){ return f.id === id; })[0] || null;
  };

  store.filmsOn = function(dateKey){
    return state.films.filter(function(f){ return f.dateKey === dateKey; });
  };

  store.healingOn = function(dateKey){
    return state.healing.filter(function(h){
      return U.dateKey(h.createdAt) === dateKey;
    });
  };

  store.addMaterial = function(material){
    if (!material) return null;
    state.materials.unshift(material);
    if (state.materials.length > 60) state.materials.length = 60;
    scheduleSave();
    emit();
    return material;
  };

  store.removeMaterial = function(id){
    state.materials = state.materials.filter(function(m){ return m.id !== id; });
    scheduleSave();
    emit();
  };

  store.getMaterial = function(id){
    return state.materials.filter(function(m){ return m.id === id; })[0] || null;
  };

  store.addHealing = function(items, fromFilm){
    var added = [];
    var seen = [];
    (items || []).forEach(function(item){
      if (!item || !item.source) return;
      var key = item.source.kind + ':' + item.source.id;
      var exist = state.healing.filter(function(h){
        return h.source && (h.source.kind + ':' + h.source.id) === key;
      })[0];
      if (exist){
        exist.lastSeen = new Date().toISOString();
        exist.times = (exist.times || 1) + 1;
        seen.push(exist.id);
      } else {
        var frag = {
          id: item.id || U.uid('h'),
          source: item.source,
          title: item.title || '一小片亮着的光',
          caption: item.caption || '',
          mood: 'bright',
          fromFilm: fromFilm || '',
          createdAt: new Date().toISOString(),
          times: 1
        };
        state.healing.unshift(frag);
        added.push(frag);
        seen.push(frag.id);
      }
    });
    if (state.healing.length > 160) state.healing.length = 160;
    scheduleSave();
    emit();
    return { added: added, seen: seen };
  };

  store.getHealing = function(id){
    return state.healing.filter(function(h){ return h.id === id; })[0] || null;
  };

  store.markHealingPlayed = function(ids){
    var set = {};
    (ids || []).forEach(function(id){ set[id] = true; });
    state.healing.forEach(function(h){
      if (set[h.id]) h.playedAt = new Date().toISOString();
    });
    scheduleSave();
    emit();
  };

  store.unlockGesture = function(preferredKey, filmId){
    var order = App.data.gestureOrder;
    var unlocked = state.gestures.map(function(g){ return g.key; });
    var key = null;
    if (preferredKey && order.indexOf(preferredKey) >= 0 && unlocked.indexOf(preferredKey) < 0){
      key = preferredKey;
    } else {
      for (var i = 0; i < order.length; i++){
        if (unlocked.indexOf(order[i]) < 0){ key = order[i]; break; }
      }
    }
    if (!key) return null;
    state.gestures.unshift({
      key: key,
      unlockedAt: new Date().toISOString(),
      filmId: filmId || ''
    });
    scheduleSave();
    emit();
    return key;
  };

  store.isGestureUnlocked = function(key){
    return state.gestures.some(function(g){ return g.key === key; });
  };

  store.getGesture = function(key){
    return state.gestures.filter(function(g){ return g.key === key; })[0] || null;
  };

  store.setMuted = function(muted){
    state.prefs.muted = !!muted;
    scheduleSave();
    emit();
  };

  store.setDraftAudio = function(audio){
    if (!state || !audio || typeof audio.data !== 'string' || !/^data:audio\//.test(audio.data)) return;
    state.draftAudio = {
      data: audio.data,
      name: typeof audio.name === 'string' && audio.name ? audio.name.slice(0, 40) : '你带来的音乐'
    };
    scheduleSave();
  };

  store.clearDraftAudio = function(){
    if (!state || !state.draftAudio) return;
    state.draftAudio = null;
    scheduleSave();
  };

  store.getDraftAudio = function(){
    return state && state.draftAudio ? state.draftAudio : null;
  };

  store.countMoods = function(films){
    var counts = {};
    (films || state.films).forEach(function(f){
      var k = f.mood || 'calm';
      counts[k] = (counts[k] || 0) + 1;
    });
    return counts;
  };

  store.latestMood = function(){
    if (!state.films.length) return null;
    return state.films[0].mood || null;
  };

  store.snapshot = function(){
    return JSON.parse(JSON.stringify(state));
  };

  store.clearAll = function(){
    state = fresh();
    scheduleSave();
    emit();
  };

  window.addEventListener('pagehide', function(){
    if (state) writeBackup();
    if (mode === 'local') persistLocal();
  });

  App.store = store;
})();
