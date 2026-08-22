(function(root){
  'use strict';
  const ranks=['9','10','J','Q','K','A'];
  const points={'9':9,'10':10,J:11,Q:12,K:13,A:14};
  root.CardSandboxGames=root.CardSandboxGames||{};
  root.CardSandboxGames.pan={
    id:'pan', name:'Pan', order:4, featured:true, engine:'shedding',
    description:'2–4 graczy · 9♥ zaczyna · trójki z kierem, czwórki i drabinki',
    subtitle:'Historyczny Upadek Japonii: przebijaj stos, buduj drabinki i nie zbierz liter PAN.',
    definitionVersion:1,
    rules:{
      version:1,preset:'pan',deck:{count:1,jokersPerDeck:0},players:{count:2,handSize:0},
      game:{totalRounds:20,scoringMode:'letters',roundStarterMode:'required-card'},
      turn:{drawMode:'pile-take',drawCount:3},
      cardModel:{rankOrder:[...ranks],allowSubset:true,suitOrder:['S','H','D','C'],rankPoints:{...points}},
      shedding:{
        dealMode:'all',requiredStart:{rank:'9',suit:'H'},protectedBase:{rank:'9',suit:'H'},
        allowedPacketSizes:[1,3,4],tripleRequiresSuit:'H',ladderPacketSizes:[3,4],
        ladderStrictlyAscending:true,allowVoluntaryTake:true,takeCount:3,
        lossWord:'PAN',lastPlayerCanEscape:true,stalemateDrawAfter:300
      },
      meld:{entryMin:0,entryPureRunCount:0,runMin:3,setMin:3,setMax:4,aceLow:false,aceHigh:true,jokerWild:false,maxJokerFraction:1,runSameSuit:true,setDistinctSuits:true,allowRearrange:false,initialMeldOwnCardsOnly:true,tableCardsStayOnTable:true,allowPassAfterDraw:true},
      discard:{enabled:false,beforeEntry:'none',afterEntry:'none',mustUseDrawn:false,recycleWhenDeckEmpty:false,minHandToDraw:0,seedAtRoundStart:false},
      ai:{style:'careful'},rounds:[]
    }
  };
})(typeof globalThis!=='undefined'?globalThis:this);
