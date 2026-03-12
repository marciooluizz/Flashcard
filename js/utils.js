export const normalize = (v = '') => String(v).normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase().trim();

export const fuzzyMatch = (a, b) => {
  const x = normalize(a), y = normalize(b);
  if (!x || !y) return false;
  if (x === y) return true;
  return levenshtein(x, y) <= 1 || x.includes(y) || y.includes(x);
};

export function levenshtein(a, b) {
  const dp = Array.from({ length: a.length + 1 }, (_, i) => [i]);
  for (let j = 1; j <= b.length; j++) dp[0][j] = j;
  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      dp[i][j] = a[i - 1] === b[j - 1]
        ? dp[i - 1][j - 1]
        : 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);
    }
  }
  return dp[a.length][b.length];
}

export const uid = () => `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;

export function shuffle(arr) {
  const out = [...arr];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

function detectLanguage(text = '') {
  const raw = String(text || '');
  const value = normalize(raw);
  if (!value) return null;

  if (/[¿¡ñü]/i.test(raw) || /\b(hola|gracias|adios|comer|hablar|porque|como|quiero|libro)\b/i.test(value)) return 'es-ES';
  if (/[ãõç]/i.test(raw) || /\b(ola|obrigado|livro|comer|falar|voce|estou|aprender)\b/i.test(value)) return 'pt-BR';
  if (/[àâçéèêëîïôùûüœ]/i.test(raw) || /\b(bonjour|merci|livre|manger|parler|avec|pour)\b/i.test(value)) return 'fr-FR';
  if (/\b(hello|book|eat|learn|speak|with|from|the|and)\b/i.test(value)) return 'en-US';
  return null;
}

function pickVoice(lang) {
  const synth = window.speechSynthesis;
  const voices = synth?.getVoices?.() || [];
  if (!voices.length) return null;
  const lower = String(lang || '').toLowerCase();
  const base = lower.split('-')[0];
  return voices.find((voice) => voice.lang.toLowerCase() === lower)
    || voices.find((voice) => voice.lang.toLowerCase().startsWith(`${base}-`))
    || voices.find((voice) => voice.lang.toLowerCase().startsWith(base))
    || voices.find((voice) => voice.default)
    || voices[0];
}

export function speak(text, options = {}) {
  if (!window.speechSynthesis || !text) return;
  const synth = window.speechSynthesis;
  const targetLang = options.lang && options.lang !== 'auto'
    ? options.lang
    : detectLanguage(text) || navigator.language || 'en-US';
  const utter = new SpeechSynthesisUtterance(text);
  utter.rate = 0.95;
  utter.lang = targetLang;

  const run = () => {
    const voice = pickVoice(targetLang);
    if (voice) {
      utter.voice = voice;
      utter.lang = voice.lang;
    }
    synth.cancel();
    synth.speak(utter);
  };

  if (synth.getVoices().length) run();
  else {
    const handler = () => {
      synth.removeEventListener?.('voiceschanged', handler);
      run();
    };
    synth.addEventListener?.('voiceschanged', handler);
    setTimeout(run, 250);
  }
}
