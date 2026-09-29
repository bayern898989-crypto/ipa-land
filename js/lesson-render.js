/* 音标乐园 · 课程页渲染引擎
   模板 × JSON = 48 课：本文件只认数据结构（sound 对象），不认具体音标/词表。
   7 环节全部由此渲染，参考实现见 ipa-lesson-ae.html（贴纸绘本视觉与交互基准）。
*/
(function (global) {
  const say = IpaSpeak.say;
  const saySlow = IpaSpeak.saySlow;

  /* ---------- 拼写高亮：在正字法词形里找出对应的拼写字母并加粗 ----------
     spellings[].letters 除了 "e / u" 这种多候选写法，还夹杂几种不能直接当字面
     拼写用的标注格式（真实数据里都出现过），逐一处理：
       - "our（词尾）"      → 中文括号注释，整体去掉，剩 "our"，且记住"词尾"要求后缀匹配
       - "a（词首轻读）"    → 同上，但记住"词首"要求前缀匹配（否则会把 today 里那个不相干
                              的 a 也点亮——它其实是 /eɪ/，不是这一课的懒音 /ə/）
       - "t(ure/ion)"       → 半角括号+无中文，是前缀展开写法，剩 "ture"/"tion"
       - "i + nd/ld/mb"     → "+" 前缀展开写法，剩 "ind"/"ild"/"imb"
       - "a_e" / "i_e" 等   → 魔法 e：字母 + 任意一个辅音 + 词尾不发音的 e，中间那个辅音
                              不固定，不能当字面子串找，改用正则在词尾匹配，只给目标元音字母加粗
       - "h 装死名单"       → 这些例词里字母根本不发音，高亮就是误导，直接不给候选
       - "o 里藏着 w"       → 真正的字母在提示语前半段，取"里藏着"之前的部分
       - "任何元音字母"     → 纯描述、没有具体字母（懒音音节可以是任何元音），
                              无法可靠猜出具体是哪个字母，同样不给候选（宁可不高亮，不猜错）
  */
  function stripAnnotatedParen(str) {
    return str.replace(/[（(]([^）)]*)[）)]/g, (m, inner) => (/[一-鿿]/.test(inner) ? '' : m));
  }

  function parseLetterEntry(raw) {
    if (!raw) return [];
    let s = String(raw).trim();
    if (s.includes('装死')) return [];
    if (s.includes('里藏着')) s = s.split('里藏着')[0].trim();
    let pos = 'any';
    if (/词首/.test(s)) pos = 'prefix';
    else if (/词尾/.test(s)) pos = 'suffix';
    s = stripAnnotatedParen(s);

    const parenExpand = s.match(/^([a-zA-Z]*)\(([^)]+)\)$/);
    if (parenExpand) {
      s = parenExpand[2]
        .split('/')
        .map((alt) => parenExpand[1] + alt.trim())
        .join('/');
    }
    const plusExpand = s.match(/^(\S+)\s*\+\s*(.+)$/);
    if (plusExpand) {
      s = plusExpand[2]
        .split('/')
        .map((alt) => plusExpand[1].trim() + alt.trim())
        .join('/');
    }

    return s
      .split('/')
      .map((p) => p.trim())
      .filter(Boolean)
      .filter((p) => !/[一-鿿]/.test(p))
      .map((text) => {
        const magicE = text.match(/^([a-zA-Z])_e$/);
        return magicE ? { type: 'magic-e', vowel: magicE[1] } : { type: 'literal', text, pos };
      });
  }

  function candidateLength(c) {
    return c.type === 'magic-e' ? 2 : c.text.length;
  }

  function letterCandidates(spellings) {
    const out = [];
    (spellings || []).forEach((sp) => {
      parseLetterEntry(sp.letters).forEach((c) => out.push(c));
    });
    return out.sort((a, b) => candidateLength(b) - candidateLength(a));
  }

  function boldSpelling(word, spellings) {
    const candidates = letterCandidates(spellings);
    const lower = word.toLowerCase();
    for (const c of candidates) {
      if (c.type === 'magic-e') {
        const m = lower.match(new RegExp(c.vowel + '[bcdfghjklmnpqrstvwxyz]e$', 'i'));
        if (!m) continue;
        const idx = m.index;
        return word.slice(0, idx) + '<b>' + word.slice(idx, idx + 1) + '</b>' + word.slice(idx + 1);
      }
      const needle = c.text.toLowerCase();
      let idx = -1;
      if (c.pos === 'prefix') idx = lower.startsWith(needle) ? 0 : -1;
      else if (c.pos === 'suffix') idx = lower.endsWith(needle) ? lower.length - needle.length : -1;
      else idx = lower.indexOf(needle);
      if (idx !== -1) {
        return word.slice(0, idx) + '<b>' + word.slice(idx, idx + needle.length) + '</b>' + word.slice(idx + needle.length);
      }
    }
    return word;
  }

  /* ---------- /ə/ 专属：懒音音节高亮 ----------
     schwa 没有固定拼写字母（任何非重读元音都可能懒化），常规的"找字母子串"对
     lemon/open/today/camera 这类词天生无解。但 gameSchwa.words 里恰好给了这些
     词的精确音节切分（syl）和偷懒音节下标（lazy），直接用这份数据整音节加粗，
     比瞎猜某个字母更准，也更贴合"懒音是整个音节偷懒"这件事本身。 */
  function boldFromSyllables(word, syl, lazyIndices) {
    const lazySet = new Set(lazyIndices);
    let out = '';
    let pos = 0;
    syl.forEach((part, i) => {
      const chunk = word.slice(pos, pos + part.length);
      out += lazySet.has(i) ? '<b>' + chunk + '</b>' : chunk;
      pos += part.length;
    });
    return out;
  }

  function boldWord(word, sound, scopedSpellings) {
    const gs = sound.gameSchwa;
    if (gs) {
      const entry = gs.words.find((w) => w.w.toLowerCase() === word.toLowerCase());
      if (entry) return boldFromSyllables(word, entry.syl, entry.lazy);
    }
    return boldSpelling(word, scopedSpellings || sound.spellings);
  }

  function boldIpaSymbol(ipa, symbol) {
    const idx = ipa.indexOf(symbol);
    if (idx === -1) return ipa;
    return ipa.slice(0, idx) + '<b>' + ipa.slice(idx, idx + symbol.length) + '</b>' + ipa.slice(idx + symbol.length);
  }

  function findSoundBySymbol(units, symbol) {
    for (const u of units) {
      const found = u.sounds.find((s) => s.symbol === symbol);
      if (found) return found;
    }
    return null;
  }

  function firstGrapheme(str, fallback) {
    const arr = Array.from(str || '');
    return arr[0] || fallback;
  }

  /* ---------- 1. 音标英雄卡 ---------- */
  function renderHero(root, sound) {
    root.innerHTML = `
      <div class="sym">/${sound.symbol}/</div>
      <div class="kind">${sound.type}</div>
      <div class="howto">
        <div class="face">${firstGrapheme(sound.mnemonic && sound.mnemonic.pic, '⭐')}</div>
        <p><b>怎么发：</b>${sound.howTo}</p>
      </div>
      <button class="btn" id="btnHeroSay">🔊 听这个音</button>
    `;
    root.querySelector('#btnHeroSay').addEventListener('click', () => say(sound.ttsDemo));
  }

  /* ---------- 2. 拼写出口 ---------- */
  function renderSpellings(root, sound) {
    const tiles = (sound.spellings || [])
      .map((sp, idx) => {
        const eg = (sp.examples || []).map((w) => boldWord(w, sound, [sp])).join(' · ');
        return `
        <div class="spell-tile ${idx === 0 ? 'main' : 'rare'}">
          <div class="letter">${sp.letters}</div>
          <div class="freq">${sp.freq}</div>
          <div class="eg">${eg}</div>
        </div>`;
      })
      .join('');
    root.innerHTML = `
      <h2><span class="dot" style="background:var(--teal)"></span>这个音，通常写成哪些字母？</h2>
      <div class="spellmap">${tiles}</div>
      ${sound.spellingNote ? `<p class="spell-note">${sound.spellingNote}</p>` : ''}
    `;
  }

  /* ---------- 3. 分级词库闯关 ---------- */
  function renderLevels(root, sound) {
    const symbol = sound.symbol;
    const progress = IpaStorage.getProgress(symbol);
    const learned = (sound.levels || []).map((lv, i) => new Set(progress.levels[i] || []));

    const levelsHTML = (sound.levels || [])
      .map((lv, i) => {
        const colorClass = 'c' + (i % 4);
        const wordsHTML = lv.words
          .map(
            (w) => `
          <button class="chip${learned[i].has(w.w) ? ' done' : ''}" data-w="${w.w}">
            ${boldWord(w.w, sound)}<span class="zh">${w.zh}</span>
          </button>`
          )
          .join('');
        return `
        <div class="level">
          <div class="level-head ${colorClass}">${'⭐'.repeat(i + 1 > 3 ? 3 : i + 1)} ${lv.name}<span class="stars" id="lv${i}s"></span></div>
          <div class="level-body">
            <p class="level-tip">${lv.tip}</p>
            <div class="words" data-level="${i}">${wordsHTML}</div>
          </div>
        </div>`;
      })
      .join('');

    root.innerHTML = `
      <h2><span class="dot" style="background:var(--sun)"></span>词语闯关：点一点，听一听</h2>
      <div class="levels">${levelsHTML}</div>
    `;

    function updateStars(i) {
      const total = sound.levels[i].words.length;
      const n = learned[i].size;
      root.querySelector('#lv' + i + 's').textContent = n >= total ? '🏆 全部点亮！' : `已点亮 ${n}/${total}`;
    }

    root.querySelectorAll('.words').forEach((box) => {
      const i = +box.dataset.level;
      updateStars(i);
      box.querySelectorAll('.chip').forEach((chip) => {
        chip.addEventListener('click', () => {
          const w = chip.dataset.w;
          say(w);
          chip.classList.add('done');
          learned[i].add(w);
          IpaStorage.markWordLearned(symbol, i, w);
          updateStars(i);
        });
      });
    });
  }

  /* ---------- 4. 记忆句 ---------- */
  function renderMnemonic(root, sound) {
    const m = sound.mnemonic;
    if (!m) {
      root.innerHTML = '';
      return;
    }
    const tokens = m.sentence.split(' ');
    const pairs = m.wordIpa || [];
    let sentenceHTML = m.sentence;
    if (tokens.length === pairs.length) {
      sentenceHTML = tokens
        .map((tok, i) => {
          const ipa = pairs[i][1];
          if (!ipa.includes(sound.symbol)) return tok;
          const parts = tok.match(/^([^a-zA-Z']*)([a-zA-Z']+)([^a-zA-Z']*)$/);
          if (!parts) return tok;
          return parts[1] + boldWord(parts[2], sound) + parts[3];
        })
        .join(' ');
    }

    root.innerHTML = `
      <div class="mnemo">
        <div class="pic">${m.pic || ''}</div>
        <div class="sen">${sentenceHTML}</div>
        <p class="cn">${m.zh}</p>
        <div class="ipa-row" id="mnemoIpaRow"></div>
        <button class="btn sun" id="btnMnemoFull">🔊 听整句</button>
        <button class="btn teal" id="btnMnemoSlow">🐢 慢速跟读</button>
        <button class="btn" id="btnMnemoMic">🎤 我来念，帮我挑毛病</button>
        <div id="readCheck" style="display:none;margin-top:14px;background:#fffdf7;border:2.5px dashed var(--ink);border-radius:14px;padding:12px">
          <p id="micStatus" style="font-size:13px;color:#82715e;margin-bottom:8px"></p>
          <div id="wordCheck" style="font-family:var(--en);font-weight:700;font-size:19px;line-height:2;letter-spacing:.02em"></div>
          <p id="micTip" style="font-size:12.5px;color:#82715e;margin-top:6px"></p>
        </div>
      </div>
    `;

    const ipaRow = root.querySelector('#mnemoIpaRow');
    pairs.forEach(([w, ipa]) => {
      const hit = ipa.includes(sound.symbol);
      const d = document.createElement('div');
      d.className = 'ipa-tile' + (hit ? ' hit' : '');
      d.innerHTML = `<div class="w">${w}</div><div class="ipa">/${hit ? boldIpaSymbol(ipa, sound.symbol) : ipa}/</div>`;
      d.addEventListener('click', () => saySlow(w.replace(/'/g, '')));
      ipaRow.appendChild(d);
    });

    root.querySelector('#btnMnemoFull').addEventListener('click', () => say(m.sentence));
    root.querySelector('#btnMnemoSlow').addEventListener('click', () => saySlow(m.sentence));
    root.querySelector('#btnMnemoMic').addEventListener('click', () => startListening(root, m));
  }

  function norm(w) {
    return w
      .toLowerCase()
      .replace(/[^a-z']/g, '')
      .replace(/'s$/, 's')
      .replace(/'/g, '');
  }

  function startListening(root, mnemonic) {
    const TARGET_WORDS = (mnemonic.wordIpa || []).map(([w]) => w);
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    const micBtn = root.querySelector('#btnMnemoMic');
    const panel = root.querySelector('#readCheck');
    const status = root.querySelector('#micStatus');
    const tip = root.querySelector('#micTip');
    const wc = root.querySelector('#wordCheck');
    panel.style.display = 'block';
    wc.innerHTML = '';
    tip.textContent = '';
    if (!SR) {
      status.textContent = '这台设备的浏览器不支持语音识别，换 Chrome 或 Edge 试试～';
      return;
    }
    try {
      speechSynthesis.cancel();
    } catch (e) {}
    const rec = new SR();
    rec.lang = 'en-US';
    rec.interimResults = false;
    rec.maxAlternatives = 1;
    status.textContent = '🎤 听着呢……大声念出整句吧！';
    micBtn.disabled = true;
    let gotResult = false,
      gotError = false;

    rec.onresult = (e) => {
      gotResult = true;
      const heard = e.results[0][0].transcript;
      const heardWords = heard.split(/\s+/).map(norm).filter(Boolean);
      let hi = 0;
      const marks = TARGET_WORDS.map((tw) => {
        const t = norm(tw);
        for (let j = hi; j < heardWords.length; j++) {
          if (heardWords[j] === t) {
            hi = j + 1;
            return true;
          }
        }
        return false;
      });
      wc.innerHTML = TARGET_WORDS.map(
        (w, i) =>
          `<span style="padding:2px 6px;border-radius:8px;margin-right:2px;background:${marks[i] ? '#d8f8ee' : '#ffe0dd'};color:${marks[i] ? 'var(--teal-deep)' : 'var(--coral-deep)'}">${w}</span>`
      ).join(' ');
      const missed = TARGET_WORDS.filter((w, i) => !marks[i]);
      const uniqueMissed = [...new Set(missed.filter((w) => w !== 'a' && w !== 'in' && w !== 'on'))];
      if (missed.length === 0) {
        status.textContent = '🏆 全部听清了！每个词都念到位！';
        say('Perfect! Amazing!');
      } else if (uniqueMissed.length === 0) {
        status.textContent = '👍 实词全对！只有小虚词含糊了一点，不影响～';
      } else {
        status.textContent = `👂 这几个词我没听清：${uniqueMissed.join('、')} —— 点它们单独听一遍，再挑战！`;
        wc.querySelectorAll('span').forEach((sp, i) => {
          if (!marks[i]) {
            sp.style.cursor = 'pointer';
            sp.onclick = () => say(TARGET_WORDS[i].replace(/'/g, ''));
          }
        });
      }
      tip.textContent =
        '小提示：红色 ≈ 我没听出来（可能不准，也可能太小声）。这个"耳朵"只能听到词，还分不出发音有没有到位——那要靠人耳或专业打分。';
    };
    rec.onerror = (e) => {
      gotError = true;
      status.textContent =
        e.error === 'not-allowed'
          ? '麦克风被挡住了：点浏览器地址栏左边的 🔒 图标 → 找到"麦克风" → 改成"允许"，然后刷新页面再试'
          : e.error === 'no-speech'
            ? '一个字都没听到……声音大一点，或检查是不是用错了麦克风（比如插着耳机但对着电脑说）'
            : e.error === 'network'
              ? '连不上语音识别服务（它需要联网，且部分网络环境下不可用）。换个网络试试'
              : '出了点小状况（' + e.error + '），再点一次试试';
    };
    rec.onend = () => {
      micBtn.disabled = false;
      if (!gotResult && !gotError) {
        status.textContent =
          '识别悄悄结束了但什么也没听到——多半是识别服务连不上（需联网，国内网络下 Chrome 的识别常不可用），或页面是在预览窗口里打开的。下载文件后用 Chrome/Edge 直接打开再试。';
      }
    };
    rec.start();
  }

  /* ---------- 5. 对比辨音 ---------- */
  function renderContrast(root, sound, units) {
    const c = sound.contrast;
    if (!c) {
      root.innerHTML = '';
      return;
    }
    const isNoSound = c.vsSymbol === '-';
    const vsSound = isNoSound ? null : findSoundBySymbol(units, c.vsSymbol);
    const vsHeadLabel = isNoSound ? '不发音' : `/${c.vsSymbol}/`;
    const leftHTML = c.pairs
      .map((p) => `<button class="chip" data-w="${p[0]}">${boldWord(p[0], sound)}</button>`)
      .join('');
    const rightHTML = c.pairs
      .map(
        (p) =>
          `<button class="chip" data-w="${p[1]}">${vsSound ? boldWord(p[1], vsSound) : p[1]}</button>`
      )
      .join('');
    root.innerHTML = `
      <h2><span class="dot" style="background:var(--sky)"></span>小心！字母会骗人，音标才是真相</h2>
      <p style="font-size:13px;color:#82715e;margin-bottom:12px">${c.note}</p>
      <div class="contrast">
        <div class="col s"><div class="head">/${sound.symbol}/</div><div class="body">${leftHTML}</div></div>
        <div class="col l"><div class="head">${vsHeadLabel}</div><div class="body">${rightHTML}</div></div>
      </div>
    `;
    root.querySelectorAll('.chip').forEach((chip) => chip.addEventListener('click', () => say(chip.dataset.w)));
  }

  /* ---------- 6. 大闯关 ---------- */
  function shuffle(a) {
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }

  function renderGame(root, sound) {
    const gp = sound.gamePairs;
    if (!gp) {
      root.innerHTML = `
        <h2><span class="dot" style="background:var(--coral)"></span>大闯关 · 火眼金睛辨 /${sound.symbol}/</h2>
        <div class="game-placeholder">
          <div class="big">🚧</div>
          即将上线：这个音有专属特别关，正在制作中～
        </div>
      `;
      return;
    }
    root.innerHTML = `
      <h2><span class="dot" style="background:var(--coral)"></span>大闯关 · 火眼金睛辨 /${sound.symbol}/</h2>
      <div class="game-top">
        <span class="round-label" id="roundLabel"></span>
        <div class="pbar"><i id="pfill"></i></div>
      </div>
      <div class="quiz" id="quizBox">
        <p class="ask">🔊 听！我念的是哪个词？</p>
        <p class="hintline">先点喇叭听，再选。听不清可以再听一次！</p>
        <button class="btn teal" id="replayBtn">🔊 播放</button>
        <div class="choices" id="choices" style="margin-top:14px"></div>
        <div class="feedback" id="fb"></div>
      </div>
      <div class="result" id="resultBox" style="display:none">
        <div class="big-stars" id="bigStars"></div>
        <h3 id="resultTitle"></h3>
        <p id="resultText"></p>
        <div id="missRecap" style="display:none;background:#fff3d6;border:3px solid var(--ink);border-radius:14px;padding:12px;margin:12px auto;max-width:420px;text-align:left">
          <p style="font-size:14px;font-weight:900;margin-bottom:6px">📖 本局错题回顾（点词可听）</p>
          <div id="missList" style="font-family:var(--en);font-weight:700;font-size:16px;line-height:2"></div>
          <p style="font-size:12px;color:#82715e;margin-top:4px">错过的题都已当场重考——下次开局它们还会优先出现。</p>
        </div>
        <button class="btn" id="btnReplayGame">🔁 再来一局</button>
      </div>
    `;

    const TOTAL = 8;
    let queue = [],
      cur = null,
      answerWord = '',
      locked = false;
    let doneCount = 0,
      roundTotal = TOTAL,
      firstTry = 0;
    let sessionMiss = [];
    let lastMissPairs = [];

    const roundLabel = root.querySelector('#roundLabel');
    const pfill = root.querySelector('#pfill');
    const fb = root.querySelector('#fb');
    const choicesBox = root.querySelector('#choices');
    const quizBox = root.querySelector('#quizBox');
    const resultBox = root.querySelector('#resultBox');

    function playRound() {
      say(answerWord);
    }
    root.querySelector('#replayBtn').addEventListener('click', playRound);
    root.querySelector('#btnReplayGame').addEventListener('click', startGame);

    function startGame() {
      const rest = shuffle(gp.pairs.filter((p) => lastMissPairs.indexOf(p) === -1));
      const chosen = shuffle(lastMissPairs.concat(rest).slice(0, TOTAL));
      queue = chosen.map((p) => ({ pair: p, missed: false }));
      roundTotal = queue.length;
      doneCount = 0;
      firstTry = 0;
      sessionMiss = [];
      lastMissPairs = [];
      resultBox.style.display = 'none';
      quizBox.style.display = 'block';
      nextRound();
    }

    function nextRound() {
      if (queue.length === 0) return endGame();
      locked = false;
      cur = queue.shift();
      answerWord = cur.pair[Math.floor(Math.random() * 2)];
      roundLabel.textContent = `已过 ${doneCount} / ${roundTotal} · 还剩 ${queue.length + 1}`;
      pfill.style.width = (doneCount / roundTotal) * 100 + '%';
      fb.textContent = '';
      fb.className = 'feedback';
      choicesBox.innerHTML = '';
      shuffle(cur.pair.slice()).forEach((w) => {
        const b = document.createElement('button');
        b.className = 'choice';
        b.dataset.w = w;
        b.innerHTML = w;
        b.addEventListener('click', () => pick(b, w));
        choicesBox.appendChild(b);
      });
      setTimeout(playRound, 400);
    }

    function revealIPA() {
      choicesBox.querySelectorAll('.choice').forEach((btn) => {
        const w = btn.dataset.w;
        const ipa = gp.ipa[w] || '';
        let cipa = btn.querySelector('.cipa');
        if (!cipa) {
          cipa = document.createElement('span');
          cipa.className = 'cipa';
          btn.appendChild(cipa);
        }
        cipa.innerHTML = '/' + boldIpaSymbol(ipa, sound.symbol) + '/';
        btn.onclick = () => say(w);
      });
    }

    function pick(btn, w) {
      if (locked) return;
      locked = true;
      revealIPA();
      if (w === answerWord) {
        btn.classList.add('right');
        doneCount++;
        if (!cur.missed) firstTry++;
        fb.textContent = '✅ 答对啦！看看两个词的音标差在哪～';
        fb.className = 'feedback ok';
      } else {
        btn.classList.add('wrong');
        if (!cur.missed) {
          sessionMiss.push(answerWord);
          lastMissPairs.push(cur.pair);
          const partner = cur.pair.find((w) => w !== answerWord);
          IpaStorage.addMistake(sound.symbol, answerWord, partner);
        }
        cur.missed = true;
        queue.splice(Math.min(2, queue.length), 0, cur);
        fb.textContent = `❌ 差一点！我念的是 ${answerWord} —— 记下了，待会儿重考！先看音标、点两个词各听一遍～`;
        fb.className = 'feedback no';
        choicesBox.querySelectorAll('.choice').forEach((c) => {
          if (c.dataset.w === answerWord) c.classList.add('right');
        });
      }
      setTimeout(nextRound, w === answerWord ? 2200 : 3800);
    }

    function endGame() {
      pfill.style.width = '100%';
      quizBox.style.display = 'none';
      resultBox.style.display = 'block';
      const stars = firstTry >= roundTotal ? 3 : firstTry >= roundTotal - 2 ? 2 : firstTry >= Math.ceil(roundTotal / 2) ? 1 : 0;
      root.querySelector('#bigStars').textContent = '⭐'.repeat(stars) + '☆'.repeat(3 - stars);
      const titles = ['再练练，错的都重考过了！', '不错的开始！', '很棒！就差一点点满分', `满分！/${sound.symbol}/ 音大师！🏆`];
      root.querySelector('#resultTitle').textContent = titles[stars];
      root.querySelector('#resultText').textContent = `一次答对 ${firstTry} / ${roundTotal} 题（错题已当场重考补齐）`;
      IpaStorage.setGameStars(sound.symbol, stars);
      const recap = root.querySelector('#missRecap');
      if (sessionMiss.length > 0) {
        recap.style.display = 'block';
        const list = root.querySelector('#missList');
        list.innerHTML = '';
        sessionMiss.forEach((w) => {
          const sp = document.createElement('span');
          sp.style.cursor = 'pointer';
          sp.style.color = '#1a5fb4';
          sp.textContent = `${w} /${gp.ipa[w] || ''}/`;
          sp.addEventListener('click', () => saySlow(w));
          list.appendChild(sp);
          list.appendChild(document.createTextNode('   ·   '));
        });
      } else {
        recap.style.display = 'none';
      }
      if (stars === 3) say('Fantastic! You are a champion!');
    }

    startGame();
  }

  /* ---------- 7. 蒙面句子终极挑战 ---------- */
  function renderMasked(root, sound) {
    const m = sound.mnemonic;
    if (!m) {
      root.innerHTML = '';
      return;
    }
    root.innerHTML = `
      <h2><span class="dot" style="background:var(--ink)"></span>终极挑战 · 蒙面句子：只看音标读出来</h2>
      <p style="font-size:13px;color:#82715e;margin-bottom:12px">单词全躲起来了！先大声把每个音标读出来，读完再点卡片揭晓 + 听标准音，看自己读对没有：</p>
      <div class="ipa-row" id="maskedRow"></div>
      <div style="text-align:center">
        <button class="btn sun" id="btnMaskAll">🙈 重新遮住</button>
        <button class="btn teal" id="btnCheckAll">🔊 听整句核对</button>
      </div>
    `;
    const maskedRow = root.querySelector('#maskedRow');
    let revealedCount = 0;
    function buildMasked() {
      maskedRow.innerHTML = '';
      revealedCount = 0;
      (m.wordIpa || []).forEach(([w, ipa]) => {
        const hit = ipa.includes(sound.symbol);
        const d = document.createElement('div');
        d.className = 'ipa-tile' + (hit ? ' hit' : '');
        d.innerHTML = `<div class="w" style="color:#d5c4a8">？</div><div class="ipa">/${hit ? boldIpaSymbol(ipa, sound.symbol) : ipa}/</div>`;
        d.addEventListener('click', function reveal() {
          const wEl = d.querySelector('.w');
          if (wEl.textContent === '？') {
            wEl.textContent = w;
            wEl.style.color = '';
            revealedCount++;
            if (revealedCount === m.wordIpa.length) IpaStorage.setMaskDone(sound.symbol);
          }
          saySlow(w.replace(/'/g, ''));
        });
        maskedRow.appendChild(d);
      });
    }
    root.querySelector('#btnMaskAll').addEventListener('click', buildMasked);
    root.querySelector('#btnCheckAll').addEventListener('click', () => saySlow(m.sentence));
    buildMasked();
  }

  /* ---------- 入口 ---------- */
  function renderLesson(containers, sound, units) {
    renderHero(containers.hero, sound);
    renderSpellings(containers.spellings, sound);
    renderLevels(containers.levels, sound);
    renderMnemonic(containers.mnemonic, sound);
    renderContrast(containers.contrast, sound, units);
    renderGame(containers.game, sound);
    renderMasked(containers.masked, sound);
  }

  global.IpaLesson = { renderLesson, boldSpelling, findSoundBySymbol };
})(window);
