import { eventDuration } from './hanoi.js';

/** One clock owns playback. UI renders, timer labels, and speed changes never recreate it. */
export class PlaybackClock {
  constructor(events, scheduler) {
    this.events = events;
    this.scheduler = scheduler ?? {
      now: () => performance.now(),
      request: (callback) => requestAnimationFrame(callback),
      cancel: (id) => cancelAnimationFrame(id),
    };
    this.listeners = new Set();
    this.frame = null;
    this.lastTime = 0;
    this.state = { index: 0, progress: 1, elapsedMs: 0, playing: false, speed: 1 };
  }

  getSnapshot = () => this.state;
  subscribe = (listener) => { this.listeners.add(listener); return () => this.listeners.delete(listener); };
  emit = (next) => { this.state = { ...this.state, ...next }; this.listeners.forEach((listener) => listener()); };
  cancelFrame = () => { if (this.frame !== null) this.scheduler.cancel(this.frame); this.frame = null; };

  play = () => {
    if (this.state.playing) return;
    let { index, progress, elapsedMs } = this.state;
    if (index === this.events.length - 1) { index = 0; progress = 1; elapsedMs = 0; }
    if (progress >= 1) { index += 1; progress = 0; }
    this.lastTime = this.scheduler.now();
    this.emit({ index, progress, elapsedMs, playing: true });
    this.frame = this.scheduler.request(this.tick);
  };

  tick = (time) => {
    this.frame = null;
    if (!this.state.playing) return;
    const delta = Math.max(0, time - this.lastTime);
    this.lastTime = time;
    let budget = delta * this.state.speed;
    let { index, progress, elapsedMs } = this.state;
    let playing = true;
    while (budget > 0 && playing) {
      const duration = eventDuration(this.events[index]);
      const used = Math.min(budget, (1 - progress) * duration);
      progress = Math.min(1, progress + used / duration);
      elapsedMs += used / this.state.speed;
      budget -= used;
      if (progress >= 1 - 1e-9) {
        index += 1;
        progress = 0;
        if (index >= this.events.length - 1) {
          index = this.events.length - 1;
          progress = 1;
          playing = false;
        }
      }
    }
    this.emit({ index, progress, elapsedMs, playing });
    if (playing) this.frame = this.scheduler.request(this.tick);
  };

  pause = () => { this.cancelFrame(); if (this.state.playing) this.emit({ playing: false }); };

  seek = (index) => {
    if (!Number.isInteger(index)) return;
    this.cancelFrame();
    this.emit({ index: Math.max(0, Math.min(this.events.length - 1, index)), progress: 1, playing: false });
  };

  reset = () => { this.cancelFrame(); this.emit({ index: 0, progress: 1, elapsedMs: 0, playing: false }); };

  setSpeed = (speed) => {
    if (!Number.isFinite(speed) || speed < 0.5 || speed > 4) return;
    if (speed !== this.state.speed) this.emit({ speed });
  };

  dispose = () => { this.cancelFrame(); if (this.state.playing) this.emit({ playing: false }); };
}

export function formatElapsed(ms) {
  const seconds = Math.floor(ms / 1000);
  return `${Math.floor(seconds / 60).toString().padStart(2, '0')}:${(seconds % 60).toString().padStart(2, '0')}`;
}
