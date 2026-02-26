# ChemQuest: Equation Balancer

A 2D sprite-based educational puzzle game built with Phaser 3 that teaches students to balance chemical equations through drag-and-drop gameplay.

## Quick Start

```bash
npm install
npm run dev     # Start development server on port 3000
npm run build   # Production build to dist/
npm run preview # Preview production build
```

## Tech Stack

- **Engine**: Phaser 3 (Canvas/WebGL)
- **Bundler**: Vite
- **Language**: Plain JavaScript (ES modules, no TypeScript)
- **Persistence**: localStorage for save data

## Project Structure

```
src/
├── main.js                    # Phaser game config, scene registration
├── scenes/
│   ├── BootScene.js           # Asset preloading, texture generation
│   ├── MenuScene.js           # Title screen, level select grid, settings
│   ├── GameScene.js           # Core gameplay loop (drag coefficients, validate)
│   ├── BossScene.js           # Timed boss fight variants every 10 levels
│   └── ResultScene.js         # Score summary, stars, XP bar, next level
├── systems/
│   ├── EquationEngine.js      # Atom counting, balance validation, lowest-terms check
│   ├── CoefficientManager.js  # Tracks user-placed coefficients, emits change events
│   ├── ScoringSystem.js       # Points, combo, streak, star rating calculation
│   ├── ProgressionSystem.js   # XP, ranks, unlocks, localStorage persistence
│   └── HintSystem.js          # 3-tier adaptive hints with auto-trigger
├── data/
│   ├── equations.json         # 50 levels with molecule data, solutions, hints
│   ├── elements.json          # Element colors, names, atomic numbers
│   └── achievements.json      # Achievement definitions
└── ui/                        # (reserved for future HUD/overlay components)
```

## Architecture

### Scene Flow

```
BootScene → MenuScene → GameScene → ResultScene → MenuScene
                      → BossScene → ResultScene → MenuScene
```

### Core Game Loop

1. **Present** unbalanced equation with empty coefficient slots
2. **Interact** — tap slots to cycle coefficients (1-9), or drag numbers from tray
3. **Real-time feedback** — element counter HUD and balance scale update on every change
4. **Validate** — "Check" button runs `EquationEngine.validate()`
5. **Reward** — stars (1-3), XP, streak bonuses → ResultScene

### Key Systems

- **EquationEngine** (`systems/EquationEngine.js`): Stateless utility. `validate()` counts atoms per side and returns element-by-element comparison. `isLowestTerms()` checks GCD for 3-star eligibility.
- **CoefficientManager**: Per-level state holder. Fires `onChange` callback on every coefficient change, driving real-time UI updates.
- **ProgressionSystem**: Singleton managing XP, rank titles, level gating, and localStorage save/load. Rank thresholds: 0/500/1500/3000/5000 XP.
- **HintSystem**: 3-tier hints (nudge → highlight → walkthrough). Auto-triggers on idle (30s/60s) or failed attempts. Hints reduce star rating.

### Sprite Generation

All textures are generated programmatically in `BootScene._generateTextures()` — no external sprite sheets needed. Element orbs use CPK-convention colors.

## Development Conventions

- **No TypeScript** — plain ES modules with JSDoc comments
- **No external sprites** — all textures generated via Phaser Graphics API
- **Coefficient of 1 is implicit** — empty slot = 1, never force students to place "1"
- **Lowest-term solutions only** for 3-star ratings
- **Mobile-first input** — tap-to-cycle as primary, drag-and-drop as secondary
- **Keyboard support** — arrow keys to select slots, number keys to set, Enter to check, H for hint

## Data Format (equations.json)

Each level entry:
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

## Testing

Run the dev server and verify:
1. Boot → Menu transition works
2. Level select shows locked/unlocked states
3. Tap coefficient slots to cycle 1-9
4. Element counter updates in real-time
5. Balance scale tilts proportionally
6. "Check" validates correctly — celebration on balance, shake on fail
7. Stars, XP, and streaks calculate properly
8. Boss levels have timer and multi-equation flow
9. Progress persists across page reloads (localStorage)

## Adding New Levels

Add entries to `src/data/equations.json`. Each molecule needs:
- `molecule`: Internal identifier
- `formula`: Unicode display string (use subscript digits: ₂₃₄₅₆)
- `elements`: Object mapping element symbols to atom counts
- `solution`: Object with `reactants` and `products` coefficient arrays (lowest terms)

Set `"boss": true` on every 10th level.
