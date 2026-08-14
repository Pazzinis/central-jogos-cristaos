const DATA = window.MONTE_DATA;
const $ = (selector) => document.querySelector(selector);
const screens = [...document.querySelectorAll('.screen')];
const state = {
  game: null, duration: 180, rounds: 10, players: 5, teamA: 'Equipe Luz', teamB: 'Equipe Fé',
  deck: [], index: 0, score: 0, seconds: 0, active: false, locked: false, baseline: null,
  timer: null, countdown: null, jobs: [], answered: false, clueCount: 1, historyKey: '', timerDeadline: 0,
  teams: [0, 0], currentTeam: 0, playerIndex: 0, infiltratorIndex: 0, secretPair: null, secretVisible: false,
  phase: '', swapUsed: false, revealLevel: 0
};
let audioContext;

function showScreen(name) {
  screens.forEach((screen) => screen.classList.toggle('active', screen.dataset.screen === name));
  window.scrollTo(0, 0);
}

function shuffle(items) {
  const result = [...items];
  for (let index = result.length - 1; index > 0; index -= 1) {
    const randomIndex = Math.floor(Math.random() * (index + 1));
    [result[index], result[randomIndex]] = [result[randomIndex], result[index]];
  }
  return result;
}

const HISTORY_STORAGE_KEY = 'monte-content-history-v1';
const SITE_URL = 'https://jogosdaraquel.vercel.app/';

function itemIdentity(item) {
  if (Array.isArray(item)) return JSON.stringify(item);
  if (item?.q) return item.q;
  if (item?.word) return item.word;
  if (item?.answer && item?.clues) return item.answer;
  return JSON.stringify(item);
}

function readHistory() {
  try { return JSON.parse(localStorage.getItem(HISTORY_STORAGE_KEY) || '{}'); }
  catch (_) { return {}; }
}

function writeHistory(history) {
  try { localStorage.setItem(HISTORY_STORAGE_KEY, JSON.stringify(history)); }
  catch (_) {}
}

function freshDeck(items, key) {
  const history = readHistory();
  let seen = new Set(history[key] || []);
  const identities = items.map(itemIdentity);
  if (identities.length && identities.every((identity) => seen.has(identity))) {
    seen = new Set();
    history[key] = [];
    writeHistory(history);
  }
  const unseen = items.filter((item) => !seen.has(itemIdentity(item)));
  const previous = items.filter((item) => seen.has(itemIdentity(item)));
  return [...shuffle(unseen), ...shuffle(previous)];
}

function rememberItem(key, item) {
  if (!key || !item) return;
  const history = readHistory();
  const seen = new Set(history[key] || []);
  seen.add(itemIdentity(item));
  history[key] = [...seen];
  writeHistory(history);
}

function freshNote() {
  return '<p class="fresh-note"><b>Novidade:</b> Jogos da Raquel prioriza conteúdos que ainda não apareceram neste aparelho.</p>';
}

function beep(frequency = 620, duration = .08, delay = 0) {
  try {
    const Audio = window.AudioContext || window.webkitAudioContext;
    audioContext ||= new Audio();
    const oscillator = audioContext.createOscillator();
    const gain = audioContext.createGain();
    const start = audioContext.currentTime + delay;
    oscillator.frequency.value = frequency;
    gain.gain.setValueAtTime(.001, start);
    gain.gain.exponentialRampToValueAtTime(.11, start + .01);
    gain.gain.exponentialRampToValueAtTime(.001, start + duration);
    oscillator.connect(gain).connect(audioContext.destination);
    oscillator.start(start); oscillator.stop(start + duration + .02);
  } catch (_) {}
}

function formatTime(value) {
  return `${Math.floor(value / 60)}:${String(value % 60).padStart(2, '0')}`;
}

async function prepareDevice() {
  try { if (!document.fullscreenElement) await document.documentElement.requestFullscreen({navigationUI:'hide'}); } catch (_) {}
  try {
    const Audio = window.AudioContext || window.webkitAudioContext;
    audioContext ||= new Audio(); await audioContext.resume();
    if (state.game?.id === 'who' && typeof window.DeviceOrientationEvent?.requestPermission === 'function') await window.DeviceOrientationEvent.requestPermission();
    if (state.game?.landscape) await screen.orientation?.lock?.('landscape');
  } catch (_) {}
}

function clearRunning() {
  state.active = false;
  clearInterval(state.timer); clearInterval(state.countdown);
  state.jobs.forEach((job) => { clearTimeout(job); clearInterval(job); }); state.jobs = [];
  $('#feedback-overlay').className = 'feedback-overlay';
  $('#transition-overlay').className = 'transition-overlay';
}

function renderCatalog() {
  const order = ['Adivinhação','Conhecimento','Criatividade','Equipes','Visual','Festa'];
  const descriptions = {
    'Adivinhação':'Pistas, gestos e palavras para jogar com a turma.',
    'Conhecimento':'Perguntas bíblicas com respostas e explicações.',
    'Criatividade':'Use a imaginação — e, se quiser, papel e caneta.',
    'Equipes':'Disputas para dividir a galera em dois times.',
    'Visual':'Histórias bíblicas contadas de um jeito diferente.',
    'Festa':'Jogos sociais para conversar, desconfiar e rir.'
  };
  $('#game-grid').innerHTML = order.map((category, categoryIndex) => {
    const games = DATA.games.filter((game) => game.category === category);
    if (!games.length) return '';
    return `<section class="category-section">
      <header class="category-heading"><div><h2>${category}</h2><p>${descriptions[category]}</p></div><b>${games.length} ${games.length === 1 ? 'jogo' : 'jogos'}</b></header>
      <div class="category-list">${games.map((game) => `
        <article class="catalog-card ${game.id === 'who' ? 'featured' : ''}" data-accent="${game.accent}">
          <div class="card-art" data-banner-game="${game.id}" aria-hidden="true">
            <span class="catalog-icon">${game.icon}</span>
            <span class="card-art-pattern"></span>
          </div>
          <div class="card-copy">
            <span class="card-category">${game.category}</span>
            <h3>${game.title}</h3>
            <p>${game.description}</p>
          </div>
          <div class="card-actions">
            <button class="card-how" data-action="how-to-play" data-game-id="${game.id}" aria-label="Como jogar ${game.title}">Como jogar</button>
            <button class="card-start" data-game="${game.id}" aria-label="Começar ${game.title}">Começar <span aria-hidden="true">→</span></button>
          </div>
        </article>`).join('')}</div>
    </section>`;
  }).join('');
}

const HOW_TO_GUIDES = {
  cards: {
    players: '3 ou mais pessoas',
    preparation: 'Escolha o tempo da rodada e deixe o celular com quem dará as pistas.',
    steps: ['Uma carta aparece na tela.', 'A pessoa representa, desenha ou dá pistas conforme a regra do jogo.', 'Marque “Acertei” ou “Passei” para seguir para a próxima carta.'],
    scoring: 'Cada acerto vale 1 ponto. Tentem superar a pontuação na próxima rodada.'
  },
  quiz: {
    players: '1 pessoa ou um grupo',
    preparation: 'Escolha 5 ou 10 rodadas e decidam se as respostas serão individuais ou em conjunto.',
    steps: ['Leia a pergunta em voz alta.', 'Escolha uma das alternativas.', 'Confira a resposta e a explicação antes de avançar.'],
    scoring: 'Cada resposta correta vale 1 ponto.'
  },
  clues: {
    players: '2 ou mais pessoas',
    preparation: 'Escolha 5 ou 10 personagens para a partida.',
    steps: ['A primeira pista aparece valendo 5 pontos.', 'Revele outra pista se o grupo ainda não souber.', 'Quando descobrirem, marque o acerto; quanto menos pistas usarem, mais pontos ganham.'],
    scoring: 'A rodada começa valendo 5 pontos e perde 1 ponto a cada nova pista.'
  },
  battle: {
    players: '2 equipes',
    preparation: 'Dividam a turma e deem um nome para cada equipe.',
    steps: ['As equipes respondem alternadamente.', 'Leia a pergunta e escolha a resposta da equipe da vez.', 'Depois da explicação, passe o celular e avance.'],
    scoring: 'Cada resposta correta vale 1 ponto para a equipe da vez.'
  },
  infiltrator: {
    players: '4 a 12 pessoas',
    preparation: 'Sentem-se em roda e escolham quantas pessoas vão jogar.',
    steps: ['Passe o celular para cada pessoa ver sua palavra em segredo.', 'Cada participante dá uma pista curta sem revelar a palavra.', 'Conversem, votem e só então revelem quem era o infiltrado.'],
    scoring: 'O grupo vence se descobrir o infiltrado; ele vence se escapar da votação.'
  },
  grace: {
    players: '3 ou mais pessoas',
    preparation: 'Escolha 5 ou 10 objetos e defina a ordem dos participantes.',
    steps: ['A pessoa recebe um objeto aleatório.', 'Ela pensa por 30 segundos.', 'Depois tem 1 minuto para conectar o objeto à graça de Jesus.'],
    scoring: 'O grupo decide se a conexão foi clara e fez sentido.'
  },
  versehunt: {
    players: '2 equipes',
    preparation: 'Cada equipe precisa de pelo menos uma Bíblia física.',
    steps: ['O mediador lê a pista mostrada no celular.', 'As equipes procuram a passagem sem usar o celular.', 'Marque quem encontrou primeiro e revele a referência.'],
    scoring: 'A primeira equipe a encontrar corretamente ganha 1 ponto.'
  },
  reveal: {
    players: '2 ou mais pessoas',
    preparation: 'Escolha 5 ou 10 imagens e deixe a tela visível para todos.',
    steps: ['A imagem começa bastante desfocada.', 'A cada etapa ela fica mais nítida.', 'Quando o grupo souber a história, marque o acerto e confira a resposta.'],
    scoring: 'Quanto mais cedo acertarem, mais pontos a imagem vale.'
  },
  mimechain: {
    players: '3 a 12 pessoas',
    preparation: 'Formem uma fila; somente a primeira pessoa pode ver a história inicial.',
    steps: ['A primeira pessoa faz a mímica para a segunda.', 'Cada pessoa repete apenas o que entendeu para a próxima.', 'A última diz qual história acredita ter recebido.'],
    scoring: 'O grupo marca o ponto quando a resposta final preserva a história original.'
  }
};

function openHowToPlay(gameId) {
  const game = DATA.games.find((item) => item.id === gameId);
  if (!game) return;
  const guide = HOW_TO_GUIDES[game.mode] || HOW_TO_GUIDES.cards;
  const dialog = $('#how-to-dialog');
  $('#how-to-icon').textContent = game.icon;
  $('#how-to-category').textContent = game.category;
  $('#how-to-title').textContent = game.title;
  $('#how-to-description').textContent = game.description;
  $('#how-to-main-rule').textContent = game.rules;
  $('#how-to-players').textContent = guide.players;
  $('#how-to-preparation').textContent = guide.preparation;
  $('#how-to-steps').innerHTML = guide.steps.map((step) => `<li>${step}</li>`).join('');
  $('#how-to-scoring').textContent = guide.scoring;
  $('#how-to-start').dataset.game = game.id;
  if (typeof dialog.showModal === 'function') dialog.showModal();
  else dialog.setAttribute('open', '');
}

function closeHowToPlay() {
  const dialog = $('#how-to-dialog');
  if (typeof dialog.close === 'function') dialog.close();
  else dialog.removeAttribute('open');
}

function openSetup(gameId) {
  clearRunning();
  state.game = DATA.games.find((game) => game.id === gameId);
  if (state.game.mode === 'mimechain' && ![3,5].includes(state.rounds)) state.rounds = 5;
  if (['quiz','clues','grace','reveal'].includes(state.game.mode) && ![5,10].includes(state.rounds)) state.rounds = 10;
  $('.setup-screen').dataset.mode = state.game.mode;
  $('#setup-icon').textContent = state.game.icon;
  $('#setup-kicker').textContent = state.game.category.toUpperCase();
  $('#setup-title').textContent = state.game.title;
  $('#setup-description').textContent = state.game.description;
  $('#setup-rules').textContent = state.game.rules;
  renderSetupPanel(); showScreen('setup');
}

function renderSetupPanel() {
  const panel = $('#setup-panel');
  if (state.game.mode === 'cards') {
    panel.innerHTML = `<h3>Escolha o ritmo</h3><p>O conteúdo é o mesmo; muda apenas o tempo da rodada.</p>
      <div class="choice-list">
        ${[[180,'Relaxado','3 minutos'],[120,'Normal','2 minutos'],[60,'Relâmpago','1 minuto']].map(([value,title,label]) => `<button class="choice-button ${state.duration === value ? 'selected' : ''}" data-duration="${value}"><span><strong>${title}</strong><small>${label}</small></span><b>${label}</b></button>`).join('')}
      </div>${freshNote()}<button class="primary-button" data-action="start-game">Começar em tela cheia <span>→</span></button>`;
  } else if (state.game.mode === 'quiz' || state.game.mode === 'clues') {
    panel.innerHTML = `<h3>Quantidade de rodadas</h3><p>Jogue sozinho ou responda em grupo.</p>
      <div class="choice-list">${[5,10].map((value) => `<button class="choice-button ${state.rounds === value ? 'selected' : ''}" data-rounds="${value}"><span><strong>${value} rodadas</strong><small>${value === 5 ? 'partida rápida' : 'partida completa'}</small></span><b>→</b></button>`).join('')}</div>
      ${freshNote()}<button class="primary-button" data-action="start-game">Começar <span>→</span></button>`;
  } else if (state.game.mode === 'battle' || state.game.mode === 'versehunt') {
    panel.innerHTML = `<h3>Prepare as equipes</h3><p>${state.game.mode === 'versehunt' ? 'Serão 10 buscas. Tenham Bíblias físicas por perto.' : 'Serão 10 perguntas, alternando automaticamente.'}</p>
      <div class="field"><label for="team-a">Equipe A</label><input id="team-a" maxlength="20" value="${state.teamA}"></div>
      <div class="field"><label for="team-b">Equipe B</label><input id="team-b" maxlength="20" value="${state.teamB}"></div>
      ${freshNote()}<button class="primary-button" data-action="start-game">${state.game.mode === 'versehunt' ? 'Começar a busca' : 'Iniciar batalha'} <span>⚡</span></button>`;
  } else if (state.game.mode === 'grace' || state.game.mode === 'reveal') {
    panel.innerHTML = `<h3>Quantidade de rodadas</h3><p>${state.game.mode === 'grace' ? 'Cada pessoa recebe um novo objeto.' : 'Cada imagem vale até 5 pontos.'}</p>
      <div class="choice-list">${[5,10].map((value) => `<button class="choice-button ${state.rounds === value ? 'selected' : ''}" data-rounds="${value}"><span><strong>${value} rodadas</strong><small>${value === 5 ? 'partida rápida' : 'partida completa'}</small></span><b>→</b></button>`).join('')}</div>
      ${freshNote()}<button class="primary-button" data-action="start-game">Começar <span>→</span></button>`;
  } else if (state.game.mode === 'mimechain') {
    panel.innerHTML = `<h3>Prepare a fila</h3><p>Escolha quantas pessoas participarão da corrente.</p>
      <div class="stepper"><button data-action="players-down" aria-label="Diminuir jogadores">−</button><strong><span id="players-count">${state.players}</span> jogadores</strong><button data-action="players-up" aria-label="Aumentar jogadores">+</button></div>
      <div class="choice-list">${[3,5].map((value) => `<button class="choice-button ${state.rounds === value ? 'selected' : ''}" data-rounds="${value}"><span><strong>${value} rodadas</strong><small>${value === 3 ? 'partida rápida' : 'partida completa'}</small></span><b>→</b></button>`).join('')}</div>
      ${freshNote()}<button class="primary-button" data-action="start-game">Começar a corrente <span>↝</span></button>`;
  } else {
    panel.innerHTML = `<h3>Quantos jogadores?</h3><p>O celular será passado de mão em mão.</p>
      <div class="stepper"><button data-action="players-down" aria-label="Diminuir jogadores">−</button><strong><span id="players-count">${state.players}</span> jogadores</strong><button data-action="players-up" aria-label="Aumentar jogadores">+</button></div>
      ${freshNote()}<button class="primary-button" data-action="start-game">Distribuir palavras <span>◉</span></button>`;
  }
}

function startGame() {
  if (state.game.mode === 'battle' || state.game.mode === 'versehunt') {
    state.teamA = $('#team-a').value.trim() || 'Equipe Luz'; state.teamB = $('#team-b').value.trim() || 'Equipe Fé';
  }
  prepareDevice();
  if (state.game.mode === 'infiltrator') { startInfiltrator(); return; }
  startCountdown(5, () => {
    if (state.game.mode === 'cards') startCards();
    else if (state.game.mode === 'quiz') startQuiz();
    else if (state.game.mode === 'clues') startClues();
    else if (state.game.mode === 'battle') startBattle();
    else if (state.game.mode === 'grace') startGrace();
    else if (state.game.mode === 'versehunt') startVerseHunt();
    else if (state.game.mode === 'reveal') startImageReveal();
    else if (state.game.mode === 'mimechain') startMimeChain();
  });
}

function startCountdown(from, done) {
  showScreen('countdown'); $('#countdown-label').textContent = 'PREPARE-SE'; $('#countdown-number').textContent = from; beep(560);
  const deadline = Date.now() + from * 1000;
  let value = from;
  state.countdown = setInterval(() => {
    const nextValue = Math.max(0, Math.ceil((deadline - Date.now()) / 1000));
    if (nextValue === value) return;
    value = nextValue;
    if (value > 0) { $('#countdown-number').textContent = value; beep(580 + value * 25); }
    else { clearInterval(state.countdown); state.countdown = null; beep(880,.16); done(); }
  }, 100);
}

function configurePlay() {
  showScreen('play'); $('#play-label').textContent = state.game.title.toUpperCase(); $('#turn-label').textContent = '';
  $('#score-label').textContent = 'PONTOS'; $('#score').textContent = state.score; $('#timer').textContent = '—';
  $('#play-actions').innerHTML = ''; $('#play-stage').innerHTML = '';
  $('.play-screen').classList.toggle('require-landscape', Boolean(state.game.landscape));
}

function cardSource() {
  if (state.game.id === 'who') return DATA.commonCharacters;
  if (state.game.id === 'mime') return DATA.mime;
  if (state.game.id === 'draw') return DATA.draw;
  if (state.game.id === 'taboo') return DATA.taboo;
  return DATA.emoji;
}

function startCards() {
  state.historyKey = `cards:${state.game.id}`; state.deck = freshDeck(cardSource(), state.historyKey); state.index = 0; state.score = 0; state.seconds = state.duration; state.timerDeadline = Date.now() + state.duration * 1000; state.active = true; state.locked = true;
  configurePlay(); $('#score-label').textContent = 'ACERTOS'; $('#timer').textContent = formatTime(state.seconds);
  state.timer = setInterval(() => {
    const nextSeconds = Math.max(0, Math.ceil((state.timerDeadline - Date.now()) / 1000));
    if (nextSeconds === state.seconds) return;
    state.seconds = nextSeconds; $('#timer').textContent = formatTime(state.seconds);
    if (state.seconds <= 10 && state.seconds > 0) beep(480,.04);
    if (state.seconds <= 0) finish('cards');
  }, 250);
  runRoulette();
}

function cardTitle(card) { return state.game.id === 'taboo' ? card.word : card[0]; }

function renderCard() {
  if (state.index >= state.deck.length) { state.deck = freshDeck(cardSource(), state.historyKey); state.index = 0; }
  const card = state.deck[state.index];
  rememberItem(state.historyKey, card);
  let content = '';
  if (state.game.id === 'taboo') content = `<p class="stage-kicker">FAÇA ADIVINHAR</p><h2 class="stage-title">${card.word}</h2><p class="stage-subtitle">Não pode falar:</p><div class="forbidden">${card.forbidden.map((word) => `<span>${word}</span>`).join('')}</div>`;
  else if (state.game.id === 'emoji') content = `<p class="stage-kicker">QUAL É A HISTÓRIA?</p><h2 class="emoji-title">${card[0]}</h2><p class="stage-subtitle" id="emoji-answer">Toque em “Mostrar resposta” se precisar</p>`;
  else content = `<p class="stage-kicker">${state.game.id === 'who' ? 'QUEM SOU EU?' : state.game.title.toUpperCase()}</p><h2 class="stage-title">${card[0]}</h2><p class="stage-subtitle">${card[1]}</p>`;
  $('#play-stage').innerHTML = `<div class="stage-inner">${content}</div>`;
  const reveal = state.game.id === 'emoji' ? `<button class="action-secondary" data-action="reveal-emoji">Mostrar resposta</button>` : '';
  $('#play-actions').innerHTML = `<button class="action-secondary" data-action="card-pass">↑ PULAR</button>${reveal}<button class="action-primary" data-action="card-correct">ACERTEI ↓</button>`;
}

function runRoulette() {
  if (!state.active) return;
  state.locked = true; const overlay = $('#transition-overlay'); const value = $('#transition-value');
  overlay.className = 'transition-overlay roulette show'; $('#transition-label').textContent = 'SORTEANDO...';
  let spins = 0; const source = cardSource();
  const job = setInterval(() => {
    value.textContent = cardTitle(source[Math.floor(Math.random()*source.length)]); beep(420+spins*12,.025); spins += 1;
    if (spins >= 11) { clearInterval(job); renderCard(); value.textContent = cardTitle(state.deck[state.index]); state.jobs.push(setTimeout(() => { overlay.className='transition-overlay'; state.locked=false; state.baseline=null; beep(820,.08); },380)); }
  },70); state.jobs.push(job);
}

function cardFeedback(correct) {
  if (!state.active || state.locked) return; state.locked = true;
  if (correct) { state.score += 1; $('#score').textContent = state.score; beep(760,.08); beep(980,.12,.07); }
  else beep(260,.1);
  const overlay = $('#feedback-overlay'); overlay.textContent = correct ? 'ACERTOU!' : 'PULOU!'; overlay.className = `feedback-overlay show ${correct?'':'pass'}`;
  state.jobs.push(setTimeout(() => { overlay.className='feedback-overlay'; nextCardCountdown(); },550));
}

function nextCardCountdown() {
  const overlay=$('#transition-overlay'); const value=$('#transition-value'); overlay.className='transition-overlay show'; $('#transition-label').textContent='PRÓXIMO EM'; let count=5; value.textContent=count; const deadline=Date.now()+5000;
  beep(540,.05);
  const job=setInterval(()=>{const nextCount=Math.max(0,Math.ceil((deadline-Date.now())/1000));if(nextCount===count)return;count=nextCount;if(count>0){value.textContent=count;beep(540+count*30,.05);}else{clearInterval(job);overlay.className='transition-overlay';state.index+=1;runRoulette();}},100);
  state.jobs.push(job);
}

function startQuiz() {
  state.historyKey=`quiz:${state.game.id}`;state.deck=freshDeck(DATA.quizzes[state.game.id],state.historyKey).slice(0,state.rounds);state.index=0;state.score=0;state.active=true;configurePlay();renderQuestion();
}

function renderQuestion() {
  if(state.index>=state.deck.length){finish('quiz');return;} state.answered=false;const item=state.deck[state.index];rememberItem(state.historyKey,item);
  $('#turn-label').textContent=`PERGUNTA ${state.index+1} DE ${state.deck.length}`;$('#score').textContent=state.score;
  $('#play-stage').innerHTML=`<div class="stage-inner"><p class="stage-kicker">ESCOLHA UMA RESPOSTA</p><h2 class="quiz-question">${item.q}</h2><div class="options">${item.options.map((option,index)=>`<button class="option" data-answer="${index}">${option}</button>`).join('')}</div><div class="explanation" id="explanation">${item.explanation}</div></div>`;
  $('#play-actions').innerHTML='';
}

function answerQuestion(answerIndex) {
  if(state.answered)return;state.answered=true;const item=state.deck[state.index];const correct=answerIndex===item.answer;
  document.querySelectorAll('.option').forEach((button,index)=>{button.disabled=true;if(index===item.answer)button.classList.add('correct');else if(index===answerIndex)button.classList.add('wrong');});
  $('#explanation').classList.add('show');if(correct){state.score+=1;$('#score').textContent=state.score;beep(850,.1);}else beep(260,.12);
  $('#play-actions').innerHTML=`<button class="action-primary" data-action="next-question">${state.index+1===state.deck.length?'Ver resultado':'Próxima pergunta'} →</button>`;
}

function startClues() {
  state.historyKey='clues';state.deck=freshDeck(DATA.clues,state.historyKey).slice(0,state.rounds);state.index=0;state.score=0;state.active=true;state.clueCount=1;configurePlay();renderClue();
}

function renderClue(revealAnswer=false) {
  if(state.index>=state.deck.length){finish('clues');return;}const item=state.deck[state.index];rememberItem(state.historyKey,item);$('#turn-label').textContent=`RODADA ${state.index+1} DE ${state.deck.length}`;$('#score').textContent=state.score;
  $('#play-stage').innerHTML=`<div class="stage-inner"><p class="stage-kicker">VALENDO ${6-state.clueCount} ${6-state.clueCount===1?'PONTO':'PONTOS'}</p><h2 class="quiz-question">Quem é o personagem?</h2><div class="clue-list">${item.clues.slice(0,state.clueCount).map((clue,index)=>`<div class="clue"><b>${index+1}</b>${clue}</div>`).join('')}</div>${revealAnswer?`<div class="answer-reveal">${item.answer}</div>`:''}</div>`;
  if(revealAnswer)$('#play-actions').innerHTML='<button class="action-primary" data-action="next-clue-card">Próximo personagem →</button>';
  else $('#play-actions').innerHTML=`<button class="action-secondary" data-action="more-clue" ${state.clueCount===5?'disabled':''}>+ Outra pista</button><button class="action-secondary" data-action="give-up-clue">Não sei</button><button class="action-primary" data-action="got-clue">Acertei!</button>`;
}

function startBattle() {
  const pool=[...DATA.quizzes.truth,...DATA.quizzes.quote,...DATA.quizzes.verse];state.historyKey='battle';state.deck=freshDeck(pool,state.historyKey).slice(0,10);state.index=0;state.teams=[0,0];state.currentTeam=0;state.active=true;configurePlay();$('#score-label').textContent='RODADA';renderBattle();
}

function renderBattle() {
  if(state.index>=state.deck.length){finish('battle');return;}state.answered=false;const item=state.deck[state.index];rememberItem(state.historyKey,item);const names=[state.teamA,state.teamB];$('#score').textContent=`${state.index+1}/10`;$('#turn-label').textContent=`VEZ DE ${names[state.currentTeam].toUpperCase()}`;
  $('#play-stage').innerHTML=`<div class="stage-inner"><div class="team-board">${names.map((name,index)=>`<span class="team-pill ${index===state.currentTeam?'active':''}">${name}<b>${state.teams[index]}</b></span>`).join('')}</div><h2 class="quiz-question">${item.q}</h2><div class="options">${item.options.map((option,index)=>`<button class="option" data-battle-answer="${index}">${option}</button>`).join('')}</div><div class="explanation" id="explanation">${item.explanation}</div></div>`;$('#play-actions').innerHTML='';
}

function answerBattle(answerIndex) {
  if(state.answered)return;state.answered=true;const item=state.deck[state.index];const correct=answerIndex===item.answer;if(correct)state.teams[state.currentTeam]+=1;
  document.querySelectorAll('.option').forEach((button,index)=>{button.disabled=true;if(index===item.answer)button.classList.add('correct');else if(index===answerIndex)button.classList.add('wrong');});$('#explanation').classList.add('show');beep(correct?850:260,.1);
  $('#play-actions').innerHTML='<button class="action-primary" data-action="next-battle">Próxima equipe →</button>';
}

function startRoundTimer(seconds, onEnd) {
  clearInterval(state.timer);
  state.seconds = seconds;
  state.timerDeadline = Date.now() + seconds * 1000;
  $('#timer').textContent = formatTime(seconds);
  state.timer = setInterval(() => {
    const nextSeconds = Math.max(0, Math.ceil((state.timerDeadline - Date.now()) / 1000));
    if (nextSeconds === state.seconds) return;
    state.seconds = nextSeconds;
    $('#timer').textContent = formatTime(nextSeconds);
    if (nextSeconds <= 5 && nextSeconds > 0) beep(510 + nextSeconds * 35, .04);
    if (nextSeconds === 0) {
      clearInterval(state.timer); state.timer = null; beep(260, .14); onEnd?.();
    }
  }, 100);
}

function stopRoundTimer(label = '—') {
  clearInterval(state.timer); state.timer = null; $('#timer').textContent = label;
}

function startGrace() {
  state.historyKey = 'grace'; state.deck = freshDeck(DATA.graceObjects, state.historyKey); state.index = 0;
  state.score = 0; state.active = true; state.swapUsed = false; configurePlay(); renderGraceRound();
}

function renderGraceRound() {
  if (state.index >= state.rounds) { finish('grace'); return; }
  state.phase = 'thinking'; const object = state.deck[state.index]; rememberItem(state.historyKey, object);
  $('#turn-label').textContent = `RODADA ${state.index + 1} DE ${state.rounds}`; $('#score').textContent = state.score; $('#score-label').textContent = 'PONTOS';
  $('#play-stage').innerHTML = `<div class="stage-inner"><p class="stage-kicker" id="grace-status">30 SEGUNDOS PARA PENSAR</p><div class="object-card"><small>SEU OBJETO É</small><h2>${object}</h2><p>Crie uma ilustração que conecte este objeto à graça de Jesus.</p></div></div>`;
  $('#play-actions').innerHTML = `<button class="action-secondary" data-action="swap-grace" ${state.swapUsed ? 'disabled' : ''}>Trocar objeto</button><button class="action-primary" data-action="start-grace-pitch">Apresentar agora →</button>`;
  startRoundTimer(30, startGracePitch);
}

function swapGraceObject() {
  if (state.swapUsed || state.phase !== 'thinking') return;
  state.swapUsed = true;
  const nextIndex = Math.min(state.index + 1, state.deck.length - 1);
  [state.deck[state.index], state.deck[nextIndex]] = [state.deck[nextIndex], state.deck[state.index]];
  renderGraceRound();
}

function startGracePitch() {
  if (state.phase !== 'thinking') return;
  state.phase = 'pitch'; const object = state.deck[state.index];
  $('#play-stage').innerHTML = `<div class="stage-inner"><p class="stage-kicker" id="grace-status">AGORA É COM VOCÊ</p><div class="object-card presenting"><small>CONECTE COM A GRAÇA</small><h2>${object}</h2><p>Você tem 1 minuto. O grupo decide se a conexão fez sentido.</p></div></div>`;
  $('#play-actions').innerHTML = '<button class="action-secondary" data-action="score-grace-no">Não conseguiu</button><button class="action-primary" data-action="score-grace-yes">Conseguiu!</button>';
  startRoundTimer(60, () => { const status = $('#grace-status'); if (status) status.textContent = 'TEMPO ENCERRADO · O GRUPO DECIDE'; });
}

function scoreGrace(success) {
  if (state.phase !== 'pitch') return;
  stopRoundTimer(); if (success) { state.score += 1; beep(850, .1); } else beep(280, .1);
  state.index += 1; state.swapUsed = false; renderGraceRound();
}

function startVerseHunt() {
  state.historyKey = 'versehunt'; state.deck = freshDeck(DATA.verseHunt, state.historyKey).slice(0, 10);
  state.index = 0; state.teams = [0, 0]; state.score = 0; state.active = true; configurePlay(); renderVerseHunt();
}

function renderVerseHunt(revealed = false) {
  if (state.index >= state.deck.length) { finish('versehunt'); return; }
  const item = state.deck[state.index]; const names = [state.teamA, state.teamB]; state.answered = revealed;
  $('#turn-label').textContent = `BUSCA ${state.index + 1} DE ${state.deck.length}`; $('#score-label').textContent = 'PLACAR'; $('#score').textContent = `${state.teams[0]} × ${state.teams[1]}`;
  $('#play-stage').innerHTML = `<div class="stage-inner"><div class="team-board">${names.map((name,index)=>`<span class="team-pill">${name}<b>${state.teams[index]}</b></span>`).join('')}</div><p class="stage-kicker">${revealed ? 'REFERÊNCIA ENCONTRADA' : 'PROCUREM EM BÍBLIAS FÍSICAS'}</p><h2 class="quiz-question">${revealed ? item.ref : item.clue}</h2>${revealed ? `<div class="verse-note">${item.note}</div>` : '<p class="stage-subtitle" id="hunt-status">A primeira equipe que encontrar deve ler o trecho em voz alta.</p>'}</div>`;
  if (revealed) {
    stopRoundTimer(); rememberItem(state.historyKey, item);
    $('#play-actions').innerHTML = '<button class="action-primary" data-action="next-verse-hunt">Próxima busca →</button>';
  } else {
    $('#play-actions').innerHTML = `<button class="action-primary team-a-button" data-action="verse-team-a">${names[0]}</button><button class="action-secondary" data-action="verse-team-none">Ninguém</button><button class="action-primary team-b-button" data-action="verse-team-b">${names[1]}</button>`;
    startRoundTimer(90, () => { const status = $('#hunt-status'); if (status) status.textContent = 'Tempo encerrado. Marque quem encontrou ou escolha “Ninguém”.'; });
  }
}

function awardVerseHunt(teamIndex) {
  if (state.answered) return;
  if (teamIndex !== null) { state.teams[teamIndex] += 1; beep(850, .1); } else beep(280, .1);
  renderVerseHunt(true);
}

function startImageReveal() {
  state.historyKey = 'reveal'; state.deck = freshDeck(DATA.revealImages, state.historyKey).slice(0, state.rounds);
  state.index = 0; state.score = 0; state.active = true; configurePlay(); renderImageReveal();
}

function revealImageStyle(item, level) {
  return `--scene-x:${item.x}%;--scene-y:${item.y}%;`;
}

function renderImageReveal(answerVisible = false) {
  if (state.index >= state.deck.length) { finish('reveal'); return; }
  const item = state.deck[state.index]; state.answered = answerVisible;
  if (!answerVisible) state.revealLevel = 0;
  const points = 5 - state.revealLevel;
  $('#turn-label').textContent = `IMAGEM ${state.index + 1} DE ${state.deck.length}`; $('#score-label').textContent = answerVisible ? 'PONTOS' : `TOTAL · VALE ${points}`; $('#score').textContent = state.score;
  $('#play-stage').innerHTML = `<div class="stage-inner reveal-stage"><p class="stage-kicker">${answerVisible ? 'A HISTÓRIA ERA' : 'QUAL É A HISTÓRIA?'}</p><div class="reveal-frame"><div class="reveal-image level-${answerVisible ? 4 : state.revealLevel}" style="${revealImageStyle(item, state.revealLevel)}"></div></div>${answerVisible ? `<h2 class="reveal-answer">${item.answer}</h2><p class="stage-subtitle">${item.ref}</p>` : '<p class="stage-subtitle">A imagem ficará mais clara a cada 5 segundos.</p>'}</div>`;
  if (answerVisible) {
    stopRoundTimer(); rememberItem(state.historyKey, item);
    $('#play-actions').innerHTML = '<button class="action-primary" data-action="next-image">Próxima imagem →</button>';
  } else {
    $('#play-actions').innerHTML = `<button class="action-secondary" data-action="give-up-image">Não sei</button><button class="action-secondary" data-action="reveal-more-image">Mais nítida</button><button class="action-primary" data-action="correct-image">Acertei!</button>`;
    startImageRevealStep();
  }
}

function startImageRevealStep() {
  if (state.revealLevel >= 4) { stopRoundTimer(); return; }
  startRoundTimer(5, advanceImageReveal);
}

function advanceImageReveal() {
  if (state.answered || state.revealLevel >= 4) return;
  stopRoundTimer(); state.revealLevel += 1; const image = $('.reveal-image');
  if (image) image.className = `reveal-image level-${state.revealLevel}`;
  const points = 5 - state.revealLevel; $('#score-label').textContent = `TOTAL · VALE ${points}`; beep(620, .06);
  startImageRevealStep();
}

function answerImageReveal(correct) {
  if (state.answered) return;
  stopRoundTimer(); if (correct) { state.score += 5 - state.revealLevel; beep(850, .1); } else beep(280, .1);
  renderImageReveal(true);
}

function startMimeChain() {
  state.historyKey = 'mimechain'; state.deck = freshDeck(DATA.mimeChain, state.historyKey).slice(0, state.rounds);
  state.index = 0; state.score = 0; state.active = true; configurePlay(); renderMimeChainReady();
}

function renderMimeChainReady() {
  if (state.index >= state.deck.length) { finish('mimechain'); return; }
  state.phase = 'ready'; $('#turn-label').textContent = `RODADA ${state.index + 1} DE ${state.deck.length}`; $('#score-label').textContent = 'PONTOS'; $('#score').textContent = state.score; stopRoundTimer();
  $('#play-stage').innerHTML = `<div class="secret-card"><p>SOMENTE A PRIMEIRA PESSOA OLHA</p><h2>Jogador 1</h2><p>Os outros ${state.players - 1} jogadores devem ficar de costas.</p><button class="primary-button" data-action="show-mime-chain">Ver a história <span>👁</span></button></div>`;
  $('#play-actions').innerHTML = '';
}

function showMimeChainPrompt() {
  if (state.phase !== 'ready') return;
  state.phase = 'prompt'; const item = state.deck[state.index]; rememberItem(state.historyKey, item);
  $('#play-stage').innerHTML = `<div class="secret-card mime-secret"><p>MEMORIZE SEM DEIXAR NINGUÉM VER</p><h2>${item.answer}</h2><p>${item.prompt}</p><button class="primary-button" data-action="hide-mime-chain">Memorizei e escondi <span>→</span></button></div>`;
}

function hideMimeChainPrompt() {
  if (state.phase !== 'prompt') return;
  state.phase = 'chain';
  $('#play-stage').innerHTML = `<div class="stage-inner"><p class="stage-kicker" id="mime-chain-status">CELULAR DE LADO</p><h2 class="discussion">Passe a mímica<br>até o Jogador ${state.players}.</h2><p class="stage-subtitle">Sem falar, sem voltar e sem repetir. A última pessoa deve dizer o que entendeu.</p></div>`;
  $('#play-actions').innerHTML = '<button class="action-primary" data-action="reveal-mime-chain">Revelar história original</button>';
  startRoundTimer(120, () => { const status = $('#mime-chain-status'); if (status) status.textContent = 'TEMPO ENCERRADO · OUÇA A RESPOSTA FINAL'; });
}

function revealMimeChainAnswer() {
  if (state.phase !== 'chain') return;
  state.phase = 'answer'; stopRoundTimer(); const item = state.deck[state.index];
  $('#play-stage').innerHTML = `<div class="stage-inner"><p class="stage-kicker">A HISTÓRIA ORIGINAL ERA</p><h2 class="quiz-question">${item.answer}</h2><p class="stage-subtitle">${item.prompt}</p></div>`;
  $('#play-actions').innerHTML = '<button class="action-secondary" data-action="score-mime-no">Ficou diferente</button><button class="action-primary" data-action="score-mime-yes">Chegou na resposta!</button>';
}

function scoreMimeChain(success) {
  if (state.phase !== 'answer') return;
  if (success) { state.score += 1; beep(850, .1); } else beep(280, .1);
  state.index += 1; renderMimeChainReady();
}

function startInfiltrator() {
  state.historyKey='infiltrator';state.secretPair=freshDeck(DATA.infiltrator,state.historyKey)[0];rememberItem(state.historyKey,state.secretPair);state.infiltratorIndex=Math.floor(Math.random()*state.players);state.playerIndex=0;state.secretVisible=false;state.active=true;configurePlay();
  $('#score-label').textContent='JOGADORES';$('#score').textContent=state.players;renderSecretPass();
}

function renderSecretPass() {
  const number=state.playerIndex+1;$('#turn-label').textContent=`JOGADOR ${number} DE ${state.players}`;$('#timer').textContent='—';
  if(!state.secretVisible){$('#play-stage').innerHTML=`<div class="secret-card"><p>ENTREGUE O CELULAR AO</p><h2>Jogador ${number}</h2><p>Quando ninguém estiver olhando, revele sua palavra.</p><button class="primary-button" data-action="reveal-secret">Ver minha palavra <span>👁</span></button></div>`;}
  else{const word=state.playerIndex===state.infiltratorIndex?state.secretPair[1]:state.secretPair[0];$('#play-stage').innerHTML=`<div class="secret-card"><p>SUA PALAVRA SECRETA É</p><h2>${word}</h2><p>Guarde na memória e não deixe ninguém ver.</p><button class="primary-button" data-action="hide-secret">Esconder e passar <span>→</span></button></div>`;}$('#play-actions').innerHTML='';
}

function finishSecretDistribution() {
  $('#turn-label').textContent='HORA DAS PISTAS';$('#play-stage').innerHTML=`<div class="stage-inner"><p class="stage-kicker">TODOS VIRAM A PALAVRA</p><h2 class="discussion">Dê uma pista.<br>Encontre o infiltrado.</h2><p class="stage-subtitle">Depois que todos falarem, façam a votação.</p></div>`;$('#play-actions').innerHTML='<button class="action-primary" data-action="reveal-infiltrator">Revelar o infiltrado</button>';
}

function revealInfiltrator() {
  $('#play-stage').innerHTML=`<div class="stage-inner"><p class="stage-kicker">O INFILTRADO ERA</p><h2 class="stage-title">Jogador ${state.infiltratorIndex+1}</h2><p class="stage-subtitle">Grupo: <b>${state.secretPair[0]}</b> · Infiltrado: <b>${state.secretPair[1]}</b></p></div>`;$('#play-actions').innerHTML='<button class="action-primary" data-action="replay">Jogar novamente ↻</button><button class="action-secondary" data-action="home">Voltar à central</button>';beep(620,.12);beep(850,.2,.13);
  state.jobs.push(setTimeout(openCampaignReminder, 650));
}

function finish(type) {
  const wasActive=state.active;if(!wasActive)return;clearRunning();let final=state.score;let label='PONTOS';let message='Que partida boa!';
  if(type==='infiltrator'){showScreen('home');try{if(document.fullscreenElement)document.exitFullscreen();}catch(_){}return;}
  if(type==='battle'||type==='versehunt'){const names=[state.teamA,state.teamB];final=`${state.teams[0]} × ${state.teams[1]}`;label=`${names[0]} · ${names[1]}`;message=state.teams[0]===state.teams[1]?'Empate! As duas equipes mandaram muito bem.':`${names[state.teams[0]>state.teams[1]?0:1]} venceu ${type==='versehunt'?'a busca':'a batalha'}!`;}
  else if(type==='cards'){label='ACERTOS';message=state.score>=10?'Vocês estão afiados! Que rodada incrível.':state.score>=5?'Mandaram muito bem nessa rodada!':'Boa tentativa! A próxima vai ser ainda melhor.';}
  else if(type==='grace'){label='CONEXÕES';message=`O grupo aprovou ${state.score} de ${state.rounds} conexões com a graça.`;}
  else if(type==='mimechain'){label='HISTÓRIAS';message=`A corrente preservou ${state.score} de ${state.deck.length} histórias.`;}
  else if(type==='reveal'){label='PONTOS';message=`Vocês somaram ${state.score} pontos reconhecendo as imagens.`;}
  else message=`Você acertou ${state.score} de ${state.deck.length}.`;
  $('#final-score').textContent=final;$('#final-label').textContent=label;$('#result-message').textContent=message;showScreen('result');state.jobs.push(setTimeout(openCampaignReminder,650));try{if(document.fullscreenElement)document.exitFullscreen();}catch(_){}
}

function openCampaignReminder() {
  const dialog = $('#campaign-dialog');
  if (dialog.open) return;
  if (typeof dialog.showModal === 'function') dialog.showModal();
  else dialog.setAttribute('open', '');
}

function closeCampaignReminder() {
  const dialog = $('#campaign-dialog');
  if (typeof dialog.close === 'function') dialog.close();
  else dialog.removeAttribute('open');
}

function openShare() {
  const dialog = $('#share-dialog');
  $('#copy-status').textContent = '';
  if (typeof dialog.showModal === 'function') dialog.showModal();
  else dialog.setAttribute('open', '');
}

function closeShare() {
  const dialog = $('#share-dialog');
  if (typeof dialog.close === 'function') dialog.close();
  else dialog.removeAttribute('open');
}

async function copySiteLink() {
  try {
    await navigator.clipboard.writeText(SITE_URL);
  } catch (_) {
    const input = document.createElement('textarea');
    input.value = SITE_URL; input.setAttribute('readonly', ''); input.style.position = 'fixed'; input.style.opacity = '0';
    document.body.appendChild(input); input.select(); document.execCommand('copy'); input.remove();
  }
  $('#copy-status').textContent = 'Link copiado! Agora é só enviar.';
}

async function shareSite() {
  if (navigator.share) {
    try { await navigator.share({title:'Jogos da Raquel — Jogos Cristãos',text:'Uma central de jogos cristãos para jogar com a galera e apoiar a Raquel.',url:SITE_URL}); return; }
    catch (error) { if (error?.name === 'AbortError') return; }
  }
  copySiteLink();
}

window.addEventListener('deviceorientation',(event)=>{
  if(state.game?.id!=='who'||!state.active||state.locked||event.beta==null||event.gamma==null)return;const angle=screen.orientation?.angle??window.orientation??0;const value=Math.abs(angle)===90?(angle===90?-event.gamma:event.gamma):event.beta;
  if(state.baseline==null){state.baseline=value;return;}const delta=value-state.baseline;if(delta>30)cardFeedback(true);else if(delta<-30)cardFeedback(false);else state.baseline=state.baseline*.98+value*.02;
},true);

document.addEventListener('click',(event)=>{
  const target=event.target.closest('[data-action],[data-game],[data-duration],[data-rounds],[data-answer],[data-battle-answer]');if(!target)return;
  if(target.dataset.game){if(target.closest('#how-to-dialog'))closeHowToPlay();openSetup(target.dataset.game);return;}
  if(target.dataset.duration){state.duration=Number(target.dataset.duration);renderSetupPanel();return;}
  if(target.dataset.rounds){state.rounds=Number(target.dataset.rounds);renderSetupPanel();return;}
  if(target.dataset.answer!==undefined){answerQuestion(Number(target.dataset.answer));return;}
  if(target.dataset.battleAnswer!==undefined){answerBattle(Number(target.dataset.battleAnswer));return;}
  const action=target.dataset.action;
  if(action==='home'){clearRunning();showScreen('home');}
  else if(action==='how-to-play')openHowToPlay(target.dataset.gameId);
  else if(action==='close-how-to')closeHowToPlay();
  else if(action==='open-share')openShare();
  else if(action==='close-share')closeShare();
  else if(action==='copy-link')copySiteLink();
  else if(action==='share-site')shareSite();
  else if(action==='close-campaign')closeCampaignReminder();
  else if(action==='quit')finish(state.game?.mode || 'quiz');
  else if(action==='start-game')startGame();
  else if(action==='players-down'){state.players=Math.max(3,state.players-1);renderSetupPanel();}
  else if(action==='players-up'){state.players=Math.min(12,state.players+1);renderSetupPanel();}
  else if(action==='card-correct')cardFeedback(true);
  else if(action==='card-pass')cardFeedback(false);
  else if(action==='reveal-emoji'){$('#emoji-answer').textContent=state.deck[state.index][1];beep(700,.06);}
  else if(action==='next-question'){state.index+=1;renderQuestion();}
  else if(action==='more-clue'){if(state.clueCount<5){state.clueCount+=1;renderClue();}}
  else if(action==='got-clue'){state.score+=6-state.clueCount;renderClue(true);beep(850,.1);}
  else if(action==='give-up-clue')renderClue(true);
  else if(action==='next-clue-card'){state.index+=1;state.clueCount=1;renderClue();}
  else if(action==='next-battle'){state.index+=1;state.currentTeam=1-state.currentTeam;renderBattle();}
  else if(action==='swap-grace')swapGraceObject();
  else if(action==='start-grace-pitch')startGracePitch();
  else if(action==='score-grace-yes')scoreGrace(true);
  else if(action==='score-grace-no')scoreGrace(false);
  else if(action==='verse-team-a')awardVerseHunt(0);
  else if(action==='verse-team-b')awardVerseHunt(1);
  else if(action==='verse-team-none')awardVerseHunt(null);
  else if(action==='next-verse-hunt'){state.index+=1;renderVerseHunt();}
  else if(action==='reveal-more-image')advanceImageReveal();
  else if(action==='correct-image')answerImageReveal(true);
  else if(action==='give-up-image')answerImageReveal(false);
  else if(action==='next-image'){state.index+=1;renderImageReveal();}
  else if(action==='show-mime-chain')showMimeChainPrompt();
  else if(action==='hide-mime-chain')hideMimeChainPrompt();
  else if(action==='reveal-mime-chain')revealMimeChainAnswer();
  else if(action==='score-mime-yes')scoreMimeChain(true);
  else if(action==='score-mime-no')scoreMimeChain(false);
  else if(action==='reveal-secret'){state.secretVisible=true;renderSecretPass();}
  else if(action==='hide-secret'){state.secretVisible=false;state.playerIndex+=1;if(state.playerIndex>=state.players)finishSecretDistribution();else renderSecretPass();}
  else if(action==='reveal-infiltrator')revealInfiltrator();
  else if(action==='replay')openSetup(state.game.id);
});

document.addEventListener('keydown',(event)=>{if(state.game?.mode!=='cards'||!state.active)return;if(event.key==='ArrowDown'||event.key===' ')cardFeedback(true);if(event.key==='ArrowUp')cardFeedback(false);});

renderCatalog();

$('#campaign-dialog').addEventListener('cancel', (event) => event.preventDefault());
$('#how-to-dialog').addEventListener('cancel', closeHowToPlay);
