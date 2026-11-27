import * as THREE from 'three';

const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
gsap.registerPlugin(ScrollTrigger);

if (!reduced) {
  const lenis = new Lenis({ lerp: 0.07, wheelMultiplier: 0.9 });
  lenis.on('scroll', ScrollTrigger.update);
  gsap.ticker.add(t => lenis.raf(t * 1000));
  gsap.ticker.lagSmoothing(0);
}

/* ---------- WebGL: the painted flower blooms ---------- */
const canvas = document.getElementById('gl');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.toneMapping = THREE.ACESFilmicToneMapping;
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(35, 1, 0.1, 100);
camera.position.set(0, 0, 9);

scene.add(new THREE.HemisphereLight(0xfff4e6, 0x5b3a8e, 1.2));
const key = new THREE.DirectionalLight(0xffffff, 2.2); key.position.set(3, 4, 5); scene.add(key);
const rim = new THREE.DirectionalLight(0xe0a93b, 1.4); rim.position.set(-4, -2, -3); scene.add(rim);

function petalGeo(len, wid) {
  const s = new THREE.Shape();
  s.moveTo(0, 0);
  s.bezierCurveTo(wid, len * 0.25, wid * 0.9, len * 0.8, 0, len);
  s.bezierCurveTo(-wid * 0.9, len * 0.8, -wid, len * 0.25, 0, 0);
  const g = new THREE.ShapeGeometry(s, 24);
  const p = g.attributes.position;
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i), y = p.getY(i);
    p.setZ(i, x * x * 0.9 - Math.sin((y / len) * Math.PI) * 0.12); // cup + ripple
  }
  g.computeVertexNormals();
  return g;
}
const violet = new THREE.MeshPhysicalMaterial({ color: 0x6a44a8, roughness: 0.55, sheen: 1, sheenColor: 0xd9b8ff, side: THREE.DoubleSide, clearcoat: 0.2 });
const violetIn = violet.clone(); violetIn.color = new THREE.Color(0x3d2468);

const flower = new THREE.Group();
scene.add(flower);
const petals = [];
function ring(n, len, wid, mat, offset, tilt) {
  for (let i = 0; i < n; i++) {
    const pivot = new THREE.Group();
    pivot.rotation.z = (i / n) * Math.PI * 2 + offset;
    const m = new THREE.Mesh(petalGeo(len, wid), mat);
    pivot.add(m);
    flower.add(pivot);
    petals.push({ m, pivot, tilt, base: pivot.rotation.z, rnd: Math.random() });
  }
}
ring(8, 2.1, 0.75, violet, 0, 0.15);
ring(6, 1.4, 0.55, violetIn, 0.3, 0.45);

const center = new THREE.Mesh(new THREE.SphereGeometry(0.38, 32, 16), new THREE.MeshStandardMaterial({ color: 0x2a1840, roughness: 0.8 }));
flower.add(center);
const gold = new THREE.MeshStandardMaterial({ color: 0xe0a93b, roughness: 0.4, metalness: 0.3 });
const stamens = new THREE.InstancedMesh(new THREE.SphereGeometry(0.05, 8, 8), gold, 40);
const d = new THREE.Object3D();
for (let i = 0; i < 40; i++) {
  const a = i * 2.399, r = 0.15 + Math.sqrt(i / 40) * 0.42;
  d.position.set(Math.cos(a) * r, Math.sin(a) * r, 0.28);
  d.updateMatrix(); stamens.setMatrixAt(i, d.matrix);
}
flower.add(stamens);

// a small garden of companion flowers + leaves around the main bloom
const pink = violet.clone(); pink.color = new THREE.Color(0xe58fb4); pink.sheenColor = new THREE.Color(0xffd6e6);
const lilac = violet.clone(); lilac.color = new THREE.Color(0xa98ad8);
const PETALS = petals.length;
const companions = [
  [-4.6, 2.4, -2.5, 0.42, pink, 0.15], [-0.9, 2.9, -3, 0.32, lilac, 0.3], [4.9, -2.4, -1.8, 0.5, pink, 0.1],
  [2.4, 3.4, -4.5, 0.32, lilac, 0.4], [0.9, -3.0, -3, 0.34, violet, 0.25]
].map(([x, y, z, s, mat, delay]) => {
  const g = flower.clone();
  for (let i = 0; i < PETALS; i++) if (petals[i].m.material === violet) g.children[i].children[0].material = mat;
  g.position.set(x, y, z); g.userData = { s, delay, spin: Math.random() * 6 };
  scene.add(g); return g;
});
const leafMat = new THREE.MeshPhysicalMaterial({ color: 0x4f7a4a, roughness: 0.6, sheen: 0.6, sheenColor: 0xb9e3a8, side: THREE.DoubleSide });
const leafGeo = petalGeo(2.6, 0.55);
const leaves = new THREE.Group(); flower.add(leaves);
for (let i = 0; i < 6; i++) {
  const l = new THREE.Mesh(leafGeo, leafMat);
  l.rotation.set(0.25, 0, (i / 6) * Math.PI * 2 + 0.5); // tilted back, behind the petals
  l.position.z = -0.9; l.scale.setScalar(0.85 + (i % 2) * 0.2);
  leaves.add(l);
}

// loose petals drifting through the rest of the page
const loose = new THREE.InstancedMesh(petalGeo(0.26, 0.1), violet, 22);
const looseData = Array.from({ length: 22 }, () => ({
  x: (Math.random() - 0.5) * 12, y: (Math.random() - 0.5) * 10, z: (Math.random() - 0.5) * 4 - 2,
  r: Math.random() * 6, s: 0.6 + Math.random() * 0.8, sp: 0.2 + Math.random() * 0.5
}));
scene.add(loose);

function resize() {
  const w = innerWidth, h = innerHeight;
  renderer.setSize(w, h, false);
  camera.aspect = w / h; camera.updateProjectionMatrix();
  const wide = w > 820;
  flower.position.set(wide ? 1.9 : 0, wide ? 0.4 : 0.9, 0);
  flower.scale.setScalar(wide ? 1 : 0.7);
}
addEventListener('resize', resize); resize();

const state = { bloom: reduced ? 1 : 0, scatter: 0, page: 0 };
ScrollTrigger.create({
  trigger: '#hero', start: 'top top', end: 'bottom bottom',
  onUpdate: s => {
    state.bloom = reduced ? 1 : Math.min(1, s.progress / 0.65);
    state.scatter = Math.max(0, (s.progress - 0.65) / 0.35);
  }
});
ScrollTrigger.create({ start: 0, end: 'max', onUpdate: s => state.page = s.progress });

const mouse = { x: 0, y: 0, tx: 0, ty: 0 };
addEventListener('pointermove', e => { mouse.tx = e.clientX / innerWidth - 0.5; mouse.ty = e.clientY / innerHeight - 0.5; });

const ease = t => 1 - Math.pow(1 - t, 3);
const sm = { bloom: state.bloom, scatter: 0 };
let last = performance.now(), time = 0;
function frame(now) {
  const dt = Math.min((now - last) / 1000, 0.05); last = now; time += dt; // clamp: no jump after tab is hidden
  mouse.x += (mouse.tx - mouse.x) * 0.06; mouse.y += (mouse.ty - mouse.y) * 0.06;
  sm.bloom += (state.bloom - sm.bloom) * 0.08; sm.scatter += (state.scatter - sm.scatter) * 0.08;
  const b = ease(sm.bloom), sc = sm.scatter;

  for (const p of petals) {
    const closed = -1.45 + p.tilt * 0.3, open = -0.15 - p.tilt;
    p.m.rotation.x = closed + (open - closed) * b + Math.sin(time * 1.3 + p.rnd * 6) * 0.03;
    p.pivot.rotation.z = p.base + b * 0.35 + sc * p.rnd * 1.5;
    // scatter: petals drift outward and away from the camera, never over the copy
    p.m.position.set(0, sc * (1 + p.rnd * 3), -sc * (3 + p.rnd * 6));
  }
  flower.scale.setScalar((innerWidth > 820 ? 1 : 0.7) * (1 - sc * 0.6));
  center.scale.set(0.6 + b * 0.4, 0.6 + b * 0.4, 0.4 + b * 0.25);
  stamens.scale.setScalar(Math.max(0.001, b));
  flower.rotation.x = -0.35 + mouse.y * 0.4 + (1 - b) * 0.5;
  flower.rotation.y = mouse.x * 0.6 - (1 - b) * 0.3;
  flower.rotation.z = time * 0.05 + b * 0.8;
  flower.visible = sc < 0.9 && state.scatter < 1;
  leaves.scale.setScalar(0.4 + b * 0.6);
  for (const g of companions) {
    const { s, delay, spin } = g.userData;
    const cb = ease(Math.min(1, Math.max(0, (sm.bloom - delay) / (1 - delay))));
    for (let i = 0; i < PETALS; i++) {
      const p = petals[i], closed = -1.45 + p.tilt * 0.3, open = -0.15 - p.tilt;
      g.children[i].children[0].rotation.x = closed + (open - closed) * cb;
    }
    g.children[PETALS + 1].scale.setScalar(Math.max(0.001, cb));
    g.scale.setScalar(s * (innerWidth > 820 ? 1 : 0.7) * Math.max(0.001, 1 - sc));
    g.rotation.set(-0.3 + mouse.y * 0.5, mouse.x * 0.8, time * 0.08 + spin);
    g.position.y += Math.sin(time * 0.8 + spin) * 0.002;
    g.visible = flower.visible;
  }

  const show = Math.min(1, sc * 1.5);
  for (let i = 0; i < looseData.length; i++) {
    const L = looseData[i];
    const y = ((L.y - time * L.sp * 0.4 + state.page * 18 * L.s) % 10 + 10) % 10 - 5;
    d.position.set(L.x + Math.sin(time * L.sp + i) * 0.4, y, L.z);
    d.rotation.set(time * L.sp + L.r, time * 0.7 * L.sp, L.r);
    d.scale.setScalar(Math.max(0.001, L.s * show));
    d.updateMatrix(); loose.setMatrixAt(i, d.matrix);
  }
  loose.instanceMatrix.needsUpdate = true;

  renderer.render(scene, camera);
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);

/* ---------- DOM choreography ---------- */
const floorN = document.getElementById('floorN');
ScrollTrigger.create({ trigger: '#hero', start: 'top top', end: '65% bottom', onUpdate: s => floorN.textContent = Math.min(4, Math.floor(s.progress * 5)) });
if (reduced) floorN.textContent = 4;

if (!reduced) {
  gsap.from('.hero-title .line>span', { yPercent: 110, duration: 1.2, ease: 'expo.out', stagger: 0.12, delay: 0.2 });
  gsap.from('.hero-kicker, .hero-sub, .floor', { opacity: 0, y: 20, duration: 1, delay: 0.7, stagger: 0.1 });
  gsap.to('.hero-pin > *', { scrollTrigger: { trigger: '#hero', start: '75% bottom', end: 'bottom bottom', scrub: true }, opacity: 0, y: -40 });
  // marquee driven by scroll
  gsap.to('.band-track', { xPercent: -50, ease: 'none', scrollTrigger: { trigger: '.band', start: 'top bottom', end: 'bottom top', scrub: 0.6 } });
  gsap.from('.intro > *, .chips li', { opacity: 0, y: 30, stagger: 0.05, duration: 0.9, ease: 'power3.out', scrollTrigger: { trigger: '.intro', start: 'top 80%' } });

  gsap.utils.toArray('.wipe').forEach((el, i) => {
    gsap.to(el, { clipPath: 'inset(0% 0 0 0)', ease: 'none', scrollTrigger: { trigger: '.rooms', start: `top ${85 - i * 10}%`, end: `top ${35 - i * 10}%`, scrub: 0.8 } });
    gsap.fromTo(el.querySelector('img'), { scale: 1.3 }, { scale: 1, ease: 'none', scrollTrigger: { trigger: '.rooms', start: 'top bottom', end: 'bottom top', scrub: true } });
  });
  gsap.from('.rooms-copy > *', { opacity: 0, y: 40, stagger: 0.1, duration: 1, ease: 'power3.out', scrollTrigger: { trigger: '.rooms-copy', start: 'top 75%' } });

  const track = document.querySelector('.pan-track');
  const dist = () => Math.max(0, track.scrollWidth - track.parentElement.clientWidth);
  gsap.to(track, { x: () => -dist(), ease: 'none', scrollTrigger: { trigger: '.breakfast', pin: '.pan-pin', start: 'top top', end: () => '+=' + dist(), scrub: true, invalidateOnRefresh: true } });

  gsap.to('.host-img img', { yPercent: -10, ease: 'none', scrollTrigger: { trigger: '.host', start: 'top bottom', end: 'bottom top', scrub: true } });
  gsap.from('.dist li', { opacity: 0, x: 40, stagger: 0.06, duration: 0.8, ease: 'power3.out', scrollTrigger: { trigger: '.dist', start: 'top 80%' } });
  gsap.from('.close h2', { opacity: 0, y: 60, duration: 1.2, ease: 'expo.out', scrollTrigger: { trigger: '.close', start: 'top 60%' } });
}

document.querySelectorAll('[data-count]').forEach(el => {
  const to = +el.dataset.count, dec = +el.dataset.dec;
  const o = { v: reduced ? to : 0 };
  const put = () => el.textContent = o.v.toFixed(dec).replace('.', ',');
  put();
  if (!reduced) gsap.to(o, { v: to, duration: 1.6, ease: 'power2.out', onUpdate: put, scrollTrigger: { trigger: el, start: 'top 85%' } });
});

// hero cards drift with scroll + pointer (depth)
if (!reduced) {
  [['.c1', -120, 1], ['.c2', -220, 1.6], ['.c3', -80, 0.8], ['.hbadge', -160, 1.2]].forEach(([sel, y, depth]) => {
    gsap.to(sel, { y, ease: 'none', scrollTrigger: { trigger: '#hero', start: 'top top', end: 'bottom bottom', scrub: 0.6 } });
    const el = document.querySelector(sel);
    addEventListener('pointermove', e => gsap.to(el, { x: (e.clientX / innerWidth - 0.5) * -24 * depth, duration: 1, ease: 'power2.out', overwrite: 'auto' }));
  });
  gsap.from('.hcard, .hbadge', { opacity: 0, scale: 0.85, duration: 1.2, ease: 'expo.out', stagger: 0.12, delay: 0.5 });
}

// demo booking + payment (no real charge)
const form = document.getElementById('bookForm');
const f = form.elements;
const today = new Date().toISOString().slice(0, 10);
f.in.min = f.out.min = today;
const nightsOf = () => Math.round((new Date(f.out.value) - new Date(f.in.value)) / 864e5);
const calc = () => {
  const n = nightsOf(), ok = n > 0;
  const tot = ok ? n * +f.room.value : 0;
  document.getElementById('nights').textContent = ok ? `${n} nott${n > 1 ? 'i' : 'e'} · colazione inclusa` : 'Scegli le date';
  document.getElementById('total').textContent = document.getElementById('total2').textContent = '€' + tot;
  return ok;
};
form.addEventListener('input', calc);
f.room.addEventListener('change', () => { f.guests.value = f.room.value === '40' ? '1' : f.guests.value; });
const steps = [...form.querySelectorAll('.step')], tabs = [...form.querySelectorAll('.steps li')];
const go = i => { steps.forEach((s, k) => s.hidden = k !== i); tabs.forEach((t, k) => t.classList.toggle('on', k === i)); };
form.querySelector('[data-next]').onclick = () => { if (calc()) go(1); else document.getElementById('nights').textContent = 'La partenza deve essere dopo l\'arrivo'; };
form.querySelector('[data-back]').onclick = () => go(0);
f.card.addEventListener('input', () => f.card.value = f.card.value.replace(/\D/g, '').slice(0, 16).replace(/(.{4})/g, '$1 ').trim());
f.exp.addEventListener('input', () => f.exp.value = f.exp.value.replace(/\D/g, '').slice(0, 4).replace(/^(\d{2})(\d)/, '$1/$2'));
form.addEventListener('submit', e => {
  e.preventDefault();
  const err = document.getElementById('err');
  if (!f.name.value.trim() || !/^\S+@\S+\.\S+$/.test(f.email.value)) return err.textContent = 'Inserisci nome ed email validi.';
  if (f.card.value.replace(/\s/g, '').length < 16 || !/^\d{2}\/\d{2}$/.test(f.exp.value) || f.cvc.value.length < 3) return err.textContent = 'Controlla i dati della carta.';
  err.textContent = '';
  const fmt = d => new Date(d).toLocaleDateString('it-IT', { day: 'numeric', month: 'long' });
  document.getElementById('summary').textContent = `${f.name.value.trim()}, ti aspettiamo dal ${fmt(f.in.value)} al ${fmt(f.out.value)}. Totale ${document.getElementById('total').textContent}. Ti abbiamo scritto a ${f.email.value}.`;
  f.card.value = f.cvc.value = f.exp.value = ''; // never keep card data around
  go(2);
});
