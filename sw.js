const CACHE = 'apple-tracker-v1';

const PRECACHE = [
  './index.html',
  './manifest.json',
  './icon.svg',
  './icon-192.png',
  './icon-512.png',
  'https://www.gstatic.com/firebasejs/10.12.2/firebase-app-compat.js',
  'https://www.gstatic.com/firebasejs/10.12.2/firebase-auth-compat.js',
  'https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore-compat.js',
  'https://fonts.googleapis.com/css2?family=Jua&display=swap',
  'https://cdn.jsdelivr.net/gh/projectnoonnu/noonfonts_2205@1.0/HSGulTokkiL.woff2',
];

/* ── Install: 정적 파일 미리 캐싱 ── */
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE).then(cache =>
      Promise.allSettled(PRECACHE.map(url => cache.add(url)))
    ).then(() => self.skipWaiting())
  );
});

/* ── Activate: 이전 캐시 정리 ── */
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

/* ── Fetch 전략 ── */
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);

  /* Firebase / Google API → Network First (최신 데이터 우선) */
  const isFirebase =
    url.hostname.includes('firebaseio.com') ||
    url.hostname.includes('firestore.googleapis.com') ||
    url.hostname.includes('identitytoolkit.googleapis.com') ||
    url.hostname.includes('securetoken.googleapis.com');

  if (isFirebase) {
    event.respondWith(
      fetch(event.request).catch(() => caches.match(event.request))
    );
    return;
  }

  /* 나머지 → Cache First, 없으면 네트워크 후 캐싱 */
  event.respondWith(
    caches.match(event.request).then(cached => {
      if (cached) return cached;

      return fetch(event.request).then(response => {
        if (response && response.status === 200 && response.type !== 'opaque') {
          const clone = response.clone();
          caches.open(CACHE).then(cache => cache.put(event.request, clone));
        }
        return response;
      }).catch(() => {
        /* 오프라인 & 캐시 없음 → index.html 폴백 */
        if (event.request.mode === 'navigate') return caches.match('./index.html');
      });
    })
  );
});
