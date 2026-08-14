import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';

global.window = {};
for (const file of ['data.js', 'expansion.js', 'new-games.js']) {
  eval(fs.readFileSync(new URL(`../${file}`, import.meta.url), 'utf8'));
}
const engine = await import(`../online-games.js?test=${Date.now()}`);

test('os sete jogos online possuem conteúdo e baralho válido', () => {
  assert.deepEqual(engine.ONLINE_GAME_IDS, ['truth', 'verse', 'quote', 'battle', 'clues', 'emoji', 'reveal']);
  for (const gameId of engine.ONLINE_GAME_IDS) {
    const deck = engine.makeDeck(gameId, 20);
    assert.ok(deck.length >= 1 && deck.length <= 20);
    assert.ok(engine.resolveOnlineItem(gameId, deck[0]));
  }
  assert.equal(engine.makeDeck('reveal', 20).length, 16);
});

test('respostas textuais aceitam variações sem aceitar personagens errados', () => {
  const reveal = window.MONTE_DATA.revealImages;
  assert.equal(engine.isCorrectText(reveal[1].answer, 'davi contra golias'), true);
  assert.equal(engine.isCorrectText(reveal[8].answer, 'muralhas de jerico'), true);
  assert.equal(engine.isCorrectText(reveal[1].answer, 'sansao'), false);
});

test('pontuação nunca fica abaixo de zero', () => {
  assert.equal(engine.scoreAfter(0, -1), 0);
  assert.equal(engine.scoreAfter(1, -1), 0);
  assert.equal(engine.scoreAfter(4, 1), 5);
});

test('pontuação progressiva cai de cinco até um', () => {
  assert.deepEqual([0, 1, 2, 3, 4].map((level) => engine.progressivePoints('reveal', level)), [5, 4, 3, 2, 1]);
  assert.deepEqual([0, 1, 2, 3, 4].map((level) => engine.progressivePoints('clues', level)), [5, 4, 3, 2, 1]);
});
