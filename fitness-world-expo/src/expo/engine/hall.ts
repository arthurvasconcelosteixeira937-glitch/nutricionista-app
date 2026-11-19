import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import type { Product } from '@/domain/types';
import { HALL, LAUNCH_PODIUM, STAGE, type AABB } from './layout';
import { LedScreen, adScreenDraw, directoryDraw, sponsorTotemDraw, stageScreenDraw } from './screens';
import { buildProduct } from './products';
import { carpetTexture, concreteTexture, floorLogoTexture, muralTexture, signTexture } from './textures';

// Arquitetura do centro de convenções: piso, paredes, fachada de vidro,
// treliça espacial no teto, lobby com arco de entrada, sinalização,
// arena de lançamentos e Palco Principal com telão.

export interface HallData {
  seasonLabel: string;
  seasonTheme: string;
  namingSponsor: string | null;
  sponsors: () => { name: string; tier: string }[];
  ad: (location: string) => { advertiser: string | null; message: string; slotName: string } | null;
  directory: () => { left: { slot: string; name: string; color: string }[]; right: { slot: string; name: string; color: string }[] };
  stage: () => { title: string; when: string; label: string; sponsor: string | null; ad: { advertiser: string | null; message: string } | null };
}

export interface HallBuild {
  group: THREE.Group;
  screens: LedScreen[];
  colliders: AABB[];
  interactables: THREE.Object3D[];
  setLaunches(items: { product: Product; brandName: string; accent: string }[]): void;
  update(t: number, dt: number): void;
  dispose(): void;
}

export function buildHall(data: HallData, quality: 'alta' | 'media' | 'baixa'): HallBuild {
  const group = new THREE.Group();
  const disposables: { dispose(): void }[] = [];
  const screens: LedScreen[] = [];
  const colliders: AABB[] = [];
  const interactables: THREE.Object3D[] = [];
  const animated: ((t: number, dt: number) => void)[] = [];
  const track = <T extends { dispose(): void }>(x: T) => {
    disposables.push(x);
    return x;
  };
  const std = (color: string, roughness = 0.5, metalness = 0, extra: THREE.MeshStandardMaterialParameters = {}) =>
    track(new THREE.MeshStandardMaterial({ color, roughness, metalness, ...extra }));
  const basic = (color: string, k = 1, extra: THREE.MeshBasicMaterialParameters = {}) => {
    const m = track(new THREE.MeshBasicMaterial({ color, toneMapped: false, ...extra }));
    m.color.multiplyScalar(k);
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
  const signMat = (o: Parameters<typeof signTexture>[0], k = 1) => {
    const m = track(new THREE.MeshBasicMaterial({ map: track(signTexture(o)), toneMapped: false, transparent: !o.bg }));
    m.color.setScalar(k);
    return m;
  };
  const addScreen = (s: LedScreen) => {
    screens.push(s);
    return s;
  };

  const W = HALL.maxX - HALL.minX;
  const L = HALL.maxZ - HALL.minZ;
  const cx = (HALL.maxX + HALL.minX) / 2;
  const cz = (HALL.maxZ + HALL.minZ) / 2;

  // ---------- Piso ----------
  const floorTex = track(concreteTexture());
  floorTex.repeat.set(W / 4, L / 4);
  const floor = new THREE.Mesh(track(new THREE.PlaneGeometry(W, L)), std('#ffffff', 0.3, 0.05, { map: floorTex, envMapIntensity: 0.8 }));
  floor.rotation.x = -Math.PI / 2;
  floor.position.set(cx, 0, cz);
  group.add(floor);

  const carpetTex = track(carpetTexture('#17191f'));
  carpetTex.wrapS = carpetTex.wrapT = THREE.RepeatWrapping;
  carpetTex.repeat.set(4, 20);
  const carpet = std('#ffffff', 0.95, 0, { map: carpetTex });
  const boulevard = new THREE.Mesh(track(new THREE.PlaneGeometry(14, 62)), carpet);
  boulevard.rotation.x = -Math.PI / 2;
  boulevard.position.set(0, 0.006, -21);
  group.add(boulevard);
  const gold = basic('#e9c46a', 1.2);
  for (const s of [-1, 1]) box(0.08, 0.012, 62, gold, s * 7.05, 0.008, -21);
  const cross = new THREE.Mesh(track(new THREE.PlaneGeometry(W - 4, 9)), carpet);
  cross.rotation.x = -Math.PI / 2;
  cross.position.set(0, 0.005, -26);
  group.add(cross);
  // logotipo no piso do lobby
  const logoFloor = new THREE.Mesh(track(new THREE.PlaneGeometry(8.5, 8.5)), track(new THREE.MeshBasicMaterial({ map: track(floorLogoTexture(data.seasonLabel)), transparent: true, depthWrite: false, toneMapped: false, opacity: 0.55 })));
  logoFloor.rotation.x = -Math.PI / 2;
  logoFloor.position.set(0, 0.012, 15);
  group.add(logoFloor);

  // ---------- Paredes ----------
  const wallMat = std('#14161b', 0.7, 0.1);
  const H = HALL.height;
  box(0.6, H, L, wallMat, HALL.minX - 0.3, H / 2, cz);
  box(0.6, H, L, wallMat, HALL.maxX + 0.3, H / 2, cz);
  box(W, H, 0.6, wallMat, cx, H / 2, HALL.minZ - 0.3);
  colliders.push({ minX: HALL.minX - 1, maxX: HALL.minX + 0.3, minZ: HALL.minZ - 1, maxZ: HALL.maxZ + 1 });
  colliders.push({ minX: HALL.maxX - 0.3, maxX: HALL.maxX + 1, minZ: HALL.minZ - 1, maxZ: HALL.maxZ + 1 });
  colliders.push({ minX: HALL.minX - 1, maxX: HALL.maxX + 1, minZ: HALL.minZ - 1, maxZ: HALL.minZ + 0.3 });
  colliders.push({ minX: HALL.minX - 1, maxX: HALL.maxX + 1, minZ: HALL.maxZ - 0.3, maxZ: HALL.maxZ + 1 });

  const murals: [string, string, string, string][] = [
    ['STRENGTH', 'FORÇA · DISCIPLINA · RESULTADO', '#e9c46a', '#b08425'],
    ['NUTRITION', 'CIÊNCIA QUE ALIMENTA PERFORMANCE', '#4ff0c8', '#1a9e80'],
    ['PERFORMANCE', 'O PRÓXIMO NÍVEL COMEÇA AQUI', '#ff5a6e', '#a3182b'],
    ['ENDURANCE', 'RESISTÊNCIA · FOCO · CONSTÂNCIA', '#6fc3ff', '#1f6fb0'],
    ['RECOVERY', 'RECUPERAR TAMBÉM É TREINAR', '#c9a2ff', '#6c3fc0'],
    ['LEGACY', 'A FEIRA DO MERCADO FITNESS', '#e9c46a', '#b08425'],
  ];
  const muralZ = [4, -26, -56];
  murals.forEach(([w, s, c1, c2], i) => {
    const left = i < 3;
    const z = muralZ[i % 3];
    const m = track(new THREE.MeshStandardMaterial({ map: track(muralTexture(w, s, c1, c2)), roughness: 0.6, emissive: '#ffffff', emissiveIntensity: 0.35 }));
    m.emissiveMap = m.map;
    plane(22, 11, m, left ? HALL.minX + 0.02 : HALL.maxX - 0.02, 7.5, z, left ? Math.PI / 2 : -Math.PI / 2);
  });
  // pilastras de luz
  const pilaster = basic('#cfd8ff', 1.1);
  for (let z = HALL.maxZ - 6; z > HALL.minZ; z -= 15) {
    box(0.08, H - 2, 0.25, pilaster, HALL.minX + 0.05, H / 2, z);
    box(0.08, H - 2, 0.25, pilaster, HALL.maxX - 0.05, H / 2, z);
  }

  // ---------- Fachada de vidro (entrada) ----------
  const fz = HALL.maxZ;
  const daylight = basic('#a9c3df', 0.55);
  plane(W, H, daylight, cx, H / 2, fz + 0.2, Math.PI);
  const mullion = std('#0d0e11', 0.4, 0.7);
  for (let x = HALL.minX; x <= HALL.maxX; x += 3) box(0.14, H, 0.2, mullion, x, H / 2, fz);
  for (let y = 0; y <= H; y += 3.75) box(W, 0.14, 0.2, mullion, cx, y, fz);
  box(W, 3.2, 0.5, std('#0c0d10', 0.5, 0.3), cx, H - 1.6, fz - 0.3);
  plane(26, 2.4, signMat({ text: 'FITNESS WORLD EXPO', bg: null, color: '#ffffff', w: 2048, h: 192 }, 1.4), 0, H - 1.6, fz - 0.56, Math.PI);

  // ---------- Teto e treliça espacial ----------
  const ceiling = new THREE.Mesh(track(new THREE.PlaneGeometry(W, L)), std('#08090c', 0.9));
  ceiling.rotation.x = Math.PI / 2;
  ceiling.position.set(cx, H, cz);
  group.add(ceiling);
  const beamGeo = track(new THREE.BoxGeometry(1, 0.32, 0.32));
  const trussMat = std('#3a3f48', 0.45, 0.7);
  const beams: THREE.Matrix4[] = [];
  const m4 = new THREE.Matrix4();
  for (let z = HALL.minZ + 4; z < HALL.maxZ; z += 8) {
    beams.push(new THREE.Matrix4().compose(new THREE.Vector3(cx, 12.6, z), new THREE.Quaternion(), new THREE.Vector3(W, 1, 1)));
    beams.push(new THREE.Matrix4().compose(new THREE.Vector3(cx, 13.8, z), new THREE.Quaternion(), new THREE.Vector3(W, 0.5, 0.5)));
  }
  const qz = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), Math.PI / 2);
  for (let x = HALL.minX + 6; x < HALL.maxX; x += 8) {
    beams.push(new THREE.Matrix4().compose(new THREE.Vector3(x, 12.6, cz), qz, new THREE.Vector3(L, 1, 1)));
  }
  const beamMesh = new THREE.InstancedMesh(beamGeo, trussMat, beams.length);
  beams.forEach((b, i) => beamMesh.setMatrixAt(i, b));
  group.add(beamMesh);
  // luminárias high-bay
  const lampPos: THREE.Vector3[] = [];
  for (let z = HALL.minZ + 8; z < HALL.maxZ - 2; z += 16) for (let x = HALL.minX + 10; x < HALL.maxX; x += 16) lampPos.push(new THREE.Vector3(x, 12.2, z));
  const lampBody = new THREE.InstancedMesh(track(new THREE.CylinderGeometry(0.45, 0.6, 0.5, 20)), std('#1c1e22', 0.4, 0.6), lampPos.length);
  const lampGlow = new THREE.InstancedMesh(track(new THREE.CircleGeometry(0.52, 24)), basic('#fff4e0', 2.2), lampPos.length);
  const down = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), Math.PI / 2);
  lampPos.forEach((p, i) => {
    lampBody.setMatrixAt(i, m4.compose(p, new THREE.Quaternion(), new THREE.Vector3(1, 1, 1)));
    lampGlow.setMatrixAt(i, m4.compose(new THREE.Vector3(p.x, p.y - 0.26, p.z), down, new THREE.Vector3(1, 1, 1)));
  });
  group.add(lampBody, lampGlow);

  // ---------- Lobby ----------
  const pylonMat = std('#0f1115', 0.3, 0.6);
  for (const s of [-1, 1]) {
    box(2.2, 10, 2.2, pylonMat, s * 11.5, 5, 9);
    for (const dz of [-1.11, 1.11]) box(0.1, 9.4, 0.05, gold, s * 11.5 - s * 1.06, 5, 9 + dz);
    colliders.push({ minX: s * 11.5 - 1.2, maxX: s * 11.5 + 1.2, minZ: 7.8, maxZ: 10.2 });
  }
  box(25.2, 2.8, 1.8, pylonMat, 0, 10.6, 9);
  plane(22, 1.9, signMat({ text: 'FITNESS WORLD EXPO', bg: null, color: '#ffffff', w: 2048, h: 180 }, 1.5), 0, 10.9, 9.91);
  plane(22, 1.9, signMat({ text: 'FITNESS WORLD EXPO', bg: null, color: '#ffffff', w: 2048, h: 180 }, 1.5), 0, 10.9, 8.09, Math.PI);
  plane(14, 0.55, signMat({ text: `${data.seasonLabel} · ${data.seasonTheme}`.toUpperCase(), bg: null, color: '#e9c46a', w: 2048, h: 80 }, 1.2), 0, 9.65, 9.91);
  box(25.2, 0.06, 1.84, gold, 0, 9.2, 9);
  if (data.namingSponsor) {
    plane(10, 0.5, signMat({ text: `PATROCINADOR OFICIAL · ${data.namingSponsor.toUpperCase()}`, bg: null, color: '#cfd3dc', w: 2048, h: 100 }, 1), 0, 8.65, 9.91);
  }
  // credenciamento e informações
  const deskMat = std('#f1efe9', 0.25, 0.05);
  const deskShape = new THREE.Shape();
  deskShape.absarc(0, 0, 3.2, Math.PI * 0.1, Math.PI * 0.9, false);
  deskShape.absarc(0, 0, 2.5, Math.PI * 0.9, Math.PI * 0.1, true);
  const deskGeo = track(new THREE.ExtrudeGeometry(deskShape, { depth: 1.1, bevelEnabled: false, curveSegments: 32 }));
  for (const [x, label] of [[-17, 'CREDENCIAMENTO'], [17, 'INFORMAÇÕES']] as const) {
    const d = new THREE.Mesh(deskGeo, deskMat);
    d.rotation.x = -Math.PI / 2;
    d.position.set(x, 0, 13.5);
    group.add(d);
    box(5.4, 0.04, 0.04, gold, x, 1.12, 13.5 + 3.1);
    const sign = box(6, 1, 0.2, std('#0f1115', 0.4, 0.5), x, 5.2, 14);
    plane(5.6, 0.8, signMat({ text: label, bg: null, color: '#e9c46a', w: 1024, h: 140 }, 1.2), x, 5.2, 14.11, 0, group);
    plane(5.6, 0.8, signMat({ text: label, bg: null, color: '#e9c46a', w: 1024, h: 140 }, 1.2), x, 5.2, 13.89, Math.PI, group);
    sign.userData.decor = true;
    const cable = new THREE.Mesh(track(new THREE.CylinderGeometry(0.01, 0.01, 9, 4)), trussMat);
    cable.position.set(x, 10.2, 14);
    group.add(cable);
    colliders.push({ minX: x - 3.3, maxX: x + 3.3, minZ: 13.5 - 0.5, maxZ: 13.5 + 3.3 });
  }

  // totens: patrocinadores e publicidade
  const totem = (x: number, z: number, draw: ConstructorParameters<typeof LedScreen>[2], ry = 0) => {
    const g = new THREE.Group();
    g.position.set(x, 0, z);
    g.rotation.y = ry;
    group.add(g);
    box(1.9, 4.4, 0.5, pylonMat, 0, 2.2, 0, g);
    const scr = addScreen(new LedScreen(512, 1024, draw, 8));
    plane(1.6, 3.2, scr.material, 0, 2.4, 0.255, 0, g);
    plane(1.6, 3.2, scr.material, 0, 2.4, -0.255, Math.PI, g);
    box(1.94, 0.05, 0.54, gold, 0, 4.4, 0, g);
    colliders.push({ minX: x - 1.1, maxX: x + 1.1, minZ: z - 0.5, maxZ: z + 0.5 });
  };
  totem(-6.5, 4.5, sponsorTotemDraw(() => ({ sponsors: data.sponsors() })));
  const lobbyAd = () => data.ad('lobby') ?? { advertiser: null, message: 'Espaço disponível para anunciantes', slotName: 'Totem do Lobby' };
  totem(6.5, 4.5, (ctx, w, h, t) => adScreenDraw(lobbyAd())(ctx, w, h, t));

  // totens de diretório
  for (const s of [-1, 1]) {
    const g = new THREE.Group();
    g.position.set(s * 6.2, 0, -2);
    group.add(g);
    box(1.6, 3.6, 0.4, pylonMat, 0, 1.8, 0, g);
    const scr = addScreen(new LedScreen(512, 768, directoryDraw(data.directory), 2));
    for (const f of [1, -1]) {
      const m = plane(1.4, 2.1, scr.material, 0, 2.2, f * 0.205, f > 0 ? 0 : Math.PI, g);
      m.userData = { kind: 'directory' };
      interactables.push(m);
    }
    colliders.push({ minX: s * 6.2 - 0.9, maxX: s * 6.2 + 0.9, minZ: -2.4, maxZ: -1.6 });
  }

  // ---------- Sinalização suspensa ----------
  const hangSign = (x: number, z: number, text: string, sub: string, w = 11, ry = 0, y = 7.4) => {
    const g = new THREE.Group();
    g.position.set(x, y, z);
    g.rotation.y = ry;
    group.add(g);
    box(w, 1.8, 0.3, std('#0f1115', 0.4, 0.5), 0, 0, 0, g);
    const m = signMat({ text, sub, bg: null, color: '#ffffff', subColor: '#e9c46a', w: 1536, h: 256 }, 1.2);
    plane(w - 0.4, 1.6, m, 0, 0, 0.16, 0, g);
    plane(w - 0.4, 1.6, m, 0, 0, -0.16, Math.PI, g);
    box(w, 0.05, 0.32, gold, 0, -0.92, 0, g);
    for (const s of [-1, 1]) {
      const c = new THREE.Mesh(track(new THREE.CylinderGeometry(0.01, 0.01, 12.6 - y, 4)), trussMat);
      c.position.set((s * w) / 2.4, (12.6 - y) / 2 + 0.9, 0);
      g.add(c);
    }
  };
  hangSign(0, -12, 'PAVILHÃO A', 'ESTANDES A1 · A2 · A3 · A4');
  hangSign(0, -40, 'PAVILHÃO B', 'ESTANDES B1 · B2 · B3 · B4');
  hangSign(-31, -26, 'CORREDOR TRANSVERSAL', '◀ ACESSO LATERAL · ARENA ▶', 11, Math.PI / 2);
  hangSign(31, -26, 'CORREDOR TRANSVERSAL', '◀ ARENA · ACESSO LATERAL ▶', 11, Math.PI / 2);
  hangSign(0, -50, 'PALCO PRINCIPAL', 'APRESENTAÇÕES · LANÇAMENTOS · PALESTRAS', 13, 0, 9);

  // telão suspenso de publicidade no boulevard
  {
    const g = new THREE.Group();
    g.position.set(0, 10.1, 3);
    group.add(g);
    const scr = addScreen(new LedScreen(1024, 576, (ctx, w, h, t) => {
      const ad = data.ad('boulevard');
      adScreenDraw(ad ?? { advertiser: null, message: 'Espaço publicitário disponível', slotName: 'Telão suspenso — Boulevard' })(ctx, w, h, t);
    }, 10));
    box(6.7, 3.85, 0.4, std('#0b0c0f', 0.4, 0.5), 0, 0, 0, g);
    plane(6.4, 3.6, scr.material, 0, 0, 0.21, 0, g);
    plane(6.4, 3.6, scr.material, 0, 0, -0.21, Math.PI, g);
    for (const s of [-1, 1]) {
      const c = new THREE.Mesh(track(new THREE.CylinderGeometry(0.012, 0.012, 2.6, 4)), trussMat);
      c.position.set(s * 2.8, 3.2, 0);
      g.add(c);
    }
  }
  // banners do corredor B (publicidade)
  for (const s of [-1, 1]) {
    const g = new THREE.Group();
    g.position.set(s * 17, 10.5, -26);
    group.add(g);
    const scr = addScreen(new LedScreen(1024, 384, (ctx, w, h, t) => {
      const ad = data.ad('corredor-b');
      adScreenDraw(ad ?? { advertiser: null, message: 'Espaço publicitário disponível', slotName: 'Banner — Corredor' })(ctx, w, h, t);
    }, 6));
    box(8.2, 3.2, 0.2, std('#0b0c0f', 0.4, 0.5), 0, 0, 0, g);
    plane(8, 3, scr.material, 0, 0, 0.11, 0, g);
    plane(8, 3, scr.material, 0, 0, -0.11, Math.PI, g);
  }

  // ---------- Arena de lançamentos ----------
  const podium = new THREE.Group();
  podium.position.set(LAUNCH_PODIUM.x, 0, LAUNCH_PODIUM.z);
  group.add(podium);
  const disc = new THREE.Mesh(track(new THREE.CylinderGeometry(3.3, 3.4, 0.3, 64)), std('#0d0e12', 0.15, 0.4));
  disc.position.y = 0.15;
  podium.add(disc);
  const ring = new THREE.Mesh(track(new THREE.TorusGeometry(3.32, 0.03, 8, 96)), gold);
  ring.rotation.x = Math.PI / 2;
  ring.position.y = 0.3;
  podium.add(ring);
  const spinner = new THREE.Group();
  spinner.position.y = 0.3;
  podium.add(spinner);
  colliders.push({ minX: LAUNCH_PODIUM.x - 3.3, maxX: LAUNCH_PODIUM.x + 3.3, minZ: LAUNCH_PODIUM.z - 3.3, maxZ: LAUNCH_PODIUM.z + 3.3 });
  {
    const g = new THREE.Group();
    g.position.y = 6.5;
    podium.add(g);
    const sm = signMat({ text: 'ARENA DE LANÇAMENTOS', bg: '#0f1115', color: '#e9c46a', w: 1536, h: 200 }, 1.2);
    for (let i = 0; i < 4; i++) {
      const p = new THREE.Group();
      p.rotation.y = (i * Math.PI) / 2;
      g.add(p);
      plane(6, 0.8, sm, 0, 0, 3.0, 0, p);
    }
    animated.push((_t, dt) => (g.rotation.y += dt * 0.08));
  }
  const launchDisposables: { dispose(): void }[] = [];
  const pedMat = std('#cfccc4', 0.3, 0.1);
  const setLaunches: HallBuild['setLaunches'] = (items) => {
    launchDisposables.splice(0).forEach((d) => d.dispose());
    while (spinner.children.length) spinner.remove(spinner.children[0]);
    for (let i = interactables.length - 1; i >= 0; i--) if (interactables[i].userData.launch) interactables.splice(i, 1);
    const list = items.slice(0, 6);
    list.forEach((it, i) => {
      const a = (i / Math.max(1, list.length)) * Math.PI * 2;
      const g = new THREE.Group();
      g.position.set(Math.sin(a) * 2.1, 0, Math.cos(a) * 2.1);
      spinner.add(g);
      const pedGeo = new THREE.CylinderGeometry(0.32, 0.36, 0.9, 32);
      launchDisposables.push(pedGeo);
      const ped = new THREE.Mesh(pedGeo, pedMat);
      ped.position.y = 0.45;
      g.add(ped);
      const pm = buildProduct(it.product, it.brandName, it.accent, 2.4);
      pm.position.y = 0.9;
      g.add(pm);
      pm.userData.hit.userData.launch = true;
      interactables.push(pm.userData.hit);
    });
  };
  animated.push((_t, dt) => (spinner.rotation.y += dt * 0.18));

  // ---------- Palco Principal ----------
  const stage = new THREE.Group();
  stage.position.set(STAGE.x, 0, STAGE.z);
  group.add(stage);
  box(STAGE.w, STAGE.h, STAGE.d, std('#0b0c0f', 0.2, 0.4), 0, STAGE.h / 2, 0, stage);
  box(STAGE.w, 0.04, 0.05, gold, 0, STAGE.h, STAGE.d / 2 + 0.01, stage);
  box(STAGE.w, 0.06, 0.04, basic('#4ff0c8', 1.1), 0, 0.15, STAGE.d / 2 + 0.01, stage);
  for (let i = 0; i < 4; i++) box(6, 0.3, 0.45, std('#111216', 0.3, 0.3), 0, 0.15 + i * 0.3, STAGE.d / 2 + 1.6 - i * 0.45, stage);
  colliders.push({ minX: STAGE.x - STAGE.w / 2, maxX: STAGE.x + STAGE.w / 2, minZ: STAGE.z - STAGE.d / 2 - 2, maxZ: STAGE.z + STAGE.d / 2 + 2 });
  const stageScr = addScreen(new LedScreen(2048, 752, stageScreenDraw(data.stage), 12));
  const wallZ = HALL.minZ + 0.7;
  const lw = plane(30, 11, stageScr.material, 0, 7.1, wallZ - STAGE.z, 0, stage);
  lw.userData = { kind: 'stage' };
  interactables.push(lw);
  // treliça do palco
  for (const s of [-1, 1]) {
    box(0.5, 13, 0.5, trussMat, s * 15.6, 6.5, wallZ - STAGE.z + 0.3, stage);
    box(1.6, 5, 1.6, std('#101114', 0.7), s * 14.5, STAGE.h + 2.5, -2, stage);
    box(1.2, 0.04, 1.62, basic('#ffffff', 0.6), s * 14.5, STAGE.h + 4.9, -2, stage);
  }
  box(32, 0.5, 0.5, trussMat, 0, 13, wallZ - STAGE.z + 0.3, stage);
  box(32, 0.5, 0.5, trussMat, 0, 13, 3, stage);
  // púlpito
  box(1.1, 1.15, 0.6, std('#1a1c22', 0.3, 0.4), 0, STAGE.h + 0.58, 2.5, stage);
  box(1.12, 0.04, 0.62, gold, 0, STAGE.h + 1.16, 2.5, stage);
  // canhões de luz (cones volumétricos)
  const coneGeo = track(new THREE.ConeGeometry(2.4, 12, 32, 1, true));
  coneGeo.translate(0, -6, 0);
  const coneColors = ['#4ff0c8', '#e9c46a', '#ff5a6e', '#6fc3ff', '#e9c46a', '#4ff0c8'];
  coneColors.forEach((c, i) => {
    const mat = track(new THREE.MeshBasicMaterial({ color: c, transparent: true, opacity: quality === 'baixa' ? 0.03 : 0.045, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide, toneMapped: false }));
    const cone = new THREE.Mesh(coneGeo, mat);
    const x = -12.5 + i * 5;
    cone.position.set(x, 12.8, 3);
    stage.add(cone);
    const head = new THREE.Mesh(track(new THREE.CylinderGeometry(0.25, 0.3, 0.5, 16)), std('#16171a', 0.4, 0.6));
    head.position.set(x, 12.6, 3);
    stage.add(head);
    animated.push((t) => {
      cone.rotation.z = Math.sin(t * 0.5 + i) * 0.45;
      cone.rotation.x = Math.cos(t * 0.37 + i * 1.7) * 0.3 + 0.25;
    });
  });
  // plateia (cadeiras instanciadas)
  const seat = new THREE.BoxGeometry(0.5, 0.08, 0.48).translate(0, 0.45, 0);
  const back = new THREE.BoxGeometry(0.5, 0.5, 0.06).translate(0, 0.72, -0.22);
  const legs = new THREE.BoxGeometry(0.44, 0.42, 0.04).translate(0, 0.21, 0);
  const chairGeo = track(mergeGeometries([seat, back, legs])!);
  [seat, back, legs].forEach((g) => g.dispose());
  const chairPos: THREE.Vector3[] = [];
  for (let r = 0; r < 8; r++) for (let x = -12; x <= 12; x += 0.85) if (Math.abs(x) > 1.4) chairPos.push(new THREE.Vector3(x, 0, -54 - r * 1.15));
  const chairs = new THREE.InstancedMesh(chairGeo, std('#1b1e26', 0.6, 0.1), chairPos.length);
  const rotPi = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), Math.PI);
  chairPos.forEach((p, i) => chairs.setMatrixAt(i, m4.compose(p, rotPi, new THREE.Vector3(1, 1, 1))));
  // As cadeiras olham para o palco (−Z): o encosto fica do lado +Z.
  group.add(chairs);
  colliders.push({ minX: -12.4, maxX: -1.2, minZ: -63, maxZ: -53.6 });
  colliders.push({ minX: 1.2, maxX: 12.4, minZ: -63, maxZ: -53.6 });

  group.traverse((o) => {
    o.matrixAutoUpdate = true;
  });

  return {
    group, screens, colliders, interactables, setLaunches,
    update(t, dt) {
      animated.forEach((f) => f(t, dt));
    },
    dispose() {
      screens.forEach((s) => s.dispose());
      disposables.forEach((d) => d.dispose());
      launchDisposables.forEach((d) => d.dispose());
    },
  };
}
