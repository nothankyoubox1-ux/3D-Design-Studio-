// CAD-kerne (prototype). Al geometri er parametrisk og i millimeter.
// Volumen beregnes med eksakte formler - ikke ud fra visningsmeshet.
// BEMÆRK: Dette er en midlertidig kerne uden boolean. Den skal erstattes af OpenCascade (replicad)
// bag samme interface (geometryFor / volumeOf / heightOf).
import * as THREE from 'three';

const PI = Math.PI;

export const PRIMS = {
  box:      { params: { x: 20, y: 20, z: 20 },        vol: p => p.x * p.y * p.z,                  h: p => p.z },
  cylinder: { params: { radius: 10, height: 20 },     vol: p => PI * p.radius ** 2 * p.height,    h: p => p.height },
  sphere:   { params: { radius: 10 },                 vol: p => (4 / 3) * PI * p.radius ** 3,     h: p => 2 * p.radius },
  cone:     { params: { radius: 10, height: 20 },     vol: p => (PI * p.radius ** 2 * p.height) / 3, h: p => p.height },
  torus:    { params: { radius: 15, tube: 4 },        vol: p => 2 * PI ** 2 * p.radius * p.tube ** 2, h: p => 2 * p.tube },
};

export const volumeOf = (type, p) => PRIMS[type].vol(p);
export const heightOf = (type, p) => PRIMS[type].h(p);

// Z er op (CAD-konvention). Alle former er centreret i origo.
export function geometryFor(type, p) {
  let g;
  switch (type) {
    case 'box': g = new THREE.BoxGeometry(p.x, p.y, p.z); break;
    case 'cylinder': g = new THREE.CylinderGeometry(p.radius, p.radius, p.height, 64).rotateX(PI / 2); break;
    case 'cone': g = new THREE.CylinderGeometry(0, p.radius, p.height, 64).rotateX(PI / 2); break;
    case 'sphere': g = new THREE.SphereGeometry(p.radius, 64, 48).rotateX(PI / 2); break;
    case 'torus': g = new THREE.TorusGeometry(p.radius, p.tube, 32, 96); break;
    default: throw new Error('Ukendt primitiv: ' + type);
  }
  return g;
}
