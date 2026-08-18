/**
 * sceneKit — the lifecycle every three.js scene on this site shares.
 *
 * CoachNetwork (the home hero) proved the pattern: WebGL probe before the
 * import, reduced-motion renders one still frame, the loop stops off-screen
 * and in background tabs, pixel ratio is capped, and destroy() releases GPU
 * memory. Now that the site has several scenes, that discipline lives HERE
 * once instead of being re-earned (or quietly forgotten) per scene.
 *
 * A scene module gives us two functions:
 *   build(THREE, ctx)  -> { frame(t), dispose() }   — construct once
 *   frame(t)                                        — advance to time t (s)
 *
 * Everything else — when frames run, when they stop, when it all dies — is
 * this file's problem, not the scene's.
 */

export async function mountScene(mount, buildFn, opts = {}) {
  if (!mount) return null;

  // Probe before paying for the import: some locked-down browsers/VMs have
  // no WebGL, and they should cost us nothing and show the CSS fallback.
  try {
    const probe = document.createElement('canvas');
    if (!probe.getContext('webgl2') && !probe.getContext('webgl')) return null;
  } catch {
    return null;
  }

  const THREE = await import('three');

  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const small = window.innerWidth < 760;

  const renderer = new THREE.WebGLRenderer({ antialias: !small, alpha: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, small ? 1.5 : 2));
  renderer.setClearColor(0x000000, 0);
  renderer.domElement.setAttribute('aria-hidden', 'true');
  mount.appendChild(renderer.domElement);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(opts.fov ?? 45, 1, 0.1, 200);
  camera.position.set(...(opts.camera ?? [0, 0, 16]));

  const built = buildFn(THREE, { scene, camera, renderer, small, reduceMotion });

  const resize = () => {
    const w = mount.clientWidth || 1;
    const h = mount.clientHeight || 1;
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    renderer.setSize(w, h, false);
  };
  resize();
  const ro = new ResizeObserver(resize);
  ro.observe(mount);

  const start = performance.now();
  const draw = (nowMs) => {
    built.frame((nowMs - start) / 1000);
    renderer.render(scene, camera);
  };

  let raf = 0;
  let running = false;
  let visible = document.visibilityState === 'visible';
  let onScreen = true;

  const tick = (now) => { draw(now); raf = requestAnimationFrame(tick); };
  const play = () => {
    if (running || reduceMotion || !visible || !onScreen) return;
    running = true;
    raf = requestAnimationFrame(tick);
  };
  const pause = () => { if (running) { running = false; cancelAnimationFrame(raf); } };

  // Reduced motion still deserves a composed image — just a still one.
  draw(performance.now());

  const onVis = () => { visible = document.visibilityState === 'visible'; visible ? play() : pause(); };
  document.addEventListener('visibilitychange', onVis);

  const io = new IntersectionObserver(([e]) => { onScreen = e.isIntersecting; onScreen ? play() : pause(); }, { threshold: 0.01 });
  io.observe(mount);

  play();

  return {
    destroy() {
      pause();
      io.disconnect();
      ro.disconnect();
      document.removeEventListener('visibilitychange', onVis);
      built.dispose();
      renderer.dispose();
      if (renderer.domElement.parentNode === mount) mount.removeChild(renderer.domElement);
    },
  };
}

/**
 * React hook: mount a scene module into a ref'd container for the life of
 * the component. `loader` is a dynamic import so each scene stays in its own
 * chunk and none of them delay first paint.
 */
import { useEffect, useRef } from 'react';

export function useScene(loader) {
  const mountRef = useRef(null);

  useEffect(() => {
    let cancelled = false;
    let handle = null;
    loader()
      .then((mod) => {
        if (cancelled || !mountRef.current) return null;
        return mod.create(mountRef.current);
      })
      .then((h) => {
        if (cancelled) { h?.destroy(); return; }
        handle = h;
      })
      .catch(() => { /* scenes are decoration; the page must not care */ });
    return () => { cancelled = true; handle?.destroy(); };
  }, [loader]);

  return mountRef;
}
