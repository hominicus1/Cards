require('../games/sevens.js');
const def=globalThis.CardSandboxGames?.sevens;
function expect(name,cond,detail=''){if(!cond){console.error('FAIL',name,detail);process.exitCode=1}else console.log('PASS',name,detail)}
expect('Sevens is registered as a game definition',!!def);
expect('Sevens starts with 7 cards',def?.rules?.players?.handSize===7);
expect('Sevens entry is 30',def?.rules?.meld?.entryMin===30);
expect('Sevens uses two total jokers by default',def?.rules?.deck?.count*def?.rules?.deck?.jokersPerDeck===2);
expect('Sevens joker share limit is 50% exclusive',def?.rules?.meld?.maxJokerFraction===0.5);
expect('Sevens table cards stay on table',def?.rules?.meld?.tableCardsStayOnTable===true);

expect('Sevens auto-draws at turn start',def?.rules?.turn?.drawMode==='auto');
expect('Sevens auto-draw count is 1',def?.rules?.turn?.drawCount===1);
expect('Sevens draw is not hard-coded in meld rules',!Object.prototype.hasOwnProperty.call(def?.rules?.meld||{},'drawPerTurn'));

require('../games/war.js');
const warDef=globalThis.CardSandboxGames?.war;
expect('War is registered as a game definition',!!warDef);
expect('War uses battle engine',warDef?.engine==='battle');
expect('War has two jokers per deck',warDef?.rules?.deck?.jokersPerDeck===2);
expect('War joker is higher than Ace',warDef?.rules?.battle?.jokerHigh===true);
expect('War triggers on any duplicate rank',warDef?.rules?.battle?.tieTrigger==='any-duplicate');
expect('War uses one face-down card on tie',warDef?.rules?.battle?.faceDownOnTie===1);
expect('War uses one face-up card on tie',warDef?.rules?.battle?.faceUpOnTie===1);
expect('War collects winner cards first',warDef?.rules?.battle?.collectOrder==='winner-first-clockwise');
