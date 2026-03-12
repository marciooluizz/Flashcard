import { state, persist, getActiveStudy, getFilteredStudyCards, getWeakCardScore, isFavoriteCard } from './state.js';
import { parsePracticeFile, parseStudyFile } from './parsers.js';
import { renderDBList, setStatus } from './ui.js';
import { renderFlashcards } from './flashcards.js';
import { renderLearn } from './learn.js';
import { renderTest } from './testMode.js';
import { renderPractice } from './practiceMode.js';
import { renderMatchGame } from './game.js';

const modeContainer = document.querySelector('#modeContainer');

function renderDashboard() {
  const active = getActiveStudy();
  if (!active) {
    modeContainer.innerHTML = `<div class='empty-state'><h3>No study database selected</h3><p>Import a study set or keep one database available to study.</p></div>`;
    return;
  }

  const cards = getFilteredStudyCards(active);
  const progress = state.progress[active.id] || {};
  const weakCount = active.cards.filter((card) => getWeakCardScore(active.id, card) > 0).length;
  const starredCount = active.cards.filter((card) => isFavoriteCard(active.id, card)).length;

  modeContainer.innerHTML = `<div class='kpi-row'>
    <div class='kpi'><strong>${cards.length}</strong><br>Visible Cards</div>
    <div class='kpi'><strong>${starredCount}</strong><br>Starred in Active DB</div>
    <div class='kpi'><strong>${progress.accuracy || 0}%</strong><br>Last Learn Accuracy</div>
    <div class='kpi'><strong>${weakCount}</strong><br>Weak Cards</div>
  </div>
  <div class='grid-2' style='margin-top:1rem;'>
    <section class='panel'><h3>Folder View</h3><ul>${state.studyDBs.map((d) => `<li>${d.name} (${d.cards.length})</li>`).join('') || '<li>No study databases</li>'}</ul></section>
    <section class='panel'><h3>Recent Activity</h3><p>Last mode: ${progress.lastMode || 'n/a'}</p><p>Cards seen: ${progress.seen || 0}</p><p>Current streak: ${progress.streak || 0}</p></section>
  </div>`;
}

function renderMode() {
  modeContainer._cleanup?.();
  [...document.querySelectorAll('.mode-tabs button')].forEach((b) => b.classList.toggle('active', b.dataset.mode === state.mode));
  if (state.mode === 'dashboard') renderDashboard();
  if (state.mode === 'flashcards') renderFlashcards(modeContainer);
  if (state.mode === 'learn') renderLearn(modeContainer);
  if (state.mode === 'test') renderTest(modeContainer);
  if (state.mode === 'practice') renderPractice(modeContainer);
  if (state.mode === 'match') renderMatchGame(modeContainer);
  setStatus('Ready');
}

async function handleImport(files, type, inputEl) {
  const list = [...files];
  if (!list.length) return;

  const imported = [];
  const skipped = [];

  try {
    for (const file of list) {
      const parsed = type === 'study' ? await parseStudyFile(file) : await parsePracticeFile(file);
      const size = type === 'study' ? parsed.cards.length : parsed.questions.length;
      if (!size) {
        skipped.push(`${file.name} (no valid ${type === 'study' ? 'cards' : 'questions'} found)`);
        continue;
      }
      imported.push(parsed);
      if (type === 'study') state.studyDBs.push(parsed);
      else state.practiceDBs.push(parsed);
    }

    if (imported.length) {
      const latest = imported[imported.length - 1];
      if (type === 'study') state.activeStudyId = latest.id;
      if (type === 'practice') state.activePracticeId = latest.id;
      setStatus(`Imported ${imported.length} ${type} file(s) successfully.${skipped.length ? ` Skipped: ${skipped.join(', ')}` : ''}`);
    } else {
      setStatus(`Import finished, but no valid ${type === 'study' ? 'cards' : 'questions'} were found.${skipped.length ? ` Skipped: ${skipped.join(', ')}` : ''}`);
    }
  } catch (err) {
    setStatus(`Import failed: ${err.message}`);
  } finally {
    if (inputEl) inputEl.value = '';
  }

  persist();
  renderDBList();
  renderMode();
}

function mergeSelected() {
  const ids = [...state.selectedMergeIds];
  const selected = state.studyDBs.filter((d) => ids.includes(d.id));
  if (selected.length < 2) return setStatus('Select at least two study databases to merge.');
  const merged = {
    id: `merged-${Date.now()}`,
    name: `Merged: ${selected.map((d) => d.name).join(' + ')}`,
    type: 'study',
    cards: selected.flatMap((d) => d.cards)
  };
  state.studyDBs.push(merged);
  state.activeStudyId = merged.id;
  persist();
  renderDBList();
  renderMode();
}

function syncControlsFromState() {
  document.querySelector('#searchInput').value = state.filters.search;
  document.querySelector('#difficultyFilter').value = state.filters.difficulty;
  document.querySelector('#favoritesOnly').checked = state.filters.favoritesOnly;
  document.querySelector('#sortFilter').value = state.filters.sort;
  document.querySelector('#learningLang').value = state.preferences.learningLang;
  document.querySelector('#translationLang').value = state.preferences.translationLang;
}

function bindUI() {
  document.querySelectorAll('.mode-tabs button').forEach((b) => (b.onclick = () => {
    state.mode = b.dataset.mode;
    persist();
    renderMode();
  }));
  document.querySelector('#studyImportInput').onchange = (e) => handleImport(e.target.files, 'study', e.target);
  document.querySelector('#practiceImportInput').onchange = (e) => handleImport(e.target.files, 'practice', e.target);
  document.querySelector('#mergeSelectedBtn').onclick = mergeSelected;
  document.querySelector('#searchInput').oninput = (e) => { state.filters.search = e.target.value; persist(); renderMode(); };
  document.querySelector('#difficultyFilter').onchange = (e) => { state.filters.difficulty = e.target.value; persist(); renderMode(); };
  document.querySelector('#favoritesOnly').onchange = (e) => { state.filters.favoritesOnly = e.target.checked; persist(); renderMode(); };
  document.querySelector('#sortFilter').onchange = (e) => { state.filters.sort = e.target.value; persist(); renderMode(); };
  document.querySelector('#learningLang').onchange = (e) => { state.preferences.learningLang = e.target.value; persist(); };
  document.querySelector('#translationLang').onchange = (e) => { state.preferences.translationLang = e.target.value; persist(); };

  document.querySelector('#darkModeToggle').onclick = () => {
    state.preferences.darkMode = !state.preferences.darkMode;
    document.body.classList.toggle('dark', state.preferences.darkMode);
    persist();
  };

  document.querySelector('#exportProgressBtn').onclick = () => {
    const payload = { progress: state.progress, favorites: [...state.favorites], preferences: state.preferences, weakCards: state.weakCards };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'linguadeck-progress.json';
    a.click();
  };

  document.querySelector('#importProgressInput').onchange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const data = JSON.parse(await file.text());
    state.progress = data.progress || {};
    state.favorites = new Set(data.favorites || []);
    state.preferences = { ...state.preferences, ...(data.preferences || {}) };
    state.weakCards = data.weakCards || state.weakCards;
    document.body.classList.toggle('dark', state.preferences.darkMode);
    syncControlsFromState();
    persist();
    renderMode();
  };

  window.addEventListener('statechange', () => {
    renderDBList();
    renderMode();
  });
}

function init() {
  document.body.classList.toggle('dark', state.preferences.darkMode);
  bindUI();
  syncControlsFromState();
  renderDBList();
  renderMode();
}

init();
