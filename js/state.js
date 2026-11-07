// Tunable layout, palette, and runtime flags for the desert station.
// Distances are meters. Y is up. The road runs along X; +Z is the near shoulder.

export const VERSION = "1.4.0";

export const PALETTE = {
  sky: 0x243044,
  sand: 0xcbb892,
  sandFar: 0xe6dece,
  parcel: 0xe0d4c2,
  parcelSoft: 0xe7decc,
  road: 0x3e3b38,
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
  pole: 0x4a4641,
  wire: 0x7a756e,
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
  hillBottom: 0x9a948a,
  hillTop: 0xc5bfb4,
  fog: 0x6a5348,
  ambient: 0x8eacc8,
  sun: 0xffc49a,
};

export const WORLD = {
  // Hills sit on a disc shifted toward the default camera so the far rim
  // is the horizon and the near rim stays outside the opening frame.
  hillCenter: { x: 280.8, z: 209 },
  hillRadius: 400,
  groundRadius: 404,
  roadLength: 220,
  roadWidth: 2.85,
  target: { x: -2.2, y: 1.15, z: -10.2 },
  camera: {
    radius: 18,
    polar: 1.36,
    azimuth: 0.95,
    fov: 42,
    near: 0.15,
    far: 900,
    minPolar: 0.55,
    maxPolar: 1.48,
    minRadius: 5.5,
    maxRadius: 70,
  },
  light: {
    dir: { x: 0.98, y: -0.64, z: -0.19 },
    intensity: 2.4,
    ambient: 0.72,
    mapSize: 2048,
    extent: 28,
    bias: -0.0004,
    normalBias: 0.02,
    radius: 0.6,
    blurSamples: 3,
  },
  fog: { near: 70, far: 190 },
  apron: { x: 1.5, z: -6.1, w: 14.5, d: 8.2, r: 3.5 },
  canopy: { x: -2.304, z: -7.699, yaw: 1.792, w: 5.2, d: 4.05, top: 2.42, fascia: 0.46 },
  shop: { x: -2.07, z: -11.4, yaw: -2.19, w: 4.8, d: 3.15, h: 2.55, roof: 2.71 },
  sign: { x: -4.15, z: -8.6, yaw: 0.95, h: 3.55, w: 2.05, t: 1.05 },
  pumps: [
    { x: -5.5, z: -8.0 },
    { x: -2.6, z: -10.2 },
  ],
  pole: {
    z: 1.82,
    height: 5.15,
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
