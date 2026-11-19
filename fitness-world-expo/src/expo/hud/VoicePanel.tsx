import { useEffect, useRef, useState } from 'react';
import { Mic, MicOff, PhoneOff, Send, ShieldCheck, Info } from 'lucide-react';
import type { CallState, VoiceCall } from '@/services/voice/voice';
import { Badge } from '@/components/ui';

export interface ChatLine { from: 'me' | 'peer'; text: string }

function Meter({ value, color }: { value: number; color: string }) {
  return (
    <div className="flex h-6 items-end gap-[3px]">
      {Array.from({ length: 14 }).map((_, i) => {
        const on = value * 14 > i;
        return <span key={i} className="w-[5px] rounded-sm transition-all" style={{ height: `${30 + i * 5}%`, background: on ? color : 'rgba(255,255,255,0.08)' }} />;
      })}
    </div>
  );
}

export function VoicePanel(props: {
  call: VoiceCall;
  state: CallState;
  info: string;
  peerName: string;
  peerSub: string;
  role: 'visitor' | 'seller';
  chat: ChatLine[];
  transportLabel: string;
  onClose: () => void;
}) {
  const { call, state } = props;
  const [lv, setLv] = useState({ local: 0, remote: 0 });
  const [muted, setMuted] = useState(call.muted);
  const [msg, setMsg] = useState('');
  const chatRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let raf = 0;
    const tick = () => {
      setLv(call.levels());
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [call]);

  useEffect(() => {
    chatRef.current?.scrollTo({ top: 99999 });
  }, [props.chat.length]);

  const active = state === 'ringing' || state === 'connecting' || state === 'connected';
  const label: Record<CallState, string> = {
    idle: 'Pronto',
    mic: 'Solicitando permissão do microfone…',
    ringing: 'Chamando o vendedor…',
    incoming: 'Chamada recebida',
    connecting: 'Conectando áudio…',
    connected: 'Conversa por voz ao vivo',
    ended: 'Chamada encerrada',
    error: 'Não foi possível conectar',
  };

  return (
    <div className="glass pointer-events-auto w-[min(380px,calc(100vw-24px))] overflow-hidden rounded-2xl shadow-2xl">
      <div className="flex items-center gap-3 border-b border-white/[0.06] px-4 py-3">
        <div className={`grid h-10 w-10 place-items-center rounded-full ${state === 'connected' ? 'bg-emerald-400/15 text-emerald-300 pulse-ring' : 'bg-white/5 text-zinc-300'}`}>
          <Mic size={18} />
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate font-semibold text-white">{props.peerName}</p>
          <p className="truncate text-xs text-zinc-400">{props.peerSub}</p>
        </div>
        <Badge tone={state === 'connected' ? 'green' : state === 'error' ? 'red' : 'zinc'}>{label[state]}</Badge>
      </div>

      <div className="space-y-3 px-4 py-3">
        {props.info && (state === 'ended' || state === 'error') && <p className="rounded-lg bg-white/[0.04] px-3 py-2 text-xs text-zinc-300">{props.info}</p>}
        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-xl bg-white/[0.03] p-3">
            <p className="mb-1 text-[11px] text-zinc-500">Seu microfone</p>
            <Meter value={lv.local} color="#e9c46a" />
          </div>
          <div className="rounded-xl bg-white/[0.03] p-3">
            <p className="mb-1 text-[11px] text-zinc-500">{props.role === 'visitor' ? 'Vendedor' : 'Visitante'}</p>
            <Meter value={lv.remote} color="#4ff0c8" />
          </div>
        </div>

        <div ref={chatRef} className="max-h-36 space-y-1.5 overflow-y-auto">
          {props.chat.map((c, i) => (
            <div key={i} className={`flex ${c.from === 'me' ? 'justify-end' : ''}`}>
              <span className={`max-w-[85%] rounded-xl px-3 py-1.5 text-sm ${c.from === 'me' ? 'bg-gold-400/15 text-gold-100' : 'bg-white/[0.06] text-zinc-100'}`}>{c.text}</span>
            </div>
          ))}
        </div>
        {active && (
          <form
            className="flex gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              call.sendChat(msg);
              setMsg('');
            }}
          >
            <input className="input py-2" placeholder="Mensagem de texto (opcional)" value={msg} onChange={(e) => setMsg(e.target.value)} />
            <button className="btn-ghost px-3" aria-label="Enviar"><Send size={16} /></button>
          </form>
        )}

        <div className="flex gap-2">
          {active ? (
            <>
              <button
                className="btn-ghost flex-1"
                onClick={() => {
                  call.setMuted(!muted);
                  setMuted(!muted);
                }}
              >
                {muted ? <MicOff size={16} /> : <Mic size={16} />} {muted ? 'Ativar microfone' : 'Silenciar'}
              </button>
              <button className="btn-danger flex-1" onClick={() => call.hangup()}>
                <PhoneOff size={16} /> Encerrar
              </button>
            </>
          ) : (
            <button className="btn-ghost flex-1" onClick={props.onClose}>Fechar</button>
          )}
        </div>
      </div>

      <div className="space-y-1 border-t border-white/[0.06] bg-black/20 px-4 py-2.5 text-[11px] leading-relaxed text-zinc-500">
        <p className="flex items-start gap-1.5"><ShieldCheck size={12} className="mt-0.5 shrink-0 text-emerald-400" /><span>Áudio real via WebRTC (ponto a ponto), com cancelamento de eco.</span></p>
        <p className="flex items-start gap-1.5"><Info size={12} className="mt-0.5 shrink-0 text-amber-300" /><span>Conexão: {props.transportLabel}. Chamadas pela internet exigem servidor de sinalização e TURN — <b className="text-amber-200">integração pendente</b>. Use fones para evitar microfonia.</span></p>
      </div>
    </div>
  );
}
