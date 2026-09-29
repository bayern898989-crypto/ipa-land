/* 音标乐园 · 两面派分拣工厂 · 关卡数据与词表构建
   PRD 第 5 节的分拣厂清单：ea / oo / ow / ui / th / ear三桶 / y三桶。

   ★ 词表不在这里硬编码 ★
   每个厂只声明「哪几课 + 哪个字母组合」，真正的词从内容库 JSON 的 levels[] 里现取：
   例如 oo 厂 = /uː/ 课里含 oo 的词（moon/food/school…）对上 /ʊ/ 课里含 oo 的词（book/look/good…）。
   用户改 JSON 词库，分拣厂的传送带跟着变，不用动代码。

   exclude 里放的是「两副面孔都读得通」的词（read /riːd/ 又 /red/、tear 眼泪又撕），
   这种词上了传送带就是坑孩子，一律不用。
*/
(function (global) {
  const SETS = [
    {
      id: 'ea',
      combo: 'ea',
      emoji: '🏭',
      title: '两面派分拣工厂 · ea',
      short: 'ea 两副面孔',
      desc: 'ea 有两副面孔：meat 读 /iː/，bread 读 /e/。传送带上先凭记忆分拣，选完才播音，错了当场重考。',
      exclude: ['read'],
      faces: [
        { sym: 'iː', color: 'teal', tag: '面孔一 · 默认读法', hint: '微笑拉长「衣——」' },
        { sym: 'e', color: 'coral', tag: '面孔二 · 少数派', hint: '抿嘴短「哎」' }
      ],
      rule:
        'ea <b>默认读 /iː/</b>（大多数都是），读 /e/ 的只是一小撮<b>「少数派」</b>——' +
        '把少数派名单背下来，剩下的全部闭眼读 /iː/！',
      easterEgg: '🥚 彩蛋：ea 其实还有第三副面孔 /eɪ/，但只有 great、break、steak 三个词，背下就行。',
      rewardFaces: [1],
      needs: ['e', 'iː']
    },
    {
      id: 'oo',
      combo: 'oo',
      emoji: '🏭',
      title: '两面派分拣工厂 · oo',
      short: 'oo 两副面孔',
      desc: 'oo 有两副面孔：moon 读长音 /uː/，book 读短音 /ʊ/。先凭记忆分拣，选完才播音。',
      exclude: [],
      faces: [
        { sym: 'uː', color: 'teal', tag: '面孔一 · 默认读法', hint: '嘟嘴拉长「呜——」' },
        { sym: 'ʊ', color: 'coral', tag: '面孔二 · 少数派', hint: '短促一点「乌」' }
      ],
      rule:
        'oo <b>默认读长音 /uː/</b>。读短音 /ʊ/ 的有个好用的线索：' +
        '<b>k 前面的 oo 基本都短</b>（book / look / cook / took / shook），' +
        '再加一小撮<b>少数派名单</b>（good / foot / wood / wool / stood）。',
      rewardFaces: [1],
      needs: ['uː', 'ʊ']
    },
    {
      id: 'ow',
      combo: 'ow',
      emoji: '🏭',
      title: '两面派分拣工厂 · ow',
      short: 'ow 两副面孔',
      desc: 'ow 有两副面孔：show 读「欧」/əʊ/，cow 读「嗷」/aʊ/。看位置猜读音，选完才播音。',
      exclude: [],
      faces: [
        { sym: 'əʊ', color: 'teal', tag: '面孔一 · 欧', hint: '嘴巴收圆「欧」' },
        { sym: 'aʊ', color: 'coral', tag: '面孔二 · 嗷', hint: '张大嘴巴「嗷」' }
      ],
      rule:
        'ow 两边人数差不多，<b>看位置</b>：ow 站在<b>词尾</b>多读「欧」（show / know / snow / slow / yellow / window）；' +
        'ow <b>后面还跟着字母</b>时多读「嗷」（down / town / brown / flower / crowd）。' +
        '这条不是铁律，遇到反例就当少数派背下来。',
      rewardFaces: [0, 1],
      needs: ['əʊ', 'aʊ']
    },
    {
      id: 'ui',
      combo: 'ui',
      emoji: '🏭',
      title: '两面派分拣工厂 · ui',
      short: 'ui 两副面孔',
      desc: 'ui 有两副面孔：build 读 /ɪ/，fruit 读 /uː/。词不多，直接背两张小名单。',
      exclude: [],
      faces: [
        { sym: 'ɪ', color: 'teal', tag: '面孔一 · 短音', hint: '短促「衣」' },
        { sym: 'uː', color: 'coral', tag: '面孔二 · 长音', hint: '嘟嘴拉长「呜——」' }
      ],
      rule:
        'ui 是个小众组合，<b>两边人数差不多，没有默认读法</b>——两张名单都很短，直接背下来最快。' +
        '⚠️ guitar 是个特殊户：它的 u 是<b>保镖 u</b>（跟 guess 一样不发音），真正发音的只有 i，所以读 /ɪ/。',
      rewardFaces: [0, 1],
      needs: ['ɪ', 'uː']
    },
    {
      id: 'th',
      combo: 'th',
      emoji: '🗣️',
      title: '清浊分拣工厂 · th',
      short: 'th 清浊双胞胎',
      desc: 'th 一种写法两个音：think 清 /θ/，this 浊 /ð/。手摸喉咙，震的是浊音。',
      exclude: [],
      faces: [
        { sym: 'θ', color: 'sky', tag: '清音 · 喉咙不震', hint: '咬舌吹气，像漏气' },
        { sym: 'ð', color: 'coral', tag: '浊音 · 喉咙震', hint: '咬舌出声，喉咙嗡嗡' }
      ],
      rule:
        'th 分不清就<b>手摸喉咙</b>：震了是浊 /ð/，不震是清 /θ/。规律很好用——' +
        '<b>功能小词</b>（the / this / that / they / there / then / than / with）和<b>家人词</b>' +
        '（mother / father / brother）的 th 基本全浊，剩下的基本全清。',
      rewardFaces: [1],
      needs: ['θ', 'ð']
    },
    {
      id: 'ear',
      combo: 'ear',
      emoji: '🎪',
      title: '三副面孔分拣厂 · ear',
      short: 'ear 三副面孔',
      desc: 'ear 有三副面孔：near /ɪə/、learn /ɜː/、bear /eə/。三个桶，看位置就能分。',
      exclude: ['tear'],
      faces: [
        { sym: 'ɪə', color: 'teal', tag: '面孔一 · 默认读法', hint: '衣呃 · near' },
        { sym: 'ɜː', color: 'coral', tag: '面孔二 · 后面跟辅音', hint: '厄—— · learn' },
        { sym: 'eə', color: 'sun', tag: '面孔三 · 三只小兽', hint: '哎呃 · bear' }
      ],
      rule:
        'ear 三副面孔有条<b>超好用的位置规律</b>：ear 在<b>词尾</b>读 /ɪə/（ear / near / hear / year / dear）；' +
        'ear <b>后面还跟着辅音字母</b>读 /ɜː/（learn / earth / early / heard / search）；' +
        '<b>例外只有三只</b>：bear 熊、pear 梨、wear 穿 读 /eə/。背下这三只，其余看位置。',
      rewardFaces: [1, 2],
      needs: ['ɪə', 'ɜː', 'eə']
    },
    {
      id: 'y',
      combo: 'y',
      emoji: '🎪',
      title: '四副面孔分拣厂 · y',
      short: 'y 四副面孔',
      desc: 'y 是全字母表最会变脸的：yes /j/、my /aɪ/、happy 和 gym /ɪ/。四副面孔、三种音，三个桶。',
      exclude: ['eye'],
      faces: [
        { sym: 'ɪ', color: 'teal', tag: '词中 & 长词词尾', hint: '短促「衣」· gym / happy' },
        { sym: 'aɪ', color: 'coral', tag: '短词词尾', hint: '「爱」· my / fly' },
        { sym: 'j', color: 'sky', tag: '词首当辅音', hint: '「呀」的开头 · yes' }
      ],
      rule:
        'y 有<b>四副面孔</b>，但耳朵只听得出<b>三种音</b>，所以这里只摆三个桶：' +
        '① y 站<b>词首</b>当辅音，读 /j/（yes / you / young / year）；' +
        '② <b>短词词尾</b>重读，读 /aɪ/（my / fly / sky / why / cry）；' +
        '③ <b>长词词尾</b>轻读，读 /ɪ/（happy / city / family / story）；' +
        '④ y 藏在<b>词中间</b>，也读 /ɪ/（gym / system / busy）。③④ 同音不同位，合用一个桶。',
      rewardFaces: [1, 2],
      needs: ['ɪ', 'aɪ', 'j']
    }
  ];

  function getSet(id) {
    return SETS.find((s) => s.id === id) || null;
  }

  /* 从内容库现取词：每副面孔 = 那一课 levels[] 里含目标字母组合的词。
     同一个词若同时落进两副面孔（说明数据本身有歧义），整个丢掉，绝不让它上传送带。 */
  function buildWords(units, set) {
    const allSounds = units.flatMap((u) => u.sounds);
    const combo = set.combo.toLowerCase();
    const excluded = new Set((set.exclude || []).map((w) => w.toLowerCase()));
    const seen = {}; // word -> faceIdx；-1 表示两副面孔都收了它，作废
    const picked = [];

    set.faces.forEach((face, faceIdx) => {
      const sound = allSounds.find((s) => s.symbol === face.sym);
      if (!sound) return;
      (sound.levels || []).forEach((lv) => {
        (lv.words || []).forEach((w) => {
          const lower = w.w.toLowerCase();
          if (excluded.has(lower)) return;
          const at = lower.indexOf(combo);
          if (at < 0) return;
          if (lower in seen) {
            if (seen[lower] !== faceIdx) seen[lower] = -1;
            return;
          }
          seen[lower] = faceIdx;
          picked.push({ w: w.w, ipa: w.ipa, zh: w.zh, faceIdx: faceIdx, at: at, len: combo.length });
        });
      });
    });

    return picked.filter((x) => seen[x.w.toLowerCase()] !== -1);
  }

  /* 成绩与错题本走 js/special-progress.js（IpaSpecial），和懒音侦探等其他特别关共用一套。 */

  global.IpaSorting = {
    SETS: SETS,
    getSet: getSet,
    buildWords: buildWords
  };
})(window);
