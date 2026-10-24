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
      // Fit the whole model in view from a three-quarter angle, whatever its proportions.
      const sphere = new THREE.Box3().setFromObject(model).getBoundingSphere(new THREE.Sphere());
      const fit = sphere.radius / Math.sin(THREE.MathUtils.degToRad(camera.fov / 2)) / Math.min(1, camera.aspect);
      controls.target.copy(sphere.center);
      camera.position.copy(sphere.center).addScaledVector(new THREE.Vector3(0.62, 0.42, 0.9).normalize(), fit * 1.02);
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

// Every object is tagged with the assembly step it belongs to (userData.tag) and a part
// label (userData.part), so the PDF can draw IKEA-style step pictures and count parts.
export function shelfRows(design) {
  const { levels, braces, input, clamp } = design;
  const t = input.thickness;
  return [
    ...levels.map((top, i) => ({ i, key: top, under: top - t - clamp.hi / 2, over: top + clamp.hi / 2, top })),
    ...braces.map((h) => ({ i: -1, key: h, under: h - clamp.hi / 2, over: h + clamp.hi / 2 })),
  ].sort((a, b) => a.key - b.key);
}

function buildModel(design) {
  if (design.kind === 'desk') return buildDesk(design);
  const g = new THREE.Group();
  const { input, d, clampSpec, flange, xs, ys, postLength } = design;
  const { width: W, depth: D, thickness: t, finish = 'fluted' } = input;
  const cx = (x) => x - W / 2;
  const cz = (y) => y - D / 2;
  const reach = clampSpec.len - clampSpec.section;
  let tag = 'posts';
  const add = (obj, part, x, y, z) => {
    obj.position.set(x, y, z);
    obj.userData = { tag, part };
    g.add(obj);
    return obj;
  };

  for (const x of xs) for (const y of ys) {
    tag = 'posts';
    add(rod(d, postLength), `Post Ø${d} × ${postLength} mm`, cx(x), 4 + postLength / 2, cz(y));
    add(flangeFoot(d, flange), `Flange coupling Ø${d}`, cx(x), 0, cz(y));
    tag = 'bottom';
    add(collar(d), `Shaft collar Ø${d}`, cx(x), flange.height + t, cz(y));
  }

  // Rows bottom to top. Shelves carry a sheet between the two clamp rows; brace rows
  // stack the clamps directly. Row 0 is the bottom sheet on the feet.
  shelfRows(design).forEach(({ i, under, over, top }, j) => {
    if (i === 0) {
      tag = 'bottom';
      add(sheet(W, D, t, finish), 'Acrylic sheet', 0, top - t, 0);
      return;
    }
    tag = `r${j}a`;
    xs.forEach((x, col) => {
      // Mirror-symmetric about the centre: end crossbars face outward, middle ones face
      // the centre of the shelf.
      const n = xs.length - 1;
      const inX = col === 0 ? -1 : col === n ? 1 : x < W / 2 ? 1 : -1;
      const bar = add(rod(d, D), `Crossbar Ø${d} × ${D} mm`, cx(x) + inX * reach, under, 0);
      bar.rotation.x = Math.PI / 2;
      ys.forEach((y) => {
        const lower = add(crossClamp(d, clampSpec), `Cross clamp Ø${d}`, cx(x), under, cz(y));
        lower.rotation.y = inX > 0 ? 0 : Math.PI;
      });
    });
    tag = `r${j}b`;
    if (i > 0) add(sheet(W, D, t, finish), 'Acrylic sheet', 0, top - t, 0);
    xs.forEach((x) => {
      ys.forEach((y, row) => {
        const inZ = row === 0 ? -1 : 1;
        const upper = add(crossClamp(d, clampSpec), `Cross clamp Ø${d}`, cx(x), over, cz(y));
        upper.rotation.y = inZ > 0 ? -Math.PI / 2 : Math.PI / 2;
      });
    });
    ys.forEach((y, row) => {
      const inZ = row === 0 ? -1 : 1;
      const rail = add(rod(d, W), `Rail Ø${d} × ${W} mm`, 0, over, cz(y) + inZ * reach);
      rail.rotation.z = Math.PI / 2;
    });
  });
  return g;
}

// Which model tags are new in each written assembly step (parallel to assemblySteps).
export function shelfStepTags(design) {
  const tags = [['posts'], ['bottom']];
  shelfRows(design).forEach(({ i }, j) => {
    if (i === 0) return;
    if (i > 0) tags.push([`r${j}a`], [`r${j}b`]);
    else tags.push([`r${j}a`, `r${j}b`]);
  });
  tags.push([]);
  return tags;
}

// --- per-part renders for the PDF ---------------------------------------------------
// Renders each part on its own, on white, framed to fit. Returns JPEG data URLs.

export function renderParts(design) {
  const W_PX = 640, H_PX = 480;
  const r = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
  r.setSize(W_PX, H_PX);
  r.toneMapping = THREE.ACESFilmicToneMapping;
  r.toneMappingExposure = 0.75;
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0xffffff);
  const pmrem = new THREE.PMREMGenerator(r);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  scene.environmentIntensity = 0.7;
  const sun = new THREE.DirectionalLight(0xffffff, 0.9);
  scene.add(sun);
  const cam = new THREE.PerspectiveCamera(28, W_PX / H_PX, 0.1, 50000);

  const shot = (obj, dir = new THREE.Vector3(1, 0.9, 1.3)) => {
    scene.add(obj);
    const box = new THREE.Box3().setFromObject(obj);
    const sphere = box.getBoundingSphere(new THREE.Sphere());
    const dist = (sphere.radius / Math.sin(THREE.MathUtils.degToRad(cam.fov / 2))) * 1.05;
    cam.position.copy(sphere.center).addScaledVector(dir.normalize(), dist);
    cam.lookAt(sphere.center);
    sun.position.copy(cam.position).add(new THREE.Vector3(0, dist, 0));
    r.render(scene, cam);
    const url = r.domElement.toDataURL('image/jpeg', 0.9);
    scene.remove(obj);
    return { url, w: W_PX, h: H_PX };
  };

  const { input, d, clampSpec, flange, parts } = design;
  acrylic.color.set(input.color ?? '#202d6a');

  // Sheet with its real holes, seen from above at an angle.
  const s = parts.sheets;
  const outline = new THREE.Shape();
  outline.moveTo(0, 0).lineTo(s.width, 0).lineTo(s.width, s.depth).lineTo(0, s.depth).closePath();
  s.holes.forEach(([x, y]) => outline.holes.push(circlePath(x, y, s.holeD / 2)));
  const sheetMesh = mesh(extrudeUp(outline, s.thickness, 0.3), acrylic);
  sheetMesh.position.set(-s.width / 2, 0, s.depth / 2);

  const rodPiece = rod(d, d * 30);
  rodPiece.rotation.z = Math.PI / 3;

  const out = {
    sheet: shot(sheetMesh, new THREE.Vector3(0.35, 1.4, 1)),
    rod: shot(rodPiece, new THREE.Vector3(0, 0.3, 1)),
    clamp: shot(crossClamp(d, clampSpec)),
    flange: shot(flangeFoot(d, flange)),
    collar: shot(collar(d)),
  };
  pmrem.dispose();
  r.dispose();
  return out;
}

// --- profile desk -------------------------------------------------------------------

// T-slot cross-section: square with a slot centred on each face and a centre bore.
function tslotShape(p) {
  const h = p / 2;
  const sw = p * 0.3; // slot opening
  const sd = p * 0.28; // slot depth
  const s = new THREE.Shape();
  const pts = [];
  // walk the outline clockwise, notching each face
  const face = (ax, ay, bx, by, nx, ny) => {
    const mx = (ax + bx) / 2, my = (ay + by) / 2;
    const tx = (bx - ax) / p, ty = (by - ay) / p;
    pts.push([ax, ay]);
    pts.push([mx - tx * sw / 2, my - ty * sw / 2]);
    pts.push([mx - tx * sw / 2 - nx * sd, my - ty * sw / 2 - ny * sd]);
    pts.push([mx + tx * sw / 2 - nx * sd, my + ty * sw / 2 - ny * sd]);
    pts.push([mx + tx * sw / 2, my + ty * sw / 2]);
  };
  face(-h, -h, h, -h, 0, -1);
  face(h, -h, h, h, 1, 0);
  face(h, h, -h, h, 0, 1);
  face(-h, h, -h, -h, -1, 0);
  s.moveTo(...pts[0]);
  pts.slice(1).forEach((pt) => s.lineTo(...pt));
  s.closePath();
  s.holes.push(circlePath(0, 0, p * 0.11));
  return s;
}

// Profile of length len along local +z, section centred on x/y.
function profileBar(p, len, mat) {
  const geo = new THREE.ExtrudeGeometry(tslotShape(p), { depth: len, bevelEnabled: false, curveSegments: 12 });
  return mesh(geo, mat);
}

function bracketL(p, mat) {
  const g = new THREE.Group();
  const t = Math.max(2.5, p * 0.12);
  const a = mesh(new THREE.BoxGeometry(p * 0.9, t, p * 0.9), mat);
  a.position.set(0, t / 2, p * 0.45);
  const b = mesh(new THREE.BoxGeometry(p * 0.9, p * 0.9, t), mat);
  b.position.set(0, p * 0.45, t / 2);
  g.add(a, b);
  return g;
}

function levellingFoot(p) {
  const g = new THREE.Group();
  const pad = mesh(new THREE.CylinderGeometry(p * 0.7, p * 0.75, 6, 32), dark);
  pad.position.y = 3;
  const stem = mesh(new THREE.CylinderGeometry(p * 0.14, p * 0.14, 12, 16), chrome);
  stem.position.y = 12;
  g.add(pad, stem);
  return g;
}

function buildDesk(design) {
  const g = new THREE.Group();
  const { input, p, size, railZ, legLength, stretcherZ, withStretchers, midRail, footHeight: fh } = design;
  const { width: W, depth: D, topThickness: tt } = input;
  const frame = new THREE.MeshPhysicalMaterial({ color: input.frameColor ?? '#c4c8cc', metalness: 0.8, roughness: 0.42 });
  const X = (x) => x - W / 2;
  const Z = (y) => y - D / 2;
  const name = `${size}${size}`;
  let tag = 'legs';
  const add = (o, part) => { o.userData = { tag, part }; g.add(o); return o; };

  // along x: rotate so local z points to +x
  const barX = (len, x0, y, z, part) => {
    const b = add(profileBar(p, len, frame), part);
    b.rotation.y = Math.PI / 2;
    b.position.set(X(x0), z + p / 2, Z(y));
  };
  // along y (front to back)
  const barY = (len, x, y0, z, part) => {
    const b = add(profileBar(p, len, frame), part);
    b.position.set(X(x), z + p / 2, Z(y0));
  };
  // vertical
  const barZ = (len, x, y, z0, part) => {
    const b = add(profileBar(p, len, frame), part);
    b.rotation.x = -Math.PI / 2;
    b.position.set(X(x), z0, Z(y));
  };

  const cornersXY = [[p / 2, p / 2], [W - p / 2, p / 2], [p / 2, D - p / 2], [W - p / 2, D - p / 2]];
  tag = 'legs';
  for (const [x, y] of cornersXY) barZ(legLength, x, y, fh, `Leg ${name} × ${legLength} mm`);

  tag = 'shortRails';
  barY(D - 2 * p, p / 2, p, railZ, `Short rail ${name} × ${D - 2 * p} mm`);
  barY(D - 2 * p, W - p / 2, p, railZ, `Short rail ${name} × ${D - 2 * p} mm`);
  tag = 'longRails';
  barX(W, 0, p / 2, railZ, `Long rail ${name} × ${W} mm`);
  barX(W, 0, D - p / 2, railZ, `Long rail ${name} × ${W} mm`);
  if (midRail) {
    tag = 'midRail';
    barY(D - 2 * p, W / 2, p, railZ, `Short rail ${name} × ${D - 2 * p} mm`);
  }

  // brackets where the short rails meet the long rails (inside corners, under the rails)
  tag = 'brackets';
  for (const [x, y] of cornersXY) {
    const br = add(bracketL(p, frame), `Corner bracket ${name}`);
    const inX = x < W / 2 ? 1 : -1;
    const inY = y < D / 2 ? 1 : -1;
    br.position.set(X(x + inX * p * 0.5), railZ - p * 0.9, Z(y + inY * p * 0.5));
    br.rotation.y = Math.atan2(inX, inY);
    br.rotation.x = Math.PI;
  }

  if (withStretchers) {
    tag = 'stretchers';
    barY(D - 2 * p, p / 2, p, stretcherZ, `Stretcher ${name} × ${D - 2 * p} mm`);
    barY(D - 2 * p, W - p / 2, p, stretcherZ, `Stretcher ${name} × ${D - 2 * p} mm`);
    barX(W - 2 * p, p, D - p / 2, stretcherZ, `Stretcher ${name} × ${W - 2 * p} mm`);
  }

  tag = 'feet';
  for (const [x, y] of cornersXY) {
    const foot = add(levellingFoot(p), `Levelling foot ${design.prof.footThread}`);
    foot.position.set(X(x), 0, Z(y));
  }

  tag = 'top';
  const wood = new THREE.MeshStandardMaterial({ color: 0xd8c3a0, roughness: 0.8 });
  const lino = input.topFinish === 'linoleum';
  const ply = add(mesh(new THREE.BoxGeometry(W, lino ? tt - 2 : tt, D), wood), `Plywood top ${W} × ${D} mm`);
  ply.position.set(0, railZ + p + (lino ? (tt - 2) / 2 : tt / 2), 0);
  if (lino) {
    const sheetL = add(mesh(new THREE.BoxGeometry(W, 2, D), new THREE.MeshStandardMaterial({ color: input.topColor ?? '#c9b8a3', roughness: 0.9 })), 'Linoleum');
    sheetL.position.set(0, railZ + p + tt - 1, 0);
  }
  return g;
}

// Which model tags are new in each written desk step (parallel to deskSteps).
export function deskStepTags(design) {
  return [
    ['legs'],
    ['shortRails'],
    ['longRails'],
    ...(design.midRail ? [['midRail']] : []),
    ['brackets'],
    ...(design.withStretchers ? [['stretchers']] : []),
    [], // gussets (not modelled)
    ['feet'],
    [], // mounting tabs (not modelled)
    ['top'],
    [],
  ];
}

// --- IKEA-style step pictures ------------------------------------------------------
// White fills with black outlines. Parts already fitted are drawn pale; the parts added
// in the step are drawn with dark outlines and a light grey fill. Same camera for every
// step so the pages read as a sequence. Returns [{ url, w, h, parts: [[label, qty]] }].

export function renderSteps(design, stepTags) {
  // Lower resolution keeps the 1 px outlines visibly bold once placed on the page.
  const W_PX = 1000, H_PX = 700;
  const r = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
  r.setSize(W_PX, H_PX);
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0xffffff);
  const cam = new THREE.PerspectiveCamera(26, W_PX / H_PX, 1, 50000);

  const flat = { ...design, input: { ...design.input, finish: 'flat' } };
  const model = buildModel(flat);
  scene.add(model);

  // Soft shading so round rods still read as solid (their sides produce no edge lines).
  scene.add(new THREE.HemisphereLight(0xffffff, 0x9a9a9a, 2.2));
  const offset = { polygonOffset: true, polygonOffsetFactor: 1, polygonOffsetUnits: 1 };
  const oldFill = new THREE.MeshLambertMaterial({ color: 0xf2f2f2, ...offset });
  const newFill = new THREE.MeshLambertMaterial({ color: 0xb8b8b8, ...offset });
  const oldLine = new THREE.LineBasicMaterial({ color: 0x9a9a9a });
  const newLine = new THREE.LineBasicMaterial({ color: 0x000000 });
  const lines = [];
  model.traverse((o) => {
    if (!o.isMesh) return;
    o.castShadow = o.receiveShadow = false;
    const l = new THREE.LineSegments(new THREE.EdgesGeometry(o.geometry, 28), oldLine);
    o.add(l);
    lines.push([o, l]);
  });

  const sphere = new THREE.Box3().setFromObject(model).getBoundingSphere(new THREE.Sphere());
  const dist = (sphere.radius / Math.sin(THREE.MathUtils.degToRad(cam.fov / 2))) * 0.72;
  cam.position.copy(sphere.center).addScaledVector(new THREE.Vector3(0.62, 0.5, 0.9).normalize(), dist);
  cam.lookAt(sphere.center);

  const shown = new Set();
  const out = stepTags.map((fresh) => {
    fresh.forEach((t) => shown.add(t));
    const counts = new Map();
    for (const child of model.children) {
      const { tag, part } = child.userData;
      child.visible = shown.has(tag);
      const isNew = fresh.includes(tag);
      if (isNew && part) counts.set(part, (counts.get(part) ?? 0) + 1);
      child.traverse((o) => {
        if (o.isMesh) o.material = isNew ? newFill : oldFill;
        if (o.isLineSegments) o.material = isNew ? newLine : oldLine;
      });
    }
    r.render(scene, cam);
    return { url: r.domElement.toDataURL('image/jpeg', 0.85), w: W_PX, h: H_PX, parts: [...counts] };
  });
  lines.forEach(([, l]) => l.geometry.dispose());
  r.dispose();
  return out;
}
