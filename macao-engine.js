(function(root,factory){
  const api=factory();
  if(typeof module==='object'&&module.exports)module.exports=api;
  else root.CardSandboxMacaoEngine=api;
})(typeof globalThis!=='undefined'?globalThis:this,function(){
  'use strict';

  const sameRank=cards=>cards.every(c=>c.rank===cards[0]?.rank);
  const nextPlayer=(state,from,steps=1)=>{
    let id=from;
    for(let i=0;i<steps;i++)id=(id+1)%state.players.length;
    return id;
  };
  const isAttack=card=>card&&(card.rank==='2'||card.rank==='3'||(card.rank==='K'&&(card.suit==='H'||card.suit==='S')));
  const attackValue=card=>card.rank==='2'?2:card.rank==='3'?3:card.rank==='K'?5:0;
  const isCounterKing=card=>card?.rank==='K'&&(card.suit==='D'||card.suit==='C');
  const isQueenTransfer=(card,top)=>card?.rank==='Q'&&card.suit===top?.suit;
  const normalMatch=(card,top,state)=>{
    if(!top)return true;
    if(state.request?.type==='suit')return card.suit===state.request.value||card.rank==='A'||card.rank==='Q';
    if(state.request?.type==='rank')return card.rank===state.request.value||card.rank==='J'||card.rank==='Q';
    return card.rank==='Q'||top.rank==='Q'||card.rank===top.rank||card.suit===top.suit;
  };

  function analyzePlay(state,cards){
    if(!cards?.length)return {valid:false,reason:'Wybierz kartę albo zestaw'};
    if(![1,3,4].includes(cards.length))return {valid:false,reason:'Można wyłożyć 1, 3 albo 4 karty — nigdy dwie'};
    if(!sameRank(cards))return {valid:false,reason:'Zestaw musi mieć tę samą wartość'};
    const top=state.discard.at(-1),first=cards[0];
    if(state.penalty>0){
      if(first.rank==='K'&&cards.some(isCounterKing))return {valid:true,type:'cancel',penaltyDelta:0,label:`${cards.length}×K — anulowanie kary`};
      if(cards.every(c=>isQueenTransfer(c,top)))return {valid:true,type:'transfer',penaltyDelta:0,label:`${cards.length}×Q — przekazanie +${state.penalty}`};
      if(!cards.every(isAttack))return {valid:false,reason:`Trwa kara +${state.penalty}: dołóż kartę karną, damę w kolorze albo króla anulującego`};
      if(!(first.rank===top?.rank||cards.some(c=>c.suit===top?.suit)))return {valid:false,reason:'Kartę karną można dołożyć tą samą wartością albo kolorem'};
      const delta=cards.reduce((sum,c)=>sum+attackValue(c),0);
      return {valid:true,type:'attack',penaltyDelta:delta,label:`${cards.length}×${first.rank} +${delta}`};
    }
    if(!normalMatch(first,top,state)&&!cards.some(c=>normalMatch(c,top,state)))return {valid:false,reason:'Karta musi pasować kolorem lub wartością'};
    const cancels=first.rank==='K'&&cards.some(isCounterKing);
    const delta=cancels?0:cards.reduce((sum,c)=>sum+attackValue(c),0);
    const skips=first.rank==='4'?cards.length:0;
    const demand=first.rank==='J'?'rank':first.rank==='A'?'suit':null;
    return {valid:true,type:cancels?'cancel':delta?'attack':'normal',penaltyDelta:delta,skips,demand,label:`${cards.length}×${first.rank}${cancels?' · anulowanie kary':delta?` +${delta}`:''}${skips?` · postój ×${skips}`:''}`};
  }

  function enumeratePlays(state,hand){
    const groups=new Map();
    hand.forEach(c=>{if(!groups.has(c.rank))groups.set(c.rank,[]);groups.get(c.rank).push(c);});
    const candidates=[];
    for(const cards of groups.values()){
      cards.forEach(c=>candidates.push([c]));
      if(cards.length>=3)candidates.push(cards.slice(0,3));
      if(cards.length>=4)candidates.push(cards.slice(0,4));
    }
    return candidates.map(cards=>({cards,analysis:analyzePlay(state,cards)})).filter(x=>x.analysis.valid)
      .sort((a,b)=>b.cards.length-a.cards.length||b.analysis.penaltyDelta-a.analysis.penaltyDelta);
  }

  function recycle(state,shuffle){
    if(state.deck.length||state.discard.length<=1)return;
    const top=state.discard.pop();state.deck=shuffle(state.discard);state.discard=[top];
  }

  function createState({players,deck,shuffle}){
    const cards=shuffle(deck.filter(c=>!c.joker));
    players.forEach(p=>{p.hand=[];p.active=true;p.macaoSafe=false;});
    for(let n=0;n<5;n++)players.forEach(p=>p.hand.push(cards.pop()));
    let starter=cards.pop();
    while(starter&&['2','3','4','J','Q','K','A'].includes(starter.rank)){cards.unshift(starter);starter=cards.pop();}
    return {players,deck:cards,discard:[starter],turn:0,penalty:0,request:null,finished:false,winnerId:null,moveNo:0,shuffle};
  }

  function play(state,playerId,uids,{demandValue=null}={}){
    if(state.finished||state.turn!==playerId)return {ok:false,reason:'To nie jest tura tego gracza'};
    const p=state.players[playerId],cards=uids.map(uid=>p.hand.find(c=>c.uid===uid)).filter(Boolean);
    if(cards.length!==uids.length)return {ok:false,reason:'Nie znaleziono kart'};
    const analysis=analyzePlay(state,cards);if(!analysis.valid)return {ok:false,reason:analysis.reason};
    if(analysis.demand==='suit'&&!['S','H','D','C'].includes(demandValue))return {ok:false,reason:'Wybierz żądany kolor'};
    if(analysis.demand==='rank'&&!['5','6','7','8','9','10'].includes(demandValue))return {ok:false,reason:'Wybierz żądaną wartość od 5 do 10'};
    const ids=new Set(uids);p.hand=p.hand.filter(c=>!ids.has(c.uid));state.discard.push(...cards);state.request=null;
    if(analysis.type==='cancel')state.penalty=0;else state.penalty+=analysis.penaltyDelta||0;
    if(analysis.demand)state.request={type:analysis.demand,value:demandValue,by:playerId};
    state.moveNo++;
    if(!p.hand.length){state.finished=true;state.winnerId=playerId;return {ok:true,type:'play',analysis,cards,won:true};}
    p.macaoSafe=p.hand.length!==1;
    state.turn=nextPlayer(state,playerId,1+(analysis.skips||0));
    return {ok:true,type:'play',analysis,cards,needsMacao:p.hand.length===1};
  }

  function draw(state,playerId){
    if(state.finished||state.turn!==playerId)return {ok:false,reason:'To nie jest tura tego gracza'};
    recycle(state,state.shuffle);const count=state.penalty||1,taken=[];
    for(let i=0;i<count;i++){recycle(state,state.shuffle);const c=state.deck.pop();if(!c)break;taken.push(c);}
    state.players[playerId].hand.push(...taken);state.players[playerId].macaoSafe=false;state.penalty=0;state.request=null;state.moveNo++;state.turn=nextPlayer(state,playerId);
    return {ok:true,type:'draw',cards:taken,count:taken.length};
  }

  function callMacao(state,playerId){
    const p=state.players[playerId];if(!p||p.hand.length!==1)return {ok:false,reason:'Makao zgłasza się przy jednej karcie'};
    p.macaoSafe=true;return {ok:true};
  }

  function missMacao(state,playerId){
    const p=state.players[playerId];if(!p||p.hand.length!==1||p.macaoSafe)return {ok:false};
    const cards=[];for(let i=0;i<5;i++){recycle(state,state.shuffle);const c=state.deck.pop();if(c){p.hand.push(c);cards.push(c);}}
    return {ok:true,cards};
  }

  return {analyzePlay,enumeratePlays,createState,play,draw,callMacao,missMacao,isAttack,attackValue};
});
