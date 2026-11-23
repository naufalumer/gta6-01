import * as THREE from 'three';
import { FISH, SHOP } from './config.js';
import { clamp, range, pick } from './random.js';

export class Activities {
  constructor(scene, ctx) {
    this.scene = scene;
    this.ctx = ctx; // {player, audio, hud, economy, save, markers}
    this.fish = { phase: 'idle', t: 0, needle: 0.5, dir: 1, progress: 0, caught: 0, lastCatch: '' };
    this.bobber = new THREE.Mesh(new THREE.SphereGeometry(0.28, 10, 8),
      new THREE.MeshLambertMaterial({ color: 0xff4040 }));
    this.bobber.visible = false;
    scene.add(this.bobber);
    this.hoop = { phase: 'idle', score: 0, streak: 0, best: 0, timer: 0, power: 0, charging: false,
      ball: null, ballVel: null, made: 0, shots: 0, active: false };
    this.ball = new THREE.Mesh(new THREE.SphereGeometry(0.32, 12, 10),
      new THREE.MeshLambertMaterial({ color: 0xe8641c }));
    this.ball.position.set(-340, 0.32, 60);
    scene.add(this.ball);
    this.hoopTarget = -1; // which hoop (0 west, 1 east)
    this.slot = { open: false, spinning: false, reels: ['7', '7', '7'], t: 0, result: '' };
    this.shop = { open: false, type: null };
    const pad = ctx.markers.jetpack;
    const jp = new THREE.Group();
    const tank = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.8, 0.3),
      new THREE.MeshLambertMaterial({ color: 0xd8d8d8 }));
    jp.add(tank);
    const stripe = new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.15, 0.32),
      new THREE.MeshLambertMaterial({ color: 0xff9d00 }));
    stripe.position.y = 0.15;
    jp.add(stripe);
    jp.position.set(pad[0], 0.8, pad[1]);
    scene.add(jp);
    this.jetpackProp = jp;
    this.jetpackTaken = false;
  }
  interactables(player) {
    const list = [];
    const m = this.ctx.markers;
    const near = (x, z, r) => Math.hypot(player.x - x, player.z - z) < r;
    if (player.mode === 'foot') {
      if (near(m.pierEnd[0], m.pierEnd[1], 4)) list.push({ id: 'fish', label: 'Fish at Pier 9' });
      if (near(m.court[0], m.court[1], 6)) list.push({ id: 'hoops', label: 'Play streetball (60s challenge)' });
      if (near(m.casino[0], m.casino[1], 6)) list.push({ id: 'slots', label: 'Golden Gull slots — $25 a spin' });
      if (near(m.garage[0], m.garage[1], 6)) list.push({ id: 'garage', label: 'Tideworks Customs — upgrades & gear' });
      if (near(m.gunshop[0], m.gunshop[1], 6)) list.push({ id: 'gunshop', label: 'Ammo & weapons — Dockside Arms' });
      if (!this.jetpackTaken && near(m.jetpack[0], m.jetpack[1], 4)) list.push({ id: 'jetpack', label: 'Pick up the jetpack' });
      if (near(m.hideout[0], m.hideout[1], 5)) list.push({ id: 'courier', label: 'Take a courier job' });
    }
    if (player.mode === 'car' || player.mode === 'bike') {
      if (near(m.garage[0], m.garage[1], 8)) list.push({ id: 'garage', label: 'Tideworks Customs — upgrades & gear' });
    }
    return list;
  }
  doInteract(id, player) {
    const { audio, hud } = this.ctx;
    if (id === 'fish') { this.startFishing(player); }
    else if (id === 'hoops') { this.startHoops(player); }
    else if (id === 'slots') { this.slot.open = true; this.slot.result = 'Press SPIN — $25 a go.'; hud.refresh(); }
    else if (id === 'garage' || id === 'gunshop') { this.shop.open = true; this.shop.type = id; hud.refresh(); }
    else if (id === 'jetpack') {
      this.jetpackTaken = true;
      this.jetpackProp.visible = false;
      player.equipJetpack(true);
      player.mode = 'jetpack';
      audio.itemGet();
      hud.feed('Jetpack equipped — hold SPACE to thrust, WASD to steer. Land to refuel.');
    }
    else if (id === 'courier') { this.ctx.missions.startCourier(); }
  }
  closeOverlays() { this.slot.open = false; this.shop.open = false; this.ctx.hud.refresh(); }
  startFishing(player) {
    player.mode = 'fishing';
    this.fish = { phase: 'cast', t: 0, needle: 0.5, dir: 1, progress: 0, caught: this.fish.caught, lastCatch: '' };
    this.bobber.position.set(-455, 0.4, 0);
    this.bobber.visible = true;
    this.ctx.audio.splash();
    this.ctx.hud.feed('Line out… wait for the bite.');
  }
  stopFishing(player) {
    player.mode = 'foot';
    this.fish.phase = 'idle';
    this.bobber.visible = false;
  }
  updateFishing(dt, input, player) {
    const f = this.fish;
    f.t += dt;
    if (f.phase === 'cast' && f.t > 0.9) { f.phase = 'wait'; f.t = 0; f.waitFor = range(Math.random, 2, 6); }
    else if (f.phase === 'wait' && f.t > f.waitFor) {
      f.phase = 'bite'; f.t = 0;
      this.ctx.audio.biteAlert();
      this.ctx.combat.parts.burst(-455, 0.4, 0, 0x8fd0ff, 8, 3, 0.5, 4);
    } else if (f.phase === 'bite') {
      if (input.mouseClicked || input.hit('Space')) { f.phase = 'reel'; f.t = 0; this.ctx.audio.reelTick(); }
      else if (f.t > 1.4) { f.phase = 'wait'; f.t = 0; f.waitFor = range(Math.random, 2, 5); }
    } else if (f.phase === 'reel') {
      f.needle += f.dir * dt * (0.9 + Math.random() * 0.4);
      if (f.needle > 1) { f.needle = 1; f.dir = -1; }
      if (f.needle < 0) { f.needle = 0; f.dir = 1; }
      const inZone = f.needle > 0.35 && f.needle < 0.65;
      const holding = input.mouseHeld || input.key('Space');
      if (inZone && holding) f.progress += dt * 0.55;
      else if (inZone) f.progress += dt * 0.18;
      else f.progress -= dt * 0.25;
      if (holding && Math.random() < dt * 6) this.ctx.audio.reelTick();
      if (f.progress >= 1) {
        const roll = Math.random();
        let caught = FISH[0];
        let acc = 0;
        for (const ft of FISH) { acc += ft.weight[1] - ft.weight[0] + 0.2; if (roll < acc) { caught = ft; break; } }
        if (Math.random() < 0.08) caught = FISH[2];
        else if (Math.random() < 0.3) caught = FISH[1];
        else caught = FISH[0];
        player.cash += caught.price;
        f.caught++;
        f.lastCatch = caught.name + ' — sold for $' + caught.price;
        this.ctx.audio.cash();
        this.ctx.hud.feed('Caught a ' + caught.name + '! +$' + caught.price);
        f.phase = 'wait'; f.t = 0; f.waitFor = range(Math.random, 1.5, 4); f.progress = 0;
        this.ctx.save();
      } else if (f.progress <= -0.4) {
        f.phase = 'wait'; f.t = 0; f.waitFor = range(Math.random, 2, 5); f.progress = 0;
        this.ctx.hud.feed('It got away…');
      }
    }
    this.bobber.position.y = 0.4 + Math.sin(performance.now() / 300) * 0.08;
    if (input.hit('Escape') || input.hit('KeyQ')) this.stopFishing(player);
  }

  startHoops(player) {
    player.mode = 'hoops';
    this.hoop = { phase: 'idle', score: 0, streak: 0, best: this.hoop.best, timer: 60, power: 0,
      charging: false, ball: 'hands', ballVel: null, made: 0, shots: 0, active: true };
    this.hoopTarget = player.x < -340 ? 1 : 0; // shoot at the far hoop
    this.ball.position.set(player.x, 1.1, player.z);
    this.ctx.hud.feed('Streetball challenge: 60 seconds, make as many as you can. Hold CLICK to charge, release to shoot.');
    this.ctx.audio.pickup();
  }
  stopHoops(player, award = true) {
    const h = this.hoop;
    if (award && h.active && h.score >= 5) {
      player.cash += 300;
      player.rep += 6;
      this.ctx.audio.cash();
      this.ctx.hud.feed('Streetball: ' + h.score + ' buckets — +$300, +6 REP');
    } else if (h.active) {
      this.ctx.hud.feed('Streetball: ' + h.score + ' buckets. 5+ pays $300.');
    }
    h.active = false;
    player.mode = 'foot';
    this.ball.position.set(-340, 0.32, 60);
    this.ctx.save();
  }
  updateHoops(dt, input, player) {
    const h = this.hoop;
    if (!h.active) return;
    h.timer -= dt;
    if (h.timer <= 0) { this.stopHoops(player); return; }
    if (h.ball === 'hands') {
      this.ball.position.set(player.x + Math.sin(player.heading) * 0.5, 1.15, player.z + Math.cos(player.heading) * 0.5);
      if (input.mouseDown && !h.charging) { h.charging = true; h.power = 0; }
      if (h.charging) {
        h.power = clamp(h.power + dt * 1.4, 0, 1);
        if (h.power >= 1) h.charging = false; // overcharged: auto-release
        if (!input.mouseDown || h.power >= 1) {
          this._shootBall(player, h);
        }
      }
    } else if (h.ball === 'flying') {
      const v = h.ballVel;
      v.y -= 14 * dt;
      this.ball.position.x += v.x * dt;
      this.ball.position.y += v.y * dt;
      this.ball.position.z += v.z * dt;
      const hoopX = this.hoopTarget === 0 ? -354 : -326;
      const dx = this.ball.position.x - hoopX, dz = this.ball.position.z - 60;
      const dRim = Math.hypot(dx, dz);
      if (this.ball.position.y <= 3.6 && this.ball.position.y > 3.2 && dRim < 0.5 && v.y < 0) {
        h.made++; h.score++; h.streak++;
        h.best = Math.max(h.best, h.streak);
        this.ctx.audio.swish();
        this.ctx.audio.score();
        this.ctx.hud.feed(h.streak > 1 ? 'Bucket! Streak x' + h.streak : 'Bucket!');
        h.ball = 'scored';
        h.t = 0;
      } else if (this.ball.position.y <= 0.32) {
        this.ctx.audio.bounce();
        if (Math.abs(v.y) > 3) { v.y = Math.abs(v.y) * 0.45; v.x *= 0.7; v.z *= 0.7; this.ball.position.y = 0.32; }
        else { h.ball = 'loose'; h.t = 0; }
      }
    } else if (h.ball === 'scored' || h.ball === 'loose') {
      h.t = (h.t || 0) + dt;
      if (h.ball === 'scored' && this.ball.position.y > 0.32) {
        this.ball.position.y = Math.max(0.32, this.ball.position.y - 6 * dt);
      }
      if (h.t > 0.9) {
        h.ball = 'hands';
        h.streak = h.ball === 'scored' ? h.streak : 0;
        if (h.ball !== 'scored') h.streak = 0;
        this.ball.position.set(player.x, 1.1, player.z);
      }
    }
    if (input.hit('Escape')) this.stopHoops(player, false);
  }
  _shootBall(player, h) {
    h.charging = false;
    h.shots++;
    const hoopX = this.hoopTarget === 0 ? -354 : -326;
    const dx = hoopX - player.x, dz = 60 - player.z;
    const dist = Math.hypot(dx, dz);
    const ideal = clamp(0.45 + dist / 60, 0.45, 0.95);
    const err = Math.abs(h.power - ideal);
    const accuracy = clamp(1 - err * 2.2, 0.15, 1);
    const T = 0.9;
    const vx = dx / T + (Math.random() - 0.5) * (1 - accuracy) * 6;
    const vz = dz / T + (Math.random() - 0.5) * (1 - accuracy) * 6;
    const vy = (3.6 - 1.15 + 0.5 * 14 * T * T) / T;
    h.ballVel = new THREE.Vector3(vx, vy, vz);
    h.ball = 'flying';
    this.ctx.audio.bounce();
  }
  spinSlots(player) {
    if (this.slot.spinning) return;
    if (player.cash < 25) { this.slot.result = 'Not enough cash — $25 a spin.'; return; }
    player.cash -= 25;
    this.slot.spinning = true;
    this.slot.t = 0;
    this.slot.result = 'Spinning…';
    this.ctx.audio.click();
    const roll = Math.random();
    let win = 0;
    let reels = ['7', '7', '7'];
    if (roll < 0.55) { win = 0; reels = [pick(Math.random, ['🍒', '🍋', '⭐']), pick(Math.random, ['🍒', '🍋', '⭐']), pick(Math.random, ['🍒', '🍋', '⭐'])]; }
    else if (roll < 0.8) { win = 50; reels = ['🍒', '🍒', '🍒']; }
    else if (roll < 0.93) { win = 150; reels = ['⭐', '⭐', '⭐']; }
    else { win = 500; reels = ['💎', '💎', '💎']; }
    this.slot.pending = { win, reels };
  }
  updateSlots(dt) {
    if (!this.slot.spinning) return;
    this.slot.t += dt;
    const syms = ['🍒', '🍋', '⭐', '💎', '7'];
    this.slot.reels = [0, 1, 2].map((i) => this.slot.t > 0.5 + i * 0.3 ? this.slot.pending.reels[i] : pick(Math.random, syms));
    if (this.slot.t > 1.4) {
      this.slot.spinning = false;
      this.slot.reels = this.slot.pending.reels;
      const win = this.slot.pending.win;
      if (win > 0) {
        this.ctx.player.cash += win;
        this.slot.result = 'JACKPOT — you won $' + win + '!';
        this.ctx.audio.score();
        this.ctx.audio.cash();
      } else {
        this.slot.result = 'No luck this time. Spin again?';
        this.ctx.audio.click();
      }
      this.ctx.save();
    }
  }
  buy(itemId, player) {
    const item = SHOP[itemId];
    if (!item) return 'Unknown item.';
    const price = this._price(item.price, player);
    if (player.cash < price) return 'Not enough cash — $' + price + ' needed.';
    player.cash -= price;
    const v = player.vehicle;
    if (itemId === 'pistol' || itemId === 'smg' || itemId === 'shotgun') {
      player.ammo[itemId] = (player.ammo[itemId] || 0) + (WEAPONS_AMMO[itemId] || 24);
      player.setWeapon(itemId);
      this.ctx.audio.itemGet();
      return item.label + ' bought — press ' + (itemId === 'pistol' ? '1' : itemId === 'smg' ? '2' : '3') + ' to draw it.';
    }
    if (itemId === 'ammo') {
      for (const k of ['pistol', 'smg', 'shotgun']) player.ammo[k] = (player.ammo[k] || 0) + 20;
      this.ctx.audio.itemGet();
      return 'Ammo restocked (+20 each).';
    }
    if (itemId === 'armor') { player.armor = Math.min(100, player.armor + 50); this.ctx.audio.itemGet(); return 'Kevlar vest fitted (+50 armor).'; }
    if (itemId === 'repair') { if (v) v.hp = v.cfg.hp; this.ctx.audio.itemGet(); return 'Vehicle fully repaired.'; }
    if (itemId === 'nitro') { player.upgrades = player.upgrades || {}; player.upgrades.nitro = true; this.ctx.audio.itemGet(); return 'Nitro kit installed — hold SHIFT in a car for boost.'; }
    if (itemId === 'engine') { player.upgrades = player.upgrades || {}; player.upgrades.engine = true; this.ctx.audio.itemGet(); return 'Engine tuned — +15% top speed on your rides.'; }
    return 'Bought: ' + item.label;
  }
  _price(base, player) {
    const stand = this.ctx.economy.standingFor(player);
    return Math.round(base * (1 - Math.min(stand, 100) / 500));
  }
}
const WEAPONS_AMMO = { pistol: 24, smg: 60, shotgun: 12 };
