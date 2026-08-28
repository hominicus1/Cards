const assert=require('assert'),E=require('../skat-engine.js');let uid=0;const c=(rank,suit)=>({uid:`s${++uid}`,rank,suit});
assert.equal(E.BID_VALUES[0],18);assert.equal(E.BID_VALUES.at(-1),264);assert(E.BID_VALUES.includes(23)&&E.BID_VALUES.includes(35)&&E.BID_VALUES.includes(46)&&E.BID_VALUES.includes(59));assert(!E.BID_VALUES.includes(25));
assert.deepEqual(E.bidMeanings(23).map(x=>x.label),['Null']);assert.deepEqual(E.bidMeanings(36).map(x=>x.label),['Szel ×4','Krojc ×3']);assert(E.bidMeanings(48).some(x=>x.label==='Grand ×2'));assert.deepEqual(E.SUIT_NAMES,{D:'Szel',H:'Herc',S:'Grin',C:'Krojc'});
assert.deepEqual(E.tops([c('J','C')],'grand'),{with:true,count:1});
assert.deepEqual(E.tops([c('J','H'),c('J','D')],'grand'),{with:false,count:2});
const four=[c('J','C'),c('J','S'),c('J','H'),c('J','D')];assert.equal(E.potentialValue(four,{type:'grand',hand:false}),120,'Grand with four is 120');
assert.equal(E.potentialValue(four,{type:'grand',hand:true}),144,'Grand with four Hand is 144');
assert.equal(E.potentialValue(four,{type:'grand',hand:true,schneiderAnnounced:true}),192,'announced Schneider counts achieved and announced levels');
assert.equal(E.potentialValue([], {type:'null',hand:false}),23);assert.equal(E.potentialValue([], {type:'null',hand:true,open:true}),59);
{
 const state={phase:'declaration',declarer:0,tookSkat:true,highBid:24,valueCards:[],players:[{},{},{}]};const r=E.declareGame(state,0,{type:'null'});assert.equal(r.ok,false,'fixed Null 23 cannot cover a bid of 24');
}
{
 const players=Array.from({length:3},(_,id)=>({id,name:`P${id}`})),m=E.createMatch({players,rules:{skat:{grandFourRamsch:true}}}),deck=[];for(const s of ['S','H','D','C'])for(const r of ['7','8','9','J','Q','K','10','A'])deck.push(c(r,s));const state=E.startRound(m,deck,x=>x);assert(state.players.every(p=>p.hand.length===10));assert.equal(state.skat.length,2);assert.equal(state.phase,'bidding');
}
{
 const players=Array.from({length:3},(_,id)=>({id,name:`P${id}`})),m=E.createMatch({players}),deck=[];for(const s of ['S','H','D','C'])for(const r of ['7','8','9','J','Q','K','10','A'])deck.push(c(r,s));const state=E.startRound(m,deck,x=>x);
 assert(E.bid(state,state.middle,'pass').ok);assert(E.bid(state,state.rear,'pass').ok);assert.equal(state.phase,'forehand-choice','two opening passes leave the decision to forehand');assert(E.forehandChoice(state,state.forehand,false).ok);assert.equal(state.phase,'roundEnd');assert.equal(state.result.passed,true);
}
{
 const game={type:'suit',suit:'H'},state={phase:'playing',turn:0,game,trick:[{playerId:2,card:c('J','D')}],players:[{hand:[c('A','H'),c('7','S')]},{hand:[]},{hand:[]}]};assert.equal(E.legalCards(state,0)[0].rank,'A','Jack lead requires any trump');
}
{
 const ten=c('10','S'),seven=c('7','S'),state={mode:'skat',phase:'playing',turn:2,declarer:0,game:{type:'grand'},trick:[{playerId:1,card:c('A','S')},{playerId:0,card:c('K','S')}],players:[{id:0,hand:[]},{id:1,hand:[]},{id:2,hand:[ten,seven]}]};assert.equal(E.aiPlay(state,2).uid,ten.uid,'defender smears ten when partner already owns the trick');
}
{
 const ten=c('10','S'),seven=c('7','S'),state={mode:'skat',phase:'playing',turn:2,declarer:0,game:{type:'grand'},trick:[{playerId:0,card:c('A','S')},{playerId:1,card:c('K','S')}],players:[{id:0,hand:[]},{id:1,hand:[]},{id:2,hand:[ten,seven]}]};assert.equal(E.aiPlay(state,2).uid,seven.uid,'defender saves points when declarer owns an unbeatable trick');
}
{
 const ace=c('A','S'),seven=c('7','S'),state={mode:'skat',phase:'playing',turn:2,declarer:0,game:{type:'grand'},trick:[{playerId:0,card:c('10','S')},{playerId:1,card:c('Q','S')}],players:[{id:0,hand:[]},{id:1,hand:[]},{id:2,hand:[ace,seven]}]};assert.equal(E.aiPlay(state,2).uid,ace.uid,'defender takes declarer trick with the cheapest winning option');
}
{
 const heart=c('7','H'),club=c('7','C'),state={mode:'skat',phase:'playing',turn:1,declarer:0,game:{type:'grand'},trick:[{playerId:0,card:c('A','S')}],players:[{id:0,hand:[]},{id:1,hand:[heart,club]},{id:2,hand:[]}],voidCategories:[new Set(),new Set(),new Set()]};assert(E.playCard(state,1,heart.uid).ok);assert(state.voidCategories[1].has('S'),'failure to follow records a publicly inferred void suit');
}
{
 const players=Array.from({length:3},(_,id)=>({id,name:`P${id}`})),m=E.createMatch({players}),deck=[];for(const s of ['S','H','D','C'])for(const r of ['7','8','9','J','Q','K','10','A'])deck.push(c(r,s));m.pendingRamsch=1;const state=E.startRound(m,deck,x=>x);
 while(state.phase==='ramsch-pass'){const p=state.players[state.ramschPasser],cards=p.hand.filter(x=>x.rank!=='J').slice(0,2);assert(E.passRamsch(state,p.id,cards.map(x=>x.uid)).ok);}
 while(state.phase==='playing'){const card=E.aiPlay(state,state.turn);assert(E.playCard(state,state.turn,card.uid).ok);}
 assert.equal(state.result.points.reduce((n,p)=>n+p.eyes,0),120,'final ramsch skat belongs to last-trick winner');
}
console.log('skat engine tests: OK');
