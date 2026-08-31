(function(root,factory){
  const api=factory();
  if(typeof module==='object'&&module.exports) module.exports=api;
  else root.CardSandboxMultiplayer=api;
})(typeof globalThis!=='undefined'?globalThis:this,function(){
  'use strict';
  const PROTOCOL_VERSION=1;
  const ROOM_CODE_ALPHABET='ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  const clone=value=>typeof structuredClone==='function'?structuredClone(value):JSON.parse(JSON.stringify(value));
  const randomBytes=(count,random=Math.random)=>Array.from({length:count},()=>Math.floor(random()*256));
  const roomCode=(random=Math.random,length=6)=>randomBytes(length,random).map(n=>ROOM_CODE_ALPHABET[n%ROOM_CODE_ALPHABET.length]).join('');
  const reconnectToken=(random=Math.random)=>randomBytes(24,random).map(n=>n.toString(16).padStart(2,'0')).join('');
  const normalizeRoomCode=value=>String(value||'').toUpperCase().replace(/[^A-Z0-9]/g,'').slice(0,8);

  function createLobby({gameId='sevens',hostName='Gracz 1',random=Math.random}={}){
    return {protocol:PROTOCOL_VERSION,roomCode:roomCode(random),gameId,phase:'waiting',revision:0,seats:[
      {id:0,name:String(hostName||'Gracz 1').slice(0,24),connected:true,ready:true,reconnectToken:reconnectToken(random)},
      {id:1,name:'Gracz 2',connected:false,ready:false,reconnectToken:null}
    ],gameState:null,createdAt:Date.now(),updatedAt:Date.now()};
  }

  function joinLobby(lobby,{name='Gracz 2',random=Math.random}={}){
    if(!lobby||lobby.protocol!==PROTOCOL_VERSION)return{ok:false,reason:'Nieobsługiwana wersja pokoju.'};
    if(lobby.phase!=='waiting')return{ok:false,reason:'Ta rozgrywka już się rozpoczęła.'};
    const seat=lobby.seats?.[1];
    if(!seat||seat.connected)return{ok:false,reason:'Pokój jest pełny.'};
    seat.name=String(name||'Gracz 2').slice(0,24);seat.connected=true;seat.ready=true;seat.reconnectToken=reconnectToken(random);
    lobby.revision++;lobby.updatedAt=Date.now();
    return{ok:true,seatId:1,reconnectToken:seat.reconnectToken};
  }

  function reconnectLobby(lobby,token){
    const seat=lobby?.seats?.find(item=>item.reconnectToken&&item.reconnectToken===token);
    if(!seat)return{ok:false,reason:'Nie udało się odzyskać miejsca w pokoju.'};
    seat.connected=true;lobby.revision++;lobby.updatedAt=Date.now();return{ok:true,seatId:seat.id};
  }

  const hideCard=()=>({hidden:true});

  // Pełny stan pozostaje u autorytatywnego gospodarza/serwera. Widok gracza
  // nie ujawnia kolejności talii, ręki rywala ani danych potrzebnych do cofania.
  function playerView(gameState,viewerId){
    if(!gameState)return null;
    const view=clone(gameState);
    view.deck=Array.from({length:gameState.deck?.length||0},hideCard);
    view.players=(gameState.players||[]).map(player=>({...player,hand:player.id===viewerId?clone(player.hand||[]):Array.from({length:player.hand?.length||0},hideCard)}));
    for(const key of ['turnSnapshot','entryUnlockSnapshot','turnOwnedCardIds','turnStartTableIds','turnStartGroupSignatures','entryProofCardIds'])delete view[key];
    return view;
  }

  function roomView(lobby,viewerId){
    if(!lobby)return null;
    return {protocol:lobby.protocol,roomCode:lobby.roomCode,gameId:lobby.gameId,phase:lobby.phase,revision:lobby.revision,
      seats:(lobby.seats||[]).map(({reconnectToken,...seat})=>({...seat})),gameState:playerView(lobby.gameState,viewerId),updatedAt:lobby.updatedAt};
  }

  function command({roomCode:code,seatId,reconnectToken:token,revision,type,payload={}}){
    return {protocol:PROTOCOL_VERSION,roomCode:normalizeRoomCode(code),seatId:Number(seatId),reconnectToken:String(token||''),revision:Number(revision),type:String(type||''),payload:clone(payload),sentAt:Date.now()};
  }

  function validateCommand(lobby,message,{requireTurn=false}={}){
    if(!lobby||!message)return{ok:false,reason:'Brak pokoju lub polecenia.'};
    if(message.protocol!==PROTOCOL_VERSION)return{ok:false,reason:'Niezgodna wersja protokołu.'};
    if(normalizeRoomCode(message.roomCode)!==lobby.roomCode)return{ok:false,reason:'Polecenie dotyczy innego pokoju.'};
    const seat=lobby.seats?.[message.seatId];
    if(!seat||!seat.reconnectToken||seat.reconnectToken!==message.reconnectToken)return{ok:false,reason:'Nieprawidłowa sesja gracza.'};
    if(message.revision!==lobby.revision)return{ok:false,reason:'Stan gry zdążył się zmienić.',code:'stale-revision'};
    if(requireTurn&&lobby.gameState?.turn!==message.seatId)return{ok:false,reason:'Teraz jest ruch drugiego gracza.'};
    return{ok:true,seat};
  }

  function commit(lobby,mutate){
    const before=lobby.revision,result=mutate(lobby);
    if(result===false||result?.ok===false)return result||{ok:false,reason:'Ruch odrzucony.'};
    lobby.revision=before+1;lobby.updatedAt=Date.now();return{ok:true,revision:lobby.revision,result};
  }

  return{PROTOCOL_VERSION,normalizeRoomCode,roomCode,reconnectToken,createLobby,joinLobby,reconnectLobby,playerView,roomView,command,validateCommand,commit};
});
