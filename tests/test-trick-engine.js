const assert=require('assert'),E=require('../trick-engine.js');let uid=0;const c=(rank,suit)=>({uid:`t${++uid}`,rank,suit});
const players=()=>Array.from({length:3},(_,id)=>({id,name:`P${id}`}));
const match=()=>E.createMatch({players:players(),rules:{}});

assert.deepEqual(E.RANKS,['9','J','Q','K','10','A']);
assert.equal(['9','J','Q','K','10','A'].reduce((n,r)=>n+E.cardPoints(c(r,'S')),0),30,'one suit is worth 30');
assert.equal(E.round10(64),60);assert.equal(E.round10(65),70);

{
 const hand=[c('K','H'),c('Q','H')];assert(E.hasMarriage(hand,'H'));assert.equal(E.maxBid(hand),220);
}
{
 const m=match(),deck=[];for(const s of ['S','H','D','C'])for(const r of E.RANKS)deck.push(c(r,s));
 const s=E.startRound(m,deck,x=>x);assert(s.players.every(p=>p.hand.length===7));assert.equal(s.kitty.length,3);assert.equal(s.highBid,100);
}
{
 const s={phase:'playing',turn:1,trump:null,trick:[{playerId:0,card:c('J','S')}],players:players().map(p=>({...p,hand:[]}))};
 s.players[1].hand=[c('9','S'),c('Q','S'),c('A','H')];assert.deepEqual(E.legalCards(s,1).map(x=>x.rank),['Q'],'must follow and beat');
 s.players[1].hand=[c('9','S'),c('A','H')];assert.deepEqual(E.legalCards(s,1).map(x=>x.rank),['9'],'must follow even when unable to beat');
 s.trump='H';s.players[1].hand=[c('9','H'),c('A','D')];assert.deepEqual(E.legalCards(s,1).map(x=>x.suit),['H'],'void player must trump');
}
{
 const m=match();m.players[0].score=830;m.players[1].score=790;m.players[2].score=200;
 const s={match:m,phase:'playing',bidder:2,contract:100,players:m.players.map(p=>({...p,hand:[],cardPoints:0,meldPoints:0})),trickNo:8};
 s.players[0].cardPoints=70;s.players[1].cardPoints=25;s.players[2].cardPoints=25;E.finishRound(s);
 assert.equal(m.players[0].score,830,'defender on barrel is frozen');assert.equal(m.players[1].score,820,'defender enters barrel normally');assert.equal(m.players[2].score,100,'failed bidder loses contract');
}
{
 const m=match(),s={match:m,phase:'contract',bidder:0};assert(E.bomb(s,0).ok);assert.deepEqual(m.players.map(p=>p.score),[0,0,0],'first bomb is free');
 const s2={match:m,phase:'contract',bidder:0};assert(E.bomb(s2,0).ok);assert.deepEqual(m.players.map(p=>p.score),[0,60,60],'later bomb gives rivals 60');
}
{
 const hand=[c('Q','H'),c('K','H'),c('A','S'),c('10','S'),c('9','C'),c('J','C'),c('9','D')];
 assert(E.aiEstimate(hand,{kittyExpected:15})>=130,'AI values marriage and protected ten');
 const given=E.aiGiveCards(hand);assert(!given.some(x=>x.suit==='H'&&['Q','K'].includes(x.rank)),'AI protects marriage when splitting kitty');
}
{
 const hand=[c('A','S'),c('10','S'),c('9','H')],s={phase:'playing',turn:0,trick:[],trump:null,declaredMelds:[],players:players().map(p=>({...p,hand:[],tricks:[]}))};s.players[0].hand=hand;
 assert.equal(E.aiChoosePlay(s,0).card.rank,'A','AI leads a sure Ace before shedding low cards');
}
console.log('trick engine tests: OK');
