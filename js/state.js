import { loadState, saveState } from './storage.js';
import { sampleStudyDatabase, samplePracticeDatabase } from './defaultData.js';

const saved = loadState();

const hasSavedStudyDBs = Array.isArray(saved.studyDBs);
const hasSavedPracticeDBs = Array.isArray(saved.practiceDBs);
const studyDBs = hasSavedStudyDBs ? saved.studyDBs : [sampleStudyDatabase];
const practiceDBs = hasSavedPracticeDBs ? saved.practiceDBs : [samplePracticeDatabase];

function resolveActiveId(savedId, list) {
  if (savedId && list.some((item) => item.id === savedId)) return savedId;
  return list[0]?.id || null;
}

export const state = {
  mode: saved.mode || 'dashboard',
  studyDBs,
  practiceDBs,
  activeStudyId: resolveActiveId(saved.activeStudyId, studyDBs),
  selectedMergeIds: new Set(saved.selectedMergeIds || []),
  activePracticeId: resolveActiveId(saved.activePracticeId, practiceDBs),
  favorites: new Set(saved.favorites || []),
  weakCards: saved.weakCards || {},
  progress: saved.progress || {},
  preferences: {
    darkMode: saved.preferences?.darkMode || false,
    reverse: saved.preferences?.reverse || false,
    autoplay: saved.preferences?.autoplay || false,
    learningLang: saved.preferences?.learningLang || 'auto',
    translationLang: saved.preferences?.translationLang || 'auto',
    learnMode: saved.preferences?.learnMode === 'both' ? 'mix' : (saved.preferences?.learnMode || 'mix'),
    learnPromptType: saved.preferences?.learnPromptType || 'vocab'
  },
  filters: {
    search: saved.filters?.search || '',
    difficulty: saved.filters?.difficulty || '',
    favoritesOnly: saved.filters?.favoritesOnly || false,
    sort: saved.filters?.sort || ''
  }
};

export function persist() {
  saveState({
    ...state,
    favorites: [...state.favorites],
    selectedMergeIds: [...state.selectedMergeIds]
  });
}

export const getActiveStudy = () => state.studyDBs.find((d) => d.id === state.activeStudyId) || null;
export const getActivePractice = () => state.practiceDBs.find((d) => d.id === state.activePracticeId) || null;

export function studyCardKey(dbOrId, cardOrId) {
  const dbId = typeof dbOrId === 'string' ? dbOrId : dbOrId?.id;
  const cardId = typeof cardOrId === 'object' ? cardOrId?.id : cardOrId;
  return dbId && cardId ? `${dbId}::${cardId}` : String(cardId || '');
}

export function isFavoriteCard(dbId, card) {
  const key = studyCardKey(dbId, card);
  return state.favorites.has(key) || state.favorites.has(card.id);
}

export function setFavoriteCard(dbId, card, shouldFavorite) {
  const key = studyCardKey(dbId, card);
  state.favorites.delete(card.id);
  if (shouldFavorite) state.favorites.add(key);
  else state.favorites.delete(key);
}

export function toggleFavoriteCard(dbId, card) {
  const next = !isFavoriteCard(dbId, card);
  setFavoriteCard(dbId, card, next);
  return next;
}

export function getWeakCardScore(dbId, card) {
  const key = studyCardKey(dbId, card);
  return state.weakCards[key] ?? state.weakCards[card.id] ?? 0;
}

export function setWeakCardScore(dbId, card, nextScore) {
  const key = studyCardKey(dbId, card);
  delete state.weakCards[card.id];
  const value = Math.max(0, nextScore || 0);
  if (value) state.weakCards[key] = value;
  else delete state.weakCards[key];
  return value;
}

export function filterStudyCards(cards = [], options = {}) {
  const {
    dbId = state.activeStudyId,
    search = state.filters.search,
    difficulty = state.filters.difficulty,
    favoritesOnly = state.filters.favoritesOnly,
    sort = state.filters.sort
  } = options;

  let output = cards.filter((card) => {
    if (search) {
      const blob = `${card.term} ${card.translation} ${card.example_sentence || ''} ${card.example_translation || ''} ${(card.tags || []).join(' ')}`.toLowerCase();
      if (!blob.includes(search.toLowerCase())) return false;
    }
    if (difficulty && card.difficulty !== difficulty) return false;
    if (favoritesOnly && !isFavoriteCard(dbId, card)) return false;
    return true;
  });

  if (sort === 'term-asc') output = [...output].sort((a, b) => a.term.localeCompare(b.term));
  if (sort === 'term-desc') output = [...output].sort((a, b) => b.term.localeCompare(a.term));
  if (sort === 'difficulty') {
    const rank = { easy: 1, medium: 2, hard: 3 };
    output = [...output].sort((a, b) => (rank[a.difficulty] || 99) - (rank[b.difficulty] || 99));
  }
  return output;
}

export const getFilteredStudyCards = (db = getActiveStudy(), options = {}) => filterStudyCards(db?.cards || [], { dbId: db?.id, ...options });
