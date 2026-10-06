"""Crowd prediction model for Smart Darshan.

Learns hourly footfall (people entering per hour) from each temple's history
using a Random Forest regressor, and predicts expected crowd for future hours.
"""

from __future__ import annotations

import re
import threading
from datetime import datetime, timezone
from pathlib import Path

import joblib
import numpy as np
import pandas as pd
from sklearn.ensemble import RandomForestRegressor
from sklearn.metrics import mean_absolute_error, r2_score
from sklearn.model_selection import train_test_split

FEATURES = ["hour", "day_of_week", "month", "is_weekend", "is_festival", "hour_sin", "hour_cos"]
TEMPLE_ID_PATTERN = re.compile(r"^[a-f0-9]{24}$")
MIN_RECORDS = 50


class ModelError(Exception):
    def __init__(self, message: str, status: int = 400):
        super().__init__(message)
        self.status = status


def build_features(rows: list[dict]) -> pd.DataFrame:
    """Turns raw rows ({hour, dayOfWeek, month, isFestival}) into model features."""
    df = pd.DataFrame(rows)
    missing = {"hour", "dayOfWeek", "month", "isFestival"} - set(df.columns)
    if missing:
        raise ModelError(f"Missing fields: {', '.join(sorted(missing))}")

    features = pd.DataFrame(
        {
            "hour": df["hour"].astype(int),
            "day_of_week": df["dayOfWeek"].astype(int),
            "month": df["month"].astype(int),
            "is_weekend": df["dayOfWeek"].isin([0, 6]).astype(int),
            "is_festival": df["isFestival"].astype(int),
        }
    )
    # Cyclical encoding so hour 23 and hour 0 are treated as neighbours.
    features["hour_sin"] = np.sin(2 * np.pi * features["hour"] / 24)
    features["hour_cos"] = np.cos(2 * np.pi * features["hour"] / 24)
    return features[FEATURES]


def seasonal_baseline_mae(train: pd.DataFrame, test: pd.DataFrame) -> float:
    """MAE of a simple 'average for this weekday and hour' guess, to show the model adds value."""
    means = train.groupby(["day_of_week", "hour", "is_festival"])["entries"].mean()
    fallback = train.groupby("hour")["entries"].mean()
    guesses = [
        means.get((r.day_of_week, r.hour, r.is_festival), fallback.get(r.hour, train["entries"].mean()))
        for r in test.itertuples()
    ]
    return float(mean_absolute_error(test["entries"], guesses))


class ModelStore:
    """Trains, saves and loads one model per temple."""

    def __init__(self, directory: Path):
        self.directory = directory
        self.directory.mkdir(parents=True, exist_ok=True)
        self._cache: dict[str, tuple[float, dict]] = {}
        self._lock = threading.Lock()

    def _path(self, temple_id: str) -> Path:
        if not TEMPLE_ID_PATTERN.match(str(temple_id)):
            raise ModelError("Invalid templeId")
        return self.directory / f"{temple_id}.joblib"

    def list_ids(self) -> list[str]:
        return sorted(p.stem for p in self.directory.glob("*.joblib"))

    def train(self, temple_id: str, records: list[dict]) -> dict:
        path = self._path(temple_id)
        if not isinstance(records, list) or len(records) < MIN_RECORDS:
            raise ModelError(f"Need at least {MIN_RECORDS} records to train")

        frame = build_features(records)
        frame["entries"] = pd.DataFrame(records)["entries"].astype(float).clip(lower=0)

        train_df, test_df = train_test_split(frame, test_size=0.2, random_state=42)
        model = RandomForestRegressor(
            n_estimators=200, max_depth=14, min_samples_leaf=2, random_state=42, n_jobs=-1
        )
        model.fit(train_df[FEATURES], train_df["entries"])
        predictions = model.predict(test_df[FEATURES])

        mae = float(mean_absolute_error(test_df["entries"], predictions))
        r2 = float(r2_score(test_df["entries"], predictions))
        baseline_mae = seasonal_baseline_mae(train_df, test_df)

        # Refit on all data for the saved model.
        model.fit(frame[FEATURES], frame["entries"])
        importances = {
            name: round(float(score), 4) for name, score in zip(FEATURES, model.feature_importances_)
        }

        metadata = {
            "templeId": temple_id,
            "algorithm": "RandomForestRegressor",
            "samples": int(len(frame)),
            "testSamples": int(len(test_df)),
            "mae": round(mae, 2),
            "r2": round(r2, 4),
            "baselineMae": round(baseline_mae, 2),
            "improvementPct": round((1 - mae / baseline_mae) * 100, 1) if baseline_mae else None,
            "featureImportances": dict(sorted(importances.items(), key=lambda kv: -kv[1])),
            "trainedAt": datetime.now(timezone.utc).isoformat(),
        }

        with self._lock:
            joblib.dump({"model": model, "features": FEATURES, "metadata": metadata}, path)
            self._cache.pop(temple_id, None)
        return metadata

    def _load(self, temple_id: str) -> dict:
        path = self._path(temple_id)
        if not path.exists():
            raise ModelError("No trained model for this temple yet", status=404)
        mtime = path.stat().st_mtime
        cached = self._cache.get(temple_id)
        if cached and cached[0] == mtime:
            return cached[1]
        with self._lock:
            bundle = joblib.load(path)
            self._cache[temple_id] = (mtime, bundle)
        return bundle

    def metadata(self, temple_id: str) -> dict:
        return self._load(temple_id)["metadata"]

    def predict(self, temple_id: str, rows: list[dict]) -> dict:
        if not isinstance(rows, list) or not rows:
            raise ModelError("rows must be a non-empty list")
        bundle = self._load(temple_id)
        features = build_features(rows)
        predictions = bundle["model"].predict(features[bundle["features"]])
        return {
            "predictions": [round(max(0.0, float(p)), 1) for p in predictions],
            "algorithm": bundle["metadata"]["algorithm"],
            "trainedAt": bundle["metadata"]["trainedAt"],
        }
