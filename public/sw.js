/* 问问大师 PWA：离线可用 + 秒开的缓存策略。
   静态资源带 hash，可长期缓存；HTML 走 network-first 保证更新及时。 */
const CACHE = 'wenda-cache-v2';

self.addEventListener('install', (e) => {
  const BASE = './';
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll([BASE, BASE + 'manifest.webmanifest', BASE + 'icon.svg', BASE + 'icon-192.png', BASE + 'icon-512.png'])).catch(() => {}));
  self.skipWaiting();
});

self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))));
  self.clients.claim();
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== location.origin) return; // 只缓存本站，AI API 等外部请求不碰

  // HTML：network-first，离线才回落缓存
  if (req.mode === 'navigate') {
    e.respondWith(
      fetch(req)
        .then((res) => {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put(BASE, copy)).catch(() => {});
          return res;
        })
        .catch(() => caches.match(BASE))
    );
    return;
  }

  // 带 hash 的资源与其他静态：cache-first，miss 再网络并回填
  e.respondWith(
    caches.match(req).then((hit) => {
      if (hit) return hit;
      return fetch(req).then((res) => {
        if (res && res.status === 200 && res.type === 'basic') {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put(req, copy)).catch(() => {});
        }
        return res;
      });
    })
  );
});
