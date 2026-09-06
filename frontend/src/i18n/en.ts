/**
 * English copy — the source of truth for every user-visible string.
 *
 * Add a key here first; `es.ts` is typed against this file, so the build fails
 * until the Spanish version exists too. Interpolation is done with plain
 * functions rather than `{{placeholders}}`, which keeps argument types checked
 * and lets each language put the pieces in its own order.
 */
export const en = {
  // ------------------------------------------------------------------ shell
  nav: {
    home: 'Home',
    players: 'Players',
    rookies: 'Rookies',
    teams: 'Teams',
    season: 'Season',
    compare: 'Compare',
    h2h: 'H2H',
    projection: 'Projection',
    forecast: 'Forecast',
    gameSim: 'Game sim',
    builder: 'Builder',
    leagueSim: 'League sim',
    menu: 'Menu',
  },
  shell: {
    seasonWord: 'Season',
    themeToDark: 'Switch to dark theme',
    themeToLight: 'Switch to light theme',
    languageLabel: 'Language',
    switchToSpanish: 'Cambiar a castellano',
    switchToEnglish: 'Switch to English',
    reigningChampions: 'Reigning champions',
    finalsMvpShort: (name: string) => `Finals MVP ${name}`,
    footerTitle: 'NBA Vision',
    footerTagline: '— a portfolio project. Not affiliated with or endorsed by the NBA.',
    footerBody: (season: string) =>
      `All figures describe the ${season} season. Sources: stats.nba.com (via nba_api), ` +
      'Basketball-Reference, Spotrac, HoopsHype, RealGM. Imagery © NBA, served from cdn.nba.com. ' +
      'Running on the bundled demo league — advanced metrics are reconstructed from the per-game ' +
      'line and projections come from the calibrated baseline model until a trained one is loaded.',
    leagueAverage: (ortg: string, pace: string) =>
      `League average this season: ${ortg} offensive rating · ${pace} pace`,
  },

  // ----------------------------------------------------------------- common
  common: {
    all: 'All',
    league: 'League',
    east: 'East',
    west: 'West',
    eastern: 'Eastern',
    western: 'Western',
    /** Takes `eastern` / `western`: "Eastern Conference", "Conferencia Este". */
    conferenceOf: (conf: string) => `${conf} Conference`,
    home: 'Home',
    away: 'Away',
    vs: 'vs',
    at: '@',
    swap: 'Swap',
    clear: 'Clear',
    seed: 'Seed',
    playoffs: 'Playoffs',
    regularSeason: 'Regular season',
    playoffGame: 'Playoff game',
    tryAgain: 'Try again',
    backHome: 'Back home',
    showMore: (n: number) => `Show more (${n} left)`,
    table: 'Table',
    chart: 'Chart',
    of: 'of',
    to: 'to',
    rank: (rank: string, total: number) => `${rank} of ${total}`,
    perGame: 'Per game',
    per100: 'per 100',
    possPer48: 'poss/48',
    loading: 'Loading',
    noResults: 'No results',
    modelled: 'Modelled',
    yearsOld: (n: number) => `${n} years old`,
    seasons: (n: number) => `${n} season${n === 1 ? '' : 's'}`,
    games: (n: number) => `${n} game${n === 1 ? '' : 's'}`,
    present: 'present',
    none: 'None',
    rookie: 'Rookie',
    champion: (n: number) => `${n}× champion`,
    active: 'Active',
    out: 'Out',
    signed: 'Signed',
    filler: 'filler',
    sortBy: 'Sort by',
    metric: 'Metric',
    years: (v: string) => `${v} years`,
  },

  // ------------------------------------------------------------------ stats
  stat: {
    pts: 'Points',
    reb: 'Rebounds',
    ast: 'Assists',
    stl: 'Steals',
    blk: 'Blocks',
    tov: 'Turnovers',
    fg3m: 'Threes made',
    min: 'Minutes',
    ts: 'True shooting',
    usg: 'Usage rate',
    per: 'PER',
    vorp: 'VORP',
    ws: 'Win shares',
    bpm: 'Box plus/minus',
    gameScore: 'Game score',
    fgPct: 'Field goal %',
    fg3Pct: 'Three-point %',
    efgPct: 'Effective FG%',
    ftPct: 'Free throw %',
    offRating: 'Offensive rating',
    defRating: 'Defensive rating',
    netRating: 'Net rating',
    pace: 'Pace',
    winPct: 'Win percentage',
    fga: 'Field goals attempted',
    salary: 'Cap hit',
    marketValue: 'Market value',
    age: 'Age',
    height: 'Height',
    weight: 'Weight',
    country: 'Country',
    draft: 'Draft',
    undrafted: 'Undrafted',
    experience: 'Experience',
    position: 'Position',
    record: 'Record',
    payroll: 'Payroll',
    titles: 'Titles',
  },
  abbr: {
    pts: 'PTS', reb: 'REB', ast: 'AST', stl: 'STL', blk: 'BLK', tov: 'TOV',
    fg3m: '3PM', fg3a: '3PA', min: 'MIN', ts: 'TS%', fg: 'FG', fgPct: 'FG%',
    fg3Pct: '3P%', ft: 'FT', per: 'PER', ws: 'WS', bpm: 'BPM', vorp: 'VORP',
    ppg: 'PPG', rpg: 'RPG', apg: 'APG', spg: 'SPG', bpg: 'BPG', mpg: 'MPG',
    gp: 'GP', gs: 'GS', w: 'W', l: 'L', pct: 'PCT', gb: 'GB', pf: 'PF',
    pa: 'PA', diff: 'DIFF', net: 'NET', off: 'OFF', def: 'DEF', last10: 'L10',
    plusMinus: '+/-', gmsc: 'GmSc', ht: 'Ht', pos: 'Pos', rest: 'Rest',
    scored: 'SCORED', allowed: 'ALLOWED', pace: 'PACE', space: 'SPACE', team: 'Team',
    player: 'Player', date: 'Date', matchup: 'Matchup', season: 'Season',
    conf: 'Conf', from: 'From', pick: 'Pick', stat: 'Stat', volume: 'Volume',
    efgPct: 'eFG%', month: 'Month',
    rank: 'Rank', score: 'Score', winPct: 'Win%', salary: 'Salary', tsShort: 'TS',
    game: 'Game', metric: 'Metric', homeShort: 'H', awayShort: 'A',
  },

  // ------------------------------------------------------------------- home
  home: {
    eyebrow: 'Analytics · Projection · Simulation',
    titleTop: 'Every number',
    titleBottom: 'before the tip-off',
    lede: (season: string) =>
      `A full-stack NBA lab for the ${season} season: official stats, advanced metrics and ` +
      'contract values, head-to-head history, and models that project a player against a defence, ' +
      'forecast a game, simulate one possession by possession, and play a roster you build ' +
      'yourself against the real league.',
    ctaBuild: 'Build your team',
    ctaProject: 'Project a player',
    tileSeason: 'Season',
    tilePlayers: 'Players indexed',
    tileBestNet: 'Best net rating',
    tileChampions: 'Reigning champions',
    insideTitle: "What's inside",
    insideSub: (season: string) =>
      `Eleven tools, one data layer — every number on the site describes the ${season} season.`,
    open: 'Open →',
    scoringLeaders: 'Scoring leaders',
    scoringLeadersSub: 'Points per game, current season',
    topMatchup: 'Top matchup',
    topMatchupSub: 'Model output, neutral rest',
    homeWinProbability: 'Home win probability',
    spread: 'Spread',
    total: 'Total',
    possessions: 'Possessions',
    runYourOwn: 'Run your own',
    features: {
      players: { title: 'Player index', copy: 'Measurements, shooting splits, advanced metrics with league percentiles, splits, career and honours.' },
      season: { title: 'Season hub', copy: 'Both conference tables, the play-in picture, fourteen leaderboards and every award race, scored.' },
      rookies: { title: 'Rookie class', copy: 'The whole draft board, where each pick came from, and a scored Rookie of the Year race.' },
      compare: { title: 'Compare players', copy: 'Two to four side by side, scored category by category, with percentile bars on every line.' },
      teams: { title: 'Teams & cap sheet', copy: 'Ratings and ranks, roster, payroll against the tax line, the arena, and the championship banners.' },
      h2h: { title: 'Head-to-head', copy: 'Every meeting with one opponent, split home and away, plotted game by game.' },
      predictPlayer: { title: 'Player projection', copy: 'Points, rebounds and assists against a chosen defence — with an interval and an over/under.' },
      predictTeam: { title: 'Game forecast', copy: 'Score, spread and win probability. Playoffs run on their own model, not a flag.' },
      simulate: { title: 'Simulate a game', copy: 'Two real teams, possession by possession. Rule players out for injury and watch what changes.' },
      builder: { title: 'Build a team', copy: 'A budget, a priced league, and your lineup against the real thing — replayed live.' },
      league: { title: 'Full season sim', copy: 'All 1,230 games, the bracket and a champion — with a franchise you invented in the league.' },
    },
  },

  // ---------------------------------------------------------------- players
  players: {
    title: 'Player index',
    sub: (shown: number, total: number, season: string) =>
      `${shown} of ${total} players · ${season} season · click a card for the full profile`,
    subLoading: (season: string) => `Loading the ${season} index…`,
    searchPlaceholder: 'Search by name, team code or position…',
    emptyTitle: 'No players match that',
    emptyHint: 'Try a surname, a team code like BOS, or a position like PG.',
    sortValue: 'Value',
  },

  // ----------------------------------------------------------- player detail
  player: {
    notFound: 'Player not found',
    notFoundHint: 'That id is not in the index. Head back and pick another one.',
    loading: 'Pulling the profile',
    loadingSub: 'Season line, splits, career and honours',
    seasonSuffix: 'season',
    tabs: {
      overview: 'Overview',
      scouting: 'Scouting AI',
      shooting: 'Shooting',
      advanced: 'Advanced',
      splits: 'Splits',
      gamelog: 'Game log',
      career: 'Career',
      honours: 'Honours',
    },
    capHit: (v: string) => `${v} cap hit`,
    draftLine: (year: number, round: number, pick: number) =>
      `${year} · Round ${round}, pick ${pick}`,
    surplus: 'Surplus',
    overpaid: 'Overpaid',
    estimatedMeasurements:
      'Measurements are position-typical estimates — run the ingest job for the official listing.',
    ctaProject: 'Project his next game',
    ctaH2H: 'Head-to-head history',
    ctaCompare: 'Compare',
    percentileSuffix: 'pctile',
    gameLogTitle: (stat: string) => `Game log — ${stat}`,
    gameLogSub: (n: number) => `${n} games this season, with the average marked`,
    seasonAvg: (v: string) => `Season avg ${v}`,
    whereHeRanks: 'Where he ranks',
    whereHeRanksSub: (n: number) => `Percentile among the ${n} players in the index`,
    turnoverNote: 'Turnovers are inverted — a high percentile means he protects the ball.',
    pointsFrom: 'Where the points come from',
    pointsFromSub: 'Reconstructed from the per-game line and true shooting',
    twoPointers: 'Two-pointers',
    threePointers: 'Three-pointers',
    freeThrows: 'Free throws',
    shootingLine: 'Shooting line',
    allShots: 'All shots',
    shotDiet: 'Shot diet',
    shotDietSub: 'What share of his attempts each type is',
    threeRate: 'Three-point rate (3PA / FGA)',
    ftRate: 'Free-throw rate (FTA / FGA)',
    efgNote:
      'eFG% credits a three as 1.5 field goals. TS% goes further and counts free throws too, ' +
      'which is why it is the number worth comparing across positions.',
    efficiencyVolume: 'Efficiency against volume',
    efficiencyVolumeSub:
      'Made and attempted side by side — a high percentage on two shots is not the same thing',
    made: 'Made',
    attempted: 'Attempted',
    advancedTitle: 'Advanced metrics',
    advancedSub: 'One number per question: how good, how valuable, how efficient',
    perHint: '15.0 is league average',
    bpmHint: 'points per 100 vs an average player',
    vorpHint: 'cumulative, so minutes matter',
    wsHint: 'wins credited to him',
    gameScoreHint: 'a typical night, on the points scale',
    usgHint: 'share of possessions he finishes',
    twoWay: 'Two-way split',
    twoWaySub: 'Offence and defence, separated',
    obpm: 'Offensive BPM',
    dbpm: 'Defensive BPM',
    ratingsNote: 'Ratings are points per 100 possessions. League average this season is 113.5.',
    per36: 'Per 36 minutes',
    per36Sub: "Role-adjusted: what he would produce with a starter's minutes",
    basis: 'Basis',
    perGameWithMin: (min: string) => `Per game (${min} min)`,
    per36Row: 'Per 36 minutes',
    derivedNote:
      'These advanced numbers are reconstructed from the per-game line and true shooting, not ' +
      'measured from play-by-play — they rank players sensibly but are estimates. Running the ' +
      'Basketball-Reference ingest replaces them with the published values.',
    splitsTitle: 'Situational splits',
    splitsSub: 'The context the projection model leans on hardest',
    split: 'Split',
    splitHome: 'Home',
    splitAway: 'Away',
    splitRested: '2+ days rest',
    splitB2B: 'Back-to-back',
    homeCourtWorth: 'Home court worth',
    b2bCost: 'Back-to-back cost',
    monthly: 'Month by month',
    monthlySub: 'A season average hides a player who has been a different animal since January',
    gameLog: 'Game log',
    gameLogSubList: (n: number) => `${n} games · most recent first`,
    seasonHigh: (n: number) => `Season high ${n} pts`,
    b2bShort: 'B2B',
    careerProgression: 'Career progression',
    careerProgressionSub: 'Season by season, along the standard aging curve',
    seasonBySeason: 'Season by season',
    seasonBySeasonSub: 'Per game, with the advanced family alongside',
    trophyCase: 'Trophy case',
    trophyCaseChampionships: (n: number) => `${n} championship${n === 1 ? '' : 's'}`,
    individualHonours: 'Individual honours',
    whereHePlayed: 'Where he has played',
    careerTimeline: 'Career timeline',
    stintsNote:
      'Career paths are recorded for the players in the demo dataset; the ingest job fills the ' +
      'rest from the transaction history.',
    noHonours: 'No major individual honours yet.',
    shotType: 'Shot type',
    perLabel: 'PER — player efficiency rating',
    bpmLabel: 'BPM — box plus/minus',
    vorpLabel: 'VORP — value over replacement',
  },

  // --------------------------------------------------------------- scouting
  scouting: {
    modelRead: 'Model read',
    underpaid: 'Underpaid',
    overpaid: 'Overpaid',
    percentilePer: (n: number) => `${n}th pctile PER`,
    strengths: 'What he does well',
    strengthsSub: 'Each line fires off a percentile threshold, not an opinion',
    concerns: 'Where the questions are',
    concernsSub: 'Same method, opposite direction',
    similar: 'Statistically similar players',
    similarSub: 'Nearest neighbours on the twelve-axis percentile profile',
    similarNote:
      'Distance is weighted Euclidean over percentile ranks — points, rebounds, assists, steals, ' +
      'blocks, turnovers, threes, true shooting, usage, minutes, PER and BPM. Percentiles are ' +
      'already on a shared 0-100 scale, which is what stops one axis from dominating.',
    radarTitle: 'Profile against his closest comparison',
    allPercentiles: 'Every tracked percentile',
    allPercentilesSub: 'Where he sits in the league on all eighteen measured axes',
    archetypes: {
      primaryEngine: 'Primary engine',
      primaryEngineDetail: 'Carries the offence as both scorer and creator',
      leadPlaymaker: 'Lead playmaker',
      leadPlaymakerDetail: 'High usage, distributes more than he finishes',
      movementShooter: 'Movement shooter',
      movementShooterDetail: 'Scoring volume built on three-point gravity',
      bucketGetter: 'Bucket getter',
      bucketGetterDetail: 'Elite scoring volume, moderate playmaking load',
      rimProtector: 'Rim protector',
      rimProtectorDetail: 'Anchors the paint on both glass and shot-blocking',
      floorSpacer: 'Floor spacer',
      floorSpacerDetail: 'Low usage, high three-point volume and accuracy',
      perimeterStopper: 'Perimeter stopper',
      perimeterStopperDetail: 'Defensive event creation well above his usage',
      connectiveBig: 'Connective big',
      connectiveBigDetail: 'Screens, rebounds and finishes inside the offence',
      roleWing: 'Role wing',
      roleWingDetail: 'Complementary scoring inside a defined role',
    },
    report: {
      scoring: (top: number, ppg: string) =>
        `Scoring volume in the top ${top}% of the league at ${ppg} a night.`,
      efficiency: (ts: string, usg: string) =>
        `Elite efficiency — ${ts}% true shooting on a ${usg}% usage rate.`,
      creation: (pctile: number, ast: string) =>
        `Creates for others at a ${pctile}th-percentile rate (${ast} assists).`,
      rebounding: (reb: string, pctile: number) =>
        `Controls the glass: ${reb} rebounds, ${pctile}th percentile.`,
      defence: (stl: string, blk: string) =>
        `Generates defensive events — ${stl} steals and ${blk} blocks.`,
      spacing: (pct: string) => `A genuine floor spacer at ${pct}% from three.`,
      noStrength: 'Fills a defined role without a standout statistical strength.',
      lowEfficiency: (ts: string) =>
        `Efficiency lags at ${ts}% true shooting — bottom third of the league.`,
      turnovers: (tov: string) => `Turns it over ${tov} times a game for his usage.`,
      coldShooting: (fg3a: string, pct: string) =>
        `Takes ${fg3a} threes a game at only ${pct}%.`,
      lowRebounding: 'Rebounds below what his position usually provides.',
      age: (age: number) => `Age ${age} — the aging curve is working against the contract from here.`,
      overpaid: (m: number) => `Paid above the model's valuation by ${m}M.`,
      noConcerns: 'No material statistical red flags this season.',
      summary: (a: {
        name: string; archetype: string; detail: string
        pts: string; reb: string; ast: string; min: string; ts: string
        perPct: number; vorpPct: number
      }) =>
        `${a.name} profiles as a ${a.archetype} — ${a.detail}. He is producing ${a.pts} points, ` +
        `${a.reb} rebounds and ${a.ast} assists in ${a.min} minutes at ${a.ts}% true shooting, ` +
        `which puts him in the ${a.perPct}th percentile on PER and the ${a.vorpPct}th on VORP.`,
      teamContext: (team: string, w: number, l: number, net: string) =>
        ` ${team} are ${w}-${l} with a ${net} net rating.`,
    },
  },

  // ---------------------------------------------------------------- rookies
  rookies: {
    title: 'The rookies',
    loadingTitle: 'Rookie class',
    loadingSub: 'Loading the draft board…',
    classBadge: (year: number) => `${year} draft class`,
    lede: (season: string) =>
      `Every first-year player in the index, their draft slot, where they came from and how the ` +
      `${season} season is going. The Rookie of the Year race is scored below.`,
    royFrontRunner: 'ROY front-runner',
    pickShort: (n: number) => `pick ${n}`,
    tracked: 'Rookies tracked',
    topScorer: 'Top scorer',
    avgMinutes: 'Average minutes',
    classPayroll: 'Class payroll',
    royRace: 'Rookie of the Year race',
    royRaceSub: 'A blended score: production, efficiency, role and team success',
    royBreakdown: 'How the score breaks down',
    royBreakdownSub: 'Top five, component by component',
    draftBoard: 'Draft board',
    draftBoardSub: (year: number) => `${year} first round · click a card for the profile`,
    classTable: 'Class table',
    classTableSub: 'Every rookie, every column',
    sortPick: 'Draft order',
    sortRoy: 'ROY race',
    roy: 'ROY',
    royScore: 'ROY score',
  },

  // ------------------------------------------------------------------ teams
  teams: {
    title: 'Teams',
    sub: (season: string) => `Ratings, pace, payroll and banners · ${season} season`,
    championsOf: (year: number) => `${year} CHAMPIONS`,
    leagueTable: 'League table',
    leagueTableSub: 'Every team, every column',
    sortNet: 'Net',
    sortOffence: 'Offence',
    sortDefence: 'Defence',
    sortPace: 'Pace',
    sortRecord: 'Record',
  },

  // ------------------------------------------------------------ team detail
  team: {
    notFound: 'Team not found',
    loading: 'Loading the team',
    loadingSub: 'Roster, ratings, cap sheet and banners',
    tabs: {
      roster: 'Roster',
      stats: 'Team stats',
      arena: 'Arena & gate',
      cap: 'Cap sheet',
      history: 'History',
    },
    conferenceDivision: (conf: string, div: string) => `${conf} Conference · ${div}`,
    championBadge: (n: number) => `${n}× NBA champion`,
    since: (year: number) => `Since ${year}`,
    seats: (n: string) => `${n} seats`,
    leaderSuffix: 'leader',
    rosterSub: (n: number, season: string) => `${n} players in the index · ${season}`,
    rosterTable: 'Roster table',
    rosterTableSub: 'Every column, sortable by the control above',
    profileTitle: 'Team profile',
    profileSub: 'Percentile is against the other 29 teams',
    defenceHint: 'lower is better — percentile already inverted',
    teamTs: 'Team true shooting',
    scoringIdentity: 'Scoring identity',
    scoringIdentitySub: 'Rating × pace is the actual scoreboard',
    scored: 'Scored',
    allowed: 'Allowed',
    differential: 'Differential',
    possPer48: 'Possessions per 48',
    threeShare: 'Share of shots from three',
    weightedAge: 'Minutes-weighted age',
    payrollOnBooks: 'Payroll on the books',
    matchupDefence: 'Matchup defence',
    matchupDefenceSub:
      'Points conceded to each position, relative to league average — positive means a soft spot',
    soft: 'soft',
    tough: 'tough',
    matchupNote:
      'This row is a direct input to the player projection model — a guard facing a team that ' +
      'concedes to guards gets a higher forecast.',
    compareTitle: 'Compare with another team',
    compareSub: 'Same axes, same scale',
    headToHeadNumbers: 'Head to head on the numbers',
    lowerDefBetter: 'Lower defensive rating is better',
    sideBySide: 'Side by side',
    forecastGame: 'Forecast the game',
    simulateWatch: 'Simulate and watch',
    payrollTitle: 'Payroll',
    payrollSub: (season: string) => `${season} commitments for the listed roster`,
    committed: 'Committed',
    salaryCap: 'Salary cap',
    luxuryTax: 'Luxury tax',
    inTaxBy: 'In the tax by',
    roomUnderCap: 'Room under the cap',
    modelledValue: 'Modelled value',
    surplusCol: 'Surplus',
    shareOfCap: 'Share of cap',
    capNote:
      "Modelled value is what the market-value model thinks he is worth: production, scaled by an " +
      'age curve and availability, priced against the cap. Surplus is that minus what he is paid.',
    contractsTitle: 'Best and worst contracts',
    contractsSub: 'By surplus value',
    bargains: 'Bargains',
    overpaid: 'Overpaid',
    rafters: 'The rafters',
    raftersSub: (n: number, year: number | null) =>
      `${n} NBA championship${n === 1 ? '' : 's'}${year ? `, the last in ${year}` : ''}`,
    noTitle: 'No NBA championship yet',
    raftersEmpty: 'Rafters empty',
    raftersEmptyHint: (year: number | null) =>
      `No NBA championship yet${year ? ` since ${year}` : ''}.`,
    abaNote: (n: number, years: string) =>
      `Plus ${n} ABA championship${n === 1 ? '' : 's'} (${years}).`,
    bannerNote:
      'Banners marked with an earlier city were won under a previous name — the NBA counts them ' +
      'for the franchise.',
    franchiseFacts: 'Franchise facts',
    founded: 'Founded',
    homeArena: 'Home arena',
    conference: 'Conference',
    division: 'Division',
    championships: 'NBA championships',
    mostRecentTitle: 'Most recent title',
    titleDrought: 'Seasons since a title',
    abaChampionships: 'ABA championships',
    recentFinals: 'Recent Finals',
    recentFinalsSub: 'Last eight championship rounds',
    def: 'def.',
    noFinals: (abbr: string) => `${abbr} have not reached the Finals in this window.`,
    champs: 'Champs',
    championsTitle: (abbr: string) => `${abbr} champions`,
  },

  // ------------------------------------------------------------------ arena
  arena: {
    homeFloor: (city: string, region: string) => `Home floor · ${city}, ${region}`,
    opened: (year: number) => `Opened ${year}`,
    capacity: (n: string) => `Capacity ${n}`,
    full: (pct: string) => `${pct}% full`,
    averageCrowd: 'Average crowd',
    vsLeague: (v: string) => `${v} vs league`,
    seasonTotal: 'Season total',
    homeGames: (n: number) => `${n} home games`,
    sellouts: 'Sellouts',
    ofHomeDates: (n: number) => `of ${n} home dates`,
    averageTicket: 'Average ticket',
    getInFrom: (v: string) => `get in from ${v}`,
    recentDates: 'Recent home dates',
    recentDatesSub:
      'Crowd and average resale price, game by game — the visitor is the biggest lever on both',
    attendance: 'Attendance',
    averagePrice: 'Average price',
    fill: 'Fill',
    getIn: 'Get in',
    average: 'Average',
    premium: 'Premium',
    ticketMarket: 'Ticket market',
    ticketMarketSub: 'Modelled resale pricing',
    cheapestSeat: 'cheapest seat in the building',
    allListings: 'all listings',
    lowerBowl: 'lower bowl, marquee visitor',
    leagueAvgTicket: 'League average ticket',
    vsLeagueRow: 'This team vs league',
    priceRank: 'Price rank',
    marketSizeRank: 'Market size rank',
    demandIndex: 'Demand index',
    howFull: 'How full it gets',
    howFullSub: 'Against capacity and the league',
    ofCapacity: 'of listed capacity',
    listedCapacity: 'Listed capacity',
    emptySeats: 'Empty seats a night',
    leagueAverage: 'League average',
    attendanceRank: 'Attendance rank',
    acrossLeague: 'Attendance across the league',
    acrossLeagueSub: 'Average crowd per home game, this team highlighted',
    arenaCol: 'Arena',
    capacityCol: 'Capacity',
    averageCol: 'Average',
    disclaimer:
      'Arena name, capacity, opening year and location are facts. Attendance and ticket prices ' +
      "are modelled — from capacity, win rate, market size, arena age and the visiting team's " +
      'draw — and anchored to the public league averages (about 18,300 a night at roughly 95% of ' +
      'capacity). The NBA publishes no free per-game gate feed and resale pricing sits behind paid ' +
      'APIs; connect one through the ingest job and these panels fill from source instead.',
  },

  // ---------------------------------------------------------------- compare
  compare: {
    title: 'Compare players',
    sub: (season: string) =>
      `Up to four at once, on ${season} numbers. Every axis uses the same scale, so the shapes ` +
      'are comparable.',
    pickPlayer: 'Pick a player…',
    addAnother: 'Add another (optional)…',
    emptyTitle: 'Pick at least two players',
    emptyHint: 'Use the boxes above — type a surname and hit Enter.',
    categoriesWon: 'categories won',
    championBadge: (n: number) => `${n}× champion`,
    radarTitle: 'Skill profiles overlaid',
    barsTitle: 'Per-game production',
    barsSub: 'Same axis for every player — no rescaling tricks',
    lineByLine: 'Line by line',
    lineByLineSub:
      'The bar shows each player\'s league percentile, so a number is never shown without a reference',
    groups: {
      box: 'Box score',
      shooting: 'Shooting',
      advanced: 'Advanced',
      value: 'Contract',
    },
    invertedNote:
      'Turnovers, defensive rating and age are scored the other way round — lower wins the ' +
      'category. Advanced metrics are reconstructed from the per-game line in demo mode.',
    honoursTitle: (lastName: string) => `${lastName} — honours`,
    honoursCount: (n: number) => `${n} categories`,
    honoursNone: 'None yet',
  },

  // -------------------------------------------------------------------- h2h
  h2h: {
    title: 'Head-to-head',
    sub: 'Every meeting with one opponent, split by venue — the split the projection model leans on',
    opponent: 'Opponent',
    emptyTitle: 'Pick a player and an opponent',
    samePlaysFor: (name: string, abbr: string) => `${name} plays for ${abbr}`,
    sameHint:
      'Pick a different opponent — a player has no head-to-head record against his own team.',
    careerMeetings: (n: number, team: string) => `${n} career meetings with the ${team}`,
    careerVs: 'Career vs',
    atHome: 'At home',
    onRoad: 'On the road',
    homeEdge: 'Home edge',
    chartTitle: (stat: string, abbr: string) => `${stat} against ${abbr}, game by game`,
    chartSub: 'Home games and road games plotted as separate series',
    homeSeries: (n: number) => `Home (${n} games)`,
    awaySeries: (n: number) => `Away (${n} games)`,
    splitTitle: 'Home vs away',
    splitSub: 'Averages in this matchup only',
    everyMeeting: 'Every meeting',
    everyMeetingSub: 'Most recent first',
    venue: 'Venue',
    delta: 'Delta',
  },

  // -------------------------------------------------------- player forecast
  predictPlayer: {
    title: 'Player projection',
    sub: 'Pick a player and an opponent. Every input below moves the forecast.',
    restDays: 'Days of rest',
    backToBack: 'Back-to-back',
    oneDay: '1 day',
    nDays: (n: number) => `${n} days`,
    samePlaysFor: (name: string, abbr: string) => `${name} plays for ${abbr}`,
    sameHint: 'Pick an opposing team to project a matchup.',
    emptyTitle: 'Pick a player and an opponent',
    atHome: 'at home',
    onRoad: 'on the road',
    contextLine: (venue: string, opponent: string, rest: string, playoffs: boolean) =>
      `${venue} vs ${opponent} · ${rest}${playoffs ? ' · playoffs' : ''}`,
    restLabel: (n: number) => (n === 0 ? 'back-to-back' : `${n} days rest`),
    oppDrtg: 'Opp DRtg',
    oppPace: 'Opp pace',
    formIndex: 'Form index',
    points: 'Points',
    rebounds: 'Rebounds',
    assists: 'Assists',
    threes: 'Three-pointers made',
    minutes: 'Minutes',
    steals: 'Steals',
    blocks: 'Blocks',
    turnovers: 'Turnovers',
    whatMovedIt: 'What moved it',
    whatMovedItSub: 'Effect on the points projection',
    driversNote:
      "Each bar is one factor's isolated contribution. They compose multiplicatively in the " +
      'model, so the bars will not sum exactly to the difference from his season average.',
    historyTitle: (abbr: string) => `Recent history against ${abbr}`,
    historySub: 'What he has actually done in this matchup',
    projected: (v: string) => `Projected ${v}`,
    drivers: {
      venue: 'Venue',
      homeCourt: 'Home court',
      onTheRoad: 'On the road',
      oppDefence: 'Opponent defence',
      oppDefenceDetail: (abbr: string, drtg: string) => `${abbr} DRtg ${drtg}`,
      pace: 'Pace',
      paceDetail: (abbr: string, pace: string) => `${abbr} plays at ${pace}`,
      rest: 'Rest',
      restB2B: 'Back-to-back',
      restDays: (n: number) => `${n} days off`,
      matchup: 'Matchup',
      matchupDetail: (pos: string) => `${pos} defence vs league average`,
      form: 'Recent form',
      formDetail: 'Last 5 games vs season average',
      playoffs: 'Playoff intensity',
      playoffsDetail: 'Tighter defence, shorter rotations',
    },
  },

  // ---------------------------------------------------------- team forecast
  predictTeam: {
    title: 'Game forecast',
    sub: 'Score, spread and win probability. Playoffs run on their own model, not a flag on the regular-season one.',
    homeTeam: 'Home team',
    awayTeam: 'Away team',
    homeRest: 'Home rest',
    awayRest: 'Away rest',
    swap: 'Swap',
    emptyTitle: 'Pick two different teams',
    projected: 'Projected',
    final: 'Final',
    totalShort: (v: string) => `Total ${v}`,
    spread: 'Spread',
    spreadHint: (abbr: string) => `${abbr} line`,
    total: 'Total',
    possessions: 'Possessions',
    possessionsHintPlayoffs: 'playoff pace applied',
    possessionsHint: 'pace of both teams',
    margin80: 'Margin (80%)',
    bestOfSeven: (format: string) => `Best-of-seven · ${format}`,
    winSeries: (abbr: string) => `${abbr} win the series`,
    perGame: (home: string, away: string) =>
      `Per-game: ${home} at home, ${away} on the road. Enumerated exactly over all 2⁷ outcome ` +
      'paths, not simulated.',
    playoffModel: 'Playoff model',
    homePoints: (abbr: string) => `${abbr} points`,
    marginLabel: 'Margin (home minus away)',
    teamProfile: 'Team profile',
    lowerDefBetter: 'Lower defensive rating is better',
    offence: 'Offence',
    defence: 'Defence',
    pace: 'Pace',
    weightedByPlayer: 'Weighted by player',
    weightedByPlayerSub:
      'The team number decomposed — every projected minute belongs to somebody',
  },

  // --------------------------------------------------------------- simulate
  simulate: {
    title: 'Simulate a game',
    sub: 'Two real teams, a possession-level engine, and a replay you can watch. Rule players out, switch to playoff rules, swap home court — everything moves the result.',
    changeSetup: 'Change the setup',
    swapHomeCourt: 'Swap home court',
    pickDifferent: 'Pick two different teams.',
    analyticalForecast: 'Analytical forecast, before the simulation runs',
    projectedScore: 'Projected score',
    forecastNote:
      'This is the ratings model. The simulation below plays the game possession by possession ' +
      'and will not always agree — that gap is the point.',
    availability: (abbr: string) => `${abbr} availability`,
    availabilitySub: 'Click a player to rule him out',
    fullStrength:
      'Full strength. Toggling anyone off redistributes his minutes and moves the team ratings.',
    effectOn: (abbr: string) => `Effect on ${abbr}`,
    outCount: 'Out',
    ruledOut: 'Ruled out for this game',
    confidenceSweep: 'Confidence sweep',
    off: 'Off',
    runs: (n: number) => `${n} runs`,
    playGame: 'Play the game',
    playPlayoffGame: 'Play the playoff game',
    seedNote: (runs: number) =>
      'The same seed always replays the same game, so a result is shareable. The confidence ' +
      `sweep re-runs the identical engine ${runs} more times to produce the win probability ` +
      'shown after the final buzzer — it runs on a background thread, so the page stays responsive.',
  },

  // ---------------------------------------------------------------- builder
  builder: {
    title: 'Build your team',
    sub: 'Pick a budget, sign a roster, and play it against a real NBA team. Anyone you sign leaves their real roster for the duration of the game.',
    backToRoster: 'Back to the roster',
    budget: 'Budget',
    custom: 'Custom',
    signedCount: (n: number, max: number) => `${n}/${max} signed`,
    left: (v: string) => `${v} left`,
    priceNote: (cap: string) =>
      'Every player costs his own market value — production priced against the salary cap, ' +
      'adjusted for age and availability. Those prices never move, so the budget is the only ' +
      `thing you control: raise it and you keep the roster you have already signed. For ` +
      `reference, the salary cap is ${cap}.`,
    filterPlaceholder: 'Filter by name, team or position…',
    sortPriciest: 'Priciest',
    sortBestValue: 'Best value',
    ofBudget: (pct: string) => `${pct}% of budget`,
    yourLineup: 'Your lineup',
    rosterRange: (min: number, max: number) => `${min}-${max} players`,
    clickToSign: 'Click players on the left to sign them.',
    release: (name: string) => `Release ${name}`,
    opponent: 'Opponent',
    youHost: 'You host',
    signedAwayFrom: (abbr: string) => `Signed away from ${abbr}`,
    signedAwayNote: (names: string, abbr: string) =>
      `${names} will not play for ${abbr}. Their ratings drop accordingly.`,
    signMore: (n: number) => `Sign ${n} more`,
    overBudget: 'Over budget',
    play: (abbr: string) => `Play ${abbr}`,
    facingTitle: 'Who you are facing',
    fillerNote:
      'The rest of their rotation is filled with replacement-level players — the demo dataset ' +
      'carries the top of each roster, not all 15 contracts.',
    loadingPool: 'Loading the player pool…',
    simFailed: 'Simulation failed',
  },

  // ----------------------------------------------------------------- league
  league: {
    title: 'Simulate a whole season',
    sub: (season: string) =>
      `All 82 games for every team, then the play-in, the bracket and the Finals. Drop your own ` +
      `team into the ${season} league and see where it lands.`,
    runAgain: 'Run it again',
    changeSetup: 'Change the setup',
    playingSeason: 'Playing the season',
    whoIsIn: 'Who is in the league',
    real30: 'The real 30',
    addMyTeam: 'Add my team',
    yourFranchise: 'Your franchise',
    yourFranchiseSub: 'It takes the place of one real team, so the league stays at 30',
    teamName: 'Team name',
    threeLetterCode: 'Three-letter code',
    conference: 'Conference',
    replaces: 'Replaces',
    rosterLabel: 'Roster — five to eight players',
    signPlayer: 'Sign a player…',
    optional: 'Optional…',
    loadBuilderRoster: (n: number) => `Load my builder roster (${n})`,
    needFive: 'Sign at least five players to field a team.',
    playSeason: 'Play the season',
    stageSchedule: 'Building the schedule',
    stageRegular: 'Playing the regular season',
    stagePlayoffs: 'Running the playoffs',
    simulatedChampions: (season: string) => `Simulated ${season} champions`,
    finalsMvp: 'Finals MVP',
    gamesPlayed: 'Games played',
    averageTotal: 'Average total',
    averageMargin: 'Average margin',
    finalTable: 'Final simulated table',
    bracket: 'Playoff bracket',
    bracketSub: 'Best of seven throughout, 2-2-1-1-1 home court to the higher seed',
    firstRounds: 'Conference first rounds',
    semiFinals: 'Conference semi-finals',
    finalsGroup: 'Conference finals & the Finals',
    howYourTeamDid: 'How your team did',
    yourTeamSub: (name: string, n: number) => `${name} · ${n} players`,
    seedLabel: 'Seed',
    pointDiff: 'Point diff',
    seriesPlayed: 'Series played',
    rounds: {
      firstRound: (conf: string) => `${conf} first round`,
      semiFinal: (conf: string) => `${conf} semi-final`,
      conferenceFinals: (conf: string) => `${conf} finals`,
      nbaFinals: 'NBA Finals',
    },
  },

  // ----------------------------------------------------------------- season
  season: {
    title: 'The season so far',
    badge: (season: string) => `${season} regular season`,
    lede: (season: string) =>
      `Both conference tables, the play-in picture, every statistical leaderboard, and a scored ` +
      `model of each award race — all from the same ${season} dataset the rest of the site runs on.`,
    leaguePpg: 'League PPG',
    offRating: 'Off rating',
    threeShare: 'Shots from three',
    avgAttendance: 'Avg attendance',
    avgTicket: 'Avg ticket',
    tabs: {
      standings: 'Standings',
      leaders: 'League leaders',
      awards: 'Award races',
      trends: 'League trends',
    },
    conferenceTitle: (conf: string) => `${conf} Conference`,
    standingsSub: 'Seeds 1-6 are through · 7-10 play the play-in',
    playoffBerth: 'Playoff berth',
    playIn: 'Play-in',
    leadersTitle: (cat: string) => `${cat} leaders`,
    leadersSub: (unit: string) => `Top 10 · ${unit}`,
    leadersChart: (cat: string) => `${cat} — top 10`,
    leadersChartSub: 'Bars are team-coloured; the name beside each carries the same identity',
    everyCategory: 'Every category at a glance',
    everyCategorySub: 'The leader in each of the fourteen tracked statistics',
    frontRunner: (award: string) => `${award} · front-runner`,
    voteShare: 'Modelled vote share',
    ballot: 'The ballot',
    ballotSub: 'Modelled vote share, top six',
    scoreBuilt: 'How the score is built',
    scoreBuiltSub: 'Every component is shown, so the ranking is arguable rather than magic',
    awardsNote:
      'These are models, not ballots. Vote share is a softmax over the total score, which is why ' +
      'a dominant season shows up as a landslide rather than a narrow edge.',
    offVsDef: 'Offence against defence',
    offVsDefSub:
      'Top-right of the plot is a good offence; lower is a good defence, so the title contenders ' +
      'sit bottom-right',
    teamsCount: (n: number) => `${n} teams`,
    bestTeam: 'Best team in the league',
    attendanceLeaders: 'Attendance leaders',
    attendanceLeadersSub: 'Average crowd per home game',
    priciestTickets: 'Priciest tickets',
    priciestTicketsSub: 'Modelled average secondary-market price',
    payrollVsWins: 'Payroll against wins',
    payrollVsWinsSub:
      'Money does not buy wins in a straight line — the outliers are the interesting part',
    costPerWin: 'Cost per win',
    avgAge: 'Avg age',
    threePaShare: '3PA share',
    payrollNote:
      'Payroll counts only the players carried in this dataset, so it runs below a full 15-man ' +
      'cap sheet. Attendance and ticket prices are modelled — see the arena tab on any team page.',
    awards: {
      mvp: 'MVP', mvpFull: 'Most Valuable Player',
      dpoy: 'DPOY', dpoyFull: 'Defensive Player of the Year',
      roy: 'ROY', royFull: 'Rookie of the Year',
      mip: 'MIP', mipFull: 'Most Improved Player',
      sixth: '6MOY', sixthFull: 'Sixth Man of the Year',
    },
    parts: {
      production: 'Production',
      efficiency: 'Efficiency',
      role: 'Role',
      teamSuccess: 'Team success',
      impact: 'Impact',
      stocks: 'Stocks',
      defensiveRebounding: 'Defensive rebounding',
      teamDefence: 'Team defence',
      minutes: 'Minutes',
      aboveExpectation: 'Above expectation',
      roleGrowth: 'Role growth',
      benchScoring: 'Bench scoring',
      playmaking: 'Playmaking',
    },
  },

  // ------------------------------------------------------------- simulation
  sim: {
    tipOff: 'Tip-off',
    gameClock: 'Game clock',
    stageRosters: 'Locking rosters',
    stageInjury: 'Checking the injury report',
    stageMinutes: 'Allocating minutes by usage',
    stagePossession: 'Running the possession model',
    stageReplay: (n: number) => `Replaying the game ${n} times`,
    stageWarmUp: 'Warming up',
    stageStarting: 'Starting',
    yourLineup: 'Your lineup',
    yourTeam: 'Your team',
    playByPlay: 'Play by play',
    plays: (n: number) => `${n} plays`,
    boxScore: 'Box score',
    updatingLive: 'Updating live',
    pause: 'Pause',
    play: 'Play',
    runItAgain: 'Run it again',
    skip: 'Skip',
    tempoNote: (seed: number) => `1 real second = 1 game minute · seed ${seed}`,
    final: 'FINAL',
    distributionTitle: (n: number) => `If they played it ${n} more times`,
    distributionSub: 'The same engine, re-run — so the odds and the game you just watched agree',
    homeWinRate: 'Home win rate',
    averageMargin: 'Average margin',
    margin1090: 'Margin 10–90%',
    averageTotal: 'Average total',
    rosterFromIndex: 'Roster from the live index',
    yourAssembledLineup: 'Your assembled lineup',
    fillerTooltip:
      'Replacement-level filler: the demo dataset only carries the top of each roster.',
    events: {
      turnover: (actor: string, stealer: string) => `${actor} turnover, stolen by ${stealer}`,
      blocked: (actor: string, kind: string, blocker: string) =>
        `${actor} ${kind} BLOCKED by ${blocker}`,
      three: 'drains a three',
      rim: 'throws it down',
      mid: 'hits the mid-range',
      andOne: ' — AND ONE!',
      freeThrows: (actor: string, made: number, shots: number) =>
        `${actor} ${made}/${shots} from the line`,
      miss: (actor: string, kind: string) => `${actor} misses the ${kind}`,
      rebound: (name: string, offensive: boolean) =>
        `${name} ${offensive ? 'offensive' : 'defensive'} rebound`,
      secondChance: (actor: string) => `${actor} second-chance bucket`,
      putbackMiss: (actor: string) => `${actor} misses the putback`,
      endOf: (period: string) => `End of ${period}`,
      shotKind: { three: 'three', rim: 'rim', mid: 'mid' },
    },
  },

  // -------------------------------------------------------------- assistant
  /**
   * The in-page assistant. It only ever talks about the player or team whose
   * page is open, and every sentence it can say lives here — the rule engine
   * emits keys, never prose, so an answer given in English becomes Spanish the
   * moment the language changes.
   */
  assistant: {
    open: 'Ask about this page',
    titlePlayer: (name: string) => `Ask about ${name}`,
    titleTeam: (name: string) => `Ask about the ${name}`,
    scopePlayer: (name: string) => `I only answer about ${name}`,
    scopeTeam: (name: string) => `I only answer about the ${name}`,
    placeholder: 'Ask a question…',
    send: 'Send',
    close: 'Close',
    clear: 'Clear the conversation',
    thinking: 'Reading the numbers…',
    suggestionsTitle: 'Try one of these',
    localBadge: 'Runs on your machine',
    localNote:
      'No model and no network: the answers are built by rules from the same ' +
      'season data this page renders, so they can never disagree with the charts.',
    goToPage: (name: string) => `Open ${name} →`,
    you: 'You',
    assistantName: 'Court analyst',
    suggest: {
      howGood: 'Is he any good?',
      scoring: 'How does he score?',
      defence: 'How does he defend?',
      shooting: 'Shooting numbers',
      strength: 'What does he do well?',
      weakness: "Where's the weakness?",
      contract: 'Is he worth the money?',
      form: 'Recent form',
      comparison: 'Who does he resemble?',
      honours: 'What has he won?',
      homeAway: 'Home vs away',
      advanced: 'Advanced metrics',
      rank: 'Where does he rank?',
      career: 'Where has he played?',
      teamHowGood: 'Are they any good?',
      teamOffence: 'How is the offence?',
      teamDefence: 'How is the defence?',
      teamBest: 'Who is their best player?',
      teamStrength: 'What do they do well?',
      teamWeakness: "Where's the weakness?",
      teamRecord: 'How is the season going?',
      teamRoster: 'Tell me about the roster',
      teamPayroll: 'What do they pay?',
      teamArena: 'The arena and the crowd',
      teamHistory: 'What have they won?',
      teamPace: 'How fast do they play?',
    },
    say: {
      // ------------------------------------------------------------ chrome
      greetingPlayer: (a: { name: string }) =>
        `Ask me anything about ${a.name} — his numbers, what they mean, and what I make of them. I only cover him on this page.`,
      greetingTeam: (a: { name: string }) =>
        `Ask me anything about the ${a.name} — ratings, roster, money, the building. I only cover them on this page.`,
      thanks: (a: { name: string }) => `Any time. More on ${a.name} whenever you want it.`,
      helpPlayer: (a: { name: string }) =>
        `I answer questions about ${a.name} using this season's numbers: production, efficiency, role, value and what I think it adds up to. Ask about anyone else and I will point you at their page instead.`,
      helpTeam: (a: { name: string }) =>
        `I answer questions about the ${a.name} using this season's numbers: ratings, record, roster, payroll, the building, and what I think it adds up to. Ask about anyone else and I will point you at their page instead.`,
      notUnderstoodPlayer: (a: { name: string }) =>
        `I did not follow that one. I can talk about ${a.name}'s production, shooting, defence, role, contract, form and honours — try one of these.`,
      notUnderstoodTeam: (a: { name: string }) =>
        `I did not follow that one. I can talk about the ${a.name}' ratings, record, offence, defence, pace, roster, payroll, arena and history — try one of these.`,
      refusePlayerFromPlayer: (a: { subject: string; other: string }) =>
        `I only answer about ${a.subject} on this page. For ${a.other}, open his profile and ask me there.`,
      refuseTeamFromPlayer: (a: { subject: string; other: string }) =>
        `I only answer about ${a.subject} on this page. For the ${a.other}, open their team page and ask me there.`,
      refusePlayerFromTeam: (a: { subject: string; other: string }) =>
        `I only answer about the ${a.subject} on this page. For ${a.other}, open his profile and ask me there.`,
      refuseTeamFromTeam: (a: { subject: string; other: string }) =>
        `I only answer about the ${a.subject} on this page. For the ${a.other}, open their team page and ask me there.`,

      // ------------------------------------------------------------ player
      verdictElite: (a: { name: string; perPct: number; vorpPct: number }) =>
        `${a.name} is one of the genuinely elite players in the index: ${a.perPct}th percentile on PER and ${a.vorpPct}th on VORP. There is no soft reading of those two numbers together.`,
      verdictStrong: (a: { name: string; perPct: number; vorpPct: number }) =>
        `${a.name} is clearly above the line — ${a.perPct}th percentile on PER, ${a.vorpPct}th on VORP. A quality starter rather than a passenger.`,
      verdictSolid: (a: { name: string; perPct: number; vorpPct: number }) =>
        `${a.name} sits around the middle of the league: ${a.perPct}th percentile on PER and ${a.vorpPct}th on VORP. Useful inside a defined role.`,
      verdictRole: (a: { name: string; perPct: number; vorpPct: number }) =>
        `${a.name} is a rotation piece on these numbers — ${a.perPct}th percentile on PER, ${a.vorpPct}th on VORP. The value is in what he does specifically, not in the totals.`,
      statLine: (a: { pts: string; reb: string; ast: string; min: string; ts: string }) =>
        `The line: ${a.pts} points, ${a.reb} rebounds and ${a.ast} assists in ${a.min} minutes, at ${a.ts}% true shooting.`,
      overviewContext: (a: { pos: string; team: string; age: number; wins: number; losses: number }) =>
        `He plays ${a.pos} for the ${a.team}, who are ${a.wins}-${a.losses}, and he is ${a.age}.`,
      scoring: (a: { name: string; pts: string; pctile: number; ts: string; tsPct: number }) =>
        `${a.name} scores ${a.pts} a night — ${a.pctile}th percentile — on ${a.ts}% true shooting, which is ${a.tsPct}th percentile for efficiency. Volume and efficiency are separate questions and this is both answers.`,
      scoringMix: (a: { fg3m: string; fg3Pct: string; ftm: string; fga: string }) =>
        `The mix: ${a.fga} shots a game, ${a.fg3m} threes at ${a.fg3Pct}%, and ${a.ftm} free throws made.`,
      rebounding: (a: { name: string; reb: string; pctile: number; oreb: string; dreb: string; pos: string }) =>
        `${a.name} takes ${a.reb} rebounds a game — ${a.oreb} offensive, ${a.dreb} defensive — which is the ${a.pctile}th percentile in the index. Read it against the position: he is a ${a.pos}.`,
      playmaking: (a: { name: string; ast: string; pctile: number; tov: string; ratio: string }) =>
        `${a.name} averages ${a.ast} assists, ${a.pctile}th percentile, against ${a.tov} turnovers — an assist-to-turnover ratio of ${a.ratio}.`,
      defence: (a: { name: string; stl: string; blk: string; stlPct: number; blkPct: number }) =>
        `${a.name} generates ${a.stl} steals (${a.stlPct}th percentile) and ${a.blk} blocks (${a.blkPct}th). Those are the events a box score can see; they are not the whole of defence.`,
      defenceContext: (a: { dbpm: string; drtg: string }) =>
        `His defensive box plus/minus is ${a.dbpm} and his defensive rating ${a.drtg} points per 100 possessions.`,
      shooting: (a: { name: string; fgPct: string; fg3Pct: string; fg3a: string; ts: string; efg: string }) =>
        `${a.name} shoots ${a.fgPct}% from the field and ${a.fg3Pct}% from three on ${a.fg3a} attempts, for ${a.efg}% effective and ${a.ts}% true shooting.`,
      shootingVerdict: (a: { name: string; tsPct: number; threePct: number }) =>
        `That puts him in the ${a.tsPct}th percentile for overall efficiency and the ${a.threePct}th from three. True shooting is the number worth comparing across positions, because it counts free throws too.`,
      turnovers: (a: { name: string; tov: string; pctile: number; usg: string }) =>
        `${a.name} loses ${a.tov} balls a game on a ${a.usg}% usage rate. On the inverted percentile — where high means he protects the ball — that is ${a.pctile}th.`,
      role: (a: { name: string; min: string; minPct: number; usg: string; usgPct: number }) =>
        `${a.name} plays ${a.min} minutes (${a.minPct}th percentile) and finishes ${a.usg}% of his team's possessions (${a.usgPct}th). Minutes say how much they trust him; usage says what they ask him to do with the time.`,
      advanced: (a: { name: string; per: string; bpm: string; vorp: string; ws: string }) =>
        `${a.name}: ${a.per} PER, ${a.bpm} box plus/minus, ${a.vorp} VORP and ${a.ws} win shares.`,
      advancedContext: (a: { perPct: number; vorpPct: number; bpmPct: number }) =>
        `In percentiles that is ${a.perPct} on PER, ${a.bpmPct} on BPM and ${a.vorpPct} on VORP. VORP is cumulative, so minutes matter to it in a way they do not to PER.`,
      advancedDerived: (a: { name: string }) =>
        `Worth knowing: these advanced numbers are reconstructed from ${a.name}'s per-game line and true shooting, not measured from play-by-play. They rank players sensibly, but they are estimates.`,
      strengthsIntro: (a: { name: string }) =>
        `What ${a.name} does well, by percentile threshold rather than by opinion:`,
      concernsIntro: (a: { name: string }) =>
        `Where the questions are with ${a.name} — same method, opposite direction:`,
      contractBargain: (a: { name: string; salary: string; value: string; diff: string }) =>
        `${a.name} is a bargain on this model: he is paid ${a.salary} against a modelled value of ${a.value}, a surplus of ${a.diff}.`,
      contractOverpaid: (a: { name: string; salary: string; value: string; diff: string }) =>
        `${a.name} is paid above what the model thinks he is worth: ${a.salary} against a modelled value of ${a.value}, so ${a.diff} of negative surplus.`,
      contractFair: (a: { name: string; salary: string; value: string }) =>
        `${a.name} is paid about what he is worth: ${a.salary} against a modelled value of ${a.value}.`,
      contractCap: (a: { pct: string; cap: string; age: number }) =>
        `That is ${a.pct}% of the ${a.cap} salary cap. He is ${a.age}, which is the other half of any contract question.`,
      comparison: (a: { name: string; first: string; similarity: string; rest: string }) =>
        `The closest statistical match to ${a.name} is ${a.first}, at ${a.similarity}% similarity, followed by ${a.rest}.`,
      comparisonMethod: (a: { name: string }) =>
        `That is a nearest-neighbour search over twelve percentile axes — production, efficiency, usage and defensive events — not a subjective comparison. It says who produces like ${a.name}, not who plays like him.`,
      formHot: (a: { name: string; last5: string; season: string; diff: string }) =>
        `${a.name} is running hot: ${a.last5} points over the last five games against a season average of ${a.season}, so ${a.diff}.`,
      formCold: (a: { name: string; last5: string; season: string; diff: string }) =>
        `${a.name} has cooled off: ${a.last5} points over the last five against ${a.season} for the season, so ${a.diff}.`,
      formSteady: (a: { name: string; last5: string; season: string }) =>
        `${a.name} is steady — ${a.last5} points over the last five games against a season average of ${a.season}.`,
      formHigh: (a: { high: number; games: number }) =>
        `His high this season is ${a.high} points, across ${a.games} games logged.`,
      homeAway: (a: { name: string; homePts: string; awayPts: string; homeGp: number; awayGp: number; diff: string }) =>
        `At home ${a.name} averages ${a.homePts} points across ${a.homeGp} games; on the road ${a.awayPts} across ${a.awayGp}. That is ${a.diff} for playing at home.`,
      restSplit: (a: { rested: string; b2b: string; diff: string }) =>
        `With two or more days of rest he scores ${a.rested}; on the second night of a back-to-back, ${a.b2b} — a ${a.diff} swing.`,
      honours: (a: { name: string; rings: number; list: string }) =>
        `${a.name} has ${a.rings} championship${a.rings === 1 ? '' : 's'}. Individually: ${a.list}.`,
      honoursNone: (a: { name: string; experience: number }) =>
        `${a.name} has no major individual honours in the index yet, across ${a.experience} season${a.experience === 1 ? '' : 's'}.`,
      bio: (a: { name: string; age: number; height: string; cm: number; weight: number; kg: number; country: string }) =>
        `${a.name} is ${a.age}, listed at ${a.height} (${a.cm} cm) and ${a.weight} lb (${a.kg} kg), from ${a.country}.`,
      bioDraft: (a: { name: string; year: number; round: number; pick: number; experience: number }) =>
        `He was drafted in ${a.year}, round ${a.round}, pick ${a.pick}, and is in season ${a.experience} of his career.`,
      bioUndrafted: (a: { name: string; experience: number }) =>
        `${a.name} went undrafted and is in season ${a.experience} of his career.`,
      career: (a: { name: string; teams: string; count: number; seasons: number; current: string }) =>
        `${a.name} has played for ${a.count} franchise${a.count === 1 ? '' : 's'} across ${a.seasons} season${a.seasons === 1 ? '' : 's'}: ${a.teams}. He is with the ${a.current} now.`,
      rank: (a: { name: string; bestPct: number; worstPct: number; total: number }) =>
        `Against the ${a.total} players in the index, ${a.name}'s strongest tracked percentile is ${a.bestPct} and his weakest is ${a.worstPct}. The chips below show which is which.`,
      vsTeam: (a: { name: string; opp: string; gp: number; pts: string; reb: string; ast: string; season: string }) =>
        `Against the ${a.opp}, ${a.name} averages ${a.pts} points, ${a.reb} rebounds and ${a.ast} assists across ${a.gp} meetings — his season average is ${a.season}.`,
      vsTeamDefence: (a: { opp: string; drtg: string; rank: number }) =>
        `${a.opp} concede ${a.drtg} points per 100 possessions, ${a.rank}th in the league, which is the number the projection model leans on hardest.`,
      vsTeamNone: (a: { name: string; opp: string }) =>
        `I have no recorded meetings between ${a.name} and the ${a.opp} in this window.`,

      // -------------------------------------------------------------- team
      teamVerdictContender: (a: { name: string; net: string; rank: number }) =>
        `The ${a.name} are a genuine contender: ${a.net} net rating, ${a.rank}th in the league. Net rating is the number that survives contact with the playoffs.`,
      teamVerdictPlayoff: (a: { name: string; net: string; rank: number }) =>
        `The ${a.name} are a playoff team without being a favourite — ${a.net} net rating, ${a.rank}th in the league.`,
      teamVerdictMiddling: (a: { name: string; net: string; rank: number }) =>
        `The ${a.name} are treading water: ${a.net} net rating, ${a.rank}th in the league. That is play-in territory rather than a run.`,
      teamVerdictRebuilding: (a: { name: string; net: string; rank: number }) =>
        `The ${a.name} are a long way off: ${a.net} net rating, ${a.rank}th in the league. This is a roster being built rather than one competing.`,
      teamRatings: (a: { ortg: string; ortgRank: number; drtg: string; drtgRank: number }) =>
        `They score ${a.ortg} per 100 possessions (${a.ortgRank}th) and concede ${a.drtg} (${a.drtgRank}th).`,
      teamSeed: (a: { name: string; wins: number; losses: number; seed: number; east: boolean }) =>
        `The ${a.name} are ${a.wins}-${a.losses}, currently the ${a.seed} seed in the ${a.east ? 'East' : 'West'}.`,
      teamOverview: (a: { name: string; east: boolean; division: string; wins: number; losses: number; seed: number }) =>
        `The ${a.name} play in the ${a.east ? 'East' : 'West'}, ${a.division} division, and are ${a.wins}-${a.losses} — the ${a.seed} seed as it stands.`,
      teamBestPlayer: (a: { scorer: string; pts: string }) =>
        `${a.scorer} leads them at ${a.pts}.`,
      teamRecord: (a: { name: string; wins: number; losses: number; pct: string; scored: string; allowed: string; diff: string }) =>
        `The ${a.name} are ${a.wins}-${a.losses} (${a.pct}%), scoring ${a.scored} and conceding ${a.allowed} a night, for a differential of ${a.diff}.`,
      teamStatusClinched: (a: { name: string; seed: number; east: boolean }) =>
        `That is the ${a.seed} seed in the ${a.east ? 'East' : 'West'} — inside the top six, so straight into the playoffs as things stand.`,
      teamStatusPlayin: (a: { name: string; seed: number; east: boolean }) =>
        `That is the ${a.seed} seed in the ${a.east ? 'East' : 'West'}, which means the play-in rather than a guaranteed berth.`,
      teamStatusOut: (a: { name: string; seed: number; east: boolean }) =>
        `That is the ${a.seed} seed in the ${a.east ? 'East' : 'West'} — outside the play-in as things stand.`,
      teamOffence: (a: { name: string; ortg: string; rank: number; ppg: string; ts: string; threeRate: string }) =>
        `The ${a.name} score ${a.ortg} points per 100 possessions, ${a.rank}th in the league, which comes out as ${a.ppg} a night. They shoot ${a.ts}% true, and ${a.threeRate}% of their shots are threes.`,
      teamOffenceLeader: (a: { scorer: string; pts: string; passer: string; ast: string }) =>
        `${a.scorer} carries the scoring at ${a.pts}, and ${a.passer} the creation at ${a.ast} assists.`,
      teamOffenceLeaderOne: (a: { name: string; pts: string; ast: string }) =>
        `${a.name} carries both ends of it — ${a.pts} points and ${a.ast} assists.`,
      teamDefence: (a: { name: string; drtg: string; rank: number; allowed: string }) =>
        `The ${a.name} concede ${a.drtg} points per 100 possessions, ${a.rank}th in the league — ${a.allowed} a night in raw points.`,
      teamDefenceLeader: (a: { blocker: string; blk: string; stealer: string; stl: string }) =>
        `${a.blocker} protects the rim with ${a.blk} blocks, and ${a.stealer} leads the steals at ${a.stl}.`,
      teamDefenceLeaderOne: (a: { name: string; blk: string; stl: string }) =>
        `${a.name} leads both categories, with ${a.blk} blocks and ${a.stl} steals.`,
      teamPace: (a: { name: string; pace: string; rank: number; threeRate: string }) =>
        `The ${a.name} play at ${a.pace} possessions per 48 minutes, ${a.rank}th in the league, with ${a.threeRate}% of their shots from three. Pace is not quality — it is how many chances both teams get.`,
      teamStrengthOffence: (a: { name: string; rank: number }) =>
        `The clearest strength of the ${a.name} is the offence: ${a.rank}th in the league by rating.`,
      teamStrengthDefence: (a: { name: string; rank: number }) =>
        `The clearest strength of the ${a.name} is the defence: ${a.rank}th in the league by rating.`,
      teamStrengthPace: (a: { name: string; rank: number }) =>
        `What most distinguishes the ${a.name} is the tempo they impose — ${a.rank}th in the league for pace.`,
      teamStrengthShooting: (a: { name: string; rank: number }) =>
        `The clearest strength of the ${a.name} is the shooting, around ${a.rank}th in the league on team true shooting.`,
      teamWeaknessOffence: (a: { name: string; rank: number }) =>
        `The weak point of the ${a.name} is the offence: ${a.rank}th in the league by rating.`,
      teamWeaknessDefence: (a: { name: string; rank: number }) =>
        `The weak point of the ${a.name} is the defence: ${a.rank}th in the league by rating.`,
      teamWeaknessPace: (a: { name: string; rank: number }) =>
        `Where the ${a.name} sit furthest from the pack is tempo — ${a.rank}th in the league for pace, which is a stylistic outlier more than a flaw.`,
      teamWeaknessShooting: (a: { name: string; rank: number }) =>
        `The weak point of the ${a.name} is the shooting, around ${a.rank}th in the league on team true shooting.`,
      teamSoftSpot: (a: { name: string; pos: string; value: string }) =>
        `By position, the softest spot is against ${a.pos}s: ${a.value} points relative to league average. That is a direct input to the player projection model.`,
      teamBest: (a: { name: string; best: string; per: string; pts: string; reb: string; ast: string }) =>
        `By PER, the best player on the ${a.name} is ${a.best} at ${a.per}, producing ${a.pts} points, ${a.reb} rebounds and ${a.ast} assists.`,
      teamLeaders: (a: { scorer: string; pts: string; rebounder: string; reb: string; passer: string; ast: string }) =>
        `Category leaders: ${a.scorer} scores ${a.pts}, ${a.rebounder} takes ${a.reb} rebounds and ${a.passer} gives ${a.ast} assists.`,
      teamLeadersSweep: (a: { name: string; pts: string; reb: string; ast: string }) =>
        `${a.name} leads them in all three: ${a.pts} points, ${a.reb} rebounds and ${a.ast} assists.`,
      teamRoster: (a: { name: string; count: number; age: number | string; payroll: string; names: string }) =>
        `The index carries ${a.count} players for the ${a.name}, at a minutes-weighted age of ${a.age} and ${a.payroll} of payroll. The top of the rotation: ${a.names}.`,
      teamPayrollTax: (a: { name: string; payroll: string; tax: string; over: string }) =>
        `The ${a.name} carry ${a.payroll} in salary, which is ${a.over} over the ${a.tax} luxury tax line.`,
      teamPayrollOverCap: (a: { name: string; payroll: string; cap: string; over: string }) =>
        `The ${a.name} carry ${a.payroll} in salary, ${a.over} above the ${a.cap} cap but under the tax.`,
      teamPayrollUnderCap: (a: { name: string; payroll: string; cap: string; room: string }) =>
        `The ${a.name} carry ${a.payroll} in salary, leaving ${a.room} under the ${a.cap} cap.`,
      teamPayrollNote: (a: { name: string }) =>
        `That counts only the ${a.name} players this dataset carries, so it runs below a full fifteen-man sheet.`,
      teamArena: (a: { name: string; arena: string; city: string; capacity: string; opened: number }) =>
        `The ${a.name} play at ${a.arena} in ${a.city}, a ${a.capacity}-seat building opened in ${a.opened}.`,
      teamArenaShort: (a: { arena: string; opened: number }) =>
        `Home is ${a.arena}, opened in ${a.opened}.`,
      teamGate: (a: { attendance: string; fill: string; rank: number; sellouts: number; games: number }) =>
        `They draw ${a.attendance} a night, ${a.fill}% of capacity and ${a.rank}th in the league, with ${a.sellouts} sellouts in ${a.games} home dates.`,
      teamTickets: (a: { average: string; getIn: string; rank: number }) =>
        `The average resale ticket is ${a.average}, with a get-in price of ${a.getIn} — ${a.rank}th most expensive in the league.`,
      teamGateModelled: (a: { name: string }) =>
        `Attendance and pricing for the ${a.name} are modelled, not scraped: the NBA publishes no free per-game gate feed and resale pricing sits behind paid APIs.`,
      teamHistory: (a: { name: string; titles: number; last: number; founded: number }) =>
        `The ${a.name} have ${a.titles} NBA championship${a.titles === 1 ? '' : 's'}, the most recent in ${a.last}. The franchise dates from ${a.founded}.`,
      teamHistoryNone: (a: { name: string; founded: number }) =>
        `The ${a.name} have not won an NBA championship. The franchise dates from ${a.founded}.`,
      teamVs: (a: { name: string; opp: string; homePts: string; awayPts: string; prob: string }) =>
        `Hosting the ${a.opp}, the model gives the ${a.name} ${a.homePts} to ${a.awayPts} and a ${a.prob}% chance of winning.`,
      teamVsRatings: (a: { name: string; net: string; opp: string; oppNet: string }) =>
        `${a.name} carry a ${a.net} net rating against ${a.opp}'s ${a.oppNet}.`,
    },
  },

  // ------------------------------------------------------------------ misc
  projection: {
    outcomesBetween: (low: string, high: string) =>
      `80% of outcomes between ${low} and ${high}`,
    over: (pct: string) => `OVER ${pct}%`,
    under: (pct: string) => `UNDER ${pct}%`,
    lineLabel: (line: number) => `O/U ${line}`,
    overUnderAria: (over: string, under: string) =>
      `Over ${over} percent, under ${under} percent`,
    lineTitle: (line: number) => `Line ${line}`,
  },
  charts: {
    radarSub: 'Each axis scaled 0-100 against a league reference',
    skillProfile: 'Skill profile',
    axis: 'Axis',
  },
  loading: {
    turnover: 'Turnover',
    renderFailed: 'Something in this view failed to render.',
  },
  notFound: {
    title: 'Shot clock violation',
    sub: 'That page does not exist.',
    cta: 'Back to the lab',
  },
  pickers: {
    searchPlayer: 'Search a player…',
    change: 'change',
    pickTeam: 'Pick a team…',
  },
  source: {
    trained: 'Trained model',
    baseline: 'Baseline model',
    baselineTooltip:
      'No trained artefact loaded: this projection comes from the calibrated baseline model ' +
      '(real form, real opponent ratings, real home/rest effects — no learned weights).',
  },
  percentileBand: {
    elite: 'Elite',
    veryGood: 'Very good',
    aboveAverage: 'Above average',
    average: 'Average',
    belowAverage: 'Below average',
    poor: 'Poor',
  },
  honour: {
    'NBA Champion': 'NBA Champion',
    'Finals MVP': 'Finals MVP',
    'Most Valuable Player': 'Most Valuable Player',
    'Defensive Player of the Year': 'Defensive Player of the Year',
    'Rookie of the Year': 'Rookie of the Year',
    'Most Improved Player': 'Most Improved Player',
    'Sixth Man of the Year': 'Sixth Man of the Year',
    'Clutch Player of the Year': 'Clutch Player of the Year',
    'Scoring champion': 'Scoring champion',
    'All-Star': 'All-Star',
  },
} as const

export type EnglishDict = typeof en
