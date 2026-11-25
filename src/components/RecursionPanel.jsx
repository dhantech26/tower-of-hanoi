import { Layers, Code2 } from 'lucide-react';
import { CODE } from '../lib/hanoi.js';

export default function RecursionPanel({ event }) {
  return (
    <aside className="recursion-panel" aria-label="Recursion details">
      <section className="stack-section">
        <div className="panel-heading"><h2><Layers size={17} />Call stack</h2><span>Top first · {event.stack.length} active</span></div>
        <div className="call-stack" data-testid="call-stack">
          {event.stack.length ? [...event.stack].reverse().map((frame, i) => (
            <div key={frame.id} className={`stack-frame ${i === 0 ? 'is-active' : ''} ${frame.returned !== null ? 'is-returning' : ''}`}>
              <div className="frame-heading"><code>hanoi({frame.n}, {frame.from}, {frame.to}, {frame.via})</code><span>{frame.returned !== null ? `Return ${frame.returned}` : i === 0 ? 'Active' : 'Waiting'}</span></div>
              <p>{frame.from} to {frame.to}<span className="separator">·</span>helper {frame.via}</p>
              {(frame.left !== null || frame.right !== null) && <div className="frame-values">{frame.left !== null && <span>left = {frame.left}</span>}{frame.right !== null && <span>right = {frame.right}</span>}</div>}
            </div>
          )) : <div className="empty-stack"><span className="stack-outline" aria-hidden="true"><i /><i /><i /></span><p>{event.type === 'complete' || event.type === 'pop' ? 'All calls have returned.' : 'Your first call starts here.'}</p><span>{event.type === 'ready' ? 'Run the solution to see frames enter and leave the stack.' : 'The stack is empty.'}</span></div>}
        </div>
      </section>
      <section className="algorithm-section">
        <div className="panel-heading"><h2><Code2 size={17} />The algorithm</h2><span>Pseudocode</span></div>
        <ol className="algorithm-code" aria-label="Hanoi pseudocode">
          {CODE.map((line, i) => <li key={i} className={event.line === i ? 'is-current' : ''} aria-current={event.line === i ? 'step' : undefined}><span className="line-number" aria-hidden="true">{i + 1}</span><code>{line}</code></li>)}
        </ol>
        <p className="algorithm-note">Each call returns the number of moves it completed. A return value travels back to its parent.</p>
      </section>
    </aside>
  );
}
