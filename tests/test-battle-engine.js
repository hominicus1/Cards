const assert=require('assert');
const B=require('../battle-engine.js');
const war=require('fs').readFileSync(require('path').join(__dirname,'../games/war.js'),'utf8');
const vm=require('vm'); const ctx={globalThis:{}};vm.createContext(ctx);vm.runInContext(war,ctx);
const rules=ctx.globalThis.CardSandboxGames.war.rules;
let uid=1;
const c=(rank,{joker=false}={})=>({uid:`t${uid++}`,rank:joker?'JOKER':rank,suit:joker?null:'S',joker});

function stateWith(stacks){
  const players=stacks.map((stack,i)=>({id:i,name:`P${i+1}`,human:i===0}));
  const s=B.createState({rules,players,deck:[]});
  s.players.forEach((p,i)=>p.stack=[...stacks[i]]); return s;
}
function reveal(s){const ev=B.step(s);assert(['reveal','war-reveal'].includes(ev.type));assert.equal(s.stage,'compare');return ev;}
function resolve(s){return B.step(s);}

// 0.6.3: zwykłe odkrycie jest osobną fazą, więc UI ma czas pokazać karty.
{
  const s=stateWith([[c('9'),c('2')],[c('5'),c('3')]]);
  const ev=reveal(s); assert.equal(ev.type,'reveal');
  assert.equal(s.visible[0].rank,'9'); assert.equal(s.visible[1].rank,'5');
  assert.equal(B.potSize(s),2);
  const won=resolve(s); assert(['battle-won','game-over'].includes(won.type));
}

// 3 3 6 -> wojna 3 -> 6 2 6 -> wojna 6; trzeci gracz trzyma swoją 6.
{
  const s=stateWith([
    [c('3'),c('9'),c('6'),c('4'),c('K')],
    [c('3'),c('8'),c('2'),c('5'),c('Q')],
    [c('6'),c('7'),c('A'),c('10'),c('J')]
  ]);
  reveal(s); resolve(s); assert.equal(s.stage,'war'); assert.deepEqual(s.warParticipants,[0,1]); assert.equal(s.warRank,'3');
  const held=s.visible[2].uid;
  reveal(s); resolve(s); assert.equal(s.stage,'war'); assert.deepEqual(s.warParticipants,[0,2]); assert.equal(s.warRank,'6'); assert.equal(s.visible[2].uid,held);
}

// A A 2 -> wojna A -> K 2 2 -> wojna 2 między innymi graczami.
{
  const s=stateWith([
    [c('A'),c('4'),c('K'),c('9'),c('8')],
    [c('A'),c('5'),c('2'),c('7'),c('6')],
    [c('2'),c('3'),c('Q'),c('J'),c('10')]
  ]);
  reveal(s); resolve(s); assert.equal(s.warRank,'A'); assert.deepEqual(s.warParticipants,[0,1]);
  reveal(s); resolve(s); assert.equal(s.warRank,'2'); assert.deepEqual(s.warParticipants,[1,2]);
}

// Joker zawsze wyżej od Asa.
{
  const s=stateWith([[c('A')],[c('JOKER',{joker:true})],[c('K')]]);
  reveal(s); const ev=resolve(s); assert.equal(ev.type,'game-over'); assert.equal(s.winnerId,1);
}

// Brak dwóch kart na wojnę => wartość 0, bez pożyczania.
{
  const s=stateWith([[c('7')],[c('7'),c('2'),c('A')],[c('6'),c('4'),c('5')]]);
  reveal(s); resolve(s); assert.equal(s.stage,'war');
  reveal(s); assert.deepEqual(s.lastWarFailed,[0]); assert.equal(s.players[0].stack.length,0);
  resolve(s);
}

// Kolejność puli: zwycięzca pierwszy, potem clockwise; kolejność własnych kart zachowana.
{
  const a=c('9'),b=c('2'),d=c('3');
  const s=stateWith([[a],[b],[d]]); reveal(s); resolve(s);
  assert.equal(s.players[0].stack[0].uid,a.uid); assert.equal(s.players[0].stack[1].uid,b.uid); assert.equal(s.players[0].stack[2].uid,d.uid);
}

// Złożona wojna zachowuje winner-first i chronologię kart zwycięzcy.
{
  const p0=[c('5'),c('4'),c('K')];
  const p1=[c('5'),c('3'),c('2')];
  const p2=[c('9'),c('8'),c('7')];
  const ids0=p0.map(x=>x.uid), ids1=p1.map(x=>x.uid), ids2=p2.map(x=>x.uid);
  const s=stateWith([p0,p1,p2]);
  reveal(s); resolve(s); // 5 5 9 => wojna 5
  reveal(s); resolve(s); // K 2 9 => P0 bierze całość
  const stack=s.players[0].stack.map(x=>x.uid);
  assert.deepEqual(stack.slice(0,3),ids0);
  assert.deepEqual(stack.slice(3,6),ids1);
  assert.deepEqual(stack.slice(6,7),ids2.slice(0,1));
}

// Pełna symulacja 2–6 graczy: wszystkie 54 karty są zachowane i gra się kończy.
{
  function rng(seed){return()=>((seed=(seed*1664525+1013904223)>>>0)/4294967296);}
  function fullDeck(seed){
    let cards=[],n=1;
    for(const suit of ['S','H','D','C']) for(const rank of rules.cardModel.rankOrder) cards.push({uid:`f${n++}`,rank,suit,joker:false});
    cards.push({uid:`f${n++}`,rank:'JOKER',suit:null,joker:true},{uid:`f${n++}`,rank:'JOKER',suit:null,joker:true});
    const R=rng(seed); for(let i=cards.length-1;i>0;i--){const j=Math.floor(R()*(i+1));[cards[i],cards[j]]=[cards[j],cards[i]];} return cards;
  }
  for(let count=2;count<=6;count++){
    const players=Array.from({length:count},(_,i)=>({id:i,name:`P${i}`,human:i===0}));
    const s=B.createState({rules,players,deck:fullDeck(12345+count)});
    let steps=0;
    while(!s.finished && steps<40000){B.step(s);steps++;assert.equal(s.players.reduce((n,p)=>n+p.stack.length,0)+B.potSize(s),54);}
    assert.equal(s.finished,true,`full game ${count} players should finish`);
  }
}
console.log('battle engine tests: OK');
