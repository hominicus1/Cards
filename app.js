(() => {
  'use strict';

  const BUILD_VERSION='0.11.7';

  const SUITS = [
    { id:'S', symbol:'♠', name:'pik', red:false },
    { id:'H', symbol:'♥', name:'kier', red:true },
    { id:'D', symbol:'♦', name:'karo', red:true },
    { id:'C', symbol:'♣', name:'trefl', red:false },
  ];
  const BASE_RANKS = ['2','3','4','5','6','7','8','9','10','J','Q','K','A'];
  const DEFAULT_POINTS = { '2':2,'3':3,'4':4,'5':5,'6':6,'7':7,'8':8,'9':9,'10':10,J:10,Q:10,K:10,A:11 };

  const ids = [
    'deckCount','jokersPerDeck','playerCount','handSize','totalRounds','roundStarterMode','botStyle',
    'entryMin','entryPureRunCount','drawMode','drawCount','runMin','setMin','aceLow','aceHigh','jokerWild','allowRearrange','allowJokerReplacement','collapseClosedNaturalSets','initialMeldOwnCardsOnly',
    'rankEditor','roundRulesList','addRoundRuleBtn','applyRulesBtn','gameMenuBtn','newGameBtn','exportBtn','loadJsonBtn','syncJsonBtn','rulesJson',
    'setMax','maxJokerPercent','runSameSuit','setDistinctSuits','tableCardsStayOnTable','allowPassAfterDraw','discardRulesSection','discardEnabled','discardBeforeEntry','discardAfterEntry','discardMustUseDrawn','discardRequired','allowMeldOutWithoutDiscard','discardRecycle','discardSeedAtRoundStart','jokerHandPoints','discardMinHandToDraw','penaltyLoseAt','unenteredPenaltyBase',
    'rulesPanel','toggleEditorBtn','closeEditorInlineBtn','showRulesBtn','activeRuleHint','rulesDialog','closeRulesDialogBtn','rulesHumanView','rulesDialogSubtitle',
    'turnLabel','scoreLabel','table','opponents','deckPile','deckCountLabel','drawBtn','drawState','discardPileBox','discardPile','discardCountLabel','undoTurnBtn','endTurnBtn',
    'meldBoard','boardValidation','playerHand','humanStatus','discardHint','playerMetaScore','log','toast','gameMenu','gameMenuGrid','gameMenuFoot','currentGameName','currentGameSubtitle',
    'autoPlayBtn','helpHintsBtn','turnRulesSection','meldRulesSection','battleRulesSection','battleFaceDownCount','battleFaceUpCount','battleTieTrigger','battleTiePriority','battleJokerHigh','battleQuickPlayersWrap','battleQuickPlayers','pileTitle','boardTitle','boardHelp'
  ];
  const els = Object.fromEntries(ids.map(id => [id, document.getElementById(id)]));

  const GAME_DEFINITIONS=window.CardSandboxGames||{};
  const BattleEngine=window.CardSandboxBattleEngine||null;
  const SheddingEngine=window.CardSandboxSheddingEngine||null;
  const MacaoEngine=window.CardSandboxMacaoEngine||null;
  const TrickEngine=window.CardSandboxTrickEngine||null;
  const SkatEngine=window.CardSandboxSkatEngine||null;
  const GAME_IDS=Object.keys(GAME_DEFINITIONS).sort((a,b)=>(GAME_DEFINITIONS[a].order??999)-(GAME_DEFINITIONS[b].order??999));
  let activeGameId=GAME_IDS[0]||'sevens';
  const gameDrafts=new Map();

  let editorModel = normalizeRules(defaultRules(activeGameId));
  let rules = deepClone(editorModel);
  let state = null;
  let aiTimer = null;
  let groupUid = 1;
  let activeGroupId = null;
  let dragPayload = null;
  let tapSelection = null;
  let discardHintTimer = null;
  let discardHintCache = { key:null, count:null };
  let touchDrag = null;
  let suppressClickUntil = 0;
  let autoPlayEnabled=false;
  let helpHintsEnabled=false;
  let autoPlayTimer=null;
  let battleState=null;
  let battleAnimating=false;
  let battleResolveTimer=null;
  let sheddingState=null;
  let sheddingSelection=new Set();
  let sheddingLetters=[];
  let sheddingRoundTimer=null;
  let macaoState=null;
  let macaoSelection=new Set();
  let macaoDemandValue=null;
  let macaoTimer=null;
  let macaoDeadline=0;
  let trickMatch=null;
  let trickState=null;
  let trickSelection=[];
  let trickContractChoice=100;
  let trickMeldSelected=false;
  let trickRevealActive=false;
  let trickRevealTimer=null;
  let skatMatch=null;
  let skatState=null;
  let skatSelection=[];
  let skatDeclarationFlags={schneider:false,schwarz:false,open:false};
  let skatRevealActive=false;
  let skatRevealTimer=null;

  function gameEngine(gameId=activeGameId){ return gameDefinition(gameId)?.engine || 'meld'; }

  function gameDefinition(gameId=activeGameId) {
    return GAME_DEFINITIONS[gameId] || GAME_DEFINITIONS[GAME_IDS[0]] || null;
  }

  function defaultRules(gameId=activeGameId) {
    const def=gameDefinition(gameId);
    if(def?.rules) return deepClone(def.rules);
    return {
      version:4,preset:'meld',deck:{count:1,jokersPerDeck:0},players:{count:2,handSize:7},game:{totalRounds:1,scoringMode:'wins',jokerHandPoints:0,penaltyLoseAt:0,unenteredPenaltyBase:0,roundStarterMode:'winner'},turn:{drawMode:'manual',drawCount:1,discardRequired:false,allowMeldOutWithoutDiscard:false},
      cardModel:{rankOrder:[...BASE_RANKS],suitOrder:SUITS.map(s=>s.id),rankPoints:{...DEFAULT_POINTS}},
      meld:{entryMin:0,entryPureRunCount:0,runMin:3,setMin:3,setMax:4,aceLow:false,aceHigh:true,jokerWild:false,maxJokerFraction:1,runSameSuit:true,setDistinctSuits:true,allowRearrange:false,allowJokerReplacement:false,collapseClosedNaturalSets:false,highlightNewGroupsUntilNextHumanTurn:false,initialMeldOwnCardsOnly:true,tableCardsStayOnTable:true,allowPassAfterDraw:true},
      discard:{enabled:false,beforeEntry:'none',afterEntry:'none',mustUseDrawn:false,recycleWhenDeckEmpty:true,minHandToDraw:0,seedAtRoundStart:true},
      battle:{dealMode:'all',faceDownOnTie:1,faceUpOnTie:1,tieTrigger:'any-duplicate',tiePriority:'highest',insufficientMode:'zero',collectOrder:'winner-first-clockwise',jokerHigh:true},
      ai:{style:'careful'},rounds:[]
    };
  }

  function normalizeRules(raw) {
    const d = defaultRules(activeGameId);
    const r = raw && typeof raw === 'object' ? raw : {};
    const rankRaw = Array.isArray(r.cardModel?.rankOrder) ? r.cardModel.rankOrder.filter(x => BASE_RANKS.includes(x)) : d.cardModel.rankOrder;
    const allowSubset=r.cardModel?.allowSubset ?? d.cardModel?.allowSubset ?? false;
    const rankOrder = allowSubset?[...rankRaw]:[...rankRaw, ...BASE_RANKS.filter(x => !rankRaw.includes(x))];
    return {
      version:clampInt(r.version ?? d.version ?? 4,1,99),
      preset:String(r.preset ?? d.preset ?? 'meld'),
      deck:{
        count:clampInt(r.deck?.count ?? d.deck.count,1,8),
        jokersPerDeck:clampInt(r.deck?.jokersPerDeck ?? d.deck.jokersPerDeck,0,4)
      },
      players:{
        count:clampInt(r.players?.count ?? d.players.count,2,6),
        handSize:clampInt(r.players?.handSize ?? d.players.handSize,0,30)
      },
      game:{
        totalRounds:clampInt(r.game?.totalRounds ?? d.game.totalRounds,1,20),
        scoringMode:['wins','hand-penalty','letters'].includes(r.game?.scoringMode ?? d.game?.scoringMode)?(r.game?.scoringMode ?? d.game?.scoringMode):'wins',
        jokerHandPoints:clampInt(r.game?.jokerHandPoints ?? d.game?.jokerHandPoints ?? 0,0,100),
        penaltyLoseAt:clampInt(r.game?.penaltyLoseAt ?? d.game?.penaltyLoseAt ?? 0,0,9999),
        unenteredPenaltyBase:clampInt(r.game?.unenteredPenaltyBase ?? d.game?.unenteredPenaltyBase ?? 0,0,9999),
        roundStarterMode:['winner','clockwise','fixed','required-card'].includes(r.game?.roundStarterMode ?? d.game?.roundStarterMode)?(r.game?.roundStarterMode ?? d.game?.roundStarterMode):'winner'
      },
      turn:(()=>{
        const legacyDraw=r.meld?.drawPerTurn;
        const baseMode=d.turn?.drawMode ?? 'manual';
        const requested=String(r.turn?.drawMode ?? baseMode);
        const drawMode=['auto','manual','none'].includes(requested)?requested:baseMode;
        const baseCount=d.turn?.drawCount ?? d.meld?.drawPerTurn ?? 1;
        const drawCount=drawMode==='none'?0:clampInt(r.turn?.drawCount ?? legacyDraw ?? baseCount,0,10);
        return {drawMode,drawCount,discardRequired:r.turn?.discardRequired ?? d.turn?.discardRequired ?? false,allowMeldOutWithoutDiscard:r.turn?.allowMeldOutWithoutDiscard ?? d.turn?.allowMeldOutWithoutDiscard ?? false};
      })(),
      cardModel:{
        rankOrder,
        allowSubset,
        suitOrder:normalizeSuitOrder(r.cardModel?.suitOrder ?? d.cardModel.suitOrder),
        rankPoints:Object.fromEntries(BASE_RANKS.map(rank => [rank, clampInt(r.cardModel?.rankPoints?.[rank] ?? d.cardModel.rankPoints[rank],0,99)]))
      },
      meld:{
        entryMin:clampInt(r.meld?.entryMin ?? d.meld.entryMin,0,999),
        entryPureRunCount:clampInt(r.meld?.entryPureRunCount ?? d.meld?.entryPureRunCount ?? 0,0,5),
        runMin:clampInt(r.meld?.runMin ?? d.meld.runMin,3,13),
        setMin:clampInt(r.meld?.setMin ?? d.meld.setMin,3,4),
        setMax:clampInt(r.meld?.setMax ?? d.meld.setMax,3,13),
        aceLow:r.meld?.aceLow ?? d.meld.aceLow,
        aceHigh:r.meld?.aceHigh ?? d.meld.aceHigh,
        jokerWild:r.meld?.jokerWild ?? d.meld.jokerWild,
        maxJokerFraction:clampFloat(r.meld?.maxJokerFraction ?? d.meld.maxJokerFraction,0.01,1),
        runSameSuit:r.meld?.runSameSuit ?? d.meld.runSameSuit,
        setDistinctSuits:r.meld?.setDistinctSuits ?? d.meld.setDistinctSuits,
        allowRearrange:r.meld?.allowRearrange ?? d.meld.allowRearrange,
        allowJokerReplacement:r.meld?.allowJokerReplacement ?? d.meld?.allowJokerReplacement ?? false,
        collapseClosedNaturalSets:r.meld?.collapseClosedNaturalSets ?? d.meld?.collapseClosedNaturalSets ?? false,
        highlightNewGroupsUntilNextHumanTurn:r.meld?.highlightNewGroupsUntilNextHumanTurn ?? d.meld?.highlightNewGroupsUntilNextHumanTurn ?? false,
        initialMeldOwnCardsOnly:r.meld?.initialMeldOwnCardsOnly ?? d.meld.initialMeldOwnCardsOnly,
        tableCardsStayOnTable:r.meld?.tableCardsStayOnTable ?? d.meld.tableCardsStayOnTable,
        allowPassAfterDraw:r.meld?.allowPassAfterDraw ?? d.meld.allowPassAfterDraw
      },
      discard:(()=>{
        const base=d.discard||{};
        const before=String(r.discard?.beforeEntry ?? base.beforeEntry ?? 'none');
        const after=String(r.discard?.afterEntry ?? base.afterEntry ?? 'none');
        return {
          enabled:r.discard?.enabled ?? base.enabled ?? false,
          beforeEntry:['none','finish-only','top'].includes(before)?before:'none',
          afterEntry:['none','top','top-must-use'].includes(after)?after:'none',
          mustUseDrawn:r.discard?.mustUseDrawn ?? base.mustUseDrawn ?? false,
          recycleWhenDeckEmpty:r.discard?.recycleWhenDeckEmpty ?? base.recycleWhenDeckEmpty ?? true,
          minHandToDraw:clampInt(r.discard?.minHandToDraw ?? base.minHandToDraw ?? 0,0,30),
          seedAtRoundStart:r.discard?.seedAtRoundStart ?? base.seedAtRoundStart ?? true
        };
      })(),
      battle:BattleEngine?BattleEngine.normalizeBattleRules(r.battle ?? d.battle ?? {}):{dealMode:'all',faceDownOnTie:1,faceUpOnTie:1,tieTrigger:'any-duplicate',tiePriority:'highest',insufficientMode:'zero',collectOrder:'winner-first-clockwise',jokerHigh:true},
      shedding:deepClone(r.shedding ?? d.shedding ?? {dealMode:'all',requiredStart:{rank:'9',suit:'H'},protectedBase:{rank:'9',suit:'H'},allowedPacketSizes:[1,3,4],tripleRequiresSuit:'H',ladderPacketSizes:[3,4],ladderStrictlyAscending:true,allowVoluntaryTake:true,takeCount:3,lossWord:'PAN',lastPlayerCanEscape:true}),
      macao:deepClone(r.macao ?? d.macao ?? {allowedPacketSizes:[1,3,4],macaoSeconds:5,macaoMissDraw:5}),
      trick:deepClone(r.trick ?? d.trick ?? {kittySize:3,bidStart:100,bidStep:10,barrelAt:800,targetScore:1000}),
      skat:deepClone(r.skat ?? d.skat ?? {education:true,silesianCounters:true,grandFourRamsch:true,counterChain:['kontra','ryj','zup']}),
      ai:{ style:['careful','greedy','random'].includes(r.ai?.style) ? r.ai.style : d.ai.style },
      rounds:Array.isArray(r.rounds) ? r.rounds.map(normalizeRoundOverride).filter(Boolean) : []
    };
  }

  function normalizeRoundOverride(item) {
    if (!item || typeof item !== 'object') return null;
    const round = clampInt(item.round,1,20);
    const o = item.override && typeof item.override === 'object' ? item.override : {};
    const override = {};
    if (Number.isFinite(Number(o.handSize)) && Number(o.handSize)>0) override.handSize=clampInt(o.handSize,1,30);
    if (Number.isFinite(Number(o.entryMin)) && Number(o.entryMin)>=0) override.entryMin=clampInt(o.entryMin,0,999);
    const roundDraw=o.drawCount ?? o.drawPerTurn;
    if (Number.isFinite(Number(roundDraw)) && Number(roundDraw)>=0) override.drawCount=clampInt(roundDraw,0,10);
    if (typeof o.aceLow==='boolean') override.aceLow=o.aceLow;
    if (typeof o.aceHigh==='boolean') override.aceHigh=o.aceHigh;
    return { round, override };
  }

  function validateRules(r) {
    const issues=[];
    const total = r.deck.count * (52 + r.deck.jokersPerDeck);
    if(gameEngine()==='battle') {
      if(total<r.players.count) issues.push(`Za mało kart dla ${r.players.count} graczy.`);
      if((r.battle?.faceDownOnTie??0)+(r.battle?.faceUpOnTie??0)<1) issues.push('Wojna musi odkrywać przynajmniej jedną kartę.');
      return issues;
    }
    if(gameEngine()==='macao') {
      const count=r.deck.count*52;
      if(count<r.players.count*5+1)issues.push('Za mało kart do Makao.');
      return issues;
    }
    if(gameEngine()==='trick') {
      if(r.players.count!==3)issues.push('Podstawowy Tysiąc wymaga dokładnie 3 graczy.');
      if(r.deck.count!==1||r.cardModel.rankOrder.length!==6)issues.push('Tysiąc wymaga jednej talii 24 kart.');
      return issues;
    }
    if(gameEngine()==='skat'){
      if(r.players.count!==3)issues.push('Szkat wymaga dokładnie 3 aktywnych graczy.');
      if(r.deck.count!==1||r.cardModel.rankOrder.length!==8)issues.push('Szkat wymaga jednej talii 32 kart.');
      return issues;
    }
    if(gameEngine()==='shedding') {
      const count=r.deck.count*r.cardModel.rankOrder.length*r.cardModel.suitOrder.length;
      if(count<r.players.count)issues.push('Za mało kart do rozdania.');
      if(r.players.count>4)issues.push('Pan obsługuje od 2 do 4 graczy.');
      if(!r.cardModel.rankOrder.includes(r.shedding?.requiredStart?.rank))issues.push('Karta startowa musi należeć do talii.');
      return issues;
    }
    if(r.players.handSize<1) issues.push('Gra meldowa wymaga co najmniej 1 karty na rękę.');
    const maxHand = Math.max(r.players.handSize, ...r.rounds.map(x => Number(x.override.handSize)||0));
    const neededCards=r.players.count*maxHand+(r.discard?.enabled?1:0);
    if (neededCards > total) issues.push(`Za mało kart: potrzeba co najmniej ${neededCards}, a talie mają ${total}.`);
    if (new Set(r.cardModel.rankOrder).size !== BASE_RANKS.length) issues.push('Każda ranga musi wystąpić dokładnie raz w kolejności sekwensu.');
    if (!r.meld.aceLow && !r.meld.aceHigh) issues.push('As musi być dozwolony przynajmniej jako niski albo wysoki.');
    if (r.meld.setMin > r.meld.setMax) issues.push('Minimalna grupa nie może być większa od maksymalnej.');
    if (r.meld.setDistinctSuits && r.meld.setMax > r.cardModel.suitOrder.length) issues.push(`Przy różnych kolorach grupa nie może przekraczać ${r.cardModel.suitOrder.length} kart.`);
    if (!(r.meld.maxJokerFraction>0 && r.meld.maxJokerFraction<=1)) issues.push('Limit udziału jokerów musi być większy od 0 i nie większy niż 100%.');
    if(r.turn?.discardRequired && !r.discard?.enabled) issues.push('Obowiązkowy zrzut wymaga włączonego stosu odrzuconych.');
    if(r.meld.entryPureRunCount>0 && r.meld.runMin<3) issues.push('Czysty sekwens wejściowy wymaga legalnego sekwensu.');
    const seen=new Set();
    for (const rr of r.rounds) {
      if (seen.has(rr.round)) issues.push(`Runda ${rr.round} ma więcej niż jedno nadpisanie.`);
      seen.add(rr.round);
      if (rr.round > r.game.totalRounds) issues.push(`Reguła rundy ${rr.round} wykracza poza liczbę rund (${r.game.totalRounds}).`);
    }
    return issues;
  }

  function effectiveRules(roundNo=state?.round ?? 1) {
    const o = rules.rounds.find(x => x.round===roundNo)?.override || {};
    return {
      handSize:o.handSize ?? rules.players.handSize,
      entryMin:o.entryMin ?? rules.meld.entryMin,
      entryPureRunCount:rules.meld.entryPureRunCount ?? 0,
      drawMode:rules.turn?.drawMode ?? 'manual',
      drawCount:(rules.turn?.drawMode==='none'?0:(o.drawCount ?? rules.turn?.drawCount ?? 0)),
      discardRequired:rules.turn?.discardRequired ?? false,
      allowMeldOutWithoutDiscard:rules.turn?.allowMeldOutWithoutDiscard ?? false,
      aceLow:Object.prototype.hasOwnProperty.call(o,'aceLow') ? o.aceLow : rules.meld.aceLow,
      aceHigh:Object.prototype.hasOwnProperty.call(o,'aceHigh') ? o.aceHigh : rules.meld.aceHigh
    };
  }

  function syncFormFromEditorModel() {
    const r=editorModel;
    els.deckCount.value=r.deck.count;
    els.jokersPerDeck.value=r.deck.jokersPerDeck;
    els.playerCount.value=r.players.count;
    if(els.battleQuickPlayers) els.battleQuickPlayers.value=String(r.players.count);
    els.handSize.value=r.players.handSize;
    els.totalRounds.value=r.game.totalRounds;
    if(els.roundStarterMode) els.roundStarterMode.value=r.game?.roundStarterMode ?? 'winner';
    els.botStyle.value=r.ai.style;
    els.entryMin.value=r.meld.entryMin;
    if(els.entryPureRunCount) els.entryPureRunCount.value=r.meld.entryPureRunCount ?? 0;
    els.drawMode.value=r.turn?.drawMode ?? 'manual';
    els.drawCount.value=r.turn?.drawCount ?? 0;
    els.drawCount.disabled=els.drawMode.value==='none';
    els.runMin.value=r.meld.runMin;
    els.setMin.value=r.meld.setMin;
    els.setMax.value=r.meld.setMax;
    els.maxJokerPercent.value=Math.round(r.meld.maxJokerFraction*100);
    els.aceLow.checked=r.meld.aceLow;
    els.aceHigh.checked=r.meld.aceHigh;
    els.jokerWild.checked=r.meld.jokerWild;
    els.allowRearrange.checked=r.meld.allowRearrange;
    if(els.allowJokerReplacement) els.allowJokerReplacement.checked=!!r.meld.allowJokerReplacement;
    if(els.collapseClosedNaturalSets) els.collapseClosedNaturalSets.checked=!!r.meld.collapseClosedNaturalSets;
    els.initialMeldOwnCardsOnly.checked=r.meld.initialMeldOwnCardsOnly;
    els.runSameSuit.checked=r.meld.runSameSuit;
    els.setDistinctSuits.checked=r.meld.setDistinctSuits;
    els.tableCardsStayOnTable.checked=r.meld.tableCardsStayOnTable;
    els.allowPassAfterDraw.checked=r.meld.allowPassAfterDraw;
    if(els.discardEnabled) els.discardEnabled.checked=!!r.discard?.enabled;
    if(els.discardBeforeEntry) els.discardBeforeEntry.value=r.discard?.beforeEntry ?? 'none';
    if(els.discardAfterEntry) els.discardAfterEntry.value=r.discard?.afterEntry ?? 'none';
    if(els.discardMustUseDrawn) els.discardMustUseDrawn.checked=!!r.discard?.mustUseDrawn;
    if(els.discardRequired) els.discardRequired.checked=!!r.turn?.discardRequired;
    if(els.allowMeldOutWithoutDiscard) els.allowMeldOutWithoutDiscard.checked=!!r.turn?.allowMeldOutWithoutDiscard;
    if(els.discardRecycle) els.discardRecycle.checked=r.discard?.recycleWhenDeckEmpty!==false;
    if(els.discardSeedAtRoundStart) els.discardSeedAtRoundStart.checked=r.discard?.seedAtRoundStart!==false;
    if(els.jokerHandPoints) els.jokerHandPoints.value=r.game?.jokerHandPoints ?? 0;
    if(els.penaltyLoseAt) els.penaltyLoseAt.value=r.game?.penaltyLoseAt ?? 0;
    if(els.unenteredPenaltyBase) els.unenteredPenaltyBase.value=r.game?.unenteredPenaltyBase ?? 0;
    if(els.discardMinHandToDraw) els.discardMinHandToDraw.value=r.discard?.minHandToDraw ?? 0;
    if(els.battleFaceDownCount) els.battleFaceDownCount.value=r.battle?.faceDownOnTie ?? 1;
    if(els.battleFaceUpCount) els.battleFaceUpCount.value=r.battle?.faceUpOnTie ?? 1;
    if(els.battleTieTrigger) els.battleTieTrigger.value=r.battle?.tieTrigger ?? 'any-duplicate';
    if(els.battleTiePriority) els.battleTiePriority.value=r.battle?.tiePriority ?? 'highest';
    if(els.battleJokerHigh) els.battleJokerHigh.checked=r.battle?.jokerHigh!==false;
    syncEngineEditorVisibility();
    renderRankEditor();
    renderRoundRulesEditor();
    syncJsonText();
  }

  function readFormIntoEditorModel() {
    editorModel.deck.count=clampInt(els.deckCount.value,1,8);
    editorModel.deck.jokersPerDeck=clampInt(els.jokersPerDeck.value,0,4);
    editorModel.players.count=clampInt(els.playerCount.value,2,6);
    editorModel.players.handSize=clampInt(els.handSize.value,0,30);
    editorModel.game.totalRounds=clampInt(els.totalRounds.value,1,20);
    if(els.roundStarterMode) editorModel.game.roundStarterMode=['winner','clockwise','fixed','required-card'].includes(els.roundStarterMode.value)?els.roundStarterMode.value:(gameEngine()==='shedding'?'required-card':'winner');
    editorModel.ai.style=els.botStyle.value;
    editorModel.meld.entryMin=clampInt(els.entryMin.value,0,999);
    if(els.entryPureRunCount) editorModel.meld.entryPureRunCount=clampInt(els.entryPureRunCount.value,0,5);
    editorModel.turn=editorModel.turn||{};
    editorModel.turn.drawMode=['auto','manual','none'].includes(els.drawMode.value)?els.drawMode.value:'manual';
    editorModel.turn.drawCount=editorModel.turn.drawMode==='none'?0:clampInt(els.drawCount.value,0,10);
    if(els.discardRequired) editorModel.turn.discardRequired=els.discardRequired.checked;
    if(els.allowMeldOutWithoutDiscard) editorModel.turn.allowMeldOutWithoutDiscard=els.allowMeldOutWithoutDiscard.checked;
    els.drawCount.disabled=editorModel.turn.drawMode==='none';
    editorModel.meld.runMin=clampInt(els.runMin.value,3,13);
    editorModel.meld.setMin=clampInt(els.setMin.value,3,13);
    editorModel.meld.setMax=clampInt(els.setMax.value,3,13);
    editorModel.meld.maxJokerFraction=clampFloat(Number(els.maxJokerPercent.value)/100,0.01,1);
    editorModel.meld.aceLow=els.aceLow.checked;
    editorModel.meld.aceHigh=els.aceHigh.checked;
    editorModel.meld.jokerWild=els.jokerWild.checked;
    editorModel.meld.allowRearrange=els.allowRearrange.checked;
    if(els.allowJokerReplacement) editorModel.meld.allowJokerReplacement=els.allowJokerReplacement.checked;
    if(els.collapseClosedNaturalSets) editorModel.meld.collapseClosedNaturalSets=els.collapseClosedNaturalSets.checked;
    editorModel.meld.initialMeldOwnCardsOnly=els.initialMeldOwnCardsOnly.checked;
    editorModel.meld.runSameSuit=els.runSameSuit.checked;
    editorModel.meld.setDistinctSuits=els.setDistinctSuits.checked;
    editorModel.meld.tableCardsStayOnTable=els.tableCardsStayOnTable.checked;
    editorModel.meld.allowPassAfterDraw=els.allowPassAfterDraw.checked;
    editorModel.discard=editorModel.discard||{};
    if(els.discardEnabled) editorModel.discard.enabled=els.discardEnabled.checked;
    if(els.discardBeforeEntry) editorModel.discard.beforeEntry=els.discardBeforeEntry.value;
    if(els.discardAfterEntry) editorModel.discard.afterEntry=els.discardAfterEntry.value;
    if(els.discardMustUseDrawn) editorModel.discard.mustUseDrawn=els.discardMustUseDrawn.checked;
    if(els.discardRecycle) editorModel.discard.recycleWhenDeckEmpty=els.discardRecycle.checked;
    if(els.discardSeedAtRoundStart) editorModel.discard.seedAtRoundStart=els.discardSeedAtRoundStart.checked;
    if(els.jokerHandPoints) editorModel.game.jokerHandPoints=clampInt(els.jokerHandPoints.value,0,100);
    if(els.penaltyLoseAt) editorModel.game.penaltyLoseAt=clampInt(els.penaltyLoseAt.value,0,9999);
    if(els.unenteredPenaltyBase) editorModel.game.unenteredPenaltyBase=clampInt(els.unenteredPenaltyBase.value,0,9999);
    if(els.discardMinHandToDraw) editorModel.discard.minHandToDraw=clampInt(els.discardMinHandToDraw.value,0,30);
    editorModel.battle=editorModel.battle||{};
    if(els.battleFaceDownCount) editorModel.battle.faceDownOnTie=clampInt(els.battleFaceDownCount.value,0,10);
    if(els.battleFaceUpCount) editorModel.battle.faceUpOnTie=clampInt(els.battleFaceUpCount.value,1,10);
    if(els.battleTieTrigger) editorModel.battle.tieTrigger=els.battleTieTrigger.value==='highest-only'?'highest-only':'any-duplicate';
    if(els.battleTiePriority) editorModel.battle.tiePriority=els.battleTiePriority.value==='lowest'?'lowest':'highest';
    if(els.battleJokerHigh) editorModel.battle.jokerHigh=els.battleJokerHigh.checked;
    editorModel.battle.dealMode='all'; editorModel.battle.insufficientMode='zero'; editorModel.battle.collectOrder='winner-first-clockwise';
  }

  function syncEngineEditorVisibility(){
    const battle=gameEngine()==='battle';
    const shedding=gameEngine()==='shedding';
    const macao=gameEngine()==='macao';
    const trick=gameEngine()==='trick',skat=gameEngine()==='skat';
    if(els.meldRulesSection) els.meldRulesSection.hidden=battle||shedding||macao||trick||skat;
    if(els.battleRulesSection) els.battleRulesSection.hidden=!battle;
    if(els.discardRulesSection) els.discardRulesSection.hidden=battle||shedding||macao||trick||skat;
    if(els.turnRulesSection) els.turnRulesSection.hidden=battle||shedding||macao||trick||skat;
    const hideForSpecial=[els.handSize,els.totalRounds,els.roundStarterMode].filter(Boolean).map(el=>el.closest('label')).filter(Boolean);
    hideForSpecial.forEach(el=>el.hidden=battle||shedding||macao||trick||skat);
    const botLabel=els.botStyle?.closest('label');if(botLabel)botLabel.hidden=battle||trick||skat;
    const advanced=document.getElementById('advancedEditor'); if(advanced) advanced.hidden=false;
    const roundEditor=document.getElementById('roundEditor'); if(roundEditor) roundEditor.hidden=battle||shedding||macao||trick||skat;
  }

  function renderRankEditor() {
    els.rankEditor.innerHTML='';
    editorModel.cardModel.rankOrder.forEach((rank,index) => {
      const row=document.createElement('div'); row.className='order-row';
      row.innerHTML=`
        <div class="power">#${index+1}</div>
        <strong>${rank}</strong>
        <input type="number" min="0" max="99" value="${editorModel.cardModel.rankPoints[rank]}" title="Wartość punktowa">
        <div class="move-buttons"><button class="secondary" data-dir="-1">↑</button><button class="secondary" data-dir="1">↓</button></div>`;
      const input=row.querySelector('input');
      input.addEventListener('change',()=>{ editorModel.cardModel.rankPoints[rank]=clampInt(input.value,0,99); syncJsonText(); });
      row.querySelectorAll('button').forEach(btn => btn.addEventListener('click',()=>moveRank(index,Number(btn.dataset.dir))));
      els.rankEditor.appendChild(row);
    });
  }

  function moveRank(index,dir) {
    const target=index+dir;
    if (target<0 || target>=editorModel.cardModel.rankOrder.length) return;
    [editorModel.cardModel.rankOrder[index],editorModel.cardModel.rankOrder[target]]=[editorModel.cardModel.rankOrder[target],editorModel.cardModel.rankOrder[index]];
    renderRankEditor(); syncJsonText();
  }

  function addRoundRule(initial=null) {
    const used=new Set(editorModel.rounds.map(x=>x.round));
    let next=1; while (used.has(next) && next<=editorModel.game.totalRounds) next++;
    editorModel.rounds.push(initial || {round:Math.min(next,editorModel.game.totalRounds),override:{}});
    renderRoundRulesEditor(); syncJsonText();
  }

  function renderRoundRulesEditor() {
    els.roundRulesList.innerHTML='';
    editorModel.rounds.sort((a,b)=>a.round-b.round).forEach((rr,index)=>{
      const box=document.createElement('div'); box.className='round-rule';
      box.innerHTML=`
        <div class="round-rule-head"><span>Runda</span><input class="rr-round" type="number" min="1" max="${editorModel.game.totalRounds}" value="${rr.round}"><button class="secondary remove-round-rule">Usuń</button></div>
        <div class="round-rule-grid">
          <label>Kart na rękę<input class="rr-hand" type="number" min="1" max="30" placeholder="bazowe" value="${rr.override.handSize ?? ''}"></label>
          <label>Minimum wejścia<input class="rr-entry" type="number" min="0" max="999" placeholder="bazowe" value="${rr.override.entryMin ?? ''}"></label>
          <label>Kart dobieranych<input class="rr-draw" type="number" min="0" max="10" placeholder="bazowe" value="${rr.override.drawCount ?? ''}"></label>
          <label>As niski<select class="rr-ace-low"><option value="__base">bazowo</option><option value="true">tak</option><option value="false">nie</option></select></label>
          <label>As wysoki<select class="rr-ace-high"><option value="__base">bazowo</option><option value="true">tak</option><option value="false">nie</option></select></label>
        </div>`;
      setSelectValue(box.querySelector('.rr-ace-low'),Object.prototype.hasOwnProperty.call(rr.override,'aceLow')?String(rr.override.aceLow):'__base');
      setSelectValue(box.querySelector('.rr-ace-high'),Object.prototype.hasOwnProperty.call(rr.override,'aceHigh')?String(rr.override.aceHigh):'__base');
      box.addEventListener('change',()=>updateRoundRuleFromBox(index,box));
      box.querySelector('.remove-round-rule').addEventListener('click',()=>{ editorModel.rounds.splice(index,1); renderRoundRulesEditor(); syncJsonText(); });
      els.roundRulesList.appendChild(box);
    });
  }

  function updateRoundRuleFromBox(index,box) {
    const override={};
    const hand=box.querySelector('.rr-hand').value;
    const entry=box.querySelector('.rr-entry').value;
    const draw=box.querySelector('.rr-draw').value;
    const low=box.querySelector('.rr-ace-low').value;
    const high=box.querySelector('.rr-ace-high').value;
    if (hand!=='') override.handSize=clampInt(hand,1,30);
    if (entry!=='') override.entryMin=clampInt(entry,0,999);
    if (draw!=='') override.drawCount=clampInt(draw,0,10);
    if (low!=='__base') override.aceLow=low==='true';
    if (high!=='__base') override.aceHigh=high==='true';
    editorModel.rounds[index]={round:clampInt(box.querySelector('.rr-round').value,1,editorModel.game.totalRounds),override};
    syncJsonText();
  }

  function syncJsonText() {
    readFormIntoEditorModel();
    els.rulesJson.value=JSON.stringify(editorModel,null,2);
  }

  function applyRules() {
    syncJsonText();
    const normalized=normalizeRules(editorModel);
    const issues=validateRules(normalized);
    if (issues.length) { toast(issues[0]); return; }
    editorModel=normalized; rules=deepClone(normalized); gameDrafts.set(activeGameId,deepClone(editorModel)); syncFormFromEditorModel(); newGame();
  }

  function loadJson() {
    try {
      const normalized=normalizeRules(JSON.parse(els.rulesJson.value));
      const issues=validateRules(normalized); if (issues.length) throw new Error(issues.join('\n'));
      editorModel=normalized; syncFormFromEditorModel(); toast('Reguły wczytane. Kliknij „Zastosuj i rozdaj”.');
    } catch(err) { toast(`Błąd JSON: ${err.message}`); }
  }

  function exportJson() {
    syncJsonText();
    const blob=new Blob([els.rulesJson.value],{type:'application/json'});
    const url=URL.createObjectURL(blob); const a=document.createElement('a'); a.href=url; a.download=`card-sandbox-${activeGameId}-v${BUILD_VERSION}.json`; a.click(); URL.revokeObjectURL(url);
  }

  function makeDeck() {
    const cards=[]; let uid=1;
    for (let d=0; d<rules.deck.count; d++) {
      for (const suitId of rules.cardModel.suitOrder) for (const rank of rules.cardModel.rankOrder) cards.push({uid:`c${uid++}`,deckIndex:d,suit:suitId,rank,joker:false});
      for (let j=0;j<rules.deck.jokersPerDeck;j++) cards.push({uid:`c${uid++}`,deckIndex:d,suit:null,rank:'JOKER',joker:true});
    }
    return shuffle(cards);
  }

  function setPlayerCount(value,{restart=true}={}) {
    const count=clampInt(value,2,gameEngine()==='shedding'?4:6);
    editorModel.players.count=count;
    rules.players.count=count;
    if(els.playerCount) els.playerCount.value=String(count);
    if(els.battleQuickPlayers) els.battleQuickPlayers.value=String(count);
    gameDrafts.set(activeGameId,deepClone(editorModel));
    syncJsonText();
    if(restart) {
      if(autoPlayEnabled) setAutoPlay(false,{quiet:true});
      newGame();
      toast(`${gameDefinition()?.name||'Gra'}: ${count} graczy`);
    }
  }

  const UNIVERSAL_SEAT_LAYOUTS={
    2:['top-center'],
    3:['top-left','top-right'],
    4:['side-left','top-center','side-right'],
    5:['side-left','top-left','top-right','side-right'],
    6:['side-left','top-left','top-center','top-right','side-right']
  };

  function opponentSeatSlot(opponentIndex,totalPlayers) {
    const layout=UNIVERSAL_SEAT_LAYOUTS[clampInt(totalPlayers,2,6)]||UNIVERSAL_SEAT_LAYOUTS[2];
    return layout[opponentIndex]||'top-center';
  }

  function prepareUniversalSeating(playerCount) {
    document.body.dataset.seating='universal';
    if(els.table) els.table.dataset.playerCount=String(clampInt(playerCount,2,6));
    if(els.battleQuickPlayersWrap) els.battleQuickPlayersWrap.hidden=false;
    if(els.battleQuickPlayers){[...els.battleQuickPlayers.options].forEach(o=>o.disabled=false);els.battleQuickPlayers.value=String(clampInt(playerCount,2,6));els.battleQuickPlayers.setAttribute('aria-label','Liczba graczy');}
  }

  function newGame() {
    clearTimeout(autoPlayTimer);clearInterval(macaoTimer);clearTimeout(trickRevealTimer);trickRevealActive=false;clearTimeout(skatRevealTimer);skatRevealActive=false;
    if(gameEngine()==='battle') return newBattleGame();
    if(gameEngine()==='shedding') return newSheddingGame();
    if(gameEngine()==='macao') return newMacaoGame();
    if(gameEngine()==='trick') return newTrickGame();
    if(gameEngine()==='skat') return newSkatGame();
    battleState=null;
    sheddingState=null;
    macaoState=null;
    trickState=null;trickMatch=null;
    skatState=null;skatMatch=null;
    return newMeldGame();
  }

  function newTrickGame(){
    clearTimeout(aiTimer);clearTimeout(autoPlayTimer);if(!TrickEngine){toast('Brak silnika trick-engine.js');return;}
    const issues=validateRules(rules);if(issues.length){toast(issues[0]);return;}
    state=null;battleState=null;sheddingState=null;macaoState=null;trickSelection=[];logClear();
    const players=Array.from({length:3},(_,i)=>({id:i,name:i===0?'Ty':`Bot ${i}`,human:i===0}));
    trickMatch=TrickEngine.createMatch({players,rules});startTrickRound();
  }
  function startTrickRound(){
    clearTimeout(trickRevealTimer);trickRevealActive=false;let redeals=0,lastRedeal=null;
    do{trickState=TrickEngine.startRound(trickMatch,makeDeck(),shuffle,{redeal:redeals>0});if(trickState.phase==='redeal'){lastRedeal=trickState.redealReasons[0];redeals++;}}while(trickState.phase==='redeal'&&redeals<100);
    trickSelection=[];trickContractChoice=100;trickMeldSelected=false;sortTrickHands();
    if(lastRedeal){const player=trickState.players[lastRedeal.playerId],r=lastRedeal.reason,why=r.type==='four-nines'?'cztery dziewiątki':`${r.points} pkt na ręce`;const message=`Nieważne rozdanie: ${player.name} — ${why}. Rozdano ponownie.`;log(message);toast(message);}
    log(`Tysiąc · rozdanie ${trickMatch.roundNo}. ${trickState.players[trickState.bidStarter].name} otwiera licytację za 100.`);render();scheduleTrickTurn();
  }
  function sortTrickHands(){if(!trickState)return;const ranks=TrickEngine.RANKS,suits=rules.cardModel.suitOrder;trickState.players.forEach(p=>p.hand.sort((a,b)=>suits.indexOf(a.suit)-suits.indexOf(b.suit)||ranks.indexOf(a.rank)-ranks.indexOf(b.rank)));}
  function trickHumanCanAct(){if(!trickState||trickMatch?.finished||trickRevealActive)return false;const phase=trickState.phase;if(phase==='bidding')return trickState.bidTurn===0;if(phase==='exchange'||phase==='contract')return trickState.bidder===0;if(phase==='playing')return trickState.turn===0;return phase==='roundEnd';}
  function toggleTrickCard(uid){
    if(!trickHumanCanAct()||!['exchange','playing'].includes(trickState.phase)||autoPlayEnabled)return;
    const at=trickSelection.indexOf(uid);if(at>=0)trickSelection.splice(at,1);else if(trickState.phase==='exchange'&&trickSelection.length<2)trickSelection.push(uid);else{trickSelection=[uid];trickMeldSelected=false;}render();
  }
  function humanTrickBid(value){const r=TrickEngine.bid(trickState,0,value);if(!r.ok){toast(r.reason);return;}log(`Ty: ${value==='pass'?'pas':value}.`);afterTrickPhaseAction();}
  function giveHumanKittyCards(){const r=TrickEngine.giveKittyCards(trickState,0,trickSelection);if(!r.ok){toast(r.reason);return false;}log(`Oddajesz ${cardShort(r.cards[0])} graczowi ${trickState.players[r.rivals[0]].name}, a ${cardShort(r.cards[1])} graczowi ${trickState.players[r.rivals[1]].name}.`);trickSelection=[];sortTrickHands();trickContractChoice=trickState.highBid;afterTrickPhaseAction();return true;}
  function setHumanContract(){const r=TrickEngine.setContract(trickState,0,trickContractChoice);if(!r.ok){toast(r.reason);return;}log(`Grasz ${trickContractChoice}.`);afterTrickPhaseAction();}
  function humanBomb(){const r=TrickEngine.bomb(trickState,0);if(!r.ok){toast(r.reason);return;}log(r.free?'Rzucasz pierwszą, bezpłatną bombę.':'Rzucasz bombę — przeciwnicy otrzymują po 60.');afterTrickPhaseAction();}
  function playHumanTrickCard(){
    if(trickSelection.length!==1){toast('Wybierz jedną kartę');return;}const r=TrickEngine.playCard(trickState,0,trickSelection[0],{meld:trickMeldSelected});if(!r.ok){toast(r.reason);return;}
    logTrickPlay(0,r);trickSelection=[];trickMeldSelected=false;sortTrickHands();afterTrickPhaseAction();
  }
  function logTrickPlay(playerId,r){let text=`${trickState.players[playerId].name}: ${cardShort(r.card)}`;if(r.meldValue)text+=` · melduje ${r.meldValue}, atu ${suitSymbol(r.card.suit)}`;log(text+'.');if(r.trickDone){trickRevealActive=true;log(`${trickState.players[r.winnerId].name} bierze lewę za ${r.points}.`);}if(trickState.phase==='roundEnd')logTrickRoundResult();}
  function logTrickRoundResult(){const x=trickState.roundResult;if(!x||x.bomb)return;log(`${trickState.players[x.bidder].name}: kontrakt ${x.contract}, zdobyte ${x.actual} — ${x.success?'UGRANY':'PRZEGRANY'}.`);}
  function afterTrickPhaseAction(){
    render();if(!trickRevealActive){scheduleTrickTurn();return;}
    clearTimeout(trickRevealTimer);trickRevealTimer=setTimeout(()=>{trickRevealActive=false;render();scheduleTrickTurn();},autoPlayEnabled?550:1500);
  }
  function scheduleTrickTurn(){
    clearTimeout(aiTimer);clearTimeout(autoPlayTimer);if(!trickState||trickMatch.finished||trickRevealActive)return;
    if(trickState.phase==='roundEnd'){if(autoPlayEnabled)autoPlayTimer=setTimeout(startTrickRound,300);return;}
    let id=null;if(trickState.phase==='bidding')id=trickState.bidTurn;else if(['exchange','contract'].includes(trickState.phase))id=trickState.bidder;else if(trickState.phase==='playing')id=trickState.turn;
    if(id!==0)aiTimer=setTimeout(()=>trickAiAct(id),autoPlayEnabled?180:620);else if(autoPlayEnabled)autoPlayTimer=setTimeout(()=>trickAiAct(0),180);
  }
  function trickAiAct(id){
    if(!trickState||trickMatch.finished)return;
    if(trickState.phase==='bidding'){
      const ceiling=TrickEngine.aiEstimate(trickState.players[id].hand,{kittyExpected:15}),value=trickState.highBid+10<=ceiling?trickState.highBid+10:'pass';const r=TrickEngine.bid(trickState,id,value);if(r.ok)log(`${trickState.players[id].name}: ${value==='pass'?'pas':value}.`);
    }else if(trickState.phase==='exchange'){
      const cards=TrickEngine.aiGiveCards(trickState.players[id].hand);const r=TrickEngine.giveKittyCards(trickState,id,cards.map(c=>c.uid));if(r.ok){log(`${trickState.players[id].name} rozdziela dwie karty z musika.`);sortTrickHands();}
    }else if(trickState.phase==='contract'){
      const amount=trickState.highBid;if(TrickEngine.aiEstimate(trickState.players[id].hand)<amount){const r=TrickEngine.bomb(trickState,id);log(r.free?`${trickState.players[id].name} rzuca bezpłatną bombę.`:`${trickState.players[id].name} rzuca bombę — rywale +60.`);}else{TrickEngine.setContract(trickState,id,amount);log(`${trickState.players[id].name} gra ${amount}.`);}
    }else if(trickState.phase==='playing'){
      const choice=TrickEngine.aiChoosePlay(trickState,id),r=TrickEngine.playCard(trickState,id,choice.card.uid,{meld:choice.meld});if(r.ok)logTrickPlay(id,r);
    }
    afterTrickPhaseAction();
  }
  function cardShort(c){return `${c.rank}${suitSymbol(c.suit)}`;}

  function newMacaoGame(){
    clearTimeout(aiTimer);clearTimeout(autoPlayTimer);clearInterval(macaoTimer);
    if(!MacaoEngine){toast('Brak silnika macao-engine.js');return;}
    const issues=validateRules(rules);if(issues.length){toast(issues[0]);return;}
    state=null;battleState=null;sheddingState=null;macaoSelection.clear();macaoDemandValue=null;logClear();
    const players=Array.from({length:rules.players.count},(_,i)=>({id:i,name:i===0?'Ty':`Bot ${i}`,human:i===0}));
    macaoState=MacaoEngine.createState({players,deck:makeDeck(),shuffle});sortMacaoHands();
    log(`Makao: po 5 kart. Zaczynasz na ${macaoState.discard.at(-1).rank}${suitSymbol(macaoState.discard.at(-1).suit)}.`);
    render();scheduleMacaoTurn();
  }

  function sortMacaoHands(){
    if(!macaoState)return;const ranks=rules.cardModel.rankOrder,suits=rules.cardModel.suitOrder;
    macaoState.players.forEach(p=>p.hand.sort((a,b)=>ranks.indexOf(a.rank)-ranks.indexOf(b.rank)||suits.indexOf(a.suit)-suits.indexOf(b.suit)));
  }
  function selectedMacaoCards(){return (macaoState?.players[0]?.hand||[]).filter(c=>macaoSelection.has(c.uid));}
  function toggleMacaoCard(uid){
    if(!macaoState||macaoState.finished||macaoState.turn!==0||autoPlayEnabled)return;
    if(macaoSelection.has(uid))macaoSelection.delete(uid);else macaoSelection.add(uid);macaoDemandValue=null;render();
  }
  function playMacaoSelection(playerId=0,cards=null,demandValue=null){
    const chosen=cards||selectedMacaoCards();
    const result=MacaoEngine.play(macaoState,playerId,chosen.map(c=>c.uid),{demandValue:demandValue??macaoDemandValue});
    if(!result.ok){if(playerId===0)toast(result.reason);return false;}
    log(`${macaoState.players[playerId].name}: ${result.analysis.label}${macaoState.request?` · żąda ${macaoState.request.value}`:''}.`);
    if(macaoState.request&&playerId!==0)toast(macaoRequestLabel(macaoState.request));
    macaoSelection.clear();macaoDemandValue=null;sortMacaoHands();
    if(result.won){clearInterval(macaoTimer);toast(`${macaoState.players[playerId].name} wygrywa!`);setAutoPlay(false,{quiet:true});render();return true;}
    if(result.needsMacao){
      if(playerId===0&&!autoPlayEnabled){startMacaoCountdown();render();return true;}
      MacaoEngine.callMacao(macaoState,playerId);
    }
    render();scheduleMacaoTurn();return true;
  }
  function drawMacao(playerId=0){
    const result=MacaoEngine.draw(macaoState,playerId);if(!result.ok){if(playerId===0)toast(result.reason);return false;}
    log(`${macaoState.players[playerId].name} dobiera ${result.count}${result.count>1?' kart':' kartę'}.`);macaoSelection.clear();sortMacaoHands();render();scheduleMacaoTurn();return true;
  }
  function startMacaoCountdown(){
    clearInterval(macaoTimer);macaoDeadline=Date.now()+5000;
    macaoTimer=setInterval(()=>{
      if(!macaoState||macaoState.players[0].macaoSafe||macaoState.players[0].hand.length!==1){clearInterval(macaoTimer);render();return;}
      if(Date.now()>=macaoDeadline){clearInterval(macaoTimer);const miss=MacaoEngine.missMacao(macaoState,0);if(miss.ok){sortMacaoHands();log('Nie zawołałeś Makao — dobierasz 5 kart.');toast('Za późno: +5 kart');}render();scheduleMacaoTurn();}
      else render();
    },100);
  }
  function callHumanMacao(){const result=MacaoEngine.callMacao(macaoState,0);if(result.ok){clearInterval(macaoTimer);log('Ty: MAKAO!');toast('MAKAO!');render();scheduleMacaoTurn();}}
  function macaoAiTurn(playerId){
    if(!macaoState||macaoState.finished||macaoState.turn!==playerId)return;
    const plays=MacaoEngine.enumeratePlays(macaoState,macaoState.players[playerId].hand),pick=plays[0];
    if(!pick)return drawMacao(playerId);
    const demand=pick.analysis.demand==='suit'?mostCommonSuit(macaoState.players[playerId].hand):pick.analysis.demand==='rank'?mostCommonRank(macaoState.players[playerId].hand):null;
    playMacaoSelection(playerId,pick.cards,demand);
  }
  function mostCommonSuit(cards){return ['S','H','D','C'].sort((a,b)=>cards.filter(c=>c.suit===b).length-cards.filter(c=>c.suit===a).length)[0];}
  function mostCommonRank(cards){return ['5','6','7','8','9','10'].sort((a,b)=>cards.filter(c=>c.rank===b).length-cards.filter(c=>c.rank===a).length)[0];}
  function macaoRequestLabel(request){
    if(!request)return '';
    if(request.type==='rank')return `WALET ŻĄDA: ${request.value}`;
    return `AS ŻĄDA: ${suitSymbol(request.value)} ${suitName(request.value).toUpperCase()}`;
  }
  function scheduleMacaoTurn(){
    clearTimeout(aiTimer);clearTimeout(autoPlayTimer);if(!macaoState||macaoState.finished)return;
    const p=macaoState.players[macaoState.turn];
    if(!p.human)aiTimer=setTimeout(()=>macaoAiTurn(p.id),autoPlayEnabled?220:650);
    else if(autoPlayEnabled)autoPlayTimer=setTimeout(()=>macaoAiTurn(p.id),180);
  }

  function newSheddingGame(){
    clearTimeout(aiTimer);clearTimeout(autoPlayTimer);clearTimeout(sheddingRoundTimer);
    if(!SheddingEngine){toast('Brak silnika shedding-engine.js');return;}
    const issues=validateRules(rules);if(issues.length){toast(issues[0]);return;}
    state=null;battleState=null;sheddingSelection.clear();sheddingLetters=Array(rules.players.count).fill('');logClear();
    startSheddingRound();
  }

  function startSheddingRound(){
    const players=Array.from({length:rules.players.count},(_,i)=>({id:i,name:i===0?'Ty':`Bot ${i}`,human:i===0}));
    sheddingState=SheddingEngine.createState({rules,players,deck:makeDeck(),letters:sheddingLetters});
    sortSheddingHands();
    sheddingSelection.clear();
    log(`Pan: rozdano ${rules.cardModel.rankOrder.length*4} karty. Zaczyna ${sheddingState.players[sheddingState.turn].name}, bo ma 9♥.`);
    render();scheduleSheddingTurn();
  }

  function selectedSheddingCards(){
    const hand=sheddingState?.players?.[0]?.hand||[];
    return hand.filter(c=>sheddingSelection.has(c.uid));
  }

  function sortSheddingHands(){
    if(!sheddingState)return;
    const rankOrder=rules.cardModel.rankOrder,suitOrder=rules.cardModel.suitOrder;
    sheddingState.players.forEach(player=>player.hand.sort((a,b)=>{
      const rankDiff=rankOrder.indexOf(a.rank)-rankOrder.indexOf(b.rank);
      return rankDiff||suitOrder.indexOf(a.suit)-suitOrder.indexOf(b.suit)||String(a.uid).localeCompare(String(b.uid));
    }));
  }

  function toggleSheddingCard(uid){
    if(!sheddingState||sheddingState.roundOver||sheddingState.finished||sheddingState.turn!==0||autoPlayEnabled)return;
    if(sheddingSelection.has(uid))sheddingSelection.delete(uid);else sheddingSelection.add(uid);
    render();
  }

  function playSheddingSelection(playerId=0,cards=null){
    if(!sheddingState)return false;
    const chosen=cards||selectedSheddingCards();
    const result=SheddingEngine.play(sheddingState,rules,playerId,chosen.map(c=>c.uid));
    if(!result.ok){if(playerId===0)toast(result.reason);return false;}
    log(`${sheddingState.players[playerId].name}: ${result.analysis.label}.`);sheddingSelection.clear();
    afterSheddingAction();return true;
  }

  function takeFromSheddingPile(playerId=0){
    if(!sheddingState)return false;
    const result=SheddingEngine.take(sheddingState,rules,playerId);
    if(!result.ok){if(playerId===0)toast(result.reason);return false;}
    sortSheddingHands();
    log(`${sheddingState.players[playerId].name} bierze ${result.cards.length} ${result.cards.length===1?'kartę':'karty'} ze stosu.`);
    sheddingSelection.clear();afterSheddingAction();return true;
  }

  function afterSheddingAction(){
    if(sheddingState.roundOver){finishSheddingRound();return;}
    render();scheduleSheddingTurn();
  }

  function finishSheddingRound(){
    if(sheddingState.draw){log(sheddingState.stalemate?'Zakleszczenie autoplay — rozdanie zakończone remisem bez litery.':'Wszyscy zeszli z kart — rozdanie bez przegranego.');toast('Remis — nikt nie dostaje litery');}
    else if(sheddingState.loserId!=null){
      const id=sheddingState.loserId,word=rules.shedding.lossWord||'PAN';
      sheddingLetters[id]=(sheddingLetters[id]||'')+word[(sheddingLetters[id]||'').length];
      sheddingState.players[id].letters=sheddingLetters[id];
      log(`${sheddingState.players[id].name} zostaje z kartami i dostaje literę: ${sheddingLetters[id]}.`);
      if(sheddingLetters[id]===word){sheddingState.finished=true;toast(`${sheddingState.players[id].name} ma ${word} — przegrywa mecz!`);setAutoPlay(false,{quiet:true});render();return;}
      toast(`${sheddingState.players[id].name}: ${sheddingLetters[id]}`);
    }
    render();
    sheddingRoundTimer=setTimeout(()=>{if(gameEngine()==='shedding'&&!sheddingState.finished)startSheddingRound();},1100);
  }

  function sheddingAiTurn(playerId,{fast=false}={}){
    if(!sheddingState||sheddingState.finished||sheddingState.roundOver||sheddingState.turn!==playerId)return;
    const p=sheddingState.players[playerId];
    const plays=SheddingEngine.enumeratePlays(rules,p.hand,sheddingState.pile.at(-1),{opening:sheddingState.opening,pileCards:sheddingState.pile});
    const play=plays[0];
    if(play)playSheddingSelection(playerId,play.cards);else takeFromSheddingPile(playerId);
  }

  function scheduleSheddingTurn(){
    clearTimeout(aiTimer);clearTimeout(autoPlayTimer);
    if(!sheddingState||sheddingState.finished||sheddingState.roundOver)return;
    const p=sheddingState.players[sheddingState.turn];
    if(!p.human)aiTimer=setTimeout(()=>sheddingAiTurn(p.id),autoPlayEnabled?220:620);
    else if(autoPlayEnabled)autoPlayTimer=setTimeout(()=>sheddingAiTurn(p.id,{fast:true}),180);
  }

  function newBattleGame() {
    clearTimeout(aiTimer); clearTimeout(autoPlayTimer); clearTimeout(battleResolveTimer);
    battleAnimating=false;
    if(!BattleEngine){ toast('Brak silnika battle-engine.js'); return; }
    const issues=validateRules(rules); if(issues.length){ toast(issues[0]); return; }
    state=null; activeGroupId=null; clearTapSelection(false); logClear();
    const players=Array.from({length:rules.players.count},(_,i)=>({id:i,name:i===0?'Ty':`Gracz ${i+1}`,human:i===0}));
    battleState=BattleEngine.createState({rules,players,deck:makeDeck()});
    log(`Wojna: rozdano całą talię (${rules.deck.count}×52 + ${rules.deck.count*rules.deck.jokersPerDeck} jokerów) między ${rules.players.count} graczy.`);
    log(`Remis dowolnej rangi wywołuje wojnę. Joker ${rules.battle.jokerHigh?'> As':'nie ma przewagi nad A'}.`);
    render();
    if(autoPlayEnabled) scheduleAutoPlay(260);
  }

  function battleEventLabel(event){
    if(!event)return '';
    if(event.type==='war') return `WOJNA ${event.rank}`;
    if(event.type==='game-over') return event.winnerId==null?'REMIS':`${battleState.players[event.winnerId].name} WYGRYWA`;
    if(event.type==='draw') return 'REMIS';
    if(event.type==='battle-won'||event.type==='battle-won-fallback') return `${battleState.players[event.winnerId].name} bierze pulę`;
    return '';
  }

  function battleStep({manual=true}={}){
    if(!battleState || battleState.finished || battleAnimating) return false;
    // compare jest fazą techniczną: użytkownik widzi już odkryte karty,
    // a rozstrzygnięcie wykonujemy automatycznie po krótkiej pauzie.
    if(battleState.stage==='compare') return resolveBattleCompare({manual});

    const beforeFailed=(battleState.lastWarFailed||[]).join(',');
    const event=BattleEngine.step(battleState);
    const failed=battleState.lastWarFailed||[];
    if(failed.length && failed.join(',')!==beforeFailed) {
      log(`${failed.map(id=>battleState.players[id].name).join(', ')}: brak pełnych ${rules.battle.faceDownOnTie+rules.battle.faceUpOnTie} kart na wojnę → wartość 0.`);
    }
    if(event?.type==='reveal') log(`Bitwa ${battleState.battleNo}: gracze rzucają karty.`);
    if(event?.type==='war-reveal') log(`Wojna ${battleState.warRank||''}: remisujący dokładają karty.`);

    render();
    animateBattleThrow(event);
    battleAnimating=true;
    clearTimeout(battleResolveTimer);
    const revealDelay=manual?720:300;
    battleResolveTimer=setTimeout(()=>{
      battleAnimating=false;
      resolveBattleCompare({manual});
    },revealDelay);
    return true;
  }

  function resolveBattleCompare({manual=false}={}) {
    if(!battleState || battleState.finished || battleState.stage!=='compare' || battleAnimating) return false;
    const event=BattleEngine.step(battleState);
    if(event?.type==='war') {
      log(`WOJNA ${event.rank}: ${event.participants.map(id=>battleState.players[id].name).join(' vs ')}. Pozostali gracze trzymają swoje odkryte karty.`);
      render();
      if(autoPlayEnabled && !battleState.finished) scheduleAutoPlay(manual?520:300);
      return true;
    }
    if(event?.type==='battle-won'||event?.type==='battle-won-fallback'||event?.type==='game-over') {
      const winnerId=event.winnerId ?? battleState.winnerId;
      const wonCount=event.wonCount ?? 0;
      if(event.type==='game-over') {
        log(`${battleState.players[winnerId].name} zdobywa wszystkie karty i wygrywa grę.`);
      } else {
        log(`${battleState.players[winnerId].name} wygrywa bitwę i bierze ${wonCount} kart. Pod stos: najpierw własne, potem gracze zgodnie z kolejnością miejsc.`);
      }
      battleAnimating=true;
      animateBattleCollection(winnerId,()=>{
        battleAnimating=false;
        render();
        if(battleState.finished) {
          toast(`Wojna: ${battleState.players[winnerId].name} wygrywa!`);
          setAutoPlay(false,{quiet:true});
        } else if(autoPlayEnabled) scheduleAutoPlay(manual?360:180);
      });
      return true;
    }
    if(event?.type==='draw') {
      log('Koniec gry bez zwycięzcy.');
      render(); setAutoPlay(false,{quiet:true});
      return true;
    }
    render();
    if(autoPlayEnabled && !battleState.finished) scheduleAutoPlay(220);
    return true;
  }

  function battleStackElement(playerId,{human=false}={}) {
    const p=battleState.players[playerId];
    const wrap=document.createElement('button');
    wrap.type='button';
    wrap.className=`battle-personal-stack${human?' human-stack':''}`;
    wrap.dataset.playerId=String(playerId);
    wrap.setAttribute('aria-label',human?'Rzuć kartę ze swojego stosu':`${p.name}: stos ${p.stack.length} kart`);
    wrap.disabled=!human || battleState.finished || battleAnimating || autoPlayEnabled;
    const back=document.createElement('span'); back.className='card back battle-stack-card';
    const count=document.createElement('span'); count.className='battle-stack-count'; count.textContent=String(p.stack.length);
    wrap.append(back,count);
    if(human) {
      setHelpTitle(wrap,autoPlayEnabled?'AUTO PLAY steruje grą':'Kliknij swój stos, aby rzucić kartę');
      wrap.addEventListener('click',e=>{e.preventDefault();e.stopPropagation();wrap.disabled=true;battleStep({manual:true});});
    }
    return wrap;
  }

  function animateBattleThrow(event) {
    const ids=event?.players||event?.participants||[];
    ids.forEach((id,index)=>{
      const seat=id===0?document.querySelector('.battle-human-seat'):document.querySelector(`.battle-seat[data-player-id="${id}"]`);
      const card=seat?.querySelector('.battle-face-card');
      const stack=seat?.querySelector('.battle-personal-stack');
      if(!card||!stack||!card.animate)return;
      const a=stack.getBoundingClientRect(), b=card.getBoundingClientRect();
      const dx=(a.left+a.width/2)-(b.left+b.width/2);
      const dy=(a.top+a.height/2)-(b.top+b.height/2);
      card.animate([
        {transform:`translate(${dx}px,${dy}px) scale(.72) rotate(-5deg)`,opacity:.35},
        {transform:'translate(0,0) scale(1) rotate(0deg)',opacity:1}
      ],{duration:330,delay:index*45,easing:'cubic-bezier(.2,.8,.2,1)',fill:'both'});
    });
  }

  function animateBattleCollection(winnerId,done) {
    const targetSeat=winnerId===0?document.querySelector('.battle-human-seat'):document.querySelector(`.battle-seat[data-player-id="${winnerId}"]`);
    const target=targetSeat?.querySelector('.battle-personal-stack');
    const movers=[...document.querySelectorAll('.battle-face-card,.battle-mini')];
    if(!target||!movers.length||!Element.prototype.animate){ setTimeout(done,80); return; }
    const t=target.getBoundingClientRect();
    let longest=0;
    movers.forEach((node,index)=>{
      const r=node.getBoundingClientRect();
      const dx=(t.left+t.width/2)-(r.left+r.width/2);
      const dy=(t.top+t.height/2)-(r.top+r.height/2);
      const duration=360+Math.min(index,8)*18;
      longest=Math.max(longest,duration);
      node.animate([
        {transform:'translate(0,0) scale(1)',opacity:1},
        {transform:`translate(${dx}px,${dy}px) scale(.28) rotate(${index%2?8:-8}deg)`,opacity:.08}
      ],{duration,easing:'cubic-bezier(.45,0,.55,1)',fill:'forwards'});
    });
    target.animate([{transform:'scale(1)'},{transform:'scale(1.12)'},{transform:'scale(1)'}],{duration:longest+80,easing:'ease-out'});
    setTimeout(done,longest+90);
  }

  function battleSeatElement(p,id,slot) {
    const seat=document.createElement('div');
    seat.className=`opponent table-seat battle-seat seat-${slot}${battleState.warParticipants.includes(id)?' war-active':''}${battleState.lastWarFailed?.includes(id)?' war-zero':''}${p.stack.length?'':' eliminated'}`;
    seat.dataset.seat=slot;
    seat.dataset.playerId=String(id);
    const head=document.createElement('div'); head.className='battle-seat-head';
    head.innerHTML=`<strong>${escapeHtml(p.name)}</strong><span>${p.stack.length}</span>`;
    seat.appendChild(head);
    const play=document.createElement('div'); play.className='battle-play-area';
    play.appendChild(battleStackElement(id));
    const cardZone=document.createElement('div'); cardZone.className='battle-card-zone';
    const current=battleState.visible[id];
    if(current){
      const ce=cardElement(current); ce.classList.add('battle-face-card'); cardZone.appendChild(ce);
    } else if(battleState.lastWarFailed?.includes(id)) {
      const zero=document.createElement('div'); zero.className='battle-zero-card'; zero.innerHTML='<strong>0</strong><span>brak kart</span>'; cardZone.appendChild(zero);
    } else {
      const empty=document.createElement('div'); empty.className='battle-card-empty'; empty.textContent='—'; cardZone.appendChild(empty);
    }
    play.appendChild(cardZone);
    seat.appendChild(play);
    seat.appendChild(battleTrailElement(id));
    return seat;
  }

  function battleTrailElement(playerId) {
    const contributed=battleState.potByPlayer[playerId]||[];
    const visibleUid=battleState.visible[playerId]?.uid;
    const trailCards=visibleUid?contributed.filter((c,i)=>!(c.uid===visibleUid && i===contributed.length-1)):contributed;
    const trail=document.createElement('div'); trail.className='battle-trail';
    trailCards.slice(-6).forEach(c=>{
      if(c.battleFaceDown){ const b=document.createElement('div');b.className='battle-mini back';trail.appendChild(b); }
      else { const m=document.createElement('div');m.className=`battle-mini${c.joker?' joker-mini':''}`;m.textContent=c.joker?'★':`${c.rank}${suitSymbol(c.suit)}`;trail.appendChild(m); }
    });
    if(trailCards.length>6){const more=document.createElement('span');more.className='battle-more';more.textContent=`+${trailCards.length-6}`;trail.prepend(more);}
    return trail;
  }

  function renderBattleHumanSeat() {
    const p=battleState.players[0];
    const pz=els.playerHand?.closest('.player-zone');
    if(!pz) return;
    pz.hidden=false;
    pz.classList.add('battle-human-seat');
    els.humanStatus.textContent=`Ty · ${p.stack.length} kart`;
    els.playerMetaScore.textContent=battleState.lastWarFailed?.includes(0)?'WOJNA → 0':battleState.warParticipants.includes(0)?`WOJNA ${battleState.warRank}`:'Twoje miejsce';
    if(els.discardHint) els.discardHint.hidden=true;
    els.playerHand.innerHTML='';
    els.playerHand.className='hand battle-human-hand';
    els.playerHand.appendChild(battleStackElement(0,{human:true}));
    const cardZone=document.createElement('div'); cardZone.className='battle-card-zone';
    const current=battleState.visible[0];
    if(current){ const ce=cardElement(current); ce.classList.add('battle-face-card'); cardZone.appendChild(ce); }
    else if(battleState.lastWarFailed?.includes(0)) { const zero=document.createElement('div');zero.className='battle-zero-card';zero.innerHTML='<strong>0</strong><span>brak kart</span>';cardZone.appendChild(zero); }
    else { const empty=document.createElement('div');empty.className='battle-card-empty';empty.textContent='← kliknij stos';cardZone.appendChild(empty); }
    els.playerHand.appendChild(cardZone);
    els.playerHand.appendChild(battleTrailElement(0));
    pz.classList.toggle('war-active',battleState.warParticipants.includes(0));
    pz.classList.toggle('war-zero',battleState.lastWarFailed?.includes(0));
  }

  function renderBattle(){
    if(!battleState)return;
    document.body.dataset.engine='battle';
    prepareUniversalSeating(battleState.players.length);
    if(els.pileTitle) els.pileTitle.textContent='Pula';
    if(els.boardTitle) els.boardTitle.textContent='Pole bitwy';
    if(els.boardHelp) els.boardHelp.textContent='Kliknij swoją zakrytą kupkę na dole, aby rzucić kartę. Po odkryciu karty zostają chwilę na stole, a zwycięzca animacją zgarnia całą pulę. AUTO PLAY robi to samo automatycznie.';
    const pot=BattleEngine.potSize(battleState);
    els.deckCountLabel.textContent=pot;
    els.deckPile.disabled=true; els.drawBtn.hidden=true;
    els.drawState.classList.remove('auto-draw-state');
    els.drawState.textContent=pot?`${pot} kart w puli`:'nowa bitwa';
    els.turnLabel.textContent=battleState.finished
      ? (battleState.winnerId==null?'Koniec · remis':`Koniec · ${battleState.players[battleState.winnerId].name}`)
      : (battleState.stage==='war'||battleState.lastEvent?.type==='war-reveal')?`WOJNA ${battleState.warRank}`:battleState.stage==='compare'?`Bitwa ${battleState.battleNo} · porównanie`:`Bitwa ${battleState.battleNo+1}`;
    els.activeRuleHint.textContent=`remis: ${rules.battle.tieTrigger==='any-duplicate'?'dowolny':'najwyższy'} · wojna ${rules.battle.faceDownOnTie}↓ + ${rules.battle.faceUpOnTie}↑ · Joker ${rules.battle.jokerHigh?'> A':'standard'}`;
    els.scoreLabel.textContent=battleState.players.map(p=>`${p.name}: ${p.stack.length}`).join(' · ');
    setHelpTitle(els.scoreLabel,battleState.players.map(p=>`${p.name}: ${p.stack.length}`).join(' · '));
    els.undoTurnBtn.hidden=true;
    els.endTurnBtn.hidden=true;
    els.endTurnBtn.disabled=true;
    els.boardValidation.textContent=battleState.finished?'koniec':battleState.stage==='war'?'remis — eskalacja':pot?`pula ${pot}`:'gotowe';
    els.boardValidation.className='board-validation valid';
    els.meldBoard.className='meld-board battle-board battle-center-stage';
    els.meldBoard.innerHTML='';

    const warContext=battleState.stage==='war'||battleState.lastEvent?.type==='war-reveal';
    const center=document.createElement('div'); center.className=`battle-center-core${warContext?' war':''}`;
    const participants=battleState.warParticipants||[];
    const subtitle=battleState.finished
      ? (battleState.winnerId==null?'Brak zwycięzcy':`${escapeHtml(battleState.players[battleState.winnerId].name)} wygrywa grę`)
      : warContext
        ? `${participants.map(id=>escapeHtml(battleState.players[id].name)).join(' ↔ ')}`
        : battleState.stage==='compare'?'Porównanie kart…':'Kliknij swój stos';
    center.innerHTML=`<div class="battle-center-kicker">${warContext?`WOJNA ${escapeHtml(battleState.warRank||'')}`:'BITWA'}</div><div class="battle-pot-number">${pot}</div><div class="battle-pot-label">kart w puli</div><div class="battle-center-subtitle">${subtitle}</div>`;
    els.meldBoard.appendChild(center);

    els.opponents.innerHTML='';
    battleState.players.slice(1).forEach((p,index)=>{
      const id=index+1, slot=opponentSeatSlot(index,battleState.players.length);
      els.opponents.appendChild(battleSeatElement(p,id,slot));
    });
    renderBattleHumanSeat();
    scheduleAutoPlayButtonState();
  }

  function primaryAction(){
    if(gameEngine()==='battle') return battleStep({manual:true});
    if(gameEngine()==='shedding') return playSheddingSelection();
    if(gameEngine()==='macao') return playMacaoSelection();
    if(gameEngine()==='trick'){
      if(trickState.phase==='exchange')return giveHumanKittyCards();
      if(trickState.phase==='contract')return setHumanContract();
      if(trickState.phase==='playing')return playHumanTrickCard();
      if(trickState.phase==='roundEnd'&&!trickMatch.finished)return startTrickRound();
      return false;
    }
    if(gameEngine()==='skat'){
      if(skatState.phase==='discard')return discardHumanSkat();
      if(skatState.phase==='playing')return playHumanSkatCard();
      if(skatState.phase==='ramsch-pass')return passHumanRamsch();
      if(skatState.phase==='roundEnd')return startSkatRound();
      return false;
    }
    return endTurn(0);
  }

  function setAutoPlay(on,{quiet=false}={}){
    autoPlayEnabled=!!on;
    clearTimeout(autoPlayTimer);
    scheduleAutoPlayButtonState();
    if(!quiet) toast(autoPlayEnabled?'AUTO PLAY włączony':'AUTO PLAY wyłączony');
    if(autoPlayEnabled) scheduleAutoPlay(80);
  }

  function toggleAutoPlay(){ setAutoPlay(!autoPlayEnabled); }

  function scheduleAutoPlayButtonState(){
    if(!els.autoPlayBtn)return;
    els.autoPlayBtn.classList.toggle('active',autoPlayEnabled);
    els.autoPlayBtn.setAttribute('aria-pressed',String(autoPlayEnabled));
    els.autoPlayBtn.textContent=autoPlayEnabled?'AUTO PLAY ■':'AUTO PLAY ▶';
  }

  function scheduleAutoPlay(delay=250){
    clearTimeout(autoPlayTimer);
    if(!autoPlayEnabled)return;
    if(gameEngine()==='battle'){
      if(!battleState||battleState.finished)return;
      autoPlayTimer=setTimeout(()=>battleStep({manual:false}),delay); return;
    }
    if(gameEngine()==='shedding'){
      if(!sheddingState||sheddingState.finished||sheddingState.roundOver)return;
      scheduleSheddingTurn();return;
    }
    if(gameEngine()==='macao'){
      if(!macaoState||macaoState.finished)return;scheduleMacaoTurn();return;
    }
    if(gameEngine()==='trick'){if(!trickState||trickMatch.finished)return;scheduleTrickTurn();return;}
    if(gameEngine()==='skat'){if(!skatState)return;scheduleSkatTurn();return;}
    if(!state||state.finished)return;
    const p=state.players[state.turn];
    if(p?.human) autoPlayTimer=setTimeout(()=>aiTakeTurn(p.id),Math.max(120,delay));
  }

  function newMeldGame() {
    clearTimeout(aiTimer);
    const issues=validateRules(rules); if (issues.length) { toast(issues[0]); return; }
    state={
      players:Array.from({length:rules.players.count},(_,i)=>({id:i,name:i===0?'Ty':`Bot ${i}`,human:i===0,hand:[],entered:false,roundWins:0,penaltyPoints:0})),
      deck:[], discardPile:[], tableGroups:[], turn:0, leader:0, round:1, finished:false,
      drawnThisTurn:0, turnSnapshot:null, turnStartTableIds:new Set(), turnOwnedCardIds:new Set(), turnStartGroupSignatures:new Map(),
      freshGroupIds:new Set(), previousFreshGroupIds:new Set(),
      consecutiveNoPlayTurns:0, entryUnlockedThisTurn:false, entryProofCardIds:new Set(), entryUnlockSnapshot:null, lastAutoDrawCount:0, drawSource:null, discardDrawnCardUid:null, discardTakenBeforeEntry:false, discardedThisTurn:false
    };
    activeGroupId=null; clearTapSelection(false); logClear(); startRound(1);
  }

  function startRound(roundNo) {
    state.round=roundNo; state.deck=makeDeck(); state.discardPile=[]; state.tableGroups=[]; state.freshGroupIds=new Set(); state.previousFreshGroupIds=new Set(); activeGroupId=null; clearTapSelection(false); state.finished=false; state.consecutiveNoPlayTurns=0;
    const er=effectiveRules(roundNo);
    for (const p of state.players) { p.hand=[]; p.entered=false; }
    for (let n=0;n<er.handSize;n++) for (const p of state.players) p.hand.push(state.deck.pop());
    if(rules.discard?.enabled && rules.discard?.seedAtRoundStart!==false && state.deck.length) state.discardPile.push(state.deck.pop());
    state.turn=state.leader % state.players.length;
    const penaltyMatch=rules.game.scoringMode==='hand-penalty'&&(rules.game?.penaltyLoseAt||0)>0;
    log(`${penaltyMatch?`Runda ${roundNo}`:`Runda ${roundNo}/${rules.game.totalRounds}`}: rozdano po ${er.handSize} kart. Wejście: ${er.entryMin} pkt. Zaczyna: ${state.players[state.turn].name}.`);
    beginTurn();
  }

  function beginTurn() {
    clearTimeout(aiTimer);
    clearTapSelection(false);
    const p=state.players[state.turn];
    const er=effectiveRules();
    if(p.human && rules.meld.highlightNewGroupsUntilNextHumanTurn) {
      state.previousFreshGroupIds=new Set(state.freshGroupIds||[]);
      state.freshGroupIds=new Set();
    }
    state.drawnThisTurn=0;
    state.lastAutoDrawCount=0;
    state.drawSource=null; state.discardDrawnCardUid=null; state.discardTakenBeforeEntry=false; state.discardedThisTurn=false;
    state.entryUnlockedThisTurn=false;
    state.entryProofCardIds=new Set();
    state.entryUnlockSnapshot=null;
    state.turnStartTableIds=new Set(allTableCards().map(c=>c.uid));
    state.turnOwnedCardIds=new Set(p.hand.map(c=>c.uid));
    state.turnStartGroupSignatures=new Map(state.tableGroups.map(g=>[g.id,groupSignature(g)]));
    activeGroupId=state.tableGroups[0]?.id ?? null;
    state.turnSnapshot=snapshotForUndo();
    if(er.drawMode==='auto' && er.drawCount>0) {
      while(state.drawnThisTurn<er.drawCount && state.deck.length) {
        if(!drawCard(state.turn,true,{system:true,renderAfter:false})) break;
        state.lastAutoDrawCount++;
      }
      // Undo cofa ruchy wykonane PO obowiązkowym auto-draw, a nie sam auto-draw.
      state.turnSnapshot=snapshotForUndo();
    }
    log(`${p.name}: początek tury${p.entered?' · już w grze':' · jeszcze bez wejścia'}${state.lastAutoDrawCount?` · auto +${state.lastAutoDrawCount}`:''}.`);
    render();
    if (!p.human) maybeRunAI();
    else if(autoPlayEnabled) scheduleAutoPlay(260);
  }

  function snapshotForUndo() {
    return {
      deck:deepClone(state.deck),
      discardPile:deepClone(state.discardPile||[]),
      tableGroups:deepClone(state.tableGroups),
      players:state.players.map(p=>({hand:deepClone(p.hand),entered:p.entered})),
      drawnThisTurn:state.drawnThisTurn,
      lastAutoDrawCount:state.lastAutoDrawCount||0,
      drawSource:state.drawSource||null,
      discardDrawnCardUid:state.discardDrawnCardUid||null,
      discardTakenBeforeEntry:!!state.discardTakenBeforeEntry,
      discardedThisTurn:!!state.discardedThisTurn,
      freshGroupIds:[...(state.freshGroupIds||[])],
      previousFreshGroupIds:[...(state.previousFreshGroupIds||[])],
      activeGroupId
    };
  }

  function undoTurn() {
    if (!state || state.finished || state.turn!==0 || !state.turnSnapshot) return;
    const snap=state.turnSnapshot;
    state.deck=deepClone(snap.deck); state.discardPile=deepClone(snap.discardPile||[]); state.tableGroups=deepClone(snap.tableGroups);
    state.players.forEach((p,i)=>{ p.hand=deepClone(snap.players[i].hand); p.entered=snap.players[i].entered; });
    activeGroupId=snap.activeGroupId ?? state.tableGroups[0]?.id ?? null;
    clearTapSelection(false);
    state.drawnThisTurn=snap.drawnThisTurn||0;
    state.lastAutoDrawCount=snap.lastAutoDrawCount||0;
    state.drawSource=snap.drawSource||null; state.discardDrawnCardUid=snap.discardDrawnCardUid||null; state.discardTakenBeforeEntry=!!snap.discardTakenBeforeEntry; state.discardedThisTurn=!!snap.discardedThisTurn;
    state.freshGroupIds=new Set(snap.freshGroupIds||[]);
    state.previousFreshGroupIds=new Set(snap.previousFreshGroupIds||[]);
    state.entryUnlockedThisTurn=false;
    state.entryProofCardIds=new Set();
    state.entryUnlockSnapshot=null;
    state.turnStartTableIds=new Set(allTableCards().map(c=>c.uid));
    state.turnOwnedCardIds=new Set(state.players[0].hand.map(c=>c.uid));
    state.turnStartGroupSignatures=new Map(state.tableGroups.map(g=>[g.id,groupSignature(g)]));
    log('Ty: cofnięto całą bieżącą turę.'); render();
  }

  function recycleDiscardIntoDeck() {
    if(!rules.discard?.enabled || !rules.discard?.recycleWhenDeckEmpty || state.deck.length || (state.discardPile?.length||0)<=1) return false;
    const top=state.discardPile.pop();
    state.deck=shuffle(state.discardPile);
    state.discardPile=[top];
    log(`Przetasowano ${state.deck.length} kart ze stosu odrzuconych do talii.`);
    return true;
  }

  function discardAccessMode(playerId=state?.turn) {
    if(!rules.discard?.enabled || !state || playerId==null) return 'none';
    const p=state.players[playerId];
    return p?.entered ? (rules.discard.afterEntry||'none') : (rules.discard.beforeEntry||'none');
  }

  function discardMinHandMet(playerId=state?.turn) {
    if(!state || playerId==null) return false;
    const min=Math.max(0,rules.discard?.minHandToDraw||0);
    return (state.players[playerId]?.hand?.length||0)>=min;
  }

  function canDrawFromDiscard(playerId=state?.turn) {
    return !!(rules.discard?.enabled && state?.discardPile?.length && discardAccessMode(playerId)!=='none' && discardMinHandMet(playerId));
  }

  function drawCard(playerId,quiet=false,{system=false,renderAfter=true}={}) {
    if (!state || state.finished || state.turn!==playerId) return false;
    const er=effectiveRules();
    const target=er.drawMode==='none'?0:er.drawCount;
    if(state.players[playerId]?.human && !system && er.drawMode!=='manual') {
      if(!quiet) toast(er.drawMode==='auto'?'Ta gra dobiera kartę automatycznie.':'W tej grze nie dobierasz kart.');
      return false;
    }
    if (state.drawnThisTurn>=target) { if(!quiet) toast('W tej turze masz już wymagane dobieranie za sobą.'); return false; }
    if (!state.deck.length) recycleDiscardIntoDeck();
    if (!state.deck.length) { if(!quiet) toast('Talia jest pusta.'); return false; }
    const card=state.deck.pop();
    state.players[playerId].hand.push(card);
    state.turnOwnedCardIds.add(card.uid);
    state.drawnThisTurn++;
    state.drawSource='deck';
    log(`${state.players[playerId].name} dobiera kartę z talii (${state.drawnThisTurn}/${target}).`);
    if(renderAfter) render();
    return true;
  }

  function drawFromDiscard(playerId=0,quiet=false,{system=false,renderAfter=true}={}) {
    if(!state || state.finished || state.turn!==playerId || !rules.discard?.enabled) return false;
    const er=effectiveRules(), target=er.drawMode==='none'?0:er.drawCount;
    if(state.players[playerId]?.human && !system && er.drawMode!=='manual') {
      if(!quiet) toast('Ta konfiguracja nie pozwala ręcznie wybierać źródła dobierania.');
      return false;
    }
    if(state.drawnThisTurn>=target) { if(!quiet) toast('W tej turze karta została już dobrana.'); return false; }
    if(!state.discardPile?.length) { if(!quiet) toast('Stos odrzuconych jest pusty.'); return false; }
    if(!discardMinHandMet(playerId)) { if(!quiet) toast(`Ze stosu odrzuconych można dobrać dopiero mając co najmniej ${rules.discard.minHandToDraw} karty w ręce.`); return false; }
    const mode=discardAccessMode(playerId);
    if(mode==='none') { if(!quiet) toast('Na tym etapie nie możesz brać ze stosu odrzuconych.'); return false; }
    const card=state.discardPile.pop();
    state.players[playerId].hand.push(card);
    state.turnOwnedCardIds.add(card.uid);
    state.drawnThisTurn++;
    state.drawSource='discard';
    state.discardDrawnCardUid=card.uid;
    state.discardTakenBeforeEntry=!state.players[playerId].entered && mode==='finish-only';
    log(`${state.players[playerId].name} bierze ${card.joker?'JOKERA':`${card.rank}${suitSymbol(card.suit)}`} ze stosu odrzuconych${state.discardTakenBeforeEntry?' — ten ruch musi zakończyć rozdanie':''}.`);
    if(!quiet && state.discardTakenBeforeEntry) toast('Odkryta przed wejściem: teraz musisz wejść i zakończyć rozdanie.');
    if(renderAfter) render();
    return true;
  }

  function drawRequirementMet() {
    const er=effectiveRules();
    if(er.drawMode==='none' || er.drawCount<=0) return true;
    if(state.drawnThisTurn>=er.drawCount) return true;
    const canRecycle=rules.discard?.enabled&&rules.discard?.recycleWhenDeckEmpty&&(state.discardPile?.length||0)>1;
    const canDiscardDraw=canDrawFromDiscard(state.turn);
    return !state.deck.length&&!canRecycle&&!canDiscardDraw;
  }

  function createGroup(select=true) {
    if (!canHumanManipulate()) return null;
    if (!drawRequirementMet()) { toast('Najpierw dobierz kartę.'); return null; }
    const g={id:`g${groupUid++}`,cards:[]}; state.tableGroups.push(g); markFreshGroup(g); if (select) activeGroupId=g.id; render(); return g;
  }

  function insertGroupAfter(g,afterGroupId=null) {
    if(!afterGroupId) { state.tableGroups.push(g); return; }
    const idx=state.tableGroups.findIndex(x=>x.id===afterGroupId);
    if(idx<0) state.tableGroups.push(g);
    else state.tableGroups.splice(idx+1,0,g);
  }

  function createGroupFromDrop(payload,afterGroupId=null) {
    if (!canHumanManipulate()) return false;
    if (!drawRequirementMet()) { toast('Najpierw dobierz kartę.'); return false; }
    if (!payload) return false;

    if (payload.type==='hand') {
      const p=state.players[0];
      const idx=p.hand.findIndex(c=>c.uid===payload.cardUid);
      if (idx<0) return false;
      const g={id:`g${groupUid++}`,cards:[p.hand.splice(idx,1)[0]]};
      insertGroupAfter(g,afterGroupId);
      markFreshGroup(g);
      activeGroupId=g.id;
      cleanupEmptyGroups();
      maybeUnlockEntry(0);
      render();
      return true;
    }

    if (payload.type==='table') {
      const p=state.players[0];
      const from=state.tableGroups.find(g=>g.id===payload.fromGroupId);
      if (!from) return false;
      const movingOldTableCard=state.turnStartTableIds.has(payload.cardUid);
      if (!playerHasTableAccess(0) && movingOldTableCard) {
        toast('Przed własnym wejściem nie możesz rozbierać starych układów stołu.');
        return false;
      }
      if (!rules.meld.allowRearrange && movingOldTableCard) {
        toast('Przebudowa istniejących układów jest wyłączona.');
        return false;
      }
      const idx=from.cards.findIndex(c=>c.uid===payload.cardUid);
      if (idx<0) return false;
      const [card]=from.cards.splice(idx,1);
      const g={id:`g${groupUid++}`,cards:[card]};
      // Jeśli źródłowy układ zniknie, wstawianie „po nim” nie ma już sensu — wtedy dopinamy na końcu.
      const sourceWillDisappear=from.cards.length===0;
      insertGroupAfter(g,sourceWillDisappear && afterGroupId===from.id ? null : afterGroupId);
      markFreshGroup(g);
      activeGroupId=g.id;
      cleanupEmptyGroups();
      render();
      return true;
    }
    return false;
  }

  function sameTapSelection(a,b) {
    return !!a && !!b && a.type===b.type && a.cardUid===b.cardUid && (a.fromGroupId||null)===(b.fromGroupId||null);
  }

  function tapTargetAllowed(group,payload=tapSelection) {
    if(!group || !payload || !canHumanManipulate() || !drawRequirementMet()) return false;
    if(payload.type==='hand') return canDropHandCardIntoGroup(group,false);
    if(payload.type==='table') {
      if(payload.fromGroupId===group.id) return false;
      if(!playerHasTableAccess(0)) {
        const movingOld=state.turnStartTableIds.has(payload.cardUid);
        const targetOld=state.turnStartGroupSignatures.has(group.id);
        if(movingOld || targetOld) return false;
      }
      if(!rules.meld.allowRearrange && state.turnStartTableIds.has(payload.cardUid)) return false;
      return true;
    }
    return false;
  }

  function refreshTapSelectionClasses() {
    document.querySelectorAll('.card.tap-selected').forEach(node=>node.classList.remove('tap-selected'));
    document.querySelectorAll('.meld-group.tap-target-valid,.meld-group.tap-target-blocked').forEach(node=>node.classList.remove('tap-target-valid','tap-target-blocked'));
    els.discardPile?.classList.remove('tap-target-valid');
    document.querySelectorAll('.card.joker-replace-target.tap-target-valid').forEach(node=>node.classList.remove('tap-target-valid'));
    const active=!!tapSelection;
    boardShell()?.classList.toggle('tap-placement-mode',active);
    els.meldBoard?.classList.toggle('tap-placement-mode',active);
    els.playerHand?.classList.toggle('tap-placement-mode',active);
    if(!active) return;
    for(const node of document.querySelectorAll('.card[data-card-uid]')) {
      if(node.dataset.cardUid===tapSelection.cardUid) node.classList.add('tap-selected');
    }
    for(const node of document.querySelectorAll('.meld-group[data-group-id]')) {
      const group=state.tableGroups.find(g=>g.id===node.dataset.groupId);
      node.classList.add(tapTargetAllowed(group)?'tap-target-valid':'tap-target-blocked');
    }
    if(tapSelection.type==='hand'&&rules.discard?.enabled&&drawRequirementMet()) els.discardPile?.classList.add('tap-target-valid');
    if(tapSelection.type==='hand'&&rules.meld.allowJokerReplacement&&playerHasTableAccess(0)) document.querySelectorAll('.card.joker-replace-target').forEach(node=>node.classList.add('tap-target-valid'));
  }

  function clearTapSelection(refresh=true) {
    tapSelection=null;
    if(refresh) refreshTapSelectionClasses();
  }

  function toggleTapSelection(payload) {
    if(!canHumanManipulate()) return;
    if(!drawRequirementMet()) { toast('Najpierw dobierz kartę.'); return; }
    if(sameTapSelection(tapSelection,payload)) {
      clearTapSelection();
      return;
    }
    tapSelection={...payload};
    refreshTapSelectionClasses();
  }

  function placeTapSelectionInGroup(groupId) {
    if(!tapSelection) return false;
    const payload={...tapSelection};
    clearTapSelection(false);
    activeGroupId=groupId;
    if(payload.type==='hand') {
      const group=state.tableGroups.find(g=>g.id===groupId);
      if(!group || !canDropHandCardIntoGroup(group)) { refreshTapSelectionClasses(); return false; }
      addHandCardToSpecificGroup(payload.cardUid,groupId);
      return true;
    }
    if(payload.type==='table') {
      if(payload.fromGroupId===groupId) { render(); return true; }
      moveTableCard(payload.cardUid,payload.fromGroupId,groupId);
      return true;
    }
    refreshTapSelectionClasses();
    return false;
  }

  function createGroupFromTapSelection(afterGroupId=null) {
    if(!tapSelection) return false;
    const payload={...tapSelection};
    clearTapSelection(false);
    const ok=createGroupFromDrop(payload,afterGroupId);
    if(!ok) refreshTapSelectionClasses();
    return ok;
  }

  function boardShell() {
    return els.meldBoard?.closest('.board-shell') || null;
  }

  function dynamicBoardDropZone() {
    return boardShell()?.querySelector('.meld-dynamic-drop-zone') || null;
  }

  function setBoardDragExpansion(active) {
    if(!els.meldBoard) return;
    const on=!!active;
    els.meldBoard.classList.toggle('drag-expanded',on);
    boardShell()?.classList.toggle('drag-expanded',on);
    const zone=dynamicBoardDropZone();
    if(zone) zone.setAttribute('aria-hidden',on?'false':'true');
  }

  function ensureDynamicBoardDropZone() {
    const shell=boardShell();
    if(!els.meldBoard || !shell || dynamicBoardDropZone()) return;
    const zone=document.createElement('div');
    zone.className='meld-dynamic-drop-zone';
    zone.setAttribute('aria-hidden','true');
    zone.innerHTML='<span>+ nowy układ · upuść lub stuknij</span>';
    els.meldBoard.insertAdjacentElement('afterend',zone);

    // Osobna „półka” pod stołem: nie zasłania dolnego rzędu meldów.
    zone.addEventListener('dragover',e=>{
      if(!dragPayload || !canHumanManipulate()) return;
      e.preventDefault();
      e.stopPropagation();
      e.dataTransfer.dropEffect='move';
      zone.classList.add('native-drop-target');
      setBoardDragExpansion(true);
    });
    zone.addEventListener('dragleave',()=>zone.classList.remove('native-drop-target'));
    zone.addEventListener('drop',e=>{
      if(!dragPayload || !canHumanManipulate()) return;
      e.preventDefault();
      e.stopPropagation();
      const payload=dragPayload;
      dragPayload=null;
      zone.classList.remove('native-drop-target');
      setBoardDragExpansion(false);
      createGroupFromDrop(payload);
    });
    zone.addEventListener('click',e=>{
      if(!tapSelection || !canHumanManipulate()) return;
      e.preventDefault();
      e.stopPropagation();
      createGroupFromTapSelection();
    });
  }

  let boardFreeDropSetup=false;
  function setupBoardFreeDropOnce() {
    if(boardFreeDropSetup) return;
    boardFreeDropSetup=true;
    els.meldBoard.addEventListener('dragover',e=>{
      if(!dragPayload || !canHumanManipulate() || e.target.closest('.meld-group')) return;
      e.preventDefault();
      e.dataTransfer.dropEffect='move';
      els.meldBoard.classList.add('free-drop-target');
      setBoardDragExpansion(true);
    });
    els.meldBoard.addEventListener('dragleave',e=>{
      if(!els.meldBoard.contains(e.relatedTarget)) els.meldBoard.classList.remove('free-drop-target');
    });
    els.meldBoard.addEventListener('drop',e=>{
      if(e.target.closest('.meld-group')) return;
      e.preventDefault();
      els.meldBoard.classList.remove('free-drop-target');
      setBoardDragExpansion(false);
      const payload=dragPayload;
      const lane=e.target.closest('.meld-new-row-drop');
      const afterGroupId=lane?.dataset.afterGroupId || null;
      dragPayload=null;
      createGroupFromDrop(payload,afterGroupId);
    });
    els.meldBoard.addEventListener('click',e=>{
      if(!tapSelection || e.target.closest('.meld-group') || e.target.closest('.card')) return;
      e.preventDefault();
      e.stopPropagation();
      const lane=e.target.closest('.meld-new-row-drop');
      createGroupFromTapSelection(lane?.dataset.afterGroupId || null);
    });
  }

  function addHandCardToActive(cardUid) {
    if (!canHumanManipulate()) return;
    if (!drawRequirementMet()) { toast('Najpierw dobierz kartę.'); return; }
    let group=state.tableGroups.find(g=>g.id===activeGroupId);
    // Przed wejściem kliknięcie karty nie powinno próbować dokładać jej do
    // starego meldunku wybranego automatycznie na początku tury. Tworzymy
    // wtedy nowy układ roboczy, do którego można spokojnie dołożyć 2. i 3. kartę.
    if (group && !playerHasTableAccess(0) && state.turnStartGroupSignatures.has(group.id)) group=null;
    if (!group) group=createGroup(true);
    if (!group) return;
    if (!canDropHandCardIntoGroup(group)) return;
    const p=state.players[0]; const idx=p.hand.findIndex(c=>c.uid===cardUid); if (idx<0) return;
    const [card]=p.hand.splice(idx,1); group.cards.push(card); cleanupEmptyGroups(); maybeUnlockEntry(0); render();
  }

  function canDropHandCardIntoGroup(group,showToast=true) {
    const p=state.players[state.turn];
    if (!playerHasTableAccess(state.turn) && rules.meld.initialMeldOwnCardsOnly && state.turnStartGroupSignatures.has(group.id)) {
      if(showToast) toast(`Przed wejściem za ${effectiveRules().entryMin} pkt nie możesz korzystać ze starych układów stołu.`);
      return false;
    }
    return true;
  }

  function moveTableCard(cardUid,fromGroupId,toGroupId) {
    if (!canHumanManipulate()) return;
    if (!drawRequirementMet()) { toast('Najpierw dobierz kartę.'); return; }
    if (fromGroupId===toGroupId) return;
    const p=state.players[0];
    const from=state.tableGroups.find(g=>g.id===fromGroupId); const to=state.tableGroups.find(g=>g.id===toGroupId);
    if (!from || !to) return;
    if (!playerHasTableAccess(0)) {
      const movingOldTableCard=state.turnStartTableIds.has(cardUid);
      const targetIsOldGroup=state.turnStartGroupSignatures.has(toGroupId);
      if (movingOldTableCard || targetIsOldGroup) { toast('Przed własnym wejściem możesz przestawiać tylko swoje karty pomiędzy nowymi układami.'); return; }
    }
    if (!rules.meld.allowRearrange && state.turnStartTableIds.has(cardUid)) { toast('Przebudowa istniejących układów jest wyłączona.'); return; }
    const idx=from.cards.findIndex(c=>c.uid===cardUid); if(idx<0) return;
    const [card]=from.cards.splice(idx,1); to.cards.push(card); cleanupEmptyGroups(); activeGroupId=to.id; maybeUnlockEntry(0); render();
  }

  function returnCardToHand(cardUid,fromGroupId) {
    if (!canHumanManipulate()) return;
    const wasOnTable=state.turnStartTableIds.has(cardUid);
    if (wasOnTable && rules.meld.tableCardsStayOnTable) { toast('Karta, która była na stole przed turą, musi pozostać na stole.'); return; }
    if (wasOnTable && !playerHasTableAccess(0)) { toast('Przed wejściem nie możesz zabierać kart ze starego stołu.'); return; }
    if (!wasOnTable && !state.turnOwnedCardIds.has(cardUid)) { toast('Tej karty nie możesz zabrać do ręki.'); return; }
    if (state.entryUnlockedThisTurn && state.entryProofCardIds.has(cardUid)) { toast('Ta karta potwierdziła Twoje wejście i do końca tury musi pozostać na stole.'); return; }
    const from=state.tableGroups.find(g=>g.id===fromGroupId); if (!from) return;
    const idx=from.cards.findIndex(c=>c.uid===cardUid); if(idx<0) return;
    const [card]=from.cards.splice(idx,1); state.players[0].hand.push(card); cleanupEmptyGroups(); render();
  }

  function cleanupEmptyGroups() {
    state.tableGroups=state.tableGroups.filter(g=>g.cards.length>0 || g.id===activeGroupId);
    if (activeGroupId && !state.tableGroups.some(g=>g.id===activeGroupId)) activeGroupId=state.tableGroups[0]?.id ?? null;
  }

  function markFreshGroup(group) {
    if(!group || !rules.meld.highlightNewGroupsUntilNextHumanTurn) return;
    if(state.players?.[state.turn]?.human) return;
    if(!(state.freshGroupIds instanceof Set)) state.freshGroupIds=new Set();
    state.freshGroupIds.add(group.id);
  }

  function isFreshGroup(groupId) {
    if(!rules.meld.highlightNewGroupsUntilNextHumanTurn) return false;
    return !!(state.freshGroupIds?.has(groupId) || state.previousFreshGroupIds?.has(groupId));
  }

  function canHumanManipulate() { return state && !state.finished && state.turn===0; }

  function allTableCards() { return state.tableGroups.flatMap(g=>g.cards); }
  function groupSignature(g) { return [...g.cards.map(c=>c.uid)].sort().join('|'); }

  function playerHasTableAccess(playerId=state?.turn) {
    if (!state || playerId==null) return false;
    const p=state.players[playerId];
    return !!p && (p.entered || (state.turn===playerId && state.entryUnlockedThisTurn));
  }

  // Wejście jest osiągane natychmiast w trakcie tury. Oprócz progu punktowego
  // definicja gry może wymagać określonej liczby czystych sekwensów (bez jokerów).
  function entrySummary(playerId=state?.turn,boardValidation=null) {
    const details=boardValidation?.details || state.tableGroups.filter(g=>g.cards.length).map(group=>({group,analysis:analyzeGroup(group.cards)}));
    let score=0,pureRuns=0,ownOnly=true;
    const proofIds=[];
    for(const {group,analysis} of details) {
      if(state.turnStartGroupSignatures.has(group.id)) continue;
      if(!analysis.valid) continue;
      const own=group.cards.every(c=>state.turnOwnedCardIds.has(c.uid));
      if(!own) { ownOnly=false; continue; }
      score+=analysis.score;
      if(analysis.type==='run'&&group.cards.every(c=>!c.joker)) pureRuns++;
      proofIds.push(...group.cards.map(c=>c.uid));
    }
    return {score,pureRuns,ownOnly,proofIds};
  }

  function entryRequirementMet(summary,er=effectiveRules()) {
    return summary.ownOnly && summary.score>=er.entryMin && summary.pureRuns>=(er.entryPureRunCount||0);
  }

  function maybeUnlockEntry(playerId=state?.turn,{quiet=false}={}) {
    if (!state || playerId==null || state.turn!==playerId) return false;
    const p=state.players[playerId];
    if (!p || p.entered || state.entryUnlockedThisTurn) return false;
    const er=effectiveRules(), summary=entrySummary(playerId);
    if(!entryRequirementMet(summary,er)) return false;
    state.entryUnlockedThisTurn=true;
    state.entryProofCardIds=new Set(summary.proofIds);
    state.entryUnlockSnapshot={score:summary.score,pureRuns:summary.pureRuns};
    const pureText=er.entryPureRunCount?` · czyste sekwensy ${summary.pureRuns}/${er.entryPureRunCount}`:'';
    log(`${p.name}: wejście osiągnięte w trakcie tury za ${summary.score} pkt${pureText} — stół odblokowany.`);
    if (!quiet && p.human) toast(`WEJŚCIE ✓ ${summary.score} pkt${rules.meld.allowRearrange?' — stół odblokowany':' — możesz dokładać do stołu'}`);
    return true;
  }

  const Engine=window.CardSandboxEngine;

  function analyzeGroup(cards,roundNo=state?.round ?? 1) { return Engine.analyzeGroup(rules,effectiveRules(roundNo),cards); }
  function invalidAnalysis(reason) { return {valid:false,type:null,score:0,reason,orderedCards:[],jokerAssignments:{}}; }
  function rankPoint(rank,aceAsLow=false) { return Engine.rankPoint(rules,rank,aceAsLow); }

  function validateWholeBoard() {
    const details=state.tableGroups.filter(g=>g.cards.length).map(g=>({group:g,analysis:analyzeGroup(g.cards)}));
    const invalid=details.filter(x=>!x.analysis.valid);
    const tableIds=new Set(allTableCards().map(c=>c.uid));
    const missingOld=rules.meld.tableCardsStayOnTable?[...state.turnStartTableIds].filter(uid=>!tableIds.has(uid)):[];
    if (missingOld.length) return {valid:false,details,reason:'Co najmniej jedna karta, która była wcześniej na stole, zniknęła ze stołu.'};
    if (invalid.length) return {valid:false,details,reason:`Nielegalny układ: ${invalid[0].analysis.reason}`};
    return {valid:true,details,reason:''};
  }

  function initialEntryScore(playerId,boardValidation) {
    const p=state.players[playerId];
    if (p.entered) return 0;
    const summary=entrySummary(playerId,boardValidation);
    return summary.ownOnly?summary.score:-1;
  }

  function verifyInitialTableUntouched(playerId) {
    const p=state.players[playerId];
    if (p.entered || state.entryUnlockedThisTurn || !rules.meld.initialMeldOwnCardsOnly) return true;
    for (const [groupId,sig] of state.turnStartGroupSignatures.entries()) {
      const current=state.tableGroups.find(g=>g.id===groupId);
      if (!current || groupSignature(current)!==sig) return false;
    }
    return true;
  }

  function discardCardToPile(cardUid,{ai=false}={}) {
    return endTurn(state?.turn,{ai,discardCardUid:cardUid});
  }

  function endTurn(playerId,{ai=false,discardCardUid=null}={}) {
    if (!state || state.finished || state.turn!==playerId) return false;
    const p=state.players[playerId], er=effectiveRules();
    if (!drawRequirementMet()) { if(!ai) toast(`Najpierw dobierz ${er.drawCount} kartę/karty.`); return false; }
    const meldOutWithoutDiscard=er.discardRequired&&er.allowMeldOutWithoutDiscard&&p.hand.length===0;
    if(er.discardRequired && !discardCardUid && !meldOutWithoutDiscard) { if(!ai) toast('Tę turę kończysz odrzuceniem jednej karty na odkryty stos.'); return false; }
    const discardIndex=discardCardUid?p.hand.findIndex(c=>c.uid===discardCardUid):-1;
    if(discardCardUid && discardIndex<0) { if(!ai) toast('Tej karty nie ma już w Twojej ręce.'); return false; }
    if(discardCardUid && state.discardDrawnCardUid===discardCardUid && rules.discard?.mustUseDrawn) {
      if(!ai) toast('Karty zabranej z odkrytego stosu nie możesz od razu odrzucić — musi zostać użyta na stole.');
      return false;
    }
    if (!verifyInitialTableUntouched(playerId)) { if(!ai) toast('Przed pierwszym wejściem nie wolno ruszać układów już leżących na stole.'); return false; }
    const board=validateWholeBoard();
    if (!board.valid) { if(!ai) toast(board.reason); render(); return false; }

    const tableIds=new Set(allTableCards().map(c=>c.uid));
    if(state.discardDrawnCardUid && rules.discard?.mustUseDrawn && !tableIds.has(state.discardDrawnCardUid)) {
      if(!ai) toast('Kartę zabraną ze stosu odrzuconych musisz wykorzystać w legalnym układzie na stole.');
      return false;
    }

    const newlyCommitted=allTableCards().filter(c=>state.turnOwnedCardIds.has(c.uid) && !state.turnStartTableIds.has(c.uid));
    if (!rules.meld.allowPassAfterDraw && newlyCommitted.length===0) { if(!ai) toast('Ta konfiguracja wymaga wyłożenia co najmniej jednej karty przed zakończeniem tury.'); return false; }

    let enteringNow=false, entryInfo=null;
    if(!p.entered && state.entryUnlockedThisTurn) {
      const locked=Engine.validateLockedEntry(state.entryUnlockSnapshot,state.entryProofCardIds,tableIds,{entryMin:er.entryMin,pureRunCount:er.entryPureRunCount});
      if(!locked.valid) {
        if(!ai) toast(locked.reason==='missing-proof'?'Karty, którymi osiągnąłeś wejście, muszą pozostać na stole do końca tury.':'Zapamiętane wejście nie spełnia wymaganych warunków.');
        return false;
      }
      entryInfo={score:locked.score,pureRuns:locked.pureRuns,ownOnly:true,proofIds:[...state.entryProofCardIds]};
      enteringNow=true;
    } else if(!p.entered && newlyCommitted.length) {
      entryInfo=entrySummary(playerId,board);
      if(!entryInfo.ownOnly) { if(!ai) toast('Wejście musi być zbudowane wyłącznie z Twoich kart.'); return false; }
      if(entryInfo.score<er.entryMin) { if(!ai) toast(`Za mało na wejście: ${entryInfo.score} pkt. Potrzeba minimum ${er.entryMin}.`); return false; }
      if(entryInfo.pureRuns<(er.entryPureRunCount||0)) { if(!ai) toast(`Wejście wymaga ${er.entryPureRunCount} czystego sekwensu bez jokera.`); return false; }
      enteringNow=true;
    }

    if(state.discardTakenBeforeEntry) {
      const finishesAfterDiscard=(!!discardCardUid && p.hand.length===1) || (!discardCardUid && meldOutWithoutDiscard);
      if(!enteringNow || !finishesAfterDiscard) {
        if(!ai) toast('Przed wyłożeniem wolno wziąć odkrytą kartę tylko wtedy, gdy w tej turze wchodzisz i kończysz rozdanie.');
        return false;
      }
    }

    if(enteringNow) {
      p.entered=true;
      log(`${p.name}: wejście zatwierdzone za ${entryInfo?.score??er.entryMin} pkt${er.entryPureRunCount?` · czyste sekwensy ${entryInfo?.pureRuns??0}`:''}.`);
    }

    canonicalizeBoard(board);
    const playedCount=newlyCommitted.length;
    if(discardCardUid) {
      const idx=p.hand.findIndex(c=>c.uid===discardCardUid);
      const [card]=p.hand.splice(idx,1);
      state.discardPile=state.discardPile||[];
      state.discardPile.push(card);
      state.discardedThisTurn=true;
      log(`${p.name}: odrzuca ${card.joker?'JOKERA':`${card.rank}${suitSymbol(card.suit)}`} na odkryty stos${playedCount?` · wyłożono ${playedCount} kart(y)`:''}.`);
    } else {
      log(`${p.name}: PROSZĘ — tura zatwierdzona${playedCount?` · wyłożono ${playedCount} kart(y)`:''}.`);
    }
    state.consecutiveNoPlayTurns = playedCount ? 0 : state.consecutiveNoPlayTurns + 1;

    if (p.hand.length===0) { winRound(playerId); return true; }
    const noFutureDeck=!state.deck.length && (!rules.discard?.enabled || !rules.discard?.recycleWhenDeckEmpty || (state.discardPile?.length||0)<=1);
    if (noFutureDeck && state.consecutiveNoPlayTurns>=state.players.length) { resolveStalemate(); return true; }

    state.turn=nextPlayer(playerId); activeGroupId=null; beginTurn(); return true;
  }

  function canonicalizeBoard(boardValidation) {
    for (const {group,analysis} of boardValidation.details) group.cards=[...analysis.orderedCards];
    state.tableGroups=state.tableGroups.filter(g=>g.cards.length>0);
    if (activeGroupId && !state.tableGroups.some(g=>g.id===activeGroupId)) activeGroupId=state.tableGroups[0]?.id ?? null;
  }

  function nextPlayer(id) { return (id+1)%state.players.length; }

  function penaltyLimitLosers() {
    const limit=rules.game?.penaltyLoseAt||0;
    if(!limit || rules.game.scoringMode!=='hand-penalty') return [];
    return state.players.filter(p=>(p.penaltyPoints||0)>=limit);
  }

  function shouldContinuePenaltyMatch() {
    return rules.game.scoringMode==='hand-penalty' && (rules.game?.penaltyLoseAt||0)>0 && penaltyLimitLosers().length===0;
  }

  function setNextRoundStarter(winnerId) {
    const mode=rules.game?.roundStarterMode || 'winner';
    if(mode==='clockwise') state.leader=nextPlayer(state.leader);
    else if(mode==='fixed') state.leader=state.leader % state.players.length;
    else state.leader=winnerId;
  }

  function winRound(playerId) {
    const p=state.players[playerId]; p.roundWins++; setNextRoundStarter(playerId);
    if(rules.game.scoringMode==='hand-penalty') {
      const penalties=[];
      for(const other of state.players) {
        const points=other.id===playerId?0:roundPenalty(other);
        other.penaltyPoints=(other.penaltyPoints||0)+points;
        if(other.id!==playerId) penalties.push(`${other.name} +${points}`);
      }
      log(`${p.name} kończy rundę ${state.round}. Punkty za pozostałe karty: ${penalties.join(' · ')||'brak'}.`);
    } else log(`${p.name} pozbywa się wszystkich kart i wygrywa rundę ${state.round}.`);
    const limitLosers=penaltyLimitLosers();
    if(limitLosers.length) { finishGame({limitLosers}); return; }
    if (!shouldContinuePenaltyMatch() && state.round>=rules.game.totalRounds) { finishGame(); return; }
    state.round++; setTimeout(()=>startRound(state.round),650);
  }

  function resolveStalemate() {
    const scores=state.players.map(p=>({id:p.id,value:handValue(p.hand)})).sort((a,b)=>a.value-b.value);
    const best=scores[0].value; const winners=scores.filter(x=>x.value===best);
    winners.forEach(x=>state.players[x.id].roundWins++);
    setNextRoundStarter(winners[0].id);
    if(rules.game.scoringMode==='hand-penalty') {
      const winnerIds=new Set(winners.map(x=>x.id));
      for(const item of scores) {
        if(winnerIds.has(item.id)) continue;
        const points=roundPenalty(state.players[item.id]);
        state.players[item.id].penaltyPoints=(state.players[item.id].penaltyPoints||0)+points;
      }
    }
    log(`Brak dalszych ruchów. Rundę bierze ${winners.map(x=>state.players[x.id].name).join(', ')} z ręką ${best} pkt.`);
    const limitLosers=penaltyLimitLosers();
    if(limitLosers.length) finishGame({limitLosers});
    else if (!shouldContinuePenaltyMatch() && state.round>=rules.game.totalRounds) finishGame();
    else { state.round++; setTimeout(()=>startRound(state.round),650); }
  }

  function finishGame({limitLosers=[]}={}) {
    state.finished=true; clearTimeout(aiTimer); setAutoPlay(false,{quiet:true});
    let winners,best,label;
    if(rules.game.scoringMode==='hand-penalty') {
      best=Math.min(...state.players.map(p=>p.penaltyPoints||0)); winners=state.players.filter(p=>(p.penaltyPoints||0)===best); label=`${best} pkt karnych`;
    } else {
      best=Math.max(...state.players.map(p=>p.roundWins)); winners=state.players.filter(p=>p.roundWins===best); label=`${best} wygranych rund`;
    }
    if(limitLosers.length) {
      const limit=rules.game?.penaltyLoseAt||0;
      log(`Koniec meczu. ${limitLosers.map(p=>p.name).join(', ')} osiąga ${limit}+ pkt i przegrywa. Najmniej punktów: ${winners.map(p=>p.name).join(', ')} — ${label}.`);
      toast(`Koniec meczu: ${limitLosers.map(p=>p.name).join(', ')} przegrywa`);
    } else {
      log(`Koniec gry. ${winners.map(p=>p.name).join(', ')} — ${label}.`); toast(`Koniec gry: ${winners.map(p=>p.name).join(', ')}`);
    }
    render();
  }

  function handValue(hand) { return hand.reduce((s,c)=>s+(c.joker?(rules.game?.jokerHandPoints||0):rankPoint(c.rank,false)),0); }

  function roundPenalty(player) {
    const base=rules.game?.unenteredPenaltyBase||0;
    if(base>0 && player && !player.entered) {
      const jokers=(player.hand||[]).filter(c=>c.joker).length;
      return base+jokers*(rules.game?.jokerHandPoints||0);
    }
    return handValue(player?.hand||[]);
  }

  function enumerateCandidateMelds(hand) { return Engine.enumerateCandidateMelds(rules,effectiveRules(),hand); }

  function findBestEntryMelds(hand,minScore) { return Engine.findBestEntryMelds(rules,effectiveRules(),hand,minScore,{pureRunCount:effectiveRules().entryPureRunCount||0}); }

  function aiRearrangeUsingTable(p) {
    if (!playerHasTableAccess(p.id) || !rules.meld.allowRearrange || !state.tableGroups.length || !p.hand.length) return 0;
    let totalPlayed=0;

    // Kilka kolejnych lokalnych przebudów pozwala botowi najpierw rozbić
    // jeden układ, a potem wykorzystać nowy stan stołu przy następnym ruchu.
    for (let pass=0; pass<3 && p.hand.length; pass++) {
      let bestMove=null;
      const consider=(groups,kind)=>{
        const solution=Engine.findBestTableRearrangement(rules,effectiveRules(),groups,p.hand,{
          maxNodes: rules.ai.style==='greedy' ? 90000 : 60000,
          maxCandidates: 10000,
          minHandCards:1
        });
        if (!solution) return;
        const candidate={groups,solution,kind};
        if (!bestMove || solution.handCount>bestMove.solution.handCount ||
            (solution.handCount===bestMove.solution.handCount && solution.groups.length<bestMove.solution.groups.length)) bestMove=candidate;
      };

      // Najpierw próbujemy przebudować każdy pojedynczy meld z użyciem ręki.
      for (const group of state.tableGroups) consider([group],'single');

      // Jeżeli pojedynczy meld nie daje dużej korzyści, pozwalamy także na
      // przełożenie kart pomiędzy dwiema istniejącymi kupkami. Limit rozmiaru
      // chroni przeglądarkę przed eksplozją kombinatoryczną.
      if ((!bestMove || bestMove.solution.handCount<3) && state.tableGroups.length<=10) {
        let pairChecks=0;
        for (let i=0;i<state.tableGroups.length && pairChecks<16;i++) {
          for (let j=i+1;j<state.tableGroups.length && pairChecks<16;j++) {
            const a=state.tableGroups[i], b=state.tableGroups[j];
            if (a.cards.length+b.cards.length>12) continue;
            pairChecks++; consider([a,b],'pair');
          }
        }
      }

      if (!bestMove || bestMove.solution.handCount<1) break;
      applyAiRearrangement(p,bestMove);
      totalPlayed+=bestMove.solution.handCount;

      if (rules.ai.style==='random') break;
      if (rules.ai.style==='careful' && totalPlayed>=4) break;
    }
    return totalPlayed;
  }

  function applyAiRearrangement(p,move) {
    const selectedIds=new Set(move.groups.map(g=>g.id));
    const indices=move.groups.map(g=>state.tableGroups.findIndex(x=>x.id===g.id)).filter(i=>i>=0);
    const insertAt=indices.length?Math.min(...indices):state.tableGroups.length;
    const usedHand=new Set(move.solution.usedHandIds);
    p.hand=p.hand.filter(c=>!usedHand.has(c.uid));

    const replacements=move.solution.groups.map(result=>({
      id:`g${groupUid++}`,
      cards:[...result.cards]
    }));
    replacements.forEach(markFreshGroup);
    const remaining=state.tableGroups.filter(g=>!selectedIds.has(g.id));
    remaining.splice(Math.min(insertAt,remaining.length),0,...replacements);
    state.tableGroups=remaining;

    log(`${p.name}: przebudowuje ${move.groups.length===1?'układ':'układy'} stołu i wykorzystuje ${move.solution.handCount} kart(y) z ręki.`);
  }

  function fixedTableExtensionSolution(hand,{maxNodes=36000,maxCandidates=7000}={}) {
    return Engine.findBestTableExtension(rules,effectiveRules(),state.tableGroups,hand,{maxNodes,maxCandidates,minHandCards:1});
  }

  function applyAiFixedTableExtension(p,solution) {
    if(!solution||solution.handCount<1) return 0;
    const usedHand=new Set(solution.usedHandIds||[]);
    p.hand=p.hand.filter(c=>!usedHand.has(c.uid));
    const replacements=new Map((solution.existingGroups||[]).map(g=>[g.id,g]));
    state.tableGroups=state.tableGroups.map(group=>{
      const replacement=replacements.get(group.id);
      return replacement?{id:group.id,cards:[...replacement.cards]}:group;
    });
    for(const result of solution.newGroups||[]) {
      const group={id:`g${groupUid++}`,cards:[...result.cards]};
      state.tableGroups.push(group);
      markFreshGroup(group);
    }
    log(`${p.name}: dokłada do stołu / tworzy nowe układy i wykorzystuje ${solution.handCount} kart(y) z ręki.`);
    return solution.handCount;
  }

  function aiPlayFixedTable(p) {
    if(!playerHasTableAccess(p.id)||rules.meld.allowRearrange||!p.hand.length) return 0;
    return applyAiFixedTableExtension(p,fixedTableExtensionSolution(p.hand,{maxNodes:rules.ai.style==='greedy'?65000:42000,maxCandidates:8500}));
  }

  function chooseAiReservedDiscard(p,er=effectiveRules()) {
    if(!er.discardRequired || !p.hand.length) return null;
    const ordered=[...p.hand].sort((a,b)=>handValue([b])-handValue([a]));
    if(!p.entered) {
      for(const card of ordered) {
        const rest=p.hand.filter(c=>c.uid!==card.uid);
        if(findBestEntryMelds(rest,er.entryMin)) return card;
      }
    } else if(!rules.meld.allowRearrange) {
      // Nie chowaj przed solverem karty, którą da się legalnie wykorzystać.
      // To szczególnie ważne dla Jokera (30 pkt), którego stary algorytm
      // automatycznie rezerwował jako "najdroższy zrzut".
      const plan=fixedTableExtensionSolution(p.hand,{maxNodes:30000,maxCandidates:6500});
      if(plan) {
        const playable=new Set(plan.usedHandIds||[]);
        const spare=ordered.find(card=>!playable.has(card.uid));
        if(spare) return spare;
      }
    }
    return ordered[0]||p.hand[0];
  }

  function aiTakeTurn(playerId) {
    if (!state || state.finished || state.turn!==playerId) return;
    const p=state.players[playerId]; const er=effectiveRules();
    while(er.drawMode!=='none' && state.drawnThisTurn<er.drawCount) { if(!drawCard(playerId,true,{system:true})) break; }
    const reservedDiscard=chooseAiReservedDiscard(p,er);
    if(reservedDiscard) {
      const reserveIndex=p.hand.findIndex(c=>c.uid===reservedDiscard.uid);
      if(reserveIndex>=0) p.hand.splice(reserveIndex,1);
    }

    let played=0;
    if (!p.entered) {
      const solution=findBestEntryMelds(p.hand,er.entryMin);
      if(solution) {
        for(const candidate of solution.chosen) {
          const group={id:`g${groupUid++}`,cards:[]};
          for(const card of candidate.cards) {
            const idx=p.hand.findIndex(c=>c.uid===card.uid); if(idx>=0) group.cards.push(p.hand.splice(idx,1)[0]);
          }
          state.tableGroups.push(group); played+=group.cards.length;
          markFreshGroup(group);
        }
        if (maybeUnlockEntry(playerId,{quiet:true})) {
          // Tak samo jak człowiek: po osiągnięciu progu wejścia bot może od razu
          // w tej samej turze korzystać z kart już leżących na stole.
          if(rules.meld.allowRearrange) {
            played += aiRearrangeUsingTable(p);
            played += aiExtendExistingGroups(p);
          } else played += aiPlayFixedTable(p);
        }
      }
    } else {
      if(!rules.meld.allowRearrange) {
        // Klasyczny Remik: stare meldy pozostają całe. Wspólny solver wybiera
        // najlepsze dokładki (w tym Jokery) oraz nowe meldy z ręki.
        played += aiPlayFixedTable(p);
      } else {
        // Pełnoprawna przebudowa stołu dla gier, które na nią pozwalają.
        played += aiRearrangeUsingTable(p);
        played += aiExtendExistingGroups(p);
        const standalone=enumerateCandidateMelds(p.hand);
        const used=new Set();
        for(const candidate of standalone) {
          if(candidate.cards.some(c=>used.has(c.uid))) continue;
          const group={id:`g${groupUid++}`,cards:[]};
          for(const card of candidate.cards) {
            const idx=p.hand.findIndex(c=>c.uid===card.uid); if(idx>=0) { const [moved]=p.hand.splice(idx,1); group.cards.push(moved); used.add(moved.uid); }
          }
          if(group.cards.length) { state.tableGroups.push(group); markFreshGroup(group); played+=group.cards.length; }
          if(rules.ai.style==='careful' && played>=3) break;
        }
      }
    }

    if(reservedDiscard) p.hand.push(reservedDiscard);
    render();
    aiTimer=setTimeout(()=>{
      if (!endTurn(playerId,{ai:true,discardCardUid:reservedDiscard?.uid||null})) {
        // Bezpieczny rollback, jeśli algorytm bota ułożył coś niepoprawnie.
        restoreAiSnapshotAndPass(playerId);
      }
    },420);
  }

  function aiExtendExistingGroups(p) {
    let played=0; let progress=true;
    while(progress) {
      progress=false;
      outer: for(let hi=0;hi<p.hand.length;hi++) {
        const card=p.hand[hi];
        for(const group of state.tableGroups) {
          const analysis=analyzeGroup([...group.cards,card]);
          if(analysis.valid) {
            group.cards.push(p.hand.splice(hi,1)[0]); played++; progress=true; break outer;
          }
        }
      }
      if(rules.ai.style==='careful' && played>=2) break;
      if(rules.ai.style==='random' && played>=1) break;
    }
    return played;
  }

  function restoreAiSnapshotAndPass(playerId) {
    const snap=state.turnSnapshot;
    state.deck=deepClone(snap.deck); state.discardPile=deepClone(snap.discardPile||[]); state.tableGroups=deepClone(snap.tableGroups);
    state.players.forEach((p,i)=>{ p.hand=deepClone(snap.players[i].hand); p.entered=snap.players[i].entered; });
    state.freshGroupIds=new Set(snap.freshGroupIds||[]);
    state.previousFreshGroupIds=new Set(snap.previousFreshGroupIds||[]);
    state.drawnThisTurn=0; state.drawSource=null; state.discardDrawnCardUid=null; state.discardTakenBeforeEntry=false;
    state.entryUnlockedThisTurn=false;state.entryProofCardIds=new Set();state.entryUnlockSnapshot=null;
    while(effectiveRules().drawMode!=='none' && state.drawnThisTurn<effectiveRules().drawCount) { if(!drawCard(playerId,true,{system:true})) break; }
    const p=state.players[playerId], discard=chooseAiReservedDiscard(p,effectiveRules());
    log(`${p.name}: brak bezpiecznego układu — kończy turę po dobraniu${discard?' i zrzucie':''}.`);
    endTurn(playerId,{ai:true,discardCardUid:discard?.uid||null});
  }

  function maybeRunAI() {
    clearTimeout(aiTimer); if(!state || state.finished) return;
    const p=state.players[state.turn]; if(!p || p.human) return;
    aiTimer=setTimeout(()=>aiTakeTurn(p.id),500);
  }

  // Licznik podpowiedzi dla człowieka. Nie wykonuje ruchu — pyta solver,
  // ile kart z aktualnej ręki da się jeszcze legalnie dołączyć do stołu.
  function bestStandalonePacking(hand) {
    if(!hand.length) return {count:0,usedCardIds:[]};
    const solution=Engine.findBestMeldPacking(rules,effectiveRules(),hand,{maxNodes:26000,maxCandidates:6500,minCards:1});
    return solution ? {count:solution.cardCount,usedCardIds:solution.usedCardIds} : {count:0,usedCardIds:[]};
  }

  function combineRearrangementWithStandalone(solution,hand) {
    if(!solution) return 0;
    const used=new Set(solution.usedHandIds||[]);
    const remaining=hand.filter(c=>!used.has(c.uid));
    return solution.handCount + bestStandalonePacking(remaining).count;
  }

  function estimateDiscardableCards() {
    if(!state || state.finished || state.turn!==0 || !drawRequirementMet()) return null;
    const p=state.players[0], er=effectiveRules();
    if(!p.hand.length) return 0;

    if(!playerHasTableAccess(0)) {
      const entry=findBestEntryMelds(p.hand,er.entryMin);
      return entry ? entry.count : 0;
    }

    let best=bestStandalonePacking(p.hand).count;
    if(!state.tableGroups.length) return best;
    if(!rules.meld.allowRearrange) {
      // W Remiku brak przebudowy stołu nie oznacza braku dokładania. Ten sam
      // fixed-table solver zasila bota i tooltip, więc obie strony widzą Jokery
      // oraz zwykłe karty możliwe do dopięcia do istniejących meldów.
      const extension=fixedTableExtensionSolution(p.hand,{maxNodes:34000,maxCandidates:7000});
      return Math.min(Math.max(best,extension?.handCount||0),p.hand.length);
    }

    const nonEmpty=state.tableGroups.filter(g=>g.cards.length);
    const consider=(groups,maxNodes=32000,maxCandidates=7000)=>{
      const solution=Engine.findBestTableRearrangement(rules,er,groups,p.hand,{maxNodes,maxCandidates,minHandCards:1});
      best=Math.max(best,combineRearrangementWithStandalone(solution,p.hand));
    };

    // Dla niedużego stołu próbujemy całej układanki naraz. Przy większym
    // stole schodzimy do lokalnych układów/par, żeby tooltip pozostał lekki.
    const tableCardCount=nonEmpty.reduce((n,g)=>n+g.cards.length,0);
    if(nonEmpty.length<=7 && tableCardCount<=24) consider(nonEmpty,52000,9000);

    for(const group of nonEmpty) consider([group],22000,5000);
    if(nonEmpty.length<=10) {
      let checks=0;
      for(let i=0;i<nonEmpty.length && checks<10;i++) {
        for(let j=i+1;j<nonEmpty.length && checks<10;j++) {
          if(nonEmpty[i].cards.length+nonEmpty[j].cards.length>12) continue;
          checks++; consider([nonEmpty[i],nonEmpty[j]],26000,6000);
        }
      }
    }
    return Math.min(best,p.hand.length);
  }

  function discardHintKey() {
    if(!state) return 'none';
    const hand=state.players[0].hand.map(c=>c.uid).sort().join(',');
    const table=state.tableGroups.map(g=>g.cards.map(c=>c.uid).sort().join(',')).sort().join(';');
    return [state.round,state.turn,state.finished?1:0,state.players[0].entered?1:0,state.entryUnlockedThisTurn?1:0,state.drawnThisTurn,hand,table].join('|');
  }

  function setDiscardHint(count,message=null) {
    if(!els.discardHint) return;
    els.discardHint.classList.remove('pending','zero','good','disabled');
    if(count===null) {
      els.discardHint.textContent='↘ —';
      els.discardHint.classList.add('disabled');
      setHelpTitle(els.discardHint,message||'Podpowiedź jest dostępna po dobraniu karty w Twojej turze.');
      return;
    }
    els.discardHint.textContent=`↘ ${count}`;
    els.discardHint.classList.add(count>0?'good':'zero');
    setHelpTitle(els.discardHint,message||`Solver widzi możliwość legalnego wyłożenia jeszcze ${count} ${count===1?'karty':(count>=2&&count<=4?'kart':'kart')} z obecnej ręki.`);
  }

  function scheduleDiscardHint() {
    if(!els.discardHint) return;
    clearTimeout(discardHintTimer);
    if(!state || state.finished) { setDiscardHint(null,'Gra jest zakończona.'); return; }
    if(state.turn!==0) { setDiscardHint(null,'Podpowiedź pojawi się w Twojej turze.'); return; }
    if(!drawRequirementMet()) { setDiscardHint(null,'Najpierw dobierz wymaganą kartę.'); return; }

    const key=discardHintKey();
    if(discardHintCache.key===key && discardHintCache.count!==null) { setDiscardHint(discardHintCache.count); return; }
    els.discardHint.textContent='↘ …';
    els.discardHint.className='discard-hint pending';
    setHelpTitle(els.discardHint,'Solver sprawdza, ile kart możesz jeszcze legalnie wyłożyć.');
    discardHintTimer=setTimeout(()=>{
      const before=discardHintKey();
      const count=estimateDiscardableCards();
      if(before!==discardHintKey()) return;
      discardHintCache={key:before,count};
      setDiscardHint(count);
    },90);
  }

  function render() {
    let result;
    if(gameEngine()==='battle') result=renderBattle();
    else if(gameEngine()==='shedding') result=renderShedding();
    else if(gameEngine()==='macao') result=renderMacao();
    else if(gameEngine()==='trick') result=renderTrick();
    else if(gameEngine()==='skat') result=renderSkat();
    else result=renderMeld();
    syncHelpHints();
    return result;
  }

  function renderMacao(){
    if(!macaoState)return;
    document.body.dataset.engine='macao';document.body.dataset.discard='on';prepareUniversalSeating(rules.players.count);
    if(els.battleQuickPlayers){[...els.battleQuickPlayers.options].forEach(o=>o.disabled=false);els.battleQuickPlayers.setAttribute('aria-label','Liczba graczy w Makao');}
    els.pileTitle.textContent='Talia';els.boardTitle.textContent='Stos Makao';
    els.boardHelp.textContent='Wykładaj 1, 3 albo 4 karty tej samej wartości. Dwóch kart nie wolno. Karty muszą pasować kolorem lub wartością.';
    els.discardPileBox.hidden=true;els.undoTurnBtn.hidden=true;els.endTurnBtn.hidden=false;els.endTurnBtn.textContent='WYŁÓŻ →';
    els.meldBoard.classList.remove('battle-board','battle-center-stage');
    const pz=els.playerHand?.closest('.player-zone');if(pz){pz.hidden=false;pz.classList.remove('battle-human-seat','war-active','war-zero');}
    els.discardHint.hidden=true;els.playerHand.className='hand shedding-hand macao-hand';
    const humanTurn=macaoState.turn===0&&!macaoState.finished,selected=selectedMacaoCards();
    const analysis=selected.length?MacaoEngine.analyzePlay(macaoState,selected):null;
    const demandReady=!analysis?.demand||!!macaoDemandValue;
    els.endTurnBtn.disabled=!humanTurn||autoPlayEnabled||!analysis?.valid||!demandReady;
    els.deckPile.disabled=!humanTurn||autoPlayEnabled;els.drawBtn.hidden=true;
    setHelpTitle(els.deckPile,macaoState.penalty?`Dobierz karę: ${macaoState.penalty}`:'Dobierz jedną kartę');
    els.deckCountLabel.textContent=macaoState.deck.length;els.drawState.textContent=macaoState.penalty?`KARA +${macaoState.penalty}`:'dobierz 1';
    const current=macaoState.players[macaoState.turn];els.turnLabel.textContent=macaoState.finished?`Wygrywa ${macaoState.players[macaoState.winnerId].name}`:`Tura: ${current.name}`;
    els.activeRuleHint.textContent=analysis?(analysis.valid?analysis.label:analysis.reason):macaoState.penalty?`Łańcuch kary: +${macaoState.penalty}`:macaoState.request?`Żądanie: ${macaoState.request.value}`:'1 / 3 / 4 jednakowe · nigdy 2';
    els.scoreLabel.textContent=macaoState.penalty?`Kara do pobrania: ${macaoState.penalty}`:macaoState.request?`Żądanie: ${macaoState.request.value}`:'Makao';
    els.humanStatus.textContent='Ty';els.playerMetaScore.textContent=`Ręka: ${macaoState.players[0].hand.length} kart`;

    els.meldBoard.innerHTML='';const stage=document.createElement('div');stage.className='macao-stage';
    const pile=document.createElement('div');pile.className='shedding-pile macao-discard';
    macaoState.discard.slice(-7).forEach((card,i)=>{const node=cardElement(card);node.classList.add('shedding-pile-card');node.style.setProperty('--pile-i',String(i+2));pile.appendChild(node);});stage.appendChild(pile);
    if(macaoState.request){const banner=document.createElement('div');banner.className='macao-current-request';banner.textContent=macaoRequestLabel(macaoState.request);stage.appendChild(banner);}
    if(analysis?.valid&&analysis.demand){
      const demand=document.createElement('div');demand.className='macao-demand';
      const options=analysis.demand==='suit'?[['S','♠'],['H','♥'],['D','♦'],['C','♣']]:['5','6','7','8','9','10'].map(x=>[x,x]);
      demand.innerHTML=`<strong>${analysis.demand==='suit'?'Żądaj koloru':'Żądaj wartości'}</strong>`;
      options.forEach(([value,label])=>{const b=document.createElement('button');b.className=`secondary${macaoDemandValue===value?' active':''}`;b.textContent=label;b.addEventListener('click',()=>{macaoDemandValue=value;render();});demand.appendChild(b);});stage.appendChild(demand);
    }
    if(macaoState.players[0].hand.length===1&&!macaoState.players[0].macaoSafe){
      const b=document.createElement('button');const left=Math.max(0,(macaoDeadline-Date.now())/1000);b.className='macao-call';b.textContent=`MAKAO ${left.toFixed(1)} s`;b.addEventListener('click',callHumanMacao);stage.appendChild(b);
    }
    els.meldBoard.appendChild(stage);
    els.opponents.innerHTML='';macaoState.players.slice(1).forEach((p,index)=>{
      const slot=opponentSeatSlot(index,macaoState.players.length),wrap=document.createElement('div');wrap.className=`opponent table-seat meld-seat seat-${slot}`;wrap.dataset.seat=slot;
      wrap.innerHTML=`<div class="name"><strong>${escapeHtml(p.name)}</strong><span>${p.hand.length}</span></div><div class="seat-state">${p.id===macaoState.turn?'TURA':p.hand.length===1?'MAKAO':'w grze'}</div>`;
      const hand=document.createElement('div');hand.className='mini-hand seat-mini-hand';for(let i=0;i<Math.min(3,p.hand.length);i++){const back=document.createElement('div');back.className='card back';hand.appendChild(back);}wrap.appendChild(hand);els.opponents.appendChild(wrap);
    });
    els.playerHand.innerHTML='';macaoState.players[0].hand.forEach(card=>{const node=cardElement(card);node.dataset.cardUid=card.uid;node.classList.toggle('tap-selected',macaoSelection.has(card.uid));node.addEventListener('click',()=>toggleMacaoCard(card.uid));els.playerHand.appendChild(node);});
    scheduleAutoPlayButtonState();requestAnimationFrame(fitHumanHandToViewport);
  }

  function renderTrick(){
    if(!trickState)return;
    document.body.dataset.engine='trick';document.body.dataset.discard='off';prepareUniversalSeating(3);
    if(els.battleQuickPlayersWrap)els.battleQuickPlayersWrap.hidden=true;
    els.pileTitle.textContent='Musik';els.boardTitle.textContent=`Tysiąc · ${trickPhaseLabel(trickState.phase)}`;
    els.boardHelp.textContent='Obowiązuje dokładanie do koloru, przebijanie i zagranie atutem, jeśli nie masz koloru wyjściowego.';
    els.discardPileBox.hidden=true;els.undoTurnBtn.hidden=true;els.drawBtn.hidden=true;els.deckPile.disabled=true;els.discardHint.hidden=true;
    els.meldBoard.classList.remove('battle-board','battle-center-stage');els.playerHand.className='hand shedding-hand trick-hand';
    const pz=els.playerHand?.closest('.player-zone');if(pz)pz.hidden=false;
    const human=trickState.players[0],canAct=trickHumanCanAct()&&!autoPlayEnabled;
    els.deckCountLabel.textContent=trickState.kitty.length;els.drawState.textContent=trickState.phase==='bidding'?'3 zakryte karty':trickState.phase==='exchange'?'musik odkryty':'';
    els.turnLabel.textContent=trickMatch.finished?`Wygrywa ${trickMatch.players[trickMatch.winnerId].name}`:trickState.phase==='bidding'?`Licytuje: ${trickState.players[trickState.bidTurn].name}`:trickState.phase==='playing'?`Tura: ${trickState.players[trickState.turn].name}`:trickState.phase==='roundEnd'?'Koniec rozdania':`Grający: ${trickState.players[trickState.bidder].name}`;
    els.scoreLabel.textContent=trickMatch.players.map(p=>`${p.name}: ${p.score}${p.score>=800?' 🛢️':''}`).join(' · ');
    els.humanStatus.textContent=`Ty · ${trickMatch.players[0].score} pkt${trickMatch.players[0].score>=800?' · BECZKA':''}`;els.playerMetaScore.textContent=`Ręka: ${human.hand.length} · bomby: ${trickMatch.players[0].bombs}`;
    els.activeRuleHint.textContent=trickState.phase==='bidding'?`Oferta: ${trickState.highBid} · ${trickState.players[trickState.bidder].name}`:trickState.phase==='playing'?`Atu: ${trickState.trump?suitSymbol(trickState.trump)+' '+suitName(trickState.trump):'brak'} · lewa ${trickState.trickNo+1}/8`:trickState.phase==='contract'?`Wylicytowano ${trickState.highBid}`:trickState.phase==='roundEnd'?trickRoundResultLabel():'Wybierz 2 karty do oddania';

    els.endTurnBtn.hidden=trickState.phase==='bidding'||trickMatch.finished||trickRevealActive;
    if(trickState.phase==='exchange'){els.endTurnBtn.textContent='ODDAJ 2 →';els.endTurnBtn.disabled=!canAct||trickSelection.length!==2;}
    else if(trickState.phase==='contract'){els.endTurnBtn.textContent=`GRAM ${trickContractChoice} →`;els.endTurnBtn.disabled=!canAct;}
    else if(trickState.phase==='playing'){els.endTurnBtn.textContent='ZAGRAJ →';els.endTurnBtn.disabled=!canAct||trickSelection.length!==1;}
    else if(trickState.phase==='roundEnd'){els.endTurnBtn.textContent='NASTĘPNE ROZDANIE →';els.endTurnBtn.disabled=trickMatch.finished;}

    els.meldBoard.innerHTML='';const stage=document.createElement('div');stage.className='trick-stage';
    if(trickState.phase==='playing'||trickRevealActive){const active=document.createElement('div');active.className=`trick-active-meld${trickState.trump?' has-meld':''}`;active.textContent=trickState.trump?`MELDUNEK W GRZE: ${TrickEngine.MELDS[trickState.trump]} ${suitSymbol(trickState.trump)} ${suitName(trickState.trump).toUpperCase()}`:'MELDUNEK W GRZE: BRAK';stage.appendChild(active);}
    if(trickRevealActive)renderCurrentTrick(stage,false);
    else if(trickState.phase==='bidding')renderTrickBidding(stage,canAct);
    else if(trickState.phase==='exchange')renderTrickExchange(stage);
    else if(trickState.phase==='contract')renderTrickContract(stage,canAct);
    else if(trickState.phase==='playing')renderCurrentTrick(stage,canAct);
    else renderTrickResult(stage);
    els.meldBoard.appendChild(stage);

    els.opponents.innerHTML='';trickState.players.slice(1).forEach((p,index)=>{
      const slot=opponentSeatSlot(index,3),score=trickMatch.players[p.id].score,wrap=document.createElement('div');wrap.className=`opponent table-seat meld-seat seat-${slot}${score>=800?' on-barrel':''}`;wrap.dataset.seat=slot;
      const phaseState=trickState.phase==='bidding'?(trickState.bidActive.has(p.id)?p.id===trickState.bidTurn?'LICYTUJE':'w licytacji':'PAS'):trickState.phase==='playing'?(p.id===trickState.turn?'TURA':`${p.cardPoints+p.meldPoints} pkt`):p.id===trickState.bidder?'GRAJĄCY':'';
      wrap.innerHTML=`<div class="name"><strong>${escapeHtml(p.name)}</strong><span>${p.hand.length}</span></div><div class="seat-state">${score} pkt${score>=800?' · BECZKA':''} · ${phaseState}</div>`;
      const hand=document.createElement('div');hand.className='mini-hand seat-mini-hand';for(let i=0;i<Math.min(3,p.hand.length);i++){const back=document.createElement('div');back.className='card back';hand.appendChild(back);}wrap.appendChild(hand);els.opponents.appendChild(wrap);
    });
    const legalIds=new Set(trickState.phase==='playing'&&trickState.turn===0?TrickEngine.legalCards(trickState,0).map(c=>c.uid):[]);
    els.playerHand.innerHTML='';human.hand.forEach(card=>{const node=cardElement(card);node.dataset.cardUid=card.uid;node.classList.toggle('tap-selected',trickSelection.includes(card.uid));if(trickState.phase==='playing'&&trickState.turn===0)node.classList.toggle('trick-illegal',!legalIds.has(card.uid));node.addEventListener('click',()=>toggleTrickCard(card.uid));els.playerHand.appendChild(node);});
    scheduleAutoPlayButtonState();requestAnimationFrame(fitHumanHandToViewport);
  }
  function trickPhaseLabel(phase){return ({bidding:'licytacja',exchange:'musik',contract:'kontrakt',playing:'lewy',roundEnd:'wynik'})[phase]||phase;}
  function makeTrickButton(text,onClick,{active=false,danger=false,disabled=false}={}){const b=document.createElement('button');b.className=`secondary${active?' active':''}${danger?' danger':''}`;b.textContent=text;b.disabled=disabled;b.addEventListener('click',onClick);return b;}
  function renderTrickBidding(stage,canAct){
    const box=document.createElement('div');box.className='trick-panel';box.innerHTML=`<strong>LICYTACJA: ${trickState.highBid}</strong><span>Prowadzi ${escapeHtml(trickState.players[trickState.bidder].name)}</span>`;
    if(canAct){const max=TrickEngine.maxBid(trickState.players[0].hand);for(let v=trickState.highBid+10;v<=Math.min(max,trickState.highBid+50);v+=10)box.appendChild(makeTrickButton(String(v),()=>humanTrickBid(v)));box.appendChild(makeTrickButton('PAS',()=>humanTrickBid('pass'),{danger:true}));}
    else{const wait=document.createElement('em');wait.textContent='Czekamy na ruch bota…';box.appendChild(wait);}stage.appendChild(box);
  }
  function renderTrickExchange(stage){
    const box=document.createElement('div');box.className='trick-panel';box.innerHTML=`<strong>MUSIK</strong><span>${trickState.kitty.map(cardShort).join(' · ')}</span><em>${trickState.bidder===0?'Wybierz kolejno dwie karty: pierwsza dla Bota 1, druga dla Bota 2.':'Grający rozdziela karty.'}</em>`;stage.appendChild(box);
  }
  function renderTrickContract(stage,canAct){
    const box=document.createElement('div');box.className='trick-panel';box.innerHTML=`<strong>KONTRAKT</strong><span>Wylicytowano ${trickState.highBid}</span>`;
    if(canAct){
      const max=Math.max(trickState.highBid,TrickEngine.maxBid(trickState.players[0].hand));trickContractChoice=Math.max(trickState.highBid,Math.min(max,trickContractChoice));
      const picker=document.createElement('div');picker.className='trick-contract-picker';
      picker.appendChild(makeTrickButton('−10',()=>{trickContractChoice=Math.max(trickState.highBid,trickContractChoice-10);render();},{disabled:trickContractChoice<=trickState.highBid}));
      const value=document.createElement('strong');value.className='trick-contract-value';value.textContent=String(trickContractChoice);picker.appendChild(value);
      picker.appendChild(makeTrickButton('+10',()=>{trickContractChoice=Math.min(max,trickContractChoice+10);render();},{disabled:trickContractChoice>=max}));box.appendChild(picker);
      const range=document.createElement('em');range.textContent=`Zakres: ${trickState.highBid}–${max}`;box.appendChild(range);
      box.appendChild(makeTrickButton(trickMatch.players[0].bombs?'BOMBA (+60 rywalom)':'BOMBA (bezpłatna)',humanBomb,{danger:true}));
    }stage.appendChild(box);
  }
  function renderCurrentTrick(stage,canAct){
    const table=document.createElement('div');table.className=`trick-cards${trickRevealActive?' trick-reveal':''}`;const plays=trickState.trick.length?trickState.trick:(trickRevealActive?trickState.lastTrick?.cards||[]:[]);
    if(!plays.length){const e=document.createElement('span');e.className='trick-empty';e.textContent=`${trickState.players[trickState.leader].name} rozpoczyna lewę`;table.appendChild(e);}
    plays.forEach(play=>{const w=document.createElement('div');w.className=`trick-play${trickRevealActive&&play.playerId===trickState.lastTrick?.winnerId?' trick-winner':''}`;w.appendChild(cardElement(play.card));const n=document.createElement('span');n.textContent=trickState.players[play.playerId].name;w.appendChild(n);table.appendChild(w);});stage.appendChild(table);
    if(canAct&&trickSelection.length===1){const card=trickState.players[0].hand.find(c=>c.uid===trickSelection[0]),value=TrickEngine.meldValueForPlay(trickState,0,card);if(value){const b=makeTrickButton(`MELDUJ ${value} ${suitSymbol(card.suit)}`,()=>{trickMeldSelected=!trickMeldSelected;render();},{active:trickMeldSelected});b.classList.add('trick-meld-btn');stage.appendChild(b);}}
  }
  function trickRoundResultLabel(){const x=trickState.roundResult;if(x?.bomb)return x.free?'Bezpłatna bomba':'Bomba · rywale +60';return x?`${x.success?'Ugrane':'Przegrane'} ${x.contract} · zdobyte ${x.actual}`:'Koniec';}
  function renderTrickResult(stage){const x=trickState.roundResult,box=document.createElement('div');box.className='trick-panel trick-result';if(x?.bomb)box.innerHTML=`<strong>BOMBA</strong><span>${x.free?'Pierwsza bomba bez kary.':'Przeciwnicy otrzymują po 60 punktów.'}</span>`;else box.innerHTML=`<strong>${x?.success?'KONTRAKT UGRANY':'KONTRAKT PRZEGRANY'}</strong><span>${x?.contract} · zdobyte ${x?.actual}</span>${(x?.points||[]).map(p=>`<em>${escapeHtml(trickState.players[p.id].name)}: karty ${p.cards} + meldunki ${p.melds}</em>`).join('')}`;if(trickMatch.finished)box.innerHTML+=`<strong>WYGRYWA ${escapeHtml(trickMatch.players[trickMatch.winnerId].name.toUpperCase())}</strong>`;stage.appendChild(box);}

  function newSkatGame(){
    clearTimeout(aiTimer);clearTimeout(skatRevealTimer);if(!SkatEngine){toast('Brak silnika skat-engine.js');return;}const issues=validateRules(rules);if(issues.length){toast(issues[0]);return;}
    state=null;battleState=null;sheddingState=null;macaoState=null;trickState=null;trickMatch=null;logClear();const players=Array.from({length:3},(_,i)=>({id:i,name:i===0?'Ty':`Bot ${i}`,human:i===0}));skatMatch=SkatEngine.createMatch({players,rules});startSkatRound();
  }
  function startSkatRound(){
    clearTimeout(skatRevealTimer);skatRevealActive=false;skatSelection=[];skatDeclarationFlags={schneider:false,schwarz:false,open:false};skatState=SkatEngine.startRound(skatMatch,makeDeck(),shuffle);sortSkatHands();
    log(skatState.mode==='ramsch'?`Szkat · rozdanie ${skatMatch.roundNo}. Ramsz suwany (${skatMatch.pendingRamsch+1} z rundki).`:`Szkat · rozdanie ${skatMatch.roundNo}. Rajcuje ${skatState.players[skatState.speaker].name} do ${skatState.players[skatState.listener].name}.`);render();scheduleSkatTurn();
  }
  function sortSkatHands(){if(!skatState)return;const game=skatState.mode==='ramsch'?{type:'grand'}:skatState.game,suits=rules.cardModel.suitOrder;skatState.players.forEach(p=>p.hand.sort((a,b)=>SkatEngine.compareHandCards(a,b,game,suits)));}
  function skatHumanCanAct(){if(!skatState||skatRevealActive)return false;const p=skatState.phase;if(p==='bidding')return skatState.bidTurn===0;if(p==='forehand-choice')return skatState.forehand===0;if(['skat-choice','discard','declaration'].includes(p))return skatState.declarer===0;if(p==='counter')return skatState.counterTurn===0;if(p==='ramsch-pass')return skatState.ramschPasser===0;if(p==='playing')return skatState.turn===0;return p==='roundEnd';}
  function humanSkatBid(action){const r=SkatEngine.bid(skatState,0,action);if(!r.ok){toast(r.reason);return;}log(`Ty: ${action==='pass'?'pas':action==='hold'?'tak':action}.`);afterSkatAction();}
  function humanSkatForehand(play){const r=SkatEngine.forehandChoice(skatState,0,play);if(!r.ok){toast(r.reason);return;}log(play?'Obaj spasowali — grasz z przodka za 18.':'Wszyscy pasują. Rozdanie bez zapisu.');afterSkatAction();}
  function humanChooseSkat(take){const r=SkatEngine.chooseSkat(skatState,0,take);if(!r.ok){toast(r.reason);return;}log(take?'Podnosisz tajlong.':'Grasz z ręki — tajlong pozostaje zakryty.');sortSkatHands();afterSkatAction();}
  function toggleSkatCard(uid){if(!skatHumanCanAct()||!['discard','playing','ramsch-pass'].includes(skatState.phase))return;const i=skatSelection.indexOf(uid);if(i>=0)skatSelection.splice(i,1);else if(['discard','ramsch-pass'].includes(skatState.phase)&&skatSelection.length<2)skatSelection.push(uid);else skatSelection=[uid];render();}
  function discardHumanSkat(){const r=SkatEngine.discardToSkat(skatState,0,skatSelection);if(!r.ok){toast(r.reason);return;}log(`Odkładasz ${r.cards.map(cardShort).join(' i ')} do tajlonga.`);skatSelection=[];sortSkatHands();afterSkatAction();}
  function passHumanRamsch(){const labels=skatSelection.map(id=>skatState.players[0].hand.find(c=>c.uid===id)).filter(Boolean).map(cardShort),r=SkatEngine.passRamsch(skatState,0,skatSelection);if(!r.ok){toast(r.reason);return;}log(`Przesuwasz ${labels.join(' i ')}.`);skatSelection=[];sortSkatHands();afterSkatAction();}
  function declareHumanSkat(type,suit=null){const f=skatDeclarationFlags,r=SkatEngine.declareGame(skatState,0,{type,suit,schneiderAnnounced:type==='null'?false:f.schneider,schwarzAnnounced:type==='null'?false:f.schwarz,open:f.open});if(!r.ok){toast(r.reason);return;}sortSkatHands();log(`Ogłaszasz ${skatGameLabel(skatState.game)} · wartość przed grą ${r.value}.`);if(r.overbid)logSkatResult();afterSkatAction();}
  function toggleSkatDeclarationFlag(flag){skatDeclarationFlags[flag]=!skatDeclarationFlags[flag];if(flag==='open'&&skatDeclarationFlags.open){skatDeclarationFlags.schneider=true;skatDeclarationFlags.schwarz=true;}if(flag==='schwarz'&&skatDeclarationFlags.schwarz)skatDeclarationFlags.schneider=true;render();}
  function humanSkatCounter(call){const r=SkatEngine.counterAction(skatState,0,call);if(!r.ok){toast(r.reason);return;}if(call!=='pass')log(`Ty: ${call.toUpperCase()}!`);afterSkatAction();}
  function playHumanSkatCard(){if(skatSelection.length!==1){toast('Wybierz jedną kartę');return;}const r=SkatEngine.playCard(skatState,0,skatSelection[0]);if(!r.ok){toast(r.reason);return;}logSkatPlay(0,r);skatSelection=[];sortSkatHands();afterSkatAction();}
  function logSkatPlay(id,r){log(`${skatState.players[id].name}: ${cardShort(r.card)}.`);if(r.trickDone){skatRevealActive=true;log(`${skatState.players[r.winnerId].name} bierze sztych za ${r.points}.`);}if(skatState.phase==='roundEnd')logSkatResult();}
  function logSkatResult(){const x=skatState.result;if(!x)return;if(x.ramsch)log(x.march?`${skatState.players[x.winnerId].name}: marsz przez wszystkie sztychy!`:`${skatState.players[x.loserId].name} przegrywa ramsza: ${-x.delta}.`);else log(`${skatState.players[skatState.declarer].name}: ${x.success?'WYGRYWA':'PRZEGRYWA'} · ${x.eyes} oczek · zapis ${x.delta>0?'+':''}${x.delta}.`);}
  function afterSkatAction(){render();if(skatRevealActive){clearTimeout(skatRevealTimer);skatRevealTimer=setTimeout(()=>{skatRevealActive=false;render();scheduleSkatTurn();},autoPlayEnabled?500:1500);}else scheduleSkatTurn();}
  function scheduleSkatTurn(){clearTimeout(aiTimer);clearTimeout(autoPlayTimer);if(!skatState||skatRevealActive||skatState.phase==='roundEnd')return;let id=null;const p=skatState.phase;if(p==='bidding')id=skatState.bidTurn;else if(p==='forehand-choice')id=skatState.forehand;else if(['skat-choice','discard','declaration'].includes(p))id=skatState.declarer;else if(p==='counter')id=skatState.counterTurn;else if(p==='ramsch-pass')id=skatState.ramschPasser;else if(p==='playing')id=skatState.turn;if(id!==0)aiTimer=setTimeout(()=>skatAiAct(id),autoPlayEnabled?140:650);else if(autoPlayEnabled)autoPlayTimer=setTimeout(()=>skatAiAct(0),160);}
  function skatAiAct(id){
    if(!skatState)return;const phase=skatState.phase,p=skatState.players[id];
    if(phase==='bidding'){const limit=SkatEngine.aiBidLimit(p.hand);if(id===skatState.speaker){const v=SkatEngine.nextBidValue(skatState),a=v&&v<=limit?v:'pass';SkatEngine.bid(skatState,id,a);log(`${p.name}: ${a==='pass'?'pas':a}.`);}else{const a=(skatState.pendingBid||0)<=limit?'hold':'pass';SkatEngine.bid(skatState,id,a);log(`${p.name}: ${a==='hold'?'tak':'pas'}.`);}}
    else if(phase==='forehand-choice'){const play=SkatEngine.aiBidLimit(p.hand)>=18;SkatEngine.forehandChoice(skatState,id,play);log(play?`${p.name} gra z przodka za 18.`:'Wszyscy pasują. Rozdanie bez zapisu.');}
    else if(phase==='skat-choice'){const a=SkatEngine.handAnalysis(p.hand),take=!(a.recommended.score>=96);SkatEngine.chooseSkat(skatState,id,take);log(take?`${p.name} podnosi tajlong.`:`${p.name} gra Hand — tajlong zostaje zakryty.`);sortSkatHands();}
    else if(phase==='discard'){const cards=SkatEngine.aiDiscard(p.hand);SkatEngine.discardToSkat(skatState,id,cards.map(c=>c.uid));log(`${p.name} odkłada dwie karty.`);sortSkatHands();}
    else if(phase==='declaration'){const a=SkatEngine.handAnalysis(p.hand,skatState.tookSkat?skatState.valueCards:p.hand),best=a.options.find(o=>o.type!=='null'||(skatState.tookSkat?23:35)>=skatState.highBid)||a.options.find(o=>o.type!=='null'),strongHand=!skatState.tookSkat&&best.type!=='null',r=SkatEngine.declareGame(skatState,id,{type:best.type,suit:best.suit,schneiderAnnounced:strongHand&&best.score>=108,schwarzAnnounced:strongHand&&best.score>=124,open:strongHand&&best.score>=138});sortSkatHands();log(`${p.name} ogłasza ${skatGameLabel(skatState.game)}.`);if(r.overbid)logSkatResult();}
    else if(phase==='counter'){const call=SkatEngine.aiCounterCall(skatState,id);SkatEngine.counterAction(skatState,id,call);if(call!=='pass')log(`${p.name}: ${call.toUpperCase()}!`);}
    else if(phase==='ramsch-pass'){const cards=p.hand.filter(c=>c.rank!=='J').sort((a,b)=>SkatEngine.cardPoints(a)-SkatEngine.cardPoints(b)).slice(0,2);SkatEngine.passRamsch(skatState,id,cards.map(c=>c.uid));log(`${p.name} przesuwa dwie karty.`);sortSkatHands();}
    else if(phase==='playing'){const card=SkatEngine.aiPlay(skatState,id),r=SkatEngine.playCard(skatState,id,card.uid);logSkatPlay(id,r);sortSkatHands();}
    afterSkatAction();
  }
  function skatSuitName(suit){return SkatEngine.SUIT_NAMES?.[suit]||suitName(suit);}
  function skatGameLabel(g){if(!g)return '—';const base=g.type==='grand'?'GRAND':g.type==='null'?'NULL':skatSuitName(g.suit).toUpperCase();return `${base}${g.hand?' HAND':''}${g.schneiderAnnounced?' · SZNAJDER':''}${g.schwarzAnnounced?' · SZFARC':''}${g.open?' · OUVERT':''}`;}
  function skatPhaseLabel(){return ({bidding:'rajcowanie','forehand-choice':'decyzja przodka','skat-choice':'tajlong',discard:'odkładanie',declaration:'zapowiedź',counter:'kontry','ramsch-pass':'ramsz suwany',playing:'sztychy',roundEnd:'wynik'})[skatState.phase]||skatState.phase;}
  function skatBidMeaning(value){return SkatEngine.bidMeanings(value).map(x=>x.label).join(' · ')||'wartość pośrednia';}
  function makeSkatBidButton(title,value,onClick,options={}){const b=makeTrickButton('',onClick,options);b.classList.add('skat-bid-button');b.innerHTML=`<strong>${escapeHtml(String(title))}</strong><small>${value} · ${escapeHtml(skatBidMeaning(value))}</small>`;return b;}
  function renderSkat(){
    if(!skatState)return;document.body.dataset.engine='skat';document.body.dataset.discard='off';prepareUniversalSeating(3);const human=skatState.players[0],canAct=skatHumanCanAct()&&!autoPlayEnabled;
    els.pileTitle.textContent='Tajlong';els.boardTitle.textContent=`Szkat · ${skatPhaseLabel()}`;els.boardHelp.textContent='Nauczyciel pokazuje możliwe gry, sposób liczenia i legalne zagrania bez podglądania kart botów.';els.discardPileBox.hidden=true;els.undoTurnBtn.hidden=true;els.drawBtn.hidden=true;els.deckPile.disabled=true;els.deckCountLabel.textContent=skatState.skat.length||skatState.discarded.length;els.drawState.textContent=skatState.tookSkat?'tajlong podniesiony':'2 zakryte karty';
    const phaseActor=skatState.phase==='counter'?skatState.counterTurn:skatState.phase==='ramsch-pass'?skatState.ramschPasser:skatState.phase==='forehand-choice'?skatState.forehand:skatState.declarer;els.turnLabel.textContent=skatState.phase==='bidding'?`Rajcuje: ${skatState.players[skatState.bidTurn].name}`:skatState.phase==='playing'?`Wybija: ${skatState.players[skatState.turn].name}`:skatState.phase==='roundEnd'?'Koniec rozdania':`Ruch: ${skatState.players[phaseActor]?.name||'—'}`;
    els.scoreLabel.textContent=skatMatch.players.map(p=>`${p.name}: ${p.score}`).join(' · ');els.humanStatus.textContent=`Ty · ${skatMatch.players[0].score} pkt`;els.playerMetaScore.textContent=`Ręka: ${human.hand.length}`;els.activeRuleHint.textContent=skatState.mode==='ramsch'?`RAMSZ SUWANY · zostało ${skatMatch.pendingRamsch}`:skatState.game?`${skatGameLabel(skatState.game)} · ${skatState.counterName||'bez kontry'}`:`Licytacja: ${skatState.highBid||18}`;
    els.endTurnBtn.hidden=true;if(skatState.phase==='discard'){els.endTurnBtn.hidden=false;els.endTurnBtn.textContent='ODŁÓŻ 2 →';els.endTurnBtn.disabled=!canAct||skatSelection.length!==2;}else if(skatState.phase==='ramsch-pass'&&skatState.ramschPasser===0){els.endTurnBtn.hidden=false;els.endTurnBtn.textContent='PRZESUŃ 2 →';els.endTurnBtn.disabled=!canAct||skatSelection.length!==2;}else if(skatState.phase==='playing'){els.endTurnBtn.hidden=false;els.endTurnBtn.textContent='ZAGRAJ →';els.endTurnBtn.disabled=!canAct||skatSelection.length!==1;}else if(skatState.phase==='roundEnd'){els.endTurnBtn.hidden=false;els.endTurnBtn.textContent='NASTĘPNE ROZDANIE →';els.endTurnBtn.disabled=false;}
    els.meldBoard.className='meld-board skat-board';els.meldBoard.innerHTML='';const stage=document.createElement('div');stage.className='skat-stage';renderSkatCenter(stage,canAct);els.meldBoard.appendChild(stage);
    els.opponents.innerHTML='';skatState.players.slice(1).forEach((p,index)=>{const slot=opponentSeatSlot(index,3),wrap=document.createElement('div');wrap.className=`opponent table-seat meld-seat seat-${slot}`;wrap.dataset.seat=slot;wrap.innerHTML=`<div class="name"><strong>${escapeHtml(p.name)}</strong><span>${p.hand.length}</span></div><div class="seat-state">${p.cardPoints} oczek${p.id===skatState.declarer?' · SOLISTA':''}</div>`;const h=document.createElement('div');h.className='mini-hand seat-mini-hand';if(skatState.game?.open&&p.id===skatState.declarer)p.hand.forEach(card=>h.appendChild(cardElement(card)));else for(let i=0;i<Math.min(3,p.hand.length);i++){const b=document.createElement('div');b.className='card back';h.appendChild(b);}wrap.appendChild(h);els.opponents.appendChild(wrap);});
    const legal=new Set(skatState.phase==='playing'&&skatState.turn===0?SkatEngine.legalCards(skatState,0).map(c=>c.uid):[]);els.playerHand.innerHTML='';human.hand.forEach(card=>{const n=cardElement(card);n.dataset.cardUid=card.uid;n.classList.toggle('tap-selected',skatSelection.includes(card.uid));if(skatState.phase==='playing'&&skatState.turn===0)n.classList.toggle('trick-illegal',!legal.has(card.uid));n.addEventListener('click',()=>toggleSkatCard(card.uid));els.playerHand.appendChild(n);});scheduleAutoPlayButtonState();requestAnimationFrame(fitHumanHandToViewport);
  }
  function renderSkatCenter(stage,canAct){
    const phase=skatState.phase;if(skatState.game)renderSkatContractBanner(stage);
    if(skatRevealActive){renderSkatTrick(stage,true);return;}
    if(phase==='playing'){renderSkatTrick(stage,false);if(skatState.turn===0)renderSkatPlayTeacher(stage);return;}if(phase==='roundEnd'){const x=skatState.result,box=document.createElement('div');box.className='trick-panel trick-result';box.innerHTML=x.passed?'<strong>WSZYSCY PAS</strong><span>Rozdanie kończy się bez zapisu.</span>':x.ramsch?(x.march?`<strong>DURCHMARSCH</strong><span>${escapeHtml(skatState.players[x.winnerId].name)} bierze wszystkie sztychy</span>`:`<strong>RAMSZ</strong><span>${escapeHtml(skatState.players[x.loserId].name)} przegrywa · ${-x.delta}</span>`):`<strong>${x.success?'SZPIL WYGRANY':'SZPIL PRZEGRANY'}</strong><span>${x.eyes} oczek · wartość ${x.value} · zapis ${x.delta>0?'+':''}${x.delta}</span>${x.overbid?'<em>Przerajcowany</em>':''}`;stage.appendChild(box);return;}
    const box=document.createElement('div');box.className='trick-panel skat-panel';
    if(phase==='bidding'){const shown=skatState.pendingBid||skatState.highBid;box.innerHTML=`<strong>RAJCOWANIE</strong><span>${shown?`Padło ${shown} · ${escapeHtml(skatBidMeaning(shown))}`:'Jeszcze bez odzywki'}</span>`;if(canAct){if(skatState.bidTurn===skatState.speaker){const v=SkatEngine.nextBidValue(skatState);if(v)box.appendChild(makeSkatBidButton(v,v,()=>humanSkatBid(v)));box.appendChild(makeTrickButton('PAS',()=>humanSkatBid('pass'),{danger:true}));}else{box.appendChild(makeSkatBidButton('TAK',skatState.pendingBid,()=>humanSkatBid('hold')));box.appendChild(makeTrickButton('PAS',()=>humanSkatBid('pass'),{danger:true}));}}}
    else if(phase==='forehand-choice'){box.innerHTML='<strong>OBAJ SPASOWALI</strong><span>Jako przodek możesz podjąć grę za 18 albo oddać rozdanie bez zapisu.</span>';if(canAct){box.appendChild(makeTrickButton('GRAM ZA 18',()=>humanSkatForehand(true)));box.appendChild(makeTrickButton('PAS · NOWE ROZDANIE',()=>humanSkatForehand(false),{danger:true}));}}
    else if(phase==='skat-choice'){box.innerHTML='<strong>TAJLONG</strong><span>Podnosisz dwie karty czy grasz z ręki?</span>';if(canAct){box.appendChild(makeTrickButton('WEŹ TAJLONG',()=>humanChooseSkat(true)));box.appendChild(makeTrickButton('HAND · Z RĘKI',()=>humanChooseSkat(false)));}}
    else if(phase==='discard')box.innerHTML='<strong>ODŁÓŻ DWIE</strong><span>Punkty odłożonych kart będą należały do Ciebie.</span>';
    else if(phase==='ramsch-pass')box.innerHTML=`<strong>RAMSZ SUWANY</strong><span>${escapeHtml(skatState.players[skatState.ramschPasser].name)} przekazuje dwie karty · waletów nie wolno przesuwać</span>`;
    else if(phase==='declaration'){box.innerHTML=`<strong>OGŁOŚ GRĘ</strong><span>Musisz pokryć licytację ${skatState.highBid}</span>`;if(canAct&&skatState.game==null){if(!skatState.tookSkat){['schneider','schwarz','open'].forEach(f=>box.appendChild(makeTrickButton(({schneider:'SZNAJDER',schwarz:'SZFARC',open:'OUVERT'})[f],()=>toggleSkatDeclarationFlag(f),{active:skatDeclarationFlags[f]})));}for(const [s,l] of [['D','♦ SZEL'],['H','♥ HERC'],['S','♠ GRIN'],['C','♣ KROJC']])box.appendChild(makeTrickButton(l,()=>declareHumanSkat('suit',s)));box.appendChild(makeTrickButton('GRAND',()=>declareHumanSkat('grand')));box.appendChild(makeTrickButton('NULL',()=>declareHumanSkat('null')));}}
    else if(phase==='counter'){const call=skatState.counterStage===0?'kontra':skatState.counterStage===1?'ryj':'zup';box.innerHTML=`<strong>${skatState.counterName||'ODZYWKI'}</strong><span>${escapeHtml(skatState.players[skatState.counterTurn].name)} może odpowiedzieć</span>`;if(canAct){box.appendChild(makeTrickButton(call.toUpperCase(),()=>humanSkatCounter(call),{danger:true}));box.appendChild(makeTrickButton('DALEJ',()=>humanSkatCounter('pass')));}}
    stage.appendChild(box);if(['bidding','forehand-choice','skat-choice','discard','declaration'].includes(phase))renderSkatTeacher(stage);
  }
  function renderSkatContractBanner(stage){
    const g=skatState.game,b=document.createElement('div'),eyes=id=>skatState.players[id].cardPoints,tricks=id=>skatState.players[id].tricks.length/3;b.className='skat-active-contract';if(skatState.mode==='ramsch'){b.innerHTML=`<strong>RAMSZ SUWANY</strong><span>KAŻDY NA SIEBIE</span><em>${skatState.players.map(p=>`${escapeHtml(p.name.toUpperCase())} ${eyes(p.id)}`).join(' · ')}</em>`;}
    else{const game=g.type==='grand'?'GRAND':g.type==='null'?'NULL':skatSuitName(g.suit).toUpperCase(),solo=g.type==='null'?tricks(skatState.declarer):eyes(skatState.declarer),defence=skatState.players.filter(p=>p.id!==skatState.declarer).reduce((n,p)=>n+(g.type==='null'?tricks(p.id):eyes(p.id)),0),scoreLabel=g.type==='null'?'SZTYCHY':'OCZKA ZE SZTYCHÓW';b.innerHTML=`<strong>GRA: ${escapeHtml(game)}</strong><span>SOLISTA: ${escapeHtml(skatState.players[skatState.declarer].name.toUpperCase())}</span><em>${scoreLabel} · SOLISTA ${solo} : ${defence} OBRONA</em>`;}
    stage.appendChild(b);
  }
  function skatTeacherDecision(analysis){
    const best=analysis.recommended;if(!best)return '';
    if(skatState.phase==='bidding'){
      if(skatState.bidTurn!==0)return `Teraz rajcuje ${escapeHtml(skatState.players[skatState.bidTurn].name)} — poczekaj na swoją kolej.`;
      const target=skatState.bidTurn===skatState.speaker?SkatEngine.nextBidValue(skatState):skatState.pendingBid;
      if(!target)return 'Nie ma już wyższej legalnej odzywki — spasuj.';
      if(target<=best.value)return skatState.bidTurn===skatState.speaker?`MOŻESZ POWIEDZIEĆ ${target} · widoczna wartość najlepszej gry to ${best.value}.`:`POLECAM TAK · utrzymujesz ${target}, a widoczna wartość ręki to ${best.value}.`;
      return `POLECAM PAS · ${target} przekracza widoczną wartość najlepszej gry: ${best.value}.`;
    }
    if(skatState.phase==='forehand-choice')return best.score>=48?'MOŻESZ GRAĆ ZA 18 · ręka daje rozsądną szansę.':'POLECAM PAS · ręka jest zbyt słaba na wymuszoną grę za 18.';
    if(skatState.phase==='skat-choice')return best.score>=88?'ROZWAŻ HAND · ręka jest mocna, ale tajlong pozostanie nieznany.':'WEŹ TAJLONG · dwie dodatkowe karty mogą poprawić grę.';
    if(skatState.phase==='discard')return 'ODŁÓŻ DOKŁADNIE 2 KARTY · ich oczka zostaną zaliczone solistce lub soliście.';
    if(skatState.phase==='declaration')return `NAJLEPSZY WIDOCZNY KIERUNEK: ${escapeHtml(best.label).toUpperCase()}.`;
    return '';
  }
  function renderSkatTeacher(stage){const hand=skatState.players[0].hand,knownValueCards=skatState.tookSkat&&skatState.valueCards.length?skatState.valueCards:hand,a=SkatEngine.handAnalysis(hand,knownValueCards),tip=document.createElement('aside');tip.className='skat-teacher';tip.innerHTML=`<strong>💡 NAUCZYCIEL SZKATA</strong><div class="skat-teacher-decision">${skatTeacherDecision(a)}</div><span>Ręka: ${a.cardPoints} oczek · ${a.jacks} walet · ${a.aces} as${!skatState.tookSkat&&skatState.phase!=='bidding'?' · bez podglądania tajlonga':''}</span>${a.options.slice(0,3).map((o,i)=>`<div class="skat-tip${i===0?' best':''}"><b>${i===0?'Najlepsza widoczna gra: ':''}${escapeHtml(o.label)}</b><small>ocena ręki ${o.score}/100 · ryzyko ${o.risk}</small></div>`).join('')}`;stage.appendChild(tip);}
  function renderSkatPlayTeacher(stage){const legal=SkatEngine.legalCards(skatState,0),suggestions=SkatEngine.playSuggestions(skatState,0),tip=document.createElement('aside');tip.className='skat-teacher skat-play-teacher';const forced=legal.length<skatState.players[0].hand.length;tip.innerHTML=`<strong>💡 MOŻLIWE RUCHY</strong><span>${forced?'Musisz dołożyć do koloru lub atutu.':'Możesz zagrać dowolną kartę — warianty różnią się celem i ryzykiem.'}</span>${suggestions.map(x=>`<div class="skat-tip play-option${x.recommended?' best':''}"><b>${escapeHtml(x.label)} · ${escapeHtml(cardShort(x.card))}</b><small>${escapeHtml(x.reason)}</small></div>`).join('')}`;stage.appendChild(tip);}
  function renderSkatTrick(stage,reveal){const plays=skatState.trick.length?skatState.trick:(reveal?skatState.lastTrick?.cards||[]:[]),table=document.createElement('div');table.className=`trick-cards${reveal?' trick-reveal':''}`;if(!plays.length)table.innerHTML=`<span class="trick-empty">${escapeHtml(skatState.players[skatState.leader].name)} wybija</span>`;plays.forEach(x=>{const w=document.createElement('div');w.className=`trick-play${reveal&&x.playerId===skatState.lastTrick?.winnerId?' trick-winner':''}`;w.appendChild(cardElement(x.card));const s=document.createElement('span');s.textContent=skatState.players[x.playerId].name;w.appendChild(s);table.appendChild(w);});stage.appendChild(table);}

  function readHelpHintsPreference() {
    try { return localStorage.getItem('cardSandbox.helpHints')==='on'; }
    catch { return false; }
  }

  function setHelpTitle(node,text) {
    if(!node) return;
    node.dataset.helpTitle=text||'';
    if(helpHintsEnabled && text) node.title=text;
    else node.removeAttribute('title');
  }

  function syncHelpHints() {
    document.body.classList.toggle('help-hints-off',!helpHintsEnabled);
    if(els.helpHintsBtn) {
      els.helpHintsBtn.classList.toggle('active',helpHintsEnabled);
      els.helpHintsBtn.setAttribute('aria-pressed',String(helpHintsEnabled));
      els.helpHintsBtn.setAttribute('aria-label',helpHintsEnabled?'Ukryj podpowiedzi':'Pokaż podpowiedzi');
    }
    for(const node of document.querySelectorAll('[title],[data-help-title]')) {
      if(node===els.helpHintsBtn) continue;
      if(helpHintsEnabled) {
        if(!node.title && node.dataset.helpTitle) node.title=node.dataset.helpTitle;
      } else if(node.title) {
        node.dataset.helpTitle=node.title;
        node.removeAttribute('title');
      }
    }
  }

  function toggleHelpHints() {
    helpHintsEnabled=!helpHintsEnabled;
    try { localStorage.setItem('cardSandbox.helpHints',helpHintsEnabled?'on':'off'); } catch {}
    syncHelpHints();
    toast(helpHintsEnabled?'Podpowiedzi włączone.':'Podpowiedzi ukryte.');
  }

  function renderShedding(){
    if(!sheddingState)return;
    document.body.dataset.engine='shedding';document.body.dataset.discard='off';
    prepareUniversalSeating(rules.players.count);
    if(els.battleQuickPlayers){[...els.battleQuickPlayers.options].forEach(o=>o.disabled=Number(o.value)>4);els.battleQuickPlayers.setAttribute('aria-label','Liczba graczy w Pana (2–4)');}
    if(els.pileTitle)els.pileTitle.textContent='Dobieranie ze środka';
    if(els.boardTitle)els.boardTitle.textContent='Stos Pana';
    if(els.boardHelp)els.boardHelp.textContent='Zaznacz jedną kartę albo drabinkę z trójek i czwórek. Trójka wymaga kiera w zagrywanych kartach lub już na stosie. Kliknięcie odkrytej kupki dobiera do 3 kart.';
    if(els.discardPileBox)els.discardPileBox.hidden=true;
    els.undoTurnBtn.hidden=true;els.endTurnBtn.hidden=false;els.endTurnBtn.textContent='WYŁÓŻ →';
    els.meldBoard.classList.remove('battle-board','battle-center-stage');
    const pz=els.playerHand?.closest('.player-zone');if(pz){pz.hidden=false;pz.classList.remove('battle-human-seat','war-active','war-zero');}
    if(els.discardHint)els.discardHint.hidden=true;
    els.playerHand.className='hand shedding-hand';
    const humanTurn=sheddingState.turn===0&&!sheddingState.roundOver&&!sheddingState.finished;
    const selected=selectedSheddingCards();
    const analysis=selected.length?SheddingEngine.analyzePlay(rules,selected,sheddingState.pile.at(-1),{opening:sheddingState.opening,pileCards:sheddingState.pile}):null;
    els.endTurnBtn.disabled=!humanTurn||autoPlayEnabled||!analysis?.valid;
    els.deckPile.disabled=true;
    setHelpTitle(els.deckPile,'W Panie dobierasz, klikając odkrytą kupkę w centrum');
    els.drawBtn.hidden=true;els.drawBtn.disabled=true;
    els.deckCountLabel.textContent=Math.max(0,sheddingState.pile.length-1);
    els.drawState.textContent=sheddingState.opening?'obowiązkowe 9♥':'kliknij kupkę w centrum';
    const current=sheddingState.players[sheddingState.turn];
    els.turnLabel.textContent=sheddingState.finished?'Koniec meczu':sheddingState.roundOver?'Koniec rozdania':`Tura: ${current.name}`;
    els.activeRuleHint.textContent=analysis?(analysis.valid?analysis.label:analysis.reason):'1 karta · 3 z kierem · 4 · drabinki 3/4';
    els.scoreLabel.textContent=sheddingState.players.map(p=>`${p.name}: ${p.letters||'—'}`).join(' · ');
    els.humanStatus.textContent=`Ty · ${sheddingState.players[0].active?'w grze':'zeszłeś z kart'}`;
    els.playerMetaScore.textContent=`Ręka: ${sheddingState.players[0].hand.length} kart`;

    els.meldBoard.innerHTML='';
    const protectedIndex=sheddingState.pile.findIndex(c=>c.rank===rules.shedding.protectedBase.rank&&c.suit===rules.shedding.protectedBase.suit);
    const canTakePile=humanTurn&&!autoPlayEnabled&&!sheddingState.opening&&sheddingState.pile.length>protectedIndex+1;
    const pile=document.createElement('div');pile.className=`shedding-pile${canTakePile?' take-ready':''}`;
    pile.setAttribute('role','button');pile.setAttribute('aria-disabled',String(!canTakePile));pile.tabIndex=canTakePile?0:-1;
    setHelpTitle(pile,canTakePile?`Kliknij, aby wziąć do ${rules.shedding.takeCount} kart`:'Ze stosu nie można teraz dobrać kart');
    if(canTakePile){pile.addEventListener('click',()=>takeFromSheddingPile(0));pile.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();takeFromSheddingPile(0);}});}
    sheddingState.pile.slice(-9).forEach((card,i)=>{const node=cardElement(card);node.classList.add('shedding-pile-card');node.style.setProperty('--pile-i',String(i));pile.appendChild(node);});
    if(!sheddingState.pile.length){const empty=document.createElement('div');empty.className='discard-empty';empty.textContent='Tu zacznie 9♥';pile.appendChild(empty);}
    els.meldBoard.appendChild(pile);

    els.opponents.innerHTML='';
    sheddingState.players.slice(1).forEach((p,index)=>{
      const slot=opponentSeatSlot(index,sheddingState.players.length),wrap=document.createElement('div');
      wrap.className=`opponent table-seat meld-seat seat-${slot}${p.active?'':' eliminated'}`;wrap.dataset.seat=slot;
      wrap.innerHTML=`<div class="name"><strong>${escapeHtml(p.name)}</strong><span>${p.hand.length}</span></div><div class="seat-state ${p.active?'':'yes'}">${p.active?(p.id===sheddingState.turn?'TURA':'w grze'):'wyszedł'} · ${p.letters||'—'}</div>`;
      const hand=document.createElement('div');hand.className='mini-hand seat-mini-hand';for(let i=0;i<Math.min(3,p.hand.length);i++){const back=document.createElement('div');back.className='card back';hand.appendChild(back);}wrap.appendChild(hand);els.opponents.appendChild(wrap);
    });
    els.playerHand.innerHTML='';
    sheddingState.players[0].hand.forEach(card=>{const node=cardElement(card);node.dataset.cardUid=card.uid;node.classList.toggle('tap-selected',sheddingSelection.has(card.uid));node.addEventListener('click',()=>toggleSheddingCard(card.uid));els.playerHand.appendChild(node);});
    scheduleAutoPlayButtonState();requestAnimationFrame(fitHumanHandToViewport);
  }

  function renderDiscardPile() {
    if(!els.discardPileBox || !els.discardPile) return;
    const enabled=!!rules.discard?.enabled;
    els.discardPileBox.hidden=!enabled;
    if(!enabled) return;
    const pile=state.discardPile||[], top=pile[pile.length-1];
    els.discardCountLabel.textContent=String(pile.length);
    els.discardPile.innerHTML='';
    if(top) {
      const node=cardElement(top);
      node.classList.add('discard-top-card');
      els.discardPile.appendChild(node);
    } else {
      const empty=document.createElement('span'); empty.className='discard-empty'; empty.textContent='PUSTO'; els.discardPile.appendChild(empty);
    }
    const er=effectiveRules(), human=canHumanManipulate();
    const canDraw=human && er.drawMode==='manual' && state.drawnThisTurn<er.drawCount && !!top && canDrawFromDiscard(0);
    const canDiscard=human && drawRequirementMet() && state.players[0].hand.length>0;
    els.discardPile.disabled=!(canDraw||canDiscard);
    els.discardPile.classList.toggle('draw-ready',canDraw);
    els.discardPile.classList.toggle('discard-ready',canDiscard);
    setHelpTitle(els.discardPile,tapSelection?.type==='hand'?'Odrzuć zaznaczoną kartę i zakończ turę':canDraw?'Dobierz wierzchnią kartę ze stosu odrzuconych':(!discardMinHandMet(0)&&top?`Odkryty stos wymaga co najmniej ${rules.discard.minHandToDraw} kart w ręce`:'Przeciągnij lub zaznacz kartę z ręki, aby ją odrzucić'));
  }

  function renderMeld() {
    if(!state) return;
    document.body.dataset.engine='meld';
    document.body.dataset.discard=rules.discard?.enabled?'on':'off';
    if(els.pileTitle) els.pileTitle.textContent='Talia';
    if(els.boardTitle) els.boardTitle.textContent='Stół';
    if(els.boardHelp) els.boardHelp.textContent=rules.discard?.enabled
      ? 'Dobierz z talii albo — jeśli wolno — z odkrytego stosu. Układaj meldy jak zwykle; turę kończysz odrzucając jedną kartę na odkryty stos.'
      : 'Dotknij kartę, a potem wybrany układ — albo przeciągnij ją jak wcześniej. Wolne miejsce / „+ nowy układ” tworzy nową kupkę. Ponowny tap w wybraną kartę anuluje zaznaczenie.';
    els.undoTurnBtn.hidden=false; els.endTurnBtn.hidden=false; els.endTurnBtn.textContent='PROSZĘ →';
    prepareUniversalSeating(rules.players.count);
    els.meldBoard.classList.remove('battle-board','battle-center-stage');
    delete els.meldBoard.dataset.playerCount;
    const pz=els.playerHand?.closest('.player-zone');
    if(pz) { pz.hidden=false; pz.classList.remove('battle-human-seat','war-active','war-zero'); }
    if(els.discardHint) els.discardHint.hidden=false;
    els.playerHand.classList.remove('battle-human-hand');
    els.playerHand.classList.add('hand','hand-dropzone');
    scheduleAutoPlayButtonState();
    const p=state.players[state.turn]; const er=effectiveRules();
    els.endTurnBtn.hidden=!!er.discardRequired && !(er.allowMeldOutWithoutDiscard&&state.players[0].hand.length===0&&state.turn===0);
    els.endTurnBtn.textContent=er.discardRequired?'ZAMKNIJ ✓':'PROSZĘ →';
    els.deckCountLabel.textContent=state.deck.length;
    const manualDraw=er.drawMode==='manual';
    const canRecycleDeck=rules.discard?.enabled&&rules.discard?.recycleWhenDeckEmpty&&(state.discardPile?.length||0)>1;
    els.deckPile.disabled=!manualDraw || state.finished || state.turn!==0 || state.drawnThisTurn>=er.drawCount || (!state.deck.length&&!canRecycleDeck);
    els.drawBtn.hidden=!manualDraw;
    els.drawBtn.disabled=els.deckPile.disabled;
    els.drawBtn.textContent=er.drawCount>1?`Dobierz (${state.drawnThisTurn}/${er.drawCount})`:'Dobierz 1';
    els.drawState.classList.toggle('auto-draw-state',er.drawMode==='auto');
    els.drawState.textContent=er.drawMode==='auto'
      ? (state.lastAutoDrawCount?`+${state.lastAutoDrawCount} dobrana${state.lastAutoDrawCount===1?'':'e'}`:(state.deck.length?'auto':'talia pusta'))
      : er.drawMode==='none'?'bez dobierania'
      : drawRequirementMet()?(er.discardRequired?'układaj · potem odrzuć':'możesz układać'):`${Math.max(0,er.drawCount-state.drawnThisTurn)} do dobrania`;
    renderDiscardPile();
    const penaltyMatch=rules.game.scoringMode==='hand-penalty'&&(rules.game?.penaltyLoseAt||0)>0;
    els.turnLabel.textContent=state.finished?'Koniec gry':`${penaltyMatch?`Runda ${state.round}`:`Runda ${state.round}/${rules.game.totalRounds}`} · tura: ${p.name}`;
    els.activeRuleHint.textContent=`wejście ${er.entryMin}${er.entryPureRunCount?` + ${er.entryPureRunCount} czysty sekwens`:''} · As 1/${rules.cardModel.rankPoints.A} · ${rules.meld.allowRearrange?'stół transakcyjny':'bez rozbierania stołu'}`;
    els.scoreLabel.textContent=rules.game.scoringMode==='hand-penalty'?state.players.map(pl=>`${pl.name}: ${pl.penaltyPoints||0}${rules.game.penaltyLoseAt?`/${rules.game.penaltyLoseAt}`:''} pkt`).join(' · '):state.players.map(pl=>`${pl.name}: ${pl.roundWins}W`).join(' · ');
    els.humanStatus.textContent=`Ty · ${state.players[0].entered?'WEJŚCIE ✓':state.entryUnlockedThisTurn?'WEJŚCIE ✓ (ta tura)':'bez wejścia'}`;
    els.playerMetaScore.textContent=`Ręka: ${state.players[0].hand.length} kart · ${handValue(state.players[0].hand)} pkt`;
    scheduleDiscardHint();
    els.undoTurnBtn.disabled=!canHumanManipulate();
    els.endTurnBtn.disabled=!canHumanManipulate();
    renderOpponents(); renderBoard(); renderHumanHand(); refreshTapSelectionClasses();
  }

  function renderOpponents() {
    els.opponents.innerHTML='';
    const opponents=state.players.slice(1);
    opponents.forEach((p,index)=>{
      const slot=opponentSeatSlot(index,state.players.length);
      const wrap=document.createElement('div');
      wrap.className=`opponent table-seat meld-seat seat-${slot}`;
      wrap.dataset.seat=slot;
      wrap.innerHTML=`<div class="name"><strong>${escapeHtml(p.name)}</strong><span>${p.hand.length}</span></div><div class="seat-state ${p.entered?'yes':''}">${p.entered?'WEJŚCIE ✓':'bez wejścia'}</div>`;
      const hand=document.createElement('div'); hand.className='mini-hand seat-mini-hand';
      const shown=Math.min(3,p.hand.length);
      for(let i=0;i<shown;i++){const back=document.createElement('div'); back.className='card back'; hand.appendChild(back);}
      if(p.hand.length>shown){const count=document.createElement('span');count.className='seat-card-count';count.textContent=`+${p.hand.length-shown}`;hand.appendChild(count);}
      wrap.appendChild(hand); els.opponents.appendChild(wrap);
    });
  }

  function appendNewRowDrop(afterGroupId=null) {
    const lane=document.createElement('div');
    lane.className='meld-new-row-drop';
    if(afterGroupId) lane.dataset.afterGroupId=afterGroupId;
    lane.innerHTML='<span>upuść → nowy rząd</span>';
    els.meldBoard.appendChild(lane);
  }

  function fitBoardToViewport() {
    if(!els.meldBoard || gameEngine()==='battle') return;
    const board=els.meldBoard;
    const mobileLike=window.matchMedia('(max-width:900px), (max-height:700px)').matches;
    board.classList.toggle('board-fit-all',mobileLike);
    if(!mobileLike) {
      board.classList.remove('board-ultra-dense','board-half-height');
      ['--board-cols','--board-h','--board-gap','--board-card-w','--board-card-h','--board-card-step','--board-group-h','--board-head-h','--board-head-font','--board-suit-size','--board-corner-size','--board-joker-size','--board-joker-note'].forEach(k=>board.style.removeProperty(k));
      board.querySelectorAll('.meld-group').forEach(g=>{
        ['--group-card-step','--group-card-w','--group-card-h','--group-box-w'].forEach(k=>g.style.removeProperty(k));
      });
      return;
    }

    const groups=[...board.querySelectorAll('.meld-group')];
    const count=groups.length;
    const portrait=window.matchMedia('(orientation:portrait)').matches;
    const boardStyle=getComputedStyle(board);
    const boardPadX=(parseFloat(boardStyle.paddingLeft)||0)+(parseFloat(boardStyle.paddingRight)||0);
    // Flex pakuje elementy w CONTENT BOX, a clientWidth zawiera padding. Poprzednio
    // brakowało tu kilku pikseli i model potrafił uznać, że 4 meldy wejdą w rząd,
    // podczas gdy przeglądarka realnie zawijała czwarty do następnego rzędu.
    const boardW=Math.max(220,(board.clientWidth || board.parentElement?.clientWidth || window.innerWidth-12)-boardPadX-2);
    const baseTargetH=portrait
      ? Math.round(Math.max(132,Math.min(220,window.innerHeight*.285)))
      : Math.round(Math.max(100,Math.min(168,window.innerHeight*.34)));
    const gap=3;

    if(!count) {
      board.classList.remove('board-ultra-dense','board-half-height');
      board.style.setProperty('--board-h',`${baseTargetH}px`);
      return;
    }

    const cardCounts=groups.map(g=>Math.max(1,Number(g.dataset.cardCount)||g.querySelectorAll('.meld-cards .card').length||1));
    const totalCards=cardCounts.reduce((a,b)=>a+b,0);

    // Przy naprawdę pełnym stole oddajemy mu trochę więcej wysokości zamiast
    // ścinać ostatni rząd. Na telefonie zwykle i tak mamy pod stołem wolne miejsce,
    // a ważniejsze jest, żeby KAŻDY układ był dostępny bez wewnętrznego scrolla.
    const crowd= Math.max(0,count-6) + Math.max(0,Math.ceil((totalCards-20)/4));
    const hardMaxH=portrait
      ? Math.round(Math.max(baseTargetH,Math.min(520,window.innerHeight*.64)))
      : Math.round(Math.max(baseTargetH,Math.min(270,window.innerHeight*.56)));
    const targetH=Math.min(hardMaxH,baseTargetH + crowd*(portrait?12:8));

    function packRows(widths) {
      let rows=1, used=0;
      for(const raw of widths) {
        const w=Math.min(boardW,Math.max(18,raw));
        if(used===0) used=w;
        else if(used+gap+w<=boardW+.5) used+=gap+w;
        else { rows++; used=w; }
      }
      return rows;
    }

    // „Połówki” dotyczą WYSOKOŚCI karty, nie bocznego wachlarza:
    // przy dużej liczbie układów chowamy dolną połowę kart, zachowując pełną
    // szerokość, rangę i kolor u góry. Dzięki temu kolejne rzędy zajmują
    // około połowę miejsca w pionie, a ♠/♣ pozostają czytelne.
    const maxCardW=portrait?52:54;
    const halfHeightMode=totalCards>=24 || count>=8;
    const visibleRatio=halfHeightMode?.52:1;
    // W poziomie zostawiamy tylko umiarkowane nakładanie — 50% nie jest już
    // „połówką”. Priorytetem jest czytelna szerokość kart.
    const horizontalRatios=halfHeightMode?[.68,.60]:[.78,.68,.60];
    let best=null;
    for(const ratio of horizontalRatios) {
      let modeBest=null;
      for(let candidate=maxCardW; candidate>=7; candidate-=1) {
        const step=Math.max(4,candidate*ratio);
        const cardH=Math.max(12,Math.min(76,candidate*1.46));
        const visibleCardH=Math.max(10,Math.ceil(cardH*visibleRatio));
        const headH=candidate<15?0:Math.max(7,Math.min(12,candidate*.24));
        const groupH=Math.ceil(visibleCardH+headH+6);
        const widths=cardCounts.map(n=>Math.min(boardW,Math.ceil(candidate+step*Math.max(0,n-1)+8)));
        const rows=packRows(widths);
        const neededH=rows*groupH+Math.max(0,rows-1)*gap;
        if(neededH<=targetH+1) {
          modeBest={cardW:candidate,cardH,visibleCardH,headH,groupH,step,widths,rows,neededH,ratio,visibleRatio};
          break;
        }
      }
      if(modeBest && (!best || modeBest.cardW>best.cardW || (modeBest.cardW===best.cardW && modeBest.ratio>best.ratio))) best=modeBest;
    }

    if(!best) {
      const cardW=7, ratio=.60, step=4, cardH=11, visibleCardH=Math.ceil(cardH*visibleRatio), headH=0, groupH=visibleCardH+5;
      const widths=cardCounts.map(n=>Math.min(boardW,Math.ceil(cardW+step*Math.max(0,n-1)+6)));
      best={cardW,cardH,visibleCardH,headH,groupH,step,widths,rows:packRows(widths),ratio,visibleRatio};
    }

    board.classList.toggle('board-half-height',halfHeightMode);
    const dense=best.headH===0 || best.cardW<15;
    board.classList.toggle('board-ultra-dense',dense);
    board.style.setProperty('--board-h',`${targetH}px`);
    board.style.setProperty('--board-gap',`${gap}px`);
    board.style.setProperty('--board-card-w',`${best.cardW}px`);
    board.style.setProperty('--board-card-h',`${best.cardH}px`);
    board.style.setProperty('--board-card-step',`${best.step}px`);
    board.style.setProperty('--board-group-h',`${best.groupH}px`);
    board.style.setProperty('--board-head-h',`${best.headH}px`);
    board.style.setProperty('--board-head-font',`${Math.max(4.5,Math.min(7,best.cardW*.18))}px`);
    board.style.setProperty('--board-suit-size',`${Math.max(11,Math.min(27,best.cardW*.58))}px`);
    board.style.setProperty('--board-corner-size',`${Math.max(6,Math.min(13,best.cardW*.28))}px`);
    board.style.setProperty('--board-joker-size',`${Math.max(4,Math.min(7,best.cardW*.15))}px`);
    board.style.setProperty('--board-joker-note',`${Math.max(3,Math.min(5,best.cardW*.11))}px`);

    groups.forEach((group,i)=>{
      const n=cardCounts[i];
      const boxW=Math.max(best.cardW+8,best.widths[i]);
      group.style.setProperty('--group-box-w',`${boxW}px`);
      group.style.setProperty('--group-card-w',`${best.cardW}px`);
      group.style.setProperty('--group-card-h',`${best.cardH}px`);
      group.style.setProperty('--group-card-step',`${n>1?best.step:best.cardW}px`);
    });

    // Geometria flexa potrafi zaokrąglić szerokości inaczej niż nasz model
    // (szczególnie przy DPR ~2 i 15+ meldach). Mierzymy więc FAKTYCZNY ostatni
    // rząd po nałożeniu zmiennych i w razie potrzeby powiększamy planszę.
    // To jest synchroniczny reflow w tej samej klatce — nic nie powinno migać.
    let actualBottom=0;
    for(const group of groups) actualBottom=Math.max(actualBottom,group.offsetTop+group.offsetHeight);
    const neededActualH=Math.ceil(actualBottom+2);
    // Plansza ma być dokładnie tak wysoka, jak potrzeba: nie ucina ostatniego rzędu,
    // ale też nie zostawia wielkiej pustej zielonej przestrzeni.
    const finalBoardH=Math.max(baseTargetH,neededActualH);
    board.style.setProperty('--board-h',`${finalBoardH}px`);
    board.dataset.fitNeededHeight=String(neededActualH);
    board.dataset.fitRatio=String(best.ratio);
    board.dataset.visibleCardRatio=String(best.visibleRatio ?? 1);
    if(els.boardValidation) {
      const base=els.boardValidation.textContent.replace(/ · karty ½ wysokości$/,'').replace(/ · wachlarz 50%$/,'');
      els.boardValidation.textContent=base+(halfHeightMode?' · karty ½ wysokości':'');
    }
  }

  function renderBoard() {
    els.meldBoard.innerHTML='';
    if(!state.tableGroups.length) {
      const empty=document.createElement('div'); empty.className='meld-empty'; empty.textContent='Stół jest pusty. Dobierz kartę i przeciągnij ją tutaj.'; els.meldBoard.appendChild(empty);
    }
    let validCount=0, invalidCount=0, draftCount=0;
    const minMeld=Math.min(rules.meld.runMin,rules.meld.setMin);
    for(const group of state.tableGroups) {
      const analysis=group.cards.length?analyzeGroup(group.cards):invalidAnalysis('Pusty układ');
      const isDraft=!analysis.valid && group.cards.length>0 && group.cards.length<minMeld &&
        state.turn===0 && !state.turnStartGroupSignatures.has(group.id) &&
        group.cards.every(c=>state.turnOwnedCardIds.has(c.uid));
      if(analysis.valid) validCount++; else if(isDraft) draftCount++; else if(group.cards.length) invalidCount++;
      const stateClass=analysis.valid?'valid':isDraft?'draft':'invalid';
      const closedNaturalSet=!!(rules.meld.collapseClosedNaturalSets&&analysis.valid&&analysis.type==='set'&&group.cards.length===rules.meld.setMax&&group.cards.every(c=>!c.joker));
      const box=document.createElement('div'); box.className=`meld-group ${group.cards.length>=5?'meld-wide':''} ${closedNaturalSet?'closed-natural-set':''} ${isFreshGroup(group.id)?'recent-meld':''} ${group.id===activeGroupId?'active':''} ${group.cards.length?stateClass:''}`; box.dataset.groupId=group.id; box.dataset.cardCount=String(closedNaturalSet?1:group.cards.length);
      const status=group.cards.length ? (analysis.valid ? `✓ ${analysis.type==='run'?'sekwens':closedNaturalSet?'zamknięta czwórka':'grupa'} · ${analysis.score} pkt` : isDraft ? `… układ roboczy · ${group.cards.length}/${minMeld}` : `✕ ${analysis.reason}`) : 'pusty — wrzuć karty';
      box.innerHTML=`<div class="meld-head"><span>Układ ${escapeHtml(group.id.replace('g','#'))}</span><span class="meld-status ${stateClass}">${escapeHtml(status)}</span></div><div class="meld-cards"></div>`;
      box.addEventListener('click',e=>{
        if(e.target.closest('.card')) return;
        if(tapSelection) { e.preventDefault(); e.stopPropagation(); placeTapSelectionInGroup(group.id); return; }
        activeGroupId=group.id; renderBoard();
      });
      setupGroupDrop(box,group);
      const cardsEl=box.querySelector('.meld-cards');
      const displayCards=analysis.valid?analysis.orderedCards:group.cards;
      for(const card of displayCards) {
        const node=cardElement(card,analysis.jokerAssignments?.[card.uid]);
        node.dataset.cardUid=card.uid;
        // Wymiana jokera ma sens dopiero w ukończonym, legalnym meldunku.
        // W układzie roboczym (np. JOKER + druga karta) kliknięcie jokera
        // powinno dołożyć zaznaczoną kartę do kupki, a nie próbować wymiany.
        const canReplaceJoker=card.joker && analysis.valid && rules.meld.allowJokerReplacement && playerHasTableAccess(0);
        if(canReplaceJoker) node.classList.add('joker-replace-target');
        if(tapSelection?.cardUid===card.uid) node.classList.add('tap-selected');
        if(canHumanManipulate() && drawRequirementMet()) {
          if(canReplaceJoker) {
            node.addEventListener('click',e=>{
              if(Date.now()<suppressClickUntil || tapSelection?.type!=='hand') return;
              e.preventDefault(); e.stopImmediatePropagation();
              const selected=tapSelection.cardUid;
              clearTapSelection(false);
              replaceJokerWithHandCard(selected,group.id,card.uid);
            });
          }
          const canMove=playerHasTableAccess(0) && (rules.meld.allowRearrange || !state.turnStartTableIds.has(card.uid));
          if(canMove || state.turnOwnedCardIds.has(card.uid)) {
            node.draggable=true; node.classList.add('clickable');
            node.addEventListener('dragstart',e=>{ dragPayload={type:'table',cardUid:card.uid,fromGroupId:group.id}; node.classList.add('dragging'); setBoardDragExpansion(true); e.dataTransfer.effectAllowed='move'; });
            node.addEventListener('dragend',()=>{node.classList.remove('dragging'); setBoardDragExpansion(false); els.meldBoard.classList.remove('free-drop-target'); dragPayload=null;});
            attachTouchDrag(node,()=>({type:'table',cardUid:card.uid,fromGroupId:group.id}));
            node.addEventListener('click',e=>{
              if(Date.now()<suppressClickUntil) { e.preventDefault(); e.stopPropagation(); return; }
              if(tapSelection?.type==='hand') {
                e.preventDefault(); e.stopPropagation();
                placeTapSelectionInGroup(group.id);
                return;
              }
              e.stopPropagation();
              toggleTapSelection({type:'table',cardUid:card.uid,fromGroupId:group.id});
            });
            if(state.turnOwnedCardIds.has(card.uid) && !state.turnStartTableIds.has(card.uid)) node.addEventListener('dblclick',e=>{e.stopPropagation();returnCardToHand(card.uid,group.id);});
          }
        }
        cardsEl.appendChild(node);
      }
      els.meldBoard.appendChild(box);
    }
    ensureDynamicBoardDropZone();
    if(dragPayload || touchDrag?.dragging) setBoardDragExpansion(true);
    const allValid=invalidCount===0 && draftCount===0;
    els.boardValidation.className=`board-validation ${invalidCount?'bad':draftCount?'pending':'ok'}`;
    els.boardValidation.textContent=invalidCount ? `${invalidCount} niepoprawnych układów` : draftCount ? `${draftCount} układ roboczy — dokończ przed ${effectiveRules().discardRequired?'zrzutem':'PROSZĘ'}` : `${validCount} poprawnych układów`;
    // Dopasowanie wykonujemy w tym samym przebiegu renderu. Wcześniejszy RAF
    // pokazywał przez jedną klatkę domyślne szerokości, co powodowało migotanie.
    fitBoardToViewport();
  }

  function setupGroupDrop(box,group) {
    box.addEventListener('dragover',e=>{ if(!canHumanManipulate())return; e.preventDefault(); e.dataTransfer.dropEffect='move'; box.classList.add('active'); });
    box.addEventListener('dragleave',()=>{ if(group.id!==activeGroupId) box.classList.remove('active'); });
    box.addEventListener('drop',e=>{
      e.preventDefault(); e.stopPropagation(); activeGroupId=group.id;
      if(!dragPayload) return;
      if(dragPayload.type==='hand') {
        const jokerTarget=e.target.closest('.card.joker[data-card-uid]');
        if(jokerTarget && replaceJokerWithHandCard(dragPayload.cardUid,group.id,jokerTarget.dataset.cardUid)) { dragPayload=null; return; }
        if(canDropHandCardIntoGroup(group)) addHandCardToSpecificGroup(dragPayload.cardUid,group.id);
      } else if(dragPayload.type==='table') moveTableCard(dragPayload.cardUid,dragPayload.fromGroupId,group.id);
      dragPayload=null; render();
    });
  }

  function replaceJokerWithHandCard(handCardUid,groupId,jokerUid,{quiet=false}={}) {
    if(!rules.meld.allowJokerReplacement || !canHumanManipulate() || !drawRequirementMet() || !playerHasTableAccess(0)) return false;
    const group=state.tableGroups.find(g=>g.id===groupId), p=state.players[0];
    if(!group) return false;
    const handIndex=p.hand.findIndex(c=>c.uid===handCardUid), jokerIndex=group.cards.findIndex(c=>c.uid===jokerUid&&c.joker);
    if(handIndex<0||jokerIndex<0) return false;
    const handCard=p.hand[handIndex], joker=group.cards[jokerIndex];
    const candidate=group.cards.map((c,i)=>i===jokerIndex?handCard:c);
    const analysis=analyzeGroup(candidate);
    if(!analysis.valid) { if(!quiet) toast('Ta karta nie może prawidłowo zastąpić tego jokera.'); return false; }
    p.hand.splice(handIndex,1);
    group.cards[jokerIndex]=handCard;
    p.hand.push(joker);
    state.turnOwnedCardIds.add(joker.uid);
    activeGroupId=groupId;
    maybeUnlockEntry(0);
    if(!quiet) toast('Joker odzyskany — przed końcem tury wykorzystaj go ponownie na stole.');
    log(`Ty: zastępujesz jokera kartą ${handCard.rank}${suitSymbol(handCard.suit)} i odzyskujesz jokera.`);
    render();
    return true;
  }

  function addHandCardToSpecificGroup(cardUid,groupId) {
    const group=state.tableGroups.find(g=>g.id===groupId); if(!group) return;
    if(!canDropHandCardIntoGroup(group)) return;
    const p=state.players[0]; const idx=p.hand.findIndex(c=>c.uid===cardUid); if(idx<0)return;
    group.cards.push(p.hand.splice(idx,1)[0]); activeGroupId=groupId; maybeUnlockEntry(0); render();
  }

  function renderHumanHand() {
    const p=state.players[0]; els.playerHand.innerHTML='';
    const handCount=p.hand.length;
    els.playerHand.classList.toggle('cards-many',handCount>=10);
    els.playerHand.classList.toggle('cards-crowded',handCount>=14);
    els.playerHand.classList.toggle('cards-packed',handCount>=18);
    const humanTurn=canHumanManipulate();
    p.hand.forEach((card,index)=>{
      const node=cardElement(card);
      node.dataset.cardUid=card.uid;
      node.dataset.handIndex=String(index);
      if(tapSelection?.cardUid===card.uid) node.classList.add('tap-selected');
      // Układanie własnej ręki jest zawsze dozwolone — nie zmienia zasad ani stanu stołu.
      node.draggable=true;
      node.classList.add('hand-sortable');
      if(humanTurn && drawRequirementMet()) {
        node.classList.add('clickable');
        if(!state.turnSnapshot?.players[0].hand.some(c=>c.uid===card.uid)) node.classList.add('new-this-turn');
        node.addEventListener('click',e=>{
          if(Date.now()<suppressClickUntil){ e.preventDefault(); return; }
          e.stopPropagation();
          toggleTapSelection({type:'hand',cardUid:card.uid,fromHandIndex:Number(node.dataset.handIndex)});
        });
      }
      node.addEventListener('dragstart',e=>{
        dragPayload={type:'hand',cardUid:card.uid,fromHandIndex:index};
        node.classList.add('dragging');
        setBoardDragExpansion(true);
        e.dataTransfer.effectAllowed='move';
        // Firefox wymaga danych, aby DnD działało niezawodnie.
        try { e.dataTransfer.setData('text/plain',card.uid); } catch (_) {}
      });
      node.addEventListener('dragend',()=>{
        node.classList.remove('dragging');
        clearHandDropIndicator();
        setBoardDragExpansion(false);
        els.meldBoard.classList.remove('free-drop-target');
        dragPayload=null;
      });
      attachTouchDrag(node,()=>({type:'hand',cardUid:card.uid,fromHandIndex:Number(node.dataset.handIndex)}));
      els.playerHand.appendChild(node);
    });
    setupHandDropOnce();
    requestAnimationFrame(fitHumanHandToViewport);
  }

  function fitHumanHandToViewport() {
    if(!els.playerHand) return;
    const hand=els.playerHand;
    const cards=[...hand.querySelectorAll('.card')];
    const portrait=window.matchMedia('(max-width:700px) and (orientation:portrait)').matches;
    if(!portrait || !cards.length) {
      ['--hand-card-w','--hand-card-h','--hand-overlap','--hand-suit-size','--hand-corner-size','--hand-joker-size'].forEach(k=>hand.style.removeProperty(k));
      hand.style.removeProperty('justify-content');
      return;
    }
    const n=cards.length;
    const available=Math.max(220, hand.clientWidth-8);
    let width=n<=8?56:n<=12?52:n<=16?48:n<=22?44:40;
    width=Math.min(width,Math.max(34,Math.floor(available/4.8)));
    const height=Math.round(width*1.47);
    let step=n>1?Math.min(width,(available-width)/(n-1)):width;
    step=Math.max(7,step);
    // Przy maksymalnej ręce wolimy mocniejsze nakładanie niż poziomy scroll.
    if(n>1 && width+(n-1)*step>available) step=Math.max(4,(available-width)/(n-1));
    const overlap=step-width;
    const total=width+(n-1)*step;
    hand.style.setProperty('--hand-card-w',`${width}px`);
    hand.style.setProperty('--hand-card-h',`${height}px`);
    hand.style.setProperty('--hand-overlap',`${overlap}px`);
    hand.style.setProperty('--hand-suit-size',`${Math.max(18,Math.round(width*.54))}px`);
    hand.style.setProperty('--hand-corner-size',`${Math.max(10,Math.round(width*.24))}px`);
    hand.style.setProperty('--hand-joker-size',`${Math.max(7,Math.round(width*.18))}px`);
    hand.style.justifyContent=total<available-18?'center':'flex-start';
  }

  function clearHandDropIndicator() {
    els.playerHand.querySelectorAll('.hand-insert-before,.hand-insert-after').forEach(n=>n.classList.remove('hand-insert-before','hand-insert-after'));
  }

  function handDropTarget(e) {
    const target=e.target.closest('.card[data-card-uid]');
    if(!target || target.dataset.cardUid===dragPayload?.cardUid) return {targetUid:null,after:true};
    const rect=target.getBoundingClientRect();
    return {targetUid:target.dataset.cardUid,after:e.clientX > rect.left + rect.width/2,target};
  }

  function reorderHandCard(cardUid,targetUid=null,after=true) {
    const hand=state?.players?.[0]?.hand;
    if(!hand) return false;
    const from=hand.findIndex(c=>c.uid===cardUid);
    if(from<0) return false;
    const [card]=hand.splice(from,1);
    let to=hand.length;
    if(targetUid) {
      const targetIndex=hand.findIndex(c=>c.uid===targetUid);
      if(targetIndex>=0) to=targetIndex+(after?1:0);
    }
    hand.splice(Math.max(0,Math.min(to,hand.length)),0,card);
    return true;
  }

  let handDropSetup=false;
  function setupHandDropOnce() {
    if(handDropSetup) return; handDropSetup=true;
    els.playerHand.addEventListener('dragover',e=>{
      if(!dragPayload) return;
      if(dragPayload.type==='table') {
        e.preventDefault();
        e.dataTransfer.dropEffect='move';
        els.playerHand.classList.add('drop-target');
        return;
      }
      if(dragPayload.type==='hand') {
        e.preventDefault();
        e.dataTransfer.dropEffect='move';
        els.playerHand.classList.add('drop-target','reordering');
        clearHandDropIndicator();
        const pos=handDropTarget(e);
        if(pos.target) pos.target.classList.add(pos.after?'hand-insert-after':'hand-insert-before');
      }
    });
    els.playerHand.addEventListener('dragleave',e=>{
      if(!els.playerHand.contains(e.relatedTarget)) {
        els.playerHand.classList.remove('drop-target','reordering');
        clearHandDropIndicator();
      }
    });
    els.playerHand.addEventListener('drop',e=>{
      e.preventDefault();
      els.playerHand.classList.remove('drop-target','reordering');
      if(dragPayload?.type==='table') {
        returnCardToHand(dragPayload.cardUid,dragPayload.fromGroupId);
      } else if(dragPayload?.type==='hand') {
        const pos=handDropTarget(e);
        if(reorderHandCard(dragPayload.cardUid,pos.targetUid,pos.after)) renderHumanHand();
      }
      clearHandDropIndicator();
      dragPayload=null;
    });
  }

  function attachTouchDrag(node,payloadFactory) {
    node.classList.add('touch-draggable');
    node.addEventListener('pointerdown',e=>{
      // Mysz korzysta z natywnego HTML5 DnD; ten tor jest dla palca/pióra.
      if(e.pointerType==='mouse' || (typeof e.button==='number' && e.button!==0) || touchDrag) return;
      const payload=payloadFactory();
      if(!payload) return;
      touchDrag={ pointerId:e.pointerId, node, payload, startX:e.clientX, startY:e.clientY, dragging:false, ghost:null, lastTarget:null };
      // Nie przechwytujemy pointera na elemencie. Na części mobilnych WebKitów
      // capture + elementFromPoint potrafiło zgubić prawdziwy cel upuszczenia.
    },{passive:true});
  }

  function handleGlobalPointerMove(e) {
    if(!touchDrag || touchDrag.pointerId!==e.pointerId) return;
    const dx=e.clientX-touchDrag.startX, dy=e.clientY-touchDrag.startY;
    if(!touchDrag.dragging && Math.hypot(dx,dy)>=7) startTouchDrag(e);
    if(!touchDrag.dragging) return;
    e.preventDefault();
    moveTouchGhost(e.clientX,e.clientY);
    autoScrollTouchZones(e.clientX,e.clientY);
    paintTouchDropTarget(e.clientX,e.clientY);
  }

  function handleGlobalPointerUp(e,cancelled=false) {
    if(!touchDrag || touchDrag.pointerId!==e.pointerId) return;
    finishTouchDrag(e,cancelled);
  }

  function startTouchDrag(e) {
    if(!touchDrag || touchDrag.dragging) return;
    touchDrag.dragging=true;
    dragPayload=touchDrag.payload;
    suppressClickUntil=Date.now()+500;
    touchDrag.node.classList.add('dragging');
    document.body.classList.add('touch-dragging');
    setBoardDragExpansion(true);
    const rect=touchDrag.node.getBoundingClientRect();
    const ghost=touchDrag.node.cloneNode(true);
    ghost.classList.remove('dragging','hand-insert-before','hand-insert-after');
    ghost.classList.add('touch-drag-ghost');
    ghost.style.width=`${rect.width}px`;
    ghost.style.height=`${rect.height}px`;
    touchDrag.ghost=ghost;
    document.body.appendChild(ghost);
    moveTouchGhost(e.clientX,e.clientY);
  }

  function moveTouchGhost(x,y) {
    if(!touchDrag?.ghost) return;
    touchDrag.ghost.style.transform=`translate3d(${Math.round(x)}px,${Math.round(y)}px,0) translate(-50%,-55%) rotate(2deg)`;
  }

  function autoScrollTouchZones(x,y) {
    for(const zone of [els.playerHand,els.meldBoard]) {
      if(!zone || zone.scrollWidth<=zone.clientWidth+2) continue;
      const r=zone.getBoundingClientRect();
      if(y<r.top || y>r.bottom) continue;
      const edge=Math.min(54,Math.max(28,r.width*.12));
      if(x<r.left+edge) zone.scrollLeft-=18;
      else if(x>r.right-edge) zone.scrollLeft+=18;
    }
  }

  function clearTouchDropTargets() {
    document.querySelectorAll('.touch-drop-target').forEach(el=>el.classList.remove('touch-drop-target'));
    clearHandDropIndicator();
  }

  function elementBelowTouch(x,y) {
    if(touchDrag?.ghost) touchDrag.ghost.style.visibility='hidden';
    const el=document.elementFromPoint(x,y);
    if(touchDrag?.ghost) touchDrag.ghost.style.visibility='visible';
    return el;
  }

  function handDropTargetAt(x,y) {
    const below=elementBelowTouch(x,y);
    const target=below?.closest?.('.card[data-card-uid]');
    if(!target || target.dataset.cardUid===touchDrag?.payload?.cardUid) return {targetUid:null,after:true,target:null};
    const rect=target.getBoundingClientRect();
    return {targetUid:target.dataset.cardUid,after:x>rect.left+rect.width/2,target};
  }

  function paintTouchDropTarget(x,y) {
    clearTouchDropTargets();
    const below=elementBelowTouch(x,y);
    if(!below || !touchDrag) return;
    const groupEl=below.closest?.('.meld-group');
    const jokerEl=below.closest?.('.card.joker[data-card-uid]');
    const discardEl=below.closest?.('#discardPile');
    const rowLane=below.closest?.('.meld-new-row-drop');
    const dynamicZone=below.closest?.('.meld-dynamic-drop-zone');
    const handEl=below.closest?.('#playerHand');
    const boardEl=below.closest?.('#meldBoard');
    if(discardEl && touchDrag.payload.type==='hand' && rules.discard?.enabled) {
      discardEl.classList.add('touch-drop-target');
      return;
    }
    if(jokerEl && groupEl && touchDrag.payload.type==='hand' && rules.meld.allowJokerReplacement) {
      jokerEl.classList.add('touch-drop-target');
      return;
    }
    if(groupEl) {
      const group=state.tableGroups.find(g=>g.id===groupEl.dataset.groupId);
      if(group && (touchDrag.payload.type==='table' || canDropHandCardIntoGroup(group))) groupEl.classList.add('touch-drop-target');
      return;
    }
    if(rowLane) {
      rowLane.classList.add('touch-drop-target');
      return;
    }
    if(dynamicZone) {
      dynamicZone.classList.add('touch-drop-target');
      return;
    }
    if(boardEl) {
      boardEl.classList.add('touch-drop-target');
      return;
    }
    if(handEl) {
      handEl.classList.add('touch-drop-target');
      if(touchDrag.payload.type==='hand') {
        const pos=handDropTargetAt(x,y);
        if(pos.target) pos.target.classList.add(pos.after?'hand-insert-after':'hand-insert-before');
      }
    }
  }

  function finishTouchDrag(e,cancelled=false) {
    if(!touchDrag || touchDrag.pointerId!==e.pointerId) return;
    const td=touchDrag;
    if(td.dragging) {
      e.preventDefault();
      if(!cancelled) performTouchDrop(e.clientX,e.clientY,td.payload);
      suppressClickUntil=Date.now()+500;
    }
    td.node.classList.remove('dragging');
    td.ghost?.remove();
    document.body.classList.remove('touch-dragging');
    setBoardDragExpansion(false);
    els.meldBoard.classList.remove('free-drop-target');
    clearTouchDropTargets();
    dragPayload=null;
    touchDrag=null;
  }

  function performTouchDrop(x,y,payload) {
    const below=elementBelowTouch(x,y);
    if(!below || !payload) return;
    const groupEl=below.closest?.('.meld-group');
    const jokerEl=below.closest?.('.card.joker[data-card-uid]');
    const discardEl=below.closest?.('#discardPile');
    const rowLane=below.closest?.('.meld-new-row-drop');
    const dynamicZone=below.closest?.('.meld-dynamic-drop-zone');
    const handEl=below.closest?.('#playerHand');
    const boardEl=below.closest?.('#meldBoard');
    if(discardEl && payload.type==='hand' && rules.discard?.enabled) {
      discardCardToPile(payload.cardUid);
      return;
    }
    if(jokerEl && groupEl && payload.type==='hand' && rules.meld.allowJokerReplacement) {
      const group=state.tableGroups.find(g=>g.id===groupEl.dataset.groupId);
      if(group) replaceJokerWithHandCard(payload.cardUid,group.id,jokerEl.dataset.cardUid);
      return;
    }
    if(groupEl) {
      const group=state.tableGroups.find(g=>g.id===groupEl.dataset.groupId);
      if(!group) return;
      activeGroupId=group.id;
      if(payload.type==='hand') {
        if(canDropHandCardIntoGroup(group)) addHandCardToSpecificGroup(payload.cardUid,group.id);
      } else if(payload.type==='table') {
        moveTableCard(payload.cardUid,payload.fromGroupId,group.id);
      }
      return;
    }
    if(rowLane) {
      createGroupFromDrop(payload,rowLane.dataset.afterGroupId || null);
      return;
    }
    if(dynamicZone) {
      createGroupFromDrop(payload);
      return;
    }
    if(boardEl) {
      createGroupFromDrop(payload);
      return;
    }
    if(handEl) {
      if(payload.type==='table') {
        returnCardToHand(payload.cardUid,payload.fromGroupId);
      } else if(payload.type==='hand') {
        const pos=handDropTargetAt(x,y);
        if(reorderHandCard(payload.cardUid,pos.targetUid,pos.after)) renderHumanHand();
      }
    }
  }

  function renderGameMenu() {
    if(!els.gameMenuGrid) return;
    els.gameMenuGrid.innerHTML='';
    for(const id of GAME_IDS) {
      const def=gameDefinition(id);
      if(!def) continue;
      const btn=document.createElement('button');
      btn.type='button';
      btn.className=`game-tile${def.featured?' featured':''}`;
      btn.dataset.gameId=id;
      btn.innerHTML=`${def.order!=null?`<span class="game-tile-badge">${escapeHtml(def.order)}</span>`:''}<span class="game-tile-title">${escapeHtml(def.name)}</span><span class="game-tile-desc">${escapeHtml(def.description||'')}</span><span class="game-tile-action">GRAJ →</span>`;
      btn.addEventListener('click',()=>startGameDefinition(id));
      els.gameMenuGrid.appendChild(btn);
    }
    const custom=document.createElement('button');
    custom.className='game-tile future'; custom.type='button'; custom.disabled=true;
    custom.innerHTML='<span class="game-tile-title">Własna gra</span><span class="game-tile-desc">Zapisz konfigurację jako nową grę — następny etap.</span><span class="game-tile-action">w przygotowaniu</span>';
    els.gameMenuGrid.appendChild(custom);
    if(els.gameMenuFoot) els.gameMenuFoot.textContent=`v${BUILD_VERSION} · ${GAME_IDS.length} ${GAME_IDS.length===1?'definicja gry':'definicje gier'} · ${new Set(GAME_IDS.map(id=>gameEngine(id))).size} silniki`;
  }

  function openGameMenu() {
    if(!els.gameMenu) return;
    if(autoPlayEnabled) setAutoPlay(false,{quiet:true});
    renderGameMenu();
    els.gameMenu.classList.remove('hidden');
    document.body.classList.add('game-menu-open');
    requestAnimationFrame(()=>els.gameMenuGrid?.querySelector('[data-game-id]')?.focus());
  }

  function closeGameMenu() {
    if(!els.gameMenu) return;
    els.gameMenu.classList.add('hidden');
    document.body.classList.remove('game-menu-open');
    requestAnimationFrame(()=>{ fitBoardToViewport(); fitHumanHandToViewport(); });
  }

  function syncGameHeader() {
    const def=gameDefinition();
    document.body.dataset.engine=gameEngine();
    if(els.currentGameName) els.currentGameName.textContent=def?.name||'Card Sandbox';
    if(els.currentGameSubtitle) els.currentGameSubtitle.textContent=def?.subtitle||'Konfigurowalna gra karciana.';
    syncEngineEditorVisibility();
    scheduleAutoPlayButtonState();
  }

  function startGameDefinition(gameId) {
    if(!GAME_DEFINITIONS[gameId]) return;
    if(activeGameId && editorModel) gameDrafts.set(activeGameId,deepClone(editorModel));
    activeGameId=gameId;
    editorModel=normalizeRules(gameDrafts.get(gameId)||defaultRules(gameId));
    rules=deepClone(editorModel);
    syncFormFromEditorModel();
    syncGameHeader();
    newGame();
    closeGameMenu();
    toast(`${gameDefinition()?.name||'Gra'} — nowa gra`);
  }

  function setEditorOpen(open) {
    els.rulesPanel.classList.toggle('collapsed',!open);
    els.toggleEditorBtn.setAttribute('aria-expanded',String(open));
    const mobile=window.matchMedia('(max-width:1050px)').matches;
    document.body.classList.toggle('editor-open',open && mobile);
  }

  function syncEditorViewportState() {
    const open=!els.rulesPanel.classList.contains('collapsed');
    document.body.classList.toggle('editor-open',open && window.matchMedia('(max-width:1050px)').matches);
  }

  function cardElement(card,jokerAssignment=null) {
    const div=document.createElement('div'); div.className='card';
    if(card.joker) {
      div.classList.add('joker'); div.innerHTML='<div class="corner">★</div><div class="center-suit">JOKER</div><div class="corner bottom">★</div>';
      if(jokerAssignment) { const b=document.createElement('div'); b.className='joker-resolution'; b.textContent=`=${jokerAssignment.aceLow?'A(1)':jokerAssignment.rank}${suitSymbol(jokerAssignment.suit)}`; div.appendChild(b); }
    } else {
      const suit=SUITS.find(s=>s.id===card.suit);
      if(suit.red) div.classList.add('red');
      div.classList.add(`suit-${String(card.suit).toLowerCase()}`);
      if(['J','Q','K'].includes(card.rank)) div.classList.add('face-card');
      if(card.rank==='A') div.classList.add('ace-card');
      const corner=`<span class="rank">${card.rank}</span><span class="corner-suit">${suit.symbol}</span>`;
      div.innerHTML=`<div class="corner">${corner}</div><div class="center-suit">${suit.symbol}</div><div class="corner bottom">${corner}</div>`;
    }
    setHelpTitle(div,card.joker?'Joker':`${card.rank} ${suitName(card.suit)}`); return div;
  }

  function showRulesDialog() {
    if(gameEngine()==='skat'){
      els.rulesDialogSubtitle.textContent='Szkat śląski · wersja edukacyjna';
      els.rulesHumanView.innerHTML=`
        <section class="rule-section"><h3>Talia, tajlong i rajcowanie</h3><ul><li>Gramy 32 kartami od 7 do Asa. Każdy dostaje 10 kart, a dwie zakryte tworzą tajlong.</li><li>Legalne odzywki zaczynają się od 18. Solista musi ogłosić grę wartą co najmniej tyle, ile wylicytował.</li><li>Solista może podnieść tajlong i odłożyć dwie karty albo grać Hand — z ręki.</li></ul></section>
        <section class="rule-section"><h3>Kolor, Grand i Null</h3><ul><li>Śląskie kolory to: ♦ Szel, ♥ Herc, ♠ Grin i ♣ Krojc.</li><li>W kolorze triomfami są cztery dupki (walety) oraz wybrany kolor. W Grandzie triomfami są tylko dupki.</li><li>Solista potrzebuje 61 ze 120 oczek. As = 11, 10 = 10, K = 4, Q = 3, J = 2.</li><li>W Nullu nie ma triomfu, a solista przegrywa po wzięciu choć jednego sztychu.</li></ul></section>
        <section class="rule-section"><h3>Wartość gry</h3><ul><li>Karo = 9, Kier = 10, Pik = 11, Trefl = 12, Grand = 24. Bazę mnożymy przez szczyty oraz poziomy gry.</li><li>Hand, Schneider, Schwarz, ich zapowiedzi i Ouvert zwiększają mnożnik. Null ma stałe wartości 23/35/46/59.</li><li>Nauczyciel pokazuje możliwe gry i tłumaczy równanie na podstawie Twojej ręki.</li></ul></section>
        <section class="rule-section"><h3>Śląski stolik</h3><ul><li>Kontra podwaja wartość, Ryj zwiększa ją do ×4, a Zup do ×8.</li><li>Wygrany Grand z czterema waletami uruchamia trzy rozdania ramsza suwanego.</li><li>W ramszu każdy gra na siebie, tajlong wędruje od Przodka przez Środek do Zadka, a waletów nie wolno przesuwać.</li></ul></section>`;
      if(typeof els.rulesDialog.showModal==='function')els.rulesDialog.showModal();else els.rulesDialog.setAttribute('open','');return;
    }
    if(gameEngine()==='trick'){
      els.rulesDialogSubtitle.textContent='Tysiąc · klasyczny wariant 3-osobowy';
      els.rulesHumanView.innerHTML=`
        <section class="rule-section"><h3>Talia i licytacja</h3><ul><li>Gramy 24 kartami: <code>9 &lt; J &lt; Q &lt; K &lt; 10 &lt; A</code>. Każdy dostaje 7 kart, trzy trafiają do musika.</li><li>Przed licytacją rozdanie jest automatycznie powtarzane, jeśli gracz bez meldunku ma mniej niż 18 punktów albo wszystkie cztery dziewiątki.</li><li>Licytacja zaczyna się od 100 i rośnie co 10. Powyżej 120 trzeba posiadać odpowiednie meldunki.</li><li>Grający bierze musik, przekazuje rywalom po jednej karcie i ustala kontrakt nie niższy od wylicytowanego.</li></ul></section>
        <section class="rule-section"><h3>Lewy i obowiązki</h3><ul><li>Trzeba dołożyć do koloru i przebić, jeśli jest to możliwe.</li><li>Bez koloru wyjściowego trzeba zagrać atutem; leżący atut również należy przebić, jeśli można.</li><li>Zwycięzca lewy rozpoczyna następną. As jest najwyższy, potem 10, K, Q, J i 9.</li></ul></section>
        <section class="rule-section"><h3>Meldunki</h3><ul><li>K+Q jednego koloru można zameldować przy rozpoczynaniu lewy — również pierwszej.</li><li>♠ = 40, ♣ = 60, ♦ = 80, ♥ = 100. Kolor ostatniego meldunku staje się atutem.</li></ul></section>
        <section class="rule-section"><h3>Punktacja, beczka i bomba</h3><ul><li>Grający otrzymuje deklarowany kontrakt, jeśli go osiągnie; w przeciwnym razie kontrakt jest odejmowany. Rywale zapisują zdobyte punkty zaokrąglone do dziesiątek.</li><li>Od 800 punktów obrońca jest na beczce i nie dopisuje punktów — musi wygrać licytację oraz kontrakt.</li><li>Pierwsza bomba jest bezpłatna. Kolejne kończą rozdanie i dają rywalom po 60 punktów, chyba że są na beczce.</li></ul></section>`;
      if(typeof els.rulesDialog.showModal==='function')els.rulesDialog.showModal();else els.rulesDialog.setAttribute('open','');return;
    }
    if(gameEngine()==='macao'){
      els.rulesDialogSubtitle.textContent='Makao · wersja Card Sandbox';
      els.rulesHumanView.innerHTML=`
        <section class="rule-section"><h3>Cel i ruch</h3><ul><li>Każdy zaczyna z <strong>5 kartami</strong>. Wygrywa pierwszy gracz bez kart.</li><li>Na stos wykłada się kartę pasującą kolorem albo wartością.</li><li>Wolno wyłożyć <strong>1, 3 albo 4</strong> karty tej samej wartości — nigdy dokładnie dwóch.</li></ul></section>
        <section class="rule-section"><h3>Kary</h3><ul><li>2 daje +2, 3 daje +3, a K♥ i K♠ dają +5. W zestawie moc każdej karty się sumuje.</li><li>Karty karne łączą się, jeśli następna pasuje wartością lub kolorem.</li><li>K♦ i K♣ anulują całą zgromadzoną karę.</li><li>Dama w kolorze wierzchniej karty karnej przekazuje niezmienioną karę dalej.</li></ul></section>
        <section class="rule-section"><h3>Pozostałe moce</h3><ul><li>Każda 4 zatrzymuje jednego gracza; trzy lub cztery czwórki sumują postoje.</li><li>Walet żąda wartości od 5 do 10, a As żąda koloru.</li><li>Dama działa jako karta uniwersalna: dama na wszystko i wszystko na damę.</li></ul></section>
        <section class="rule-section"><h3>Makao</h3><ul><li>Po zejściu do jednej karty masz <strong>5 sekund</strong> na kliknięcie MAKAO.</li><li>Brak zgłoszenia oznacza dobranie <strong>5 kart</strong>.</li></ul></section>`;
      if(typeof els.rulesDialog.showModal==='function')els.rulesDialog.showModal();else els.rulesDialog.setAttribute('open','');return;
    }
    if(gameEngine()==='shedding'){
      els.rulesDialogSubtitle.textContent='Pan · Historyczny Upadek Japonii';
      els.rulesHumanView.innerHTML=`
        <section class="rule-section"><h3>Cel i start</h3><ul><li>Gramy 24 kartami: <code>9 &lt; 10 &lt; J &lt; Q &lt; K &lt; A</code>. Wszystkie karty są rozdawane.</li><li>Posiadacz <strong>9♥</strong> zaczyna i musi zawrzeć ją w pierwszym ruchu. 9♥ pozostaje chronioną podstawą stosu.</li><li>Ostatni gracz z kartami dostaje kolejną literę słowa <strong>PAN</strong>; zebranie całego słowa oznacza przegraną meczu.</li></ul></section>
        <section class="rule-section"><h3>Zagrania</h3><ul><li>Na stos wykłada się rangę równą lub wyższą od wierzchniej.</li><li>Legalne są: <strong>jedna karta</strong>, <strong>trzy jednakowe</strong> albo <strong>cztery jednakowe</strong>. Trójka wymaga odpowiadającego kiera wśród zagrywanych kart lub już leżącego na stosie. Dwóch kart nigdy nie zagrywamy.</li><li>Drabinka może mieszać rosnące trójki i czwórki, np. <code>3×9 → 4×J → 3×A</code>. Nie zawiera pojedynczych kart.</li></ul></section>
        <section class="rule-section"><h3>Branie i remis</h3><ul><li>Gracz, który nie może albo nie chce zagrywać, klika odkrytą kupkę w centrum i bierze do ${rules.shedding.takeCount} wierzchnich kart, nigdy 9♥.</li><li>Branie jest dobrowolne nawet wtedy, gdy gracz ma legalny ruch.</li><li>Jeśli ostatni gracz może zejść ze wszystkich kart jednym legalnym ruchem, dostaje tę turę. Gdy zejdzie, rozdanie kończy się bez przegranego.</li><li>Bezpiecznik autoplay kończy skrajnie długie zakleszczenie po ${rules.shedding.stalemateDrawAfter} ruchach remisem bez litery.</li></ul></section>`;
      if(typeof els.rulesDialog.showModal==='function')els.rulesDialog.showModal();else els.rulesDialog.setAttribute('open','');return;
    }
    if(gameEngine()==='battle') {
      els.rulesDialogSubtitle.textContent=`${gameDefinition()?.name||'Gra'} · silnik battle/compare`;
      els.rulesHumanView.innerHTML=`
        <section class="rule-section"><h3>Przebieg bitwy</h3><ul>
          <li>Cała talia jest rozdawana między ${rules.players.count} graczy. Kolor nie wpływa na siłę karty.</li>
          <li>Siła: <code>${rules.cardModel.rankOrder.join(' < ')}</code>${rules.battle.jokerHigh?' < <strong>JOKER</strong>':''}.</li>
          <li>Każdy aktywny gracz odkrywa górną kartę swojego stosu.</li>
          <li>${rules.battle.tieTrigger==='any-duplicate'?'<strong>Dowolny remis</strong> na stole uruchamia wojnę — nawet jeśli inny gracz ma wyższą kartę.':'Wojna powstaje tylko przy remisie najwyższych kart.'}</li>
        </ul></section>
        <section class="rule-section"><h3>Wojna</h3><ul>
          <li>Remisujący dokładają ${rules.battle.faceDownOnTie} kartę/karty zakryte i ${rules.battle.faceUpOnTie} odkryte. Pozostali <strong>nie dobierają</strong> — ich poprzednia karta nadal stoi na polu bitwy.</li>
          <li>Po odkryciu porównujemy ponownie wszystkie aktualne karty. Wojna może więc przeskoczyć na innych graczy.</li>
          <li>Jeśli uczestnik nie ma kompletu ${rules.battle.faceDownOnTie+rules.battle.faceUpOnTie} kart, jego wartość w tym rozstrzygnięciu wynosi <strong>0</strong>; nie pożyczamy kart.</li>
        </ul></section>
        <section class="rule-section"><h3>Pula</h3><ul>
          <li>Od początku bitwy wszystkie karty tworzą jedną wspólną pulę.</li>
          <li>Zwycięzca odkłada ją pod swój stos w kolejności: <strong>najpierw własne karty</strong>, potem pozostali gracze zgodnie z kolejnością miejsc przy stole. Wewnątrz paczki gracza zachowana jest kolejność wykładania.</li>
          <li>Wygrywa ostatni gracz posiadający karty.</li>
        </ul></section>`;
      if(typeof els.rulesDialog.showModal==='function') els.rulesDialog.showModal(); else els.rulesDialog.setAttribute('open','');
      return;
    }
    const er=effectiveRules(); const round=state?.round ?? 1;
    els.rulesDialogSubtitle.textContent=`${gameDefinition()?.name||'Gra'} · aktywne reguły rundy ${round}`;
    els.rulesHumanView.innerHTML=`
      <section class="rule-section"><h3>Przebieg tury</h3><ul>
        <li>Każdy gracz zaczyna z ${er.handSize} kartami. Dobieranie: <strong>${er.drawMode==='auto'?'automatyczne':er.drawMode==='manual'?'ręczne':'brak'}</strong>${er.drawMode!=='none'?` · ${er.drawCount} kartę/karty na początku tury`:''}.</li>
        <li>W czasie tury wolno wykonywać wiele zmian. Układ może być chwilowo niepełny podczas dokładania kart; dopiero <strong>${er.discardRequired?'zrzut karty':'PROSZĘ →'}</strong> wymaga kompletnego, legalnego stołu.</li>
        <li>Po zatwierdzeniu nie może zostać żadna samotna karta ani niepełny układ.${er.discardRequired?' Turę kończy odrzucenie jednej karty na odkryty stos.':''}</li>
      </ul></section>
      <section class="rule-section"><h3>Legalne układy</h3><ul>
        <li><strong>Sekwens:</strong> minimum ${rules.meld.runMin} kolejnych kart${rules.meld.runSameSuit?' jednego koloru':''}.</li>
        <li><strong>Grupa:</strong> ${rules.meld.setMin}–${rules.meld.setMax} karty tej samej rangi${rules.meld.setDistinctSuits?', każda w innym kolorze':''}.</li>
        <li>Może istnieć kilka osobnych grup tej samej rangi, jeśli używamy wielu talii.</li>
        <li>Joker: ${rules.meld.jokerWild?'dzika karta zastępująca brakującą kartę':'nie jest dziki'}.</li>
        <li>W każdym pojedynczym układzie jokery muszą stanowić <strong>mniej niż ${Math.round(rules.meld.maxJokerFraction*1000)/10}%</strong> kart.</li>
      </ul></section>
      <section class="rule-section"><h3>As</h3><ul>
        <li>${er.aceLow?'A-2-3 jest legalne; As ma wtedy wartość 1.':'As nie może być przed 2.'}</li>
        <li>${er.aceHigh?`Q-K-A jest legalne; As ma wtedy wartość ${rules.cardModel.rankPoints.A}.`:'As nie może kończyć sekwensu po królu.'}</li>
        <li><strong>K-A-2 nie jest legalne</strong> — nie ma zawijania końca sekwensu na początek.</li>
      </ul></section>
      <section class="rule-section"><h3>Wejście i przebudowa stołu</h3><ul>
        <li>Pierwsze wyłożenie musi mieć łącznie co najmniej <strong>${er.entryMin} punktów</strong>${er.entryPureRunCount?` i zawierać co najmniej <strong>${er.entryPureRunCount} czysty sekwens bez jokera</strong>`:''}${rules.meld.initialMeldOwnCardsOnly?'; wejście powstaje wyłącznie z kart gracza':''}.</li>
        <li>Gdy warunki wejścia są spełnione, wejście odblokowuje się <strong>natychmiast</strong>; w tej samej turze ${rules.meld.allowRearrange?'możesz już rozbierać i przebudowywać stół':'możesz dokładać do istniejących meldów, ale nie wolno ich rozbierać'}.</li>
        <li>${rules.meld.tableCardsStayOnTable?'Każda karta, która była na stole przed turą, musi nadal znajdować się na stole po zakończeniu tury.':'Karty ze stołu mogą zostać zabrane, jeśli pozostałe reguły na to pozwalają.'}</li>
        <li>${rules.meld.allowJokerReplacement?'Jokery wolno odzyskiwać przez zastąpienie ich właściwą kartą; odzyskany joker musi przed końcem tury wrócić do legalnego układu na stole.':'Jokerów ze starych meldów nie można odzyskiwać specjalną podmianą.'}</li>
      </ul></section>
      ${rules.discard?.enabled?`<section class="rule-section"><h3>Stos odrzuconych</h3><ul>
        <li>${rules.discard.beforeEntry==='finish-only'?'Przed pierwszym wyłożeniem wierzchnią kartę odkrytą wolno zabrać tylko wtedy, gdy w tej samej turze wejdziesz i zakończysz rozdanie.':rules.discard.beforeEntry==='top'?'Przed wejściem wolno normalnie dobierać wierzchnią kartę odkrytą.':'Przed wejściem nie wolno dobierać ze stosu odrzuconych.'}</li>
        <li>${rules.discard.afterEntry==='top-must-use'?'Po wejściu wolno wziąć wierzchnią kartę odkrytą, ale trzeba ją w tej turze wykorzystać na stole.':rules.discard.afterEntry==='top'?'Po wejściu wolno brać wierzchnią kartę odkrytą.':'Po wejściu stos odrzuconych nie służy do dobierania.'}</li>
        <li>${er.discardRequired?'Każda tura kończy się odrzuceniem jednej karty.':'Odrzucenie nie jest obowiązkowym zakończeniem tury.'}</li>
        <li>${rules.discard.recycleWhenDeckEmpty?'Po wyczerpaniu talii odrzucone karty poza wierzchnią są tasowane i wracają jako talia.':'Stos odrzuconych nie jest przetasowywany do talii.'}</li>
      </ul></section>`:''}
      <section class="rule-section"><h3>Rundy</h3><ul><li>Starter kolejnej rundy: ${rules.game?.roundStarterMode==='clockwise'?'kolejne miejsce zgodnie z ruchem wskazówek zegara':rules.game?.roundStarterMode==='fixed'?'zawsze ten sam gracz':'zwycięzca poprzedniej rundy'}.</li></ul></section>
      <section class="rule-section"><h3>Wartości</h3><ul><li><code>${rules.cardModel.rankOrder.map(r=>`${r}:${rules.cardModel.rankPoints[r]}`).join(' · ')}</code></li><li>Wyjątek: niski As w sekwensie = 1.${rules.game.scoringMode==='hand-penalty'?` Joker pozostały w ręce = ${rules.game.jokerHandPoints} pkt karnych.${rules.game.unenteredPenaltyBase?` Gracz bez pierwszego wyłożenia dostaje ${rules.game.unenteredPenaltyBase} pkt + wartość jokerów pozostałych w ręce.`:''}${rules.game.penaltyLoseAt?` Próg przegranej meczu = ${rules.game.penaltyLoseAt} pkt.`:''}`:''}</li></ul></section>`;
    if(typeof els.rulesDialog.showModal==='function') els.rulesDialog.showModal(); else els.rulesDialog.setAttribute('open','');
  }

  function ruleSummary() {
    if(gameEngine()==='battle') return `${gameDefinition()?.name||'Gra'} · ${rules.players.count} graczy · remis ${rules.battle.tieTrigger==='any-duplicate'?'dowolny':'najwyższy'} · ${rules.battle.faceDownOnTie}↓ + ${rules.battle.faceUpOnTie}↑`;
    if(gameEngine()==='shedding')return `${gameDefinition()?.name||'Pan'} · ${rules.players.count} graczy · 9♥ zaczyna · 1 / 3♥ / 4 · drabinki`;
    if(gameEngine()==='macao')return `Makao · ${rules.players.count} graczy · 5 kart · 1 / 3 / 4 · MAKAO w 5 s`;
    if(gameEngine()==='trick')return `Tysiąc · 3 graczy · licytacja · musik · meldunki · beczka od 800`;
    if(gameEngine()==='skat')return `Szkat śląski · rajcowanie 18–264 · Kontra–Ryj–Zup · nauczyciel`;
    const er=effectiveRules(); const draw=er.drawMode==='none'?'bez dobierania':`${er.drawMode==='auto'?'auto':'ręcznie'} +${er.drawCount}`; return `${gameDefinition()?.name||'Gra'} · ${er.handSize} kart · ${draw} · wejście ${er.entryMin}${er.entryPureRunCount?' + czysty sekwens':''}${rules.discard?.enabled?` · odkryty stos${rules.discard.minHandToDraw?` od ${rules.discard.minHandToDraw} kart`:''}`:''}`;
  }
  function suitSymbol(id){return SUITS.find(s=>s.id===id)?.symbol ?? '';}
  function suitName(id){return SUITS.find(s=>s.id===id)?.name ?? '';}
  function suitIndex(id){return SUITS.findIndex(s=>s.id===id);}
  function clampInt(v,min,max){const n=parseInt(v,10);return Math.max(min,Math.min(max,Number.isFinite(n)?n:min));}
  function clampFloat(v,min,max){const n=Number(v);return Math.max(min,Math.min(max,Number.isFinite(n)?n:min));}
  function normalizeSuitOrder(order){const valid=SUITS.map(s=>s.id);const raw=Array.isArray(order)?order.filter(x=>valid.includes(x)):valid;return [...new Set([...raw,...valid.filter(x=>!raw.includes(x))])];}
  function shuffle(arr){const a=[...arr];for(let i=a.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]];}return a;}
  function deepClone(v){return JSON.parse(JSON.stringify(v));}
  function setSelectValue(el,val){if([...el.options].some(o=>o.value===String(val)))el.value=String(val);}
  function escapeHtml(s){return String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c]));}
  function combinations(arr,k){const out=[];function rec(start,pick){if(pick.length===k){out.push([...pick]);return;}for(let i=start;i<=arr.length-(k-pick.length);i++){pick.push(arr[i]);rec(i+1,pick);pick.pop();}}rec(0,[]);return out;}
  function log(text){const div=document.createElement('div');div.className='log-line';div.textContent=`[${new Date().toLocaleTimeString()}] ${text}`;els.log.prepend(div);}
  function logClear(){els.log.innerHTML='';}
  function toast(text){els.toast.textContent=text;els.toast.classList.add('show');clearTimeout(toast._t);toast._t=setTimeout(()=>els.toast.classList.remove('show'),2600);}

  els.applyRulesBtn.addEventListener('click',applyRules);
  els.gameMenuBtn.addEventListener('click',openGameMenu);
  els.newGameBtn.addEventListener('click',newGame);
  els.autoPlayBtn.addEventListener('click',toggleAutoPlay);
  els.helpHintsBtn.addEventListener('click',toggleHelpHints);
  if(els.battleQuickPlayers) els.battleQuickPlayers.addEventListener('change',()=>setPlayerCount(els.battleQuickPlayers.value));
  els.syncJsonBtn.addEventListener('click',syncJsonText);
  els.loadJsonBtn.addEventListener('click',loadJson);
  els.exportBtn.addEventListener('click',exportJson);
  els.addRoundRuleBtn.addEventListener('click',()=>addRoundRule());
  els.toggleEditorBtn.addEventListener('click',()=>setEditorOpen(els.rulesPanel.classList.contains('collapsed')));
  els.closeEditorInlineBtn.addEventListener('click',()=>setEditorOpen(false));
  els.showRulesBtn.addEventListener('click',showRulesDialog);
  els.activeRuleHint.addEventListener('click',showRulesDialog);
  els.closeRulesDialogBtn.addEventListener('click',()=>els.rulesDialog.close());
  els.deckPile.addEventListener('click',()=>{ if(gameEngine()==='meld')drawCard(0);else if(gameEngine()==='macao')drawMacao(0); });
  els.drawBtn.addEventListener('click',()=>{ if(gameEngine()==='meld')drawCard(0); });
  if(els.discardPile) {
    els.discardPile.addEventListener('click',e=>{
      if(gameEngine()!=='meld'||!rules.discard?.enabled) return;
      e.stopPropagation();
      if(tapSelection?.type==='hand') {
        const cardUid=tapSelection.cardUid; clearTapSelection(false); discardCardToPile(cardUid); return;
      }
      drawFromDiscard(0);
    });
    els.discardPile.addEventListener('dragover',e=>{
      if(gameEngine()!=='meld'||!rules.discard?.enabled||dragPayload?.type!=='hand'||!canHumanManipulate()||!drawRequirementMet()) return;
      e.preventDefault(); e.dataTransfer.dropEffect='move'; els.discardPile.classList.add('native-drop-target');
    });
    els.discardPile.addEventListener('dragleave',()=>els.discardPile.classList.remove('native-drop-target'));
    els.discardPile.addEventListener('drop',e=>{
      if(dragPayload?.type!=='hand') return;
      e.preventDefault(); e.stopPropagation();
      const uid=dragPayload.cardUid; dragPayload=null; els.discardPile.classList.remove('native-drop-target'); discardCardToPile(uid);
    });
  }
  els.undoTurnBtn.addEventListener('click',undoTurn);
  els.endTurnBtn.addEventListener('click',primaryAction);
  els.discardHint.addEventListener('click',()=>{ if(els.discardHint.title) toast(els.discardHint.title); });
  document.addEventListener('click',e=>{
    if(!tapSelection) return;
    if(e.target.closest('.card,.meld-group,.meld-dynamic-drop-zone,#meldBoard,#discardPile')) return;
    clearTapSelection();
  });
  window.addEventListener('resize',()=>{syncEditorViewportState();requestAnimationFrame(()=>{fitHumanHandToViewport();fitBoardToViewport();});});
  window.addEventListener('orientationchange',()=>{syncEditorViewportState();setTimeout(()=>{fitHumanHandToViewport();fitBoardToViewport();},80);});
  window.addEventListener('pointermove',handleGlobalPointerMove,{passive:false});
  window.addEventListener('pointerup',e=>handleGlobalPointerUp(e,false),{passive:false});
  window.addEventListener('pointercancel',e=>handleGlobalPointerUp(e,true),{passive:false});

  const formIds=['deckCount','jokersPerDeck','playerCount','handSize','totalRounds','roundStarterMode','botStyle','entryMin','entryPureRunCount','drawMode','drawCount','runMin','setMin','setMax','maxJokerPercent','aceLow','aceHigh','jokerWild','runSameSuit','setDistinctSuits','allowRearrange','allowJokerReplacement','collapseClosedNaturalSets','initialMeldOwnCardsOnly','tableCardsStayOnTable','allowPassAfterDraw','discardEnabled','discardBeforeEntry','discardAfterEntry','discardMustUseDrawn','discardRequired','allowMeldOutWithoutDiscard','discardRecycle','discardSeedAtRoundStart','jokerHandPoints','discardMinHandToDraw','penaltyLoseAt','unenteredPenaltyBase','battleFaceDownCount','battleFaceUpCount','battleTieTrigger','battleTiePriority','battleJokerHigh'];
  for(const id of formIds) els[id].addEventListener('change',()=>{readFormIntoEditorModel();if(id==='totalRounds')renderRoundRulesEditor();syncJsonText();});

  // Mały interfejs diagnostyczny do przyszłych testów silnika.
  window.CardSandboxDebug={ build:BUILD_VERSION, activeGame:()=>activeGameId, engine:()=>gameEngine(), analyzeGroup:(cards)=>gameEngine()==='meld'?analyzeGroup(cards):null, getRules:()=>deepClone(rules), getBattleState:()=>battleState?deepClone(battleState):null, getMacaoState:()=>macaoState?deepClone(macaoState):null, getSkatState:()=>skatState?deepClone(skatState):null, battleStep:()=>gameEngine()==='battle'?battleStep({manual:true}):false, setAutoPlay:(on)=>setAutoPlay(on), seatLayout:(count)=>deepClone(UNIVERSAL_SEAT_LAYOUTS[clampInt(count,2,6)]), fitBoard:fitBoardToViewport };

  setupBoardFreeDropOnce();
  helpHintsEnabled=readHelpHintsPreference();
  syncHelpHints();
  setEditorOpen(false);
  renderGameMenu(); syncGameHeader(); syncFormFromEditorModel(); rules=deepClone(editorModel); newGame(); openGameMenu();
})();
