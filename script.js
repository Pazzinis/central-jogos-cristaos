const characters = {
  easy: [['Jesus','Filho de Deus'],['Maria','Mãe de Jesus'],['Noé','Construiu uma arca'],['Moisés','Abriu o Mar Vermelho'],['Davi','Derrotou um gigante'],['Adão','Primeiro homem'],['Eva','Primeira mulher'],['José','Tinha uma túnica colorida'],['Sansão','Sua força estava nos cabelos'],['Jonas','Foi engolido por um grande peixe'],['Pedro','Pescador e discípulo'],['Abraão','Pai de muitas nações'],['Daniel','Sobreviveu à cova dos leões'],['Golias','Gigante filisteu'],['Salomão','Rei conhecido pela sabedoria'],['Lázaro','Foi ressuscitado por Jesus'],['João Batista','Batizou Jesus'],['Zaqueu','Subiu em uma árvore']],
  medium: [['Ester','Rainha que salvou seu povo'],['Rute','Companheira fiel de Noemi'],['Gideão','Venceu com apenas 300 homens'],['Débora','Juíza e profetisa'],['Samuel','Ouviu Deus ainda menino'],['Isaque','Filho da promessa'],['Jacó','Teve doze filhos'],['Paulo','Apóstolo dos gentios'],['Timóteo','Jovem discípulo de Paulo'],['Marta','Irmã de Maria e Lázaro'],['Madalena','Primeira a ver Jesus ressuscitado'],['Neemias','Reconstruiu os muros de Jerusalém'],['Elias','Profeta levado num redemoinho'],['Eliseu','Sucessor de Elias'],['Josué','Liderou a conquista de Jericó'],['João','Discípulo amado'],['Tomé','Quis ver para crer'],['Mateus','Cobrador de impostos e discípulo']],
  hard: [['Mefibosete','Neto de Saul acolhido por Davi'],['Balaão','Sua jumenta falou'],['Melquisedeque','Rei de Salém e sacerdote'],['Hulda','Profetisa consultada por Josias'],['Eúde','Juiz canhoto de Israel'],['Benaia','Valente guerreiro de Davi'],['Onésimo','Escravo mencionado por Paulo'],['Priscila','Ensinou Apolo com seu marido'],['Epafrodito','Companheiro de Paulo em Filipos'],['Zorobabel','Liderou o retorno do exílio'],['Bartimeu','Cego curado perto de Jericó'],['Jael','Derrotou Sísera'],['Abisague','Cuidou do rei Davi idoso'],['Tíquico','Mensageiro fiel de Paulo'],['Quedorlaomer','Rei combatido por Abraão'],['Eutique','Caiu da janela durante uma pregação'],['Nabote','Dono de uma vinha desejada por Acabe'],['Aitofel','Conselheiro que traiu Davi']]
};

const levels = {
  easy: { name: 'Fácil', duration: 180, label: '3 minutos' },
  medium: { name: 'Médio', duration: 120, label: '2 minutos' },
  hard: { name: 'Difícil', duration: 60, label: '1 minuto' }
};

const screens = [...document.querySelectorAll('.screen')];
const $ = (selector) => document.querySelector(selector);
let level = 'easy';
let deck = [];
let cardIndex = 0;
let score = 0;
let seconds = levels.easy.duration;
let timerId;
let countdownId;
let transitionIds = [];
let gameActive = false;
let tiltLocked = false;
let baseline = null;
let audioContext;

function showScreen(name) {
  screens.forEach((screen) => screen.classList.toggle('active', screen.dataset.screen === name));
  window.scrollTo(0, 1);
}

function shuffle(items) {
  const result = [...items];
  for (let index = result.length - 1; index > 0; index -= 1) {
    const randomIndex = Math.floor(Math.random() * (index + 1));
    [result[index], result[randomIndex]] = [result[randomIndex], result[index]];
  }
  return result;
}

function formatTime(value) {
  const minutes = Math.floor(value / 60);
  return `${minutes}:${String(value % 60).padStart(2, '0')}`;
}

function beep(frequency = 620, duration = .09, delay = 0) {
  try {
    const Audio = window.AudioContext || window.webkitAudioContext;
    audioContext ||= new Audio();
    const oscillator = audioContext.createOscillator();
    const gain = audioContext.createGain();
    const start = audioContext.currentTime + delay;
    oscillator.frequency.value = frequency;
    gain.gain.setValueAtTime(.001, start);
    gain.gain.exponentialRampToValueAtTime(.12, start + .01);
    gain.gain.exponentialRampToValueAtTime(.001, start + duration);
    oscillator.connect(gain).connect(audioContext.destination);
    oscillator.start(start);
    oscillator.stop(start + duration + .02);
  } catch (_) {}
}

async function prepareDevice() {
  try {
    if (!document.fullscreenElement) {
      await document.documentElement.requestFullscreen({ navigationUI: 'hide' });
    }
  } catch (_) {}
  try {
    const Audio = window.AudioContext || window.webkitAudioContext;
    audioContext ||= new Audio();
    await audioContext.resume();
    if (typeof window.DeviceOrientationEvent?.requestPermission === 'function') {
      await window.DeviceOrientationEvent.requestPermission();
    }
    await screen.orientation?.lock?.('landscape');
  } catch (_) {}
}

function clearTransitions() {
  transitionIds.forEach((id) => clearTimeout(id));
  transitionIds = [];
  $('#next-overlay').classList.remove('show');
  $('#roulette-overlay').classList.remove('show');
}

function startCountdown() {
  prepareDevice();
  let count = 5;
  $('#countdown-number').textContent = count;
  showScreen('countdown');
  beep(560);
  clearInterval(countdownId);
  countdownId = setInterval(() => {
    count -= 1;
    if (count > 0) {
      $('#countdown-number').textContent = count;
      beep(560 + count * 25);
    } else {
      clearInterval(countdownId);
      beep(880, .18);
      beginGame();
    }
  }, 1000);
}

function beginGame() {
  deck = shuffle(characters[level]);
  cardIndex = 0;
  score = 0;
  seconds = levels[level].duration;
  baseline = null;
  gameActive = true;
  tiltLocked = true;
  $('#score').textContent = '0';
  $('#timer').textContent = formatTime(seconds);
  showScreen('game');
  clearInterval(timerId);
  timerId = setInterval(() => {
    seconds -= 1;
    $('#timer').textContent = formatTime(Math.max(seconds, 0));
    if (seconds <= 10 && seconds > 0) beep(500, .05);
    if (seconds <= 0) finishGame();
  }, 1000);
  runRoulette();
}

function renderCard() {
  if (cardIndex >= deck.length) deck = shuffle(characters[level]);
  const [name, hint] = deck[cardIndex];
  $('#character-name').textContent = name;
  $('#character-hint').textContent = hint;
}

function runRoulette() {
  if (!gameActive) return;
  const overlay = $('#roulette-overlay');
  const rouletteName = $('#roulette-name');
  overlay.classList.add('show');
  let spins = 0;
  const rouletteTimer = setInterval(() => {
    const choices = characters[level];
    rouletteName.textContent = choices[Math.floor(Math.random() * choices.length)][0];
    beep(430 + spins * 18, .025);
    spins += 1;
    if (spins >= 12) {
      clearInterval(rouletteTimer);
      renderCard();
      rouletteName.textContent = deck[cardIndex][0];
      transitionIds.push(setTimeout(() => {
        overlay.classList.remove('show');
        tiltLocked = false;
        baseline = null;
        beep(820, .1);
      }, 420));
    }
  }, 75);
  transitionIds.push(rouletteTimer);
}

function nextCardCountdown() {
  const overlay = $('#next-overlay');
  const count = $('#next-count');
  overlay.classList.add('show');
  let value = 3;
  count.textContent = value;
  beep(530, .06);
  const tick = () => {
    value -= 1;
    if (value > 0) {
      count.textContent = value;
      beep(530 + value * 40, .06);
      transitionIds.push(setTimeout(tick, 1000));
    } else {
      overlay.classList.remove('show');
      cardIndex += 1;
      runRoulette();
    }
  };
  transitionIds.push(setTimeout(tick, 1000));
}

function feedback(type) {
  if (!gameActive || tiltLocked) return;
  tiltLocked = true;
  if (type === 'correct') {
    score += 1;
    $('#score').textContent = score;
    beep(740, .08);
    beep(980, .14, .08);
  } else {
    beep(260, .12);
  }
  const panel = $('#tilt-feedback');
  panel.textContent = type === 'correct' ? 'ACERTOU!' : 'PULOU!';
  panel.className = `tilt-feedback show ${type}`;
  transitionIds.push(setTimeout(() => {
    panel.className = 'tilt-feedback';
    nextCardCountdown();
  }, 650));
}

function finishGame() {
  if (!gameActive) return;
  gameActive = false;
  tiltLocked = true;
  clearInterval(timerId);
  clearTransitions();
  beep(520, .12); beep(660, .12, .14); beep(840, .24, .28);
  $('#final-score').textContent = score;
  $('#result-message').textContent = score >= 10 ? 'Vocês conhecem muito! Que partida incrível.' : score >= 5 ? 'Vocês fizeram uma ótima partida!' : 'Boa tentativa! Que tal mais uma rodada?';
  showScreen('result');
  try { if (document.fullscreenElement) document.exitFullscreen(); } catch (_) {}
}

function orientationAxis(event) {
  const angle = screen.orientation?.angle ?? window.orientation ?? 0;
  return Math.abs(angle) === 90 ? (angle === 90 ? -event.gamma : event.gamma) : event.beta;
}

window.addEventListener('deviceorientation', (event) => {
  if (!gameActive || tiltLocked || event.beta == null || event.gamma == null) return;
  const value = orientationAxis(event);
  if (baseline == null) { baseline = value; return; }
  const delta = value - baseline;
  if (delta > 30) feedback('correct');
  else if (delta < -30) feedback('pass');
  else baseline = baseline * .98 + value * .02;
}, true);

document.addEventListener('click', (event) => {
  const target = event.target.closest('[data-action],[data-level]');
  if (!target) return;
  if (target.dataset.level) {
    level = target.dataset.level;
    const config = levels[level];
    $('#chosen-level').textContent = `${config.name} · ${config.label}`;
    showScreen('ready');
    return;
  }
  const action = target.dataset.action;
  if (action === 'levels') showScreen('levels');
  if (action === 'home') showScreen('home');
  if (action === 'start' || action === 'replay') startCountdown();
  if (action === 'correct') feedback('correct');
  if (action === 'pass') feedback('pass');
  if (action === 'quit') finishGame();
});

document.addEventListener('keydown', (event) => {
  if (!gameActive) return;
  if (event.key === 'ArrowDown' || event.key === ' ') feedback('correct');
  if (event.key === 'ArrowUp') feedback('pass');
  if (event.key === 'Escape') finishGame();
});
