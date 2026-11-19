import * as THREE from 'three';
import type { Brand, Product, Seller } from '@/domain/types';
import { LedScreen, boothScreenDraw } from './screens';
import { buildProduct } from './products';
import { blobShadowTexture, carpetTexture, logoTexture, readableOn, signTexture, woodTexture } from './textures';

// Construtor paramétrico de estandes. Cada marca escolhe arquitetura, cores,
// iluminação, piso, decoração, logotipo, telão e número de vitrines/balcões.
// Coordenadas locais: frente do estande em +Z, largura em X.

export interface LocalBox { cx: number; cz: number; w: number; d: number }
export interface SellerSpot { x: number; z: number; ry: number }

export interface BoothBuild {
  group: THREE.Group;
  /** Itens de detalhe (produtos) — ocultados à distância para desempenho. */
  detail: THREE.Group;
  screens: LedScreen[];
  colliders: LocalBox[];
  sellerSpots: SellerSpot[];
  interactables: THREE.Object3D[];
  spinners: THREE.Object3D[];
  dispose(): void;
}

export interface BoothInput {
  brand: Brand;
  products: Product[];
  sellers: Seller[];
  w: number;
  d: number;
  slotLabel: string;
  quality: 'alta' | 'media' | 'baixa';
}

export function buildBooth(input: BoothInput): BoothBuild {
  const { brand, w: W, d: D } = input;
  const b = brand.booth;
  const group = new THREE.Group();
  const detail = new THREE.Group();
  group.add(detail);
  const disposables: { dispose(): void }[] = [];
  const screens: LedScreen[] = [];
  const colliders: LocalBox[] = [];
  const sellerSpots: SellerSpot[] = [];
  const interactables: THREE.Object3D[] = [];
  const spinners: THREE.Object3D[] = [];
  const hw = W / 2;
  const hd = D / 2;
  const FLOOR = 0.12;

  const track = <T extends { dispose(): void }>(x: T) => {
    disposables.push(x);
    return x;
  };
  const std = (color: string, roughness = 0.5, metalness = 0, extra: THREE.MeshStandardMaterialParameters = {}) =>
    track(new THREE.MeshStandardMaterial({ color, roughness, metalness, ...extra }));
  const glow = (color: string, k = 1) => {
    const m = track(new THREE.MeshBasicMaterial({ color, toneMapped: false }));
    m.color.multiplyScalar(1.2 * k * (0.55 + b.lightingIntensity * 0.45));
    return m;
  };
  const box = (w: number, h: number, d: number, mat: THREE.Material | THREE.Material[], x = 0, y = 0, z = 0, parent: THREE.Object3D = group) => {
    const m = new THREE.Mesh(track(new THREE.BoxGeometry(w, h, d)), mat);
    m.position.set(x, y, z);
    parent.add(m);
    return m;
  };
  const plane = (w: number, h: number, mat: THREE.Material, x: number, y: number, z: number, ry = 0, parent: THREE.Object3D = group) => {
    const m = new THREE.Mesh(track(new THREE.PlaneGeometry(w, h)), mat);
    m.position.set(x, y, z);
    m.rotation.y = ry;
    parent.add(m);
    return m;
  };

  // evita superfícies brancas "estouradas" sob a iluminação e o bloom
  const tame = (hex: string) => {
    const c = new THREE.Color(hex);
    const max = Math.max(c.r, c.g, c.b);
    if (max > 0.82) c.multiplyScalar(0.82 / max);
    return `#${c.getHexString()}`;
  };
  const primary = std(tame(b.primaryColor), 0.42, 0.15);
  const primaryMatte = std(tame(b.primaryColor), 0.75, 0.0);
  const secondary = std(tame(b.secondaryColor), 0.38, 0.1);
  const metal = std('#9aa0a8', 0.28, 0.9);
  const darkMetal = std('#1b1d22', 0.35, 0.8);
  const ledLight = glow(b.lightingColor, 1);
  const ledAccent = glow(b.secondaryColor, 0.9);
  const glass = track(new THREE.MeshPhysicalMaterial({ color: '#dfe9f2', roughness: 0.04, metalness: 0, transparent: true, opacity: 0.16, envMapIntensity: 1.6, depthWrite: false, side: THREE.DoubleSide }));
  const glassShelf = track(new THREE.MeshPhysicalMaterial({ color: '#cfe0ea', roughness: 0.08, transparent: true, opacity: 0.35, envMapIntensity: 1.2 }));
  const fg = readableOn(b.primaryColor);

  const logoTex = track(logoTexture({ text: b.logoText || brand.name, image: b.logoImage, mode: b.logoMode, color: fg === '#ffffff' ? '#ffffff' : b.primaryColor, accent: b.secondaryColor }));
  const logoTexOnSecondary = track(logoTexture({ text: b.logoText || brand.name, image: b.logoImage, mode: b.logoMode, color: readableOn(b.secondaryColor), accent: b.primaryColor }));
  const logoMat = track(new THREE.MeshBasicMaterial({ map: logoTex, transparent: true, toneMapped: false, depthWrite: false }));
  logoMat.color.setScalar(fg === '#ffffff' ? 1.25 : 1);
  const logoMatOnSecondary = track(new THREE.MeshBasicMaterial({ map: logoTexOnSecondary, transparent: true, toneMapped: false, depthWrite: false }));

  const featured = input.products.filter((p) => p.featured);
  const showcase = featured.length ? featured : input.products;
  let pIdx = 0;
  const nextProduct = () => (showcase.length ? showcase[pIdx++ % showcase.length] : null);

  // ---------- Piso ----------
  let floorMat: THREE.Material;
  if (b.floor === 'madeira') {
    const t = track(woodTexture());
    t.repeat.set(W / 4, D / 4);
    floorMat = std('#ffffff', 0.45, 0, { map: t });
  } else if (b.floor === 'carpete') {
    const t = track(carpetTexture(`#${new THREE.Color(b.primaryColor).multiplyScalar(0.8).getHexString()}`));
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.repeat.set(W / 3, D / 3);
    floorMat = std('#ffffff', 0.95, 0, { map: t });
  } else {
    floorMat = std(`#${new THREE.Color(b.primaryColor).lerp(new THREE.Color('#0a0a0a'), 0.35).getHexString()}`, 0.12, 0.25);
  }
  box(W, FLOOR, D, floorMat, 0, FLOOR / 2, 0);
  // faixa de LED no perímetro do piso
  box(W + 0.02, 0.025, 0.03, ledLight, 0, 0.05, hd + 0.005);
  box(W + 0.02, 0.025, 0.03, ledLight, 0, 0.05, -hd - 0.005);
  box(0.03, 0.025, D, ledLight, hw + 0.005, 0.05, 0);
  box(0.03, 0.025, D, ledLight, -hw - 0.005, 0.05, 0);

  // ---------- Peças reutilizáveis ----------

  const addScreen = (sw: number, sh: number, x: number, y: number, z: number, ry = 0, res = 1024) => {
    const ticker = input.products.slice(0, 6).map((p) => `${p.name.toUpperCase()}  R$ ${(p.promoPrice ?? p.price).toFixed(2).replace('.', ',')}`);
    const scr = new LedScreen(res, Math.round((res * sh) / sw), boothScreenDraw({
      primary: b.primaryColor, secondary: b.secondaryColor, accent: b.accentColor, headline: b.screenHeadline || brand.name,
      subline: b.screenSubline, brand: brand.name, ticker, image: b.screenImage,
    }), 12);
    screens.push(scr);
    const holder = new THREE.Group();
    holder.position.set(x, y, z);
    holder.rotation.y = ry;
    group.add(holder);
    box(sw + 0.12, sh + 0.12, 0.08, darkMetal, 0, 0, -0.045, holder);
    const m = plane(sw, sh, scr.material, 0, 0, 0.001, 0, holder);
    m.userData = { kind: 'screen', brandId: brand.id };
    interactables.push(m);
    return holder;
  };

  const addCounter = (x: number, z: number, ry = 0) => {
    const c = new THREE.Group();
    c.position.set(x, FLOOR, z);
    c.rotation.y = ry;
    group.add(c);
    box(2.8, 1.0, 0.75, secondary, 0, 0.5, 0, c);
    box(3.0, 0.05, 0.9, std(tame(b.accentColor === '#ffffff' ? '#cfd0cc' : b.accentColor), 0.3, 0.1), 0, 1.025, 0, c);
    box(2.7, 0.03, 0.02, ledLight, 0, 0.06, 0.38, c);
    plane(2.2, 0.62, logoMatOnSecondary, 0, 0.55, 0.376, 0, c);
    // tablet de catálogo sobre o balcão
    const tab = box(0.32, 0.015, 0.22, std('#0e0f12', 0.2, 0.5), 0.9, 1.06, 0.05, c);
    tab.rotation.x = -0.25;
    const sp = new THREE.Vector3(0, 0, -0.95).applyAxisAngle(new THREE.Vector3(0, 1, 0), ry);
    sellerSpots.push({ x: x + sp.x, z: z + sp.z, ry });
    const rx = Math.abs(Math.sin(ry)) > 0.5;
    colliders.push({ cx: x, cz: z, w: rx ? 0.9 : 3.0, d: rx ? 3.0 : 0.9 });
    // banquetas
    for (const s of [-0.8, 0.8]) {
      const st = new THREE.Group();
      const p = new THREE.Vector3(s, 0, 0.95).applyAxisAngle(new THREE.Vector3(0, 1, 0), ry);
      st.position.set(x + p.x, FLOOR, z + p.z);
      group.add(st);
      box(0.04, 0.72, 0.04, metal, 0, 0.36, 0, st);
      const seat = new THREE.Mesh(track(new THREE.CylinderGeometry(0.2, 0.2, 0.07, 24)), std('#141414', 0.6));
      seat.position.y = 0.76;
      st.add(seat);
      const base = new THREE.Mesh(track(new THREE.CylinderGeometry(0.22, 0.22, 0.02, 24)), metal);
      base.position.y = 0.01;
      st.add(base);
    }
  };

  const addVitrine = (x: number, z: number, ry = 0) => {
    const v = new THREE.Group();
    v.position.set(x, FLOOR, z);
    v.rotation.y = ry;
    group.add(v);
    const VW = 1.5;
    const VD = 0.6;
    box(VW, 0.4, VD, primaryMatte, 0, 0.2, 0, v);
    box(VW, 0.14, VD, primaryMatte, 0, 2.27, 0, v);
    box(VW - 0.1, 0.02, VD - 0.1, ledLight, 0, 2.195, 0, v);
    box(VW, 1.86, 0.04, std(`#${new THREE.Color(b.secondaryColor).multiplyScalar(0.55).getHexString()}`, 0.6), 0, 1.33, -VD / 2 + 0.02, v);
    for (const s of [-1, 1]) box(0.035, 1.86, 0.035, metal, s * (VW / 2 - 0.018), 1.33, VD / 2 - 0.018, v);
    plane(VW - 0.04, 1.86, glass, 0, 1.33, VD / 2 - 0.01, 0, v);
    for (const s of [-1, 1]) plane(VD - 0.06, 1.86, glass, s * (VW / 2 - 0.01), 1.33, 0, Math.PI / 2, v);
    const shelves = [0.4, 0.98, 1.56];
    shelves.forEach((y, i) => {
      if (i > 0) box(VW - 0.08, 0.02, VD - 0.08, glassShelf, 0, y, 0.0, v);
      [-0.36, 0.36].forEach((sx) => {
        const p = nextProduct();
        if (!p) return;
        const pm = buildProduct(p, brand.name, b.secondaryColor, 1.3);
        pm.position.set(sx, y + 0.012, 0.02);
        // produtos vão para o grupo de detalhe, mantendo a transformação da vitrine
        const holder = new THREE.Group();
        holder.position.copy(v.position);
        holder.rotation.copy(v.rotation);
        holder.add(pm);
        detail.add(holder);
        interactables.push(pm.userData.hit);
      });
    });
    const rx = Math.abs(Math.sin(ry)) > 0.5;
    colliders.push({ cx: x, cz: z, w: rx ? VD + 0.1 : VW + 0.1, d: rx ? VW + 0.1 : VD + 0.1 });
    // sombra de contato
    const sh = plane(VW * 1.4, VD * 2.2, track(new THREE.MeshBasicMaterial({ map: blobShadowTexture(), transparent: true, depthWrite: false, opacity: 0.6 })), 0, 0.005, 0, 0, v);
    sh.rotation.x = -Math.PI / 2;
  };

  const addPedestal = (x: number, z: number) => {
    const p = input.products.find((q) => q.isLaunch) ?? nextProduct();
    const g = new THREE.Group();
    g.position.set(x, FLOOR, z);
    group.add(g);
    const ped = new THREE.Mesh(track(new THREE.CylinderGeometry(0.42, 0.48, 1.0, 40)), std(tame(b.accentColor === '#ffffff' ? '#d6d6d2' : b.accentColor), 0.25, 0.2));
    ped.position.y = 0.5;
    const ring = new THREE.Mesh(track(new THREE.TorusGeometry(0.43, 0.015, 8, 48)), ledAccent);
    ring.rotation.x = Math.PI / 2;
    ring.position.y = 1.0;
    const dome = new THREE.Mesh(track(new THREE.CylinderGeometry(0.36, 0.36, 0.8, 32, 1, true)), glass);
    dome.position.y = 1.42;
    g.add(ped, ring, dome);
    if (p) {
      const pm = buildProduct(p, brand.name, b.secondaryColor, 2.2);
      const spin = new THREE.Group();
      spin.position.set(x, FLOOR + 1.02, z);
      spin.add(pm);
      spin.userData.spin = 0.5;
      detail.add(spin);
      spinners.push(spin);
      interactables.push(pm.userData.hit);
      const tag = plane(0.9, 0.22, track(new THREE.MeshBasicMaterial({ map: track(signTexture({ text: p.isLaunch ? 'LANÇAMENTO' : 'DESTAQUE', bg: b.secondaryColor, color: readableOn(b.secondaryColor), w: 512, h: 128 })), toneMapped: false })), 0, 0.72, 0.481, 0, g);
      tag.rotation.y = 0;
    }
    colliders.push({ cx: x, cz: z, w: 1.1, d: 1.1 });
  };

  const addPlanter = (x: number, z: number) => {
    const g = new THREE.Group();
    g.position.set(x, FLOOR, z);
    group.add(g);
    box(0.7, 0.55, 0.7, std('#e8e4dc', 0.6), 0, 0.275, 0, g);
    const leaf = std('#2f6b34', 0.85);
    const leaf2 = std('#3f8a3f', 0.85);
    for (let i = 0; i < 9; i++) {
      const s = new THREE.Mesh(track(new THREE.IcosahedronGeometry(0.22 + Math.random() * 0.12, 1)), i % 2 ? leaf : leaf2);
      s.position.set((Math.random() - 0.5) * 0.45, 0.75 + Math.random() * 0.7, (Math.random() - 0.5) * 0.45);
      s.scale.y = 1.3;
      g.add(s);
    }
    colliders.push({ cx: x, cz: z, w: 0.8, d: 0.8 });
  };

  const addTrussTower = (x: number, z: number, h = 5.5) => {
    const g = new THREE.Group();
    g.position.set(x, FLOOR, z);
    group.add(g);
    const s = 0.32;
    for (const [a, c] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) box(0.045, h, 0.045, metal, (a * s) / 2, h / 2, (c * s) / 2, g);
    for (let y = 0.4; y < h; y += 0.5) {
      box(s, 0.03, 0.03, metal, 0, y, s / 2, g);
      box(s, 0.03, 0.03, metal, 0, y, -s / 2, g);
      box(0.03, 0.03, s, metal, s / 2, y, 0, g);
      box(0.03, 0.03, s, metal, -s / 2, y, 0, g);
    }
    colliders.push({ cx: x, cz: z, w: 0.5, d: 0.5 });
  };

  const addNeonRing = (x: number, y: number, z: number, ry: number, r = 0.9) => {
    const t = new THREE.Mesh(track(new THREE.TorusGeometry(r, 0.035, 10, 64)), glow(b.secondaryColor, 1.3));
    t.position.set(x, y, z);
    t.rotation.y = ry;
    group.add(t);
  };

  const addDumbbellRack = (x: number, z: number, ry: number) => {
    const g = new THREE.Group();
    g.position.set(x, FLOOR, z);
    g.rotation.y = ry;
    group.add(g);
    box(1.6, 0.06, 0.5, darkMetal, 0, 0.75, 0, g);
    box(1.6, 0.06, 0.5, darkMetal, 0, 0.35, 0, g);
    for (const s of [-0.75, 0.75]) box(0.06, 0.8, 0.5, darkMetal, s, 0.4, 0, g);
    const plate = std('#202226', 0.4, 0.6);
    const handle = std('#c9ccd1', 0.25, 0.9);
    for (const yy of [0.84, 0.44]) {
      for (let i = 0; i < 4; i++) {
        const dx = -0.55 + i * 0.37;
        const hnd = new THREE.Mesh(track(new THREE.CylinderGeometry(0.018, 0.018, 0.3, 8)), handle);
        hnd.rotation.x = Math.PI / 2;
        hnd.position.set(dx, yy + 0.05, 0);
        g.add(hnd);
        for (const e of [-0.13, 0.13]) {
          const pl = new THREE.Mesh(track(new THREE.CylinderGeometry(0.06 + i * 0.006, 0.06 + i * 0.006, 0.06, 6)), plate);
          pl.rotation.x = Math.PI / 2;
          pl.position.set(dx, yy + 0.06 + i * 0.004, e);
          g.add(pl);
        }
      }
    }
    const rx = Math.abs(Math.sin(ry)) > 0.5;
    colliders.push({ cx: x, cz: z, w: rx ? 0.6 : 1.7, d: rx ? 1.7 : 0.6 });
  };

  const addSlotMarker = (x: number, z: number, ry: number) => {
    const g = new THREE.Group();
    g.position.set(x, 0, z);
    g.rotation.y = ry;
    group.add(g);
    box(0.5, 2.8, 0.5, std('#111317', 0.4, 0.4), 0, 1.4, 0, g);
    box(0.52, 0.04, 0.52, ledLight, 0, 2.8, 0, g);
    const t = track(signTexture({ text: input.slotLabel, sub: brand.name, bg: '#111317', color: '#ffffff', subColor: '#e9c46a', w: 256, h: 512 }));
    const m = track(new THREE.MeshBasicMaterial({ map: t, toneMapped: false }));
    plane(0.46, 0.92, m, 0, 2.2, 0.252, 0, g);
    plane(0.46, 0.92, m, 0, 2.2, -0.252, Math.PI, g);
    colliders.push({ cx: x, cz: z, w: 0.6, d: 0.6 });
  };

  const addDecoration = (corners: [number, number][]) => {
    corners.forEach(([x, z], i) => {
      if (b.decoration === 'natural') addPlanter(x, z);
      else if (b.decoration === 'industrial') addTrussTower(x, z, 5);
      else if (b.decoration === 'neon') {
        if (i === 0) addNeonRing(x, 1.6, z, 0, 0.8);
        else addTrussTower(x, z, 3);
      } else {
        // minimalista: cubos brancos com produto
        const p = nextProduct();
        box(0.6, 0.9, 0.6, std('#cfcfcb', 0.3), x, FLOOR + 0.45, z);
        if (p) {
          const pm = buildProduct(p, brand.name, b.secondaryColor, 1.5);
          pm.position.set(x, FLOOR + 0.9, z);
          detail.add(pm);
          interactables.push(pm.userData.hit);
        }
        colliders.push({ cx: x, cz: z, w: 0.7, d: 0.7 });
      }
    });
  };

  const addHangingRig = (y: number, size: number, h = 1.4) => {
    const g = new THREE.Group();
    g.position.y = y;
    group.add(g);
    for (const [ry, ox, oz] of [[0, 0, size / 2], [Math.PI, 0, -size / 2], [Math.PI / 2, size / 2, 0], [-Math.PI / 2, -size / 2, 0]] as const) {
      const side = new THREE.Group();
      side.position.set(ox, 0, oz);
      side.rotation.y = ry;
      g.add(side);
      box(size, h, 0.2, primary, 0, 0, 0, side);
      plane(size * 0.8, h * 0.8, logoMat, 0, 0, 0.105, 0, side);
      box(size, 0.04, 0.22, ledLight, 0, -h / 2 - 0.02, 0, side);
    }
    for (const [x, z] of [[-size / 2, -size / 2], [size / 2, -size / 2], [size / 2, size / 2], [-size / 2, size / 2]]) {
      const cable = new THREE.Mesh(track(new THREE.CylinderGeometry(0.008, 0.008, 15 - y, 4)), darkMetal);
      cable.position.set(x, (15 - y) / 2 + h / 2, z);
      g.add(cable);
    }
  };

  // ---------- Arquiteturas ----------
  const vit = Math.max(1, Math.min(4, b.vitrineCount));
  const cnt = Math.max(1, Math.min(2, b.counters));

  if (b.architecture === 'ilha') {
    const tower = box(2.6, 6, 2.6, primary, 0, 3 + FLOOR, -1);
    tower.userData.solid = true;
    colliders.push({ cx: 0, cz: -1, w: 2.8, d: 2.8 });
    for (const [ry, ox, oz] of [[0, 0, 1.31], [Math.PI, 0, -1.31], [Math.PI / 2, 1.31, 0], [-Math.PI / 2, -1.31, 0]] as const) {
      addScreen(2.3, 1.3, ox, 3.9, -1 + oz, ry, 768);
      const lg = plane(2.3, 0.72, logoMat, ox * 1.004, 5.6, -1 + oz * 1.004, ry);
      lg.renderOrder = 2;
    }
    box(2.64, 0.05, 2.64, ledLight, 0, 6.1 + FLOOR, -1);
    addHangingRig(8.6, 10);
    addCounter(0, 4.4, 0);
    if (cnt > 1) addCounter(0, -5.9, Math.PI);
    const vpos: [number, number, number][] = [[-6.2, 0.5, -Math.PI / 2], [6.2, 0.5, Math.PI / 2], [-6.2, -4, -Math.PI / 2], [6.2, -4, Math.PI / 2]];
    vpos.slice(0, vit).forEach(([x, z, r]) => addVitrine(x, z, r));
    addPedestal(-4.3, 5.2);
    addDecoration([[5.6, 5.8], [-6.2, -6.6]]);
    addSlotMarker(hw - 0.4, hd - 0.4, 0);
  } else if (b.architecture === 'peninsula') {
    box(W, 5, 0.4, primary, 0, 2.5 + FLOOR, -hd + 0.2);
    box(7.4, 1.5, 0.5, secondary, 0, 5.85 + FLOOR, -hd + 0.25);
    plane(6.8, 1.25, logoMatOnSecondary, 0, 5.85 + FLOOR, -hd + 0.51);
    addScreen(6.4, 3.6, 0, 2.9, -hd + 0.42);
    box(W, 0.05, 0.1, ledLight, 0, 5 + FLOOR, -hd + 0.42);
    colliders.push({ cx: 0, cz: -hd + 0.2, w: W, d: 0.5 });
    // ala lateral
    box(0.4, 4, 7.5, secondary, -hw + 0.2, 2 + FLOOR, -hd + 3.75);
    const tag = track(signTexture({ text: b.tagline || brand.name, bg: null, color: readableOn(b.secondaryColor), w: 1024, h: 256 }));
    const tagMat = track(new THREE.MeshBasicMaterial({ map: tag, transparent: true, toneMapped: false }));
    plane(6, 1.5, tagMat, -hw + 0.41, 3.1, -hd + 3.75, Math.PI / 2);
    plane(6, 1.5, logoMatOnSecondary, -hw - 0.01, 3.1, -hd + 3.75, -Math.PI / 2);
    colliders.push({ cx: -hw + 0.2, cz: -hd + 3.75, w: 0.5, d: 7.5 });
    const vpos: [number, number, number][] = [[-4.6, -hd + 1.1, 0], [4.6, -hd + 1.1, 0], [-hw + 1.0, -2.0, Math.PI / 2], [hw - 1.0, -2.0, -Math.PI / 2]];
    vpos.slice(0, vit).forEach(([x, z, r]) => addVitrine(x, z, r));
    addCounter(1.6, 3.2, 0);
    if (cnt > 1) addCounter(-3.4, 1.4, Math.PI / 2);
    addPedestal(-4.5, 4.8);
    addDecoration([[hw - 0.9, -hd + 1.0], [hw - 0.9, 4.5]]);
    addSlotMarker(hw - 0.4, hd - 0.4, 0);
  } else if (b.architecture === 'mezanino') {
    const deckZ0 = -hd;
    const deckZ1 = -0.6;
    const deckD = deckZ1 - deckZ0;
    const deckY = 3.5;
    box(W, 0.3, deckD, primary, 0, deckY + 0.15, (deckZ0 + deckZ1) / 2);
    // luzes embutidas sob o mezanino
    for (let x = -5; x <= 5; x += 2.5) {
      const disc = new THREE.Mesh(track(new THREE.CircleGeometry(0.16, 20)), glow('#ffffff', 1.1));
      disc.rotation.x = Math.PI / 2;
      disc.position.set(x, deckY - 0.005, (deckZ0 + deckZ1) / 2);
      group.add(disc);
    }
    for (const [x, z] of [[-hw + 0.3, deckZ1 - 0.25], [hw - 0.3, deckZ1 - 0.25], [-hw + 0.3, deckZ0 + 0.3], [hw - 0.3, deckZ0 + 0.3], [0, deckZ1 - 0.25]]) {
      box(0.3, deckY, 0.3, metal, x, deckY / 2 + FLOOR, z);
      colliders.push({ cx: x, cz: z, w: 0.45, d: 0.45 });
    }
    // fachada com logotipo + guarda-corpo de vidro
    box(W, 0.9, 0.12, secondary, 0, deckY + 0.05, deckZ1 + 0.06);
    plane(W * 0.55, 0.78, logoMatOnSecondary, 0, deckY + 0.05, deckZ1 + 0.125);
    box(W, 0.03, 0.06, ledLight, 0, deckY - 0.42, deckZ1 + 0.1);
    plane(W - 0.2, 1.0, glass, 0, deckY + 0.8, deckZ1 - 0.02);
    box(W - 0.2, 0.05, 0.06, metal, 0, deckY + 1.32, deckZ1 - 0.02);
    // parede superior com telão
    box(W, 3.6, 0.3, primaryMatte, 0, deckY + 0.3 + 1.8, deckZ0 + 0.15);
    addScreen(6.2, 2.8, 0, deckY + 2.0, deckZ0 + 0.32);
    plane(4.4, 0.85, logoMat, 0, deckY + 3.9, deckZ0 + 0.31);
    // lounge VIP no mezanino
    const sofa = std('#16171b', 0.8);
    for (const x of [-4.5, 4.5]) {
      box(2.2, 0.4, 0.8, sofa, x, deckY + 0.5, deckZ0 + 1.4);
      box(2.2, 0.5, 0.2, sofa, x, deckY + 0.8, deckZ0 + 1.0);
    }
    // escada
    const steps = 12;
    for (let i = 0; i < steps; i++) {
      box(1.3, 0.05, 0.32, std('#e6e6e6', 0.4), hw - 1.0, FLOOR + (i + 1) * (deckY / steps), deckZ1 + 3.8 - i * 0.32);
    }
    box(0.05, 0.05, steps * 0.34, metal, hw - 1.65, deckY / 2 + 1.0, deckZ1 + 3.8 - (steps * 0.32) / 2).rotation.x = -Math.atan(deckY / (steps * 0.32));
    colliders.push({ cx: hw - 1.0, cz: deckZ1 + 3.8 - (steps * 0.32) / 2 + 0.16, w: 1.5, d: steps * 0.32 + 0.4 });
    const vpos: [number, number, number][] = [[-4.6, deckZ0 + 0.8, 0], [0, deckZ0 + 0.8, 0], [4.2, deckZ0 + 0.8, 0], [-hw + 0.9, 2.8, Math.PI / 2]];
    vpos.slice(0, vit).forEach(([x, z, r]) => addVitrine(x, z, r));
    addCounter(-1.4, 3.7, 0);
    if (cnt > 1) addCounter(-1.4, -3.8, 0);
    addPedestal(-5.4, 5.6);
    addDecoration([[2.6, 6.2]]);
    addSlotMarker(hw - 0.4, hd - 0.4, 0);
  } else {
    // portal
    const archMat = primary;
    const archW = 10;
    const archH = 6.2;
    const t = 0.65;
    const shape = new THREE.Shape();
    const R = 2.2;
    const ow = archW / 2;
    const iw = ow - t;
    const ih = archH - t;
    const r2 = R - t;
    shape.moveTo(-ow, 0);
    shape.lineTo(-ow, archH - R);
    shape.absarc(-ow + R, archH - R, R, Math.PI, Math.PI / 2, true);
    shape.lineTo(ow - R, archH);
    shape.absarc(ow - R, archH - R, R, Math.PI / 2, 0, true);
    shape.lineTo(ow, 0);
    shape.lineTo(iw, 0);
    shape.lineTo(iw, ih - r2);
    shape.absarc(iw - r2, ih - r2, r2, 0, Math.PI / 2, false);
    shape.lineTo(-iw + r2, ih);
    shape.absarc(-iw + r2, ih - r2, r2, Math.PI / 2, Math.PI, false);
    shape.lineTo(-iw, 0);
    shape.closePath();
    const archGeo = track(new THREE.ExtrudeGeometry(shape, { depth: 0.5, bevelEnabled: true, bevelSize: 0.04, bevelThickness: 0.04, bevelSegments: 2, curveSegments: 24 }));
    // faixa de LED interna
    const strip = new THREE.Shape();
    const sw = 0.07;
    strip.moveTo(-iw, 0);
    strip.lineTo(-iw, ih - r2);
    strip.absarc(-iw + r2, ih - r2, r2, Math.PI, Math.PI / 2, true);
    strip.lineTo(iw - r2, ih);
    strip.absarc(iw - r2, ih - r2, r2, Math.PI / 2, 0, true);
    strip.lineTo(iw, 0);
    strip.lineTo(iw - sw, 0);
    strip.lineTo(iw - sw, ih - r2);
    strip.absarc(iw - r2, ih - r2, r2 - sw, 0, Math.PI / 2, false);
    strip.lineTo(-iw + r2, ih - sw);
    strip.absarc(-iw + r2, ih - r2, r2 - sw, Math.PI / 2, Math.PI, false);
    strip.lineTo(-iw + sw, 0);
    strip.closePath();
    const stripGeo = track(new THREE.ExtrudeGeometry(strip, { depth: 0.52, bevelEnabled: false, curveSegments: 24 }));
    [5.2, 1.0, -3.2].forEach((z, i) => {
      const a = new THREE.Mesh(archGeo, i === 1 ? secondary : archMat);
      a.position.set(0, FLOOR, z - 0.25);
      group.add(a);
      const s = new THREE.Mesh(stripGeo, ledLight);
      s.position.set(0, FLOOR, z - 0.26);
      group.add(s);
      colliders.push({ cx: -ow + t / 2, cz: z, w: t + 0.15, d: 0.7 });
      colliders.push({ cx: ow - t / 2, cz: z, w: t + 0.15, d: 0.7 });
    });
    plane(5.4, 0.62, logoMat, 0, FLOOR + archH - 0.33, 5.2 + 0.3);
    // totem de LED no fundo
    box(7.6, 5.0, 0.4, darkMetal, 0, 2.5 + FLOOR, -hd + 0.5);
    addScreen(7.0, 3.9, 0, 2.75, -hd + 0.72);
    plane(4.0, 0.6, logoMat, 0, 4.85 + FLOOR, -hd + 0.71);
    colliders.push({ cx: 0, cz: -hd + 0.5, w: 7.8, d: 0.6 });
    const vpos: [number, number, number][] = [[-5.9, 3.1, Math.PI / 2], [5.9, 3.1, -Math.PI / 2], [-5.9, -1.1, Math.PI / 2], [5.9, -1.1, -Math.PI / 2]];
    vpos.slice(0, vit).forEach(([x, z, r]) => addVitrine(x, z, r));
    addCounter(0, -4.6, 0);
    if (cnt > 1) addCounter(3.0, -1.1, -Math.PI / 2);
    addPedestal(0, 6.6);
    addDecoration([[-hw + 0.7, hd - 0.8], [-hw + 0.7, -hd + 0.8], [hw - 0.7, -hd + 0.8]]);
    addSlotMarker(hw - 0.4, hd - 0.4, 0);
  }

  // destaque de decoração industrial: rack de halteres na lateral
  if (b.decoration === 'industrial' && b.architecture !== 'peninsula') addDumbbellRack(hw - 1.3, 0.5, -Math.PI / 2);
  if (b.decoration === 'neon') addNeonRing(hw - 0.05, 2.4, -1.5, Math.PI / 2, 1.1);

  group.traverse((o) => {
    if ((o as THREE.Mesh).isMesh) o.matrixAutoUpdate = true;
  });

  return {
    group, detail, screens, colliders, sellerSpots, interactables, spinners,
    dispose() {
      screens.forEach((s) => s.dispose());
      disposables.forEach((d) => d.dispose());
    },
  };
}
