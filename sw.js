/* ═══════════════════════════════════════════════════════════════
   SERVICE WORKER ECOLIA — Cache app-shell + cours offline
   ═══════════════════════════════════════════════════════════════ */

const SHELL_CACHE = 'ecolia-shell-v1';
const COURS_CACHE = 'ecolia-cours-v1';

// Fichiers de l'app-shell (chargés au premier lancement)
const SHELL_FILES = [
  './',
  './index.html',
  './manifest.json',
  './icon-192.png',
  './icon-512.png'
];

// ───────────── INSTALL : cache l'app-shell ─────────────
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(SHELL_CACHE).then(cache => cache.addAll(SHELL_FILES))
  );
  self.skipWaiting();
});

// ───────────── ACTIVATE : nettoie les vieux caches ─────────────
self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(
      keys
        .filter(k => k !== SHELL_CACHE && k !== COURS_CACHE)
        .map(k => caches.delete(k))
    );
    await self.clients.claim();
  })());
});

// ───────────── FETCH : sert depuis cache, sinon réseau ─────────────
self.addEventListener('fetch', event => {
  const req = event.request;
  if (req.method !== 'GET') return;

  const url = new URL(req.url);

  // Requêtes vers ecolia-course.github.io → servir depuis cache si dispo
  if (url.hostname === 'ecolia-course.github.io') {
    event.respondWith((async () => {
      // 1. Cache des cours (prioritaire pour offline)
      const coursCache = await caches.open(COURS_CACHE);
      const cached = await coursCache.match(req, { ignoreSearch: true });
      if (cached) return cached;

      // 2. Sinon réseau, et on met en cache au passage
      try {
        const resp = await fetch(req);
        if (resp.ok) {
          coursCache.put(req, resp.clone());
        }
        return resp;
      } catch (e) {
        // 3. Hors ligne et pas en cache → réponse vide
        return new Response('', { status: 504 });
      }
    })());
    return;
  }

  // Requêtes locales (même origine) → app-shell
  event.respondWith((async () => {
    const cached = await caches.match(req);
    if (cached) return cached;
    try {
      return await fetch(req);
    } catch (e) {
      // Fallback vers index.html si navigation
      if (req.mode === 'navigate') {
        return caches.match('./index.html');
      }
      return new Response('', { status: 504 });
    }
  })());
});

// ───────────── MESSAGES depuis l'app ─────────────
self.addEventListener('message', event => {
  const { type, payload } = event.data || {};

  // Forcer la mise à jour du SW
  if (type === 'SKIP_WAITING') {
    self.skipWaiting();
  }

  // Supprimer un fichier du cache des cours
  if (type === 'DELETE_FROM_CACHE') {
    event.waitUntil((async () => {
      const coursCache = await caches.open(COURS_CACHE);
      await coursCache.delete(payload.url, { ignoreSearch: true });
      event.source.postMessage({ type: 'DELETE_DONE', payload });
    })());
  }
});
