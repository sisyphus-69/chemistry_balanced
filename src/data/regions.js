/**
 * Region definitions for the 5 world map zones.
 * Each region has 10 levels with a unique theme, palette, and node layout.
 * Node positions are stored as fractions (0-1) and scaled to viewport at render time.
 */
export const REGIONS = [
  {
    id: 'green_lab',
    name: 'The Green Lab',
    subtitle: 'Synthesis',
    levels: [1, 10],
    palette: {
      bg: 0x0a1a0a,
      bgLight: 0x142a14,
      path: 0x2a5a2a,
      pathDot: 0x44884a,
      accent: 0x00ff88,
      accentHex: '#00ff88',
      text: '#88ffaa',
      textDim: '#447755',
      border: 0x337744,
      node: 0x1a3a1a,
      nodeComplete: 0x00cc66,
      nodeCurrent: 0x44ffaa,
      nodeLocked: 0x111a11
    },
    decorations: 'lab',
    nodes: [
      { x: 0.12, y: 0.82 }, { x: 0.25, y: 0.68 }, { x: 0.40, y: 0.75 },
      { x: 0.55, y: 0.62 }, { x: 0.70, y: 0.70 }, { x: 0.82, y: 0.55 },
      { x: 0.70, y: 0.40 }, { x: 0.50, y: 0.35 }, { x: 0.30, y: 0.42 },
      { x: 0.50, y: 0.18 }
    ]
  },
  {
    id: 'volcanic_forge',
    name: 'Volcanic Forge',
    subtitle: 'Decomposition',
    levels: [11, 20],
    palette: {
      bg: 0x1a0808,
      bgLight: 0x2a1410,
      path: 0x6a3a2a,
      pathDot: 0x995533,
      accent: 0xff6622,
      accentHex: '#ff6622',
      text: '#ffaa66',
      textDim: '#774422',
      border: 0x884422,
      node: 0x3a1a0a,
      nodeComplete: 0xff8844,
      nodeCurrent: 0xffaa44,
      nodeLocked: 0x1a0a05
    },
    decorations: 'volcanic',
    nodes: [
      { x: 0.50, y: 0.88 }, { x: 0.68, y: 0.78 }, { x: 0.82, y: 0.65 },
      { x: 0.70, y: 0.52 }, { x: 0.50, y: 0.48 }, { x: 0.30, y: 0.42 },
      { x: 0.18, y: 0.32 }, { x: 0.32, y: 0.22 }, { x: 0.50, y: 0.16 },
      { x: 0.50, y: 0.05 }
    ]
  },
  {
    id: 'ice_cavern',
    name: 'Ice Cavern',
    subtitle: 'Single Replacement',
    levels: [21, 30],
    palette: {
      bg: 0x0a1220,
      bgLight: 0x142030,
      path: 0x2a4a6a,
      pathDot: 0x4488bb,
      accent: 0x44ddff,
      accentHex: '#44ddff',
      text: '#aaddff',
      textDim: '#335577',
      border: 0x225577,
      node: 0x1a2a3a,
      nodeComplete: 0x44bbee,
      nodeCurrent: 0x88eeff,
      nodeLocked: 0x0a1218
    },
    decorations: 'ice',
    nodes: [
      { x: 0.50, y: 0.12 }, { x: 0.72, y: 0.22 }, { x: 0.85, y: 0.38 },
      { x: 0.75, y: 0.52 }, { x: 0.58, y: 0.60 }, { x: 0.40, y: 0.55 },
      { x: 0.22, y: 0.62 }, { x: 0.15, y: 0.45 }, { x: 0.28, y: 0.30 },
      { x: 0.50, y: 0.82 }
    ]
  },
  {
    id: 'electric_grid',
    name: 'Electric Grid',
    subtitle: 'Double Replacement',
    levels: [31, 40],
    palette: {
      bg: 0x100818,
      bgLight: 0x1a1228,
      path: 0x4a3a6a,
      pathDot: 0x7755aa,
      accent: 0xcc44ff,
      accentHex: '#cc44ff',
      text: '#cc88ff',
      textDim: '#553377',
      border: 0x553388,
      node: 0x2a1a3a,
      nodeComplete: 0xaa44ff,
      nodeCurrent: 0xdd88ff,
      nodeLocked: 0x0a0612
    },
    decorations: 'circuit',
    nodes: [
      { x: 0.15, y: 0.18 }, { x: 0.40, y: 0.18 }, { x: 0.65, y: 0.18 },
      { x: 0.65, y: 0.48 }, { x: 0.40, y: 0.48 }, { x: 0.15, y: 0.48 },
      { x: 0.15, y: 0.78 }, { x: 0.40, y: 0.78 }, { x: 0.65, y: 0.78 },
      { x: 0.85, y: 0.48 }
    ]
  },
  {
    id: 'dark_lair',
    name: 'The Dark Lair',
    subtitle: 'Combustion & Mixed',
    levels: [41, 50],
    palette: {
      bg: 0x08050e,
      bgLight: 0x120e1a,
      path: 0x2a2240,
      pathDot: 0x443366,
      accent: 0x8844aa,
      accentHex: '#aa66cc',
      text: '#aa88cc',
      textDim: '#443355',
      border: 0x332244,
      node: 0x1a1226,
      nodeComplete: 0x8844cc,
      nodeCurrent: 0xbb66ff,
      nodeLocked: 0x060410
    },
    decorations: 'dark',
    nodes: [
      { x: 0.82, y: 0.15 }, { x: 0.65, y: 0.25 }, { x: 0.50, y: 0.18 },
      { x: 0.35, y: 0.28 }, { x: 0.20, y: 0.22 }, { x: 0.15, y: 0.42 },
      { x: 0.30, y: 0.55 }, { x: 0.50, y: 0.48 }, { x: 0.68, y: 0.58 },
      { x: 0.50, y: 0.80 }
    ]
  }
];

/**
 * Get the region config for a given level number.
 * @param {number} levelNum
 * @returns {object|undefined}
 */
export function getRegionForLevel(levelNum) {
  return REGIONS.find(r => levelNum >= r.levels[0] && levelNum <= r.levels[1]);
}

/**
 * Get the region index (0-4) for a given level number.
 * @param {number} levelNum
 * @returns {number}
 */
export function getRegionIndex(levelNum) {
  return REGIONS.findIndex(r => levelNum >= r.levels[0] && levelNum <= r.levels[1]);
}
