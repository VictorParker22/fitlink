/**
 * FlowField — parallel lines flowing through a shared wave.
 *
 * The coaches page hero. The metaphor is a season track: many athletes,
 * one programme, each moving through the same structure on their own
 * timing. Concretely: a ribbon of lines sharing one waveform, each line
 * phase-shifted, with a few bright "athletes" travelling along it.
 */
import { mountScene } from './sceneKit.js';

const ACCENT = 0xc6f24e;
const DIM = 0x4a5142;

export function create(mount) {
  return mountScene(mount, build, { camera: [0, 1.2, 11], fov: 50 });
}

function build(THREE, { scene, small }) {
  const LINES = small ? 14 : 22;
  const SEGS = small ? 90 : 140;
  const WIDTH = 26;

  const group = new THREE.Group();
  group.rotation.x = -0.42; // looked at from slightly above, like a chart
  scene.add(group);

  const disposables = [];
  const lines = [];

  for (let i = 0; i < LINES; i++) {
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array((SEGS + 1) * 3), 3));
    const centred = Math.abs(i - (LINES - 1) / 2) / (LINES / 2); // 0 centre → 1 edge
    const mat = new THREE.LineBasicMaterial({
      color: new THREE.Color(DIM).lerp(new THREE.Color(ACCENT), 1 - centred * 0.85),
      transparent: true,
      opacity: 0.16 + (1 - centred) * 0.3,
    });
    const line = new THREE.Line(geo, mat);
    group.add(line);
    lines.push({ geo, z: (i - (LINES - 1) / 2) * 0.55, phase: i * 0.35 });
    disposables.push(geo, mat);
  }

  // The athletes: bright points riding the same wave the lines draw.
  const RIDERS = small ? 5 : 9;
  const riderGeo = new THREE.SphereGeometry(0.09, 8, 8);
  const riderMat = new THREE.MeshBasicMaterial({ color: ACCENT });
  disposables.push(riderGeo, riderMat);
  const riders = [];
  for (let i = 0; i < RIDERS; i++) {
    const mesh = new THREE.Mesh(riderGeo, riderMat);
    group.add(mesh);
    riders.push({
      mesh,
      lane: Math.floor(Math.random() * LINES),
      speed: 0.045 + Math.random() * 0.05,
      u: Math.random(), // progress along the line, 0..1
    });
  }

  // One waveform, shared. Lines and riders both sample it, which is what
  // makes the riders read as ON the track instead of floating near it.
  const waveY = (x, z, phase, t) =>
    Math.sin(x * 0.42 + t * 0.7 + phase) * 0.55 +
    Math.sin(x * 0.13 - t * 0.35 + z * 0.5) * 0.85;

  return {
    frame(t) {
      for (const l of lines) {
        const arr = l.geo.attributes.position.array;
        for (let s = 0; s <= SEGS; s++) {
          const x = (s / SEGS - 0.5) * WIDTH;
          arr[s * 3] = x;
          arr[s * 3 + 1] = waveY(x, l.z, l.phase, t);
          arr[s * 3 + 2] = l.z;
        }
        l.geo.attributes.position.needsUpdate = true;
      }
      for (const r of riders) {
        r.u += r.speed / 60;
        if (r.u > 1) { r.u = 0; r.lane = Math.floor(Math.random() * LINES); }
        const l = lines[r.lane];
        const x = (r.u - 0.5) * WIDTH;
        r.mesh.position.set(x, waveY(x, l.z, l.phase, t) + 0.05, l.z);
      }
    },
    dispose() { disposables.forEach((d) => d.dispose()); },
  };
}
