(function(root,factory){
  const api=factory();
  if(typeof module==='object'&&module.exports) module.exports=api;
  else root.CardSandboxBattleEngine=api;
})(typeof globalThis!=='undefined'?globalThis:this,function(){
  'use strict';

  function deepClone(v){return JSON.parse(JSON.stringify(v));}
  function clampInt(v,min,max){const n=parseInt(v,10);return Math.max(min,Math.min(max,Number.isFinite(n)?n:min));}

  function normalizeBattleRules(raw={}){
    const b=raw.battle||raw||{};
    return {
      dealMode:b.dealMode==='all'?'all':'all',
      faceDownOnTie:clampInt(b.faceDownOnTie??1,0,10),
      faceUpOnTie:clampInt(b.faceUpOnTie??1,1,10),
      tieTrigger:b.tieTrigger==='highest-only'?'highest-only':'any-duplicate',
      tiePriority:b.tiePriority==='lowest'?'lowest':'highest',
      insufficientMode:b.insufficientMode==='zero'?'zero':'zero',
      collectOrder:b.collectOrder==='winner-first-clockwise'?'winner-first-clockwise':'winner-first-clockwise',
      jokerHigh:b.jokerHigh!==false
    };
  }

  function rankStrength(rules,card){
    if(!card) return 0;
    if(card.joker) return rules?.battle?.jokerHigh===false ? 0 : 1000;
    const order=rules?.cardModel?.rankOrder||[];
    const idx=order.indexOf(card.rank);
    return idx>=0?idx+1:0;
  }

  function rankKey(card){return card?.joker?'JOKER':String(card?.rank??'');}

  function createState({rules,players,deck}){
    const normalized=normalizeBattleRules(rules);
    const state={
      players:players.map((p,i)=>({id:p.id??i,name:p.name??`Gracz ${i+1}`,human:!!p.human,stack:[]})),
      potByPlayer:players.map(()=>[]),
      visible:players.map(()=>null),
      forcedZero:players.map(()=>false),
      stage:'ready',
      warRank:null,
      warParticipants:[],
      battleNo:0,
      stepNo:0,
      finished:false,
      winnerId:null,
      lastEvent:null,
      lastWarFailed:[],
      rules:{...rules,battle:normalized}
    };
    const cards=[...deck];
    let seat=0;
    while(cards.length){
      state.players[seat%state.players.length].stack.push(cards.shift());
      seat++;
    }
    return state;
  }

  function activePlayerIds(state){
    return state.players.filter((p,i)=>p.stack.length>0 || state.visible[i] || state.potByPlayer[i].length>0).map(p=>p.id);
  }

  function takeTop(player){return player.stack.length?player.stack.shift():null;}

  function contribute(state,playerId,card,{faceDown=false}={}){
    if(!card)return;
    state.potByPlayer[playerId].push({...card,battleFaceDown:!!faceDown});
  }

  function duplicateGroups(state){
    const groups=new Map();
    state.visible.forEach((card,id)=>{
      if(!card || state.forcedZero[id])return;
      const key=rankKey(card);
      if(!groups.has(key))groups.set(key,[]);
      groups.get(key).push(id);
    });
    return [...groups.entries()].filter(([,ids])=>ids.length>=2).map(([key,ids])=>({key,ids,strength:rankStrength(state.rules,state.visible[ids[0]])}));
  }

  function chooseWarGroup(state){
    const dupes=duplicateGroups(state);
    if(!dupes.length)return null;
    if(state.rules.battle.tieTrigger==='highest-only'){
      const max=Math.max(...state.visible.map((c,i)=>state.forcedZero[i]?0:rankStrength(state.rules,c)));
      return dupes.find(g=>g.strength===max)||null;
    }
    dupes.sort((a,b)=>state.rules.battle.tiePriority==='lowest'?a.strength-b.strength:b.strength-a.strength);
    return dupes[0];
  }

  function uniqueWinner(state){
    let best=-1,winner=null,tied=false;
    state.visible.forEach((card,id)=>{
      const value=state.forcedZero[id]?0:rankStrength(state.rules,card);
      if(value>best){best=value;winner=id;tied=false;}
      else if(value===best && value>0){tied=true;}
    });
    if(best<=0)return null;
    return tied?null:winner;
  }

  function clockwiseIds(count,winnerId){
    const ids=[];
    for(let n=0;n<count;n++)ids.push((winnerId+n)%count);
    return ids;
  }

  function collectPot(state,winnerId){
    const order=clockwiseIds(state.players.length,winnerId);
    const captured=[];
    for(const id of order){
      for(const card of state.potByPlayer[id]){
        const clean={...card}; delete clean.battleFaceDown; captured.push(clean);
      }
    }
    state.players[winnerId].stack.push(...captured);
    state.potByPlayer=state.players.map(()=>[]);
    state.visible=state.players.map(()=>null);
    state.forcedZero=state.players.map(()=>false);
    state.warRank=null; state.warParticipants=[]; state.stage='ready';
    return captured;
  }

  function maybeFinish(state){
    const holders=state.players.filter(p=>p.stack.length>0);
    const potCount=state.potByPlayer.reduce((n,a)=>n+a.length,0);
    if(state.stage==='ready' && potCount===0 && holders.length===1){
      state.finished=true; state.winnerId=holders[0].id; state.stage='finished';
      state.lastEvent={type:'game-over',winnerId:holders[0].id}; return true;
    }
    if(state.stage==='ready' && potCount===0 && holders.length===0){
      state.finished=true; state.winnerId=null; state.stage='finished';
      state.lastEvent={type:'draw'}; return true;
    }
    return false;
  }

  function resolveCurrent(state){
    const war=chooseWarGroup(state);
    if(war){
      state.stage='war'; state.warRank=war.key; state.warParticipants=[...war.ids];
      state.lastEvent={type:'war',rank:war.key,participants:[...war.ids]};
      return state.lastEvent;
    }
    const winnerId=uniqueWinner(state);
    if(winnerId!=null){
      const wonCount=state.potByPlayer.reduce((n,a)=>n+a.length,0);
      collectPot(state,winnerId);
      state.lastEvent={type:'battle-won',winnerId,wonCount};
      maybeFinish(state);
      return state.lastEvent;
    }
    // Pat 0: wszyscy uczestnicy wojny nie byli w stanie zapłacić pełnej wojny.
    // Rozstrzygamy bez pożyczania kart: wygrywa gracz z największą liczbą kart
    // pozostających w stosie; przy pełnym remisie kolejność miejsc jest tie-breakerem.
    const candidates=state.players.map(p=>({id:p.id,count:p.stack.length})).sort((a,b)=>b.count-a.count||a.id-b.id);
    if(candidates.length){
      const winnerId=candidates[0].id;
      const wonCount=state.potByPlayer.reduce((n,a)=>n+a.length,0);
      collectPot(state,winnerId);
      state.lastEvent={type:'battle-won-fallback',winnerId,wonCount};
      maybeFinish(state);
      return state.lastEvent;
    }
    return null;
  }

  function revealOpening(state){
    state.battleNo++;
    state.lastWarFailed=[];
    state.visible=state.players.map(()=>null); state.forcedZero=state.players.map(()=>false);
    const revealed=[];
    state.players.forEach((p,id)=>{
      const card=takeTop(p);
      if(card){contribute(state,id,card);state.visible[id]=card;revealed.push(id);}
    });
    state.stepNo++; state.stage='compare';
    state.lastEvent={type:'reveal',players:revealed};
    return resolveCurrent(state);
  }

  function playWar(state){
    const participants=[...state.warParticipants];
    const need=state.rules.battle.faceDownOnTie+state.rules.battle.faceUpOnTie;
    const failed=[];
    for(const id of participants){
      const p=state.players[id];
      if(p.stack.length<need){
        state.visible[id]=null; state.forcedZero[id]=true; failed.push(id); continue;
      }
      for(let n=0;n<state.rules.battle.faceDownOnTie;n++)contribute(state,id,takeTop(p),{faceDown:true});
      let face=null;
      for(let n=0;n<state.rules.battle.faceUpOnTie;n++){
        face=takeTop(p); contribute(state,id,face,{faceDown:false});
      }
      state.visible[id]=face; state.forcedZero[id]=false;
    }
    state.stepNo++; state.stage='compare';
    state.lastWarFailed=[...failed];
    state.lastEvent={type:'war-reveal',participants,failed};
    return resolveCurrent(state);
  }

  function step(state){
    if(!state||state.finished)return state?.lastEvent||null;
    if(maybeFinish(state))return state.lastEvent;
    if(state.stage==='ready')return revealOpening(state);
    if(state.stage==='war')return playWar(state);
    return resolveCurrent(state);
  }

  function potSize(state){return state.potByPlayer.reduce((n,a)=>n+a.length,0);}

  return {normalizeBattleRules,rankStrength,rankKey,createState,activePlayerIds,duplicateGroups,chooseWarGroup,uniqueWinner,collectPot,step,potSize,deepClone};
});
