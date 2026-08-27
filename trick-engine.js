(function(root,factory){
  const api=factory();
  if(typeof module==='object'&&module.exports)module.exports=api;
  else root.CardSandboxTrickEngine=api;
})(typeof globalThis!=='undefined'?globalThis:this,function(){
  'use strict';
  const RANKS=['9','J','Q','K','10','A'];
  const POINTS={'9':0,J:2,Q:3,K:4,'10':10,A:11};
  const MELDS={S:40,C:60,D:80,H:100};
  const strength=c=>RANKS.indexOf(c?.rank);
  const cardPoints=c=>POINTS[c?.rank]||0;
  const round10=n=>Math.round(n/10)*10;
  const next=(state,id)=>(id+1)%state.players.length;

  function createMatch({players,rules}){
    return {players:players.map((p,i)=>({...p,id:p.id??i,score:0,bombs:0})),rules,dealer:players.length-1,roundNo:0,finished:false,winnerId:null,history:[]};
  }
  function startRound(match,deck,shuffle){
    match.roundNo++;match.dealer=next(match,match.dealer);const cards=shuffle(deck.filter(c=>!c.joker));
    const state={match,players:match.players.map(p=>({...p,hand:[],tricks:[],cardPoints:0,meldPoints:0})),deck:cards,kitty:[],phase:'bidding',dealer:match.dealer,bidStarter:next(match,match.dealer),bidTurn:null,bidActive:new Set(match.players.map(p=>p.id)),highBid:100,bidder:null,contract:null,trump:null,declaredMelds:[],leader:null,turn:null,trick:[],trickNo:0,lastTrick:null,roundResult:null};
    for(let n=0;n<7;n++)state.players.forEach(p=>p.hand.push(state.deck.pop()));
    state.kitty=[state.deck.pop(),state.deck.pop(),state.deck.pop()];state.bidder=state.bidStarter;state.bidTurn=next(state,state.bidStarter);
    return state;
  }
  function bid(state,playerId,value){
    if(state.phase!=='bidding'||state.bidTurn!==playerId||!state.bidActive.has(playerId))return {ok:false,reason:'To nie jest Twoja kolej licytacji'};
    if(value==='pass')state.bidActive.delete(playerId);
    else {const amount=Number(value);if(amount<state.highBid+10||amount%10)return {ok:false,reason:`Minimalna oferta: ${state.highBid+10}`};if(amount>maxBid(state.players[playerId].hand))return {ok:false,reason:'Nie masz meldunków pozwalających na tak wysoką ofertę'};state.highBid=amount;state.bidder=playerId;}
    if(state.bidActive.size===1){state.bidder=[...state.bidActive][0];state.phase='exchange';state.players[state.bidder].hand.push(...state.kitty);return {ok:true,done:true,bidder:state.bidder,amount:state.highBid};}
    let id=playerId;do{id=next(state,id);}while(!state.bidActive.has(id));state.bidTurn=id;return {ok:true,done:false};
  }
  function maxBid(hand){return 120+Object.entries(MELDS).filter(([s])=>hasMarriage(hand,s)).reduce((n,[,v])=>n+v,0);}
  function hasMarriage(hand,suit){return hand.some(c=>c.suit===suit&&c.rank==='K')&&hand.some(c=>c.suit===suit&&c.rank==='Q');}
  function giveKittyCards(state,playerId,cardUids){
    if(state.phase!=='exchange'||state.bidder!==playerId)return {ok:false,reason:'Tylko grający rozdziela musik'};
    if(cardUids.length!==2||new Set(cardUids).size!==2)return {ok:false,reason:'Wybierz dwie różne karty'};
    const p=state.players[playerId],cards=cardUids.map(id=>p.hand.find(c=>c.uid===id));if(cards.some(c=>!c))return {ok:false,reason:'Nie znaleziono kart'};
    const rivals=[next(state,playerId),next(state,next(state,playerId))];cards.forEach((c,i)=>{p.hand=p.hand.filter(x=>x.uid!==c.uid);state.players[rivals[i]].hand.push(c);});state.phase='contract';return {ok:true,cards,rivals};
  }
  function setContract(state,playerId,amount){
    if(state.phase!=='contract'||state.bidder!==playerId)return {ok:false,reason:'Tylko grający ustala kontrakt'};
    const ceiling=Math.max(state.highBid,maxBid(state.players[playerId].hand));amount=Number(amount);if(amount<state.highBid||amount%10||amount>ceiling)return {ok:false,reason:`Kontrakt musi wynosić od ${state.highBid} do ${ceiling}`};
    state.contract=amount;state.phase='playing';state.leader=playerId;state.turn=playerId;return {ok:true};
  }
  function bomb(state,playerId){
    if(state.phase!=='contract'||state.bidder!==playerId)return {ok:false,reason:'Bombę rzuca grający przed rozpoczęciem rozgrywki'};
    const owner=state.match.players[playerId],free=owner.bombs===0;owner.bombs++;
    if(!free)state.match.players.forEach(p=>{if(p.id!==playerId&&p.score<800)p.score+=60;});
    state.phase='roundEnd';state.roundResult={bomb:true,playerId,free};checkWinner(state.match);return {ok:true,free};
  }
  function trickWinner(state,cards=state.trick){
    const lead=cards[0].card.suit,trump=state.trump;let best=cards[0];
    for(const play of cards.slice(1)){
      const a=best.card,b=play.card;
      if(b.suit===a.suit&&strength(b)>strength(a))best=play;
      else if(b.suit===trump&&a.suit!==trump)best=play;
      else if(a.suit!==trump&&a.suit!==lead&&b.suit===lead)best=play;
    }
    return best.playerId;
  }
  function legalCards(state,playerId){
    const hand=state.players[playerId].hand;if(state.phase!=='playing'||state.turn!==playerId)return [];
    if(!state.trick.length)return [...hand];const lead=state.trick[0].card.suit,currentWinner=trickWinner(state),winning=state.trick.find(x=>x.playerId===currentWinner).card;
    const follow=hand.filter(c=>c.suit===lead);
    if(follow.length){const beating=follow.filter(c=>beats(c,winning,state.trump,lead));return beating.length?beating:follow;}
    if(state.trump){const trumps=hand.filter(c=>c.suit===state.trump);if(trumps.length){const beating=trumps.filter(c=>beats(c,winning,state.trump,lead));return beating.length?beating:trumps;}}
    return [...hand];
  }
  function beats(card,other,trump,lead){
    if(card.suit===other.suit)return strength(card)>strength(other);
    if(card.suit===trump&&other.suit!==trump)return true;
    return card.suit===lead&&other.suit!==trump&&other.suit!==lead;
  }
  function meldValueForPlay(state,playerId,card){
    if(state.trick.length||!['Q','K'].includes(card?.rank)||state.declaredMelds.includes(card.suit))return 0;
    return hasMarriage(state.players[playerId].hand,card.suit)?MELDS[card.suit]:0;
  }
  function playCard(state,playerId,cardUid,{meld=false}={}){
    if(state.phase!=='playing'||state.turn!==playerId)return {ok:false,reason:'To nie jest Twoja kolej'};
    const p=state.players[playerId],card=p.hand.find(c=>c.uid===cardUid);if(!card)return {ok:false,reason:'Nie znaleziono karty'};
    if(!legalCards(state,playerId).some(c=>c.uid===cardUid))return {ok:false,reason:'Musisz dołożyć do koloru i przebić, jeśli możesz'};
    const meldValue=meld?meldValueForPlay(state,playerId,card):0;if(meld&&!meldValue)return {ok:false,reason:'Tą kartą nie można teraz zameldować'};
    p.hand=p.hand.filter(c=>c.uid!==cardUid);if(meldValue){p.meldPoints+=meldValue;state.trump=card.suit;state.declaredMelds.push(card.suit);}
    state.trick.push({playerId,card,meldValue});
    if(state.trick.length<state.players.length){state.turn=next(state,playerId);return {ok:true,trickDone:false,card,meldValue};}
    const winnerId=trickWinner(state),points=state.trick.reduce((n,x)=>n+cardPoints(x.card),0);state.players[winnerId].tricks.push(...state.trick.map(x=>x.card));state.players[winnerId].cardPoints+=points;state.lastTrick={cards:[...state.trick],winnerId,points};state.trick=[];state.trickNo++;state.leader=winnerId;state.turn=winnerId;
    if(state.trickNo===8)finishRound(state);
    return {ok:true,trickDone:true,card,meldValue,winnerId,points};
  }
  function finishRound(state){
    const bidder=state.players[state.bidder],actual=bidder.cardPoints+bidder.meldPoints,success=actual>=state.contract;
    state.players.forEach(p=>{const target=state.match.players[p.id];if(p.id===state.bidder)target.score+=success?state.contract:-state.contract;else if(target.score<800)target.score+=round10(p.cardPoints+p.meldPoints);});
    state.phase='roundEnd';state.roundResult={bidder:state.bidder,contract:state.contract,actual,success,points:state.players.map(p=>({id:p.id,cards:p.cardPoints,melds:p.meldPoints}))};checkWinner(state.match);
  }
  function checkWinner(match){const winners=match.players.filter(p=>p.score>=1000).sort((a,b)=>b.score-a.score);if(winners.length){match.finished=true;match.winnerId=winners[0].id;}}
  function aiEstimate(hand,{kittyExpected=0}={}){
    const melds=Object.keys(MELDS).filter(s=>hasMarriage(hand,s)).reduce((n,s)=>n+MELDS[s],0);let tricks=0;
    for(const suit of Object.keys(MELDS)){
      const ranks=new Set(hand.filter(c=>c.suit===suit).map(c=>c.rank));
      if(ranks.has('A'))tricks+=22;
      if(ranks.has('10'))tricks+=ranks.has('A')?13:5;
      if(ranks.has('K')&&ranks.has('A')&&ranks.has('10'))tricks+=5;
      if(hasMarriage(hand,suit))tricks+=Math.max(0,ranks.size-2)*2;
    }
    return Math.min(maxBid(hand),Math.max(100,Math.floor((melds+tricks+kittyExpected)/10)*10));
  }
  function aiGiveCards(hand){
    const pairs=[];for(let i=0;i<hand.length;i++)for(let j=i+1;j<hand.length;j++)pairs.push([hand[i],hand[j]]);
    const protectedIds=new Set();Object.keys(MELDS).forEach(s=>{if(hasMarriage(hand,s))hand.filter(c=>c.suit===s&&['Q','K'].includes(c.rank)).forEach(c=>protectedIds.add(c.uid));});
    const score=pair=>{const left=hand.filter(c=>!pair.includes(c)),empties=Object.keys(MELDS).filter(s=>!left.some(c=>c.suit===s)).length;return pair.reduce((n,c)=>n-cardPoints(c)-(protectedIds.has(c.uid)?100:0)-(['A','10'].includes(c.rank)?30:0),0)+(pair[0].suit===pair[1].suit?10:0)+empties*18;};
    return pairs.sort((a,b)=>score(b)-score(a))[0]||[];
  }
  function aiChoosePlay(state,playerId){
    const p=state.players[playerId],legal=legalCards(state,playerId);if(!legal.length)return null;
    if(!state.trick.length){
      const marriage=Object.keys(MELDS).filter(s=>hasMarriage(p.hand,s)&&!state.declaredMelds.includes(s)).sort((a,b)=>MELDS[b]-MELDS[a])[0];
      if(marriage)return {card:p.hand.find(c=>c.suit===marriage&&c.rank==='Q'),meld:true};
      const seen=new Set(state.players.flatMap(x=>x.tricks).map(c=>`${c.rank}${c.suit}`));
      const leadScore=card=>{if(card.rank==='A')return 100;if(card.rank==='10'&&seen.has(`A${card.suit}`))return 90;if(card.rank==='K'&&seen.has(`A${card.suit}`)&&seen.has(`10${card.suit}`))return 80;const suitCount=p.hand.filter(c=>c.suit===card.suit).length;return -cardPoints(card)-suitCount*2;};
      return {card:[...legal].sort((a,b)=>leadScore(b)-leadScore(a))[0],meld:false};
    }
    const marriageIds=new Set();Object.keys(MELDS).forEach(s=>{if(hasMarriage(p.hand,s)&&!state.declaredMelds.includes(s))p.hand.filter(c=>c.suit===s&&['Q','K'].includes(c.rank)).forEach(c=>marriageIds.add(c.uid));});
    const cost=c=>strength(c)+cardPoints(c)+(marriageIds.has(c.uid)?50:0);
    return {card:[...legal].sort((a,b)=>cost(a)-cost(b))[0],meld:false};
  }
  return {RANKS,POINTS,MELDS,strength,cardPoints,round10,createMatch,startRound,bid,maxBid,hasMarriage,giveKittyCards,setContract,bomb,trickWinner,legalCards,meldValueForPlay,playCard,finishRound,aiEstimate,aiGiveCards,aiChoosePlay};
});
