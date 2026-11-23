import { Vehicle } from './vehicles.js';

function placeInCar(game, type, x, z, heading, speed) {
  const p = game.player;
  const v = new Vehicle(game.scene, type, x, z, heading);
  v.speed = speed;
  game.vehicles.push(v);
  p.vehicle = v;
  p.mode = v.cfg.kind;
  p.x = x; p.z = z;
  p.mesh.group.visible = false;
  return v;
}

export function setupShot(game, name) {
  const p = game.player;
  const set = (fn) => fn();
  let keep = null;
  if (name === 'chase') {
    game.time.setHour(18.2);
    placeInCar(game, 'sport', 80, 40, 0, 28);
    keep = () => { if (p.vehicle) p.vehicle.speed = 28; };
    const block1 = new Vehicle(game.scene, 'copcar', 74, 220, Math.PI, { isCop: true });
    const block2 = new Vehicle(game.scene, 'copcar', 86, 220, Math.PI, { isCop: true });
    game.vehicles.push(block1);
    game.vehicles.push(block2);
    game.police.addHeat(3);
    game.police.update(0.1, { player: p, vehicles: game.vehicles, audio: game.audio, onBusted: () => {}, onCopShot: () => {} });
    game.police.update(0.1, { player: p, vehicles: game.vehicles, audio: game.audio, onBusted: () => {}, onCopShot: () => {} });
    for (const rb of game.police.roadblocks) for (const v of rb) v.remove();
    game.police.roadblocks = [];
    game.police._placeRoadblock = () => {};
    for (const u of game.police.units) {
      if (u.kind === 'car') {
        u.veh.x = p.x + (Math.random() - 0.5) * 14;
        u.veh.z = p.z - 85 - Math.random() * 25;
        u.veh.heading = 0;
        u.veh.speed = 24;
        u.x = u.veh.x; u.z = u.veh.z;
      }
    }
    game.hud.feed('BAY PD: all units, pursuit on Neon Row — Vortex GT, heading north.');
    game.hud.dialog('DISPATCH', 'All units, suspect in a red Vortex GT, three stars. Air One is overhead. Box him in at the next intersection.');
    game.missions.startMission(4, false);
    game.missions.active = false; // keep free-roam HUD, not the race
    game.hud.showMissionCard('WANTED ★★★', 'Lose the heat or outrun it.', '');
    set(() => { p.vehicle.nitro = 0; });
  } else if (name === 'street') {
    game.time.setHour(20.5);
    p.x = -80; p.z = -88; p.y = 0;
    p.heading = 0;
    p.camYaw = 0;
    p.mesh.group.position.set(p.x, 0, p.z);
    const near = [[-74, -100], [-86, -108], [-70, -96]];
    game.peds.peds.slice(0, 3).forEach((pd, i) => {
      pd.x = near[i][0]; pd.z = near[i][1];
      pd.mesh.group.position.set(pd.x, 0, pd.z);
    });
    const tc = game.traffic[0];
    if (tc) { tc.x = -84; tc.z = -130; tc.heading = Math.PI; tc.speed = 8; }
    game.hud.feed('Seaglass Beach — the strip never sleeps.');
    game.hud.dialog('LENA CROSS', 'The Gull’s lit up tonight. Kane’s money moves through that casino — and we’re going to follow it.');
  } else if (name === 'mission') {
    game.time.setHour(9.0);
    p.x = 215; p.z = 415; p.y = 0;
    p.heading = 0;
    p.camYaw = 0;
    p.setWeapon('fists');
    p.mesh.group.position.set(p.x, 0, p.z);
    const truck = new Vehicle(game.scene, 'truck', 120, 360, Math.PI / 2);
    game.vehicles.push(truck);
    for (let i = 0; i < 4; i++) {
      const a = (i / 4) * Math.PI * 2;
      game.combat.spawnEnemy(200 + Math.sin(a) * 12, 400 + Math.cos(a) * 12);
    }
    game.missions.idx = 5;
    game.missions.startMission(5, false);
    game.missions.step = 0;
    game.missions._setupStep();
    keep = () => { p.health = 100; };
    game.hud.dialog('LENA CROSS', 'Pier 12. Six guards, one shipment, every cop in the Bay on the other end of the radio. Take it.');
  } else if (name === 'title') {
    game.time.setHour(17.6);
    game.camera.position.set(-320, 60, -260);
    game.camera.lookAt(0, 12, 0);
    game.state.mode = 'title';
    game.hud.showMenu('title');
    const title = document.getElementById('title');
    title.style.background = 'radial-gradient(ellipse at 50% 30%, rgba(20,60,110,.55), rgba(4,10,20,.82))';
  }
  let frames = 0;
  const tick = () => {
    frames++;
    if (keep) keep();
    if (frames > 100) {
      window.__shotReady = true;
      return;
    }
    requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
}
