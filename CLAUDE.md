# cchhees — Board Game Editor

A visual editor for designing and simulating custom board games with physics-based dice rolling, figure rules, event systems, and real-time collaboration.

## Quick Start

```bash
npm install
npm run dev           # Start Vite dev server (http://localhost:5173)
npm run typecheck     # Type check (strict for game code)
npm run test          # Run tests with Vitest
npm run build         # Build for production
```

## Architecture

### Core Game Engine (`src/game/`)

- **`types/events.ts`** — Event system schema (actions, conditions, subjects)
- **`events/`** — Event execution, condition evaluation, action resolution
- **`moveRules/`** — Figure move rule validation and normalization
- **`context/index.tsx`** — Global game state (board, figures, history)
- **`state/`** — Game state data structures
- **`figureView.ts`** — Figure properties and transformations
- **`keyboard.ts`** — Keyboard input handling
- **`moveDebug/`** — Debug panel for move simulation and testing

### UI Components (`src/game/components/`)

- **`BoardView.tsx`** — Main game board renderer with Three.js
- **`FigureParametersForm`** — Figure rule editor
- **`eventConditionsForm.tsx`** — Condition builder
- **`MoveRuleVariantsPanel`** — Move rule configuration
- **`FigureStateSelect`** — State/orientation selector with overlay portal

### Project Management (`src/projects/`)

- **`db.ts`** — IndexedDB storage for game projects
- **`dbSchema.ts`** — Database schema and migrations
- **`projectBackups.ts`** — Backup/restore functionality
- **`ProjectContext.tsx`** — Project lifecycle and bootstrap
- **`components/ProjectsModal`** — Project browser and creation UI

### Assets System (`src/projects/assets/`)

- Asset management for board textures, figure sprites, and styling
- Reusable across projects

### Real-time Collaboration (`src/collab/`)

- Signaling server integration (see `/signaling-server/`)
- Operational transformation for concurrent edits

### Shared UI (`src/components/`)

- Form inputs, selectors, modal dialogs, color/font pickers
- Reusable design system components

## Key Concepts

### Events & Actions

- **Events** are triggered by game conditions (move made, figure captured, etc.)
- **Actions** respond to events (displace figure, change state, emit sound)
- **Conditions** guard when events/actions fire (piece within distance, board region, game state)
- Supports complex subject normalization (self, opponent, nearby figures)

### Move Rules

- Define how figures can move on the board
- Variants let same figure have multiple move types
- Validation against board bounds and other rules

### Physics & Dice

- **Three.js + Rapier** for 3D physics
- Dice rolling with gravity and collision
- Real-time simulation in move debug panel

### Board Styling

- Rules-based cell coloring and texturing
- Pattern matching on row/col, distance, board region
- Supports asset references and computed styles

### State & Orientation

- Figures can have orientation (team, rotation, custom states)
- Team orientation affects perspective and move rules
- Stored in game history for undo/redo

## Testing

- **Vitest** for unit tests
- Game logic tests in `src/game/events/` and `src/game/moveRules/`
- Run with `npm test` or `npm run test:watch`

## Build & Deploy

- **Vite** for bundling (fast HMR, code splitting)
- **TypeScript strict mode** for game logic
- Production build: `npm run build` → `dist/`

## Common Tasks

### Add a new event action
1. Define schema in `types/events.ts`
2. Implement executor in `events/actions/`
3. Add UI form in `game/components/eventConditionsForm.tsx`
4. Test with move debug panel

### Debug move validation
- Use **Move Debug** panel (right side)
- Simulate moves, inspect rule application, check subject resolution
- Real-time feedback as you edit rules

### Modify board styling
- Edit rules in `styleRules/` or board config
- Patterns match cells by distance, region, or custom predicates
- Preview updates instantly in board view

## Conventions

- Path alias `@/*` maps to `src/*`
- Event subjects use normalized arrays (self, all, filtered)
- Action executors are pure and return game state mutations
- UI components are controlled (props-driven, no local mutation)
- Test files co-located: `foo.test.ts` next to `foo.ts`

## Known Gotchas

- **Team orientation** affects both visual perspective and move rule interpretation
- **Event subject resolution** happens at execution time; filter conditions carefully
- **Physics simulation** may differ from debug preview (frame rate, determinism)
- **History/undo** doesn't include abandoned move branches (terminal only)

## External Dependencies

- **Three.js + React Three Fiber** — 3D rendering
- **Rapier** — Physics engine for dice/objects
- **IndexedDB** (idb) — Local project storage
- **bbuutoonnss** — Local package (buttons/UI lib)
