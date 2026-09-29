/* 音标乐园 · 特别关的成绩与错题本（分拣工厂、懒音侦探共用）
   特别关不挂在某一个音标下，所以不走 IpaStorage 的按音标进度，各关自己一本账。
   全部读写 try/catch，localStorage 不可用时降级到内存（预览环境）。
*/
(function (global) {
  /* ---------- 每关最好成绩：首页卡片显示星星用 ---------- */
  const STAR_KEY = 'ipa-special-stars';
  let memStars = null;

  function loadStars() {
    if (memStars) return memStars;
    try {
      memStars = JSON.parse(localStorage.getItem(STAR_KEY)) || {};
      /* 早期只有分拣厂时用的是 ipa-sorting-stars，搬一次家，老成绩不丢 */
      const legacy = JSON.parse(localStorage.getItem('ipa-sorting-stars'));
      if (legacy && Object.keys(legacy).length) {
        Object.keys(legacy).forEach((k) => {
          if ((memStars[k] || 0) < legacy[k]) memStars[k] = legacy[k];
        });
        localStorage.setItem(STAR_KEY, JSON.stringify(memStars));
        localStorage.removeItem('ipa-sorting-stars');
      }
    } catch (e) {
      memStars = memStars || {};
    }
    return memStars;
  }

  function getStars(id) {
    return loadStars()[id] || 0;
  }

  function setStars(id, stars) {
    const data = loadStars();
    if ((data[id] || 0) >= stars) return;
    data[id] = stars;
    memStars = data;
    try {
      localStorage.setItem(STAR_KEY, JSON.stringify(data));
    } catch (e) {
      /* 降级：仅内存 */
    }
  }

  /* ---------- 每关一本错题本 ----------
     结构：{ [word]: 欠账笔数 }。答错记一笔，特训里答对销一笔，销净自动出本。
     （这是 ea 关已验证的机制，全部特别关沿用。） */
  const memBooks = {};

  function bookKey(id) {
    return 'ipa-special-book-' + id;
  }

  function loadBook(id) {
    try {
      const cur = JSON.parse(localStorage.getItem(bookKey(id)));
      if (cur) return cur;
      /* 老 key 搬家：ea 关最早用 ipa-mistake-book-ea，分拣厂通用化时用过 ipa-sorting-book-* */
      const olds = ['ipa-sorting-book-' + id];
      if (id === 'ea') olds.push('ipa-mistake-book-ea');
      for (let i = 0; i < olds.length; i++) {
        const legacy = JSON.parse(localStorage.getItem(olds[i]));
        if (legacy && Object.keys(legacy).length) {
          localStorage.setItem(bookKey(id), JSON.stringify(legacy));
          localStorage.removeItem(olds[i]);
          return legacy;
        }
      }
      return {};
    } catch (e) {
      return memBooks[id] || (memBooks[id] = {});
    }
  }

  function saveBook(id, book) {
    memBooks[id] = book;
    try {
      localStorage.setItem(bookKey(id), JSON.stringify(book));
    } catch (e) {
      /* 降级：仅内存 */
    }
  }

  function pendingCount(id) {
    return Object.keys(loadBook(id)).length;
  }

  global.IpaSpecial = {
    getStars: getStars,
    setStars: setStars,
    loadBook: loadBook,
    saveBook: saveBook,
    pendingCount: pendingCount
  };
})(window);
