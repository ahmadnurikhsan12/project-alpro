/* MathQuest service worker
 * - Aset statis Next.js (/_next/static, ikon): cache-first (nama file sudah ber-hash).
 * - Halaman: network-first, cadangan dari cache bila offline, lalu halaman offline mandiri.
 * - API (/api, /auth) TIDAK pernah di-cache: penilaian & data selalu dari server.
 *
 * Halaman offline cadangan berupa HTML MANDIRI yang dibuat di sini (bukan halaman Next.js):
 * jika halaman Next.js disajikan pada URL lain, hidrasinya gagal dan siswa melihat halaman galat.
 */
const VERSION = "mq-v2";
const STATIC_CACHE = `${VERSION}-static`;
const PAGE_CACHE = `${VERSION}-pages`;
const PRECACHE = ["/icons/icon-192.png", "/icons/icon-512.png"];

const OFFLINE_HTML = `<!doctype html><html lang="id"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Sedang offline · MathQuest</title><style>body{margin:0;min-height:100vh;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:12px;padding:16px;text-align:center;font-family:system-ui,sans-serif;background:#f8fafc;color:#0f172a}h1{font-size:1.5rem;margin:0}p{max-width:24rem;color:#475569;margin:0;line-height:1.5}a{display:inline-block;margin-top:8px;padding:10px 18px;border-radius:12px;background:#2546ea;color:#fff;text-decoration:none;font-weight:600}</style></head><body><main><h1>Kamu sedang offline</h1><p>Halaman ini belum tersimpan di perangkat. Halaman yang pernah kamu buka sebelumnya tetap bisa dibuka. Progres belajarmu tetap aman.</p><a href="/dashboard">Coba lagi</a></main></body></html>`;

function offlineResponse() {
  return new Response(OFFLINE_HTML, { status: 503, headers: { "Content-Type": "text/html; charset=utf-8" } });
}

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(PAGE_CACHE).then((c) => c.addAll(PRECACHE)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => !k.startsWith(VERSION)).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;
  if (url.pathname.startsWith("/api/") || url.pathname.startsWith("/auth/")) return;

  if (url.pathname.startsWith("/_next/static/") || url.pathname.startsWith("/icons/")) {
    event.respondWith(
      caches.open(STATIC_CACHE).then(async (cache) => {
        const hit = await cache.match(req);
        if (hit) return hit;
        const res = await fetch(req);
        if (res.ok) cache.put(req, res.clone());
        return res;
      }),
    );
    return;
  }

  if (req.mode === "navigate") {
    event.respondWith(
      fetch(req)
        .then((res) => {
          if (res.ok) {
            const copy = res.clone();
            // waitUntil: tanpa ini, service worker dapat dihentikan sebelum penyimpanan cache selesai
            event.waitUntil(caches.open(PAGE_CACHE).then((c) => c.put(url.pathname, copy)));
          }
          return res;
        })
        .catch(async () => (await caches.match(url.pathname)) || offlineResponse()),
    );
  }
});
