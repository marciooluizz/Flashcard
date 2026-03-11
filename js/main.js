import { state, persist } from './state.js';
import { parsePracticeFile, parseStudyFile } from './parsers.js';
import { renderDBList, setStatus } from './ui.js';
import { renderFlashcards } from './flashcards.js';
import { renderLearn } from './learn.js';
import { renderTest } from './testMode.js';
import { renderPractice } from './practiceMode.js';
import { renderMatchGame } from './game.js';

const modeContainer = document.querySelector('#modeContainer');

function filteredCards(cards) {
  let output = cards.filter((c) => {
    if (state.filters.search) {
      const blob = `${c.term} ${c.translation} ${(c.tags || []).join(' ')}`.toLowerCase();
      if (!blob.includes(state.filters.search.toLowerCase())) return false;
    }
    if (state.filters.difficulty && c.difficulty !== state.filters.difficulty) return false;
    if (state.filters.favoritesOnly && !state.favorites.has(c.id)) return false;
    return true;
  });

  if (state.filters.sort === 'term-asc') output = [...output].sort((a, b) => a.term.localeCompare(b.term));
  if (state.filters.sort === 'term-desc') output = [...output].sort((a, b) => b.term.localeCompare(a.term));
  if (state.filters.sort === 'difficulty') {
    const rank = { easy: 1, medium: 2, hard: 3 };
    output = [...output].sort((a, b) => (rank[a.difficulty] || 99) - (rank[b.difficulty] || 99));
  }
  return output;
}

function renderDashboard() {
  const active = state.studyDBs.find((d) => d.id === state.activeStudyId);
  const cards = active ? filteredCards(active.cards) : [];
  const progress = state.progress[active?.id] || {};
  const weakCount = active ? active.cards.filter((c) => (state.weakCards[c.id] || 0) > 0).length : 0;
  modeContainer.innerHTML = `<div class='kpi-row'>
    <div class='kpi'><strong>${cards.length}</strong><br>Visible Cards</div>
    <div class='kpi'><strong>${state.favorites.size}</strong><br>Starred</div>
    <div class='kpi'><strong>${progress.accuracy || 0}%</strong><br>Last Learn Accuracy</div>
    <div class='kpi'><strong>${weakCount}</strong><br>Weak Cards</div>
  </div>
  <div class='grid-2' style='margin-top:1rem;'>
    <section class='panel'><h3>Folder View</h3><ul>${state.studyDBs.map((d) => `<li>${d.name} (${d.cards.length})</li>`).join('')}</ul></section>
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

async function handleImport(files, type) {
  const list = [...files];
  if (!list.length) return;
  try {
    for (const file of list) {
      if (type === 'study') state.studyDBs.push(await parseStudyFile(file));
      else state.practiceDBs.push(await parsePracticeFile(file));
    }
    setStatus(`Imported ${list.length} ${type} file(s) successfully.`);
  } catch (err) {
    setStatus(`Import failed: ${err.message}`);
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

function bindUI() {
  document.querySelectorAll('.mode-tabs button').forEach((b) => (b.onclick = () => {
    state.mode = b.dataset.mode;
    persist();
    renderMode();
  }));
  document.querySelector('#studyImportInput').onchange = (e) => handleImport(e.target.files, 'study');
  document.querySelector('#practiceImportInput').onchange = (e) => handleImport(e.target.files, 'practice');
  document.querySelector('#mergeSelectedBtn').onclick = mergeSelected;
  document.querySelector('#searchInput').oninput = (e) => { state.filters.search = e.target.value; renderMode(); };
  document.querySelector('#difficultyFilter').onchange = (e) => { state.filters.difficulty = e.target.value; renderMode(); };
  document.querySelector('#favoritesOnly').onchange = (e) => { state.filters.favoritesOnly = e.target.checked; renderMode(); };
  document.querySelector('#sortFilter').onchange = (e) => { state.filters.sort = e.target.value; renderMode(); };

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
  renderDBList();
  renderMode();
}

init();
