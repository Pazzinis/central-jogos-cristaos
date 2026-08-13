(() => {
  const params = new URLSearchParams(location.search);
  const enabled = ['localhost', '127.0.0.1'].includes(location.hostname) || params.get('salas') === 'teste';
  if (!enabled) return;

  const service = window.JDRRoomServices?.local;
  const nicknameKey = 'jdr-player-name-v1';
  const $room = (selector) => document.querySelector(selector);
  let room = null;
  let unsubscribe = null;
  let heartbeat = null;
  let gameTicker = null;
  let lastGameSignature = '';

  const entry = $room('#rooms-test-entry');
  entry.hidden = false;
  document.body.classList.add('rooms-test-enabled');

  function setStatus(message, error = false) {
    const element = $room('#room-entry-status');
    element.textContent = message || '';
    element.classList.toggle('error', error);
  }

  function nickname() { return $room('#room-nickname').value.trim(); }
  function saveNickname() { localStorage.setItem(nicknameKey, nickname()); }
  function isHost() { return room?.hostId === service.playerId(); }
  function escapeHtml(value) {
    const span = document.createElement('span');
    span.textContent = String(value || '');
    return span.innerHTML;
  }

  function inviteUrl(code = room?.code) {
    const url = new URL(location.href);
    url.search = '';
    url.hash = '';
    url.searchParams.set('salas', 'teste');
    url.searchParams.set('sala', code);
    return url.toString();
  }

  function copyText(text, success) {
    navigator.clipboard?.writeText(text).then(() => toast(success)).catch(() => {
      const field = document.createElement('textarea');
      field.value = text; document.body.append(field); field.select(); document.execCommand('copy'); field.remove(); toast(success);
    });
  }

  function toast(message) {
    const element = $room('#room-toast');
    element.textContent = message;
    element.classList.add('visible');
    clearTimeout(element._timer);
    element._timer = setTimeout(() => element.classList.remove('visible'), 2200);
  }

  function connect(code) {
    unsubscribe?.(); clearInterval(heartbeat);
    unsubscribe = service.subscribe(code, (next) => {
      if (!next) return leaveToEntry('A sala não existe mais.');
      room = next;
      render();
    });
    heartbeat = setInterval(() => service.touch(code), 5000);
    service.touch(code);
  }

  function openEntry() {
    showScreen('room-entry');
    $room('#room-nickname').focus();
  }

  function leaveToEntry(message = '') {
    unsubscribe?.(); unsubscribe = null; clearInterval(heartbeat); clearInterval(gameTicker);
    room = null; lastGameSignature = '';
    history.replaceState({}, '', `${location.pathname}?salas=teste`);
    showScreen('room-entry'); setStatus(message, Boolean(message));
  }

  function render() {
    if (!room) return;
    if (room.status === 'playing' || room.status === 'answer' || room.status === 'results') {
      showScreen('room-game'); renderGame();
    } else {
      showScreen('room-lobby'); renderLobby();
    }
  }

  function renderLobby() {
    clearInterval(gameTicker);
    $room('#room-code').textContent = room.code;
    $room('#room-invite-url').value = inviteUrl();
    $room('#room-qr').src = `https://api.qrserver.com/v1/create-qr-code/?size=320x320&margin=12&data=${encodeURIComponent(inviteUrl())}`;
    const now = Date.now();
    const players = Object.values(room.players || {}).sort((a, b) => a.joinedAt - b.joinedAt);
    $room('#room-player-count').textContent = `${players.length} ${players.length === 1 ? 'pessoa' : 'pessoas'}`;
    $room('#room-player-list').innerHTML = players.map((player) => {
      const online = now - player.lastSeen < 15000;
      const host = player.id === room.hostId;
      return `<li><span class="room-presence ${online ? 'online' : ''}"></span><b>${escapeHtml(player.name)}</b>${host ? '<small>Organizador</small>' : ''}${online ? '' : '<small>Ausente</small>'}</li>`;
    }).join('');
    $room('#room-host-controls').hidden = !isHost();
    $room('#room-guest-note').hidden = isHost();
  }

  function scene() { return DATA.revealImages[room.game?.sceneIndexes?.[room.game.roundIndex]]; }
  function spriteStyle(item) {
    return `background-image:url('bible-scenes-grid.jpg');background-position:${item.x}% ${item.y}%;`;
  }

  function renderGame() {
    clearInterval(gameTicker);
    const game = room.game;
    const item = scene();
    if (!game || !item) return;
    $room('#room-game-round').textContent = `RODADA ${game.roundIndex + 1} / ${game.sceneIndexes.length}`;
    $room('#room-game-score').textContent = game.score;
    const signature = `${room.status}-${game.roundIndex}-${game.startedAt}-${game.score}`;
    if (signature !== lastGameSignature) {
      lastGameSignature = signature;
      if (room.status === 'playing') renderPlaying(item);
      else if (room.status === 'answer') renderAnswer(item);
      else renderResults();
    }
    if (room.status === 'playing') {
      updateReveal(item);
      gameTicker = setInterval(() => updateReveal(item), 250);
    }
  }

  function updateReveal(item) {
    if (!room || room.status !== 'playing') return clearInterval(gameTicker);
    const elapsed = Math.max(0, Date.now() - room.game.startedAt);
    const level = Math.min(4, Math.floor(elapsed / 5000));
    const seconds = Math.max(0, 20 - Math.floor(elapsed / 1000));
    const image = $room('#room-reveal-image');
    image.className = `room-reveal-image reveal-level-${level}`;
    image.setAttribute('style', spriteStyle(item));
    $room('#room-game-timer').textContent = `${seconds}s`;
    $room('#room-reveal-clue').textContent = level < 4 ? `A imagem está ficando mais clara…` : 'Imagem totalmente revelada';
  }

  function renderPlaying(item) {
    $room('#room-game-stage').innerHTML = `<div id="room-reveal-image" class="room-reveal-image reveal-level-0" style="${spriteStyle(item)}" role="img" aria-label="Imagem bíblica sendo revelada"></div><p id="room-reveal-clue">A imagem está ficando mais clara…</p>`;
    $room('#room-game-actions').innerHTML = isHost()
      ? '<button class="room-answer yes" data-room-action="correct">Acertaram</button><button class="room-answer pass" data-room-action="pass">Não sei</button>'
      : '<p class="room-watching">O organizador controla esta rodada.</p>';
  }

  function renderAnswer(item) {
    $room('#room-game-timer').textContent = 'RESPOSTA';
    $room('#room-game-stage').innerHTML = `<div class="room-reveal-image reveal-level-4" style="${spriteStyle(item)}" role="img" aria-label="${escapeHtml(item.answer)}"></div><div class="room-reveal-answer"><small>A RESPOSTA ERA</small><h2>${escapeHtml(item.answer)}</h2><p>${escapeHtml(item.ref)}</p></div>`;
    const last = room.game.roundIndex >= room.game.sceneIndexes.length - 1;
    $room('#room-game-actions').innerHTML = isHost()
      ? `<button class="room-answer yes" data-room-action="next">${last ? 'Ver resultado' : 'Próxima imagem'}</button>`
      : '<p class="room-watching">Aguardando o organizador continuar.</p>';
  }

  function renderResults() {
    $room('#room-game-timer').textContent = 'FIM';
    $room('#room-game-stage').innerHTML = `<div class="room-game-result"><small>FIM DE JOGO</small><h2>${room.game.score}</h2><p>pontos conquistados pela sala</p></div>`;
    $room('#room-game-actions').innerHTML = isHost()
      ? '<button class="room-answer yes" data-room-action="back-lobby">Voltar à sala</button>'
      : '<p class="room-watching">O organizador pode iniciar outra partida.</p>';
  }

  function shuffledSceneIndexes() {
    const indexes = DATA.revealImages.map((_, index) => index);
    for (let index = indexes.length - 1; index > 0; index -= 1) {
      const random = Math.floor(Math.random() * (index + 1));
      [indexes[index], indexes[random]] = [indexes[random], indexes[index]];
    }
    return indexes.slice(0, 5);
  }

  function hostUpdate(updater) {
    if (!room || !isHost()) return;
    service.updateRoom(room.code, (next) => {
      if (next.hostId !== service.playerId()) return next;
      return updater(next) || next;
    });
  }

  function startGame() {
    hostUpdate((next) => {
      next.status = 'playing';
      next.game = {sceneIndexes: shuffledSceneIndexes(), roundIndex: 0, score: 0, startedAt: Date.now()};
      return next;
    });
  }

  function answer(correct) {
    hostUpdate((next) => {
      const level = Math.min(4, Math.floor((Date.now() - next.game.startedAt) / 5000));
      next.status = 'answer';
      if (correct) next.game.score += [100, 80, 60, 40, 20][level];
      return next;
    });
  }

  function nextRound() {
    hostUpdate((next) => {
      if (next.game.roundIndex >= next.game.sceneIndexes.length - 1) next.status = 'results';
      else { next.game.roundIndex += 1; next.game.startedAt = Date.now(); next.status = 'playing'; }
      return next;
    });
  }

  document.addEventListener('click', async (event) => {
    const action = event.target.closest('[data-room-action]')?.dataset.roomAction;
    if (!action) return;
    if (action === 'open-entry') openEntry();
    if (action === 'home') { unsubscribe?.(); clearInterval(heartbeat); clearInterval(gameTicker); showScreen('home'); }
    if (action === 'create') {
      try { saveNickname(); room = service.createRoom(nickname()); history.replaceState({}, '', inviteUrl(room.code)); connect(room.code); }
      catch (error) { setStatus(error.message, true); }
    }
    if (action === 'join') {
      try {
        saveNickname(); const code = service.normalizeCode($room('#room-code-input').value);
        room = service.joinRoom(code, nickname()); history.replaceState({}, '', inviteUrl(room.code)); connect(room.code);
      } catch (error) { setStatus(error.message, true); }
    }
    if (action === 'copy-code') copyText(room.code, 'Código copiado!');
    if (action === 'copy-invite') copyText(inviteUrl(), 'Link copiado!');
    if (action === 'share-invite') {
      const share = {title: 'Jogos da Raquel', text: `Entre na minha sala: ${room.code}`, url: inviteUrl()};
      if (navigator.share) navigator.share(share).catch(() => {}); else copyText(inviteUrl(), 'Link copiado!');
    }
    if (action === 'start') startGame();
    if (action === 'correct') answer(true);
    if (action === 'pass') answer(false);
    if (action === 'next') nextRound();
    if (action === 'back-lobby') hostUpdate((next) => { next.status = 'lobby'; next.game = null; return next; });
  });

  $room('#room-code-input').addEventListener('input', (event) => { event.target.value = service.normalizeCode(event.target.value); });
  $room('#room-nickname').value = localStorage.getItem(nicknameKey) || '';
  const linkedCode = service.normalizeCode(params.get('sala'));
  if (linkedCode) {
    $room('#room-code-input').value = linkedCode;
    const linkedRoom = service.getRoom(linkedCode);
    const savedPlayer = linkedRoom?.players?.[service.playerId()];
    if (savedPlayer && linkedRoom.status !== 'closed') {
      room = service.joinRoom(linkedCode, savedPlayer.name);
      connect(linkedCode);
    } else openEntry();
  }
})();
