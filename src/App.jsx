import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react';
import { Play, Pause, RotateCcw, ChevronLeft, ChevronRight, ChevronDown, Undo2, Clock3, Check, Info, Keyboard, CircleAlert } from 'lucide-react';
import TowerBoard from './components/TowerBoard.jsx';
import RecursionPanel from './components/RecursionPanel.jsx';
import PlayPanel from './components/PlayPanel.jsx';
import { buildTrace, createGame, tryMove, undoMove, minimumMoves, eventDuration } from './lib/hanoi.js';
import { PlaybackClock, formatElapsed } from './lib/playback.js';

function readPreferences() {
  try {
    const saved = JSON.parse(localStorage.getItem('hanoi-preferences') || '{}');
    return { n: Number.isInteger(saved.n) && saved.n >= 1 && saved.n <= 7 ? saved.n : 3, speed: Number.isFinite(saved.speed) && saved.speed >= 0.5 && saved.speed <= 4 ? saved.speed : 1 };
  } catch { return { n: 3, speed: 1 }; }
}

function usePlayTime(active, resetKey) {
  const [elapsed, setElapsed] = useState(0);
  const accumulated = useRef(0);
  useEffect(() => { accumulated.current = 0; setElapsed(0); }, [resetKey]);
  useEffect(() => {
    if (!active) return;
    const start = performance.now();
    const timer = setInterval(() => setElapsed(accumulated.current + performance.now() - start), 100);
    return () => { accumulated.current += performance.now() - start; setElapsed(accumulated.current); clearInterval(timer); };
  }, [active, resetKey]);
  return elapsed;
}

export default function App() {
  const [preferences] = useState(readPreferences);
  const [n, setN] = useState(preferences.n);
  const [speed, setSpeed] = useState(preferences.speed);
  const [mode, setMode] = useState('learn');
  const events = useMemo(() => buildTrace(n), [n]);
  const clock = useMemo(() => new PlaybackClock(events), [events]);
  const playback = useSyncExternalStore(clock.subscribe, clock.getSnapshot, clock.getSnapshot);
  const event = events[playback.index];
  const [game, setGame] = useState(() => createGame(preferences.n));
  const [gameSession, setGameSession] = useState(0);
  const [selected, setSelected] = useState(null);
  const [feedback, setFeedback] = useState(null);
  const solved = game.rods.C.length === n;
  const playTime = usePlayTime(mode === 'play' && game.history.length > 0 && !solved, gameSession);
  const learn = mode === 'learn';
  const finished = learn ? event.type === 'complete' : solved;
  const running = learn ? playback.playing : game.history.length > 0 && !solved;
  const minimum = minimumMoves(n);
  const moves = learn ? event.moves : game.history.length;
  const stateLabel = finished ? 'Complete' : running ? (learn ? 'Running' : 'Playing') : learn && playback.index > 0 ? 'Paused' : 'Ready';

  useEffect(() => () => clock.dispose(), [clock]);
  useEffect(() => { clock.setSpeed(speed); }, [clock, speed]);
  useEffect(() => { try { localStorage.setItem('hanoi-preferences', JSON.stringify({ n, speed })); } catch { /* The app also works without browser storage. */ } }, [n, speed]);

  function resetGame() { setGame(createGame(n)); setSelected(null); setFeedback(null); setGameSession((value) => value + 1); }
  function changeDisks(value) {
    clock.pause();
    setN(value); setGame(createGame(value)); setSelected(null); setFeedback(null); setGameSession((session) => session + 1);
  }
  function changeMode(nextMode) { clock.pause(); setMode(nextMode); setSelected(null); setFeedback(null); }
  function togglePlayback() { if (clock.getSnapshot().playing) clock.pause(); else clock.play(); }

  useEffect(() => {
    function onKey(event) {
      if (event.altKey || event.ctrlKey || event.metaKey || event.target.closest('input,select,textarea,button,a,summary,[contenteditable="true"]')) return;
      if (mode !== 'learn') return;
      if (event.code === 'Space') { event.preventDefault(); if (clock.getSnapshot().playing) clock.pause(); else clock.play(); }
      if (event.key === 'ArrowRight') { event.preventDefault(); clock.seek(clock.getSnapshot().index + 1); }
      if (event.key === 'ArrowLeft') { event.preventDefault(); clock.seek(clock.getSnapshot().index - 1); }
      if (event.key.toLowerCase() === 'r') clock.reset();
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [clock, mode]);

  function makeMove(from, to, dragged = false) {
    const result = tryMove(game, from, to, dragged);
    if (!result.ok) { setFeedback({ error: true, text: result.error }); return; }
    setGame(result.game); setSelected(null);
    setFeedback({ error: false, text: `Disk ${result.game.lastMove.disk} moved from ${from} to ${to}. Choose your next move.` });
  }

  function selectRod(rod) {
    if (solved) return;
    if (selected === rod) { setSelected(null); setFeedback(null); return; }
    if (selected) { makeMove(selected, rod); return; }
    if (!game.rods[rod].length) { setFeedback({ error: true, text: `Rod ${rod} is empty. Choose a rod with a disk.` }); return; }
    setSelected(rod); setFeedback({ error: false, text: `Disk ${game.rods[rod].at(-1)} selected on ${rod}. Choose a destination rod.` });
  }

  const manualTitle = solved ? 'Puzzle complete' : feedback?.error ? 'Try another move' : selected ? 'Choose a destination' : 'Your turn';
  const manualExplanation = solved ? `Solved in ${game.history.length} moves. ${game.history.length === minimum ? 'You found the shortest solution.' : `The shortest solution uses ${minimum} moves. Try again to improve your path.`}` : feedback?.text || 'Move the stack from A to C. Click two rods, or drag a top disk to its destination.';
  const remaining = Math.max(0, (1 - playback.progress) * eventDuration(event) / speed / 1000);
  const timelineProgress = playback.index / (events.length - 1);

  return (
    <div className="app-shell">
      <header className="app-header">
        <div className="brand-line"><span className="brand-mark" aria-hidden="true"><i /><i /><i /></span><span>The Recursion Lab</span></div>
        <div className="title-row"><div><h1>Tower of Hanoi</h1><p>A small puzzle. A closer look at recursion.</p></div><div className="course-label"><span>Data structures</span><span>An interactive study</span></div></div>
      </header>

      <nav className="workspace-toolbar" aria-label="Simulator settings">
        <div className="mode-tabs" role="tablist" aria-label="Simulator mode">
          <button type="button" id="learn-tab" role="tab" aria-selected={learn} aria-controls="simulator-workspace" className={learn ? 'is-selected' : ''} onClick={() => changeMode('learn')}>Learn the solution</button>
          <button type="button" id="play-tab" role="tab" aria-selected={!learn} aria-controls="simulator-workspace" className={!learn ? 'is-selected' : ''} onClick={() => changeMode('play')}>Play yourself</button>
        </div>
        <label className="disk-picker"><span>Disks</span><span className="select-wrap"><select aria-label="Number of disks" value={n} onChange={(event) => changeDisks(Number(event.target.value))}>{Array.from({ length: 7 }, (_, i) => <option key={i + 1} value={i + 1}>{i + 1}</option>)}</select><ChevronDown size={15} aria-hidden="true" /></span></label>
      </nav>

      <main id="simulator-workspace" className="workspace" role="tabpanel" aria-labelledby={learn ? 'learn-tab' : 'play-tab'}>
        <section className="simulator" aria-label="Tower of Hanoi simulator">
          <div className="simulation-heading"><h2>{learn ? 'Watch the solution unfold' : 'Find your own solution'}</h2><span className={`run-status ${running ? 'is-running' : ''} ${finished ? 'is-complete' : ''}`} data-testid="run-status">{finished ? <Check size={14} /> : <span className="status-dot" aria-hidden="true" />}{stateLabel}</span></div>

          <div className="control-strip">
            {learn ? <div className="playback-buttons">
              <button type="button" className="button button-primary" onClick={togglePlayback} data-testid="auto-run">{playback.playing ? <Pause size={17} fill="currentColor" /> : <Play size={17} fill="currentColor" />}{playback.playing ? 'Pause' : finished ? 'Replay' : playback.index > 0 ? 'Resume' : 'Auto run'}</button>
              <button type="button" className="button icon-button" aria-label="Previous step" disabled={playback.index === 0} onClick={() => clock.seek(playback.index - 1)}><ChevronLeft size={19} /></button>
              <button type="button" className="button" disabled={finished} onClick={() => clock.seek(playback.index + 1)} aria-label="Next step">Step<ChevronRight size={17} /></button>
              <button type="button" className="button button-quiet icon-button" aria-label="Reset simulation" onClick={clock.reset}><RotateCcw size={17} /></button>
            </div> : <div className="playback-buttons"><button type="button" className="button" disabled={!game.history.length} onClick={() => { setGame(undoMove(game)); setSelected(null); setFeedback(null); }}><Undo2 size={17} />Undo move</button><button type="button" className="button button-quiet" onClick={resetGame}><RotateCcw size={17} />Start again</button></div>}
            {learn && <label className="speed-control"><span>Speed <output data-testid="speed-value">{speed}×</output></span><input type="range" min="0.5" max="4" step="0.5" value={speed} onChange={(event) => setSpeed(Number(event.target.value))} aria-label="Playback speed" aria-valuetext={`${speed} times normal speed`} style={{ '--range-fill': `${(speed - 0.5) / 3.5 * 100}%` }} /><span className="speed-endpoints"><span>0.5×</span><span>4×</span></span></label>}
          </div>

          <TowerBoard key={`${n}-${mode}`} n={n} rods={learn ? event.rods : game.rods} mode={mode} activeFrame={event.stack.at(-1)} movement={learn ? event.movement : null} progress={playback.progress} selected={selected} onRodSelect={selectRod} onMove={makeMove} manualMovement={game.lastMove} complete={finished} />

          <div className="metrics-strip">
            <div><span>Moves</span><strong data-testid="move-count">{moves}<small> / {minimum}</small></strong></div>
            {learn ? <><div><span>Function calls</span><strong data-testid="call-count">{event.calls}</strong></div><div><span>Stack depth</span><strong data-testid="stack-depth">{event.stack.length}<small> / {n}</small></strong></div></> : <div><span>Minimum moves</span><strong>{minimum}</strong></div>}
            <div className="time-metric"><span><Clock3 size={13} />Active time</span><strong data-testid="elapsed-time">{formatElapsed(learn ? playback.elapsedMs : playTime)}</strong></div>
          </div>

          <div className={`event-explanation ${!learn && feedback?.error && !solved ? 'has-error' : ''} ${finished ? 'is-complete' : ''}`} role={!learn && feedback?.error && !solved ? 'alert' : 'status'} aria-live="polite" aria-atomic="true">
            <div className="event-marker" aria-hidden="true">{finished ? <Check size={19} /> : !learn && feedback?.error ? <CircleAlert size={19} /> : <span>{learn ? String(playback.index).padStart(2, '0') : <Info size={18} />}</span>}</div>
            <div><h3>{learn ? event.title : manualTitle}</h3><p>{learn ? event.explanation : manualExplanation}</p></div>
          </div>

          {learn && <div className="execution-controls">
            <div className="step-progress-label"><span>{playback.playing ? 'Current step in progress' : finished ? 'Execution complete' : playback.index === 0 ? 'Ready to begin' : 'Execution paused'}</span><span data-testid="step-count">{playback.index} / {events.length - 1} steps</span></div>
            <div className={`step-progress ${playback.playing ? 'is-running' : ''}`} role="progressbar" aria-label="Current execution step progress" aria-valuenow={Math.round(playback.progress * 100)} aria-valuemin={0} aria-valuemax={100}><span style={{ transform: `scaleX(${playback.index === 0 ? 0 : playback.progress})` }} /></div>
            <div className="playback-detail"><span>{playback.playing ? `Next step in ${remaining.toFixed(1)}s` : finished ? 'The call stack is empty.' : 'Each step is a call, a move, or a return.'}</span><span>{playback.playing ? `${speed}× playback` : 'Use the slider to revisit a step.'}</span></div>
            <label className="timeline"><span className="sr-only">Execution timeline</span><input type="range" aria-label="Execution timeline" min="0" max={events.length - 1} step="1" value={playback.index} onChange={(event) => clock.seek(Number(event.target.value))} style={{ '--range-fill': `${timelineProgress * 100}%` }} /><span className="timeline-labels"><span>Start</span><span>All calls returned</span></span></label>
          </div>}

          {finished && <div className="completion-summary"><Check size={18} /><p>{learn ? <><strong>Solution complete.</strong> {minimum} moves · {event.calls} calls · maximum depth {event.maxDepth} · returned {minimum}</> : <><strong>{game.history.length === minimum ? 'An optimal solution.' : 'Nicely solved.'}</strong> {game.history.length} moves · best possible {minimum}</>}</p></div>}
        </section>
        {learn ? <RecursionPanel event={event} /> : <PlayPanel game={game} />}
      </main>

      <details className="explanation-guide"><summary><Info size={17} /><span>How the puzzle and recursion work</span><ChevronDown size={17} /></summary><div className="guide-content"><section><h2>One smaller problem at a time</h2><p>Move n−1 disks to the helper rod, move the largest disk to the destination, then move the smaller stack onto it. With one disk, move it directly: that is the base case.</p></section><section><h2>Follow the stack</h2><p>Each function call adds a frame. A parent waits for its child to finish. Returning removes the child frame and resumes the parent. Source, helper, and destination roles change for each call.</p></section><section><h2>Moves, calls, and steps</h2><p>The shortest solution takes 2ⁿ − 1 moves. With our one-disk base case, it also makes 2ⁿ − 1 function calls. Execution steps include calls, moves, and returns, so there are more steps than moves. Changing the disk count starts a new puzzle.</p></section></div></details>

      <footer className="app-footer"><span>Observe. Step through. Try it yourself.</span><span className="keyboard-hint"><Keyboard size={15} />Space: play/pause<span>·</span>← / →: step<span>·</span>R: reset</span></footer>
    </div>
  );
}
