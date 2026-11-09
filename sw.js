/* ═══════════════════════════════════════════════════════════════
   SERVICE WORKER ECOLIA v2 — PWA uniquement (l'APK n'en a pas)
   - UNE seule copie de chaque fichier (clé sans « ?v=… », index.html = « / »)
   - Pages, JSON, JS, CSS : « stale-while-revalidate » → le cours s'ouvre tout de suite depuis le cache
     ET se met à jour en arrière-plan (la version fraîche s'affiche à l'ouverture suivante)
   - Audio / images : cache d'abord (noms de fichiers stables), requêtes « Range » (lecture audio) servies en 206
   - Pas de skipWaiting automatique : l'élève choisit la mise à jour (message SKIP_WAITING)
   ═══════════════════════════════════════════════════════════════ */

const CACHE = 'ecolia-cours-v1';   // MÊME nom qu'avant : les cours déjà téléchargés sont conservés
const SHELL_FILES = ['./', './index.html', './manifest.json', './icon-192.png', './icon-512.png'];

const isMedia = p => /\.(mp3|m4a|ogg|wav|jpe?g|png|webp|gif|svg|ico)$/i.test(p);

// clé unique d'un fichier : sans paramètres (?v=1), « / » = « /index.html »
function cleanKey(u) {
  const url = typeof u === 'string' ? new URL(u, self.registration.scope) : u;
  let p = url.pathname;
  if (p.endsWith('/')) p += 'index.html';
  return new Request(url.origin + p);
}

// ───────────── INSTALL : précache tolérant (un fichier absent ne bloque plus l'installation) ─────────────
self.addEventListener('install', event => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE);
    await Promise.all(SHELL_FILES.map(async f => {
      try {
        const u = new URL(f, self.registration.scope);
        const r = await fetch(u.href, { cache: 'reload' });
        if (r.ok) await cache.put(cleanKey(u), r);
      } catch (_) { /* hors ligne ou fichier absent : on continue */ }
    }));
  })());
});

// ───────────── ACTIVATE : supprime les anciens caches (dont ecolia-shell-v1, doublon) et dédoublonne ─────────────
self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    for (const k of await caches.keys()) {
      if (k !== CACHE) await caches.delete(k);
    }
    const cache = await caches.open(CACHE);
    for (const req of await cache.keys()) {
      const u = new URL(req.url);
      const key = cleanKey(u);
      if (key.url === req.url) continue;                      // déjà propre
      const resp = await cache.match(req);
      if (resp && !(await cache.match(key))) await cache.put(key, resp);   // on garde la copie (hors ligne)
      await cache.delete(req);                                // et on retire le doublon
    }
    await self.clients.claim();
  })());
});

// ───────────── FETCH ─────────────
self.addEventListener('fetch', event => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;            // autres sites : on ne touche à rien
  event.respondWith(isMedia(url.pathname) ? media(req, url) : page(event, url));
});

async function page(event, url) {
  const cache = await caches.open(CACHE);
  const key = cleanKey(url);
  const cached = await cache.match(key, { ignoreSearch: true });
  // 'no-cache' : revalide vraiment auprès du serveur (GitHub Pages garde sinon 10 minutes en cache HTTP)
  const refresh = fetch(url.href, { cache: 'no-cache', credentials: 'same-origin' })
    .then(r => { if (r.ok) { cache.put(key, r.clone()); } return r; })
    .catch(() => null);
  if (cached) {
    event.waitUntil(refresh);
    return cached;
  }
  const r = await refresh;
  if (r) return r;
  if (event.request.mode === 'navigate') {                    // hors ligne et page inconnue : on retombe sur l'accueil
    const home = await cache.match(cleanKey(new URL('./', self.registration.scope)));
    if (home) return home;
  }
  return new Response('', { status: 504 });
}

async function media(req, url) {
  const cache = await caches.open(CACHE);
  const key = cleanKey(url);
  const cached = await cache.match(key, { ignoreSearch: true });
  const range = req.headers.get('range');
  if (cached) return range ? partial(cached, range) : cached;
  if (range) return fetch(req).catch(() => new Response('', { status: 504 }));   // jamais de morceau en cache
  try {
    const r = await fetch(req);
    if (r.status === 200) cache.put(key, r.clone());
    return r;
  } catch (_) {
    return new Response('', { status: 504 });
  }
}

// réponse 206 découpée dans le fichier complet en cache (indispensable à la lecture audio, surtout sur iOS)
async function partial(cached, range) {
  const buf = await cached.arrayBuffer();
  const size = buf.byteLength;
  const m = /^bytes=(\d*)-(\d*)$/.exec(range.trim());
  if (!m || (m[1] === '' && m[2] === '')) return new Response(buf, { status: 200, headers: cached.headers });
  let start, end;
  if (m[1] === '') { start = Math.max(0, size - parseInt(m[2], 10)); end = size - 1; }
  else { start = parseInt(m[1], 10); end = m[2] === '' ? size - 1 : Math.min(parseInt(m[2], 10), size - 1); }
  if (start >= size || start > end) {
    return new Response('', { status: 416, headers: { 'Content-Range': 'bytes */' + size } });
  }
  return new Response(buf.slice(start, end + 1), {
    status: 206,
    statusText: 'Partial Content',
    headers: {
      'Content-Type': cached.headers.get('Content-Type') || 'audio/mpeg',
      'Content-Range': 'bytes ' + start + '-' + end + '/' + size,
      'Content-Length': String(end - start + 1),
      'Accept-Ranges': 'bytes'
    }
  });
}

// ───────────── MESSAGES depuis l'app ─────────────
self.addEventListener('message', event => {
  const { type, payload } = event.data || {};
  if (type === 'SKIP_WAITING') self.skipWaiting();
  if (type === 'DELETE_FROM_CACHE' && payload && payload.url) {
    event.waitUntil((async () => {
      const cache = await caches.open(CACHE);
      await cache.delete(cleanKey(payload.url), { ignoreSearch: true });
      if (event.source) event.source.postMessage({ type: 'DELETE_DONE', payload });
    })());
  }
});
