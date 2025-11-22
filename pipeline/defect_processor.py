import cv2
import numpy as np
import os
import tempfile
import base64
from datetime import datetime, timedelta
from typing import Optional
from ultralytics import YOLO
import supervision as sv

from utils.gpx_parser import parse_gpx, get_gps_at_frame
from utils.imu_analyzer import parse_imu_csv, calculate_iri, calculate_severity_weight, get_imu_at_frame


DEFECT_CLASSES = {
    0: 'pothole',
    1: 'crack',
    2: 'marking',
    3: 'roughness'
}

SEVERITY_THRESHOLDS = {
    'critical': 0.9,
    'high': 0.7,
    'moderate': 0.5,
    'low': 0.0
}

DEFAULT_ZONE_POLYGON = np.array([[1, 928], [993, 880], [1919, 915], [1917, 662], [1, 644]])



def determine_severity(confidence: float, imu_weight: float) -> str:
    
   
    score = confidence * imu_weight

    if score >= SEVERITY_THRESHOLDS['critical']:
        return 'critical'
    elif score >= SEVERITY_THRESHOLDS['high']:
        return 'high'
    elif score >= SEVERITY_THRESHOLDS['moderate']:
        return 'moderate'
    else:
        return 'low'


def estimate_defect_size(bbox: np.ndarray, frame_width: int, frame_height: int) -> float:
    
    # bbox dimensions as fraction of frame
    bbox_width = (bbox[2] - bbox[0]) / frame_width
    bbox_height = (bbox[3] - bbox[1]) / frame_height


    estimated_width_m = bbox_width * 3.0
    estimated_height_m = bbox_height * 2.0

    # average dimension and convert to cm
    size_cm = ((estimated_width_m + estimated_height_m) / 2) * 100

    return round(size_cm, 2)


def frame_to_base64(frame: np.ndarray) -> str:
   
    _, buffer = cv2.imencode('.jpg', frame, [cv2.IMWRITE_JPEG_QUALITY, 85])
    return base64.b64encode(buffer).decode('utf-8')


def process_video(
    video_path: str,
    gpx_content: str,
    imu_content: str,
    segment_id: int,
    vehicle_id: int = 1,
    weights_path: str = 'yolov8s.pt',
    device: str = 'cpu',
    confidence_threshold: float = 0.3,
    iou_threshold: float = 0.7,
    target_fps: int = 10,
    save_images: bool = True
) -> dict:
   
    #GPS and IMU data
    gps_coordinates = parse_gpx(gpx_content)
    imu_data = parse_imu_csv(imu_content)

    model = YOLO(weights_path)

    video_info = sv.VideoInfo.from_video_path(video_path)
    original_fps = video_info.fps
    frame_width = video_info.width
    frame_height = video_info.height
    total_frames = video_info.total_frames

    # TODO: REMOVE AFTER
    # annotated_video_path = "annotated_output.mp4"
    # writer = cv2.VideoWriter(
    #     annotated_video_path,
    #     cv2.VideoWriter_fourcc(*"mp4v"),
    #     target_fps,
    #     (frame_width, frame_height)
    # )

    #frame skip 
    frame_skip = max(1, int(original_fps / target_fps))

    # tracker
    tracker = sv.ByteTrack(minimum_matching_threshold=0.5)

    # zone
    zone = sv.PolygonZone(
        polygon=DEFAULT_ZONE_POLYGON,
        triggering_anchors=(sv.Position.CENTER,),
    )

    # Track detections
    detections_by_tracker = {}  # tracker_id -> detection info

    cap = cv2.VideoCapture(video_path)
    frame_number = 0
    processed_count = 0

    video_start_time = None
    timed_gps = [c for c in gps_coordinates if c['timestamp'] is not None]
    if timed_gps:
        video_start_time = timed_gps[0]['timestamp']
    else:
        timed_imu = [d for d in imu_data if d['timestamp'] is not None]
        if timed_imu:
            video_start_time = timed_imu[0]['timestamp']
        else:
            video_start_time = datetime.now()

    

    while True:
        ret, frame = cap.read()
        if not ret:
            break

        annotated_frame = frame.copy()

        # Skip frames
        if frame_number % frame_skip != 0:
            frame_number += 1
            continue

        results = model(frame, verbose=False, device=device, conf=confidence_threshold)[0]
        detections = sv.Detections.from_ultralytics(results)
        detections = detections.with_nms(threshold=iou_threshold)
        detections = tracker.update_with_detections(detections)

        # Filter road zone
        detections = detections[zone.trigger(detections)]

        current_time = video_start_time + timedelta(seconds=frame_number / original_fps)

        # Process detection
        for i in range(len(detections)):
            tracker_id = detections.tracker_id[i]
            class_id = detections.class_id[i]
            confidence = detections.confidence[i]
            bbox = detections.xyxy[i]

            defect_type = DEFECT_CLASSES.get(class_id, 'pothole')

           
            x1, y1, x2, y2 = map(int, bbox)
            cv2.rectangle(annotated_frame, (x1, y1), (x2, y2), (0, 255, 0), 2)
            cv2.putText(
                annotated_frame,
                f"{defect_type} {confidence:.2f}",
                (x1, y1 - 10),
                cv2.FONT_HERSHEY_SIMPLEX,
                0.5,
                (0, 255, 0),
                2
            )

            if tracker_id not in detections_by_tracker:
                gps = get_gps_at_frame(gps_coordinates, frame_number, original_fps, video_start_time)

                image_data = frame_to_base64(annotated_frame) if save_images else None

                detections_by_tracker[tracker_id] = {
                    'type': defect_type,
                    'confidence': float(confidence),
                    'first_frame': frame_number,
                    'last_frame': frame_number,
                    'first_time': current_time,
                    'last_time': current_time,
                    'bbox': bbox,
                    'gps': gps,
                    'image_data': image_data,
                    'max_confidence': float(confidence)
                }
            else:
                detection = detections_by_tracker[tracker_id]
                detection['last_frame'] = frame_number
                detection['last_time'] = current_time

                if confidence > detection['max_confidence']:
                    detection['max_confidence'] = float(confidence)
                    detection['bbox'] = bbox
                    detection['image_data'] = frame_to_base64(annotated_frame) if save_images else None

        # write this frame regardless of detections
        # writer.write(annotated_frame)

        frame_number += 1
        processed_count += 1

    cap.release()
    #TODO: remove after
    # writer.release()

    iri_value = calculate_iri(imu_data)

    defects = []

    for tracker_id, detection in detections_by_tracker.items():
        imu_weight = calculate_severity_weight(
            imu_data,
            detection['first_time'],
            detection['last_time']
        )

        severity = determine_severity(detection['max_confidence'], imu_weight)


        size = estimate_defect_size(
            detection['bbox'],
            frame_width,
            frame_height
        )

        # gPS coordinates
        gps = detection['gps']
        if gps is None:
            # Use first available GPS as fallback
            if gps_coordinates:
                gps = {'lat': gps_coordinates[0]['lat'], 'lng': gps_coordinates[0]['lng']}
            else:
                gps = {'lat': 0.0, 'lng': 0.0}

        defects.append({
            'type': detection['type'],
            'severity': severity,
            'status': 'for_checking',
            'priority': 'normal',
            'segment_id': segment_id,
            'vehicle_id': vehicle_id,
            'coordinates_lat': gps['lat'],
            'coordinates_lng': gps['lng'],
            'size': size,
            'detected_at': detection['first_time'].isoformat(),
            'image_base64': detection['image_data']
        })

    
    response = {
        'defects': defects,
        'iri_measurement': {
            'segment_id': segment_id,
            'iri_value': iri_value,
            'vehicle_id': vehicle_id,
            'measured_at': datetime.now().isoformat()
        },
        'coverage_log': {
            'segment_id': segment_id,
            'vehicle_id': vehicle_id,
            'covered_at': datetime.now().isoformat(),
            'sweep_frequency': 1
        },
        'processing_info': {
            'total_frames': total_frames,
            'processed_frames': processed_count,
            'original_fps': original_fps,
            'target_fps': target_fps,
            'detections_count': len(defects)
        }
    }

    return response
