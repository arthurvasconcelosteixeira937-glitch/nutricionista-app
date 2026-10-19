// Service worker simples: guarda o app no aparelho para abrir rápido e funcionar offline.
const CACHE = 'reta-final-v1'

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(['./', './index.html', './manifest.webmanifest', './favicon.svg'])))
  self.skipWaiting()
})

self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys().then((ks) => Promise.all(ks.filter((k) => k !== CACHE).map((k) => caches.delete(k)))))
  self.clients.claim()
})

self.addEventListener('fetch', (e) => {
  const req = e.request
  if (req.method !== 'GET' || !req.url.startsWith('http')) return
  // Páginas: tenta a rede primeiro (pega atualizações), cai no cache se estiver offline.
  if (req.mode === 'navigate') {
    e.respondWith(
      fetch(req)
        .then((res) => {
          const copia = res.clone()
          caches.open(CACHE).then((c) => c.put('./index.html', copia))
          return res
        })
        .catch(() => caches.match('./index.html')),
    )
    return
  }
  // Arquivos (JS, CSS, imagens, fontes): cache primeiro, depois rede.
  e.respondWith(
    caches.match(req).then(
      (hit) =>
        hit ||
        fetch(req).then((res) => {
          if (res.ok || res.type === 'opaque') {
            const copia = res.clone()
            caches.open(CACHE).then((c) => c.put(req, copia))
          }
          return res
        }),
    ),
  )
})
