import { getActiveStudy, getFilteredStudyCards, state, persist, getWeakCardScore, setWeakCardScore } from './state.js';
import { fuzzyMatch, shuffle } from './utils.js';

function weightedQueue(db, cards) {
  const list = [];
  cards.forEach((card) => {
    const weight = Math.min(4, getWeakCardScore(db.id, card) + 1);
    for (let i = 0; i < weight; i++) list.push(card);
  });
  return shuffle(list);
}

export function renderLearn(container) {
  const db = getActiveStudy();
  if (!db?.cards?.length) return (container.innerHTML = '<div class="empty-state">Import a study database first.</div>');

  let pendingTimeout = null;

  container.innerHTML = `<div class='inline-grid'>
    <label>Answer style
      <select id='learnModeSelect'>
        <option value='both'>Multiple choice + text</option>
        <option value='mc'>Multiple choice only</option>
        <option value='typed'>Text only</option>
      </select>
    </label>
    <button id='startLearnBtn'>Start Learn Session</button>
  </div>
  <div id='learnArea'></div>`;

  container.querySelector('#learnModeSelect').value = state.preferences.learnMode || 'both';

  const startSession = () => {
    const cards = getFilteredStudyCards(db);
    if (!cards.length) {
      container.querySelector('#learnArea').innerHTML = '<div class="empty-state">No cards match the current filters.</div>';
      return;
    }

    state.preferences.learnMode = container.querySelector('#learnModeSelect').value;
    persist();

    let queue = weightedQueue(db, cards);
    let streak = 0;
    let bestStreak = 0;
    let correct = 0;
    let seen = 0;

    const next = () => {
      if (!queue.length) return finish();
      const card = queue.shift();
      const askReverse = Math.random() > 0.5;
      const prompt = askReverse ? card.translation : card.term;
      const expected = askReverse ? card.term : card.translation;
      const mode = state.preferences.learnMode;
      const mcMode = mode === 'mc' ? true : mode === 'typed' ? false : Math.random() > 0.5;
      const optionPool = (askReverse ? cards.map((c) => c.term) : cards.map((c) => c.translation)).filter(Boolean);
      const fallbackPool = (askReverse ? db.cards.map((c) => c.term) : db.cards.map((c) => c.translation)).filter(Boolean);
      const pool = optionPool.length >= 4 ? optionPool : fallbackPool;
      const options = shuffle([expected, ...shuffle(pool.filter((text) => text !== expected)).slice(0, 3)]);

      container.querySelector('#learnArea').innerHTML = `
        <div class="question">
          <div class="badge">Streak: ${streak} | Accuracy: ${seen ? Math.round((correct / seen) * 100) : 0}% | Mode: ${mode === 'both' ? 'mixed' : mode}</div>
          <h3>${prompt}</h3>
          <p class="sr-note">${askReverse ? 'Reverse prompt' : 'Standard prompt'}</p>
          ${mcMode ? options.map((option) => `<button class="choice" data-choice="${option}">${option}</button>`).join('') : '<input id="typed" placeholder="Type answer"><button id="submitTyped">Submit</button>'}
        </div>`;

      const check = (answer) => {
        seen++;
        const ok = fuzzyMatch(answer, expected) || (card.synonyms || []).some((item) => fuzzyMatch(answer, item));
        if (ok) {
          streak++;
          bestStreak = Math.max(bestStreak, streak);
          correct++;
          setWeakCardScore(db.id, card, getWeakCardScore(db.id, card) - 1);
        } else {
          streak = 0;
          setWeakCardScore(db.id, card, getWeakCardScore(db.id, card) + 1);
          queue.push(card, card);
        }
        state.progress[db.id] = {
          lastMode: 'learn',
          accuracy: Math.round((correct / seen) * 100),
          seen,
          streak,
          bestStreak,
          studied: correct
        };
        persist();
        pendingTimeout = setTimeout(next, 220);
      };

      container.querySelectorAll('[data-choice]').forEach((button) => (button.onclick = () => check(button.dataset.choice)));
      container.querySelector('#submitTyped')?.addEventListener('click', () => check(container.querySelector('#typed').value));
    };

    const finish = () => {
      container.querySelector('#learnArea').innerHTML = `<h3>Done</h3><p>Accuracy: ${Math.round((correct / seen) * 100)}%</p><p>Best streak: ${bestStreak}</p><p>Cards seen: ${seen}</p>`;
    };

    next();
  };

  container.querySelector('#startLearnBtn').onclick = startSession;
  startSession();

  container._cleanup = () => {
    if (pendingTimeout) clearTimeout(pendingTimeout);
  };
}
