// Controles em primeira pessoa:
//  - Computador: W A S D / setas para andar, Shift para acelerar, mouse para olhar
//    (Pointer Lock ao clicar na cena).
//  - Celular/tablet: joystick virtual (metade esquerda) e arrastar para olhar
//    (metade direita). Toque rápido em um objeto = interagir.

export interface ControlState {
  forward: number; // -1..1
  strafe: number; // -1..1
  run: boolean;
}

export class FirstPersonInput {
  yaw = 0;
  pitch = -0.04;
  locked = false;
  enabled = true;
  private keys = new Set<string>();
  joy = { active: false, id: -1, ox: 0, oy: 0, x: 0, y: 0 };
  private look = { id: -1, x: 0, y: 0, sx: 0, sy: 0, t: 0, moved: false };
  onTap: ((x: number, y: number) => void) | null = null;
  onClick: ((x: number, y: number) => void) | null = null;
  onHoverMove: ((x: number, y: number) => void) | null = null;
  onInteractKey: (() => void) | null = null;
  onLockChange: ((locked: boolean) => void) | null = null;
  readonly isTouch: boolean;

  constructor(private el: HTMLElement) {
    this.isTouch = matchMedia('(pointer: coarse)').matches || 'ontouchstart' in window;
    window.addEventListener('keydown', this.kd);
    window.addEventListener('keyup', this.ku);
    window.addEventListener('blur', this.blur);
    document.addEventListener('pointerlockchange', this.plc);
    el.addEventListener('mousemove', this.mm);
    el.addEventListener('mousedown', this.md);
    el.addEventListener('touchstart', this.ts, { passive: false });
    el.addEventListener('touchmove', this.tm, { passive: false });
    el.addEventListener('touchend', this.te);
    el.addEventListener('touchcancel', this.te);
  }

  private isTyping(e: KeyboardEvent) {
    const t = e.target as HTMLElement | null;
    return !!t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable);
  }

  private kd = (e: KeyboardEvent) => {
    if (this.isTyping(e) || !this.enabled) return;
    this.keys.add(e.code);
    if (e.code === 'KeyE' || e.code === 'Enter') this.onInteractKey?.();
    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].includes(e.code)) e.preventDefault();
  };
  private ku = (e: KeyboardEvent) => {
    this.keys.delete(e.code);
  };
  private blur = () => this.keys.clear();

  private plc = () => {
    this.locked = document.pointerLockElement === this.el;
    this.onLockChange?.(this.locked);
  };

  requestLock() {
    if (this.isTouch || !this.enabled) return;
    try {
      const r = this.el.requestPointerLock() as unknown as Promise<void> | undefined;
      r?.catch?.(() => undefined);
    } catch {
      /* navegador pode recusar */
    }
  }

  exitLock() {
    if (document.pointerLockElement) document.exitPointerLock();
  }

  private mm = (e: MouseEvent) => {
    if (!this.enabled) return;
    if (this.locked) {
      this.yaw -= e.movementX * 0.0022;
      this.pitch -= e.movementY * 0.0022;
      this.clampPitch();
    } else {
      this.onHoverMove?.(e.clientX, e.clientY);
    }
  };

  private md = (e: MouseEvent) => {
    if (!this.enabled || e.button !== 0) return;
    if (this.locked) this.onInteractKey?.();
    else this.onClick?.(e.clientX, e.clientY);
  };

  private clampPitch() {
    this.pitch = Math.max(-1.25, Math.min(1.1, this.pitch));
  }

  private ts = (e: TouchEvent) => {
    if (!this.enabled) return;
    e.preventDefault();
    const w = this.el.clientWidth;
    for (const t of Array.from(e.changedTouches)) {
      if (t.clientX < w * 0.42 && !this.joy.active) {
        this.joy = { active: true, id: t.identifier, ox: t.clientX, oy: t.clientY, x: 0, y: 0 };
      } else if (this.look.id === -1) {
        this.look = { id: t.identifier, x: t.clientX, y: t.clientY, sx: t.clientX, sy: t.clientY, t: performance.now(), moved: false };
      }
    }
  };

  private tm = (e: TouchEvent) => {
    if (!this.enabled) return;
    e.preventDefault();
    for (const t of Array.from(e.changedTouches)) {
      if (t.identifier === this.joy.id) {
        const dx = t.clientX - this.joy.ox;
        const dy = t.clientY - this.joy.oy;
        const max = 55;
        const len = Math.hypot(dx, dy);
        const k = len > max ? max / len : 1;
        this.joy.x = (dx * k) / max;
        this.joy.y = (dy * k) / max;
      } else if (t.identifier === this.look.id) {
        const dx = t.clientX - this.look.x;
        const dy = t.clientY - this.look.y;
        this.look.x = t.clientX;
        this.look.y = t.clientY;
        if (Math.hypot(t.clientX - this.look.sx, t.clientY - this.look.sy) > 8) this.look.moved = true;
        this.yaw -= dx * 0.0042;
        this.pitch -= dy * 0.0042;
        this.clampPitch();
      }
    }
  };

  private te = (e: TouchEvent) => {
    for (const t of Array.from(e.changedTouches)) {
      if (t.identifier === this.joy.id) this.joy = { active: false, id: -1, ox: 0, oy: 0, x: 0, y: 0 };
      if (t.identifier === this.look.id) {
        if (!this.look.moved && performance.now() - this.look.t < 300) this.onTap?.(t.clientX, t.clientY);
        this.look.id = -1;
      }
    }
  };

  state(): ControlState {
    if (!this.enabled) return { forward: 0, strafe: 0, run: false };
    const k = this.keys;
    let f = (k.has('KeyW') || k.has('ArrowUp') ? 1 : 0) - (k.has('KeyS') || k.has('ArrowDown') ? 1 : 0);
    let s = (k.has('KeyD') || k.has('ArrowRight') ? 1 : 0) - (k.has('KeyA') || k.has('ArrowLeft') ? 1 : 0);
    if (this.joy.active) {
      f = -this.joy.y;
      s = this.joy.x;
    }
    return { forward: f, strafe: s, run: k.has('ShiftLeft') || k.has('ShiftRight') || (this.joy.active && Math.hypot(this.joy.x, this.joy.y) > 0.92) };
  }

  dispose() {
    window.removeEventListener('keydown', this.kd);
    window.removeEventListener('keyup', this.ku);
    window.removeEventListener('blur', this.blur);
    document.removeEventListener('pointerlockchange', this.plc);
    this.el.removeEventListener('mousemove', this.mm);
    this.el.removeEventListener('mousedown', this.md);
    this.el.removeEventListener('touchstart', this.ts);
    this.el.removeEventListener('touchmove', this.tm);
    this.el.removeEventListener('touchend', this.te);
    this.el.removeEventListener('touchcancel', this.te);
    this.exitLock();
  }
}
