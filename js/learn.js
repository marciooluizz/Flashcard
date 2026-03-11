import { getActiveStudy, state, persist } from './state.js';
import { fuzzyMatch, shuffle } from './utils.js';

function weightedQueue(cards) {
  const list = [];
  cards.forEach((card) => {
    const weight = Math.min(4, (state.weakCards[card.id] || 0) + 1);
    for (let i = 0; i < weight; i++) list.push(card);
  });
  return shuffle(list);
}

export function renderLearn(container) {
  const db = getActiveStudy();
  if (!db?.cards?.length) return (container.innerHTML = '<p>Import a study database first.</p>');
  let queue = weightedQueue(db.cards);
  let streak = 0;
  let correct = 0;
  let seen = 0;

  const next = () => {
    if (!queue.length) return finish();
    const card = queue.shift();
    const askReverse = Math.random() > 0.5;
    const prompt = askReverse ? card.translation : card.term;
    const expected = askReverse ? card.term : card.translation;
    const mcMode = Math.random() > 0.5;
    seen++;
    const pool = askReverse ? db.cards.map((c) => c.term) : db.cards.map((c) => c.translation);
    const options = shuffle([expected, ...shuffle(pool.filter((t) => t !== expected)).slice(0, 3)]);

    container.innerHTML = `
      <div class="question">
        <div class="badge">Streak: ${streak} | Accuracy: ${seen ? Math.round((correct / seen) * 100) : 0}%</div>
        <h3>${prompt}</h3>
        <p class="sr-note">${askReverse ? 'Reverse prompt' : 'Standard prompt'}</p>
        ${mcMode ? options.map((o) => `<button class="choice" data-choice="${o}">${o}</button>`).join('') : '<input id="typed" placeholder="Type answer"><button id="submitTyped">Submit</button>'}
      </div>`;

    const check = (ans) => {
      const ok = fuzzyMatch(ans, expected) || (card.synonyms || []).some((s) => fuzzyMatch(ans, s));
      if (ok) {
        streak++;
        correct++;
        state.weakCards[card.id] = Math.max(0, (state.weakCards[card.id] || 0) - 1);
      } else {
        streak = 0;
        state.weakCards[card.id] = (state.weakCards[card.id] || 0) + 1;
        queue.push(card, card);
      }
      state.progress[db.id] = {
        lastMode: 'learn',
        accuracy: Math.round((correct / seen) * 100),
        seen,
        streak,
        studied: correct
      };
      persist();
      setTimeout(next, 220);
    };

    container.querySelectorAll('[data-choice]').forEach((b) => (b.onclick = () => check(b.dataset.choice)));
    container.querySelector('#submitTyped')?.addEventListener('click', () => check(container.querySelector('#typed').value));
  };

  const finish = () => {
    container.innerHTML = `<h3>Done</h3><p>Accuracy: ${Math.round((correct / seen) * 100)}%</p><p>Best streak: ${streak}</p>`;
  };

  next();
}
