import { createContext, useCallback, useContext, useEffect, useState } from 'react'
import { X, ShieldCheck, QrCode, CreditCard, Clock, Check, MessageCircle } from 'lucide-react'
import { montarPedido, processarPagamento, registrarInicioCheckout, temUpsell } from '../lib/checkout.js'
import { formatarBRL } from '../lib/util.js'
import { useStore } from '../lib/store.jsx'
import { UPSELL_EBOOKS } from '../data/planos.js'
import { COMBO_EBOOKS, EBOOKS } from '../data/ebooks.js'
import { WHATSAPP_SUPORTE } from '../data/config.js'
import EbookCapa from './EbookCapa.jsx'

const Ctx = createContext(() => {})
export const useCheckout = () => useContext(Ctx)

export function CheckoutProvider({ children }) {
  const [idProduto, setIdProduto] = useState(null)
  const abrir = useCallback((id) => setIdProduto(id), [])
  return (
    <Ctx.Provider value={abrir}>
      {children}
      {idProduto && <JanelaCheckout idProduto={idProduto} fechar={() => setIdProduto(null)} />}
    </Ctx.Provider>
  )
}

function JanelaCheckout({ idProduto, fechar }) {
  const { usuario, liberarCompra } = useStore()
  const [comUpsell, setComUpsell] = useState(false)
  const [etapa, setEtapa] = useState('resumo') // resumo | processando | em_breve
  const pedido = montarPedido(idProduto, { comUpsell })

  useEffect(() => {
    registrarInicioCheckout(montarPedido(idProduto))
    const esc = (e) => e.key === 'Escape' && fechar()
    window.addEventListener('keydown', esc)
    document.body.style.overflow = 'hidden'
    return () => {
      window.removeEventListener('keydown', esc)
      document.body.style.overflow = ''
    }
  }, [idProduto, fechar])

  const pagar = async () => {
    setEtapa('processando')
    const r = await processarPagamento(pedido, usuario)
    if (r.status === 'aprovado') {
      liberarCompra(pedido)
      fechar()
    } else if (r.status === 'pendente' && r.linkPagamento) {
      window.location.href = r.linkPagamento
    } else {
      setEtapa('em_breve')
    }
  }

  const msgWhats = encodeURIComponent(`Oi! Quero garantir: ${pedido.itens.map((i) => i.nome).join(' + ')} (total ${formatarBRL(pedido.total)}).`)

  return (
    <div
      className="fixed inset-0 z-[60] flex items-end justify-center bg-navy-950/70 backdrop-blur-sm sm:items-center"
      onClick={fechar}
      role="dialog"
      aria-modal="true"
      aria-label="Resumo do pedido"
    >
      <div
        className="max-h-[92vh] w-full max-w-md animate-fade-up overflow-y-auto rounded-t-3xl bg-white p-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] text-navy shadow-2xl sm:rounded-3xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-extrabold">Resumo do pedido</h2>
          <button onClick={fechar} className="rounded-full p-2 hover:bg-navy-50" aria-label="Fechar">
            <X className="h-5 w-5" />
          </button>
        </div>

        <ul className="space-y-2">
          {pedido.itens.map((item) => (
            <li key={item.id} className="flex items-start justify-between gap-3 rounded-2xl bg-navy-50 p-3">
              <span className="text-sm font-semibold">{item.nome}</span>
              <span className="shrink-0 text-right">
                {item.precoDe && <span className="block text-xs text-navy/50 line-through">{formatarBRL(item.precoDe)}</span>}
                <span className="font-bold">{formatarBRL(item.preco)}</span>
              </span>
            </li>
          ))}
        </ul>

        {temUpsell(idProduto) && (
          <label
            className={`mt-3 flex cursor-pointer items-center gap-3 rounded-2xl border-2 border-dashed p-3 transition ${comUpsell ? 'border-emerald-500 bg-emerald-50' : 'border-energia bg-energia-50'}`}
          >
            <input type="checkbox" className="h-5 w-5 shrink-0 accent-emerald-600" checked={comUpsell} onChange={(e) => setComUpsell(e.target.checked)} />
            <span className="flex -space-x-4">
              {EBOOKS.map((e) => (
                <span key={e.id} className="w-9">
                  <EbookCapa ebook={e} mini />
                </span>
              ))}
            </span>
            <span className="min-w-0 text-sm">
              <span className="block font-bold">Adicionar o Combo de E-books por + {formatarBRL(UPSELL_EBOOKS.preco)}</span>
              <span className="text-xs text-navy/60">
                3 e-books que custariam <s>{formatarBRL(COMBO_EBOOKS.precoDe)}</s>. Só nesta tela!
              </span>
            </span>
          </label>
        )}

        <div className="mt-4 flex items-center justify-between border-t border-navy/10 pt-4">
          <span className="font-semibold text-navy/70">Total</span>
          <span className="text-2xl font-extrabold">{formatarBRL(pedido.total)}</span>
        </div>
        <p className="mt-1 text-right text-xs text-navy/60">Pagamento único • sem mensalidade</p>

        <div className={`mt-4 rounded-2xl p-4 ${etapa === 'em_breve' ? 'animate-pop bg-energia' : 'bg-energia-50 ring-1 ring-energia'}`}>
          <p className="flex items-center gap-2 font-bold">
            <Clock className="h-5 w-5 shrink-0" /> Pagamento em breve (Pix e cartão)
          </p>
          <p className="mt-1 text-sm text-navy/80">
            {etapa === 'em_breve'
              ? 'Estamos finalizando o pagamento online. Enquanto isso, garanta seu acesso pelo WhatsApp com esse mesmo preço!'
              : 'O pagamento online está sendo ativado. Você poderá pagar com Pix ou cartão de crédito.'}
          </p>
          <div className="mt-2 flex gap-3 text-xs font-semibold text-navy/70">
            <span className="flex items-center gap-1">
              <QrCode className="h-4 w-4" /> Pix
            </span>
            <span className="flex items-center gap-1">
              <CreditCard className="h-4 w-4" /> Cartão
            </span>
            <span className="flex items-center gap-1">
              <ShieldCheck className="h-4 w-4" /> Compra segura
            </span>
          </div>
        </div>

        {etapa === 'em_breve' ? (
          <a href={`${WHATSAPP_SUPORTE}?text=${msgWhats}`} target="_blank" rel="noreferrer" className="btn mt-4 w-full bg-[#25D366] text-white">
            <MessageCircle className="h-5 w-5" /> Garantir pelo WhatsApp
          </a>
        ) : (
          <button onClick={pagar} disabled={etapa === 'processando'} className="btn btn-primario mt-4 w-full">
            {etapa === 'processando' ? (
              'Processando...'
            ) : (
              <>
                <Check className="h-5 w-5" /> Pagar com Pix ou cartão
              </>
            )}
          </button>
        )}
        <button onClick={fechar} className="mt-2 w-full py-2 text-sm font-semibold text-navy/60">
          Continuar estudando
        </button>
      </div>
    </div>
  )
}
