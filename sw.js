/* 音标乐园 · Service Worker
   缓存全部静态资源与内容库 JSON，支持离线打开与"添加到主屏幕"。
   内容库改版时需要提升 CACHE_NAME 版本号，否则用户端会一直读旧缓存。 */
const CACHE_NAME = 'ipa-land-v7';
const PRECACHE_URLS = [
  './index.html',
  './lesson.html',
  './wrongbook.html',
  './game-ea-sorting.html',
  './game-sorting.html',
  './game-schwa.html',
  './manifest.json?v=2',
  './favicon.ico',
  './css/theme.css',
  './css/lesson.css',
  './css/fonts.css',
  './fonts/Baloo2-latin.woff2',
  './fonts/Baloo2-latin-ext.woff2',
  './fonts/Fredoka-latin.woff2',
  './fonts/Fredoka-latin-ext.woff2',
  './js/speak.js',
  './js/storage.js',
  './js/lesson-data.js',
  './js/special-progress.js',
  './js/sorting-sets.js',
  './js/lesson-render.js',
  './js/home.js',
  './js/wrongbook-render.js',
  './js/pwa.js',
  './content-batch-1-short-vowels.json',
  './content-batch-2-long-vowels.json',
  './content-batch-3-schwa-diphthongs.json',
  './content-batch-4-diphthongs2.json',
  './content-batch-5-plosives.json',
  './content-batch-6-fricatives.json',
  './content-batch-7-affricates.json',
  './content-batch-8-sonorants.json',
  './icons/icon-192-v2.png',
  './icons/icon-512-v2.png',
  './icons/apple-touch-icon-v2.png',
];

/* 逐个抓、逐个存，不用 cache.addAll()，原因有两个：
   1. 静态托管（Cloudflare Pages）会把 /x.html 用 308 重定向到 /x，
      而重定向过的 Response 交给 cache.put 会抛 TypeError —— addAll 会因此整个失败，
      结果就是离线和「添加到主屏幕」全废。这里遇到重定向就重新包一个干净的响应。
   2. addAll 是全有全无：少一个文件就整份缓存都建不起来。单个资源失败不该拖垮其余的。 */
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) =>
      Promise.all(
        PRECACHE_URLS.map((url) =>
          fetch(url, { cache: 'reload' })
            .then((res) => {
              if (!res.ok) throw new Error(url + ' → ' + res.status);
              if (!res.redirected) return cache.put(url, res);
              return res.blob().then((body) =>
                cache.put(url, new Response(body, { status: 200, headers: res.headers }))
              );
            })
            .catch(() => {})
        )
      )
    ).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return; // 站外请求交给浏览器自己处理（字体已改为同源自托管）

  event.respondWith(
    (async () => {
      const cache = await caches.open(CACHE_NAME);
      let cached = await cache.match(req, { ignoreSearch: true });

      /* 线上地址是 /lesson（托管去掉了 .html），缓存键却是 ./lesson.html，补一次匹配，
         否则离线时所有页面跳转都落空。 */
      if (!cached && !/\.\w+$/.test(url.pathname)) {
        const alt = url.pathname === '/' || url.pathname === '' ? './index.html' : url.pathname + '.html';
        cached = await cache.match(alt, { ignoreSearch: true });
      }

      const fromNetwork = fetch(req)
        .then((res) => {
          if (res.ok && !res.redirected) cache.put(req, res.clone());
          return res;
        })
        .catch(() => cached);

      return cached || fromNetwork;
    })()
  );
});
