# ---------- IMU BUMP ANALYSIS v2.3 ----------
# (Hybrid Strategy E + full 4s edge trimming + variance/turn rejection fixes)
import pandas as pd, numpy as np
from scipy.signal import butter, filtfilt, find_peaks
import matplotlib.pyplot as plt
from datetime import datetime
import os


def analyze_bumps_v2(
    input_path="imu_data.csv",
    output_path="imu_bump_results_v2_3.csv",
    summary_path="bump_summary_v2_3.csv",
    save_plot=True
):
    # --- Step 1: Load & basic setup ---
    df = pd.read_csv(input_path)
    df = df.sort_values("t_s").reset_index(drop=True)
    fs = 1 / np.median(np.diff(df["t_s"]))
    print(f"📊 Sampling rate ≈ {fs:.1f} Hz")

    # --- Step 2: Trim first and last 4 s to remove startup/filter artefacts ---
    if len(df) > 0:
        t_start, t_end = df["t_s"].min(), df["t_s"].max()
        df = df[(df["t_s"] >= t_start + 4) & (df["t_s"] <= t_end - 4)].reset_index(drop=True)
        print(f"✂️ Trimmed first and last 4 s (kept {len(df)} samples).")

    # --- Step 3: Filtering ---
    low, high = 0.5 / (fs / 2), 10 / (fs / 2)
    b, a = butter(4, [low, high], btype="band")
    for ax in ["acc_x_mean_c", "acc_y_mean_c", "acc_z_mean_c"]:
        df[f"{ax}_f"] = filtfilt(b, a, df[ax])

    b_g, a_g = butter(4, 5 / (fs / 2), btype="low")
    for g in ["gyro_x", "gyro_y", "gyro_z"]:
        df[f"{g}_f"] = filtfilt(b_g, a_g, df[g])

    # --- Step 4: Kalman filter (Z-axis) ---
    def kalman_filter(z, Q=0.01, R=1):
        x_est, P = 0, 1
        out = []
        for k in z:
            P += Q
            K = P / (P + R)
            x_est += K * (k - x_est)
            P *= (1 - K)
            out.append(x_est)
        return np.array(out)

    df["acc_z_kal"] = kalman_filter(df["acc_z_mean_c_f"])

    # --- Step 5: RMS Energy (0.5 s window) ---
    win = int(fs * 0.5)
    df["rms_z"] = (
        df["acc_z_kal"]
        .rolling(win, center=True)
        .apply(lambda x: np.sqrt(np.mean(x ** 2)), raw=True)
    )

    # --- Step 6: Speed-compensated bump score (Hybrid Strategy E) ---
    # (A) Lateral variance as proxy for speed
    df["acc_y_var"] = df["acc_y_mean_c_f"].rolling(win).var()
    df["acc_y_var"] = df["acc_y_var"].bfill().ffill()
    df["acc_y_var"] = np.maximum(df["acc_y_var"], 1e-3)

    # (D) Vertical impulse ∫|a_z|dt
    df["az_abs"] = np.abs(df["acc_z_kal"])
    df["impulse_z"] = df["az_abs"].rolling(win).sum() / fs

    # (E) Combined score
    df["bump_score"] = df["impulse_z"] / np.sqrt(df["acc_y_var"])

    # --- Step 7: Peak detection ---
    mean_b, std_b = df["bump_score"].mean(), df["bump_score"].std()
    threshold = mean_b + 3 * std_b
    peaks, _ = find_peaks(df["bump_score"], height=threshold, distance=int(fs * 0.5))

    df["bump_flag"] = 0
    df.loc[peaks, "bump_flag"] = 1
    df["bump_rejection_reason"] = ""

    # --- Step 8: Turn rejection tracking ---
    gyro_thresh = 0.17
    df["turning"] = np.abs(df["gyro_z_f"]) > gyro_thresh
    turning_bumps = df[(df["bump_flag"] == 1) & (df["turning"])].index
    df.loc[turning_bumps, "bump_rejection_reason"] = "rejected_turning"
    df.loc[turning_bumps, "bump_flag"] = 0
    print(f"🚫 {len(turning_bumps)} bumps rejected due to turning (|gyro_z|>{gyro_thresh})")

    # --- Step 9: Severity classification ---
    df["bump_severity"] = pd.cut(
        df["bump_score"],
        bins=[0, mean_b + 2 * std_b, mean_b + 3 * std_b, np.inf],
        labels=["Mild", "Moderate", "Severe"],
    )

    # --- Step 10: Save detailed results ---
    df.to_csv(output_path, index=False)
    print(f"✅ Results saved → {output_path}")

    # --- Step 11: Summarize bumps ---
    bumps = []
    in_bump, bump_id = False, 0
    for i in range(len(df)):
        if df.loc[i, "bump_flag"] == 1 and not in_bump:
            in_bump, bump_id, start_t = True, bump_id + 1, df.loc[i, "t_s"]
        elif df.loc[i, "bump_flag"] == 0 and in_bump:
            in_bump = False
            end_t = df.loc[i - 1, "t_s"]
            seg = df[(df["t_s"] >= start_t) & (df["t_s"] <= end_t)]
            pk = seg["bump_score"].idxmax()
            bumps.append(
                {
                    "bump_id": bump_id,
                    "start_time_s": start_t,
                    "end_time_s": end_t,
                    "duration_s": end_t - start_t,
                    "peak_time_s": df.loc[pk, "t_s"],
                    "peak_score": df.loc[pk, "bump_score"],
                    "severity": df.loc[pk, "bump_severity"],
                    "turning": bool(df.loc[pk, "turning"]),
                    "rejection_reason": df.loc[pk, "bump_rejection_reason"],
                }
            )

    pd.DataFrame(bumps).to_csv(summary_path, index=False)
    print(f"✅ Summary saved → {summary_path}")

    # --- Step 12: Plot results ---
    plt.figure(figsize=(10, 4))
    plt.plot(df["t_s"], df["bump_score"], color="steelblue", label="Speed-comp. Score")

    accepted = df[df["bump_flag"] == 1]
    plt.scatter(accepted["t_s"], accepted["bump_score"], color="red", label="Detected Bumps")

    rejected = df[df["bump_rejection_reason"] == "rejected_turning"]
    if not rejected.empty:
        plt.scatter(
            rejected["t_s"],
            rejected["bump_score"],
            color="orange",
            edgecolors="black",
            label="Rejected (Turning)",
        )

    plt.axhline(threshold, color="orange", ls="--", label="Threshold")
    plt.xlabel("Time (s)")
    plt.ylabel("Bump Score (m/s²·s)")
    plt.legend()
    plt.tight_layout()

    if save_plot:
        ts = datetime.now().strftime("%Y%m%d_%H%M%S")
        out_png = f"bump_plot_v2_3_{ts}.png"
        plt.savefig(out_png, dpi=300)
        print(f"🖼️ Plot saved → {os.path.abspath(out_png)}")

    plt.show()
    return output_path, summary_path
