# ChemQuest: Equation Balancer

A 2D pixel-art educational puzzle game built with Phaser 3 that teaches students to balance chemical equations through an RPG-style overworld map with 100 levels across 10 themed regions.

## Quick Start

```bash
npm install
npm run dev     # Start development server on port 3000
npm run build   # Production build to dist/
npm run preview # Preview production build
```

No test framework — testing is manual via the dev server (see Testing section below).

## Tech Stack

- **Engine**: Phaser 3.90+ (Canvas/WebGL, pixelArt rendering)
- **Bundler**: Vite 7 (Phaser split into separate chunk)
- **Language**: Plain JavaScript (ES modules, no TypeScript)
- **Audio**: Web Audio API synthesis (no external audio files)
- **Persistence**: localStorage (`chemquest_save` key)
- **Canvas**: 800×600, Phaser.Scale.FIT auto-centered
- **Font**: "Press Start 2P" (loaded via Google Fonts in index.html)

## Project Structure

```
src/
├── main.js                    # Phaser game config (800×600), scene registration
├── scenes/
│   ├── BootScene.js           # Asset preloading, programmatic texture generation
│   ├── MenuScene.js           # RPG overworld map, region navigation, settings
│   ├── GameScene.js           # Core gameplay loop (coefficient slots, validate)
│   ├── BossScene.js           # Timed boss fights with HP bar, every 10th level
│   └── ResultScene.js         # Choreographed score summary, stars, XP bar
├── systems/
│   ├── EquationEngine.js      # Atom counting, balance validation, lowest-terms check
│   ├── CoefficientManager.js  # Per-level coefficient state, emits onChange events
│   ├── ScoringSystem.js       # Points, streaks, star rating, XP calculation
│   ├── ProgressionSystem.js   # XP, 10-tier ranks, level gating, localStorage
│   ├── HintSystem.js          # 3-tier adaptive hints with auto-trigger on idle/fail
│   └── SoundManager.js        # Web Audio synthesis (20+ procedural sounds)
├── data/
│   ├── equations.json         # 100 levels with molecule data, solutions, hints
│   ├── elements.json          # 26+ element colors (CPK), names, atomic numbers
│   ├── achievements.json      # 10 achievement definitions
│   └── regions.js             # 10 themed world map zones with node layouts
└── ui/
    ├── PixelText.js           # "Press Start 2P" font helper, responsive scaling
    ├── BattleUI.js            # Shared UI: steppers, atom tally bars, number strip
    ├── ProfessorAurum.js      # NPC hint dialogue with typewriter effect
    └── HPBar.js               # Element atom count bar (balanced/unbalanced indicator)
```

## Architecture

### Scene Flow

```
BootScene → MenuScene → GameScene → ResultScene → MenuScene
                      → BossScene → ResultScene → MenuScene
```

### Core Game Loop

1. **Present** unbalanced equation with empty coefficient slots
2. **Interact** — tap slots to cycle (1-9), use ▲/▼ steppers, pick from number strip, or type via keyboard
3. **Real-time feedback** — atom tally bars and element orbs update on every change
4. **Validate** — "Check" button runs `EquationEngine.validate()`
5. **Reward** — stars (1-3), XP, streak bonuses → ResultScene

### Key Systems

- **EquationEngine** (`systems/EquationEngine.js`): Stateless utility. `validate()` counts atoms per side and returns element-by-element comparison. `isLowestTerms()` checks GCD for 3-star eligibility. `getElements()` lists unique elements. `buildDisplayString()` formats equation with coefficients.
- **CoefficientManager** (`systems/CoefficientManager.js`): Per-level state holder. Stores reactant/product coefficient arrays (default 1, range 1-9). Fires `onChange` callback driving real-time UI updates.
- **ScoringSystem** (`systems/ScoringSystem.js`): Static methods. Base 100 pts + speed bonus (+50/+25) + no-hint bonus (+25) + first-try bonus (+50). Stars: 3/2/1 based on hints used. Streak multipliers: 1×/2×/2.5×/3× at 0/3/5/10 streak.
- **ProgressionSystem** (`systems/ProgressionSystem.js`): Singleton. 10-tier rank system (0–30,000 XP). Level gating by rank OR sequential completion. Saves XP, streak, per-level stars/time/score, achievements, and settings to localStorage.
- **HintSystem** (`systems/HintSystem.js`): 3 tiers (nudge → highlight → walkthrough). Auto-triggers after 1 fail or 30s idle (tier 1), 2 fails or 60s idle (tier 2). Using hints reduces star rating.
- **SoundManager** (`systems/SoundManager.js`): All sounds synthesized via Web Audio oscillators and noise buffers — no audio files. Includes: coeffChange, slotSelect, success/fail chimes, elementBalanced dings, starReveal sparkles, xpGain sweeps, heartbeat, bossRumble, bossWarning, and more.

### UI Components

- **BattleUI** (`ui/BattleUI.js`): Factory for shared gameplay UI. `buildSteppers()` adds ▲/▼ arrows on each slot. `buildAtomTally()` renders animated element-balance bars with checkmarks. `buildNumberStrip()` creates compact 1-9 picker strip.
- **ProfessorAurum** (`ui/ProfessorAurum.js`): NPC dialogue overlay. 64×64 sprite portrait with name plate, dialogue box, typewriter text effect, and auto-dismiss timer. Hint tier colors: gold → orange → red.
- **HPBar** (`ui/HPBar.js`): Per-element atom count visualization. Shows element symbol, bar graphic, left:right counts, and check/X balanced indicator. Green when balanced, red/orange when not.
- **PixelText** (`ui/PixelText.js`): Exports `PIXEL_FONT` constant and `pixelText()` helper for consistent text rendering. `scaledSize()` adapts font size relative to 800×600 base.

### Sprite Generation

All textures are generated programmatically in `BootScene` — no external sprite sheets or image assets. Textures include: element orbs (CPK colors), coefficient tokens (1-9), coefficient slots, platform/pedestals, buttons, particles (4 types), stars, overworld player (flask character), overworld nodes (Pokéball-style), path dots, region banners, Professor Aurum portrait, HP bar parts, RPG frames, and stepper arrows.

### Overworld Map (MenuScene)

The menu is an RPG-style region map with 10 themed zones defined in `data/regions.js`. Each region has a unique color palette, background decorations, and a winding path of 10 level nodes. Features include:
- Player avatar (flask character) animates along the path
- Nodes show locked/current/complete/boss states with star counts
- XP bar and rank title at the top
- Streak counter (changes color at 5+ streak)
- Prev/Next region navigation
- Settings panel (colorblind mode toggle, reset progress)
- Info panel showing level difficulty and reaction type

### Rank System

| Rank | XP Required | Levels Unlocked |
|------|------------|-----------------|
| Apprentice Chemist | 0 | 1-10 |
| Lab Technician | 500 | 1-20 |
| Molecule Engineer | 1,500 | 1-30 |
| Reaction Specialist | 3,000 | 1-40 |
| Master Chemist | 5,000 | 1-50 |
| Element Sage | 8,000 | 1-60 |
| Reaction Virtuoso | 12,000 | 1-70 |
| Bond Breaker | 17,000 | 1-80 |
| Quantum Alchemist | 23,000 | 1-90 |
| Grand Chemist | 30,000 | 1-100 |

Players also unlock the next sequential level upon completion, preventing hard XP gates.

### Boss Fights (BossScene)

Every 10th level is a boss fight with:
- Red-themed UI (0x1a0a0a background)
- 3 equations to solve in sequence
- Boss HP bar (3 HP, one per equation)
- 60-second timer with heartbeat audio
- Prominent atom tally table
- Boss defeat fanfare on completion, sad trombone on timeout

## Development Conventions

- **No TypeScript** — plain ES modules with JSDoc comments
- **No external assets** — all textures generated via Phaser Graphics API, all audio via Web Audio synthesis
- **Coefficient of 1 is implicit** — empty slot = 1, never force students to place "1"
- **Lowest-term solutions only** for 3-star ratings
- **Mobile-first input** — tap-to-cycle as primary, steppers and number strip as alternatives
- **Keyboard support** — arrow keys to navigate slots, number keys to set value, Enter to check, H for hint, Backspace to clear
- **Pixel-art aesthetic** — pixelArt: true, no anti-aliasing, hard edges, limited palettes
- **Dark theme** — backgrounds use very dark navy/purple (#0d0d1a, #16161c)

## Data Format (equations.json)

100 level entries. Each level:
```json
{
  "id": "lvl_001",
  "level": 1,
  "difficulty": "easy",
  "type": "synthesis",
  "display": "_H₂ + _O₂ → _H₂O",
  "reactants": [{ "molecule": "H2", "formula": "H₂", "elements": { "H": 2 } }],
  "products": [{ "molecule": "H2O", "formula": "H₂O", "elements": { "H": 2, "O": 1 } }],
  "solution": { "reactants": [2, 1], "products": [2] },
  "par_time": 30,
  "hints": ["...", "...", "..."],
  "boss": false
}
```

**Equation types**: synthesis, decomposition, single_replacement, double_replacement, combustion, mixed
**Difficulty levels**: easy, medium, hard
**Boss levels**: every 10th level (10, 20, 30, ... 100) — set `"boss": true`

### Region Data (regions.js)

10 regions, each covering 10 levels:
1. The Green Lab (1-10) — Synthesis
2. Volcanic Forge (11-20) — Decomposition
3. Ice Cavern (21-30) — Single Replacement
4. Electric Grid (31-40) — Double Replacement
5. The Dark Lair (41-50) — Combustion/Mixed
6. Crystal Depths (51-60) — Acid-Base
7. Solar Furnace (61-70) — Metal Oxides
8. Toxic Marshes (71-80) — Gases/Precipitation
9. Quantum Core (81-90) — Complex Reactions
10. Final Frontier (91-100) — Ultimate Balance

Each region defines: `id`, `name`, `subtitle`, `levels` range, `palette` (12+ color values), `decorations` type, and `nodes` array (10 positions as x/y fractions 0-1).

## Testing

No test framework is configured. Run the dev server (`npm run dev`) and manually verify:
1. Boot → Menu transition with texture generation
2. Overworld map shows regions with correct themes and node states
3. Player avatar navigates between nodes
4. Level select shows locked/unlocked/completed states with star counts
5. Tap coefficient slots to cycle 1-9, use steppers, or number strip
6. Atom tally bars update in real-time on coefficient changes
7. "Check" validates correctly — celebration particles on balance, camera shake on fail
8. Stars, XP, and streaks calculate properly on ResultScene
9. Boss levels (every 10th) have timer, HP bar, and multi-equation flow
10. Sound effects play for interactions (coefficient changes, success/fail, hints)
11. Progress persists across page reloads (localStorage)
12. Settings: colorblind mode toggle and progress reset work
13. Region navigation (Prev/Next) transitions between themed zones

## Adding New Levels

Add entries to `src/data/equations.json`. Each molecule needs:
- `molecule`: Internal identifier (e.g., "H2O")
- `formula`: Unicode display string (use subscript digits: ₂₃₄₅₆)
- `elements`: Object mapping element symbols to atom counts
- `solution`: Object with `reactants` and `products` coefficient arrays (lowest terms)

Set `"boss": true` on every 10th level. Ensure new elements referenced in molecules are defined in `src/data/elements.json` with CPK color, name, and atomic number so BootScene can generate their orb textures.

When adding a new region (beyond 100 levels), also add an entry to `src/data/regions.js` with palette, decoration type, and 10 node positions, and add a corresponding rank tier to `ProgressionSystem.js`.
