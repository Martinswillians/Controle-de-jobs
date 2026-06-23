// ═══════════════════════════════════════════════
// Service Worker — Controle de Job (Atualizado)
// ═══════════════════════════════════════════════
// Mude essa versão sempre que fizer uma grande atualização no código do app
const CACHE_NAME = "jobcontrol-v3.2";
const STATIC_ASSETS = [
  "./",
  "./index.html",
  "./css/style.css",
  "./js/app.js",
  "./js/firebase-config.js",
  "./js/clients.js",
  "./js/access.js",
  "./manifest.json",
  "./favicon.ico",
  "./assets/icon-192.png",
  "./assets/icon-512.png"
];
// Instalação: Salva os arquivos estáticos no cache inicial
self.addEventListener("install", e => {
  e.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(STATIC_ASSETS))
      .catch(err => console.warn("SW cache install warning:", err))
  );
  self.skipWaiting(); // Força o SW novo a se tornar ativo imediatamente
});
// Ativação: Limpa caches antigos de versões anteriores automaticamente
self.addEventListener("activate", e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k))
      )
    )
  );
  self.clients.claim(); // Assume o controle da página imediatamente
});
// Intercepção de requisições: Estratégia Stale-While-Revalidate
self.addEventListener("fetch", e => {
  // Ignora chamadas do Firebase/APIs externas para rodarem direto da rede
  if (
    e.request.url.includes("firebase") ||
    e.request.url.includes("googleapis") ||
    e.request.url.includes("gstatic") ||
    e.request.method !== "GET"
  ) {
    return;
  }
  e.respondWith(
    caches.open(CACHE_NAME).then(cache => {
      return cache.match(e.request).then(cachedResponse => {
        // Dispara a busca na rede em segundo plano para atualizar o cache
        const fetchPromise = fetch(e.request).then(networkResponse => {
          if (networkResponse.status === 200) {
            cache.put(e.request, networkResponse.clone());
          }
          return networkResponse;
        }).catch(() => {
          // Falha silenciosa se estiver offline
        });
        // Retorna o que estava no cache imediatamente (velocidade), ou aguarda a rede se não houver cache
        return cachedResponse || fetchPromise;
      });
    })
  );
});
