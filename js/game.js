import { getActiveStudy, filterStudyCards, state } from './state.js';
import { shuffle } from './utils.js';

export function renderMatchGame(container) {
  const db = getActiveStudy();
  if (!db?.cards?.length) return (container.innerHTML = '<div class="empty-state">Need cards to play.</div>');

  container.innerHTML = `<div class='inline-grid'>
    <label>Pairs <input id='pairCount' type='number' min='3' max='12' value='6'></label>
    <label>Difficulty <select id='matchDifficulty'><option value=''>Any</option><option>easy</option><option>medium</option><option>hard</option></select></label>
    <button id='generateMatch'>Generate Round</button>
  </div>
  <div id='matchArea'></div>`;

  const renderRound = () => {
    const pairCount = Math.max(3, Math.min(12, +container.querySelector('#pairCount').value || 6));
    const diff = container.querySelector('#matchDifficulty').value;
    const basePool = filterStudyCards(db.cards, {
      dbId: db.id,
      search: state.filters.search,
      favoritesOnly: state.filters.favoritesOnly,
      sort: ''
    });
    const source = diff ? basePool.filter((card) => card.difficulty === diff) : basePool;
    const cards = shuffle(source).slice(0, Math.min(pairCount, source.length));
    if (!cards.length) {
      container.querySelector('#matchArea').innerHTML = '<div class="empty-state">No cards available for this round.</div>';
      return;
    }

    const terms = cards.map((card) => ({ key: card.id, text: card.term, side: 'term' }));
    const defs = cards.map((card) => ({ key: card.id, text: card.translation, side: 'translation' }));
    let first;
    let matched = 0;

    container.querySelector('#matchArea').innerHTML = `<h3>Match Game</h3><p>Tap a term and translation pair.</p><div class='match-board'>${shuffle([...terms, ...defs]).map((tile) => `<button class='tile' data-key='${tile.key}' data-side='${tile.side}'>${tile.text}</button>`).join('')}</div><p id='gameStatus'>Matched 0/${cards.length}</p>`;
    container.querySelectorAll('.tile').forEach((tile) => {
      tile.onclick = () => {
        if (tile.disabled) return;
        tile.classList.add('selected');
        if (!first) { first = tile; return; }
        const samePair = first.dataset.key === tile.dataset.key && first.dataset.side !== tile.dataset.side;
        if (samePair) {
          first.disabled = true;
          tile.disabled = true;
          first.classList.remove('selected');
          tile.classList.remove('selected');
          matched++;
        } else {
          const previous = first;
          setTimeout(() => {
            previous.classList.remove('selected');
            tile.classList.remove('selected');
          }, 120);
        }
        first = null;
        container.querySelector('#gameStatus').textContent = matched === cards.length ? 'Complete! Great speed round.' : `Matched ${matched}/${cards.length}`;
      };
    });
  };

  container.querySelector('#generateMatch').onclick = renderRound;
  renderRound();
}
