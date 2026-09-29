/* 音标乐园 · PWA 注册
   注册 service worker，失败（如非 https/localhost 环境）静默忽略，不影响正常使用。 */
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('sw.js').catch(() => {});
  });
}
