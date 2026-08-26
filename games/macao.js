(function(root){
  'use strict';
  root.CardSandboxGames=root.CardSandboxGames||{};
  root.CardSandboxGames.macao={
    id:'macao',name:'Makao',order:5,featured:true,engine:'macao',
    description:'2–6 graczy · 5 kart · efekty, żądania i łańcuchy kar',
    subtitle:'Pozbądź się kart, broń przed karami i zdąż zawołać Makao.',
    definitionVersion:1,
    rules:{
      version:1,preset:'macao',deck:{count:1,jokersPerDeck:0},players:{count:4,handSize:5},
      game:{totalRounds:1,scoringMode:'wins',roundStarterMode:'fixed'},turn:{drawMode:'manual',drawCount:1},
      cardModel:{rankOrder:['2','3','4','5','6','7','8','9','10','J','Q','K','A'],allowSubset:false,suitOrder:['S','H','D','C'],rankPoints:{'2':2,'3':3,'4':4,'5':5,'6':6,'7':7,'8':8,'9':9,'10':10,J:10,Q:10,K:10,A:11}},
      macao:{allowedPacketSizes:[1,3,4],macaoSeconds:5,macaoMissDraw:5,attackRanks:['2','3','K'],counterKings:['KD','KC'],queenTransfers:true,jackDemandRanks:['5','6','7','8','9','10']},
      meld:{entryMin:0,entryPureRunCount:0,runMin:3,setMin:3,setMax:4,aceLow:false,aceHigh:true,jokerWild:false,maxJokerFraction:1,runSameSuit:true,setDistinctSuits:true,allowRearrange:false,initialMeldOwnCardsOnly:true,tableCardsStayOnTable:true,allowPassAfterDraw:true},
      discard:{enabled:true,beforeEntry:'none',afterEntry:'none',mustUseDrawn:false,recycleWhenDeckEmpty:true,minHandToDraw:0,seedAtRoundStart:true},battle:{},shedding:{},ai:{style:'careful'},rounds:[]
    }
  };
})(typeof globalThis!=='undefined'?globalThis:this);
