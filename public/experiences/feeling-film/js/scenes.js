/* =========================================================
   十二个可以反复取用的片段：暮色、海、雨、灯、雾、桌面……
   全部由画布画出，不依赖外部图片。
   ========================================================= */
(function(){
  'use strict';

  var App = window.App = window.App || {};
  var U = App.util;

  var S = {};
  var scenes = [];
  var byId = {};
  var thumbs = {};
  var imageCache = {};
  var imageLoading = {};

  /* ---------------- 画布小帮手 ---------------- */

  function hexRgb(hex){
    hex = String(hex || '#000000').replace('#', '');
    if (hex.length === 3) hex = hex.split('').map(function(c){ return c + c; }).join('');
    return {
      r: parseInt(hex.slice(0, 2), 16) || 0,
      g: parseInt(hex.slice(2, 4), 16) || 0,
      b: parseInt(hex.slice(4, 6), 16) || 0
    };
  }
  function rgba(hex, a){
    var c = hexRgb(hex);
    return 'rgba(' + c.r + ',' + c.g + ',' + c.b + ',' + Math.max(0, Math.min(1, a)) + ')';
  }
  function mix(hexA, hexB, t){
    var a = hexRgb(hexA), b = hexRgb(hexB);
    t = U.clamp(t, 0, 1);
    function h(n){ var v = Math.round(a.r + (b.r - a.r) * t); return ('0' + Math.max(0, Math.min(255, v)).toString(16)).slice(-2); }
    return '#' + h() + h() + h();
  }

  function vgrad(ctx, x, y, w, h, stops){
    var g = ctx.createLinearGradient(0, y, 0, y + h);
    stops.forEach(function(s){ g.addColorStop(s[0], s[1]); });
    ctx.fillStyle = g;
    ctx.fillRect(x, y, w, h);
    return g;
  }

  function hgrad(ctx, x, y, w, h, stops){
    var g = ctx.createLinearGradient(x, 0, x + w, 0);
    stops.forEach(function(s){ g.addColorStop(s[0], s[1]); });
    ctx.fillStyle = g;
    ctx.fillRect(x, y, w, h);
    return g;
  }

  function glow(ctx, x, y, r, color, alpha){
    if (r <= 0) return;
    var g = ctx.createRadialGradient(x, y, 0, x, y, r);
    g.addColorStop(0, rgba(color, alpha == null ? .55 : alpha));
    g.addColorStop(.45, rgba(color, (alpha == null ? .55 : alpha) * .34));
    g.addColorStop(1, rgba(color, 0));
    ctx.fillStyle = g;
    ctx.fillRect(x - r, y - r, r * 2, r * 2);
  }

  function softEllipse(ctx, x, y, rx, ry, color, alpha){
    if (rx <= 0 || ry <= 0) return;
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(1, ry / rx);
    var g = ctx.createRadialGradient(0, 0, 0, 0, 0, rx);
    g.addColorStop(0, rgba(color, alpha));
    g.addColorStop(.55, rgba(color, alpha * .62));
    g.addColorStop(1, rgba(color, 0));
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(0, 0, rx, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  function ridge(ctx, w, h, baseY, amp, freq, phase, color, seed){
    ctx.beginPath();
    ctx.moveTo(-20, h + 20);
    for (var x = -20; x <= w + 20; x += 7){
      var u = x / w;
      var y = baseY
        - Math.sin(u * Math.PI * 2 * freq + phase) * amp
        - Math.sin(u * Math.PI * 2 * freq * 2.3 + phase * 1.7) * amp * .32
        - Math.sin(u * Math.PI * 2 * freq * .53 + phase * 2.4) * amp * .5;
      ctx.lineTo(x, y);
    }
    ctx.lineTo(w + 20, h + 20);
    ctx.closePath();
    ctx.fillStyle = color;
    ctx.fill();
  }

  function bird(ctx, x, y, s, color, a){
    ctx.save();
    ctx.strokeStyle = rgba(color, a == null ? .55 : a);
    ctx.lineWidth = Math.max(1, 1.4 * s);
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(x - 9 * s, y);
    ctx.quadraticCurveTo(x - 4 * s, y - 5 * s, x, y - 1 * s);
    ctx.quadraticCurveTo(x + 4 * s, y - 5 * s, x + 9 * s, y);
    ctx.stroke();
    ctx.restore();
  }

  function birds(ctx, w, h, seed, yBase, count, color, alpha){
    var rnd = U.rng(seed);
    for (var i = 0; i < (count || 3); i++){
      var x = w * (.2 + rnd() * .62);
      var y = h * (yBase + rnd() * .12);
      bird(ctx, x, y, .55 + rnd() * .7, color, (alpha || .4) * (.6 + rnd() * .5));
    }
  }

  function stars(ctx, w, h, count, seed, color, alpha){
    var rnd = U.rng(seed);
    ctx.save();
    for (var i = 0; i < count; i++){
      var x = rnd() * w;
      var y = rnd() * h * .66;
      var r = rnd() * 1.25 + .3;
      ctx.globalAlpha = (alpha || .4) * (.3 + rnd() * .7);
      ctx.fillStyle = color || '#ece2cf';
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  function dust(ctx, w, h, t, count, seed, color, alpha, region){
    var rnd = U.rng(seed);
    var rx = region ? region[0] : 0, ry = region ? region[1] : 0;
    var rw = region ? region[2] : w, rh = region ? region[3] : h;
    ctx.save();
    for (var i = 0; i < count; i++){
      var bx = rx + rnd() * rw;
      var by = ry + rnd() * rh;
      var speed = .12 + rnd() * .32;
      var x = bx + Math.sin(t * speed + i * 2.1) * (7 + rnd() * 16);
      var y = by + Math.cos(t * speed * .7 + i) * (5 + rnd() * 10);
      var r = .6 + rnd() * 1.7;
      ctx.globalAlpha = (alpha || .25) * (.3 + rnd() * .7);
      ctx.fillStyle = color || '#e8cfa3';
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  function rain(ctx, w, h, t, count, color, alpha){
    ctx.save();
    ctx.strokeStyle = rgba(color || '#cfd8d5', alpha == null ? .18 : alpha);
    ctx.lineWidth = 1;
    for (var i = 0; i < count; i++){
      var seed = i * 37.7;
      var x = ((seed * 53.3 + Math.sin(seed) * 200) % (w + 160)) - 80;
      var len = 12 + (i % 5) * 7;
      var speed = 210 + (i % 7) * 26;
      var y = ((t * speed + i * 71.3) % (h + 180)) - 90;
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x - len * .18, y + len);
      ctx.stroke();
    }
    ctx.restore();
  }

  function person(ctx, x, y, s, color, opts){
    opts = opts || {};
    ctx.save();
    ctx.fillStyle = color;
    ctx.strokeStyle = color;
    ctx.lineCap = 'round';
    var headR = 7.6 * s;
    var headY = y - 55 * s;
    ctx.beginPath();
    ctx.arc(x, headY, headR, 0, Math.PI * 2);
    ctx.fill();
    ctx.lineWidth = 9 * s;
    ctx.beginPath();
    ctx.moveTo(x, headY + headR * .9);
    ctx.lineTo(x, y - 30 * s);
    ctx.stroke();
    ctx.lineWidth = 6.2 * s;
    ctx.beginPath();
    ctx.moveTo(x, y - 30 * s);
    ctx.lineTo(x - 8 * s, y);
    ctx.moveTo(x, y - 30 * s);
    ctx.lineTo(x + 8 * s, y);
    ctx.stroke();
    ctx.lineWidth = 4.4 * s;
    ctx.beginPath();
    ctx.moveTo(x - 7 * s, y - 46 * s);
    ctx.lineTo(x - 14 * s, y - 30 * s);
    ctx.moveTo(x + 7 * s, y - 46 * s);
    ctx.lineTo(x + 12 * s, y - 32 * s);
    ctx.stroke();
    if (opts.umbrella){
      ctx.strokeStyle = rgba(color, .9);
      ctx.lineWidth = 2 * s;
      ctx.beginPath();
      ctx.moveTo(x, headY - headR);
      ctx.lineTo(x, headY + headR * 2.2);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(x, headY - headR * 1.5, 27 * s, Math.PI, 0);
      ctx.fillStyle = color;
      ctx.fill();
      ctx.beginPath();
      ctx.arc(x, headY - headR * 1.5, 27 * s, Math.PI * .08, Math.PI * .92);
      ctx.stroke();
    }
    if (opts.hand){
      ctx.lineWidth = 4.6 * s;
      ctx.beginPath();
      ctx.moveTo(x + 6 * s, y - 38 * s);
      ctx.lineTo(x + opts.hand * 12 * s, y - 34 * s);
      ctx.stroke();
    }
    ctx.restore();
  }

  function cat(ctx, x, y, s, color){
    ctx.save();
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.ellipse(x, y - 8 * s, 22 * s, 13 * s, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(x + 20 * s, y - 16 * s, 9 * s, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(x + 14 * s, y - 22 * s);
    ctx.lineTo(x + 17 * s, y - 31 * s);
    ctx.lineTo(x + 22 * s, y - 23 * s);
    ctx.closePath();
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(x + 24 * s, y - 22 * s);
    ctx.lineTo(x + 28 * s, y - 30 * s);
    ctx.lineTo(x + 31 * s, y - 20 * s);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = rgba(color, .9);
    ctx.lineWidth = 3.4 * s;
    ctx.beginPath();
    ctx.moveTo(x - 20 * s, y - 10 * s);
    ctx.quadraticCurveTo(x - 34 * s, y - 16 * s, x - 32 * s, y - 28 * s);
    ctx.stroke();
    ctx.restore();
  }

  function texture(ctx, w, h, seed, alpha){
    var rnd = U.rng(seed);
    ctx.save();
    ctx.globalCompositeOperation = 'overlay';
    for (var i = 0; i < 120; i++){
      ctx.globalAlpha = (alpha || .018) * (.4 + rnd());
      ctx.fillStyle = rnd() > .5 ? '#ffffff' : '#000000';
      var x = rnd() * w, y = rnd() * h, r = rnd() * 1.4;
      ctx.fillRect(x, y, r, r);
    }
    ctx.restore();
  }

  /* ---------------- 一、暮色窗台 ---------------- */
  function drawDuskWindow(ctx, w, h, t){
    var wall = vgrad(ctx, 0, 0, w, h, [[0, '#232526'], [.45, '#1a1d1c'], [1, '#0d100f']]);
    wall = null;
    softEllipse(ctx, w * .5, h * .48, w * .5, h * .42, '#c89b5a', .1);

    var wx = w * .13, wy = h * .085, ww = w * .74, wh = h * .57;
    ctx.save();
    ctx.beginPath();
    ctx.rect(wx, wy, ww, wh);
    ctx.clip();
    vgrad(ctx, 0, wy, w, wh, [[0, '#2b3240'], [.36, '#5c5b5c'], [.68, '#b7835f'], [1, '#dba36d']]);
    glow(ctx, wx + ww * .64, wy + wh * .74, wh * .52, '#e9b077', .5);
    var sx = wx + ww * .64, sy = wy + wh * .73;
    var sun = ctx.createRadialGradient(sx, sy, 0, sx, sy, h * .055);
    sun.addColorStop(0, 'rgba(255,239,209,.95)');
    sun.addColorStop(.35, 'rgba(247,199,139,.75)');
    sun.addColorStop(1, 'rgba(247,199,139,0)');
    ctx.fillStyle = sun;
    ctx.fillRect(sx - h * .07, sy - h * .07, h * .14, h * .14);

    ridge(ctx, w, h, wy + wh * .8, wh * .055, 1.3, 1.2, '#4c4647', 2);
    ridge(ctx, w, h, wy + wh * .84, wh * .04, 2.1, .1, '#353638', 4);
    var rnd = U.rng(11);
    for (var i = 0; i < 8; i++){
      var bx = wx + rnd() * ww;
      var bw = ww * (.06 + rnd() * .08);
      var bh = wh * (.07 + rnd() * .1);
      ctx.fillStyle = rgba('#23282c', .8);
      ctx.fillRect(bx, wy + wh * .86 - bh, bw, bh + 20);
      for (var j = 0; j < 4; j++){
        if (rnd() > .54){
          ctx.fillStyle = rgba('#d8ab72', .35 + rnd() * .3);
          ctx.fillRect(bx + bw * (.15 + rnd() * .6), wy + wh * .86 - bh * (.3 + rnd() * .5), 2.2, 2.8);
        }
      }
    }
    bird(ctx, wx + ww * .38, wy + wh * .34, .9, '#3d3a3a', .55);
    bird(ctx, wx + ww * .43, wy + wh * .31, .65, '#3d3a3a', .5);
    ctx.restore();

    ctx.strokeStyle = '#0c0d0c';
    ctx.lineWidth = Math.max(10, w * .012);
    ctx.strokeRect(wx - ctx.lineWidth / 2, wy - ctx.lineWidth / 2, ww + ctx.lineWidth, wh + ctx.lineWidth);
    ctx.strokeStyle = rgba('#8b755d', .5);
    ctx.lineWidth = 2;
    ctx.strokeRect(wx + 2, wy + 2, ww - 4, wh - 4);

    ctx.fillStyle = '#101312';
    ctx.fillRect(wx + ww * .49, wy, ww * .02, wh);
    ctx.fillRect(wx, wy + wh * .42, ww, wh * .014);

    /* 帘子 */
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(wx - w * .02, wy - h * .02);
    ctx.lineTo(wx + ww * .17, wy - h * .02);
    ctx.quadraticCurveTo(wx + ww * .13 + Math.sin(t * .24) * 6, wy + wh * .4, wx + ww * .16, wy + wh * .98);
    ctx.lineTo(wx - w * .02, wy + wh * .98);
    ctx.closePath();
    ctx.fillStyle = 'rgba(214,196,169,.14)';
    ctx.fill();
    ctx.restore();
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(wx + ww * .84, wy - h * .02);
    ctx.lineTo(wx + ww + w * .03, wy - h * .02);
    ctx.lineTo(wx + ww + w * .03, wy + wh * .96);
    ctx.lineTo(wx + ww * .86, wy + wh * .96);
    ctx.quadraticCurveTo(wx + ww * .82 + Math.sin(t * .2 + 2) * 5, wy + wh * .45, wx + ww * .84, wy - h * .02);
    ctx.closePath();
    ctx.fillStyle = 'rgba(214,196,169,.1)';
    ctx.fill();
    ctx.restore();

    /* 窗台 */
    var sillY = wy + wh;
    var sillG = vgrad(ctx, 0, sillY, w, h * .06, [[0, '#4f4438'], [.55, '#302a23'], [1, '#181613']]);
    ctx.fillStyle = sillG;
    ctx.fillRect(wx - w * .035, sillY, ww + w * .07, h * .052);
    ctx.fillStyle = 'rgba(236,226,207,.08)';
    ctx.fillRect(wx - w * .035, sillY, ww + w * .07, 2);
    softEllipse(ctx, wx + ww * .55, sillY + h * .02, ww * .43, h * .045, '#e4ae72', .18);

    /* 陶盆与植物 */
    var px = wx + ww * .23, py = sillY + h * .012;
    ctx.fillStyle = '#2b2521';
    ctx.beginPath();
    ctx.moveTo(px - w * .022, py);
    ctx.lineTo(px + w * .022, py);
    ctx.lineTo(px + w * .016, py + h * .05);
    ctx.lineTo(px - w * .016, py + h * .05);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = '#2f3b31';
    ctx.lineWidth = Math.max(1.6, w * .0018);
    var stems = [
      [-.03, -.11, -.055, -.2], [.005, -.16, .02, -.25], [.03, -.08, .07, -.16], [-.065, -.06, -.1, -.12]
    ];
    stems.forEach(function(st, i){
      ctx.beginPath();
      ctx.moveTo(px, py);
      ctx.quadraticCurveTo(px + w * st[0], py + h * st[1], px + w * st[2], py + h * st[3]);
      ctx.stroke();
      for (var k = 0; k < 3; k++){
        var lx = px + w * (st[2] * (k + 1) / 3.4);
        var ly = py + h * (st[3] * (k + 1) / 3.5);
        ctx.beginPath();
        ctx.ellipse(lx, ly, w * .012, h * .016, .6 + i, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(44,58,46,.85)';
        ctx.fill();
      }
    });

    /* 窗台上的书 */
    ctx.fillStyle = '#3a2f27';
    ctx.fillRect(wx + ww * .69, sillY + h * .012, w * .075, h * .014);
    ctx.fillStyle = '#594639';
    ctx.fillRect(wx + ww * .69, sillY + h * .026, w * .07, h * .011);

    softEllipse(ctx, w * .74, h * .9, w * .42, h * .3, '#c89b5a', .045);
    dust(ctx, w, h, t, 42, 21, '#efd0a4', .22, [wx, wy, ww, wh]);
    texture(ctx, w, h, 3, .016);
  }

  /* ---------------- 二、退潮的海 ---------------- */
  function drawEbbTide(ctx, w, h, t){
    vgrad(ctx, 0, 0, w, h, [[0, '#49555c'], [.3, '#7d8281'], [.5, '#c0a48b'], [.66, '#d9b18b'], [1, '#8f7a66']]);
    bgClouds(ctx, w, h, t, 31);
    var horizon = h * .54;
    var sx = w * .38, sy = horizon - h * .035;
    glow(ctx, sx, sy, w * .32, '#e9b47d', .38);
    var g = ctx.createRadialGradient(sx, sy, 0, sx, sy, w * .075);
    g.addColorStop(0, 'rgba(255,238,205,.9)');
    g.addColorStop(.4, 'rgba(247,200,143,.45)');
    g.addColorStop(1, 'rgba(247,200,143,0)');
    ctx.fillStyle = g;
    ctx.fillRect(sx - w * .1, sy - w * .1, w * .2, w * .2);

    vgrad(ctx, 0, horizon, w, h * .22, [[0, '#76898b'], [.4, '#5f7477'], [1, '#465c60']]);
    ctx.strokeStyle = 'rgba(235,222,201,.2)';
    ctx.lineWidth = 1;
    for (var i = 0; i < 16; i++){
      var yy = horizon + h * .012 + i * h * .011;
      ctx.beginPath();
      for (var x = -20; x < w + 20; x += 14){
        var yy2 = yy + Math.sin(x * .012 + t * .7 + i * 1.7) * (1 + i * .12);
        if (x === -20) ctx.moveTo(x, yy2); else ctx.lineTo(x, yy2);
      }
      ctx.stroke();
    }

    /* 落日在水里碎掉的光 */
    ctx.save();
    for (var k = 0; k < 28; k++){
      var frac = k / 28;
      var yy3 = horizon + h * .015 + frac * h * .19;
      var spread = w * (.02 + frac * .07);
      var offset = Math.sin(t * .8 + k * 1.9) * spread;
      var len = w * (.012 + Math.random() * 0);
      ctx.globalAlpha = .38 * (1 - frac * .5);
      ctx.fillStyle = '#f2c68f';
      ctx.fillRect(sx + offset - len * .4, yy3, len * (1 - frac * .55), 2);
    }
    ctx.restore();

    /* 湿沙 */
    var sand = vgrad(ctx, 0, horizon + h * .19, w, h * .4, [[0, '#b8a389'], [.35, '#9a846d'], [1, '#6b5a4a']]);
    ctx.fillStyle = sand;
    ctx.beginPath();
    ctx.moveTo(0, horizon + h * .24);
    ctx.quadraticCurveTo(w * .3, horizon + h * .19, w * .55, horizon + h * .22);
    ctx.quadraticCurveTo(w * .82, horizon + h * .25, w, horizon + h * .2);
    ctx.lineTo(w, h);
    ctx.lineTo(0, h);
    ctx.closePath();
    ctx.fill();

    /* 退潮留下的水痕 */
    ctx.strokeStyle = 'rgba(232,220,199,.22)';
    ctx.lineWidth = 2;
    for (var s = 0; s < 4; s++){
      ctx.beginPath();
      for (var x2 = 0; x2 <= w; x2 += 12){
        var y4 = horizon + h * (.23 + s * .035) + Math.sin(x2 * .006 + s * 2 + t * .12) * (6 + s * 3);
        if (x2 === 0) ctx.moveTo(0, y4); else ctx.lineTo(x2, y4);
      }
      ctx.stroke();
    }
    softEllipse(ctx, sx, horizon + h * .27, w * .17, h * .035, '#edc492', .22);

    /* 脚印 */
    ctx.fillStyle = 'rgba(78,63,48,.3)';
    for (var f = 0; f < 7; f++){
      var fx = w * .5 + Math.sin(f * 1.3) * w * .06 + f * w * .035;
      var fy = h * .76 + f * h * .027;
      ctx.beginPath();
      ctx.ellipse(fx, fy, 6 + f, 3 + f * .4, -.4, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.ellipse(fx + 13 + f, fy + 5, 5 + f * .7, 2.6 + f * .3, -.4, 0, Math.PI * 2);
      ctx.fill();
    }

    birds(ctx, w, h, 77, .26, 4, '#3d4242', .35);
    dust(ctx, w, h, t, 16, 8, '#f3d4a7', .15, [w * .25, h * .4, w * .5, h * .25]);
    texture(ctx, w, h, 9, .02);
  }

  function bgClouds(ctx, w, h, t, seed){
    var rnd = U.rng(seed);
    for (var i = 0; i < 7; i++){
      var x = (rnd() * w + t * (2 + rnd() * 4)) % (w * 1.2) - w * .1;
      var y = h * (.08 + rnd() * .34);
      var rx = w * (.1 + rnd() * .16);
      softEllipse(ctx, x, y, rx, rx * .22, '#e6d8c5', .12 + rnd() * .1);
    }
  }

  /* ---------------- 三、雨后的路口 ---------------- */
  function drawAfterRain(ctx, w, h, t){
    vgrad(ctx, 0, 0, w, h, [[0, '#232d32'], [.35, '#39434a'], [.52, '#5d5a57'], [1, '#151a1a']]);
    glow(ctx, w * .52, h * .5, w * .36, '#c79262', .16);
    var vpX = w * .5, vpY = h * .52;

    /* 楼影 */
    var rnd = U.rng(41);
    for (var side = 0; side < 2; side++){
      var dir = side ? 1 : -1;
      for (var i = 0; i < 6; i++){
        var bw = w * (.06 + rnd() * .07);
        var bh = h * (.18 + rnd() * .34);
        var bx = side ? w * (.62 + i * .065) : w * (.36 - i * .065 - bw);
        ctx.fillStyle = rgba(i % 2 ? '#1c2427' : '#22292b', .96);
        ctx.fillRect(bx, vpY - bh, bw, bh + h * .1);
        for (var j = 0; j < 5; j++){
          if (rnd() > .6){
            ctx.fillStyle = rgba('#c99c68', .18 + rnd() * .4);
            ctx.fillRect(bx + bw * (.15 + rnd() * .65), vpY - bh + bh * (.18 + rnd() * .62), 3, 4);
          }
        }
      }
    }

    /* 路面 */
    ctx.beginPath();
    ctx.moveTo(vpX - w * .02, vpY);
    ctx.lineTo(vpX + w * .02, vpY);
    ctx.lineTo(w * 1.1, h);
    ctx.lineTo(-w * .1, h);
    ctx.closePath();
    var road = vgrad(ctx, 0, vpY, w, h - vpY, [[0, '#3a3d3c'], [.25, '#252b2c'], [1, '#141a1b']]);
    ctx.fillStyle = road;
    ctx.fill();

    /* 两边人行道 */
    ctx.fillStyle = '#2b2f2e';
    ctx.beginPath(); ctx.moveTo(0, vpY); ctx.lineTo(vpX - w * .02, vpY); ctx.lineTo(-w * .1, h); ctx.lineTo(0, h); ctx.closePath(); ctx.fill();
    ctx.beginPath(); ctx.moveTo(w, vpY); ctx.lineTo(vpX + w * .02, vpY); ctx.lineTo(w * 1.1, h); ctx.lineTo(w, h); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = 'rgba(236,226,207,.16)';
    ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(vpX - w * .02, vpY); ctx.lineTo(-w * .1, h); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(vpX + w * .02, vpY); ctx.lineTo(w * 1.1, h); ctx.stroke();

    /* 人行横道 */
    ctx.save();
    ctx.globalAlpha = .3;
    for (var c = 0; c < 7; c++){
      var fy = h * (.7 + c * .038);
      var spread = (fy - vpY) * .52;
      ctx.fillStyle = '#d9d3c6';
      ctx.beginPath();
      ctx.moveTo(vpX - spread * .34, fy);
      ctx.lineTo(vpX + spread * .14, fy);
      ctx.lineTo(vpX + spread * .18, fy + h * .017);
      ctx.lineTo(vpX - spread * .4, fy + h * .017);
      ctx.closePath();
      ctx.fill();
    }
    ctx.restore();

    /* 路灯 */
    function lamp(lx, ly, scale, intensity){
      glow(ctx, lx, ly, w * .12 * scale, '#e7b77c', intensity);
      ctx.strokeStyle = '#151a1a';
      ctx.lineWidth = Math.max(3, w * .006 * scale);
      ctx.beginPath();
      ctx.moveTo(lx + w * .04 * scale, h * .98);
      ctx.lineTo(lx + w * .04 * scale, ly + h * .03);
      ctx.quadraticCurveTo(lx + w * .04 * scale, ly, lx, ly);
      ctx.stroke();
      ctx.fillStyle = '#f1c58c';
      ctx.beginPath();
      ctx.ellipse(lx, ly + 2, w * .012 * scale, w * .0045 * scale, 0, 0, Math.PI * 2);
      ctx.fill();
      /* 湿地上的倒影 */
      var refl = ctx.createLinearGradient(0, ly, 0, h);
      refl.addColorStop(0, rgba('#e7b77c', .3 * intensity));
      refl.addColorStop(1, rgba('#e7b77c', 0));
      ctx.fillStyle = refl;
      ctx.fillRect(lx - w * .012 * scale, ly, w * .024 * scale, h - ly);
    }
    lamp(w * .24, h * .22, 1.15, .8);
    lamp(w * .79, h * .34, .7, .5);

    /* 信号灯 */
    glow(ctx, w * .55, h * .43, w * .035, '#a2574a', .5);
    ctx.fillStyle = '#a2574a';
    ctx.beginPath(); ctx.arc(w * .55, h * .43, 3.2, 0, Math.PI * 2); ctx.fill();

    /* 打伞的人 */
    person(ctx, w * .66, h * .74, 1.5, 'rgba(9,13,13,.9)', { umbrella: true });
    softEllipse(ctx, w * .66, h * .755, w * .05, h * .01, '#080b0b', .4);

    /* 水洼与涟漪 */
    for (var p = 0; p < 7; p++){
      var px = w * (.16 + (p * .137) % .7);
      var py = h * (.62 + (p * .079) % .3);
      ctx.strokeStyle = rgba('#c9d2ca', .12);
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.ellipse(px, py, 12 + p * 2 + Math.sin(t + p) * 2, 3 + p * .5, -.12, 0, Math.PI * 2);
      ctx.stroke();
    }
    rain(ctx, w, h, t, 90, '#c9d4d2', .14);
    texture(ctx, w, h, 13, .02);
  }

  /* ---------------- 四、路灯与树 ---------------- */
  function drawStreetTree(ctx, w, h, t){
    vgrad(ctx, 0, 0, w, h, [[0, '#0c1617'], [.42, '#122022'], [.7, '#182422'], [1, '#0a0f0e']]);
    glow(ctx, w * .2, h * .23, w * .28, '#d7a261', .42);
    glow(ctx, w * .75, h * .16, w * .24, '#5e7c74', .12);
    stars(ctx, w, h, 30, 5, '#dfe4d8', .22);

    /* 路灯 */
    ctx.strokeStyle = '#0d1413';
    ctx.lineWidth = Math.max(5, w * .008);
    ctx.beginPath();
    ctx.moveTo(w * .19, h * .94);
    ctx.lineTo(w * .19, h * .19);
    ctx.quadraticCurveTo(w * .19, h * .13, w * .245, h * .13);
    ctx.stroke();
    var lx = w * .25, ly = h * .135;
    glow(ctx, lx, ly + h * .02, w * .16, '#e7b77c', .72);
    softEllipse(ctx, lx, ly + h * .02, w * .028, h * .012, '#f6d3a0', .9);
    ctx.fillStyle = '#f8dbb0';
    ctx.beginPath(); ctx.arc(lx, ly + h * .018, 3.6, 0, Math.PI * 2); ctx.fill();

    /* 树 */
    ctx.strokeStyle = '#0a0e0c';
    ctx.lineCap = 'round';
    ctx.lineWidth = Math.max(12, w * .022);
    ctx.beginPath();
    ctx.moveTo(w * .73, h * 1.02);
    ctx.quadraticCurveTo(w * .7, h * .64, w * .75, h * .42);
    ctx.stroke();
    ctx.lineWidth = Math.max(5, w * .009);
    var branches = [
      [.75, .42, .62, .28, .52, .2],
      [.75, .42, .87, .3, .96, .22],
      [.74, .48, .6, .5, .48, .46],
      [.76, .36, .82, .18, .9, .12],
      [.73, .52, .86, .5, .95, .42]
    ];
    branches.forEach(function(b){
      ctx.beginPath();
      ctx.moveTo(w * b[0], h * b[1]);
      ctx.quadraticCurveTo(w * b[2], h * b[3], w * b[4], h * b[5]);
      ctx.stroke();
    });
    var rnd = U.rng(61);
    for (var i = 0; i < 36; i++){
      var cx = w * (.45 + rnd() * .52);
      var cy = h * (.06 + rnd() * .46);
      var r = w * (.01 + rnd() * .026);
      ctx.fillStyle = rgba(rnd() > .55 ? '#25382c' : '#1a2b23', .55 + rnd() * .35);
      ctx.beginPath();
      ctx.ellipse(cx, cy, r, r * (.55 + rnd() * .4), rnd() * 3, 0, Math.PI * 2);
      ctx.fill();
    }
    /* 叶子上的光斑 */
    for (var b2 = 0; b2 < 15; b2++){
      var bx = w * (.5 + rnd() * .44);
      var by = h * (.1 + rnd() * .36);
      ctx.globalAlpha = .14 + rnd() * .28;
      ctx.fillStyle = '#ecc186';
      ctx.beginPath(); ctx.arc(bx, by, 2 + rnd() * 4.5, 0, Math.PI * 2); ctx.fill();
    }
    ctx.globalAlpha = 1;

    /* 地面 */
    var ground = vgrad(ctx, 0, h * .76, w, h * .24, [[0, '#1a211e'], [1, '#0a0e0c']]);
    ctx.fillStyle = ground;
    ctx.fillRect(0, h * .76, w, h * .24);
    softEllipse(ctx, w * .28, h * .86, w * .24, h * .05, '#d9a86d', .13);

    /* 长椅 */
    ctx.fillStyle = '#0d1210';
    ctx.fillRect(w * .08, h * .79, w * .14, h * .012);
    ctx.fillRect(w * .08, h * .82, w * .14, h * .012);
    ctx.fillRect(w * .09, h * .79, w * .008, h * .1);
    ctx.fillRect(w * .21, h * .79, w * .008, h * .1);

    /* 飘落的叶子 */
    for (var l = 0; l < 7; l++){
      var lx2 = w * (.5 + ((l * .13 + t * .012) % .4));
      var ly2 = h * (.5 + ((l * .09 + t * .02) % .35));
      ctx.save();
      ctx.translate(lx2, ly2);
      ctx.rotate(t * .5 + l);
      ctx.fillStyle = 'rgba(108,92,62,.5)';
      ctx.beginPath(); ctx.ellipse(0, 0, 4, 1.7, 0, 0, Math.PI * 2); ctx.fill();
      ctx.restore();
    }
    dust(ctx, w, h, t, 30, 33, '#e8c99c', .2, [w * .2, h * .15, w * .35, h * .5]);
    texture(ctx, w, h, 17, .018);
  }

  /* ---------------- 五、清晨的雾 ---------------- */
  function drawMorningFog(ctx, w, h, t){
    vgrad(ctx, 0, 0, w, h, [[0, '#b9c4b8'], [.4, '#d4d8c7'], [.68, '#e5ddc8'], [1, '#b8b39e']]);
    var sx = w * .74, sy = h * .22;
    glow(ctx, sx, sy, w * .28, '#f5e4be', .38);
    var sun = ctx.createRadialGradient(sx, sy, 0, sx, sy, w * .04);
    sun.addColorStop(0, 'rgba(255,248,225,.8)');
    sun.addColorStop(1, 'rgba(255,248,225,0)');
    ctx.fillStyle = sun;
    ctx.fillRect(sx - w * .05, sy - w * .05, w * .1, w * .1);

    ridge(ctx, w, h, h * .54, h * .05, .8, 2.1, 'rgba(142,158,144,.55)', 1);
    ridge(ctx, w, h, h * .59, h * .06, 1.3, .7, 'rgba(114,132,118,.62)', 2);
    ridge(ctx, w, h, h * .65, h * .045, 2.1, 2.7, 'rgba(88,108,92,.7)', 3);
    ridge(ctx, w, h, h * .72, h * .055, 1.7, 1.3, 'rgba(62,82,66,.8)', 4);

    /* 雾带 */
    for (var i = 0; i < 6; i++){
      var y = h * (.56 + i * .034);
      var offset = Math.sin(t * .14 + i * 1.8) * w * .03;
      var g = ctx.createLinearGradient(0, 0, w, 0);
      g.addColorStop(0, 'rgba(232,232,216,0)');
      g.addColorStop(.3, 'rgba(232,232,216,.22)');
      g.addColorStop(.7, 'rgba(232,232,216,.18)');
      g.addColorStop(1, 'rgba(232,232,216,0)');
      ctx.fillStyle = g;
      ctx.fillRect(offset - w * .1, y, w * 1.2, h * (.016 + i * .005));
    }

    /* 前景草坡 */
    var field = vgrad(ctx, 0, h * .76, w, h * .24, [[0, '#5a6650'], [1, '#2e3a2e']]);
    ctx.fillStyle = field;
    ctx.beginPath();
    ctx.moveTo(0, h * .81);
    ctx.quadraticCurveTo(w * .3, h * .74, w * .62, h * .8);
    ctx.quadraticCurveTo(w * .84, h * .84, w, h * .79);
    ctx.lineTo(w, h); ctx.lineTo(0, h); ctx.closePath(); ctx.fill();
    var rnd = U.rng(71);
    ctx.strokeStyle = 'rgba(42,54,40,.65)';
    ctx.lineWidth = 1.2;
    for (var g2 = 0; g2 < 110; g2++){
      var gx = rnd() * w;
      var gy = h * (.82 + rnd() * .16);
      ctx.beginPath();
      ctx.moveTo(gx, gy);
      ctx.quadraticCurveTo(gx + 2, gy - 8 - rnd() * 12, gx + 4 + rnd() * 6, gy - 10 - rnd() * 16);
      ctx.stroke();
    }
    bird(ctx, w * .3, h * .2, .7, '#5e675c', .3);
    bird(ctx, w * .34, h * .23, .5, '#5e675c', .25);
    dust(ctx, w, h, t, 26, 43, '#f6ecd4', .18, [0, h * .2, w, h * .5]);
    texture(ctx, w, h, 19, .012);
  }

  /* ---------------- 六、桌角的光 ---------------- */
  function drawDeskLight(ctx, w, h, t){
    vgrad(ctx, 0, 0, w, h, [[0, '#1b211d'], [.5, '#24241e'], [1, '#0b0d0b']]);
    /* 夜窗 */
    var wx = w * .65, wy = h * .1, ww = w * .26, wh = h * .42;
    vgrad(ctx, wx, wy, ww, wh, [[0, '#1b2b34'], [.65, '#32444a'], [1, '#1a272b']]);
    glow(ctx, wx + ww * .68, wy + wh * .3, ww * .45, '#cfd9ce', .18);
    ctx.strokeStyle = '#0a0d0c';
    ctx.lineWidth = 6;
    ctx.strokeRect(wx, wy, ww, wh);
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(wx + ww / 2, wy); ctx.lineTo(wx + ww / 2, wy + wh);
    ctx.moveTo(wx, wy + wh / 2); ctx.lineTo(wx + ww, wy + wh / 2);
    ctx.stroke();

    /* 桌面 */
    var deskY = h * .66;
    var desk = vgrad(ctx, 0, deskY, w, h - deskY, [[0, '#5b4129'], [.3, '#4a3422'], [1, '#1d150f']]);
    ctx.fillStyle = desk;
    ctx.fillRect(0, deskY, w, h - deskY);
    ctx.fillStyle = 'rgba(236,197,139,.14)';
    ctx.fillRect(0, deskY, w, 2);

    /* 台灯 */
    var lampX = w * .24, lampBaseY = deskY + h * .015;
    ctx.strokeStyle = '#17140f';
    ctx.fillStyle = '#17140f';
    ctx.lineWidth = Math.max(5, w * .006);
    ctx.beginPath();
    ctx.moveTo(lampX, lampBaseY);
    ctx.lineTo(lampX, h * .35);
    ctx.stroke();
    ctx.beginPath();
    ctx.ellipse(lampX, lampBaseY, w * .045, h * .012, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(lampX, h * .35);
    ctx.quadraticCurveTo(lampX + w * .005, h * .27, lampX + w * .075, h * .26);
    ctx.stroke();
    /* 灯罩 */
    var shadeX = lampX + w * .085, shadeY = h * .255;
    glow(ctx, shadeX, shadeY + h * .03, w * .13, '#eab877', .55);
    ctx.fillStyle = '#c99a61';
    ctx.beginPath();
    ctx.moveTo(shadeX - w * .025, shadeY + h * .035);
    ctx.lineTo(shadeX + w * .025, shadeY + h * .035);
    ctx.lineTo(shadeX + w * .012, shadeY - h * .01);
    ctx.lineTo(shadeX - w * .018, shadeY - h * .01);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#f7d8a4';
    ctx.beginPath();
    ctx.ellipse(shadeX, shadeY + h * .035, w * .026, h * .006, 0, 0, Math.PI * 2);
    ctx.fill();

    /* 光锥 */
    ctx.save();
    var cone = ctx.createLinearGradient(shadeX, shadeY, shadeX, deskY);
    cone.addColorStop(0, 'rgba(244,196,130,.3)');
    cone.addColorStop(1, 'rgba(244,196,130,0)');
    ctx.fillStyle = cone;
    ctx.beginPath();
    ctx.moveTo(shadeX - w * .02, shadeY);
    ctx.lineTo(shadeX + w * .02, shadeY);
    ctx.lineTo(shadeX + w * .16, deskY);
    ctx.lineTo(shadeX - w * .12, deskY);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
    softEllipse(ctx, shadeX + w * .01, deskY + h * .02, w * .17, h * .045, '#e7b472', .24);

    /* 杯子 */
    var cupX = w * .58, cupY = deskY;
    ctx.fillStyle = '#c8b9a1';
    ctx.beginPath();
    ctx.moveTo(cupX - w * .026, cupY - h * .085);
    ctx.lineTo(cupX + w * .026, cupY - h * .085);
    ctx.quadraticCurveTo(cupX + w * .022, cupY, cupX + w * .016, cupY);
    ctx.lineTo(cupX - w * .016, cupY);
    ctx.quadraticCurveTo(cupX - w * .022, cupY, cupX - w * .026, cupY - h * .085);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = '#c8b9a1';
    ctx.lineWidth = Math.max(2, w * .003);
    ctx.beginPath();
    ctx.arc(cupX + w * .027, cupY - h * .05, w * .014, -1.2, 1.2);
    ctx.stroke();
    ctx.fillStyle = '#4a3522';
    ctx.beginPath();
    ctx.ellipse(cupX, cupY - h * .085, w * .026, h * .007, 0, 0, Math.PI * 2);
    ctx.fill();
    /* 热气 */
    ctx.strokeStyle = 'rgba(239,227,208,.2)';
    ctx.lineWidth = 1.4;
    for (var s = 0; s < 3; s++){
      ctx.beginPath();
      for (var y2 = 0; y2 < 7; y2++){
        var yy = cupY - h * .095 - y2 * h * .012;
        var xx = cupX + Math.sin(t * .7 + y2 * .9 + s * 2) * (4 + y2);
        if (y2 === 0) ctx.moveTo(xx, yy); else ctx.lineTo(xx, yy);
      }
      ctx.stroke();
    }

    /* 摊开的笔记本 */
    ctx.save();
    ctx.translate(w * .43, deskY + h * .035);
    ctx.rotate(-.05);
    ctx.fillStyle = '#d8cbb2';
    ctx.fillRect(-w * .12, -h * .02, w * .24, h * .12);
    ctx.fillStyle = '#c9b99e';
    ctx.fillRect(-w * .005, -h * .02, w * .01, h * .12);
    ctx.strokeStyle = 'rgba(64,53,41,.25)';
    ctx.lineWidth = 1;
    for (var i = 0; i < 4; i++){
      ctx.beginPath();
      ctx.moveTo(-w * .1, h * .005 + i * h * .022);
      ctx.lineTo(-w * .02, h * .005 + i * h * .022);
      ctx.moveTo(w * .02, h * .005 + i * h * .022);
      ctx.lineTo(w * .1, h * .005 + i * h * .022);
      ctx.stroke();
    }
    ctx.restore();

    /* 小盆栽 */
    ctx.fillStyle = '#2b322a';
    ctx.beginPath();
    ctx.ellipse(w * .86, deskY + h * .026, w * .028, h * .014, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#384237';
    ctx.lineWidth = 2;
    for (var p = 0; p < 5; p++){
      ctx.beginPath();
      ctx.moveTo(w * .86, deskY + h * .02);
      ctx.quadraticCurveTo(w * (.86 + (p - 2) * .012), deskY - h * .045, w * (.86 + (p - 2) * .018), deskY - h * (.06 + (p % 3) * .014));
      ctx.stroke();
    }
    dust(ctx, w, h, t, 34, 53, '#f1ce9a', .24, [w * .3, h * .25, w * .4, h * .5]);
    texture(ctx, w, h, 23, .018);
  }

  /* ---------------- 七、天台的云 ---------------- */
  function drawRoofClouds(ctx, w, h, t){
    vgrad(ctx, 0, 0, w, h, [[0, '#7c98a4'], [.34, '#a9b8b6'], [.62, '#dbc7a9'], [1, '#9b8f7c']]);
    var sx = w * .71, sy = h * .2;
    glow(ctx, sx, sy, w * .3, '#f5dfb2', .4);
    var g = ctx.createRadialGradient(sx, sy, 0, sx, sy, w * .055);
    g.addColorStop(0, 'rgba(255,247,224,.85)');
    g.addColorStop(1, 'rgba(255,247,224,0)');
    ctx.fillStyle = g;
    ctx.fillRect(sx - w * .07, sy - w * .07, w * .14, w * .14);

    /* 云 */
    var rnd = U.rng(83);
    for (var c = 0; c < 5; c++){
      var cx = ((rnd() * w + t * (3 + c)) % (w * 1.25)) - w * .12;
      var cy = h * (.12 + rnd() * .26);
      var base = w * (.07 + rnd() * .11);
      for (var b = 0; b < 7; b++){
        softEllipse(ctx, cx + (rnd() - .5) * base * 2.1, cy + (rnd() - .5) * base * .55,
          base * (.38 + rnd() * .4), base * (.18 + rnd() * .2),
          rnd() > .5 ? '#f3e8d4' : '#e5d8c3', .22 + rnd() * .18);
      }
    }

    /* 远处城市 */
    var cityY = h * .72;
    ctx.fillStyle = 'rgba(92,100,97,.4)';
    var rnd2 = U.rng(84);
    for (var i = 0; i < 18; i++){
      var bw = w * (.02 + rnd2() * .04);
      var bh = h * (.02 + rnd2() * .06);
      ctx.fillRect(rnd2() * w, cityY - bh, bw, bh);
    }

    /* 天台 */
    var roofY = h * .78;
    vgrad(ctx, 0, roofY, w, h - roofY, [[0, '#3a3630'], [.2, '#282622'], [1, '#121310']]);
    ctx.fillStyle = 'rgba(226,206,178,.12)';
    ctx.fillRect(0, roofY, w, 2);
    /* 栏杆 */
    ctx.strokeStyle = 'rgba(22,23,20,.9)';
    ctx.lineWidth = Math.max(4, w * .005);
    ctx.beginPath();
    ctx.moveTo(0, h * .71);
    ctx.lineTo(w, h * .71);
    ctx.stroke();
    for (var r = 0; r < 8; r++){
      ctx.beginPath();
      ctx.moveTo(w * (.02 + r * .135), h * .71);
      ctx.lineTo(w * (.02 + r * .135), roofY + h * .015);
      ctx.stroke();
    }
    /* 椅子 */
    ctx.strokeStyle = '#161713';
    ctx.lineWidth = Math.max(3, w * .004);
    ctx.beginPath();
    ctx.moveTo(w * .68, h * .86);
    ctx.lineTo(w * .68, h * .79);
    ctx.lineTo(w * .78, h * .79);
    ctx.moveTo(w * .71, h * .79);
    ctx.lineTo(w * .71, h * .86);
    ctx.moveTo(w * .76, h * .79);
    ctx.lineTo(w * .76, h * .86);
    ctx.stroke();
    ctx.strokeStyle = 'rgba(22,23,19,.8)';
    ctx.beginPath();
    ctx.moveTo(w * .68, h * .79);
    ctx.lineTo(w * .69, h * .74);
    ctx.moveTo(w * .78, h * .79);
    ctx.lineTo(w * .77, h * .74);
    ctx.stroke();
    /* 一只杯子 */
    ctx.fillStyle = '#cbb99c';
    ctx.fillRect(w * .72, h * .765, w * .012, h * .022);

    birds(ctx, w, h, 91, .18, 5, '#596264', .3);
    dust(ctx, w, h, t, 20, 61, '#f6e2bd', .16, [0, h * .15, w, h * .4]);
    texture(ctx, w, h, 29, .014);
  }

  /* ---------------- 八、黄昏站台 ---------------- */
  function drawDuskPlatform(ctx, w, h, t){
    vgrad(ctx, 0, 0, w, h, [[0, '#464656'], [.3, '#756a72'], [.52, '#b08370'], [.66, '#d1a17e'], [1, '#3d3934']]);
    var horizon = h * .55;
    glow(ctx, w * .8, horizon, w * .3, '#e8b482', .33);
    var rnd = U.rng(97);
    for (var i = 0; i < 5; i++){
      softEllipse(ctx, w * (.2 + rnd() * .7), h * (.1 + rnd() * .25), w * (.08 + rnd() * .12), h * .03, '#ded0c1', .14);
    }

    /* 远处城市 */
    ctx.fillStyle = '#5f5756';
    for (var b = 0; b < 12; b++){
      var bw = w * (.03 + rnd() * .05);
      var bh = h * (.02 + rnd() * .07);
      ctx.fillRect(rnd() * w, horizon - bh, bw, bh);
    }

    /* 轨道 */
    var railY = horizon + h * .04;
    vgrad(ctx, 0, railY, w, h * .2, [[0, '#4a4440'], [1, '#2b2926']]);
    ctx.fillStyle = '#3a3632';
    ctx.fillRect(0, railY + h * .08, w, h * .13);
    ctx.strokeStyle = '#8c7f70';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0, railY + h * .055);
    ctx.lineTo(w, railY + h * .045);
    ctx.moveTo(0, railY + h * .1);
    ctx.lineTo(w, railY + h * .088);
    ctx.stroke();

    /* 站台地面 */
    ctx.beginPath();
    ctx.moveTo(0, h * .63);
    ctx.lineTo(w, h * .6);
    ctx.lineTo(w, h);
    ctx.lineTo(0, h);
    ctx.closePath();
    var floor = vgrad(ctx, 0, h * .6, w, h * .4, [[0, '#7e6f62'], [.35, '#5e544b'], [1, '#2b2622']]);
    ctx.fillStyle = floor;
    ctx.fill();
    /* 黄色安全线 */
    ctx.strokeStyle = 'rgba(207,163,94,.65)';
    ctx.lineWidth = Math.max(3, h * .008);
    ctx.beginPath();
    ctx.moveTo(0, h * .69);
    ctx.quadraticCurveTo(w * .5, h * .66, w, h * .63);
    ctx.stroke();
    ctx.strokeStyle = 'rgba(45,39,33,.25)';
    ctx.lineWidth = 1.2;
    for (var p = 0; p < 6; p++){
      ctx.beginPath();
      ctx.moveTo(0, h * (.74 + p * .04));
      ctx.lineTo(w, h * (.71 + p * .04));
      ctx.stroke();
    }

    /* 雨棚 */
    ctx.fillStyle = '#1a1a1c';
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(w * .34, 0);
    ctx.lineTo(w * .6, h * .17);
    ctx.lineTo(w * .18, h * .22);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = '#111214';
    ctx.lineWidth = Math.max(5, w * .008);
    ctx.beginPath();
    ctx.moveTo(w * .12, h * .21);
    ctx.lineTo(w * .12, h * .68);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(w * .6, h * .17);
    ctx.lineTo(w * .6, h * .6);
    ctx.stroke();

    /* 远处的车灯 */
    var tx = w * .86, ty = railY + h * .025;
    glow(ctx, tx, ty, w * .075, '#f1d2a4', .55);
    ctx.fillStyle = '#f9e5c1';
    ctx.beginPath(); ctx.arc(tx, ty, 4, 0, Math.PI * 2); ctx.fill();
    /* 反光 */
    var refl = ctx.createLinearGradient(0, ty, 0, h * .8);
    refl.addColorStop(0, 'rgba(241,210,164,.25)');
    refl.addColorStop(1, 'rgba(241,210,164,0)');
    ctx.fillStyle = refl;
    ctx.fillRect(tx - w * .01, ty, w * .02, h * .3);

    /* 站牌 */
    ctx.fillStyle = '#202022';
    ctx.fillRect(w * .1, h * .28, w * .1, h * .23);
    ctx.fillStyle = 'rgba(228,210,181,.16)';
    ctx.fillRect(w * .115, h * .3, w * .07, h * .17);
    ctx.strokeStyle = '#111213';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(w * .15, h * .51);
    ctx.lineTo(w * .15, h * .66);
    ctx.stroke();

    /* 长椅 */
    ctx.fillStyle = '#302a25';
    ctx.fillRect(w * .69, h * .7, w * .18, h * .012);
    ctx.fillRect(w * .69, h * .725, w * .18, h * .012);
    ctx.fillRect(w * .71, h * .7, w * .01, h * .09);
    ctx.fillRect(w * .85, h * .7, w * .01, h * .09);

    /* 站着的人 */
    person(ctx, w * .56, h * .73, 1.7, 'rgba(22,20,20,.9)', {});
    softEllipse(ctx, w * .56, h * .735, w * .06, h * .012, '#0c0d0c', .35);
    /* 行李箱 */
    ctx.fillStyle = '#2c2722';
    ctx.fillRect(w * .59, h * .68, w * .035, h * .05);
    ctx.strokeStyle = '#2c2722';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(w * .607, h * .677, w * .008, Math.PI, 0);
    ctx.stroke();

    /* 灯 */
    glow(ctx, w * .4, h * .33, w * .08, '#efc089', .3);
    ctx.fillStyle = '#ecc087';
    ctx.beginPath(); ctx.arc(w * .4, h * .33, 3, 0, Math.PI * 2); ctx.fill();

    dust(ctx, w, h, t, 24, 67, '#f0d2a6', .14, [0, h * .35, w, h * .4]);
    texture(ctx, w, h, 31, .018);
  }

  /* ---------------- 九、桌上的花 ---------------- */
  function drawTableFlower(ctx, w, h, t){
    vgrad(ctx, 0, 0, w, h, [[0, '#878a7c'], [.45, '#a4a394'], [.7, '#b7ad99'], [1, '#4b443a']]);
    /* 墙上的窗光 */
    ctx.save();
    ctx.globalAlpha = .2;
    ctx.fillStyle = '#f7e7c4';
    ctx.beginPath();
    ctx.moveTo(w * .55, 0);
    ctx.lineTo(w * .9, 0);
    ctx.lineTo(w * .74, h * .62);
    ctx.lineTo(w * .4, h * .62);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
    softEllipse(ctx, w * .76, h * .2, w * .25, h * .2, '#f7dfb1', .12);

    /* 桌面 */
    var tableY = h * .63;
    vgrad(ctx, 0, tableY, w, h - tableY, [[0, '#8c6f50'], [.18, '#7a5d43'], [1, '#3a2b1f']]);
    ctx.fillStyle = 'rgba(241,218,182,.2)';
    ctx.fillRect(0, tableY, w, 2);
    /* 木纹 */
    ctx.strokeStyle = 'rgba(56,38,25,.16)';
    ctx.lineWidth = 1.5;
    for (var i = 0; i < 7; i++){
      ctx.beginPath();
      ctx.moveTo(0, tableY + h * .035 + i * h * .032);
      ctx.quadraticCurveTo(w * .4, tableY + h * (.03 + i * .033), w, tableY + h * (.048 + i * .03));
      ctx.stroke();
    }

    /* 花瓶 */
    var vx = w * .43, vy = tableY;
    var vase = ctx.createLinearGradient(vx - w * .05, 0, vx + w * .05, 0);
    vase.addColorStop(0, 'rgba(218,227,216,.3)');
    vase.addColorStop(.5, 'rgba(238,234,216,.55)');
    vase.addColorStop(1, 'rgba(196,204,192,.25)');
    ctx.fillStyle = vase;
    ctx.beginPath();
    ctx.moveTo(vx - w * .028, vy - h * .17);
    ctx.quadraticCurveTo(vx - w * .052, vy - h * .12, vx - w * .045, vy);
    ctx.quadraticCurveTo(vx, vy + h * .018, vx + w * .045, vy);
    ctx.quadraticCurveTo(vx + w * .052, vy - h * .12, vx + w * .028, vy - h * .17);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = 'rgba(239,236,219,.5)';
    ctx.lineWidth = 1.4;
    ctx.stroke();
    ctx.fillStyle = 'rgba(218,226,215,.32)';
    ctx.beginPath();
    ctx.ellipse(vx, vy - h * .17, w * .028, h * .009, 0, 0, Math.PI * 2);
    ctx.fill();

    /* 花茎与花 */
    var rnd = U.rng(101);
    var heads = [
      [-.12, -.34, .7, '#e8dcc4'], [-.06, -.4, .8, '#c98f7e'], [.02, -.36, .65, '#e3d3b6'],
      [.09, -.33, .75, '#d8b58d'], [.15, -.27, .6, '#b96e5e'], [-.16, -.26, .5, '#e5d5bd']
    ];
    ctx.strokeStyle = 'rgba(83,105,72,.75)';
    ctx.lineWidth = Math.max(1.6, w * .002);
    heads.forEach(function(hd, idx){
      var hx = vx + w * hd[0];
      var hy = vy - h * (-hd[1]);
      ctx.beginPath();
      ctx.moveTo(vx, vy - h * .17);
      ctx.quadraticCurveTo(vx + w * hd[0] * .4, vy - h * .27, hx, hy);
      ctx.stroke();
      /* 叶 */
      ctx.save();
      ctx.translate(vx + w * hd[0] * .55, vy - h * .26);
      ctx.rotate(hd[0] * 5 + .5);
      ctx.fillStyle = 'rgba(84,106,73,.65)';
      ctx.beginPath(); ctx.ellipse(0, 0, w * .022, h * .009, 0, 0, Math.PI * 2); ctx.fill();
      ctx.restore();
      /* 花 */
      for (var p = 0; p < 5; p++){
        var ang = p / 5 * Math.PI * 2 + idx;
        var pr = w * .014 * hd[2];
        ctx.fillStyle = hd[3];
        ctx.globalAlpha = .92;
        ctx.beginPath();
        ctx.ellipse(hx + Math.cos(ang) * pr, hy + Math.sin(ang) * pr * .8, pr * .82, pr * .5, ang, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;
      ctx.fillStyle = '#b28a51';
      ctx.beginPath();
      ctx.arc(hx, hy, w * .0045, 0, Math.PI * 2);
      ctx.fill();
    });

    /* 落下的花瓣 */
    for (var f = 0; f < 6; f++){
      var fx = w * (.3 + rnd() * .4);
      var fy = h * (.68 + rnd() * .18);
      ctx.save();
      ctx.translate(fx, fy);
      ctx.rotate(rnd() * 2);
      ctx.fillStyle = 'rgba(212,175,150,.6)';
      ctx.beginPath(); ctx.ellipse(0, 0, w * .008, h * .004, 0, 0, Math.PI * 2); ctx.fill();
      ctx.restore();
    }

    /* 影子 */
    ctx.save();
    ctx.globalAlpha = .22;
    ctx.fillStyle = '#2a2118';
    ctx.beginPath();
    ctx.ellipse(w * .43, tableY + h * .015, w * .11, h * .014, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    dust(ctx, w, h, t, 36, 73, '#f6e6c5', .22, [w * .3, h * .1, w * .55, h * .5]);
    texture(ctx, w, h, 37, .016);
  }

  /* ---------------- 十、旧照的光 ---------------- */
  function drawOldPhoto(ctx, w, h, t){
    vgrad(ctx, 0, 0, w, h, [[0, '#1b1712'], [.5, '#2b231a'], [1, '#0c0a08']]);
    /* 一束光 */
    ctx.save();
    var beam = ctx.createLinearGradient(w * .1, 0, w * .55, h);
    beam.addColorStop(0, 'rgba(230,193,133,.16)');
    beam.addColorStop(1, 'rgba(230,193,133,0)');
    ctx.fillStyle = beam;
    ctx.beginPath();
    ctx.moveTo(w * .05, 0);
    ctx.lineTo(w * .27, 0);
    ctx.lineTo(w * .68, h);
    ctx.lineTo(w * .4, h);
    ctx.closePath();
    ctx.fill();
    ctx.restore();

    /* 桌面 */
    var deskY = h * .58;
    vgrad(ctx, 0, deskY, w, h - deskY, [[0, '#4c3a28'], [.3, '#3b2c1f'], [1, '#17110c']]);
    ctx.fillStyle = 'rgba(232,198,145,.13)';
    ctx.fillRect(0, deskY, w, 2);

    /* 散落的照片 */
    var rnd = U.rng(103);
    for (var i = 0; i < 6; i++){
      var px = w * (.1 + rnd() * .7);
      var py = h * (.64 + rnd() * .22);
      var pw = w * (.09 + rnd() * .08);
      var ph = pw * .72;
      ctx.save();
      ctx.translate(px, py);
      ctx.rotate((rnd() - .5) * .5);
      ctx.fillStyle = 'rgba(231,218,196,' + (.45 + rnd() * .3) + ')';
      ctx.fillRect(-pw / 2, -ph / 2, pw, ph);
      ctx.fillStyle = 'rgba(88,67,45,.4)';
      ctx.fillRect(-pw * .38, -ph * .36, pw * .76, ph * .64);
      ctx.restore();
    }

    /* 主照片 */
    ctx.save();
    ctx.translate(w * .47, h * .47);
    ctx.rotate(-.045);
    ctx.shadowColor = 'rgba(0,0,0,.5)';
    ctx.shadowBlur = 30;
    ctx.shadowOffsetY = 18;
    var pw2 = w * .29, ph2 = pw2 * .76;
    ctx.fillStyle = '#e8dcc4';
    ctx.fillRect(-pw2 / 2, -ph2 / 2, pw2, ph2);
    ctx.shadowColor = 'transparent';
    var pad = w * .014;
    var iw = pw2 - pad * 2, ih = ph2 - pad * 2 - h * .028;
    var photo = ctx.createLinearGradient(-pw2 / 2, -ph2 / 2, pw2 / 2, ph2 / 2);
    photo.addColorStop(0, '#8c7656');
    photo.addColorStop(.5, '#c4a678');
    photo.addColorStop(1, '#5d4a34');
    ctx.fillStyle = photo;
    ctx.fillRect(-pw2 / 2 + pad, -ph2 / 2 + pad, iw, ih);
    /* 照片里的模糊风景 */
    softEllipse(ctx, 0 - pw2 * .12, -ph2 * .1, pw2 * .3, ph2 * .2, '#e3cfae', .28);
    ctx.fillStyle = 'rgba(66,52,36,.45)';
    ctx.beginPath();
    ctx.moveTo(-pw2 / 2 + pad, ph2 / 2 - pad - h * .028);
    ctx.quadraticCurveTo(-pw2 * .1, -ph2 * .35, pw2 * .02, ph2 * .02);
    ctx.quadraticCurveTo(pw2 * .15, -ph2 * .2, pw2 / 2 - pad, ph2 / 2 - pad - h * .028);
    ctx.closePath();
    ctx.fill();
    /* 照片角上的两处折痕 */
    ctx.strokeStyle = 'rgba(255,248,230,.18)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(-pw2 / 2 + pad, -ph2 * .1); ctx.lineTo(-pw2 / 2 + pad + pw2 * .1, -ph2 * .14);
    ctx.stroke();
    ctx.restore();

    /* 老相机 */
    ctx.fillStyle = '#141210';
    U.roundRect(ctx, w * .72, h * .61, w * .12, h * .09, 6);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(w * .78, h * .655, w * .032, 0, Math.PI * 2);
    ctx.fillStyle = '#26231d';
    ctx.fill();
    ctx.beginPath();
    ctx.arc(w * .78, h * .655, w * .018, 0, Math.PI * 2);
    ctx.fillStyle = '#0a0908';
    ctx.fill();
    ctx.strokeStyle = 'rgba(235,205,155,.25)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(w * .78, h * .655, w * .025, .2, 2.4);
    ctx.stroke();

    /* 灯 */
    glow(ctx, w * .08, h * .3, w * .17, '#e4b878', .3);
    ctx.fillStyle = '#e6c08b';
    ctx.beginPath(); ctx.arc(w * .08, h * .3, 3, 0, Math.PI * 2); ctx.fill();

    dust(ctx, w, h, t, 55, 79, '#f0d4a2', .26, [w * .2, h * .05, w * .7, h * .6]);
    texture(ctx, w, h, 41, .024);
  }

  /* ---------------- 十一、深夜的店 ---------------- */
  function drawNightShop(ctx, w, h, t){
    vgrad(ctx, 0, 0, w, h, [[0, '#0a1214'], [.45, '#101c1e'], [.75, '#0b1111'], [1, '#060909']]);
    stars(ctx, w, h, 26, 7, '#dfe4d8', .16);

    /* 街对面 */
    ctx.fillStyle = '#111a1b';
    var rnd = U.rng(107);
    for (var i = 0; i < 6; i++){
      var bw = w * (.06 + rnd() * .08);
      var bh = h * (.2 + rnd() * .3);
      ctx.fillRect(w * (.02 + rnd() * .35), h * .55 - bh, bw, bh);
    }

    /* 店面 */
    var sx = w * .39, sy = h * .22, sw = w * .54, sh = h * .48;
    glow(ctx, sx + sw * .5, sy + sh * .45, w * .4, '#d8a65c', .25);
    ctx.fillStyle = '#121717';
    ctx.fillRect(sx - w * .02, sy - h * .08, sw + w * .04, sh + h * .1);

    /* 窗内暖光 */
    var inside = ctx.createLinearGradient(sx, sy, sx, sy + sh);
    inside.addColorStop(0, '#d9b273');
    inside.addColorStop(.5, '#c99a5d');
    inside.addColorStop(1, '#8f693f');
    ctx.fillStyle = inside;
    ctx.fillRect(sx, sy, sw, sh);

    /* 货架 */
    ctx.strokeStyle = 'rgba(77,52,28,.4)';
    ctx.lineWidth = Math.max(2, h * .004);
    for (var s = 0; s < 4; s++){
      var yy = sy + sh * (.18 + s * .19);
      ctx.beginPath();
      ctx.moveTo(sx + w * .01, yy);
      ctx.lineTo(sx + sw * .72, yy);
      ctx.stroke();
      /* 货品 */
      for (var g = 0; g < 12; g++){
        var gx = sx + w * .018 + g * sw * .055;
        var gh = h * (.018 + (g % 3) * .012);
        ctx.fillStyle = 'rgba(' + (50 + (g * 37) % 80) + ',' + (35 + (g * 23) % 55) + ',' + (26 + (g * 17) % 45) + ',.55)';
        ctx.fillRect(gx, yy - gh, w * .018, gh);
      }
    }
    /* 灯光从窗里泻出来 */
    ctx.save();
    ctx.globalCompositeOperation = 'screen';
    var spill = ctx.createLinearGradient(sx, sy + sh, sx, h);
    spill.addColorStop(0, 'rgba(225,180,112,.3)');
    spill.addColorStop(1, 'rgba(225,180,112,0)');
    ctx.fillStyle = spill;
    ctx.beginPath();
    ctx.moveTo(sx, sy + sh);
    ctx.lineTo(sx + sw, sy + sh);
    ctx.lineTo(sx + sw + w * .12, h);
    ctx.lineTo(sx - w * .12, h);
    ctx.closePath();
    ctx.fill();
    ctx.restore();

    /* 窗框 */
    ctx.strokeStyle = '#0e1212';
    ctx.lineWidth = Math.max(6, w * .008);
    ctx.strokeRect(sx, sy, sw, sh);
    ctx.lineWidth = 3;
    for (var m = 1; m < 3; m++){
      ctx.beginPath();
      ctx.moveTo(sx + sw * m / 3, sy);
      ctx.lineTo(sx + sw * m / 3, sy + sh);
      ctx.stroke();
    }

    /* 门 */
    ctx.fillStyle = '#171b18';
    ctx.fillRect(sx + sw - w * .085, sy + h * .08, w * .075, sh - h * .08);
    ctx.fillStyle = 'rgba(217,180,118,.7)';
    ctx.fillRect(sx + sw - w * .07, sy + h * .14, w * .03, h * .2);

    /* 遮阳棚 */
    ctx.fillStyle = '#27302c';
    ctx.beginPath();
    ctx.moveTo(sx - w * .025, sy);
    ctx.lineTo(sx + sw + w * .025, sy);
    ctx.lineTo(sx + sw + w * .01, sy - h * .035);
    ctx.lineTo(sx - w * .01, sy - h * .035);
    ctx.closePath();
    ctx.fill();
    for (var st = 0; st < 7; st++){
      ctx.fillStyle = st % 2 ? 'rgba(180,150,105,.2)' : 'rgba(20,24,24,.35)';
      ctx.fillRect(sx - w * .015 + st * sw / 6.6, sy - h * .035, sw / 8.2, h * .035);
    }

    /* 街道 */
    var street = vgrad(ctx, 0, h * .7, w, h * .3, [[0, '#151b1b'], [1, '#080b0b']]);
    ctx.fillStyle = street;
    ctx.fillRect(0, h * .7, w, h * .3);
    softEllipse(ctx, sx + sw * .45, h * .78, sw * .55, h * .02, '#d9a65e', .16);
    /* 倒影 */
    ctx.save();
    ctx.globalAlpha = .18;
    for (var r = 0; r < 9; r++){
      ctx.fillStyle = r % 2 ? '#e0b370' : '#7e8d7b';
      ctx.fillRect(sx + r * sw / 10, h * .72, sw / 13, h * (.04 + (r % 3) * .02));
    }
    ctx.restore();

    /* 路灯 */
    glow(ctx, w * .16, h * .2, w * .11, '#e7b77c', .38);
    ctx.strokeStyle = '#0c1010';
    ctx.lineWidth = Math.max(4, w * .005);
    ctx.beginPath();
    ctx.moveTo(w * .15, h * .8);
    ctx.lineTo(w * .15, h * .2);
    ctx.quadraticCurveTo(w * .15, h * .16, w * .19, h * .16);
    ctx.stroke();
    ctx.fillStyle = '#f3cf98';
    ctx.beginPath(); ctx.arc(w * .19, h * .165, 3.2, 0, Math.PI * 2); ctx.fill();

    /* 打伞的人 */
    person(ctx, w * .24, h * .82, 1.1, 'rgba(5,8,8,.92)', { umbrella: true });
    /* 猫 */
    cat(ctx, sx + sw + w * .055, h * .755, .9, 'rgba(8,11,10,.9)');

    /* 蒸汽 */
    ctx.strokeStyle = 'rgba(226,215,193,.1)';
    ctx.lineWidth = 2;
    for (var v = 0; v < 2; v++){
      ctx.beginPath();
      for (var y = 0; y < 8; y++){
        var yy2 = h * .94 - y * h * .025;
        var xx = w * (.3 + v * .09) + Math.sin(t * .6 + y + v * 2) * (5 + y * 1.4);
        if (y === 0) ctx.moveTo(xx, yy2); else ctx.lineTo(xx, yy2);
      }
      ctx.stroke();
    }

    rain(ctx, w, h, t, 45, '#b9c6c2', .1);
    dust(ctx, w, h, t, 18, 83, '#f2d09a', .12, [sx, sy, sw, sh]);
    texture(ctx, w, h, 43, .02);
  }

  /* ---------------- 十二、海边的两个人 ---------------- */
  function drawSeasideTwo(ctx, w, h, t){
    vgrad(ctx, 0, 0, w, h, [[0, '#5c5b6b'], [.22, '#8d7a7c'], [.4, '#c08f7e'], [.52, '#ddb08a'], [.6, '#8b7a70'], [1, '#2f3331']]);
    var horizon = h * .55;
    var sx = w * .58, sy = horizon - h * .02;
    glow(ctx, sx, sy, w * .32, '#f0c18d', .4);
    var g = ctx.createRadialGradient(sx, sy, 0, sx, sy, w * .05);
    g.addColorStop(0, 'rgba(255,241,212,.9)');
    g.addColorStop(1, 'rgba(255,241,212,0)');
    ctx.fillStyle = g;
    ctx.fillRect(sx - w * .06, sy - w * .06, w * .12, w * .12);
    var rnd = U.rng(109);
    for (var c = 0; c < 4; c++){
      softEllipse(ctx, w * (.15 + rnd() * .7), h * (.12 + rnd() * .2), w * (.1 + rnd() * .14), h * .025, '#e7cbb4', .13);
    }

    /* 海 */
    vgrad(ctx, 0, horizon, w, h * .2, [[0, '#8a7a72'], [.45, '#635f5e'], [1, '#4d5150']]);
    ctx.strokeStyle = 'rgba(238,216,190,.2)';
    ctx.lineWidth = 1;
    for (var i = 0; i < 13; i++){
      var yy = horizon + h * .012 + i * h * .013;
      ctx.beginPath();
      for (var x = 0; x < w; x += 16){
        var y2 = yy + Math.sin(x * .013 + t * .5 + i) * (1 + i * .15);
        if (x === 0) ctx.moveTo(x, y2); else ctx.lineTo(x, y2);
      }
      ctx.stroke();
    }
    softEllipse(ctx, sx, horizon + h * .07, w * .13, h * .03, '#f0c695', .22);

    /* 沙滩 */
    var shore = vgrad(ctx, 0, h * .71, w, h * .29, [[0, '#a78b70'], [.4, '#7b6553'], [1, '#3c322a']]);
    ctx.fillStyle = shore;
    ctx.beginPath();
    ctx.moveTo(0, h * .73);
    ctx.quadraticCurveTo(w * .3, h * .69, w * .58, h * .72);
    ctx.quadraticCurveTo(w * .82, h * .75, w, h * .7);
    ctx.lineTo(w, h); ctx.lineTo(0, h); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = 'rgba(233,217,196,.28)';
    ctx.lineWidth = 2;
    for (var s = 0; s < 3; s++){
      ctx.beginPath();
      for (var x2 = 0; x2 <= w; x2 += 12){
        var y3 = h * (.72 + s * .025) + Math.sin(x2 * .008 + s + t * .1) * (4 + s * 2);
        if (x2 === 0) ctx.moveTo(0, y3); else ctx.lineTo(x2, y3);
      }
      ctx.stroke();
    }

    /* 两个背影 */
    var feetY = h * .75;
    person(ctx, w * .52, feetY, 1.45, 'rgba(16,17,16,.92)', { hand: 1 });
    person(ctx, w * .56, feetY, 1.35, 'rgba(16,17,16,.92)', { hand: -1 });
    softEllipse(ctx, w * .54, feetY + h * .005, w * .075, h * .012, '#0c0d0c', .4);
    /* 影子 */
    ctx.save();
    ctx.globalAlpha = .25;
    ctx.strokeStyle = '#201b17';
    ctx.lineWidth = 6;
    ctx.beginPath();
    ctx.moveTo(w * .52, feetY);
    ctx.lineTo(w * .44, h * .86);
    ctx.moveTo(w * .56, feetY);
    ctx.lineTo(w * .61, h * .83);
    ctx.stroke();
    ctx.restore();

    birds(ctx, w, h, 113, .27, 3, '#4b4441', .3);
    dust(ctx, w, h, t, 18, 89, '#f4d6ac', .12, [w * .3, h * .4, w * .5, h * .25]);
    texture(ctx, w, h, 47, .018);
  }

  /* ---------------- 场景清单 ---------------- */
  function addScene(id, name, tags, weights, draw){
    var scene = { id: id, name: name, tags: tags, weights: weights, draw: draw };
    scenes.push(scene);
    byId[id] = scene;
  }

  addScene('dusk-window', '暮色窗台', ['窗边', '黄昏', '室内'],
    { low: .8, calm: .6, bright: .3, missing: .7, tired: .5, uneasy: .4 }, drawDuskWindow);
  addScene('ebb-tide', '退潮的海', ['海边', '傍晚', '开阔'],
    { low: 1, calm: .8, bright: .4, missing: .7, tired: .4, uneasy: .3 }, drawEbbTide);
  addScene('after-rain', '雨后的路口', ['街道', '雨', '路口'],
    { low: .9, calm: .5, bright: .2, missing: .4, tired: .6, uneasy: 1 }, drawAfterRain);
  addScene('street-tree', '路灯与树', ['夜', '路灯', '树'],
    { low: .7, calm: .6, bright: .2, missing: .6, tired: .7, uneasy: .9 }, drawStreetTree);
  addScene('morning-fog', '清晨的雾', ['清晨', '雾', '山野'],
    { low: .5, calm: 1, bright: .6, missing: .3, tired: .6, uneasy: .4 }, drawMorningFog);
  addScene('desk-light', '桌角的光', ['房间', '桌面', '夜'],
    { low: .5, calm: .8, bright: .7, missing: .4, tired: .8, uneasy: .4 }, drawDeskLight);
  addScene('roof-clouds', '天台的云', ['天台', '云', '白天'],
    { low: .3, calm: .6, bright: 1, missing: .4, tired: .3, uneasy: .2 }, drawRoofClouds);
  addScene('dusk-platform', '黄昏站台', ['车站', '黄昏', '远行'],
    { low: .6, calm: .4, bright: .3, missing: 1, tired: .6, uneasy: .6 }, drawDuskPlatform);
  addScene('table-flower', '桌上的花', ['花', '桌面', '光'],
    { low: .2, calm: .7, bright: .9, missing: .5, tired: .3, uneasy: .2 }, drawTableFlower);
  addScene('old-photo', '旧照的光', ['照片', '回忆', '室内'],
    { low: .6, calm: .4, bright: .3, missing: .9, tired: .4, uneasy: .3 }, drawOldPhoto);
  addScene('night-shop', '深夜的店', ['夜', '街角', '灯光'],
    { low: .5, calm: .5, bright: .4, missing: .5, tired: 1, uneasy: .7 }, drawNightShop);
  addScene('seaside-two', '海边的两个人', ['海边', '黄昏', '并肩'],
    { low: .3, calm: .5, bright: .8, missing: .8, tired: .2, uneasy: .2 }, drawSeasideTwo);

  /* ---------------- 对外接口 ---------------- */
  S.list = scenes;

  S.get = function(id){ return byId[id] || null; };

  S.paint = function(ctx, id, w, h, t, opts){
    var scene = byId[id];
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    if (!scene){
      vgrad(ctx, 0, 0, w, h, [[0, '#20282a'], [1, '#0e1414']]);
      return ctx.restore();
    }
    try{
      scene.draw(ctx, w, h, t || 0, opts || {});
    }catch(e){
      vgrad(ctx, 0, 0, w, h, [[0, '#20282a'], [1, '#0e1414']]);
    }
    ctx.restore();
  };

  S.thumbnail = function(id, width){
    var w = width || 640;
    var key = id + '@' + w;
    if (thumbs[key]) return thumbs[key];
    var h = Math.round(w * 9 / 16);
    var c = U.makeCanvas(w, h);
    S.paint(c.getContext('2d'), id, w, h, 4.8);
    var url = c.toDataURL('image/jpeg', .78);
    thumbs[key] = url;
    return url;
  };

  S.suggest = function(moodWeights, count, exclude){
    count = count || 4;
    exclude = exclude || [];
    var rnd = U.rng(Date.now() % 100000 + 7);
    var pool = scenes.filter(function(s){ return exclude.indexOf(s.id) < 0; });
    if (pool.length < count) pool = scenes.slice();
    var scored = pool.map(function(s){
      var score = .04;
      Object.keys(moodWeights || {}).forEach(function(k){
        score += (s.weights[k] || 0) * (moodWeights[k] || 0);
      });
      return { id: s.id, score: score * (.5 + rnd()) };
    });
    scored.sort(function(a, b){ return b.score - a.score; });
    /* 在前几名里换着挑，避免每次都一样 */
    var picks = [];
    var rest = scored.slice();
    while (picks.length < count && rest.length){
      var top = rest.slice(0, Math.min(5, rest.length));
      top.sort(function(a, b){ return b.score - a.score; });
      var choice = top[Math.floor(rnd() * top.length)];
      picks.push(choice.id);
      rest = rest.filter(function(x){ return x.id !== choice.id; });
    }
    return picks;
  };

  S.weightsFor = function(analysis){
    var weights = {};
    if (!analysis) return weights;
    (analysis.scores || []).forEach(function(s){
      var v = Math.max(0, s.score || 0);
      if (v > 0) weights[s.key] = v;
    });
    if (!Object.keys(weights).length) weights[analysis.primary] = 1;
    return weights;
  };

  /* ---------------- 上传素材的图像缓存 ---------------- */
  function loadInto(src){
    if (!src) return Promise.resolve(null);
    if (imageCache[src]) return Promise.resolve(imageCache[src]);
    if (imageLoading[src]) return imageLoading[src];
    imageLoading[src] = U.loadImage(src).then(function(img){
      imageCache[src] = img;
      delete imageLoading[src];
      return img;
    }).catch(function(){
      delete imageLoading[src];
      return null;
    });
    return imageLoading[src];
  }

  S.loadImage = loadInto;

  S.warmRecipe = function(recipe){
    if (!recipe) return Promise.resolve();
    var srcs = [];
    (recipe.shots || []).forEach(function(shot){
      if (shot.ref && shot.ref.kind === 'upload'){
        var m = App.store.getMaterial(shot.ref.id);
        if (m && m.src) srcs.push(m.src);
      }
    });
    return Promise.all(srcs.map(loadInto));
  };

  function drawCover(ctx, img, w, h, focusX, focusY){
    var iw = img.naturalWidth || img.width;
    var ih = img.naturalHeight || img.height;
    if (!iw || !ih) return;
    var scale = Math.max(w / iw, h / ih);
    var dw = iw * scale, dh = ih * scale;
    var dx = (w - dw) * (focusX == null ? .5 : focusX);
    var dy = (h - dh) * (focusY == null ? .5 : focusY);
    ctx.drawImage(img, dx, dy, dw, dh);
  }

  S.drawUpload = function(ctx, materialId, w, h, fallbackId){
    var m = App.store.getMaterial(materialId);
    if (m && m.src){
      var img = imageCache[m.src];
      if (img){
        drawCover(ctx, img, w, h);
        return true;
      }
      loadInto(m.src);
    }
    S.paint(ctx, fallbackId || 'dusk-window', w, h, 3);
    return false;
  };

  S.drawSource = function(ctx, ref, w, h, t){
    if (!ref) return;
    if (ref.kind === 'scene'){
      S.paint(ctx, ref.id, w, h, t);
    } else if (ref.kind === 'upload'){
      S.drawUpload(ctx, ref.id, w, h, ref.fallback);
    }
  };

  /* ---------------- 猜一张照片的天气 ---------------- */
  S.inferMood = function(img){
    try{
      var c = U.makeCanvas(32, 32);
      var ctx = c.getContext('2d', { willReadFrequently: true });
      ctx.drawImage(img, 0, 0, 32, 32);
      var data = ctx.getImageData(0, 0, 32, 32).data;
      var r = 0, g = 0, b = 0, bright = 0, sat = 0, contrast = 0;
      var vals = [];
      for (var i = 0; i < data.length; i += 4){
        var rr = data[i], gg = data[i + 1], bb = data[i + 2];
        r += rr; g += gg; b += bb;
        var mx = Math.max(rr, gg, bb), mn = Math.min(rr, gg, bb);
        sat += mx ? (mx - mn) / mx : 0;
        var lum = (rr * .299 + gg * .587 + bb * .114) / 255;
        bright += lum;
        vals.push(lum);
      }
      var n = data.length / 4;
      r /= n; g /= n; b /= n; bright /= n; sat /= n;
      var mean = bright;
      vals.forEach(function(v){ contrast += (v - mean) * (v - mean); });
      contrast = Math.sqrt(contrast / n);
      var warm = (r - b) / 255;

      if (bright > .58 && warm > .04) return 'bright';
      if (bright < .3 && sat < .2) return 'tired';
      if (b > r * 1.1 && bright < .52) return 'low';
      if (warm > .08 && bright < .55) return 'missing';
      if (contrast > .25 && bright < .6) return 'uneasy';
      return 'calm';
    }catch(e){
      return 'calm';
    }
  };

  S.moodFromFile = function(img){
    var key = S.inferMood(img);
    return key;
  };

  /* ---------------- 从视频里取几帧 ---------------- */
  S.extractVideoFrames = function(file){
    return new Promise(function(resolve, reject){
      var url = URL.createObjectURL(file);
      var video = document.createElement('video');
      video.muted = true;
      video.playsInline = true;
      video.preload = 'auto';
      video.src = url;
      var settled = false;
      var frames = [];
      var times = [];
      var index = 0;

      function finish(){
        if (settled) return;
        settled = true;
        URL.revokeObjectURL(url);
        if (!frames.length) reject(new Error('这段影片暂时取不出画面'));
        else resolve(frames);
      }

      function fail(){
        if (settled) return;
        settled = true;
        URL.revokeObjectURL(url);
        reject(new Error('这段影片暂时取不出画面'));
      }

      var timer = setTimeout(fail, 12000);

      video.onloadedmetadata = function(){
        var dur = isFinite(video.duration) ? video.duration : 0;
        if (!dur){
          times = [.1];
        } else if (dur < 2.5){
          times = [Math.min(.2, dur * .3)];
        } else {
          times = [dur * .15, dur * .5, dur * .82];
        }
        seekNext();
      };
      video.onerror = fail;

      function seekNext(){
        if (index >= times.length){ clearTimeout(timer); finish(); return; }
        try{
          video.currentTime = Math.max(.05, Math.min(times[index], (video.duration || 1) - .05));
        }catch(e){ fail(); }
      }

      video.onseeked = function(){
        try{
          var vw = video.videoWidth, vh = video.videoHeight;
          if (!vw || !vh){ fail(); return; }
          var scale = Math.min(1, 1280 / Math.max(vw, vh));
          var cw = Math.max(1, Math.round(vw * scale));
          var ch = Math.max(1, Math.round(vh * scale));
          var c = U.makeCanvas(cw, ch);
          var ctx = c.getContext('2d');
          ctx.drawImage(video, 0, 0, cw, ch);
          frames.push({
            src: c.toDataURL('image/jpeg', .8),
            w: cw, h: ch, at: video.currentTime
          });
        }catch(e){ /* 这一帧失败就跳过 */ }
        index++;
        seekNext();
      };

      try{ video.load(); }catch(e){ fail(); }
    });
  };

  S.imageCache = imageCache;
  S.rgba = rgba;
  S.mix = mix;
  S.vgrad = vgrad;
  S.hgrad = hgrad;
  S.glow = glow;
  S.softEllipse = softEllipse;
  S.ridge = ridge;
  S.person = person;
  S.birds = birds;
  S.dust = dust;
  S.texture = texture;

  App.scenes = S;
})();
