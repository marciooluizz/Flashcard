import { getActiveStudy, filterStudyCards, state } from './state.js';
import { shuffle, fuzzyMatch } from './utils.js';

export function renderTest(container) {
  const db = getActiveStudy();
  if (!db?.cards?.length) return (container.innerHTML = '<div class="empty-state">No study cards loaded.</div>');

  container.innerHTML = `
    <div class="inline-grid">
      <label>Question count <input id="qCount" type="number" min="3" max="50" value="8"></label>
      <label>Difficulty <select id="difficulty"><option value="">Any</option><option>easy</option><option>medium</option><option>hard</option></select></label>
      <button id="generateBtn">Generate Test</button>
    </div>
    <div id="testArea"></div>`;

  const generate = () => {
    const count = +container.querySelector('#qCount').value;
    const diff = container.querySelector('#difficulty').value;
    const basePool = filterStudyCards(db.cards, {
      dbId: db.id,
      search: state.filters.search,
      favoritesOnly: state.filters.favoritesOnly,
      sort: ''
    });
    const source = diff ? basePool.filter((card) => card.difficulty === diff) : basePool;
    if (!source.length) {
      container.querySelector('#testArea').innerHTML = '<div class="empty-state">No cards available for this test setup.</div>';
      return;
    }

    const sample = shuffle(source).slice(0, Math.min(count, source.length));
    const questions = sample.map((card, i) => {
      const type = ['mc', 'tf', 'typed'][i % 3];
      if (type === 'mc') {
        const choices = shuffle([card.translation, ...shuffle(db.cards.filter((item) => item.id !== card.id)).slice(0, 3).map((item) => item.translation)]);
        return `<div class="question" data-answer="${card.translation}" data-type="mc"><p>${card.term}</p>${choices.map((choice) => `<label class='choice'><input type='radio' name='q${i}' value='${choice}'>${choice}</label>`).join('')}</div>`;
      }
      if (type === 'tf') {
        const wrong = shuffle(db.cards.filter((item) => item.id !== card.id))[0]?.translation || 'n/a';
        const shown = Math.random() > 0.5 ? card.translation : wrong;
        const answer = shown === card.translation ? 'true' : 'false';
        return `<div class="question" data-answer="${answer}" data-type="tf"><p>${card.term} = ${shown}</p><label><input type='radio' name='q${i}' value='true'>True</label><label><input type='radio' name='q${i}' value='false'>False</label></div>`;
      }
      return `<div class="question" data-answer="${card.translation}" data-type="typed"><p>${card.term}</p><input type='text' name='q${i}'></div>`;
    });

    container.querySelector('#testArea').innerHTML = `${questions.join('')}<button id='submitTest'>Submit</button><button id='printBtn'>Print</button><div id='result'></div>`;
    container.querySelector('#printBtn').onclick = () => { container.classList.add('printable'); window.print(); container.classList.remove('printable'); };
    container.querySelector('#submitTest').onclick = () => {
      const blocks = [...container.querySelectorAll('.question')];
      let score = 0;
      const mistakes = [];
      blocks.forEach((block, i) => {
        const answer = block.dataset.answer;
        const type = block.dataset.type;
        const value = type === 'typed' ? block.querySelector('input').value : block.querySelector('input:checked')?.value || '';
        const ok = type === 'typed' ? fuzzyMatch(value, answer) : value === answer;
        if (ok) score++;
        else mistakes.push({ q: i + 1, expected: answer, got: value || '(blank)' });
      });
      container.querySelector('#result').innerHTML = `<h3>Score: ${score}/${blocks.length}</h3><ul>${mistakes.map((mistake) => `<li>Q${mistake.q}: expected ${mistake.expected}, got ${mistake.got}</li>`).join('')}</ul>`;
    };
  };

  container.querySelector('#generateBtn').onclick = generate;
  generate();
}
