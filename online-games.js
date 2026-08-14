const DATA = window.MONTE_DATA;

export const ONLINE_GAME_IDS = ['truth', 'verse', 'quote', 'battle', 'clues', 'emoji', 'reveal'];

export const ONLINE_GAMES = {
  truth: {title: 'Verdadeiro ou Falso', icon: '✓', type: 'choice', duration: 20, description: 'Todos respondem à mesma afirmação.'},
  verse: {title: 'Complete o Versículo', icon: '“', type: 'choice', duration: 25, description: 'Escolha a palavra que completa o versículo.'},
  quote: {title: 'Quem Disse Isso?', icon: '!', type: 'choice', duration: 25, description: 'Descubra quem pronunciou a frase bíblica.'},
  battle: {title: 'Batalha de Perguntas', icon: '⚡', type: 'choice', duration: 25, teams: true, description: 'Duas equipes respondem simultaneamente.'},
  clues: {title: 'Bíblia em 5 Pistas', icon: '5', type: 'progressive-text', duration: 40, stepMs: 8000, description: 'Cada nova pista reduz o valor da rodada.'},
  emoji: {title: 'Emoji Bíblico', icon: '☺', type: 'text', duration: 30, stepMs: 5000, description: 'Digite a história representada pelos emojis.'},
  reveal: {title: 'Imagem Revelada', icon: '▦', type: 'progressive-text', duration: 35, stepMs: 5000, description: 'A imagem fica mais nítida automaticamente.'}
};

const EXTRA_ALIASES = {
  'A Arca de Noé': ['Arca de Noé', 'Noé e a arca', 'Dilúvio'],
  'Davi e Golias': ['Davi contra Golias', 'Golias e Davi', 'Davi derrota Golias'],
  'A abertura do Mar Vermelho': ['Abertura do Mar Vermelho', 'Moisés abre o Mar Vermelho', 'Travessia do Mar Vermelho'],
  'Daniel na cova dos leões': ['Daniel e os leões', 'Cova dos leões'],
  'Jonas e o grande peixe': ['Jonas e a baleia', 'Jonas no peixe', 'Jonas na baleia'],
  'O nascimento de Jesus': ['Nascimento de Jesus', 'Jesus nasce', 'Natividade'],
  'Jesus acalma a tempestade': ['Jesus acalma o mar', 'Tempestade acalmada'],
  'A multiplicação dos pães e peixes': ['Multiplicação dos pães', 'Pães e peixes'],
  'A queda das muralhas de Jericó': ['Muralhas de Jericó', 'Queda de Jericó', 'Jericó'],
  'José e sua túnica': ['Túnica de José', 'José do Egito', 'José e a túnica colorida'],
  'Sansão derruba as colunas': ['Sansão e as colunas', 'Sansão derruba o templo', 'Sansão'],
  'Zaqueu encontra Jesus': ['Zaqueu na árvore', 'Zaqueu e Jesus', 'Zaqueu'],
  'Os três amigos na fornalha': ['Três amigos na fornalha', 'Três jovens na fornalha', 'Fornalha ardente'],
  'O bom samaritano': ['Bom samaritano', 'Parábola do bom samaritano'],
  'A ovelha perdida': ['Ovelha perdida', 'Parábola da ovelha perdida'],
  'O túmulo vazio': ['Túmulo vazio', 'Ressurreição de Jesus', 'Jesus ressuscitou']
};

export function normalizeGuess(value) {
  return String(value || '')
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .toLowerCase().replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\b(a|o|as|os|um|uma|de|da|do|das|dos)\b/g, ' ')
    .replace(/\s+/g, ' ').trim();
}

function editDistance(a, b) {
  const row = Array.from({length: b.length + 1}, (_, index) => index);
  for (let i = 1; i <= a.length; i += 1) {
    let previous = row[0]; row[0] = i;
    for (let j = 1; j <= b.length; j += 1) {
      const saved = row[j];
      row[j] = Math.min(row[j] + 1, row[j - 1] + 1, previous + (a[i - 1] === b[j - 1] ? 0 : 1));
      previous = saved;
    }
  }
  return row[b.length];
}

export function acceptedAnswers(answer) {
  return [answer, ...(EXTRA_ALIASES[answer] || [])].map(normalizeGuess).filter(Boolean);
}

export function isCorrectText(answer, guess) {
  const clean = normalizeGuess(guess);
  if (clean.length < 3) return false;
  return acceptedAnswers(answer).some((accepted) => {
    if (clean === accepted) return true;
    const tolerance = accepted.length >= 14 ? 2 : accepted.length >= 8 ? 1 : 0;
    return Math.abs(clean.length - accepted.length) <= tolerance && editDistance(clean, accepted) <= tolerance;
  });
}

function battlePool() {
  return ['truth', 'quote', 'verse'].flatMap((source) => DATA.quizzes[source].map((_, index) => `${source}:${index}`));
}

export function poolKeys(gameId) {
  if (['truth', 'verse', 'quote'].includes(gameId)) return DATA.quizzes[gameId].map((_, index) => index);
  if (gameId === 'battle') return battlePool();
  if (gameId === 'clues') return DATA.clues.map((_, index) => index);
  if (gameId === 'emoji') return DATA.emoji.map((_, index) => index);
  if (gameId === 'reveal') return DATA.revealImages.map((_, index) => index);
  return [];
}

export function makeDeck(gameId, rounds) {
  const keys = [...poolKeys(gameId)];
  for (let index = keys.length - 1; index > 0; index -= 1) {
    const random = Math.floor(Math.random() * (index + 1));
    [keys[index], keys[random]] = [keys[random], keys[index]];
  }
  return keys.slice(0, Math.min(20, Math.max(1, rounds), keys.length));
}

export function resolveOnlineItem(gameId, key) {
  if (['truth', 'verse', 'quote'].includes(gameId)) return DATA.quizzes[gameId][Number(key)];
  if (gameId === 'battle') {
    const [source, index] = String(key).split(':');
    return DATA.quizzes[source]?.[Number(index)];
  }
  if (gameId === 'clues') return DATA.clues[Number(key)];
  if (gameId === 'emoji') {
    const item = DATA.emoji[Number(key)];
    return item ? {prompt: item[0], answer: item[1]} : null;
  }
  if (gameId === 'reveal') return DATA.revealImages[Number(key)];
  return null;
}

export function roundLevel(gameId, startedAt, now = Date.now()) {
  const definition = ONLINE_GAMES[gameId];
  if (!definition?.stepMs) return 0;
  return Math.min(4, Math.floor(Math.max(0, now - startedAt) / definition.stepMs));
}

export function progressivePoints(gameId, level) {
  if (gameId === 'clues' || gameId === 'reveal') return Math.max(1, 5 - level);
  return 1;
}

export function scoreAfter(current, delta) {
  return Math.max(0, Number(current || 0) + Number(delta || 0));
}
