/* 音标乐园 · 课程地图首页渲染 */
(function () {
  const unitsBox = document.getElementById('units');
  const overallFill = document.getElementById('overallFill');
  const overallText = document.getElementById('overallText');

  function starsText(stars) {
    return stars > 0 ? '⭐'.repeat(stars) + '☆'.repeat(3 - stars) : '未开始';
  }

  function renderUnit(unit) {
    const section = document.createElement('div');
    section.className = 'unit-card';

    const head = document.createElement('div');
    head.className = 'unit-head';
    head.innerHTML =
      '<span class="num">单元 ' + unit.batchNum + '</span><span>' + unit.title + '</span>';
    section.appendChild(head);

    const body = document.createElement('div');
    body.className = 'unit-body';
    const grid = document.createElement('div');
    grid.className = 'lesson-grid';

    unit.sounds.forEach((sound) => {
      const progress = IpaStorage.getProgress(sound.symbol);
      const a = document.createElement('a');
      a.className = 'lesson-tile' + (progress.gameStars > 0 ? ' done' : '');
      a.href = 'lesson.html?b=' + unit.batchNum + '&i=' + sound.indexInBatch;
      a.innerHTML =
        '<div class="lnum">第 ' + sound.lessonNum + ' 课</div>' +
        '<div class="sym">/' + sound.symbol + '/</div>' +
        '<div class="type">' + sound.type + '</div>' +
        '<div class="nick">' + sound.nickname + '</div>' +
        '<div class="stars">' + starsText(progress.gameStars) + '</div>';
      grid.appendChild(a);
    });

    body.appendChild(grid);
    section.appendChild(body);
    return section;
  }

  function renderOverall(units) {
    const allSounds = units.flatMap((u) => u.sounds);
    const total = allSounds.length;
    const started = allSounds.filter((s) => IpaStorage.getProgress(s.symbol).gameStars > 0).length;
    overallFill.style.width = (total ? (started / total) * 100 : 0) + '%';
    overallText.textContent = '已过关 ' + started + ' / ' + total + ' 课';
  }

  /* 特别关：跨课解锁的专项玩法。
     分拣工厂全套（ea/oo/ow/ui/th/ear/y）都在 js/sorting-sets.js 里声明，
     加一个新厂只需往那个数组里加一条，首页这里自动多出一张卡。
     不是分拣厂的单独玩法（如懒音侦探）写在下面的 SOLO_SPECIALS 里。
     needs 填前置音标，那几课的大闯关都拿过星才算解锁（没解锁也能点进去玩）。 */
  const SOLO_SPECIALS = [
    {
      id: 'schwa',
      href: 'game-schwa.html',
      emoji: '🕵️',
      title: '懒音侦探 · /ə/',
      desc: '英语里出现最多的音，藏在最不起眼的音节里。单词拆成音节，点出偷懒读 /ə/ 的那个（banana 有两个！）。',
      needs: ['ə'],
    },
  ];

  function renderSpecials() {
    const box = document.getElementById('specials');
    if (!box || typeof IpaSorting === 'undefined') return;

    const cards = IpaSorting.SETS.map((s) => ({
      id: s.id,
      href: 'game-sorting.html?set=' + s.id,
      emoji: s.emoji,
      title: s.title,
      desc: s.desc,
      needs: s.needs,
    })).concat(SOLO_SPECIALS);
    if (!cards.length) return;

    const head = document.createElement('div');
    head.className = 'specials-head';
    head.textContent = '🎭 特别关';
    box.appendChild(head);

    cards.forEach((sp) => {
      const locked = sp.needs.some((sym) => IpaStorage.getProgress(sym).gameStars === 0);
      const stars = IpaSpecial.getStars(sp.id);
      const pending = IpaSpecial.pendingCount(sp.id);

      const marks = [];
      if (stars > 0) marks.push('⭐'.repeat(stars) + '☆'.repeat(3 - stars));
      if (pending > 0) marks.push('🔥 ' + pending + ' 个错题待特训');
      marks.push(
        locked
          ? '🔒 建议先学完 ' +
            sp.needs.map((x) => '/' + x + '/').join(sp.needs.length > 2 ? '、' : ' 和 ') +
            '，不过现在也能先玩'
          : '✅ 已解锁'
      );

      const a = document.createElement('a');
      a.className = 'special-card';
      a.href = sp.href;
      a.innerHTML =
        '<div class="t">' + sp.emoji + ' ' + sp.title + '</div>' +
        '<div class="d">' + sp.desc + '</div>' +
        marks.map((m) => '<div class="lock">' + m + '</div>').join(' ');
      box.appendChild(a);
    });
  }

  function renderWrongbookLink() {
    const link = document.getElementById('wrongbookLink');
    if (!link) return;
    const n = Object.keys(IpaStorage.getMistakeBook()).length;
    link.textContent = n > 0 ? `🗂️ 我的错题本 · ${n} 个待复习` : '🗂️ 我的错题本';
  }

  IpaData.loadAll()
    .then((units) => {
      unitsBox.innerHTML = '';
      units.forEach((unit) => unitsBox.appendChild(renderUnit(unit)));
      renderOverall(units);
      renderSpecials();
      renderWrongbookLink();
    })
    .catch((err) => {
      unitsBox.innerHTML =
        '<div class="card" style="text-align:center">' +
        '<p style="font-weight:700;margin-bottom:8px">😿 内容加载失败</p>' +
        '<p style="font-size:13px;color:#82715e;line-height:1.7">' +
        '直接双击打开 index.html 时，浏览器会拦截本地 JSON 文件的读取（这是浏览器安全策略，不是网络问题）。<br>' +
        '请在本目录下启动一个本地服务器再访问，例如命令行运行：<br>' +
        '<code>npx serve .</code> 或 <code>python -m http.server</code><br>' +
        '然后用浏览器打开它给出的 http://localhost 地址。' +
        '</p>' +
        '<p style="font-size:11px;color:#a3907a;margin-top:10px">' + err.message + '</p>' +
        '</div>';
    });
})();
