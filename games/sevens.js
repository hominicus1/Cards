(function(root){
  'use strict';

  const ranks=['2','3','4','5','6','7','8','9','10','J','Q','K','A'];
  const points={'2':2,'3':3,'4':4,'5':5,'6':6,'7':7,'8':8,'9':9,'10':10,J:10,Q:10,K:10,A:11};

  root.CardSandboxGames=root.CardSandboxGames||{};
  root.CardSandboxGames.sevens={
    id:'sevens',
    name:'Siódemki',
    order:1,
    featured:true,
    engine:'meld',
    description:'7 kart · wejście 30 · meldy, sekwensy, jokery i przebudowa stołu',
    subtitle:'Remikowy stół z przebudową meldów i podpowiedzią solvera.',
    definitionVersion:1,
    rules:{
      version:4,
      preset:'meld',
      deck:{count:2,jokersPerDeck:1},
      players:{count:2,handSize:7},
      game:{totalRounds:1},
      cardModel:{
        rankOrder:[...ranks],
        suitOrder:['S','H','D','C'],
        rankPoints:{...points}
      },
      meld:{
        entryMin:30,
        drawPerTurn:1,
        runMin:3,
        setMin:3,
        setMax:4,
        aceLow:true,
        aceHigh:true,
        jokerWild:true,
        maxJokerFraction:0.5,
        runSameSuit:true,
        setDistinctSuits:true,
        allowRearrange:true,
        initialMeldOwnCardsOnly:true,
        tableCardsStayOnTable:true,
        allowPassAfterDraw:true
      },
      ai:{style:'careful'},
      rounds:[]
    }
  };
})(typeof globalThis!=='undefined'?globalThis:this);
