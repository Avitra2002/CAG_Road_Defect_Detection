import os
import tempfile
from fastapi import FastAPI, File, UploadFile, Form, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional

from defect_processor import process_video
import numpy as np

def clean_value(v):
    if isinstance(v, (np.float32, np.float64, np.int32, np.int64)):
        return v.item()
    if isinstance(v, np.ndarray):
        return v.tolist()
    return v

def deep_clean(data):
    if isinstance(data, dict):
        return {k: deep_clean(v) for k, v in data.items()}
    if isinstance(data, list):
        return [deep_clean(v) for v in data]
    return clean_value(data)


app = FastAPI(
    title="Road Safety Pipeline",
    description="Microservice for road defect detection and IRI calculation",
    version="1.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class ProcessingResponse(BaseModel):
    
    defects: list
    iri_measurement: dict
    coverage_log: dict
    processing_info: dict


@app.get("/")
async def root():
    return {"status": "ok", "service": "road-safety-pipeline"}


@app.get("/health")
async def health_check():
    return {
        "status": "healthy",
        "service": "road-safety-pipeline",
        "version": "1.0.0"
    }


@app.post("/process", response_model=ProcessingResponse)
async def process_upload(
    video: UploadFile = File(..., description="MP4 video file"),
    gpx: UploadFile = File(..., description="GPX file with GPS coordinates"),
    imu: UploadFile = File(..., description="CSV file with IMU data"),
    segment_id: int = Form(..., description="Road segment ID"),
    vehicle_id: int = Form(1, description="Vehicle ID"),
    confidence_threshold: float = Form(0.3, description="Detection confidence threshold"),
    target_fps: int = Form(10, description="Target frames per second for processing")
):
    """
    
    1. Receives video, GPX, and IMU files
    2. Runs YOLOv11 inference at specified FPS
    3. Correlates detections with GPS coordinates and IMU data
    4. Calculates IRI measurement for the segment
    5. Returns structured data for database storage
    """
    if not video.filename.lower().endswith(('.mp4', '.avi', '.mov', '.mkv')):
        raise HTTPException(
            status_code=400,
            detail="Video must be MP4, AVI, MOV, or MKV format"
        )

    if not gpx.filename.lower().endswith('.gpx'):
        raise HTTPException(
            status_code=400,
            detail="GPS file must be GPX format"
        )

    if not imu.filename.lower().endswith('.csv'):
        raise HTTPException(
            status_code=400,
            detail="IMU file must be CSV format"
        )

    # temporary files
    temp_dir = tempfile.mkdtemp()
    video_path = os.path.join(temp_dir, "video.mp4")

    try:
        # Save video to temp file
        video_content = await video.read()
        with open(video_path, "wb") as f:
            f.write(video_content)

       
        gpx_content = (await gpx.read()).decode('utf-8')
        imu_content = (await imu.read()).decode('utf-8')

        device = 'cpu'
        
        try:
            import torch
            if torch.cuda.is_available():
                device = 'cuda'
            elif hasattr(torch.backends, 'mps') and torch.backends.mps.is_available():
                device = 'mps'
        except ImportError:
            pass


        weights_path = os.environ.get('YOLO_WEIGHTS', 'weights/road_defects.pt')
        
        custom_weights = os.path.join(os.path.dirname(__file__), 'weights', 'road_defects.pt')
        if os.path.exists(custom_weights):
            weights_path = custom_weights

        
        result = process_video(
            video_path=video_path,
            gpx_content=gpx_content,
            imu_content=imu_content,
            segment_id=segment_id,
            vehicle_id=vehicle_id,
            weights_path=weights_path,
            device=device,
            confidence_threshold=confidence_threshold,
            target_fps=target_fps,
            save_images=True
        )
        cleaned = deep_clean(result)

        return cleaned
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Processing failed: {str(e)}"
        )

    finally:
       
        try:
            if os.path.exists(video_path):
                os.remove(video_path)
            os.rmdir(temp_dir)
        except Exception:
            pass


if __name__ == "__main__":
    import uvicorn
    port = int(os.environ.get("PORT", 8000))
    uvicorn.run(app, host="0.0.0.0", port=port)
