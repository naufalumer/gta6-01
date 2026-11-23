import * as THREE from 'three';
import { WORLD, VEHICLES } from './config.js';
import { clamp, lerp, damp, angleLerp, range, pick } from './random.js';
import { Vehicle } from './vehicles.js';

const WANTED_UNITS = {
  1: { foot: 2, car: 0, heli: 0, block: 0 },
  2: { foot: 1, car: 2, heli: 0, block: 0 },
  3: { foot: 2, car: 3, heli: 0, block: 1 },
  4: { foot: 2, car: 4, heli: 1, block: 1 },
  5: { foot: 3, car: 5, heli: 1, block: 2 },
};

function makeCopMesh() {
  const g = new THREE.Group();
  const uni = new THREE.MeshLambertMaterial({ color: 0x1c2f4a });
  const skin = new THREE.MeshLambertMaterial({ color: 0xe0ac69 });
  const body = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.78, 0.34), uni);
  body.position.y = 1.06;
  g.add(body);
  const vest = new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.4, 0.36),
    new THREE.MeshLambertMaterial({ color: 0x0f1a26 }));
  vest.position.y = 1.15;
  g.add(vest);
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.22, 12, 10), skin);
  head.position.y = 1.64;
  g.add(head);
  const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.23, 0.23, 0.1, 10), uni);
  cap.position.y = 1.8;
  g.add(cap);
  const brim = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.04, 0.2), uni);
  brim.position.set(0, 1.76, 0.22);
  g.add(brim);
  const legGeo = new THREE.BoxGeometry(0.21, 0.72, 0.21);
  legGeo.translate(0, -0.36, 0);
  const legL = new THREE.Mesh(legGeo, uni); legL.position.set(-0.15, 0.74, 0);
  const legR = new THREE.Mesh(legGeo, uni); legR.position.set(0.15, 0.74, 0);
  g.add(legL, legR);
  const armGeo = new THREE.BoxGeometry(0.16, 0.62, 0.16);
  armGeo.translate(0, -0.31, 0);
  const armL = new THREE.Mesh(armGeo, uni); armL.position.set(-0.38, 1.4, 0);
  const armR = new THREE.Mesh(armGeo, uni); armR.position.set(0.38, 1.4, 0);
  g.add(armL, armR);
  return { group: g, legL, legR, armL, armR };
}

export class Police {
  constructor(scene, colliders) {
    this.scene = scene;
    this.colliders = colliders;
    this.wanted = 0;
    this.heat = 0; // fractional heat; wanted = floor
    this.units = []; // {kind:'foot'|'car'|'heli', ...}
    this.roadblocks = [];
    this.coolTimer = 0;
    this.bustTimer = 0;
    this.spawnTimer = 0;
    this.gainMul = 1;
    this.coolMul = 1;
    this.scanner = false;
  }
  addHeat(n, audio) {
    if (this.wanted >= 5) return;
    const before = this.wanted;
    this.heat = clamp(this.heat + n * this.gainMul, 0, 5.99);
    this.wanted = Math.floor(this.heat);
    if (this.wanted > before && audio) audio.wantedUp();
  }
  clearWanted() { this.wanted = 0; this.heat = 0; this._despawnAll(); }
  _spawnPoint(px, pz) {
    const a = range(Math.random, 0, Math.PI * 2);
    const d = range(Math.random, 70, 110);
    return [clamp(px + Math.sin(a) * d, -WORLD.half + 10, WORLD.half - 10),
      clamp(pz + Math.cos(a) * d, -WORLD.half + 10, WORLD.half - 10)];
  }
  _despawnAll() {
    for (const u of this.units) {
      if (u.mesh) this.scene.remove(u.mesh.group || u.mesh);
      if (u.veh) u.veh.remove();
    }
    this.units = [];
    for (const rb of this.roadblocks) for (const v of rb) v.remove();
    this.roadblocks = [];
  }
  _syncUnits(player) {
    const want = WANTED_UNITS[this.wanted] || { foot: 0, car: 0, heli: 0, block: 0 };
    const count = (k) => this.units.filter((u) => u.kind === k).length;
    if (count('foot') < want.foot) {
      const [x, z] = this._spawnPoint(player.x, player.z);
      const mesh = makeCopMesh();
      mesh.group.position.set(x, 0, z);
      this.scene.add(mesh.group);
      this.units.push({ kind: 'foot', mesh, x, z, heading: 0, phase: 0, shootT: 1, tactic: 'On foot' });
    }
    if (count('car') < want.car) {
      const [x, z] = this._spawnPoint(player.x, player.z);
      const veh = new Vehicle(this.scene, 'copcar', x, z, 0, { isCop: true });
      this.units.push({ kind: 'car', veh, x, z, tactic: this.wanted >= 3 ? 'PIT maneuver' : 'Pursuit', blockedT: 0, reverseT: 0 });
    }
    if (count('heli') < want.heli) {
      const veh = new Vehicle(this.scene, 'copter', player.x + 40, player.z + 40, 0, { isCop: true });
      veh.y = 42;
      const cone = new THREE.Mesh(new THREE.ConeGeometry(9, 42, 16, 1, true),
        new THREE.MeshBasicMaterial({ color: 0xfff2c0, transparent: true, opacity: 0.14, side: THREE.DoubleSide, depthWrite: false }));
      cone.position.y = -21;
      veh.mesh.add(cone);
      this.units.push({ kind: 'heli', veh, x: veh.x, z: veh.z, angle: 0, tactic: 'Air support' });
    }
    if (this.roadblocks.length < want.block && this.wanted >= 3) {
      this._placeRoadblock(player);
    }
  }
  _placeRoadblock(player) {
    const ahead = player.vehicle ? player.vehicle.heading : player.heading;
    const bx = player.x + Math.sin(ahead) * 55;
    const bz = player.z + Math.cos(ahead) * 55;
    const perp = ahead + Math.PI / 2;
    const cars = [];
    for (const off of [-4, 4]) {
      const v = new Vehicle(this.scene, 'copcar',
        bx + Math.sin(perp) * off, bz + Math.cos(perp) * off, perp, { isCop: true });
      v.speed = 0;
      cars.push(v);
    }
    this.roadblocks.push(cars);
  }
  patrolList(player) {
    return this.units.map((u) => {
      const x = u.kind === 'foot' ? u.x : u.veh.x;
      const z = u.kind === 'foot' ? u.z : u.veh.z;
      return { kind: u.kind, dist: Math.round(Math.hypot(x - player.x, z - player.z)), tactic: u.tactic };
    });
  }
  update(dt, ctx) {
    const { player, vehicles, audio, onBusted, onCopShot } = ctx;
    if (this.wanted === 0) {
      if (this.units.length) this._despawnAll();
      if (audio) audio.sirenSet(false);
      return;
    }
    if (audio) audio.sirenSet(true);
    this.spawnTimer -= dt;
    if (this.spawnTimer <= 0) { this._syncUnits(player); this.spawnTimer = 1.5; }
    const nearest = Math.min(...this.units.map((u) => {
      const x = u.kind === 'foot' ? u.x : u.veh.x;
      const z = u.kind === 'foot' ? u.z : u.veh.z;
      return Math.hypot(x - player.x, z - player.z);
    }), 999);
    if (nearest > 70) {
      this.coolTimer += dt * this.coolMul;
      if (this.coolTimer > 5) { this.heat = Math.max(0, this.heat - 0.2); this.wanted = Math.floor(this.heat); this.coolTimer = 0; }
    } else this.coolTimer = 0;

    const others = vehicles.concat(this.units.filter((u) => u.veh).map((u) => u.veh));
    let bust = false;
    for (const u of this.units) {
      if (u.kind === 'foot') {
        const dx = player.x - u.x, dz = player.z - u.z;
        const d = Math.hypot(dx, dz);
        const want = Math.atan2(dx, dz);
        u.heading = angleLerp(u.heading, want, 1 - Math.exp(-6 * dt));
        const sp = d > 3 ? 5.2 : 0;
        u.x += Math.sin(u.heading) * sp * dt;
        u.z += Math.cos(u.heading) * sp * dt;
        u.phase += dt * sp * 4;
        u.mesh.legL.rotation.x = Math.sin(u.phase) * 0.6;
        u.mesh.legR.rotation.x = -Math.sin(u.phase) * 0.6;
        u.mesh.group.position.set(u.x, 0, u.z);
        u.mesh.group.rotation.y = u.heading;
        u.shootT -= dt;
        if (d < 26 && u.shootT <= 0) {
          u.shootT = 1.3;
          if (onCopShot && Math.random() < 0.4) onCopShot(3 + this.wanted, u.x, u.z);
        }
        if (player.mode === 'foot' && d < 2.4 && player.speed < 1.5) {
          this.bustTimer += dt;
          if (this.bustTimer > 1.6) bust = true;
        }
      } else if (u.kind === 'car') {
        const v = u.veh;
        const dx = player.x - v.x, dz = player.z - v.z;
        const d = Math.hypot(dx, dz);
        const want = Math.atan2(dx, dz);
        let steer = 0;
        let diff = want - v.heading;
        while (diff > Math.PI) diff -= Math.PI * 2;
        while (diff < -Math.PI) diff += Math.PI * 2;
        steer = clamp(diff * 2, -1, 1);
        if (u.reverseT > 0) {
          u.reverseT -= dt;
          v.drive(dt, -1, -steer, false, this.colliders, others);
        } else {
          const before = { x: v.x, z: v.z };
          v.drive(dt, 1, steer, false, this.colliders, others);
          const moved = Math.hypot(v.x - before.x, v.z - before.z);
          if (v.speed > 4 && moved < 0.05) { u.blockedT += dt; } else u.blockedT = 0;
          if (u.blockedT > 1.2) { u.reverseT = 0.9; u.blockedT = 0; }
        }
        u.x = v.x; u.z = v.z;
        if (player.vehicle && d < 4.5) {
          player.vehicle.damage(4 * dt * 10);
          if (Math.random() < dt * 2 && audio) audio.crash();
        }
      } else if (u.kind === 'heli') {
        const v = u.veh;
        u.angle += dt * 0.5;
        const tx = player.x + Math.sin(u.angle) * 26;
        const tz = player.z + Math.cos(u.angle) * 26;
        v.x = damp(v.x, tx, 1.2, dt);
        v.z = damp(v.z, tz, 1.2, dt);
        v.y = damp(v.y, 42, 1, dt);
        v.heading = Math.atan2(player.x - v.x, player.z - v.z);
        v.rotorSpin += dt * 22;
        v._syncMesh(dt);
        u.x = v.x; u.z = v.z;
      }
    }
    if (bust && onBusted) onBusted();
    for (let i = this.roadblocks.length - 1; i >= 0; i--) {
      const rb = this.roadblocks[i];
      const d = Math.hypot(rb[0].x - player.x, rb[0].z - player.z);
      if (d > 160) { for (const v of rb) v.remove(); this.roadblocks.splice(i, 1); }
    }
  }
}
