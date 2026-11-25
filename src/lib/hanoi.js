export const RODS = ['A', 'B', 'C'];
export const MIN_DISKS = 1;
export const MAX_DISKS = 7;

export const CODE = [
  'hanoi(n, from, to, via)',
  '  if n == 1:',
  '    move(from, to)',
  '    return 1',
  '  left = hanoi(n−1, from, via, to)',
  '  move(from, to)',
  '  right = hanoi(n−1, via, to, from)',
  '  return left + 1 + right',
];

export function assertDiskCount(n) {
  if (!Number.isInteger(n) || n < MIN_DISKS || n > MAX_DISKS) {
    throw new RangeError('Choose a whole number of disks from 1 to 7.');
  }
}

export function initialRods(n) {
  assertDiskCount(n);
  return { A: Array.from({ length: n }, (_, i) => n - i), B: [], C: [] };
}

const cloneRods = (rods) => Object.fromEntries(RODS.map((rod) => [rod, [...rods[rod]]]));

/** A recursive solver instrumented with immutable execution snapshots. */
export function buildTrace(n) {
  const rods = initialRods(n);
  const frames = [];
  const events = [];
  let calls = 0;
  let moves = 0;
  let frameId = 0;
  let maxDepth = 0;

  function record(type, title, explanation, line = null, movement = null) {
    events.push({
      id: events.length, type, title, explanation, line, movement,
      rods: cloneRods(rods),
      stack: frames.map((frame) => ({ ...frame })),
      calls, moves, maxDepth,
    });
  }

  function move(from, to, line) {
    const disk = rods[from].at(-1);
    const movement = { disk, from, to, fromLevel: rods[from].length - 1, toLevel: rods[to].length };
    rods[to].push(rods[from].pop());
    moves += 1;
    record('move', `Move disk ${disk}`, `Move disk ${disk} from ${from} to ${to}. Only the top disk moves.`, line, movement);
  }

  function hanoi(count, from, to, via) {
    const frame = { id: ++frameId, n: count, from, to, via, resumeLine: 0, returned: null, left: null, right: null };
    frames.push(frame);
    calls += 1;
    maxDepth = Math.max(maxDepth, frames.length);
    record('call', `Call hanoi(${count}, ${from}, ${to}, ${via})`, `Move ${count} ${count === 1 ? 'disk' : 'disks'} from ${from} to ${to}, using ${via} as the helper. Push this call onto the stack.`, 0);
    let result;
    if (count === 1) {
      record('base', 'Base case reached', 'Only one disk remains. Move it directly, without another recursive call.', 1);
      move(from, to, 2);
      result = 1;
    } else {
      frame.resumeLine = 4;
      record('recurse', 'Make room for the largest disk', `First move the top ${count - 1} ${count - 1 === 1 ? 'disk' : 'disks'} from ${from} to ${via}. This call waits while its smaller subproblem runs.`, 4);
      frame.left = hanoi(count - 1, from, via, to);
      record('resume', `Resume hanoi(${count}, ${from}, ${to}, ${via})`, `The smaller call returned ${frame.left}. Store it as left and continue the parent call.`, 4);
      move(from, to, 5);
      frame.resumeLine = 6;
      record('recurse', 'Rebuild the smaller stack', `Move the ${count - 1} smaller ${count - 1 === 1 ? 'disk' : 'disks'} from ${via} onto disk ${count} at ${to}.`, 6);
      frame.right = hanoi(count - 1, via, to, from);
      record('resume', `Resume hanoi(${count}, ${from}, ${to}, ${via})`, `The second smaller call returned ${frame.right}. Store it as right and calculate this call's total.`, 6);
      result = frame.left + 1 + frame.right;
    }
    frame.returned = result;
    record('return', `Return ${result}`, count === 1 ? 'This base case completed one move, so it returns 1.' : `${frame.left} moves on the left + 1 move here + ${frame.right} moves on the right = ${result}. Return this total.`, count === 1 ? 3 : 7);
    frames.pop();
    record('pop', 'Remove the finished call', frames.length ? `Pop this frame. Control returns to hanoi(${frames.at(-1).n}, ${frames.at(-1).from}, ${frames.at(-1).to}, ${frames.at(-1).via}).` : 'The outer call has returned. The call stack is now empty.', frames.length ? frames.at(-1).resumeLine : (count === 1 ? 3 : 7));
    return result;
  }

  record('ready', 'Ready when you are', 'Start automatic playback, or take one execution step at a time. Watch the disks, code, and call stack together.');
  const result = hanoi(n, 'A', 'C', 'B');
  record('complete', 'Every call has returned', `All ${n} ${n === 1 ? 'disk is' : 'disks are'} on C. The solution used ${result} moves and ${calls} function calls. The outer function returned ${result}.`);
  return events;
}

export function createGame(n) {
  return { n, rods: initialRods(n), history: [], revision: 0, lastMove: null };
}

/** Return a new game for legal moves; keep the original untouched for errors. */
export function tryMove(game, from, to, dragged = false) {
  if (!RODS.includes(from) || !RODS.includes(to)) return { ok: false, error: 'Choose one of the three rods.', game };
  if (from === to) return { ok: false, error: 'Choose a different destination rod.', game };
  if (game.rods.C.length === game.n) return { ok: false, error: 'This puzzle is complete. Start again to play another round.', game };
  const disk = game.rods[from].at(-1);
  if (disk === undefined) return { ok: false, error: `Rod ${from} has no disks to move.`, game };
  const top = game.rods[to].at(-1);
  if (top !== undefined && disk > top) return { ok: false, error: `Disk ${disk} cannot sit on smaller disk ${top}. Try another rod.`, game };
  const rods = cloneRods(game.rods);
  const movement = { disk, from, to, fromLevel: rods[from].length - 1, toLevel: rods[to].length, dragged };
  rods[to].push(rods[from].pop());
  const next = { ...game, rods, history: [...game.history, movement], revision: game.revision + 1, lastMove: movement };
  return { ok: true, game: next };
}

export function undoMove(game) {
  if (!game.history.length) return game;
  const previous = game.history.at(-1);
  const rods = cloneRods(game.rods);
  const movement = { disk: previous.disk, from: previous.to, to: previous.from, fromLevel: rods[previous.to].length - 1, toLevel: rods[previous.from].length, dragged: false };
  rods[previous.from].push(rods[previous.to].pop());
  return { ...game, rods, history: game.history.slice(0, -1), revision: game.revision + 1, lastMove: movement };
}

export const minimumMoves = (n) => 2 ** n - 1;

export function eventDuration(event) {
  if (event.type === 'move') return 1400;
  if (event.type === 'pop') return 650;
  if (event.type === 'base' || event.type === 'return') return 1100;
  return 950;
}
