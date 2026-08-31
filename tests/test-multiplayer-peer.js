const {PeerTransport,peerId}=require('../multiplayer-peer.js');
function expect(name,cond,detail=''){if(!cond){console.error('FAIL',name,detail);process.exitCode=1;}else console.log('PASS',name);}
class EventTarget{constructor(){this.handlers={};}on(name,fn){(this.handlers[name]??=[]).push(fn);}emit(name,...args){for(const fn of this.handlers[name]||[])fn(...args);}}
class Connection extends EventTarget{constructor(){super();this.open=false;this.sent=[];}send(data){this.sent.push(data);}close(){this.open=false;}}
class FakePeer extends EventTarget{
  constructor(id){super();this.id=id;FakePeer.instances.push(this);}
  connect(id){this.destination=id;this.outgoing=new Connection();return this.outgoing;}
  destroy(){this.destroyed=true;}
}
FakePeer.instances=[];
expect('room code maps to stable peer id',peerId('AB12CD')==='cards-sevens-ab12cd');
const hostEvents=[],hostMessages=[];
const host=new PeerTransport({PeerClass:FakePeer,onStatus:e=>hostEvents.push(e),onMessage:m=>hostMessages.push(m)});
host.host('AB12CD');
expect('host reserves room peer id',FakePeer.instances[0].id==='cards-sevens-ab12cd');
FakePeer.instances[0].emit('open');
expect('host waits after signaling opens',hostEvents.at(-1).state==='waiting');
const incoming=new Connection();FakePeer.instances[0].emit('connection',incoming);incoming.open=true;incoming.emit('open');incoming.emit('data',{type:'PING'});
expect('host accepts data channel',hostEvents.at(-1).state==='connected'&&hostMessages[0].type==='PING');
expect('transport sends protocol hello',incoming.sent[0].type==='HELLO');
const guestEvents=[];const guest=new PeerTransport({PeerClass:FakePeer,onStatus:e=>guestEvents.push(e)});guest.join('AB12CD');
const guestPeer=FakePeer.instances.at(-1);guestPeer.emit('open');
expect('guest connects to room peer id',guestPeer.destination==='cards-sevens-ab12cd');
guestPeer.outgoing.open=true;guestPeer.outgoing.emit('open');
expect('guest channel opens',guestEvents.at(-1).state==='connected');
