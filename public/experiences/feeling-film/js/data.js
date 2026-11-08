/* =========================================================
   这座小屋里的词、颜色、声音和手势
   ========================================================= */
(function(){
  'use strict';

  var App = window.App = window.App || {};

  var moods = {

    low: {
      key: 'low',
      name: '低落',
      color: '#6f8fa3',
      soft: '#a9c1cd',
      deep: '#3f5b68',
      line: '像退潮，水位慢慢低下去，声音也远了。',
      heard: '它听到的，是一阵安静的低落。',
      note: '不用马上好起来。先让它待一会儿。',
      titles: [
        '退潮以后', '窗没关', '今天水位很低', '把灯留在原处',
        '慢一点沉下去', '没关系的今天', '借一场雨', '安静地低一会儿'
      ],
      lines: [
        '有些低落，是没有声音的。',
        '我把灯调暗了一点，世界就没那么刺眼。',
        '今天的水位很低，礁石都露了出来。',
        '没关系，潮水明天还会回来。',
        '不想说话的时候，就看一会儿窗外。',
        '原来人也可以这样，安静地低下去。',
        '风从窗缝里进来，替我把房间看了一遍。',
        '我没有在等谁，只是坐了一会儿。',
        '有些情绪不需要被解决，只需要被看见。',
        '今天先这样，也算一种完整。',
        '把心口那块石头，先放在这里。',
        '夜很长，但灯是我自己开的。'
      ],
      grade: { tint: '#436170', alpha: .24, light: '#a9c1c9' },
      music: {
        tempo: 48, root: 45, padType: 'sine', brightness: 760, gain: .9,
        chords: [[0, 3, 7, 12], [-4, 0, 3, 7], [-2, 3, 5, 10], [0, 3, 7, 10]],
        bell: [0, 3, 5, 7, 10], bellGain: .055, bellDensity: .5, noise: .012, bass: true
      }
    },

    calm: {
      key: 'calm',
      name: '平静',
      color: '#8fa392',
      soft: '#c3d0c2',
      deep: '#566b5d',
      line: '像雨停之后，世界刚被擦干净。',
      heard: '它听到的，是一片平缓的安静。',
      note: '平静不是空的，里面有很多东西。',
      titles: [
        '雨停之后', '下午三点', '世界刚好安静', '海面没有消息',
        '把日子放平', '一小段空白', '风停在这里', '不急着去哪里'
      ],
      lines: [
        '雨停之后，世界像刚洗过一遍。',
        '三点钟的光，在桌角停了很久。',
        '没有消息的海面，也是一种答案。',
        '今天什么都没发生，挺好。',
        '呼吸慢下来，时间也跟着慢了。',
        '我把手头的事放下，房间忽然变宽。',
        '风不急着去什么地方。',
        '安静不是空的，里面有很多东西。',
        '坐在窗边，看云慢慢换形状。',
        '不赶路的下午，才像自己的。',
        '一切都刚刚好，不需要更多。',
        '这一刻很轻，我把它留下。'
      ],
      grade: { tint: '#5d7a68', alpha: .18, light: '#d5dfcd' },
      music: {
        tempo: 56, root: 50, padType: 'triangle', brightness: 1200, gain: .82,
        chords: [[0, 5, 7, 12], [-3, 2, 5, 10], [-5, 0, 4, 9], [0, 5, 9, 12]],
        bell: [0, 2, 5, 7, 9], bellGain: .05, bellDensity: .42, noise: .01, bass: true
      }
    },

    bright: {
      key: 'bright',
      name: '开心',
      color: '#d2a45e',
      soft: '#ecc98f',
      deep: '#94703c',
      line: '像一小片光，刚好落在肩上。',
      heard: '它听到的，是一小段亮起来的好天气。',
      note: '趁还记得，把它收好。以后会用得上。',
      titles: [
        '很小的一件好事', '天色刚好', '今天有光落下来', '风替你笑了一下',
        '值得记一笔', '把今天晒一晒', '好天气收据', '这一小段归我'
      ],
      lines: [
        '今天有一小片光，刚好落在我身上。',
        '路边的猫看了我一眼，像在说：不错。',
        '原来好事可以这么小。',
        '风替我把今天翻到了好看的那一页。',
        '我笑了一下，没有原因。',
        '天色很好，值得记一笔。',
        '有些开心，要趁还记得的时候存起来。',
        '今天的云，像一封没写完的信。',
        '我在路上多走了一会儿，因为不想太快回家。',
        '好天气是有声音的，你听。',
        '把今天晒一晒，留着以后用。',
        '这一小段，归我。'
      ],
      grade: { tint: '#b98743', alpha: .2, light: '#f0d8a9' },
      music: {
        tempo: 72, root: 52, padType: 'triangle', brightness: 1900, gain: .85,
        chords: [[0, 4, 7, 11], [-3, 2, 5, 9], [-5, 0, 4, 7], [2, 5, 9, 12]],
        bell: [0, 2, 4, 7, 9], bellGain: .06, bellDensity: .68, noise: .008, bass: true
      }
    },

    missing: {
      key: 'missing',
      name: '想念',
      color: '#b07f63',
      soft: '#d6b39a',
      deep: '#7a533e',
      line: '像一个没有地址的名字，偶尔亮一下。',
      heard: '它听到的，是一段还没有寄出的想念。',
      note: '想念不用解决，放着就好。',
      titles: [
        '没删的照片', '那条街还在', '一个名字的冬天', '想你的第十种方式',
        '旧味道', '你在的那一段', '没有寄出的信', '时间没有带走你'
      ],
      lines: [
        '有些名字，已经很久没有亮起来了。',
        '那条街还在，只是少了一个人。',
        '我没删照片，也没再点开。',
        '想念是没有地址的信。',
        '风从你那边来，我就多站了一会儿。',
        '旧味道最不讲道理，一闻就回去。',
        '我没有在等你，我只是刚好想起。',
        '你留下的那句话，今天又响了一次。',
        '我们走过的那段路，路灯还亮着。',
        '时间带走了很多，但没有带走你。',
        '如果再见，我大概只会说一句：最近好吗。',
        '想念不用解决，放着就好。'
      ],
      grade: { tint: '#8b5f46', alpha: .22, light: '#ddb596' },
      music: {
        tempo: 52, root: 47, padType: 'sine', brightness: 880, gain: .86,
        chords: [[0, 4, 7, 12], [-2, 3, 7, 10], [-4, 0, 5, 9], [0, 4, 9, 12]],
        bell: [0, 3, 5, 7, 10], bellGain: .052, bellDensity: .46, noise: .013, bass: true
      }
    },

    tired: {
      key: 'tired',
      name: '疲惫',
      color: '#8c8378',
      soft: '#bdb2a4',
      deep: '#5d564d',
      line: '像电量见底，连叹气都要攒一会儿力气。',
      heard: '它听到的，是一身还没有放下的疲惫。',
      note: '今天到这里也可以。世界可以等你。',
      titles: [
        '今天太长了', '先坐到这儿', '电量见底', '允许自己停一下',
        '把疲惫放桌上', '什么都不解释', '一片安静的灰', '早点关灯'
      ],
      lines: [
        '今天太长了，我先坐到这儿。',
        '身体躺下了，脑子还在加班。',
        '不想解释，也不是谁的错。',
        '电量见底的时候，允许自己停一下。',
        '睡了很久，醒来还是有点空。',
        '我把疲惫放在桌上，先不管它。',
        '成年人的累，常常没有声音。',
        '今晚不做什么大事，早点关灯。',
        '不是不努力，只是真的有点累。',
        '先喝口水，再想下一步。',
        '世界可以等我一会儿。',
        '今天到这里，也够了。'
      ],
      grade: { tint: '#615d52', alpha: .25, light: '#cbc2b2' },
      music: {
        tempo: 46, root: 43, padType: 'sine', brightness: 640, gain: .88,
        chords: [[0, 3, 7, 10], [-5, 0, 3, 7], [-2, 5, 7, 10], [0, 3, 10, 12]],
        bell: [0, 3, 5, 7, 10], bellGain: .042, bellDensity: .3, noise: .016, bass: true
      }
    },

    uneasy: {
      key: 'uneasy',
      name: '不安',
      color: '#a86f63',
      soft: '#d4a79c',
      deep: '#744a42',
      line: '像一根没落地的线，心跟着一起悬着。',
      heard: '它听到的，是一点还没有落地的悬。',
      note: '先呼吸三下。不用马上知道答案。',
      titles: [
        '悬着的下午', '在等一个结果', '陌生的路口', '先呼吸三下',
        '没做完也没关系', '心里那点响', '数到三', '把石头放下'
      ],
      lines: [
        '有件事没做完，可我想不起来是什么。',
        '结果还没来，心先悬在半空。',
        '站在路口，每个方向都像不对。',
        '先呼吸三下，再决定往哪儿走。',
        '不安是没有形状的，但它在。',
        '心里有一点响，像没关紧的门。',
        '我数到三，世界没有塌。',
        '悬着的时候，就先站着。',
        '不知道答案，也可以先往前走一步。',
        '石头搬不动，就先在旁边坐一会儿。',
        '今天不确定的事，留给明天确定。',
        '没关系，慢一点也算在走。'
      ],
      grade: { tint: '#754d45', alpha: .22, light: '#d4a79c' },
      music: {
        tempo: 58, root: 46, padType: 'sine', brightness: 1020, gain: .82,
        chords: [[0, 1, 7, 12], [-1, 2, 7, 10], [-2, 3, 8, 11], [0, 1, 5, 10]],
        bell: [0, 1, 5, 7, 11], bellGain: .05, bellDensity: .58, noise: .018, bass: true
      }
    }
  };

  var templates = {
    diary: {
      key: 'diary',
      name: '日记',
      sub: '像睡前写下的几行，短，诚实。',
      opens: [
        '今天大概是这样。',
        '睡前，记一笔。',
        '这一天，先放在这里。',
        '没什么大事，只是想说一句。'
      ],
      closes: [
        '就写到这儿。晚安。',
        '明天再慢慢来。',
        '这一页，翻过去了。',
        '收好今天。'
      ]
    },
    letter: {
      key: 'letter',
      name: '寄给你',
      sub: '把话写给一个具体的人，不必寄出。',
      opens: [
        '这封信，写给一个也许不会看到的人。',
        '如果你在，我想这样说。',
        '有些话，当面讲不出来。',
        '不用回信，看到就好。'
      ],
      closes: [
        '不用回信。你好好的就行。',
        '就到这儿吧。',
        '如果你看到了，就当我们见过。',
        '这封信，不寄也可以。'
      ]
    },
    monologue: {
      key: 'monologue',
      name: '独白',
      sub: '像镜头外的旁白，慢一点，也深一点。',
      opens: [
        '我把这段话，留在了画面外面。',
        '镜头没有拍到的，是这些。',
        '说给自己听，也算数。',
        '这一刻，只有我和这片光。'
      ],
      closes: [
        '说完了，就轻一点。',
        '剩下的，交给画面。',
        '我先到这里。',
        '这句是真的。'
      ]
    },
    echo: {
      key: 'echo',
      name: '回声',
      sub: '用重复的短句，把一句话绕回来。',
      opens: [
        '那天。风。还有一句话。',
        '一遍，再一遍。',
        '有些话会绕回来。',
        '轻声说，也算说过。'
      ],
      closes: [
        '一遍，再一遍。',
        '说完了。',
        '声音会留下。',
        '就到这里。'
      ]
    }
  };

  var commonSecond = {
    key: 'where',
    text: '这条片子，你想让它去哪里？',
    options: [
      { tag: 'self', label: '只留给自己看', hint: '不需要观众', line: '这一段，先只放给自己看。', title: '只给自己看' },
      { tag: 'send', label: '寄给一个很久没联系的人', hint: '不一定要有回音', line: '如果你也刚好想起我，就当这阵风是我。', title: '没有寄出的信' },
      { tag: 'back', label: '就当把那一天放回去', hint: '让它在原处待着', line: '那天就留在那天吧。', title: '留在那天' },
      { tag: 'later', label: '交给以后，等哪天再点开', hint: '先存着，不急着懂', line: '先收好，等哪天需要再打开。', title: '交给以后' }
    ]
  };

  var questions = {
    low: {
      first: {
        key: 'shape',
        text: '这股低落，更像哪一种？',
        options: [
          { tag: 'tide', label: '像退潮，慢慢退下去', hint: '不吵，只是水位低了', line: '潮水退下去的时候，礁石才露出来。', title: '退潮以后' },
          { tag: 'window', label: '像一扇没关的窗', hint: '风一直进得来', line: '窗没有关，风替我把房间翻了一遍。', title: '窗没关' },
          { tag: 'stone', label: '像压在心口的石头', hint: '不重，但一直在', line: '有块小石头，一直搁在心口。', title: '心口那块石头' },
          { tag: 'nameless', label: '说不清，就是提不起劲', hint: '没有具体的原因', line: '也说不上为什么，就是不太想动。', title: '提不起劲的一天' }
        ]
      }
    },
    calm: {
      first: {
        key: 'shape',
        text: '这份平静，更像哪一种？',
        options: [
          { tag: 'afterrain', label: '雨停之后的地面', hint: '干净，也有一点凉', line: '雨停了，路面把天光又还给我一次。', title: '雨停之后' },
          { tag: 'three', label: '下午三点的房间', hint: '光停在桌角', line: '三点钟，光在桌角停了很久。', title: '下午三点' },
          { tag: 'seafree', label: '什么都没发生的海面', hint: '平，且宽', line: '海面什么都没有，也什么都有。', title: '海面没有消息' },
          { tag: 'released', label: '刚放下某件事的那一下', hint: '肩膀忽然轻了', line: '放下之后，连呼吸都变宽了一点。', title: '放下以后' }
        ]
      }
    },
    bright: {
      first: {
        key: 'shape',
        text: '这份开心，是从哪儿冒出来的？',
        options: [
          { tag: 'smallthing', label: '一件很小的事', hint: '路边的猫、刚好赶上的车', line: '今天有件很小的事，让我笑了很久。', title: '很小的一件好事' },
          { tag: 'someone', label: '一个人在身边', hint: '不用做什么，在就好', line: '有人坐在旁边，天就没那么冷。', title: '你在旁边' },
          { tag: 'sky', label: '天色刚刚好', hint: '抬头就看见', line: '今天的颜色，刚刚好。', title: '天色刚好' },
          { tag: 'smile', label: '说不上来，就是想笑', hint: '没有理由也算数', line: '没有什么理由，就是忽然想笑。', title: '今天有光落下来' }
        ]
      }
    },
    missing: {
      first: {
        key: 'shape',
        text: '这份想念，现在是什么形状？',
        options: [
          { tag: 'name', label: '一个不会再响的名字', hint: '号码还留着', line: '那个名字，已经很久没有亮起来过了。', title: '没有寄出的信' },
          { tag: 'road', label: '一条走过很多遍的路', hint: '拐角还认得', line: '这条路我走了很多遍，拐角还认得我。', title: '那条街还在' },
          { tag: 'photo', label: '一张没舍得删的照片', hint: '看了又退出', line: '照片没删，我偶尔点开，又很快退出。', title: '没删的照片' },
          { tag: 'smell', label: '一种味道，或者一句口头禅', hint: '一闻就回去了', line: '闻到那个味道，我就回去了。', title: '旧味道' }
        ]
      }
    },
    tired: {
      first: {
        key: 'shape',
        text: '这份疲惫，更像哪一种？',
        options: [
          { tag: 'bodymind', label: '身体累，脑子还停不下来', hint: '躺下了，还在转', line: '身体已经躺下了，脑子还在加班。', title: '脑子还在转' },
          { tag: 'hearttired', label: '心累，什么都不想解释', hint: '连委屈都懒得说', line: '不想解释，也不是谁的错。', title: '什么都不解释' },
          { tag: 'nosleep', label: '睡了很久还是没缓过来', hint: '像充不满的电', line: '睡了很久，醒来还是空的。', title: '充不满的电' },
          { tag: 'longday', label: '只是今天太长了', hint: '没有别的原因', line: '今天只是太长了，长到我有点接不住。', title: '今天太长了' }
        ]
      }
    },
    uneasy: {
      first: {
        key: 'shape',
        text: '这份不安，更像哪一种？',
        options: [
          { tag: 'undone', label: '像有什么事没做完', hint: '心里一直挂着', line: '总觉得有件事没做完，可又想不起来。', title: '没做完也没关系' },
          { tag: 'waiting', label: '像在等一个还不知道的结果', hint: '悬着，落不下来', line: '结果还没来，心先悬在半空。', title: '在等一个结果' },
          { tag: 'crossroad', label: '像站在陌生的路口', hint: '每个方向都不确定', line: '站在路口，每个方向都像不对。', title: '陌生的路口' },
          { tag: 'floating', label: '没有具体原因，就是悬着', hint: '像一根没落地的线', line: '没有原因，就是一直悬着。', title: '心里那点响' }
        ]
      }
    }
  };

  Object.keys(questions).forEach(function(k){
    questions[k].second = commonSecond;
  });

  var gestures = {
    heart: {
      key: 'heart', name: '按心', mood: 'low', order: 1,
      meaning: '把手掌轻轻按在胸口。听见自己，也算一种回答。',
      steps: [
        '右手掌心朝内，轻轻贴在心口。',
        '停三次呼吸，不用说话。',
        '手掌慢慢放下，像把一件事放稳。'
      ],
      origin: '动作取自手语里「感受」的起势。'
    },
    wind: {
      key: 'wind', name: '穿风', mood: 'calm', order: 2,
      meaning: '手掌横着从身前穿过。让风过去，也让自己过去。',
      steps: [
        '五指并拢，掌心朝下，放在胸前。',
        '从左到右，慢慢划过身前。',
        '手停在右侧，掌心翻转向上。'
      ],
      origin: '动作来自「过去」与「放开」两个手语词的交叠。'
    },
    light: {
      key: 'light', name: '递光', mood: 'bright', order: 3,
      meaning: '掌心向上，轻轻递出去。这份好，我想分你一点。',
      steps: [
        '右手掌心向上，放在腰前。',
        '手指微微张开，像托着一小片光。',
        '向前递出一点，再收回心口。'
      ],
      origin: '动作取自手语里「给」的温柔版本。'
    },
    name: {
      key: 'name', name: '握名', mood: 'missing', order: 4,
      meaning: '手指收紧，像握住一个名字。我没有忘。',
      steps: [
        '五指自然弯曲，握成松拳。',
        '把拳心贴在下巴或胸口。',
        '停一会儿，再慢慢松开。'
      ],
      origin: '动作取自手语里「记得」与「人」的相连。'
    },
    hang: {
      key: 'hang', name: '垂手', mood: 'tired', order: 5,
      meaning: '手腕放松，手自然落下。今天到此为止，也可以。',
      steps: [
        '手臂自然垂下，不用力。',
        '手指一节一节放松。',
        '轻轻晃一下手腕，像把疲惫抖掉。'
      ],
      origin: '动作来自许多人在说「算了」时，手的自然下落。'
    },
    three: {
      key: 'three', name: '数三', mood: 'uneasy', order: 6,
      meaning: '拇指依次按下三根手指。先数到三，再决定。',
      steps: [
        '右手摊开，掌心朝上。',
        '拇指从食指开始，依次按下三根手指。',
        '数到三，把手放平，呼吸一次。'
      ],
      origin: '动作取自手语里「等待」与「数数」的叠加。'
    }
  };

  var gestureOrder = ['heart', 'wind', 'light', 'name', 'hang', 'three'];

  var lexicon = {
    low: {
      strong: [
        '很难过', '难过', '伤心', '失落', '沮丧', '委屈', '心碎', '崩溃',
        '想哭', '哭了', '眼泪', '低落', '孤独', '空落落', '失落感', '绝望',
        '开心不起来', '高兴不起来', '不想说话', '提不起劲', '没意思'
      ],
      mild: ['灰', '沉', '丧', '闷', '空', '没劲', '不想动', '安静得']
    },
    calm: {
      strong: [
        '平静', '安静', '安稳', '踏实', '放松', '松弛', '舒服', '心安',
        '从容', '风平浪静', '没什么事', '什么都没发生', '挺好的', '刚刚好',
        '慢慢来', '不着急', '放下'
      ],
      mild: ['慢', '轻', '缓', '平常', '普通', '淡']
    },
    bright: {
      strong: [
        '开心', '高兴', '快乐', '幸福', '满足', '惊喜', '兴奋', '太好了',
        '好开心', '好高兴', '笑出声', '笑了', '值得', '幸运', '顺利',
        '好消息', '被夸', '喜欢', '治愈', '轻松', '自在', '亮'
      ],
      mild: ['暖', '甜', '美', '妙', '舒服', '不错', '真好']
    },
    missing: {
      strong: [
        '想念', '想你', '想他', '想她', '怀念', '回忆', '想起', '以前',
        '过去', '曾经', '好久不见', '舍不得', '遗憾', '错过', '旧照片',
        '你的名字', '你走以后', '不在身边', '离开以后'
      ],
      mild: ['旧', '照片', '名字', '从前', '那年', '当时', '那时候']
    },
    tired: {
      strong: [
        '很累', '好累', '太累', '心累', '疲惫', '疲倦', '精疲力尽', '累坏',
        '撑不住', '没力气', '不想动', '加班', '熬夜', '通宵', '困死',
        '想睡觉', '睡了很久', '什么都不想', '不想解释'
      ],
      mild: ['累', '困', '忙', '倦', '睡了', '躺', '歇', '乏']
    },
    uneasy: {
      strong: [
        '焦虑', '不安', '紧张', '担心', '害怕', '慌张', '心慌', '压力',
        '睡不着', '失眠', '忐忑', '没底', '心里没底', '手足无措', '烦死',
        '烦躁', '发怵', '悬着', '等结果', '不确定'
      ],
      mild: ['乱', '烦', '悬', '慌', '急', '怕', '愁']
    }
  };

  var timeWords = ['清晨', '早上', '中午', '下午', '傍晚', '黄昏', '夜里', '深夜', '凌晨'];
  var placeWords = ['地铁', '车站', '站台', '海边', '房间', '窗边', '路上', '街角', '天台', '桌上', '店里', '机场', '书店', '医院', '楼下'];
  var weatherWords = ['下雨', '雨停', '起风', '阴天', '晴天', '起雾', '下雪', '云很厚', '天很蓝', '天色'];
  var peopleWords = ['一个人', '我们', '他们', '他', '她', '你', '朋友', '妈妈', '爸爸', '同事'];

  var credits = [
    { name: '霍俊文', note: '自动剪、灵感选择题' },
    { name: '陈佳', note: '风景拍不出、感受说不出' },
    { name: '王玥帆', note: '故事模板、手语' },
    { name: '卢露萌', note: '体会情绪、封存感受' },
    { name: '钱韵秋', note: '归档、情绪日历' },
    { name: '姜霁', note: '角色、社恐表达' },
    { name: '穆耶赛尔', note: '留存当时的感受' }
  ];

  var copy = {
    slogan: '丢的是碎片，它还给你的故事。',
    sloganLong: '不用苦练剪辑，说出你的感受，它帮你把琐碎瞬间，剪成属于你的短片。',
    fine: '所有碎片与片子，只留在这台电脑里。没有上传，没有别人。',
    footerLine: '把说不出的，剪成看得见的。',
    healingIntro: '你低落时用过的素材，它没有丢。那些当时没用上的、还亮着的，被它悄悄收在这里。',
    healingHow: '每次你剪一段低落的片子，它都会在素材里转一圈，把还亮着的几帧挑出来，收进这里。不提醒，不打断，也不催你开心。',
    healingWhen: '等你哪天需要一点亮光，再回来。它不保证有用，但至少那是你自己留下的。',
    healingEmpty: '这里还空着。等你剪过一段低落的片子，它也许会放点什么进来。',
    healingPlay: '把备用片放成一段',
    gestureIntro: '每剪完一段片子，它会教你一式表达情绪的手势。手势由一位听障创作者参与设定——有些感受，手上也能说。',
    gestureLocked: '剪完一段，才能翻开。',
    gestureAll: '六式都学会了。以后不用它教，你也能自己说出来。',
    aboutWho: '想开始做自媒体，又不懂剪辑和吸流的人；心里有很多感受，却不知道怎么表达的人；还有一些时候，只是想让一段日子有个形状的人。',
    aboutProblem: '不是缺素材，也不是缺情绪。缺的是一个表达结构——把「说不出口的感受」变成一条能发布的片子。',
    aboutAbility: '你说一句「我今天大概是这样」，它用几道选择题确认你的感受，再从素材里挑片段、配声音、写字幕、定节奏。它不给你一个模板让你自己填，而是替你完成了这一次表达。',
    aboutSide: '每次你输入低落的感受，它会悄悄从素材里挑出开心的片段，攒成「治愈备用片」。你当时用不上，但以后可能需要。另一个副作用：每完成一段短片，它会自动教你一式表达情绪的手势。',
    aboutDeaf: '手势设定由一位听障创作者参与完成。手语里有很多镜头拍不到的表达，它们被改写成了六式，收在手势册里。',
    aboutFine: '所有内容只存在这台电脑的浏览器里。清理浏览器数据，片子和备用片也会一起消失。'
  };

  /* 片子的样子：多长、什么画幅、多清楚，还有配乐从哪来 */
  var shapes = {
    wide: { key: 'wide', name: '横屏', note: '横着看，像一块幕布', w: 16, h: 9 },
    tall: { key: 'tall', name: '竖屏', note: '竖着拿，适合手机', w: 9, h: 16 },
    square: { key: 'square', name: '方形', note: '端端正正的一格', w: 1, h: 1 }
  };

  var lengths = {
    short: { key: 'short', name: '短一点', note: '约二十秒', seconds: 20 },
    normal: { key: 'normal', name: '正好', note: '约三十五秒', seconds: 35 },
    long: { key: 'long', name: '长一点', note: '约一分钟', seconds: 60 }
  };

  var qualities = {
    soft: { key: 'soft', name: '轻一点', note: '占的地方小，发得快', short: 540, bitrate: 4200000 },
    normal: { key: 'normal', name: '正好', note: '看得清，也不太大', short: 720, bitrate: 6000000 },
    fine: { key: 'fine', name: '细一点', note: '留着慢慢看', short: 1080, bitrate: 10000000 }
  };

  var musicChoices = [
    { key: 'auto', name: '随感受', note: '按这一句来配', mood: '' },
    { key: 'calm', name: '安静', note: '像雨停以后', mood: 'calm' },
    { key: 'bright', name: '暖', note: '像下午的光', mood: 'bright' },
    { key: 'missing', name: '远', note: '像想念一个人', mood: 'missing' },
    { key: 'low', name: '夜', note: '像很晚的房间', mood: 'low' }
  ];

  App.data = {
    moods: moods,
    moodOrder: ['low', 'calm', 'bright', 'missing', 'tired', 'uneasy'],
    templates: templates,
    templateOrder: ['diary', 'letter', 'monologue', 'echo'],
    shapes: shapes,
    shapeOrder: ['wide', 'tall', 'square'],
    lengths: lengths,
    lengthOrder: ['short', 'normal', 'long'],
    qualities: qualities,
    qualityOrder: ['soft', 'normal', 'fine'],
    musicChoices: musicChoices,
    questions: questions,
    commonSecond: commonSecond,
    gestures: gestures,
    gestureOrder: gestureOrder,
    lexicon: lexicon,
    timeWords: timeWords,
    placeWords: placeWords,
    weatherWords: weatherWords,
    peopleWords: peopleWords,
    credits: credits,
    copy: copy,
    mood: function(key){ return moods[key] || moods.calm; },
    template: function(key){ return templates[key] || templates.diary; },
    shape: function(key){ return shapes[key] || shapes.wide; },
    length: function(key){ return lengths[key] || lengths.normal; },
    quality: function(key){ return qualities[key] || qualities.normal; },
    musicChoice: function(key){
      for (var i = 0; i < musicChoices.length; i++){
        if (musicChoices[i].key === key) return musicChoices[i];
      }
      return musicChoices[0];
    },
    dimensions: function(shapeKey, qualityKey){
      var shape = shapes[shapeKey] || shapes.wide;
      var quality = qualities[qualityKey] || qualities.normal;
      var short = quality.short, width, height;
      if (shape.key === 'tall'){
        width = short;
        height = Math.round(short * 16 / 9);
      } else if (shape.key === 'square'){
        width = short;
        height = short;
      } else {
        width = Math.round(short * 16 / 9);
        height = short;
      }
      return { width: width, height: height, bitrate: quality.bitrate };
    },
    gesture: function(key){ return gestures[key] || null; },
    moodName: function(key){ return (moods[key] || moods.calm).name; }
  };
})();
