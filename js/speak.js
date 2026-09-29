/* 音标乐园 · 语音朗读（令牌机制 + 静音兜底）
   全站唯一 speak 函数：每次调用 token++ 并 cancel()，setTimeout ~150ms 后校验 token 再 speak——
   否则连点会串台（PRD 技术决策记录 #1，已踩坑两次）。
   注意：不能直接朗读单独字母/音标符号，字母会被念成字母名——调用方应始终传入真词或整句。

   静音兜底（PRD 质检清单：微信内置浏览器实测）：
   微信 / 部分安卓套壳浏览器里 speechSynthesis 对象存在、调用也不报错，但根本不出声。
   整个 App 的核心是听音，哑掉等于白给，所以这里不做 UA 猜测，而是实测：
   第一次朗读后 2 秒内没等到 onstart 事件，就认定发不出声，顶部弹提示条引导换浏览器。
*/
(function (global) {
  let speakToken = 0;
  let noticeKind = null;   // 已经弹过的提示类型，避免重复弹
  let voiceVerified = false; // 已经真的响过一次
  let probeTimer = null;

  const hasAPI =
    typeof global.speechSynthesis !== 'undefined' &&
    typeof global.SpeechSynthesisUtterance !== 'undefined';
  const inWeChat = /MicroMessenger/i.test(navigator.userAgent || '');

  /* ---------- 提示条 ---------- */
  const NOTICE = {
    none: {
      emoji: '😿',
      title: '这个浏览器不会读英文',
      body: '音标乐园全靠听音学习。请换 Chrome、Edge 或 Safari 打开这个网址。',
    },
    silent: {
      emoji: '🔇',
      title: '好像没有声音？',
      body: inWeChat
        ? '微信里的浏览器读不出英文。请点右上角「···」→「在浏览器打开」，声音就有了。'
        : '请检查手机是否按了静音键、音量是否调到最大。如果还是没声音，换 Chrome 或 Safari 打开试试。',
    },
  };

  function showNotice(kind) {
    if (noticeKind || !NOTICE[kind]) return;
    noticeKind = kind;
    const info = NOTICE[kind];

    const bar = document.createElement('div');
    bar.setAttribute('role', 'status');
    bar.style.cssText =
      'position:relative;background:#fff3d6;border:3px solid #33261a;border-radius:18px;' +
      'box-shadow:0 5px 0 rgba(51,38,26,.16);padding:13px 40px 13px 15px;margin:0 0 16px;' +
      'font-family:"PingFang SC","HarmonyOS Sans SC","Microsoft YaHei",sans-serif;color:#33261a;line-height:1.65;font-size:13px';
    bar.innerHTML =
      '<div style="font-weight:900;font-size:14.5px;margin-bottom:3px">' +
      info.emoji + ' ' + info.title +
      '</div><div style="color:#6b5b49">' + info.body + '</div>';

    const close = document.createElement('button');
    close.textContent = '×';
    close.setAttribute('aria-label', '关闭提示');
    close.style.cssText =
      'position:absolute;top:8px;right:10px;border:none;background:transparent;cursor:pointer;' +
      'font-size:22px;line-height:1;color:#a3907a;padding:2px 6px';
    close.addEventListener('click', () => bar.remove());
    bar.appendChild(close);

    const host = document.querySelector('.wrap') || document.body;
    host.insertBefore(bar, host.firstChild);
    if (typeof bar.scrollIntoView === 'function') {
      bar.scrollIntoView({ block: 'nearest' });
    }
  }

  /* ---------- 朗读 ---------- */
  function speakCore(text, rate) {
    if (!hasAPI) {
      showNotice('none');
      return;
    }
    const myToken = ++speakToken;
    try {
      speechSynthesis.cancel();
    } catch (e) {}
    setTimeout(() => {
      if (myToken !== speakToken) return; // 有更新的请求，放弃这条
      try {
        const u = new SpeechSynthesisUtterance(text);
        u.lang = 'en-US';
        u.rate = rate;
        u.pitch = 1.05;
        const vs = speechSynthesis.getVoices();
        const v =
          vs.find((x) => x.lang.startsWith('en') && /female|Samantha|Google US/i.test(x.name)) ||
          vs.find((x) => x.lang.startsWith('en'));
        if (v) u.voice = v;

        if (!voiceVerified) {
          u.onstart = () => {
            voiceVerified = true;
            clearTimeout(probeTimer);
          };
          clearTimeout(probeTimer);
          probeTimer = setTimeout(() => {
            if (!voiceVerified) showNotice('silent');
          }, 2000);
        }

        speechSynthesis.speak(u);
      } catch (e) {
        showNotice('none');
      }
    }, 150);
  }

  function say(t) {
    speakCore(t, 0.7);
  }
  function saySlow(t) {
    speakCore(t, 0.5);
  }

  if (hasAPI) {
    speechSynthesis.getVoices();
  }

  global.IpaSpeak = { say, saySlow, supported: hasAPI };
})(window);
