/* =========================================================
   小工具：日期、随机、画布、文件、文案处理的公共手
   ========================================================= */
(function(){
  'use strict';

  var App = window.App = window.App || {};
  var U = {};

  var WEEK = ['星期天', '星期一', '星期二', '星期三', '星期四', '星期五', '星期六'];
  var ZH_NUM = ['零', '一', '二', '三', '四', '五', '六', '七', '八', '九', '十'];
  var POOL = 'abcdefghjkmnpqrstuvwxyz23456789';

  U.$ = function(sel, root){ return (root || document).querySelector(sel); };
  U.$$ = function(sel, root){ return Array.prototype.slice.call((root || document).querySelectorAll(sel)); };

  U.escapeHTML = function(str){
    return String(str == null ? '' : str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  };

  U.clamp = function(n, lo, hi){ return Math.max(lo, Math.min(hi, n)); };
  U.lerp = function(a, b, t){ return a + (b - a) * t; };
  U.smooth = function(t){ t = U.clamp(t, 0, 1); return t * t * (3 - 2 * t); };
  U.easeOut = function(t){ t = U.clamp(t, 0, 1); return 1 - Math.pow(1 - t, 3); };
  U.easeInOut = function(t){
    t = U.clamp(t, 0, 1);
    return t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
  };

  U.hash = function(str){
    var h = 2166136261;
    str = String(str || '');
    for (var i = 0; i < str.length; i++){
      h ^= str.charCodeAt(i);
      h = Math.imul(h, 16777619);
    }
    return h >>> 0;
  };

  /* 可复现的随机：同一条种子，永远得到同一场“偶然” */
  U.rng = function(seed){
    var a = (typeof seed === 'number' ? seed : U.hash(seed)) >>> 0;
    return function(){
      a |= 0;
      a = (a + 0x6D2B79F5) | 0;
      var t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  };

  U.pick = function(arr, rnd){
    if (!arr || !arr.length) return null;
    var r = typeof rnd === 'function' ? rnd() : Math.random();
    return arr[Math.min(arr.length - 1, Math.floor(r * arr.length))];
  };

  U.shuffle = function(arr, rnd){
    var out = arr.slice();
    var r = typeof rnd === 'function' ? rnd : Math.random;
    for (var i = out.length - 1; i > 0; i--){
      var j = Math.floor(r() * (i + 1));
      var tmp = out[i]; out[i] = out[j]; out[j] = tmp;
    }
    return out;
  };

  U.uid = function(prefix){
    var s = '';
    for (var i = 0; i < 7; i++) s += POOL[Math.floor(Math.random() * POOL.length)];
    return (prefix || 'p') + '_' + Date.now().toString(36) + s;
  };

  U.zhNum = function(n){
    n = Math.round(Number(n) || 0);
    if (n < 0) return '负' + U.zhNum(-n);
    if (n <= 10) return ZH_NUM[n];
    if (n < 20) return '十' + (n % 10 ? ZH_NUM[n % 10] : '');
    if (n < 100){
      var t = Math.floor(n / 10), o = n % 10;
      return ZH_NUM[t] + '十' + (o ? ZH_NUM[o] : '');
    }
    return String(n);
  };

  U.pad = function(n){ return (n < 10 ? '0' : '') + n; };

  U.asDate = function(d){
    if (!d) d = new Date();
    if (typeof d === 'string' || typeof d === 'number') d = new Date(d);
    return d;
  };

  U.dateKey = function(d){
    d = U.asDate(d);
    return d.getFullYear() + '-' + U.pad(d.getMonth() + 1) + '-' + U.pad(d.getDate());
  };

  U.parseKey = function(key){
    var p = String(key || '').split('-');
    return new Date(Number(p[0]), Number(p[1]) - 1, Number(p[2]));
  };

  U.fmtDate = function(d){
    d = U.asDate(d);
    return d.getFullYear() + '年' + (d.getMonth() + 1) + '月' + d.getDate() + '日';
  };

  U.fmtMonth = function(d){
    d = U.asDate(d);
    return d.getFullYear() + '年' + (d.getMonth() + 1) + '月';
  };

  U.fmtMd = function(d){
    d = U.asDate(d);
    return (d.getMonth() + 1) + '月' + d.getDate() + '日';
  };

  U.fmtTime = function(d){
    d = U.asDate(d);
    return U.pad(d.getHours()) + ':' + U.pad(d.getMinutes());
  };

  U.weekday = function(d){ return WEEK[U.asDate(d).getDay()]; };

  U.fmtRelative = function(d){
    d = U.asDate(d);
    var today = new Date();
    var a = new Date(d.getFullYear(), d.getMonth(), d.getDate());
    var b = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    var diff = Math.round((b - a) / 86400000);
    if (diff === 0) return '今天';
    if (diff === 1) return '昨天';
    if (diff === 2) return '前天';
    if (diff > 2 && diff < 7) return diff + '天前';
    return U.fmtDate(d);
  };

  U.timecode = function(sec){
    sec = Math.max(0, sec || 0);
    var m = Math.floor(sec / 60);
    var s = Math.floor(sec % 60);
    return U.pad(m) + ':' + U.pad(s);
  };

  U.durationLabel = function(sec){
    sec = Math.max(0, Math.round(sec || 0));
    var m = Math.floor(sec / 60), s = sec % 60;
    if (!m) return s + ' 秒';
    return m + ' 分 ' + (s ? s + ' 秒' : '');
  };

  U.debounce = function(fn, wait){
    var timer = null;
    return function(){
      var args = arguments, ctx = this;
      clearTimeout(timer);
      timer = setTimeout(function(){ fn.apply(ctx, args); }, wait);
    };
  };

  U.throttle = function(fn, wait){
    var last = 0, timer = null;
    return function(){
      var now = Date.now(), args = arguments, ctx = this;
      var remain = wait - (now - last);
      if (remain <= 0){
        clearTimeout(timer); timer = null;
        last = now;
        fn.apply(ctx, args);
      } else if (!timer){
        timer = setTimeout(function(){
          last = Date.now(); timer = null;
          fn.apply(ctx, args);
        }, remain);
      }
    };
  };

  U.sleep = function(ms){
    return new Promise(function(resolve){ setTimeout(resolve, ms); });
  };

  U.loadImage = function(src){
    return new Promise(function(resolve, reject){
      var img = new Image();
      img.onload = function(){ resolve(img); };
      img.onerror = function(){ reject(new Error('图片解码失败')); };
      img.src = src;
    });
  };

  U.readFile = function(file, asDataURL){
    return new Promise(function(resolve, reject){
      var r = new FileReader();
      r.onload = function(){ resolve(r.result); };
      r.onerror = function(){ reject(new Error('文件读取失败')); };
      if (asDataURL === false) r.readAsArrayBuffer(file);
      else r.readAsDataURL(file);
    });
  };

  U.makeCanvas = function(w, h){
    var c = document.createElement('canvas');
    c.width = Math.max(1, Math.round(w));
    c.height = Math.max(1, Math.round(h));
    return c;
  };

  U.downloadBlob = function(blob, name){
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url;
    a.download = name || '片段';
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(function(){ URL.revokeObjectURL(url); }, 4000);
  };

  U.downloadDataURL = function(dataUrl, name){
    var a = document.createElement('a');
    a.href = dataUrl;
    a.download = name || '图片';
    document.body.appendChild(a);
    a.click();
    a.remove();
  };

  U.copyText = function(text){
    if (navigator.clipboard && navigator.clipboard.writeText){
      return navigator.clipboard.writeText(text).catch(function(){ return U.copyFallback(text); });
    }
    return U.copyFallback(text);
  };

  U.copyFallback = function(text){
    return new Promise(function(resolve, reject){
      try{
        var ta = document.createElement('textarea');
        ta.value = text;
        ta.style.position = 'fixed';
        ta.style.opacity = '0';
        document.body.appendChild(ta);
        ta.select();
        document.execCommand('copy');
        ta.remove();
        resolve();
      }catch(e){ reject(e); }
    });
  };

  U.roundRect = function(ctx, x, y, w, h, r){
    r = Math.min(r == null ? 8 : r, w / 2, h / 2);
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    ctx.lineTo(x + w, y + h - r);
    ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    ctx.lineTo(x + r, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - r);
    ctx.lineTo(x, y + r);
    ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.closePath();
  };

  /* 在画布上按字符折行，中文与标点都照顾到 */
  U.wrapText = function(ctx, text, maxWidth){
    text = String(text || '');
    var lines = [];
    var line = '';
    var noStart = /[，。、！？；：）」』】…,.!?;:)%]/;
    for (var i = 0; i < text.length; i++){
      var ch = text[i];
      if (ch === '\n'){
        lines.push(line); line = ''; continue;
      }
      var test = line + ch;
      if (ctx.measureText(test).width > maxWidth && line){
        if (noStart.test(ch)){ line = test; continue; }
        lines.push(line);
        line = ch;
      } else {
        line = test;
      }
    }
    if (line) lines.push(line);
    return lines.length ? lines : [''];
  };

  U.font = function(weight, size, family){
    return (weight ? weight + ' ' : '') + size + 'px ' + family;
  };

  U.reduceMotion = function(){
    return window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  };

  U.isTouch = function(){
    return window.matchMedia && window.matchMedia('(hover: none)').matches;
  };

  U.canMediaRecord = function(){
    return typeof window.MediaRecorder !== 'undefined' &&
      HTMLCanvasElement.prototype.captureStream &&
      !!window.MediaRecorder;
  };

  U.pickMime = function(){
    if (!U.canMediaRecord()) return '';
    var list = [
      'video/webm;codecs=vp9,opus',
      'video/webm;codecs=vp8,opus',
      'video/webm',
      'video/mp4;codecs=h264,aac',
      'video/mp4'
    ];
    for (var i = 0; i < list.length; i++){
      try{
        if (MediaRecorder.isTypeSupported(list[i])) return list[i];
      }catch(e){ /* 浏览器不认就算了 */ }
    }
    return '';
  };

  U.extensionFor = function(mime){
    if (/mp4/i.test(mime)) return 'mp4';
    return 'webm';
  };

  U.isImageFile = function(file){
    return file && /^image\//.test(file.type);
  };

  U.isVideoFile = function(file){
    return file && /^video\//.test(file.type);
  };

  U.shortClauses = function(text){
    return String(text || '')
      .replace(/\s+/g, ' ')
      .split(/[。！？!?；;\n]+/)
      .map(function(s){ return s.replace(/^[，、,.·\s]+|[，、,.·\s]+$/g, '').trim(); })
      .filter(function(s){ return s.length >= 2; });
  };

  /* 压缩图片，顺带把最长边限制住，避免把整台电脑塞满 */
  U.compressImage = function(img, maxEdge, quality){
    var w = img.naturalWidth || img.width;
    var h = img.naturalHeight || img.height;
    var scale = Math.min(1, (maxEdge || 1280) / Math.max(w, h));
    var cw = Math.max(1, Math.round(w * scale));
    var ch = Math.max(1, Math.round(h * scale));
    var c = U.makeCanvas(cw, ch);
    var ctx = c.getContext('2d');
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(img, 0, 0, cw, ch);
    return c.toDataURL('image/jpeg', quality || .82);
  };

  U.canvasDataURL = function(canvas, mime, quality){
    return canvas.toDataURL(mime || 'image/jpeg', quality == null ? .85 : quality);
  };

  U.dataURLSize = function(dataUrl){
    if (!dataUrl) return 0;
    var i = dataUrl.indexOf(',');
    return Math.round((dataUrl.length - i - 1) * .75);
  };

  U.speakAvailable = function(){
    return 'speechSynthesis' in window;
  };

  /* 朗读只在用户明确点击时使用，不在剪片时突然出声 */
  U.speak = function(text){
    if (!U.speakAvailable() || !text) return;
    try{
      var u = new SpeechSynthesisUtterance(String(text).slice(0, 160));
      u.lang = 'zh-CN';
      u.rate = .85;
      u.pitch = .95;
      window.speechSynthesis.cancel();
      window.speechSynthesis.speak(u);
    }catch(e){ /* 不出声也不影响别的 */ }
  };

  U.stopSpeak = function(){
    if (U.speakAvailable()){
      try{ window.speechSynthesis.cancel(); }catch(e){}
    }
  };

  U.todayKey = function(){ return U.dateKey(new Date()); };

  U.startOfDay = function(d){
    d = U.asDate(d);
    return new Date(d.getFullYear(), d.getMonth(), d.getDate());
  };

  U.daysInMonth = function(year, month){
    return new Date(year, month + 1, 0).getDate();
  };

  App.util = U;
})();
