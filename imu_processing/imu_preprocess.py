# ---------- IMU PREPROCESSING (CSV-compatible, with Unix→elapsed time) ----------
import pandas as pd
from datetime import timezone, timedelta

def preprocess_data(accel_path, gyro_path, output_path="imu_data.csv"):
    # --- Step 1: Read IMU text files (tab-separated) ---
    accel = pd.read_csv(accel_path, sep="\t")
    gyro  = pd.read_csv(gyro_path,  sep="\t")

    # --- Step 2: Rename columns to standard names ---
    accel = accel.rename(columns={
        'TStamp Asia/Singapore': 'timestamp_ms',
        'X [m/s²]': 'acc_x',
        'Y [m/s²]': 'acc_y',
        'Z [m/s²]': 'acc_z'
    })
    gyro = gyro.rename(columns={
        'TStamp Asia/Singapore': 'timestamp_ms',
        'X [rad/s]': 'gyro_x',
        'Y [rad/s]': 'gyro_y',
        'Z [rad/s]': 'gyro_z'
    })

    # --- Step 3: Convert Unix ms → datetime (UTC+8 Singapore) ---
    tz_sg = timezone(timedelta(hours=8))
    accel['datetime'] = pd.to_datetime(accel['timestamp_ms'], unit='ms', utc=True).dt.tz_convert(tz_sg)
    gyro['datetime']  = pd.to_datetime(gyro['timestamp_ms'],  unit='ms', utc=True).dt.tz_convert(tz_sg)

    # --- Step 4: Compute elapsed time (t_s) from first accelerometer timestamp ---
    t0 = accel['timestamp_ms'].iloc[0]
    accel['t_s'] = (accel['timestamp_ms'] - t0) / 1000.0
    gyro['t_s']  = (gyro['timestamp_ms']  - t0) / 1000.0

    accel = accel.sort_values('t_s')
    gyro  = gyro.sort_values('t_s')

    # --- Step 5: Merge accel + gyro by nearest timestamps (±5 ms tolerance) ---
    merged = pd.merge_asof(accel, gyro, on='t_s', direction='nearest', tolerance=0.005)

    # --- Step 6: Mean correction (first 4 s stationary) ---
    stationary = merged[merged['t_s'] <= 4]
    mean_vals = stationary[['acc_x','acc_y','acc_z']].mean()
    merged['acc_x_mean_c'] = merged['acc_x'] - mean_vals['acc_x']
    merged['acc_y_mean_c'] = merged['acc_y'] - mean_vals['acc_y']
    merged['acc_z_mean_c'] = merged['acc_z'] - mean_vals['acc_z']

    print(f"🕒 Converted timestamps to Singapore time (UTC+8)")
    print(f"Mean correction (0–4 s): X={mean_vals['acc_x']:.3f}, Y={mean_vals['acc_y']:.3f}, Z={mean_vals['acc_z']:.3f}")

    # --- Step 7: Reorder for readability in Excel ---
    ordered_cols = ['datetime', 't_s', 'timestamp_ms',
                    'acc_x', 'acc_y', 'acc_z',
                    'gyro_x', 'gyro_y', 'gyro_z',
                    'acc_x_mean_c', 'acc_y_mean_c', 'acc_z_mean_c']
    merged = merged[[c for c in ordered_cols if c in merged.columns]]

    # --- Step 8: Save to CSV (Excel-friendly) ---
    merged.to_csv(output_path, index=False)
    print(f"✅ Preprocessed file saved → {output_path} ({len(merged)} rows)")
    return output_path

