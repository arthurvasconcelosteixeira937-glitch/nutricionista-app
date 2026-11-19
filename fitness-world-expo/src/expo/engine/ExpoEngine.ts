import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js';
import type { AvatarConfig, ExpoState, Seller } from '@/domain/types';
import type { PresenceState } from '@/services/realtime/transport';
import { hashString } from '@/lib/util';
import { Avatar } from './avatar';
import { buildBooth, type BoothBuild } from './booth';
import { FirstPersonInput } from './controls';
import { buildHall, type HallBuild, type HallData } from './hall';
import { HALL, SLOTS, SPAWN, approachPoint, localBoxToWorld, slotById, type AABB, type Slot } from './layout';
import { ScreenRegistry } from './screens';
import { setMaxAnisotropy } from './textures';

export type Quality = 'alta' | 'media' | 'baixa';

export type Target =
  | { kind: 'product'; productId: string; brandId: string }
  | { kind: 'seller'; sellerId: string; brandId: string }
  | { kind: 'screen'; brandId: string }
  | { kind: 'stage' }
  | { kind: 'directory' };

export interface EngineCallbacks {
  onReady?: () => void;
  onHover?: (t: Target | null) => void;
  onInteract?: (t: Target) => void;
  onZone?: (brandId: string | null) => void;
  onNearbySeller?: (sellerId: string | null) => void;
  onPose?: (p: { x: number; z: number; yaw: number; moving: boolean }) => void;
  onLockChange?: (locked: boolean) => void;
  onFps?: (fps: number) => void;
}

export interface EngineOptions {
  quality: Quality;
  role: 'visitor' | 'seller';
  selfSellerId?: string;
  hallData: HallData;
  callbacks: EngineCallbacks;
}

interface BoothEntry {
  slot: Slot;
  brandId: string;
  sig: string;
  build: BoothBuild;
  light?: THREE.SpotLight;
}

interface SellerEntry {
  seller: Seller;
  avatar: Avatar;
  home: { x: number; z: number; ry: number };
  online: PresenceState | null;
  talking: boolean;
  offlineLabel: string;
}

const EYE = 1.66;
const RADIUS = 0.32;

export class ExpoEngine {
  readonly renderer: THREE.WebGLRenderer;
  readonly scene = new THREE.Scene();
  readonly camera: THREE.PerspectiveCamera;
  readonly input: FirstPersonInput;
  private composer: EffectComposer | null = null;
  private bloom: UnrealBloomPass | null = null;
  private clock = new THREE.Clock();
  private raf = 0;
  private hall: HallBuild;
  private screens = new ScreenRegistry();
  private booths = new Map<string, BoothEntry>();
  private sellers = new Map<string, SellerEntry>();
  private visitors = new Map<string, { avatar: Avatar; target: PresenceState }>();
  private colliders: AABB[] = [];
  private interactables: THREE.Object3D[] = [];
  private raycaster = new THREE.Raycaster();
  private pos = new THREE.Vector3(SPAWN.x, EYE, SPAWN.z);
  private vel = new THREE.Vector2();
  private hover: Target | null = null;
  private hoverKey = '';
  private zone: string | null = null;
  private nearSeller: string | null = null;
  private pointer: { x: number; y: number } | null = null;
  private tween: { from: THREE.Vector3; to: THREE.Vector3; yaw0: number; yaw1: number; t: number; dur: number } | null = null;
  private lastPose = 0;
  private bob = 0;
  private fpsAcc = { t: 0, n: 0 };
  private ro: ResizeObserver;
  private disposed = false;
  private quality: Quality;
  private sellerLabels = new Map<string, string>();

  constructor(private container: HTMLElement, private opts: EngineOptions) {
    this.quality = opts.quality;
    const r = new THREE.WebGLRenderer({ antialias: opts.quality !== 'baixa', powerPreference: 'high-performance' });
    r.setPixelRatio(Math.min(window.devicePixelRatio, opts.quality === 'alta' ? 1.75 : opts.quality === 'media' ? 1.25 : 1));
    r.setSize(container.clientWidth, container.clientHeight);
    r.toneMapping = THREE.ACESFilmicToneMapping;
    r.toneMappingExposure = 1.05;
    r.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer = r;
    setMaxAnisotropy(Math.min(8, r.capabilities.getMaxAnisotropy()));
    container.appendChild(r.domElement);
    r.domElement.style.display = 'block';
    r.domElement.style.touchAction = 'none';

    this.camera = new THREE.PerspectiveCamera(this.fovFor(container), container.clientWidth / container.clientHeight, 0.05, 260);
    this.camera.rotation.order = 'YXZ';

    this.scene.background = new THREE.Color('#07080b');
    this.scene.fog = new THREE.Fog('#0a0b0f', 70, 170);

    const pmrem = new THREE.PMREMGenerator(r);
    this.scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    this.scene.environmentIntensity = 0.55;
    pmrem.dispose();

    const hemi = new THREE.HemisphereLight('#dfe7f7', '#1d1a16', 1.15);
    this.scene.add(hemi);
    const key = new THREE.DirectionalLight('#fff6ea', 1.3);
    key.position.set(20, 40, 30);
    this.scene.add(key);
    const fill = new THREE.DirectionalLight('#bcd2ff', 0.45);
    fill.position.set(-30, 25, -40);
    this.scene.add(fill);

    if (opts.quality !== 'baixa') {
      // luzes de palco
      for (const x of [-8, 0, 8]) {
        const s = new THREE.SpotLight('#ffe9c4', 320, 40, 0.42, 0.6, 1.4);
        s.position.set(x, 13, -60);
        s.target.position.set(x * 0.6, 1.5, -73);
        this.scene.add(s, s.target);
      }
    }

    this.hall = buildHall(opts.hallData, opts.quality);
    this.scene.add(this.hall.group);
    this.hall.screens.forEach((s) => this.screens.add(s));

    if (opts.quality !== 'baixa') {
      this.composer = new EffectComposer(r);
      this.composer.addPass(new RenderPass(this.scene, this.camera));
      this.bloom = new UnrealBloomPass(new THREE.Vector2(container.clientWidth, container.clientHeight), 0.36, 0.42, 0.9);
      if (opts.quality === 'alta') this.composer.addPass(this.bloom);
      this.composer.addPass(new OutputPass());
    }

    this.input = new FirstPersonInput(r.domElement);
    this.input.yaw = SPAWN.yaw;
    this.input.onLockChange = (l) => opts.callbacks.onLockChange?.(l);
    this.input.onInteractKey = () => {
      if (this.hover) opts.callbacks.onInteract?.(this.hover);
    };
    this.input.onHoverMove = (x, y) => (this.pointer = { x, y });
    this.input.onClick = (x, y) => {
      const t = this.pick(x, y);
      if (t) opts.callbacks.onInteract?.(t);
      else this.input.requestLock();
    };
    this.input.onTap = (x, y) => {
      const t = this.pick(x, y);
      if (t) opts.callbacks.onInteract?.(t);
    };

    this.ro = new ResizeObserver(() => this.resize());
    this.ro.observe(container);
    this.loop();
  }

  private fovFor(el: HTMLElement) {
    return el.clientWidth < el.clientHeight ? 78 : 68;
  }

  private resize() {
    const w = this.container.clientWidth;
    const h = this.container.clientHeight;
    if (!w || !h) return;
    this.renderer.setSize(w, h);
    this.composer?.setSize(w, h);
    this.camera.aspect = w / h;
    this.camera.fov = this.fovFor(this.container);
    this.camera.updateProjectionMatrix();
  }

  // ---------------------------------------------------------------------
  // Sincronização com o estado (marcas, produtos, vendedores)
  // ---------------------------------------------------------------------

  syncState(st: ExpoState) {
    const approved = st.brands.filter((b) => b.status === 'aprovada' && b.slotId);
    const seen = new Set<string>();
    for (const brand of approved) {
      const slot = slotById(brand.slotId);
      if (!slot) continue;
      seen.add(slot.id);
      const products = st.products.filter((p) => p.brandId === brand.id);
      const sellers = st.sellers.filter((s) => s.brandId === brand.id && s.active);
      const sig = JSON.stringify([brand.id, brand.name, brand.booth, products, sellers.map((s) => [s.id, s.name, s.title, s.avatar])]);
      const cur = this.booths.get(slot.id);
      if (cur && cur.sig === sig) continue;
      if (cur) this.removeBooth(slot.id);
      this.addBooth(slot, brand.id, sig, st);
    }
    for (const id of [...this.booths.keys()]) if (!seen.has(id)) this.removeBooth(id);
    // lançamentos na arena central
    const launches = st.products
      .filter((p) => p.isLaunch && approved.some((b) => b.id === p.brandId))
      .map((p) => {
        const b = approved.find((x) => x.id === p.brandId)!;
        return { product: p, brandName: b.name, accent: b.booth.secondaryColor };
      });
    this.hall.setLaunches(launches);
    this.rebuildIndex();
  }

  private addBooth(slot: Slot, brandId: string, sig: string, st: ExpoState) {
    const brand = st.brands.find((b) => b.id === brandId)!;
    const products = st.products.filter((p) => p.brandId === brandId);
    const sellers = st.sellers.filter((s) => s.brandId === brandId && s.active);
    const build = buildBooth({ brand, products, sellers, w: slot.w, d: slot.d, slotLabel: slot.label, quality: this.quality });
    build.group.position.set(slot.x, 0, slot.z);
    build.group.rotation.y = slot.rot;
    this.scene.add(build.group);
    build.screens.forEach((s) => this.screens.add(s));
    const entry: BoothEntry = { slot, brandId, sig, build };
    if (this.quality !== 'baixa') {
      const l = new THREE.SpotLight(brand.booth.lightingColor, 170 * brand.booth.lightingIntensity, 26, 0.62, 0.75, 1.3);
      l.position.set(slot.x, 12, slot.z);
      l.target.position.set(slot.x, 0, slot.z);
      this.scene.add(l, l.target);
      entry.light = l;
    }
    this.booths.set(slot.id, entry);

    // vendedores (pessoas reais) nos pontos de atendimento
    const spots = build.sellerSpots;
    sellers.forEach((s, i) => {
      const sp = spots[i % Math.max(1, spots.length)] ?? { x: 0, z: 0, ry: 0 };
      const off = i >= spots.length ? 1.2 * Math.floor(i / Math.max(1, spots.length)) : 0;
      const local = new THREE.Vector3(sp.x + off, 0, sp.z);
      local.applyAxisAngle(new THREE.Vector3(0, 1, 0), slot.rot);
      const home = { x: slot.x + local.x, z: slot.z + local.z, ry: slot.rot + sp.ry };
      const avatar = new Avatar(s.avatar, { name: s.name, sub: `${s.title} · ${brand.name}`, logo: brand.booth.logoText, accent: '#ffffff' });
      avatar.group.position.set(home.x, 0.12, home.z);
      avatar.group.rotation.y = home.ry;
      avatar.hit.userData = { kind: 'seller', sellerId: s.id, brandId };
      this.scene.add(avatar.group);
      const prev = this.sellers.get(s.id);
      this.sellers.set(s.id, { seller: s, avatar, home, online: prev?.online ?? null, talking: prev?.talking ?? false, offlineLabel: this.sellerLabels.get(s.id) ?? '' });
      if (s.id === this.opts.selfSellerId) avatar.group.visible = false;
    });
  }

  private removeBooth(slotId: string) {
    const e = this.booths.get(slotId);
    if (!e) return;
    this.scene.remove(e.build.group);
    e.build.screens.forEach((s) => this.screens.remove(s));
    e.build.dispose();
    if (e.light) {
      this.scene.remove(e.light, e.light.target);
      e.light.dispose();
    }
    for (const [id, s] of this.sellers) {
      if (s.seller.brandId === e.brandId) {
        this.scene.remove(s.avatar.group);
        s.avatar.dispose();
        this.sellers.delete(id);
      }
    }
    this.booths.delete(slotId);
  }

  private rebuildIndex() {
    this.colliders = [...this.hall.colliders];
    this.interactables = [...this.hall.interactables];
    for (const e of this.booths.values()) {
      for (const c of e.build.colliders) this.colliders.push(localBoxToWorld(e.slot, c.cx, c.cz, c.w, c.d));
      this.interactables.push(...e.build.interactables);
    }
    for (const s of this.sellers.values()) if (s.seller.id !== this.opts.selfSellerId) this.interactables.push(s.avatar.hit);
  }

  // ---------------------------------------------------------------------
  // Presença em tempo real (vendedores e visitantes conectados)
  // ---------------------------------------------------------------------

  setPeers(peers: PresenceState[]) {
    const onlineSellers = new Map<string, PresenceState>();
    const visitorIds = new Set<string>();
    for (const p of peers) {
      if (p.role === 'seller' && p.sellerId) onlineSellers.set(p.sellerId, p);
      else if (p.role === 'visitor') {
        visitorIds.add(p.peerId);
        const v = this.visitors.get(p.peerId);
        if (v) v.target = p;
        else {
          const avatar = new Avatar(p.avatar ?? visitorAvatar(p.peerId), { name: p.name, sub: 'Visitante conectado' });
          avatar.setStatus('visitor');
          avatar.group.position.set(p.x, 0, p.z);
          this.scene.add(avatar.group);
          this.visitors.set(p.peerId, { avatar, target: p });
        }
      }
    }
    for (const [id, v] of this.visitors) {
      if (!visitorIds.has(id)) {
        this.scene.remove(v.avatar.group);
        v.avatar.dispose();
        this.visitors.delete(id);
      }
    }
    for (const s of this.sellers.values()) s.online = onlineSellers.get(s.seller.id) ?? null;
  }

  setSellerLabels(map: Map<string, string>) {
    this.sellerLabels = map;
    for (const s of this.sellers.values()) s.offlineLabel = map.get(s.seller.id) ?? '';
  }

  isSellerOnline(id: string) {
    return !!this.sellers.get(id)?.online;
  }

  sellerPeer(id: string) {
    return this.sellers.get(id)?.online ?? null;
  }

  setTalking(sellerId: string | null) {
    for (const s of this.sellers.values()) s.talking = s.seller.id === sellerId;
  }

  // ---------------------------------------------------------------------
  // Navegação
  // ---------------------------------------------------------------------

  spawnAtSeller(sellerId: string) {
    const s = this.sellers.get(sellerId);
    if (!s) return false;
    this.pos.set(s.home.x, EYE, s.home.z);
    this.input.yaw = s.home.ry + Math.PI;
    return true;
  }

  flyTo(x: number, z: number, yaw: number) {
    const to = new THREE.Vector3(x, EYE, z);
    let y1 = yaw;
    const y0 = this.input.yaw;
    while (y1 - y0 > Math.PI) y1 -= Math.PI * 2;
    while (y1 - y0 < -Math.PI) y1 += Math.PI * 2;
    const dist = to.distanceTo(this.pos);
    this.tween = { from: this.pos.clone(), to, yaw0: y0, yaw1: y1, t: 0, dur: Math.min(2.4, 0.6 + dist / 30) };
  }

  goToBooth(brandId: string, st: ExpoState) {
    const b = st.brands.find((x) => x.id === brandId);
    const slot = slotById(b?.slotId);
    if (!slot) return;
    const a = approachPoint(slot);
    this.flyTo(a.x, a.z, a.yaw);
  }

  /** Posiciona a câmera imediatamente (usado em testes e no modo vendedor). */
  teleport(x: number, z: number, yaw: number, pitch = -0.04) {
    this.tween = null;
    this.pos.set(x, EYE, z);
    this.input.yaw = yaw;
    this.input.pitch = pitch;
  }

  goToStage() {
    this.flyTo(0, -50, 0);
  }

  goToLobby() {
    this.flyTo(SPAWN.x, SPAWN.z, SPAWN.yaw);
  }

  setInputEnabled(v: boolean) {
    this.input.enabled = v;
    if (!v) this.input.exitLock();
  }

  setQuality(q: Quality) {
    this.quality = q;
  }

  pose() {
    return { x: this.pos.x, z: this.pos.z, yaw: this.input.yaw };
  }

  // ---------------------------------------------------------------------
  // Interação
  // ---------------------------------------------------------------------

  private targetFrom(o: THREE.Object3D | null): Target | null {
    const u = o?.userData;
    if (!u?.kind) return null;
    if (u.kind === 'product') return { kind: 'product', productId: u.productId, brandId: u.brandId };
    if (u.kind === 'seller') return { kind: 'seller', sellerId: u.sellerId, brandId: u.brandId };
    if (u.kind === 'screen') return { kind: 'screen', brandId: u.brandId };
    if (u.kind === 'stage') return { kind: 'stage' };
    if (u.kind === 'directory') return { kind: 'directory' };
    return null;
  }

  private maxDist(t: Target) {
    switch (t.kind) {
      case 'product': return 6;
      case 'seller': return 9;
      case 'screen': return 16;
      case 'directory': return 8;
      case 'stage': return 45;
    }
  }

  private raycast(ndc: THREE.Vector2): Target | null {
    this.raycaster.setFromCamera(ndc, this.camera);
    this.raycaster.far = 46;
    const hits = this.raycaster.intersectObjects(this.interactables, false);
    for (const h of hits) {
      if (!h.object.visible && !(h.object as THREE.Mesh).isMesh) continue;
      const t = this.targetFrom(h.object);
      if (t && h.distance <= this.maxDist(t)) return t;
      if (t) return null;
    }
    return null;
  }

  private pick(cx: number, cy: number): Target | null {
    const rect = this.renderer.domElement.getBoundingClientRect();
    return this.raycast(new THREE.Vector2(((cx - rect.left) / rect.width) * 2 - 1, -((cy - rect.top) / rect.height) * 2 + 1));
  }

  // ---------------------------------------------------------------------
  // Loop principal
  // ---------------------------------------------------------------------

  private collide(p: THREE.Vector3) {
    for (let iter = 0; iter < 2; iter++) {
      for (const b of this.colliders) {
        const nx = Math.max(b.minX, Math.min(p.x, b.maxX));
        const nz = Math.max(b.minZ, Math.min(p.z, b.maxZ));
        const dx = p.x - nx;
        const dz = p.z - nz;
        const d2 = dx * dx + dz * dz;
        if (d2 < RADIUS * RADIUS) {
          if (d2 > 1e-8) {
            const d = Math.sqrt(d2);
            p.x = nx + (dx / d) * RADIUS;
            p.z = nz + (dz / d) * RADIUS;
          } else {
            // centro dentro da caixa: empurra pela menor penetração
            const pen = [p.x - b.minX, b.maxX - p.x, p.z - b.minZ, b.maxZ - p.z];
            const m = Math.min(...pen);
            if (m === pen[0]) p.x = b.minX - RADIUS;
            else if (m === pen[1]) p.x = b.maxX + RADIUS;
            else if (m === pen[2]) p.z = b.minZ - RADIUS;
            else p.z = b.maxZ + RADIUS;
          }
        }
      }
    }
    p.x = Math.max(HALL.minX + 0.6, Math.min(HALL.maxX - 0.6, p.x));
    p.z = Math.max(HALL.minZ + 0.6, Math.min(HALL.maxZ - 0.6, p.z));
  }

  private loop = () => {
    if (this.disposed) return;
    this.raf = requestAnimationFrame(this.loop);
    const dt = Math.min(0.05, this.clock.getDelta());
    const t = this.clock.elapsedTime;
    const cb = this.opts.callbacks;

    // movimento
    let moving = false;
    if (this.tween) {
      this.tween.t += dt / this.tween.dur;
      const k = this.tween.t >= 1 ? 1 : 1 - Math.pow(1 - this.tween.t, 3);
      this.pos.lerpVectors(this.tween.from, this.tween.to, k);
      this.input.yaw = this.tween.yaw0 + (this.tween.yaw1 - this.tween.yaw0) * k;
      this.input.pitch *= 0.9;
      moving = true;
      if (this.tween.t >= 1) {
        this.tween = null;
        this.collide(this.pos);
      }
    } else {
      const s = this.input.state();
      const speed = s.run ? 7.2 : 4.0;
      const fx = -Math.sin(this.input.yaw);
      const fz = -Math.cos(this.input.yaw);
      const rx = Math.cos(this.input.yaw);
      const rz = -Math.sin(this.input.yaw);
      let mx = fx * s.forward + rx * s.strafe;
      let mz = fz * s.forward + rz * s.strafe;
      const len = Math.hypot(mx, mz);
      if (len > 1) {
        mx /= len;
        mz /= len;
      }
      const ax = mx * speed;
      const az = mz * speed;
      const damp = 1 - Math.exp(-dt * 12);
      this.vel.x += (ax - this.vel.x) * damp;
      this.vel.y += (az - this.vel.y) * damp;
      this.pos.x += this.vel.x * dt;
      this.pos.z += this.vel.y * dt;
      this.collide(this.pos);
      moving = this.vel.length() > 0.3;
    }
    this.bob += dt * (moving ? 9 : 0);
    this.camera.position.set(this.pos.x, EYE + (moving && !this.tween ? Math.sin(this.bob) * 0.025 : 0), this.pos.z);
    this.camera.rotation.set(this.input.pitch, this.input.yaw, 0);

    // pose para minimapa e presença
    if (t - this.lastPose > 0.066) {
      this.lastPose = t;
      cb.onPose?.({ x: this.pos.x, z: this.pos.z, yaw: this.input.yaw, moving });
      // zona (estande atual)
      let zone: string | null = null;
      for (const e of this.booths.values()) {
        const s = e.slot;
        if (Math.abs(this.pos.x - s.x) < s.w / 2 + 1.2 && Math.abs(this.pos.z - s.z) < s.d / 2 + 1.2) zone = e.brandId;
      }
      if (zone !== this.zone) {
        this.zone = zone;
        cb.onZone?.(zone);
      }
      // vendedor próximo
      let near: string | null = null;
      let best = 4.5;
      for (const s of this.sellers.values()) {
        if (s.seller.id === this.opts.selfSellerId) continue;
        const d = Math.hypot(s.avatar.group.position.x - this.pos.x, s.avatar.group.position.z - this.pos.z);
        if (d < best) {
          best = d;
          near = s.seller.id;
        }
      }
      if (near !== this.nearSeller) {
        this.nearSeller = near;
        cb.onNearbySeller?.(near);
      }
      // nível de detalhe por distância
      for (const e of this.booths.values()) {
        const d = Math.hypot(e.slot.x - this.pos.x, e.slot.z - this.pos.z);
        e.build.detail.visible = d < (this.quality === 'baixa' ? 26 : 40);
      }
    }

    // hover
    if (!this.tween) {
      let target: Target | null = null;
      if (this.input.locked) target = this.raycast(new THREE.Vector2(0, 0));
      else if (this.pointer && !this.input.isTouch) target = this.pick(this.pointer.x, this.pointer.y);
      const key = target ? JSON.stringify(target) : '';
      if (key !== this.hoverKey) {
        this.hoverKey = key;
        this.hover = target;
        cb.onHover?.(target);
        this.renderer.domElement.style.cursor = target ? 'pointer' : 'default';
      }
    }

    // avatares
    for (const s of this.sellers.values()) {
      if (s.seller.id === this.opts.selfSellerId) continue;
      const g = s.avatar.group;
      let mv = false;
      if (s.online) {
        const tx = s.online.x;
        const tz = s.online.z;
        const d = Math.hypot(tx - g.position.x, tz - g.position.z);
        mv = s.online.moving || d > 0.08;
        const k = 1 - Math.exp(-dt * 10);
        g.position.x += (tx - g.position.x) * k;
        g.position.z += (tz - g.position.z) * k;
        g.position.y = insideAnyBooth(g.position.x, g.position.z, this.booths) ? 0.12 : 0;
        g.rotation.y = lerpAngle(g.rotation.y, s.online.ry + Math.PI, k);
        s.avatar.setStatus(s.talking || s.online.inCallWith ? 'talking' : 'online');
      } else {
        g.position.set(s.home.x, 0.12, s.home.z);
        g.rotation.y = s.home.ry;
        s.avatar.setStatus('offline', s.offlineLabel);
      }
      s.avatar.update(dt, mv, !!(s.online && (s.talking || s.online.talking || s.online.inCallWith)));
    }
    for (const v of this.visitors.values()) {
      const g = v.avatar.group;
      const k = 1 - Math.exp(-dt * 10);
      g.position.x += (v.target.x - g.position.x) * k;
      g.position.z += (v.target.z - g.position.z) * k;
      g.position.y = insideAnyBooth(g.position.x, g.position.z, this.booths) ? 0.12 : 0;
      g.rotation.y = lerpAngle(g.rotation.y, v.target.ry + Math.PI, k);
      v.avatar.update(dt, v.target.moving, v.target.talking);
    }

    // animações
    for (const e of this.booths.values()) for (const sp of e.build.spinners) sp.rotation.y += dt * (sp.userData.spin ?? 0.5);
    this.hall.update(t, dt);
    this.screens.update(t, this.quality === 'baixa' ? 2 : 4);

    if (this.composer) this.composer.render(dt);
    else this.renderer.render(this.scene, this.camera);

    this.fpsAcc.t += dt;
    this.fpsAcc.n += 1;
    if (this.fpsAcc.t > 1) {
      cb.onFps?.(Math.round(this.fpsAcc.n / this.fpsAcc.t));
      this.fpsAcc = { t: 0, n: 0 };
    }
  };

  dispose() {
    this.disposed = true;
    cancelAnimationFrame(this.raf);
    this.ro.disconnect();
    this.input.dispose();
    for (const id of [...this.booths.keys()]) this.removeBooth(id);
    for (const v of this.visitors.values()) v.avatar.dispose();
    this.hall.dispose();
    this.screens.clear();
    this.scene.environment?.dispose();
    this.composer?.dispose();
    this.renderer.dispose();
    this.renderer.domElement.remove();
  }
}

function insideAnyBooth(x: number, z: number, booths: Map<string, BoothEntry>) {
  for (const e of booths.values()) if (Math.abs(x - e.slot.x) < e.slot.w / 2 && Math.abs(z - e.slot.z) < e.slot.d / 2) return true;
  return false;
}

function lerpAngle(a: number, b: number, k: number) {
  let d = b - a;
  while (d > Math.PI) d -= Math.PI * 2;
  while (d < -Math.PI) d += Math.PI * 2;
  return a + d * k;
}

const SKINS = ['#f1c7a5', '#e0b08f', '#c68e6a', '#a26b4a', '#7b4b32', '#5a3624'];
const HAIRS = ['#120d0a', '#2a1b10', '#4a2c1a', '#7a5230', '#b88a4a', '#1e1712'];
const OUTFITS = ['#20232b', '#2d3340', '#3a3f4b', '#1b2a3a', '#2b2b2b', '#46302a', '#1f3b33'];

export function visitorAvatar(seed: string): AvatarConfig {
  const h = hashString(seed);
  const fem = h % 2 === 0;
  return {
    body: fem ? 'feminino' : 'masculino',
    skin: SKINS[h % SKINS.length],
    hair: (fem ? ['coque', 'longo', 'cacheado'] : ['curto', 'raspado', 'cacheado'])[(h >> 3) % 3] as AvatarConfig['hair'],
    hairColor: HAIRS[(h >> 5) % HAIRS.length],
    outfit: (['jaqueta', 'polo', 'regata'] as const)[(h >> 7) % 3],
    outfitColor: OUTFITS[(h >> 9) % OUTFITS.length],
    pantsColor: '#1a1c22',
    height: fem ? 1.62 + ((h >> 11) % 12) / 100 : 1.72 + ((h >> 11) % 14) / 100,
    build: (['medio', 'atletico', 'forte'] as const)[(h >> 13) % 3],
    accessory: 'nenhum',
  };
}

export { SLOTS };
