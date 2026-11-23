import * as THREE from 'three';
import { WORLD, DISTRICTS, districtAt } from './config.js';
import { mulberry32, range, rangeInt, pick, clamp } from './random.js';

const ROADS = [];
for (let i = -4; i <= 4; i++) ROADS.push(i * WORLD.roadStep);

function worldToPx(v) { return (v + WORLD.half) * (2048 / (WORLD.half * 2)); }

function paintGround() {
  const c = document.createElement('canvas');
  c.width = 2048; c.height = 2048;
  const g = c.getContext('2d');
  const S = 2048 / (WORLD.half * 2);
  const px = (v) => (v + WORLD.half) * S;
  g.fillStyle = '#5a6b52'; g.fillRect(0, 0, 2048, 2048);
  g.fillStyle = '#6b6f66'; g.fillRect(0, 0, 2048, 2048);
  g.fillStyle = '#e8d29a';
  g.fillRect(0, 0, px(-320) - px(-440), 2048);
  g.fillStyle = '#dfc083';
  g.fillRect(px(-352), 0, px(-320) - px(-352), 2048);
  g.fillStyle = '#7d7a72';
  g.fillRect(px(-280), px(280), px(440) - px(-280), px(440) - px(280));
  g.fillStyle = '#9a8f80';
  g.fillRect(px(-120), px(-80), px(40) - px(-120), px(80) - px(-80));
  g.strokeStyle = 'rgba(0,0,0,.18)'; g.lineWidth = 2;
  for (let x = -120; x <= 40; x += 10) { g.beginPath(); g.moveTo(px(x), px(-80)); g.lineTo(px(x), px(80)); g.stroke(); }
  for (let z = -80; z <= 80; z += 10) { g.beginPath(); g.moveTo(px(-120), px(z)); g.lineTo(px(40), px(z)); g.stroke(); }
  g.fillStyle = '#7fa8c8';
  g.beginPath(); g.arc(px(-40), px(0), 12 * S, 0, Math.PI * 2); g.fill();
  g.strokeStyle = '#e8e0d0'; g.lineWidth = 3;
  g.beginPath(); g.arc(px(-40), px(0), 12 * S, 0, Math.PI * 2); g.stroke();
  g.fillStyle = '#2e3138';
  for (const r of ROADS) {
    g.fillRect(px(r - WORLD.roadWidth / 2), 0, WORLD.roadWidth * S, 2048);
    g.fillRect(0, px(r - WORLD.roadWidth / 2), 2048, WORLD.roadWidth * S);
  }
  g.fillStyle = '#9aa0a8';
  for (const r of ROADS) {
    g.fillRect(px(r - WORLD.roadWidth / 2 - 3), 0, 3 * S, 2048);
    g.fillRect(px(r + WORLD.roadWidth / 2), 0, 3 * S, 2048);
    g.fillRect(0, px(r - WORLD.roadWidth / 2 - 3), 2048, 3 * S);
    g.fillRect(0, px(r + WORLD.roadWidth / 2), 2048, 3 * S);
  }
  g.fillStyle = '#d8d23c';
  for (const r of ROADS) {
    for (let v = -WORLD.half; v < WORLD.half; v += 24) {
      g.fillRect(px(r) - 1.5, px(v), 3, 10 * S);
      g.fillRect(px(v), px(r) - 1.5, 10 * S, 3);
    }
  }
  g.fillStyle = '#e8e8e8';
  for (const rx of ROADS) for (const rz of ROADS) {
    for (let k = -3; k <= 3; k++) {
      g.fillRect(px(rx + k * 3) - 2, px(rz - WORLD.roadWidth / 2), 4, 3 * S);
      g.fillRect(px(rx + k * 3) - 2, px(rz + WORLD.roadWidth / 2 - 3), 4, 3 * S);
      g.fillRect(px(rx - WORLD.roadWidth / 2), px(rz + k * 3) - 2, 3 * S, 4);
      g.fillRect(px(rx + WORLD.roadWidth / 2 - 3), px(rz + k * 3) - 2, 3 * S, 4);
    }
  }
  const cx = -340, cz = 60, cw = 28, ch = 15;
  g.fillStyle = '#3f6db5'; g.fillRect(px(cx - cw / 2), px(cz - ch / 2), cw * S, ch * S);
  g.strokeStyle = '#ffffff'; g.lineWidth = 2;
  g.strokeRect(px(cx - cw / 2), px(cz - ch / 2), cw * S, ch * S);
  g.beginPath(); g.arc(px(cx), px(cz), 3 * S, 0, Math.PI * 2); g.stroke();
  g.beginPath(); g.moveTo(px(cx), px(cz - ch / 2)); g.lineTo(px(cx), px(cz + ch / 2)); g.stroke();
  for (const [hx, hz] of [[200, 380], [320, -320]]) {
    g.fillStyle = '#3a3f46';
    g.beginPath(); g.arc(px(hx), px(hz), 11 * S, 0, Math.PI * 2); g.fill();
    g.strokeStyle = '#ffd23f'; g.lineWidth = 3;
    g.beginPath(); g.arc(px(hx), px(hz), 8 * S, 0, Math.PI * 2); g.stroke();
    g.fillStyle = '#ffd23f'; g.font = `bold ${10 * S}px sans-serif`;
    g.textAlign = 'center'; g.textBaseline = 'middle';
    g.fillText('H', px(hx), px(hz));
  }
  const tex = new THREE.CanvasTexture(c);
  tex.anisotropy = 8;
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

export function buildCity(scene) {
  const rng = mulberry32(1337);
  const colliders = [];
  const group = new THREE.Group();
  scene.add(group);

  scene.background = new THREE.Color(0xffc98a);
  scene.fog = new THREE.Fog(0xf2a56b, 180, 620);
  const sun = new THREE.DirectionalLight(0xffb36b, 2.4);
  sun.position.set(-160, 120, 60);
  scene.add(sun);
  const hemi = new THREE.HemisphereLight(0x8fc3ff, 0x5a4a38, 1.1);
  scene.add(hemi);
  const amb = new THREE.AmbientLight(0xffd9a8, 0.35);
  scene.add(amb);

  const ground = new THREE.Mesh(
    new THREE.PlaneGeometry(WORLD.half * 2, WORLD.half * 2),
    new THREE.MeshLambertMaterial({ map: paintGround() })
  );
  ground.rotation.x = -Math.PI / 2;
  group.add(ground);

  const waterMat = new THREE.MeshLambertMaterial({ color: 0x1f7fa8, transparent: true, opacity: 0.92 });
  const water = new THREE.Mesh(new THREE.PlaneGeometry(260, WORLD.half * 2 + 200), waterMat);
  water.rotation.x = -Math.PI / 2;
  water.position.set(WORLD.waterX - 110, 0.12, 0);
  group.add(water);
  const water2Mat = new THREE.MeshLambertMaterial({ color: 0x3fb3d9, transparent: true, opacity: 0.35 });
  const water2 = new THREE.Mesh(new THREE.PlaneGeometry(260, WORLD.half * 2 + 200), water2Mat);
  water2.rotation.x = -Math.PI / 2;
  water2.position.set(WORLD.waterX - 110, 0.22, 0);
  group.add(water2);

  const bGeo = new THREE.BoxGeometry(1, 1, 1);
  const bMat = new THREE.MeshLambertMaterial({ color: 0xffffff });
  const spots = [];
  for (let bx = -4; bx <= 4; bx++) for (let bz = -4; bz <= 4; bz++) {
    const cx = bx * WORLD.roadStep, cz = bz * WORLD.roadStep;
    if (cx < -280) continue;                       // beach strip: no towers
    if (cz > 280 && cx > -280) continue;           // port yard: containers instead
    if (cx > -120 && cx < 40 && cz > -80 && cz < 80) continue; // plaza
    if (Math.abs(cx + 340) < 40 && Math.abs(cz - 60) < 30) continue; // court park
    const d = districtAt(cx, cz);
    const n = d.id === 'neon' ? rangeInt(rng, 2, 4) : rangeInt(rng, 1, 2);
    for (let i = 0; i < n; i++) {
      const w = range(rng, 16, 30), dep = range(rng, 16, 30);
      const ox = range(rng, -14, 14), oz = range(rng, -14, 14);
      const h = d.id === 'neon' ? range(rng, 26, 62)
        : d.id === 'hills' ? range(rng, 8, 14)
        : d.id === 'oldtown' ? range(rng, 9, 18)
        : range(rng, 12, 24);
      spots.push({ x: cx + ox, z: cz + oz, w, d: dep, h, district: d.id });
    }
  }
  const bMesh = new THREE.InstancedMesh(bGeo, bMat, spots.length);
  const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), sc = new THREE.Vector3(), pos = new THREE.Vector3();
  const col = new THREE.Color();
  const palettes = {
    neon: [0x8a6f8e, 0x6f7f8e, 0x9a7f6f, 0x5f6f8e, 0xb08a9a],
    hills: [0xf0e0c8, 0xe8d8b8, 0xd8c8a8, 0xf5e8d0],
    oldtown: [0xb89a78, 0xa88a68, 0xc8a888, 0x9a8a78],
    port: [0x8a8a88, 0x7a7a78, 0x9a9a98],
  };
  spots.forEach((s, i) => {
    pos.set(s.x, s.h / 2, s.z); sc.set(s.w, s.h, s.d);
    m4.compose(pos, q, sc);
    bMesh.setMatrixAt(i, m4);
    col.setHex(pick(rng, palettes[s.district] || palettes.oldtown));
    col.multiplyScalar(range(rng, 0.85, 1.05));
    bMesh.setColorAt(i, col);
    colliders.push({ x0: s.x - s.w / 2, z0: s.z - s.d / 2, x1: s.x + s.w / 2, z1: s.z + s.d / 2, h: s.h });
  });
  bMesh.instanceMatrix.needsUpdate = true;
  if (bMesh.instanceColor) bMesh.instanceColor.needsUpdate = true;
  group.add(bMesh);

  const roofSpots = spots.filter((s) => s.h > 34).slice(0, 24);
  const roofMesh = new THREE.InstancedMesh(bGeo, new THREE.MeshLambertMaterial({ color: 0x5a5a60 }), roofSpots.length);
  roofSpots.forEach((s, i) => {
    pos.set(s.x, s.h + 1.5, s.z); sc.set(s.w * 0.3, 3, s.d * 0.3);
    m4.compose(pos, q, sc);
    roofMesh.setMatrixAt(i, m4);
  });
  roofMesh.instanceMatrix.needsUpdate = true;
  group.add(roofMesh);
  const fountain = new THREE.Group();
  const fBase = new THREE.Mesh(new THREE.CylinderGeometry(10, 11, 1.2, 20),
    new THREE.MeshLambertMaterial({ color: 0xd8d0c0 }));
  fBase.position.y = 0.6;
  const fWater = new THREE.Mesh(new THREE.CylinderGeometry(9, 9, 0.4, 20),
    new THREE.MeshLambertMaterial({ color: 0x3fb3d9 }));
  fWater.position.y = 1.1;
  const fJet = new THREE.Mesh(new THREE.CylinderGeometry(0.8, 1.4, 3, 8),
    new THREE.MeshLambertMaterial({ color: 0xe8e0d0 }));
  fJet.position.y = 2.4;
  fountain.add(fBase, fWater, fJet);
  fountain.position.set(-40, 0, 0);
  group.add(fountain);
  colliders.push({ x0: -51, z0: -11, x1: -29, z1: 11, h: 3 });
  const benchMat = new THREE.MeshLambertMaterial({ color: 0x6a4a2a });
  const planterMat = new THREE.MeshLambertMaterial({ color: 0x4a6a3a });
  for (const [bx, bz, ry] of [[-70, -40, 0], [-10, -40, 0], [-70, 40, 0], [-10, 40, 0], [-90, 0, Math.PI / 2], [10, 0, Math.PI / 2]]) {
    const bench = new THREE.Mesh(new THREE.BoxGeometry(5, 0.5, 1.4), benchMat);
    bench.position.set(bx, 0.6, bz);
    bench.rotation.y = ry;
    group.add(bench);
    const planter = new THREE.Mesh(new THREE.BoxGeometry(2.4, 1.1, 2.4), planterMat);
    planter.position.set(bx + 5, 0.55, bz);
    group.add(planter);
  }
  for (const [px2, pz2] of [[-110, -70], [-110, 70], [30, -70], [30, 70], [-110, 0], [30, 0]]) {
    const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.55, 9, 6),
      new THREE.MeshLambertMaterial({ color: 0x8a6a4a }));
    trunk.position.set(px2, 4.5, pz2);
    const top = new THREE.Mesh(new THREE.ConeGeometry(3.4, 2.6, 7),
      new THREE.MeshLambertMaterial({ color: 0x3f8f4f }));
    top.position.set(px2, 9.6, pz2);
    group.add(trunk, top);
  }

  const palmPos = [];
  for (let z = -420; z <= 420; z += 34) palmPos.push([-332, z + range(rng, -6, 6)]);
  for (let z = -400; z <= 400; z += 48) palmPos.push([-296, z + range(rng, -4, 4)]);
  for (let x = -260; x <= 400; x += 90) palmPos.push([x, -296]);
  const trunkGeo = new THREE.CylinderGeometry(0.35, 0.55, 9, 6);
  const trunkMat = new THREE.MeshLambertMaterial({ color: 0x8a6a4a });
  const trunks = new THREE.InstancedMesh(trunkGeo, trunkMat, palmPos.length);
  const canopyGeo = new THREE.ConeGeometry(3.4, 2.6, 7);
  const canopyMat = new THREE.MeshLambertMaterial({ color: 0x3f8f4f });
  const canopies = new THREE.InstancedMesh(canopyGeo, canopyMat, palmPos.length);
  palmPos.forEach(([x, z], i) => {
    const lean = range(rng, -0.08, 0.08);
    q.setFromEuler(new THREE.Euler(lean, range(rng, 0, Math.PI * 2), lean));
    pos.set(x, 4.5, z); sc.set(1, 1, 1);
    m4.compose(pos, q, sc); trunks.setMatrixAt(i, m4);
    pos.set(x, 9.6, z); sc.set(1, 1, 1);
    m4.compose(pos, q, sc); canopies.setMatrixAt(i, m4);
  });
  trunks.instanceMatrix.needsUpdate = true;
  canopies.instanceMatrix.needsUpdate = true;
  group.add(trunks); group.add(canopies);

  const lampPos = [];
  for (const r of ROADS) for (let v = -360; v <= 360; v += 80) {
    lampPos.push([r + 9, v]); lampPos.push([r - 9, v + 40]);
  }
  const postGeo = new THREE.CylinderGeometry(0.12, 0.16, 6.5, 5);
  const postMat = new THREE.MeshLambertMaterial({ color: 0x2a2e35 });
  const posts = new THREE.InstancedMesh(postGeo, postMat, lampPos.length);
  const bulbGeo = new THREE.SphereGeometry(0.5, 8, 6);
  const bulbMat = new THREE.MeshBasicMaterial({ color: 0xffe9a8 });
  const bulbs = new THREE.InstancedMesh(bulbGeo, bulbMat, lampPos.length);
  lampPos.forEach(([x, z], i) => {
    pos.set(x, 3.25, z); sc.set(1, 1, 1);
    m4.compose(pos, q.identity(), sc); posts.setMatrixAt(i, m4);
    pos.set(x, 6.6, z); sc.set(1, 1, 1);
    m4.compose(pos, q.identity(), sc); bulbs.setMatrixAt(i, m4);
  });
  posts.instanceMatrix.needsUpdate = true;
  bulbs.instanceMatrix.needsUpdate = true;
  group.add(posts); group.add(bulbs);
  const poolCanvas = document.createElement('canvas');
  poolCanvas.width = poolCanvas.height = 128;
  const pc = poolCanvas.getContext('2d');
  const grad = pc.createRadialGradient(64, 64, 4, 64, 64, 64);
  grad.addColorStop(0, 'rgba(255,255,255,0.9)');
  grad.addColorStop(1, 'rgba(255,255,255,0)');
  pc.fillStyle = grad; pc.fillRect(0, 0, 128, 128);
  const poolMat = new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(poolCanvas), color: 0xffd9a0, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false });
  const pools = new THREE.InstancedMesh(new THREE.PlaneGeometry(15, 15), poolMat, lampPos.length);
  lampPos.forEach(([x, z], i) => {
    pos.set(x, 0.18, z); q.setFromEuler(new THREE.Euler(-Math.PI / 2, 0, 0)); sc.set(1, 1, 1);
    m4.compose(pos, q, sc); pools.setMatrixAt(i, m4);
  });
  pools.instanceMatrix.needsUpdate = true;
  group.add(pools);

  const neonMats = [];
  const neonCols = [0xff5fa2, 0x35e0ff, 0xffd23f, 0x7cf2a8, 0xff7a3c];
  const signGeo = new THREE.BoxGeometry(1, 1, 0.4);
  const stripSpots = [];
  for (let x = -240; x <= 0; x += 40) {
    stripSpots.push([x, -76, 0]); stripSpots.push([x, 76, 0]);
    stripSpots.push([x, -156, 0]); stripSpots.push([x, 156, 0]);
  }
  const signMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
  const signs = new THREE.InstancedMesh(signGeo, signMat, stripSpots.length);
  stripSpots.forEach(([x, z], i) => {
    pos.set(x, range(rng, 10, 26), z);
    sc.set(range(rng, 8, 16), range(rng, 1.2, 2.4), 1);
    m4.compose(pos, q.identity(), sc);
    signs.setMatrixAt(i, m4);
    col.setHex(pick(rng, neonCols));
    signs.setColorAt(i, col);
  });
  signs.instanceMatrix.needsUpdate = true;
  if (signs.instanceColor) signs.instanceColor.needsUpdate = true;
  group.add(signs);
  const tubes = [];
  for (let i = 0; i < 10; i++) {
    const mat = new THREE.MeshBasicMaterial({ color: pick(rng, neonCols) });
    const tube = new THREE.Mesh(new THREE.BoxGeometry(0.7, range(rng, 14, 30), 0.7), mat);
    tube.position.set(range(rng, -240, 0), 14, pick(rng, [-84, 84, -164, 164]));
    group.add(tube);
    tubes.push({ mat, phase: rng() * Math.PI * 2, base: 1 });
    neonMats.push(mat);
  }

  const casino = new THREE.Group();
  const cBody = new THREE.Mesh(new THREE.BoxGeometry(46, 30, 30),
    new THREE.MeshLambertMaterial({ color: 0x7a2f5e }));
  cBody.position.y = 15;
  casino.add(cBody);
  const cTop = new THREE.Mesh(new THREE.BoxGeometry(48, 4, 32),
    new THREE.MeshLambertMaterial({ color: 0xd8a24a }));
  cTop.position.y = 32;
  casino.add(cTop);
  const mc = document.createElement('canvas');
  mc.width = 1024; mc.height = 192;
  const mg = mc.getContext('2d');
  mg.fillStyle = '#1a0a24'; mg.fillRect(0, 0, 1024, 192);
  mg.strokeStyle = '#ffd23f'; mg.lineWidth = 8; mg.strokeRect(8, 8, 1008, 176);
  mg.fillStyle = '#ffd23f'; mg.font = 'bold 92px sans-serif';
  mg.textAlign = 'center'; mg.textBaseline = 'middle';
  mg.fillText('★ GOLDEN GULL ★', 512, 100);
  const mtex = new THREE.CanvasTexture(mc);
  mtex.colorSpace = THREE.SRGBColorSpace;
  const marquee = new THREE.Mesh(new THREE.PlaneGeometry(44, 8),
    new THREE.MeshBasicMaterial({ map: mtex }));
  marquee.position.set(0, 24, 15.2);
  casino.add(marquee);
  const marquee2 = marquee.clone();
  marquee2.position.set(0, 24, -15.2);
  marquee2.rotation.y = Math.PI;
  casino.add(marquee2);
  casino.position.set(-80, 0, -120);
  group.add(casino);
  colliders.push({ x0: -103, z0: -135, x1: -57, z1: -105, h: 34 });

  const winGeo = new THREE.PlaneGeometry(2.2, 1.6);
  const winMat = new THREE.MeshBasicMaterial({ color: 0xffd98a });
  const winList = [];
  for (const s of spots) {
    const cols = Math.max(1, Math.floor(s.w / 7));
    const rows = Math.max(1, Math.floor((s.h - 4) / 6));
    for (let f = 0; f < 4; f++) {
      const horiz = f < 2;
      const span = horiz ? s.w : s.d;
      const n = Math.max(1, Math.floor(span / 7));
      for (let cx = 0; cx < n; cx++) for (let ry = 0; ry < rows; ry++) {
        if (rng() < 0.3) continue;
        const u = (cx + 0.5) / n, y = 4 + (ry + 0.5) * 6;
        if (y > s.h - 2) continue;
        if (f === 0) winList.push([s.x - span / 2 + u * span, y, s.z + s.d / 2 + 0.12, 0]);
        else if (f === 1) winList.push([s.x - span / 2 + u * span, y, s.z - s.d / 2 - 0.12, Math.PI]);
        else if (f === 2) winList.push([s.x + s.w / 2 + 0.12, y, s.z - span / 2 + u * span, Math.PI / 2]);
        else winList.push([s.x - s.w / 2 - 0.12, y, s.z - span / 2 + u * span, -Math.PI / 2]);
      }
    }
  }
  const winCount = Math.min(winList.length, 3600);
  const wins = new THREE.InstancedMesh(winGeo, winMat, winCount);
  const wc = new THREE.Color();
  for (let i = 0; i < winCount; i++) {
    const [wx, wy, wz, ry] = winList[i];
    pos.set(wx, wy, wz); q.setFromEuler(new THREE.Euler(0, ry, 0)); sc.set(1, 1, 1);
    m4.compose(pos, q, sc);
    wins.setMatrixAt(i, m4);
    wc.setHex(pick(rng, [0xffd98a, 0xffe9b8, 0x9fd8ff, 0xffb36b, 0x40342a, 0x2a2620]));
    wins.setColorAt(i, wc);
  }
  wins.count = winCount;
  wins.instanceMatrix.needsUpdate = true;
  if (wins.instanceColor) wins.instanceColor.needsUpdate = true;
  group.add(wins);

  const contGeo = new THREE.BoxGeometry(12, 3, 3);
  const contCols = [0xc0392b, 0x2471a3, 0x229954, 0xd4ac0d, 0x7d3c98];
  const contSpots = [];
  for (let x = -200; x <= 400; x += 40) for (let z = 300; z <= 420; z += 40) {
    if (range(rng, 0, 1) < 0.55) contSpots.push([x + range(rng, -6, 6), z + range(rng, -6, 6), rangeInt(rng, 0, 2)]);
  }
  const conts = new THREE.InstancedMesh(contGeo, new THREE.MeshLambertMaterial({ color: 0xffffff }), contSpots.length);
  contSpots.forEach(([x, z, stack], i) => {
    pos.set(x, 1.5 + stack * 3, z); sc.set(1, 1, 1);
    q.setFromEuler(new THREE.Euler(0, pick(rng, [0, Math.PI / 2]), 0));
    m4.compose(pos, q, sc);
    conts.setMatrixAt(i, m4);
    col.setHex(pick(rng, contCols));
    conts.setColorAt(i, col);
    if (stack === 0) colliders.push({ x0: x - 6, z0: z - 1.6, x1: x + 6, z1: z + 1.6, h: 3 });
  });
  conts.instanceMatrix.needsUpdate = true;
  if (conts.instanceColor) conts.instanceColor.needsUpdate = true;
  group.add(conts);
  const craneMat = new THREE.MeshLambertMaterial({ color: 0xd4ac0d });
  for (const cx of [-120, 80, 280]) {
    const crane = new THREE.Group();
    const leg1 = new THREE.Mesh(new THREE.BoxGeometry(2, 34, 2), craneMat); leg1.position.set(-8, 17, 0);
    const leg2 = new THREE.Mesh(new THREE.BoxGeometry(2, 34, 2), craneMat); leg2.position.set(8, 17, 0);
    const beam = new THREE.Mesh(new THREE.BoxGeometry(60, 2.5, 2.5), craneMat); beam.position.set(10, 34, 0);
    const cab = new THREE.Mesh(new THREE.BoxGeometry(6, 5, 5), craneMat); cab.position.set(0, 30, 0);
    crane.add(leg1, leg2, beam, cab);
    crane.position.set(cx, 0, 420);
    group.add(crane);
    colliders.push({ x0: cx - 9, z0: 418, x1: cx + 9, z1: 422, h: 36 });
  }

  const pierMat = new THREE.MeshLambertMaterial({ color: 0x8a6a44 });
  const pier = new THREE.Mesh(new THREE.BoxGeometry(60, 1, 8), pierMat);
  pier.position.set(-430, 0.6, 0);
  group.add(pier);
  for (const px2 of [-412, -428, -444, -458]) {
    const post = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.5, 4, 6), pierMat);
    post.position.set(px2, -0.5, 3.4);
    group.add(post);
    const post2 = post.clone(); post2.position.z = -3.4;
    group.add(post2);
  }
  colliders.push({ x0: -462, z0: -4, x1: -400, z1: -3, h: 2 });
  colliders.push({ x0: -462, z0: 3, x1: -400, z1: 4, h: 2 });

  const hoopMat = new THREE.MeshLambertMaterial({ color: 0xe8641c });
  const boardMat = new THREE.MeshLambertMaterial({ color: 0xf5f5f5 });
  for (const hx of [-340 - 14, -340 + 14]) {
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.18, 4, 6),
      new THREE.MeshLambertMaterial({ color: 0x333333 }));
    pole.position.set(hx, 2, 60);
    group.add(pole);
    const board = new THREE.Mesh(new THREE.BoxGeometry(0.15, 1.2, 1.8), boardMat);
    board.position.set(hx + (hx < -340 ? 0.4 : -0.4), 3.9, 60);
    group.add(board);
    const rim = new THREE.Mesh(new THREE.TorusGeometry(0.45, 0.06, 8, 20), hoopMat);
    rim.rotation.x = Math.PI / 2;
    rim.position.set(hx + (hx < -340 ? 0.9 : -0.9), 3.6, 60);
    group.add(rim);
    colliders.push({ x0: hx - 0.4, z0: 59.6, x1: hx + 0.4, z1: 60.4, h: 4 });
  }

  const markers = {
    garage: [200, 320],
    gunshop: [-120, 120],
    casino: [-80, -104],
    pierEnd: [-455, 0],
    court: [-340, 60],
    helipadPort: [200, 380],
    helipadHills: [320, -320],
    jetpack: [320, -320],
    hideout: [-40, 40],
  };

  let tAcc = 0;
  function update(dt, t) {
    tAcc += dt;
    water2.position.x = WORLD.waterX - 110 + Math.sin(tAcc * 0.6) * 4;
    water2.material.opacity = 0.28 + Math.sin(tAcc * 0.9) * 0.08;
    poolMat.opacity = clamp((bulbMat.color.r - 0.45) * 0.9, 0, 0.32);
  }
  tubes.forEach((tb) => { tb.mat.userData.base = tb.mat.color.getHex(); });

  return { group, colliders, markers, update, neonMats,
    sun, hemi, amb, bulbMat, winMat, signMat, waterMat, water2Mat };
}
