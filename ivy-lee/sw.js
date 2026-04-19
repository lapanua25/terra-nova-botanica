const CACHE_NAME = 'ivy-lee-cache-v10';
const urlsToCache = [
  './',
  './index.html',
  './styles.css',
  './app.js',
  './manifest.json',
  './icon.svg'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        return cache.addAll(urlsToCache);
      })
  );
});

// 新しいキャッシュがインストールされた後に、古いキャッシュを削除する
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheName !== CACHE_NAME) {
            console.log('Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
});

self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request)
      .then(response => {
        // キャッシュに存在する場合はキャッシュを返す
        if (response) {
          return response;
        }
        // そうでなければネットワークリクエスト
        return fetch(event.request).catch(() => {
          // オフライン時にリクエスト失敗した場合は何もしない（画面は維持される）
          console.error('Offline fetch failed');
        });
      })
  );
});
