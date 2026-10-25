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

  if (design.kind === 'desk') {
    const { p, input } = design;
    const frame = new THREE.MeshPhysicalMaterial({ color: input.frameColor ?? '#c4c8cc', metalness: 0.8, roughness: 0.42 });
    const bar = profileBar(p, p * 4, frame);
    const nut = tNut(p);
    nut.scale.setScalar(3);
    const bolt = new THREE.Group();
    const head = mesh(new THREE.SphereGeometry(p * 0.22, 24, 12, 0, Math.PI * 2, 0, Math.PI / 2), dark);
    const shank = mesh(new THREE.CylinderGeometry(p * 0.1, p * 0.1, p * 0.45, 16), chrome);
    shank.position.y = -p * 0.22;
    bolt.add(head, shank);
    const out = {
      profile: shot(bar, new THREE.Vector3(1, 0.8, 1.6)),
      largeGusset: shot(gusset(p * 2, p * 0.8, 2, frame, p)),
      smallGusset: shot(gusset(p, p * 0.8, 1, frame, p)),
      lBracket: shot(lBracket(p * 0.9, p * 0.8, 2.5, frame, p)),
      flatGusset: shot(flatGusset(p * 2.6, 4, frame, p), new THREE.Vector3(0.4, 0.6, 1.4)),
      tNut: shot(nut),
      bolt: shot(bolt),
      foot: shot(levellingFoot(p)),
      tab: shot(mountingTab(p, 3, frame), new THREE.Vector3(0.5, 1.2, 1)),
    };
    pmrem.dispose();
    r.dispose();
    r.forceContextLoss();
    return out;
  }

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
  r.forceContextLoss();
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

// Place an object built in local axes (a = local x, b = local y, n = local z) at a design
// point. Design vectors are [x along width, y front to back, z up]; three.js is y up.
const dv = ([x, y, z]) => new THREE.Vector3(x, z, y);
function orient(obj, a, b, at) {
  const A = dv(a).normalize();
  const B = dv(b).normalize();
  const N = new THREE.Vector3().crossVectors(A, B);
  obj.matrixAutoUpdate = false;
  obj.matrix.makeBasis(A, B, N).setPosition(at);
  return obj;
}

// Drop-in T-nut as it sits in a slot: small block, pressed against the slot lips.
function tNut(p) {
  return mesh(new THREE.BoxGeometry(p * 0.32, p * 0.16, p * 0.42), chrome);
}

// Cast corner gusset: solid right-triangle prism with bolt holes on both faces.
// Right angle at the local origin, legs along +a (local x) and +b (local y), width w
// across. The profiles it joins lie at local y < 0 and x < 0, so each bolt gets a
// T-nut just inside that profile's slot.
function gusset(L, w, holes, mat, p) {
  const g = new THREE.Group();
  const tri = new THREE.Shape().moveTo(0, 0).lineTo(L, 0).lineTo(0, L).closePath();
  const geo = new THREE.ExtrudeGeometry(tri, { depth: w, bevelEnabled: true, bevelThickness: 0.6, bevelSize: 0.6, bevelSegments: 1 });
  geo.translate(0, 0, -w / 2);
  g.add(mesh(geo, mat));
  const r = Math.max(2.2, w * 0.14);
  const step = L / (holes + 1);
  for (let i = 1; i <= holes; i++) {
    const ha = mesh(new THREE.CylinderGeometry(r, r, 1.6, 16), dark);
    ha.position.set(step * i, 0.8, 0);
    const hb = mesh(new THREE.CylinderGeometry(r, r, 1.6, 16), dark);
    hb.rotation.z = Math.PI / 2;
    hb.position.set(0.8, step * i, 0);
    const na = tNut(p);
    na.position.set(step * i, -p * 0.2, 0);
    const nb = tNut(p);
    nb.rotation.z = Math.PI / 2;
    nb.position.set(-p * 0.2, step * i, 0);
    g.add(ha, hb, na, nb);
  }
  return g;
}

// Flat 4-hole gusset plate: right triangle in the local x/y plane, thickness t.
function flatGusset(L, t, mat, p) {
  const g = new THREE.Group();
  // Origin at the corner where the two profile centre lines cross; arms run along them.
  const h = p / 2;
  const tri = new THREE.Shape().moveTo(-h, -h).lineTo(L, -h).lineTo(L, h).lineTo(h, h).lineTo(h, L).lineTo(-h, L).closePath();
  const geo = new THREE.ExtrudeGeometry(tri, { depth: t, bevelEnabled: false });
  g.add(mesh(geo, mat));
  for (const [x, y] of [[L * 0.45, 0], [L * 0.8, 0], [0, L * 0.45], [0, L * 0.8]]) {
    const head = mesh(new THREE.CylinderGeometry(p * 0.14, p * 0.14, 1.6, 16), dark);
    head.rotation.x = Math.PI / 2;
    head.position.set(x, y, -0.8);
    const nut = tNut(p);
    nut.position.set(x, y, t + p * 0.2);
    g.add(head, nut);
  }
  return g;
}

// Stamped L bracket: two plates of thickness t, legs L along +a and +b, width w, with a
// stiffening rib. The profiles it joins lie at local y < 0 and x < 0.
function lBracket(L, w, t, mat, p) {
  const g = new THREE.Group();
  const a = mesh(new THREE.BoxGeometry(L, t, w), mat);
  a.position.set(L / 2, t / 2, 0);
  const b = mesh(new THREE.BoxGeometry(t, L, w), mat);
  b.position.set(t / 2, L / 2, 0);
  const rib = mesh(new THREE.ExtrudeGeometry(new THREE.Shape().moveTo(0, 0).lineTo(L * 0.45, 0).lineTo(0, L * 0.45).closePath(), { depth: t, bevelEnabled: false }), mat);
  rib.position.set(t, t, -t / 2);
  g.add(a, b, rib);
  for (const [x, y, rz] of [[L * 0.65, t, 0], [t, L * 0.65, Math.PI / 2]]) {
    const head = mesh(new THREE.CylinderGeometry(w * 0.18, w * 0.18, 1.6, 16), dark);
    head.rotation.z = rz;
    head.position.set(x + (rz ? 0.8 : 0), y + (rz ? 0 : 0.8), 0);
    const nut = tNut(p);
    nut.rotation.z = rz;
    nut.position.set(rz ? -p * 0.2 : x, rz ? y : -p * 0.2, 0);
    g.add(head, nut);
  }
  return g;
}

function mountingTab(p, t, mat) {
  const g = new THREE.Group();
  g.add(mesh(new THREE.BoxGeometry(p * 1.6, t, p * 0.8), mat));
  const nut = tNut(p);
  nut.position.y = -t / 2 - p * 0.2;
  g.add(nut);
  const head = mesh(new THREE.CylinderGeometry(p * 0.14, p * 0.14, 1.4, 16), dark);
  head.position.y = t / 2 + 0.7;
  g.add(head);
  return g;
}

function levellingFoot(p) {
  const g = new THREE.Group();
  const pad = mesh(new THREE.CylinderGeometry(p * 0.75, p * 0.8, 5, 32), dark);
  pad.position.y = 2.5;
  const base = mesh(new THREE.CylinderGeometry(p * 0.55, p * 0.7, 4, 32), chrome);
  base.position.y = 7;
  const nut = mesh(new THREE.CylinderGeometry(p * 0.3, p * 0.3, 3, 6), chrome);
  nut.position.y = 10.5;
  const stem = mesh(new THREE.CylinderGeometry(p * 0.13, p * 0.13, 8, 16), chrome);
  stem.position.y = 13;
  g.add(pad, base, nut, stem);
  return g;
}

function buildDesk(design) {
  const g = new THREE.Group();
  const { input, p, size, prof, railZ, legLength, stretcherZ, withStretchers, midRail, footHeight: fh, parts } = design;
  const { width: W, depth: D, topThickness: tt } = input;
  const frame = new THREE.MeshPhysicalMaterial({ color: input.frameColor ?? '#c4c8cc', metalness: 0.8, roughness: 0.42 });
  const X = (x) => x - W / 2;
  const Z = (y) => y - D / 2;
  const at = (x, y, z) => new THREE.Vector3(X(x), z, Z(y));
  const name = `${size}${size}`;
  let tag = '';
  // hw: fasteners that come with this object, so the step parts box can count them
  const add = (o, part, hw = 0) => {
    o.userData = { tag, part, hw: hw ? [[prof.bolt, hw], [prof.nut, hw]] : [] };
    g.add(o);
    return o;
  };

  const barX = (len, x0, y, z, part) => {
    const b = add(profileBar(p, len, frame), part);
    b.rotation.y = Math.PI / 2;
    b.position.set(X(x0), z + p / 2, Z(y));
  };
  const barY = (len, x, y0, z, part) => {
    const b = add(profileBar(p, len, frame), part);
    b.position.set(X(x), z + p / 2, Z(y0));
  };
  const barZ = (len, x, y, z0, part) => {
    const b = add(profileBar(p, len, frame), part);
    b.rotation.x = -Math.PI / 2;
    b.position.set(X(x), z0, Z(y));
  };

  // [x, y, inward x sign, inward y sign] for each leg centre
  const legs = [[p / 2, p / 2, 1, 1], [W - p / 2, p / 2, -1, 1], [p / 2, D - p / 2, 1, -1], [W - p / 2, D - p / 2, -1, -1]];
  const w = p * 0.8;

  // 1. short top rails (between the legs, at the ends) with a small gusset under each end
  tag = 'shortRails';
  const shortRail = (x) => {
    barY(D - 2 * p, x, p, railZ, `Short rail ${name} × ${D - 2 * p} mm`);
    for (const [y, sy] of [[p, 1], [D - p, -1]])
      add(orient(gusset(p, w, 1, frame, p), [0, sy, 0], [0, 0, -1], at(x, y, railZ)), `Small corner gusset ${name}`, 2);
  };
  shortRail(p / 2);
  shortRail(W - p / 2);
  if (midRail) shortRail(W / 2);

  // 2. long top rails (between the legs) with a 4-hole gusset under each end
  tag = 'longRails';
  for (const y of [p / 2, D - p / 2]) barX(W - 2 * p, p, y, railZ, `Long rail ${name} × ${W - 2 * p} mm`);
  for (const [x, y, sx] of legs)
    add(orient(gusset(p * 2, w, 2, frame, p), [sx, 0, 0], [0, 0, -1], at(x + (sx * p) / 2, y, railZ)), `4-hole inside corner gusset ${name}`, 4);

  // 3. legs, full height to the top of the frame
  tag = 'legs';
  for (const [x, y] of legs) barZ(legLength, x, y, fh, `Leg ${name} × ${legLength} mm`);

  if (withStretchers) {
    // 4. end stretchers with an L bracket on top of each end, against the leg faces
    tag = 'endStretchers';
    for (const x of [p / 2, W - p / 2]) {
      barY(D - 2 * p, x, p, stretcherZ, `End stretcher ${name} × ${D - 2 * p} mm`);
      for (const [y, sy] of [[p, 1], [D - p, -1]])
        add(orient(lBracket(p * 0.9, w, 2.5, frame, p), [0, sy, 0], [0, 0, 1], at(x, y, stretcherZ + p)), `Corner bracket (L) ${name}`, 2);
    }
    // 5. back stretcher between the back legs
    tag = 'backStretcher';
    barX(W - 2 * p, p, D - p / 2, stretcherZ, `Back stretcher ${name} × ${W - 2 * p} mm`);
    for (const [x, sx] of [[p, 1], [W - p, -1]])
      add(orient(lBracket(p * 0.9, w, 2.5, frame, p), [sx, 0, 0], [0, 0, 1], at(x, D - p / 2, stretcherZ + p)), `Corner bracket (L) ${name}`, 2);
    // 6. flat 4-hole gussets under the back corners, end stretcher to back stretcher
    tag = 'backGussets';
    // basis chosen so the plate's thickness always grows upward, into the stretchers
    for (const [x, , sx] of legs.filter(([, , , sy]) => sy < 0)) {
      const [a, b] = sx > 0 ? [[1, 0, 0], [0, -1, 0]] : [[0, -1, 0], [-1, 0, 0]];
      add(orient(flatGusset(p * 2.6, 4, frame, p), a, b, at(x, D - p / 2, stretcherZ - 4)), `4-hole inside corner gusset ${name}`, 4);
    }
  }

  // 7. feet
  tag = 'feet';
  for (const [x, y] of legs) add(levellingFoot(p), `Levelling foot ${prof.footThread}`).position.copy(at(x, y, 0));

  // 8. mounting tabs on the top face of the rails
  tag = 'tabs';
  const tabZ = railZ + p;
  const along = (n, len, off) => Array.from({ length: n }, (_, i) => off + ((i + 1) * len) / (n + 1));
  for (const y of [p / 2, D - p / 2])
    for (const x of along(parts.tabsLong, W - 2 * p, p)) add(mountingTab(p, TAB_T, frame), 'Mounting tab', 1).position.copy(at(x, y, tabZ + TAB_T / 2));
  for (const x of [p / 2, W - p / 2])
    for (const y of along(parts.tabsShort, D - 2 * p, p)) {
      const t = add(mountingTab(p, TAB_T, frame), 'Mounting tab', 1);
      t.position.copy(at(x, y, tabZ + TAB_T / 2));
      t.rotation.y = Math.PI / 2;
    }

  // 9. top
  tag = 'top';
  const topZ = railZ + p + TAB_T;
  const wood = new THREE.MeshStandardMaterial({ color: 0xd8c3a0, roughness: 0.8 });
  const lino = input.topFinish === 'linoleum';
  const ply = add(mesh(new THREE.BoxGeometry(W, lino ? tt - 2 : tt, D), wood), `Plywood top ${W} × ${D} mm`);
  ply.position.set(0, topZ + (lino ? (tt - 2) / 2 : tt / 2), 0);
  if (lino) {
    const sheetL = add(mesh(new THREE.BoxGeometry(W, 2, D), new THREE.MeshStandardMaterial({ color: input.topColor ?? '#c9b8a3', roughness: 0.9 })), 'Linoleum');
    sheetL.position.set(0, topZ + tt - 1, 0);
  }
  return g;
}

const TAB_T = 3; // matches TAB_THICKNESS in desk.js

// Which model tags are new in each written desk step (parallel to deskSteps).
export function deskStepTags(design) {
  return [
    ['shortRails'],
    ['longRails'],
    ['legs'],
    [], // joining the two U frames: everything is already drawn in place
    ...(design.withStretchers ? [['endStretchers'], ['backStretcher'], ['backGussets']] : []),
    ['feet'],
    ['tabs'],
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
      if (isNew) for (const [label, n] of child.userData.hw ?? []) counts.set(label, (counts.get(label) ?? 0) + n);
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
  r.forceContextLoss();
  return out;
}
