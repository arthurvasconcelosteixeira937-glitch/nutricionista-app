import * as THREE from 'three';
import type { AvatarConfig } from '@/domain/types';
import { BODY_FONT, DISPLAY_FONT, blobShadowTexture, canvas, fitText, toTexture } from './textures';

// Avatar humano estilizado (proporções realistas, acabamento "manequim premium").
// Representa pessoas reais: vendedores e visitantes conectados.

export type AvatarStatus = 'online' | 'offline' | 'talking' | 'visitor' | 'self';

const G = {
  capsule: (r: number, l: number) => new THREE.CapsuleGeometry(r, l, 6, 16),
  sphere: new THREE.SphereGeometry(1, 32, 24),
  neck: new THREE.CylinderGeometry(0.048, 0.052, 0.12, 16),
};

function lathe(profile: [number, number][], segs = 32) {
  return new THREE.LatheGeometry(profile.map(([r, y]) => new THREE.Vector2(r, y)), segs);
}

const TORSO_M: [number, number][] = [[0, 0.97], [0.155, 0.975], [0.15, 1.05], [0.158, 1.14], [0.185, 1.28], [0.2, 1.38], [0.19, 1.44], [0.13, 1.49], [0.06, 1.51], [0, 1.515]];
const TORSO_F: [number, number][] = [[0, 0.97], [0.15, 0.975], [0.128, 1.07], [0.14, 1.17], [0.165, 1.27], [0.165, 1.35], [0.17, 1.42], [0.12, 1.48], [0.055, 1.5], [0, 1.505]];
const HIPS_M: [number, number][] = [[0, 0.84], [0.12, 0.845], [0.16, 0.9], [0.163, 0.99], [0.15, 1.01], [0, 1.012]];
const HIPS_F: [number, number][] = [[0, 0.84], [0.13, 0.845], [0.18, 0.92], [0.17, 0.99], [0.15, 1.01], [0, 1.012]];

export class Avatar {
  readonly group = new THREE.Group();
  private body = new THREE.Group();
  private legL = new THREE.Group();
  private legR = new THREE.Group();
  private kneeL = new THREE.Group();
  private kneeR = new THREE.Group();
  private armL = new THREE.Group();
  private armR = new THREE.Group();
  private elbowR = new THREE.Group();
  private head = new THREE.Group();
  private torso!: THREE.Mesh;
  private tag: THREE.Sprite;
  private tagKey = '';
  private phase = Math.random() * 10;
  private idleT = Math.random() * 10;
  readonly height: number;
  readonly hit: THREE.Mesh;
  private disposables: { dispose(): void }[] = [];

  constructor(public config: AvatarConfig, public label: { name: string; sub: string; logo?: string; accent?: string }) {
    const c = config;
    const fem = c.body === 'feminino';
    const bw = c.build === 'forte' ? 1.12 : c.build === 'atletico' ? 1.05 : 1.0;
    const skin = this.mat(c.skin, 0.55);
    const cloth = this.mat(c.outfitColor, 0.82);
    const pants = this.mat(c.pantsColor, 0.85);
    const shoe = this.mat('#e8e8e8', 0.6);
    const sole = this.mat('#1a1a1a', 0.7);
    const hair = this.mat(c.hairColor, 0.65);

    // Pernas
    const legR = (fem ? 0.066 : 0.072) * bw;
    const buildLeg = (pivot: THREE.Group, knee: THREE.Group, side: number) => {
      pivot.position.set(side * (fem ? 0.088 : 0.095) * bw, 0.93, 0);
      const upper = new THREE.Mesh(G.capsule(legR, 0.3), pants);
      upper.position.y = -0.21;
      knee.position.y = -0.43;
      const lower = new THREE.Mesh(G.capsule(legR * 0.78, 0.3), pants);
      lower.position.y = -0.2;
      const foot = new THREE.Mesh(G.capsule(0.045, 0.15), shoe);
      foot.rotation.x = Math.PI / 2;
      foot.scale.set(1, 1, 0.75);
      foot.position.set(0, -0.455, 0.05);
      const soleM = new THREE.Mesh(G.capsule(0.046, 0.15), sole);
      soleM.rotation.x = Math.PI / 2;
      soleM.scale.set(1.02, 1.02, 0.3);
      soleM.position.set(0, -0.48, 0.05);
      knee.add(lower, foot, soleM);
      pivot.add(upper, knee);
      this.body.add(pivot);
    };
    buildLeg(this.legL, this.kneeL, -1);
    buildLeg(this.legR, this.kneeR, 1);

    // Quadril e tronco
    const hips = new THREE.Mesh(lathe(fem ? HIPS_F : HIPS_M), pants);
    hips.scale.set(bw, 1, 0.68);
    this.torso = new THREE.Mesh(lathe(fem ? TORSO_F : TORSO_M), cloth);
    this.torso.scale.set(bw, 1, 0.64);
    this.body.add(hips, this.torso);

    // Gola
    if (c.outfit !== 'regata') {
      const collar = new THREE.Mesh(new THREE.TorusGeometry(0.062, 0.016, 8, 24), cloth);
      collar.rotation.x = Math.PI / 2;
      collar.position.y = 1.5;
      collar.scale.set(1, 0.85, 1);
      this.body.add(collar);
    }
    if (c.outfit === 'jaqueta') {
      const zip = new THREE.Mesh(new THREE.BoxGeometry(0.012, 0.48, 0.01), this.mat('#d9d9d9', 0.3, 0.8));
      zip.position.set(0, 1.25, 0.122 * (fem ? 0.98 : 1));
      this.body.add(zip);
    }

    // Logotipo da marca no peito
    if (label.logo) {
      const lc = canvas(256, 96);
      const ctx = lc.getContext('2d')!;
      ctx.fillStyle = label.accent ?? '#ffffff';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      fitText(ctx, label.logo, 240, 64, 800);
      ctx.fillText(label.logo, 128, 50);
      const lt = toTexture(lc);
      this.disposables.push(lt);
      const logo = new THREE.Mesh(new THREE.PlaneGeometry(0.13, 0.05), new THREE.MeshBasicMaterial({ map: lt, transparent: true }));
      logo.position.set(0.075 * bw, 1.34, (fem ? 0.112 : 0.121) * bw);
      logo.rotation.y = 0.18;
      this.body.add(logo);
    }

    // Braços
    const armMat = c.outfit === 'regata' ? skin : cloth;
    const foreMat = c.outfit === 'jaqueta' ? cloth : skin;
    const buildArm = (pivot: THREE.Group, side: number, elbow: THREE.Group) => {
      pivot.position.set(side * (fem ? 0.185 : 0.21) * bw, 1.42, 0);
      pivot.rotation.z = side * 0.09;
      const shoulder = new THREE.Mesh(G.sphere, armMat);
      shoulder.scale.setScalar((fem ? 0.047 : 0.056) * bw);
      const upper = new THREE.Mesh(G.capsule((fem ? 0.043 : 0.05) * bw, 0.2), armMat);
      upper.position.y = -0.15;
      elbow.position.y = -0.29;
      const fore = new THREE.Mesh(G.capsule((fem ? 0.035 : 0.04) * bw, 0.19), foreMat);
      fore.position.y = -0.13;
      const hand = new THREE.Mesh(G.sphere, skin);
      hand.scale.set(0.038, 0.055, 0.022);
      hand.position.y = -0.28;
      elbow.add(fore, hand);
      pivot.add(shoulder, upper, elbow);
      this.body.add(pivot);
    };
    buildArm(this.armL, -1, new THREE.Group());
    buildArm(this.armR, 1, this.elbowR);

    // Pescoço e cabeça
    const neck = new THREE.Mesh(G.neck, skin);
    neck.position.y = 1.54;
    this.body.add(neck);
    this.head.position.y = 1.655;
    const skull = new THREE.Mesh(G.sphere, skin);
    skull.scale.set(fem ? 0.088 : 0.093, 0.118, 0.1);
    const jaw = new THREE.Mesh(G.sphere, skin);
    jaw.scale.set(fem ? 0.07 : 0.078, 0.06, 0.08);
    jaw.position.set(0, -0.055, 0.012);
    const nose = new THREE.Mesh(G.sphere, skin);
    nose.scale.set(0.011, 0.018, 0.013);
    nose.position.set(0, -0.008, 0.097);
    const eyeMat = this.mat('#111317', 0.3);
    const browMat = this.mat(c.hairColor, 0.8);
    for (const s of [-1, 1]) {
      const eye = new THREE.Mesh(G.sphere, eyeMat);
      eye.scale.setScalar(0.0105);
      eye.position.set(s * 0.034, 0.018, 0.088);
      const brow = new THREE.Mesh(new THREE.BoxGeometry(0.032, 0.006, 0.008), browMat);
      brow.position.set(s * 0.035, 0.042, 0.092);
      brow.rotation.z = s * -0.08;
      const ear = new THREE.Mesh(G.sphere, skin);
      ear.scale.set(0.012, 0.026, 0.018);
      ear.position.set(s * 0.091, 0.005, 0);
      this.head.add(eye, brow, ear);
    }
    const mouth = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.004, 0.006), this.mat('#7a3b33', 0.6));
    mouth.position.set(0, -0.05, 0.088);
    this.head.add(skull, jaw, nose, mouth);
    this.buildHair(c, hair);
    if (c.accessory === 'oculos') {
      const fm = this.mat('#0c0c0c', 0.3, 0.4);
      for (const s of [-1, 1]) {
        const lens = new THREE.Mesh(new THREE.TorusGeometry(0.02, 0.0032, 6, 20), fm);
        lens.position.set(s * 0.034, 0.018, 0.1);
        this.head.add(lens);
      }
      const bridge = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.003, 0.003), fm);
      bridge.position.set(0, 0.022, 0.104);
      this.head.add(bridge);
    }
    if (c.accessory === 'headset') {
      const hm = this.mat('#151515', 0.4, 0.3);
      const band = new THREE.Mesh(new THREE.TorusGeometry(0.105, 0.007, 6, 24, Math.PI), hm);
      band.position.y = 0.01;
      const boom = new THREE.Mesh(new THREE.CylinderGeometry(0.003, 0.003, 0.11, 6), hm);
      boom.rotation.z = Math.PI / 2.4;
      boom.rotation.y = -0.6;
      boom.position.set(0.075, -0.05, 0.05);
      const pad = new THREE.Mesh(G.sphere, hm);
      pad.scale.set(0.018, 0.03, 0.03);
      pad.position.set(0.1, 0, 0);
      this.head.add(band, boom, pad);
    }
    this.body.add(this.head);

    // Sombra de contato
    const shadow = new THREE.Mesh(new THREE.PlaneGeometry(0.9, 0.9), new THREE.MeshBasicMaterial({ map: blobShadowTexture(), transparent: true, depthWrite: false, opacity: 0.8 }));
    shadow.rotation.x = -Math.PI / 2;
    shadow.position.y = 0.012;
    this.group.add(shadow);

    const k = c.height / 1.78;
    this.body.scale.setScalar(k);
    this.height = c.height;
    this.group.add(this.body);

    // Volume de seleção (clique/toque)
    this.hit = new THREE.Mesh(new THREE.BoxGeometry(0.7, c.height + 0.1, 0.6), new THREE.MeshBasicMaterial({ visible: false }));
    this.hit.position.y = (c.height + 0.1) / 2;
    this.group.add(this.hit);

    this.tag = new THREE.Sprite(new THREE.SpriteMaterial({ transparent: true, depthWrite: false }));
    this.tag.scale.set(1.25, 0.39, 1);
    this.tag.position.y = c.height + 0.38;
    this.tag.renderOrder = 10;
    this.group.add(this.tag);
    this.setStatus('offline');
  }

  private mat(color: string, roughness: number, metalness = 0) {
    const m = new THREE.MeshStandardMaterial({ color, roughness, metalness });
    this.disposables.push(m);
    return m;
  }

  private buildHair(c: AvatarConfig, hair: THREE.Material) {
    if (c.hair === 'raspado') {
      const cap = new THREE.Mesh(new THREE.SphereGeometry(1, 24, 16, 0, Math.PI * 2, 0, Math.PI * 0.42), hair);
      cap.scale.set((c.body === 'feminino' ? 0.088 : 0.093) * 1.03, 0.118 * 1.03, 0.1 * 1.03);
      cap.rotation.x = -0.2;
      (cap.material as THREE.MeshStandardMaterial).transparent = false;
      this.head.add(cap);
      return;
    }
    const fem = c.body === 'feminino';
    const sx = fem ? 0.088 : 0.093;
    const cap = new THREE.Mesh(new THREE.SphereGeometry(1, 32, 20, 0, Math.PI * 2, 0, Math.PI * 0.55), hair);
    cap.scale.set(sx * 1.08, 0.118 * 1.07, 0.1 * 1.08);
    cap.rotation.x = -0.32;
    cap.position.set(0, 0.006, -0.006);
    this.head.add(cap);
    const back = new THREE.Mesh(G.sphere, hair);
    back.scale.set(0.094, 0.095, 0.085);
    back.position.set(0, -0.004, -0.03);
    this.head.add(back);
    if (c.hair === 'coque') {
      const bun = new THREE.Mesh(G.sphere, hair);
      bun.scale.setScalar(0.045);
      bun.position.set(0, 0.08, -0.08);
      this.head.add(bun);
    }
    if (c.hair === 'longo') {
      const long = new THREE.Mesh(G.capsule(0.08, 0.16), hair);
      long.scale.set(1.15, 1, 0.45);
      long.position.set(0, -0.12, -0.06);
      this.head.add(long);
    }
    if (c.hair === 'cacheado') {
      for (let i = 0; i < 26; i++) {
        const a = (i / 26) * Math.PI * 2;
        const r = 0.095;
        const curl = new THREE.Mesh(G.sphere, hair);
        curl.scale.setScalar(0.03 + Math.random() * 0.012);
        const y = 0.03 + Math.random() * 0.08;
        curl.position.set(Math.sin(a) * r * 0.95, y, Math.cos(a) * r * 0.9 - 0.012);
        if (Math.cos(a) > 0.6 && y < 0.07) continue; // não cobrir o rosto
        this.head.add(curl);
      }
    }
  }

  setStatus(status: AvatarStatus, extra = '') {
    const key = `${status}|${extra}|${this.label.name}`;
    if (key === this.tagKey) return;
    this.tagKey = key;
    const w = 640;
    const h = 200;
    const c = canvas(w, h);
    const ctx = c.getContext('2d')!;
    const r = 34;
    ctx.fillStyle = 'rgba(8,10,14,0.82)';
    ctx.beginPath();
    ctx.roundRect(8, 8, w - 16, h - 16, r);
    ctx.fill();
    const color = status === 'online' ? '#22d39b' : status === 'talking' ? '#4ff0c8' : status === 'visitor' ? '#9aa3b5' : status === 'self' ? '#e9c46a' : '#6b7280';
    ctx.strokeStyle = color;
    ctx.lineWidth = 4;
    ctx.stroke();
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(54, 70, 14, 0, Math.PI * 2);
    ctx.fill();
    ctx.textBaseline = 'middle';
    ctx.textAlign = 'left';
    ctx.fillStyle = '#ffffff';
    fitText(ctx, this.label.name, w - 120, 58, 700, BODY_FONT);
    ctx.fillText(this.label.name, 84, 70);
    ctx.fillStyle = 'rgba(255,255,255,0.7)';
    fitText(ctx, this.label.sub, w - 80, 32, 500, BODY_FONT);
    ctx.fillText(this.label.sub, 40, 124);
    const statusText = status === 'online' ? 'ONLINE · ATENDIMENTO POR VOZ' : status === 'talking' ? 'EM ATENDIMENTO' : status === 'offline' ? 'OFFLINE' : status === 'self' ? 'VOCÊ' : 'VISITANTE';
    ctx.fillStyle = color;
    ctx.font = `700 28px ${DISPLAY_FONT}`;
    if ('letterSpacing' in ctx) (ctx as unknown as { letterSpacing: string }).letterSpacing = '3px';
    ctx.fillText(extra ? `${statusText} · ${extra}` : statusText, 40, 164);
    const mat = this.tag.material as THREE.SpriteMaterial;
    mat.map?.dispose();
    mat.map = toTexture(c);
    mat.needsUpdate = true;
  }

  showTag(v: boolean) {
    this.tag.visible = v;
  }

  /** Animação procedural: respiração, caminhada e gestos de fala. */
  update(dt: number, moving: boolean, talking: boolean, speed = 1) {
    this.idleT += dt;
    const target = moving ? 1 : 0;
    this.phase += dt * (moving ? 7.5 * speed : 0);
    const swing = Math.sin(this.phase) * 0.55 * target;
    this.legL.rotation.x = swing;
    this.legR.rotation.x = -swing;
    this.kneeL.rotation.x = Math.max(0, -Math.sin(this.phase + 0.6)) * 0.7 * target;
    this.kneeR.rotation.x = Math.max(0, Math.sin(this.phase + 0.6)) * 0.7 * target;
    this.armL.rotation.x = -swing * 0.7 + Math.sin(this.idleT * 1.3) * 0.02;
    this.armR.rotation.x = swing * 0.7;
    this.body.position.y = moving ? Math.abs(Math.cos(this.phase)) * 0.025 : 0;
    const breath = 1 + Math.sin(this.idleT * 1.6) * 0.008;
    this.torso.scale.y = breath;
    if (talking && !moving) {
      this.elbowR.rotation.x = -1.1 + Math.sin(this.idleT * 3) * 0.25;
      this.armR.rotation.x = -0.35 + Math.sin(this.idleT * 2.2) * 0.1;
      this.head.rotation.x = Math.sin(this.idleT * 6) * 0.04;
      this.head.rotation.y = Math.sin(this.idleT * 0.9) * 0.15;
    } else {
      this.elbowR.rotation.x = moving ? -0.2 : -0.08;
      this.head.rotation.x = 0;
      this.head.rotation.y = Math.sin(this.idleT * 0.35) * 0.25;
    }
  }

  dispose() {
    this.group.traverse((o) => {
      const m = o as THREE.Mesh;
      if (m.geometry && m.geometry !== G.sphere && m.geometry !== G.neck) m.geometry.dispose();
    });
    this.disposables.forEach((d) => d.dispose());
    const tm = this.tag.material as THREE.SpriteMaterial;
    tm.map?.dispose();
    tm.dispose();
  }
}
