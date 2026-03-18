import { getActiveStudy, getFilteredStudyCards, state, persist, getWeakCardScore, setWeakCardScore } from './state.js';
import { escapeAttr, escapeHtml, fuzzyMatch, shuffle } from './utils.js';

function weightedQueue(db, cards) {
  const list = [];
  cards.forEach((card) => {
    const weight = Math.min(4, getWeakCardScore(db.id, card) + 1);
    for (let i = 0; i < weight; i++) list.push(card);
  });
  return shuffle(list);
}

function highlightFocus(sentence, focus) {
  const text = String(sentence || '').trim();
  const needle = String(focus || '').trim();
  if (!text) return '';
  if (!needle) return escapeHtml(text);
  const haystack = text.toLowerCase();
  const target = needle.toLowerCase();
  const index = haystack.indexOf(target);
  if (index === -1) return `${escapeHtml(text)}<div class="sr-note">Focus: <strong>${escapeHtml(needle)}</strong></div>`;
  const end = index + needle.length;
  return `${escapeHtml(text.slice(0, index))}<strong>${escapeHtml(text.slice(index, end))}</strong>${escapeHtml(text.slice(end))}`;
}

function buildLearnPrompt(card, cards) {
  const promptType = state.preferences.learnPromptType || 'vocab';
  const hasPhrase = card.example_sentence && card.example_translation;
  const usePhrase = promptType === 'phrase'
    ? hasPhrase
    : promptType === 'mixed'
      ? (hasPhrase && Math.random() > 0.5)
      : false;

  const askReverse = Math.random() > 0.5;

  if (usePhrase) {
    return askReverse
      ? {
          promptHtml: highlightFocus(card.example_translation, card.translation),
          expected: card.term,
          optionPool: cards.map((c) => c.term).filter(Boolean),
          hint: 'Guess the target word/expression from the translated sentence.',
          isPhrase: true,
          directionLabel: 'translation → target'
        }
      : {
          promptHtml: highlightFocus(card.example_sentence, card.term),
          expected: card.translation,
          optionPool: cards.map((c) => c.translation).filter(Boolean),
          hint: 'Guess the translation of the highlighted word/expression.',
          isPhrase: true,
          directionLabel: 'target → translation'
        };
  }

  return askReverse
    ? {
        promptHtml: escapeHtml(card.translation),
        expected: card.term,
        optionPool: cards.map((c) => c.term).filter(Boolean),
        hint: 'Reverse prompt',
        isPhrase: false,
        directionLabel: 'translation → target'
      }
    : {
        promptHtml: escapeHtml(card.term),
        expected: card.translation,
        optionPool: cards.map((c) => c.translation).filter(Boolean),
        hint: 'Standard prompt',
        isPhrase: false,
        directionLabel: 'target → translation'
      };
}

function buildOptions(expected, optionPool) {
  const unique = [...new Set([expected, ...shuffle(optionPool.filter((text) => text && text !== expected)).slice(0, 6)])];
  return shuffle(unique.slice(0, Math.max(2, Math.min(4, unique.length))));
}

export function renderLearn(container) {
  const db = getActiveStudy();
  if (!db?.cards?.length) return (container.innerHTML = '<div class="empty-state">Import a study database first.</div>');

  let pendingTimeout = null;

  container.innerHTML = `<div class='inline-grid'>
    <label>Answer style
      <select id='learnModeSelect'>
        <option value='mix'>Mix</option>
        <option value='mc'>Multiple choice</option>
        <option value='typed'>Write the word</option>
      </select>
    </label>
    <label>Prompt style
      <select id='learnPromptType'>
        <option value='vocab'>Vocabulary</option>
        <option value='phrase'>Phrase in context</option>
        <option value='mixed'>Mixed</option>
      </select>
    </label>
    <button id='startLearnBtn'>Start Learn Session</button>
  </div>
  <div id='learnArea'></div>`;

  container.querySelector('#learnModeSelect').value = state.preferences.learnMode || 'mix';
  container.querySelector('#learnPromptType').value = state.preferences.learnPromptType || 'vocab';

  const startSession = () => {
    const cards = getFilteredStudyCards(db);
    if (!cards.length) {
      container.querySelector('#learnArea').innerHTML = '<div class="empty-state">No cards match the current filters.</div>';
      return;
    }

    if ((container.querySelector('#learnPromptType').value === 'phrase') && !cards.some((card) => card.example_sentence && card.example_translation)) {
      container.querySelector('#learnArea').innerHTML = '<div class="empty-state">This database does not have enough example_sentence and example_translation data for phrase mode.</div>';
      return;
    }

    state.preferences.learnMode = container.querySelector('#learnModeSelect').value;
    state.preferences.learnPromptType = container.querySelector('#learnPromptType').value;
    persist();

    let queue = weightedQueue(db, cards);
    let streak = 0;
    let bestStreak = 0;
    let correct = 0;
    let seen = 0;

    const next = () => {
      if (!queue.length) return finish();
      const card = queue.shift();
      const prompt = buildLearnPrompt(card, cards);
      const mode = state.preferences.learnMode;
      const mcMode = mode === 'mc' ? true : mode === 'typed' ? false : Math.random() > 0.5;
      const options = buildOptions(prompt.expected, prompt.optionPool);

      container.querySelector('#learnArea').innerHTML = `
        <div class="question">
          <div class="badge">Streak: ${streak} | Accuracy: ${seen ? Math.round((correct / seen) * 100) : 0}% | Answer: ${mode} | Prompt: ${state.preferences.learnPromptType}</div>
          <h3 class="learn-prompt${prompt.isPhrase ? ' learn-prompt-phrase' : ''}">${prompt.promptHtml}</h3>
          <p class="sr-note">${escapeHtml(prompt.hint)} • ${escapeHtml(prompt.directionLabel)}</p>
          ${mcMode
            ? options.map((option, index) => `<button class="choice" data-choice-index="${index}" data-choice="${escapeAttr(option)}">${escapeHtml(option)}</button>`).join('')
            : '<input id="typed" placeholder="Type answer"><button id="submitTyped">Submit</button>'}
          <p class="sr-note" id="learnFeedback"></p>
        </div>`;

      const feedbackEl = container.querySelector('#learnFeedback');

      const check = (answer) => {
        seen++;
        const ok = fuzzyMatch(answer, prompt.expected) || (card.synonyms || []).some((item) => fuzzyMatch(answer, item));
        if (ok) {
          streak++;
          bestStreak = Math.max(bestStreak, streak);
          correct++;
          setWeakCardScore(db.id, card, getWeakCardScore(db.id, card) - 1);
          feedbackEl.textContent = 'Correct.';
        } else {
          streak = 0;
          setWeakCardScore(db.id, card, getWeakCardScore(db.id, card) + 1);
          queue.push(card, card);
          feedbackEl.textContent = `Not quite. Correct answer: ${prompt.expected}`;
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
        pendingTimeout = setTimeout(next, 650);
      };

      container.querySelectorAll('[data-choice]').forEach((button) => {
        button.onclick = () => check(button.dataset.choice);
      });
      container.querySelector('#submitTyped')?.addEventListener('click', () => check(container.querySelector('#typed').value));
      container.querySelector('#typed')?.addEventListener('keydown', (event) => {
        if (event.key === 'Enter') check(event.target.value);
      });
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
