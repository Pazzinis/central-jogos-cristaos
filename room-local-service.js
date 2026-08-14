(() => {
  const PREFIX = 'jdr-room-v2-';
  const CHANNEL = 'jdr-rooms-v2';
  const PLAYER_KEY = 'jdr-room-player-id-v1';
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  const ROOM_LIFETIME_MS = 6 * 60 * 60 * 1000;
  const listeners = new Map();
  const channel = 'BroadcastChannel' in window ? new BroadcastChannel(CHANNEL) : null;

  function playerId() {
    let id = sessionStorage.getItem(PLAYER_KEY);
    if (!id) {
      id = crypto.randomUUID?.() || `p-${Date.now()}-${Math.random().toString(36).slice(2)}`;
      sessionStorage.setItem(PLAYER_KEY, id);
    }
    return id;
  }

  function normalizeCode(code) {
    return String(code || '').toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6);
  }

  function key(code) { return `${PREFIX}${normalizeCode(code)}`; }

  function withLock(code, task) {
    if (navigator.locks?.request) return navigator.locks.request(`jdr-room-${normalizeCode(code)}`, task);
    return Promise.resolve().then(task);
  }

  function getRoom(code) {
    try { return JSON.parse(localStorage.getItem(key(code)) || 'null'); }
    catch (_) { return null; }
  }

  function notify(code, room) {
    const normalized = normalizeCode(code);
    listeners.get(normalized)?.forEach((listener) => listener(room));
    channel?.postMessage({code: normalized});
  }

  function save(room) {
    room.updatedAt = Date.now();
    room.revision = (room.revision || 0) + 1;
    localStorage.setItem(key(room.code), JSON.stringify(room));
    notify(room.code, room);
    return room;
  }

  function newCode() {
    for (let attempt = 0; attempt < 30; attempt += 1) {
      let code = '';
      for (let index = 0; index < 6; index += 1) code += alphabet[Math.floor(Math.random() * alphabet.length)];
      if (!getRoom(code)) return code;
    }
    throw new Error('Não foi possível criar um código agora. Tente novamente.');
  }

  function validateName(name) {
    const clean = String(name || '').trim().replace(/\s+/g, ' ').slice(0, 20);
    if (clean.length < 2) throw new Error('Digite um apelido com pelo menos 2 letras.');
    return clean;
  }

  function createRoom(name) {
    const clean = validateName(name);
    const id = playerId();
    const now = Date.now();
    return save({
      version: 2, code: newCode(), hostId: id, createdAt: now, updatedAt: now, revision: 0,
      status: 'lobby', selectedGame: 'truth', rounds: 5,
      players: {[id]: {id, name: clean, joinedAt: now, lastSeen: now, ready: true, score: 0, team: 'A'}}, game: null
    });
  }

  function joinRoom(code, name) {
    const normalized = normalizeCode(code);
    const clean = validateName(name);
    const room = getRoom(normalized);
    if (!room) throw new Error('Sala não encontrada neste navegador. Confira o código.');
    if (room.version !== 2) throw new Error('Esta sala usa uma versão antiga. Crie uma sala nova.');
    if (Date.now() - room.createdAt > ROOM_LIFETIME_MS) throw new Error('Esta sala expirou. Peça ao organizador para criar outra.');
    if (room.status === 'closed') throw new Error('Esta sala já foi encerrada.');
    const id = playerId();
    const duplicate = Object.values(room.players || {}).some((player) => player.id !== id && player.name.toLowerCase() === clean.toLowerCase());
    if (duplicate) throw new Error('Esse apelido já está em uso na sala.');
    if (!room.players[id] && Object.keys(room.players || {}).length >= 20) throw new Error('A sala já está cheia.');
    const teamA = Object.values(room.players || {}).filter((player) => player.team === 'A').length;
    const teamB = Object.values(room.players || {}).filter((player) => player.team === 'B').length;
    room.players[id] = room.players[id] || {id, name: clean, joinedAt: Date.now(), ready: false, score: 0, team: teamA <= teamB ? 'A' : 'B'};
    room.players[id].name = clean;
    room.players[id].lastSeen = Date.now();
    return save(room);
  }

  function updateRoom(code, updater) {
    return withLock(code, () => {
      const room = getRoom(code);
      if (!room) throw new Error('A sala não existe mais.');
      const changed = updater(structuredClone(room));
      return save(changed || room);
    });
  }

  function updatePlayer(code, updater) {
    return withLock(code, () => {
      const room = getRoom(code);
      const id = playerId();
      if (!room?.players?.[id]) throw new Error('Você não está mais nesta sala.');
      const next = updater(structuredClone(room.players[id])) || room.players[id];
      next.id = id;
      room.players[id] = next;
      return save(room);
    });
  }

  function claimHost(code) {
    return withLock(code, () => {
      const room = getRoom(code);
      const id = playerId();
      if (!room?.players?.[id]) return room;
      const oldHost = room.players[room.hostId];
      if (!oldHost || Date.now() - oldHost.lastSeen > 20000) {
        const onlinePlayers = Object.values(room.players).filter((player) => Date.now() - player.lastSeen < 20000).sort((a, b) => a.joinedAt - b.joinedAt);
        if (onlinePlayers[0]?.id === id) { room.hostId = id; save(room); }
      }
      return room;
    });
  }

  function touch(code) {
    return withLock(code, () => {
      const id = playerId();
      const room = getRoom(code);
      if (!room?.players?.[id]) return room;
      room.players[id].lastSeen = Date.now();
      return save(room);
    });
  }

  function subscribe(code, listener) {
    const normalized = normalizeCode(code);
    if (!listeners.has(normalized)) listeners.set(normalized, new Set());
    listeners.get(normalized).add(listener);
    listener(getRoom(normalized));
    return () => listeners.get(normalized)?.delete(listener);
  }

  window.addEventListener('storage', (event) => {
    if (!event.key?.startsWith(PREFIX)) return;
    const code = event.key.slice(PREFIX.length);
    listeners.get(code)?.forEach((listener) => listener(getRoom(code)));
  });
  channel?.addEventListener('message', (event) => {
    const code = normalizeCode(event.data?.code);
    listeners.get(code)?.forEach((listener) => listener(getRoom(code)));
  });

  window.JDRRoomServices = {local: {playerId, normalizeCode, getRoom, createRoom, joinRoom, updateRoom, updatePlayer, claimHost, touch, subscribe}};
})();
