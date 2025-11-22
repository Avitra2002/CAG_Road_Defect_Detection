import csv
import io
import numpy as np
from datetime import datetime
from typing import Optional


def parse_imu_csv(csv_content: str) -> list[dict]:
    reader = csv.DictReader(io.StringIO(csv_content))

    data = []

    for row in reader:
        entry = {}

        timestamp = None
        for key in ['timestamp', 'time', 'Time', 'Timestamp', 't']:
            if key in row:
                try:
                    ts = row[key].strip()
                    if 'T' in ts:
                        timestamp = datetime.fromisoformat(ts.replace('Z', '+00:00'))
                    elif '/' in ts or '-' in ts:
                        for fmt in ['%Y-%m-%d %H:%M:%S.%f', '%Y-%m-%d %H:%M:%S', '%m/%d/%Y %H:%M:%S']:
                            try:
                                timestamp = datetime.strptime(ts, fmt)
                                break
                            except ValueError:
                                continue
                    else:
                       
                        ts_num = float(ts)
                        if ts_num > 1e12:
                            ts_num = ts_num / 1000
                        timestamp = datetime.fromtimestamp(ts_num)
                except (ValueError, OSError):
                    pass
                break

        entry['timestamp'] = timestamp

        # Parse acceleration (m/s^2)
        for ax_key in ['accel_x', 'acc_x', 'ax', 'Accel_X', 'AccX']:
            if ax_key in row:
                entry['accel_x'] = float(row[ax_key])
                break
        else:
            entry['accel_x'] = 0.0

        for ay_key in ['accel_y', 'acc_y', 'ay', 'Accel_Y', 'AccY']:
            if ay_key in row:
                entry['accel_y'] = float(row[ay_key])
                break
        else:
            entry['accel_y'] = 0.0

        for az_key in ['accel_z', 'acc_z', 'az', 'Accel_Z', 'AccZ']:
            if az_key in row:
                entry['accel_z'] = float(row[az_key])
                break
        else:
            entry['accel_z'] = 0.0

        # Parse gyroscope (rad/s or deg/s)
        for gx_key in ['gyro_x', 'gx', 'Gyro_X', 'GyroX']:
            if gx_key in row:
                entry['gyro_x'] = float(row[gx_key])
                break
        else:
            entry['gyro_x'] = 0.0

        for gy_key in ['gyro_y', 'gy', 'Gyro_Y', 'GyroY']:
            if gy_key in row:
                entry['gyro_y'] = float(row[gy_key])
                break
        else:
            entry['gyro_y'] = 0.0

        for gz_key in ['gyro_z', 'gz', 'Gyro_Z', 'GyroZ']:
            if gz_key in row:
                entry['gyro_z'] = float(row[gz_key])
                break
        else:
            entry['gyro_z'] = 0.0

        data.append(entry)

    return data


def calculate_iri(imu_data: list[dict], segment_length_km: float = 1.0) -> float:
    
    if not imu_data:
        return 0.0

    # vertical acc
    z_accels = np.array([d['accel_z'] for d in imu_data])

    z_accels_adjusted = z_accels - np.mean(z_accels)

    # RMS of vertical acceleration
    rms_accel = np.sqrt(np.mean(z_accels_adjusted ** 2))

    calibration_factor = 0.8

    iri = rms_accel * calibration_factor

    iri = max(0.0, min(20.0, iri))

    return round(iri, 2)


def get_roughness_at_time(imu_data: list[dict], target_time: datetime, window_seconds: float = 1.0) -> float:
    if not imu_data:
        return 0.0

    # Filter data within time window
    from datetime import timedelta

    half_window = timedelta(seconds=window_seconds / 2)
    start_time = target_time - half_window
    end_time = target_time + half_window

    window_data = [
        d for d in imu_data
        if d['timestamp'] is not None and start_time <= d['timestamp'] <= end_time
    ]

    if not window_data:
        return 0.0

    # RMS of vertical acceleration
    z_accels = np.array([d['accel_z'] for d in window_data])
    z_accels_adjusted = z_accels - np.mean(z_accels)
    rms = np.sqrt(np.mean(z_accels_adjusted ** 2))

    return round(rms, 4)


def calculate_severity_weight(imu_data: list[dict], start_time: datetime, end_time: datetime) -> float:

    if not imu_data:
        return 1.0

    # Filter data within time window
    window_data = [
        d for d in imu_data
        if d['timestamp'] is not None and start_time <= d['timestamp'] <= end_time
    ]

    if len(window_data) < 2:
        return 1.0

    # variance of all acceleration components
    x_accels = np.array([d['accel_x'] for d in window_data])
    y_accels = np.array([d['accel_y'] for d in window_data])
    z_accels = np.array([d['accel_z'] for d in window_data])

    magnitudes = np.sqrt(x_accels**2 + y_accels**2 + z_accels**2)
    variance = np.var(magnitudes)

    # Map variance to weight (calibrated for typical values)
    # Low variance (< 1): weight = 0.5-1.0 (mild)
    # Medium variance (1-5): weight = 1.0-1.5
    # High variance (> 5): weight = 1.5-2.0 (severe)

    if variance < 1:
        weight = 0.5 + 0.5 * variance
    elif variance < 5:
        weight = 1.0 + 0.125 * (variance - 1)
    else:
        weight = 1.5 + 0.1 * min(variance - 5, 5)

    return round(min(2.0, max(0.5, weight)), 2)


def get_imu_at_frame(imu_data: list[dict], frame_number: int, fps: float, video_start_time: Optional[datetime] = None) -> Optional[dict]:
   
    if not imu_data:
        return None

    time_offset_seconds = frame_number / fps

  
    if video_start_time is None:
        timed_data = [d for d in imu_data if d['timestamp'] is not None]
        if timed_data:
            video_start_time = timed_data[0]['timestamp']
        else:
            # No timestamps, use index-based lookup
            sample_rate = len(imu_data) / (frame_number / fps) if frame_number > 0 else 100
            idx = min(int(time_offset_seconds * sample_rate), len(imu_data) - 1)
            return imu_data[idx]

    # closest IMU reading to target time
    from datetime import timedelta
    target_time = video_start_time + timedelta(seconds=time_offset_seconds)

    closest = None
    min_diff = float('inf')

    for reading in imu_data:
        if reading['timestamp'] is None:
            continue
        diff = abs((reading['timestamp'] - target_time).total_seconds())
        if diff < min_diff:
            min_diff = diff
            closest = reading

    return closest
