export const WORLD = {
  half: 440,
  roadStep: 80,
  roadWidth: 14,
  block: 66,
  seaX: -360,
  waterX: -430,
  timeScale: 1,
};

export const ROADS = [];
for (let i = -4; i <= 4; i++) ROADS.push(i * WORLD.roadStep);

export const DISTRICTS = [
  { id: 'beach',   name: 'Seaglass Beach', color: '#ffd28a', x0: -440, z0: -440, x1: -280, z1: 440,  stand: 20 },
  { id: 'neon',    name: 'Sundial Square', color: '#ff5fa2', x0: -280, z0: -160, x1: 40,   z1: 160,  stand: 10 },
  { id: 'port',    name: 'Saltflats Port', color: '#8fd0ff', x0: -280, z0: 280,  x1: 440,  z1: 440,  stand: 10 },
  { id: 'hills',   name: 'Palm Heights',   color: '#b6f09a', x0: 40,   z0: -440, x1: 440,  z1: -160, stand: 10 },
  { id: 'oldtown', name: 'Old Cannery',    color: '#d8c49a', x0: 40,   z0: -160, x1: 440,  z1: 280,  stand: 10 },
];

export function districtAt(x, z) {
  for (const d of DISTRICTS) if (x >= d.x0 && x < d.x1 && z >= d.z0 && z < d.z1) return d;
  return DISTRICTS[1];
}

export const VEHICLES = {
  sedan:  { name: 'Marlin S',     kind: 'car',  top: 30, accel: 16, brake: 26, grip: 7.5,  hp: 100, seats: 4, color: 0x3fa9f5 },
  sport:  { name: 'Vortex GT',    kind: 'car',  top: 42, accel: 24, brake: 30, grip: 9.0,  hp: 80,  seats: 2, color: 0xff5f6d },
  truck:  { name: 'Hauler',       kind: 'car',  top: 24, accel: 10, brake: 20, grip: 6.0,  hp: 220, seats: 2, color: 0xd8a24a },
  van:    { name: 'Courier Van',  kind: 'car',  top: 27, accel: 13, brake: 22, grip: 6.5,  hp: 130, seats: 2, color: 0x9aa5b1 },
  bike:   { name: 'Hornet 600',   kind: 'bike', top: 40, accel: 26, brake: 30, grip: 10.5, hp: 50,  seats: 1, color: 0x7cf2a8 },
  heli:   { name: 'Seagull H-4',  kind: 'heli', top: 34, accel: 14, brake: 18, grip: 5.0,  hp: 160, seats: 4, color: 0xf5f0e6 },
  copcar: { name: 'Interceptor',  kind: 'car',  top: 38, accel: 22, brake: 30, grip: 9.5,  hp: 120, seats: 2, color: 0x1c2733 },
  copter: { name: 'Air One',      kind: 'heli', top: 30, accel: 12, brake: 16, grip: 5.0,  hp: 200, seats: 2, color: 0x22303e },
};

export const WEAPONS = {
  fists:  { name: 'Fists',       dmg: 12, rate: 0.45, range: 2.2,  mag: Infinity, auto: false, spread: 0 },
  pistol: { name: 'P9 Pistol',   dmg: 26, rate: 0.28, range: 55,   mag: 12, auto: false, spread: 0.02 },
  smg:    { name: 'Ripper SMG',  dmg: 16, rate: 0.09, range: 45,   mag: 30, auto: true,  spread: 0.06 },
  shotgun:{ name: 'Breacher 12', dmg: 14, rate: 0.85, range: 26,   mag: 6,  auto: false, spread: 0.14, pellets: 6 },
};

export const SHOP = {
  pistol: { price: 350, label: 'P9 Pistol' },
  smg:    { price: 1200, label: 'Ripper SMG' },
  shotgun:{ price: 900, label: 'Breacher 12' },
  ammo:   { price: 60, label: 'Ammo box (+60 rounds)' },
  armor:  { price: 250, label: 'Kevlar vest (+50 armor)' },
  repair: { price: 150, label: 'Full repair' },
  nitro:  { price: 800, label: 'Nitro kit (+50% boost)' },
  engine: { price: 1500, label: 'Engine tune (+15% top speed)' },
};

export const CREW = [
  { id: 'lena', name: 'Lena Cross', role: 'Hacker', unlock: 1,
    bonus: 'Police scanner: cops on minimap, wanted rises 25% slower',
    apply: (g) => { g.wantedGainMul = 0.75; g.scanner = true; } },
  { id: 'tank', name: 'Tank Reyes', role: 'Mechanic', unlock: 2,
    bonus: 'Field repairs: your car slowly self-repairs, shop repairs half price',
    apply: (g) => { g.autoRepair = true; g.repairMul = 0.5; } },
  { id: 'mira', name: 'Mira Solano', role: 'Driver', unlock: 4,
    bonus: 'Getaway pro: nitro lasts 50% longer, wanted cools down faster',
    apply: (g) => { g.nitroMul = 1.5; g.coolMul = 1.6; } },
];

export const FISH = [
  { name: 'Mackerel',      price: 15,  weight: [0.5, 0.62] },
  { name: 'Red Snapper',   price: 40,  weight: [0.22, 0.3] },
  { name: 'Golden Koi',    price: 120, weight: [0.05, 0.08] },
];

export const MISSIONS = [
  { id: 1, title: 'Welcome Back', giver: 'Lena Cross', pay: 400, rep: 12,
    brief: 'Three years away. Lena waits at the hideout — get there, on foot or in something borrowed.',
    steps: [
      { type: 'goto', x: -40, z: 40, r: 8, text: 'Meet Lena at the hideout' },
      { type: 'goto', x: -120, z: -40, r: 8, text: 'Drive the getaway sedan to the garage' },
    ] },
  { id: 2, title: 'Hot Wheels', giver: 'Tank Reyes', pay: 700, rep: 14,
    brief: 'Tank needs a Vortex GT, cash, no questions. One sits outside the casino. Take it.',
    steps: [
      { type: 'steal', veh: 'sport', x: 0, z: 80, r: 10, text: 'Steal the Vortex GT' },
      { type: 'deliver', x: 200, z: 320, r: 9, text: 'Deliver it to Tank’s garage (Port)' },
    ] },
  { id: 3, title: 'Beachfront Shakedown', giver: 'Lena Cross', pay: 900, rep: 16,
    brief: 'Kane’s boys skim the Beachfront shops. Collect from three of them. Expect trouble at the third.',
    steps: [
      { type: 'collect', x: -320, z: -200, r: 7, text: 'Collect from the surf shop' },
      { type: 'collect', x: -320, z: 120, r: 7, text: 'Collect from the bait shop' },
      { type: 'kill', n: 3, x: -320, z: 300, r: 26, text: 'Syndicate muscle showed up — deal with them' },
      { type: 'collect', x: -320, z: 300, r: 7, text: 'Collect from the arcade' },
    ] },
  { id: 4, title: 'Neon Run', giver: 'Mira Solano', pay: 1200, rep: 18,
    brief: 'Mira’s midnight circuit: five checkpoints, every district, no cops invited. Beat the clock.',
    steps: [
      { type: 'race', points: [[-160, 0], [0, -120], [160, -40], [120, 200], [-40, 200]], time: 150, text: 'Hit all 5 checkpoints before the clock runs out' },
    ] },
  { id: 5, title: 'Harbor Lights', giver: 'Tank Reyes', pay: 1800, rep: 22,
    brief: 'A Hauler full of Kane’s cargo sits in the port. Take it to the Old Town warehouse.',
    steps: [
      { type: 'steal', veh: 'truck', x: 120, z: 360, r: 10, text: 'Steal the Hauler at the port' },
      { type: 'deliver', x: 320, z: 120, r: 9, text: 'Deliver the Hauler to the Old Town warehouse' },
    ] },
  { id: 6, title: 'The Kane Job', giver: 'Lena Cross', pay: 3500, rep: 30,
    brief: 'Tonight the Syndicate moves money through Pier 12. Hit the guards, take it, get out.',
    steps: [
      { type: 'kill', n: 6, x: 200, z: 400, r: 34, text: 'Clear the Pier 12 guards' },
      { type: 'collect', x: 240, z: 400, r: 8, text: 'Grab the shipment' },
      { type: 'escape', x: -40, z: 40, r: 10, text: 'Lose the heat and reach the hideout' },
    ] },
];

export const SIDE_JOBS = {
  courier: { pay: 180, time: 75, label: 'Courier run' },
  race:    { pay: 500, time: 90, label: 'Street race' },
  fish:    { pay: 0, label: 'Fishing' },
  hoops:   { pay: 300, label: 'Streetball challenge' },
};

export const SAVE_KEY = 'azura-bay-save-v1';
export const START_CASH = 150;
