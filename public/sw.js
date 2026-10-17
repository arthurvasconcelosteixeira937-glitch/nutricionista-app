// Service worker mínimo do CobroSeguro.
// Não guarda páginas em cache (os status de pagamento precisam ser sempre reais);
// só existe para o app ser instalável e mostrar uma tela amigável sem internet.
const OFFLINE_HTML = `<!doctype html><html lang="es-MX"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Sin conexión</title><body style="font-family:system-ui;padding:2rem;text-align:center;color:#0f172a">
<h1>Sin conexión</h1><p>Revisa tu internet e intenta de nuevo.</p></body></html>`;

self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (event) => event.waitUntil(self.clients.claim()));
self.addEventListener("fetch", (event) => {
  if (event.request.mode !== "navigate") return;
  event.respondWith(
    fetch(event.request).catch(() => new Response(OFFLINE_HTML, { headers: { "Content-Type": "text/html; charset=utf-8" } })),
  );
});
