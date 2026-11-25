import { useEffect, useRef, useState } from 'react';
import { RODS } from '../lib/hanoi.js';

const center = (rod) => 100 / 6 + RODS.indexOf(rod) * 100 / 3;
const height = (level) => 8 + level * 32;
const ease = (value) => value * value * (3 - 2 * value);
const mix = (a, b, progress) => a + (b - a) * ease(progress);

function flyingPosition(movement, progress, n) {
  const start = center(movement.from);
  const end = center(movement.to);
  const clearance = Math.max(190, n * 32 + 30);
  if (progress < 0.25) return { left: start, bottom: mix(height(movement.fromLevel), clearance, progress / 0.25) };
  if (progress < 0.75) return { left: mix(start, end, (progress - 0.25) / 0.5), bottom: clearance };
  return { left: end, bottom: mix(clearance, height(movement.toLevel), (progress - 0.75) / 0.25) };
}

export default function TowerBoard({ n, rods, mode, activeFrame, movement, progress, selected, onRodSelect, onMove, manualMovement, complete }) {
  const boardRef = useRef(null);
  const diskRefs = useRef({});
  const pointer = useRef(null);
  const suppressClick = useRef(false);
  const [drag, setDrag] = useState(null);
  const [reducedMotion, setReducedMotion] = useState(() => window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  const interactive = mode === 'play' && !complete;

  useEffect(() => {
    const media = window.matchMedia('(prefers-reduced-motion: reduce)');
    const update = () => setReducedMotion(media.matches);
    media.addEventListener('change', update);
    return () => media.removeEventListener('change', update);
  }, []);

  useEffect(() => {
    if (!manualMovement || manualMovement.dragged || reducedMotion || mode !== 'play') return;
    const element = diskRefs.current[manualMovement.disk];
    if (!element?.animate) return;
    const clearance = Math.max(190, n * 32 + 30);
    const animation = element.animate([
      { left: `${center(manualMovement.from)}%`, bottom: `${height(manualMovement.fromLevel)}px`, offset: 0 },
      { left: `${center(manualMovement.from)}%`, bottom: `${clearance}px`, offset: 0.25 },
      { left: `${center(manualMovement.to)}%`, bottom: `${clearance}px`, offset: 0.75 },
      { left: `${center(manualMovement.to)}%`, bottom: `${height(manualMovement.toLevel)}px`, offset: 1 },
    ], { duration: 600, easing: 'ease-in-out' });
    return () => animation.cancel();
  }, [manualMovement, reducedMotion, n, mode]);

  function pointerDown(event, disk, rod, top) {
    if (!interactive || !top || event.button !== 0) return;
    pointer.current = { id: event.pointerId, disk, rod, x: event.clientX, y: event.clientY, dragging: false };
    event.currentTarget.setPointerCapture(event.pointerId);
  }

  function pointerMove(event) {
    const current = pointer.current;
    if (!current || event.pointerId !== current.id) return;
    if (Math.hypot(event.clientX - current.x, event.clientY - current.y) > 7) current.dragging = true;
    if (!current.dragging) return;
    const bounds = boardRef.current.getBoundingClientRect();
    setDrag({ disk: current.disk, x: (event.clientX - bounds.left) / bounds.width * 100, bottom: bounds.bottom - event.clientY - 14 });
  }

  function pointerUp(event) {
    const current = pointer.current;
    if (!current || event.pointerId !== current.id) return;
    if (current.dragging) {
      suppressClick.current = true;
      const bounds = boardRef.current.getBoundingClientRect();
      const column = Math.floor((event.clientX - bounds.left) / bounds.width * 3);
      if (column >= 0 && column < 3 && event.clientY >= bounds.top - 25 && event.clientY <= bounds.bottom + 25) {
        onMove(current.rod, RODS[column], true);
      }
      setTimeout(() => { suppressClick.current = false; }, 0);
    }
    pointer.current = null;
    setDrag(null);
  }

  const disks = RODS.flatMap((rod) => rods[rod].map((disk, level) => ({ disk, level, rod, top: level === rods[rod].length - 1 })));

  return (
    <div className={`tower-scene ${interactive ? 'is-interactive' : ''}`}>
      <div className="tower-board" ref={boardRef} aria-label={`${n} disks on three rods. Goal: move all disks from A to C.`}>
        {RODS.map((rod) => <div className="rod-structure" style={{ left: `${center(rod)}%`, height: `${Math.max(175, n * 32 + 14)}px` }} key={rod} aria-hidden="true" />)}
        <div className="tower-baseline" aria-hidden="true" />
        {interactive && RODS.map((rod) => (
          <button key={rod} type="button" className={`rod-zone ${selected === rod ? 'is-selected' : ''}`} style={{ left: `${RODS.indexOf(rod) * 100 / 3}%` }} aria-label={`Rod ${rod}, ${rods[rod].length ? `top disk ${rods[rod].at(-1)}` : 'empty'}`} aria-pressed={selected === rod} onClick={() => onRodSelect(rod)} />
        ))}
        {disks.sort((a, b) => a.disk - b.disk).map(({ disk, level, rod, top }) => {
          let position = { left: center(rod), bottom: height(level) };
          if (mode === 'learn' && movement?.disk === disk && progress < 1 && !reducedMotion) position = flyingPosition(movement, progress, n);
          if (drag?.disk === disk) position = { left: drag.x, bottom: drag.bottom };
          const flying = (movement?.disk === disk && progress < 1) || drag?.disk === disk;
          return (
            <button type="button" key={disk} ref={(element) => { diskRefs.current[disk] = element; }}
              className={`disk disk-${disk} ${interactive && top ? 'can-move' : ''} ${selected === rod && top ? 'is-picked' : ''} ${flying ? 'is-flying' : ''}`}
              style={{ left: `${position.left}%`, bottom: `${position.bottom}px`, width: `${10 + (disk - 1) / Math.max(1, n - 1) * 18}%` }}
              disabled={!interactive || !top}
              aria-label={`Disk ${disk} on rod ${rod}${top ? ', top disk' : ''}`}
              data-testid={`disk-${disk}`} data-rod={rod}
              onPointerDown={(event) => pointerDown(event, disk, rod, top)} onPointerMove={pointerMove} onPointerUp={pointerUp}
              onPointerCancel={() => { pointer.current = null; setDrag(null); }}
              onClick={() => { if (!suppressClick.current) onRodSelect(rod); }}>
              <span>{disk}</span>
            </button>
          );
        })}
      </div>
      <div className="rod-labels">
        {RODS.map((rod) => <div key={rod}><span className="rod-letter">{rod}</span><span className="rod-role">{mode === 'learn' && activeFrame ? (activeFrame.from === rod ? 'Source' : activeFrame.to === rod ? 'Destination' : 'Helper') : ({ A: 'Start', B: 'Helper', C: 'Goal' }[rod])}</span></div>)}
      </div>
    </div>
  );
}
