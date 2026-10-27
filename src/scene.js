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

export function createViewer(container, { onPick } = {}) {
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
    if (!w || !h) return; // hidden behind the ideas tab: keep the last size, not a 0/0 aspect
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

  // Hover a part to outline it and see its name; click (without dragging) to open its info.
  const ray = new THREE.Raycaster();
  const ptr = new THREE.Vector2();
  const outline = new THREE.BoxHelper(undefined, 0x15171a);
  outline.visible = false;
  scene.add(outline);
  const label = Object.assign(document.createElement('div'), { className: 'part-label' });
  label.hidden = true;
  container.appendChild(label);
  let hovered = null;
  const partAt = (e) => {
    const r = renderer.domElement.getBoundingClientRect();
    ptr.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
    ray.setFromCamera(ptr, camera);
    for (const hit of ray.intersectObject(model, true)) {
      let o = hit.object;
      while (o && o !== model && !o.userData.part) o = o.parent;
      if (o && o !== model && o.visible !== false) return o;
    }
    return null;
  };
  renderer.domElement.addEventListener('pointermove', (e) => {
    if (e.buttons) return; // orbiting
    const o = partAt(e);
    hovered = o;
    outline.visible = !!o;
    renderer.domElement.style.cursor = o ? 'pointer' : '';
    label.hidden = !o;
    if (!o) return;
    outline.setFromObject(o);
    label.textContent = o.userData.part;
    const r = container.getBoundingClientRect();
    label.style.left = `${e.clientX - r.left + 14}px`;
    label.style.top = `${e.clientY - r.top + 14}px`;
  });
  renderer.domElement.addEventListener('pointerleave', () => {
    outline.visible = false;
    label.hidden = true;
  });
  let down = null;
  renderer.domElement.addEventListener('pointerdown', (e) => (down = [e.clientX, e.clientY]));
  renderer.domElement.addEventListener('pointerup', (e) => {
    if (!down || Math.hypot(e.clientX - down[0], e.clientY - down[1]) > 4) return;
    const o = partAt(e);
    if (!o || !onPick) return;
    // how many of the same part are in the model
    const names = [];
    model.traverse((c) => { if (c.userData.part) names.push(c.userData.part); });
    onPick(o.userData.part, names);
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
      resize(); // the container may have just been unhidden, before the observer fires
      scene.remove(model);
      outline.visible = false;
      label.hidden = true;
      acrylic.color.set(design.input.color ?? '#202d6a');
      model = buildModel(design);
      scene.add(model);
      const { width: W = design.width, height: H, depth: D = design.depth } = design.input; // the brick bench derives both from its brick counts
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
// Opaque board materials for wood-based shelves; acrylic keeps its glassy material.
const boardCache = new Map();
function sheetMaterial(input) {
  const key = input.material ?? 'acrylic';
  if (key === 'acrylic') return acrylic;
  const color = { plywood: '#d6b98c', mdf: '#b9946a', osb: '#c9a568' }[key] ?? input.color ?? '#e8e4dc';
  const id = `${key}:${color}`;
  if (!boardCache.has(id))
    boardCache.set(id, new THREE.MeshStandardMaterial({ color, roughness: key === 'mfc' ? 0.45 : 0.85, metalness: 0 }));
  return boardCache.get(id);
}

function sheet(W, D, t, finish, mat = acrylic) {
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
  const m = mesh(geo, mat);
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
  if (design.kind === 'brickbench') return buildBrickbench(design);
  const g = new THREE.Group();
  const { input, d, clampSpec, flange, xs, ys, postLength } = design;
  const { width: W, depth: D, thickness: t, finish = 'fluted' } = input;
  const mat = sheetMaterial(input);
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
      add(sheet(W, D, t, mat === acrylic ? finish : 'flat', mat), `${design.parts.sheets.materialName} sheet`, 0, top - t, 0);
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
    if (i > 0) add(sheet(W, D, t, mat === acrylic ? finish : 'flat', mat), `${design.parts.sheets.materialName} sheet`, 0, top - t, 0);
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
    const frame = new THREE.MeshPhysicalMaterial({ color: input.frameColor ?? '#949494', metalness: 0.8, roughness: 0.42 });
    const bar = profileBar(p, p * 4, frame);
    const nut = tNut(p);
    nut.scale.setScalar(3);
    const bolt = new THREE.Group();
    bolt.add(boltHead(p), boltShank(p, p * 0.6));
    const out = {
      profile: shot(bar, new THREE.Vector3(1, 0.8, 1.6)),
      largeGusset: shot(gusset(p * 2, p * 0.875, 2, frame, p), new THREE.Vector3(0.6, 0.5, 1.4)),
      smallGusset: shot(gusset(p, p * 0.875, 1, frame, p), new THREE.Vector3(0.6, 0.5, 1.4)),
      lBracket: shot(lBracket(p, p * 0.875, 2.5, frame, p), new THREE.Vector3(0.6, 0.5, 1.4)),
      joiningPlate3: shot(joiningPlate3(p, 5, frame, { bolts: [0], gap: p * 0.35 }), new THREE.Vector3(0.6, 0.9, 1.2)),
      tNut: shot(nut),
      bolt: shot(bolt),
      foot: shot(levellingFoot(p)),
      tab: shot(mountingTab(p, 5, frame, p * 0.35), new THREE.Vector3(0.6, 0.9, 1.2)),
      hiddenConnector: shot(hiddenConnector(p, frame), new THREE.Vector3(0.8, 0.7, 1.2)),
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
  const sheetMesh = mesh(extrudeUp(outline, s.thickness, 0.3), sheetMaterial(input));
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
// Flanged button head of a hex socket bolt (supplier drawing: head Ø11.4 mm and 2.6 mm
// tall on an M6). Sits on the surface at y = 0 and points along +y; flip it to hang below.
function boltHead(p) {
  const g = new THREE.Group();
  const r = p * 0.19;
  const flange = mesh(new THREE.CylinderGeometry(r, r, p * 0.03, 24), chrome);
  flange.position.y = p * 0.015;
  const dome = mesh(new THREE.CylinderGeometry(r * 0.45, r * 0.78, p * 0.06, 24), chrome);
  dome.position.y = p * 0.06;
  const socket = mesh(new THREE.CylinderGeometry(r * 0.3, r * 0.3, p * 0.01, 6), dark);
  socket.position.y = p * 0.09;
  g.add(flange, dome, socket);
  return g;
}

// Threaded shank of a bolt, length len, from y = 0 down to y = -len.
function boltShank(p, len) {
  const g = new THREE.Group();
  const core = mesh(new THREE.CylinderGeometry(p * 0.065, p * 0.065, len, 16), chrome);
  core.position.y = -len / 2;
  g.add(core);
  const pitch = p * 0.035;
  for (let y = -pitch; y > -len + pitch / 2; y -= pitch) {
    const ridge = mesh(new THREE.TorusGeometry(p * 0.068, p * 0.014, 6, 20), chrome);
    ridge.rotation.x = Math.PI / 2 + 0.06; // slight tilt reads as a helix
    ridge.position.y = y;
    g.add(ridge);
  }
  return g;
}

// Drop-in T-nut as in the supplier drawing: a narrow stem that sits in the slot opening,
// a wider body under the slot lips with chamfered back edges, and a tapped hole through.
// Stem points along local +y (towards the fitting), length along local z.
function tNut(p) {
  const g = new THREE.Group();
  const hw = p * 0.27, stem = p * 0.13, back = p * 0.17;
  const s = new THREE.Shape()
    .moveTo(-stem, p * 0.12).lineTo(stem, p * 0.12).lineTo(stem, 0).lineTo(hw, 0)
    .lineTo(hw, -p * 0.05).lineTo(back, -p * 0.2).lineTo(-back, -p * 0.2).lineTo(-hw, -p * 0.05)
    .lineTo(-hw, 0).lineTo(-stem, 0).closePath();
  const len = p * 0.52;
  const geo = new THREE.ExtrudeGeometry(s, { depth: len, bevelEnabled: true, bevelThickness: 0.2, bevelSize: 0.2, bevelSegments: 1 });
  geo.translate(0, 0, -len / 2);
  g.add(mesh(geo, chrome));
  const hole = mesh(new THREE.CylinderGeometry(p * 0.1, p * 0.1, p * 0.34, 16), dark);
  hole.position.y = -p * 0.04;
  hole.scale.set(1, 1.01, 1);
  g.add(hole);
  return g;
}

// Cast corner gusset: solid right-triangle prism with bolt holes on both faces.
// Right angle at the local origin, legs along +a (local x) and +b (local y), width w
// across. The profiles it joins lie at local y < 0 and x < 0, so each bolt gets a
// T-nut just inside that profile's slot.
function gusset(L, w, holes, mat, p) {
  // Cast inside corner gusset to the T-Nutz drawings (CB-010-A 1" x 1", CB-010-K 2" x 2"),
  // 7/8" wide: three 3/16" walls (two legs and the diagonal) with both sides open. Each leg
  // has Ø0.281" holes 0.5" from the corner (and 1" apart on the 4-hole part); the diagonal
  // has a Ø0.5" access hole in line with each pair of bolts, drawn as an oval where the two
  // counterbores overlap. Profiles lie at local y < 0 and x < 0; width along local z.
  const g = new THREE.Group();
  const t = p * 0.1875;
  const along = holes === 1 ? [L / 2] : Array.from({ length: holes }, (_, i) => p / 2 + i * p);
  const plate = (len, cx, holeAt, holeShape) => {
    const sh = new THREE.Shape().moveTo(cx - len / 2, -w / 2).lineTo(cx + len / 2, -w / 2).lineTo(cx + len / 2, w / 2).lineTo(cx - len / 2, w / 2).closePath();
    for (const u of holeAt) sh.holes.push(holeShape(u));
    // generous bevel: the cast part has softly rounded edges all round
    const geo = new THREE.ExtrudeGeometry(sh, { depth: t * 0.4, bevelEnabled: true, bevelThickness: t * 0.3, bevelSize: t * 0.3, bevelSegments: 4, curveSegments: 24 });
    geo.rotateX(-Math.PI / 2);
    geo.translate(0, t * 0.3, 0);
    return geo;
  };
  const small = (u) => circlePath(u, 0, p * 0.14);
  // leg along x (on the face y = 0) and leg along y (on x = 0)
  const legLen = L - t / 2; // the round tip finishes each leg
  g.add(mesh(plate(legLen, legLen / 2, along, small), mat));
  const legB = mesh(plate(legLen, legLen / 2, along, small), mat);
  legB.rotation.z = Math.PI / 2;
  legB.position.x = t;
  g.add(legB);
  // diagonal wall: local x along the diagonal from its middle, thickness out along (1, 1)
  const oval = (u) => {
    const r = p * 0.25;
    const half = holes === 1 ? 0 : p * 0.08; // two overlapping Ø0.5" counterbores
    return new THREE.Path().absarc(u + half, 0, r, -Math.PI / 2, Math.PI / 2, false).absarc(u - half, 0, r, Math.PI / 2, Math.PI * 1.5, false);
  };
  const diagLen = L * Math.SQRT2 - 2 * t;
  const diag = mesh(plate(diagLen, 0, along.map((d) => (d - L / 2) * Math.SQRT2), oval), mat);
  diag.rotation.z = -Math.PI / 4;
  diag.position.set(L / 2 - t * Math.SQRT1_2, L / 2 - t * Math.SQRT1_2, 0);
  g.add(diag);
  // rounded tips where the diagonal meets each leg, and a fillet in the inside corner
  for (const [x, y] of [[L - t / 2, t / 2], [t / 2, L - t / 2]]) {
    const tip = mesh(new THREE.CylinderGeometry(t / 2, t / 2, w - 0.2, 24), mat);
    tip.rotation.x = Math.PI / 2;
    tip.position.set(x, y, 0);
    g.add(tip);
  }
  const fillet = mesh(new THREE.BoxGeometry(t * 1.1, t * 1.1, w - 0.2), mat);
  fillet.rotation.z = Math.PI / 4;
  fillet.position.set(t, t, 0);
  g.add(fillet);
  const r = p * 0.16;
  const step = holes === 1 ? L / 2 : p / 2;
  for (let i = 0; i < holes; i++) {
    const at = holes === 1 ? step : p / 2 + i * p; // holes 1" apart on the 4-hole part
    const ha = mesh(new THREE.CylinderGeometry(r, r, 2, 16), dark);
    ha.position.set(at, t + 1, 0);
    const hb = mesh(new THREE.CylinderGeometry(r, r, 2, 16), dark);
    hb.rotation.z = Math.PI / 2;
    hb.position.set(t + 1, at, 0);
    const na = tNut(p);
    na.position.set(at, -p * 0.2, 0);
    const nb = tNut(p);
    nb.rotation.z = -Math.PI / 2; // stem towards +x, the gusset leg
    nb.position.set(-p * 0.2, at, 0);
    g.add(ha, hb, na, nb);
  }
  return g;
}

// 2 Hole Inside Corner Bracket (T-Nutz CBS-010-A): plain L, 1" x 1" legs (25.2 mm),
// 7/8" wide (22.6 mm), 3/16" thick, a small fillet inside the bend and the free ends
// rounded on the inside face, one Ø0.27" hole centred in each leg. Profiles lie at local
// y < 0 and x < 0; the width runs along local z.
function lBracket(L, w, t, mat, p) {
  const g = new THREE.Group();
  const th = p * 0.1875;
  const rf = th * 0.6;
  const side = new THREE.Shape()
    .moveTo(0, 0)
    .lineTo(L, 0)
    .quadraticCurveTo(L, th, L - th, th)
    .lineTo(th + rf, th)
    .quadraticCurveTo(th, th, th, th + rf)
    .lineTo(th, L - th)
    .quadraticCurveTo(th, L, 0, L)
    .closePath();
  const geo = new THREE.ExtrudeGeometry(side, { depth: w, bevelEnabled: true, bevelThickness: 0.3, bevelSize: 0.3, bevelSegments: 1, curveSegments: 12 });
  geo.translate(0, 0, -w / 2);
  g.add(mesh(geo, mat));
  const at = L * 0.56; // hole centre along each leg
  for (const rz of [0, Math.PI / 2]) {
    const head = boltHead(p);
    head.rotation.z = -rz; // head points away from the profile
    head.position.set(rz ? th : at, rz ? at : th, 0);
    const nut = tNut(p);
    nut.rotation.z = -rz; // stem towards the bracket
    nut.position.set(rz ? -p * 0.2 : at, rz ? at : -p * 0.2, 0);
    g.add(head, nut);
  }
  return g;
}

// Joining Plate (T-Nutz JP-010-A): 1" x 2" x 3/16", two Ø0.281" holes 1" apart. It is
// bolted to the underside of a top rail (CPlot p.26-28: 12 plates, 12 bolts, 12 T-nuts):
// the outer hole (local -x) takes a bolt up into a T-nut in the rail's bottom slot, the
// inner hole (local +x) sticks out under the inset top and takes a button head bolt up into it.
function mountingTab(p, t, mat, gap = 0) {
  const g = new THREE.Group();
  const plate = new THREE.Shape().moveTo(-p, -p / 2).lineTo(p, -p / 2).lineTo(p, p / 2).lineTo(-p, p / 2).closePath(); // 1" x 2"
  for (const x of [-p / 2, p / 2]) plate.holes.push(circlePath(x, 0, p * 0.14));
  const m = mesh(extrudeUp(plate, t, 0.3), mat);
  m.position.y = -t / 2;
  g.add(m);
  for (const x of [-p / 2, p / 2]) {
    const head = boltHead(p);
    head.rotation.x = Math.PI; // head hangs below the plate
    head.position.set(x, -t / 2, 0);
    g.add(head);
  }
  const nut = tNut(p);
  nut.rotation.x = Math.PI; // rail is above the plate: stem points down
  nut.position.set(-p / 2, t / 2 + p * 0.2, 0);
  g.add(nut);
  // button head bolt up through the free hole, across the gap that lifts the top flush
  // with the rails, and into the top
  if (gap > 0) {
    const shank = boltShank(p, gap + t + p * 0.4);
    shank.rotation.x = Math.PI; // points up from the head under the plate
    shank.position.set(p / 2, -t / 2, 0);
    g.add(shank);
  }
  return g;
}

// Hidden Corner Connector (inside to inside, HC-010-A style): a small L that sits in the
// inside corner of a joint, one arm in the facing slot of each profile, locked by an M5 grub
// screw per arm. Arms ~1" long (25/26 mm), 9 mm wide, with a 4 mm lip in the slot opening.
// Same convention as lBracket: corner at the origin, profiles at local y < 0 and x < 0,
// arms along +x and +y, width along local z.
function hiddenConnector(p, mat) {
  const g = new THREE.Group();
  const w = p * 0.35;
  const body = p * 0.18; // part in the slot cavity
  const lip = p * 0.12; // ridge in the slot opening, flush with the face
  for (const [len, ax] of [[p, 'x'], [p * 0.96, 'y']]) {
    const alongX = ax === 'x';
    const box = (thick, offset, width) => {
      const m = mesh(new THREE.BoxGeometry(alongX ? len : thick, alongX ? thick : len, width), mat);
      m.position.set(alongX ? len / 2 : -offset, alongX ? -offset : len / 2, 0);
      return m;
    };
    g.add(box(body, lip + body / 2, w), box(lip, lip / 2, w * 0.6));
    const screw = mesh(new THREE.CylinderGeometry(p * 0.1, p * 0.1, 0.6, 16), dark);
    if (!alongX) screw.rotation.z = Math.PI / 2;
    screw.position.set(alongX ? len * 0.65 : 0.05, alongX ? 0.05 : len * 0.65, 0);
    g.add(screw);
  }
  return g;
}

// 3 Hole Joining Plate: straight plate, holes one profile apart, screwed up into the bottom
// slots across a joint. Centre hole at the origin, holes along local x.
function joiningPlate3(p, t, mat, { bolts = [-p, 0, p], gap = 0 } = {}) {
  const g = new THREE.Group();
  const w = p * 0.4375; // 3" x 7/8" x 3/16" (T-Nutz 3 hole plate drawing)
  const plate = new THREE.Shape().moveTo(-1.5 * p, -w).lineTo(1.5 * p, -w).lineTo(1.5 * p, w).lineTo(-1.5 * p, w).closePath();
  for (const x of [-p, 0, p]) plate.holes.push(circlePath(x, 0, p * 0.14));
  const m = mesh(extrudeUp(plate, t, 0.3), mat);
  m.position.y = -t / 2;
  g.add(m);
  for (const x of [-p, 0, p]) {
    const head = boltHead(p);
    head.rotation.x = Math.PI; // under the plate
    head.position.set(x, -t / 2, 0);
    g.add(head);
    if (bolts.includes(x)) {
      const nut = tNut(p);
      nut.rotation.x = Math.PI; // rail above: stem points down
      nut.position.set(x, t / 2 + p * 0.2, 0);
      g.add(nut);
    } else if (gap > 0) {
      // button head bolt up through the hole, across the gap and into the top panel
      const shank = boltShank(p, gap + t + p * 0.4);
      shank.rotation.x = Math.PI; // points up from the head under the plate
      shank.position.set(x, -t / 2, 0);
      g.add(shank);
    }
  }
  return g;
}

// Antislip levelling mount for 1" rail (McMaster 47065T341), scaled to the profile p:
// Ø1" round base with a notched rubber pad, a hex on top of the base, a 1/4"-20 stud with
// an adjusting nut and a lock nut tight against the leg end. Leg end at y = p.
function levellingFoot(p) {
  const g = new THREE.Group();
  const add = (geo, mat, y) => { const m = mesh(geo, mat); m.position.y = y; g.add(m); return m; };
  const rubber = new THREE.MeshStandardMaterial({ color: 0x2b2d30, roughness: 0.9 });
  add(new THREE.CylinderGeometry(p * 0.47, p * 0.47, p * 0.1, 32), rubber, p * 0.05); // pad
  for (const r of [0, Math.PI / 2]) {
    const notch = add(new THREE.BoxGeometry(p * 0.96, p * 0.05, p * 0.12), new THREE.MeshBasicMaterial({ color: 0x111111 }), p * 0.02);
    notch.rotation.y = r;
  }
  add(new THREE.CylinderGeometry(p * 0.5, p * 0.5, p * 0.2, 32), chrome, p * 0.2); // base
  add(new THREE.CylinderGeometry(p * 0.36, p * 0.5, p * 0.1, 32), chrome, p * 0.35); // chamfer
  add(new THREE.CylinderGeometry(p * 0.29, p * 0.29, p * 0.12, 6), chrome, p * 0.46); // base hex
  add(new THREE.CylinderGeometry(p * 0.125, p * 0.125, p * 0.5, 16), chrome, p * 0.75); // 1/4"-20 stud
  add(new THREE.CylinderGeometry(p * 0.25, p * 0.25, p * 0.1, 6), chrome, p * 0.76); // adjusting nut
  add(new THREE.CylinderGeometry(p * 0.25, p * 0.25, p * 0.1, 6), chrome, p * 0.95); // lock nut
  return g;
}

function buildDesk(design) {
  const g = new THREE.Group();
  const { input, p, size, prof, railZ, legLength, stretcherZ, withStretchers, midRail, footHeight: fh, parts } = design;
  const { width: W, depth: D, topThickness: tt } = input;
  const frame = new THREE.MeshPhysicalMaterial({ color: input.frameColor ?? '#949494', metalness: 0.8, roughness: 0.42 });
  const X = (x) => x - W / 2;
  const Z = (y) => y - D / 2;
  const at = (x, y, z) => new THREE.Vector3(X(x), z, Z(y));
  const name = `${size}${size}`;
  let tag = '';
  // hw: fasteners that come with this object, so the step parts box can count them
  const add = (o, part, hw = 0) => {
    // hw: a count (that many bolts and T-nuts) or [bolts, nuts]
    const [nb, nn] = Array.isArray(hw) ? hw : [hw, hw];
    o.userData = { tag, part, hw: [...(nb ? [[prof.bolt, nb]] : []), ...(nn ? [[prof.nut, nn]] : [])] };
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
      add(orient(gusset(p, p * 0.875, 1, frame, p), [0, sy, 0], [0, 0, -1], at(x, y, railZ)), `2 Hole Inside Corner Gusset ${name}`, 2);
  };
  shortRail(p / 2);
  shortRail(W - p / 2);
  if (midRail) {
    // optional centre rail between the long rails, joined level with hidden connectors
    barY(D - 2 * p, W / 2, p, railZ, `Centre rail ${name} × ${D - 2 * p} mm`);
    // a hidden corner connector in each end grips the long rail slot; nothing shows below
    // two hidden corner connectors at each end, one each side of the centre rail, in the
    // inside corners: one arm in the long rail's inner slot, one in the centre rail's side slot
    for (const [y, sy] of [[p, 1], [D - p, -1]])
      for (const sx of [1, -1])
        add(orient(hiddenConnector(p, frame), [0, sy, 0], [sx, 0, 0], at(W / 2 + (sx * p) / 2, y, railZ + p / 2)), `Hidden Corner Connector ${name}`, 0);
  }

  // 2. long top rails (between the legs) with a 4-hole gusset under each end
  tag = 'longRails';
  for (const y of [p / 2, D - p / 2]) barX(W - 2 * p, p, y, railZ, `Long rail ${name} × ${W - 2 * p} mm`);
  for (const [x, y, sx] of legs)
    add(orient(gusset(p * 2, p * 0.875, 2, frame, p), [sx, 0, 0], [0, 0, -1], at(x + (sx * p) / 2, y, railZ)), `4 Hole Inside Corner Gusset ${name}`, 4);

  // 3. legs, full height to the top of the frame
  tag = 'legs';
  for (const [x, y] of legs) barZ(legLength, x, y, fh, `Leg ${name} × ${legLength} mm`);

  if (withStretchers) {
    // 4. end stretchers: an L bracket under each end, against the leg
    tag = 'endStretchers';
    for (const x of [p / 2, W - p / 2]) {
      barY(D - 2 * p, x, p, stretcherZ, `End stretcher ${name} × ${D - 2 * p} mm`);
      for (const [y, sy] of [[p, 1], [D - p, -1]])
      {
        add(orient(lBracket(p, p * 0.875, 2.5, frame, p), [0, sy, 0], [0, 0, -1], at(x, y, stretcherZ)), `2 Hole Inside Corner Bracket ${name}`, 2);
      }
    }
    // 5. back stretcher between the back legs
    tag = 'backStretcher';
    barX(W - 2 * p, p, D - p / 2, stretcherZ, `Back stretcher ${name} × ${W - 2 * p} mm`);
    for (const [x, sx] of [[p, 1], [W - p, -1]]) {
      add(orient(lBracket(p, p * 0.875, 2.5, frame, p), [sx, 0, 0], [0, 0, -1], at(x, D - p / 2, stretcherZ)), `2 Hole Inside Corner Bracket ${name}`, 2);
    }
    // 6. a 4 hole inside corner gusset lying flat in the inside of each back corner, its
    //    legs bolted into the inner side slots of the end and back stretchers (CPlot p.21-23)
    tag = 'backGussets';
    for (const [x, , sx] of legs.filter(([, , , sy]) => sy < 0))
      add(orient(gusset(p * 2, p * 0.875, 2, frame, p), [sx, 0, 0], [0, -1, 0], at(x + (sx * p) / 2, D - p, stretcherZ + p / 2)), `4 Hole Inside Corner Gusset ${name}`, 4);
  }

  // 7. feet
  tag = 'feet';
  for (const [x, y] of legs) add(levellingFoot(p), `Levelling foot ${prof.footThread}`).position.copy(at(x, y, 0));

  // 8. joining plates under the top rails, sticking out inward to carry the inset top
  tag = 'tabs';
  const tabZ = railZ - TAB_T / 2; // under the rails
  const along = (n, len, off) => Array.from({ length: n }, (_, i) => off + ((i + 1) * len) / (n + 1));
  // rotation.y turns the plate's local +x (inner hole) to point into the frame
  const tab = (x, y, rot, ix, iy) => {
    const t = add(mountingTab(p, TAB_T, frame, design.topGap), 'Joining plate', [2, 1]);
    t.position.copy(at(x + (ix * p) / 2, y + (iy * p) / 2, tabZ));
    t.rotation.y = rot;
  };
  for (const [y, sy] of [[p / 2, 1], [D - p / 2, -1]])
    for (const x of along(parts.tabsLong, W - 2 * p, p)) tab(x, y, -sy * Math.PI / 2, 0, sy);
  for (const [x, sx] of [[p / 2, 1], [W - p / 2, -1]])
    for (const y of along(parts.tabsShort, D - 2 * p, p)) tab(x, y, sx > 0 ? 0 : Math.PI, sx, 0);
  // a 3 hole plate across the centre rail carries the inner edge of both top panels:
  // middle hole bolted into the rail, outer holes screwed up into each panel
  if (midRail)
    for (const y of along(parts.centreSupports, D - 2 * p, p)) {
      const pl = add(joiningPlate3(p, TAB_T, frame, { bolts: [0], gap: design.topGap }), `3 Hole Joining Plate ${name}`, [3, 1]);
      pl.position.copy(at(W / 2, y, tabZ));
    }

  // 9. top (can be hidden in the viewer to look at the frame; always drawn in the PDF)
  tag = 'top';
  if (input.showTop === 'no') return g;
  // the top drops in between the rails, flush with them, held up on the plate screws
  const topZ = railZ + p - tt;
  const [tw, td] = [parts.top.width, parts.top.depth];
  const centres = midRail ? [-(tw + p) / 2, (tw + p) / 2] : [0];
  const wood = new THREE.MeshStandardMaterial({ color: 0xd8c3a0, roughness: 0.8 });
  const lino = input.topFinish === 'linoleum';
  for (const cx of centres) {
    const ply = add(mesh(new THREE.BoxGeometry(tw, lino ? tt - 2 : tt, td), wood), `Plywood top ${tw} × ${td} mm`);
    ply.position.set(cx, topZ + (lino ? (tt - 2) / 2 : tt / 2), 0);
    if (lino) {
      const sheetL = add(mesh(new THREE.BoxGeometry(tw, 2, td), new THREE.MeshStandardMaterial({ color: input.topColor ?? '#c9b8a3', roughness: 0.9 })), 'Linoleum');
      sheetL.position.set(cx, topZ + tt - 1, 0);
    }
  }
  return g;
}

// A London stock brick sitting on y = 0, centred on x and z: bevelled body, a raised rim
// round a recessed top (the frog) with LONDON BRICK on its floor, and a slightly different
// red per brick (seed) so the individual bricks read.
const FROG_RIM = 6; // depth of the recess
function londonBrick({ width: w, length: l, height: h }, seed) {
  const g = new THREE.Group();
  const jitter = (Math.sin(seed * 12.9898) * 43758.5453) % 1;
  const j = Math.abs(jitter);
  const color = new THREE.Color().setHSL(0.015 + j * 0.02, 0.55 + j * 0.15, 0.2 + j * 0.07);
  const mat = new THREE.MeshStandardMaterial({ color, roughness: 0.95 });
  const rect = (a, b) => new THREE.Shape().moveTo(-a / 2, -b / 2).lineTo(a / 2, -b / 2).lineTo(a / 2, b / 2).lineTo(-a / 2, b / 2).closePath();
  const bev = { bevelEnabled: true, bevelSize: 1.5, bevelThickness: 1.5, bevelSegments: 2 };
  // shapes are drawn in x, y and extruded along z; stand them up so the extrusion goes up
  const solid = (shape, depth, opts) => {
    const geo = new THREE.ExtrudeGeometry(shape, { depth, ...opts });
    geo.rotateX(-Math.PI / 2);
    return geo;
  };
  const inner = 1.5; // bevel size, keeps the outside at the brick size
  const body = mesh(solid(rect(w - 2 * inner, l - 2 * inner), h - FROG_RIM - 2 * inner, bev), mat);
  body.position.y = inner;
  g.add(body);
  const rimShape = rect(w - 2, l - 2); // the rim's own bevel is 1 mm
  rimShape.holes.push(new THREE.Path().moveTo(-(w / 2 - 18), -(l / 2 - 20)).lineTo(-(w / 2 - 18), l / 2 - 20).lineTo(w / 2 - 18, l / 2 - 20).lineTo(w / 2 - 18, -(l / 2 - 20)).closePath());
  const rim = mesh(solid(rimShape, FROG_RIM - 2, { bevelEnabled: true, bevelSize: 1, bevelThickness: 1, bevelSegments: 1 }), mat);
  rim.position.y = h - FROG_RIM + 1;
  g.add(rim);
  // lettering on the frog floor, like the reference brick
  const canvas = Object.assign(document.createElement('canvas'), { width: 512, height: 192 });
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = `#${color.clone().multiplyScalar(0.8).getHexString()}`;
  ctx.fillRect(0, 0, 512, 192);
  ctx.fillStyle = `#${color.clone().multiplyScalar(0.55).getHexString()}`;
  ctx.textAlign = 'center';
  ctx.font = 'bold 84px sans-serif';
  ctx.fillText('LONDON', 256, 90);
  ctx.font = 'italic bold 60px sans-serif';
  ctx.fillText('BRICK', 256, 160);
  const floorGeo = new THREE.PlaneGeometry(l - 40, w - 36);
  floorGeo.rotateX(-Math.PI / 2);
  floorGeo.rotateY(Math.PI / 2); // lettering runs along the brick
  const floor = new THREE.Mesh(floorGeo, new THREE.MeshStandardMaterial({ map: new THREE.CanvasTexture(canvas), roughness: 1 }));
  floor.position.y = h - FROG_RIM + 0.2;
  g.add(floor);
  return g;
}

// Brick bench: the desk frame without its top, rod support blocks on the long rails, Ø8 rods
// lying front to back in the blocks, and the bricks flat on the rods. Same axes as the desk.
const BRICK_COLOR = '#a4432f';
// Placeholder size for the rod support block until its real sizes are known (see the design
// brief): a small box around the rod end, not a measured part.
const BLOCK_MODEL = { x: 24, y: 16, z: 16 };

function buildBrickbench(design) {
  const g = new THREE.Group();
  const { p, size, prof, frameTop, rodZ, legLength, stretcherZ, footHeight: fh, rods, brick, width: W, depth: D, input } = design;
  const railZ = frameTop - p; // underside of the top rails
  const frame = new THREE.MeshPhysicalMaterial({ color: '#949494', metalness: 0.8, roughness: 0.42 });
  const X = (x) => x - W / 2;
  const Z = (y) => y - D / 2;
  const at = (x, y, z) => new THREE.Vector3(X(x), z, Z(y));
  const name = `${size}${size}`;
  let tag = '';
  const add = (o, part, hw = 0) => {
    const [nb, nn] = Array.isArray(hw) ? hw : [hw, hw];
    o.userData = { tag, part, hw: [...(nb ? [[prof.bolt, nb]] : []), ...(nn ? [[prof.nut, nn]] : [])] };
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
  const legs = [[p / 2, p / 2, 1, 1], [W - p / 2, p / 2, -1, 1], [p / 2, D - p / 2, 1, -1], [W - p / 2, D - p / 2, -1, -1]];

  tag = 'shortRails';
  for (const x of [p / 2, W - p / 2]) {
    barY(D - 2 * p, x, p, railZ, `Short rail ${name} × ${D - 2 * p} mm`);
    for (const [y, sy] of [[p, 1], [D - p, -1]])
      add(orient(gusset(p, p * 0.875, 1, frame, p), [0, sy, 0], [0, 0, -1], at(x, y, railZ)), `2 Hole Inside Corner Gusset ${name}`, 2);
  }

  tag = 'longRails';
  for (const y of [p / 2, D - p / 2]) barX(W - 2 * p, p, y, railZ, `Long rail ${name} × ${W - 2 * p} mm`);
  for (const [x, y, sx] of legs)
    add(orient(gusset(p * 2, p * 0.875, 2, frame, p), [sx, 0, 0], [0, 0, -1], at(x + (sx * p) / 2, y, railZ)), `4 Hole Inside Corner Gusset ${name}`, 4);

  tag = 'legs';
  for (const [x, y] of legs) barZ(legLength, x, y, fh, `Leg ${name} × ${legLength} mm`);

  tag = 'endStretchers';
  for (const x of [p / 2, W - p / 2]) {
    barY(D - 2 * p, x, p, stretcherZ, `End stretcher ${name} × ${D - 2 * p} mm`);
    for (const [y, sy] of [[p, 1], [D - p, -1]])
      add(orient(lBracket(p, p * 0.875, 2.5, frame, p), [0, sy, 0], [0, 0, -1], at(x, y, stretcherZ)), `2 Hole Inside Corner Bracket ${name}`, 2);
  }
  tag = 'backStretcher';
  barX(W - 2 * p, p, D - p / 2, stretcherZ, `Back stretcher ${name} × ${W - 2 * p} mm`);
  for (const [x, sx] of [[p, 1], [W - p, -1]])
    add(orient(lBracket(p, p * 0.875, 2.5, frame, p), [sx, 0, 0], [0, 0, -1], at(x, D - p / 2, stretcherZ)), `2 Hole Inside Corner Bracket ${name}`, 2);
  tag = 'backGussets';
  for (const [x, , sx] of legs.filter(([, , , sy]) => sy < 0))
    add(orient(gusset(p * 2, p * 0.875, 2, frame, p), [sx, 0, 0], [0, -1, 0], at(x + (sx * p) / 2, D - p, stretcherZ + p / 2)), `4 Hole Inside Corner Gusset ${name}`, 4);

  tag = 'feet';
  for (const [x, y] of legs) add(levellingFoot(p), `Levelling foot ${prof.footThread}`).position.copy(at(x, y, 0));

  // the rods: one every half brick along the length, axis at the middle of the rails, each
  // held at both ends by a block on the inner face of a long rail
  const rodXs = Array.from({ length: rods.count }, (_, i) => p + rods.first + i * rods.pitch);
  tag = 'blocks';
  for (const x of rodXs)
    for (const y of [p + BLOCK_MODEL.y / 2, D - p - BLOCK_MODEL.y / 2])
      add(mesh(new THREE.BoxGeometry(BLOCK_MODEL.x, BLOCK_MODEL.z, BLOCK_MODEL.y), alu), 'Rod support block', 2).position.copy(at(x, y, rodZ));
  tag = 'rods';
  for (const x of rodXs) {
    const r = add(rod(rods.diameter, rods.length), `Chrome rod Ø${rods.diameter} × ${rods.length} mm`);
    r.rotation.x = Math.PI / 2; // lie front to back
    r.position.copy(at(x, D / 2, rodZ));
  }

  // bricks flat on the rods, inside the rails, touching (can be hidden in the viewer to see the frame)
  tag = 'bricks';
  if (input.showBricks === 'no') return g;
  for (let i = 0; i < input.bricksLong; i++)
    for (let j = 0; j < input.rows; j++)
      add(londonBrick(brick, i * 7 + j * 3), 'London stock brick').position.copy(
        at(p + (i + 0.5) * brick.width, p + (j + 0.5) * brick.length, rodZ + rods.diameter / 2),
      );
  return g;
}

const TAB_T = 5; // matches TAB_THICKNESS in desk.js

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

// Which model tags are new in each written bench step (parallel to brickbenchSteps).
export function brickbenchStepTags() {
  return [['shortRails'], ['longRails'], ['legs'], [], ['endStretchers'], ['backStretcher'], ['backGussets'], ['feet'], ['blocks'], ['rods'], ['bricks'], []];
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

  const flat = { ...design, input: { ...design.input, finish: 'flat', showTop: 'yes', showBricks: 'yes' } };
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
