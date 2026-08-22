(function(root,factory){
  const api=factory();
  if(typeof module==='object'&&module.exports)module.exports=api;
  else root.CardSandboxSheddingEngine=api;
})(typeof globalThis!=='undefined'?globalThis:this,function(){
  'use strict';

  const sameCard=(card,spec)=>card&&spec&&card.rank===spec.rank&&card.suit===spec.suit;
  const rankIndex=(rules,rank)=>rules.cardModel.rankOrder.indexOf(rank);
  const nextActive=(state,from)=>{
    for(let n=1;n<=state.players.length;n++){
      const id=(from+n)%state.players.length;
      if(state.players[id].active&&state.players[id].hand.length)return id;
    }
    return from;
  };

  function splitPackets(rules,cards){
    const byRank=new Map();
    for(const card of cards){
      if(card.joker)return {valid:false,reason:'Jokery nie biorą udziału w tej grze'};
      if(!byRank.has(card.rank))byRank.set(card.rank,[]);
      byRank.get(card.rank).push(card);
    }
    const packets=[...byRank.entries()].map(([rank,items])=>({rank,cards:items,index:rankIndex(rules,rank)})).sort((a,b)=>a.index-b.index);
    if(packets.some(p=>p.index<0))return {valid:false,reason:'Niedozwolona ranga'};
    return {valid:true,packets};
  }

  function analyzePlay(rules,cards,topCard,{opening=false,pileCards=[]}={}){
    if(!cards?.length)return {valid:false,reason:'Wybierz kartę albo drabinkę'};
    const split=splitPackets(rules,cards); if(!split.valid)return split;
    const packets=split.packets, sizes=packets.map(p=>p.cards.length), cfg=rules.shedding;
    const tripleHasHeart=packet=>packet.cards.some(c=>c.suit===cfg.tripleRequiresSuit)||(cfg.tripleHeartMayBeOnPile&&pileCards.some(c=>c.rank===packet.rank&&c.suit===cfg.tripleRequiresSuit));
    if(packets.length===1){
      const packet=packets[0], size=sizes[0];
      if(!cfg.allowedPacketSizes.includes(size))return {valid:false,reason:'Można zagrać 1, 3 albo 4 karty — nigdy parę'};
      if(size===3&&!tripleHasHeart(packet))return {valid:false,reason:'Trójka wymaga kiera w zagrywanych kartach albo na stosie'};
    } else {
      if(sizes.some(size=>!cfg.ladderPacketSizes.includes(size)))return {valid:false,reason:'Drabinka składa się wyłącznie z trójek i czwórek'};
      if(packets.some(p=>p.cards.length===3&&!tripleHasHeart(p)))return {valid:false,reason:'Każda trójka w drabince wymaga odpowiadającego kiera w kartach albo na stosie'};
      if(cfg.ladderStrictlyAscending&&packets.some((p,i)=>i&&p.index<=packets[i-1].index))return {valid:false,reason:'Drabinka musi rosnąć rangami'};
    }
    const first=packets[0], last=packets[packets.length-1];
    if(topCard&&first.index<rankIndex(rules,topCard.rank))return {valid:false,reason:'Pierwsza ranga musi być równa lub wyższa od wierzchniej karty'};
    if(opening&&!cards.some(c=>sameCard(c,cfg.requiredStart)))return {valid:false,reason:'Pierwszy ruch musi zawierać 9♥'};
    return {valid:true,reason:'',packets,topCard:last.cards[last.cards.length-1],label:packets.map(p=>`${p.cards.length}×${p.rank}`).join(' → ')};
  }

  function enumeratePlays(rules,hand,topCard,{opening=false,pileCards=[]}={}){
    const byRank=rules.cardModel.rankOrder.map(rank=>hand.filter(c=>c.rank===rank));
    const packets=[];
    byRank.forEach(cards=>{
      cards.forEach(card=>packets.push([[card]]));
      if(cards.length>=3){
        const heart=cards.find(c=>c.suit===rules.shedding.tripleRequiresSuit);
        if(heart){const others=cards.filter(c=>c.uid!==heart.uid).slice(0,2);if(others.length===2)packets.push([[heart,...others]]);}
        else if(rules.shedding.tripleHeartMayBeOnPile&&pileCards.some(c=>c.rank===cards[0].rank&&c.suit===rules.shedding.tripleRequiresSuit))packets.push([cards.slice(0,3)]);
      }
      if(cards.length===4)packets.push([cards.slice(0,4)]);
    });
    const flat=packets.flat(), plays=[];
    for(const p of flat){const a=analyzePlay(rules,p,topCard,{opening,pileCards});if(a.valid)plays.push({cards:p,analysis:a});}
    const ladderPackets=flat.filter(p=>p.length===3||p.length===4).sort((a,b)=>rankIndex(rules,a[0].rank)-rankIndex(rules,b[0].rank));
    const n=ladderPackets.length;
    for(let mask=1;mask<(1<<n);mask++){
      const selected=[];for(let i=0;i<n;i++)if(mask&(1<<i))selected.push(...ladderPackets[i]);
      if(new Set(selected.map(c=>c.rank)).size<2)continue;
      const a=analyzePlay(rules,selected,topCard,{opening,pileCards});if(a.valid)plays.push({cards:selected,analysis:a});
    }
    const seen=new Set();
    return plays.filter(p=>{const k=p.cards.map(c=>c.uid).sort().join('|');if(seen.has(k))return false;seen.add(k);return true;})
      .sort((a,b)=>b.cards.length-a.cards.length||rankIndex(rules,a.analysis.topCard.rank)-rankIndex(rules,b.analysis.topCard.rank));
  }

  function createState({rules,players,deck,letters=[]}){
    const legalRanks=new Set(rules.cardModel.rankOrder);
    const cards=deck.filter(c=>!c.joker&&legalRanks.has(c.rank));
    players.forEach((p,i)=>{p.hand=[];p.active=true;p.finishedPlace=null;p.letters=letters[i]||'';});
    cards.forEach((card,i)=>players[i%players.length].hand.push(card));
    const starter=players.findIndex(p=>p.hand.some(c=>sameCard(c,rules.shedding.requiredStart)));
    return {players,pile:[],turn:starter<0?0:starter,opening:true,finished:false,roundOver:false,draw:false,loserId:null,winnerIds:[],moveNo:0};
  }

  function play(state,rules,playerId,cardUids){
    if(state.finished||state.roundOver||state.turn!==playerId)return {ok:false,reason:'To nie jest tura tego gracza'};
    const p=state.players[playerId], selected=cardUids.map(uid=>p.hand.find(c=>c.uid===uid)).filter(Boolean);
    if(selected.length!==cardUids.length)return {ok:false,reason:'Nie znaleziono wszystkich kart w ręce'};
    const analysis=analyzePlay(rules,selected,state.pile.at(-1),{opening:state.opening,pileCards:state.pile});
    if(!analysis.valid)return {ok:false,reason:analysis.reason};
    const ids=new Set(cardUids);p.hand=p.hand.filter(c=>!ids.has(c.uid));state.pile.push(...analysis.packets.flatMap(x=>x.cards));state.opening=false;state.moveNo++;
    if(!p.hand.length){p.active=false;p.finishedPlace=state.winnerIds.length+1;state.winnerIds.push(playerId);}
    settleAfterMove(state,rules,playerId);
    applyStalemateGuard(state,rules);
    return {ok:true,type:'play',analysis,playerId};
  }

  function take(state,rules,playerId){
    if(state.finished||state.roundOver||state.turn!==playerId)return {ok:false,reason:'To nie jest tura tego gracza'};
    if(state.opening)return {ok:false,reason:'Pierwszy gracz musi wyłożyć 9♥'};
    const protectedIndex=state.pile.findIndex(c=>sameCard(c,rules.shedding.protectedBase));
    const available=Math.max(0,state.pile.length-(protectedIndex>=0?protectedIndex+1:0));
    const count=Math.min(rules.shedding.takeCount,available), taken=[];
    for(let i=0;i<count;i++)taken.unshift(state.pile.pop());
    state.players[playerId].hand.push(...taken);state.moveNo++;state.turn=nextActive(state,playerId);
    if(state.players.filter(p=>p.active&&p.hand.length).length===1){state.roundOver=true;state.loserId=playerId;}
    applyStalemateGuard(state,rules);
    return {ok:true,type:'take',cards:taken,playerId};
  }

  function settleAfterMove(state,rules,playerId){
    const alive=state.players.filter(p=>p.active&&p.hand.length);
    if(alive.length===0){state.roundOver=true;state.draw=true;return;}
    if(alive.length===1){
      const last=alive[0];
      if(rules.shedding.lastPlayerCanEscape){
        const escapes=enumeratePlays(rules,last.hand,state.pile.at(-1),{pileCards:state.pile});
        if(escapes.some(x=>x.cards.length===last.hand.length)){state.turn=last.id;return;}
      }
      state.roundOver=true;state.loserId=last.id;return;
    }
    state.turn=nextActive(state,playerId);
  }

  function applyStalemateGuard(state,rules){
    const limit=Number(rules.shedding?.stalemateDrawAfter)||0;
    if(!state.roundOver&&limit>0&&state.moveNo>=limit){state.roundOver=true;state.draw=true;state.stalemate=true;}
  }

  return {analyzePlay,enumeratePlays,createState,play,take,nextActive};
});
