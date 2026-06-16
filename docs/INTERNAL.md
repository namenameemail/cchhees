# cchhees — внутренний README

> Документ для быстрой ориентации в проекте. Не публичный README.

## Что это

**cchhees** — SPA на React 18 + TypeScript + Vite. Конфигурируемая SVG-доска с фигурами, стеками фигур на клетках, move rules, event rules (spawn, displace, set state), undo/redo по slice, IndexedDB-проектами и WebRTC-коллаборацией.

Состояние игры — **React Context** (не Redux). Slice-based модель: `FiguresSlice`, `BoardSlice`, `FigureCatalog` с независимой историей.

## Запуск

```bash
npm install
./run              # signaling + Vite (или npm run dev)
npm run typecheck
npm run typecheck:strict-game   # noImplicitAny для game/events, state, figureStack
npm run test
npm run lint
npm run verify:displacement
npm run build
```

Path aliases: `@/` → `src/` (например `@/game/figureStack`).

## Структура (основное)

```
src/
├── main.tsx, App.tsx
├── channelDebugLog.ts     # фабрика debug-логов для vite-dev-profiler
├── projects/              # IndexedDB, ProjectProvider
├── collab/                # WebRTC, CollabProvider, ops
├── components/            # Form1, FormArray, shared UI
└── game/
    ├── context/           # GameProvider + hooks (animation, collab, slices, move)
    ├── events/            # applyFigureMove, match, execute, steppedOnQueue
    ├── state/             # slices, reconcile, migrate
    ├── figureStack.ts     # API стеков на клетках
    ├── moveRules.ts       # валидация ходов игрока
    ├── moveDebug/         # Move Debug Workbench
    └── components/        # Board, BoardCell, forms...
```

Актуальная диаграмма: [docs/architecture.puml](architecture.puml).

## Модель данных

### Slices (авторитетное состояние)

| Slice | Содержимое |
|-------|------------|
| `FiguresSlice` | `figuresByCoord` (стеки), `tray` |
| `BoardSlice` | `boardParameters`, `styleRules`, `cellParametersByCoord` |
| `FigureCatalog` | определения фигур, states, move/event rules |

`composeGameState()` собирает legacy `GameState` для UI. Контекст экспортирует `figuresSlice` (с overlay при анимации) и `state`.

### Cell (composed view)

```ts
{ figures?: FigurePlacement[], figure?: FigurePlacement /* deprecated mirror */ }
```

Используйте `getCellStack(cell)` из `figureStack.ts` для чтения стека.

### Режимы (Mode)

| Mode | Поведение |
|------|-----------|
| `Game` | выбор клетки + ход по move rules |
| `FiguresArrange` | расстановка фигур |
| `PaintTheBoard` | кисть параметров клетки |

## Движок ходов

```
applyFigureMove → steppedOnQueue → runFigureEvents → match → execute (actions/)
```

Move Debug Workbench в DEV воспроизводит pipeline и сравнивает expected/actual board.

## Tooling

- **Vitest** — `src/**/*.test.ts` (figureStack, moveRules, applyFigureMove, compareFigureBoards)
- **ESLint + Prettier** — `npm run lint`, `npm run format`
- **vite-dev-profiler** — каналы debug (`moves`, `events`, `actions`, `collab`, …)

## Зависимости

Локальные пакеты: `bbuutoonnss`, `vite-dev-profiler` (`file:../…`).

Redux удалён из зависимостей — не использовался.
