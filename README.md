# Tower of Hanoi — The Recursion Lab

A data structures mini project focused on Tower of Hanoi. It visualizes the recursive algorithm, the actual call stack, base cases, return values, and disk movements. Built with React, JavaScript, and Vite; Node.js runs development, builds, and tests.

## Run locally

Use Node.js 22.12 or newer.

```sh
npm ci
npm run dev
```

Open http://127.0.0.1:5173. To create and serve a production build:

```sh
npm run build
npm run preview
```

## Controls

- Choose 1–7 disks. Changing the count resets both modes.
- **Learn the solution:** Auto run, pause/resume, step forward/backward, reset, or seek with the execution timeline.
- **Speed:** Change playback from 0.5× to 4×, including while running. Progress within the current step is preserved.
- **Activity:** A running indicator, current-step progress, next-step countdown, and active-time clock show that execution is continuing between disk moves. Active time freezes while paused.
- **Play yourself:** Click a source and destination rod, or drag a top disk. Invalid moves explain the rule. Undo, move history, and optimal-move comparison are included.
- **Keyboard:** In Learn mode, Space plays/pauses, Left/Right steps, and R resets when focus is outside a control. All buttons and rods also support native keyboard interaction.
- Browser preferences remember the disk count and speed. Executions start fresh on reload.

## Assignment coverage

| Requirement | Implementation |
| --- | --- |
| Select recursive algorithm | Tower of Hanoi is the project's sole selected algorithm. |
| Enter input | Disk count, validated from 1 to 7. |
| Show function call | Current event title and parameterized stack frames. |
| Show call stack | Push, waiting parent, active child, return, and pop events. |
| Highlight recursive call | Highlighted pseudocode synchronized with the execution trace. |
| Show return values | Every call returns the number of moves completed; parent frames display received left/right values. |
| Display final result | All disks on C plus move, call, maximum-depth, and return summary. |
| Display number of calls | Dedicated function-call counter, separate from moves and execution steps. |

## Algorithm and data structures

The base case is `n === 1`: move one disk and return 1. Otherwise, recursively move `n - 1` disks to the helper, move the largest disk, and recursively move the smaller stack to the destination. Return `left + 1 + right`.

Rods are arrays used as stacks: the last element is the top disk. Function frames form another stack. `buildTrace` executes a real recursive solver and records immutable snapshots on calls, moves, returns, and pops. Playback replays these snapshots; it does not invent recursive calls for manual moves.

For this one-disk base case, both the minimum moves and function-call count are `2^n - 1`. Execution steps also include recursion, resume, and pop events, so their count is larger. The solver uses O(2^n) time and O(n) recursion space. Retaining the educational trace uses O(n × 2^n) storage, which is why input is capped at 7.

## Playback design

`PlaybackClock` owns one animation-frame loop, independent of React renders. It retains the current event's fractional progress, elapsed active time, and speed. Pause cancels the scheduled frame without losing progress. Changing speed updates the rate without restarting the clock. Learn-mode disk animations use that same progress, so they freeze and resume with playback. No conversation-preview state APIs are used.

The app runs entirely in the browser. A server API or database is not needed for the solver. The local Node/Vite server serves the app; production is a static build.

## Source layout

```text
src/lib/hanoi.js                 Recursive trace, rod stacks, legal moves, undo
src/lib/playback.js              Playback clock and time formatting
src/components/TowerBoard.jsx   Disk animation, pointer dragging, rod controls
src/components/RecursionPanel.jsx  Call stack and highlighted pseudocode
src/components/PlayPanel.jsx    Rules and move history
src/App.jsx                     Modes, settings, controls, counters
src/styles.css                  Responsive light interface
tests/                          Solver, clock, and browser tests
```

## Verify

```sh
npm test
npm run test:browser
npm run build
```

Browser tests use installed Microsoft Edge on Windows. On other systems, install Playwright Chromium first with `npx playwright install chromium`. They check sustained playback, pause/resume, live speed changes, completion, manual moves, invalid moves, undo, drag-and-drop, keyboard controls, and narrow layouts.

The build uses the [Vite workflow](https://vite.dev/guide/). React effect lifecycles follow the [React useEffect documentation](https://react.dev/reference/react/useEffect), including development Strict Mode cleanup.

## Hosting

Run `npm run build` and upload the contents of `dist/` to a static web host.

Local hosting configuration and server administration notes are excluded from this repository.
