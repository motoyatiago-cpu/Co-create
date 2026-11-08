/* =========================================================
   放映：一帧一帧把感受放成片子。
   画面、字幕、颗粒、暗角、海报、导出，都在这一层。
   ========================================================= */
(function(){
  'use strict';

  var App = window.App = window.App || {};
  var U = App.util;
  var F = {};

  var W = 1280, H = 720, BAR = 44;
  var SERIF = '"Noto Serif SC","Source Han Serif SC","Songti SC","STSong",SimSun,serif';
  var SANS = '"Noto Sans SC","Source Han Sans SC","PingFang SC","Microsoft YaHei",sans-serif';
  var KAI = '"STKaiti","KaiTi","Kaiti SC","Noto Serif SC",serif';

  F.WIDTH = W;
  F.HEIGHT = H;

  function dimsFor(recipe, cap){
    var format = recipe && recipe.format;
    var width = (format && format.width) || W;
    var height = (format && format.height) || H;
    if (cap){
      var short = Math.min(width, height);
      if (short > cap){
        var scale = cap / short;
        width = Math.max(1, Math.round(width * scale));
        height = Math.max(1, Math.round(height * scale));
      }
    }
    return { width: width, height: height };
  }

  function typeScale(w, h){
    return Math.max(.5, Math.min(2, Math.min(w, h) / 720));
  }

  F.dimensions = function(recipe, cap){ return dimsFor(recipe, cap); };

  function clamp01(v){ return v < 0 ? 0 : v > 1 ? 1 : v; }

  function smooth(t){
    t = clamp01(t);
    return t * t * (3 - 2 * t);
  }

  function fadeIn(t, dur){
    return smooth(dur <= 0 ? 1 : t / dur);
  }

  function fadeOutAt(t, start, dur){
    return 1 - smooth(dur <= 0 ? 1 : (t - start) / dur);
  }

  function hexRgb(hex){
    hex = String(hex || '').replace('#', '');
    if (hex.length === 3) hex = hex.replace(/(.)/g, '$1$1');
    var n = parseInt(hex, 16);
    if (isNaN(n)) return { r: 200, g: 155, b: 90 };
    return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
  }

  function rgba(hex, alpha){
    var c = hexRgb(hex);
    return 'rgba(' + c.r + ',' + c.g + ',' + c.b + ',' + alpha + ')';
  }

  function fill(ctx, color, x, y, w, h){
    ctx.fillStyle = color;
    ctx.fillRect(x, y, w, h);
  }

  function moodOf(recipe){
    return App.data.mood(recipe && recipe.mood) || App.data.mood('calm');
  }

  function dateLabel(recipe){
    try{ return U.fmtDate(U.parseKey(recipe.dateKey)); }
    catch(e){ return U.fmtDate(new Date()); }
  }

  /* ---------------- 文字 ---------------- */
  function drawTracked(ctx, text, x, y, spacing, color, size, weight, family, align){
    text = String(text || '');
    spacing = spacing || 0;
    ctx.save();
    ctx.font = U.font(weight || 400, size || 16, family || SANS);
    ctx.fillStyle = color || 'rgba(236,226,207,.8)';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'alphabetic';
    var widths = [], total = 0;
    for (var i = 0; i < text.length; i++){
      var cw = ctx.measureText(text[i]).width;
      widths.push(cw);
      total += cw + (i < text.length - 1 ? spacing : 0);
    }
    var sx = x;
    if (align === 'center') sx = x - total / 2;
    if (align === 'right') sx = x - total;
    for (var j = 0; j < text.length; j++){
      ctx.fillText(text[j], sx, y);
      sx += widths[j] + spacing;
    }
    ctx.restore();
    return total;
  }

  function drawLines(ctx, lines, x, y, lineHeight, opts){
    opts = opts || {};
    ctx.save();
    ctx.font = opts.font || U.font(400, 28, SERIF);
    ctx.fillStyle = opts.color || 'rgba(236,226,207,.92)';
    ctx.textAlign = opts.align || 'center';
    ctx.textBaseline = 'alphabetic';
    if (opts.shadow){
      ctx.shadowColor = opts.shadow;
      ctx.shadowBlur = opts.shadowBlur || 16;
      ctx.shadowOffsetY = 2;
    }
    for (var i = 0; i < lines.length; i++){
      ctx.fillText(lines[i], x, y + i * lineHeight);
    }
    ctx.restore();
  }

  function wrapFor(ctx, text, maxWidth, font){
    ctx.save();
    if (font) ctx.font = font;
    var lines = U.wrapText(ctx, text, maxWidth);
    ctx.restore();
    return lines;
  }

  function fitSize(ctx, text, maxWidth, start, min, fontFn){
    var size = start;
    while (size > min){
      ctx.save();
      ctx.font = fontFn(size);
      var w = ctx.measureText(text).width;
      ctx.restore();
      if (w <= maxWidth) return size;
      size -= 2;
    }
    return min;
  }

  /* ---------------- 胶片质感 ---------------- */
  var grainTiles = null;

  function makeGrain(){
    if (grainTiles) return grainTiles;
    grainTiles = [];
    var gw = 240, gh = 135;
    for (var n = 0; n < 3; n++){
      var c = U.makeCanvas(gw, gh);
      var g = c.getContext('2d');
      var img = g.createImageData(gw, gh);
      for (var i = 0; i < img.data.length; i += 4){
        var v = Math.floor(Math.random() * 255);
        img.data[i] = v;
        img.data[i + 1] = v;
        img.data[i + 2] = v;
        img.data[i + 3] = 255;
      }
      g.putImageData(img, 0, 0);
      grainTiles.push(c);
    }
    return grainTiles;
  }

  function drawGrain(ctx, w, h, t){
    var tiles = makeGrain();
    var tile = tiles[Math.floor(Math.max(0, t) * 11) % tiles.length];
    var ox = (t * 53) % 31 - 15;
    var oy = (t * 37) % 29 - 14;
    ctx.save();
    ctx.globalAlpha = .038;
    ctx.globalCompositeOperation = 'overlay';
    ctx.drawImage(tile, ox - 16, oy - 12, w + 32, h + 24);
    ctx.restore();
  }

  function drawVignette(ctx, w, h, strength){
    var g = ctx.createRadialGradient(w * .5, h * .48, h * .22, w * .5, h * .5, Math.max(w, h) * .72);
    g.addColorStop(0, 'rgba(5,7,6,0)');
    g.addColorStop(.62, 'rgba(5,7,6,0)');
    g.addColorStop(1, 'rgba(4,6,5,' + (strength == null ? .46 : strength) + ')');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);
  }

  function applyGrade(ctx, mood, w, h, t){
    var grade = (mood && mood.grade) || { tint: '#5d7a68', alpha: .18, light: '#d5dfcd' };
    ctx.save();
    ctx.fillStyle = rgba(grade.tint, grade.alpha * .72);
    ctx.fillRect(0, 0, w, h);
    var lx = w * (.62 + Math.sin((t || 0) * .1) * .05);
    var ly = h * .22;
    var lg = ctx.createRadialGradient(lx, ly, 0, lx, ly, w * .72);
    lg.addColorStop(0, rgba(grade.light, .17));
    lg.addColorStop(.45, rgba(grade.light, .05));
    lg.addColorStop(1, rgba(grade.light, 0));
    ctx.globalCompositeOperation = 'screen';
    ctx.fillStyle = lg;
    ctx.fillRect(0, 0, w, h);
    ctx.restore();
  }

  function drawBars(ctx, w, h, t){
    var bar = Math.max(22, Math.round(BAR * typeScale(w, h)));
    fill(ctx, '#050706', 0, 0, w, bar);
    fill(ctx, '#050706', 0, h - bar, w, bar);
    ctx.fillStyle = 'rgba(236,226,207,.065)';
    ctx.fillRect(0, bar, w, 1);
    ctx.fillRect(0, h - bar - 1, w, 1);
    /* 片边的一点旧痕 */
    ctx.save();
    ctx.globalAlpha = .05;
    var ox = (t * 9) % 160;
    for (var i = 0; i < 7; i++){
      var x = ((i * 213 + ox) % (w + 80)) - 40;
      ctx.fillStyle = '#e8dcc6';
      ctx.fillRect(x, bar + 1, 1, 2);
    }
    ctx.restore();
  }

  function drawSprockets(ctx, w, h, t, alpha){
    var s = typeScale(w, h);
    var step = 76 * s;
    var strip = 80 * s;
    var holeW = 24 * s, holeH = 34 * s, holeX = 28 * s;
    ctx.save();
    ctx.globalAlpha = alpha == null ? .16 : alpha;
    var offset = (t * 14 * s) % step;
    for (var side = 0; side < 2; side++){
      var x = side === 0 ? holeX : w - holeX - holeW;
      fill(ctx, 'rgba(8,11,10,.5)', side === 0 ? 0 : w - strip, 0, strip, h);
      for (var y = -step + offset; y < h; y += step){
        U.roundRect(ctx, x, y, holeW, holeH, 5 * s);
        ctx.fillStyle = 'rgba(232,220,198,.16)';
        ctx.fill();
        ctx.strokeStyle = 'rgba(232,220,198,.22)';
        ctx.lineWidth = Math.max(1, s);
        ctx.stroke();
      }
    }
    ctx.restore();
  }

  /* ---------------- 开场 ---------------- */
  function drawIntro(ctx, recipe, local, w, h, opts){
    var mood = moodOf(recipe);
    var intro = recipe.intro || { dur: 3.5, caption: '' };
    var dur = intro.dur || 3.5;
    var inA = fadeIn(local, .9);
    var outA = fadeOutAt(local, dur - .9, .9);
    var alpha = Math.min(inA, outA);
    var s = typeScale(w, h);

    var bg = ctx.createLinearGradient(0, 0, 0, h);
    bg.addColorStop(0, '#0b100e');
    bg.addColorStop(.55, '#080b0a');
    bg.addColorStop(1, '#050706');
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, w, h);

    var glow = ctx.createRadialGradient(w * .7, h * .3, 0, w * .7, h * .3, w * .62);
    glow.addColorStop(0, rgba(mood.grade.light, .13));
    glow.addColorStop(.55, rgba(mood.grade.light, .035));
    glow.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = glow;
    ctx.fillRect(0, 0, w, h);

    drawSprockets(ctx, w, h, local, .12 * alpha);

    ctx.save();
    ctx.globalAlpha = alpha;
    var rise = 18 * s * (1 - smooth(local / 1.15));
    ctx.translate(0, rise);

    var date = dateLabel(recipe);
    drawTracked(ctx, date + '　　' + mood.name, w / 2, 196 * s, 3.5 * s, rgba('#c89b5a', .86), 17 * s, 400, SANS, 'center');

    var title = String(recipe.title || '把感受剪成片');
    var maxTitle = w * .72;
    var titleFont = function(size){ return U.font(600, size, SERIF); };
    var tsize = fitSize(ctx, title, maxTitle, 76 * s, 46 * s, titleFont);
    var titleLines = wrapFor(ctx, title, maxTitle, titleFont(tsize));
    if (titleLines.length > 2){
      titleLines = titleLines.slice(0, 2);
      titleLines[1] = titleLines[1].replace(/[，、。]$/, '') + '…';
    }
    var titleY = 322 * s;
    drawLines(ctx, titleLines, w / 2, titleY, tsize * 1.24, {
      font: titleFont(tsize), color: '#ece2cf', align: 'center', shadow: 'rgba(0,0,0,.6)', shadowBlur: 24 * s
    });

    var ruleY = titleY + (titleLines.length - 1) * tsize * 1.24 + 40 * s;
    ctx.strokeStyle = rgba('#c89b5a', .65);
    ctx.lineWidth = 1.2 * s;
    ctx.beginPath();
    ctx.moveTo(w / 2 - 42 * s, ruleY);
    ctx.lineTo(w / 2 + 42 * s, ruleY);
    ctx.stroke();

    if (intro.caption){
      var capFont = U.font(400, 27 * s, SERIF);
      var capLines = wrapFor(ctx, intro.caption, w * .58, capFont);
      drawLines(ctx, capLines, w / 2, ruleY + 58 * s, 44 * s, {
        font: capFont, color: 'rgba(216,203,180,.82)', align: 'center'
      });
    }

    drawTracked(ctx, '把感受剪成片', w / 2, h - 96 * s, 6 * s, 'rgba(200,155,90,.62)', 14 * s, 400, SERIF, 'center');
    ctx.restore();

    if (outA < 1){
      fill(ctx, 'rgba(4,6,5,' + (1 - outA) + ')', 0, 0, w, h);
    }
  }

  /* ---------------- 正片 ---------------- */
  function drawCaption(ctx, text, w, h, alpha){
    if (!text || alpha <= .004) return;
    var s = typeScale(w, h);
    ctx.save();
    ctx.globalAlpha = alpha;
    var scrim = ctx.createLinearGradient(0, h * .52, 0, h);
    scrim.addColorStop(0, 'rgba(4,6,5,0)');
    scrim.addColorStop(.55, 'rgba(4,6,5,.24)');
    scrim.addColorStop(1, 'rgba(4,6,5,.62)');
    ctx.fillStyle = scrim;
    ctx.fillRect(0, h * .52, w, h * .48);

    var font = U.font(400, 30 * s, SERIF);
    var lines = wrapFor(ctx, text, w * .68, font);
    if (lines.length > 2){
      lines = lines.slice(0, 2);
      lines[1] = lines[1].replace(/[，、。]$/, '') + '…';
    }
    var base = h - 112 * s - (lines.length - 1) * 44 * s;
    var lineY = base - 34 * s;
    ctx.strokeStyle = 'rgba(200,155,90,.62)';
    ctx.lineWidth = Math.max(1, s);
    ctx.beginPath();
    ctx.moveTo(w / 2 - 17 * s, lineY);
    ctx.lineTo(w / 2 + 17 * s, lineY);
    ctx.stroke();

    drawLines(ctx, lines, w / 2, base, 44 * s, {
      font: font, color: 'rgba(240,231,214,.96)', align: 'center',
      shadow: 'rgba(0,0,0,.85)', shadowBlur: 18 * s
    });
    ctx.restore();
  }

  function drawShot(ctx, recipe, shot, local, index, w, h, opts){
    opts = opts || {};
    var mood = moodOf(recipe);
    var dur = shot.dur || 5;
    var p = clamp01(local / dur);
    var motion = shot.motion || { from: 1.04, to: 1.12, panX: 0, panY: 0 };
    var z = (motion.from || 1.04) + ((motion.to || 1.12) - (motion.from || 1.04)) * smooth(p);
    var px = (motion.panX || 0) * w * (p - .5) * 2;
    var py = (motion.panY || 0) * h * (p - .5) * 2;

    ctx.save();
    ctx.translate(w / 2 + px, h / 2 + py);
    ctx.scale(z, z);
    ctx.translate(-w / 2, -h / 2);
    var m = .08;
    ctx.translate(-w * m, -h * m);
    try{
      App.scenes.drawSource(ctx, shot.ref, w * (1 + m * 2), h * (1 + m * 2), local + index * 4.3);
    }catch(e){
      fill(ctx, '#141b18', 0, 0, w * 1.16, h * 1.16);
    }
    ctx.restore();

    applyGrade(ctx, mood, w, h, local + index);

    /* 缓慢走过的光 */
    ctx.save();
    ctx.globalCompositeOperation = 'screen';
    var lx = w * (-.1 + p * 1.2);
    var leak = ctx.createRadialGradient(lx, h * .35, 0, lx, h * .35, w * .5);
    leak.addColorStop(0, rgba(mood.grade.light, .06));
    leak.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = leak;
    ctx.fillRect(0, 0, w, h);
    ctx.restore();

    if (!opts.noCaption){
      var ca = fadeIn(local - .65, 1.05) * fadeOutAt(local, dur - 1.05, .7);
      drawCaption(ctx, shot.caption, w, h, ca);
    }

    /* 首尾轻轻落黑 */
    var black = 0;
    if (local < .5) black = 1 - smooth(local / .5);
    if (local > dur - .55) black = Math.max(black, smooth((local - (dur - .55)) / .55));
    if (black > 0) fill(ctx, 'rgba(4,6,5,' + (black * .92) + ')', 0, 0, w, h);
  }

  /* ---------------- 收尾 ---------------- */
  function drawSeal(ctx, x, y, size, char){
    ctx.save();
    ctx.globalAlpha = .88;
    ctx.strokeStyle = '#a2574a';
    ctx.lineWidth = Math.max(1.2, size / 24);
    U.roundRect(ctx, x, y, size, size, size * .1);
    ctx.stroke();
    ctx.globalAlpha = .12;
    ctx.fillStyle = '#a2574a';
    ctx.fill();
    ctx.globalAlpha = .92;
    ctx.fillStyle = '#a2574a';
    ctx.font = U.font(400, size * .56, KAI);
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(char, x + size / 2, y + size / 2 + size * .02);
    ctx.restore();
  }

  function drawPaperCard(ctx, recipe, local, w, h, opts){
    var mood = moodOf(recipe);
    var outro = recipe.outro || { dur: 4.4, lines: [], sign: '' };
    var dur = outro.dur || 4.4;
    var appear = smooth((local - .15) / .95);
    var s = Math.max(.5, Math.min(typeScale(w, h), (w - 60) / 790, (h - 60) / 430));
    var cw = 790 * s, ch = 430 * s;
    var cx = w / 2, cy = h / 2 - 12 * s;
    var lift = 18 * s * (1 - appear);

    ctx.save();
    ctx.globalAlpha = appear;
    ctx.translate(cx, cy + lift);
    ctx.rotate(-.006);

    ctx.shadowColor = 'rgba(0,0,0,.55)';
    ctx.shadowBlur = 44 * s;
    ctx.shadowOffsetY = 18 * s;
    ctx.fillStyle = '#e8dcc6';
    U.roundRect(ctx, -cw / 2, -ch / 2, cw, ch, 6 * s);
    ctx.fill();
    ctx.shadowColor = 'rgba(0,0,0,0)';

    var paper = ctx.createLinearGradient(-cw / 2, -ch / 2, cw / 2, ch / 2);
    paper.addColorStop(0, 'rgba(255,252,242,.28)');
    paper.addColorStop(.55, 'rgba(255,252,242,0)');
    paper.addColorStop(1, 'rgba(95,85,68,.06)');
    ctx.fillStyle = paper;
    U.roundRect(ctx, -cw / 2, -ch / 2, cw, ch, 6 * s);
    ctx.fill();

    /* 纸里的一点旧痕 */
    var rnd = U.rng((recipe.seed || 7) + 13);
    ctx.save();
    ctx.globalAlpha = .1;
    for (var i = 0; i < 16; i++){
      var sx = -cw / 2 + 24 * s + rnd() * (cw - 48 * s);
      var sy = -ch / 2 + 20 * s + rnd() * (ch - 40 * s);
      ctx.fillStyle = i % 3 ? '#5f5544' : '#9b7440';
      ctx.fillRect(sx, sy, 1 + rnd() * 1.6, 1);
    }
    ctx.restore();

    var left = -cw / 2 + 74 * s;
    drawTracked(ctx, dateLabel(recipe) + '　' + mood.name, left, -ch / 2 + 66 * s, 2.6 * s, 'rgba(155,116,64,.9)', 14 * s, 400, SANS, 'left');

    var title = recipe.title || '把感受剪成片';
    var titleSize = fitSize(ctx, title, cw - 148 * s, 42 * s, 28 * s, function(size){ return U.font(600, size, SERIF); });
    ctx.font = U.font(600, titleSize, SERIF);
    ctx.fillStyle = '#241f19';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'alphabetic';
    ctx.fillText(title, left, -ch / 2 + 126 * s, cw - 148 * s);

    ctx.strokeStyle = 'rgba(36,31,25,.22)';
    ctx.lineWidth = Math.max(1, s);
    ctx.beginPath();
    ctx.moveTo(left, -ch / 2 + 156 * s);
    ctx.lineTo(cw / 2 - 74 * s, -ch / 2 + 156 * s);
    ctx.stroke();

    var lines = (outro.lines && outro.lines.length ? outro.lines : ['']).filter(Boolean);
    var lineFont = U.font(400, 28 * s, SERIF);
    var wrapped = [];
    lines.forEach(function(line){
      wrapFor(ctx, line, cw - 160 * s, lineFont).forEach(function(l){ wrapped.push(l); });
    });
    wrapped = wrapped.slice(0, 3);
    drawLines(ctx, wrapped, left, -ch / 2 + 212 * s, 46 * s, {
      font: lineFont, color: 'rgba(36,31,25,.9)', align: 'left'
    });

    drawTracked(ctx, outro.sign || '', left, ch / 2 - 52 * s, 1.4 * s, 'rgba(95,85,68,.72)', 14 * s, 400, SANS, 'left');

    drawSeal(ctx, cw / 2 - 116 * s, ch / 2 - 100 * s, 48 * s, '剪');
    ctx.restore();

    drawTracked(ctx, '把感受剪成片', w / 2, cy + ch / 2 + 62 * s, 5 * s, 'rgba(216,203,180,.5)', 13 * s, 400, SERIF, 'center');

    if (local > dur - 1.1){
      var fade = smooth((local - (dur - 1.1)) / 1.1);
      fill(ctx, 'rgba(4,6,5,' + (fade * .96) + ')', 0, 0, w, h);
    }
  }

  function drawOutro(ctx, recipe, local, w, h, opts){
    var outro = recipe.outro || { dur: 4.4 };
    var dur = outro.dur || 4.4;
    var last = recipe.shots && recipe.shots[recipe.shots.length - 1];
    var t = clamp01(local / Math.max(1, dur));

    fill(ctx, '#080b0a', 0, 0, w, h);
    if (last){
      ctx.save();
      try{
        if (ctx.filter != null) ctx.filter = 'blur(7px)';
      }catch(e){}
      ctx.globalAlpha = .55;
      ctx.translate(w / 2, h / 2);
      ctx.scale(1.06 + t * .015, 1.06 + t * .015);
      ctx.translate(-w / 2, -h / 2);
      try{
        App.scenes.drawSource(ctx, last.ref, w, h, 2.4);
      }catch(e){}
      ctx.restore();
    }
    fill(ctx, 'rgba(6,9,8,.52)', 0, 0, w, h);
    applyGrade(ctx, moodOf(recipe), w, h, 4);

    drawPaperCard(ctx, recipe, local, w, h, opts);
  }

  function phaseAt(recipe, time){
    var t = Math.max(0, time || 0);
    var introDur = (recipe.intro && recipe.intro.dur) || 0;
    if (t < introDur) return { phase: 'intro', local: t, index: -1 };
    t -= introDur;
    var shots = recipe.shots || [];
    for (var i = 0; i < shots.length; i++){
      if (t < shots[i].dur) return { phase: 'shot', local: t, index: i, shot: shots[i] };
      t -= shots[i].dur;
    }
    return { phase: 'outro', local: t, index: shots.length };
  }

  F.renderFrame = function(ctx, recipe, time, opts){
    opts = opts || {};
    if (!ctx) return;
    var w = opts.width || ctx.canvas.width || W;
    var h = opts.height || ctx.canvas.height || H;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = 'source-over';
    fill(ctx, '#050706', 0, 0, w, h);
    if (!recipe) return;

    var total = recipe.duration || 1;
    var t = Math.max(0, Math.min(time || 0, total - .001));
    var ph = phaseAt(recipe, t);

    if (ph.phase === 'intro'){
      drawIntro(ctx, recipe, ph.local, w, h, opts);
    } else if (ph.phase === 'shot'){
      drawShot(ctx, recipe, ph.shot, ph.local, ph.index, w, h, opts);
    } else {
      drawOutro(ctx, recipe, ph.local, w, h, opts);
    }

    if (!opts.clean){
      drawGrain(ctx, w, h, t);
      drawVignette(ctx, w, h, opts.vignette == null ? .46 : opts.vignette);
    }
    if (!opts.noBars){
      drawBars(ctx, w, h, t);
      if (t < .5) fill(ctx, 'rgba(4,6,5,' + (1 - smooth(t / .5)) + ')', 0, 0, w, h);
      var left = total - t;
      if (left < 1.2) fill(ctx, 'rgba(4,6,5,' + (smooth(1 - left / 1.2) * .98) + ')', 0, 0, w, h);
    }
  };

  /* ---------------- 画面工具 ---------------- */
  F.frameCanvas = function(recipe, time, opts){
    opts = opts || {};
    var d = dimsFor(recipe, opts.cap);
    var c = U.makeCanvas(d.width, d.height);
    var ctx = c.getContext('2d');
    F.renderFrame(ctx, recipe, time, Object.assign({}, opts, { width: d.width, height: d.height }));
    return c;
  };

  F.stillDataURL = function(recipe, time, width, opts){
    var d = dimsFor(recipe, width || 960);
    var c = U.makeCanvas(d.width, d.height);
    var ctx = c.getContext('2d');
    F.renderFrame(ctx, recipe, time, Object.assign({}, opts || {}, { width: d.width, height: d.height }));
    return c.toDataURL('image/jpeg', .86);
  };

  /* ---------------- 海报 ---------------- */
  F.posterDataURL = function(recipe, opts){
    opts = opts || {};
    var w = opts.width || 1080;
    var h = Math.round(w * 4 / 3);
    var c = U.makeCanvas(w, h);
    var ctx = c.getContext('2d');
    var mood = moodOf(recipe);
    var shots = recipe.shots || [];
    var shot = shots[Math.min(1, shots.length - 1)] || shots[0] || { ref: { kind: 'scene', id: 'dusk-window' } };
    var t = recipe.isHealingFilm ? 3.2 : 2.7;

    fill(ctx, '#0a0d0c', 0, 0, w, h);
    ctx.save();
    var m = .06;
    ctx.translate(-w * m, -h * m);
    try{
      App.scenes.drawSource(ctx, shot.ref, w * (1 + m * 2), h * (1 + m * 2), t);
    }catch(e){}
    ctx.restore();
    applyGrade(ctx, mood, w, h, t);

    /* 上下压暗，给字让出地方 */
    var top = ctx.createLinearGradient(0, 0, 0, h * .48);
    top.addColorStop(0, 'rgba(4,6,5,.82)');
    top.addColorStop(.55, 'rgba(4,6,5,.34)');
    top.addColorStop(1, 'rgba(4,6,5,0)');
    ctx.fillStyle = top;
    ctx.fillRect(0, 0, w, h * .48);

    var bottom = ctx.createLinearGradient(0, h * .48, 0, h);
    bottom.addColorStop(0, 'rgba(4,6,5,0)');
    bottom.addColorStop(.5, 'rgba(4,6,5,.45)');
    bottom.addColorStop(1, 'rgba(4,6,5,.92)');
    ctx.fillStyle = bottom;
    ctx.fillRect(0, h * .48, w, h * .52);

    drawGrain(ctx, w, h, 3.6);
    drawVignette(ctx, w, h, .5);

    var x = Math.round(w * .078);
    var date = dateLabel(recipe);
    drawTracked(ctx, date + '　　' + mood.name, x, h * .105, 4, 'rgba(224,185,121,.92)', 21, 400, SANS, 'left');

    var title = String(recipe.title || '把感受剪成片');
    var maxW = w - x * 2;
    var ts = fitSize(ctx, title, maxW, 92, 48, function(s){ return U.font(600, s, SERIF); });
    var titleLines = wrapFor(ctx, title, maxW, U.font(600, ts, SERIF));
    if (titleLines.length > 3){
      titleLines = titleLines.slice(0, 3);
      titleLines[2] = titleLines[2].replace(/[，、。]$/, '') + '…';
    }
    var titleTop = h * .22;
    drawLines(ctx, titleLines, x, titleTop, ts * 1.22, {
      font: U.font(600, ts, SERIF), color: '#ece2cf', align: 'left',
      shadow: 'rgba(0,0,0,.65)', shadowBlur: 26
    });

    var ruleY = titleTop + (titleLines.length - 1) * ts * 1.22 + 52;
    ctx.strokeStyle = 'rgba(200,155,90,.82)';
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.moveTo(x, ruleY);
    ctx.lineTo(x + 84, ruleY);
    ctx.stroke();

    var sentence = String(recipe.sentence || '');
    if (sentence.length > 60) sentence = sentence.slice(0, 58).replace(/[，、。]$/, '') + '…';
    var sFont = U.font(400, 31, SERIF);
    var sLines = wrapFor(ctx, sentence, w - x * 2 - 40, sFont).slice(0, 3);
    drawLines(ctx, sLines, x, h - h * .205, 47, {
      font: sFont, color: 'rgba(236,226,207,.9)', align: 'left',
      shadow: 'rgba(0,0,0,.7)', shadowBlur: 18
    });

    drawTracked(ctx, '把感受剪成片', x, h - h * .072, 6, 'rgba(236,226,207,.72)', 17, 400, SERIF, 'left');
    drawSeal(ctx, w - x - 46, h - h * .092, 46, '剪');

    ctx.strokeStyle = 'rgba(236,226,207,.22)';
    ctx.lineWidth = 1;
    ctx.strokeRect(22.5, 22.5, w - 45, h - 45);

    return c.toDataURL('image/jpeg', .9);
  };

  /* ---------------- 放映控制 ---------------- */
  F.player = function(canvas, recipe, options){
    options = options || {};
    if (!canvas) throw new Error('没有找到放映的画布');
    var ctx = canvas.getContext('2d');
    var d = dimsFor(recipe, options.cap || 720);
    var cw = options.width || d.width, ch = options.height || d.height;
    canvas.width = cw;
    canvas.height = ch;
    canvas.style.aspectRatio = cw + ' / ' + ch;
    if (canvas.parentNode && canvas.parentNode.style){
      canvas.parentNode.style.setProperty('--film-ratio', String(cw / ch));
    }

    var duration = recipe ? recipe.duration : 0;
    var time = Math.max(0, options.from || 0);
    var playing = false;
    var raf = 0;
    var last = 0;
    var destroyed = false;
    var current = recipe;

    function draw(){
      F.renderFrame(ctx, current, time, { width: cw, height: ch });
    }

    function emit(){
      if (options.onTick) options.onTick(time, duration);
    }

    function setState(value){
      if (options.onState) options.onState(value);
    }

    function stopRaf(){
      if (raf) cancelAnimationFrame(raf);
      raf = 0;
    }

    function stopMusic(fade){
      if (options.music !== false && App.music) App.music.stop(fade == null ? .6 : fade);
    }

    function tick(now){
      if (!playing || destroyed) return;
      var dt = last ? Math.min(.12, (now - last) / 1000) : 0;
      last = now;
      time += dt;
      if (time >= duration - .002){
        time = duration - .002;
        draw();
        emit();
        pause(true);
        if (options.onEnd) options.onEnd();
        return;
      }
      draw();
      emit();
      raf = requestAnimationFrame(tick);
    }

    function play(from){
      if (destroyed || !current) return;
      if (typeof from === 'number') time = Math.max(0, Math.min(from, duration - .002));
      if (time >= duration - .01) time = 0;
      if (playing) return;
      playing = true;
      last = 0;
      setState(true);
      if (options.music !== false && App.music){
        if (App.music.startFor) App.music.startFor(current.music, current.mood || 'calm', { hard: true });
        else App.music.start(current.mood || 'calm', { hard: true });
      }
      draw();
      emit();
      raf = requestAnimationFrame(tick);
    }

    function pause(silentEnd){
      if (!playing) return;
      playing = false;
      stopRaf();
      if (!silentEnd) stopMusic(.5);
      else stopMusic(1.2);
      setState(false);
    }

    function seek(seconds){
      time = Math.max(0, Math.min(Number(seconds) || 0, duration - .002));
      draw();
      emit();
    }

    function load(next){
      pause(true);
      current = next;
      duration = next ? next.duration : 0;
      time = 0;
      draw();
      emit();
    }

    function destroy(){
      pause(true);
      destroyed = true;
      stopRaf();
    }

    draw();
    emit();

    return {
      play: play,
      pause: pause,
      toggle: function(){ if (playing) pause(); else play(); },
      seek: seek,
      load: load,
      draw: draw,
      destroy: destroy,
      time: function(){ return time; },
      duration: function(){ return duration; },
      isPlaying: function(){ return playing; }
    };
  };

  /* ---------------- 首页循环 ---------------- */
  F.heroLoop = function(canvas, opts){
    opts = opts || {};
    if (!canvas) return null;
    var ctx = canvas.getContext('2d');
    var cw = opts.width || W, ch = opts.height || H;
    canvas.width = cw;
    canvas.height = ch;
    var scenes = opts.scenes || ['dusk-platform', 'dusk-window', 'table-flower', 'morning-fog', 'night-shop'];
    var each = opts.each || 5.6;
    var cross = Math.min(1.5, each * .28);
    var moodKey = opts.mood || 'calm';
    var mood = App.data.mood(moodKey) || App.data.mood('calm');
    var raf = 0;
    var last = 0;
    var elapsed = opts.start || 0;
    var stopped = false;

    function drawScene(id, t, seed){
      var p = (t / each) % 1;
      var z = 1.03 + p * .07;
      ctx.save();
      ctx.translate(cw / 2, ch / 2);
      ctx.scale(z, z);
      ctx.translate(-cw / 2, -ch / 2);
      var m = .06;
      ctx.translate(-cw * m, -ch * m);
      try{
        App.scenes.drawSource(ctx, { kind: 'scene', id: id }, cw * (1 + m * 2), ch * (1 + m * 2), t + seed);
      }catch(e){}
      ctx.restore();
    }

    function frame(){
      if (stopped) return;
      fill(ctx, '#080b0a', 0, 0, cw, ch);
      var total = each * scenes.length;
      var pos = elapsed % total;
      var idx = Math.floor(pos / each);
      var local = pos - idx * each;
      var prevIdx = (idx - 1 + scenes.length) % scenes.length;

      if (local < cross){
        drawScene(scenes[prevIdx], each - cross + local, prevIdx * 3.1);
        ctx.save();
        ctx.globalAlpha = smooth(local / cross);
        drawScene(scenes[idx], local, idx * 3.1);
        ctx.restore();
      } else {
        drawScene(scenes[idx], local, idx * 3.1);
      }

      applyGrade(ctx, mood, cw, ch, elapsed);
      drawGrain(ctx, cw, ch, elapsed);
      drawVignette(ctx, cw, ch, .42);

      var top = ctx.createLinearGradient(0, 0, 0, ch * .45);
      top.addColorStop(0, 'rgba(4,6,5,.48)');
      top.addColorStop(1, 'rgba(4,6,5,0)');
      ctx.fillStyle = top;
      ctx.fillRect(0, 0, cw, ch * .45);
      var bottom = ctx.createLinearGradient(0, ch * .55, 0, ch);
      bottom.addColorStop(0, 'rgba(4,6,5,0)');
      bottom.addColorStop(1, 'rgba(4,6,5,.58)');
      ctx.fillStyle = bottom;
      ctx.fillRect(0, ch * .55, cw, ch * .45);
    }

    function tick(now){
      if (stopped) return;
      var dt = last ? Math.min(.1, (now - last) / 1000) : 0;
      last = now;
      elapsed += dt;
      frame();
      raf = requestAnimationFrame(tick);
    }

    frame();
    if (!U.reduceMotion()){
      raf = requestAnimationFrame(tick);
    } else {
      /* 不动的时候，也让画面停在有光的一刻 */
      elapsed = 2.2;
      frame();
    }

    return {
      destroy: function(){
        stopped = true;
        if (raf) cancelAnimationFrame(raf);
      },
      canvas: canvas,
      draw: frame
    };
  };

  /* ---------------- 导出 ---------------- */
  F.canExport = function(){ return U.canMediaRecord(); };

  F.export = function(recipe, opts){
    opts = opts || {};
    if (!recipe) return Promise.reject(new Error('还没有可以导出的片子'));
    if (!U.canMediaRecord()) return Promise.reject(new Error('这个浏览器暂时不能导出影片，可以先把它放完'));

    var dims = dimsFor(recipe);
    var videoBitrate = (recipe.format && recipe.format.bitrate) || 6000000;
    var canvas = U.makeCanvas(dims.width, dims.height);
    var ctx = canvas.getContext('2d');
    var mime = U.pickMime();
    var stream;
    try{
      stream = canvas.captureStream(30);
    }catch(e){
      return Promise.reject(new Error('这个浏览器暂时不能导出影片，可以先把它放完'));
    }

    var audioAdded = false;
    var musicStarted = false;
    var aborted = false;
    var timer = 0;
    var recorder = null;
    var chunks = [];
    var startedAt = 0;
    var lastProgress = -1;

    function cleanupMusic(){
      if (musicStarted && App.music){
        try{ App.music.stop(1.1); }catch(e){}
        musicStarted = false;
      }
    }

    function stopEverything(){
      if (timer){ clearInterval(timer); timer = 0; }
      try{
        /* 只停画面这一路，配乐那一路还要留给下一次 */
        stream.getVideoTracks().forEach(function(track){ track.stop(); });
      }catch(e){}
    }

    function musicReady(){
      if (opts.music === false || !App.music || !App.music.hasAudio()) return Promise.resolve();
      var streamRef = null;
      try{ streamRef = App.music.stream(); }catch(e){ streamRef = null; }
      var started = App.music.startFor
        ? App.music.startFor(recipe.music, recipe.mood || 'calm', { hard: true })
        : App.music.start(recipe.mood || 'calm', { hard: true });
      return started.then(function(){
        musicStarted = true;
        var audioStream = streamRef || App.music.stream();
        var tracks = audioStream ? audioStream.getAudioTracks() : [];
        if (tracks && tracks[0]){
          try{
            stream.addTrack(tracks[0]);
            audioAdded = true;
          }catch(e){}
        }
      }).catch(function(){});
    }

    return musicReady().then(function(){
      return new Promise(function(resolve, reject){
        function fail(message){
          stopEverything();
          cleanupMusic();
          reject(new Error(message || '导出的时候断了一下'));
        }

        try{
          var options = { videoBitsPerSecond: videoBitrate };
          if (mime) options.mimeType = mime;
          if (audioAdded) options.audioBitsPerSecond = 128000;
          recorder = new MediaRecorder(stream, options);
        }catch(e){
          try{
            recorder = new MediaRecorder(stream);
          }catch(err){
            fail('这个浏览器暂时不能导出影片，可以先把它放完');
            return;
          }
        }

        recorder.ondataavailable = function(ev){
          if (ev.data && ev.data.size) chunks.push(ev.data);
        };
        recorder.onerror = function(){
          fail('导出的时候断了一下，可以再试一次');
        };
        recorder.onstop = function(){
          stopEverything();
          cleanupMusic();
          if (aborted){
            reject(new Error('已经停下'));
            return;
          }
          var type = (recorder && recorder.mimeType) || mime || 'video/webm';
          var blob = new Blob(chunks, { type: type });
          if (!blob.size){
            reject(new Error('这次没有录到画面，可以再试一次'));
            return;
          }
          resolve({ blob: blob, mime: type, ext: U.extensionFor(type), duration: recipe.duration });
        };

        F.renderFrame(ctx, recipe, 0, { width: dims.width, height: dims.height });

        if (opts.signal){
          if (opts.signal.aborted){
            fail('已经停下');
            return;
          }
          opts.signal.addEventListener('abort', function(){
            aborted = true;
            if (recorder && recorder.state !== 'inactive'){
              try{ recorder.stop(); }catch(e){}
            } else {
              fail('已经停下');
            }
          });
        }

        try{
          recorder.start(1000);
        }catch(e){
          fail('这个浏览器暂时不能导出影片，可以先把它放完');
          return;
        }

        startedAt = (window.performance && performance.now) ? performance.now() : Date.now();
        var faded = false;

        timer = setInterval(function(){
          if (aborted) return;
          var now = (window.performance && performance.now) ? performance.now() : Date.now();
          var elapsed = (now - startedAt) / 1000;
          var t = Math.min(elapsed, recipe.duration - .001);
          F.renderFrame(ctx, recipe, t, { width: dims.width, height: dims.height });

          var ratio = clamp01(elapsed / recipe.duration);
          if (opts.onProgress && Math.abs(ratio - lastProgress) > .004){
            lastProgress = ratio;
            opts.onProgress(ratio, elapsed);
          }

          if (!faded && musicStarted && elapsed > recipe.duration - 1.6){
            faded = true;
            try{ App.music.fadeOutFor(1.5); }catch(e){}
          }

          if (elapsed >= recipe.duration + .35){
            clearInterval(timer);
            timer = 0;
            if (recorder.state !== 'inactive'){
              try{ recorder.stop(); }catch(e){ fail('导出的时候断了一下，可以再试一次'); }
            }
          }
        }, 1000 / 30);
      });
    });
  };

  /* 给以后接更完整的剪片接口 */
  F.draw = F.renderFrame;
  App.film = F;
})();
