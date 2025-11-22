# ---------- GPX → CSV + Auto Merge with IMU + GPS-tagged Bump Summary v4 ----------
import gpxpy
import pandas as pd
import numpy as np
from datetime import timezone, timedelta
import glob
import os

def merge_gpx_with_imu(
    gpx_path=None,
    imu_csv="imu_bump_results_v2_3.csv",
    summary_csv="bump_summary_v2_3.csv",
    output_path="imu_data_gps.csv",
    summary_gps_path="bump_summary_gps.csv"
):
    """
    Optimized GPX–IMU merger:
      • Auto-detects GPX file
      • Computes native GPS frequency
      • Interpolates adaptively (2× native, capped at 10 Hz)
      • Merges with IMU using ±1 s tolerance
      • Generates GPS-tagged bump summary with no NaN coordinates
    """

    # --- 1️⃣ Auto-detect GPX ---
    if not gpx_path:
        gpx_files = glob.glob("*.gpx")
        if not gpx_files:
            raise FileNotFoundError("❌ No GPX file found in current directory.")
        gpx_path = gpx_files[0]
        print(f"Auto-detected GPX file → {gpx_path}")

    # --- 2️⃣ Parse GPX ---
    with open(gpx_path, "r") as f:
        gpx = gpxpy.parse(f)

    records = []
    tz_sg = timezone(timedelta(hours=8))  # Singapore time (UTC+8)
    for track in gpx.tracks:
        for segment in track.segments:
            for p in segment.points:
                records.append({
                    "datetime": p.time.astimezone(tz_sg),
                    "lat": p.latitude,
                    "lon": p.longitude,
                    "elev": p.elevation,
                    "speed": getattr(p, "speed", None)
                })

    gpx_df = pd.DataFrame(records)
    gpx_df["datetime"] = pd.to_datetime(gpx_df["datetime"])
    gpx_df["timestamp_ms"] = gpx_df["datetime"].astype("int64") // 10**6
    t0 = gpx_df["timestamp_ms"].iloc[0]
    gpx_df["t_s"] = (gpx_df["timestamp_ms"] - t0) / 1000.0
    gpx_df = gpx_df.sort_values("t_s").reset_index(drop=True)

    print(f"✅ Extracted {len(gpx_df)} GPS points from {gpx_path}")

    # --- 3️⃣ Adaptive interpolation (vectorized, very fast) ---
    t = gpx_df["t_s"].to_numpy()
    lat, lon, elev, spd = (
        gpx_df["lat"].to_numpy(),
        gpx_df["lon"].to_numpy(),
        gpx_df["elev"].to_numpy(),
        gpx_df["speed"].fillna(method="ffill").fillna(0).to_numpy()
    )

    # Compute native dt and set target
    native_dt = np.median(np.diff(t))
    target_dt = np.clip(native_dt / 2, 0.1, 1.0)  # 2× native but not <0.1 s
    if native_dt <= 0.2:  # ≥5 Hz → skip interpolation
        print(f"⚡ GPS already dense ({1/native_dt:.1f} Hz); skipping interpolation.")
        gpx_interp = gpx_df.copy()
    else:
        t_new = np.arange(t[0], t[-1], target_dt)
        gpx_interp = pd.DataFrame({
            "t_s": t_new,
            "lat": np.interp(t_new, t, lat),
            "lon": np.interp(t_new, t, lon),
            "elev": np.interp(t_new, t, elev),
            "speed": np.interp(t_new, t, spd)
        })
        print(f"⚡ Interpolated GPS → {len(gpx_interp)} pts "
              f"({1/target_dt:.1f} Hz target from {1/native_dt:.1f} Hz native)")

    # --- 4️⃣ Load IMU results ---
    imu_df = pd.read_csv(imu_csv, low_memory=False).sort_values("t_s")
    print(f"Loaded IMU data ({len(imu_df)} rows)")

    # --- 5️⃣ Merge IMU + GPS ---
    merged = pd.merge_asof(
        imu_df,
        gpx_interp.sort_values("t_s"),
        on="t_s",
        direction="nearest",
        tolerance=1.0
    )
    merged.to_csv(output_path, index=False)
    print(f"📍 IMU + GPS merged → {output_path}")

    # --- 6️⃣ GPS-tagged bump summary ---
    if os.path.exists(summary_csv):
        bump_df = pd.read_csv(summary_csv)
        print(f"Loaded bump summary ({len(bump_df)} bumps)")

        gps_cols = ["t_s", "lat", "lon", "elev", "speed"]
        merged_gps = pd.merge_asof(
            bump_df.sort_values("peak_time_s"),
            gpx_interp[gps_cols].sort_values("t_s"),
            left_on="peak_time_s",
            right_on="t_s",
            direction="nearest",
            tolerance=1.0
        )
        merged_gps.drop(columns=["t_s"], inplace=True)

        # Fill remaining NaNs quickly
        for col in ["lat", "lon", "elev", "speed"]:
            merged_gps[col] = merged_gps[col].interpolate(
                method="nearest", limit_direction="both"
            )

        merged_gps.to_csv(summary_gps_path, index=False)
        print(f"✅ GPS-tagged bump summary saved → {summary_gps_path}")
    else:
        print(f"⚠️ No bump summary at {summary_csv}; skipped GPS summary merge.")

    return output_path, summary_gps_path
