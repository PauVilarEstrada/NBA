class UpstreamError(RuntimeError):
    """stats.nba.com refused, timed out or changed shape."""


class NotFound(LookupError):
    pass
