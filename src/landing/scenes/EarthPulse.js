/**
 * EarthPulse — a globe of points with activity arcs travelling across it.
 *
 * Used on the home page's economy section and the gyms page. The arcs are
 * the visual for "coaching happening between two places" — each one lights,
 * travels, lands and fades, on its own clock so the globe never strobes.
 *
 * The globe is an even point-shell (fibonacci sphere), not real continents:
 * continent outlines would claim geographic data we are not actually
 * plotting, and at this size they read as noise anyway. This is a globe as
 * an idea, and it says so by being obviously stylised.
 */
import { mountScene } from './sceneKit.js';

const ACCENT = 0xc6f24e;

export function create(mount) {
  return mountScene(mount, build, { camera: [0, 0, 14], fov: 42 });
}

function build(THREE, { scene, small }) {
  const R = 5;
  const POINTS = small ? 420 : 900;
  const ARCS = small ? 7 : 12;

  const group = new THREE.Group();
  // Tilt like a desk globe — a perfectly upright sphere reads as a ball,
  // a tilted one reads as a planet.
  group.rotation.z = 0.41;
  scene.add(group);

  // ── Point shell ───────────────────────────────────────────────────
  const positions = new Float32Array(POINTS * 3);
  const golden = Math.PI * (3 - Math.sqrt(5));
  for (let i = 0; i < POINTS; i++) {
    const y = 1 - (i / (POINTS - 1)) * 2;
    const r = Math.sqrt(Math.max(0, 1 - y * y));
    const th = golden * i;
    positions[i * 3] = Math.cos(th) * r * R;
    positions[i * 3 + 1] = y * R;
    positions[i * 3 + 2] = Math.sin(th) * r * R;
  }
  const dotsGeo = new THREE.BufferGeometry();
  dotsGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  const dotsMat = new THREE.PointsMaterial({
    color: ACCENT, size: 0.055, transparent: true, opacity: 0.5, sizeAttenuation: true,
  });
  group.add(new THREE.Points(dotsGeo, dotsMat));

  // Faint wireframe holds the silhouette where points get sparse at the rim.
  const wireGeo = new THREE.SphereGeometry(R * 0.995, 24, 18);
  const wireMat = new THREE.MeshBasicMaterial({
    color: ACCENT, wireframe: true, transparent: true, opacity: 0.05,
  });
  group.add(new THREE.Mesh(wireGeo, wireMat));

  // ── Arcs ──────────────────────────────────────────────────────────
  // Each arc: a curve between two random surface points, drawn as a line
  // whose visible window slides from start to end — a travelling spark with
  // a tail, not a static rainbow.
  const SEGS = 64;
  const arcs = [];
  const disposables = [dotsGeo, dotsMat, wireGeo, wireMat];

  const randomSurface = () => {
    const v = new THREE.Vector3(
      Math.random() * 2 - 1, Math.random() * 2 - 1, Math.random() * 2 - 1,
    );
    // Degenerate near-zero vectors normalise garbage; re-roll them.
    return v.lengthSq() < 0.01 ? randomSurface() : v.normalize().multiplyScalar(R);
  };

  const buildArcPath = (arc) => {
    const a = randomSurface();
    const b = randomSurface();
    // Lift the midpoint: chord length decides height, so short hops hug the
    // surface and long hauls swing wide, like flight paths.
    const mid = a.clone().add(b).normalize().multiplyScalar(R + a.distanceTo(b) * 0.38);
    const curve = new THREE.QuadraticBezierCurve3(a, mid, b);
    const pts = curve.getPoints(SEGS);
    const arr = arc.geo.attributes.position.array;
    for (let i = 0; i <= SEGS; i++) {
      arr[i * 3] = pts[i].x; arr[i * 3 + 1] = pts[i].y; arr[i * 3 + 2] = pts[i].z;
    }
    arc.geo.attributes.position.needsUpdate = true;
  };

  for (let i = 0; i < ARCS; i++) {
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array((SEGS + 1) * 3), 3));
    const mat = new THREE.LineBasicMaterial({ color: ACCENT, transparent: true, opacity: 0 });
    const line = new THREE.Line(geo, mat);
    group.add(line);
    const arc = {
      geo, mat, line,
      // Staggered clocks: phase in [0,1), each arc lives a `period`-second
      // life — rise, travel, fade — then re-rolls a new route.
      period: 4 + Math.random() * 3,
      offset: Math.random() * 7,
      lastCycle: -1,
    };
    buildArcPath(arc);
    arcs.push(arc);
    disposables.push(geo, mat);
  }

  return {
    frame(t) {
      group.rotation.y = t * 0.06;

      for (const arc of arcs) {
        const local = (t + arc.offset) / arc.period;
        const cycle = Math.floor(local);
        const p = local - cycle; // 0..1 through this arc's life

        if (cycle !== arc.lastCycle) {
          arc.lastCycle = cycle;
          buildArcPath(arc); // new route each life
        }

        // Draw range slides across the curve: a head at p, a tail behind it.
        const head = Math.min(1, p * 1.25);
        const tail = Math.max(0, p * 1.25 - 0.35);
        arc.geo.setDrawRange(Math.floor(tail * SEGS), Math.max(2, Math.ceil((head - tail) * SEGS)));

        // Bright through the middle of its life, soft at both ends.
        arc.mat.opacity = Math.sin(Math.min(1, p) * Math.PI) * 0.85;
      }
    },
    dispose() { disposables.forEach((d) => d.dispose()); },
  };
}
