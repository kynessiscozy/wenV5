/* 问问大师 PWA：离线可用 + 秒开的缓存策略。
   静态资源带 hash，可长期缓存；HTML 走 network-first 保证更新及时。 */
const CACHE = 'wenda-cache-v38';
const BASE = './';

const OPTIONAL_ASSETS = [
  'manifest.webmanifest', 'icon.svg', 'icon-192.png', 'icon-512.png',
  'art/master-twin-indigo.webp', 'art/master-twin-rose.webp',
  'art/master-twin-indigo-avatar.webp', 'art/master-twin-rose-avatar.webp',
  'art/wenwen-reimagined.webp', 'art/wenwen-reimagined-avatar.webp', 'art/wenwen-reimagined-blink.webp', 'art/wenwen-reimagined-speak.webp',
  'art/wenwen-lantern.webp', 'art/wenwen-cloud-trail.webp', 'art/sacred-study-wide.webp', 'art/sacred-study-mobile.webp',
  'art/moon-fox-reimagined.webp', 'art/moon-fox-reimagined-avatar.webp', 'art/moon-fox-reimagined-blink.webp', 'art/moon-fox-reimagined-speak.webp',
  'art/moon-fox-cloud-trail.webp', 'art/moon-fox-study-wide.webp', 'art/moon-fox-study-mobile.webp',
  'art/earthfire-sovereign.webp', 'art/earthfire-sovereign-avatar.webp', 'art/earthfire-sovereign-blink.webp', 'art/earthfire-sovereign-speak.webp',
  'art/earthfire-flame-seat.webp', 'art/earthfire-hall-wide.webp', 'art/earthfire-hall-mobile.webp', 'art/earthfire-runes.webp', 'art/earthfire-rune-seal.webp',
  'art/yuchen-empress.webp', 'art/yuchen-empress-avatar.webp', 'art/yuchen-empress-blink.webp', 'art/yuchen-empress-speak.webp',
  'art/yuchen-hall-wide.webp', 'art/yuchen-hall-mobile.webp',
  'art/qinglan-renewed.webp', 'art/qinglan-renewed-avatar.webp', 'art/qinglan-renewed-blink.webp', 'art/qinglan-renewed-speak.webp',
  'art/qinglan-room-wide.webp', 'art/qinglan-room-mobile.webp', 'art/qinglan-sword.webp',
  'art/xingling-renewed.webp', 'art/xingling-renewed-avatar.webp', 'art/xingling-renewed-blink.webp', 'art/xingling-renewed-speak.webp',
  'art/xingling-room-wide.webp', 'art/xingling-room-mobile.webp', 'art/xingling-fan.webp',
  'art/luye.webp', 'art/luye-avatar.webp', 'art/luye-blink.webp', 'art/luye-speak.webp',
  'art/luye-room-wide.webp', 'art/luye-room-mobile.webp', 'art/luye-turntable.svg', 'art/luye-vinyl.svg',
  'art/suyan.webp', 'art/suyan-avatar.webp', 'art/suyan-blink.webp', 'art/suyan-speak.webp',
  'art/suyan-room-wide.webp', 'art/suyan-room-mobile.webp', 'art/suyan-camera.svg',
  'art/rongrong.webp', 'art/rongrong-avatar.webp', 'art/rongrong-blink.webp', 'art/rongrong-speak.webp',
  'art/rongrong-room-wide.webp', 'art/rongrong-room-mobile.webp', 'art/rongrong-pawbell.webp',
  'art/zhiya.webp', 'art/zhiya-avatar.webp', 'art/zhiya-blink.webp', 'art/zhiya-speak.webp',
  'art/zhiya-room-wide.webp', 'art/zhiya-room-mobile.webp', 'art/zhiya-crane.webp',
  'art/awakening-scroll.webp', 'art/awakening-fox-fan.webp', 'art/awakening-phoenix-wing.webp',
];

self.addEventListener('install', (e) => {
  e.waitUntil((async () => {
    const cache = await caches.open(CACHE);
    // Never replace a working offline version unless the new HTML is available.
    await cache.add(BASE);
    await Promise.all(OPTIONAL_ASSETS.map(async (asset) => {
      const url = BASE + asset;
      try {
        await cache.add(url);
      } catch {
        // Keep a previous offline copy if a nonessential asset is unavailable.
        const previous = await caches.match(url);
        if (previous) await cache.put(url, previous);
      }
    }));
    await self.skipWaiting();
  })());
});

self.addEventListener('activate', (e) => {
  e.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter((key) => key.startsWith('wenda-cache-') && key !== CACHE).map((key) => caches.delete(key)));
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== location.origin) return; // 只缓存本站，AI API 等外部请求不碰

  // HTML: never replace a usable offline page with an error response.
  if (req.mode === 'navigate') {
    const network = fetch(req);
    e.waitUntil(network.then((res) => {
      if (res.ok) {
        const copy = res.clone();
        return caches.open(CACHE).then((cache) => cache.put(BASE, copy));
      }
    }).catch(() => {}));
    e.respondWith(network.then((res) => {
      if (res.ok) return res;
      return caches.match(BASE).then((hit) => hit || res);
    }).catch(() => caches.match(BASE)));
    return;
  }

  const basePath = new URL(BASE, self.location.href).pathname;
  const relativePath = url.pathname.startsWith(basePath) ? url.pathname.slice(basePath.length) : '';

  // Vite's development modules and styles reuse URLs as files change. Never
  // serve them from CacheStorage; a stale module can break a newly loaded page.
  if (/^(?:src\/|@vite\/|@id\/|node_modules\/\.vite\/)/.test(relativePath)) return;

  // Artwork keeps readable, un-hashed names. Prefer fresh artwork online while
  // keeping the pre-cached copy available for offline use.
  if (relativePath.startsWith('art/')) {
    const network = fetch(req);
    e.waitUntil(network.then((res) => {
      if (res && res.ok && res.type === 'basic') {
        const copy = res.clone();
        return caches.open(CACHE).then((c) => c.put(req, copy));
      }
    }).catch(() => {}));
    e.respondWith(network.then((res) => {
      if (res.ok) return res;
      return caches.match(req).then((hit) => hit || res);
    }).catch(() => caches.match(req)));
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
