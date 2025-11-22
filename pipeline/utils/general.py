import json
from collections.abc import Generator

import cv2
import numpy as np


def load_zones_config(file_path: str) -> list[np.ndarray]:
    
    with open(file_path) as file:
        data = json.load(file)
        return [np.array(polygon, np.int32) for polygon in data]


def find_in_list(array: np.ndarray, search_list: list[int]) -> np.ndarray:
    
    if not search_list:
        return np.ones(array.shape, dtype=bool)
    else:
        return np.isin(array, search_list)


def get_stream_frames_generator(rtsp_url: str) -> Generator[np.ndarray, None, None]:
    
    cap = cv2.VideoCapture(rtsp_url)
    if not cap.isOpened():
        raise Exception("Error: Could not open video stream.")

    try:
        while True:
            ret, frame = cap.read()
            if not ret:
                print("End of stream or error reading frame.")
                break
            yield frame
    finally:
        cap.release()