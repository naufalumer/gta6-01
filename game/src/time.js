import * as THREE from 'three';
import { clamp, lerp } from './random.js';

const KEYS = [
  [5.0,  0x9fc8e8, 0xbdd8e8, 0xffd9a0, 1.4, 12,  80, 0x9fc8e8, 0x6a6a55, 0.9, 0.3, 0.25, 0.2, 0.3, 0x2a7fa8],
  [9.0,  0x8fd0f2, 0xcfe4ee, 0xfff2cc, 2.6, 42, 110, 0x8fc3ff, 0x6a5a45, 1.1, 0.4, 0.12, 0.0, 0.1, 0x1f7fa8],
  [12.0, 0x6ec2f2, 0xbfe0f2, 0xffffff, 3.0, 72, 180, 0x9fd4ff, 0x7a6a50, 1.2, 0.45, 0.08, 0.0, 0.05, 0x1a7db0],
  [16.0, 0xffc98a, 0xf2c08a, 0xffd9a0, 2.5, 38, 250, 0x8fc3ff, 0x5a4a38, 1.1, 0.35, 0.35, 0.3, 0.4, 0x1f7fa8],
  [18.5, 0xff7a4d, 0xf28a5c, 0xff8a3c, 2.2, 8,  270, 0x7a90c8, 0x4a3a30, 0.9, 0.3, 0.85, 0.85, 0.85, 0x2a6a9a],
  [20.0, 0x2a2a55, 0x2a2f4d, 0x8aa8ff, 0.7, -6, 290, 0x2a3a66, 0x1a1a22, 0.62, 0.28, 1.0, 1.0, 1.0, 0x0d2f4d],
  [24.0, 0x0d1b3a, 0x16233d, 0x6a88cc, 0.55, 30, 320, 0x1a2a55, 0x12121a, 0.5, 0.22, 1.0, 1.0, 1.0, 0x0a2438],
];

function sampleKey(hour) {
  let h = ((hour % 24) + 24) % 24;
  let a = KEYS[KEYS.length - 1], b = KEYS[0];
  for (let i = 0; i < KEYS.length - 1; i++) {
    if (h >= KEYS[i][0] && h < KEYS[i + 1][0]) { a = KEYS[i]; b = KEYS[i + 1]; break; }
  }
  if (h < KEYS[0][0] || h >= KEYS[KEYS.length - 1][0]) { a = KEYS[KEYS.length - 1]; b = KEYS[0]; }
  const span = (b[0] - a[0] + 24) % 24 || 24;
  const t = clamp(((h - a[0] + 24) % 24) / span, 0, 1);
  const out = [];
  for (let i = 1; i < a.length; i++) {
    if (i === 3) out.push(new THREE.Color(a[i]).lerp(new THREE.Color(b[i]), t)); // sunColor
    else if (i === 1 || i === 2 || i === 7 || i === 8 || i === 14) {
      out.push(new THREE.Color(a[i]).lerp(new THREE.Color(b[i]), t)); // colours
    } else out.push(lerp(a[i], b[i], t));
  }
  return out;
}

export class TimeOfDay {
  constructor(scene, refs) {
    this.scene = scene;
    this.refs = refs;
    this.hour = 17.0;            // golden hour by default: the money light
    this.rate = 1 / 25;          // 1 game hour per 25 real seconds
    this._c = new THREE.Color();
  }
  phase() {
    const h = this.hour;
    if (h >= 5 && h < 10) return 'Morning';
    if (h >= 10 && h < 16) return 'Noon';
    if (h >= 16 && h < 19.5) return 'Dusk';
    return 'Night';
  }
  clock() {
    const h = Math.floor(this.hour) % 24;
    const m = Math.floor((this.hour % 1) * 60);
    return String(h).padStart(2, '0') + ':' + String(m).padStart(2, '0');
  }
  setHour(h) { this.hour = h; this.apply(); }
  update(dt) { this.hour = (this.hour + dt * this.rate) % 24; this.apply(); }
  apply() {
    const [sky, fog, sunCol, sunI, elev, azim, hSky, hGround, hemiI, ambI,
      neon, lamp, win, water] = sampleKey(this.hour);
    const r = this.refs;
    this.scene.background.copy(sky);
    this.scene.fog.color.copy(fog);
    r.sun.color.copy(sunCol);
    r.sun.intensity = sunI;
    const el = (elev * Math.PI) / 180, az = (azim * Math.PI) / 180;
    r.sun.position.set(Math.cos(el) * Math.sin(az) * 300, Math.sin(el) * 300 + 40, Math.cos(el) * Math.cos(az) * 300);
    r.hemi.color.copy(hSky);
    r.hemi.groundColor.copy(hGround);
    r.hemi.intensity = hemiI;
    r.amb.intensity = ambI;
    const lampC = 0.25 + lamp * 0.75;
    r.bulbMat.color.setRGB(1 * lampC, 0.91 * lampC, 0.66 * lampC);
    const winC = 0.15 + win * 0.85;
    r.winMat.color.setRGB(1 * winC, 0.85 * winC, 0.54 * winC);
    r.signMat.color.setScalar(0.18 + neon * 0.82);
    for (const m of r.neonMats) {
      const base = m.userData.base || 0xffffff;
      this._c.setHex(base).multiplyScalar(0.25 + neon * 0.75);
      m.color.copy(this._c);
    }
    r.waterMat.color.copy(water);
    r.water2Mat.color.copy(water).multiplyScalar(1.4);
  }
}
