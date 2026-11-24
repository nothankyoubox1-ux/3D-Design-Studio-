// Dokumentmodel: liste af parametriske features + undo/redo + historik.
// Alle ændringer går gennem apply(), så de kan fortrydes og senere bruges af AI-assistenten.
import { PRIMS, heightOf } from './kernel.js';

export class Doc {
  constructor() { this.reset(); this.listeners = new Set(); }

  reset() { this.features = []; this.n = 0; this.log = []; this.undoS = []; this.redoS = []; this.dirty = false; }
  onChange(fn) { this.listeners.add(fn); }
  emit() { this.listeners.forEach(f => f()); }
  snap() { return JSON.stringify({ features: this.features, n: this.n, log: this.log }); }
  restore(s) { Object.assign(this, JSON.parse(s)); this.dirty = true; this.emit(); }

  apply(label, fn) {
    const before = this.snap();
    fn();
    this.undoS.push(before); this.redoS = [];
    this.log.push(label); this.dirty = true; this.emit();
  }

  add(type) {
    if (!PRIMS[type]) throw new Error('Ukendt primitiv: ' + type);
    let id;
    this.apply('add:' + type, () => {
      id = 'f' + (++this.n);
      const params = { ...PRIMS[type].params };
      this.features.push({ id, type, name: type + ' ' + this.n, params, pos: { x: 0, y: 0, z: heightOf(type, params) / 2 } });
    });
    return id;
  }

  get(id) { return this.features.find(f => f.id === id); }

  setParam(id, key, value) {
    const f = this.get(id);
    if (!f || !(key in f.params)) throw new Error('Ukendt parameter: ' + key);
    if (!Number.isFinite(value) || value <= 0) throw new Error('Mål skal være et tal større end 0');
    this.apply(`param:${f.name}.${key}=${value}`, () => { f.params[key] = value; });
  }

  setPos(id, axis, value) {
    const f = this.get(id);
    if (!f || !['x', 'y', 'z'].includes(axis) || !Number.isFinite(value)) throw new Error('Ugyldig position');
    this.apply(`move:${f.name}.${axis}=${value}`, () => { f.pos[axis] = value; });
  }

  rename(id, name) { const f = this.get(id); if (f && name) this.apply('rename', () => { f.name = name; }); }
  remove(id) { const f = this.get(id); if (f) this.apply('delete:' + f.name, () => { this.features = this.features.filter(x => x.id !== id); }); }

  canUndo() { return this.undoS.length > 0; }
  canRedo() { return this.redoS.length > 0; }
  undo() { if (!this.canUndo()) return; this.redoS.push(this.snap()); this.restore(this.undoS.pop()); }
  redo() { if (!this.canRedo()) return; this.undoS.push(this.snap()); this.restore(this.redoS.pop()); }

  toJSON() { return { format: '3d-design-studio', version: 1, unit: 'mm', n: this.n, features: this.features, log: this.log }; }
  load(data) {
    if (data?.format !== '3d-design-studio' || !Array.isArray(data.features)) throw new Error('Ikke en gyldig projektfil');
    for (const f of data.features) if (!PRIMS[f.type]) throw new Error('Ukendt primitiv i fil: ' + f.type);
    this.reset();
    this.features = data.features; this.n = data.n || data.features.length; this.log = data.log || [];
    this.dirty = false; this.emit();
  }
}
