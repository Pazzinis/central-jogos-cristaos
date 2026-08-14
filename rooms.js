import {
  ONLINE_GAMES, ONLINE_GAME_IDS, isCorrectText, makeDeck, poolKeys,
  progressivePoints, resolveOnlineItem, roundLevel, scoreAfter
} from './online-games.js?v=3';

(async () => {
  const params = new URLSearchParams(location.search);
  const onLocalhost = ['localhost', '127.0.0.1'].includes(location.hostname);
  const useLocalService = params.get('salas') === 'local' || (onLocalhost && params.get('salas') !== 'firebase');
  const service = useLocalService
    ? window.JDRRoomServices?.local
    : (await import('./firebase-room-service.js')).firebaseRoomService;
  const nicknameKey = 'jdr-player-name-v1';
  const $room = (selector) => document.querySelector(selector);
  const linkedCode = service.normalizeCode(params.get('sala'));
  if (linkedCode) {
    showScreen('room-entry');
    $room('.room-entry-screen').classList.add('invite-mode');
    $room('#room-code-input').value = linkedCode;
    $room('#room-nickname').value = localStorage.getItem(nicknameKey) || '';
    $room('#room-entry-status').textContent = 'Abrindo o convite…';
  }
  try { await service.ready?.(); }
  catch (error) { console.error('Não foi possível iniciar as salas:', error); return; }

  let room = null;
  let unsubscribe = null;
  let heartbeat = null;
  let gameTicker = null;
  let coordinatorBusy = false;
  let actionBusy = false;
  let lastSessionSynced = '';
  let lastHostClaim = 0;
  let lastViewSignature = '';
  const ROOM_LIFETIME_MS = 6 * 60 * 60 * 1000;

  const entry = $room('#rooms-test-entry');
  entry.hidden = false;
  document.body.classList.add('rooms-test-enabled');
  if (!useLocalService) {
    entry.querySelector('.rooms-test-badge').textContent = 'ONLINE';
    $room('.room-entry-screen .rooms-test-badge').textContent = 'SALA ONLINE';
    $room('.room-entry-copy>p:last-child').textContent = 'Crie uma sala, envie o código e jogue em sincronia mesmo estando longe.';
    $room('.room-lobby-header>.rooms-test-badge').textContent = 'AO VIVO';
    $room('.room-share-card>small').textContent = 'Abra o convite em outro celular para entrar na sala.';
  }

  function me() { return room?.players?.[service.playerId()]; }
  function isHost() { return room?.hostId === service.playerId(); }
  function nickname() { return $room('#room-nickname').value.trim(); }
  function saveNickname() { localStorage.setItem(nicknameKey, nickname()); }
  function online(player, now = Date.now()) { return now - (player.lastSeen || 0) < 20000; }
  function escapeHtml(value) {
    const span = document.createElement('span'); span.textContent = String(value ?? ''); return span.innerHTML;
  }
  function setStatus(message, error = false) {
    const element = $room('#room-entry-status'); element.textContent = message || ''; element.classList.toggle('error', error);
  }
  function toast(message) {
    const element = $room('#room-toast'); element.textContent = message; element.classList.add('visible');
    clearTimeout(element._timer); element._timer = setTimeout(() => element.classList.remove('visible'), 2200);
  }

  function inviteUrl(code = room?.code) {
    const url = new URL(location.href); url.search = ''; url.hash = '';
    if (useLocalService) url.searchParams.set('salas', 'local');
    else if (onLocalhost) url.searchParams.set('salas', 'firebase');
    url.searchParams.set('sala', code); return url.toString();
  }

  function copyText(value, message) {
    navigator.clipboard?.writeText(value).then(() => toast(message)).catch(() => {
      const field = document.createElement('textarea'); field.value = value; document.body.append(field);
      field.select(); document.execCommand('copy'); field.remove(); toast(message);
    });
  }

  function clearConnections() {
    unsubscribe?.(); unsubscribe = null; clearInterval(heartbeat); clearInterval(gameTicker);
    heartbeat = null; gameTicker = null;
  }

  async function connect(code) {
    clearConnections();
    unsubscribe = await service.subscribe(code, (next) => {
      if (!next) return leaveToEntry('A sala não existe mais.');
      if (next.error) return leaveToEntry('Não foi possível acompanhar esta sala.');
      if (next.version !== 2) return leaveToEntry('Esta sala usa uma versão antiga. Crie uma sala nova.');
      if (Date.now() - next.createdAt > ROOM_LIFETIME_MS) return leaveToEntry('Esta sala expirou. Peça ao organizador para criar outra.');
      room = next; render();
    });
    heartbeat = setInterval(() => Promise.resolve(service.touch(code)).catch(() => {}), 10000);
    Promise.resolve(service.touch(code)).catch(() => {});
  }

  function openEntry(inviteCode = '') {
    const invite = Boolean(inviteCode);
    const screen = $room('.room-entry-screen');
    screen.classList.toggle('invite-mode', invite);
    screen.querySelector('h2').innerHTML = invite ? 'Você recebeu<br><em>um convite.</em>' : 'Todo mundo<br><em>na mesma rodada.</em>';
    screen.querySelector('.room-entry-copy>p:last-child').textContent = invite
      ? `Sala ${inviteCode}: escolha seu apelido para entrar.`
      : useLocalService
        ? 'Nesta simulação, a sala funciona entre abas deste navegador.'
        : 'Crie uma sala, envie o código e jogue em sincronia mesmo estando longe.';
    $room('[data-room-action="join"]').textContent = invite ? 'Entrar na sala →' : 'Entrar na sala';
    if (invite) $room('#room-code-input').value = inviteCode;
    setStatus('');
    showScreen('room-entry');
    setTimeout(() => $room('#room-nickname').focus(), 50);
  }
  function leaveToEntry(message = '') {
    clearConnections(); room = null; lastSessionSynced = '';
    const returnUrl = useLocalService ? `${location.pathname}?salas=local` : location.pathname;
    history.replaceState({}, '', returnUrl); showScreen('room-entry'); setStatus(message, Boolean(message));
  }

  function maybeClaimHost() {
    if (!room || isHost() || Date.now() - lastHostClaim < 5000) return;
    const host = room.players?.[room.hostId];
    if (host && online(host)) return;
    const candidates = Object.values(room.players || {}).filter((player) => online(player)).sort((a, b) => a.joinedAt - b.joinedAt);
    if (candidates[0]?.id !== service.playerId()) return;
    lastHostClaim = Date.now(); Promise.resolve(service.claimHost?.(room.code)).catch(() => {});
  }

  function render() {
    if (!room) return;
    maybeClaimHost();
    if (['countdown', 'playing', 'answer', 'results'].includes(room.status)) {
      showScreen('room-game'); syncPlayerSession(); renderGame();
    } else { showScreen('room-lobby'); renderLobby(); }
  }

  function syncPlayerSession() {
    const sessionId = room.game?.sessionId;
    if (!sessionId || lastSessionSynced === sessionId || me()?.sessionId === sessionId) return;
    lastSessionSynced = sessionId;
    Promise.resolve(service.updatePlayer(room.code, (player) => ({
      ...player, sessionId, score: 0, ready: false, answerRound: -1,
      answerStatus: '', answerValue: '', answerAt: 0, answerLevel: -1, roundDelta: 0
    }))).catch(() => { lastSessionSynced = ''; });
  }

  function renderLobby() {
    clearInterval(gameTicker);
    const now = Date.now();
    const players = Object.values(room.players || {}).sort((a, b) => a.joinedAt - b.joinedAt);
    const connected = players.filter((player) => online(player, now));
    const current = me();
    const definition = ONLINE_GAMES[room.selectedGame] || ONLINE_GAMES.truth;
    $room('#room-code').textContent = room.code;
    $room('#room-invite-url').value = inviteUrl();
    $room('#room-qr').src = `https://api.qrserver.com/v1/create-qr-code/?size=320x320&margin=12&data=${encodeURIComponent(inviteUrl())}`;
    $room('#room-player-count').textContent = `${connected.length} ${connected.length === 1 ? 'pessoa' : 'pessoas'}`;
    $room('#room-player-list').innerHTML = players.map((player) => {
      const host = player.id === room.hostId;
      const status = !online(player, now) ? 'Ausente' : player.ready ? 'Pronto' : 'Preparando';
      return `<li><span class="room-presence ${online(player, now) ? 'online' : ''}"></span><b>${escapeHtml(player.name)}</b><small>${host ? 'Organizador · ' : ''}${status}${room.selectedGame === 'battle' ? ` · Equipe ${player.team || 'A'}` : ''}</small></li>`;
    }).join('');

    $room('#room-selected-title').textContent = definition.title;
    $room('#room-selected-icon').textContent = definition.icon;
    $room('#room-selected-description').textContent = definition.description;
    const select = $room('#room-game-select');
    select.innerHTML = ONLINE_GAME_IDS.map((id) => `<option value="${id}" ${room.selectedGame === id ? 'selected' : ''}>${ONLINE_GAMES[id].title}</option>`).join('');
    select.disabled = !isHost();
    $room('#room-rounds').textContent = room.rounds || 5;
    $room('#room-host-settings').classList.toggle('readonly', !isHost());
    $room('#room-host-settings').querySelectorAll('button').forEach((button) => { button.disabled = !isHost(); });

    const readyButton = $room('#room-ready-button');
    readyButton.textContent = current?.ready ? '✓ Estou pronto' : 'Estou pronto';
    readyButton.classList.toggle('ready', Boolean(current?.ready));
    const teamControls = $room('#room-team-controls');
    teamControls.hidden = room.selectedGame !== 'battle';
    teamControls.querySelector('button').textContent = `Equipe ${current?.team || 'A'} · trocar`;

    const everyoneReady = connected.length >= 2 && connected.every((player) => player.ready);
    $room('#room-host-controls').hidden = !isHost();
    $room('#room-guest-note').hidden = isHost();
    $room('#room-guest-note').textContent = `Aguardando ${room.players?.[room.hostId]?.name || 'o organizador'} começar.`;
    const start = $room('#room-start-button'); start.disabled = !everyoneReady;
    $room('#room-start-help').textContent = connected.length < 2 ? 'Convide pelo menos mais uma pessoa.' : everyoneReady ? 'Todo mundo pronto.' : 'Aguardando todos marcarem “Estou pronto”.';
  }

  function currentDefinition() { return ONLINE_GAMES[room.selectedGame]; }
  function currentItem() { return resolveOnlineItem(room.selectedGame, room.game?.deck?.[room.game.roundIndex]); }
  function activePlayers() {
    const startedAt = room.game?.roundStartedAt || 0;
    return Object.values(room.players || {}).filter((player) => online(player) && player.joinedAt <= startedAt + 1000);
  }
  function playerDone(player) {
    if (player.sessionId !== room.game.sessionId) return false;
    if (player.answerRound !== room.game.roundIndex) return false;
    if (currentDefinition().type === 'choice') return ['correct', 'wrong', 'pass'].includes(player.answerStatus);
    return ['correct', 'pass'].includes(player.answerStatus);
  }
  function answerCount() { return activePlayers().filter(playerDone).length; }

  function renderGame() {
    clearInterval(gameTicker);
    const game = room.game; if (!game) return;
    const definition = currentDefinition();
    const player = me();
    $room('#room-game-label').textContent = definition.title.toUpperCase();
    $room('#room-game-round').textContent = `RODADA ${Math.min(game.roundIndex + 1, game.deck.length)} / ${game.deck.length}`;
    $room('#room-game-score').textContent = player?.score || 0;
    $room('#room-score-label').textContent = definition.teams ? `EQUIPE ${player?.team || 'A'}` : 'MEUS PONTOS';
    updateGameView();
    gameTicker = setInterval(() => { updateGameView(); coordinateGame(); }, 250);
  }

  function updateGameView() {
    if (!room?.game) return;
    const now = Date.now();
    const player = me() || {};
    const level = roundLevel(room.selectedGame, room.game.roundStartedAt, now);
    const scores = Object.values(room.players || {}).map((item) => `${item.id}:${item.score || 0}:${item.answerRound}:${item.answerStatus}:${item.answerLevel}`).join('|');
    let signature = `${room.status}:${room.game.sessionId}:${room.game.roundIndex}:${level}:${player.answerRound}:${player.answerStatus}:${player.answerLevel}:${scores}`;
    if (room.status === 'countdown') signature += `:${Math.max(0, Math.ceil((room.game.roundStartedAt - now) / 1000))}`;
    if (room.status === 'playing') $room('#room-game-timer').textContent = `${Math.max(0, Math.ceil((room.game.roundEndsAt - now) / 1000))}s`;
    if (room.status === 'answer') $room('#room-game-timer').textContent = `${Math.max(0, Math.ceil((room.game.answerEndsAt - now) / 1000))}s`;
    if (signature === lastViewSignature) return;
    lastViewSignature = signature;
    if (room.status === 'countdown') renderCountdown(now);
    else if (room.status === 'playing') renderPlaying(now);
    else if (room.status === 'answer') renderRoundAnswer(now);
    else if (room.status === 'results') renderResults();
  }

  function renderCountdown(now) {
    const seconds = Math.max(0, Math.ceil((room.game.roundStartedAt - now) / 1000));
    $room('#room-game-timer').textContent = `${seconds}s`;
    $room('#room-game-stage').innerHTML = `<div class="room-countdown"><small>${room.game.roundIndex === 0 ? 'A PARTIDA VAI COMEÇAR' : 'PRÓXIMA RODADA'}</small><strong>${Math.max(1, seconds)}</strong><p>Prepare sua resposta. Ela será secreta.</p><span>♡ Ajude a Raquel: doe ou compartilhe a campanha.</span></div>`;
    $room('#room-game-actions').innerHTML = '<p class="room-watching">Todos começam ao mesmo tempo.</p>';
  }

  function renderPlaying(now) {
    const game = room.game; const definition = currentDefinition(); const item = currentItem();
    if (!item) return;
    const seconds = Math.max(0, Math.ceil((game.roundEndsAt - now) / 1000));
    const level = roundLevel(room.selectedGame, game.roundStartedAt, now);
    $room('#room-game-timer').textContent = `${seconds}s`;
    if (definition.type === 'choice') renderChoice(item);
    else renderTextGame(item, level);
  }

  function renderChoice(item) {
    const player = me(); const answered = playerDone(player || {});
    const status = answered ? `<div class="room-answer-status ${player.answerStatus}">${player.answerStatus === 'correct' ? 'Resposta enviada · você acertou!' : 'Resposta enviada · aguarde o resultado.'}</div>` : '';
    const teams = room.selectedGame === 'battle' ? renderTeamStrip() : '';
    $room('#room-game-stage').innerHTML = `<div class="room-online-question">${teams}<small>RESPONDA EM SEGREDO</small><h2>${escapeHtml(item.q)}</h2><div class="room-online-options">${item.options.map((option, index) => `<button data-room-choice="${index}" ${answered ? 'disabled' : ''}>${escapeHtml(option)}</button>`).join('')}</div>${status}<p>${answerCount()} de ${activePlayers().length} responderam</p></div>`;
    $room('#room-game-actions').innerHTML = answered ? '<p class="room-watching">Sua resposta está bloqueada.</p>' : '<p class="room-watching">Escolha uma alternativa antes do tempo acabar.</p>';
  }

  function renderTeamStrip() {
    const players = Object.values(room.players || {});
    const scores = ['A', 'B'].map((team) => players.filter((player) => (player.team || 'A') === team).reduce((total, player) => total + (player.score || 0), 0));
    return `<div class="room-team-strip"><b>Equipe A <span>${scores[0]}</span></b><b>Equipe B <span>${scores[1]}</span></b></div>`;
  }

  function renderTextGame(item, level) {
    const previousInput = $room('#room-answer-input');
    const draft = previousInput?.value || '';
    const restoreFocus = document.activeElement === previousInput;
    const player = me() || {};
    const done = playerDone(player);
    const triedThisLevel = player.sessionId === room.game.sessionId && player.answerRound === room.game.roundIndex && player.answerLevel >= level && player.answerStatus === 'wrong';
    let challenge = '';
    if (room.selectedGame === 'clues') challenge = `<div class="room-clues"><small>VALENDO ${5 - level} PONTOS</small><h2>Quem é o personagem?</h2>${item.clues.slice(0, level + 1).map((clue, index) => `<p><b>${index + 1}</b>${escapeHtml(clue)}</p>`).join('')}</div>`;
    if (room.selectedGame === 'emoji') challenge = `<div class="room-emoji-challenge"><small>QUAL É A HISTÓRIA?</small><h2>${escapeHtml(item.prompt)}</h2></div>`;
    if (room.selectedGame === 'reveal') challenge = `<div class="room-reveal-image reveal-level-${level}" style="${spriteStyle(item)}" role="img" aria-label="Imagem bíblica sendo revelada"></div><small class="room-progressive-value">VALE ${5 - level} ${5 - level === 1 ? 'PONTO' : 'PONTOS'}</small>`;
    const feedback = done ? `<div class="room-answer-status ${player.answerStatus}">${player.answerStatus === 'correct' ? `Você acertou e ganhou ${player.roundDelta} ${player.roundDelta === 1 ? 'ponto' : 'pontos'}!` : 'Você desistiu desta rodada.'}</div>` : player.answerStatus === 'wrong' && player.answerRound === room.game.roundIndex ? '<div class="room-answer-status wrong">Resposta incorreta. Tente novamente na próxima etapa.</div>' : '';
    $room('#room-game-stage').innerHTML = `<div class="room-text-round">${challenge}${feedback}</div>`;
    if (done) $room('#room-game-actions').innerHTML = '<p class="room-watching">Aguardando os outros jogadores.</p>';
    else if (triedThisLevel) $room('#room-game-actions').innerHTML = '<p class="room-watching">Aguarde a próxima revelação para tentar novamente.</p>';
    else {
      $room('#room-game-actions').innerHTML = `<form class="room-answer-form" id="room-answer-form"><input id="room-answer-input" maxlength="60" autocomplete="off" placeholder="Digite sua resposta" aria-label="Sua resposta"><button class="room-answer yes" type="submit">Responder</button><button class="room-answer pass" type="button" data-room-action="give-up">Desistir</button></form>`;
      const nextInput = $room('#room-answer-input');
      nextInput.value = draft;
      if (restoreFocus) { nextInput.focus(); nextInput.setSelectionRange(draft.length, draft.length); }
    }
  }

  function spriteStyle(item) { return `background-image:url('bible-scenes-grid.jpg');background-position:${item.x}% ${item.y}%;`; }
  function correctAnswer(item) {
    const definition = currentDefinition();
    if (definition.type === 'choice') return item.options[item.answer];
    return item.answer;
  }

  function renderRoundAnswer(now) {
    const item = currentItem(); if (!item) return;
    $room('#room-game-timer').textContent = '—';
    const explanation = item.explanation || item.ref || '';
    const fullImage = room.selectedGame === 'reveal' ? `<div class="room-reveal-image reveal-level-4" style="${spriteStyle(item)}"></div>` : '';
    $room('#room-game-stage').innerHTML = `<div class="room-round-result">${fullImage}<small>A RESPOSTA ERA</small><h2>${escapeHtml(correctAnswer(item))}</h2>${explanation ? `<p>${escapeHtml(explanation)}</p>` : ''}${renderLeaderboard(false)}</div>`;
    $room('#room-game-actions').innerHTML = '<p class="room-watching">A próxima rodada começará automaticamente.</p>';
  }

  function renderLeaderboard(final = false) {
    const players = Object.values(room.players || {}).sort((a, b) => (b.score || 0) - (a.score || 0) || a.joinedAt - b.joinedAt);
    return `<div class="room-ranking ${final ? 'final' : ''}">${players.map((player, index) => `<div class="${player.id === service.playerId() ? 'me' : ''}"><b>${index + 1}</b><span>${escapeHtml(player.name)}${room.selectedGame === 'battle' ? ` · Equipe ${player.team || 'A'}` : ''}</span><strong>${player.score || 0}</strong></div>`).join('')}</div>`;
  }

  function renderResults() {
    $room('#room-game-timer').textContent = 'FIM';
    let teamResult = '';
    if (room.selectedGame === 'battle') {
      const players = Object.values(room.players || {});
      const a = players.filter((player) => (player.team || 'A') === 'A').reduce((sum, player) => sum + (player.score || 0), 0);
      const b = players.filter((player) => player.team === 'B').reduce((sum, player) => sum + (player.score || 0), 0);
      teamResult = `<div class="room-team-result"><span>Equipe A <b>${a}</b></span><strong>${a === b ? 'Empate!' : `Equipe ${a > b ? 'A' : 'B'} venceu!`}</strong><span>Equipe B <b>${b}</b></span></div>`;
    }
    $room('#room-game-stage').innerHTML = `<div class="room-game-result"><small>FIM DE JOGO</small><h2>Placar</h2>${teamResult}${renderLeaderboard(true)}</div>`;
    $room('#room-game-actions').innerHTML = isHost() ? '<button class="room-answer yes" data-room-action="back-lobby">Voltar à sala</button>' : '<p class="room-watching">O organizador pode iniciar outra partida.</p>';
  }

  async function coordinateGame() {
    if (!room || !isHost() || coordinatorBusy || !room.game) return;
    const now = Date.now(); let action = '';
    if (room.status === 'countdown' && now >= room.game.roundStartedAt) action = 'play';
    else if (room.status === 'playing' && (now >= room.game.roundEndsAt || (activePlayers().length > 0 && activePlayers().every(playerDone)))) action = 'answer';
    else if (room.status === 'answer' && now >= room.game.answerEndsAt) action = 'next';
    if (!action) return;
    coordinatorBusy = true;
    try {
      await hostUpdate((next) => {
        if (action === 'play' && next.status === 'countdown') next.status = 'playing';
        if (action === 'answer' && next.status === 'playing') { next.status = 'answer'; next.game.answerEndsAt = Date.now() + 3000; }
        if (action === 'next' && next.status === 'answer') {
          if (next.game.roundIndex >= next.game.deck.length - 1) next.status = 'results';
          else {
            next.game.roundIndex += 1; next.game.roundStartedAt = Date.now();
            next.game.roundEndsAt = next.game.roundStartedAt + ONLINE_GAMES[next.selectedGame].duration * 1000;
            next.status = 'playing';
          }
        }
        return next;
      });
    } finally { coordinatorBusy = false; }
  }

  async function hostUpdate(updater) {
    if (!room || !isHost()) return;
    return service.updateRoom(room.code, (next) => next.hostId === service.playerId() ? (updater(next) || next) : next);
  }

  async function startOnlineGame() {
    if (!isHost()) return;
    const players = Object.values(room.players || {}).filter((player) => online(player));
    if (players.length < 2 || !players.every((player) => player.ready)) return toast('Todos precisam estar prontos.');
    const deck = makeDeck(room.selectedGame, room.rounds || 5);
    const sessionId = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    await hostUpdate((next) => {
      const roundStartedAt = Date.now() + 5000;
      next.status = 'countdown';
      next.game = {sessionId, deck, roundIndex: 0, roundStartedAt, roundEndsAt: roundStartedAt + ONLINE_GAMES[next.selectedGame].duration * 1000, answerEndsAt: 0};
      return next;
    });
  }

  async function submitChoice(index) {
    if (actionBusy || room.status !== 'playing') return;
    const item = currentItem(); const round = room.game.roundIndex; actionBusy = true;
    try {
      await service.updatePlayer(room.code, (player) => {
        if (player.sessionId === room.game.sessionId && player.answerRound === round && ['correct', 'wrong', 'pass'].includes(player.answerStatus)) return player;
        const correct = Number(index) === item.answer;
        const delta = correct ? 1 : -1;
        const baseScore = player.sessionId === room.game.sessionId ? (player.score || 0) : 0;
        return {...player, sessionId: room.game.sessionId, score: scoreAfter(baseScore, delta), answerRound: round, answerStatus: correct ? 'correct' : 'wrong', answerValue: String(index), answerAt: Date.now(), answerLevel: 0, roundDelta: delta};
      });
    } finally { actionBusy = false; }
  }

  async function submitText(value) {
    if (actionBusy || room.status !== 'playing') return;
    const guess = String(value || '').trim(); if (guess.length < 2) return toast('Digite uma resposta.');
    const item = currentItem(); const round = room.game.roundIndex;
    const level = roundLevel(room.selectedGame, room.game.roundStartedAt); actionBusy = true;
    try {
      await service.updatePlayer(room.code, (player) => {
        if (player.sessionId === room.game.sessionId && player.answerRound === round && ['correct', 'pass'].includes(player.answerStatus)) return player;
        if (player.sessionId === room.game.sessionId && player.answerRound === round && player.answerStatus === 'wrong' && player.answerLevel >= level) return player;
        const correct = isCorrectText(item.answer, guess);
        const delta = correct ? progressivePoints(room.selectedGame, level) : -1;
        const baseScore = player.sessionId === room.game.sessionId ? (player.score || 0) : 0;
        return {...player, sessionId: room.game.sessionId, score: scoreAfter(baseScore, delta), answerRound: round, answerStatus: correct ? 'correct' : 'wrong', answerValue: guess, answerAt: Date.now(), answerLevel: level, roundDelta: delta};
      });
    } finally { actionBusy = false; }
  }

  async function giveUp() {
    if (actionBusy || room.status !== 'playing') return;
    const round = room.game.roundIndex; actionBusy = true;
    try { await service.updatePlayer(room.code, (player) => ({...player, sessionId: room.game.sessionId, score: player.sessionId === room.game.sessionId ? (player.score || 0) : 0, answerRound: round, answerStatus: 'pass', answerValue: '', answerAt: Date.now(), answerLevel: roundLevel(room.selectedGame, room.game.roundStartedAt), roundDelta: 0})); }
    finally { actionBusy = false; }
  }

  document.addEventListener('submit', (event) => {
    if (event.target.id !== 'room-answer-form') return;
    event.preventDefault(); submitText($room('#room-answer-input')?.value);
  });

  document.addEventListener('change', async (event) => {
    if (event.target.id !== 'room-game-select' || !isHost()) return;
    const gameId = ONLINE_GAME_IDS.includes(event.target.value) ? event.target.value : 'truth';
    await hostUpdate((next) => { next.selectedGame = gameId; next.rounds = Math.min(next.rounds || 5, Math.min(20, poolKeys(gameId).length)); return next; });
  });

  document.addEventListener('click', async (event) => {
    const choice = event.target.closest('[data-room-choice]')?.dataset.roomChoice;
    if (choice !== undefined) return submitChoice(Number(choice));
    const action = event.target.closest('[data-room-action]')?.dataset.roomAction;
    if (!action) return;
    if (action === 'open-entry') openEntry();
    if (action === 'home') { clearConnections(); history.replaceState({}, '', location.pathname); showScreen('home'); }
    if (action === 'create') {
      try { saveNickname(); room = await service.createRoom(nickname()); history.replaceState({}, '', inviteUrl(room.code)); await connect(room.code); }
      catch (error) { setStatus(error.message, true); }
    }
    if (action === 'join') {
      try { saveNickname(); const code = service.normalizeCode($room('#room-code-input').value); room = await service.joinRoom(code, nickname()); history.replaceState({}, '', inviteUrl(room.code)); await connect(room.code); }
      catch (error) { setStatus(error.message, true); }
    }
    if (action === 'copy-code') copyText(room.code, 'Código copiado!');
    if (action === 'copy-invite') copyText(inviteUrl(), 'Link copiado!');
    if (action === 'share-invite') {
      const share = {title: 'Jogos da Raquel', text: `Entre na minha sala: ${room.code}`, url: inviteUrl()};
      if (navigator.share) navigator.share(share).catch(() => {}); else copyText(inviteUrl(), 'Link copiado!');
    }
    if (action === 'toggle-ready') await service.updatePlayer(room.code, (player) => ({...player, ready: !player.ready}));
    if (action === 'toggle-team') await service.updatePlayer(room.code, (player) => ({...player, team: player.team === 'B' ? 'A' : 'B'}));
    if (action === 'rounds-down' && isHost()) await hostUpdate((next) => { next.rounds = Math.max(1, (next.rounds || 5) - 1); return next; });
    if (action === 'rounds-up' && isHost()) await hostUpdate((next) => { next.rounds = Math.min(20, poolKeys(next.selectedGame).length, (next.rounds || 5) + 1); return next; });
    if (action === 'start') await startOnlineGame();
    if (action === 'give-up') await giveUp();
    if (action === 'back-lobby') await hostUpdate((next) => { next.status = 'lobby'; next.game = null; return next; });
  });

  $room('#room-code-input').addEventListener('input', (event) => { event.target.value = service.normalizeCode(event.target.value); });
  $room('#room-nickname').value = localStorage.getItem(nicknameKey) || '';
  if (linkedCode) {
    $room('#room-code-input').value = linkedCode;
    const linkedRoom = await service.getRoom(linkedCode);
    const savedPlayer = linkedRoom?.players?.[service.playerId()];
    if (savedPlayer && linkedRoom.status !== 'closed') { room = await service.joinRoom(linkedCode, savedPlayer.name); await connect(linkedCode); }
    else {
      const savedName = localStorage.getItem(nicknameKey) || '';
      if (savedName) {
        try { room = await service.joinRoom(linkedCode, savedName); await connect(linkedCode); }
        catch (error) { openEntry(linkedCode); setStatus(error.message, true); }
      } else openEntry(linkedCode);
    }
  }
})();
