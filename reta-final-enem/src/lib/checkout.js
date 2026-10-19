// ============================================================================
//  CHECKOUT – ponto ÚNICO para ligar o pagamento (Pix e cartão) no futuro.
// ============================================================================
//  Como funciona hoje:
//    1) Qualquer botão de compra chama `abrirCheckout(idDoProduto)` (via useCheckout()).
//    2) A janela mostra o resumo do pedido e o total (montado por `montarPedido`).
//    3) O botão "Pagar" chama `processarPagamento(pedido)`, que por enquanto
//       só responde { status: 'em_breve' } → a janela mostra "Pagamento em breve".
//
//  Para ligar o pagamento de verdade (ex.: Mercado Pago, Stripe, Pagar.me, Asaas):
//    - Troque o corpo de `processarPagamento` para criar a cobrança no seu
//      gateway e redirecionar para o link de pagamento (ou mostrar o QR Pix).
//    - Quando o pagamento for confirmado, chame `liberarCompra(pedido)` do store
//      (useStore) para liberar o plano/e-books no aparelho do aluno.
// ============================================================================
import { PLANOS, UPSELL_EBOOKS } from '../data/planos.js'
import { EBOOKS, COMBO_EBOOKS } from '../data/ebooks.js'
import { rastrear } from './pixel.js'

const TODOS_EBOOKS = EBOOKS.map((e) => e.id)

// Catálogo de tudo que pode ser comprado.
export function produtoPorId(id) {
  const plano = PLANOS.find((p) => p.id === id && p.preco > 0)
  if (plano) {
    return { id: plano.id, tipo: 'plano', nome: `Plano ${plano.nome}`, preco: plano.preco, precoDe: plano.precoDe, ebooks: plano.id === 'combo' ? TODOS_EBOOKS : [] }
  }
  const ebook = EBOOKS.find((e) => e.id === id)
  if (ebook) return { id: ebook.id, tipo: 'ebook', nome: `E-book: ${ebook.titulo}`, preco: ebook.preco, precoDe: null, ebooks: [ebook.id] }
  if (id === COMBO_EBOOKS.id) return { id, tipo: 'ebook', nome: COMBO_EBOOKS.titulo, preco: COMBO_EBOOKS.preco, precoDe: COMBO_EBOOKS.precoDe, ebooks: TODOS_EBOOKS }
  if (id === UPSELL_EBOOKS.id) return { id, tipo: 'upsell', nome: UPSELL_EBOOKS.nome, preco: UPSELL_EBOOKS.preco, precoDe: COMBO_EBOOKS.precoDe, ebooks: TODOS_EBOOKS }
  return null
}

// O upsell de e-books aparece só na compra do plano Revisão Completa.
export const temUpsell = (idProduto) => idProduto === 'completo'

export function montarPedido(idProduto, { comUpsell = false } = {}) {
  const itens = [produtoPorId(idProduto)]
  if (comUpsell && temUpsell(idProduto)) itens.push(produtoPorId(UPSELL_EBOOKS.id))
  const total = Math.round(itens.reduce((t, i) => t + i.preco, 0) * 100) / 100
  return { itens, total, moeda: 'BRL' }
}

// Disparado quando a janela de compra abre (evento do Pixel do Meta).
export function registrarInicioCheckout(pedido) {
  rastrear('InitiateCheckout', {
    value: pedido.total,
    currency: pedido.moeda,
    content_ids: pedido.itens.map((i) => i.id),
    num_items: pedido.itens.length,
  })
}

// >>> AQUI ENTRA O PAGAMENTO REAL <<<
// Recebe o pedido e os dados do aluno. Deve retornar:
//   { status: 'aprovado' }  → libera o acesso
//   { status: 'pendente', linkPagamento, pixCopiaECola }  → mostra Pix / redireciona
//   { status: 'em_breve' }  → (hoje) só mostra o aviso
// eslint-disable-next-line no-unused-vars
export async function processarPagamento(pedido, usuario) {
  return { status: 'em_breve' }
}
