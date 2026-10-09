/*
 * Service worker do protótipo instalável (só entra no build do site — `yarn build:site`, ver
 * README > "Instalar como app"). Estratégia "rede primeiro": online sempre busca a versão nova
 * (nada de tela velha depois de publicar); a cópia guardada só é usada sem internet.
 */
const CACHE = 'lojao-prototipo-v1';

self.addEventListener('install', (event) => {
  // Já guarda a Home pra abrir mesmo sem internet na primeira vez.
  event.waitUntil(caches.open(CACHE).then((cache) => cache.add('/')));
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(keys.filter((key) => key !== CACHE).map((key) => caches.delete(key))),
      )
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);
  // Só o próprio site e só leitura; o resto (API, links externos) passa direto.
  if (request.method !== 'GET' || url.origin !== self.location.origin) return;

  event.respondWith(
    fetch(request)
      .then((response) => {
        if (response.ok) {
          const copy = response.clone();
          caches.open(CACHE).then((cache) => cache.put(request, copy));
        }
        return response;
      })
      .catch(async () => {
        const cached = await caches.match(request);
        if (cached) return cached;
        // Sem internet numa página que nunca foi aberta: mostra a Home guardada.
        if (request.mode === 'navigate') return caches.match('/');
        return Response.error();
      }),
  );
});
