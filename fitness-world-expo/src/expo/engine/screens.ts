import * as THREE from 'three';
import { BODY_FONT, DISPLAY_FONT, canvas, fitText, readableOn, toTexture } from './textures';

// Telões de LED animados (desenhados em canvas e atualizados em ~10 fps,
// em rodízio, para preservar desempenho).

export type ScreenDraw = (ctx: CanvasRenderingContext2D, w: number, h: number, t: number) => void;

export class LedScreen {
  readonly texture: THREE.CanvasTexture;
  readonly material: THREE.MeshBasicMaterial;
  private ctx: CanvasRenderingContext2D;
  constructor(public w: number, public h: number, public draw: ScreenDraw, public fps = 10) {
    const c = canvas(w, h);
    this.ctx = c.getContext('2d')!;
    this.texture = toTexture(c);
    // MeshBasic + toneMapped=false: brilho de LED real (alimenta o bloom)
    this.material = new THREE.MeshBasicMaterial({ map: this.texture, toneMapped: false });
    this.material.color.setScalar(1.0);
    this.render(0);
  }
  last = -1;
  render(t: number) {
    this.draw(this.ctx, this.w, this.h, t);
    this.texture.needsUpdate = true;
    this.last = t;
  }
  dispose() {
    this.texture.dispose();
    this.material.dispose();
  }
}

export class ScreenRegistry {
  private list: LedScreen[] = [];
  private i = 0;
  add(s: LedScreen) {
    this.list.push(s);
    return s;
  }
  remove(s: LedScreen) {
    this.list = this.list.filter((x) => x !== s);
  }
  /** Atualiza poucos telões por quadro. */
  update(t: number, budget = 3) {
    if (!this.list.length) return;
    for (let k = 0; k < Math.min(budget, this.list.length); k++) {
      this.i = (this.i + 1) % this.list.length;
      const s = this.list[this.i];
      if (t - s.last >= 1 / s.fps) s.render(t);
    }
  }
  clear() {
    this.list.forEach((s) => s.dispose());
    this.list = [];
  }
}

function setSpacing(ctx: CanvasRenderingContext2D, px: number) {
  if ('letterSpacing' in ctx) (ctx as unknown as { letterSpacing: string }).letterSpacing = `${px}px`;
}

function scanlines(ctx: CanvasRenderingContext2D, w: number, h: number) {
  ctx.fillStyle = 'rgba(0,0,0,0.12)';
  for (let y = 0; y < h; y += 4) ctx.fillRect(0, y, w, 1);
}

/** Conteúdo padrão do telão de um estande. */
export function boothScreenDraw(o: {
  primary: string; secondary: string; accent: string; headline: string; subline: string; brand: string;
  ticker: string[]; image?: string;
}): ScreenDraw {
  let img: HTMLImageElement | null = null;
  if (o.image) {
    img = new Image();
    img.src = o.image;
  }
  const tickerText = o.ticker.length ? `   ${o.ticker.join('   •   ')}   ` : '';
  return (ctx, w, h, t) => {
    const g = ctx.createLinearGradient(0, 0, w, h);
    g.addColorStop(0, o.primary);
    g.addColorStop(1, '#050608');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);
    // varredura de luz
    const sx = ((t * 0.25) % 1.6) * w * 1.4 - w * 0.4;
    const sg = ctx.createLinearGradient(sx - w * 0.2, 0, sx + w * 0.2, 0);
    sg.addColorStop(0, 'rgba(255,255,255,0)');
    sg.addColorStop(0.5, 'rgba(255,255,255,0.10)');
    sg.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = sg;
    ctx.fillRect(0, 0, w, h);
    // barras dinâmicas
    ctx.fillStyle = o.secondary;
    for (let i = 0; i < 6; i++) {
      const bh = h * (0.08 + 0.06 * Math.sin(t * 2 + i));
      ctx.globalAlpha = 0.25;
      ctx.fillRect(w * 0.62 + i * w * 0.06, h * 0.72 - bh, w * 0.035, bh);
    }
    ctx.globalAlpha = 1;
    if (img && img.complete && img.naturalWidth) {
      const s = Math.min((w * 0.36) / img.naturalWidth, (h * 0.6) / img.naturalHeight);
      ctx.drawImage(img, w * 0.6, h * 0.1, img.naturalWidth * s, img.naturalHeight * s);
    }
    ctx.textAlign = 'left';
    ctx.textBaseline = 'alphabetic';
    setSpacing(ctx, 6);
    ctx.fillStyle = o.secondary;
    ctx.font = `700 ${h * 0.065}px ${BODY_FONT}`;
    ctx.fillText(o.brand.toUpperCase(), w * 0.06, h * 0.18);
    setSpacing(ctx, 1);
    ctx.fillStyle = readableOn(o.primary);
    const maxW = img ? w * 0.52 : w * 0.88;
    fitText(ctx, o.headline.toUpperCase(), maxW, h * 0.2, 800);
    ctx.fillText(o.headline.toUpperCase(), w * 0.06, h * 0.42);
    ctx.globalAlpha = 0.9;
    fitText(ctx, o.subline, maxW, h * 0.075, 500, BODY_FONT);
    ctx.fillText(o.subline, w * 0.06, h * 0.56);
    ctx.globalAlpha = 1;
    // faixa de ticker
    ctx.fillStyle = o.secondary;
    ctx.fillRect(0, h * 0.8, w, h * 0.2);
    if (tickerText) {
      ctx.fillStyle = readableOn(o.secondary);
      ctx.font = `700 ${h * 0.09}px ${DISPLAY_FONT}`;
      setSpacing(ctx, 2);
      const tw = ctx.measureText(tickerText).width;
      const off = (t * 120) % tw;
      ctx.textBaseline = 'middle';
      for (let x = -off; x < w; x += tw) ctx.fillText(tickerText, x, h * 0.9);
    }
    scanlines(ctx, w, h);
  };
}

/** Publicidade (espaço comercializado pela plataforma). */
export function adScreenDraw(o: { advertiser: string | null; message: string; slotName: string }): ScreenDraw {
  return (ctx, w, h, t) => {
    const hue = (t * 12) % 360;
    const g = ctx.createLinearGradient(0, 0, w, h);
    g.addColorStop(0, `hsl(${hue}, 45%, 14%)`);
    g.addColorStop(1, '#07080b');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);
    ctx.strokeStyle = 'rgba(233,196,106,0.7)';
    ctx.lineWidth = h * 0.02;
    ctx.strokeRect(h * 0.04, h * 0.04, w - h * 0.08, h - h * 0.08);
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    setSpacing(ctx, 8);
    ctx.fillStyle = '#e9c46a';
    ctx.font = `700 ${h * 0.07}px ${BODY_FONT}`;
    ctx.fillText('PUBLICIDADE', w / 2, h * 0.17);
    setSpacing(ctx, 2);
    ctx.fillStyle = '#ffffff';
    const title = o.advertiser ?? 'ANUNCIE AQUI';
    fitText(ctx, title.toUpperCase(), w * 0.86, h * 0.24, 800);
    ctx.fillText(title.toUpperCase(), w / 2, h * 0.45);
    ctx.globalAlpha = 0.85;
    fitText(ctx, o.message, w * 0.84, h * 0.08, 500, BODY_FONT);
    ctx.fillText(o.message, w / 2, h * 0.66);
    ctx.globalAlpha = 0.5;
    ctx.font = `500 ${h * 0.05}px ${BODY_FONT}`;
    ctx.fillText(o.slotName, w / 2, h * 0.84);
    ctx.globalAlpha = 1;
    scanlines(ctx, w, h);
  };
}

/** Telão do palco principal: evento ao vivo / próximo evento. */
export function stageScreenDraw(get: () => { title: string; when: string; label: string; sponsor: string | null; ad: { advertiser: string | null; message: string } | null }): ScreenDraw {
  return (ctx, w, h, t) => {
    const info = get();
    const showAd = info.ad && Math.floor(t / 12) % 3 === 2;
    ctx.fillStyle = '#05060a';
    ctx.fillRect(0, 0, w, h);
    // fundo com ondas de luz
    for (let i = 0; i < 5; i++) {
      const y = h * (0.3 + 0.12 * i) + Math.sin(t * 0.8 + i) * h * 0.05;
      const g = ctx.createLinearGradient(0, y - h * 0.2, 0, y + h * 0.2);
      g.addColorStop(0, 'rgba(0,0,0,0)');
      g.addColorStop(0.5, i % 2 ? 'rgba(212,168,63,0.18)' : 'rgba(79,240,200,0.10)');
      g.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = g;
      ctx.fillRect(0, y - h * 0.2, w, h * 0.4);
    }
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    if (showAd && info.ad) {
      adScreenDraw({ advertiser: info.ad.advertiser, message: info.ad.message, slotName: 'Telão do Palco — intervalo comercial' })(ctx, w, h, t);
      return;
    }
    setSpacing(ctx, 14);
    ctx.fillStyle = '#e9c46a';
    ctx.font = `700 ${h * 0.055}px ${BODY_FONT}`;
    ctx.fillText(info.sponsor ? `PALCO PRINCIPAL · APRESENTADO POR ${info.sponsor.toUpperCase()}` : 'PALCO PRINCIPAL', w / 2, h * 0.14);
    setSpacing(ctx, 6);
    ctx.fillStyle = info.label === 'AO VIVO' ? '#ff4d5e' : '#4ff0c8';
    ctx.font = `800 ${h * 0.075}px ${DISPLAY_FONT}`;
    ctx.fillText(info.label, w / 2, h * 0.3);
    setSpacing(ctx, 2);
    ctx.fillStyle = '#ffffff';
    fitText(ctx, info.title.toUpperCase(), w * 0.9, h * 0.2, 800);
    ctx.fillText(info.title.toUpperCase(), w / 2, h * 0.5);
    ctx.globalAlpha = 0.85;
    ctx.font = `500 ${h * 0.065}px ${BODY_FONT}`;
    ctx.fillText(info.when, w / 2, h * 0.68);
    ctx.globalAlpha = 1;
    setSpacing(ctx, 20);
    ctx.fillStyle = 'rgba(255,255,255,0.55)';
    ctx.font = `800 ${h * 0.06}px ${DISPLAY_FONT}`;
    ctx.fillText('FITNESS WORLD EXPO', w / 2, h * 0.88);
    scanlines(ctx, w, h);
  };
}

/** Totem de patrocinadores do lobby. */
export function sponsorTotemDraw(get: () => { sponsors: { name: string; tier: string }[] }): ScreenDraw {
  return (ctx, w, h, t) => {
    const { sponsors } = get();
    ctx.fillStyle = '#07080b';
    ctx.fillRect(0, 0, w, h);
    const g = ctx.createLinearGradient(0, 0, 0, h);
    g.addColorStop(0, 'rgba(212,168,63,0.25)');
    g.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h * 0.4);
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    setSpacing(ctx, 6);
    ctx.fillStyle = '#e9c46a';
    ctx.font = `700 ${w * 0.07}px ${BODY_FONT}`;
    ctx.fillText('PATROCINADORES OFICIAIS', w / 2, h * 0.08);
    const list = sponsors.length ? sponsors : [{ name: 'Seja um patrocinador', tier: '' }];
    const idx = Math.floor(t / 4) % list.length;
    list.forEach((s, i) => {
      const y = h * 0.2 + i * h * 0.12;
      if (y > h * 0.85) return;
      ctx.globalAlpha = i === idx ? 1 : 0.45;
      ctx.fillStyle = '#ffffff';
      fitText(ctx, s.name.toUpperCase(), w * 0.86, w * 0.11, 800);
      ctx.fillText(s.name.toUpperCase(), w / 2, y);
      ctx.fillStyle = '#e9c46a';
      ctx.font = `600 ${w * 0.045}px ${BODY_FONT}`;
      ctx.fillText(s.tier.toUpperCase(), w / 2, y + h * 0.045);
    });
    ctx.globalAlpha = 1;
    scanlines(ctx, w, h);
  };
}

/** Totem direcional com a lista de estandes. */
export function directoryDraw(get: () => { left: { slot: string; name: string; color: string }[]; right: { slot: string; name: string; color: string }[] }): ScreenDraw {
  return (ctx, w, h) => {
    const d = get();
    ctx.fillStyle = '#0b0d12';
    ctx.fillRect(0, 0, w, h);
    ctx.textBaseline = 'middle';
    setSpacing(ctx, 6);
    ctx.fillStyle = '#e9c46a';
    ctx.textAlign = 'center';
    ctx.font = `700 ${w * 0.06}px ${BODY_FONT}`;
    ctx.fillText('EXPOSITORES', w / 2, h * 0.06);
    setSpacing(ctx, 1);
    const rows = [...d.left.map((x) => ({ ...x, dir: '◀' })), ...d.right.map((x) => ({ ...x, dir: '▶' }))];
    rows.forEach((r, i) => {
      const y = h * 0.14 + i * h * 0.085;
      ctx.fillStyle = r.color;
      ctx.fillRect(w * 0.06, y - h * 0.03, w * 0.025, h * 0.06);
      ctx.textAlign = 'left';
      ctx.fillStyle = '#ffffff';
      ctx.font = `700 ${w * 0.075}px ${DISPLAY_FONT}`;
      ctx.fillText(`${r.slot}`, w * 0.12, y);
      ctx.font = `600 ${w * 0.058}px ${BODY_FONT}`;
      fitText(ctx, r.name, w * 0.58, w * 0.058, 600, BODY_FONT);
      ctx.fillText(r.name, w * 0.26, y);
      ctx.textAlign = 'right';
      ctx.fillStyle = '#e9c46a';
      ctx.font = `700 ${w * 0.06}px ${BODY_FONT}`;
      ctx.fillText(r.dir, w * 0.94, y);
    });
  };
}
