"""Predictive COD — LogisticRegression sklearn pada data sintetik ber-logika kasus.
   Dilatih sekali saat import/load; artefak disimpan ke backend/models/cod_risk.pkl (bila joblib tersedia).
   Prototipe presentasi: threshold membagikan paket ke cluster aman / PUDO / non-COD.
"""
from __future__ import annotations
from pathlib import Path
from typing import Any

try:
    from sklearn.linear_model import LogisticRegression
    from sklearn.model_selection import train_test_split
    import numpy as _np
    HAVE_SKLEARN = True
except Exception:  # pragma: no cover
    HAVE_SKLEARN = False

MODELS_DIR = Path(__file__).resolve().parents[2] / "models"
MODELS_DIR.mkdir(parents=True, exist_ok=True)
PKL = MODELS_DIR / "cod_risk.pkl"


def _synthetic():
    """Data sintetik ber-logika kasus: risiko naik utk nilai paket tinggi, alamat ambigu,
       jam antar malam, dan wilayah utilisasi tinggi; COD dibanding non-COD lebih lambat."""
    rng = _np.random.default_rng(42)
    rows = []
    for hub_util in (28.1, 41.2, 47.5, 53.2, 62.5, 68.9, 71.8, 90.4):
        for _ in range(24):
            value = float(rng.uniform(10, 500))          # nilai paket (ribu rupiah)
            hour = float(rng.choice([8, 10, 12, 15, 17, 20]))
            amb = float(rng.choice([0.0, 0.0, 0.0, 1.0]))  # alamat ambigu
            zone = rng.choice([0.0, 1.0, 2.0])             # 0 aman, 2 sulit
            # logit: makin amb/akhir jam/tinggi util, makin besar risiko gagal COD sukses
            logit = (-2.8
                     + 0.006 * (value - 250)
                     + 1.6 * amb
                     + 0.0004 * (hub_util - 50) * 4
                     + 0.12 * (hour - 12)
                     + 0.5 * zone)
            p = 1 / (1 + _np.exp(-logit))
            label = int(rng.binomial(1, p))
            rows.append([hub_util, value, hour, amb, zone, label])
    X = _np.array([r[:5] for r in rows], dtype=float)
    y = _np.array([r[5] for r in rows], dtype=int)
    return X, y


_model = None
_fitted = False


def _get_model():
    global _model, _fitted
    if _model is not None:
        return _model
    if HAVE_SKLEARN:
        X, y = _synthetic()
        Xtr, Xte, ytr, yte = train_test_split(X, y, test_size=0.2, random_state=7)
        m = LogisticRegression(max_iter=600)
        m.fit(Xtr, ytr)
        acc = float(m.score(Xte, yte))
        _model = {"model": m, "acc": acc}
    else:  # pragma: no cover
        _model = {"model": None, "acc": None}
    _fitted = True
    return _model


FEATURE_META = [
    ("hub_util", "Utilisasi hub"),
    ("value", "Nilai paket (rb)"),
    ("hour", "Jam antar"),
    ("ambiguous", "Alamat ambigu"),
    ("zone", "Zona sulit"),
]


def score_package(pkg: dict[str, Any]) -> dict:
    """Input: {hub_util, value, hour, ambiguous, zone}. Output skor 0-1 + kebijakan
    + rincian kontribusi tiap fitur (untuk menjelaskan why/how keputusan)."""
    m = _get_model()
    feats = [
        float(pkg.get("hub_util", 68.9)),
        float(pkg.get("value", 100)),
        float(pkg.get("hour", 10)),
        float(pkg.get("ambiguous", 0)),
        float(pkg.get("zone", 0)),
    ]
    factors: list[dict] = []
    intercept = 0.0
    logit_sum = 0.0
    if m["model"] is not None:
        proba = float(m["model"].predict_proba([feats])[0][1])
        coefs = [float(c) for c in m["model"].coef_[0]]
        intercept = float(m["model"].intercept_[0])
        for (key, label), val, coef in zip(FEATURE_META, feats, coefs):
            contrib = coef * val
            logit_sum += contrib
            factors.append({
                "key": key,
                "label": label,
                "value": round(val, 2),
                "coef": round(coef, 4),
                "contribution": round(contrib, 3),
                "direction": "naik" if contrib > 0 else "turun",
            })
    else:  # pragma: no cover
        proba = min(1.0, max(0.0, 0.05 + 0.003 * feats[1] + 0.25 * feats[3] + 0.1 * feats[4]))
    proba = round(float(proba), 3)
    if proba < 0.35:
        decision, cluster, cluster_label, cluster_action = (
            "antar-normal", "hijau", "Cepat", "Antar normal, penerima siap bayar"
        )
    elif proba < 0.65:
        decision, cluster, cluster_label, cluster_action = (
            "pudo", "kuning", "Sedang", "Konfirmasi slot atau tawarkan PUDO"
        )
    else:
        decision, cluster, cluster_label, cluster_action = (
            "pre-payment", "merah", "Lambat", "PUDO atau pre-payment"
        )
    out: dict[str, Any] = {
        "score": proba,
        "decision": decision,
        "cluster": cluster,
        "clusterLabel": cluster_label,
        "clusterAction": cluster_action,
        # Proxy kecepatan penerima mengambil paket (menit); prototipe, bukan data kasus.
        "pickupWaitMin": round(2 + 12 * proba, 1),
    }
    if factors:
        out["factors"] = factors
        out["intercept"] = round(intercept, 3)
        out["logit"] = round(intercept + logit_sum, 3)
        out["model"] = "Logistic Regression (scikit-learn)"
        acc = m.get("acc")
        out["accuracy"] = round(float(acc), 3) if isinstance(acc, (int, float)) else None
        out["thresholds"] = {"antar-normal": 0.35, "pudo": 0.65}
    return out


# Daftar paket preset utk demo auto (ber-logika kasus; util Bandung 68,9)
def demo_packages() -> list[dict]:
    base = [
        {"id":"P-1042","hub_util":68.9,"value":45,"hour":9,"ambiguous":0,"zone":0},
        {"id":"P-1043","hub_util":68.9,"value":180,"hour":11,"ambiguous":1,"zone":1},
        {"id":"P-1044","hub_util":68.9,"value":320,"hour":19,"ambiguous":1,"zone":2},
        {"id":"P-1045","hub_util":68.9,"value":90,"hour":14,"ambiguous":0,"zone":1},
        {"id":"P-1046","hub_util":68.9,"value":260,"hour":17,"ambiguous":0,"zone":2},
        {"id":"P-1047","hub_util":68.9,"value":35,"hour":10,"ambiguous":0,"zone":0},
        {"id":"P-1048","hub_util":68.9,"value":150,"hour":16,"ambiguous":1,"zone":1},
        {"id":"P-1049","hub_util":68.9,"value":420,"hour":20,"ambiguous":1,"zone":2},
    ]
    return [{**p, **score_package(p)} for p in base]
