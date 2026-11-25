import test from 'node:test';
import assert from 'node:assert/strict';
import { buildTrace, createGame, initialRods, minimumMoves, tryMove, undoMove, RODS } from '../src/lib/hanoi.js';

for (let n = 1; n <= 7; n += 1) {
  test(`${n} disks: legal optimal solution, accurate stack and return values`, () => {
    const trace = buildTrace(n);
    let calls = 0;
    let moves = 0;
    for (const [index, event] of trace.entries()) {
      const allDisks = RODS.flatMap((rod) => event.rods[rod]).sort((a, b) => a - b);
      assert.deepEqual(allDisks, Array.from({ length: n }, (_, i) => i + 1));
      for (const rod of RODS) event.rods[rod].forEach((disk, i, stack) => { if (i > 0) assert(stack[i - 1] > disk); });
      if (event.type === 'call') calls += 1;
      if (event.type === 'move') {
        moves += 1;
        const before = trace[index - 1];
        const { from, to, disk } = event.movement;
        assert.equal(before.rods[from].at(-1), disk);
        assert.equal(event.rods[to].at(-1), disk);
        assert.equal(event.rods[from].length, before.rods[from].length - 1);
        assert.equal(event.rods[to].length, before.rods[to].length + 1);
      }
      if (event.type === 'return') assert.equal(event.stack.at(-1).returned, minimumMoves(event.stack.at(-1).n));
      if (index > 0) {
        const before = trace[index - 1];
        const difference = event.stack.length - before.stack.length;
        assert.equal(difference, event.type === 'call' ? 1 : event.type === 'pop' ? -1 : 0);
      }
      assert.equal(event.calls, calls);
      assert.equal(event.moves, moves);
      assert(event.stack.length <= n);
    }
    const end = trace.at(-1);
    assert.equal(end.type, 'complete');
    assert.equal(end.moves, minimumMoves(n));
    assert.equal(end.calls, minimumMoves(n));
    assert.equal(end.maxDepth, n);
    assert.deepEqual(end.stack, []);
    assert.deepEqual(end.rods, { A: [], B: [], C: initialRods(n).A });
    assert.deepEqual(trace[0].rods, initialRods(n), 'Earlier snapshots remain unchanged');
  });
}

test('Invalid disk counts are rejected', () => {
  for (const value of [0, -1, 8, 1.5, '3', null, Infinity]) assert.throws(() => buildTrace(value), RangeError);
});

test('Manual moves reject illegal actions, preserve history, and support exact undo', () => {
  const start = createGame(3);
  assert.equal(tryMove(start, 'B', 'C').ok, false);
  assert.equal(tryMove(start, 'A', 'A').ok, false);
  assert.equal(tryMove(start, 'A', 'Z').ok, false);
  const moved = tryMove(start, 'A', 'C').game;
  assert.deepEqual(start.rods, initialRods(3));
  const invalid = tryMove(moved, 'A', 'C');
  assert.equal(invalid.ok, false);
  assert.equal(invalid.game, moved);
  assert.equal(invalid.game.history.length, 1);
  const restored = undoMove(moved);
  assert.deepEqual(restored.rods, start.rods);
  assert.deepEqual(restored.history, []);
});

test('Manual optimal solution and undo from completion', () => {
  let game = createGame(3);
  for (const event of buildTrace(3).filter((event) => event.type === 'move')) {
    const result = tryMove(game, event.movement.from, event.movement.to);
    assert.equal(result.ok, true);
    game = result.game;
  }
  assert.deepEqual(game.rods.C, [3, 2, 1]);
  assert.equal(game.history.length, 7);
  assert.equal(tryMove(game, 'C', 'A').ok, false);
  game = undoMove(game);
  assert.equal(game.history.length, 6);
  assert.equal(game.rods.C.length, 2);
});
