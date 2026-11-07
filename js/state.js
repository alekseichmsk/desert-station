// Tunable layout, palette, and runtime flags for the desert station.
// Distances are meters. Y is up. The road runs along X; +Z is the near shoulder.

export const VERSION = "1.2.0";

export const PALETTE = {
  sky: 0xe8edf0,
  sand: 0xf1e9d4,
  sandFar: 0xe6dece,
  parcel: 0xe0d4c2,
  parcelSoft: 0xe7decc,
  road: 0xb7b0a6,
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
  carTan: 0xe6d0aa,
  carDust: 0xe2dbd0,
  carMist: 0xb7c3c6,
  carClay: 0xd3c1a8,
  glass: 0xd7e3e6,
  tire: 0x4e4c49,
  hub: 0xf3f0ea,
  hillBottom: 0x9a948a,
  hillTop: 0xc5bfb4,
  fog: 0xe5ddcd,
  ambient: 0xffffff,
  sun: 0xfffdf8,
};

export const WORLD = {
  // Hills sit on a disc shifted toward the default camera so the far rim
  // is the horizon and the near rim stays outside the opening frame.
  hillCenter: { x: 280.8, z: 209 },
  hillRadius: 400,
  groundRadius: 404,
  roadLength: 220,
  roadWidth: 2.85,
  target: { x: -1.646, y: 0.2, z: -10.826 },
  camera: {
    radius: 100,
    // Polar from +Y. Elevation above the horizon is pi/2 - polar.
    polar: 1.18446,
    azimuth: 1.0585,
    viewHeight: 40.31,
    zoom: 1,
    near: 0.15,
    far: 2500,
    minPolar: 0.42,
    maxPolar: 1.28,
    minZoom: 0.42,
    maxZoom: 2.8,
  },
  light: {
    // Sunlight travels +X and -Z so every shadow falls down-right on screen.
    dir: { x: 0.98, y: -0.64, z: -0.19 },
    intensity: 4.4,
    ambient: 1.0,
    mapSize: 4096,
    extent: 32,
    bias: -0.00015,
    normalBias: 0.012,
    radius: 0.35,
    blurSamples: 2,
  },
  fog: { near: 70, far: 190 },
  apron: { x: 1.5, z: -6.1, w: 14.5, d: 8.2, r: 3.5 },
  canopy: { x: -2.304, z: -7.699, yaw: 1.792, w: 4.604, d: 3.868, top: 1.931, fascia: 0.36 },
  shop: { x: -2.07, z: -12.914, yaw: -1.302, w: 2.729, d: 4.651, h: 2.35, roof: 2.757 },
  sign: { x: -5.983, z: -3.495, yaw: 1.896, h: 6.795, w: 3.525, t: 1.02 },
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
