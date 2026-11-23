import * as THREE from 'three';
import { WORLD, ROADS } from './config.js';
import { clamp, lerp, damp, mulberry32, range, rangeInt, pick } from './random.js';


const SHIRTS = [0xe74c3c, 0x3498db, 0x2ecc71, 0xf1c40f, 0x9b59b6, 0xecf0f1, 0x1abc9c, 0xe67e22, 0xfd79a8, 0x00cec9];
const PANTS = [0x2c3e50, 0x34495e, 0x7f8c8d, 0x5d4037, 0x1a1a2e];
const SKINS = [0xf1c27d, 0xe0ac69, 0xc68642, 0x8d5524, 0xffdbac];

function makePedMesh(rng) {
  const g = new THREE.Group();
  const shirt = pick(rng, SHIRTS), pants = pick(rng, PANTS), skin = pick(rng, SKINS);
  const body = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.75, 0.32),
    new THREE.MeshLambertMaterial({ color: shirt }));
  body.position.y = 1.05;
  g.add(body);
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.21, 10, 8),
    new THREE.MeshLambertMaterial({ color: skin }));
  head.position.y = 1.62;
  g.add(head);
  const hair = new THREE.Mesh(new THREE.SphereGeometry(0.22, 10, 6, 0, Math.PI * 2, 0, Math.PI / 2),
    new THREE.MeshLambertMaterial({ color: pick(rng, [0x1a1a1a, 0x5d4037, 0x8a6a4a, 0xd8d8d8]) }));
  hair.position.y = 1.66;
  g.add(hair);
  const legGeo = new THREE.BoxGeometry(0.2, 0.7, 0.2);
  legGeo.translate(0, -0.35, 0);
  const legMat = new THREE.MeshLambertMaterial({ color: pants });
  const legL = new THREE.Mesh(legGeo, legMat); legL.position.set(-0.14, 0.72, 0);
  const legR = new THREE.Mesh(legGeo, legMat); legR.position.set(0.14, 0.72, 0);
  g.add(legL, legR);
  const armGeo = new THREE.BoxGeometry(0.15, 0.6, 0.15);
  armGeo.translate(0, -0.3, 0);
  const armMat = new THREE.MeshLambertMaterial({ color: shirt });
  const armL = new THREE.Mesh(armGeo, armMat); armL.position.set(-0.35, 1.38, 0);
  const armR = new THREE.Mesh(armGeo, armMat); armR.position.set(0.35, 1.38, 0);
  g.add(armL, armR);
  return { group: g, legL, legR, armL, armR, head };
}

class Ped {
  constructor(scene, rng, x, z) {
    this.mesh = makePedMesh(rng);
    this.scene = scene;
    this.x = x; this.z = z;
    this.heading = range(rng, 0, Math.PI * 2);
    this.speed = range(rng, 1.2, 2.2);
    this.phase = range(rng, 0, Math.PI * 2);
    this.state = 'walk'; // walk | cross | chat | flee | tocar
    this.stateT = 0;
    this.waitT = 0;
    this.target = null;
    this.fleeX = 0; this.fleeZ = 0;
    this.car = null;
    this.mesh.group.position.set(x, 0, z);
    this.mesh.group.rotation.y = this.heading;
    scene.add(this.mesh.group);
  }
  _setHeading(tx, tz) {
    const want = Math.atan2(tx - this.x, tz - this.z);
    let d = want - this.heading;
    while (d > Math.PI) d -= Math.PI * 2;
    while (d < -Math.PI) d += Math.PI * 2;
    this.heading += clamp(d, -3.2 * 0.016, 3.2 * 0.016) * 4;
  }
  update(dt, ctx) {
    this.stateT += dt;
    const m = this.mesh;
    let moving = 0, speedMul = 1;
    if (this.state === 'flee') {
      this._setHeading(this.x + (this.x - this.fleeX), this.z + (this.z - this.fleeZ));
      moving = 1; speedMul = 3.2;
      if (this.stateT > range(0, 3, 5)) { this.state = 'walk'; this.stateT = 0; }
    } else if (this.state === 'chat') {
      moving = 0;
      if (this.stateT > 8) { this.state = 'walk'; this.stateT = 0; }
    } else if (this.state === 'tocar' && this.car) {
      const dx = this.car.x - this.x, dz = this.car.z - this.z;
      const d = Math.hypot(dx, dz);
      if (d < 1.2) { this.state = 'gone'; return 'enter-car'; }
      this._setHeading(this.car.x, this.car.z);
      moving = 1; speedMul = 1.4;
    } else {
      if (!this.target || Math.hypot(this.target[0] - this.x, this.target[1] - this.z) < 2) {
        this.target = this._nextTarget(ctx.rng);
      }
      this._setHeading(this.target[0], this.target[1]);
      moving = 1;
      const pdx = ctx.player.x - this.x, pdz = ctx.player.z - this.z;
      const pd = Math.hypot(pdx, pdz);
      if (pd < 1.6 && pd > 0.01) { this.x -= (pdx / pd) * dt * 2; this.z -= (pdz / pd) * dt * 2; }
    }
    const sp = this.speed * speedMul;
    this.x += Math.sin(this.heading) * sp * moving * dt;
    this.z += Math.cos(this.heading) * sp * moving * dt;
    this.x = clamp(this.x, -WORLD.half + 6, WORLD.half - 6);
    this.z = clamp(this.z, -WORLD.half + 6, WORLD.half - 6);
    this.phase += dt * sp * 4.2;
    const swing = moving ? Math.sin(this.phase) * (speedMul > 2 ? 0.85 : 0.55) : Math.sin(this.phase * 0.3) * 0.03;
    m.legL.rotation.x = swing;
    m.legR.rotation.x = -swing;
    m.armL.rotation.x = -swing * 0.8;
    m.armR.rotation.x = swing * 0.8;
    m.group.position.set(this.x, moving && speedMul > 2 ? Math.abs(Math.sin(this.phase)) * 0.08 : 0, this.z);
    m.group.rotation.y = this.heading;
    m.group.rotation.x = speedMul > 2 ? 0.12 : 0;
    return null;
  }
  _nextTarget(rng) {
    const road = pick(rng, ROADS);
    const along = range(rng, -400, 400);
    const side = pick(rng, [-1, 1]);
    if (rng() < 0.5) return [along, road + side * 10.5];
    return [road + side * 10.5, along];
  }
  fleeFrom(x, z) {
    if (this.state !== 'flee') { this.state = 'flee'; this.stateT = 0; }
    this.fleeX = x; this.fleeZ = z;
  }
  remove() { this.scene.remove(this.mesh.group); }
}

export class Pedestrians {
  constructor(scene, count = 64) {
    this.scene = scene;
    this.rng = mulberry32(777);
    this.peds = [];
    this.parkedCars = [];
    for (let i = 0; i < count; i++) {
      let x, z;
      const r = this.rng();
      if (r < 0.45) { x = range(this.rng, -260, 20); z = range(this.rng, -160, 160); }
      else if (r < 0.65) { x = range(this.rng, -400, -300); z = range(this.rng, -400, 400); }
      else { x = range(this.rng, -400, 400); z = range(this.rng, -400, 400); }
      const road = ROADS.reduce((a, b) => Math.abs(b - x) < Math.abs(a - x) ? b : a);
      x = road + pick(this.rng, [-10.5, 10.5]);
      const p = new Ped(scene, this.rng, x, z);
      if (this.rng() < 0.14) { p.state = 'chat'; p.stateT = range(this.rng, 0, 8); }
      this.peds.push(p);
    }
  }
  setParkedCars(cars) { this.parkedCars = cars; }
  fleeFrom(x, z, radius = 40) {
    for (const p of this.peds) {
      const d = Math.hypot(p.x - x, p.z - z);
      if (d < radius) p.fleeFrom(x, z);
    }
  }
  maybeDriveOff(vehicles) {
    if (Math.random() > 0.02) return;
    const idle = this.peds.filter((p) => p.state === 'walk');
    if (!idle.length || !this.parkedCars.length) return;
    const p = pick(Math.random, idle);
    const car = pick(Math.random, this.parkedCars.filter((c) => !c.stolen && !c.traffic));
    if (!car) return;
    p.state = 'tocar'; p.car = car; p.stateT = 0;
  }
  update(dt, ctx) {
    let entered = null;
    for (let i = this.peds.length - 1; i >= 0; i--) {
      const p = this.peds[i];
      const ev = p.update(dt, ctx);
      if (ev === 'enter-car') {
        entered = p.car;
        p.remove();
        this.peds.splice(i, 1);
        const np = new Ped(this.scene, this.rng, range(this.rng, -300, 300), range(this.rng, -300, 300));
        this.peds.push(np);
      }
    }
    return entered;
  }
  count() { return this.peds.length; }
}
