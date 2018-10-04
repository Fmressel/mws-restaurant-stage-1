const CACHE_ID = 'cache-v2';
let cachedReviews = [];

self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE_ID).then(cache => {
    return cache.addAll([
      '/',
      'css/styles.css',
      'js/dbhelper.js',
      'js/idb.js',
      'js/main.js'
    ]);
  }));
  console.log('Service Worker installed!');
});

self.addEventListener('fetch', event => {
  const request = event.request,
        url = new URL(request.url);

  console.log(event);
  if(event.request.method === 'POST') {
  }

  if(url.origin !== location.origin) return;

  event.respondWith(
    caches.match(url).then(res => {
      if (res) return res;

      return caches.open(CACHE_ID).then(cache => {
        return fetch(request).then(fetchRes => {
          cache.put(url, fetchRes.clone());
          return fetchRes;
        });
      });
    })
  );
});