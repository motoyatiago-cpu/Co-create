/* =========================================================
   手势册：六只手。线条是同一支笔画的，只是朝向不同。
   手势由聋人朋友定下，意思是“把说不出的，用手说一遍”。
   ========================================================= */
(function(){
  'use strict';

  var App = window.App = window.App || {};
  var G = {};

  var RAD = Math.PI / 180;

  var FINGERS = [
    { id: 'index', x: -19, y: -104, len: 62, base: -9 },
    { id: 'middle', x: 0, y: -111, len: 70, base: -1 },
    { id: 'ring', x: 18, y: -107, len: 63, base: 7 },
    { id: 'pinky', x: 33, y: -99, len: 47, base: 15 }
  ];

  var POSES = {
    heart: {
      x: 118, y: 156, rot: -12, curl: .16, thumb: 'fold', cuff: true, deco: 'heart'
    },
    wind: {
      x: 74, y: 158, rot: 82, curl: .02, thumb: 'open', deco: 'wind'
    },
    light: {
      x: 92, y: 192, rot: 34, curl: .34, thumb: 'open', deco: 'light'
    },
    name: {
      x: 116, y: 158, rot: -8, fist: true, thumb: 'fist', deco: 'name', cuff: true
    },
    hang: {
      x: 124, y: 50, rot: 172, curl: .3, thumb: 'open', cuff: true, deco: 'hang'
    },
    three: {
      x: 120, y: 156, rot: -5, curl: .04, thumb: 'fold', deco: 'three',
      curls: { index: .05, middle: .04, ring: .05, pinky: 1 }
    }
  };

  function fmt(n){ return Math.round(n * 100) / 100; }

  function dir(a){ return { x: Math.sin(a * RAD), y: -Math.cos(a * RAD) }; }

  function toWorld(pose, x, y){
    var a = pose.rot * RAD;
    var s = pose.scale || 1;
    return {
      x: pose.x + (x * Math.cos(a) - y * Math.sin(a)) * s,
      y: pose.y + (x * Math.sin(a) + y * Math.cos(a)) * s
    };
  }

  function fingerPoints(root, len, base, curl){
    var p0 = { x: root.x, y: root.y };
    var a0 = base - curl * 6;
    var a1 = base - curl * 32;
    var a2 = base - curl * 62;
    var d0 = dir(a0), d1 = dir(a1), d2 = dir(a2);
    var p1 = { x: p0.x + d0.x * len * .44, y: p0.y + d0.y * len * .44 };
    var p2 = { x: p1.x + d1.x * len * .34, y: p1.y + d1.y * len * .34 };
    var p3 = { x: p2.x + d2.x * len * .23, y: p2.y + d2.y * len * .23 };
    return [p0, p1, p2, p3];
  }

  function polyline(pts){
    return 'M' + pts.map(function(p){ return fmt(p.x) + ' ' + fmt(p.y); }).join(' L');
  }

  var delay = 0;
  function cls(extra){
    delay++;
    return 'gs-line' + (extra ? ' ' + extra : '') + ' gs-d' + ((delay % 8) + 1);
  }

  function fingerMarkup(pose, f){
    var curl = pose.curls && pose.curls[f.id] != null ? pose.curls[f.id] : (pose.curl || 0);
    var pts = fingerPoints(f, f.len, f.base, curl);
    var out = '';
    out += '<path class="' + cls('gs-finger') + '" d="' + polyline(pts) + '"/>';
    out += '<circle class="gs-joint" cx="' + fmt(pts[1].x) + '" cy="' + fmt(pts[1].y) + '" r="1.05"/>';
    out += '<circle class="gs-joint" cx="' + fmt(pts[2].x) + '" cy="' + fmt(pts[2].y) + '" r=".85"/>';
    return { markup: out, tip: pts[3] };
  }

  var PALM = 'M-36 8 C-44 -24 -46 -70 -34 -94 C-28 -106 -14 -110 -4 -106 L30 -102 C42 -100 46 -86 42 -72 L36 -6 C35 10 24 18 10 18 L-22 18 C-31 18 -36 14 -36 8 Z';

  var FIST = 'M-36 14 C-44 -10 -46 -50 -38 -76 C-34 -94 -20 -104 -6 -102 L22 -98 C36 -95 42 -82 38 -64 L32 6 C31 20 20 26 6 26 L-20 26 C-30 26 -35 22 -36 14 Z';

  function handMarkup(pose){
    var out = '';
    var tips = [];

    if (pose.fist){
      out += '<path class="' + cls('gs-palm') + '" d="' + FIST + '"/>';
      /* 指节 */
      for (var i = 0; i < 4; i++){
        var x = -22 + i * 14;
        out += '<path class="' + cls('gs-fold') + '" d="M' + x + ' -94 C' + (x + 4) + ' -84 ' + (x + 10) + ' -80 ' + (x + 12) + ' -70"/>';
        out += '<circle class="gs-joint" cx="' + (x + 1) + '" cy="-94" r="1.1"/>';
      }
      /* 拇指横过 */
      out += '<path class="' + cls('gs-thumb') + '" d="M-34 -44 C-26 -56 -12 -62 0 -60 C12 -58 20 -52 24 -44"/>';
      out += '<path class="' + cls('gs-soft') + '" d="M-32 -6 C-10 4 12 4 32 -4"/>';
    } else {
      out += '<path class="' + cls('gs-palm') + '" d="' + PALM + '"/>';
      out += '<path class="' + cls('gs-soft') + '" d="M-20 -66 C-8 -58 6 -56 22 -62"/>';
      out += '<path class="' + cls('gs-soft') + '" d="M-18 -44 C-6 -38 8 -38 20 -44"/>';

      FINGERS.forEach(function(f){
        var res = fingerMarkup(pose, f);
        out += res.markup;
        tips.push(res.tip);
      });

      var thumb;
      if (pose.thumb === 'fold'){
        thumb = 'M-33 -32 C-24 -46 -10 -52 2 -49 C12 -47 18 -42 20 -36';
      } else if (pose.thumb === 'fist'){
        thumb = 'M-34 -44 C-26 -56 -12 -62 0 -60 C12 -58 20 -52 24 -44';
      } else {
        thumb = 'M-33 -30 C-47 -40 -57 -53 -62 -68';
      }
      out += '<path class="' + cls('gs-thumb') + '" d="' + thumb + '"/>';

      if (pose.cuff){
        out += '<path class="' + cls('gs-soft') + '" d="M-32 8 C-12 18 12 18 32 10"/>';
      }
    }
    return { markup: out, tips: tips };
  }

  function decorate(pose, tips){
    var out = '';
    if (pose.deco === 'heart'){
      out += '<circle class="gs-ring" cx="128" cy="178" r="64"/>';
      out += '<circle class="gs-ring" cx="128" cy="178" r="76"/>';
      out += '<circle class="gs-glow" cx="128" cy="178" r="72"/>';
      var wx = 174, wy = 190;
      out += '<circle class="gs-dot" cx="' + wx + '" cy="' + wy + '" r="3"/>';
      out += '<circle class="gs-halo" cx="' + wx + '" cy="' + wy + '" r="12"/>';
      out += '<path class="gs-accent" d="M' + wx + ' ' + (wy - 20) + ' L' + wx + ' ' + (wy - 12) + ' M' + (wx + 14) + ' ' + (wy - 14) + ' L' + (wx + 9) + ' ' + (wy - 9) + '"/>';
    }
    if (pose.deco === 'wind'){
      out += '<path class="gs-accent" d="M158 84 C184 78 202 90 224 82"/>';
      out += '<path class="gs-accent" d="M150 112 C180 104 196 120 228 110"/>';
      out += '<path class="gs-accent" d="M162 142 C188 138 200 150 220 144"/>';
      out += '<path class="gs-soft" d="M174 168 C196 164 210 172 226 166"/>';
      out += '<path class="gs-soft" d="M44 92 C26 88 14 96 2 90"/>';
      out += '<path class="gs-soft" d="M48 196 C28 200 16 192 2 198"/>';
      out += '<circle class="gs-glow" cx="190" cy="112" r="84"/>';
    }
    if (pose.deco === 'light'){
      var tip = tips[1] || { x: 150, y: 100 };
      var ox = tip.x + 18, oy = tip.y - 16;
      out += '<circle class="gs-glow" cx="' + fmt(ox) + '" cy="' + fmt(oy) + '" r="46"/>';
      out += '<circle class="gs-halo" cx="' + fmt(ox) + '" cy="' + fmt(oy) + '" r="18"/>';
      out += '<circle class="gs-dot" cx="' + fmt(ox) + '" cy="' + fmt(oy) + '" r="4.2"/>';
      for (var i = 0; i < 6; i++){
        var a = i / 6 * Math.PI * 2 - .4;
        var r1 = 25, r2 = 32 + (i % 2) * 4;
        out += '<path class="gs-accent" d="M' + fmt(ox + Math.cos(a) * r1) + ' ' + fmt(oy + Math.sin(a) * r1) +
          ' L' + fmt(ox + Math.cos(a) * r2) + ' ' + fmt(oy + Math.sin(a) * r2) + '"/>';
      }
      out += '<path class="gs-soft" d="M70 246 C98 258 142 258 170 244"/>';
    }
    if (pose.deco === 'name'){
      var tagX = pose.x + 8, tagY = pose.y + 78;
      out += '<path class="gs-accent" d="M' + tagX + ' ' + (tagY - 26) + ' C' + (tagX + 2) + ' ' + (tagY - 16) + ' ' + (tagX - 1) + ' ' + (tagY - 8) + ' ' + tagX + ' ' + tagY + '"/>';
      out += '<g transform="rotate(-7 ' + tagX + ' ' + (tagY + 20) + ')">';
      out += '<path class="' + cls('gs-paper') + '" d="M' + (tagX - 30) + ' ' + tagY + ' L' + (tagX + 30) + ' ' + tagY + ' L' + (tagX + 30) + ' ' + (tagY + 42) + ' L' + (tagX - 30) + ' ' + (tagY + 42) + ' Z"/>';
      out += '<circle class="gs-joint" cx="' + tagX + '" cy="' + (tagY + 8) + '" r="2"/>';
      out += '<path class="gs-soft" d="M' + (tagX - 18) + ' ' + (tagY + 22) + ' L' + (tagX + 14) + ' ' + (tagY + 22) + ' M' + (tagX - 18) + ' ' + (tagY + 30) + ' L' + (tagX + 6) + ' ' + (tagY + 30) + '"/>';
      out += '</g>';
      out += '<circle class="gs-glow" cx="' + pose.x + '" cy="' + pose.y + '" r="90"/>';
    }
    if (pose.deco === 'hang'){
      var t = tips[1] || { x: 0, y: -1 };
      var dx = toWorld(pose, t.x, t.y).x;
      var dy = toWorld(pose, t.x, t.y).y;
      out += '<path class="gs-soft" d="M' + fmt(dx) + ' ' + fmt(dy + 8) + ' L' + fmt(dx) + ' ' + fmt(dy + 22) + '"/>';
      out += '<circle class="gs-dot" cx="' + fmt(dx) + '" cy="' + fmt(dy + 32) + '" r="3"/>';
      out += '<circle class="gs-halo" cx="' + fmt(dx) + '" cy="' + fmt(dy + 32) + '" r="11"/>';
      out += '<path class="gs-soft" d="M84 24 C102 14 146 14 164 24"/>';
    }
    if (pose.deco === 'three'){
      for (var k = 0; k < 3; k++){
        var tp = tips[k];
        if (!tp) continue;
        var w = toWorld(pose, tp.x, tp.y - 12);
        out += '<circle class="gs-dot" cx="' + fmt(w.x) + '" cy="' + fmt(w.y) + '" r="2.4"/>';
        out += '<circle class="gs-halo" cx="' + fmt(w.x) + '" cy="' + fmt(w.y) + '" r="8"/>';
      }
      out += '<circle class="gs-ring" cx="120" cy="166" r="90"/>';
    }
    return out;
  }

  G.art = function(key, opts){
    opts = opts || {};
    var pose = POSES[key] || POSES.heart;
    delay = 0;
    var deco = decorate(pose, []);
    var hand = handMarkup(pose);
    /* 装饰里需要指尖位置，重新算一次（只有递光和三会用到） */
    deco = decorate(pose, hand.tips);

    var group = 'translate(' + pose.x + ' ' + pose.y + ') rotate(' + pose.rot + ')' + (pose.scale ? ' scale(' + pose.scale + ')' : '');
    var inner = hand.markup;
    var echo = '<g class="gs-echo" transform="' + group + ' translate(4 6)" aria-hidden="true">' + inner + '</g>';
    var main = '<g transform="' + group + '">' + inner + '</g>';

    var svg = '<svg class="gesture-art' + (opts.locked ? ' is-locked-art' : '') + '" viewBox="0 0 240 280" aria-hidden="true" focusable="false">' +
      deco + echo + main + '</svg>';
    return svg;
  };

  G.mount = function(el, key, opts){
    if (!el) return;
    el.innerHTML = G.art(key, opts);
  };

  G.pose = function(key){ return POSES[key] || null; };

  App.gestures = G;
})();
