import { state, persist, getActiveStudy } from './state.js';
import { speak } from './utils.js';

export function renderFlashcards(container) {
  const db = getActiveStudy();
  if (!db?.cards?.length) return (container.innerHTML = '<p>No cards available.</p>');
  let idx = 0;
  let flipped = false;
  const cards = db.cards;
  let autoplay;
  let touchStartX = 0;

  container.innerHTML = `
    <div class="card" id="flashcard" tabindex="0" aria-label="Flashcard"></div>
    <div class="controls">
      <button id="prevBtn">Prev</button><button id="flipBtn">Flip</button><button id="nextBtn">Next</button>
      <button id="shuffleBtn">Shuffle</button><button id="reverseBtn">Reverse</button>
      <button id="starBtn">⭐</button><button id="speakBtn">🔊</button>
      <button id="autoBtn">Autoplay</button>
      <span class="badge" id="progressPill"></span>
    </div>
    <div class="controls">
      <button data-rate="again">Again</button>
      <button data-rate="hard">Hard</button>
      <button data-rate="good">Good</button>
      <button data-rate="easy">Easy</button>
    </div>
    <p class="sr-note">Tip: Arrow keys navigate, space flips, swipe on mobile.</p>`;

  const cardEl = container.querySelector('#flashcard');

  const redraw = () => {
    const c = cards[idx];
    const front = state.preferences.reverse ? c.translation : c.term;
    const back = state.preferences.reverse ? c.term : c.translation;
    cardEl.innerHTML = `<div>${flipped ? back : front}</div><div class="meta">${c.example_sentence || ''}</div>`;
    container.querySelector('#progressPill').textContent = `${idx + 1}/${cards.length}`;
  };

  const step = (n) => {
    idx = (idx + n + cards.length) % cards.length;
    flipped = false;
    redraw();
  };

  const rateCard = (rating) => {
    const id = cards[idx].id;
    const prev = state.weakCards[id] || 0;
    const delta = { again: 2, hard: 1, good: -1, easy: -2 }[rating] ?? 0;
    state.weakCards[id] = Math.max(0, prev + delta);
    persist();
    step(1);
  };

  redraw();
  cardEl.onclick = () => { flipped = !flipped; redraw(); };
  container.querySelector('#prevBtn').onclick = () => step(-1);
  container.querySelector('#nextBtn').onclick = () => step(1);
  container.querySelector('#flipBtn').onclick = () => { flipped = !flipped; redraw(); };
  container.querySelector('#reverseBtn').onclick = () => { state.preferences.reverse = !state.preferences.reverse; persist(); redraw(); };
  container.querySelector('#shuffleBtn').onclick = () => { cards.sort(() => Math.random() - 0.5); idx = 0; redraw(); };
  container.querySelector('#starBtn').onclick = () => { state.favorites.has(cards[idx].id) ? state.favorites.delete(cards[idx].id) : state.favorites.add(cards[idx].id); persist(); };
  container.querySelector('#speakBtn').onclick = () => speak(flipped ? cards[idx].translation : cards[idx].term);
  container.querySelector('#autoBtn').onclick = () => {
    if (autoplay) { clearInterval(autoplay); autoplay = null; return; }
    autoplay = setInterval(() => step(1), 2500);
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
