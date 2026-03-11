import { getActivePractice } from './state.js';
import { fuzzyMatch } from './utils.js';

export function renderPractice(container) {
  const db = getActivePractice();
  if (!db?.questions?.length) return (container.innerHTML = '<p>No practice test database selected.</p>');

  container.innerHTML = `<div class='inline-grid'>
    <label><input id='showExplain' type='checkbox'> Show explanations immediately</label>
    <label>Timer (minutes)<input id='timerMin' type='number' value='10' min='0'></label>
    <button id='startPractice'>Start</button>
  </div><div id='practiceArea'></div>`;

  container.querySelector('#startPractice').onclick = () => {
    const showExplain = container.querySelector('#showExplain').checked;
    let seconds = (+container.querySelector('#timerMin').value || 0) * 60;
    const start = Date.now();
    const timer = setInterval(() => {
      if (seconds <= 0) return clearInterval(timer);
      seconds--;
      container.querySelector('#practiceArea').dataset.timer = `${Math.floor(seconds/60)}:${String(seconds%60).padStart(2, '0')}`;
    }, 1000);

    const items = db.questions.map((q, i) => {
      if (q.question_type === 'multiple_choice') {
        return `<div class='question' data-id='${q.id}' data-answer='${q.correct_answer}' data-type='mc'><p>${i+1}. ${q.question}</p>${(q.choices || []).map((c) => `<label class='choice'><input type='radio' name='p${i}' value='${c}'>${c}</label>`).join('')}</div>`;
      }
      if (q.question_type === 'true_false') {
        return `<div class='question' data-id='${q.id}' data-answer='${q.correct_answer}' data-type='tf'><p>${i+1}. ${q.question}</p><label><input type='radio' name='p${i}' value='true'>True</label><label><input type='radio' name='p${i}' value='false'>False</label></div>`;
      }
      return `<div class='question' data-id='${q.id}' data-answer='${q.correct_answer || (q.acceptable_answers || [])[0] || ''}' data-acceptable='${(q.acceptable_answers||[]).join('|')}' data-type='typed'><p>${i+1}. ${q.question}</p><input type='text' name='p${i}'></div>`;
    }).join('');

    container.querySelector('#practiceArea').innerHTML = `<div class='badge'>Timer: <span id='timerView'>${Math.floor(seconds/60)}:00</span></div>${items}<button id='submitPractice'>Finish Practice Test</button><div id='practiceResult'></div>`;
    const timerView = container.querySelector('#timerView');
    const upd = setInterval(() => { if (timerView) timerView.textContent = container.querySelector('#practiceArea').dataset.timer || timerView.textContent; }, 500);

    container.querySelector('#submitPractice').onclick = () => {
      clearInterval(timer); clearInterval(upd);
      const blocks = [...container.querySelectorAll('.question')];
      let score = 0;
      const topics = {};
      const missed = [];
      blocks.forEach((b) => {
        const q = db.questions.find((x) => x.id === b.dataset.id);
        const type = b.dataset.type;
        const val = type === 'typed' ? b.querySelector('input').value : b.querySelector('input:checked')?.value || '';
        const acceptable = (b.dataset.acceptable || '').split('|').filter(Boolean);
        const ok = type === 'typed' ? (fuzzyMatch(val, b.dataset.answer) || acceptable.some((a) => fuzzyMatch(val, a))) : val === b.dataset.answer;
        topics[q.topic || 'other'] = topics[q.topic || 'other'] || { total: 0, correct: 0 };
        topics[q.topic || 'other'].total++;
        if (ok) { score++; topics[q.topic || 'other'].correct++; }
        else missed.push({ question: q.question, expected: b.dataset.answer, your: val || '(blank)', explanation: q.explanation || '' });
      });
      const taken = Math.round((Date.now() - start) / 1000);
      container.querySelector('#practiceResult').innerHTML = `<h3>Practice Results: ${score}/${blocks.length}</h3>
      <p>Time Taken: ${Math.floor(taken/60)}m ${taken%60}s</p>
      <h4>Topic Breakdown</h4><ul>${Object.entries(topics).map(([k,v]) => `<li>${k}: ${v.correct}/${v.total}</li>`).join('')}</ul>
      <h4>Incorrect Answers</h4><ul>${missed.map((m) => `<li><strong>${m.question}</strong><br>Expected: ${m.expected}<br>Your answer: ${m.your}${showExplain ? `<br>Explanation: ${m.explanation}` : ''}</li>`).join('')}</ul>`;
      if (!showExplain && missed.length) container.querySelector('#practiceResult').innerHTML += '<p>Enable “show explanations” to view rationale after each missed question.</p>';
    };
  };
}
