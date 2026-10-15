// Stage — an isometric Three.js diorama that renders "snapshots" of a data
// structure (nodes, edges, pointer pins, floating text) and smoothly tweens
// between consecutive snapshots. Every algorithm in the lab speaks this format.
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { CSS2DRenderer, CSS2DObject } from 'three/addons/renderers/CSS2DRenderer.js';

export const PALETTE = {
  default: '#f6f7fb',
  ghost:   '#dfe4f0',
  active:  '#5b5bf6',
  compare: '#f6b23c',
  swap:    '#ef5b5b',
  done:    '#1fae7a',
  found:   '#1fae7a',
  pivot:   '#a052f5',
  visited: '#93b4ff',
  new:     '#3b82f6',
  muted:   '#cfd5e3',
  key:     '#ffe08a',
};
const DARK_TEXT = new Set(['default', 'ghost', 'compare', 'visited', 'muted', 'key']);
export const EDGE_COLORS = {
  default: '#9aa3b8', active: '#5b5bf6', done: '#1fae7a', muted: '#d6dbe7',
  visited: '#93b4ff', swap: '#ef5b5b', compare: '#f6b23c',
};
export const PIN_COLORS = {
  indigo: '#5b5bf6', amber: '#f0a020', red: '#ef5b5b', green: '#1fae7a',
  violet: '#a052f5', blue: '#3b82f6', slate: '#475069',
};

const UP = new THREE.Vector3(0, 1, 0);
const tmpA = new THREE.Vector3(), tmpB = new THREE.Vector3(), tmpC = new THREE.Color();

// ── label textures (cached) ──────────────────────────────────────────
const texCache = new Map();
function labelTexture(text, dark, aspect) {
  const key = `${text}|${dark}|${aspect.toFixed(2)}`;
  if (texCache.has(key)) return texCache.get(key);
  const W = 512, H = Math.max(96, Math.round(512 / aspect));
  const c = document.createElement('canvas');
  c.width = W; c.height = H;
  const g = c.getContext('2d');
  g.fillStyle = dark ? '#1b1f33' : '#ffffff';
  g.textAlign = 'center'; g.textBaseline = 'middle';
  let size = Math.min(H * 0.62, 230);
  const s = String(text);
  do {
    g.font = `700 ${size}px Geist, Inter, system-ui, sans-serif`;
    if (g.measureText(s).width < W * 0.84) break;
    size -= 6;
  } while (size > 20);
  g.fillText(s, W / 2, H / 2 + size * 0.04);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  texCache.set(key, t);
  return t;
}

const boxGeo = new RoundedBoxGeometry(1, 1, 1, 3, 0.09);
const puckGeo = new THREE.CylinderGeometry(0.5, 0.5, 1, 48);
const planeGeo = new THREE.PlaneGeometry(1, 1);
const edgeGeo = new THREE.CylinderGeometry(1, 1, 1, 10, 1, false).translate(0, 0.5, 0);
const coneGeo = new THREE.ConeGeometry(1, 1, 16).translate(0, -0.5, 0);
const pinHeadGeo = new THREE.SphereGeometry(0.2, 24, 16);
const pinConeGeo = new THREE.ConeGeometry(0.2, 0.42, 24).rotateX(Math.PI).translate(0, -0.27, 0);

function el(cls, html) {
  const d = document.createElement('div');
  d.className = cls;
  if (html != null) d.innerHTML = html;
  return d;
}

export class Stage {
  constructor(container, opts = {}) {
    this.container = container;
    this.opts = { interactive: true, insets: () => ({ l: 0, r: 0, t: 0, b: 0 }), base: true, ...opts };
    this.speed = 1;
    this.nodes = new Map();
    this.edges = new Map();
    this.pins = new Map();
    this.texts = new Map();
    this.fitBox = null;

    const r = (this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true }));
    r.setPixelRatio(Math.min(devicePixelRatio, 2));
    r.shadowMap.enabled = true;
    r.shadowMap.type = THREE.PCFSoftShadowMap;
    r.outputColorSpace = THREE.SRGBColorSpace;
    r.toneMapping = THREE.ACESFilmicToneMapping;
    r.toneMappingExposure = 1.05;
    container.appendChild(r.domElement);
    r.domElement.classList.add('stage-canvas');

    this.css = new CSS2DRenderer();
    this.css.domElement.className = 'stage-labels';
    container.appendChild(this.css.domElement);

    const s = (this.scene = new THREE.Scene());
    this.camera = new THREE.OrthographicCamera(-10, 10, 10, -10, 0.1, 400);
    this.camDir = new THREE.Vector3(1, 0.95, 1.2).normalize();

    s.add(new THREE.HemisphereLight('#ffffff', '#c7cfe6', 1.35));
    const sun = (this.sun = new THREE.DirectionalLight('#ffffff', 2.1));
    sun.position.set(-14, 30, 18);
    sun.castShadow = true;
    sun.shadow.mapSize.set(2048, 2048);
    sun.shadow.radius = 6;
    sun.shadow.bias = -0.0006;
    Object.assign(sun.shadow.camera, { left: -40, right: 40, top: 40, bottom: -40, near: 1, far: 120 });
    s.add(sun, sun.target);
    const fill = new THREE.DirectionalLight('#dfe6ff', 0.55);
    fill.position.set(20, 10, -10);
    s.add(fill);

    const ground = new THREE.Mesh(new THREE.PlaneGeometry(400, 400), new THREE.ShadowMaterial({ opacity: 0.1 }));
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = -0.42;
    ground.receiveShadow = true;
    s.add(ground);

    if (this.opts.base) {
      this.base = new THREE.Mesh(
        new RoundedBoxGeometry(1, 1, 1, 4, 0.06),
        new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 0.9 })
      );
      this.base.receiveShadow = true;
      this.base.position.y = -0.21;
      this.base.scale.set(0.01, 0.4, 0.01);
      this.baseTgt = new THREE.Vector3(0.01, 0.4, 0.01);
      this.baseCenter = new THREE.Vector3();
      s.add(this.base);
    }

    this.world = new THREE.Group();
    s.add(this.world);

    this.target = new THREE.Vector3();
    if (this.opts.interactive) {
      const c = (this.controls = new OrbitControls(this.camera, r.domElement));
      c.enableDamping = true;
      c.dampingFactor = 0.08;
      c.minPolarAngle = 0.25;
      c.maxPolarAngle = 1.2;
      c.minZoom = 0.35;
      c.maxZoom = 4;
      c.screenSpacePanning = true;
    }

    this.clock = new THREE.Clock();
    this.running = true;
    this.ro = new ResizeObserver(() => this.resize());
    this.ro.observe(container);
    this.resize();
    const loop = () => {
      this.raf = requestAnimationFrame(loop);
      if (!this.running) return;
      this.tick(Math.min(this.clock.getDelta(), 0.05));
    };
    loop();
  }

  setRunning(v) { this.running = v; if (v) this.clock.getDelta(); }

  resize() {
    const w = this.container.clientWidth, h = this.container.clientHeight;
    if (!w || !h) return;
    this.renderer.setSize(w, h);
    this.css.setSize(w, h);
    this.w = w; this.h = h;
    this.applyFrustum();
  }

  // ── camera framing ────────────────────────────────────────────────
  frame(box, immediate = true) {
    this.fitBox = box.clone();
    const center = box.getCenter(new THREE.Vector3());
    this.target.copy(center);
    if (this.base) {
      const size = box.getSize(new THREE.Vector3());
      this.baseTgt.set(size.x + 2.6, 0.4, size.z + 2.6);
      this.baseCenter.set(center.x, -0.21, center.z);
      if (immediate) { this.base.scale.copy(this.baseTgt); this.base.position.copy(this.baseCenter); }
    }
    this.camera.position.copy(center).addScaledVector(this.camDir, 80);
    this.camera.up.set(0, 1, 0);
    this.camera.lookAt(center);
    this.camera.zoom = 1;
    if (this.controls) { this.controls.target.copy(center); this.controls.update(); }
    this.target = this.controls ? this.controls.target : this.target;
    this.sun.position.set(center.x - 14, 30, center.z + 18);
    this.sun.target.position.copy(center);
    this.applyFrustum();
  }

  applyFrustum() {
    if (!this.w) return;
    const box = this.fitBox || new THREE.Box3(new THREE.Vector3(-4, 0, -2), new THREE.Vector3(4, 2, 2));
    const cam = this.camera;
    cam.updateMatrixWorld();
    const inv = cam.matrixWorldInverse;
    const center = box.getCenter(new THREE.Vector3()).applyMatrix4(inv);
    let hx = 0, hy = 0;
    for (let i = 0; i < 8; i++) {
      tmpA.set(i & 1 ? box.max.x : box.min.x, i & 2 ? box.max.y : box.min.y, i & 4 ? box.max.z : box.min.z).applyMatrix4(inv);
      hx = Math.max(hx, Math.abs(tmpA.x - center.x));
      hy = Math.max(hy, Math.abs(tmpA.y - center.y));
    }
    hx += 0.9; hy += 0.9;
    const ins = this.opts.insets(this.w, this.h);
    const aw = Math.max(120, this.w - ins.l - ins.r), ah = Math.max(120, this.h - ins.t - ins.b);
    const scale = Math.max((2 * hx) / aw, (2 * hy) / ah);
    const cx = (ins.l - ins.r) / 2, cy = (ins.b - ins.t) / 2;
    cam.left = (-this.w / 2 - cx) * scale;
    cam.right = (this.w / 2 - cx) * scale;
    cam.top = (this.h / 2 - cy) * scale;
    cam.bottom = (-this.h / 2 - cy) * scale;
    cam.updateProjectionMatrix();
  }

  resetView() { if (this.fitBox) this.frame(this.fitBox, false); }
  zoomBy(f) { this.camera.zoom = THREE.MathUtils.clamp(this.camera.zoom * f, 0.35, 4); this.camera.updateProjectionMatrix(); }
  rotateBy(rad) {
    const off = this.camera.position.clone().sub(this.target).applyAxisAngle(UP, rad);
    this.camera.position.copy(this.target).add(off);
    this.camera.lookAt(this.target);
    if (this.controls) this.controls.update();
  }

  // ── snapshot application ──────────────────────────────────────────
  apply(snap) {
    const seen = new Set();
    for (const n of snap.nodes || []) { seen.add(n.id); this.upsertNode(n); }
    for (const [id, n] of this.nodes) if (!seen.has(id)) n.removing = true;

    const seenE = new Set();
    for (const e of snap.edges || []) { seenE.add(e.id); this.upsertEdge(e); }
    for (const [id, e] of this.edges) if (!seenE.has(id)) e.removing = true;

    const seenP = new Set();
    const stackCount = {};
    for (const p of snap.pins || []) {
      const key = p.target ?? `${p.at}`;
      p._level = stackCount[key] = (stackCount[key] ?? -1) + 1;
      seenP.add(p.id);
      this.upsertPin(p);
    }
    for (const [id, p] of this.pins) if (!seenP.has(id)) p.removing = true;

    const seenT = new Set();
    for (const t of snap.texts || []) { seenT.add(t.id); this.upsertText(t); }
    for (const [id, t] of this.texts) if (!seenT.has(id)) t.removing = true;
  }

  clear() {
    for (const m of [this.nodes, this.edges, this.pins, this.texts]) {
      for (const v of m.values()) this.world.remove(v.obj);
      m.clear();
    }
  }

  upsertNode(n) {
    let r = this.nodes.get(n.id);
    const shape = n.shape || 'box';
    const tgt = {
      x: n.x || 0, y: n.y || 0, z: n.z || 0,
      w: n.w ?? 1.2, h: n.h ?? 0.7, d: n.d ?? 1.2,
      color: new THREE.Color(PALETTE[n.state || 'default'] || n.state),
      opacity: n.ghost ? 0.38 : 1, scale: 1,
    };
    if (!r) {
      const obj = new THREE.Group();
      const mat = new THREE.MeshStandardMaterial({ roughness: 0.55, metalness: 0.02, transparent: true });
      const mesh = new THREE.Mesh(shape === 'puck' ? puckGeo : boxGeo, mat);
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      const label = new THREE.Mesh(planeGeo, new THREE.MeshBasicMaterial({ transparent: true, depthWrite: false }));
      label.rotation.x = -Math.PI / 2;
      label.renderOrder = 2;
      obj.add(mesh, label);
      this.world.add(obj);
      const cur = { ...tgt, color: tgt.color.clone(), scale: 0.001 };
      if (n.from) {
        const src = this.nodes.get(n.from);
        if (src) Object.assign(cur, { x: src.cur.x, y: src.cur.y, z: src.cur.z });
      } else if (n.enter) {
        cur.x += n.enter[0]; cur.y += n.enter[1]; cur.z += n.enter[2]; cur.scale = 1; cur.opacity = 0;
      }
      r = { obj, mesh, label, mat, cur, shape };
      this.nodes.set(n.id, r);
    }
    r.removing = false;
    r.tgt = tgt;
    r.exit = n.exit;
    const dark = DARK_TEXT.has(n.state || 'default') || (n.state || '').startsWith('#');
    const text = n.label ?? '';
    if (text !== r.text || dark !== r.dark || r.aspect !== tgt.w / tgt.d) {
      r.text = text; r.dark = dark; r.aspect = tgt.w / tgt.d;
      r.label.material.map = text === '' ? null : labelTexture(text, dark, 1);
      r.label.material.visible = text !== '';
      r.label.material.needsUpdate = true;
    }
    // caption under / in front of the node (index, address, etc.)
    if (n.sub != null) {
      if (!r.sub) { r.sub = new CSS2DObject(el('lbl-sub')); r.obj.add(r.sub); }
      if (r.sub.element.textContent !== String(n.sub)) r.sub.element.textContent = n.sub;
      r.sub.element.dataset.tone = n.subTone || '';
    } else if (r.sub) { r.obj.remove(r.sub); r.sub = null; }
    if (n.tag != null) {
      if (!r.tag) { r.tag = new CSS2DObject(el('lbl-tag')); r.obj.add(r.tag); }
      r.tag.element.textContent = n.tag;
    } else if (r.tag) { r.obj.remove(r.tag); r.tag = null; }
  }

  upsertEdge(e) {
    let r = this.edges.get(e.id);
    if (!r) {
      const mat = new THREE.MeshStandardMaterial({ roughness: 0.6, transparent: true, opacity: 0 });
      const shaft = new THREE.Mesh(edgeGeo, mat);
      const head = new THREE.Mesh(coneGeo, mat);
      shaft.castShadow = true;
      const obj = new THREE.Group();
      obj.add(shaft, head);
      this.world.add(obj);
      r = { obj, shaft, head, mat, color: new THREE.Color(EDGE_COLORS[e.state || 'default']), opacity: 0 };
      this.edges.set(e.id, r);
    }
    r.removing = false;
    r.def = e;
    r.tgtColor = new THREE.Color(EDGE_COLORS[e.state || 'default'] || e.state);
    if (e.label != null) {
      if (!r.lbl) { r.lbl = new CSS2DObject(el('lbl-edge')); r.obj.add(r.lbl); }
      r.lbl.element.textContent = e.label;
      r.lbl.element.dataset.state = e.state || 'default';
    } else if (r.lbl) { r.obj.remove(r.lbl); r.lbl = null; }
  }

  upsertPin(p) {
    let r = this.pins.get(p.id);
    const color = PIN_COLORS[p.color || 'indigo'] || p.color;
    if (!r) {
      const mat = new THREE.MeshStandardMaterial({ color, roughness: 0.35, metalness: 0.1, transparent: true });
      const obj = new THREE.Group();
      const head = new THREE.Mesh(pinHeadGeo, mat);
      const cone = new THREE.Mesh(pinConeGeo, mat);
      head.castShadow = cone.castShadow = true;
      const dot = new THREE.Mesh(new THREE.SphereGeometry(0.08, 12, 8), new THREE.MeshBasicMaterial({ color: '#fff' }));
      dot.position.set(0, 0.04, 0.17);
      const chip = new CSS2DObject(el('lbl-pin'));
      chip.position.y = 0.55;
      obj.add(head, cone, dot, chip);
      obj.scale.setScalar(0.001);
      this.world.add(obj);
      r = { obj, mat, chip, cur: null, s: 0.001 };
      this.pins.set(p.id, r);
    }
    r.removing = false;
    r.def = p;
    r.mat.color.set(color);
    r.chip.element.textContent = p.label;
    r.chip.element.style.setProperty('--pin', color);
  }

  upsertText(t) {
    let r = this.texts.get(t.id);
    if (!r) {
      const obj = new CSS2DObject(el('lbl-text'));
      this.world.add(obj);
      r = { obj, cur: new THREE.Vector3(t.x, t.y, t.z) };
      this.texts.set(t.id, r);
    }
    r.removing = false;
    r.tgt = new THREE.Vector3(t.x || 0, t.y || 0, t.z || 0);
    r.obj.element.className = `lbl-text ${t.cls || ''}`;
    if (r.obj.element.innerHTML !== t.text) r.obj.element.innerHTML = t.text;
  }

  // ── per-frame tweening ────────────────────────────────────────────
  nodeTop(r) { return new THREE.Vector3(r.cur.x, r.cur.y + r.cur.h, r.cur.z); }

  tick(dt) {
    const k = 1 - Math.exp(-dt * 9 * this.speed);
    const now = performance.now() / 1000;

    if (this.base) {
      this.base.scale.lerp(this.baseTgt, k * 0.6);
      this.base.position.lerp(this.baseCenter, k * 0.6);
    }

    // keep top-face labels upright relative to the current camera azimuth
    const az = Math.atan2(this.camera.position.x - this.target.x, this.camera.position.z - this.target.z);
    for (const [id, r] of this.nodes) {
      const c = r.cur, t = r.tgt;
      r.label.rotation.z = az;
      if (r.removing) {
        c.scale += (0 - c.scale) * k * 1.4;
        c.opacity += (0 - c.opacity) * k * 1.2;
        if (r.exit) { c.x += r.exit[0] * dt * 3; c.y += r.exit[1] * dt * 3; c.z += r.exit[2] * dt * 3; }
        if (c.scale < 0.03) { this.world.remove(r.obj); this.nodes.delete(id); continue; }
      } else {
        for (const p of ['x', 'y', 'z', 'w', 'h', 'd', 'opacity', 'scale']) c[p] += (t[p] - c[p]) * k;
        c.color.lerp(t.color, k);
      }
      r.obj.position.set(c.x, c.y, c.z);
      const s = c.scale;
      r.mesh.scale.set(c.w * s, c.h * s, c.d * s);
      r.mesh.position.y = (c.h * s) / 2;
      r.mat.color.copy(c.color);
      r.mat.opacity = c.opacity;
      r.mat.depthWrite = c.opacity > 0.9;
      r.label.position.y = c.h * s + 0.012;
      if (r.shape === 'puck') r.label.scale.set(c.w * 0.82 * s, c.w * 0.82 * s, 1);
      else { const q = Math.min(c.w, c.d) * 0.98 * s; r.label.scale.set(q, q, 1); }
      r.label.material.opacity = c.opacity;
      if (r.sub) r.sub.position.set(0, 0, c.d / 2 + 0.55);
      if (r.tag) r.tag.position.set(0, c.h + 0.5, 0);
      const vis = c.opacity > 0.25 && s > 0.3;
      if (r.sub) r.sub.element.style.opacity = vis ? 1 : 0;
      if (r.tag) r.tag.element.style.opacity = vis ? 1 : 0;
    }

    for (const [id, r] of this.edges) {
      const e = r.def;
      const a = this.nodes.get(e.from), b = this.nodes.get(e.to);
      const want = r.removing || !a || !b ? 0 : e.state === 'muted' ? 0.55 : 1;
      r.opacity += (want - r.opacity) * k;
      if ((r.removing || !a || !b) && r.opacity < 0.03) { this.world.remove(r.obj); this.edges.delete(id); continue; }
      r.color.lerp(r.tgtColor, k);
      r.mat.color.copy(r.color);
      r.mat.opacity = r.opacity;
      r.obj.visible = !!(a && b);
      if (!a || !b) continue;
      const ya = a.cur.y + (e.atTop ? a.cur.h : a.cur.h * 0.5);
      const yb = b.cur.y + (e.atTop ? b.cur.h : b.cur.h * 0.5);
      tmpA.set(a.cur.x, ya, a.cur.z);
      tmpB.set(b.cur.x, yb, b.cur.z);
      const dir = new THREE.Vector3().subVectors(tmpB, tmpA);
      const len = dir.length();
      if (len < 1e-3) { r.obj.visible = false; continue; }
      dir.divideScalar(len);
      const ext = (n) => {
        if (n.shape === 'puck') return (n.cur.w / 2) * n.cur.scale;
        const hx = (n.cur.w / 2) * n.cur.scale, hz = (n.cur.d / 2) * n.cur.scale;
        return Math.min(Math.abs(dir.x) > 1e-4 ? hx / Math.abs(dir.x) : 1e9, Math.abs(dir.z) > 1e-4 ? hz / Math.abs(dir.z) : 1e9, 50);
      };
      const sa = ext(a) + 0.04, sb = ext(b) + 0.06;
      const start = tmpA.clone().addScaledVector(dir, sa);
      const end = tmpB.clone().addScaledVector(dir, -sb);
      const L = Math.max(0.01, start.distanceTo(end));
      const thick = e.state === 'active' || e.state === 'done' ? 0.075 : 0.055;
      const headLen = e.directed ? Math.min(0.42, L * 0.5) : 0;
      r.shaft.position.copy(start);
      r.shaft.quaternion.setFromUnitVectors(UP, dir);
      r.shaft.scale.set(thick, Math.max(0.01, L - headLen), thick);
      r.head.visible = !!e.directed;
      if (e.directed) {
        // cone tip sits at its local origin, so placing it at `end` puts the tip on the target
        r.head.quaternion.setFromUnitVectors(UP, dir);
        r.head.position.copy(end);
        r.head.scale.set(0.17, headLen, 0.17);
      }
      if (r.lbl) {
        const mid = start.clone().lerp(end, 0.5);
        r.lbl.position.copy(mid).add(new THREE.Vector3(0, 0.25, 0));
        r.lbl.element.style.opacity = r.opacity;
      }
    }

    for (const [id, r] of this.pins) {
      const p = r.def;
      let want = r.removing ? 0 : 1;
      let pos;
      if (p.target != null) {
        const n = this.nodes.get(p.target);
        if (n) pos = this.nodeTop(n);
        else want = 0;
      } else if (p.at) pos = new THREE.Vector3(...p.at);
      if (pos) {
        pos.y += 0.62 + p._level * 1.05 + Math.sin(now * 2.4 + p._level) * 0.06;
        if (!r.cur) r.cur = pos.clone();
        r.cur.lerp(pos, k);
        r.obj.position.copy(r.cur);
      }
      r.s += (want - r.s) * k;
      r.obj.scale.setScalar(Math.max(0.001, r.s));
      r.chip.element.style.opacity = r.s > 0.4 ? 1 : 0;
      if (want === 0 && r.s < 0.03) { this.world.remove(r.obj); this.pins.delete(id); }
    }

    for (const [id, r] of this.texts) {
      r.cur.lerp(r.tgt, k);
      r.obj.position.copy(r.cur);
      if (r.removing) { this.world.remove(r.obj); this.texts.delete(id); }
    }

    if (this.controls) this.controls.update();
    if (this.onFrame) this.onFrame(dt, now);
    this.renderer.render(this.scene, this.camera);
    this.css.render(this.scene, this.camera);
  }

  dispose() {
    cancelAnimationFrame(this.raf);
    this.ro.disconnect();
    this.renderer.dispose();
    this.container.innerHTML = '';
  }
}

// bounding box covering every node across all snapshots — used to frame the camera once
export function boundsOf(snaps) {
  const box = new THREE.Box3();
  let any = false;
  for (const s of snaps) {
    for (const n of s.nodes || []) {
      const w = n.w ?? 1.2, d = n.d ?? 1.2, h = n.h ?? 0.7;
      box.expandByPoint(tmpA.set((n.x || 0) - w / 2, n.y || 0, (n.z || 0) - d / 2));
      box.expandByPoint(tmpA.set((n.x || 0) + w / 2, (n.y || 0) + h + (s.pins?.some((p) => p.target === n.id) ? 1.2 : 0), (n.z || 0) + d / 2));
      any = true;
    }
    for (const t of s.texts || []) { box.expandByPoint(tmpA.set(t.x || 0, t.y || 0, t.z || 0)); any = true; }
  }
  if (!any) box.set(new THREE.Vector3(-3, 0, -2), new THREE.Vector3(3, 2, 2));
  return box;
}
