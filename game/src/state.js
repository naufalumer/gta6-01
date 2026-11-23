import { districtAt } from './config.js';

export class GameState {
  constructor(game) {
    this.game = game;
    this.mode = 'title'; // title | playing | paused | map | busted | wasted
    this.lastDistrict = null;
    this.respawnPoint = { x: -40, z: 40 };
  }
  startGame(fresh) {
    const g = this.game;
    if (fresh) {
      g.player.cash = 150; g.player.rep = 0;
      g.player.x = -40; g.player.z = 40; g.player.y = 0;
      g.player.health = 100; g.player.armor = 0;
      g.missions.idx = 0;
    }
    this.mode = 'playing';
    g.hud.showMenu(null);
    g.audio.ensure();
    g.audio.ambienceStart();
    g.audio.radioStart();
    if (fresh) {
      g.missions.startMission(0);
      g.hud.dialog('LENA CROSS', 'Rico. Three years, and you walk back in like nothing happened. The Syndicate owns the port now — Kane’s boys, Kane’s cops. We take it back job by job. First: meet me at the hideout marker.');
    } else {
      g.hud.feed('Welcome back to Azura Bay.');
    }
  }
  pause() {
    if (this.mode !== 'playing') return;
    this.mode = 'paused';
    this.game.hud.showMenu('pause');
    this.game.input.unlockPointer();
  }
  resume() {
    if (this.mode !== 'paused') return;
    this.mode = 'playing';
    this.game.hud.showMenu(null);
  }
  openMap() {
    if (this.mode !== 'playing') return;
    this.mode = 'map';
    this.game.hud.mapOpen = true;
    this.game.hud.drawBigMap();
    this.game.hud.refresh();
    this.game.input.unlockPointer();
  }
  closeMap() {
    if (this.mode !== 'map') return;
    this.mode = 'playing';
    this.game.hud.mapOpen = false;
    this.game.hud.refresh();
  }
  busted() {
    const g = this.game, p = g.player;
    const lost = Math.min(p.cash, Math.floor(p.cash * 0.15) + 50);
    p.cash -= lost;
    g.economy.stats.starsLost += g.police.wanted;
    g.police.clearWanted();
    if (g.missions.active) g.missions.failMission('busted by Bay PD');
    this.mode = 'busted';
    g.hud.showMenu('busted');
    document.getElementById('bustedtext').textContent =
      'Bay PD took $' + lost + ' off you. The heat is off — for now.';
    g.input.unlockPointer();
    g.audio.sirenSet(false);
  }
  wasted() {
    const g = this.game, p = g.player;
    const lost = Math.min(p.cash, 100);
    p.cash -= lost;
    g.economy.stats.starsLost += g.police.wanted;
    g.police.clearWanted();
    if (g.missions.active) g.missions.failMission('wasted');
    this.mode = 'wasted';
    g.hud.showMenu('wasted');
    document.getElementById('wastedtext').textContent =
      'Azura General patched you up (-$' + lost + '). The Bay is still yours to take.';
    g.input.unlockPointer();
    g.audio.sirenSet(false);
  }
  respawn(kind) {
    const g = this.game, p = g.player;
    p.health = 100;
    p.armor = 0;
    p.mode = 'foot';
    p.vehicle = null;
    p.mesh.group.visible = true;
    if (kind === 'busted') { p.x = 80; p.z = -40; } // Bay PD precinct
    else { p.x = -120; p.z = 200; } // Azura General hospital
    p.y = 0; p.z = p.z;
    p.mesh.group.position.set(p.x, 0, p.z);
    g.combat.clearEnemies();
    this.mode = 'playing';
    g.hud.showMenu(null);
    g.economy.save(p, g);
  }
  update(dt) {
    const g = this.game, p = g.player;
    if (this.mode !== 'playing') return;
    const d = districtAt(p.x, p.z);
    if (d && d.id !== this.lastDistrict) {
      this.lastDistrict = d.id;
      g.hud.districtToast(d.name);
    }
  }
}
