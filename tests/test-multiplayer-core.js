const MP=require('../multiplayer-core.js');
function expect(name,cond,detail=''){if(!cond){console.error('FAIL',name,detail);process.exitCode=1;}else console.log('PASS',name);}
let randomValue=0;const random=()=>{randomValue=(randomValue+0.173)%1;return randomValue;};
const lobby=MP.createLobby({gameId:'sevens',hostName:'Łukasz',random});
expect('room code is readable',/^[A-HJ-NP-Z2-9]{6}$/.test(lobby.roomCode),lobby.roomCode);
expect('host receives reconnect token',lobby.seats[0].reconnectToken.length===48);
const joined=MP.joinLobby(lobby,{name:'Ola',random});
expect('second player can join',joined.ok&&joined.seatId===1);
expect('room rejects a third player',!MP.joinLobby(lobby,{name:'Ktoś',random}).ok);
lobby.phase='playing';lobby.gameState={turn:1,deck:[{uid:'deck-1',rank:'A',suit:'S'},{uid:'deck-2',rank:'2',suit:'H'}],players:[
  {id:0,name:'Łukasz',hand:[{uid:'h0',rank:'7',suit:'D'}],entered:false},
  {id:1,name:'Ola',hand:[{uid:'h1',rank:'8',suit:'C'},{uid:'h2',rank:'9',suit:'C'}],entered:true}
],tableGroups:[{id:'g1',cards:[{uid:'t1',rank:'3',suit:'S'},{uid:'t2',rank:'4',suit:'S'},{uid:'t3',rank:'5',suit:'S'}]}],turnSnapshot:{secret:true},turnOwnedCardIds:['h2'],entryProofCardIds:['t1']};
const hostView=MP.roomView(lobby,0),guestView=MP.roomView(lobby,1);
expect('host cannot see guest cards',hostView.gameState.players[1].hand.every(c=>c.hidden));
expect('guest sees own cards',guestView.gameState.players[1].hand[0].uid==='h1');
expect('guest cannot see deck order',guestView.gameState.deck.every(c=>c.hidden&&!c.uid));
expect('public table remains visible',guestView.gameState.tableGroups[0].cards[0].uid==='t1');
expect('reconnect tokens never enter room view',hostView.seats.every(s=>!('reconnectToken'in s)));
expect('turn internals remain private',!('turnSnapshot'in guestView.gameState)&&!('entryProofCardIds'in guestView.gameState));
const msg=MP.command({roomCode:lobby.roomCode,seatId:1,reconnectToken:joined.reconnectToken,revision:lobby.revision,type:'COMMIT_TURN'});
expect('authenticated current player command accepted',MP.validateCommand(lobby,msg,{requireTurn:true}).ok);
expect('stale command rejected',MP.validateCommand(lobby,{...msg,revision:msg.revision-1}).code==='stale-revision');
expect('forged command rejected',!MP.validateCommand(lobby,{...msg,reconnectToken:'forged'},{requireTurn:true}).ok);
const oldRevision=lobby.revision,committed=MP.commit(lobby,room=>{room.gameState.turn=0;return{type:'TURN_ACCEPTED'};});
expect('accepted command increments revision',committed.ok&&lobby.revision===oldRevision+1);
expect('old command becomes stale',MP.validateCommand(lobby,msg).code==='stale-revision');
lobby.seats[1].connected=false;
expect('player can reclaim seat with token',MP.reconnectLobby(lobby,joined.reconnectToken).ok&&lobby.seats[1].connected);
