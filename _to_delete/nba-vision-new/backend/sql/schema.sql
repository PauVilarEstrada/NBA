-- =====================================================================
--  NBA Vision — PostgreSQL schema
--  Layers:  raw cache  →  normalised entities  →  feature store  →  model registry
-- =====================================================================

CREATE EXTENSION IF NOT EXISTS pg_trgm;   -- fuzzy player/team search

-- ---------------------------------------------------------------- teams
CREATE TABLE team (
    team_id        BIGINT PRIMARY KEY,            -- NBA canonical id (1610612747 = LAL)
    abbreviation   TEXT NOT NULL UNIQUE,
    city           TEXT NOT NULL,
    name           TEXT NOT NULL,
    conference     TEXT CHECK (conference IN ('East','West')),
    division       TEXT,
    primary_color  TEXT,                          -- '#552583'
    secondary_color TEXT,
    logo_url       TEXT,
    founded        INT
);

-- -------------------------------------------------------------- players
CREATE TABLE player (
    player_id      BIGINT PRIMARY KEY,            -- NBA canonical id (2544 = LeBron)
    slug           TEXT UNIQUE,                   -- 'lebron-james'
    first_name     TEXT NOT NULL,
    last_name      TEXT NOT NULL,
    full_name      TEXT GENERATED ALWAYS AS (first_name || ' ' || last_name) STORED,
    birthdate      DATE,
    height_cm      NUMERIC(5,1),
    weight_kg      NUMERIC(5,1),
    position       TEXT,                          -- G / G-F / F / F-C / C
    jersey         TEXT,
    country        TEXT,
    draft_year     INT,
    draft_round    INT,
    draft_number   INT,
    from_year      INT,
    to_year        INT,
    is_active      BOOLEAN DEFAULT TRUE,
    headshot_url   TEXT,
    bref_id        TEXT,                          -- basketball-reference key, for advanced history
    updated_at     TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX player_name_trgm ON player USING gin (full_name gin_trgm_ops);
CREATE INDEX player_active_idx ON player (is_active);

-- roster membership over time (drives "historial de equipos/traspasos")
CREATE TABLE player_team_stint (
    id             BIGSERIAL PRIMARY KEY,
    player_id      BIGINT REFERENCES player ON DELETE CASCADE,
    team_id        BIGINT REFERENCES team,
    season_start   INT NOT NULL,                  -- 2024 for 2024-25
    season_end     INT,
    acquired_via   TEXT,                          -- draft | trade | free_agency | waivers | two_way
    UNIQUE (player_id, team_id, season_start)
);

CREATE TABLE transaction (
    id             BIGSERIAL PRIMARY KEY,
    happened_on    DATE NOT NULL,
    kind           TEXT NOT NULL,                 -- trade | signing | waive | draft | extension
    player_id      BIGINT REFERENCES player,
    from_team_id   BIGINT REFERENCES team,
    to_team_id     BIGINT REFERENCES team,
    detail         TEXT,
    source         TEXT,                          -- realgm | nba.com | spotrac
    source_url     TEXT
);
CREATE INDEX transaction_player_idx ON transaction (player_id, happened_on DESC);

-- ------------------------------------------------------------- contracts
CREATE TABLE contract (
    id             BIGSERIAL PRIMARY KEY,
    player_id      BIGINT REFERENCES player ON DELETE CASCADE,
    team_id        BIGINT REFERENCES team,
    season_start   INT NOT NULL,
    cap_hit_usd    BIGINT,
    guaranteed_usd BIGINT,
    option_type    TEXT,                          -- player | team | none
    source         TEXT DEFAULT 'spotrac',
    fetched_at     TIMESTAMPTZ DEFAULT now(),
    UNIQUE (player_id, season_start)
);

-- market value is derived (cap hit + production + age curve), see services/market_value.py
CREATE TABLE market_value (
    player_id      BIGINT PRIMARY KEY REFERENCES player ON DELETE CASCADE,
    season_start   INT NOT NULL,
    cap_hit_usd    BIGINT,
    estimated_usd  BIGINT,                        -- what the model thinks he is worth
    surplus_usd    BIGINT GENERATED ALWAYS AS (estimated_usd - cap_hit_usd) STORED,
    fantasy_cost   NUMERIC(6,2),                  -- normalised 0-100 scale for the builder
    computed_at    TIMESTAMPTZ DEFAULT now()
);

-- ----------------------------------------------------------------- games
CREATE TABLE game (
    game_id        TEXT PRIMARY KEY,              -- '0022400123'
    season_start   INT NOT NULL,
    season_type    TEXT NOT NULL CHECK (season_type IN ('regular','playoffs','playin','preseason')),
    game_date      DATE NOT NULL,
    home_team_id   BIGINT REFERENCES team,
    away_team_id   BIGINT REFERENCES team,
    home_pts       INT,
    away_pts       INT,
    home_win       BOOLEAN,
    overtime       INT DEFAULT 0,
    arena          TEXT
);
CREATE INDEX game_date_idx   ON game (game_date DESC);
CREATE INDEX game_teams_idx  ON game (home_team_id, away_team_id);
CREATE INDEX game_season_idx ON game (season_start, season_type);

-- one row per player per game: the spine of every model in the app
CREATE TABLE player_game_log (
    game_id        TEXT REFERENCES game ON DELETE CASCADE,
    player_id      BIGINT REFERENCES player ON DELETE CASCADE,
    team_id        BIGINT REFERENCES team,
    opponent_id    BIGINT REFERENCES team,
    is_home        BOOLEAN NOT NULL,
    started        BOOLEAN,
    min            NUMERIC(5,2),
    pts INT, reb INT, ast INT, stl INT, blk INT, tov INT, pf INT,
    fgm INT, fga INT, fg3m INT, fg3a INT, ftm INT, fta INT,
    plus_minus     INT,
    -- derived, filled by the feature job
    ts_pct         NUMERIC(5,4),
    usg_pct        NUMERIC(5,4),
    game_score     NUMERIC(6,2),
    rest_days      INT,
    is_b2b         BOOLEAN,
    PRIMARY KEY (game_id, player_id)
);
CREATE INDEX pgl_player_date_idx ON player_game_log (player_id, game_id);
CREATE INDEX pgl_matchup_idx     ON player_game_log (player_id, opponent_id, is_home);

CREATE TABLE team_game_log (
    game_id        TEXT REFERENCES game ON DELETE CASCADE,
    team_id        BIGINT REFERENCES team,
    opponent_id    BIGINT REFERENCES team,
    is_home        BOOLEAN NOT NULL,
    pts INT, reb INT, ast INT, tov INT,
    fgm INT, fga INT, fg3m INT, fg3a INT, ftm INT, fta INT,
    off_rating     NUMERIC(6,2),
    def_rating     NUMERIC(6,2),
    net_rating     NUMERIC(6,2),
    pace           NUMERIC(6,2),
    rest_days      INT,
    PRIMARY KEY (game_id, team_id)
);

-- season aggregates (fast reads for the player card / team card)
CREATE TABLE player_season_stats (
    player_id      BIGINT REFERENCES player ON DELETE CASCADE,
    season_start   INT,
    season_type    TEXT,
    team_id        BIGINT REFERENCES team,
    gp INT, gs INT, min NUMERIC(6,2),
    pts NUMERIC(5,2), reb NUMERIC(5,2), ast NUMERIC(5,2),
    stl NUMERIC(4,2), blk NUMERIC(4,2), tov NUMERIC(4,2),
    fg_pct NUMERIC(5,4), fg3_pct NUMERIC(5,4), ft_pct NUMERIC(5,4),
    -- advanced (basketball-reference)
    per NUMERIC(5,2), ts_pct NUMERIC(5,4), usg_pct NUMERIC(5,4),
    ws NUMERIC(5,2), ws48 NUMERIC(5,3), bpm NUMERIC(5,2), vorp NUMERIC(5,2),
    PRIMARY KEY (player_id, season_start, season_type, team_id)
);

CREATE TABLE team_season_stats (
    team_id        BIGINT REFERENCES team,
    season_start   INT,
    season_type    TEXT,
    wins INT, losses INT,
    off_rating NUMERIC(6,2), def_rating NUMERIC(6,2), net_rating NUMERIC(6,2), pace NUMERIC(6,2),
    srs NUMERIC(6,2),
    opp_pts_allowed NUMERIC(6,2),
    -- positional defence: how many points above/below average this team concedes
    -- to each position. This is the matchup feature the player model leans on.
    def_vs_pg NUMERIC(5,2), def_vs_sg NUMERIC(5,2), def_vs_sf NUMERIC(5,2),
    def_vs_pf NUMERIC(5,2), def_vs_c  NUMERIC(5,2),
    PRIMARY KEY (team_id, season_start, season_type)
);

-- ------------------------------------------------------- feature store
-- Materialised, point-in-time-correct rows. Never recomputed at inference
-- from data that would not have existed before tip-off (no leakage).
CREATE TABLE feature_player_game (
    game_id        TEXT,
    player_id      BIGINT,
    as_of          TIMESTAMPTZ NOT NULL,
    features       JSONB NOT NULL,
    label_pts      INT, label_reb INT, label_ast INT, label_min NUMERIC(5,2),
    PRIMARY KEY (game_id, player_id)
);
CREATE INDEX fpg_features_idx ON feature_player_game USING gin (features);

CREATE TABLE feature_team_game (
    game_id        TEXT,
    team_id        BIGINT,
    as_of          TIMESTAMPTZ NOT NULL,
    features       JSONB NOT NULL,
    label_pts      INT, label_win BOOLEAN,
    PRIMARY KEY (game_id, team_id)
);

-- ------------------------------------------------------- model registry
CREATE TABLE model_version (
    id             BIGSERIAL PRIMARY KEY,
    name           TEXT NOT NULL,                 -- player_pts | team_margin | seq_player
    kind           TEXT NOT NULL,                 -- xgboost | lstm | transformer | elo
    season_type    TEXT NOT NULL DEFAULT 'regular',
    version        TEXT NOT NULL,
    artifact_uri   TEXT NOT NULL,
    trained_at     TIMESTAMPTZ DEFAULT now(),
    train_rows     INT,
    metrics        JSONB,                         -- {"mae":4.12,"rmse":5.6,"crps":...}
    feature_list   JSONB,
    is_active      BOOLEAN DEFAULT FALSE,
    UNIQUE (name, season_type, version)
);
CREATE UNIQUE INDEX one_active_model ON model_version (name, season_type) WHERE is_active;

-- every served prediction is logged so the model can be scored against reality
CREATE TABLE prediction_log (
    id             BIGSERIAL PRIMARY KEY,
    created_at     TIMESTAMPTZ DEFAULT now(),
    model_id       BIGINT REFERENCES model_version,
    kind           TEXT NOT NULL,                 -- player_vs_team | team_vs_team | sim
    payload        JSONB NOT NULL,                -- request
    output         JSONB NOT NULL,                -- response
    actual         JSONB,                         -- backfilled after the game
    is_mock        BOOLEAN DEFAULT FALSE
);

-- ------------------------------------------------------ fantasy builder
CREATE TABLE fantasy_roster (
    id             BIGSERIAL PRIMARY KEY,
    owner_key      TEXT,                          -- anonymous browser key, no auth needed
    name           TEXT NOT NULL,
    budget_usd     BIGINT NOT NULL,
    created_at     TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE fantasy_roster_player (
    roster_id      BIGINT REFERENCES fantasy_roster ON DELETE CASCADE,
    player_id      BIGINT REFERENCES player,
    cost_usd       BIGINT NOT NULL,
    slot           TEXT,
    PRIMARY KEY (roster_id, player_id)
);

CREATE TABLE simulation (
    id             BIGSERIAL PRIMARY KEY,
    roster_id      BIGINT REFERENCES fantasy_roster ON DELETE CASCADE,
    opponent_id    BIGINT REFERENCES team,
    seed           BIGINT NOT NULL,               -- deterministic replay
    season_type    TEXT DEFAULT 'regular',
    result         JSONB NOT NULL,                -- full play-by-play + box score
    created_at     TIMESTAMPTZ DEFAULT now()
);
