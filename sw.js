/* 321聖經講義 — Service Worker（多書卷）
   目標：第一次連線之後，完全離線可用。
   策略：App 殼採 network-first（確保更新拿得到），失敗時回退快取；
         圖示等靜態檔採 cache-first。 */

const V = 'fdba6660ca83-tri10171929-gxs1019-meet1020-gx1021c-hl8-vp1023-co1-gp1103-tts1103-au1103-xz1103-ls1103-xf1103-xm1103-vk1103-rf1105-pr1109-cp1109';
const SLUG = location.pathname.split('/')[1] || 'app';   /* 同一個 github.io 網域底下有很多 App，快取名稱與清理範圍都限定在自己這一個 */
const PFX = '321bible-' + SLUG + '-';
const CACHE = PFX + V;

/* 由 src/build.py 依 books.json 自動產生 —— 不要手改 */
const SHELL = ["./", "./index.html", "./sc.html", "./en.html", "./icon-512.png", "./xz2.js", "./coread.js", "./peerjs.min.js"];

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
      .then(keys => Promise.all(keys.filter(k => k.indexOf(PFX) === 0 && k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;

  const url = new URL(req.url);
  if (url.origin !== location.origin) return;

  const isDoc = req.mode === 'navigate' || url.pathname.endsWith('/') || /\.(html|js|json)$/i.test(url.pathname);   /* 網頁、程式、version.json 一律網路優先 */

  if (isDoc) {
    /* version.json 是更新偵測用的，不可拿快取先頂：維持原本「網路優先、離線才用快取」 */
    if (url.pathname.endsWith('/version.json')) {
      e.respondWith(
        fetch(req, { cache: 'no-store' })
          .then(res => {
            if (res && res.ok && res.status === 200 && res.type !== 'opaque'){
              const copy = res.clone();
              caches.open(CACHE).then(c => c.put(req, copy)).catch(() => {});
            }
            return res;
          })
          .catch(() => caches.match(req, { ignoreSearch: true }).then(r => r || new Response('{}', { headers: { 'Content-Type': 'application/json' } })))
      );
      return;
    }
    e.respondWith(shellFetch(req, req.mode === 'navigate'));
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

/* -rf1105（互動聖經 v2.58.3）：網頁與程式 network-first，但網路超過 SHELL_WAIT（1 秒）還沒回應，
   且「自己這一版」的快取裡有同一份，就先用快取開起來；網路那份繼續下載並更新快取。
   弱網路不必乾等。只有導覽請求才可以退回 index.html，程式檔絕不拿網頁頂替。
   快取只查自己這個 App 的 CACHE（同網域底下還有很多 App）。 */
const SHELL_WAIT = 1000;
async function shellFetch(req, nav) {
  const net = fetch(req, { cache: 'no-cache' }).then(res => {
    if (res && res.ok && res.status === 200 && res.type !== 'opaque') {
      const copy = res.clone();
      caches.open(CACHE).then(c => c.put(req, copy)).catch(() => {});
    }
    return res;
  });
  const own = () => caches.open(CACHE).then(c => c.match(req, { ignoreSearch: true }));
  try {
    const first = await Promise.race([net, new Promise(ok => setTimeout(() => ok(null), SHELL_WAIT))]);
    if (first) return first;
    const hit = await own();
    if (hit) { net.catch(() => {}); return hit; }
    return await net;
  } catch (err) {
    let hit = await own();
    if (!hit && nav) hit = await caches.match('./index.html');
    if (hit) return hit;
    throw err;
  }
}

// 讓網頁可以主動要求立即更新
self.addEventListener('message', e => {
  const d = e.data;
  if (d === 'skipWaiting' || d === 'skip' || (d && (d.type === 'SKIP_WAITING' || d.t === 'skip'))) self.skipWaiting();
});
