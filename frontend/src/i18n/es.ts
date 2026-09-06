/**
 * Castellano — traducción completa de `en.ts`.
 *
 * El tipo `DictOf<EnglishDict>` obliga a que estén todas las claves y a que las
 * funciones de interpolación reciban los mismos argumentos: si falta una línea,
 * `tsc` falla. El orden de las piezas dentro de cada frase es libre, que es
 * justo lo que no permite un sistema de `{{placeholders}}`.
 *
 * Criterio de traducción: la jerga NBA que se usa igual en España se deja en
 * inglés (rookie, playoffs, play-in, triple-doble, MVP, box score), y lo que
 * tiene término asentado en castellano se traduce (rebotes, asistencias,
 * pérdidas, tapones, robos, nómina, tope salarial).
 */
import type { DictOf } from './types'
import type { EnglishDict } from './en'

export const es: DictOf<EnglishDict> = {
  // ------------------------------------------------------------------ shell
  nav: {
    home: 'Inicio',
    players: 'Jugadores',
    rookies: 'Rookies',
    teams: 'Equipos',
    season: 'Temporada',
    compare: 'Comparar',
    h2h: 'Duelos',
    projection: 'Proyección',
    forecast: 'Pronóstico',
    gameSim: 'Simular',
    builder: 'Constructor',
    leagueSim: 'Liga',
    menu: 'Menú',
  },
  shell: {
    seasonWord: 'Temporada',
    themeToDark: 'Cambiar a tema oscuro',
    themeToLight: 'Cambiar a tema claro',
    languageLabel: 'Idioma',
    switchToSpanish: 'Cambiar a castellano',
    switchToEnglish: 'Switch to English',
    reigningChampions: 'Campeones vigentes',
    finalsMvpShort: (name: string) => `MVP de las Finales: ${name}`,
    footerTitle: 'NBA Vision',
    footerTagline: '— proyecto de portfolio. Sin vinculación ni respaldo de la NBA.',
    footerBody: (season: string) =>
      `Todas las cifras corresponden a la temporada ${season}. Fuentes: stats.nba.com (vía nba_api), ` +
      'Basketball-Reference, Spotrac, HoopsHype y RealGM. Imágenes © NBA, servidas desde cdn.nba.com. ' +
      'Funcionando sobre la liga de demostración incluida: las métricas avanzadas se reconstruyen a ' +
      'partir de la línea por partido y las proyecciones salen del modelo base calibrado hasta que se ' +
      'cargue uno entrenado.',
    leagueAverage: (ortg: string, pace: string) =>
      `Media de la liga esta temporada: ${ortg} de rating ofensivo · ${pace} de ritmo`,
  },

  // ----------------------------------------------------------------- common
  common: {
    all: 'Todos',
    league: 'Liga',
    east: 'Este',
    west: 'Oeste',
    eastern: 'Este',
    western: 'Oeste',
    conferenceOf: (conf: string) => `Conferencia ${conf}`,
    home: 'Local',
    away: 'Visitante',
    vs: 'vs',
    at: '@',
    swap: 'Intercambiar',
    clear: 'Limpiar',
    seed: 'Semilla',
    playoffs: 'Playoffs',
    regularSeason: 'Temporada regular',
    playoffGame: 'Partido de playoffs',
    tryAgain: 'Reintentar',
    backHome: 'Volver al inicio',
    showMore: (n: number) => `Ver más (quedan ${n})`,
    table: 'Tabla',
    chart: 'Gráfico',
    of: 'de',
    to: 'a',
    rank: (rank: string, total: number) => `${rank} de ${total}`,
    perGame: 'Por partido',
    per100: 'por 100',
    possPer48: 'pos/48',
    loading: 'Cargando',
    noResults: 'Sin resultados',
    modelled: 'Modelado',
    yearsOld: (n: number) => `${n} años`,
    seasons: (n: number) => `${n} temporada${n === 1 ? '' : 's'}`,
    games: (n: number) => `${n} partido${n === 1 ? '' : 's'}`,
    present: 'actualidad',
    none: 'Ninguno',
    rookie: 'Rookie',
    champion: (n: number) => `${n}× campeón`,
    active: 'Disponible',
    out: 'Baja',
    signed: 'Fichado',
    filler: 'relleno',
    sortBy: 'Ordenar por',
    metric: 'Métrica',
    years: (v: string) => `${v} años`,
  },

  // ------------------------------------------------------------------ stats
  stat: {
    pts: 'Puntos',
    reb: 'Rebotes',
    ast: 'Asistencias',
    stl: 'Robos',
    blk: 'Tapones',
    tov: 'Pérdidas',
    fg3m: 'Triples anotados',
    min: 'Minutos',
    ts: 'Tiro real',
    usg: 'Tasa de uso',
    per: 'PER',
    vorp: 'VORP',
    ws: 'Win shares',
    bpm: 'Box plus/minus',
    gameScore: 'Game score',
    fgPct: '% en tiros de campo',
    fg3Pct: '% en triples',
    efgPct: '% efectivo de tiro',
    ftPct: '% en tiros libres',
    offRating: 'Rating ofensivo',
    defRating: 'Rating defensivo',
    netRating: 'Rating neto',
    pace: 'Ritmo',
    winPct: 'Porcentaje de victorias',
    fga: 'Tiros de campo intentados',
    salary: 'Impacto en el tope',
    marketValue: 'Valor de mercado',
    age: 'Edad',
    height: 'Altura',
    weight: 'Peso',
    country: 'País',
    draft: 'Draft',
    undrafted: 'No drafteado',
    experience: 'Experiencia',
    position: 'Posición',
    record: 'Balance',
    payroll: 'Nómina',
    titles: 'Títulos',
  },
  abbr: {
    pts: 'PTS', reb: 'REB', ast: 'AST', stl: 'ROB', blk: 'TAP', tov: 'PER',
    fg3m: 'T3A', fg3a: 'T3I', min: 'MIN', ts: 'TS%', fg: 'TC', fgPct: 'TC%',
    fg3Pct: 'T3%', ft: 'TL', per: 'PER', ws: 'WS', bpm: 'BPM', vorp: 'VORP',
    ppg: 'PPP', rpg: 'RPP', apg: 'APP', spg: 'ROB', bpg: 'TAP', mpg: 'MPP',
    gp: 'PJ', gs: 'PT', w: 'V', l: 'D', pct: '%', gb: 'DV', pf: 'PF',
    pa: 'PC', diff: 'DIF', net: 'NET', off: 'ATA', def: 'DEF', last10: 'U10',
    plusMinus: '+/-', gmsc: 'GmSc', ht: 'Alt', pos: 'Pos', rest: 'Descanso',
    scored: 'ANOTADOS', allowed: 'RECIBIDOS', pace: 'RITMO', space: 'ESPACIO', team: 'Equipo',
    player: 'Jugador', date: 'Fecha', matchup: 'Partido', season: 'Temporada',
    conf: 'Conf', from: 'Desde', pick: 'Elección', stat: 'Estad.', volume: 'Volumen',
    efgPct: 'eFG%', month: 'Mes',
    rank: 'Puesto', score: 'Puntuación', winPct: '%V', salary: 'Salario', tsShort: 'TS',
    game: 'Partido', metric: 'Métrica', homeShort: 'L', awayShort: 'V',
  },

  // ------------------------------------------------------------------- home
  home: {
    eyebrow: 'Análisis · Proyección · Simulación',
    titleTop: 'Todos los números',
    titleBottom: 'antes del salto inicial',
    lede: (season: string) =>
      `Un laboratorio NBA completo para la temporada ${season}: estadísticas oficiales, métricas ` +
      'avanzadas y valores de contrato, historial de duelos y modelos que proyectan a un jugador ' +
      'contra una defensa, pronostican un partido, lo simulan posesión a posesión y enfrentan la ' +
      'plantilla que tú montes contra la liga real.',
    ctaBuild: 'Monta tu equipo',
    ctaProject: 'Proyecta un jugador',
    tileSeason: 'Temporada',
    tilePlayers: 'Jugadores indexados',
    tileBestNet: 'Mejor rating neto',
    tileChampions: 'Campeones vigentes',
    insideTitle: 'Qué hay dentro',
    insideSub: (season: string) =>
      `Once herramientas, una sola capa de datos: todos los números de la web describen la ` +
      `temporada ${season}.`,
    open: 'Abrir →',
    scoringLeaders: 'Máximos anotadores',
    scoringLeadersSub: 'Puntos por partido, temporada actual',
    topMatchup: 'Partido destacado',
    topMatchupSub: 'Salida del modelo, descanso neutro',
    homeWinProbability: 'Probabilidad de victoria local',
    spread: 'Hándicap',
    total: 'Total',
    possessions: 'Posesiones',
    runYourOwn: 'Haz el tuyo',
    features: {
      players: { title: 'Índice de jugadores', copy: 'Medidas, desglose de tiro, métricas avanzadas con percentiles de liga, splits, carrera y títulos.' },
      season: { title: 'Centro de temporada', copy: 'Las dos conferencias, el cuadro del play-in, catorce clasificaciones y cada carrera de premios, puntuada.' },
      rookies: { title: 'Clase de rookies', copy: 'El draft entero, de dónde sale cada elección y una carrera al Rookie del Año puntuada.' },
      compare: { title: 'Comparar jugadores', copy: 'De dos a cuatro en paralelo, puntuados categoría a categoría, con barras de percentil en cada línea.' },
      teams: { title: 'Equipos y tope salarial', copy: 'Ratings y puestos, plantilla, nómina frente al impuesto de lujo, el pabellón y los banderines.' },
      h2h: { title: 'Duelos directos', copy: 'Todos los enfrentamientos con un rival, separando local y visitante, partido a partido.' },
      predictPlayer: { title: 'Proyección de jugador', copy: 'Puntos, rebotes y asistencias contra una defensa concreta, con intervalo y línea over/under.' },
      predictTeam: { title: 'Pronóstico de partido', copy: 'Marcador, hándicap y probabilidad. Los playoffs tienen su propio modelo, no una casilla.' },
      simulate: { title: 'Simular un partido', copy: 'Dos equipos reales, posesión a posesión. Da de baja a quien quieras y mira qué cambia.' },
      builder: { title: 'Construye un equipo', copy: 'Un presupuesto, una liga con precios y tu quinteto contra los de verdad, en directo.' },
      league: { title: 'Simulación de liga', copy: 'Los 1.230 partidos, el cuadro y un campeón, con una franquicia inventada por ti dentro.' },
    },
  },

  // ---------------------------------------------------------------- players
  players: {
    title: 'Índice de jugadores',
    sub: (shown: number, total: number, season: string) =>
      `${shown} de ${total} jugadores · temporada ${season} · pulsa una ficha para ver el perfil completo`,
    subLoading: (season: string) => `Cargando el índice de ${season}…`,
    searchPlaceholder: 'Busca por nombre, código de equipo o posición…',
    emptyTitle: 'Ningún jugador coincide',
    emptyHint: 'Prueba con un apellido, un código de equipo como BOS o una posición como PG.',
    sortValue: 'Valor',
  },

  // ----------------------------------------------------------- player detail
  player: {
    notFound: 'Jugador no encontrado',
    notFoundHint: 'Ese identificador no está en el índice. Vuelve atrás y elige otro.',
    loading: 'Cargando el perfil',
    loadingSub: 'Línea de temporada, splits, carrera y títulos',
    seasonSuffix: 'temporada',
    tabs: {
      overview: 'Resumen',
      scouting: 'Scouting IA',
      shooting: 'Tiro',
      advanced: 'Avanzadas',
      splits: 'Splits',
      gamelog: 'Partidos',
      career: 'Carrera',
      honours: 'Palmarés',
    },
    capHit: (v: string) => `${v} de impacto en el tope`,
    draftLine: (year: number, round: number, pick: number) =>
      `${year} · ronda ${round}, elección ${pick}`,
    surplus: 'Plusvalía',
    overpaid: 'Sobrepagado',
    estimatedMeasurements:
      'Las medidas son estimaciones típicas de la posición: lanza el proceso de ingesta para el dato oficial.',
    ctaProject: 'Proyectar su próximo partido',
    ctaH2H: 'Historial de duelos',
    ctaCompare: 'Comparar',
    percentileSuffix: 'pctil',
    gameLogTitle: (stat: string) => `Partido a partido — ${stat}`,
    gameLogSub: (n: number) => `${n} partidos esta temporada, con la media marcada`,
    seasonAvg: (v: string) => `Media de temporada ${v}`,
    whereHeRanks: 'Dónde se sitúa',
    whereHeRanksSub: (n: number) => `Percentil entre los ${n} jugadores del índice`,
    turnoverNote: 'Las pérdidas van invertidas: un percentil alto significa que cuida el balón.',
    pointsFrom: 'De dónde vienen los puntos',
    pointsFromSub: 'Reconstruido a partir de la línea por partido y el porcentaje de tiro real',
    twoPointers: 'Tiros de dos',
    threePointers: 'Triples',
    freeThrows: 'Tiros libres',
    shootingLine: 'Línea de tiro',
    allShots: 'Todos los tiros',
    shotDiet: 'Dieta de tiro',
    shotDietSub: 'Qué porcentaje de sus intentos es de cada tipo',
    threeRate: 'Tasa de triples (T3I / TCI)',
    ftRate: 'Tasa de tiros libres (TLI / TCI)',
    efgNote:
      'El TC% efectivo cuenta un triple como 1,5 canastas. El TS% va más allá e incluye los tiros ' +
      'libres, y por eso es el número que merece la pena comparar entre posiciones.',
    efficiencyVolume: 'Eficiencia frente a volumen',
    efficiencyVolumeSub:
      'Anotados e intentados en paralelo: un buen porcentaje con dos tiros no es lo mismo',
    made: 'Anotados',
    attempted: 'Intentados',
    advancedTitle: 'Métricas avanzadas',
    advancedSub: 'Un número por pregunta: cómo de bueno, cómo de valioso, cómo de eficiente',
    perHint: '15,0 es la media de la liga',
    bpmHint: 'puntos por 100 frente a un jugador medio',
    vorpHint: 'acumulativo, así que los minutos cuentan',
    wsHint: 'victorias que se le atribuyen',
    gameScoreHint: 'una noche tipo, en escala de puntos',
    usgHint: 'porcentaje de posesiones que termina él',
    twoWay: 'Reparto de las dos caras',
    twoWaySub: 'Ataque y defensa, por separado',
    obpm: 'BPM ofensivo',
    dbpm: 'BPM defensivo',
    ratingsNote: 'Los ratings son puntos por 100 posesiones. La media de la liga esta temporada es 113,5.',
    per36: 'Por 36 minutos',
    per36Sub: 'Ajustado al rol: qué produciría con minutos de titular',
    basis: 'Base',
    perGameWithMin: (min: string) => `Por partido (${min} min)`,
    per36Row: 'Por 36 minutos',
    derivedNote:
      'Estos números avanzados se reconstruyen a partir de la línea por partido y el tiro real, no ' +
      'se miden desde el play-by-play: ordenan bien a los jugadores, pero son estimaciones. Lanzar ' +
      'la ingesta de Basketball-Reference los sustituye por los valores publicados.',
    splitsTitle: 'Splits por situación',
    splitsSub: 'El contexto en el que más se apoya el modelo de proyección',
    split: 'Situación',
    splitHome: 'Local',
    splitAway: 'Visitante',
    splitRested: '2+ días de descanso',
    splitB2B: 'Días consecutivos',
    homeCourtWorth: 'Valor de jugar en casa',
    b2bCost: 'Coste de jugar sin descanso',
    monthly: 'Mes a mes',
    monthlySub: 'Una media de temporada esconde a un jugador que es otro desde enero',
    gameLog: 'Partido a partido',
    gameLogSubList: (n: number) => `${n} partidos · el más reciente primero`,
    seasonHigh: (n: number) => `Máximo de la temporada: ${n} pts`,
    b2bShort: 'B2B',
    careerProgression: 'Progresión de carrera',
    careerProgressionSub: 'Temporada a temporada, siguiendo la curva de envejecimiento habitual',
    seasonBySeason: 'Temporada a temporada',
    seasonBySeasonSub: 'Por partido, con la familia de avanzadas al lado',
    trophyCase: 'Vitrina',
    trophyCaseChampionships: (n: number) => `${n} anillo${n === 1 ? '' : 's'}`,
    individualHonours: 'Premios individuales',
    whereHePlayed: 'Dónde ha jugado',
    careerTimeline: 'Línea temporal',
    stintsNote:
      'Las trayectorias están registradas para los jugadores del conjunto de demostración; la ' +
      'ingesta completa el resto desde el historial de traspasos.',
    noHonours: 'Todavía sin premios individuales de peso.',
    shotType: 'Tipo de tiro',
    perLabel: 'PER — índice de eficiencia del jugador',
    bpmLabel: 'BPM — box plus/minus',
    vorpLabel: 'VORP — valor sobre el reemplazo',
  },

  // --------------------------------------------------------------- scouting
  scouting: {
    modelRead: 'Lectura del modelo',
    underpaid: 'Infrapagado',
    overpaid: 'Sobrepagado',
    percentilePer: (n: number) => `PER en el percentil ${n}`,
    strengths: 'Lo que hace bien',
    strengthsSub: 'Cada línea salta por un umbral de percentil, no por una opinión',
    concerns: 'Dónde están las dudas',
    concernsSub: 'Mismo método, dirección contraria',
    similar: 'Jugadores estadísticamente parecidos',
    similarSub: 'Vecinos más cercanos sobre el perfil de percentiles de doce ejes',
    similarNote:
      'La distancia es euclídea ponderada sobre rangos de percentil: puntos, rebotes, asistencias, ' +
      'robos, tapones, pérdidas, triples, tiro real, uso, minutos, PER y BPM. Los percentiles ya ' +
      'están en una escala común de 0 a 100, que es lo que impide que un eje domine.',
    radarTitle: 'Perfil frente a su comparación más cercana',
    allPercentiles: 'Todos los percentiles medidos',
    allPercentilesSub: 'Dónde se sitúa en la liga en los dieciocho ejes medidos',
    archetypes: {
      primaryEngine: 'Motor principal',
      primaryEngineDetail: 'Carga con el ataque como anotador y como creador',
      leadPlaymaker: 'Base creador',
      leadPlaymakerDetail: 'Uso alto, reparte más de lo que finaliza',
      movementShooter: 'Tirador en movimiento',
      movementShooterDetail: 'Volumen anotador construido sobre la amenaza del triple',
      bucketGetter: 'Anotador puro',
      bucketGetterDetail: 'Volumen anotador de élite, carga creativa moderada',
      rimProtector: 'Protector del aro',
      rimProtectorDetail: 'Ancla la zona en rebote y en tapones',
      floorSpacer: 'Abridor de espacios',
      floorSpacerDetail: 'Uso bajo, mucho volumen y acierto en el triple',
      perimeterStopper: 'Defensor exterior',
      perimeterStopperDetail: 'Genera acciones defensivas muy por encima de su uso',
      connectiveBig: 'Interior conector',
      connectiveBigDetail: 'Bloquea, rebotea y finaliza dentro del ataque',
      roleWing: 'Alero de rol',
      roleWingDetail: 'Anotación complementaria dentro de un papel definido',
    },
    report: {
      scoring: (top: number, ppg: string) =>
        `Volumen anotador en el ${top}% más alto de la liga, con ${ppg} por noche.`,
      efficiency: (ts: string, usg: string) =>
        `Eficiencia de élite: ${ts}% de tiro real con una tasa de uso del ${usg}%.`,
      creation: (pctile: number, ast: string) =>
        `Crea para los demás en el percentil ${pctile} (${ast} asistencias).`,
      rebounding: (reb: string, pctile: number) =>
        `Domina el rebote: ${reb} capturas, percentil ${pctile}.`,
      defence: (stl: string, blk: string) =>
        `Genera acciones defensivas: ${stl} robos y ${blk} tapones.`,
      spacing: (pct: string) => `Abre el campo de verdad, con un ${pct}% en triples.`,
      noStrength: 'Cumple un papel definido sin una fortaleza estadística destacada.',
      lowEfficiency: (ts: string) =>
        `La eficiencia se queda corta, con un ${ts}% de tiro real: tercio bajo de la liga.`,
      turnovers: (tov: string) => `Pierde ${tov} balones por partido para el uso que tiene.`,
      coldShooting: (fg3a: string, pct: string) =>
        `Lanza ${fg3a} triples por partido con solo un ${pct}%.`,
      lowRebounding: 'Rebotea por debajo de lo que suele aportar su posición.',
      age: (age: number) => `${age} años: a partir de aquí la curva de edad juega contra el contrato.`,
      overpaid: (m: number) => `Cobra ${m}M por encima de la valoración del modelo.`,
      noConcerns: 'Sin señales de alarma estadísticas relevantes esta temporada.',
      summary: (a: {
        name: string; archetype: string; detail: string
        pts: string; reb: string; ast: string; min: string; ts: string
        perPct: number; vorpPct: number
      }) =>
        `${a.name} encaja en el perfil de ${a.archetype}: ${a.detail}. Está produciendo ${a.pts} ` +
        `puntos, ${a.reb} rebotes y ${a.ast} asistencias en ${a.min} minutos con un ${a.ts}% de ` +
        `tiro real, lo que lo coloca en el percentil ${a.perPct} en PER y en el ${a.vorpPct} en VORP.`,
      teamContext: (team: string, w: number, l: number, net: string) =>
        ` ${team} llevan ${w}-${l} con un rating neto de ${net}.`,
    },
  },

  // ---------------------------------------------------------------- rookies
  rookies: {
    title: 'Los rookies',
    loadingTitle: 'Clase de rookies',
    loadingSub: 'Cargando el tablero del draft…',
    classBadge: (year: number) => `Clase del draft de ${year}`,
    lede: (season: string) =>
      `Todos los jugadores de primer año del índice, su posición en el draft, de dónde vienen y ` +
      `cómo les está yendo la temporada ${season}. La carrera al Rookie del Año está puntuada abajo.`,
    royFrontRunner: 'Favorito al ROY',
    pickShort: (n: number) => `elección ${n}`,
    tracked: 'Rookies seguidos',
    topScorer: 'Máximo anotador',
    avgMinutes: 'Minutos de media',
    classPayroll: 'Nómina de la clase',
    royRace: 'Carrera al Rookie del Año',
    royRaceSub: 'Una puntuación combinada: producción, eficiencia, rol y éxito del equipo',
    royBreakdown: 'Cómo se descompone la puntuación',
    royBreakdownSub: 'Los cinco primeros, componente a componente',
    draftBoard: 'Tablero del draft',
    draftBoardSub: (year: number) => `Primera ronda de ${year} · pulsa una ficha para el perfil`,
    classTable: 'Tabla de la clase',
    classTableSub: 'Todos los rookies, todas las columnas',
    sortPick: 'Orden del draft',
    sortRoy: 'Carrera ROY',
    roy: 'ROY',
    royScore: 'Puntuación ROY',
  },

  // ------------------------------------------------------------------ teams
  teams: {
    title: 'Equipos',
    sub: (season: string) => `Ratings, ritmo, nómina y banderines · temporada ${season}`,
    championsOf: (year: number) => `CAMPEONES ${year}`,
    leagueTable: 'Tabla de la liga',
    leagueTableSub: 'Todos los equipos, todas las columnas',
    sortNet: 'Neto',
    sortOffence: 'Ataque',
    sortDefence: 'Defensa',
    sortPace: 'Ritmo',
    sortRecord: 'Balance',
  },

  // ------------------------------------------------------------ team detail
  team: {
    notFound: 'Equipo no encontrado',
    loading: 'Cargando el equipo',
    loadingSub: 'Plantilla, ratings, tope salarial y banderines',
    tabs: {
      roster: 'Plantilla',
      stats: 'Estadísticas',
      arena: 'Pabellón y taquilla',
      cap: 'Tope salarial',
      history: 'Historia',
    },
    conferenceDivision: (conf: string, div: string) => `Conferencia ${conf} · División ${div}`,
    championBadge: (n: number) => `${n}× campeón de la NBA`,
    since: (year: number) => `Desde ${year}`,
    seats: (n: string) => `${n} asientos`,
    leaderSuffix: 'líder',
    rosterSub: (n: number, season: string) => `${n} jugadores en el índice · ${season}`,
    rosterTable: 'Tabla de plantilla',
    rosterTableSub: 'Todas las columnas, ordenables con el control de arriba',
    profileTitle: 'Perfil del equipo',
    profileSub: 'El percentil se calcula frente a los otros 29 equipos',
    defenceHint: 'menos es mejor: el percentil ya viene invertido',
    teamTs: 'Tiro real del equipo',
    scoringIdentity: 'Identidad anotadora',
    scoringIdentitySub: 'Rating × ritmo es lo que acaba en el marcador',
    scored: 'Anotados',
    allowed: 'Recibidos',
    differential: 'Diferencia',
    possPer48: 'Posesiones por 48',
    threeShare: 'Porcentaje de tiros desde el triple',
    weightedAge: 'Edad ponderada por minutos',
    payrollOnBooks: 'Nómina comprometida',
    matchupDefence: 'Defensa por posición',
    matchupDefenceSub:
      'Puntos concedidos a cada posición respecto a la media de la liga: en positivo es un punto débil',
    soft: 'blanda',
    tough: 'dura',
    matchupNote:
      'Esta fila entra directamente en el modelo de proyección de jugador: un base que se enfrenta ' +
      'a un equipo que concede a los bases recibe un pronóstico más alto.',
    compareTitle: 'Comparar con otro equipo',
    compareSub: 'Mismos ejes, misma escala',
    headToHeadNumbers: 'Cara a cara en los números',
    lowerDefBetter: 'Un rating defensivo más bajo es mejor',
    sideBySide: 'En paralelo',
    forecastGame: 'Pronosticar el partido',
    simulateWatch: 'Simular y verlo',
    payrollTitle: 'Nómina',
    payrollSub: (season: string) => `Compromisos de ${season} para la plantilla listada`,
    committed: 'Comprometido',
    salaryCap: 'Tope salarial',
    luxuryTax: 'Impuesto de lujo',
    inTaxBy: 'Por encima del impuesto en',
    roomUnderCap: 'Margen bajo el tope',
    modelledValue: 'Valor modelado',
    surplusCol: 'Plusvalía',
    shareOfCap: 'Porcentaje del tope',
    capNote:
      'El valor modelado es lo que el modelo de mercado cree que vale: producción escalada por una ' +
      'curva de edad y por la disponibilidad, tasada contra el tope salarial. La plusvalía es eso ' +
      'menos lo que cobra.',
    contractsTitle: 'Mejores y peores contratos',
    contractsSub: 'Por plusvalía',
    bargains: 'Chollos',
    overpaid: 'Sobrepagados',
    rafters: 'Las alturas del pabellón',
    raftersSub: (n: number, year: number | null) =>
      `${n} anillo${n === 1 ? '' : 's'} de la NBA${year ? `, el último en ${year}` : ''}`,
    noTitle: 'Todavía sin anillo de la NBA',
    raftersEmpty: 'Techo vacío',
    raftersEmptyHint: (year: number | null) =>
      `Todavía sin anillo de la NBA${year ? ` desde ${year}` : ''}.`,
    abaNote: (n: number, years: string) =>
      `Más ${n} título${n === 1 ? '' : 's'} de la ABA (${years}).`,
    bannerNote:
      'Los banderines marcados con una ciudad anterior se ganaron bajo otro nombre: la NBA los ' +
      'cuenta para la franquicia.',
    franchiseFacts: 'Datos de la franquicia',
    founded: 'Fundación',
    homeArena: 'Pabellón',
    conference: 'Conferencia',
    division: 'División',
    championships: 'Anillos de la NBA',
    mostRecentTitle: 'Último título',
    titleDrought: 'Temporadas sin título',
    abaChampionships: 'Títulos de la ABA',
    recentFinals: 'Finales recientes',
    recentFinalsSub: 'Las últimas ocho finales',
    def: 'venció a',
    noFinals: (abbr: string) => `${abbr} no ha llegado a las Finales en este periodo.`,
    champs: 'Campeón',
    championsTitle: (abbr: string) => `Campeones ${abbr}`,
  },

  // ------------------------------------------------------------------ arena
  arena: {
    homeFloor: (city: string, region: string) => `Pista local · ${city}, ${region}`,
    opened: (year: number) => `Inaugurado en ${year}`,
    capacity: (n: string) => `Aforo de ${n}`,
    full: (pct: string) => `${pct}% de ocupación`,
    averageCrowd: 'Público medio',
    vsLeague: (v: string) => `${v} frente a la liga`,
    seasonTotal: 'Total de la temporada',
    homeGames: (n: number) => `${n} partidos en casa`,
    sellouts: 'Llenos',
    ofHomeDates: (n: number) => `de ${n} partidos en casa`,
    averageTicket: 'Entrada media',
    getInFrom: (v: string) => `entrada desde ${v}`,
    recentDates: 'Últimos partidos en casa',
    recentDatesSub:
      'Público y precio medio de reventa, partido a partido: el visitante es la mayor palanca en ambos',
    attendance: 'Asistencia',
    averagePrice: 'Precio medio',
    fill: 'Ocupación',
    getIn: 'Entrada',
    average: 'Media',
    premium: 'Premium',
    ticketMarket: 'Mercado de entradas',
    ticketMarketSub: 'Precios de reventa modelados',
    cheapestSeat: 'asiento más barato del pabellón',
    allListings: 'todas las localidades',
    lowerBowl: 'anillo inferior, visitante de campanillas',
    leagueAvgTicket: 'Entrada media de la liga',
    vsLeagueRow: 'Este equipo frente a la liga',
    priceRank: 'Puesto por precio',
    marketSizeRank: 'Puesto por tamaño de mercado',
    demandIndex: 'Índice de demanda',
    howFull: 'Cómo se llena',
    howFullSub: 'Frente al aforo y frente a la liga',
    ofCapacity: 'del aforo declarado',
    listedCapacity: 'Aforo declarado',
    emptySeats: 'Asientos vacíos por noche',
    leagueAverage: 'Media de la liga',
    attendanceRank: 'Puesto por asistencia',
    acrossLeague: 'Asistencia en toda la liga',
    acrossLeagueSub: 'Público medio por partido en casa, con este equipo destacado',
    arenaCol: 'Pabellón',
    capacityCol: 'Aforo',
    averageCol: 'Media',
    disclaimer:
      'El nombre del pabellón, el aforo, el año de inauguración y la ubicación son datos reales. La ' +
      'asistencia y los precios de entrada están modelados —a partir del aforo, el porcentaje de ' +
      'victorias, el tamaño de mercado, la antigüedad del pabellón y el tirón del rival— y anclados ' +
      'a las medias públicas de la liga (unos 18.300 espectadores por noche, alrededor del 95% del ' +
      'aforo). La NBA no publica un feed gratuito de taquilla por partido y los precios de reventa ' +
      'están tras APIs de pago: conecta una en el proceso de ingesta y estos paneles se llenarán ' +
      'desde la fuente.',
  },

  // ---------------------------------------------------------------- compare
  compare: {
    title: 'Comparar jugadores',
    sub: (season: string) =>
      `Hasta cuatro a la vez, con números de ${season}. Todos los ejes usan la misma escala, así ` +
      'que las formas son comparables.',
    pickPlayer: 'Elige un jugador…',
    addAnother: 'Añadir otro (opcional)…',
    emptyTitle: 'Elige al menos dos jugadores',
    emptyHint: 'Usa las cajas de arriba: escribe un apellido y pulsa Enter.',
    categoriesWon: 'categorías ganadas',
    championBadge: (n: number) => `${n}× campeón`,
    radarTitle: 'Perfiles de habilidades superpuestos',
    barsTitle: 'Producción por partido',
    barsSub: 'El mismo eje para todos: sin trucos de reescalado',
    lineByLine: 'Línea a línea',
    lineByLineSub:
      'La barra muestra el percentil de liga de cada jugador, para que ningún número aparezca sin referencia',
    groups: {
      box: 'Estadística básica',
      shooting: 'Tiro',
      advanced: 'Avanzadas',
      value: 'Contrato',
    },
    invertedNote:
      'Las pérdidas, el rating defensivo y la edad se puntúan al revés: gana la categoría el más ' +
      'bajo. Las métricas avanzadas se reconstruyen a partir de la línea por partido en modo demo.',
    honoursTitle: (lastName: string) => `${lastName} — palmarés`,
    honoursCount: (n: number) => `${n} categorías`,
    honoursNone: 'Todavía ninguno',
  },

  // -------------------------------------------------------------------- h2h
  h2h: {
    title: 'Duelos directos',
    sub: 'Todos los enfrentamientos con un rival, separados por pista: el split en el que más se apoya el modelo',
    opponent: 'Rival',
    emptyTitle: 'Elige un jugador y un rival',
    samePlaysFor: (name: string, abbr: string) => `${name} juega en ${abbr}`,
    sameHint:
      'Elige otro rival: un jugador no tiene historial de duelos contra su propio equipo.',
    careerMeetings: (n: number, team: string) => `${n} enfrentamientos con ${team} en su carrera`,
    careerVs: 'Carrera vs',
    atHome: 'En casa',
    onRoad: 'Fuera',
    homeEdge: 'Ventaja de local',
    chartTitle: (stat: string, abbr: string) => `${stat} contra ${abbr}, partido a partido`,
    chartSub: 'Los partidos en casa y fuera van como series separadas',
    homeSeries: (n: number) => `Local (${n} partidos)`,
    awaySeries: (n: number) => `Visitante (${n} partidos)`,
    splitTitle: 'Local frente a visitante',
    splitSub: 'Medias solo en este emparejamiento',
    everyMeeting: 'Todos los enfrentamientos',
    everyMeetingSub: 'El más reciente primero',
    venue: 'Pista',
    delta: 'Diferencia',
  },

  // -------------------------------------------------------- player forecast
  predictPlayer: {
    title: 'Proyección de jugador',
    sub: 'Elige un jugador y un rival. Cada control de abajo mueve el pronóstico.',
    restDays: 'Días de descanso',
    backToBack: 'Días consecutivos',
    oneDay: '1 día',
    nDays: (n: number) => `${n} días`,
    samePlaysFor: (name: string, abbr: string) => `${name} juega en ${abbr}`,
    sameHint: 'Elige un equipo rival para proyectar el enfrentamiento.',
    emptyTitle: 'Elige un jugador y un rival',
    atHome: 'en casa',
    onRoad: 'fuera',
    contextLine: (venue: string, opponent: string, rest: string, playoffs: boolean) =>
      `${venue} contra ${opponent} · ${rest}${playoffs ? ' · playoffs' : ''}`,
    restLabel: (n: number) => (n === 0 ? 'sin descanso' : `${n} días de descanso`),
    oppDrtg: 'DRtg rival',
    oppPace: 'Ritmo rival',
    formIndex: 'Índice de forma',
    points: 'Puntos',
    rebounds: 'Rebotes',
    assists: 'Asistencias',
    threes: 'Triples anotados',
    minutes: 'Minutos',
    steals: 'Robos',
    blocks: 'Tapones',
    turnovers: 'Pérdidas',
    whatMovedIt: 'Qué lo ha movido',
    whatMovedItSub: 'Efecto sobre la proyección de puntos',
    driversNote:
      'Cada barra es la aportación aislada de un factor. En el modelo se combinan de forma ' +
      'multiplicativa, así que las barras no suman exactamente la diferencia con su media de temporada.',
    historyTitle: (abbr: string) => `Historial reciente contra ${abbr}`,
    historySub: 'Lo que ha hecho de verdad en este emparejamiento',
    projected: (v: string) => `Proyección ${v}`,
    drivers: {
      venue: 'Pista',
      homeCourt: 'Jugar en casa',
      onTheRoad: 'Jugar fuera',
      oppDefence: 'Defensa rival',
      oppDefenceDetail: (abbr: string, drtg: string) => `DRtg de ${abbr}: ${drtg}`,
      pace: 'Ritmo',
      paceDetail: (abbr: string, pace: string) => `${abbr} juega a ${pace}`,
      rest: 'Descanso',
      restB2B: 'Días consecutivos',
      restDays: (n: number) => `${n} días libres`,
      matchup: 'Emparejamiento',
      matchupDetail: (pos: string) => `Defensa a ${pos} frente a la media de la liga`,
      form: 'Forma reciente',
      formDetail: 'Últimos 5 partidos frente a la media de temporada',
      playoffs: 'Intensidad de playoffs',
      playoffsDetail: 'Defensa más cerrada, rotaciones más cortas',
    },
  },

  // ---------------------------------------------------------- team forecast
  predictTeam: {
    title: 'Pronóstico de partido',
    sub: 'Marcador, hándicap y probabilidad de victoria. Los playoffs corren sobre su propio modelo, no sobre una casilla del de temporada regular.',
    homeTeam: 'Equipo local',
    awayTeam: 'Equipo visitante',
    homeRest: 'Descanso local',
    awayRest: 'Descanso visitante',
    swap: 'Intercambiar',
    emptyTitle: 'Elige dos equipos distintos',
    projected: 'Proyectado',
    final: 'Final',
    totalShort: (v: string) => `Total ${v}`,
    spread: 'Hándicap',
    spreadHint: (abbr: string) => `Línea de ${abbr}`,
    total: 'Total',
    possessions: 'Posesiones',
    possessionsHintPlayoffs: 'ritmo de playoffs aplicado',
    possessionsHint: 'ritmo de los dos equipos',
    margin80: 'Margen (80%)',
    bestOfSeven: (format: string) => `Al mejor de siete · ${format}`,
    winSeries: (abbr: string) => `${abbr} gana la serie`,
    perGame: (home: string, away: string) =>
      `Por partido: ${home} en casa, ${away} fuera. Enumerado de forma exacta sobre los 2⁷ ` +
      'caminos posibles, no simulado.',
    playoffModel: 'Modelo de playoffs',
    homePoints: (abbr: string) => `Puntos de ${abbr}`,
    marginLabel: 'Margen (local menos visitante)',
    teamProfile: 'Perfil de equipo',
    lowerDefBetter: 'Un rating defensivo más bajo es mejor',
    offence: 'Ataque',
    defence: 'Defensa',
    pace: 'Ritmo',
    weightedByPlayer: 'Repartido por jugador',
    weightedByPlayerSub:
      'El número del equipo descompuesto: cada minuto proyectado es de alguien',
  },

  // --------------------------------------------------------------- simulate
  simulate: {
    title: 'Simular un partido',
    sub: 'Dos equipos reales, un motor a nivel de posesión y una repetición que puedes ver. Da de baja a quien quieras, cambia a reglas de playoffs, invierte la pista: todo mueve el resultado.',
    changeSetup: 'Cambiar la configuración',
    swapHomeCourt: 'Invertir la pista',
    pickDifferent: 'Elige dos equipos distintos.',
    analyticalForecast: 'Pronóstico analítico, antes de simular',
    projectedScore: 'Marcador proyectado',
    forecastNote:
      'Esto es el modelo de ratings. La simulación de abajo juega el partido posesión a posesión y ' +
      'no siempre coincidirá: esa diferencia es justo lo interesante.',
    availability: (abbr: string) => `Disponibilidad de ${abbr}`,
    availabilitySub: 'Pulsa un jugador para darlo de baja',
    fullStrength:
      'Plantilla al completo. Si desactivas a alguien, sus minutos se reparten y los ratings del equipo se mueven.',
    effectOn: (abbr: string) => `Efecto en ${abbr}`,
    outCount: 'Bajas',
    ruledOut: 'Descartados para este partido',
    confidenceSweep: 'Barrido de confianza',
    off: 'Apagado',
    runs: (n: number) => `${n} repeticiones`,
    playGame: 'Jugar el partido',
    playPlayoffGame: 'Jugar el partido de playoffs',
    seedNote: (runs: number) =>
      'La misma semilla repite siempre el mismo partido, así que un resultado se puede compartir. ' +
      `El barrido de confianza vuelve a correr el mismo motor ${runs} veces más para producir la ` +
      'probabilidad de victoria que aparece tras la bocina final; corre en un hilo aparte, así que ' +
      'la página sigue respondiendo.',
  },

  // ---------------------------------------------------------------- builder
  builder: {
    title: 'Monta tu equipo',
    sub: 'Elige un presupuesto, ficha una plantilla y juega contra un equipo NBA real. Todo el que fiches abandona su equipo real mientras dure el partido.',
    backToRoster: 'Volver a la plantilla',
    budget: 'Presupuesto',
    custom: 'Personalizado',
    signedCount: (n: number, max: number) => `${n}/${max} fichados`,
    left: (v: string) => `quedan ${v}`,
    priceNote: (cap: string) =>
      'Cada jugador cuesta su propio valor de mercado: producción tasada contra el tope salarial y ' +
      'ajustada por edad y disponibilidad. Esos precios no se mueven nunca, así que el presupuesto ' +
      'es lo único que controlas: si lo subes, conservas la plantilla que ya hayas fichado. Como ' +
      `referencia, el tope salarial es de ${cap}.`,
    filterPlaceholder: 'Filtrar por nombre, equipo o posición…',
    sortPriciest: 'Más caros',
    sortBestValue: 'Mejor relación',
    ofBudget: (pct: string) => `${pct}% del presupuesto`,
    yourLineup: 'Tu plantilla',
    rosterRange: (min: number, max: number) => `${min}-${max} jugadores`,
    clickToSign: 'Pulsa los jugadores de la izquierda para ficharlos.',
    release: (name: string) => `Cortar a ${name}`,
    opponent: 'Rival',
    youHost: 'Juegas en casa',
    signedAwayFrom: (abbr: string) => `Fichados a ${abbr}`,
    signedAwayNote: (names: string, abbr: string) =>
      `${names} no jugarán para ${abbr}. Sus ratings bajan en consecuencia.`,
    signMore: (n: number) => `Ficha ${n} más`,
    overBudget: 'Fuera de presupuesto',
    play: (abbr: string) => `Jugar contra ${abbr}`,
    facingTitle: 'A quién te enfrentas',
    fillerNote:
      'El resto de su rotación se rellena con jugadores de nivel de reemplazo: el conjunto de ' +
      'demostración incluye la parte alta de cada plantilla, no los 15 contratos.',
    loadingPool: 'Cargando el mercado de jugadores…',
    simFailed: 'La simulación ha fallado',
  },

  // ----------------------------------------------------------------- league
  league: {
    title: 'Simula una temporada entera',
    sub: (season: string) =>
      `Los 82 partidos de cada equipo, y después el play-in, el cuadro y las Finales. Mete tu ` +
      `propio equipo en la liga ${season} y mira dónde acaba.`,
    runAgain: 'Volver a correrla',
    changeSetup: 'Cambiar la configuración',
    playingSeason: 'Jugando la temporada',
    whoIsIn: 'Quién está en la liga',
    real30: 'Los 30 reales',
    addMyTeam: 'Añadir mi equipo',
    yourFranchise: 'Tu franquicia',
    yourFranchiseSub: 'Ocupa el sitio de un equipo real, así que la liga se queda en 30',
    teamName: 'Nombre del equipo',
    threeLetterCode: 'Código de tres letras',
    conference: 'Conferencia',
    replaces: 'Sustituye a',
    rosterLabel: 'Plantilla — de cinco a ocho jugadores',
    signPlayer: 'Fichar un jugador…',
    optional: 'Opcional…',
    loadBuilderRoster: (n: number) => `Cargar mi plantilla del constructor (${n})`,
    needFive: 'Ficha al menos cinco jugadores para poder salir a jugar.',
    playSeason: 'Jugar la temporada',
    stageSchedule: 'Construyendo el calendario',
    stageRegular: 'Jugando la temporada regular',
    stagePlayoffs: 'Disputando los playoffs',
    simulatedChampions: (season: string) => `Campeones simulados de ${season}`,
    finalsMvp: 'MVP de las Finales',
    gamesPlayed: 'Partidos jugados',
    averageTotal: 'Total medio',
    averageMargin: 'Margen medio',
    finalTable: 'Clasificación final simulada',
    bracket: 'Cuadro de playoffs',
    bracketSub: 'Al mejor de siete en todas las rondas, con factor pista 2-2-1-1-1 para el mejor clasificado',
    firstRounds: 'Primeras rondas de conferencia',
    semiFinals: 'Semifinales de conferencia',
    finalsGroup: 'Finales de conferencia y Finales',
    howYourTeamDid: 'Cómo le fue a tu equipo',
    yourTeamSub: (name: string, n: number) => `${name} · ${n} jugadores`,
    seedLabel: 'Puesto',
    pointDiff: 'Diferencia de puntos',
    seriesPlayed: 'Series jugadas',
    rounds: {
      firstRound: (conf: string) => `Primera ronda ${conf}`,
      semiFinal: (conf: string) => `Semifinal ${conf}`,
      conferenceFinals: (conf: string) => `Final ${conf}`,
      nbaFinals: 'Finales de la NBA',
    },
  },

  // ----------------------------------------------------------------- season
  season: {
    title: 'La temporada hasta ahora',
    badge: (season: string) => `Temporada regular ${season}`,
    lede: (season: string) =>
      `Las dos conferencias, el cuadro del play-in, todas las clasificaciones estadísticas y un ` +
      `modelo puntuado de cada carrera de premios, todo desde el mismo conjunto de datos de ` +
      `${season} con el que funciona el resto de la web.`,
    leaguePpg: 'PPP de la liga',
    offRating: 'Rating ofensivo',
    threeShare: 'Tiros desde el triple',
    avgAttendance: 'Asistencia media',
    avgTicket: 'Entrada media',
    tabs: {
      standings: 'Clasificación',
      leaders: 'Líderes',
      awards: 'Premios',
      trends: 'Tendencias',
    },
    conferenceTitle: (conf: string) => `Conferencia ${conf}`,
    standingsSub: 'Del 1 al 6 están dentro · del 7 al 10 juegan el play-in',
    playoffBerth: 'Plaza de playoffs',
    playIn: 'Play-in',
    leadersTitle: (cat: string) => `Líderes en ${cat}`,
    leadersSub: (unit: string) => `Top 10 · ${unit}`,
    leadersChart: (cat: string) => `${cat} — top 10`,
    leadersChartSub: 'Las barras llevan el color del equipo; el nombre de al lado comparte identidad',
    everyCategory: 'Todas las categorías de un vistazo',
    everyCategorySub: 'El líder en cada una de las catorce estadísticas seguidas',
    frontRunner: (award: string) => `${award} · favorito`,
    voteShare: 'Porcentaje de voto modelado',
    ballot: 'La papeleta',
    ballotSub: 'Porcentaje de voto modelado, los seis primeros',
    scoreBuilt: 'Cómo se construye la puntuación',
    scoreBuiltSub: 'Se muestran todos los componentes, para que el orden sea discutible y no magia',
    awardsNote:
      'Esto son modelos, no votaciones. El porcentaje de voto es un softmax sobre la puntuación ' +
      'total, y por eso una temporada dominante aparece como una goleada y no como una ventaja mínima.',
    offVsDef: 'Ataque frente a defensa',
    offVsDefSub:
      'Arriba a la derecha hay buen ataque; abajo, buena defensa, así que los candidatos al título ' +
      'quedan abajo a la derecha',
    teamsCount: (n: number) => `${n} equipos`,
    bestTeam: 'Mejor equipo de la liga',
    attendanceLeaders: 'Líderes de asistencia',
    attendanceLeadersSub: 'Público medio por partido en casa',
    priciestTickets: 'Entradas más caras',
    priciestTicketsSub: 'Precio medio modelado en el mercado secundario',
    payrollVsWins: 'Nómina frente a victorias',
    payrollVsWinsSub:
      'El dinero no compra victorias en línea recta: lo interesante son los casos que se salen',
    costPerWin: 'Coste por victoria',
    avgAge: 'Edad media',
    threePaShare: '% de T3I',
    payrollNote:
      'La nómina cuenta solo a los jugadores incluidos en este conjunto de datos, así que queda por ' +
      'debajo de una plantilla completa de 15. La asistencia y los precios están modelados: mira la ' +
      'pestaña de pabellón en cualquier equipo.',
    awards: {
      mvp: 'MVP', mvpFull: 'Jugador Más Valioso',
      dpoy: 'DPOY', dpoyFull: 'Mejor Defensor del Año',
      roy: 'ROY', royFull: 'Rookie del Año',
      mip: 'MIP', mipFull: 'Jugador Más Mejorado',
      sixth: '6MOY', sixthFull: 'Mejor Sexto Hombre',
    },
    parts: {
      production: 'Producción',
      efficiency: 'Eficiencia',
      role: 'Rol',
      teamSuccess: 'Éxito del equipo',
      impact: 'Impacto',
      stocks: 'Robos + tapones',
      defensiveRebounding: 'Rebote defensivo',
      teamDefence: 'Defensa del equipo',
      minutes: 'Minutos',
      aboveExpectation: 'Por encima de lo esperado',
      roleGrowth: 'Crecimiento del rol',
      benchScoring: 'Anotación desde el banquillo',
      playmaking: 'Creación de juego',
    },
  },

  // ------------------------------------------------------------- simulation
  sim: {
    tipOff: 'Salto inicial',
    gameClock: 'Reloj de partido',
    stageRosters: 'Cerrando plantillas',
    stageInjury: 'Revisando el parte de lesionados',
    stageMinutes: 'Repartiendo minutos según el uso',
    stagePossession: 'Ejecutando el modelo de posesiones',
    stageReplay: (n: number) => `Repitiendo el partido ${n} veces`,
    stageWarmUp: 'Calentando',
    stageStarting: 'Empezando',
    yourLineup: 'Tu quinteto',
    yourTeam: 'Tu equipo',
    playByPlay: 'Jugada a jugada',
    plays: (n: number) => `${n} jugadas`,
    boxScore: 'Estadísticas',
    updatingLive: 'Actualizando en directo',
    pause: 'Pausar',
    play: 'Reanudar',
    runItAgain: 'Repetir',
    skip: 'Saltar',
    tempoNote: (seed: number) => `1 segundo real = 1 minuto de partido · semilla ${seed}`,
    final: 'FINAL',
    distributionTitle: (n: number) => `Si lo jugaran ${n} veces más`,
    distributionSub: 'El mismo motor, repetido: por eso las probabilidades y el partido que acabas de ver concuerdan',
    homeWinRate: 'Victorias del local',
    averageMargin: 'Margen medio',
    margin1090: 'Margen 10–90%',
    averageTotal: 'Total medio',
    rosterFromIndex: 'Plantilla desde el índice en vivo',
    yourAssembledLineup: 'La plantilla que has montado',
    fillerTooltip:
      'Relleno de nivel de reemplazo: el conjunto de demostración solo incluye la parte alta de cada plantilla.',
    events: {
      turnover: (actor: string, stealer: string) => `Pérdida de ${actor}, robo de ${stealer}`,
      blocked: (actor: string, kind: string, blocker: string) =>
        `${kind} de ${actor} TAPONADO por ${blocker}`,
      three: 'clava un triple',
      rim: 'machaca el aro',
      mid: 'anota de media distancia',
      andOne: ' — ¡Y ADICIONAL!',
      freeThrows: (actor: string, made: number, shots: number) =>
        `${actor} anota ${made}/${shots} desde la línea`,
      miss: (actor: string, kind: string) => `${actor} falla el tiro de ${kind}`,
      rebound: (name: string, offensive: boolean) =>
        `Rebote ${offensive ? 'ofensivo' : 'defensivo'} de ${name}`,
      secondChance: (actor: string) => `Canasta de segunda oportunidad de ${actor}`,
      putbackMiss: (actor: string) => `${actor} falla el palmeo`,
      endOf: (period: string) => `Final del ${period}`,
      shotKind: { three: 'tres', rim: 'aro', mid: 'media distancia' },
    },
  },

  // -------------------------------------------------------------- assistant
  assistant: {
    open: 'Pregunta sobre esta página',
    titlePlayer: (name: string) => `Pregunta sobre ${name}`,
    titleTeam: (name: string) => `Pregunta sobre los ${name}`,
    scopePlayer: (name: string) => `Solo respondo sobre ${name}`,
    scopeTeam: (name: string) => `Solo respondo sobre los ${name}`,
    placeholder: 'Escribe tu pregunta…',
    send: 'Enviar',
    close: 'Cerrar',
    clear: 'Vaciar la conversación',
    thinking: 'Mirando los números…',
    suggestionsTitle: 'Prueba con una de estas',
    localBadge: 'Funciona en tu equipo',
    localNote:
      'Sin modelo y sin red: las respuestas las construyen reglas a partir de los ' +
      'mismos datos de temporada que dibuja esta página, así que nunca pueden ' +
      'contradecir a los gráficos.',
    goToPage: (name: string) => `Abrir ${name} →`,
    you: 'Tú',
    assistantName: 'Analista de pista',
    suggest: {
      howGood: '¿Es bueno?',
      scoring: '¿Cómo anota?',
      defence: '¿Cómo defiende?',
      shooting: 'Números de tiro',
      strength: '¿Qué hace bien?',
      weakness: '¿Dónde está su punto débil?',
      contract: '¿Vale lo que cobra?',
      form: 'Forma reciente',
      comparison: '¿A quién se parece?',
      honours: '¿Qué ha ganado?',
      homeAway: 'En casa y fuera',
      advanced: 'Métricas avanzadas',
      rank: '¿Dónde se sitúa?',
      career: '¿Dónde ha jugado?',
      teamHowGood: '¿Son buenos?',
      teamOffence: '¿Cómo va el ataque?',
      teamDefence: '¿Cómo va la defensa?',
      teamBest: '¿Quién es su mejor jugador?',
      teamStrength: '¿Qué hacen bien?',
      teamWeakness: '¿Dónde está su punto débil?',
      teamRecord: '¿Cómo va la temporada?',
      teamRoster: 'Háblame de la plantilla',
      teamPayroll: '¿Cuánto pagan?',
      teamArena: 'El pabellón y el público',
      teamHistory: '¿Qué han ganado?',
      teamPace: '¿A qué ritmo juegan?',
    },
    say: {
      // ------------------------------------------------------------ chrome
      greetingPlayer: (a: { name: string }) =>
        `Pregúntame lo que quieras sobre ${a.name}: sus números, qué significan y qué me parecen. En esta página solo hablo de él.`,
      greetingTeam: (a: { name: string }) =>
        `Pregúntame lo que quieras sobre los ${a.name}: ratings, plantilla, dinero, el pabellón. En esta página solo hablo de ellos.`,
      thanks: (a: { name: string }) => `A mandar. Cuando quieras seguimos con ${a.name}.`,
      helpPlayer: (a: { name: string }) =>
        `Respondo preguntas sobre ${a.name} con los números de esta temporada: producción, eficiencia, rol, valor y qué creo que sale de todo eso. Si preguntas por otro, te mando a su página.`,
      helpTeam: (a: { name: string }) =>
        `Respondo preguntas sobre los ${a.name} con los números de esta temporada: ratings, balance, plantilla, nómina, el pabellón y qué creo que sale de todo eso. Si preguntas por otro, te mando a su página.`,
      notUnderstoodPlayer: (a: { name: string }) =>
        `Esa no la he pillado. Puedo hablarte de la producción de ${a.name}, de su tiro, su defensa, su rol, su contrato, su forma y su palmarés: prueba con una de estas.`,
      notUnderstoodTeam: (a: { name: string }) =>
        `Esa no la he pillado. Puedo hablarte de los ratings de los ${a.name}, de su balance, su ataque, su defensa, su ritmo, su plantilla, su nómina, su pabellón y su historia: prueba con una de estas.`,
      refusePlayerFromPlayer: (a: { subject: string; other: string }) =>
        `En esta página solo respondo sobre ${a.subject}. Para ${a.other}, abre su ficha y pregúntamelo allí.`,
      refuseTeamFromPlayer: (a: { subject: string; other: string }) =>
        `En esta página solo respondo sobre ${a.subject}. Para los ${a.other}, abre su página de equipo y pregúntamelo allí.`,
      refusePlayerFromTeam: (a: { subject: string; other: string }) =>
        `En esta página solo respondo sobre los ${a.subject}. Para ${a.other}, abre su ficha y pregúntamelo allí.`,
      refuseTeamFromTeam: (a: { subject: string; other: string }) =>
        `En esta página solo respondo sobre los ${a.subject}. Para los ${a.other}, abre su página de equipo y pregúntamelo allí.`,

      // ------------------------------------------------------------ player
      verdictElite: (a: { name: string; perPct: number; vorpPct: number }) =>
        `${a.name} es de los jugadores realmente de élite del índice: percentil ${a.perPct} en PER y ${a.vorpPct} en VORP. Esos dos números juntos no admiten lectura suave.`,
      verdictStrong: (a: { name: string; perPct: number; vorpPct: number }) =>
        `${a.name} está claramente por encima de la línea: percentil ${a.perPct} en PER y ${a.vorpPct} en VORP. Titular de nivel, no un pasajero.`,
      verdictSolid: (a: { name: string; perPct: number; vorpPct: number }) =>
        `${a.name} anda por la media de la liga: percentil ${a.perPct} en PER y ${a.vorpPct} en VORP. Útil dentro de un papel definido.`,
      verdictRole: (a: { name: string; perPct: number; vorpPct: number }) =>
        `${a.name} es pieza de rotación con estos números: percentil ${a.perPct} en PER y ${a.vorpPct} en VORP. Su valor está en lo que hace en concreto, no en los totales.`,
      statLine: (a: { pts: string; reb: string; ast: string; min: string; ts: string }) =>
        `La línea: ${a.pts} puntos, ${a.reb} rebotes y ${a.ast} asistencias en ${a.min} minutos, con un ${a.ts}% de tiro real.`,
      overviewContext: (a: { pos: string; team: string; age: number; wins: number; losses: number }) =>
        `Juega de ${a.pos} en ${a.team}, que llevan ${a.wins}-${a.losses}, y tiene ${a.age} años.`,
      scoring: (a: { name: string; pts: string; pctile: number; ts: string; tsPct: number }) =>
        `${a.name} anota ${a.pts} por noche —percentil ${a.pctile}— con un ${a.ts}% de tiro real, que es percentil ${a.tsPct} en eficiencia. Volumen y eficiencia son dos preguntas distintas y ahí tienes las dos respuestas.`,
      scoringMix: (a: { fg3m: string; fg3Pct: string; ftm: string; fga: string }) =>
        `El reparto: ${a.fga} tiros por partido, ${a.fg3m} triples con un ${a.fg3Pct}% y ${a.ftm} tiros libres anotados.`,
      rebounding: (a: { name: string; reb: string; pctile: number; oreb: string; dreb: string; pos: string }) =>
        `${a.name} coge ${a.reb} rebotes por partido —${a.oreb} en ataque y ${a.dreb} en defensa—, que es percentil ${a.pctile} del índice. Léelo con la posición delante: es ${a.pos}.`,
      playmaking: (a: { name: string; ast: string; pctile: number; tov: string; ratio: string }) =>
        `${a.name} reparte ${a.ast} asistencias, percentil ${a.pctile}, por ${a.tov} pérdidas: una relación de ${a.ratio} asistencias por balón perdido.`,
      defence: (a: { name: string; stl: string; blk: string; stlPct: number; blkPct: number }) =>
        `${a.name} genera ${a.stl} robos (percentil ${a.stlPct}) y ${a.blk} tapones (percentil ${a.blkPct}). Son las acciones que ve una estadística; no son toda la defensa.`,
      defenceContext: (a: { dbpm: string; drtg: string }) =>
        `Su box plus/minus defensivo es ${a.dbpm} y su rating defensivo, ${a.drtg} puntos por 100 posesiones.`,
      shooting: (a: { name: string; fgPct: string; fg3Pct: string; fg3a: string; ts: string; efg: string }) =>
        `${a.name} tira un ${a.fgPct}% de campo y un ${a.fg3Pct}% en triples con ${a.fg3a} intentos, para un ${a.efg}% efectivo y un ${a.ts}% de tiro real.`,
      shootingVerdict: (a: { name: string; tsPct: number; threePct: number }) =>
        `Eso lo deja en el percentil ${a.tsPct} de eficiencia global y en el ${a.threePct} desde el triple. El tiro real es el número que merece la pena comparar entre posiciones, porque también cuenta los libres.`,
      turnovers: (a: { name: string; tov: string; pctile: number; usg: string }) =>
        `${a.name} pierde ${a.tov} balones por partido con una tasa de uso del ${a.usg}%. En el percentil invertido —donde alto significa que cuida el balón— es ${a.pctile}.`,
      role: (a: { name: string; min: string; minPct: number; usg: string; usgPct: number }) =>
        `${a.name} juega ${a.min} minutos (percentil ${a.minPct}) y termina el ${a.usg}% de las posesiones de su equipo (percentil ${a.usgPct}). Los minutos dicen cuánto confían en él; el uso, qué le piden hacer con ese tiempo.`,
      advanced: (a: { name: string; per: string; bpm: string; vorp: string; ws: string }) =>
        `${a.name}: ${a.per} de PER, ${a.bpm} de box plus/minus, ${a.vorp} de VORP y ${a.ws} win shares.`,
      advancedContext: (a: { perPct: number; vorpPct: number; bpmPct: number }) =>
        `En percentiles: ${a.perPct} en PER, ${a.bpmPct} en BPM y ${a.vorpPct} en VORP. El VORP es acumulativo, así que los minutos le pesan de una forma que al PER no.`,
      advancedDerived: (a: { name: string }) =>
        `Conviene saberlo: estas métricas avanzadas se reconstruyen a partir de la línea por partido de ${a.name} y de su tiro real, no se miden desde el play-by-play. Ordenan bien a los jugadores, pero son estimaciones.`,
      strengthsIntro: (a: { name: string }) =>
        `Lo que ${a.name} hace bien, por umbral de percentil y no por opinión:`,
      concernsIntro: (a: { name: string }) =>
        `Dónde están las dudas con ${a.name}, con el mismo método y en dirección contraria:`,
      contractBargain: (a: { name: string; salary: string; value: string; diff: string }) =>
        `${a.name} es un chollo para este modelo: cobra ${a.salary} frente a un valor modelado de ${a.value}, o sea ${a.diff} de plusvalía.`,
      contractOverpaid: (a: { name: string; salary: string; value: string; diff: string }) =>
        `${a.name} cobra por encima de lo que el modelo cree que vale: ${a.salary} frente a un valor modelado de ${a.value}, así que ${a.diff} de plusvalía negativa.`,
      contractFair: (a: { name: string; salary: string; value: string }) =>
        `${a.name} cobra más o menos lo que vale: ${a.salary} frente a un valor modelado de ${a.value}.`,
      contractCap: (a: { pct: string; cap: string; age: number }) =>
        `Eso es el ${a.pct}% del tope salarial de ${a.cap}. Tiene ${a.age} años, que es la otra mitad de cualquier pregunta sobre un contrato.`,
      comparison: (a: { name: string; first: string; similarity: string; rest: string }) =>
        `El parecido estadístico más cercano a ${a.name} es ${a.first}, con un ${a.similarity}% de similitud, seguido de ${a.rest}.`,
      comparisonMethod: (a: { name: string }) =>
        `Es una búsqueda de vecinos más cercanos sobre doce ejes de percentil —producción, eficiencia, uso y acciones defensivas—, no una comparación subjetiva. Dice quién produce como ${a.name}, no quién juega como él.`,
      formHot: (a: { name: string; last5: string; season: string; diff: string }) =>
        `${a.name} está enchufado: ${a.last5} puntos en los últimos cinco partidos frente a una media de temporada de ${a.season}, o sea ${a.diff}.`,
      formCold: (a: { name: string; last5: string; season: string; diff: string }) =>
        `${a.name} se ha enfriado: ${a.last5} puntos en los últimos cinco frente a ${a.season} de media en la temporada, o sea ${a.diff}.`,
      formSteady: (a: { name: string; last5: string; season: string }) =>
        `${a.name} va regular de constante: ${a.last5} puntos en los últimos cinco partidos frente a una media de temporada de ${a.season}.`,
      formHigh: (a: { high: number; games: number }) =>
        `Su máximo esta temporada son ${a.high} puntos, sobre ${a.games} partidos registrados.`,
      homeAway: (a: { name: string; homePts: string; awayPts: string; homeGp: number; awayGp: number; diff: string }) =>
        `En casa ${a.name} promedia ${a.homePts} puntos en ${a.homeGp} partidos; fuera, ${a.awayPts} en ${a.awayGp}. Jugar en casa le vale ${a.diff}.`,
      restSplit: (a: { rested: string; b2b: string; diff: string }) =>
        `Con dos días o más de descanso anota ${a.rested}; en la segunda noche de partidos consecutivos, ${a.b2b}: una diferencia de ${a.diff}.`,
      honours: (a: { name: string; rings: number; list: string }) =>
        `${a.name} tiene ${a.rings} anillo${a.rings === 1 ? '' : 's'}. A nivel individual: ${a.list}.`,
      honoursNone: (a: { name: string; experience: number }) =>
        `${a.name} todavía no tiene premios individuales de peso en el índice, en ${a.experience} temporada${a.experience === 1 ? '' : 's'}.`,
      bio: (a: { name: string; age: number; height: string; cm: number; weight: number; kg: number; country: string }) =>
        `${a.name} tiene ${a.age} años, mide ${a.height} (${a.cm} cm), pesa ${a.weight} lb (${a.kg} kg) y es de ${a.country}.`,
      bioDraft: (a: { name: string; year: number; round: number; pick: number; experience: number }) =>
        `Salió en el draft de ${a.year}, ronda ${a.round}, elección ${a.pick}, y va por su temporada ${a.experience}.`,
      bioUndrafted: (a: { name: string; experience: number }) =>
        `${a.name} no fue drafteado y va por su temporada ${a.experience}.`,
      career: (a: { name: string; teams: string; count: number; seasons: number; current: string }) =>
        `${a.name} ha jugado en ${a.count} franquicia${a.count === 1 ? '' : 's'} a lo largo de ${a.seasons} temporada${a.seasons === 1 ? '' : 's'}: ${a.teams}. Ahora está en ${a.current}.`,
      rank: (a: { name: string; bestPct: number; worstPct: number; total: number }) =>
        `Frente a los ${a.total} jugadores del índice, el mejor percentil de ${a.name} es ${a.bestPct} y el peor, ${a.worstPct}. Las etiquetas de abajo dicen cuál es cuál.`,
      vsTeam: (a: { name: string; opp: string; gp: number; pts: string; reb: string; ast: string; season: string }) =>
        `Contra ${a.opp}, ${a.name} promedia ${a.pts} puntos, ${a.reb} rebotes y ${a.ast} asistencias en ${a.gp} enfrentamientos; su media de temporada es ${a.season}.`,
      vsTeamDefence: (a: { opp: string; drtg: string; rank: number }) =>
        `${a.opp} concede ${a.drtg} puntos por 100 posesiones, ${a.rank}º de la liga, que es el número en el que más se apoya el modelo de proyección.`,
      vsTeamNone: (a: { name: string; opp: string }) =>
        `No tengo enfrentamientos registrados entre ${a.name} y ${a.opp} en este periodo.`,

      // -------------------------------------------------------------- team
      teamVerdictContender: (a: { name: string; net: string; rank: number }) =>
        `Los ${a.name} son candidatos de verdad: ${a.net} de rating neto, ${a.rank}º de la liga. El rating neto es el número que aguanta el contacto con los playoffs.`,
      teamVerdictPlayoff: (a: { name: string; net: string; rank: number }) =>
        `Los ${a.name} son equipo de playoffs sin ser favoritos: ${a.net} de rating neto, ${a.rank}º de la liga.`,
      teamVerdictMiddling: (a: { name: string; net: string; rank: number }) =>
        `Los ${a.name} están haciendo aguas: ${a.net} de rating neto, ${a.rank}º de la liga. Eso es terreno de play-in, no de recorrido.`,
      teamVerdictRebuilding: (a: { name: string; net: string; rank: number }) =>
        `Los ${a.name} están lejos: ${a.net} de rating neto, ${a.rank}º de la liga. Esto es una plantilla en construcción, no una compitiendo.`,
      teamRatings: (a: { ortg: string; ortgRank: number; drtg: string; drtgRank: number }) =>
        `Anotan ${a.ortg} por 100 posesiones (${a.ortgRank}º) y conceden ${a.drtg} (${a.drtgRank}º).`,
      teamSeed: (a: { name: string; wins: number; losses: number; seed: number; east: boolean }) =>
        `Los ${a.name} llevan ${a.wins}-${a.losses} y ahora mismo son el ${a.seed}º del ${a.east ? 'Este' : 'Oeste'}.`,
      teamOverview: (a: { name: string; east: boolean; division: string; wins: number; losses: number; seed: number }) =>
        `Los ${a.name} juegan en el ${a.east ? 'Este' : 'Oeste'}, división ${a.division}, y llevan ${a.wins}-${a.losses}: ${a.seed}º tal y como está la cosa.`,
      teamBestPlayer: (a: { scorer: string; pts: string }) =>
        `${a.scorer} es quien tira del carro, con ${a.pts}.`,
      teamRecord: (a: { name: string; wins: number; losses: number; pct: string; scored: string; allowed: string; diff: string }) =>
        `Los ${a.name} llevan ${a.wins}-${a.losses} (${a.pct}%), anotando ${a.scored} y recibiendo ${a.allowed} por noche, para una diferencia de ${a.diff}.`,
      teamStatusClinched: (a: { name: string; seed: number; east: boolean }) =>
        `Eso es el ${a.seed}º puesto del ${a.east ? 'Este' : 'Oeste'}: dentro del top 6, así que playoffs directos tal y como está la cosa.`,
      teamStatusPlayin: (a: { name: string; seed: number; east: boolean }) =>
        `Eso es el ${a.seed}º puesto del ${a.east ? 'Este' : 'Oeste'}, o sea play-in y no plaza garantizada.`,
      teamStatusOut: (a: { name: string; seed: number; east: boolean }) =>
        `Eso es el ${a.seed}º puesto del ${a.east ? 'Este' : 'Oeste'}: fuera del play-in tal y como está la cosa.`,
      teamOffence: (a: { name: string; ortg: string; rank: number; ppg: string; ts: string; threeRate: string }) =>
        `Los ${a.name} anotan ${a.ortg} puntos por 100 posesiones, ${a.rank}º de la liga, que se traduce en ${a.ppg} por noche. Tiran con un ${a.ts}% real y el ${a.threeRate}% de sus tiros son triples.`,
      teamOffenceLeader: (a: { scorer: string; pts: string; passer: string; ast: string }) =>
        `${a.scorer} lleva el peso anotador con ${a.pts}, y ${a.passer} el de la creación con ${a.ast} asistencias.`,
      teamOffenceLeaderOne: (a: { name: string; pts: string; ast: string }) =>
        `${a.name} lleva las dos cosas: ${a.pts} puntos y ${a.ast} asistencias.`,
      teamDefence: (a: { name: string; drtg: string; rank: number; allowed: string }) =>
        `Los ${a.name} conceden ${a.drtg} puntos por 100 posesiones, ${a.rank}º de la liga: ${a.allowed} por noche en puntos brutos.`,
      teamDefenceLeader: (a: { blocker: string; blk: string; stealer: string; stl: string }) =>
        `${a.blocker} protege el aro con ${a.blk} tapones, y ${a.stealer} lidera los robos con ${a.stl}.`,
      teamDefenceLeaderOne: (a: { name: string; blk: string; stl: string }) =>
        `${a.name} lidera las dos categorías, con ${a.blk} tapones y ${a.stl} robos.`,
      teamPace: (a: { name: string; pace: string; rank: number; threeRate: string }) =>
        `Los ${a.name} juegan a ${a.pace} posesiones por 48 minutos, ${a.rank}º de la liga, con el ${a.threeRate}% de sus tiros desde el triple. El ritmo no es calidad: es cuántas oportunidades tienen los dos equipos.`,
      teamStrengthOffence: (a: { name: string; rank: number }) =>
        `La fortaleza más clara de los ${a.name} es el ataque: ${a.rank}º de la liga por rating.`,
      teamStrengthDefence: (a: { name: string; rank: number }) =>
        `La fortaleza más clara de los ${a.name} es la defensa: ${a.rank}º de la liga por rating.`,
      teamStrengthPace: (a: { name: string; rank: number }) =>
        `Lo que más distingue a los ${a.name} es el ritmo que imponen: ${a.rank}º de la liga.`,
      teamStrengthShooting: (a: { name: string; rank: number }) =>
        `La fortaleza más clara de los ${a.name} es el tiro, en torno al ${a.rank}º de la liga en tiro real de equipo.`,
      teamWeaknessOffence: (a: { name: string; rank: number }) =>
        `El punto débil de los ${a.name} es el ataque: ${a.rank}º de la liga por rating.`,
      teamWeaknessDefence: (a: { name: string; rank: number }) =>
        `El punto débil de los ${a.name} es la defensa: ${a.rank}º de la liga por rating.`,
      teamWeaknessPace: (a: { name: string; rank: number }) =>
        `Donde más se salen los ${a.name} de la norma es en el ritmo: ${a.rank}º de la liga, que es más una rareza de estilo que un defecto.`,
      teamWeaknessShooting: (a: { name: string; rank: number }) =>
        `El punto débil de los ${a.name} es el tiro, en torno al ${a.rank}º de la liga en tiro real de equipo.`,
      teamSoftSpot: (a: { name: string; pos: string; value: string }) =>
        `Por posición, donde más blandos son es contra los ${a.pos}: ${a.value} puntos respecto a la media de la liga. Eso entra directo en el modelo de proyección de jugador.`,
      teamBest: (a: { name: string; best: string; per: string; pts: string; reb: string; ast: string }) =>
        `Por PER, el mejor jugador de los ${a.name} es ${a.best} con ${a.per}, produciendo ${a.pts} puntos, ${a.reb} rebotes y ${a.ast} asistencias.`,
      teamLeaders: (a: { scorer: string; pts: string; rebounder: string; reb: string; passer: string; ast: string }) =>
        `Líderes por categoría: ${a.scorer} anota ${a.pts}, ${a.rebounder} coge ${a.reb} rebotes y ${a.passer} da ${a.ast} asistencias.`,
      teamLeadersSweep: (a: { name: string; pts: string; reb: string; ast: string }) =>
        `${a.name} les lidera en las tres: ${a.pts} puntos, ${a.reb} rebotes y ${a.ast} asistencias.`,
      teamRoster: (a: { name: string; count: number; age: number | string; payroll: string; names: string }) =>
        `El índice recoge ${a.count} jugadores de los ${a.name}, con una edad ponderada por minutos de ${a.age} y ${a.payroll} de nómina. La parte alta de la rotación: ${a.names}.`,
      teamPayrollTax: (a: { name: string; payroll: string; tax: string; over: string }) =>
        `Los ${a.name} tienen ${a.payroll} en salarios, ${a.over} por encima de la línea del impuesto de lujo, que está en ${a.tax}.`,
      teamPayrollOverCap: (a: { name: string; payroll: string; cap: string; over: string }) =>
        `Los ${a.name} tienen ${a.payroll} en salarios, ${a.over} por encima del tope de ${a.cap} pero por debajo del impuesto.`,
      teamPayrollUnderCap: (a: { name: string; payroll: string; cap: string; room: string }) =>
        `Los ${a.name} tienen ${a.payroll} en salarios, lo que deja ${a.room} de margen bajo el tope de ${a.cap}.`,
      teamPayrollNote: (a: { name: string }) =>
        `Eso cuenta solo a los jugadores de los ${a.name} que incluye este conjunto de datos, así que queda por debajo de una plantilla completa de quince.`,
      teamArena: (a: { name: string; arena: string; city: string; capacity: string; opened: number }) =>
        `Los ${a.name} juegan en el ${a.arena}, en ${a.city}, un pabellón de ${a.capacity} asientos inaugurado en ${a.opened}.`,
      teamArenaShort: (a: { arena: string; opened: number }) =>
        `Juegan en el ${a.arena}, inaugurado en ${a.opened}.`,
      teamGate: (a: { attendance: string; fill: string; rank: number; sellouts: number; games: number }) =>
        `Meten ${a.attendance} por noche, el ${a.fill}% del aforo y ${a.rank}º de la liga, con ${a.sellouts} llenos en ${a.games} partidos en casa.`,
      teamTickets: (a: { average: string; getIn: string; rank: number }) =>
        `La entrada media de reventa está en ${a.average}, con un precio de acceso de ${a.getIn}: ${a.rank}º más caro de la liga.`,
      teamGateModelled: (a: { name: string }) =>
        `La asistencia y los precios de los ${a.name} están modelados, no extraídos: la NBA no publica un feed gratuito de taquilla por partido y los precios de reventa están tras APIs de pago.`,
      teamHistory: (a: { name: string; titles: number; last: number; founded: number }) =>
        `Los ${a.name} tienen ${a.titles} anillo${a.titles === 1 ? '' : 's'} de la NBA, el último en ${a.last}. La franquicia data de ${a.founded}.`,
      teamHistoryNone: (a: { name: string; founded: number }) =>
        `Los ${a.name} todavía no han ganado ningún anillo de la NBA. La franquicia data de ${a.founded}.`,
      teamVs: (a: { name: string; opp: string; homePts: string; awayPts: string; prob: string }) =>
        `Recibiendo a ${a.opp}, el modelo da a los ${a.name} un ${a.homePts} a ${a.awayPts} y un ${a.prob}% de opciones de ganar.`,
      teamVsRatings: (a: { name: string; net: string; opp: string; oppNet: string }) =>
        `${a.name} tiene ${a.net} de rating neto frente a los ${a.oppNet} de ${a.opp}.`,
    },
  },

  // ------------------------------------------------------------------ misc
  projection: {
    outcomesBetween: (low: string, high: string) =>
      `El 80% de los resultados entre ${low} y ${high}`,
    over: (pct: string) => `OVER ${pct}%`,
    under: (pct: string) => `UNDER ${pct}%`,
    lineLabel: (line: number) => `O/U ${line}`,
    overUnderAria: (over: string, under: string) =>
      `Over ${over} por ciento, under ${under} por ciento`,
    lineTitle: (line: number) => `Línea ${line}`,
  },
  charts: {
    radarSub: 'Cada eje escalado de 0 a 100 contra una referencia de liga',
    skillProfile: 'Perfil de habilidades',
    axis: 'Eje',
  },
  loading: {
    turnover: 'Pérdida',
    renderFailed: 'Algo de esta vista no se ha podido dibujar.',
  },
  notFound: {
    title: 'Violación de los 24 segundos',
    sub: 'Esa página no existe.',
    cta: 'Volver al laboratorio',
  },
  pickers: {
    searchPlayer: 'Busca un jugador…',
    change: 'cambiar',
    pickTeam: 'Elige un equipo…',
  },
  source: {
    trained: 'Modelo entrenado',
    baseline: 'Modelo base',
    baselineTooltip:
      'No hay ningún artefacto entrenado cargado: esta proyección sale del modelo base calibrado ' +
      '(forma real, ratings reales del rival, efectos reales de pista y descanso; sin pesos aprendidos).',
  },
  percentileBand: {
    elite: 'Élite',
    veryGood: 'Muy bueno',
    aboveAverage: 'Por encima de la media',
    average: 'En la media',
    belowAverage: 'Por debajo de la media',
    poor: 'Flojo',
  },
  honour: {
    'NBA Champion': 'Campeón de la NBA',
    'Finals MVP': 'MVP de las Finales',
    'Most Valuable Player': 'Jugador Más Valioso',
    'Defensive Player of the Year': 'Mejor Defensor del Año',
    'Rookie of the Year': 'Rookie del Año',
    'Most Improved Player': 'Jugador Más Mejorado',
    'Sixth Man of the Year': 'Mejor Sexto Hombre',
    'Clutch Player of the Year': 'Mejor Jugador Decisivo',
    'Scoring champion': 'Máximo anotador',
    'All-Star': 'All-Star',
  },
}
