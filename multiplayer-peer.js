(function(root,factory){
  const api=factory();
  if(typeof module==='object'&&module.exports)module.exports=api;
  else root.CardSandboxPeerTransport=api;
})(typeof globalThis!=='undefined'?globalThis:this,function(){
  'use strict';
  const PREFIX='cards-sevens-';
  const peerId=code=>PREFIX+String(code||'').toLowerCase();

  class PeerTransport{
    constructor({PeerClass,onStatus=()=>{},onMessage=()=>{},helloFactory=null}={}){
      this.PeerClass=PeerClass||globalThis.Peer;
      this.onStatus=onStatus;this.onMessage=onMessage;this.helloFactory=helloFactory;this.peer=null;this.connection=null;this.role=null;this.code='';
    }
    status(state,detail=''){this.onStatus({state,detail,role:this.role,code:this.code});}
    destroy(){try{this.connection?.close();}catch{}try{this.peer?.destroy();}catch{}this.connection=null;this.peer=null;this.role=null;}
    bindConnection(conn){
      if(this.connection?.open){conn.close();return;}
      this.connection=conn;
      conn.on('open',()=>{this.status('connected');this.send(this.helloFactory?.()||{type:'HELLO',protocol:1});});
      conn.on('data',data=>this.onMessage(data));
      conn.on('close',()=>this.status('disconnected','Drugi gracz rozłączył się. Można spróbować połączyć ponownie.'));
      conn.on('error',error=>this.status('error',error?.message||'Błąd połączenia.'));
    }
    bindPeer(peer){
      peer.on('error',error=>{
        const detail=error?.type==='unavailable-id'?'Ten kod pokoju jest już zajęty. Utwórz nowy.':error?.type==='peer-unavailable'?'Nie znaleziono pokoju. Sprawdź kod i czy gospodarz ma otwartą grę.':error?.message||'Nie udało się połączyć.';
        this.status('error',detail);
      });
      peer.on('disconnected',()=>this.status('signaling-lost','Utracono sygnalizację. Aktywna partia może nadal działać.'));
    }
    host(code){
      this.destroy();this.role='host';this.code=String(code);this.status('connecting');
      this.peer=new this.PeerClass(peerId(code));this.bindPeer(this.peer);
      this.peer.on('open',()=>this.status('waiting'));
      this.peer.on('connection',conn=>this.bindConnection(conn));
    }
    join(code){
      this.destroy();this.role='guest';this.code=String(code);this.status('connecting');
      this.peer=new this.PeerClass();this.bindPeer(this.peer);
      this.peer.on('open',()=>this.bindConnection(this.peer.connect(peerId(code),{reliable:true,serialization:'json'})));
    }
    send(message){if(!this.connection?.open)return false;this.connection.send(message);return true;}
  }
  return{PeerTransport,peerId};
});
