import { SiteFooter, SiteHeader } from '@/components/SiteChrome';
import { Badge } from '@/components/ui';

// Transparência: o que funciona de verdade, o que é local, o que é simulado e o
// que ainda não foi implementado.

type S = 'funcional' | 'local' | 'simulado' | 'pendente';
const ROWS: { area: string; item: string; status: S; detail: string }[] = [
  { area: 'Ambiente 3D', item: 'Pavilhão, estandes, telões, sinalização e palco', status: 'funcional', detail: 'Three.js/WebGL, gerado proceduralmente a partir dos dados das marcas.' },
  { area: 'Ambiente 3D', item: 'Primeira pessoa: teclado/mouse e toque', status: 'funcional', detail: 'WASD/setas + Pointer Lock; joystick virtual e arrastar para olhar no celular.' },
  { area: 'Ambiente 3D', item: 'Modelos 3D próprios das marcas (GLB)', status: 'pendente', detail: 'Hoje as embalagens são procedurais; upload de GLB por marca está previsto.' },
  { area: 'Multiusuário', item: 'Presença de visitantes e vendedores', status: 'local', detail: 'Funciona entre abas do mesmo navegador (BroadcastChannel). Servidor de tempo real (WebSocket/Colyseus/LiveKit) pendente.' },
  { area: 'Voz', item: 'Microfone, permissões e chamada de voz', status: 'funcional', detail: 'Áudio real via WebRTC entre visitante e vendedor humano.' },
  { area: 'Voz', item: 'Voz pela internet (STUN/TURN/SFU)', status: 'pendente', detail: 'Sem servidores STUN/TURN e sinalização em rede, a chamada só conecta no mesmo dispositivo/rede local.' },
  { area: 'Comércio', item: 'Catálogo, carrinho e pedidos por marca', status: 'local', detail: 'Pedidos gravados no armazenamento deste navegador e exibidos no painel da marca.' },
  { area: 'Comércio', item: 'Pagamento', status: 'simulado', detail: 'Nenhuma cobrança. Gateway com split para a marca: pendente.' },
  { area: 'Comércio', item: 'Envio do pedido ao sistema da marca (ERP/e-commerce)', status: 'pendente', detail: 'Webhook/integração com VTEX, Shopify, Nuvemshop etc.' },
  { area: 'Comércio', item: 'Frete e consulta de CEP', status: 'simulado', detail: 'Regra fixa de demonstração.' },
  { area: 'Contas', item: 'Login de empresas e administrador', status: 'simulado', detail: 'Escolha de conta sem senha. Isolamento por empresa aplicado na camada de dados; autenticação real e RLS no servidor: pendentes.' },
  { area: 'Dados', item: 'Persistência', status: 'local', detail: 'localStorage do navegador. Esquema SQL de produção em docs/schema.sql.' },
  { area: 'Dados', item: 'Upload de logotipos e imagens', status: 'local', detail: 'Imagens redimensionadas e salvas no navegador. Storage em nuvem: pendente.' },
  { area: 'Gestão', item: 'Temporadas, programação, horários, patrocínios, monetização', status: 'funcional', detail: 'Configuração completa no painel administrativo (dados locais).' },
  { area: 'Gestão', item: 'Cobrança das marcas, patrocinadores e anunciantes', status: 'pendente', detail: 'Valores configuráveis; faturamento/nota fiscal não implementados.' },
  { area: 'Métricas', item: 'Visitas, produtos vistos, chamadas, carrinho, pedidos', status: 'local', detail: 'Eventos reais registrados neste navegador. Analytics centralizado: pendente.' },
];

const tone: Record<S, 'green' | 'blue' | 'amber' | 'red'> = { funcional: 'green', local: 'blue', simulado: 'amber', pendente: 'red' };
const label: Record<S, string> = { funcional: 'Funcional', local: 'Funcional em modo local', simulado: 'Simulado', pendente: 'Não implementado' };

export default function StatusPage() {
  return (
    <div className="min-h-screen">
      <SiteHeader />
      <div className="mx-auto max-w-5xl px-4 py-12 sm:px-6">
        <p className="eyebrow">Transparência do protótipo</p>
        <h1 className="mt-2 font-display text-5xl font-bold uppercase">Status das integrações</h1>
        <p className="mt-2 max-w-2xl text-zinc-400">Este MVP demonstra a experiência completa. Abaixo, o que já funciona de verdade e o que depende de integrações futuras.</p>
        <div className="mt-6 flex flex-wrap gap-2">{(Object.keys(label) as S[]).map((s) => <Badge key={s} tone={tone[s]}>{label[s]}</Badge>)}</div>
        <div className="card mt-6 overflow-x-auto">
          <table className="w-full min-w-[700px]">
            <thead><tr><th className="table-head">Área</th><th className="table-head">Recurso</th><th className="table-head">Status</th><th className="table-head">Detalhes</th></tr></thead>
            <tbody>
              {ROWS.map((r) => (
                <tr key={r.item}>
                  <td className="table-cell text-zinc-500">{r.area}</td>
                  <td className="table-cell font-medium text-white">{r.item}</td>
                  <td className="table-cell"><Badge tone={tone[r.status]}>{label[r.status]}</Badge></td>
                  <td className="table-cell text-zinc-400">{r.detail}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      <SiteFooter />
    </div>
  );
}
