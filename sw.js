/* 321聖經講義 — Service Worker（多書卷）
   目標：第一次連線之後，完全離線可用。
   策略：App 殼採 network-first（確保更新拿得到），失敗時回退快取；
         圖示等靜態檔採 cache-first。 */

const VERSION = 'fdba6660ca83';
const CACHE = '321bible-' + VERSION;

/* 由 src/build.py 依 books.json 自動產生 —— 不要手改 */
const SHELL = ["./", "./index.html", "./sc.html", "./icon-512.png"];

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE)
      .then(c => c.addAll(SHELL))
      .then(() => self.skipWaiting())
      .catch(() => self.skipWaiting())
  );
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;

  const url = new URL(req.url);
  if (url.origin !== location.origin) return;

  const isDoc = req.mode === 'navigate' || url.pathname.endsWith('/') || url.pathname.endsWith('.html');

  if (isDoc) {
    // network-first：有網路就拿最新的，沒網路就用快取
    e.respondWith(
      fetch(req)
        .then(res => {
          // 只快取成功且完整的回應，避免把部署中的 404 或空回應存起來
          if (res && res.ok && res.status === 200 && res.type !== 'opaque'){
            const copy = res.clone();
            caches.open(CACHE).then(c => c.put(req, copy)).catch(() => {});
          }
          return res;
        })
        .catch(() => caches.match(req).then(r => r || caches.match('./index.html')))
    );
    return;
  }

  // cache-first：圖示等靜態資源
  e.respondWith(
    caches.match(req).then(hit =>
      hit || fetch(req).then(res => {
        if (res && res.ok && res.status === 200){
          const copy = res.clone();
          caches.open(CACHE).then(c => c.put(req, copy)).catch(() => {});
        }
        return res;
      }).catch(() => hit)
    )
  );
});

// 讓網頁可以主動要求立即更新
self.addEventListener('message', e => {
  if (e.data === 'skipWaiting') self.skipWaiting();
});
