import { loadState, saveState } from './storage.js';
import { sampleStudyDatabase, samplePracticeDatabase } from './defaultData.js';

const saved = loadState();

export const state = {
  mode: 'dashboard',
  studyDBs: saved.studyDBs?.length ? saved.studyDBs : [sampleStudyDatabase],
  practiceDBs: saved.practiceDBs?.length ? saved.practiceDBs : [samplePracticeDatabase],
  activeStudyId: saved.activeStudyId || sampleStudyDatabase.id,
  selectedMergeIds: new Set(saved.selectedMergeIds || []),
  activePracticeId: saved.activePracticeId || samplePracticeDatabase.id,
  favorites: new Set(saved.favorites || []),
  weakCards: saved.weakCards || {},
  progress: saved.progress || {},
  preferences: {
    darkMode: saved.preferences?.darkMode || false,
    reverse: saved.preferences?.reverse || false,
    autoplay: saved.preferences?.autoplay || false
  },
  filters: { search: '', difficulty: '', favoritesOnly: false, sort: '' }
};

export function persist() {
  saveState({
    ...state,
    favorites: [...state.favorites],
    selectedMergeIds: [...state.selectedMergeIds]
  });
}

export const getActiveStudy = () => state.studyDBs.find((d) => d.id === state.activeStudyId);
export const getActivePractice = () => state.practiceDBs.find((d) => d.id === state.activePracticeId);
