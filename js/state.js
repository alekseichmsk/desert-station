// Tunable layout, palette, and runtime flags for the desert station.
// Distances are meters. Y is up. The road runs along X; +Z is the near shoulder.

export const VERSION = "1.6.1";

export const PALETTE = {
  sky: 0x070d16,
  sand: 0x52463e,
  sandFar: 0x3d342e,
  parcel: 0x5c5248,
  parcelSoft: 0x4e463e,
  road: 0x1c1a19,
  apron: 0xd8d2c6,
  roof: 0xc3c0b8,
  roofShop: 0xbebbb4,
  coral: 0xf39486,
  wall: 0xe4ddd2,
  plinth: 0xe5dfd4,
  window: 0x2c2b28,
  trimDark: 0x6a4038,
  signFrame: 0x5a5a58,
  signFace: 0xb4aea6,
  signPole: 0xb7bec2,
  pole: 0x161412,
  wire: 0x121110,
  shadowPad: 0x6a635c,
  utility: 0xd5d8d4,
  pumpBody: 0xe3e1d8,
  pumpIsland: 0xf0d4c2,
  column: 0x5e5b56,
  bush: 0x6a6e58,
  carTan: 0x8e3a2c,
  carDust: 0xe2dbd0,
  carMist: 0xb7c3c6,
  carClay: 0xd3c1a8,
  glass: 0xd7e3e6,
  tire: 0x4e4c49,
  hub: 0xf3f0ea,
  hillBottom: 0x221c1a,
  hillTop: 0x302824,
  fog: 0x102833,
  ambient: 0x1a2740,
  sun: 0xc5d2e6,
};

export const WORLD = {
  // Hills sit on a disc shifted toward the default camera so the far rim
  // is the horizon and the near rim stays outside the opening frame.
  hillCenter: { x: 280.8, z: 209 },
  hillRadius: 400,
  groundRadius: 404,
  roadLength: 220,
  roadWidth: 2.85,
  target: { x: -0.2, y: 1.9, z: -10.8 },
  camera: {
    radius: 17.5,
    polar: 1.4,
    azimuth: 0.22,
    fov: 42,
    near: 0.12,
    far: 900,
    minPolar: 0.45,
    maxPolar: 1.52,
    minRadius: 3.2,
    maxRadius: 70,
  },
  light: {
    dir: { x: 0.12, y: -0.88, z: -0.46 },
    intensity: 1.15,
    ambient: 0.46,
    mapSize: 2048,
    extent: 16,
    bias: -0.0006,
    normalBias: 0.045,
    radius: 0.6,
    blurSamples: 3,
  },
  fog: { density: 0.0048 },
  apron: { x: -0.4, z: -11.3, w: 18, d: 15, r: 3.2 },
  // Footprint, meters, yaw 0. The shop facade faces +Z, toward the road.
  // Shop outer box: x [-3.6, 3.6], z [-16.6, -12.2], walls to y 2.8, roof to y 2.94.
  // Canopy outer box: x [-4.8, 3.2], z [-11.15, -5.85], deck top y 3.05.
  // Walkway between canopy rear (z -11.15) and shop front (z -12.2) is 1.05m.
  // Pumps are children of the canopy and stand on islands at local y 0.
  station: {
    shop: { x: 0, z: -14.4, w: 7.2, d: 4.4, h: 2.8, wall: 0.16, roof: 0.14 },
    canopy: { x: -0.8, z: -8.5, w: 8, d: 5.3, top: 3.05, deck: 0.1, fascia: 0.42 },
    sign: { x: -6.7, z: -7.3, h: 3.4, w: 2.05, t: 0.92 },
    pumps: [
      { lx: -1.55, lz: 0.28, price: "1.89", grade: 0 },
      { lx: 1.65, lz: -0.15, price: "1.95", grade: 2 },
    ],
  },
  pole: {
    z: -18.2,
    height: 5.4,
    xs: [-13.5, -1.2, 11.5, 24.5, 36.5, 49],
  },
  lanes: {
    nearZ: 0.68,
    farZ: -0.68,
    nearSpeed: 6.15,
    farSpeed: 5.35,
    limit: 95,
  },
  // x along the road. Near lane travels +X, far lane travels -X.
  traffic: [
    { id: "tan", lane: "near", x: 22.5, color: PALETTE.carTan },
    { id: "dust", lane: "near", x: -48, color: PALETTE.carDust },
    { id: "mist", lane: "far", x: 62, color: PALETTE.carMist },
    { id: "clay", lane: "far", x: -28, color: PALETTE.carClay },
  ],
  parcels: [
    { x: 6.5, z: -26, w: 14, d: 9.5, rot: 0.02, color: PALETTE.parcel },
    { x: -16, z: -28, w: 9, d: 7, rot: -0.15, color: PALETTE.parcelSoft },
    { x: 18, z: -8, w: 8, d: 6, rot: 0.1, color: PALETTE.parcelSoft },
    { x: -6, z: 8, w: 10, d: 6, rot: 0.2, color: PALETTE.parcelSoft },
    { x: 6, z: -46, w: 11, d: 6, rot: 0.35, color: PALETTE.parcelSoft },
  ],
};

export const runtime = {
  still: false,
  clean: false,
};
