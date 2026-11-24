import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { PRIMS, geometryFor, volumeOf } from './kernel.js';
import { Doc } from './document.js';
import { I18N } from './i18n.js';

THREE.Object3D.DEFAULT_UP.set(0, 0, 1); // Z er op

const doc = new Doc();
let lang = localStorage.getItem('lang') || 'da';
let selected = null;
const t = k => I18N[lang][k] ?? k;
const $ = id => document.getElementById(id);
const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const fmt = n => n.toLocaleString(lang === 'da' ? 'da-DK' : 'en-US', { maximumFractionDigits: 2 });
const run = fn => { try { $('err').textContent = ''; return fn(); } catch (e) { $('err').textContent = e.message; } };

// ---------- 3D-visning ----------
const view = $('view');
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
view.appendChild(renderer.domElement);
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x14171c);
const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 5000);
camera.position.set(80, -90, 70);
const controls = new OrbitControls(camera, renderer.domElement);
controls.target.set(0, 0, 10);
scene.add(new THREE.HemisphereLight(0xffffff, 0x445566, 1.1));
const sun = new THREE.DirectionalLight(0xffffff, 1.6); sun.position.set(60, -40, 100); scene.add(sun);
const grid = new THREE.GridHelper(200, 20, 0x556070, 0x2d333d); grid.rotation.x = Math.PI / 2; scene.add(grid);
scene.add(new THREE.AxesHelper(30));
const group = new THREE.Group(); scene.add(group);
const meshes = new Map();

function resize() {
  const w = view.clientWidth, h = view.clientHeight;
  renderer.setSize(w, h); camera.aspect = w / h; camera.updateProjectionMatrix();
}
new ResizeObserver(resize).observe(view);
renderer.setAnimationLoop(() => { controls.update(); renderer.render(scene, camera); });

function rebuildScene() {
  for (const m of meshes.values()) { m.geometry.dispose(); m.material.dispose(); }
  group.clear(); meshes.clear();
  for (const f of doc.features) {
    const mat = new THREE.MeshStandardMaterial({ color: f.id === selected ? 0xe0a458 : 0xaab4c2, metalness: 0.3, roughness: 0.45 });
    const m = new THREE.Mesh(geometryFor(f.type, f.params), mat);
    m.position.set(f.pos.x, f.pos.y, f.pos.z); m.userData.id = f.id;
    m.add(new THREE.LineSegments(new THREE.EdgesGeometry(m.geometry, 30), new THREE.LineBasicMaterial({ color: 0x10131a })));
    group.add(m); meshes.set(f.id, m);
  }
}

// Valg ved klik/tryk (ikke ved træk)
const ray = new THREE.Raycaster(); let down = null;
renderer.domElement.addEventListener('pointerdown', e => { down = [e.clientX, e.clientY]; });
renderer.domElement.addEventListener('pointerup', e => {
  if (!down || Math.hypot(e.clientX - down[0], e.clientY - down[1]) > 4) return;
  const r = renderer.domElement.getBoundingClientRect();
  ray.setFromCamera(new THREE.Vector2(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1), camera);
  const hit = ray.intersectObjects([...meshes.values()], false)[0];
  select(hit ? hit.object.userData.id : null);
});

// ---------- UI ----------
function select(id) { selected = id; render(); }

function renderBar() {
  const prims = Object.keys(PRIMS).map(k => `<button data-add="${k}">+ ${t(k)}</button>`).join('');
  const pend = ['sketch', 'extrude', 'boolean'].map(k => `<button disabled title="${t('pending')}">${t(k)}</button>`).join('');
  $('bar').innerHTML = `<h1>3D Design Studio</h1>${prims}<span class="sep"></span>${pend}<span class="sep"></span>
    <button id="undo" ${doc.canUndo() ? '' : 'disabled'}>${t('undo')}</button>
    <button id="redo" ${doc.canRedo() ? '' : 'disabled'}>${t('redo')}</button>
    <button id="del" ${selected ? '' : 'disabled'}>${t('del')}</button><span class="sep"></span>
    <button id="save">${t('save')}</button><button id="open">${t('open')}</button>
    <select id="lang" aria-label="Language"><option value="da">Dansk</option><option value="en">English</option></select>`;
  $('lang').value = lang;
}

function renderLeft() {
  $('left').innerHTML = `<h2>${t('objects')}</h2>` + (doc.features.length
    ? doc.features.map(f => `<div class="item ${f.id === selected ? 'sel' : ''}" data-id="${f.id}">${esc(f.name)}</div>`).join('')
    : `<p class="dim">${t('empty')}</p>`) +
    `<h2 style="margin-top:16px">${t('history')}</h2><div class="dim">${doc.log.slice(-8).reverse().map(esc).join('<br>')}</div>`;
}

function renderRight() {
  const f = doc.get(selected);
  if (!f) { $('right').innerHTML = `<h2>${t('props')}</h2><p class="dim">${t('none')}</p>`; return; }
  const row = (lbl, kind, key, val) => `<label class="row">${lbl}<input type="number" step="any" data-${kind}="${key}" value="${val}"></label>`;
  $('right').innerHTML = `<h2>${t('props')}</h2>
    <label class="row">${t('name')}<input data-name value="${esc(f.name)}"></label>
    <h2>${t('size')}</h2>${Object.entries(f.params).map(([k, v]) => row(t(k), 'param', k, v)).join('')}
    <h2>${t('pos')}</h2>${['x', 'y', 'z'].map(a => row(t(a), 'pos', a, f.pos[a])).join('')}
    <h2>${t('volume')}</h2><div>${fmt(volumeOf(f.type, f.params))} mm³</div>`;
}

function renderFooter() {
  const total = doc.features.reduce((s, f) => s + volumeOf(f.type, f.params), 0);
  $('stats').textContent = `${t('total')}: ${fmt(total)} mm³ (${t('note')})`;
  $('status').textContent = doc.dirty ? t('unsaved') : t('saved');
}

function render() {
  if (selected && !doc.get(selected)) selected = null;
  renderBar(); renderLeft(); renderRight(); renderFooter(); rebuildScene();
}
doc.onChange(render);

$('bar').addEventListener('click', e => {
  const b = e.target.closest('button'); if (!b) return;
  if (b.dataset.add) run(() => select(doc.add(b.dataset.add)));
  else if (b.id === 'undo') doc.undo();
  else if (b.id === 'redo') doc.redo();
  else if (b.id === 'del') doc.remove(selected);
  else if (b.id === 'save') saveFile();
  else if (b.id === 'open') $('file').click();
});
$('bar').addEventListener('change', e => { if (e.target.id === 'lang') { lang = e.target.value; localStorage.setItem('lang', lang); render(); } });
$('left').addEventListener('click', e => { const i = e.target.closest('.item'); if (i) select(i.dataset.id); });
$('right').addEventListener('change', e => {
  const d = e.target.dataset;
  run(() => {
    if ('name' in d) doc.rename(selected, e.target.value.trim());
    else if (d.param) doc.setParam(selected, d.param, parseFloat(e.target.value));
    else if (d.pos) doc.setPos(selected, d.pos, parseFloat(e.target.value));
  });
  render(); // gendan feltværdier hvis ugyldigt
});
addEventListener('keydown', e => {
  if (e.target.tagName === 'INPUT') return;
  const mod = e.ctrlKey || e.metaKey;
  if (mod && e.key.toLowerCase() === 'z') { e.preventDefault(); e.shiftKey ? doc.redo() : doc.undo(); }
  else if (mod && e.key.toLowerCase() === 'y') { e.preventDefault(); doc.redo(); }
  else if (e.key === 'Delete' && selected) doc.remove(selected);
});

// ---------- Fil: gem/åbn (midlertidig, JSON) ----------
const fileInput = Object.assign(document.createElement('input'), { type: 'file', accept: '.json,.d3ds', id: 'file', hidden: true });
document.body.appendChild(fileInput);
fileInput.addEventListener('change', async () => {
  const file = fileInput.files[0]; if (!file) return;
  run(async () => { doc.load(JSON.parse(await file.text())); selected = null; render(); });
  fileInput.value = '';
});
function saveFile() {
  const a = Object.assign(document.createElement('a'), {
    href: URL.createObjectURL(new Blob([JSON.stringify(doc.toJSON(), null, 2)], { type: 'application/json' })),
    download: 'projekt.d3ds.json',
  });
  a.click(); URL.revokeObjectURL(a.href);
  doc.dirty = false; renderFooter();
}

render(); resize();
