import {initializeApp} from 'https://www.gstatic.com/firebasejs/12.16.0/firebase-app.js';
import {browserLocalPersistence, getAuth, onAuthStateChanged, setPersistence, signInAnonymously} from 'https://www.gstatic.com/firebasejs/12.16.0/firebase-auth.js';
import {collection, doc, getDoc, getDocs, getFirestore, onSnapshot, runTransaction, setDoc, updateDoc} from 'https://www.gstatic.com/firebasejs/12.16.0/firebase-firestore.js';
import {firebaseConfig} from './firebase-config.js';

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const ROOM_LIFETIME_MS = 6 * 60 * 60 * 1000;
let authPromise;

function normalizeCode(code) {
  return String(code || '').toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6);
}

function validateName(name) {
  const clean = String(name || '').trim().replace(/\s+/g, ' ').slice(0, 20);
  if (clean.length < 2) throw new Error('Digite um apelido com pelo menos 2 letras.');
  return clean;
}

function ensureAuth() {
  if (auth.currentUser) return Promise.resolve(auth.currentUser);
  if (!authPromise) {
    authPromise = setPersistence(auth, browserLocalPersistence)
      .then(() => new Promise((resolve, reject) => {
        const stop = onAuthStateChanged(auth, async (user) => {
          if (user) { stop(); resolve(user); return; }
          try { await signInAnonymously(auth); }
          catch (error) { stop(); reject(error); }
        }, reject);
      }));
  }
  return authPromise;
}

function newCode() {
  let code = '';
  for (let index = 0; index < 6; index += 1) code += alphabet[Math.floor(Math.random() * alphabet.length)];
  return code;
}

function publicRoom(data, players = {}) {
  return {...data, players};
}

async function playerId() {
  return (await ensureAuth()).uid;
}

async function createRoom(name) {
  const clean = validateName(name);
  const user = await ensureAuth();
  for (let attempt = 0; attempt < 20; attempt += 1) {
    const code = newCode();
    const roomRef = doc(db, 'rooms', code);
    const playerRef = doc(db, 'rooms', code, 'players', user.uid);
    const now = Date.now();
    const room = {
      version: 2, code, hostId: user.uid, createdAt: now, updatedAt: now, revision: 1,
      status: 'lobby', selectedGame: 'truth', rounds: 5, game: null
    };
    try {
      await runTransaction(db, async (transaction) => {
        const existing = await transaction.get(roomRef);
        if (existing.exists()) throw new Error('CODE_COLLISION');
        transaction.set(roomRef, room);
        transaction.set(playerRef, {id: user.uid, name: clean, joinedAt: now, lastSeen: now, ready: true, score: 0, team: 'A'});
      });
      return publicRoom(room, {[user.uid]: {id: user.uid, name: clean, joinedAt: now, lastSeen: now, ready: true, score: 0, team: 'A'}});
    } catch (error) {
      if (error.message !== 'CODE_COLLISION') throw error;
    }
  }
  throw new Error('Não foi possível criar um código agora. Tente novamente.');
}

async function joinRoom(code, name) {
  const normalized = normalizeCode(code);
  const clean = validateName(name);
  const user = await ensureAuth();
  const roomRef = doc(db, 'rooms', normalized);
  const roomSnapshot = await getDoc(roomRef);
  if (!roomSnapshot.exists()) throw new Error('Sala não encontrada. Confira o código.');
  const roomData = roomSnapshot.data();
  if (roomData.version !== 2) throw new Error('Esta sala usa uma versão antiga. Crie uma sala nova.');
  if (Date.now() - roomData.createdAt > ROOM_LIFETIME_MS) throw new Error('Esta sala expirou. Peça ao organizador para criar outra.');
  if (roomData.status === 'closed') throw new Error('Esta sala já foi encerrada.');
  const now = Date.now();
  const playerRef = doc(db, 'rooms', normalized, 'players', user.uid);
  const existingPlayer = await getDoc(playerRef);
  const player = existingPlayer.exists() ? existingPlayer.data() : {
    id: user.uid, name: clean, joinedAt: now, ready: false, score: 0, team: 'A'
  };
  await setDoc(playerRef, {...player, id: user.uid, name: clean, lastSeen: now}, {merge: true});
  return getRoom(normalized);
}

async function getRoom(code) {
  const normalized = normalizeCode(code);
  const user = await ensureAuth();
  const roomSnapshot = await getDoc(doc(db, 'rooms', normalized));
  if (!roomSnapshot.exists()) return null;
  const ownPlayer = await getDoc(doc(db, 'rooms', normalized, 'players', user.uid));
  if (!ownPlayer.exists()) return publicRoom(roomSnapshot.data(), {});
  const playersSnapshot = await getDocs(collection(db, 'rooms', normalized, 'players'));
  const players = Object.fromEntries(playersSnapshot.docs.map((item) => [item.id, item.data()]));
  return publicRoom(roomSnapshot.data(), players);
}

async function updateRoom(code, updater) {
  const normalized = normalizeCode(code);
  const user = await ensureAuth();
  const roomRef = doc(db, 'rooms', normalized);
  return runTransaction(db, async (transaction) => {
    const snapshot = await transaction.get(roomRef);
    if (!snapshot.exists()) throw new Error('A sala não existe mais.');
    if (snapshot.data().hostId !== user.uid) throw new Error('Somente o organizador pode controlar a partida.');
    const next = updater(publicRoom(structuredClone(snapshot.data()), {})) || snapshot.data();
    delete next.players;
    next.updatedAt = Date.now();
    next.revision = (snapshot.data().revision || 0) + 1;
    transaction.set(roomRef, next);
    return publicRoom(next, {});
  });
}

async function updatePlayer(code, updater) {
  const normalized = normalizeCode(code);
  const user = await ensureAuth();
  const playerRef = doc(db, 'rooms', normalized, 'players', user.uid);
  return runTransaction(db, async (transaction) => {
    const snapshot = await transaction.get(playerRef);
    if (!snapshot.exists()) throw new Error('Você não está mais nesta sala.');
    const next = updater(structuredClone(snapshot.data())) || snapshot.data();
    next.id = user.uid;
    next.lastSeen = Date.now();
    transaction.set(playerRef, next);
    return next;
  });
}

async function claimHost(code) {
  const normalized = normalizeCode(code);
  const user = await ensureAuth();
  const roomRef = doc(db, 'rooms', normalized);
  return runTransaction(db, async (transaction) => {
    const roomSnapshot = await transaction.get(roomRef);
    if (!roomSnapshot.exists()) return null;
    const current = roomSnapshot.data();
    if (current.hostId === user.uid) return current;
    const hostSnapshot = await transaction.get(doc(db, 'rooms', normalized, 'players', current.hostId));
    const hostLastSeen = hostSnapshot.exists() ? hostSnapshot.data().lastSeen : 0;
    if (Date.now() - hostLastSeen <= 20000) return current;
    const next = {...current, hostId: user.uid, updatedAt: Date.now(), revision: (current.revision || 0) + 1};
    transaction.set(roomRef, next);
    return next;
  });
}

async function touch(code) {
  const user = await ensureAuth();
  try { await updateDoc(doc(db, 'rooms', normalizeCode(code), 'players', user.uid), {lastSeen: Date.now()}); }
  catch (_) {}
}

async function subscribe(code, listener) {
  const normalized = normalizeCode(code);
  await ensureAuth();
  let roomData = null;
  let players = {};
  let roomReady = false;
  let playersReady = false;
  const emit = () => { if (roomReady && playersReady) listener(roomData ? publicRoom(roomData, players) : null); };
  const stopRoom = onSnapshot(doc(db, 'rooms', normalized), (snapshot) => {
    roomReady = true; roomData = snapshot.exists() ? snapshot.data() : null; emit();
  }, (error) => listener({error: error.message}));
  const stopPlayers = onSnapshot(collection(db, 'rooms', normalized, 'players'), (snapshot) => {
    playersReady = true;
    players = Object.fromEntries(snapshot.docs.map((item) => [item.id, item.data()]));
    emit();
  }, (error) => listener({error: error.message}));
  return () => { stopRoom(); stopPlayers(); };
}

export const firebaseRoomService = {
  kind: 'firebase', ready: ensureAuth, playerId: () => auth.currentUser?.uid || '',
  normalizeCode, getRoom, createRoom, joinRoom, updateRoom, updatePlayer, claimHost, touch, subscribe
};
