import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import type { AvatarConfig, Brand, Product, Seller } from '@/domain/types';
import { buildBooth } from '@/expo/engine/booth';
import { Avatar } from '@/expo/engine/avatar';
import { ScreenRegistry } from '@/expo/engine/screens';

// Pré-visualização 3D ao vivo usada nos painéis (estande e avatar).
// Reaproveita exatamente os mesmos construtores do pavilhão.

interface Built { object: THREE.Object3D; dispose(): void; update?(t: number, dt: number): void }

function usePreview(build: () => Built, deps: unknown[], opts: { target: THREE.Vector3; distance: number; height: number; fov?: number }) {
  const ref = useRef<HTMLDivElement>(null);
  const yawRef = useRef(0.6);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(2, window.devicePixelRatio));
    renderer.setSize(el.clientWidth, el.clientHeight);
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    el.appendChild(renderer.domElement);
    renderer.domElement.style.touchAction = 'pan-y';
    const scene = new THREE.Scene();
    const pm = new THREE.PMREMGenerator(renderer);
    scene.environment = pm.fromScene(new RoomEnvironment(), 0.04).texture;
    scene.environmentIntensity = 0.6;
    pm.dispose();
    scene.add(new THREE.HemisphereLight('#e6ecf7', '#1d1a16', 1.2));
    const key = new THREE.DirectionalLight('#fff4e6', 1.6);
    key.position.set(8, 14, 10);
    scene.add(key);
    const floor = new THREE.Mesh(new THREE.CircleGeometry(30, 64), new THREE.MeshStandardMaterial({ color: '#14161b', roughness: 0.35, metalness: 0.1 }));
    floor.rotation.x = -Math.PI / 2;
    floor.position.y = -0.01;
    scene.add(floor);
    const camera = new THREE.PerspectiveCamera(opts.fov ?? 40, el.clientWidth / el.clientHeight, 0.05, 200);
    const built = build();
    scene.add(built.object);
    let raf = 0;
    let dragging = false;
    let lastX = 0;
    let idle = 0;
    const clock = new THREE.Clock();
    const loop = () => {
      raf = requestAnimationFrame(loop);
      const dt = Math.min(0.05, clock.getDelta());
      idle += dt;
      if (!dragging && idle > 1.5) yawRef.current += dt * 0.25;
      const y = yawRef.current;
      camera.position.set(opts.target.x + Math.sin(y) * opts.distance, opts.height, opts.target.z + Math.cos(y) * opts.distance);
      camera.lookAt(opts.target);
      built.update?.(clock.elapsedTime, dt);
      renderer.render(scene, camera);
    };
    loop();
    const down = (e: PointerEvent) => { dragging = true; lastX = e.clientX; idle = 0; };
    const move = (e: PointerEvent) => {
      if (!dragging) return;
      yawRef.current -= (e.clientX - lastX) * 0.008;
      lastX = e.clientX;
      idle = 0;
    };
    const up = () => (dragging = false);
    renderer.domElement.addEventListener('pointerdown', down);
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
    const ro = new ResizeObserver(() => {
      renderer.setSize(el.clientWidth, el.clientHeight);
      camera.aspect = el.clientWidth / el.clientHeight;
      camera.updateProjectionMatrix();
    });
    ro.observe(el);
    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
      built.dispose();
      scene.environment?.dispose();
      floor.geometry.dispose();
      (floor.material as THREE.Material).dispose();
      renderer.dispose();
      renderer.domElement.remove();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
  return ref;
}

export function BoothPreview({ brand, products, sellers, className }: { brand: Brand; products: Product[]; sellers: Seller[]; className?: string }) {
  const sig = JSON.stringify([brand.booth, brand.name, products, sellers.map((s) => s.avatar)]);
  const ref = usePreview(
    () => {
      const b = buildBooth({ brand, products, sellers, w: 15, d: 15, slotLabel: brand.slotId ?? '—', quality: 'alta' });
      const reg = new ScreenRegistry();
      b.screens.forEach((s) => reg.add(s));
      const avatars = b.sellerSpots.slice(0, sellers.length).map((sp, i) => {
        const a = new Avatar(sellers[i].avatar, { name: sellers[i].name, sub: sellers[i].title, logo: brand.booth.logoText });
        a.group.position.set(sp.x, 0.12, sp.z);
        a.group.rotation.y = sp.ry;
        a.showTag(false);
        b.group.add(a.group);
        return a;
      });
      return {
        object: b.group,
        dispose: () => { b.dispose(); avatars.forEach((a) => a.dispose()); },
        update: (t, dt) => {
          reg.update(t, 2);
          b.spinners.forEach((s) => (s.rotation.y += dt * 0.5));
          avatars.forEach((a) => a.update(dt, false, false));
        },
      };
    },
    [sig],
    { target: new THREE.Vector3(0, 2.2, 0), distance: 22, height: 10, fov: 45 },
  );
  return <div ref={ref} className={className} />;
}

export function AvatarPreview({ config, name, logo, className }: { config: AvatarConfig; name: string; logo?: string; className?: string }) {
  const ref = usePreview(
    () => {
      const a = new Avatar(config, { name, sub: '', logo });
      a.showTag(false);
      return { object: a.group, dispose: () => a.dispose(), update: (_t, dt) => a.update(dt, false, false) };
    },
    [JSON.stringify(config), name, logo],
    { target: new THREE.Vector3(0, config.height * 0.53, 0), distance: 3.9, height: config.height * 0.72, fov: 35 },
  );
  return <div ref={ref} className={className} />;
}
