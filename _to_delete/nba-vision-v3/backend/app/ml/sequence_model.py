"""Optional deep head: a sequence model over a player's last N games.

Why bother when XGBoost already has rolling means? Because a fixed window is a
lossy summary. The sequence model sees the *shape* of the run — a player
trending up over four games and a player oscillating around the same mean have
identical 10-game averages but different next-game distributions.

Two interchangeable encoders:
  * `LSTMHead`        — cheap, strong on short sequences, the default.
  * `TransformerHead` — a 2-layer encoder with learned positional embeddings and
    a causal mask; better once you have >100k player-games.

Both output the parameters of an asymmetric Laplace distribution, which is
exactly the loss whose optimum is the conditional quantile — so the deep head
speaks the same language as the XGBoost quantile heads and the two can be fused
in quantile space (`distributions.blend`).

Torch is an optional dependency: importing this module without it raises only
when you actually build a model, so the API never hard-depends on it.
"""
from __future__ import annotations

from dataclasses import dataclass

import numpy as np

SEQ_LEN = 25
SEQ_FEATURES = ("pts", "reb", "ast", "min", "ts_pct", "usg_pct",
                "is_home", "rest_days", "opp_def_rating", "opp_pace")


def _torch():
    try:
        import torch
        return torch
    except ImportError as exc:  # pragma: no cover
        raise RuntimeError(
            "PyTorch is not installed. `pip install -r requirements-dl.txt` "
            "or keep using the gradient-boosted models only."
        ) from exc


def build_lstm(n_features: int = len(SEQ_FEATURES), n_quantiles: int = 7,
               hidden: int = 96, layers: int = 2, dropout: float = 0.15):
    torch = _torch()
    nn = torch.nn

    class LSTMHead(nn.Module):
        def __init__(self):
            super().__init__()
            self.norm = nn.LayerNorm(n_features)
            self.lstm = nn.LSTM(n_features, hidden, num_layers=layers,
                                batch_first=True, dropout=dropout)
            # static context (opponent, rest, playoffs) injected after the encoder
            self.ctx = nn.Sequential(nn.Linear(8, 32), nn.GELU())
            self.head = nn.Sequential(
                nn.Linear(hidden + 32, 64), nn.GELU(), nn.Dropout(dropout),
                nn.Linear(64, n_quantiles),
            )

        def forward(self, seq, ctx):
            h, _ = self.lstm(self.norm(seq))
            z = torch.cat([h[:, -1], self.ctx(ctx)], dim=-1)
            raw = self.head(z)
            # cumulative-softplus keeps quantiles monotonically increasing by
            # construction — no post-hoc sorting, no crossing quantiles.
            base, steps = raw[:, :1], torch.nn.functional.softplus(raw[:, 1:])
            return torch.cat([base, base + torch.cumsum(steps, dim=-1)], dim=-1)

    return LSTMHead()


def build_transformer(n_features: int = len(SEQ_FEATURES), n_quantiles: int = 7,
                      d_model: int = 96, heads: int = 4, layers: int = 2):
    torch = _torch()
    nn = torch.nn

    class TransformerHead(nn.Module):
        def __init__(self):
            super().__init__()
            self.proj = nn.Linear(n_features, d_model)
            self.pos = nn.Parameter(torch.randn(1, SEQ_LEN, d_model) * 0.02)
            enc = nn.TransformerEncoderLayer(d_model, heads, d_model * 4,
                                             dropout=0.1, batch_first=True,
                                             norm_first=True, activation="gelu")
            self.enc = nn.TransformerEncoder(enc, layers)
            self.ctx = nn.Sequential(nn.Linear(8, 32), nn.GELU())
            self.head = nn.Sequential(nn.Linear(d_model + 32, 64), nn.GELU(),
                                      nn.Linear(64, n_quantiles))

        def forward(self, seq, ctx):
            x = self.proj(seq) + self.pos[:, -seq.size(1):]
            mask = torch.triu(torch.ones(seq.size(1), seq.size(1)), 1).bool().to(seq.device)
            h = self.enc(x, mask=mask)
            z = torch.cat([h[:, -1], self.ctx(ctx)], dim=-1)
            raw = self.head(z)
            base, steps = raw[:, :1], torch.nn.functional.softplus(raw[:, 1:])
            return torch.cat([base, base + torch.cumsum(steps, dim=-1)], dim=-1)

    return TransformerHead()


def pinball_loss(pred, target, quantiles):
    """Multi-quantile (a.k.a. pinball / check) loss."""
    torch = _torch()
    q = torch.tensor(quantiles, device=pred.device, dtype=pred.dtype)
    err = target.unsqueeze(-1) - pred
    return torch.maximum(q * err, (q - 1) * err).mean()


@dataclass
class SequenceBundle:
    model: object
    target: str
    mean_: np.ndarray
    std_: np.ndarray

    def predict_quantiles(self, seq: np.ndarray, ctx: np.ndarray) -> np.ndarray:
        torch = _torch()
        self.model.eval()
        with torch.no_grad():
            z = (seq - self.mean_) / np.maximum(self.std_, 1e-6)
            out = self.model(torch.tensor(z[None], dtype=torch.float32),
                             torch.tensor(ctx[None], dtype=torch.float32))
        return out.numpy()[0]
