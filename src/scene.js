import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';

const chrome = new THREE.MeshPhysicalMaterial({ color: 0xe6e8eb, metalness: 1, roughness: 0.08 });
const alu = new THREE.MeshPhysicalMaterial({ color: 0xcfd3d7, metalness: 0.85, roughness: 0.38 });
const dark = new THREE.MeshStandardMaterial({ color: 0x1a1a1c, metalness: 0.5, roughness: 0.5 });
const acrylic = new THREE.MeshPhysicalMaterial({
  color: 0x202d6a, metalness: 0, roughness: 0.18, transmission: 0.9, thickness: 8, ior: 1.49,
  transparent: true, opacity: 0.9, side: THREE.DoubleSide,
});

export function createViewer(container) {
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 0.75;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  container.appendChild(renderer.domElement);

  const scene = new THREE.Scene();
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  scene.environmentIntensity = 0.7;

  const sun = new THREE.DirectionalLight(0xffffff, 0.9);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  scene.add(sun);
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.ShadowMaterial({ opacity: 0.18 }));
  ground.rotation.x = -Math.PI / 2;
  ground.receiveShadow = true;
  scene.add(ground);

  const camera = new THREE.PerspectiveCamera(35, 1, 1, 20000);
  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;

  let model = new THREE.Group();
  scene.add(model);

  function resize() {
    const { clientWidth: w, clientHeight: h } = container;
    renderer.setSize(w, h);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  }
  new ResizeObserver(resize).observe(container);
  resize();

  renderer.setAnimationLoop(() => {
    controls.update();
    renderer.render(scene, camera);
  });

  return {
    snapshot() {
      renderer.render(scene, camera);
      // Flatten the transparent canvas onto white and downscale, so the PDF stays small.
      const src = renderer.domElement;
      const k = Math.min(1, 1600 / src.width);
      const out = Object.assign(document.createElement('canvas'), { width: src.width * k, height: src.height * k });
      const ctx = out.getContext('2d');
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, out.width, out.height);
      ctx.drawImage(src, 0, 0, out.width, out.height);
      return { url: out.toDataURL('image/jpeg', 0.88), w: out.width, h: out.height };
    },
    show(design, { keepCamera = false } = {}) {
      scene.remove(model);
      acrylic.color.set(design.input.color ?? '#202d6a');
      model = buildModel(design);
      scene.add(model);
      const { width: W, height: H, depth: D } = design.input;
      const size = Math.max(W, H);
      ground.scale.set(W * 3, D * 6, 1);
      Object.assign(sun.shadow.camera, { left: -size, right: size, top: size, bottom: -size, far: size * 6 });
      sun.shadow.camera.updateProjectionMatrix();
      sun.position.set(size * 0.6, size * 2, size * 1.2);
      if (keepCamera) return;
      controls.target.set(0, H / 2, 0);
      camera.position.set(size * 0.75, H * 0.9 + size * 0.35, size * 1.05);
    },
  };
}

// --- part geometry -------------------------------------------------------------

const mesh = (geo, mat) => {
  const m = new THREE.Mesh(geo, mat);
  m.castShadow = true;
  m.receiveShadow = true;
  return m;
};

const circlePath = (x, y, r) => new THREE.Path().absarc(x, y, r, 0, Math.PI * 2, true);

// Extrude a 2D shape (x, z footprint) upward by h, base at y = 0.
function extrudeUp(shape, h, bevel = 0.4) {
  const geo = new THREE.ExtrudeGeometry(shape, {
    depth: h - 2 * bevel, bevelEnabled: bevel > 0, bevelThickness: bevel, bevelSize: bevel, bevelSegments: 2, curveSegments: 32,
  });
  geo.rotateX(-Math.PI / 2);
  geo.translate(0, bevel, 0);
  return geo;
}

function ring(outerR, innerR, h) {
  const s = new THREE.Shape().absarc(0, 0, outerR, 0, Math.PI * 2, false);
  s.holes.push(circlePath(0, 0, innerR));
  return extrudeUp(s, h);
}

function socketScrew(headD, headH) {
  const g = new THREE.Group();
  g.add(mesh(new THREE.CylinderGeometry(headD / 2, headD / 2, headH, 20), dark));
  const hex = mesh(new THREE.CylinderGeometry(headD * 0.28, headD * 0.28, 0.2, 6), new THREE.MeshBasicMaterial({ color: 0x000000 }));
  hex.position.y = headH / 2;
  g.add(hex);
  return g;
}

// Cross clamp: long axis local +x. Vertical bore (post) at the origin, horizontal bore
// along local z at x = reach. Origin is the post bore centre at mid height.
function crossClamp(d, c) {
  const s = c.section;
  const reach = c.len - s;
  const g = new THREE.Group();

  const foot = new THREE.Shape();
  foot.moveTo(-s / 2, -s / 2).lineTo(c.len - s / 2, -s / 2).lineTo(c.len - s / 2, s / 2).lineTo(-s / 2, s / 2).closePath();
  foot.holes.push(circlePath(0, 0, d / 2));
  const block = mesh(extrudeUp(foot, s), alu);
  block.position.y = -s / 2;
  g.add(block);

  // horizontal bore openings on both side faces
  for (const side of [-1, 1]) {
    const bore = mesh(new THREE.CircleGeometry(d / 2, 32), dark);
    bore.position.set(reach, 0, side * (s / 2 + 0.05));
    if (side < 0) bore.rotation.y = Math.PI;
    g.add(bore);
  }
  // clamping slits: one from the post bore out the back end, one under the cross bore
  const slitA = mesh(new THREE.BoxGeometry(s / 2, s + 0.1, 0.8), dark);
  slitA.position.set(-s / 4 - d / 4, 0, 0);
  g.add(slitA);
  const slitB = mesh(new THREE.BoxGeometry(0.8, s / 2 - d / 2 + 0.1, s + 0.1), dark);
  slitB.position.set(reach, -(s / 4 + d / 4), 0);
  g.add(slitB);
  // pinch screws: top face for the post bore, end face for the cross bore
  const headD = s * 0.45;
  const top = socketScrew(headD, 1.2);
  top.position.set(-s * 0.05, s / 2 + 0.6, s * 0.28);
  g.add(top);
  const end = socketScrew(headD, 1.2);
  end.rotation.z = -Math.PI / 2;
  end.position.set(c.len - s / 2 + 0.6, -s * 0.25, s * 0.28);
  g.add(end);
  return g;
}

// Flange coupling: plate with 4 mounting holes, hub with grub screw.
function flangeFoot(d, f) {
  const g = new THREE.Group();
  const plateR = (f.plateD ?? f.hubD * 1.6) / 2;
  const plate = new THREE.Shape().absarc(0, 0, plateR, 0, Math.PI * 2, false);
  plate.holes.push(circlePath(0, 0, d / 2));
  const holeR = plateR * 0.12;
  for (let i = 0; i < 4; i++) {
    const a = (i * Math.PI) / 2 + Math.PI / 4;
    plate.holes.push(circlePath(Math.cos(a) * plateR * 0.72, Math.sin(a) * plateR * 0.72, holeR));
  }
  g.add(mesh(extrudeUp(plate, f.plate, 0.3), alu));
  const hubH = f.height - f.plate;
  const hub = mesh(ring(f.hubD / 2, d / 2, hubH), alu);
  hub.position.y = f.plate;
  g.add(hub);
  const grub = mesh(new THREE.CircleGeometry(1.6, 16), dark);
  grub.position.set(0, f.plate + hubH / 2, f.hubD / 2 + 0.05);
  g.add(grub);
  return g;
}

// Split shaft collar with one pinch screw.
function collar(d) {
  const g = new THREE.Group();
  const od = d + 8;
  const h = Math.max(6, d);
  g.add(mesh(ring(od / 2, d / 2, h), alu));
  const slit = mesh(new THREE.BoxGeometry(0.8, h + 0.1, (od - d) / 2 + 0.1), dark);
  slit.position.set(0, h / 2, (od + d) / 4);
  g.add(slit);
  const screw = socketScrew(3.5, 1);
  screw.rotation.z = Math.PI / 2;
  screw.position.set(-od / 2 - 0.5, h / 2, od * 0.22);
  g.add(screw);
  return g;
}

function rod(d, len) {
  const geo = new THREE.CylinderGeometry(d / 2, d / 2, len, 40);
  return mesh(geo, chrome);
}

// Fluted sheet: flutes run along the width. Profile drawn across the depth, extruded along x.
function sheet(W, D, t, finish) {
  const s = new THREE.Shape();
  s.moveTo(0, 0).lineTo(D, 0).lineTo(D, t);
  if (finish === 'fluted') {
    const pitch = 8;
    const n = Math.max(1, Math.round(D / pitch));
    const p = D / n;
    for (let i = n; i > 0; i--) s.quadraticCurveTo(p * (i - 0.5), t + 1.6, p * (i - 1), t);
  } else {
    s.lineTo(0, t);
  }
  s.closePath();
  const geo = new THREE.ExtrudeGeometry(s, { depth: W, bevelEnabled: false, curveSegments: 6 });
  geo.rotateY(-Math.PI / 2);
  geo.translate(W / 2, 0, -D / 2);
  const m = mesh(geo, acrylic);
  m.castShadow = false;
  return m;
}

// --- assembly --------------------------------------------------------------------
// Design coordinates: x along width, y along depth, heights from the floor.
// three.js: x = width, y = up, z = depth. The unit is centred on the origin.

function buildModel(design) {
  const g = new THREE.Group();
  const { input, d, clamp, clampSpec, flange, xs, ys, levels, postLength } = design;
  const { width: W, depth: D, thickness: t, finish = 'fluted' } = input;
  const cx = (x) => x - W / 2;
  const cz = (y) => y - D / 2;
  const reach = clampSpec.len - clampSpec.section;
  const add = (obj, x, y, z) => { obj.position.set(x, y, z); g.add(obj); return obj; };

  for (const x of xs) for (const y of ys) {
    add(rod(d, postLength), cx(x), 4 + postLength / 2, cz(y));
    add(flangeFoot(d, flange), cx(x), 0, cz(y));
    add(collar(d), cx(x), flange.height + t, cz(y));
  }

  // Shelves carry a sheet between the two clamp rows; brace rows stack the clamps directly.
  const rows = [
    ...levels.map((top, i) => ({ i, under: top - t - clamp.hi / 2, over: top + clamp.hi / 2, top })),
    ...design.braces.map((h) => ({ i: -1, under: h - clamp.hi / 2, over: h + clamp.hi / 2 })),
  ];
  rows.forEach(({ i, under, over, top }) => {
    if (i >= 0) add(sheet(W, D, t, finish), 0, top - t, 0);
    if (i === 0) return;

    xs.forEach((x, col) => {
      // Mirror-symmetric about the centre: end crossbars face outward, middle ones face
      // the centre of the shelf.
      const n = xs.length - 1;
      const inX = col === 0 ? -1 : col === n ? 1 : x < W / 2 ? 1 : -1;
      const bar = add(rod(d, D), cx(x) + inX * reach, under, 0);
      bar.rotation.x = Math.PI / 2;
      ys.forEach((y, row) => {
        const inZ = row === 0 ? -1 : 1;
        const lower = add(crossClamp(d, clampSpec), cx(x), under, cz(y));
        lower.rotation.y = inX > 0 ? 0 : Math.PI;
        const upper = add(crossClamp(d, clampSpec), cx(x), over, cz(y));
        upper.rotation.y = inZ > 0 ? -Math.PI / 2 : Math.PI / 2;
      });
    });
    ys.forEach((y, row) => {
      const inZ = row === 0 ? -1 : 1;
      const rail = add(rod(d, W), 0, over, cz(y) + inZ * reach);
      rail.rotation.z = Math.PI / 2;
    });
  });
  return g;
}
