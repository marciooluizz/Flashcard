import { state, persist, getActiveStudy, getFilteredStudyCards, getWeakCardScore, setWeakCardScore, isFavoriteCard, toggleFavoriteCard } from './state.js';
import { speak, shuffle } from './utils.js';

export function renderFlashcards(container) {
  const db = getActiveStudy();
  if (!db) return (container.innerHTML = '<div class="empty-state">No study database selected.</div>');

  const renderNoCards = () => {
    container.innerHTML = `<div class="empty-state">
      <h3>No cards to show</h3>
      <p>No cards match the current filters for <strong>${db.name}</strong>.</p>
      <div class="controls">
        <button id="clearFlashFilters">Clear filters</button>
      </div>
    </div>`;
    container.querySelector('#clearFlashFilters')?.addEventListener('click', () => {
      state.filters.search = '';
      state.filters.difficulty = '';
      state.filters.favoritesOnly = false;
      state.filters.sort = '';
      document.querySelector('#searchInput').value = '';
      document.querySelector('#difficultyFilter').value = '';
      document.querySelector('#favoritesOnly').checked = false;
      document.querySelector('#sortFilter').value = '';
      persist();
      renderFlashcards(container);
    });
  };

  let cards = getFilteredStudyCards(db);
  if (!cards.length) {
    renderNoCards();
    return;
  }

  let idx = 0;
  let flipped = false;
  let autoplay;
  let touchStartX = 0;
  let queuedReviews = 0;
  let sessionCards = [...cards];

  container.innerHTML = `
    <div class="card" id="flashcard" tabindex="0" aria-label="Flashcard"></div>
    <div class="controls">
      <button id="prevBtn">Prev</button><button id="flipBtn">Flip</button><button id="nextBtn">Next</button>
      <button id="shuffleBtn">Shuffle</button><button id="reverseBtn">Reverse</button>
      <button id="starBtn">☆</button><button id="speakBtn">🔊</button>
      <button id="autoBtn">Autoplay</button>
      <span class="badge" id="progressPill"></span>
    </div>
    <div class="controls">
      <button data-rate="again">Again</button>
      <button data-rate="hard">Hard</button>
      <button data-rate="good">Good</button>
      <button data-rate="easy">Easy</button>
    </div>
    <p class="sr-note" id="flashHint">Tip: Arrow keys navigate, space flips, swipe on mobile.</p>`;

  const cardEl = container.querySelector('#flashcard');
  const hintEl = container.querySelector('#flashHint');

  const currentCard = () => sessionCards[idx];

  const currentSideLang = () => {
    const frontSide = state.preferences.reverse ? 'translation' : 'term';
    const side = flipped ? (frontSide === 'term' ? 'translation' : 'term') : frontSide;
    return side === 'term' ? state.preferences.learningLang : state.preferences.translationLang;
  };

  const redraw = () => {
    cards = getFilteredStudyCards(db);
    if (!cards.length) {
      renderNoCards();
      return;
    }
    if (!sessionCards.length) sessionCards = [...cards];
    idx = Math.max(0, Math.min(idx, sessionCards.length - 1));
    let card = currentCard();
    if (!card) {
      sessionCards = [...cards];
      idx = 0;
      card = currentCard();
    }
    const front = state.preferences.reverse ? card.translation : card.term;
    const back = state.preferences.reverse ? card.term : card.translation;
    const weakScore = getWeakCardScore(db.id, card);
    const starred = isFavoriteCard(db.id, card);
    cardEl.innerHTML = `<div>${flipped ? back : front}</div><div class="meta">${card.example_sentence || ''}${card.difficulty ? ` • ${card.difficulty}` : ''}${weakScore ? ` • review priority ${weakScore}` : ''}</div>`;
    container.querySelector('#starBtn').textContent = starred ? '⭐' : '☆';
    container.querySelector('#progressPill').textContent = `Card ${idx + 1}/${sessionCards.length}${queuedReviews ? ` • ${queuedReviews} queued` : ''}`;
  };

  const step = (n) => {
    idx = (idx + n + sessionCards.length) % sessionCards.length;
    flipped = false;
    redraw();
  };

  const queueReview = (card, rating) => {
    if (rating === 'again') {
      sessionCards.splice(Math.min(idx + 1, sessionCards.length), 0, card);
      queuedReviews++;
    }
    if (rating === 'hard') {
      sessionCards.splice(Math.min(idx + 3, sessionCards.length), 0, card);
      queuedReviews++;
    }
  };

  const rateCard = (rating) => {
    const card = currentCard();
    const prev = getWeakCardScore(db.id, card);
    const delta = { again: 2, hard: 1, good: -1, easy: -2 }[rating] ?? 0;
    const nextWeak = setWeakCardScore(db.id, card, prev + delta);
    queueReview(card, rating);
    hintEl.textContent = `${rating[0].toUpperCase()}${rating.slice(1)} saved. Review priority is now ${nextWeak || 0}.`;
    persist();
    step(1);
  };

  redraw();
  cardEl.onclick = () => { flipped = !flipped; redraw(); };
  container.querySelector('#prevBtn').onclick = () => step(-1);
  container.querySelector('#nextBtn').onclick = () => step(1);
  container.querySelector('#flipBtn').onclick = () => { flipped = !flipped; redraw(); };
  container.querySelector('#reverseBtn').onclick = () => { state.preferences.reverse = !state.preferences.reverse; persist(); redraw(); };
  container.querySelector('#shuffleBtn').onclick = () => {
    sessionCards = shuffle(sessionCards);
    idx = 0;
    flipped = false;
    hintEl.textContent = 'Deck reshuffled.';
    redraw();
  };
  container.querySelector('#starBtn').onclick = () => {
    const starred = toggleFavoriteCard(db.id, currentCard());
    hintEl.textContent = starred ? 'Card starred.' : 'Card unstarred.';
    persist();
    redraw();
  };
  container.querySelector('#speakBtn').onclick = () => {
    const card = currentCard();
    const text = flipped ? (state.preferences.reverse ? card.term : card.translation) : (state.preferences.reverse ? card.translation : card.term);
    speak(text, { lang: currentSideLang() });
  };
  container.querySelector('#autoBtn').onclick = () => {
    if (autoplay) {
      clearInterval(autoplay);
      autoplay = null;
      hintEl.textContent = 'Autoplay stopped.';
      return;
    }
    autoplay = setInterval(() => step(1), 2500);
    hintEl.textContent = 'Autoplay started.';
  };
  container.querySelectorAll('[data-rate]').forEach((btn) => btn.onclick = () => rateCard(btn.dataset.rate));

  const onKeyDown = (e) => {
    if (e.key === 'ArrowRight') step(1);
    if (e.key === 'ArrowLeft') step(-1);
    if (e.key === ' ') { e.preventDefault(); flipped = !flipped; redraw(); }
  };
  document.addEventListener('keydown', onKeyDown);

  cardEl.addEventListener('touchstart', (e) => { touchStartX = e.changedTouches[0].clientX; }, { passive: true });
  cardEl.addEventListener('touchend', (e) => {
    const dx = e.changedTouches[0].clientX - touchStartX;
    if (Math.abs(dx) < 30) return;
    if (dx < 0) step(1); else step(-1);
  }, { passive: true });

  container._cleanup = () => {
    document.removeEventListener('keydown', onKeyDown);
    if (autoplay) clearInterval(autoplay);
  };
}
