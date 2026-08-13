const DATA = window.MONTE_DATA;
const $ = (selector) => document.querySelector(selector);
const screens = [...document.querySelectorAll('.screen')];
const state = {
  game: null, duration: 180, rounds: 10, players: 5, teamA: 'Equipe Luz', teamB: 'Equipe Fé',
  deck: [], index: 0, score: 0, seconds: 0, active: false, locked: false, baseline: null,
  timer: null, countdown: null, jobs: [], answered: false, clueCount: 1, historyKey: '',
  teams: [0, 0], currentTeam: 0, playerIndex: 0, infiltratorIndex: 0, secretPair: null, secretVisible: false
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
const SITE_URL = 'https://pazzinis.github.io/central-jogos-cristaos/';

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
  return '<p class="fresh-note"><b>Novidade:</b> o Monte prioriza conteúdos que ainda não apareceram neste aparelho.</p>';
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
        <button class="catalog-card ${game.id === 'who' ? 'featured' : ''}" data-game="${game.id}" data-accent="${game.accent}" aria-label="Jogar ${game.title}">
          <span class="catalog-icon" aria-hidden="true">${game.icon}</span>
          <span class="card-copy"><h3>${game.title}</h3><p>${game.description}</p></span>
          <span class="card-arrow">→</span>
        </button>`).join('')}</div>
    </section>`;
  }).join('');
}

function openSetup(gameId) {
  clearRunning();
  state.game = DATA.games.find((game) => game.id === gameId);
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
  } else if (state.game.mode === 'battle') {
    panel.innerHTML = `<h3>Prepare as equipes</h3><p>Serão 10 perguntas, alternando automaticamente.</p>
      <div class="field"><label for="team-a">Equipe A</label><input id="team-a" maxlength="20" value="${state.teamA}"></div>
      <div class="field"><label for="team-b">Equipe B</label><input id="team-b" maxlength="20" value="${state.teamB}"></div>
      ${freshNote()}<button class="primary-button" data-action="start-game">Iniciar batalha <span>⚡</span></button>`;
  } else {
    panel.innerHTML = `<h3>Quantos jogadores?</h3><p>O celular será passado de mão em mão.</p>
      <div class="stepper"><button data-action="players-down" aria-label="Diminuir jogadores">−</button><strong><span id="players-count">${state.players}</span> jogadores</strong><button data-action="players-up" aria-label="Aumentar jogadores">+</button></div>
      ${freshNote()}<button class="primary-button" data-action="start-game">Distribuir palavras <span>◉</span></button>`;
  }
}

function startGame() {
  if (state.game.mode === 'battle') {
    state.teamA = $('#team-a').value.trim() || 'Equipe Luz'; state.teamB = $('#team-b').value.trim() || 'Equipe Fé';
  }
  prepareDevice();
  if (state.game.mode === 'infiltrator') { startInfiltrator(); return; }
  startCountdown(5, () => {
    if (state.game.mode === 'cards') startCards();
    else if (state.game.mode === 'quiz') startQuiz();
    else if (state.game.mode === 'clues') startClues();
    else startBattle();
  });
}

function startCountdown(from, done) {
  showScreen('countdown'); $('#countdown-label').textContent = 'PREPARE-SE'; $('#countdown-number').textContent = from; beep(560);
  let value = from;
  state.countdown = setInterval(() => {
    value -= 1;
    if (value > 0) { $('#countdown-number').textContent = value; beep(580 + value * 25); }
    else { clearInterval(state.countdown); beep(880,.16); done(); }
  }, 1000);
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
  state.historyKey = `cards:${state.game.id}`; state.deck = freshDeck(cardSource(), state.historyKey); state.index = 0; state.score = 0; state.seconds = state.duration; state.active = true; state.locked = true;
  configurePlay(); $('#score-label').textContent = 'ACERTOS'; $('#timer').textContent = formatTime(state.seconds);
  state.timer = setInterval(() => {
    state.seconds -= 1; $('#timer').textContent = formatTime(Math.max(0,state.seconds));
    if (state.seconds <= 10 && state.seconds > 0) beep(480,.04);
    if (state.seconds <= 0) finish('cards');
  }, 1000);
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
  const overlay=$('#transition-overlay'); const value=$('#transition-value'); overlay.className='transition-overlay show'; $('#transition-label').textContent='PRÓXIMO EM'; let count=5; value.textContent=count;
  const tick=()=>{count-=1;if(count>0){value.textContent=count;beep(540+count*30,.05);state.jobs.push(setTimeout(tick,1000));}else{overlay.className='transition-overlay';state.index+=1;runRoulette();}};
  beep(540,.05); state.jobs.push(setTimeout(tick,1000));
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
}

function finish(type) {
  const wasActive=state.active;if(!wasActive)return;clearRunning();let final=state.score;let label='PONTOS';let message='Que partida boa!';
  if(type==='infiltrator'){showScreen('home');try{if(document.fullscreenElement)document.exitFullscreen();}catch(_){}return;}
  if(type==='battle'){const names=[state.teamA,state.teamB];final=`${state.teams[0]} × ${state.teams[1]}`;label=`${names[0]} · ${names[1]}`;message=state.teams[0]===state.teams[1]?'Empate! As duas equipes mandaram muito bem.':`${names[state.teams[0]>state.teams[1]?0:1]} venceu a batalha!`;}
  else if(type==='cards'){label='ACERTOS';message=state.score>=10?'Vocês estão afiados! Que rodada incrível.':state.score>=5?'Mandaram muito bem nessa rodada!':'Boa tentativa! A próxima vai ser ainda melhor.';}
  else message=`Você acertou ${state.score} de ${state.deck.length}.`;
  $('#final-score').textContent=final;$('#final-label').textContent=label;$('#result-message').textContent=message;showScreen('result');try{if(document.fullscreenElement)document.exitFullscreen();}catch(_){}
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
    try { await navigator.share({title:'Monte — Jogos Cristãos',text:'Uma central de jogos cristãos para jogar com a galera.',url:SITE_URL}); return; }
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
  if(target.dataset.game){openSetup(target.dataset.game);return;}
  if(target.dataset.duration){state.duration=Number(target.dataset.duration);renderSetupPanel();return;}
  if(target.dataset.rounds){state.rounds=Number(target.dataset.rounds);renderSetupPanel();return;}
  if(target.dataset.answer!==undefined){answerQuestion(Number(target.dataset.answer));return;}
  if(target.dataset.battleAnswer!==undefined){answerBattle(Number(target.dataset.battleAnswer));return;}
  const action=target.dataset.action;
  if(action==='home'){clearRunning();showScreen('home');}
  else if(action==='open-share')openShare();
  else if(action==='close-share')closeShare();
  else if(action==='copy-link')copySiteLink();
  else if(action==='share-site')shareSite();
  else if(action==='quit')finish(state.game?.mode==='battle'?'battle':state.game?.mode==='cards'?'cards':state.game?.mode==='infiltrator'?'infiltrator':'quiz');
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
  else if(action==='reveal-secret'){state.secretVisible=true;renderSecretPass();}
  else if(action==='hide-secret'){state.secretVisible=false;state.playerIndex+=1;if(state.playerIndex>=state.players)finishSecretDistribution();else renderSecretPass();}
  else if(action==='reveal-infiltrator')revealInfiltrator();
  else if(action==='replay')openSetup(state.game.id);
});

document.addEventListener('keydown',(event)=>{if(state.game?.mode!=='cards'||!state.active)return;if(event.key==='ArrowDown'||event.key===' ')cardFeedback(true);if(event.key==='ArrowUp')cardFeedback(false);});

renderCatalog();
