const assert=require('assert');
const Engine=require('../macao-engine.js');
let uid=0;const c=(rank,suit)=>({uid:`m${++uid}`,rank,suit});
const base=()=>({players:[{id:0,hand:[],active:true},{id:1,hand:[],active:true},{id:2,hand:[],active:true}],deck:[],discard:[c('7','S')],turn:0,penalty:0,request:null,finished:false,moveNo:0,shuffle:x=>x});

{
  const s=base(),cards=[c('7','H'),c('7','D')];
  assert.equal(Engine.analyzePlay(s,cards).valid,false,'two cards are forbidden');
}
{
  const s=base(),cards=[c('2','S'),c('2','H'),c('2','D')];
  s.discard=[c('2','C')];const a=Engine.analyzePlay(s,cards);
  assert(a.valid);assert.equal(a.penaltyDelta,6,'three twos add six');
}
{
  const s=base();s.penalty=2;s.discard=[c('2','S')];
  const cards=[c('3','S'),c('3','H'),c('3','D')],a=Engine.analyzePlay(s,cards);
  assert(a.valid);assert.equal(a.penaltyDelta,9,'three threes add nine in a penalty chain');
}
{
  const s=base();s.penalty=8;s.discard=[c('3','S')];
  assert.equal(Engine.analyzePlay(s,[c('Q','S')]).type,'transfer','queen of current suit transfers penalty');
  assert.equal(Engine.analyzePlay(s,[c('Q','H')]).valid,false,'queen of another suit does not transfer penalty');
  assert.equal(Engine.analyzePlay(s,[c('K','D')]).type,'cancel','diamond king cancels penalty');
  assert.equal(Engine.analyzePlay(s,[c('K','C')]).type,'cancel','club king cancels penalty');
  assert.equal(Engine.analyzePlay(s,[c('K','H'),c('K','D'),c('K','C')]).type,'cancel','a king packet containing a counter king cancels penalty');
}
{
  const s=base(),cards=[c('4','S'),c('4','H'),c('4','D')];s.discard=[c('4','C')];
  assert.equal(Engine.analyzePlay(s,cards).skips,3,'three fours add three skips');
}
{
  const s=base(),p=s.players[0];p.hand=[c('7','H')];s.deck=[c('5','S'),c('6','S'),c('8','S'),c('9','S'),c('10','S')];
  assert(Engine.missMacao(s,0).ok);assert.equal(p.hand.length,6,'missed Makao draws five');
}
console.log('macao engine tests: OK');
