import { getActiveStudy } from './state.js';
import { shuffle } from './utils.js';

export function renderMatchGame(container) {
  const db = getActiveStudy();
  const cards = db?.cards?.slice(0, 6) || [];
  if (!cards.length) return (container.innerHTML = '<p>Need cards to play.</p>');
  const terms = cards.map((c) => ({ key: c.id, text: c.term, side: 'term' }));
  const defs = cards.map((c) => ({ key: c.id, text: c.translation, side: 'translation' }));
  let first;
  let matched = 0;
  container.innerHTML = `<h3>Match Game</h3><p>Tap a term and translation pair.</p><div class='match-board'>${shuffle([...terms, ...defs]).map((t) => `<button class='tile' data-key='${t.key}'>${t.text}</button>`).join('')}</div><p id='gameStatus'></p>`;
  container.querySelectorAll('.tile').forEach((tile) => {
    tile.onclick = () => {
      if (tile.disabled) return;
      tile.classList.add('selected');
      if (!first) { first = tile; return; }
      const same = first.dataset.key === tile.dataset.key && first !== tile;
      if (same) { first.disabled = tile.disabled = true; matched++; }
      else { first.classList.remove('selected'); tile.classList.remove('selected'); }
      first = null;
      container.querySelector('#gameStatus').textContent = matched === cards.length ? 'Complete! Great speed round.' : `Matched ${matched}/${cards.length}`;
    };
  });
}
