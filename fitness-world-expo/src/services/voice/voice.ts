import type { RealtimeTransport, SignalPayload } from '@/services/realtime/transport';

// ---------------------------------------------------------------------------
// Chamada de voz em tempo real via WebRTC (áudio real, microfone real).
//
// O que FUNCIONA no protótipo:
//   - Permissão e captura de microfone (getUserMedia) com cancelamento de eco.
//   - Conexão WebRTC ponto a ponto entre visitante e vendedor, com sinalização
//     pelo RealtimeTransport. Com o transporte local, funciona entre abas do
//     mesmo navegador/dispositivo.
//
// NÃO IMPLEMENTADO (necessário para uso pela internet):
//   - Servidor de sinalização em rede e servidores STUN/TURN.
//   - SFU/mídia gerenciada (ex.: LiveKit, Agora, Daily, Twilio) para escala,
//     gravação e moderação.
// ---------------------------------------------------------------------------

export type CallState = 'idle' | 'mic' | 'ringing' | 'incoming' | 'connecting' | 'connected' | 'ended' | 'error';

export interface CallEvents {
  state: (s: CallState, info?: string) => void;
  chat: (from: 'me' | 'peer', text: string) => void;
}

/** STUN/TURN: vazio = apenas candidatos locais (mesmo dispositivo/rede). */
export const ICE_SERVERS: RTCIceServer[] = [];

export class VoiceCall {
  state: CallState = 'idle';
  peerId: string | null = null;
  localStream: MediaStream | null = null;
  remoteStream: MediaStream | null = null;
  muted = false;
  private pc: RTCPeerConnection | null = null;
  private pendingIce: RTCIceCandidateInit[] = [];
  private audioEl: HTMLAudioElement;
  private unsub: () => void;
  private ctx: AudioContext | null = null;
  private localAnalyser: AnalyserNode | null = null;
  private remoteAnalyser: AnalyserNode | null = null;
  private listeners: Partial<CallEvents> = {};
  private ringTimeout: number | null = null;

  constructor(private transport: RealtimeTransport) {
    this.audioEl = document.createElement('audio');
    this.audioEl.autoplay = true;
    this.audioEl.setAttribute('playsinline', '');
    document.body.appendChild(this.audioEl);
    this.unsub = transport.onSignal((from, p) => this.onSignal(from, p));
  }

  on<K extends keyof CallEvents>(k: K, cb: CallEvents[K]) {
    this.listeners[k] = cb;
  }

  private set(s: CallState, info?: string) {
    this.state = s;
    this.listeners.state?.(s, info);
  }

  static micSupported() {
    return !!navigator.mediaDevices?.getUserMedia && typeof RTCPeerConnection !== 'undefined';
  }

  async ensureMic(): Promise<MediaStream> {
    if (this.localStream) return this.localStream;
    if (!VoiceCall.micSupported()) throw new Error('Este navegador não suporta microfone/WebRTC (é necessário HTTPS ou localhost).');
    this.set('mic');
    const stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true }, video: false });
    this.localStream = stream;
    this.localAnalyser = this.analyser(stream);
    return stream;
  }

  private analyser(stream: MediaStream) {
    try {
      this.ctx ??= new AudioContext();
      const src = this.ctx.createMediaStreamSource(stream);
      const a = this.ctx.createAnalyser();
      a.fftSize = 512;
      src.connect(a);
      return a;
    } catch {
      return null;
    }
  }

  private static level(a: AnalyserNode | null) {
    if (!a) return 0;
    const buf = new Uint8Array(a.fftSize);
    a.getByteTimeDomainData(buf);
    let sum = 0;
    for (let i = 0; i < buf.length; i++) {
      const v = (buf[i] - 128) / 128;
      sum += v * v;
    }
    return Math.min(1, Math.sqrt(sum / buf.length) * 4);
  }

  levels() {
    return { local: this.muted ? 0 : VoiceCall.level(this.localAnalyser), remote: VoiceCall.level(this.remoteAnalyser) };
  }

  setMuted(m: boolean) {
    this.muted = m;
    this.localStream?.getAudioTracks().forEach((t) => (t.enabled = !m));
  }

  /** Visitante: liga para um vendedor online. */
  async call(sellerPeerId: string, info: { visitorName: string; brandId: string; sellerId: string }) {
    try {
      await this.ensureMic();
    } catch (err) {
      this.set('error', micError(err));
      return;
    }
    this.peerId = sellerPeerId;
    this.set('ringing');
    this.transport.send(sellerPeerId, { kind: 'call-request', ...info });
    this.ringTimeout = window.setTimeout(() => {
      if (this.state === 'ringing') {
        this.transport.send(sellerPeerId, { kind: 'call-cancel' });
        this.set('ended', 'O vendedor não atendeu.');
        this.reset();
      }
    }, 30000);
  }

  /** Vendedor: aceita a chamada recebida e inicia a negociação WebRTC. */
  async accept() {
    if (!this.peerId) return;
    try {
      await this.ensureMic();
    } catch (err) {
      this.transport.send(this.peerId, { kind: 'call-decline', reason: 'Microfone do vendedor indisponível' });
      this.set('error', micError(err));
      return;
    }
    this.transport.send(this.peerId, { kind: 'call-accept' });
    this.set('connecting');
    const pc = this.createPc();
    this.localStream!.getTracks().forEach((t) => pc.addTrack(t, this.localStream!));
    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);
    this.transport.send(this.peerId, { kind: 'offer', sdp: offer });
  }

  decline(reason = 'Vendedor ocupado no momento') {
    if (this.peerId) this.transport.send(this.peerId, { kind: 'call-decline', reason });
    this.set('idle');
    this.reset();
  }

  hangup() {
    if (this.peerId) this.transport.send(this.peerId, { kind: this.state === 'ringing' ? 'call-cancel' : 'call-end' });
    this.set('ended', 'Chamada encerrada.');
    this.reset();
  }

  sendChat(text: string) {
    if (!this.peerId || !text.trim()) return;
    this.transport.send(this.peerId, { kind: 'chat', text: text.trim().slice(0, 500) });
    this.listeners.chat?.('me', text.trim());
  }

  private createPc() {
    const pc = new RTCPeerConnection({ iceServers: ICE_SERVERS });
    this.pc = pc;
    pc.onicecandidate = (e) => {
      if (e.candidate && this.peerId) this.transport.send(this.peerId, { kind: 'ice', candidate: e.candidate.toJSON() });
    };
    pc.ontrack = (e) => {
      this.remoteStream = e.streams[0] ?? new MediaStream([e.track]);
      this.audioEl.srcObject = this.remoteStream;
      this.audioEl.play().catch(() => undefined);
      this.remoteAnalyser = this.analyser(this.remoteStream);
    };
    pc.onconnectionstatechange = () => {
      if (pc.connectionState === 'connected') this.set('connected');
      if (pc.connectionState === 'failed') {
        this.set('error', 'Falha na conexão de mídia (sem servidor TURN, só funciona no mesmo dispositivo/rede).');
        this.reset();
      }
      if (pc.connectionState === 'disconnected' || pc.connectionState === 'closed') {
        if (this.state === 'connected') {
          this.set('ended', 'Conexão encerrada.');
          this.reset();
        }
      }
    };
    return pc;
  }

  private async flushIce() {
    if (!this.pc?.remoteDescription) return;
    for (const c of this.pendingIce.splice(0)) await this.pc.addIceCandidate(c).catch(() => undefined);
  }

  private async onSignal(from: string, p: SignalPayload) {
    if (p.kind === 'call-request') {
      if (this.state !== 'idle' && this.state !== 'ended' && this.state !== 'error') {
        this.transport.send(from, { kind: 'call-decline', reason: 'Vendedor em outro atendimento' });
        return;
      }
      this.peerId = from;
      this.set('incoming', p.visitorName);
      return;
    }
    if (from !== this.peerId) return;
    switch (p.kind) {
      case 'call-accept':
        if (this.ringTimeout) window.clearTimeout(this.ringTimeout);
        this.set('connecting');
        this.createPc();
        break;
      case 'call-decline':
        this.set('ended', p.reason || 'Chamada recusada.');
        this.reset();
        break;
      case 'call-cancel':
      case 'call-end':
        this.set('ended', 'O outro participante encerrou a chamada.');
        this.reset();
        break;
      case 'offer': {
        const pc = this.pc ?? this.createPc();
        await pc.setRemoteDescription(p.sdp);
        this.localStream?.getTracks().forEach((t) => pc.addTrack(t, this.localStream!));
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        this.transport.send(from, { kind: 'answer', sdp: answer });
        await this.flushIce();
        break;
      }
      case 'answer':
        await this.pc?.setRemoteDescription(p.sdp);
        await this.flushIce();
        break;
      case 'ice':
        if (this.pc?.remoteDescription) await this.pc.addIceCandidate(p.candidate).catch(() => undefined);
        else this.pendingIce.push(p.candidate);
        break;
      case 'chat':
        this.listeners.chat?.('peer', p.text);
        break;
    }
  }

  private reset() {
    if (this.ringTimeout) window.clearTimeout(this.ringTimeout);
    this.pc?.close();
    this.pc = null;
    this.pendingIce = [];
    this.peerId = null;
    this.remoteStream = null;
    this.remoteAnalyser = null;
    this.audioEl.srcObject = null;
  }

  /** Libera o microfone (o indicador de gravação do navegador apaga). */
  releaseMic() {
    this.localStream?.getTracks().forEach((t) => t.stop());
    this.localStream = null;
    this.localAnalyser = null;
  }

  dispose() {
    if (this.peerId && (this.state === 'connected' || this.state === 'connecting' || this.state === 'ringing')) this.hangup();
    this.reset();
    this.releaseMic();
    this.unsub();
    this.audioEl.remove();
    this.ctx?.close().catch(() => undefined);
  }
}

function micError(err: unknown) {
  const name = (err as { name?: string })?.name;
  if (name === 'NotAllowedError') return 'Permissão de microfone negada. Libere o microfone nas configurações do navegador.';
  if (name === 'NotFoundError') return 'Nenhum microfone encontrado neste dispositivo.';
  return (err as Error)?.message || 'Não foi possível acessar o microfone.';
}
