import { state, persist, getActiveStudy, getActivePractice, studyCardKey } from './state.js';
import { escapeAttr, escapeHtml } from './utils.js';

function removeStudyDatabase(dbId) {
  const db = state.studyDBs.find((item) => item.id === dbId);
  if (!db) return;
  if (!window.confirm(`Delete "${db.name}"? This removes it from local storage on this device.`)) return;

  const cardKeys = db.cards.map((card) => studyCardKey(dbId, card));
  const legacyIds = db.cards.map((card) => card.id);

  state.studyDBs = state.studyDBs.filter((item) => item.id !== dbId);
  state.selectedMergeIds.delete(dbId);
  cardKeys.forEach((key) => state.favorites.delete(key));
  legacyIds.forEach((id) => state.favorites.delete(id));
  cardKeys.forEach((key) => delete state.weakCards[key]);
  legacyIds.forEach((id) => delete state.weakCards[id]);
  delete state.progress[dbId];

  if (state.activeStudyId === dbId) state.activeStudyId = state.studyDBs[0]?.id || null;
  persist();
  window.dispatchEvent(new Event('statechange'));
}

function removePracticeDatabase(dbId) {
  const db = state.practiceDBs.find((item) => item.id === dbId);
  if (!db) return;
  if (!window.confirm(`Delete "${db.name}"? This removes it from local storage on this device.`)) return;

  state.practiceDBs = state.practiceDBs.filter((item) => item.id !== dbId);
  if (state.activePracticeId === dbId) state.activePracticeId = state.practiceDBs[0]?.id || null;
  persist();
  window.dispatchEvent(new Event('statechange'));
}

export function renderDBList() {
  const wrap = document.querySelector('#dbList');
  const study = state.studyDBs.length
    ? state.studyDBs.map((db) => `<div class='db-item ${db.id===state.activeStudyId?'active':''}'><label><input type='checkbox' data-merge='${escapeAttr(db.id)}' ${state.selectedMergeIds.has(db.id)?'checked':''}> ${escapeHtml(db.name)} <span class='badge'>study</span></label><div class='db-actions'><button data-open-study='${escapeAttr(db.id)}'>Use</button><button data-delete-study='${escapeAttr(db.id)}'>Delete</button></div></div>`).join('')
    : `<div class='empty-state compact-empty'>No study databases saved.</div>`;
  const practice = state.practiceDBs.length
    ? state.practiceDBs.map((db) => `<div class='db-item ${db.id===state.activePracticeId?'active':''}'><span>${escapeHtml(db.name)} <span class='badge'>practice</span></span><div class='db-actions'><button data-open-practice='${escapeAttr(db.id)}'>Use</button><button data-delete-practice='${escapeAttr(db.id)}'>Delete</button></div></div>`).join('')
    : `<div class='empty-state compact-empty'>No practice databases saved.</div>`;

  wrap.innerHTML = `<h4>Study Databases</h4>${study}<h4>Practice Databases</h4>${practice}`;

  wrap.querySelectorAll('[data-open-study]').forEach((b) => b.onclick = () => { state.activeStudyId = b.dataset.openStudy; persist(); window.dispatchEvent(new Event('statechange')); });
  wrap.querySelectorAll('[data-open-practice]').forEach((b) => b.onclick = () => { state.activePracticeId = b.dataset.openPractice; persist(); window.dispatchEvent(new Event('statechange')); });
  wrap.querySelectorAll('[data-delete-study]').forEach((b) => b.onclick = () => removeStudyDatabase(b.dataset.deleteStudy));
  wrap.querySelectorAll('[data-delete-practice]').forEach((b) => b.onclick = () => removePracticeDatabase(b.dataset.deletePractice));
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
