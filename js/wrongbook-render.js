/* 音标乐园 · 全局错题本渲染
   汇总所有课大闯关里的错词（IpaStorage 错题本），提供错题特训。
   特训沿用原题所在课的对立对（word/partner），保证重考的仍是当初那组辨音对比。
*/
(function (global) {
  const say = IpaSpeak.say;
  const saySlow = IpaSpeak.saySlow;

  function buildLookups(units) {
    const ipaMap = {};
    const zhMap = {};
    units.forEach((u) =>
      u.sounds.forEach((s) => {
        (s.levels || []).forEach((lv) =>
          lv.words.forEach((w) => {
            ipaMap[w.w] = w.ipa;
            zhMap[w.w] = w.zh;
          })
        );
        if (s.gamePairs && s.gamePairs.ipa) {
          Object.keys(s.gamePairs.ipa).forEach((w) => {
            if (!ipaMap[w]) ipaMap[w] = s.gamePairs.ipa[w];
          });
        }
      })
    );
    return { ipaMap, zhMap };
  }

  function shuffle(a) {
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }

  function renderBookList(root, ipaMap, zhMap) {
    const book = IpaStorage.getMistakeBook();
    const words = Object.keys(book);
    if (words.length === 0) {
      root.innerHTML = `
        <h2><span class="dot" style="background:var(--teal)"></span>我的错题本</h2>
        <p style="text-align:center;color:#82715e;padding:16px 4px">
          🎉 太棒了，当前没有积压的错题！<br>继续闯关，答错的题会自动收进这里。
        </p>
      `;
      return;
    }
    words.sort((a, b) => (book[b].count || 0) - (book[a].count || 0));
    const chips = words
      .map((w) => {
        const entry = book[w];
        const ipa = ipaMap[w] ? `/${ipaMap[w]}/` : '';
        const zh = zhMap[w] || '';
        return `<button class="chip" data-w="${w}">${w}<span class="zh">${zh}${zh ? ' · ' : ''}${ipa} · 错${entry.count}次</span></button>`;
      })
      .join('');
    root.innerHTML = `
      <h2><span class="dot" style="background:var(--teal)"></span>我的错题本 · 共 ${words.length} 个</h2>
      <div class="words">${chips}</div>
    `;
    root.querySelectorAll('.chip').forEach((chip) => {
      chip.addEventListener('click', () => say(chip.dataset.w));
    });
  }

  function renderDrill(root, ipaMap, zhMap, onBookChanged) {
    root.innerHTML = `
      <h2><span class="dot" style="background:var(--coral)"></span>🔥 错题特训</h2>
      <div id="drillIntro">
        <p style="font-size:13px;color:#82715e;margin-bottom:12px">
          听发音，选出正确的词——答对一次就从错题本里销一笔账，销净出本！
        </p>
        <button class="btn" id="btnStartDrill">开始特训</button>
      </div>
      <div id="drillArea" style="display:none">
        <div class="game-top">
          <span class="round-label" id="drillRoundLabel"></span>
          <div class="pbar"><i id="drillFill"></i></div>
        </div>
        <div class="quiz" id="drillQuiz">
          <p class="ask">🔊 听！我念的是哪个词？</p>
          <button class="btn teal" id="drillReplay">🔊 播放</button>
          <div class="choices" id="drillChoices" style="margin-top:14px"></div>
          <div class="feedback" id="drillFb"></div>
        </div>
        <div class="result" id="drillResult" style="display:none">
          <div class="big-stars" id="drillStars"></div>
          <h3 id="drillTitle"></h3>
          <p id="drillText"></p>
          <button class="btn" id="btnDrillAgain">🔁 再特训一轮</button>
        </div>
      </div>
    `;

    const introBox = root.querySelector('#drillIntro');
    const areaBox = root.querySelector('#drillArea');
    const quizBox = root.querySelector('#drillQuiz');
    const resultBox = root.querySelector('#drillResult');
    const roundLabel = root.querySelector('#drillRoundLabel');
    const fill = root.querySelector('#drillFill');
    const choicesBox = root.querySelector('#drillChoices');
    const fb = root.querySelector('#drillFb');

    let queue = [],
      cur = null,
      answerWord = '',
      locked = false,
      roundTotal = 0,
      doneCount = 0,
      firstTry = 0,
      cleared = [];

    function startDrill() {
      const book = IpaStorage.getMistakeBook();
      const entries = Object.keys(book)
        .filter((w) => book[w].partner)
        .map((w) => ({ word: w, symbol: book[w].symbol, partner: book[w].partner }));
      if (entries.length === 0) {
        introBox.innerHTML = '<p style="text-align:center;color:#82715e">🎉 错题本已经是空的啦，先去闯关攒几道错题再回来特训吧！</p>';
        return;
      }
      queue = shuffle(entries.slice());
      roundTotal = queue.length;
      doneCount = 0;
      firstTry = 0;
      cleared = [];
      introBox.style.display = 'none';
      areaBox.style.display = 'block';
      resultBox.style.display = 'none';
      quizBox.style.display = 'block';
      nextRound();
    }

    function playCur() {
      say(answerWord);
    }
    root.querySelector('#drillReplay').addEventListener('click', playCur);
    root.querySelector('#btnStartDrill').addEventListener('click', startDrill);
    root.querySelector('#btnDrillAgain').addEventListener('click', startDrill);

    function nextRound() {
      if (queue.length === 0) return endDrill();
      locked = false;
      cur = queue.shift();
      answerWord = cur.word;
      roundLabel.textContent = `已过 ${doneCount} / ${roundTotal} · 还剩 ${queue.length + 1}`;
      fill.style.width = (doneCount / roundTotal) * 100 + '%';
      fb.textContent = '';
      fb.className = 'feedback';
      choicesBox.innerHTML = '';
      shuffle([cur.word, cur.partner]).forEach((w) => {
        const b = document.createElement('button');
        b.className = 'choice';
        b.dataset.w = w;
        b.innerHTML = w;
        b.addEventListener('click', () => pick(b, w));
        choicesBox.appendChild(b);
      });
      setTimeout(playCur, 400);
    }

    function reveal() {
      choicesBox.querySelectorAll('.choice').forEach((btn) => {
        const w = btn.dataset.w;
        const ipa = ipaMap[w] || '';
        let cipa = btn.querySelector('.cipa');
        if (!cipa) {
          cipa = document.createElement('span');
          cipa.className = 'cipa';
          btn.appendChild(cipa);
        }
        cipa.textContent = ipa ? `/${ipa}/` : '';
        btn.onclick = () => say(w);
      });
    }

    function pick(btn, w) {
      if (locked) return;
      locked = true;
      reveal();
      if (w === answerWord) {
        btn.classList.add('right');
        doneCount++;
        if (!cur.missed) firstTry++;
        const remain = IpaStorage.resolveMistake(answerWord);
        if (remain === 0) cleared.push(answerWord);
        fb.textContent = remain > 0 ? `✅ 答对啦！销一笔账，还剩 ${remain} 笔` : `✅ 答对啦！这道题已经出本啦 🎉`;
        fb.className = 'feedback ok';
      } else {
        btn.classList.add('wrong');
        cur.missed = true;
        IpaStorage.addMistake(cur.symbol, answerWord, cur.partner);
        queue.splice(Math.min(2, queue.length), 0, cur);
        fb.textContent = `❌ 差一点！我念的是 ${answerWord} —— 待会儿重考！`;
        fb.className = 'feedback no';
        choicesBox.querySelectorAll('.choice').forEach((c) => {
          if (c.dataset.w === answerWord) c.classList.add('right');
        });
      }
      setTimeout(nextRound, w === answerWord ? 1800 : 3200);
    }

    function endDrill() {
      fill.style.width = '100%';
      quizBox.style.display = 'none';
      resultBox.style.display = 'block';
      const stars = firstTry >= roundTotal ? 3 : firstTry >= Math.ceil(roundTotal * 0.6) ? 2 : firstTry > 0 ? 1 : 0;
      root.querySelector('#drillStars').textContent = '⭐'.repeat(stars) + '☆'.repeat(3 - stars);
      root.querySelector('#drillTitle').textContent = cleared.length > 0 ? `本轮销账 ${cleared.length} 笔！` : '继续加油！';
      root.querySelector('#drillText').textContent = `一次答对 ${firstTry} / ${roundTotal} 题`;
      onBookChanged();
    }
  }

  function renderWrongbook(containers, units) {
    const { ipaMap, zhMap } = buildLookups(units);
    function refreshList() {
      renderBookList(containers.list, ipaMap, zhMap);
    }
    refreshList();
    renderDrill(containers.drill, ipaMap, zhMap, refreshList);
  }

  global.IpaWrongbook = { renderWrongbook };
})(window);
