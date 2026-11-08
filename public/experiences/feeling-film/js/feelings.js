/* =========================================================
   听一句人话，替它想好一条片子的结构。
   分析、出题、写字幕、定标题、留备用片，都在这里。
   ========================================================= */
(function(){
  'use strict';

  var App = window.App = window.App || {};
  var U = App.util;
  var F = {};

  /* 留给更聪明的以后：替换其中任意一项，页面不用改 */
  F.hooks = {
    analyze: null,
    questions: null,
    captions: null,
    title: null,
    voiceover: null
  };

  var EXTRA_LEXICON = {
    low: ['难受', '压抑', '郁闷', '失望', '灰心', '寂寞', '无助', '心里堵', '空荡', '不好受', '心酸', '酸涩', '没盼头', '不想解释', '沉默'],
    calm: ['平和', '宁静', '安心', '发呆', '放空', '散步', '平常心', '还好', '还行', '一般', '顺其自然', '缓过来'],
    bright: ['愉快', '喜悦', '开怀', '温暖', '感动', '美好', '灿烂', '盼头', '有光', '被理解', '笑了', '笑'],
    missing: ['思念', '挂念', '惦记', '老朋友', '好久', '从前', '那时候', '照片', '名字', '离开', '告别', '走远'],
    tired: ['乏力', '没精神', '头昏', '只想躺', '不想上班', '赶不完', '喘口气', '电量', '硬撑', '忙完'],
    uneasy: ['焦躁', '烦恼', '心里乱', '怎么办', '来不及', '赶不上', '悬着心', '坐不住', '手心出汗', '怕']
  };

  var NEGATORS = ['并不', '并没有', '不是', '没有', '不太', '不怎么', '不够', '不', '没', '别', '未'];
  var HARD = ['非常', '特别', '真的', '超级', '极其', '十分', '格外', '太', '很', '好'];
  var SOFT = ['有点', '有些', '稍微', '一点点', '有一点点', '不太'];

  var OPPOSITE = {
    bright: 'low',
    low: 'calm',
    calm: 'uneasy',
    missing: 'calm',
    tired: 'calm',
    uneasy: 'calm'
  };

  var THEME_WEIGHTS = {
    time: {
      '清晨': { calm: .3, bright: .2 }, '早上': { calm: .25, bright: .15 },
      '中午': { calm: .2 }, '下午': { calm: .15, tired: .2 },
      '傍晚': { missing: .4, low: .2 }, '黄昏': { missing: .4, low: .2 },
      '夜里': { tired: .3, low: .3, uneasy: .15 }, '深夜': { tired: .55, low: .3 },
      '凌晨': { tired: .5, low: .25 }
    },
    place: {
      '地铁': { tired: .3, uneasy: .2 }, '车站': { missing: .45, tired: .2 },
      '站台': { missing: .5, tired: .2 }, '海边': { calm: .5, missing: .3 },
      '房间': { low: .3, calm: .2 }, '窗边': { low: .2, missing: .3 },
      '路上': { tired: .2, calm: .2 }, '街角': { calm: .2, uneasy: .2 },
      '天台': { calm: .3, bright: .2 }, '桌上': { calm: .2 },
      '店里': { calm: .2, tired: .2 }, '机场': { missing: .4, uneasy: .2 },
      '书店': { calm: .3, bright: .2 }, '医院': { uneasy: .5, low: .3 },
      '楼下': { calm: .1 }
    },
    weather: {
      '下雨': { low: .2, uneasy: .2 }, '雨停': { calm: .2, missing: .2 },
      '起风': { calm: .2, missing: .2 }, '阴天': { low: .2, tired: .2 },
      '晴天': { bright: .45 }, '起雾': { calm: .2, missing: .2 },
      '下雪': { bright: .35, calm: .2 }, '云很厚': { low: .2 },
      '天很蓝': { bright: .4 }, '天色': { missing: .2 }
    },
    people: {
      '一个人': { low: .4, missing: .2 }, '我们': { missing: .3, bright: .2 },
      '他们': { missing: .2 }, '他': { missing: .2 }, '她': { missing: .2 },
      '你': { missing: .4 }, '朋友': { bright: .2, missing: .2 },
      '妈妈': { missing: .3, calm: .15 }, '爸爸': { missing: .3, calm: .15 },
      '同事': { uneasy: .2, tired: .2 }
    }
  };

  var THEME_LINES = {
    time: {
      '清晨': '清晨的光很淡，像还没决定要不要亮。',
      '早上': '早上的时间，走得比别的时候慢一点。',
      '中午': '中午的光落在桌面上，白得有点发空。',
      '下午': '下午很长，长得不知道该放在哪里。',
      '傍晚': '傍晚把影子拉得很长。',
      '黄昏': '黄昏的时候，天色软下来。',
      '夜里': '夜里，所有声音都变轻了。',
      '深夜': '深夜的房间，只剩下一点光。',
      '凌晨': '凌晨还没醒，世界先安静了。'
    },
    place: {
      '地铁': '地铁穿过地下，窗里只剩自己的影子。',
      '车站': '车站的人来来往往，我站在原地。',
      '站台': '车还没来，风先到了。',
      '海边': '海把声音收走，又慢慢还回来。',
      '房间': '房间里很安静，安静得能听见自己。',
      '窗边': '窗边的光，一寸一寸移过去。',
      '路上': '路上的人都有地方要去。',
      '街角': '街角的风，比别处多一点。',
      '天台': '天台上，云走得很慢。',
      '桌上': '桌上那圈光，一直没有挪开。',
      '店里': '店里的灯亮着，像在等谁。',
      '机场': '机场的广播很远，离别的味道很近。',
      '书店': '书店里很静，纸页替人说话。',
      '医院': '走廊的灯太白，时间过得很慢。',
      '楼下': '楼下有小孩在跑，声音传得很高。'
    },
    weather: {
      '下雨': '雨落下来，把世界擦成另一种颜色。',
      '雨停': '雨停了，路面还留着一点亮。',
      '起风': '风从很远处来，经过这里。',
      '阴天': '天阴着，光也收起了边。',
      '晴天': '天很晴，光落在肩上有点重。',
      '起雾': '雾把远处收了起来。',
      '下雪': '雪落得很轻，像怕吵醒谁。',
      '云很厚': '云很厚，压得天色低下来。',
      '天很蓝': '天蓝得有点不真实。',
      '天色': '天色在换气。'
    },
    people: {
      '一个人': '一个人的时候，时间会变得很具体。',
      '我们': '我们并肩站着，谁也没有先开口。',
      '他们': '他们走远了，声音还留在原地。',
      '他': '想起他时，光刚好落在旧地方。',
      '她': '她的名字，在嘴边停了一下。',
      '你': '如果你也刚好抬头，就当这阵风是我。',
      '朋友': '朋友发来一句“在吗”，我没有马上回。',
      '妈妈': '妈妈的声音从电话那头传来，很轻。',
      '爸爸': '爸爸还是那几句，问吃了没有。',
      '同事': '同事说了句“辛苦了”，我点了点头。'
    }
  };

  var SCENE_LINES = {
    'dusk-window': ['窗外的灯，一盏一盏亮起来。', '窗没有关，风替我把房间翻了一遍。'],
    'ebb-tide': ['潮水退到很远的地方，礁石露了出来。', '海面很平，像什么都没有发生过。'],
    'after-rain': ['雨停了，路面还亮着。', '红绿灯在湿地上，碎成两种颜色。'],
    'street-tree': ['树影把路灯分成很多块。', '叶子落下来，没有人接。'],
    'morning-fog': ['雾把远处收了起来。', '草叶上还有水，天已经亮了。'],
    'desk-light': ['桌角那圈光，还留着。', '杯子里的热气，慢慢散开。'],
    'roof-clouds': ['云走得很慢，像不赶时间。', '天台上，风把衣角吹起来。'],
    'dusk-platform': ['车还没来，风先到了。', '站台的灯，把影子留在地上。'],
    'table-flower': ['花在桌上，开得很安静。', '一片花瓣落下来，没有声音。'],
    'old-photo': ['照片里的人，还在笑。', '光落在旧照片上，像一层薄薄的灰。'],
    'night-shop': ['那家店还亮着，像在等谁。', '夜很深了，灯还没有关。'],
    'seaside-two': ['海把两个人的影子拉长。', '夕阳落下去，谁都没有动。']
  };

  var UPLOAD_LINES = [
    '这一帧，是你自己留下来的。',
    '当时按下快门，也许只是觉得好看。',
    '画面有点晃，可那一刻是真的。',
    '这一小段光，被你收进了相册。'
  ];

  var HEALING_TITLES = ['还亮着的一小段', '那天的一点光', '没舍得删的一帧', '替你留着的晴天', '偶然亮起来的地方'];
  var HEALING_CAPTIONS = [
    '这一小段，当时没舍得用。',
    '原来那天也有亮的时候。',
    '它替你留了一小块晴天。',
    '你笑的时候，光正好落在肩上。',
    '先放这里，哪天需要再拿走。',
    '这一帧不急着解释，亮着就好。'
  ];

  function dedupe(arr){
    var seen = {};
    return arr.filter(function(x){
      if (!x || seen[x]) return false;
      seen[x] = true;
      return true;
    });
  }

  function allWords(moodKey){
    var base = (App.data.lexicon[moodKey] || {});
    return {
      strong: dedupe((base.strong || []).concat(EXTRA_LEXICON[moodKey] || [])),
      mild: dedupe(base.mild || [])
    };
  }

  function contextBefore(text, index){
    return text.slice(Math.max(0, index - 5), index);
  }

  function negatedBefore(before){
    for (var i = 0; i < NEGATORS.length; i++){
      var n = NEGATORS[i];
      var idx = before.lastIndexOf(n);
      if (idx >= 0){
        var tail = before.slice(idx + n.length);
        if (tail.length <= 3 && !/[，。！？；,\.!?;]/.test(tail)) return true;
      }
    }
    return false;
  }

  function intensityAt(before){
    for (var i = 0; i < SOFT.length; i++){
      if (before.indexOf(SOFT[i]) >= 0) return .72;
    }
    for (var j = 0; j < HARD.length; j++){
      if (before.slice(-3).indexOf(HARD[j]) >= 0) return 1.35;
    }
    return 1;
  }

  function matchMood(text, moodKey, scores, matched){
    var words = allWords(moodKey);
    var keys = Object.keys(words);
    keys.forEach(function(band){
      var weight = band === 'strong' ? 2.7 : 1.15;
      words[band].forEach(function(word){
        var from = 0;
        while (true){
          var idx = text.indexOf(word, from);
          if (idx < 0) break;
          var before = contextBefore(text, idx);
          var mult = intensityAt(before);
          if (negatedBefore(before)){
            var opp = OPPOSITE[moodKey];
            if (opp){
              scores[opp] = (scores[opp] || 0) + weight * mult * .9;
              matched[opp] = matched[opp] || [];
              matched[opp].push('不' + word);
            }
            scores[moodKey] = (scores[moodKey] || 0) - weight * .25;
          } else {
            scores[moodKey] = (scores[moodKey] || 0) + weight * mult;
            matched[moodKey] = matched[moodKey] || [];
            matched[moodKey].push(word);
          }
          from = idx + word.length;
        }
      });
    });
  }

  function detectTheme(text, list){
    for (var i = 0; i < list.length; i++){
      if (text.indexOf(list[i]) >= 0) return list[i];
    }
    return null;
  }

  function applyTheme(theme, scores){
    ['time', 'place', 'weather', 'people'].forEach(function(type){
      var word = theme[type];
      if (!word) return;
      var weights = THEME_WEIGHTS[type] && THEME_WEIGHTS[type][word];
      if (!weights) return;
      Object.keys(weights).forEach(function(k){
        scores[k] = (scores[k] || 0) + weights[k];
      });
    });
  }

  function sortScores(scores){
    var arr = Object.keys(App.data.moods).map(function(k){
      return { key: k, name: App.data.mood(k).name, score: Math.max(0, scores[k] || 0) };
    });
    arr.sort(function(a, b){ return b.score - a.score; });
    var total = arr.reduce(function(n, s){ return n + s.score; }, 0) || 1;
    arr.forEach(function(s){ s.share = s.score / total; });
    return arr;
  }

  F.analyze = function(sentence){
    var text = String(sentence || '').trim();
    if (!text) text = '今天有点说不上来。';

    var hook = null;
    if (typeof F.hooks.analyze === 'function'){
      try{ hook = F.hooks.analyze(text); }catch(e){ hook = null; }
    }

    var scores = { low: .08, calm: .34, bright: .08, missing: .08, tired: .08, uneasy: .08 };
    var matched = {};

    Object.keys(App.data.moods).forEach(function(k){ matchMood(text, k, scores, matched); });

    var theme = {
      time: detectTheme(text, App.data.timeWords),
      place: detectTheme(text, App.data.placeWords),
      weather: detectTheme(text, App.data.weatherWords),
      people: detectTheme(text, App.data.peopleWords)
    };
    applyTheme(theme, scores);

    var exclaims = (text.match(/[！!]/g) || []).length;
    var questions = (text.match(/[？?]/g) || []).length;
    var ellipsis = (text.match(/……|\.\.\./g) || []).length;
    if (exclaims){ scores.uneasy += Math.min(.36, exclaims * .12); scores.bright += Math.min(.18, exclaims * .06); }
    if (questions){ scores.uneasy += Math.min(.3, questions * .11); }
    if (ellipsis){ scores.low += Math.min(.3, ellipsis * .1); scores.missing += Math.min(.16, ellipsis * .06); }

    var sorted = sortScores(scores);
    var primary = sorted[0].key;
    var secondary = sorted[1] && sorted[1].score > .2 ? sorted[1].key : null;

    var keywords = [];
    Object.keys(matched).forEach(function(k){ keywords = keywords.concat(matched[k]); });
    keywords = dedupe(keywords).sort(function(a, b){ return b.length - a.length; }).slice(0, 6);

    var confidence = sorted[0].score <= .4 ? .28 : Math.min(.94, .34 + sorted[0].share * .9);
    var mood = App.data.mood(primary);

    var analysis = {
      sentence: text,
      cleaned: text.replace(/\s+/g, ' '),
      primary: primary,
      secondary: secondary,
      scores: sorted,
      weights: (function(){
        var w = {};
        sorted.forEach(function(s){ if (s.score > .14) w[s.key] = s.score; });
        return w;
      })(),
      confidence: confidence,
      matched: matched,
      keywords: keywords,
      theme: theme,
      heard: mood.heard,
      moodName: mood.name,
      colors: mood,
      length: text.length
    };

    if (hook && hook.primary && App.data.mood(hook.primary)){
      analysis.primary = hook.primary;
      analysis.secondary = hook.secondary || analysis.secondary;
      analysis.scores = hook.scores || analysis.scores;
      analysis.weights = hook.weights || analysis.weights;
      analysis.moodName = App.data.mood(hook.primary).name;
      analysis.heard = hook.heard || App.data.mood(hook.primary).heard;
      analysis.confidence = hook.confidence || analysis.confidence;
      analysis.cues = hook.cues || null;
    }

    return analysis;
  };

  F.questions = function(moodKey){
    if (typeof F.hooks.questions === 'function'){
      try{
        var custom = F.hooks.questions(moodKey);
        if (custom && custom.first && custom.second) return custom;
      }catch(e){}
    }
    var q = App.data.questions[moodKey] || App.data.questions.calm;
    return {
      first: q.first,
      second: q.second
    };
  };

  F.gestureFor = function(moodKey){
    var order = App.data.gestureOrder;
    for (var i = 0; i < order.length; i++){
      var g = App.data.gesture(order[i]);
      if (g && g.mood === moodKey) return g.key;
    }
    return 'heart';
  };

  function weightedPick(items, rnd){
    var total = items.reduce(function(n, it){ return n + it.weight; }, 0);
    var r = rnd() * total;
    for (var i = 0; i < items.length; i++){
      r -= items[i].weight;
      if (r <= 0) return items[i].value;
    }
    return items[items.length - 1].value;
  }

  var TEMPLATE_TITLES = {
    diary: '今天这一页',
    letter: '没有寄出的信',
    monologue: '画面之外',
    echo: '回声落在这里'
  };

  F.title = function(analysis, answers, templateKey){
    if (typeof F.hooks.title === 'function'){
      try{
        var custom = F.hooks.title(analysis, answers, templateKey);
        if (custom) return String(custom).slice(0, 20);
      }catch(e){}
    }
    analysis = analysis || F.analyze('');
    answers = answers || {};
    var rnd = U.rng(U.hash((analysis.sentence || '') + ':' + (templateKey || '') + ':' + ((answers.first && answers.first.tag) || '') + ':' + ((answers.second && answers.second.tag) || '')));
    var mood = App.data.mood(analysis.primary) || App.data.mood('calm');
    var pool = [];
    if (answers.first && answers.first.title) pool.push({ value: answers.first.title, weight: 4 });
    (mood.titles || []).forEach(function(t){ pool.push({ value: t, weight: 1.15 }); });
    if (TEMPLATE_TITLES[templateKey]) pool.push({ value: TEMPLATE_TITLES[templateKey], weight: 1.7 });
    var title = weightedPick(pool, rnd);
    return String(title).slice(0, 18);
  };

  function ensurePeriod(line){
    line = String(line || '').trim().replace(/\s+/g, ' ');
    if (!line) return '';
    if (!/[。！？!?…]$/.test(line)) line += '。';
    return line;
  }

  function shortLine(line, max){
    line = ensurePeriod(line);
    if (line.length <= (max || 24)) return line;
    var parts = U.shortClauses(line);
    if (parts.length && parts[0].length <= (max || 24)) return ensurePeriod(parts[0]);
    return line.slice(0, max || 24).replace(/[，、。,]$/, '') + '。';
  }

  function coreClauses(sentence){
    var parts = U.shortClauses(sentence).filter(function(s){ return s.length >= 2; });
    if (!parts.length) parts = [String(sentence || '').trim()];
    return parts.map(function(p){ return shortLine(p, 26); });
  }

  F.captions = function(input){
    if (typeof F.hooks.captions === 'function'){
      try{
        var custom = F.hooks.captions(input);
        if (custom && custom.length) return custom;
      }catch(e){}
    }
    input = input || {};
    var analysis = input.analysis || F.analyze(input.sentence || '');
    var mood = App.data.mood(input.mood || analysis.primary) || App.data.mood('calm');
    var template = App.data.template(input.template) || App.data.template('diary');
    var answers = input.answers || {};
    var sceneIds = input.sceneIds || [];
    var count = input.count || 5;
    var rnd = U.rng(U.hash((analysis.sentence || '') + ':' + (input.template || '') + ':' + sceneIds.join(',')));

    var userLines = coreClauses(analysis.sentence);
    var userLine = userLines[0] || '';
    var secondUser = userLines[1] || '';

    var themeLine = '';
    ['time', 'place', 'weather', 'people'].forEach(function(type){
      if (themeLine) return;
      var word = analysis.theme && analysis.theme[type];
      if (word && THEME_LINES[type] && THEME_LINES[type][word]) themeLine = THEME_LINES[type][word];
    });

    var answerLine = answers.first && answers.first.line ? answers.first.line : '';

    var moodLines = U.shuffle(mood.lines || [], rnd).map(function(l){ return ensurePeriod(l); });
    var used = {};
    function take(arr){
      for (var i = 0; i < arr.length; i++){
        if (arr[i] && !used[arr[i]]){
          used[arr[i]] = true;
          return arr[i];
        }
      }
      return '';
    }

    var sceneLines = sceneIds.map(function(id){
      var pool = SCENE_LINES[id];
      if (!pool || !pool.length) return take(UPLOAD_LINES);
      return pool[Math.floor(rnd() * pool.length)];
    });

    var lines = [];
    if (themeLine) lines.push(take([themeLine]) || themeLine);
    if (userLine) lines.push(take([userLine]) || userLine);
    if (sceneLines[0]) lines.push(take([sceneLines[0]]));
    if (secondUser) lines.push(take([secondUser]));
    if (answerLine) lines.push(take([answerLine]));
    if (sceneLines[1]) lines.push(take([sceneLines[1]]));
    take(moodLines);
    lines = lines.filter(Boolean);

    while (lines.length < count){
      var next = take(moodLines) || take(sceneLines) || take(UPLOAD_LINES);
      if (!next) break;
      lines.push(next);
    }
    return lines.slice(0, count);
  };

  F.isLowMood = function(moodKey){
    return moodKey === 'low' || moodKey === 'tired' || moodKey === 'uneasy';
  };

  function refOf(m){
    if (!m) return null;
    if (m.kind === 'scene') return { kind: 'scene', id: m.id };
    if (m.kind === 'upload') return { kind: 'upload', id: m.id, fallback: m.fallback || 'dusk-window' };
    return null;
  }

  function materialName(ref, fallback){
    if (!ref) return fallback || '一小段光';
    if (ref.kind === 'scene'){
      var s = App.scenes && App.scenes.get(ref.id);
      return s ? s.name : (fallback || '一小段光');
    }
    var mat = App.store.getMaterial(ref.id);
    return mat && mat.name ? mat.name : (fallback || '一小段光');
  }

  function buildHealingPicks(input, usedKeys, analysis, moodKey){
    if (!F.isLowMood(moodKey)) return [];
    var pool = input.materialPool || input.materials || [];
    var candidates = [];
    var seen = {};
    pool.forEach(function(m){
      var ref = refOf(m);
      if (!ref) return;
      var key = ref.kind + ':' + ref.id;
      if (usedKeys[key] || seen[key]) return;
      var brightScore = 0;
      if (ref.kind === 'scene'){
        var sc = App.scenes && App.scenes.get(ref.id);
        if (sc) brightScore = (sc.weights.bright || 0) + (sc.weights.calm || 0) * .3;
      } else {
        brightScore = (m.mood === 'bright' ? 1.2 : 0) + (m.mood === 'calm' ? .5 : 0);
      }
      if (brightScore <= .3) return;
      seen[key] = true;
      candidates.push({ ref: ref, score: brightScore, material: m });
    });
    candidates.sort(function(a, b){ return b.score - a.score; });
    if (!candidates.length) return [];
    var rnd = U.rng(U.hash((analysis.sentence || '') + ':healing'));
    var picks = [];
    var max = Math.min(3, candidates.length);
    for (var i = 0; i < max; i++){
      var c = candidates[i];
      var titleBase = c.ref.kind === 'scene'
        ? materialName(c.ref, '一小段光')
        : materialName(c.ref, '一小段光');
      var title = HEALING_TITLES[Math.floor(rnd() * HEALING_TITLES.length)];
      var caption = HEALING_CAPTIONS[Math.floor(rnd() * HEALING_CAPTIONS.length)];
      picks.push({
        source: c.ref,
        title: title,
        caption: caption,
        fromName: titleBase
      });
    }
    /* 同一组标题不要重复 */
    var titles = {};
    picks.forEach(function(p){
      if (titles[p.title]) p.title = HEALING_TITLES[(titles[p.title] + 1) % HEALING_TITLES.length];
      titles[p.title] = (titles[p.title] || 0) + 1;
    });
    return picks;
  }

  function fillMaterials(selected, analysis, count){
    var refs = [];
    var keys = {};
    (selected || []).forEach(function(m){
      var ref = refOf(m);
      if (!ref) return;
      var k = ref.kind + ':' + ref.id;
      if (keys[k]) return;
      keys[k] = true;
      refs.push({ ref: ref, material: m });
    });
    if (refs.length < count && App.scenes){
      var usedSceneIds = refs.filter(function(r){ return r.ref.kind === 'scene'; }).map(function(r){ return r.ref.id; });
      var extra = App.scenes.suggest(analysis.weights || { calm: 1 }, count - refs.length, usedSceneIds);
      extra.forEach(function(id){
        var k = 'scene:' + id;
        if (keys[k]) return;
        keys[k] = true;
        refs.push({ ref: { kind: 'scene', id: id }, material: { kind: 'scene', id: id } });
      });
    }
    return refs.slice(0, count);
  }

  F.recipe = function(input){
    input = input || {};
    var analysis = input.analysis || F.analyze(input.sentence || '');
    var moodKey = input.mood || analysis.primary;
    var mood = App.data.mood(moodKey) || App.data.mood('calm');
    var templateKey = input.template || 'diary';
    var template = App.data.template(templateKey) || App.data.template('diary');
    var answers = input.answers || {};
    var dateKey = input.dateKey || U.todayKey();
    var seed = U.hash((analysis.sentence || '') + ':' + moodKey + ':' + templateKey + ':' + dateKey + ':' + ((answers.first && answers.first.tag) || ''));
    var rnd = U.rng(seed);

    var lengthPreset = App.data.length(input.lengthKey);
    var targetSeconds = input.durationSeconds || lengthPreset.seconds;
    var target = targetSeconds <= 24 ? 4 : targetSeconds >= 50 ? 6 : 5;
    if (input.materials && input.materials.length >= 6 && targetSeconds >= 30) target = 6;
    if (input.shotCount) target = U.clamp(input.shotCount, 3, 6);
    var filled = fillMaterials(input.materials || [], analysis, target);
    if (!filled.length){
      /* 连场景都没有的时候，至少留一段暮色 */
      filled = [{ ref: { kind: 'scene', id: 'dusk-window' }, material: { kind: 'scene', id: 'dusk-window' } }];
    }

    var sceneIds = filled.map(function(f){ return f.ref.kind === 'scene' ? f.ref.id : ''; });
    var captions = F.captions({
      analysis: analysis,
      mood: moodKey,
      template: templateKey,
      answers: answers,
      sceneIds: sceneIds,
      count: filled.length
    });

    var openLine = template.opens[Math.floor(rnd() * template.opens.length)];
    var closeLine = template.closes[Math.floor(rnd() * template.closes.length)];
    var whereLine = answers.second && answers.second.line ? answers.second.line : '';

    var introDur = targetSeconds <= 24 ? 2.8 : targetSeconds >= 50 ? 3.8 : 3.5;
    var outroDur = targetSeconds <= 24
      ? 4.2
      : targetSeconds >= 50
        ? (whereLine ? 6.2 : 5)
        : (whereLine ? 5.4 : 4.4);
    var shotTotal = Math.max(8.5, targetSeconds - introDur - outroDur);
    var weights = filled.map(function(){ return .9 + rnd() * .2; });
    var weightSum = weights.reduce(function(n, v){ return n + v; }, 0) || 1;

    var shots = filled.map(function(f, i){
      var caption = captions[i] || (App.data.mood(moodKey).lines[i % App.data.mood(moodKey).lines.length]);
      var dur = shotTotal * weights[i] / weightSum;
      dur = Math.max(2.4, Math.min(12, dur));
      return {
        ref: f.ref,
        caption: ensurePeriod(caption),
        dur: Math.round(dur * 100) / 100,
        motion: {
          from: 1.03 + rnd() * .04,
          to: 1.12 + rnd() * .07,
          panX: (rnd() - .5) * .035,
          panY: (rnd() - .5) * .028
        }
      };
    });

    var total = introDur + shots.reduce(function(n, s){ return n + s.dur; }, 0) + outroDur;

    var music = (function(){
      var raw = input.music || {};
      if (raw.mode === 'upload' && raw.data){
        return { mode: 'upload', name: '你带来的音乐', data: raw.data };
      }
      if (raw.mode === 'preset'){
        var choice = App.data.musicChoice(raw.key);
        if (choice.key !== 'auto'){
          return { mode: 'preset', key: choice.key, mood: choice.mood, name: choice.name };
        }
      }
      return { mode: 'auto', name: '随感受', mood: moodKey };
    })();
    var shape = App.data.shape(input.shapeKey);
    var quality = App.data.quality(input.qualityKey);
    var dims = App.data.dimensions(shape.key, quality.key);

    var usedKeys = {};
    filled.forEach(function(f){ usedKeys[f.ref.kind + ':' + f.ref.id] = true; });
    var healingPicks = buildHealingPicks(input, usedKeys, analysis, moodKey);

    var title = input.title || F.title(analysis, answers, templateKey);

    var recipe = {
      id: input.id || U.uid('f'),
      seed: seed,
      title: title,
      sentence: analysis.sentence,
      mood: moodKey,
      moodName: mood.name,
      secondary: analysis.secondary,
      template: templateKey,
      templateName: template.name,
      answers: {
        first: answers.first ? {
          tag: answers.first.tag, label: answers.first.label, line: answers.first.line, title: answers.first.title
        } : null,
        second: answers.second ? {
          tag: answers.second.tag, label: answers.second.label, line: answers.second.line, title: answers.second.title
        } : null
      },
      keywords: analysis.keywords,
      theme: analysis.theme,
      dateKey: dateKey,
      createdAt: input.createdAt || new Date().toISOString(),
      intro: {
        dur: introDur,
        caption: ensurePeriod(openLine),
        sub: U.fmtDate(dateKey)
      },
      shots: shots,
      outro: {
        dur: outroDur,
        lines: [whereLine, closeLine].filter(Boolean).map(ensurePeriod),
        sign: U.fmtDate(dateKey) + '，剪于一个普通的日子。'
      },
      duration: Math.round(total * 100) / 100,
      targetDuration: targetSeconds,
      lengthKey: lengthPreset.key,
      lengthName: lengthPreset.name,
      format: {
        shape: shape.key,
        shapeName: shape.name,
        quality: quality.key,
        qualityName: quality.name,
        width: dims.width,
        height: dims.height,
        bitrate: dims.bitrate
      },
      music: music,
      healingPicks: healingPicks,
      gestureKey: F.gestureFor(moodKey),
      isHealingFilm: false
    };
    return recipe;
  };

  F.healRecipe = function(items, opts){
    opts = opts || {};
    items = (items || []).filter(function(h){ return h && h.source; }).slice(0, 6);
    var dateKey = U.todayKey();
    var seed = U.hash('healing:' + dateKey + ':' + items.map(function(h){ return h.id; }).join(','));
    var rnd = U.rng(seed);
    var shots = items.map(function(h, i){
      var pool = SCENE_LINES[h.source.id] || HEALING_CAPTIONS;
      var caption = h.caption || pool[Math.floor(rnd() * pool.length)];
      return {
        ref: h.source,
        caption: ensurePeriod(caption),
        dur: 4.2 + (i % 2) * .5,
        motion: {
          from: 1.04 + rnd() * .03,
          to: 1.1 + rnd() * .05,
          panX: (rnd() - .5) * .025,
          panY: (rnd() - .5) * .02
        }
      };
    });
    if (!shots.length){
      shots.push({
        ref: { kind: 'scene', id: 'morning-fog' },
        caption: '先留一点光在这里。',
        dur: 5,
        motion: { from: 1.03, to: 1.1, panX: 0, panY: 0 }
      });
    }
    var introDur = 2.8;
    var outroDur = 3.8;
    var total = introDur + shots.reduce(function(n, s){ return n + s.dur; }, 0) + outroDur;
    return {
      id: opts.id || U.uid('h'),
      seed: seed,
      title: opts.title || '治愈备用片',
      sentence: '这些是你路过时，留下来的亮处。',
      mood: 'bright',
      moodName: '明亮',
      secondary: 'calm',
      template: 'echo',
      templateName: '回声',
      answers: { first: null, second: null },
      keywords: [],
      theme: {},
      dateKey: dateKey,
      createdAt: new Date().toISOString(),
      intro: {
        dur: introDur,
        caption: '这些是你留下的亮处。',
        sub: U.fmtDate(dateKey)
      },
      shots: shots,
      outro: {
        dur: outroDur,
        lines: ['需要的时候，再回来。'],
        sign: '治愈备用片'
      },
      duration: Math.round(total * 100) / 100,
      format: {
        shape: 'wide', shapeName: '横屏',
        quality: 'normal', qualityName: '正好',
        width: 1280, height: 720, bitrate: 6000000
      },
      music: { mode: 'auto', name: '随感受', mood: 'bright' },
      healingPicks: [],
      gestureKey: null,
      isHealingFilm: true
    };
  };

  F.voiceover = function(recipe){
    if (typeof F.hooks.voiceover === 'function'){
      try{
        var custom = F.hooks.voiceover(recipe);
        if (custom) return String(custom);
      }catch(e){}
    }
    if (!recipe) return '';
    var last = recipe.outro && recipe.outro.lines && recipe.outro.lines[0];
    return [recipe.title, last || (recipe.outro && recipe.outro.sign), '把感受剪成片。'].filter(Boolean).join('。');
  };

  F.shotAt = function(recipe, time){
    if (!recipe) return null;
    var t = 0;
    if (time < recipe.intro.dur) return { phase: 'intro', local: time, index: -1 };
    t += recipe.intro.dur;
    for (var i = 0; i < recipe.shots.length; i++){
      if (time < t + recipe.shots[i].dur) return { phase: 'shot', index: i, local: time - t, shot: recipe.shots[i] };
      t += recipe.shots[i].dur;
    }
    return { phase: 'outro', local: time - t, index: recipe.shots.length };
  };

  F.answersText = function(answers){
    if (!answers) return '';
    var bits = [];
    if (answers.first && answers.first.label) bits.push(answers.first.label);
    if (answers.second && answers.second.label) bits.push(answers.second.label);
    return bits.join('；');
  };

  F.moodColor = function(key){
    var m = App.data.mood(key);
    return m ? m.color : '#c89b5a';
  };

  /* 预留的中文接口：以后接上更强的理解能力，只要替换这几个函数 */
  var iface = {
    分析: function(句子){ return F.analyze(句子); },
    出题: function(情绪){ return F.questions(情绪); },
    写字幕: function(输入){ return F.captions(输入); },
    定标题: function(分析, 回答, 模板){ return F.title(分析, 回答, 模板); },
    念白: function(片子){ return F.voiceover(片子); }
  };

  App.接口 = iface;
  window.感受接口 = iface;
  App.Feelings = F;
})();
