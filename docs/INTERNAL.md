# cchhees — внутренний README

> Документ для быстрой ориентации в проекте. Не публичный README.

## Что это

**cchhees** — SPA на React 18 + TypeScript + Vite. Конфигурируемая SVG-доска с фигурами (шахматы и шашки в виде Unicode-символов), свободным перемещением, лотком снятых фигур, undo/redo и декларативными правилами стилизации клеток и связей.

**Важно:** это **не** шахматный/шашечный движок. Нет ходов по правилам, нет очереди хода, мата, рокировки и т.п. Redux в `package.json` объявлен, но **не используется** — состояние через React Context.

## Запуск

```bash
npm install
npm run dev      # dev-сервер Vite
npm run build    # tsc && vite build
npm run preview  # превью production-сборки
```

## Структура

```
src/
├── main.tsx              # точка входа React
├── App.tsx               # рендер <Game /> (остался boilerplate Vite)
├── components/
│   ├── Form1/            # декларативная форма по конфигу полей
│   ├── FormArray/        # массив элементов с add/remove
│   └── inputs/           # BlurEnter* (дубликат bbuutoonnss)
└── game/
    ├── index.tsx         # layout: Board + sidebar + tabs
    ├── utils.ts          # indexToIJ, getCells, initialGameState
    ├── constants.ts      # Unicode-символы фигур
    ├── types/            # GameState, Cell, FigureTypes, Mode, conditions...
    ├── context/
    │   ├── index.tsx     # GameProvider — единый источник состояния
    │   ├── history.ts    # undo/redo (до 100 снимков)
    │   ├── conditions.ts # предикаты для клеток
    │   └── connections.ts# граф соседей + предикаты для рёбер
    └── components/       # Board, BoardCell, Tray, History, формы...
```

## Модель данных

### GameState

| Поле | Тип | Назначение |
|------|-----|------------|
| `boardParameters` | `BoardParameters` | n×m, размеры клеток, отступы, `swapOnEat` |
| `cells` | `Cell[]` | плоский массив длины n×m |
| `tray` | `FigureTypes[]` | снятые фигуры (в начало массива) |
| `boardConditions` | `BoardConditionItem[]` | правила → стиль клетки |
| `connectionsConditions` | `BoardConnectionsConditionItem[]` | правила → стиль ребра |

### Cell

```ts
{ figure?: FigureTypes, parameters?: CellParameters }
```

Индекс ↔ координаты: `i = index % n`, `j = floor(index / n)`.

### Режимы (Mode)

| Mode | Поведение клика по клетке |
|------|---------------------------|
| `Game` | 1-й клик — выбор; 2-й — перемещение |
| `FiguresArrange` | поставить `activeFigure` |
| `PaintTheBoard` | записать `cellParametersBrushState` в `cell.parameters` |
| `PaintTheBoardConnections` | enum есть, UI кисти не подключён |
| `Probe` | enum есть, не реализован |

## Потоки данных

### Перемещение (Mode.Game)

```
BoardCell click → setActiveCell(index)
BoardCell click → moveActiveCellFigureTo(to)
  → setGameStateWithHistory → historyPush → re-render
```

При захвате: фигура с `to` → `tray` (или swap, если `swapOnEat: true`).

### Расстановка фигур

```
FigureButton → setMode(FiguresArrange) + setActiveFigure
BoardCell click → setCellFigure → replace/setFigure
```

### Стилизация клеток

```
Conditions (FormArray) → setBoardConditions
BoardCell useMemo → getConditionFunctionByType → CellSVGGroup
```

`cell.parameters` (paint mode) **не** участвует в отрисовке — только `boardConditions`.

### Связи между клетками

```
getConnections(n,m) → 8 направлений + self-offsets
ConnectionsConditions → getConnectionConditionFunctionByType
Board → ConnectionSVGGroup (линии между центрами)
```

Связи **не ограничивают** перемещение фигур.

### Undo / Redo

Полные снимки `GameState` в стеках `before[]` / `after[]` (max 100).  
Изменение `n`/`m` через `useEffect` **без** history.

## UI layout

```
Game
└── GameProvider
    ├── .board
    │   ├── Board (SVG: connections + BoardCell×N)
    │   └── .bottom: Tray + History
    └── .left (tabs)
        ├── tab "board": BoardParametersForm, Conditions, ConnectionsConditions
        └── tab "figures": Figures (FigureButton × FigureTypes)
```

**Не подключены к layout:** `CellParametersForm`, `ConnectionParametersForm` (импортированы, но не рендерятся).

## Зависимости

| Пакет | Статус |
|-------|--------|
| react, react-dom | используется |
| classnames | используется |
| redux, @reduxjs/toolkit, react-redux, redux-thunk, redux-logger, redux-undo | **не используется** |
| bbuutoonnss (локальный) | Form1 тянет инпуты оттуда |

## Технический долг

1. Redux — мёртвые зависимости.
2. Нет реальных правил шахмат/шашек.
3. Paint-режимы без UI кистей в sidebar.
4. `cell.parameters` не влияет на рендер.
5. Дубли ключей `anbDiagonalUp/Down` в `connections.ts`.
6. `console.log` в Board, BoardCell, FormArray.
7. Boilerplate в App.tsx (count, reactLogo).

## Типичные задачи

| Задача | Куда смотреть |
|--------|---------------|
| Логика хода/захвата | `context/index.tsx` → `moveActiveCellFigureTo` |
| Клик по клетке | `components/BoardCell.tsx` |
| Новое условие клетки | `types/conditions.ts` + `context/conditions.ts` |
| Новое условие связи | `types/connections.ts` + `context/connections.ts` |
| Форма параметров доски | `components/BoardParametersForm/` |
| Undo/redo | `context/history.ts` |

## Дефолты

- Доска: **10×3**
- `swapOnEat: false`
- Пустой tray, пустые condition-массивы
