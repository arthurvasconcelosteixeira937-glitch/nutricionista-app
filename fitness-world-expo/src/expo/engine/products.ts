import * as THREE from 'three';
import type { Product } from '@/domain/types';
import { labelTexture } from './textures';

// Modelos procedurais de embalagens (potes, garrafas, caixas, refis, coqueteleiras).
// Em produção, cada marca poderá enviar modelos GLB próprios (ver ARQUITETURA.md).

const geo = {
  tubBody: new THREE.CylinderGeometry(0.075, 0.075, 0.19, 40, 1, true),
  tubBottom: new THREE.CircleGeometry(0.075, 40),
  tubLid: new THREE.CylinderGeometry(0.079, 0.079, 0.035, 40),
  tubLidRim: new THREE.TorusGeometry(0.078, 0.004, 8, 40),
  box: new THREE.BoxGeometry(0.2, 0.13, 0.065),
  pouch: new THREE.BoxGeometry(0.17, 0.25, 0.06),
  pouchTop: new THREE.BoxGeometry(0.17, 0.018, 0.02),
  shakerBody: new THREE.CylinderGeometry(0.048, 0.04, 0.2, 32),
  shakerLid: new THREE.CylinderGeometry(0.05, 0.05, 0.04, 32),
  shakerCap: new THREE.CylinderGeometry(0.018, 0.022, 0.03, 16),
  bottle: (() => {
    const pts: THREE.Vector2[] = [];
    const prof: [number, number][] = [[0, 0], [0.042, 0], [0.046, 0.006], [0.046, 0.13], [0.04, 0.16], [0.022, 0.18], [0.02, 0.19], [0, 0.19]];
    prof.forEach(([r, y]) => pts.push(new THREE.Vector2(r, y)));
    return new THREE.LatheGeometry(pts, 36);
  })(),
  bottleLabel: new THREE.CylinderGeometry(0.0475, 0.0475, 0.09, 36, 1, true),
  bottleCap: new THREE.CylinderGeometry(0.024, 0.024, 0.03, 24),
  hit: new THREE.BoxGeometry(1, 1, 1),
};

const labelCache = new Map<string, THREE.Texture>();
function getLabel(p: Product, brandName: string, accent: string) {
  const key = `${p.id}|${p.name}|${p.color}|${p.size}|${accent}|${p.isLaunch}|${brandName}`;
  let t = labelCache.get(key);
  if (!t) {
    t = labelTexture({ name: p.name, brand: brandName, size: p.size, color: p.color, accent, isLaunch: p.isLaunch });
    labelCache.set(key, t);
  }
  return t;
}

const capMats = new Map<string, THREE.MeshStandardMaterial>();
function capMat(color: string) {
  let m = capMats.get(color);
  if (!m) {
    m = new THREE.MeshStandardMaterial({ color, roughness: 0.35, metalness: 0.1 });
    capMats.set(color, m);
  }
  return m;
}

export const hitMaterial = new THREE.MeshBasicMaterial({ visible: false });

/** Retorna um grupo com a embalagem apoiada em y=0 e um volume invisível de seleção. */
export function buildProduct(p: Product, brandName: string, accent: string, scale = 1.25): THREE.Group {
  const g = new THREE.Group();
  const label = getLabel(p, brandName, accent);
  const labelMat = new THREE.MeshStandardMaterial({ map: label, roughness: 0.38, metalness: 0.05 });
  let hitSize: [number, number, number] = [0.2, 0.25, 0.2];

  switch (p.shape) {
    case 'pote': {
      const body = new THREE.Mesh(geo.tubBody, labelMat);
      body.position.y = 0.095;
      body.rotation.y = Math.PI;
      const bottom = new THREE.Mesh(geo.tubBottom, capMat('#111111'));
      bottom.rotation.x = Math.PI / 2;
      const lidColor = p.color.toLowerCase() === '#111111' ? '#2a2a2a' : '#141414';
      const lid = new THREE.Mesh(geo.tubLid, capMat(lidColor));
      lid.position.y = 0.207;
      const rim = new THREE.Mesh(geo.tubLidRim, capMat(accent));
      rim.rotation.x = Math.PI / 2;
      rim.position.y = 0.19;
      g.add(body, bottom, lid, rim);
      hitSize = [0.18, 0.24, 0.18];
      break;
    }
    case 'garrafa': {
      const body = new THREE.Mesh(geo.bottle, capMat(p.color));
      const lbl = new THREE.Mesh(geo.bottleLabel, labelMat);
      lbl.position.y = 0.075;
      lbl.rotation.y = Math.PI;
      const cap = new THREE.Mesh(geo.bottleCap, capMat('#121212'));
      cap.position.y = 0.205;
      g.add(body, lbl, cap);
      hitSize = [0.12, 0.24, 0.12];
      break;
    }
    case 'caixa': {
      const side = capMat(p.color);
      const mats = [side, side, side, side, labelMat, side];
      const box = new THREE.Mesh(geo.box, mats);
      box.position.y = 0.065;
      g.add(box);
      hitSize = [0.24, 0.16, 0.1];
      break;
    }
    case 'refil': {
      const side = capMat(p.color);
      const pouch = new THREE.Mesh(geo.pouch, [side, side, side, side, labelMat, labelMat]);
      pouch.position.y = 0.125;
      const top = new THREE.Mesh(geo.pouchTop, capMat('#d9d9d9'));
      top.position.y = 0.255;
      g.add(pouch, top);
      hitSize = [0.2, 0.28, 0.1];
      break;
    }
    case 'shaker': {
      const bodyMat = new THREE.MeshPhysicalMaterial({ color: p.color, roughness: 0.25, metalness: 0.1, clearcoat: 0.6, transparent: true, opacity: 0.88 });
      const body = new THREE.Mesh(geo.shakerBody, bodyMat);
      body.position.y = 0.1;
      const lid = new THREE.Mesh(geo.shakerLid, capMat('#111111'));
      lid.position.y = 0.22;
      const cap = new THREE.Mesh(geo.shakerCap, capMat(accent));
      cap.position.y = 0.255;
      g.add(body, lid, cap);
      hitSize = [0.12, 0.28, 0.12];
      break;
    }
  }
  g.scale.setScalar(scale);
  const hit = new THREE.Mesh(geo.hit, hitMaterial);
  hit.scale.set(hitSize[0] * 1.3, hitSize[1] * 1.15, hitSize[2] * 1.4);
  hit.position.y = hitSize[1] / 2;
  hit.userData = { kind: 'product', productId: p.id, brandId: p.brandId };
  g.add(hit);
  g.userData = { kind: 'product', productId: p.id, brandId: p.brandId, hit };
  return g;
}
