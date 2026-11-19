import * as THREE from 'three';

// Texturas geradas em canvas: letreiros, rótulos de produtos, pisos e murais.
// Evita depender de arquivos de imagem externos e permite que cada marca
// personalize textos e cores em tempo real.

export const DISPLAY_FONT = '"Barlow Condensed", "Arial Narrow", Arial, sans-serif';
export const BODY_FONT = 'Inter, "Segoe UI", Arial, sans-serif';

let maxAniso = 4;
export function setMaxAnisotropy(n: number) {
  maxAniso = n;
}

export function canvas(w: number, h: number) {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  return c;
}

export function toTexture(c: HTMLCanvasElement, opts: { repeat?: [number, number]; srgb?: boolean } = {}) {
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = opts.srgb === false ? THREE.NoColorSpace : THREE.SRGBColorSpace;
  t.anisotropy = maxAniso;
  if (opts.repeat) {
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.repeat.set(opts.repeat[0], opts.repeat[1]);
  }
  return t;
}

/** Ajusta o tamanho da fonte para caber na largura. */
export function fitText(ctx: CanvasRenderingContext2D, text: string, maxW: number, size: number, weight = 700, family = DISPLAY_FONT) {
  let s = size;
  ctx.font = `${weight} ${s}px ${family}`;
  while (ctx.measureText(text).width > maxW && s > 8) {
    s -= 2;
    ctx.font = `${weight} ${s}px ${family}`;
  }
  return s;
}

export function luminance(hex: string) {
  const c = new THREE.Color(hex);
  return 0.2126 * c.r + 0.7152 * c.g + 0.0722 * c.b;
}

export function readableOn(bg: string, light = '#ffffff', dark = '#0b0d12') {
  return luminance(bg) > 0.55 ? dark : light;
}

export interface SignOpts {
  text: string;
  sub?: string;
  bg?: string | null;
  color?: string;
  subColor?: string;
  w?: number;
  h?: number;
  weight?: number;
  size?: number;
  letterSpacing?: number;
  align?: CanvasTextAlign;
  border?: string;
}

/** Placa/letreiro com título e subtítulo. */
export function signTexture(o: SignOpts) {
  const w = o.w ?? 1024;
  const h = o.h ?? 256;
  const c = canvas(w, h);
  const ctx = c.getContext('2d')!;
  if (o.bg) {
    ctx.fillStyle = o.bg;
    ctx.fillRect(0, 0, w, h);
  }
  if (o.border) {
    ctx.strokeStyle = o.border;
    ctx.lineWidth = h * 0.03;
    ctx.strokeRect(ctx.lineWidth, ctx.lineWidth, w - ctx.lineWidth * 2, h - ctx.lineWidth * 2);
  }
  const color = o.color ?? '#ffffff';
  ctx.fillStyle = color;
  ctx.textAlign = o.align ?? 'center';
  ctx.textBaseline = 'middle';
  const x = ctx.textAlign === 'center' ? w / 2 : ctx.textAlign === 'left' ? w * 0.06 : w * 0.94;
  if ('letterSpacing' in ctx) (ctx as unknown as { letterSpacing: string }).letterSpacing = `${o.letterSpacing ?? 2}px`;
  const titleSize = fitText(ctx, o.text, w * 0.9, o.size ?? (o.sub ? h * 0.5 : h * 0.66), o.weight ?? 800);
  if (o.sub) {
    ctx.fillText(o.text, x, h * 0.42);
    ctx.fillStyle = o.subColor ?? color;
    fitText(ctx, o.sub, w * 0.9, Math.min(titleSize * 0.36, h * 0.2), 600, BODY_FONT);
    if ('letterSpacing' in ctx) (ctx as unknown as { letterSpacing: string }).letterSpacing = '6px';
    ctx.fillText(o.sub.toUpperCase(), x, h * 0.78);
  } else {
    ctx.fillText(o.text, x, h * 0.54);
  }
  return toTexture(c);
}

/** Logotipo: texto estilizado ou imagem enviada pela marca. */
export function logoTexture(opts: { text: string; image?: string; mode: 'texto' | 'imagem'; color: string; bg?: string | null; accent?: string; w?: number; h?: number }) {
  const w = opts.w ?? 1024;
  const h = opts.h ?? 320;
  const c = canvas(w, h);
  const ctx = c.getContext('2d')!;
  const tex = toTexture(c);
  const drawText = () => {
    ctx.clearRect(0, 0, w, h);
    if (opts.bg) {
      ctx.fillStyle = opts.bg;
      ctx.fillRect(0, 0, w, h);
    }
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    if ('letterSpacing' in ctx) (ctx as unknown as { letterSpacing: string }).letterSpacing = '6px';
    fitText(ctx, opts.text, w * 0.86, h * 0.62, 800);
    ctx.fillStyle = opts.color;
    ctx.fillText(opts.text, w / 2, h * 0.52);
    if (opts.accent) {
      ctx.fillStyle = opts.accent;
      const tw = Math.min(w * 0.86, ctx.measureText(opts.text).width);
      ctx.fillRect(w / 2 - tw / 2, h * 0.84, tw * 0.22, h * 0.04);
    }
  };
  drawText();
  if (opts.mode === 'imagem' && opts.image) {
    const img = new Image();
    img.onload = () => {
      ctx.clearRect(0, 0, w, h);
      if (opts.bg) {
        ctx.fillStyle = opts.bg;
        ctx.fillRect(0, 0, w, h);
      }
      const s = Math.min((w * 0.9) / img.width, (h * 0.86) / img.height);
      ctx.drawImage(img, (w - img.width * s) / 2, (h - img.height * s) / 2, img.width * s, img.height * s);
      tex.needsUpdate = true;
    };
    img.src = opts.image;
  }
  return tex;
}

/** Rótulo envolvente de produto (pote/garrafa). */
export function labelTexture(o: { name: string; brand: string; size: string; color: string; accent: string; isLaunch?: boolean }) {
  const w = 1024;
  const h = 512;
  const c = canvas(w, h);
  const ctx = c.getContext('2d')!;
  const g = ctx.createLinearGradient(0, 0, 0, h);
  const base = new THREE.Color(o.color);
  const darker = base.clone().multiplyScalar(0.55);
  g.addColorStop(0, `#${base.getHexString()}`);
  g.addColorStop(1, `#${darker.getHexString()}`);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);
  const fg = readableOn(o.color);
  // faixa de destaque
  ctx.fillStyle = o.accent;
  ctx.fillRect(0, h * 0.7, w, h * 0.07);
  // frente do rótulo concentrada no centro (u ≈ 0.25..0.75 visível de frente)
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = fg;
  if ('letterSpacing' in ctx) (ctx as unknown as { letterSpacing: string }).letterSpacing = '4px';
  fitText(ctx, o.brand.toUpperCase(), w * 0.4, 52, 700);
  ctx.globalAlpha = 0.85;
  ctx.fillText(o.brand.toUpperCase(), w * 0.5, h * 0.17);
  ctx.globalAlpha = 1;
  if ('letterSpacing' in ctx) (ctx as unknown as { letterSpacing: string }).letterSpacing = '1px';
  fitText(ctx, o.name.toUpperCase(), w * 0.44, 118, 800);
  const words = o.name.toUpperCase().split(' ');
  if (words.length > 2 && ctx.measureText(o.name.toUpperCase()).width > w * 0.4) {
    const mid = Math.ceil(words.length / 2);
    fitText(ctx, words.slice(0, mid).join(' '), w * 0.44, 96, 800);
    ctx.fillText(words.slice(0, mid).join(' '), w * 0.5, h * 0.38);
    ctx.fillText(words.slice(mid).join(' '), w * 0.5, h * 0.55);
  } else {
    ctx.fillText(o.name.toUpperCase(), w * 0.5, h * 0.46);
  }
  ctx.font = `600 34px ${BODY_FONT}`;
  ctx.fillStyle = readableOn(o.accent);
  ctx.fillText(o.size, w * 0.5, h * 0.735);
  if (o.isLaunch) {
    ctx.fillStyle = '#e9c46a';
    ctx.font = `800 30px ${DISPLAY_FONT}`;
    ctx.fillText('NOVO', w * 0.5, h * 0.88);
  }
  // detalhes laterais (tabela nutricional estilizada)
  ctx.globalAlpha = 0.35;
  ctx.fillStyle = fg;
  for (let i = 0; i < 8; i++) {
    ctx.fillRect(w * 0.06, h * (0.25 + i * 0.05), w * 0.12, 4);
    ctx.fillRect(w * 0.82, h * (0.25 + i * 0.05), w * 0.12, 4);
  }
  ctx.globalAlpha = 1;
  return toTexture(c);
}

/** Piso de concreto polido com juntas. */
export function concreteTexture() {
  const s = 1024;
  const c = canvas(s, s);
  const ctx = c.getContext('2d')!;
  ctx.fillStyle = '#3a3d44';
  ctx.fillRect(0, 0, s, s);
  const img = ctx.getImageData(0, 0, s, s);
  for (let i = 0; i < img.data.length; i += 4) {
    const n = (Math.random() - 0.5) * 14;
    img.data[i] += n;
    img.data[i + 1] += n;
    img.data[i + 2] += n + 1;
  }
  ctx.putImageData(img, 0, 0);
  // manchas suaves
  for (let i = 0; i < 40; i++) {
    const x = Math.random() * s;
    const y = Math.random() * s;
    const r = 60 + Math.random() * 200;
    const g = ctx.createRadialGradient(x, y, 0, x, y, r);
    const a = Math.random() * 0.06;
    g.addColorStop(0, `rgba(${Math.random() > 0.5 ? '255,255,255' : '0,0,0'},${a})`);
    g.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, s, s);
  }
  ctx.strokeStyle = 'rgba(15,16,20,0.55)';
  ctx.lineWidth = 3;
  ctx.strokeRect(0, 0, s, s);
  return toTexture(c, { repeat: [27, 26] });
}

export function carpetTexture(base: string, border?: string) {
  const s = 512;
  const c = canvas(s, s);
  const ctx = c.getContext('2d')!;
  ctx.fillStyle = base;
  ctx.fillRect(0, 0, s, s);
  const img = ctx.getImageData(0, 0, s, s);
  for (let i = 0; i < img.data.length; i += 4) {
    const n = (Math.random() - 0.5) * 18;
    img.data[i] += n;
    img.data[i + 1] += n;
    img.data[i + 2] += n;
  }
  ctx.putImageData(img, 0, 0);
  if (border) {
    ctx.fillStyle = border;
    ctx.fillRect(0, 0, 10, s);
    ctx.fillRect(s - 10, 0, 10, s);
  }
  return toTexture(c);
}

export function woodTexture() {
  const w = 512;
  const h = 512;
  const c = canvas(w, h);
  const ctx = c.getContext('2d')!;
  for (let i = 0; i < 8; i++) {
    const shade = 120 + Math.random() * 40;
    ctx.fillStyle = `rgb(${shade + 40},${shade}, ${shade - 50})`;
    ctx.fillRect(0, (i * h) / 8, w, h / 8);
    for (let k = 0; k < 40; k++) {
      ctx.strokeStyle = `rgba(60,35,15,${Math.random() * 0.15})`;
      ctx.beginPath();
      const y = (i * h) / 8 + Math.random() * (h / 8);
      ctx.moveTo(0, y);
      ctx.bezierCurveTo(w * 0.3, y + Math.random() * 6 - 3, w * 0.6, y + Math.random() * 6 - 3, w, y);
      ctx.stroke();
    }
    ctx.fillStyle = 'rgba(30,18,8,0.5)';
    ctx.fillRect(0, (i * h) / 8, w, 2);
  }
  return toTexture(c, { repeat: [2, 2] });
}

/** Sombra de contato suave (gradiente radial). */
let blobTex: THREE.Texture | null = null;
export function blobShadowTexture() {
  if (blobTex) return blobTex;
  const c = canvas(128, 128);
  const ctx = c.getContext('2d')!;
  const g = ctx.createRadialGradient(64, 64, 0, 64, 64, 64);
  g.addColorStop(0, 'rgba(0,0,0,0.7)');
  g.addColorStop(0.6, 'rgba(0,0,0,0.25)');
  g.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 128, 128);
  blobTex = toTexture(c, { srgb: false });
  return blobTex;
}

/** Mural tipográfico para as paredes do pavilhão. */
export function muralTexture(word: string, sub: string, c1: string, c2: string) {
  const w = 2048;
  const h = 1024;
  const c = canvas(w, h);
  const ctx = c.getContext('2d')!;
  const g = ctx.createLinearGradient(0, 0, w, h);
  g.addColorStop(0, '#0d0f14');
  g.addColorStop(1, '#16191f');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);
  // linhas diagonais dinâmicas
  ctx.globalAlpha = 0.18;
  for (let i = -10; i < 30; i++) {
    ctx.fillStyle = i % 3 === 0 ? c1 : '#ffffff';
    ctx.beginPath();
    ctx.moveTo(i * 120, h);
    ctx.lineTo(i * 120 + 18, h);
    ctx.lineTo(i * 120 + 18 + 500, 0);
    ctx.lineTo(i * 120 + 500, 0);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
  const tg = ctx.createLinearGradient(0, h * 0.2, 0, h * 0.8);
  tg.addColorStop(0, c1);
  tg.addColorStop(1, c2);
  ctx.fillStyle = tg;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  fitText(ctx, word, w * 0.9, h * 0.58, 800);
  ctx.fillText(word, w / 2, h * 0.46);
  ctx.fillStyle = 'rgba(255,255,255,0.8)';
  if ('letterSpacing' in ctx) (ctx as unknown as { letterSpacing: string }).letterSpacing = '18px';
  ctx.font = `600 64px ${BODY_FONT}`;
  ctx.fillText(sub, w / 2, h * 0.82);
  return toTexture(c);
}

/** Logotipo do piso do lobby. */
export function floorLogoTexture(season: string) {
  const s = 1024;
  const c = canvas(s, s);
  const ctx = c.getContext('2d')!;
  ctx.translate(s / 2, s / 2);
  ctx.strokeStyle = 'rgba(233,196,106,0.85)';
  ctx.lineWidth = 10;
  ctx.beginPath();
  ctx.arc(0, 0, s * 0.46, 0, Math.PI * 2);
  ctx.stroke();
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.arc(0, 0, s * 0.42, 0, Math.PI * 2);
  ctx.stroke();
  ctx.fillStyle = 'rgba(233,196,106,0.9)';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = `800 150px ${DISPLAY_FONT}`;
  ctx.fillText('FITNESS', 0, -95);
  ctx.fillText('WORLD EXPO', 0, 50);
  ctx.font = `600 44px ${BODY_FONT}`;
  if ('letterSpacing' in ctx) (ctx as unknown as { letterSpacing: string }).letterSpacing = '14px';
  ctx.fillText(season, 0, 175);
  return toTexture(c);
}
