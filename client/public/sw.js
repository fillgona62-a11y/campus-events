/**
 * Service Worker（F10）：版本化缓存 + activate 清旧缓存 +
 * 导航请求 network-first + 静态资源 stale-while-revalidate。
 *
 * 版本管理：CACHE 常量改名即升级（campus-events-v1 → v2）。
 * 每次发版评估是否需要 bump：前端有非 hash 资源变更时必须 bump。
 */
const CACHE = 'campus-events-v1';

// 安装时预缓存应用外壳（离线时避免白屏）
const PRECACHE_URLS = ['/', '/index.html', '/manifest.webmanifest', '/icons/icon-192.png', '/icons/icon-512.png'];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(CACHE)
      .then((cache) => cache.addAll(PRECACHE_URLS))
      .catch(() => {}) // 预缓存失败不阻塞安装
      .then(() => self.skipWaiting())
  );
});

// 激活时清理旧版本缓存（防“改了代码用户看不到”）
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((key) => key !== CACHE).map((key) => caches.delete(key))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;

  // 只处理 GET；非 GET（POST 等 API 写操作）一律直连网络
  if (request.method !== 'GET') return;

  const url = new URL(request.url);

  // 导航请求（页面切换）：network-first，失败回退缓存（保证 HTML 常新）
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((response) => {
          const copy = response.clone();
          caches.open(CACHE).then((cache) => cache.put(request, copy));
          return response;
        })
        .catch(() => caches.match(request).then((cached) => cached || caches.match('/index.html')))
    );
    return;
  }

  // API 请求不走 SW 缓存（避免缓存接口数据）
  if (url.pathname.startsWith('/api') || url.pathname.startsWith('/uploads')) return;

  // 静态资源（带 hash 的 js/css/图标等）：stale-while-revalidate
  if (['style', 'script', 'image', 'font'].includes(request.destination)) {
    event.respondWith(
      caches.match(request).then((cached) => {
        const network = fetch(request)
          .then((response) => {
            if (response && response.status === 200) {
              const copy = response.clone();
              caches.open(CACHE).then((cache) => cache.put(request, copy));
            }
            return response;
          })
          .catch(() => cached);
        return cached || network;
      })
    );
  }
});
