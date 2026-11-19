import type { AvatarConfig } from '@/domain/types';

// ---------------------------------------------------------------------------
// Contrato de tempo real (presença multiusuário + sinalização de voz).
// O ambiente 3D e a interface de atendimento dependem SOMENTE desta interface.
//
// Implementação atual: LocalBroadcastTransport — funciona entre abas do MESMO
// navegador/dispositivo (BroadcastChannel). Serve para demonstrar e testar o
// fluxo real visitante ↔ vendedor sem servidor.
//
// NÃO IMPLEMENTADO: transporte via internet (WebSocket/servidor de jogo, ex.:
// Colyseus, Socket.IO, LiveKit data channels). Ver docs/ARQUITETURA.md.
// ---------------------------------------------------------------------------

export type PeerRole = 'visitor' | 'seller';

export interface PresenceState {
  peerId: string;
  role: PeerRole;
  name: string;
  brandId?: string;
  sellerId?: string;
  avatar?: AvatarConfig;
  x: number;
  z: number;
  ry: number;
  moving: boolean;
  talking: boolean;
  inCallWith?: string | null;
  ts: number;
}

export type SignalPayload =
  | { kind: 'call-request'; visitorName: string; brandId: string; sellerId: string }
  | { kind: 'call-accept' }
  | { kind: 'call-decline'; reason?: string }
  | { kind: 'call-cancel' }
  | { kind: 'call-end' }
  | { kind: 'offer'; sdp: RTCSessionDescriptionInit }
  | { kind: 'answer'; sdp: RTCSessionDescriptionInit }
  | { kind: 'ice'; candidate: RTCIceCandidateInit }
  | { kind: 'chat'; text: string };

export interface RealtimeTransport {
  readonly kind: string;
  /** Descrição honesta do alcance da conexão, exibida na interface. */
  readonly scopeLabel: string;
  readonly selfId: string;
  connect(self: Omit<PresenceState, 'peerId' | 'ts'>): void;
  updatePresence(patch: Partial<PresenceState>): void;
  send(to: string, payload: SignalPayload): void;
  peers(): PresenceState[];
  onPeers(cb: (peers: PresenceState[]) => void): () => void;
  onSignal(cb: (from: string, payload: SignalPayload) => void): () => void;
  disconnect(): void;
}

type Wire =
  | { t: 'hello'; from: string }
  | { t: 'presence'; s: PresenceState }
  | { t: 'leave'; from: string }
  | { t: 'signal'; from: string; to: string; p: SignalPayload };

const STALE_MS = 4000;

export class LocalBroadcastTransport implements RealtimeTransport {
  readonly kind = 'local-broadcast';
  readonly scopeLabel = 'Rede local entre abas deste navegador (BroadcastChannel)';
  readonly selfId: string;
  private ch: BroadcastChannel | null = null;
  private me: PresenceState | null = null;
  private others = new Map<string, PresenceState>();
  private peerCbs = new Set<(p: PresenceState[]) => void>();
  private sigCbs = new Set<(from: string, p: SignalPayload) => void>();
  private timer: number | null = null;
  private lastSent = 0;
  private dirty = false;

  constructor() {
    this.selfId = `peer-${Math.random().toString(36).slice(2, 10)}`;
  }

  connect(self: Omit<PresenceState, 'peerId' | 'ts'>) {
    if (typeof BroadcastChannel === 'undefined') {
      console.warn('[realtime] BroadcastChannel indisponível neste navegador.');
      return;
    }
    this.me = { ...self, peerId: this.selfId, ts: Date.now() };
    this.ch = new BroadcastChannel('fwe-realtime-v1');
    this.ch.onmessage = (e) => this.handle(e.data as Wire);
    this.post({ t: 'hello', from: this.selfId });
    this.broadcastPresence();
    this.timer = window.setInterval(() => this.tick(), 100);
    window.addEventListener('pagehide', this.onHide);
  }

  private onHide = () => this.disconnect();

  private tick() {
    const now = Date.now();
    if (this.dirty && now - this.lastSent > 90) this.broadcastPresence();
    else if (now - this.lastSent > 1000) this.broadcastPresence();
    let changed = false;
    for (const [id, p] of this.others) {
      if (now - p.ts > STALE_MS) {
        this.others.delete(id);
        changed = true;
      }
    }
    if (changed) this.emitPeers();
  }

  private broadcastPresence() {
    if (!this.me) return;
    this.me.ts = Date.now();
    this.lastSent = this.me.ts;
    this.dirty = false;
    this.post({ t: 'presence', s: this.me });
  }

  private post(w: Wire) {
    try {
      this.ch?.postMessage(w);
    } catch (err) {
      console.warn('[realtime] falha ao enviar', err);
    }
  }

  private handle(w: Wire) {
    switch (w.t) {
      case 'hello':
        this.broadcastPresence();
        break;
      case 'presence':
        if (w.s.peerId === this.selfId) return;
        this.others.set(w.s.peerId, { ...w.s, ts: Date.now() });
        this.emitPeers();
        break;
      case 'leave':
        if (this.others.delete(w.from)) this.emitPeers();
        break;
      case 'signal':
        if (w.to !== this.selfId) return;
        this.sigCbs.forEach((cb) => cb(w.from, w.p));
        break;
    }
  }

  private emitPeers() {
    const list = [...this.others.values()];
    this.peerCbs.forEach((cb) => cb(list));
  }

  updatePresence(patch: Partial<PresenceState>) {
    if (!this.me) return;
    Object.assign(this.me, patch);
    this.dirty = true;
  }

  send(to: string, payload: SignalPayload) {
    this.post({ t: 'signal', from: this.selfId, to, p: payload });
  }

  peers() {
    return [...this.others.values()];
  }

  onPeers(cb: (p: PresenceState[]) => void) {
    this.peerCbs.add(cb);
    cb(this.peers());
    return () => this.peerCbs.delete(cb);
  }

  onSignal(cb: (from: string, p: SignalPayload) => void) {
    this.sigCbs.add(cb);
    return () => this.sigCbs.delete(cb);
  }

  disconnect() {
    window.removeEventListener('pagehide', this.onHide);
    if (this.timer) window.clearInterval(this.timer);
    this.timer = null;
    this.post({ t: 'leave', from: this.selfId });
    this.ch?.close();
    this.ch = null;
    this.others.clear();
  }
}
