/* =========================================================
   配乐：每次都不一样，但每次都合得上这一天的情绪。
   没有音源文件，全部由几组振荡器慢慢长出来。
   ========================================================= */
(function(){
  'use strict';

  var App = window.App = window.App || {};
  var M = {};

  var AC = window.AudioContext || window.webkitAudioContext;
  var audio = null;
  var playing = null;
  var element = null;
  var elementToken = 0;
  var generation = 0;
  var muted = false;
  var unlocked = false;

  function midiToHz(n){ return 440 * Math.pow(2, (n - 69) / 12); }

  function ensure(){
    if (audio || !AC) return audio;
    try{
      var ctx = new AC();
      var input = ctx.createGain();
      input.gain.value = .9;

      var dry = ctx.createGain();
      dry.gain.value = .82;

      var send = ctx.createGain();
      send.gain.value = .4;

      var convolver = ctx.createConvolver();
      convolver.buffer = impulse(ctx, 3.2, 2.6);

      var wet = ctx.createGain();
      wet.gain.value = .5;

      var comp = ctx.createDynamicsCompressor();
      comp.threshold.value = -20;
      comp.knee.value = 18;
      comp.ratio.value = 3;
      comp.attack.value = .02;
      comp.release.value = .35;

      var speaker = ctx.createGain();
      speaker.gain.value = muted ? 0 : 1;

      var capture = ctx.createGain();
      capture.gain.value = 1;

      var dest = ctx.createMediaStreamDestination ? ctx.createMediaStreamDestination() : null;

      input.connect(dry);
      dry.connect(comp);
      input.connect(send);
      send.connect(convolver);
      convolver.connect(wet);
      wet.connect(comp);
      // Shared modest makeup gain and peak control for playback and export.
      var makeup = ctx.createGain();
      makeup.gain.value = 1.15;
      var limiter = ctx.createDynamicsCompressor();
      limiter.threshold.value = -4;
      limiter.knee.value = 0;
      limiter.ratio.value = 20;
      limiter.attack.value = .001;
      limiter.release.value = .15;
      comp.connect(makeup);
      makeup.connect(limiter);
      limiter.connect(speaker);
      speaker.connect(ctx.destination);
      if (dest){
        limiter.connect(capture);
        capture.connect(dest);
      }

      audio = {
        ctx: ctx, input: input, dry: dry, send: send, convolver: convolver,
        wet: wet, comp: comp, speaker: speaker, capture: capture, dest: dest,
        noiseBuffer: null
      };
      audio.noiseBuffer = brownNoise(ctx, 4);
    }catch(e){
      audio = null;
    }
    return audio;
  }

  function impulse(ctx, seconds, decay){
    var rate = ctx.sampleRate;
    var len = Math.floor(rate * seconds);
    var buf = ctx.createBuffer(2, len, rate);
    for (var ch = 0; ch < 2; ch++){
      var data = buf.getChannelData(ch);
      for (var i = 0; i < len; i++){
        var t = i / len;
        data[i] = (Math.random() * 2 - 1) * Math.pow(1 - t, decay) * (i < rate * .01 ? .3 : 1);
      }
    }
    return buf;
  }

  function brownNoise(ctx, seconds){
    var rate = ctx.sampleRate;
    var len = Math.floor(rate * seconds);
    var buf = ctx.createBuffer(1, len, rate);
    var data = buf.getChannelData(0);
    var last = 0;
    for (var i = 0; i < len; i++){
      var white = Math.random() * 2 - 1;
      last = (last + .018 * white) / 1.018;
      data[i] = last * 2.4;
    }
    return buf;
  }

  M.unlock = function(){
    var a = ensure();
    if (!a) return Promise.resolve(false);
    unlocked = true;
    if (a.ctx.state === 'suspended'){
      return a.ctx.resume().then(function(){ return true; }).catch(function(){ return false; });
    }
    return Promise.resolve(true);
  };

  function build(moodKey){
    var a = audio;
    var mood = App.data.mood(moodKey) || App.data.mood('calm');
    var cfg = mood.music;
    var now = a.ctx.currentTime;
    var gen = ++generation;

    var master = a.ctx.createGain();
    master.gain.setValueAtTime(.0001, now);
    master.gain.exponentialRampToValueAtTime(Math.max(.02, cfg.gain), now + 2.4);
    master.connect(a.input);

    var voices = [];
    var count = Math.max(3, Math.min(4, cfg.chords[0].length));
    for (var i = 0; i < count; i++){
      var osc = a.ctx.createOscillator();
      osc.type = cfg.padType || 'sine';
      osc.detune.value = (i - (count - 1) / 2) * 4.5;
      var filter = a.ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.value = cfg.brightness;
      filter.Q.value = .2;
      var gain = a.ctx.createGain();
      gain.gain.value = .0001;
      gain.gain.exponentialRampToValueAtTime(.05, now + 3.2 + i * .3);

      /* 缓慢的呼吸 */
      var lfo = a.ctx.createOscillator();
      lfo.type = 'sine';
      lfo.frequency.value = .045 + i * .011;
      var lfoGain = a.ctx.createGain();
      lfoGain.gain.value = .014;
      lfo.connect(lfoGain);
      lfoGain.connect(gain.gain);

      var fLfo = a.ctx.createOscillator();
      fLfo.type = 'sine';
      fLfo.frequency.value = .03 + i * .008;
      var fLfoGain = a.ctx.createGain();
      fLfoGain.gain.value = 80 + i * 20;
      fLfo.connect(fLfoGain);
      fLfoGain.connect(filter.frequency);

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(master);

      osc.start(now);
      lfo.start(now);
      fLfo.start(now);

      voices.push({ osc: osc, filter: filter, gain: gain, lfo: lfo, fLfo: fLfo });
    }

    /* 低音 */
    var bass = a.ctx.createOscillator();
    bass.type = 'sine';
    bass.frequency.value = midiToHz(cfg.root - 12);
    var bassFilter = a.ctx.createBiquadFilter();
    bassFilter.type = 'lowpass';
    bassFilter.frequency.value = 240;
    var bassGain = a.ctx.createGain();
    bassGain.gain.value = .028;
    bass.connect(bassFilter);
    bassFilter.connect(bassGain);
    bassGain.connect(master);
    bass.start(now);

    /* 环境底噪 */
    var noise = null;
    if (cfg.noise > 0 && a.noiseBuffer){
      noise = a.ctx.createBufferSource();
      noise.buffer = a.noiseBuffer;
      noise.loop = true;
      var nf = a.ctx.createBiquadFilter();
      nf.type = 'lowpass';
      nf.frequency.value = moodKey === 'uneasy' ? 1400 : (moodKey === 'bright' ? 900 : 520);
      var ng = a.ctx.createGain();
      ng.gain.value = cfg.noise * 2.2;
      noise.connect(nf);
      nf.connect(ng);
      ng.connect(master);
      noise.start(now);
    }

    function setChord(index){
      var chord = cfg.chords[index % cfg.chords.length];
      voices.forEach(function(v, i){
        var off = chord[i % chord.length];
        var hz = midiToHz(cfg.root + off + 12);
        v.osc.frequency.setTargetAtTime(hz, a.ctx.currentTime, 1.4);
      });
      var bassOff = cfg.chords[index % cfg.chords.length][0] || 0;
      bass.frequency.setTargetAtTime(midiToHz(cfg.root - 12 + bassOff), a.ctx.currentTime, 1.8);
    }

    setChord(0);
    var chordDur = Math.max(4.5, 60 / cfg.tempo * 7);
    var chordIndex = 1;
    var chordTimer = setInterval(function(){
      if (gen !== generation) return;
      setChord(chordIndex++);
    }, chordDur * 1000);

    /* 零星的钟片 */
    var bellTimer = null;
    var nextBell = a.ctx.currentTime + 1.2;
    var bellStep = 0;
    function bell(){
      if (gen !== generation) return;
      var bnow = a.ctx.currentTime;
      if (bnow < nextBell) return;
      var idx = Math.floor(Math.random() * cfg.bell.length);
      var octave = Math.random() > .62 ? 24 : 12;
      var hz = midiToHz(cfg.root + cfg.bell[idx] + 24 + (octave === 24 ? 12 : 0));
      var dur = 2.6 + Math.random() * 2.4;
      var g = a.ctx.createGain();
      g.gain.setValueAtTime(.0001, bnow);
      g.gain.exponentialRampToValueAtTime(cfg.bellGain, bnow + .02);
      g.gain.exponentialRampToValueAtTime(.0001, bnow + dur);
      var o = a.ctx.createOscillator();
      o.type = 'sine';
      o.frequency.value = hz;
      var o2 = a.ctx.createOscillator();
      o2.type = 'sine';
      o2.frequency.value = hz * 2.01;
      var g2 = a.ctx.createGain();
      g2.gain.value = .28;
      var pan = a.ctx.createStereoPanner ? a.ctx.createStereoPanner() : null;
      if (pan){
        pan.pan.value = (Math.random() * 2 - 1) * .7;
        o.connect(g); o2.connect(g2); g2.connect(g); g.connect(pan); pan.connect(master);
      } else {
        o.connect(g); o2.connect(g2); g2.connect(g); g.connect(master);
      }
      o.start(bnow); o2.start(bnow);
      o.stop(bnow + dur + .1); o2.stop(bnow + dur + .1);
      bellStep++;
      var baseGap = 2.6 / Math.max(.15, cfg.bellDensity);
      nextBell = bnow + baseGap * (.55 + Math.random() * 1.1);
    }
    bellTimer = setInterval(bell, 220);
    setTimeout(bell, 700);

    var score = {
      mood: moodKey, master: master, voices: voices, bass: bass,
      noise: noise, chordTimer: chordTimer, bellTimer: bellTimer, gen: gen,
      bassGain: bassGain
    };
    return score;
  }

  function teardown(score, fade){
    if (!score) return;
    var a = audio;
    if (!a) return;
    var now = a.ctx.currentTime;
    var f = Math.max(.05, fade == null ? 1.4 : fade);
    try{
      score.master.gain.cancelScheduledValues(now);
      score.master.gain.setValueAtTime(Math.max(.0001, score.master.gain.value), now);
      score.master.gain.exponentialRampToValueAtTime(.0001, now + f);
    }catch(e){}
    clearInterval(score.chordTimer);
    clearInterval(score.bellTimer);
    setTimeout(function(){
      score.voices.forEach(function(v){
        try{ v.osc.stop(); v.lfo.stop(); v.fLfo.stop(); }catch(e){}
      });
      try{ score.bass.stop(); }catch(e){}
      if (score.noise){ try{ score.noise.stop(); }catch(e){} }
      try{ score.master.disconnect(); }catch(e){}
    }, f * 1000 + 120);
  }

  function stopElement(fade){
    elementToken++;
    var current = element;
    element = null;
    if (!current || !audio) return;
    var now = audio.ctx.currentTime;
    var f = Math.max(.05, fade == null ? .9 : fade);
    try{
      current.gain.gain.cancelScheduledValues(now);
      current.gain.gain.setValueAtTime(Math.max(.0001, current.gain.gain.value), now);
      current.gain.gain.exponentialRampToValueAtTime(.0001, now + f);
    }catch(e){}
    setTimeout(function(){
      try{ current.el.pause(); }catch(e){}
      try{ current.source.disconnect(); }catch(e){}
      try{ current.gain.disconnect(); }catch(e){}
      try{ current.el.removeAttribute('src'); current.el.load(); }catch(e){}
    }, f * 1000 + 160);
  }

  function playElement(dataUrl, opts){
    opts = opts || {};
    var a = ensure();
    if (!a) return Promise.resolve(null);
    stopElement(.35);
    if (playing){
      teardown(playing, opts.hard ? .4 : 1.2);
      playing = null;
    }
    generation++;
    var token = ++elementToken;
    return (a.ctx.state === 'suspended' ? a.ctx.resume() : Promise.resolve())
      .catch(function(){})
      .then(function(){
        if (token !== elementToken) return null;
        var el;
        try{ el = new Audio(); }catch(e){ return null; }
        el.src = dataUrl;
        el.loop = true;
        el.preload = 'auto';
        var source = null, gain = null;
        try{
          source = a.ctx.createMediaElementSource(el);
          gain = a.ctx.createGain();
          gain.gain.value = .0001;
          source.connect(gain);
          gain.connect(a.input);
        }catch(e){
          try{ source.disconnect(); gain.disconnect(); }catch(e2){}
          return null;
        }
        var record = { el: el, source: source, gain: gain, token: token };
        element = record;

        function begin(){
          if (token !== elementToken || element !== record) return;
          var now = a.ctx.currentTime;
          try{
            gain.gain.cancelScheduledValues(now);
            gain.gain.setValueAtTime(.0001, now);
            gain.gain.exponentialRampToValueAtTime(.72, now + 1);
          }catch(e){}
          var p = el.play();
          if (p && p.catch) p.catch(function(){});
        }

        return new Promise(function(resolve){
          var done = false;
          function ready(){
            if (done) return;
            done = true;
            begin();
            resolve(record);
          }
          el.addEventListener('loadedmetadata', ready, { once: true });
          el.addEventListener('canplay', ready, { once: true });
          el.addEventListener('error', function(){
            if (done) return;
            done = true;
            if (token !== elementToken || element !== record){
              resolve(null);
              return;
            }
            stopElement(.05);
            resolve({ failed: true });
          }, { once: true });
          setTimeout(ready, 1500);
        });
      });
  }

  M.playElement = function(dataUrl, opts){
    if (!dataUrl) return Promise.resolve(null);
    return playElement(dataUrl, opts);
  };

  M.stopElement = function(fade){ stopElement(fade); };

  M.isElementPlaying = function(){
    return !!(element && element.el && !element.el.paused);
  };

  M.startFor = function(music, fallbackMood, opts){
    opts = opts || {};
    var a = ensure();
    if (!a) return Promise.resolve(null);
    if (music && music.mode === 'upload' && music.data){
      return playElement(music.data, opts).then(function(result){
        if (result && result.failed){
          return M.start(fallbackMood || 'calm', opts);
        }
        return result;
      });
    }
    stopElement(.4);
    var moodKey = (music && music.mode === 'preset' && music.mood) || fallbackMood || 'calm';
    return M.start(moodKey, opts);
  };

  M.start = function(moodKey, opts){
    opts = opts || {};
    var a = ensure();
    if (!a) return Promise.resolve(null);
    stopElement(.35);
    var gen = generation + 1;
    return (a.ctx.state === 'suspended' ? a.ctx.resume() : Promise.resolve())
      .catch(function(){ return false; })
      .then(function(){
        if (a.ctx.state !== 'running' || gen !== generation + 1) return null;
        if (playing){
          teardown(playing, opts.hard ? .4 : 1.2);
          playing = null;
        }
        playing = build(moodKey);
        if (opts.on) return playing;
        return playing;
      });
  };

  M.stop = function(fade){
    if (playing){
      teardown(playing, fade);
      playing = null;
    }
    stopElement(fade);
    generation++;
  };

  M.isPlaying = function(){ return !!playing || M.isElementPlaying(); };
  M.mood = function(){ return playing ? playing.mood : null; };

  M.setMuted = function(value){
    muted = !!value;
    if (!audio) return;
    var now = audio.ctx.currentTime;
    try{
      audio.speaker.gain.cancelScheduledValues(now);
      audio.speaker.gain.setTargetAtTime(muted ? 0 : 1, now, .08);
    }catch(e){}
  };

  M.isMuted = function(){ return muted; };

  M.setVolume = function(v){
    if (!audio) return;
    try{
      audio.speaker.gain.setTargetAtTime(muted ? 0 : UClamp(v, 0, 1), audio.ctx.currentTime, .08);
    }catch(e){}
  };

  function UClamp(v, lo, hi){ return Math.max(lo, Math.min(hi, v)); }

  /* 给导出用的音轨 */
  M.stream = function(){
    var a = ensure();
    return a && a.dest ? a.dest.stream : null;
  };

  M.audioContext = function(){
    var a = ensure();
    return a ? a.ctx : null;
  };

  M.hasAudio = function(){ return !!ensure(); };

  M.fadeOutFor = function(seconds){
    if (!audio) return;
    var now = audio.ctx.currentTime;
    var f = Math.max(.2, seconds);
    if (playing){
      try{
        playing.master.gain.cancelScheduledValues(now);
        playing.master.gain.setValueAtTime(Math.max(.0001, playing.master.gain.value), now);
        playing.master.gain.exponentialRampToValueAtTime(.0001, now + f);
      }catch(e){}
    }
    if (element){
      try{
        element.gain.gain.cancelScheduledValues(now);
        element.gain.gain.setValueAtTime(Math.max(.0001, element.gain.gain.value), now);
        element.gain.gain.exponentialRampToValueAtTime(.0001, now + f);
      }catch(e){}
    }
  };

  App.music = M;
})();
