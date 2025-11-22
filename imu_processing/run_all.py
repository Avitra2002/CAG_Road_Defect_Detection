# ---------- RUN ALL (IMU + Auto GPX Merge + GPS-tagged Summary) ----------
import glob, pandas as pd
from imu_preprocess import preprocess_data
from imu_bump_analysis_v2 import analyze_bumps_v2
from gpx_to_csv_merge import merge_gpx_with_imu

def identify_sensor_file(file_path):
    try:
        df = pd.read_csv(file_path, sep="\t", nrows=5)
        cols = df.columns.str.lower().tolist()
        if any('m/s' in c for c in cols):
            return 'accel'
        elif any('rad/s' in c for c in cols):
            return 'gyro'
    except Exception:
        pass
    return None


if __name__ == "__main__":
    # --- Detect IMU text files ---
    txt_files = glob.glob("*.txt")
    accel = gyro = None
    for f in txt_files:
        kind = identify_sensor_file(f)
        if kind == 'accel' and accel is None:
            accel = f
        elif kind == 'gyro' and gyro is None:
            gyro = f

    if not accel or not gyro:
        raise FileNotFoundError("❌ Could not identify accelerometer or gyroscope .txt files.")

    print(f"Detected IMU files:\n  Accelerometer → {accel}\n  Gyroscope → {gyro}")

    # --- Preprocess + Analyze Bumps ---
    imu_csv = preprocess_data(accel, gyro)
    results_csv, summary_csv = analyze_bumps_v2(imu_csv)

    # --- Auto-detect GPX and merge with IMU ---
    gpx_files = glob.glob("*.gpx")
    if gpx_files:
        gpx_path = gpx_files[0]
        print(f"Detected GPX file → {gpx_path}")
        gps_merged_csv, summary_gps_csv = merge_gpx_with_imu(
            gpx_path=gpx_path,
            imu_csv=results_csv,
            summary_csv=summary_csv
        )
        print(f"📍 GPS merge complete → {gps_merged_csv}")
        print(f"📍 GPS-tagged bump summary → {summary_gps_csv}")
    else:
        print("⚠️ No GPX file detected — skipping GPS merge.")

    print("🎯 Full pipeline complete.")
