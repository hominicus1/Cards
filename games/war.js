(function(root){
  'use strict';
  const ranks=['2','3','4','5','6','7','8','9','10','J','Q','K','A'];
  const points={'2':2,'3':3,'4':4,'5':5,'6':6,'7':7,'8':8,'9':9,'10':10,J:11,Q:12,K:13,A:14};
  root.CardSandboxGames=root.CardSandboxGames||{};
  root.CardSandboxGames.war={
    id:'war', name:'Wojna', order:2, featured:true, engine:'battle',
    description:'2–6 graczy · cała talia · Joker > As · wojny mogą przeskakiwać między graczami',
    subtitle:'Podwórkowa Wojna: każdy remis wywołuje bitwę, jedna wielka pula i dwa jokery na talię.',
    definitionVersion:1,
    rules:{
      version:5,preset:'battle',deck:{count:1,jokersPerDeck:2},players:{count:3,handSize:0},game:{totalRounds:1},
      turn:{drawMode:'none',drawCount:0},
      cardModel:{rankOrder:[...ranks],suitOrder:['S','H','D','C'],rankPoints:{...points}},
      battle:{dealMode:'all',faceDownOnTie:1,faceUpOnTie:1,tieTrigger:'any-duplicate',tiePriority:'highest',insufficientMode:'zero',collectOrder:'winner-first-clockwise',jokerHigh:true},
      meld:{entryMin:0,runMin:3,setMin:3,setMax:4,aceLow:false,aceHigh:true,jokerWild:false,maxJokerFraction:1,runSameSuit:true,setDistinctSuits:true,allowRearrange:false,initialMeldOwnCardsOnly:true,tableCardsStayOnTable:true,allowPassAfterDraw:true},
      ai:{style:'careful'},rounds:[]
    }
  };
})(typeof globalThis!=='undefined'?globalThis:this);
