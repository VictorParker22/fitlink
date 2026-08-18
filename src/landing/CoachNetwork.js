/**
 * CoachNetwork — the hero's three.js scene.
 *
 * ── WHY THIS SHAPE, AND NOT A PARTICLE FIELD ────────────────────────
 * Every SaaS hero has drifting dots. They say nothing. This says the one
 * thing FitLink is actually about: a coach at the centre, athletes around
 * them, and a live line between each pair. The lines are the product — the
 * check-in, the logged set, the reply — so they are what moves. Nodes drift
 * slowly; the CONNECTIONS pulse.
 *
 * The pulse travels outward from the coach, because that is the direction
 * coaching runs in. It is a visual claim the product can actually back.
 *
 * ── EVERY WAY THIS IS ALLOWED TO NOT RUN ────────────────────────────
 * A marketing hero must never be the reason a page is blank, janky or hot.
 * So this module is defensive by construction:
 *
 *  1. NO WEBGL → `create()` returns null and the caller keeps its CSS
 *     gradient. The canvas is never even inserted.
 *  2. REDUCED MOTION → one frame is rendered and the loop never starts.
 *     The composition still reads; it simply holds still. This is a real
 *     accessibility requirement, not a nicety: vestibular disorders make
 *     continuous parallax genuinely unpleasant.
 *  3. OFF-SCREEN or BACKGROUND TAB → the loop stops. A hero that keeps
 *     spinning a GPU while the reader is in the FAQ is a battery bug.
 *  4. SMALL SCREENS → fewer nodes and a capped pixel ratio. A phone GPU
 *     rendering 4× pixels for a decorative background is the single easiest
 *     way to make a fast site feel slow.
 *
 * ── LOADED LATE, ON PURPOSE ─────────────────────────────────────────
 * three.js is ~150 KB gzipped — comparable to the entire rest of this page.
 * The caller imports this module dynamically AFTER first paint, so the
 * headline and CTA are readable long before the scene exists. Largest
 * Contentful Paint is text; the 3D is an enhancement that arrives.
 */

const ACCENT = 0xc6f24e;
const DIM = 0x33382f;

/**
 * @param {HTMLElement} mount     container the canvas is appended to
 * @returns {Promise<{destroy:()=>void}|null>} null when WebGL is unavailable
 */
export async function createCoachNetwork(mount) {
  if (!mount) return null;

  // Probe for WebGL before paying for the three.js import. A throwing or
  // null-returning getContext is the honest signal that this device cannot
  // do the scene — some locked-down browsers and VMs land here.
  try {
    const probe = document.createElement('canvas');
    const gl = probe.getContext('webgl2') || probe.getContext('webgl');
    if (!gl) return null;
  } catch {
    return null;
  }

  const THREE = await import('three');

  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const small = window.innerWidth < 760;
  const ATHLETES = small ? 14 : 26;

  const scene = new THREE.Scene();
  // Composition: type on the left, network on the right. Centred, the hub
  // lands directly under the lede and the two fight each other. On phones it
  // stays centred — there the veil is near-opaque and the scene is texture.
  scene.position.x = small ? 0 : 3.4;
  const camera = new THREE.PerspectiveCamera(46, 1, 0.1, 100);
  camera.position.set(0, 0, 15);

  const renderer = new THREE.WebGLRenderer({ antialias: !small, alpha: true });
  // A decorative layer never earns more than 2× pixels, and on phones not
  // even that. This one cap is the difference between smooth and hot.
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, small ? 1.5 : 2));
  renderer.setClearColor(0x000000, 0);
  mount.appendChild(renderer.domElement);
  renderer.domElement.setAttribute('aria-hidden', 'true');

  // ── The coach, at the centre ──────────────────────────────────────
  const coachGeo = new THREE.IcosahedronGeometry(0.85, 1);
  const coachMat = new THREE.MeshBasicMaterial({
    color: ACCENT, wireframe: true, transparent: true, opacity: 0.9,
  });
  const coach = new THREE.Mesh(coachGeo, coachMat);
  scene.add(coach);

  const haloGeo = new THREE.IcosahedronGeometry(1.5, 1);
  const haloMat = new THREE.MeshBasicMaterial({
    color: ACCENT, wireframe: true, transparent: true, opacity: 0.14,
  });
  const halo = new THREE.Mesh(haloGeo, haloMat);
  scene.add(halo);

  // ── The athletes, on a shell around them ──────────────────────────
  // Fibonacci sphere: even coverage without the clustering at the poles
  // that naive random spherical coordinates always produce.
  const athletes = [];
  const nodeGeo = new THREE.SphereGeometry(0.13, 10, 10);
  const golden = Math.PI * (3 - Math.sqrt(5));

  for (let i = 0; i < ATHLETES; i++) {
    const y = 1 - (i / (ATHLETES - 1)) * 2;
    const r = Math.sqrt(Math.max(0, 1 - y * y));
    const theta = golden * i;
    const radius = 5.2 + Math.random() * 2.6;

    const mat = new THREE.MeshBasicMaterial({
      color: ACCENT, transparent: true, opacity: 0.55 + Math.random() * 0.45,
    });
    const node = new THREE.Mesh(nodeGeo, mat);
    node.position.set(Math.cos(theta) * r * radius, y * radius, Math.sin(theta) * r * radius);
    scene.add(node);

    athletes.push({
      mesh: node,
      mat,
      base: node.position.clone(),
      // Each athlete drifts on its own clock, so the field never pulses in
      // unison — a synchronised field reads as an animation, not a roster.
      speed: 0.18 + Math.random() * 0.5,
      phase: Math.random() * Math.PI * 2,
      // How far along the pulse is when it reaches this athlete. Distance
      // from the coach, so the wave genuinely travels outward.
      delay: radius / 8,
    });
  }

  // ── The lines: one per athlete, coach outward ─────────────────────
  // A single BufferGeometry with two vertices per line, updated in place.
  // 26 separate Line objects would be 26 draw calls for a background.
  const linePositions = new Float32Array(ATHLETES * 2 * 3);
  const lineColors = new Float32Array(ATHLETES * 2 * 3);
  const lineGeo = new THREE.BufferGeometry();
  lineGeo.setAttribute('position', new THREE.BufferAttribute(linePositions, 3));
  lineGeo.setAttribute('color', new THREE.BufferAttribute(lineColors, 3));
  const lineMat = new THREE.LineBasicMaterial({
    vertexColors: true, transparent: true, opacity: 0.5,
  });
  const lines = new THREE.LineSegments(lineGeo, lineMat);
  scene.add(lines);

  const accent = new THREE.Color(ACCENT);
  const dim = new THREE.Color(DIM);
  const tmp = new THREE.Color();

  // ── Cursor parallax ───────────────────────────────────────────────
  // Eased rather than applied directly: raw pointer values make the scene
  // twitch, which reads as cheap.
  const pointer = { x: 0, y: 0, tx: 0, ty: 0 };
  const onPointerMove = (e) => {
    pointer.tx = (e.clientX / window.innerWidth - 0.5) * 2;
    pointer.ty = (e.clientY / window.innerHeight - 0.5) * 2;
  };
  if (!reduceMotion) window.addEventListener('pointermove', onPointerMove, { passive: true });

  // ── Sizing ────────────────────────────────────────────────────────
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

  // ── Frame ─────────────────────────────────────────────────────────
  const start = performance.now();

  const frame = (nowMs) => {
    const t = (nowMs - start) / 1000;

    coach.rotation.y = t * 0.16;
    coach.rotation.x = t * 0.09;
    halo.rotation.y = -t * 0.11;
    halo.rotation.z = t * 0.06;

    for (let i = 0; i < athletes.length; i++) {
      const a = athletes[i];
      const bob = Math.sin(t * a.speed + a.phase) * 0.42;
      a.mesh.position.set(a.base.x, a.base.y + bob, a.base.z);

      // The pulse: a travelling wave, brightest as it passes this athlete.
      const wave = Math.sin(t * 0.85 - a.delay * 2.2);
      const strength = Math.max(0, wave) ** 2;
      a.mat.opacity = 0.35 + strength * 0.65;

      const o = i * 6;
      linePositions[o] = 0;
      linePositions[o + 1] = 0;
      linePositions[o + 2] = 0;
      linePositions[o + 3] = a.mesh.position.x;
      linePositions[o + 4] = a.mesh.position.y;
      linePositions[o + 5] = a.mesh.position.z;

      // Bright at the coach end, fading outward, modulated by the pulse —
      // so a line looks like something travelling along it rather than a
      // static wire that changes brightness.
      tmp.copy(dim).lerp(accent, 0.25 + strength * 0.75);
      lineColors[o] = tmp.r; lineColors[o + 1] = tmp.g; lineColors[o + 2] = tmp.b;
      tmp.copy(dim).lerp(accent, strength * 0.5);
      lineColors[o + 3] = tmp.r; lineColors[o + 4] = tmp.g; lineColors[o + 5] = tmp.b;
    }

    lineGeo.attributes.position.needsUpdate = true;
    lineGeo.attributes.color.needsUpdate = true;

    pointer.x += (pointer.tx - pointer.x) * 0.045;
    pointer.y += (pointer.ty - pointer.y) * 0.045;
    camera.position.x = pointer.x * 2.4;
    camera.position.y = -pointer.y * 1.6;
    camera.lookAt(0, 0, 0);

    renderer.render(scene, camera);
  };

  // ── The loop, and every reason to stop it ─────────────────────────
  let raf = 0;
  let running = false;
  let visible = true;
  let onScreen = true;

  const tick = (now) => {
    frame(now);
    raf = requestAnimationFrame(tick);
  };
  const play = () => {
    if (running || reduceMotion || !visible || !onScreen) return;
    running = true;
    raf = requestAnimationFrame(tick);
  };
  const pause = () => {
    if (!running) return;
    running = false;
    cancelAnimationFrame(raf);
  };

  // Reduced motion still gets a composed, rendered scene — just a still one.
  frame(performance.now());

  const onVisibility = () => {
    visible = document.visibilityState === 'visible';
    visible ? play() : pause();
  };
  document.addEventListener('visibilitychange', onVisibility);

  const io = new IntersectionObserver(
    ([entry]) => {
      onScreen = entry.isIntersecting;
      onScreen ? play() : pause();
    },
    { threshold: 0.01 },
  );
  io.observe(mount);

  play();

  return {
    destroy() {
      pause();
      io.disconnect();
      ro.disconnect();
      document.removeEventListener('visibilitychange', onVisibility);
      window.removeEventListener('pointermove', onPointerMove);
      // Three.js holds GPU resources the garbage collector cannot reach.
      // Without explicit disposal these leak for the life of the tab.
      coachGeo.dispose(); coachMat.dispose();
      haloGeo.dispose(); haloMat.dispose();
      nodeGeo.dispose();
      athletes.forEach((a) => a.mat.dispose());
      lineGeo.dispose(); lineMat.dispose();
      renderer.dispose();
      if (renderer.domElement.parentNode === mount) mount.removeChild(renderer.domElement);
    },
  };
}
