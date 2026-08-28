(function(root,factory){
  const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.CardSandboxSkatEngine=api;
})(typeof globalThis!=='undefined'?globalThis:this,function(){
  'use strict';
  const RANKS=['7','8','9','Q','K','10','A'];
  const NULL_RANKS=['7','8','9','10','J','Q','K','A'];
  const POINTS={'7':0,'8':0,'9':0,J:2,Q:3,K:4,'10':10,A:11};
  const SUIT_BASE={D:9,H:10,S:11,C:12};
  const SUIT_NAMES={D:'Szel',H:'Herc',S:'Grin',C:'Krojc'};
  const NULL_VALUES={null:23,'null-hand':35,'null-open':46,'null-open-hand':59};
  const BID_VALUES=(()=>{const s=new Set(Object.values(NULL_VALUES));for(const b of Object.values(SUIT_BASE))for(let m=2;m<=18;m++)s.add(b*m);for(let m=2;m<=11;m++)s.add(24*m);return [...s].filter(x=>x>=18&&x<=264).sort((a,b)=>a-b);})();
  const next=(state,id)=>(id+1)%state.players.length;
  const cardPoints=c=>POINTS[c?.rank]||0;
  const isJack=c=>c?.rank==='J';
  const jackOrder={C:4,S:3,H:2,D:1};

  function createMatch({players,rules={}}){return {players:players.map((p,i)=>({...p,id:p.id??i,score:0,wins:0,losses:0})),rules,dealer:players.length-1,roundNo:0,pendingRamsch:0,history:[]};}
  function dealHands(state,cards){for(let n=0;n<3;n++)state.players.forEach(p=>p.hand.push(cards.pop()));state.skat=[cards.pop(),cards.pop()];for(let n=0;n<4;n++)state.players.forEach(p=>p.hand.push(cards.pop()));for(let n=0;n<3;n++)state.players.forEach(p=>p.hand.push(cards.pop()));}
  function startRound(match,deck,shuffle){
    match.roundNo++;match.dealer=next(match,match.dealer);const cards=shuffle(deck.filter(c=>!c.joker&&['7','8','9','10','J','Q','K','A'].includes(c.rank)));
    const mode=match.pendingRamsch>0?'ramsch':'skat',forehand=next(match,match.dealer),middle=next(match,forehand),rear=match.dealer;
    const state={match,mode,phase:mode==='ramsch'?'ramsch-pass':'bidding',players:match.players.map(p=>({...p,hand:[],tricks:[],cardPoints:0})),deck:cards,skat:[],dealer:match.dealer,forehand,middle,rear,speaker:middle,listener:forehand,bidTurn:middle,pendingBid:null,highBid:0,lastBidder:null,rearEntered:false,passed:new Set(),declarer:null,tookSkat:false,discarded:[],valueCards:[],game:null,counterMultiplier:1,counterName:null,counterStage:0,counterTurn:null,counterDefenders:[],leader:forehand,turn:forehand,trick:[],trickNo:0,lastTrick:null,playedCards:[],voidCategories:match.players.map(()=>new Set()),result:null,ramschPasser:forehand,ramschPassed:0};
    dealHands(state,cards);if(mode==='ramsch'){match.pendingRamsch--;state.players[forehand].hand.push(...state.skat);state.skat=[];}return state;
  }
  function isValidBid(v){return BID_VALUES.includes(Number(v));}
  function bidMeanings(value){
    const v=Number(value),out=[];for(const [suit,base] of Object.entries(SUIT_BASE))if(v%base===0&&v/base>=2&&v/base<=18)out.push({type:'suit',suit,multiplier:v/base,label:`${SUIT_NAMES[suit]} ×${v/base}`});
    if(v%24===0&&v/24>=2&&v/24<=11)out.push({type:'grand',multiplier:v/24,label:`Grand ×${v/24}`});for(const [key,fixed] of Object.entries(NULL_VALUES))if(v===fixed)out.push({type:'null',variant:key,label:({null:'Null','null-hand':'Null Hand','null-open':'Null Ouvert','null-open-hand':'Null Ouvert Hand'})[key]});return out;
  }
  function finishBidding(state,survivor){state.declarer=survivor;state.highBid=Math.max(18,state.highBid||0);state.phase='skat-choice';state.bidTurn=null;return {ok:true,done:true,declarer:survivor,bid:state.highBid};}
  function enterRearOrFinish(state,survivor){
    if(!state.rearEntered&&survivor!==state.rear){state.rearEntered=true;state.speaker=state.rear;state.listener=survivor;state.bidTurn=state.rear;state.pendingBid=null;return {ok:true,done:false};}
    if(survivor===state.forehand&&!state.highBid&&!state.lastBidder){state.phase='forehand-choice';state.bidTurn=null;return {ok:true,done:false,forehandChoice:true};}
    return finishBidding(state,survivor);
  }
  function bid(state,playerId,action){
    if(state.phase!=='bidding'||state.bidTurn!==playerId)return {ok:false,reason:'To nie jest Twoja kolej licytacji'};
    if(playerId===state.speaker){
      if(action==='pass'){state.passed.add(playerId);return enterRearOrFinish(state,state.listener);}
      const value=Number(action);if(!isValidBid(value)||value<=state.highBid)return {ok:false,reason:'Podaj wyższą legalną wartość gry'};
      state.pendingBid=value;state.lastBidder=playerId;state.bidTurn=state.listener;return {ok:true,done:false,pending:value};
    }
    if(action==='hold'){
      if(!state.pendingBid)return {ok:false,reason:'Nie ma odzywki do utrzymania'};state.highBid=state.pendingBid;state.lastBidder=playerId;state.bidTurn=state.speaker;return {ok:true,done:false,held:state.highBid};
    }
    if(action==='pass'){state.passed.add(playerId);state.highBid=Math.max(state.highBid,state.pendingBid||0);return enterRearOrFinish(state,state.speaker);}
    return {ok:false,reason:'Odpowiedz TAK albo PAS'};
  }
  function forehandChoice(state,playerId,play){
    if(state.phase!=='forehand-choice'||playerId!==state.forehand)return {ok:false,reason:'Tylko przodek podejmuje tę decyzję'};
    if(play)return finishBidding(state,playerId);
    state.result={passed:true,delta:0};state.phase='roundEnd';state.match.history.push(state.result);return {ok:true,done:true,passed:true};
  }
  function nextBidValue(state){return BID_VALUES.find(v=>v>state.highBid)||null;}
  function chooseSkat(state,playerId,take){
    if(state.phase!=='skat-choice'||state.declarer!==playerId)return {ok:false,reason:'Tylko solista wybiera tajlong'};
    const p=state.players[playerId];state.valueCards=[...p.hand,...state.skat];state.tookSkat=!!take;
    if(take){p.hand.push(...state.skat);state.skat=[];state.phase='discard';}else state.phase='declaration';return {ok:true,phase:state.phase};
  }
  function discardToSkat(state,playerId,uids){
    if(state.phase!=='discard'||state.declarer!==playerId||uids.length!==2||new Set(uids).size!==2)return {ok:false,reason:'Odłóż dokładnie dwie karty'};
    const p=state.players[playerId],cards=uids.map(id=>p.hand.find(c=>c.uid===id));if(cards.some(c=>!c))return {ok:false,reason:'Nie znaleziono kart'};
    state.discarded=cards;p.hand=p.hand.filter(c=>!uids.includes(c.uid));state.phase='declaration';return {ok:true,cards};
  }
  function trumpSequence(type,suit){
    const jacks=['C','S','H','D'].map(s=>({rank:'J',suit:s}));if(type==='grand')return jacks;if(type==='suit')return [...jacks,...['A','10','K','Q','9','8','7'].map(rank=>({rank,suit}))];return [];
  }
  function tops(cards,type,suit){
    const seq=trumpSequence(type,suit),keys=new Set(cards.map(c=>`${c.rank}${c.suit}`)),withTop=keys.has(`${seq[0]?.rank}${seq[0]?.suit}`);let count=0;
    for(const c of seq){const has=keys.has(`${c.rank}${c.suit}`);if(has===withTop)count++;else break;}return {with:withTop,count};
  }
  function declaredLevels(game){return 1+(game.hand?1:0)+(game.schneiderAnnounced?2:0)+(game.schwarzAnnounced?2:0)+(game.open?1:0);}
  function potentialValue(cards,game){
    if(game.type==='null')return NULL_VALUES[game.open?(game.hand?'null-open-hand':'null-open'):(game.hand?'null-hand':'null')];
    const t=tops(cards,game.type,game.suit),base=game.type==='grand'?24:SUIT_BASE[game.suit];return (t.count+declaredLevels(game))*base;
  }
  function declareGame(state,playerId,game){
    if(state.phase!=='declaration'||state.declarer!==playerId)return {ok:false,reason:'Tylko solista ogłasza grę'};
    const normalized={type:game.type,suit:game.suit||null,hand:!state.tookSkat,schneiderAnnounced:!!game.schneiderAnnounced,schwarzAnnounced:!!game.schwarzAnnounced,open:!!game.open};
    if(!['suit','grand','null'].includes(normalized.type)||normalized.type==='suit'&&!SUIT_BASE[normalized.suit])return {ok:false,reason:'Wybierz poprawny rodzaj gry'};
    if(normalized.type==='null'){normalized.schneiderAnnounced=false;normalized.schwarzAnnounced=false;}
    if(state.tookSkat&&(normalized.schneiderAnnounced||normalized.schwarzAnnounced||normalized.type!=='null'&&normalized.open))return {ok:false,reason:'Zapowiedzi wymagają gry z ręki'};
    if(normalized.schwarzAnnounced)normalized.schneiderAnnounced=true;
    if(normalized.open&&normalized.type!=='null'){normalized.schneiderAnnounced=true;normalized.schwarzAnnounced=true;}
    state.game=normalized;const value=potentialValue(state.valueCards,normalized),base=normalized.type==='null'?value:(normalized.type==='grand'?24:SUIT_BASE[normalized.suit]),maximumValue=normalized.type==='null'?value:value+base*((normalized.schneiderAnnounced?0:1)+(normalized.schwarzAnnounced?0:1));
    if(maximumValue<state.highBid){const lossValue=normalized.type==='null'?value:Math.ceil(state.highBid/base)*base,delta=-2*lossValue,t=normalized.type==='null'?{with:null,count:0}:tops(state.valueCards,normalized.type,normalized.suit);state.match.players[playerId].score+=delta;state.match.players[playerId].losses++;state.result={success:false,eyes:0,tricks:0,value,maximumValue,lossValue,overbid:true,delta,tops:t,counter:1,immediate:true};state.phase='roundEnd';state.match.history.push(state.result);return {ok:true,value,maximumValue,overbid:true,done:true};}
    state.phase='counter';state.counterDefenders=[next(state,playerId),next(state,next(state,playerId))];state.counterTurn=state.counterDefenders[0];state.counterStage=0;state.counterPasses=0;return {ok:true,value};
  }
  function beginPlay(state){state.phase='playing';state.counterTurn=null;state.leader=state.forehand;state.turn=state.forehand;return {ok:true,playing:true};}
  function counterAction(state,playerId,call){
    if(state.phase!=='counter'||state.counterTurn!==playerId)return {ok:false,reason:'To nie jest Twoja kolej odzywki'};
    if(state.counterStage===0){
      if(call==='kontra'){state.counterMultiplier=2;state.counterName='KONTRA';state.counterStage=1;state.counterTurn=state.declarer;return {ok:true,call};}
      state.counterPasses++;if(state.counterPasses<2){state.counterTurn=state.counterDefenders[1];return {ok:true};}return beginPlay(state);
    }
    if(state.counterStage===1){if(call==='ryj'){state.counterMultiplier=4;state.counterName='RYJ';state.counterStage=2;state.counterPasses=0;state.counterTurn=state.counterDefenders[0];return {ok:true,call};}return beginPlay(state);}
    if(call==='zup'){state.counterMultiplier=8;state.counterName='ZUP';return beginPlay(state);}state.counterPasses++;if(state.counterPasses<2){state.counterTurn=state.counterDefenders[1];return {ok:true};}return beginPlay(state);
  }
  function isTrump(card,game){return game?.type==='grand'?isJack(card):game?.type==='suit'?(isJack(card)||card.suit===game.suit):false;}
  function category(card,game){return isTrump(card,game)?'T':card.suit;}
  function strength(card,game){if(game.type==='null')return NULL_RANKS.indexOf(card.rank);if(isJack(card))return 20+jackOrder[card.suit];return RANKS.indexOf(card.rank);}
  function legalCards(state,playerId){const hand=state.players[playerId].hand;if(state.phase!=='playing'||state.turn!==playerId)return [];if(!state.trick.length)return [...hand];const lead=category(state.trick[0].card,state.game),follow=hand.filter(c=>category(c,state.game)===lead);return follow.length?follow:[...hand];}
  function trickWinner(state,cards=state.trick){const lead=category(cards[0].card,state.game);let best=cards[0];for(const x of cards.slice(1)){const cat=category(x.card,state.game),bestCat=category(best.card,state.game);if(cat==='T'&&bestCat!=='T'||cat===bestCat&&cat===lead&&strength(x.card,state.game)>strength(best.card,state.game)||cat==='T'&&bestCat==='T'&&strength(x.card,state.game)>strength(best.card,state.game))best=x;}return best.playerId;}
  function playCard(state,playerId,uid){
    const card=state.players[playerId]?.hand.find(c=>c.uid===uid);if(!card||!legalCards(state,playerId).some(c=>c.uid===uid))return {ok:false,reason:'Musisz dołożyć do koloru lub atutu'};
    const lead=state.trick.length?category(state.trick[0].card,state.game):null;if(lead&&category(card,state.game)!==lead){state.voidCategories=state.voidCategories||state.players.map(()=>new Set());state.voidCategories[playerId]=state.voidCategories[playerId]||new Set();state.voidCategories[playerId].add(lead);}
    state.playedCards=state.playedCards||[];state.playedCards.push(card);state.players[playerId].hand=state.players[playerId].hand.filter(c=>c.uid!==uid);state.trick.push({playerId,card});if(state.trick.length<3){state.turn=next(state,playerId);return {ok:true,card,trickDone:false};}
    const winnerId=trickWinner(state),points=state.trick.reduce((n,x)=>n+cardPoints(x.card),0);state.players[winnerId].tricks.push(...state.trick.map(x=>x.card));state.players[winnerId].cardPoints+=points;state.lastTrick={cards:[...state.trick],winnerId,points};state.trick=[];state.trickNo++;state.leader=winnerId;state.turn=winnerId;if(state.game.type==='null'&&winnerId===state.declarer||state.trickNo===10)finishRound(state);return {ok:true,card,trickDone:true,winnerId,points,roundEnded:state.phase==='roundEnd'};
  }
  function actualGameValue(state){
    const game=state.game;if(game.type==='null')return potentialValue(state.valueCards,game);const declarer=state.players[state.declarer],eyes=declarer.cardPoints+state.discarded.reduce((n,c)=>n+cardPoints(c),0)+(state.tookSkat?0:state.skat.reduce((n,c)=>n+cardPoints(c),0));const tricks=declarer.tricks.length/3;
    const t=tops(state.valueCards,game.type,game.suit),base=game.type==='grand'?24:SUIT_BASE[game.suit],schneider=eyes>=90||eyes<=30,schwarz=tricks===10||tricks===0;return (t.count+declaredLevels(game)+(schneider&&!game.schneiderAnnounced?1:0)+(schwarz&&!game.schwarzAnnounced?1:0))*base;
  }
  function finishRound(state){
    if(state.mode==='ramsch')return finishRamsch(state);const p=state.players[state.declarer],eyes=p.cardPoints+state.discarded.reduce((n,c)=>n+cardPoints(c),0)+(state.tookSkat?0:state.skat.reduce((n,c)=>n+cardPoints(c),0)),tricks=p.tricks.length/3;
    let success=state.game.type==='null'?tricks===0:eyes>=61;if(state.game.schneiderAnnounced&&eyes<90)success=false;if(state.game.schwarzAnnounced&&tricks<10)success=false;
    const value=actualGameValue(state),overbid=value<state.highBid;if(overbid)success=false;const base=state.game.type==='null'?value:(state.game.type==='grand'?24:SUIT_BASE[state.game.suit]),lossValue=overbid?Math.ceil(state.highBid/base)*base:value,delta=(success?value:-2*lossValue)*state.counterMultiplier;
    state.match.players[state.declarer].score+=delta;state.match.players[state.declarer][success?'wins':'losses']++;const t=state.game.type==='null'?{with:null,count:0}:tops(state.valueCards,state.game.type,state.game.suit);
    if(success&&state.game.type==='grand'&&t.with&&t.count===4&&state.match.rules?.skat?.grandFourRamsch!==false)state.match.pendingRamsch=3;
    state.result={success,eyes,tricks,value,lossValue,overbid,delta,tops:t,counter:state.counterMultiplier};state.phase='roundEnd';state.match.history.push(state.result);return state.result;
  }
  function passRamsch(state,playerId,uids){
    if(state.phase!=='ramsch-pass'||state.ramschPasser!==playerId||uids.length!==2||new Set(uids).size!==2)return {ok:false,reason:'Przekaż dokładnie dwie karty'};const p=state.players[playerId],cards=uids.map(id=>p.hand.find(c=>c.uid===id));if(cards.some(c=>!c)||cards.some(isJack))return {ok:false,reason:'W ramszu nie wolno przesyłać waletów'};p.hand=p.hand.filter(c=>!uids.includes(c.uid));state.ramschPassed++;
    if(state.ramschPassed<3){const receiver=next(state,playerId);state.players[receiver].hand.push(...cards);state.ramschPasser=receiver;return {ok:true,done:false,receiver};}state.discarded=cards;state.game={type:'grand',suit:null};state.phase='playing';state.turn=state.forehand;state.leader=state.forehand;return {ok:true,done:true};
  }
  function finishRamsch(state){const skatEyes=state.discarded.reduce((n,c)=>n+cardPoints(c),0),lastWinner=state.lastTrick?.winnerId,all=state.players.map(p=>({id:p.id,eyes:p.cardPoints+(p.id===lastWinner?skatEyes:0),tricks:p.tricks.length/3}));const march=all.find(x=>x.tricks===10);if(march){state.match.players[march.id].score+=120;state.result={ramsch:true,march:true,winnerId:march.id,points:all,skatWinnerId:lastWinner};}else{const loser=[...all].sort((a,b)=>b.eyes-a.eyes)[0];state.match.players[loser.id].score-=loser.eyes*2;state.result={ramsch:true,march:false,loserId:loser.id,points:all,delta:-loser.eyes*2,skatWinnerId:lastWinner};}state.phase='roundEnd';state.match.history.push(state.result);return state.result;}
  function handAnalysis(hand,valueCards=hand){
    const high=hand.reduce((n,c)=>n+cardPoints(c),0),aces=hand.filter(c=>c.rank==='A').length,tens=hand.filter(c=>c.rank==='10').length,jacks=hand.filter(isJack).length,options=[];
    for(const suit of ['D','H','S','C']){const t=tops(valueCards,'suit',suit),value=(t.count+1)*SUIT_BASE[suit],trumps=hand.filter(c=>isTrump(c,{type:'suit',suit})).length,power=trumps*9+aces*12+tens*7+high*.25;options.push({type:'suit',suit,value,score:Math.round(power),label:`${SUIT_NAMES[suit]} · ${t.with?'z':'bez'} ${t.count}, gra ${t.count+1} × ${SUIT_BASE[suit]} = ${value}`,risk:!t.with&&t.count<3?'wysokie':'średnie'});}
    const gt=tops(valueCards,'grand'),grandValue=(gt.count+1)*24,grandScore=jacks*15+aces*14+tens*8+high*.2;options.push({type:'grand',value:grandValue,score:Math.round(grandScore),label:`Grand · ${gt.with?'z':'bez'} ${gt.count}, gra ${gt.count+1} × 24 = ${grandValue}`,risk:jacks<2?'wysokie':'średnie'});
    const nullDanger=hand.reduce((n,c)=>n+({A:10,K:7,Q:5,J:3,'10':2}[c.rank]||0),0)-hand.filter(c=>['7','8','9'].includes(c.rank)).length*2;options.push({type:'null',value:23,score:Math.max(0,60-nullDanger),label:'Null · stała wartość 23',risk:nullDanger>24?'wysokie':'średnie'});
    options.sort((a,b)=>b.score-a.score);return {options,recommended:options[0],cardPoints:high,aces,tens,jacks};
  }
  function aiBidLimit(hand){const a=handAnalysis(hand),best=a.options[0];return best.score>=70?best.value:best.score>=48?Math.min(best.value,36):0;}
  function aiDiscard(hand){return [...hand].sort((a,b)=>cardPoints(a)-cardPoints(b)||(isJack(a)?1:0)-(isJack(b)?1:0)).slice(0,2);}
  function compareHandCards(a,b,game,suits=['D','H','S','C']){
    const normalRanks=['7','8','9','J','Q','K','10','A'];
    if(game?.type==='null')return suits.indexOf(a.suit)-suits.indexOf(b.suit)||NULL_RANKS.indexOf(a.rank)-NULL_RANKS.indexOf(b.rank);
    const grand=game?.type==='grand',trumpSuit=game?.type==='suit'?game.suit:null,groups=[];
    if(grand)groups.push('J');
    for(const suit of suits){if(trumpSuit===suit)groups.push('J');groups.push(suit);}
    const group=card=>isJack(card)&&(grand||trumpSuit)?'J':card.suit,ga=groups.indexOf(group(a)),gb=groups.indexOf(group(b));
    if(ga!==gb)return ga-gb;
    if(group(a)==='J')return jackOrder[b.suit]-jackOrder[a.suit];
    return normalRanks.indexOf(a.rank)-normalRanks.indexOf(b.rank);
  }
  function defenceConfidence(state,id){
    const hand=state.players[id]?.hand||[],game=state.game;if(!game)return 0;
    if(game.type==='null'){
      const high=hand.filter(c=>['A','K','Q','J'].includes(c.rank)).length,longest=Math.max(...['D','H','S','C'].map(s=>hand.filter(c=>c.suit===s).length));
      return Math.round(18+high*6+longest*4-Math.max(0,(state.highBid||23)-23)*.35);
    }
    const trumps=hand.filter(c=>isTrump(c,game)),jackWeight={C:19,S:12,H:7,D:4},trumpRankWeight={A:9,'10':7,K:4,Q:3,'9':2,'8':1,'7':1};
    let score=12+trumps.reduce((n,c)=>n+(isJack(c)?jackWeight[c.suit]:trumpRankWeight[c.rank]||0),0);
    for(const suit of ['D','H','S','C']){
      if(game.type==='suit'&&suit===game.suit)continue;
      const cards=hand.filter(c=>c.suit===suit&&!isJack(c)),ranks=new Set(cards.map(c=>c.rank));
      if(ranks.has('A'))score+=10;if(ranks.has('10')&&ranks.has('A'))score+=5;if(cards.length<=1)score+=3;
    }
    score+=hand.reduce((n,c)=>n+cardPoints(c),0)*.12;
    score-=Math.min(18,Math.max(0,(state.highBid||18)-18)*.22);
    return Math.max(0,Math.round(score));
  }
  function declarerConfidence(state,id){
    const hand=state.players[id]?.hand||[],game=state.game;if(!game||id!==state.declarer)return 0;
    const option=handAnalysis(hand,state.valueCards?.length?state.valueCards:hand).options.find(o=>o.type===game.type&&(game.type!=='suit'||o.suit===game.suit));
    let score=option?.score||0;score-=Math.min(20,Math.max(0,(state.highBid||18)-(option?.value||18))*.35);
    if(game.hand)score-=5;if(game.schneiderAnnounced)score-=8;if(game.schwarzAnnounced)score-=10;if(game.open)score-=8;
    return Math.max(0,Math.round(score));
  }
  function aiCounterCall(state,id){
    if(state.phase!=='counter'||state.counterTurn!==id)return 'pass';
    if(state.counterStage===0)return id!==state.declarer&&defenceConfidence(state,id)>=76?'kontra':'pass';
    if(state.counterStage===1)return id===state.declarer&&declarerConfidence(state,id)>=96?'ryj':'pass';
    return id!==state.declarer&&defenceConfidence(state,id)>=96?'zup':'pass';
  }
  function aiPlay(state,id){
    const legal=legalCards(state,id);if(!legal.length)return null;const cheap=cards=>[...cards].sort((a,b)=>cardPoints(a)-cardPoints(b)||strength(a,state.game)-strength(b,state.game))[0];
    if(state.mode==='ramsch'){
      if(state.trick.length){const losing=legal.filter(card=>trickWinner(state,[...state.trick,{playerId:id,card}])!==id);if(losing.length)return [...losing].sort((a,b)=>cardPoints(b)-cardPoints(a)||strength(b,state.game)-strength(a,state.game))[0];return cheap(legal);}
      const suitSize=card=>state.players[id].hand.filter(c=>category(c,state.game)===category(card,state.game)).length;
      return [...legal].sort((a,b)=>cardPoints(a)-cardPoints(b)||suitSize(a)-suitSize(b)||strength(a,state.game)-strength(b,state.game))[0];
    }
    if(state.mode!=='ramsch'&&id!==state.declarer){
      const partner=state.players.find(p=>p.id!==id&&p.id!==state.declarer)?.id;
      if(state.game.type==='null'){
        if(state.trick.length===2&&trickWinner(state)===state.declarer){const keepDeclarer=legal.filter(card=>trickWinner(state,[...state.trick,{playerId:id,card}])===state.declarer);if(keepDeclarer.length)return cheap(keepDeclarer);}
        return cheap(legal);
      }
      if(state.trick.length===2){
        const currentWinner=trickWinner(state);
        if(currentWinner===partner){const keepPartner=legal.filter(card=>trickWinner(state,[...state.trick,{playerId:id,card}])===partner);if(keepPartner.length)return [...keepPartner].sort((a,b)=>cardPoints(b)-cardPoints(a)||strength(a,state.game)-strength(b,state.game))[0];}
        if(currentWinner===state.declarer){const take=legal.filter(card=>trickWinner(state,[...state.trick,{playerId:id,card}])===id);if(take.length)return cheap(take);}
      }
      if(!state.trick.length&&partner!=null){const partnerVoids=state.voidCategories?.[partner],leadToPartner=legal.filter(card=>!isTrump(card,state.game)&&partnerVoids?.has(category(card,state.game)));if(leadToPartner.length)return cheap(leadToPartner);}
      return cheap(legal);
    }
    if(state.game.type==='null')return [...legal].sort((a,b)=>strength(a,state.game)-strength(b,state.game))[0];if(!state.trick.length)return [...legal].sort((a,b)=>cardPoints(b)-cardPoints(a)||strength(b,state.game)-strength(a,state.game))[0];return cheap(legal);
  }
  function playSuggestions(state,id){
    const legal=legalCards(state,id),best=aiPlay(state,id);if(!best)return [];
    const cheap=[...legal].sort((a,b)=>cardPoints(a)-cardPoints(b)||strength(a,state.game)-strength(b,state.game))[0],winning=state.trick.length?legal.filter(card=>trickWinner(state,[...state.trick,{playerId:id,card}])===id):[];
    const active=winning.length?[...winning].sort((a,b)=>cardPoints(a)-cardPoints(b)||strength(a,state.game)-strength(b,state.game))[0]:[...legal].sort((a,b)=>strength(b,state.game)-strength(a,state.game)||cardPoints(b)-cardPoints(a))[0],cards=[];
    for(const card of [best,cheap,active])if(card&&!cards.some(x=>x.uid===card.uid))cards.push(card);
    for(const card of legal)if(cards.length<3&&!cards.some(x=>x.uid===card.uid))cards.push(card);
    const partner=state.mode!=='ramsch'&&id!==state.declarer?state.players.find(p=>p.id!==id&&p.id!==state.declarer)?.id:null,current=state.trick.length?trickWinner(state):null;
    return cards.slice(0,3).map((card,index)=>{
      let label=index===0?'POLECANE':index===1?'BEZPIECZNE':'AKTYWNE',reason='Legalna alternatywa o innym poziomie ryzyka.';
      const projected=state.trick.length?trickWinner(state,[...state.trick,{playerId:id,card}]):null;
      if(state.mode==='ramsch'){
        if(state.trick.length&&projected!==id){label=index===0?'POLECANE · ZRZUT':'ZRZUT OCZEK';reason=`Na razie nie bierzesz sztychu i oddajesz ${cardPoints(card)} oczek.`;}
        else if(state.trick.length){reason='Ta karta może przejąć sztych — wybierz ją tylko, gdy nie da się bezpiecznie zejść.';}
        else reason=index===0?'Niskie wyjście zmniejsza ryzyko zebrania sztychu.':'Inne wyjście może zmienić tempo, ale zwiększa ryzyko wzięcia.';
      }else if(state.game.type==='null'){
        if(id===state.declarer)reason=projected===id?'Ta karta grozi wzięciem sztychu — wariant ryzykowny.':'Pomaga unikać sztychu i zachować cel Nulla.';
        else reason=projected===state.declarer?'Pozostawia sztych soliście, co jest celem obrony w Nullu.':'Próbuje przygotować kolor, którym później zmusisz solistę do wzięcia.';
      }else if(partner!=null&&current===partner&&projected===partner){reason=cardPoints(card)?`Partner bierze — możesz przekazać obronie ${cardPoints(card)} oczek.`:'Partner bierze, a ta karta niepotrzebnie go nie przebija.';}
      else if(partner!=null&&current===state.declarer&&projected===id)reason='Przejmuje sztych od solisty możliwie oszczędnym ruchem.';
      else if(id===state.declarer&&projected===id)reason='Pozwala soliście utrzymać lub przejąć kontrolę nad sztychem.';
      else if(state.trick.length)reason=cardPoints(card)?`Oddajesz ${cardPoints(card)} oczek; sprawdź, która strona obecnie bierze.`:'Oszczędza wartościowe karty na późniejsze sztychy.';
      else reason=index===0?'Najlepiej pasuje do obecnego planu rozegrania.':index===1?'Oszczędza oczka i silniejsze karty.':'Próbuje przejąć inicjatywę, ale odsłania więcej siły.';
      return {card,label,reason,recommended:index===0};
    });
  }
  return {RANKS,NULL_RANKS,POINTS,SUIT_BASE,SUIT_NAMES,NULL_VALUES,BID_VALUES,cardPoints,isJack,createMatch,startRound,bid,bidMeanings,forehandChoice,nextBidValue,chooseSkat,discardToSkat,tops,potentialValue,declareGame,counterAction,isTrump,strength,legalCards,trickWinner,playCard,finishRound,passRamsch,handAnalysis,aiBidLimit,aiDiscard,compareHandCards,defenceConfidence,declarerConfidence,aiCounterCall,aiPlay,playSuggestions};
});
