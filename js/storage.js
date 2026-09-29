/* 音标乐园 · 进度存储
   全部读写走 try/catch，localStorage 不可用时（如预览环境）自动降级到内存对象。
   数据结构：{ [symbol]: { levels:{ [levelIdx]: [word,...] }, gameStars: 0-3, maskDone: bool } }
*/
(function (global) {
  const KEY = 'ipa-land-progress';
  const BOOK_KEY = 'ipa-land-mistake-book';
  let mem = null; // 内存兜底，仅本次页面会话有效
  let memBook = null;

  function load() {
    if (mem) return mem;
    try {
      mem = JSON.parse(localStorage.getItem(KEY)) || {};
    } catch (e) {
      mem = {};
    }
    return mem;
  }

  function persist(data) {
    mem = data;
    try {
      localStorage.setItem(KEY, JSON.stringify(data));
    } catch (e) {
      /* 降级：仅保留在内存里 */
    }
  }

  /* ---------- 全局错题本 ----------
     结构：{ [word]: { symbol, partner, count } }
     symbol/partner 记住这道题来自哪一课的哪个对立对，特训时原样复用同一组对立对出题。 */
  function loadBook() {
    if (memBook) return memBook;
    try {
      memBook = JSON.parse(localStorage.getItem(BOOK_KEY)) || {};
    } catch (e) {
      memBook = {};
    }
    return memBook;
  }

  function persistBook(data) {
    memBook = data;
    try {
      localStorage.setItem(BOOK_KEY, JSON.stringify(data));
    } catch (e) {
      /* 降级：仅保留在内存里 */
    }
  }

  function addMistake(symbol, word, partner) {
    const data = loadBook();
    const cur = data[word] || { symbol, partner, count: 0 };
    cur.symbol = symbol;
    cur.partner = partner;
    cur.count = (cur.count || 0) + 1;
    data[word] = cur;
    persistBook(data);
  }

  function resolveMistake(word) {
    const data = loadBook();
    if (!data[word]) return 0;
    data[word].count -= 1;
    if (data[word].count <= 0) delete data[word];
    persistBook(data);
    return data[word] ? data[word].count : 0;
  }

  function getMistakeBook() {
    return loadBook();
  }

  function getProgress(symbol) {
    const data = load();
    return data[symbol] || { levels: {}, gameStars: 0, maskDone: false };
  }

  function markWordLearned(symbol, levelIdx, word) {
    const data = load();
    const cur = data[symbol] || { levels: {}, gameStars: 0, maskDone: false };
    const list = cur.levels[levelIdx] || [];
    if (!list.includes(word)) list.push(word);
    cur.levels[levelIdx] = list;
    data[symbol] = cur;
    persist(data);
  }

  function setGameStars(symbol, stars) {
    const data = load();
    const cur = data[symbol] || { levels: {}, gameStars: 0, maskDone: false };
    cur.gameStars = Math.max(cur.gameStars || 0, stars);
    data[symbol] = cur;
    persist(data);
  }

  function setMaskDone(symbol) {
    const data = load();
    const cur = data[symbol] || { levels: {}, gameStars: 0, maskDone: false };
    cur.maskDone = true;
    data[symbol] = cur;
    persist(data);
  }

  global.IpaStorage = {
    getProgress,
    markWordLearned,
    setGameStars,
    setMaskDone,
    addMistake,
    resolveMistake,
    getMistakeBook,
  };
})(window);
