"""Official CDN asset URLs. No auth, no rate limit, hotlinkable."""
from app.core.config import settings

HEADSHOT = "{cdn}/headshots/nba/latest/1040x760/{pid}.png"
HEADSHOT_SM = "{cdn}/headshots/nba/latest/260x190/{pid}.png"
LOGO = "{cdn}/logos/nba/{tid}/primary/L/logo.svg"
LOGO_GLOBAL = "{cdn}/logos/nba/{tid}/global/L/logo.svg"


def headshot(player_id: int, small: bool = False) -> str:
    tpl = HEADSHOT_SM if small else HEADSHOT
    return tpl.format(cdn=settings.cdn_base, pid=player_id)


def team_logo(team_id: int) -> str:
    return LOGO.format(cdn=settings.cdn_base, tid=team_id)
