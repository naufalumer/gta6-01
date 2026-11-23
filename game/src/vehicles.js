import * as THREE from 'three';
import { VEHICLES, WORLD, ROADS } from './config.js';
import { clamp, lerp, damp, angleLerp, mulberry32, range, pick } from './random.js';


function box(w, h, d, color, x = 0, y = 0, z = 0) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d),
    new THREE.MeshLambertMaterial({ color }));
  m.position.set(x, y, z);
  return m;
}

function buildCarMesh(cfg, isCop) {
  const g = new THREE.Group();
  const bodyCol = isCop ? 0x1c2733 : cfg.color;
  const body = box(2.0, 0.62, 4.4, bodyCol, 0, 0.62, 0);
  g.add(body);
  const cabin = box(1.7, 0.55, 2.2, isCop ? 0x111820 : 0x22303e, 0, 1.18, -0.2);
  g.add(cabin);
  g.add(box(1.9, 0.1, 0.9, bodyCol, 0, 0.95, 1.7));
  const hl = new THREE.MeshBasicMaterial({ color: 0xfff2c0 });
  const hlL = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.14, 0.08), hl);
  hlL.position.set(-0.65, 0.62, 2.22); g.add(hlL);
  const hlR = hlL.clone(); hlR.position.x = 0.65; g.add(hlR);
  const tl = new THREE.MeshBasicMaterial({ color: 0xff2a2a });
  const tlL = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.14, 0.08), tl);
  tlL.position.set(-0.65, 0.62, -2.22); g.add(tlL);
  const tlR = tlL.clone(); tlR.position.x = 0.65; g.add(tlR);
  const wheels = [];
  const wheelGeo = new THREE.CylinderGeometry(0.38, 0.38, 0.3, 10);
  const wheelMat = new THREE.MeshLambertMaterial({ color: 0x14161a });
  for (const [wx, wz] of [[-0.95, 1.45], [0.95, 1.45], [-0.95, -1.45], [0.95, -1.45]]) {
    const wg = new THREE.Group();
    wg.position.set(wx, 0.38, wz);
    const w = new THREE.Mesh(wheelGeo, wheelMat);
    w.rotation.z = Math.PI / 2;
    wg.add(w);
    g.add(wg); wheels.push(wg);
  }
  const door = box(0.08, 0.55, 1.1, bodyCol, -1.02, 0.75, 0.3);
  door.geometry.translate(0, 0, -0.55); // hinge at front edge
  door.position.set(-1.02, 0.75, 0.85);
  g.add(door);
  let lightBar = null, lightBarL = null, lightBarR = null;
  if (isCop) {
    lightBar = new THREE.Group();
    lightBarL = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.16, 0.3),
      new THREE.MeshBasicMaterial({ color: 0xff2020 }));
    lightBarL.position.set(-0.3, 1.55, -0.2);
    lightBarR = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.16, 0.3),
      new THREE.MeshBasicMaterial({ color: 0x2040ff }));
    lightBarR.position.set(0.3, 1.55, -0.2);
    lightBar.add(lightBarL, lightBarR);
    g.add(lightBar);
    const badge = box(1.72, 0.3, 0.06, 0xf5f5f5, 0, 0.62, 2.21);
    g.add(badge);
  }
  return { group: g, wheels, door, lightBar, lightBarL, lightBarR };
}

function buildBikeMesh(cfg) {
  const g = new THREE.Group();
  const body = box(0.5, 0.42, 2.1, cfg.color, 0, 0.72, 0);
  g.add(body);
  const tank = box(0.46, 0.3, 0.7, 0x1c2733, 0, 0.95, 0.35);
  g.add(tank);
  const seat = box(0.42, 0.14, 0.8, 0x14161a, 0, 0.92, -0.55);
  g.add(seat);
  const screen = box(0.4, 0.4, 0.06, 0x22303e, 0, 1.05, 0.85);
  screen.rotation.x = -0.5;
  g.add(screen);
  const hl = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.12, 0.06),
    new THREE.MeshBasicMaterial({ color: 0xfff2c0 }));
  hl.position.set(0, 0.75, 1.08);
  g.add(hl);
  const wheels = [];
  const wheelGeo = new THREE.TorusGeometry(0.36, 0.11, 8, 16);
  const wheelMat = new THREE.MeshLambertMaterial({ color: 0x14161a });
  for (const wz of [0.85, -0.85]) {
    const wg = new THREE.Group();
    wg.position.set(0, 0.36, wz);
    const w = new THREE.Mesh(wheelGeo, wheelMat);
    w.rotation.y = Math.PI / 2;
    wg.add(w);
    g.add(wg); wheels.push(wg);
  }
  const bar = box(0.9, 0.08, 0.08, 0x14161a, 0, 1.12, 0.7);
  g.add(bar);
  return { group: g, wheels, door: null, lightBar: null };
}

function buildHeliMesh(cfg, isCop) {
  const g = new THREE.Group();
  const bodyCol = isCop ? 0x22303e : cfg.color;
  const body = box(2.2, 1.5, 4.6, bodyCol, 0, 1.2, 0);
  g.add(body);
  const glass = box(1.9, 0.8, 1.2, 0x8fd0ff, 0, 1.35, 1.9);
  g.add(glass);
  const tail = box(0.7, 0.7, 5.2, bodyCol, 0, 1.5, -4.6);
  g.add(tail);
  const fin = box(0.15, 1.6, 1.2, bodyCol, 0, 2.2, -7.0);
  g.add(fin);
  const rotor = new THREE.Group();
  const blade = box(11, 0.08, 0.5, 0x14161a, 0, 0, 0);
  const blade2 = blade.clone(); blade2.rotation.y = Math.PI / 2;
  rotor.add(blade, blade2);
  rotor.position.y = 2.2;
  g.add(rotor);
  const tailRotor = new THREE.Group();
  const tb = box(0.08, 2.2, 0.3, 0x14161a, 0, 0, 0);
  const tb2 = tb.clone(); tb2.rotation.x = Math.PI / 2;
  tailRotor.add(tb, tb2);
  tailRotor.position.set(0.45, 2.2, -7.0);
  tailRotor.rotation.z = Math.PI / 2;
  g.add(tailRotor);
  const skidL = box(0.12, 0.12, 4.4, 0x14161a, -1.0, 0.15, 0);
  const skidR = box(0.12, 0.12, 4.4, 0x14161a, 1.0, 0.15, 0);
  g.add(skidL, skidR);
  return { group: g, wheels: [], door: null, lightBar: null, rotor, tailRotor };
}

export class Vehicle {
  constructor(scene, type, x, z, heading, opts = {}) {
    this.cfg = VEHICLES[type];
    this.type = type;
    this.isCop = !!opts.isCop;
    this.traffic = !!opts.traffic;
    this.stolen = false;
    this.hp = this.cfg.hp;
    this.speed = 0;
    this.heading = heading;
    this.steer = 0;
    this.x = x; this.z = z;
    this.y = 0;
    this.vy = 0;
    this.nitro = 0;
    this.hasNitro = !!opts.nitro;
    this.doorOpen = 0; // 0 shut .. 1 open (animated)
    this.dead = false;
    this.lean = 0;
    this.rotorSpin = 0;
    this.hoverH = 0;
    const built = this.cfg.kind === 'bike' ? buildBikeMesh(this.cfg)
      : this.cfg.kind === 'heli' ? buildHeliMesh(this.cfg, this.isCop)
      : buildCarMesh(this.cfg, this.isCop);
    this.mesh = built.group;
    this.wheels = built.wheels;
    this.door = built.door;
    this.lightBar = built.lightBar;
    this.lightBarL = built.lightBarL;
    this.lightBarR = built.lightBarR;
    this.rotor = built.rotor || null;
    this.tailRotor = built.tailRotor || null;
    this.mesh.position.set(x, 0, z);
    this.mesh.rotation.y = heading;
    scene.add(this.mesh);
    this.scene = scene;
    this.ai = { road: null, axis: 'x', dir: 1, targetSpeed: range(Math.random, 11, 16), wait: 0 };
    if (this.traffic) this._pickRoad();
  }
  _pickRoad() {
    const horizontal = Math.random() < 0.5;
    const road = pick(Math.random, ROADS);
    if (horizontal) { this.ai.axis = 'x'; this.z = road + (Math.random() < 0.5 ? 3.5 : -3.5); this.ai.dir = this.z > road ? -1 : 1; this.heading = this.ai.dir > 0 ? Math.PI / 2 : -Math.PI / 2; }
    else { this.ai.axis = 'z'; this.x = road + (Math.random() < 0.5 ? 3.5 : -3.5); this.ai.dir = this.x > road ? 1 : -1; this.heading = this.ai.dir > 0 ? Math.PI : 0; }
    this.ai.road = road;
  }
  radius() { return this.cfg.kind === 'heli' ? 3.4 : this.cfg.kind === 'bike' ? 1.4 : 2.6; }
  drive(dt, throttle, steerIn, handbrake, colliders, others) {
    const c = this.cfg;
    if (this.cfg.kind === 'heli') { this._fly(dt, throttle, steerIn, handbrake); return; }
    const nitroBoost = this.nitro > 0 ? 1.6 : 1;
    if (throttle > 0) this.speed += c.accel * throttle * nitroBoost * dt;
    else if (throttle < 0) {
      if (this.speed > 0.5) this.speed -= c.brake * dt;
      else this.speed -= c.accel * 0.5 * dt;
    } else this.speed -= Math.sign(this.speed) * 6 * dt;
    if (this.nitro > 0) this.nitro -= dt;
    this.speed = clamp(this.speed, -c.top * 0.45, c.top * nitroBoost);
    if (Math.abs(this.speed) < 0.05 && throttle === 0) this.speed = 0;
    const grip = handbrake ? c.grip * 0.45 : c.grip;
    const steerTarget = steerIn * clamp(Math.abs(this.speed) / 8, 0, 1) * (this.speed < 0 ? -1 : 1);
    this.steer = damp(this.steer, steerTarget, 8, dt);
    this.heading += this.steer * (Math.abs(this.speed) / 12) * dt * (handbrake ? 1.7 : 1);
    const nx = this.x + Math.sin(this.heading) * this.speed * dt;
    const nz = this.z + Math.cos(this.heading) * this.speed * dt;
    const hit = this._collide(nx, nz, colliders, others);
    if (hit) {
      this.speed *= -0.25;
      this.hp -= Math.abs(hit) * 0.6;
    }
    this.x = hit ? this.x : nx;
    this.z = hit ? this.z : nz;
    const targetLean = this.cfg.kind === 'bike' ? -this.steer * 0.55 : -this.steer * 0.06;
    this.lean = damp(this.lean, targetLean, 6, dt);
    this._syncMesh(dt);
  }
  _fly(dt, throttle, steerIn, handbrake) {
    const climb = throttle;
    this.vy = damp(this.vy, climb * 9, 2.5, dt);
    this.y = clamp(this.y + this.vy * dt, 0, 90);
    if (this.y <= 0.01 && climb <= 0) this.vy = 0;
    this.heading += steerIn * 1.4 * dt;
    const fwd = handbrake ? 1 : 0.4; // handbrake key = forward thrust here
    const sp = this.speed;
    this.speed = damp(this.speed, fwd * this.cfg.top * (this.y > 1 ? 1 : 0), 1.2, dt);
    this.x += Math.sin(this.heading) * this.speed * dt;
    this.z += Math.cos(this.heading) * this.speed * dt;
    this.x = clamp(this.x, -WORLD.half, WORLD.half);
    this.z = clamp(this.z, -WORLD.half, WORLD.half);
    this.rotorSpin += dt * (8 + this.speed * 0.4);
    this._syncMesh(dt);
  }
  _collide(nx, nz, colliders, others) {
    const r = this.radius();
    for (const c of colliders) {
      if (nx > c.x0 - r && nx < c.x1 + r && nz > c.z0 - r && nz < c.z1 + r) {
        return Math.abs(this.speed);
      }
    }
    for (const o of others) {
      if (o === this || o.dead) continue;
      const d2 = (nx - o.x) ** 2 + (nz - o.z) ** 2;
      const rr = r + o.radius();
      if (d2 < rr * rr) return Math.abs(this.speed) * 0.7;
    }
    if (nx < -WORLD.half + 4 || nx > WORLD.half - 4 || nz < -WORLD.half + 4 || nz > WORLD.half - 4) return Math.abs(this.speed);
    return 0;
  }
  _syncMesh(dt) {
    this.mesh.position.set(this.x, this.y + (this.cfg.kind === 'heli' ? 0 : 0), this.z);
    this.mesh.rotation.set(0, this.heading, 0);
    if (this.cfg.kind === 'bike') this.mesh.rotation.z = this.lean;
    else this.mesh.rotation.z = this.lean;
    if (this.cfg.kind === 'heli') {
      this.mesh.rotation.x = clamp(-this.speed / this.cfg.top, -0.3, 0.3) * 0.6;
      if (this.rotor) this.rotor.rotation.y = this.rotorSpin;
      if (this.tailRotor) this.tailRotor.rotation.x = this.rotorSpin * 1.4;
    }
    const spin = this.speed * dt * 2.4;
    for (const w of this.wheels) w.rotation.x += spin;
    if (this.door) {
      const target = this.doorOpen;
      this.door.rotation.y = damp(this.door.rotation.y, -target * 1.1, 10, dt);
    }
    if (this.lightBar) {
      const on = Math.floor(performance.now() / 280) % 2 === 0;
      this.lightBarL.material.color.setHex(on ? 0xff2020 : 0x551010);
      this.lightBarR.material.color.setHex(on ? 0x101055 : 0x2040ff);
    }
  }
  aiDrive(dt, colliders, others, player) {
    if (this.dead) return;
    const a = this.ai;
    if (a.wait > 0) { a.wait -= dt; this.speed = damp(this.speed, 0, 6, dt); }
    else {
      let ahead = false;
      for (const o of others) {
        if (o === this || o.dead) continue;
        const dx = o.x - this.x, dz = o.z - this.z;
        const fwd = Math.sin(this.heading) * dx + Math.cos(this.heading) * dz;
        const side = Math.abs(Math.cos(this.heading) * dx - Math.sin(this.heading) * dz);
        if (fwd > 0 && fwd < 14 && side < 3) { ahead = true; break; }
      }
      const pdx = player.x - this.x, pdz = player.z - this.z;
      const pfwd = Math.sin(this.heading) * pdx + Math.cos(this.heading) * pdz;
      const pside = Math.abs(Math.cos(this.heading) * pdx - Math.sin(this.heading) * pdz);
      if (pfwd > 0 && pfwd < 12 && pside < 3) ahead = true;
      this.speed = damp(this.speed, ahead ? 0 : a.targetSpeed, 2, dt);
      const nearRoad = ROADS.find((r) => Math.abs((a.axis === 'x' ? this.z : this.x) - r) < 2);
      const along = a.axis === 'x' ? this.x : this.z;
      const atCross = ROADS.some((r) => Math.abs(along - r) < 3);
      if (atCross && Math.random() < dt * 0.25) {
        const newAxis = a.axis === 'x' ? 'z' : 'x';
        const road = ROADS.find((r) => Math.abs(along - r) < 3);
        if (newAxis === 'x') { this.z = road + (Math.random() < 0.5 ? 3.5 : -3.5); a.dir = this.z > road ? -1 : 1; this.heading = a.dir > 0 ? Math.PI / 2 : -Math.PI / 2; }
        else { this.x = road + (Math.random() < 0.5 ? 3.5 : -3.5); a.dir = this.x > road ? 1 : -1; this.heading = a.dir > 0 ? Math.PI : 0; }
        a.axis = newAxis; a.road = road;
      }
      if (a.axis === 'x') this.z = damp(this.z, a.road + (a.dir > 0 ? -3.5 : 3.5), 4, dt);
      else this.x = damp(this.x, a.road + (a.dir > 0 ? 3.5 : -3.5), 4, dt);
    }
    const nx = this.x + Math.sin(this.heading) * this.speed * dt;
    const nz = this.z + Math.cos(this.heading) * this.speed * dt;
    if (Math.abs(nx) < WORLD.half - 6 && Math.abs(nz) < WORLD.half - 6) { this.x = nx; this.z = nz; }
    else { this.heading += Math.PI; this.ai.dir *= -1; }
    this._syncMesh(dt);
  }
  damage(amount) { this.hp -= amount; if (this.hp <= 0) this.dead = true; }
  explode(scene, parts) { /* particles spawned by combat.js */ }
  remove() { this.scene.remove(this.mesh); }
}
