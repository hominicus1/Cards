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
