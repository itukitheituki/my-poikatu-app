// PUZZLEポイ Service Worker v1.0
const CACHE_NAME = "puzzlepoi-v1";
const STATIC_ASSETS = [
  "./",
  "./index.html",
  "./manifest.json",
  "https://fonts.googleapis.com/css2?family=Fredoka+One&family=Kosugi+Maru&display=swap",
];

// インストール：静的ファイルをキャッシュ
self.addEventListener("install", event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      return cache.addAll(STATIC_ASSETS).catch(e => {
        console.log("Cache addAll partial error (ok):", e);
      });
    })
  );
  self.skipWaiting();
});

// アクティベート：古いキャッシュを削除
self.addEventListener("activate", event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// フェッチ：Network First（オフライン時はキャッシュ）
self.addEventListener("fetch", event => {
  // Firebase・外部APIはキャッシュしない
  const url = event.request.url;
  if (
    url.includes("firestore.googleapis.com") ||
    url.includes("firebase") ||
    url.includes("line.me") ||
    url.includes("liff.line") ||
    url.includes("googleapis.com/identitytoolkit")
  ) {
    return; // ネットワークに任せる
  }

  event.respondWith(
    fetch(event.request)
      .then(response => {
        // 成功したレスポンスをキャッシュに保存
        if (response && response.status === 200 && response.type === "basic") {
          const clone = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
        }
        return response;
      })
      .catch(() => {
        // オフライン時はキャッシュから返す
        return caches.match(event.request).then(cached => {
          if (cached) return cached;
          // キャッシュもなければindex.htmlを返す（SPA対応）
          if (event.request.destination === "document") {
            return caches.match("./index.html");
          }
        });
      })
  );
});
