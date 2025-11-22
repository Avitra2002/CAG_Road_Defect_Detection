const BASE_URL =
  window.location.hostname === "localhost"
    ? "http://localhost:3000"
    : "http://backend:3000";

export interface PipelineUploadResult {
  success: boolean;
  message: string;
  data: {
    defects_created: number;
    defects: Array<{
      id: number;
      type: string;
      severity: string;
      coordinates: {
        lat: number;
        lng: number;
      };
    }>;
    iri_measurement: {
      id: number;
      value: number;
    };
    processing_info: {
      total_frames: number;
      processed_frames: number;
      original_fps: number;
      target_fps: number;
      detections_count: number;
    };
  };
}

export interface PipelineStatus {
  status: "connected" | "disconnected";
  pipeline?: {
    status: string;
    service: string;
    version: string;
  };
  error?: string;
}

export const pipelineApi = {
  
   //Upload video, GPX, and IMU files for processing
   
  async upload(
    video: File,
    gpx: File,
    imu: File,
    segmentId: number,
    vehicleId: number = 1,
    onProgress?: (progress: number) => void
  ): Promise<PipelineUploadResult> {
    const formData = new FormData();
    formData.append("video", video);
    formData.append("gpx", gpx);
    formData.append("imu", imu);
    formData.append("segment_id", segmentId.toString());
    formData.append("vehicle_id", vehicleId.toString());

    // Use XMLHttpRequest for progress tracking
    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();

      xhr.upload.addEventListener("progress", (event) => {
        if (event.lengthComputable && onProgress) {
          const progress = (event.loaded / event.total) * 100;
          onProgress(progress);
        }
      });

      xhr.addEventListener("load", () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          try {
            const result = JSON.parse(xhr.responseText);
            resolve(result);
          } catch {
            reject(new Error("Invalid response from server"));
          }
        } else {
          reject(new Error(`Upload failed: ${xhr.statusText}`));
        }
      });

      xhr.addEventListener("error", () => {
        reject(new Error("Network error during upload"));
      });

      xhr.addEventListener("abort", () => {
        reject(new Error("Upload aborted"));
      });

      xhr.open("POST", `${BASE_URL}/pipeline/upload`);
      xhr.send(formData);
    });
  },

  
  //Check pipeline microservice status
   
  async getStatus(): Promise<PipelineStatus> {
    const res = await fetch(`${BASE_URL}/pipeline/status`);
    return res.json();
  },
};
