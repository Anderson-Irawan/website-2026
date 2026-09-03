/* ============================================================
   logo-3d.js  (ES module)
   Extrudes assets/logos/logo-prime.svg into a real 3D mesh with
   three.js, gives it a glossy clearcoat material lit by a
   generated studio environment, and tilts it toward the cursor.

   The flat <img> inside [data-logo-3d] is shown instead of the
   3D build when:
     - the visitor has reduced motion on (toggle or OS setting)
     - WebGL / three.js fails to load
   In those cases the 3D scene is never built. The 3D logo (spin,
   grow, parallax) runs on touch / small screens too - only the
   cursor tilt needs a pointer, and it just stays neutral without one.
   ============================================================ */
import * as THREE from 'three';
import { SVGLoader } from 'three/addons/loaders/SVGLoader.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';

const SVG_URL = 'assets/logos/logo-prime.svg';

// ---- tunables --------------------------------------------------
const EXTRUDE_DEPTH = 6;    // thickness, in SVG units
const MAX_TILT = 0.16;      // radians of cursor-driven rotation
const EASE = 0.08;          // rotation follow smoothing
const IDLE_AMP = 0.025;     // radians of gentle idle sway
const SCROLL_SPIN = Math.PI * 2; // radians of Y-spin per viewport scrolled (0 = off)
const SPIN_RECENTER = 39;      // SVG units pushed right at the half-turn so the
                               // (asymmetric) mark stays visually centred mid-spin;
                               // 0 at 0deg and 360deg. Set 0 to disable.
const SPIN_END_SHIFT = 0;      // SVG units the mark ends up shifted right by the
                               // end of the scroll spin (0 = finishes where it
                               // started, at the CSS -4.5%).
// starts at (1 - SCROLL_GROW) size and grows to full over one viewport
// of scroll. On phones the mark starts near full size and fills the
// screen; tablet + desktop keep the smaller mark. Re-evaluated live on
// resize (syncBreakpoint below) so it's right no matter what width the
// page loaded at. Matches CSS: the size bump lives in max-width:640px.
const smallMQ = window.matchMedia
  ? window.matchMedia('(max-width: 640px)') : null;
let SMALL_SCREEN = !!(smallMQ && smallMQ.matches);
let SCROLL_GROW = SMALL_SCREEN ? 0.1 : 0.45;
function fitMargin() { return SMALL_SCREEN ? 0.9 : 1.0; }
function syncBreakpoint() {
  const s = !!(smallMQ && smallMQ.matches);
  if (s === SMALL_SCREEN) return false;
  SMALL_SCREEN = s;
  SCROLL_GROW = s ? 0.1 : 0.45;
  return true;
}
const LEAVE_PARALLAX = -60;    // SVG units the logo drifts as the hero scrolls
                               // away. - = drifts down / lags behind the page,
                               // + = lifts up ahead of it. 0 to disable.
const CANVAS_OVERSCAN = 2.3;   // canvas size vs logo box (keep in sync with CSS).
                               // Needs enough headroom that LEAVE_PARALLAX
                               // never drifts the model off the canvas edge.
const PIVOT_OFFSET_X = 0;      // shift the spin axis, in SVG units (+ = right)
const PIVOT_OFFSET_Y = 0;      // shift the spin axis, in SVG units (+ = down)
const MATERIAL = {
  color: 0xffffff,
  metalness: 0.0,
  roughness: 0.33,
  clearcoat: 1.0,
  clearcoatRoughness: 0.18,
  envMapIntensity: 1.0,
};

const reduceMQ = window.matchMedia
  ? window.matchMedia('(prefers-reduced-motion: reduce)') : null;

/* Show the plain SVG instead of the 3D logo. */
function flatMode() {
  return document.documentElement.classList.contains('liquid-hero-reduced') ||
    (reduceMQ && reduceMQ.matches);
}

const host = document.querySelector('[data-logo-3d]');
if (host) {
  let scene3d = null;   // built lazily, once
  const relevantMedia = [reduceMQ];

  // When the flat <img> is the one on screen, mirror the 3D logo's
  // scroll behaviour: grow from small to full over the first viewport,
  // then drift (leave-parallax) as the hero scrolls away.
  const VBH = 140.04; // logo-prime.svg viewBox height (for parallax scaling)
  const flatImg = host.querySelector('.liquid-hero__mark');
  function updateFlatScale() {
    if (!flatImg || host.classList.contains('is-3d')) return;
    const p = (window.pageYOffset || 0) / (window.innerHeight || 1);
    const sp = Math.min(1, p);
    const leave = Math.min(1, Math.max(0, p - 1));
    const scale = 1 - SCROLL_GROW + sp * SCROLL_GROW;
    // LEAVE_PARALLAX is SVG units in world space (- = down); convert to a
    // % of the logo's height for CSS (+ = down), so the two stay in sync.
    const shiftPct = (-LEAVE_PARALLAX / VBH) * 100 * leave;
    flatImg.style.transform =
      'translateY(' + shiftPct.toFixed(2) + '%) scale(' + scale.toFixed(3) + ')';
  }
  window.addEventListener('scroll', updateFlatScale, { passive: true });
  window.addEventListener('resize', () => { syncBreakpoint(); updateFlatScale(); });

  function update() {
    if (flatMode()) {
      if (scene3d) scene3d.setActive(false);
      host.classList.remove('is-3d');
    } else {
      if (!scene3d) scene3d = build(host);
      if (scene3d) scene3d.setActive(true);
    }
    updateFlatScale();
  }

  relevantMedia.forEach((mq) => mq && mq.addEventListener('change', update));
  new MutationObserver(update).observe(document.documentElement,
    { attributes: true, attributeFilter: ['class'] });

  update();
}

/* ---------------------------------------------------------------
   Build the three.js scene. Returns { setActive(bool) } or null.
   --------------------------------------------------------------- */
function build(host) {
  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  } catch (e) {
    return null; // no WebGL -> flat <img> stays
  }
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.15;
  host.appendChild(renderer.domElement);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(32, 1, 0.1, 4000);

  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;

  scene.add(new THREE.AmbientLight(0xffffff, 0.5));
  const key = new THREE.DirectionalLight(0xffffff, 3.0);
  key.position.set(4, 6, 6);
  scene.add(key);
  const rim = new THREE.DirectionalLight(0xaac4ff, 1.2);
  rim.position.set(-6, -2, -4);
  scene.add(rim);

  const material = new THREE.MeshPhysicalMaterial(MATERIAL);
  const pivot = new THREE.Group();
  scene.add(pivot);

  const rot = { x: 0, y: 0 };
  const target = { x: 0, y: 0 };
  const clock = new THREE.Clock();
  let raf = null;
  let onScreen = true;
  let active = false;
  let ready = false;
  let logoSize = new THREE.Vector3(1, 1, 1);

  // On-screen size of the logo relative to its box; fitMargin() is 1.0
  // on tablet/desktop (matches the flat <img>'s `object-fit: contain`)
  // and 0.9 on phones so the mark overspills and fills the screen.

  new SVGLoader().load(SVG_URL, (data) => {
    const group = new THREE.Group();
    for (const path of data.paths) {
      for (const shape of SVGLoader.createShapes(path)) {
        const geo = new THREE.ExtrudeGeometry(shape, {
          depth: EXTRUDE_DEPTH,
          bevelEnabled: false,
          curveSegments: 24,
        });
        // SVG space is Y-down: mirror to Y-up and repair the
        // triangle winding so faces/normals point outward.
        geo.scale(1, -1, 1);
        flipWinding(geo);
        geo.computeVertexNormals();
        group.add(new THREE.Mesh(geo, material));
      }
    }

    // Centre the geometry on the origin so the model spins around the
    // logo's centre (plus any manual PIVOT_OFFSET nudge).
    const box = new THREE.Box3().setFromObject(group);
    const center = box.getCenter(new THREE.Vector3());
    logoSize = box.getSize(new THREE.Vector3());
    group.children.forEach((m) => m.geometry.translate(
      -center.x + PIVOT_OFFSET_X,
      -center.y - PIVOT_OFFSET_Y,
      -center.z));
    pivot.add(group);

    camera.lookAt(0, 0, 0);
    ready = true;
    if (active) { host.classList.add('is-3d'); resize(); start(); }
  }, undefined, () => { /* load error -> keep the flat <img> */ });

  function resize() {
    // Render into a frame larger than the logo box (CANVAS_OVERSCAN) so
    // the model has room to tilt/spin without hitting the canvas edge.
    const w = (host.clientWidth || 1) * CANVAS_OVERSCAN;
    const h = (host.clientHeight || 1) * CANVAS_OVERSCAN;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;

    // Distance that makes the logo fill the *logo box* (not the whole
    // oversized canvas) on its tighter axis.
    const vFov = camera.fov * Math.PI / 180;
    const hFov = 2 * Math.atan(Math.tan(vFov / 2) * camera.aspect);
    const fitH = (logoSize.y / 2) / Math.tan(vFov / 2);
    const fitW = (logoSize.x / 2) / Math.tan(hFov / 2);
    camera.position.z =
      Math.max(fitH, fitW) * fitMargin() * CANVAS_OVERSCAN + logoSize.z / 2;

    camera.updateProjectionMatrix();
  }

  function frame() {
    rot.x += (target.x - rot.x) * EASE;
    rot.y += (target.y - rot.y) * EASE;

    // Scroll progress over one viewport height.
    var sp = Math.min(1, (window.pageYOffset || 0) / (window.innerHeight || 1));
    var spinAngle = sp * SCROLL_SPIN;
    pivot.rotation.x = rot.x;
    pivot.rotation.y = rot.y + spinAngle +
      Math.sin(clock.getElapsedTime() * 0.5) * IDLE_AMP;
    pivot.scale.setScalar(1 - SCROLL_GROW + sp * SCROLL_GROW);
    // Push right across the half-turn (0 at 0deg/360deg) so the asymmetric
    // mark reads centred while it spins, plus a small linear shift so it
    // settles a touch further right than it started.
    pivot.position.x = SPIN_RECENTER * (1 - Math.cos(spinAngle)) * 0.5 +
      SPIN_END_SHIFT * sp;
    // Parallax as the hero scrolls away: once past one viewport, drift the
    // logo (down, lagging the page) over the next viewport.
    var leave = Math.min(1, Math.max(0,
      (window.pageYOffset || 0) / (window.innerHeight || 1) - 1));
    pivot.position.y = LEAVE_PARALLAX * leave;
    renderer.render(scene, camera);
    raf = (active && onScreen) ? requestAnimationFrame(frame) : null;
  }

  function start() {
    if (raf || !active || !onScreen || !ready) return;
    raf = requestAnimationFrame(frame);
  }

  window.addEventListener('pointermove', (e) => {
    if (!active) return;
    const r = host.getBoundingClientRect();
    if (!r.width) return;
    const px = (e.clientX - (r.left + r.width / 2)) / (window.innerWidth / 2);
    const py = (e.clientY - (r.top + r.height / 2)) / (window.innerHeight / 2);
    target.y = Math.max(-1, Math.min(1, px)) * MAX_TILT;
    target.x = -Math.max(-1, Math.min(1, py)) * MAX_TILT;
    start();
  }, { passive: true });

  document.addEventListener('pointerleave', () => { target.x = target.y = 0; });
  window.addEventListener('blur', () => { target.x = target.y = 0; });
  window.addEventListener('resize', () => {
    syncBreakpoint();
    if (active && ready) resize();
  });

  if (window.IntersectionObserver) {
    new IntersectionObserver((entries) => {
      onScreen = entries[0].isIntersecting;
      if (onScreen) start();
    }, { threshold: 0 }).observe(host);
  }
  document.addEventListener('visibilitychange', () => {
    onScreen = !document.hidden;
    if (onScreen) start();
  });

  return {
    setActive(v) {
      active = v;
      if (v) {
        if (ready) { host.classList.add('is-3d'); resize(); start(); }
      } else {
        host.classList.remove('is-3d');
        if (raf) { cancelAnimationFrame(raf); raf = null; }
      }
    },
  };
}

/* Reverse triangle winding on a non-indexed BufferGeometry
   (swap the 2nd and 3rd vertex of every triangle). */
function flipWinding(geo) {
  for (const name of ['position', 'normal', 'uv']) {
    const attr = geo.getAttribute(name);
    if (!attr) continue;
    const arr = attr.array;
    const n = attr.itemSize;
    for (let i = 0; i < arr.length; i += n * 3) {
      for (let k = 0; k < n; k++) {
        const tmp = arr[i + n + k];
        arr[i + n + k] = arr[i + 2 * n + k];
        arr[i + 2 * n + k] = tmp;
      }
    }
    attr.needsUpdate = true;
  }
}
