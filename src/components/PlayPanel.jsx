import { ListOrdered, Flag } from 'lucide-react';
import { minimumMoves } from '../lib/hanoi.js';

export default function PlayPanel({ game }) {
  return <aside className="recursion-panel play-panel" aria-label="Manual play details">
    <section><div className="panel-heading"><h2><Flag size={17} />The challenge</h2><span>{minimumMoves(game.n)} moves minimum</span></div>
      <p className="challenge-copy">Move the whole stack from <strong>A</strong> to <strong>C</strong>. Keep the larger disks underneath the smaller ones.</p>
      <ol className="rules-list"><li>Move one disk at a time.</li><li>Only the top disk can move.</li><li>A larger disk cannot sit on a smaller one.</li></ol>
      <p className="interaction-tip">Click a source and destination rod, or drag a top disk. Keyboard users can select rods with Tab and Enter.</p>
    </section>
    <section className="history-section"><div className="panel-heading"><h2><ListOrdered size={17} />Your moves</h2><span>{game.history.length} made</span></div>
      {game.history.length ? <ol className="move-history" aria-label="Move history, most recent first">{[...game.history].reverse().map((move, i) => <li key={game.history.length - i}><span className="history-number">{game.history.length - i}</span><span>Disk {move.disk}</span><span>{move.from} to {move.to}</span></li>)}</ol> : <p className="history-empty">Make your first move. We’ll keep track of the path you take.</p>}
    </section>
  </aside>;
}
