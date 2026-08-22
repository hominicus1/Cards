(function(root){
  'use strict';
  const ranks=['2','3','4','5','6','7','8','9','10','J','Q','K','A'];
  const points={'2':2,'3':3,'4':4,'5':5,'6':6,'7':7,'8':8,'9':9,'10':10,J:10,Q:10,K:10,A:11};
  root.CardSandboxGames=root.CardSandboxGames||{};
  root.CardSandboxGames.rummy={
    id:'rummy', name:'Remik 51', order:3, featured:true, engine:'meld',
    description:'13 kart · wejście 51 + czysty sekwens · dobieranie i stos odrzuconych',
    subtitle:'Klasyczny polski Remik: 51 punktów, czysty sekwens, dokładanie bez rozbierania stołu i obowiązkowy zrzut.',
    definitionVersion:2,
    rules:{
      version:6,preset:'rummy51',deck:{count:2,jokersPerDeck:2},players:{count:2,handSize:13},
      game:{totalRounds:1,scoringMode:'hand-penalty',jokerHandPoints:30,penaltyLoseAt:500},
      turn:{drawMode:'manual',drawCount:1,discardRequired:true,allowMeldOutWithoutDiscard:false},
      cardModel:{rankOrder:[...ranks],suitOrder:['S','H','D','C'],rankPoints:{...points}},
      meld:{
        entryMin:51,entryPureRunCount:1,runMin:3,setMin:3,setMax:4,aceLow:true,aceHigh:true,
        jokerWild:true,maxJokerFraction:0.5,runSameSuit:true,setDistinctSuits:true,
        allowRearrange:false,allowJokerReplacement:true,initialMeldOwnCardsOnly:true,
        tableCardsStayOnTable:true,allowPassAfterDraw:true,collapseClosedNaturalSets:true
      },
      discard:{enabled:true,beforeEntry:'finish-only',afterEntry:'top-must-use',mustUseDrawn:true,recycleWhenDeckEmpty:true,minHandToDraw:3},
      ai:{style:'careful'},rounds:[]
    }
  };
})(typeof globalThis!=='undefined'?globalThis:this);
