export function uid(prefix = ''): string {
  const r = Math.random().toString(36).slice(2, 8);
  const t = Date.now().toString(36).slice(-4);
  return `${prefix}${t}${r}`;
}

const brl = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });
export const money = (v: number) => brl.format(v || 0);

const num = new Intl.NumberFormat('pt-BR');
export const fmtNum = (v: number) => num.format(v || 0);

export const pct = (v: number) => `${(v || 0).toLocaleString('pt-BR', { maximumFractionDigits: 1 })}%`;

export function ymd(d: Date): string {
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

export function parseYmd(s: string): Date {
  const [y, m, d] = s.split('-').map(Number);
  return new Date(y, (m || 1) - 1, d || 1);
}

export function addDays(d: Date, n: number): Date {
  const c = new Date(d);
  c.setDate(c.getDate() + n);
  return c;
}

export function atTime(dateYmd: string, hhmm: string): Date {
  const d = parseYmd(dateYmd);
  const [h, m] = hhmm.split(':').map(Number);
  d.setHours(h || 0, m || 0, 0, 0);
  return d;
}

export function fmtDate(d: Date | string, opts: Intl.DateTimeFormatOptions = { day: '2-digit', month: 'short', year: 'numeric' }) {
  const dt = typeof d === 'string' ? (d.length === 10 ? parseYmd(d) : new Date(d)) : d;
  return dt.toLocaleDateString('pt-BR', opts);
}

export function fmtTime(d: Date | string) {
  const dt = typeof d === 'string' ? new Date(d) : d;
  return dt.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
}

export function fmtDateTime(d: Date | string) {
  return `${fmtDate(d, { day: '2-digit', month: '2-digit' })} ${fmtTime(d)}`;
}

export function clamp(v: number, a: number, b: number) {
  return Math.max(a, Math.min(b, v));
}

export function hashString(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

export function shortId(s: string) {
  return s.slice(-4).toUpperCase();
}

/** Redimensiona uma imagem enviada pelo usuário para um dataURL leve. */
export function fileToDataUrl(file: File, maxSize = 512): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(reader.error);
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error('Imagem inválida'));
      img.onload = () => {
        const scale = Math.min(1, maxSize / Math.max(img.width, img.height));
        const c = document.createElement('canvas');
        c.width = Math.round(img.width * scale);
        c.height = Math.round(img.height * scale);
        c.getContext('2d')!.drawImage(img, 0, 0, c.width, c.height);
        resolve(c.toDataURL('image/png'));
      };
      img.src = String(reader.result);
    };
    reader.readAsDataURL(file);
  });
}
