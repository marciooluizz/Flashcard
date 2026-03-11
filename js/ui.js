import { state, persist, getActiveStudy, getActivePractice } from './state.js';

export function renderDBList() {
  const wrap = document.querySelector('#dbList');
  const study = state.studyDBs.map((db) => `<div class='db-item ${db.id===state.activeStudyId?'active':''}'><label><input type='checkbox' data-merge='${db.id}' ${state.selectedMergeIds.has(db.id)?'checked':''}> ${db.name} <span class='badge'>study</span></label><button data-open-study='${db.id}'>Use</button></div>`).join('');
  const practice = state.practiceDBs.map((db) => `<div class='db-item ${db.id===state.activePracticeId?'active':''}'><span>${db.name} <span class='badge'>practice</span></span><button data-open-practice='${db.id}'>Use</button></div>`).join('');
  wrap.innerHTML = `<h4>Study Databases</h4>${study}<h4>Practice Databases</h4>${practice}`;

  wrap.querySelectorAll('[data-open-study]').forEach((b) => b.onclick = () => { state.activeStudyId = b.dataset.openStudy; persist(); window.dispatchEvent(new Event('statechange')); });
  wrap.querySelectorAll('[data-open-practice]').forEach((b) => b.onclick = () => { state.activePracticeId = b.dataset.openPractice; persist(); window.dispatchEvent(new Event('statechange')); });
  wrap.querySelectorAll('[data-merge]').forEach((c) => c.onchange = () => {
    c.checked ? state.selectedMergeIds.add(c.dataset.merge) : state.selectedMergeIds.delete(c.dataset.merge);
    persist();
  });
}

export function setStatus(msg) {
  const s = document.querySelector('#statusBar');
  const study = getActiveStudy();
  const practice = getActivePractice();
  s.textContent = `${msg} | Active study: ${study?.name || 'none'} (${study?.cards?.length || 0} cards) | Practice: ${practice?.name || 'none'} (${practice?.questions?.length || 0} questions)`;
}
