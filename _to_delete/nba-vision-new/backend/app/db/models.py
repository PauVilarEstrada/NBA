"""SQLAlchemy mirrors of sql/schema.sql (the SQL file is the source of truth;
these exist so services can query typed objects). Only the tables the API
reads on the hot path are mapped."""
from __future__ import annotations

from datetime import date, datetime

from sqlalchemy import (BigInteger, Boolean, Date, DateTime, ForeignKey, Integer,
                        Numeric, String, Text)
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column, relationship


class Base(DeclarativeBase):
    pass


class Team(Base):
    __tablename__ = "team"
    team_id: Mapped[int] = mapped_column(BigInteger, primary_key=True)
    abbreviation: Mapped[str] = mapped_column(String(3))
    city: Mapped[str] = mapped_column(Text)
    name: Mapped[str] = mapped_column(Text)
    conference: Mapped[str | None] = mapped_column(Text)
    division: Mapped[str | None] = mapped_column(Text)
    primary_color: Mapped[str | None] = mapped_column(Text)
    secondary_color: Mapped[str | None] = mapped_column(Text)
    logo_url: Mapped[str | None] = mapped_column(Text)


class Player(Base):
    __tablename__ = "player"
    player_id: Mapped[int] = mapped_column(BigInteger, primary_key=True)
    slug: Mapped[str | None] = mapped_column(Text)
    first_name: Mapped[str] = mapped_column(Text)
    last_name: Mapped[str] = mapped_column(Text)
    birthdate: Mapped[date | None] = mapped_column(Date)
    height_cm: Mapped[float | None] = mapped_column(Numeric(5, 1))
    weight_kg: Mapped[float | None] = mapped_column(Numeric(5, 1))
    position: Mapped[str | None] = mapped_column(Text)
    jersey: Mapped[str | None] = mapped_column(Text)
    country: Mapped[str | None] = mapped_column(Text)
    draft_year: Mapped[int | None] = mapped_column(Integer)
    draft_round: Mapped[int | None] = mapped_column(Integer)
    draft_number: Mapped[int | None] = mapped_column(Integer)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    headshot_url: Mapped[str | None] = mapped_column(Text)
    bref_id: Mapped[str | None] = mapped_column(Text)


class Game(Base):
    __tablename__ = "game"
    game_id: Mapped[str] = mapped_column(Text, primary_key=True)
    season_start: Mapped[int] = mapped_column(Integer)
    season_type: Mapped[str] = mapped_column(Text)
    game_date: Mapped[date] = mapped_column(Date)
    home_team_id: Mapped[int] = mapped_column(BigInteger, ForeignKey("team.team_id"))
    away_team_id: Mapped[int] = mapped_column(BigInteger, ForeignKey("team.team_id"))
    home_pts: Mapped[int | None] = mapped_column(Integer)
    away_pts: Mapped[int | None] = mapped_column(Integer)
    home_win: Mapped[bool | None] = mapped_column(Boolean)


class PlayerGameLog(Base):
    __tablename__ = "player_game_log"
    game_id: Mapped[str] = mapped_column(Text, ForeignKey("game.game_id"), primary_key=True)
    player_id: Mapped[int] = mapped_column(BigInteger, ForeignKey("player.player_id"), primary_key=True)
    team_id: Mapped[int] = mapped_column(BigInteger)
    opponent_id: Mapped[int] = mapped_column(BigInteger)
    is_home: Mapped[bool] = mapped_column(Boolean)
    min: Mapped[float | None] = mapped_column(Numeric(5, 2))
    pts: Mapped[int | None] = mapped_column(Integer)
    reb: Mapped[int | None] = mapped_column(Integer)
    ast: Mapped[int | None] = mapped_column(Integer)
    stl: Mapped[int | None] = mapped_column(Integer)
    blk: Mapped[int | None] = mapped_column(Integer)
    tov: Mapped[int | None] = mapped_column(Integer)
    fg3m: Mapped[int | None] = mapped_column(Integer)
    plus_minus: Mapped[int | None] = mapped_column(Integer)
    ts_pct: Mapped[float | None] = mapped_column(Numeric(5, 4))
    rest_days: Mapped[int | None] = mapped_column(Integer)


class ModelVersion(Base):
    __tablename__ = "model_version"
    id: Mapped[int] = mapped_column(BigInteger, primary_key=True)
    name: Mapped[str] = mapped_column(Text)
    kind: Mapped[str] = mapped_column(Text)
    season_type: Mapped[str] = mapped_column(Text, default="regular")
    version: Mapped[str] = mapped_column(Text)
    artifact_uri: Mapped[str] = mapped_column(Text)
    trained_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    metrics: Mapped[dict | None] = mapped_column(JSONB)
    feature_list: Mapped[list | None] = mapped_column(JSONB)
    is_active: Mapped[bool] = mapped_column(Boolean, default=False)


class PredictionLog(Base):
    __tablename__ = "prediction_log"
    id: Mapped[int] = mapped_column(BigInteger, primary_key=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    kind: Mapped[str] = mapped_column(Text)
    payload: Mapped[dict] = mapped_column(JSONB)
    output: Mapped[dict] = mapped_column(JSONB)
    actual: Mapped[dict | None] = mapped_column(JSONB)
    is_mock: Mapped[bool] = mapped_column(Boolean, default=False)
