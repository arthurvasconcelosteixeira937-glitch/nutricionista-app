// Envia eventos para o Pixel do Meta, se ele estiver ativo no index.html.
// Se o Pixel não estiver configurado, não faz nada (e não dá erro).
export function rastrear(evento, dados) {
  try {
    if (typeof window.fbq === 'function') window.fbq('track', evento, dados)
  } catch {
    /* ignora */
  }
}
