import test from 'node:test';
import assert from 'node:assert/strict';
import { buildTrace } from '../src/lib/hanoi.js';
import { PlaybackClock, formatElapsed } from '../src/lib/playback.js';

function fakeClock(n = 3) {
  let now = 0;
  let nextId = 1;
  const scheduled = new Map();
  const clock = new PlaybackClock(buildTrace(n), {
    now: () => now,
    request: (callback) => { const id = nextId++; scheduled.set(id, callback); return id; },
    cancel: (id) => scheduled.delete(id),
  });
  return { clock, scheduled, advance(ms) { now += ms; const callbacks = [...scheduled.values()]; scheduled.clear(); callbacks.forEach((callback) => callback(now)); } };
}

test('Playback keeps running through repeated display updates', () => {
  const { clock, advance, scheduled } = fakeClock();
  let updates = 0;
  clock.subscribe(() => { updates += 1; clock.getSnapshot(); });
  clock.play();
  assert.equal(clock.getSnapshot().index, 1);
  for (let i = 0; i < 100; i += 1) advance(16);
  assert.equal(clock.getSnapshot().playing, true);
  assert(clock.getSnapshot().index > 1);
  assert.equal(Math.round(clock.getSnapshot().elapsedMs), 1600);
  assert.equal(scheduled.size, 1, 'Exactly one animation clock is active');
  assert(updates >= 100);
});

test('Pause freezes elapsed time and event progress; resume continues', () => {
  const { clock, advance } = fakeClock();
  clock.play(); advance(400); clock.pause();
  const paused = clock.getSnapshot();
  advance(5000);
  assert.deepEqual(clock.getSnapshot(), paused);
  clock.play(); advance(200);
  assert.equal(clock.getSnapshot().index, paused.index);
  assert(clock.getSnapshot().progress > paused.progress);
  assert.equal(Math.round(clock.getSnapshot().elapsedMs), 600);
});

test('Speed changes affect the current step without stopping or resetting it', () => {
  const { clock, advance } = fakeClock();
  clock.play(); advance(400);
  const before = clock.getSnapshot();
  clock.setSpeed(2);
  assert.equal(clock.getSnapshot().progress, before.progress);
  assert.equal(clock.getSnapshot().playing, true);
  advance(200);
  assert(Math.abs(clock.getSnapshot().progress - 800 / 950) < 1e-9);
  assert.equal(Math.round(clock.getSnapshot().elapsedMs), 600);
  clock.setSpeed(0);
  assert.equal(clock.getSnapshot().speed, 2);
});

test('Completion stops the clock and Replay starts a clean execution', () => {
  const { clock, advance, scheduled } = fakeClock();
  clock.setSpeed(4); clock.play(); advance(100000);
  assert.equal(clock.getSnapshot().playing, false);
  assert.equal(clock.getSnapshot().index, clock.events.length - 1);
  assert.equal(clock.getSnapshot().progress, 1);
  assert.equal(scheduled.size, 0);
  clock.play();
  assert.equal(clock.getSnapshot().index, 1);
  assert.equal(clock.getSnapshot().elapsedMs, 0);
  assert.equal(clock.getSnapshot().playing, true);
  assert.equal(clock.getSnapshot().speed, 4);
});

test('Seeking and resetting cancel scheduled work', () => {
  const { clock, advance, scheduled } = fakeClock();
  clock.play(); advance(300); clock.seek(6);
  assert.equal(scheduled.size, 0);
  assert.equal(clock.getSnapshot().index, 6);
  assert.equal(clock.getSnapshot().progress, 1);
  advance(1000); assert.equal(clock.getSnapshot().index, 6);
  clock.play(); assert.equal(clock.getSnapshot().index, 7);
  clock.reset();
  assert.equal(clock.getSnapshot().index, 0);
  assert.equal(clock.getSnapshot().elapsedMs, 0);
  assert.equal(scheduled.size, 0);
});

test('Cleanup cancels playback and the same controller can be mounted again', () => {
  const { clock, advance, scheduled } = fakeClock();
  clock.play(); clock.dispose(); advance(1000);
  assert.equal(clock.getSnapshot().playing, false);
  assert.equal(scheduled.size, 0);
  clock.play(); advance(1000);
  assert.equal(clock.getSnapshot().playing, true);
});

test('Elapsed time uses minutes and seconds', () => {
  assert.equal(formatElapsed(0), '00:00');
  assert.equal(formatElapsed(61999), '01:01');
});
