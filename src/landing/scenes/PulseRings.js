/**
 * PulseRings — concentric rings breathing at a workout cadence.
 *
 * The athletes page hero. Rings expand and settle on a beat, like a rep
 * timer or a heartbeat between sets, with a wireframe core keeping the
 * family resemblance to the coach node on the home page.
 */
import { mountScene } from './sceneKit.js';

const ACCENT = 0xc6f24e;

export function create(mount) {
  return mountScene(mount, build, { camera: [0, 0, 12], fov: 45 });
}

function build(THREE, { scene, small }) {
  const RINGS = small ? 4 : 6;
  const group = new THREE.Group();
  group.rotation.x = -0.32;
  scene.add(group);

  const disposables = [];

  const coreGeo = new THREE.IcosahedronGeometry(0.7, 1);
  const coreMat = new THREE.MeshBasicMaterial({
    color: ACCENT, wireframe: true, transparent: true, opacity: 0.85,
  });
  const core = new THREE.Mesh(coreGeo, coreMat);
  group.add(core);
  disposables.push(coreGeo, coreMat);

  const rings = [];
  for (let i = 0; i < RINGS; i++) {
    const geo = new THREE.TorusGeometry(1.6 + i * 1.15, 0.012, 8, 96);
    const mat = new THREE.MeshBasicMaterial({ color: ACCENT, transparent: true, opacity: 0.3 });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.rotation.x = Math.PI / 2;
    group.add(mesh);
    rings.push({ mesh, mat, base: 1.6 + i * 1.15, delay: i * 0.22 });
    disposables.push(geo, mat);
  }

  // ~32 bpm: slower than a heart, about the tempo of breathing between
  // sets. Faster looks anxious; the app is meant to feel composed.
  const BEAT = 1.9;

  return {
    frame(t) {
      core.rotation.y = t * 0.3;
      core.rotation.x = t * 0.12;

      for (const r of rings) {
        const local = ((t - r.delay) % BEAT + BEAT) % BEAT / BEAT; // 0..1
        // Sharp attack, slow settle — an eased pulse, not a sine hover.
        const pulse = Math.exp(-4.5 * local) * Math.sin(local * Math.PI * 2) * 0.22;
        const s = 1 + pulse;
        r.mesh.scale.set(s, s, s);
        r.mat.opacity = 0.10 + Math.exp(-3 * local) * 0.4;
      }
    },
    dispose() { disposables.forEach((d) => d.dispose()); },
  };
}
