import { useState, useEffect, useRef } from 'react';
import { Card } from './ui/card';
import { Button } from './ui/button';
import { Label } from './ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Progress } from './ui/progress';
import { RoadSegment } from '../types';
import { Upload, Video, MapPin, Activity, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { pipelineApi, PipelineUploadResult } from '../api/pipeline';
import { segmentApi } from '../api/segments';

export function UploadPage() {
  const [segments, setSegments] = useState<RoadSegment[]>([]);
  const [selectedSegmentId, setSelectedSegmentId] = useState<string>('');
  const [vehicleId, setVehicleId] = useState<string>('1');


  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [gpxFile, setGpxFile] = useState<File | null>(null);
  const [imuFile, setImuFile] = useState<File | null>(null);

 
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadResult, setUploadResult] = useState<PipelineUploadResult | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const [pipelineStatus, setPipelineStatus] = useState<'connected' | 'disconnected' | 'checking'>('checking');


  const videoInputRef = useRef<HTMLInputElement>(null);
  const gpxInputRef = useRef<HTMLInputElement>(null);
  const imuInputRef = useRef<HTMLInputElement>(null);


  useEffect(() => {
    async function loadSegments() {
      try {
        const data = await segmentApi.getAll();
        setSegments(data);
      } catch (error) {
        console.error('Failed to load segments:', error);
        toast.error('Failed to load road segments');
      }
    }
    loadSegments();
  }, []);

  // Check pipeline status
  useEffect(() => {
    async function checkStatus() {
      try {
        const status = await pipelineApi.getStatus();
        setPipelineStatus(status.status);
      } catch {
        setPipelineStatus('disconnected');
      }
    }
    checkStatus();

    // Check every 30 seconds
    const interval = setInterval(checkStatus, 30000);
    return () => clearInterval(interval);
  }, []);

  const handleFileChange = (
    event: React.ChangeEvent<HTMLInputElement>,
    setter: React.Dispatch<React.SetStateAction<File | null>>
  ) => {
    const file = event.target.files?.[0];
    if (file) {
      setter(file);
    }
  };

  const resetForm = () => {
    setVideoFile(null);
    setGpxFile(null);
    setImuFile(null);
    setSelectedSegmentId('');
    setUploadProgress(0);
    setUploadResult(null);
    setUploadError(null);

    if (videoInputRef.current) videoInputRef.current.value = '';
    if (gpxInputRef.current) gpxInputRef.current.value = '';
    if (imuInputRef.current) imuInputRef.current.value = '';
  };

  const handleUpload = async () => {
    if (!videoFile) {
      toast.error('Please select a video file');
      return;
    }
    if (!gpxFile) {
      toast.error('Please select a GPX file');
      return;
    }
    if (!imuFile) {
      toast.error('Please select an IMU CSV file');
      return;
    }
    if (!selectedSegmentId) {
      toast.error('Please select a road segment');
      return;
    }

    setIsUploading(true);
    setUploadProgress(0);
    setUploadResult(null);
    setUploadError(null);

    try {
      const result = await pipelineApi.upload(
        videoFile,
        gpxFile,
        imuFile,
        parseInt(selectedSegmentId),
        parseInt(vehicleId),
        (progress) => setUploadProgress(progress)
      );

      setUploadResult(result);
      toast.success(`Processing complete! ${result.data.defects_created} defects detected.`);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Upload failed';
      setUploadError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setIsUploading(false);
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <div className="p-6 space-y-6">

      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-[#7D6A55]">Upload Inspection Data</h2>
          <p className="text-gray-600 mt-1">
            Upload video, GPS, and IMU data for road defect detection
          </p>
        </div>
        <Card className="p-4 bg-blue-50 border-blue-200">
          <h4 className="font-medium text-blue-900 mb-2">File Requirements</h4>
          <ul className="text-sm text-blue-800 space-y-1">
            <li>• <strong>Video:</strong> MP4 format, dashcam footage of road inspection</li>
            <li>• <strong>GPX:</strong> GPS track recorded during the inspection drive</li>
            <li>• <strong>IMU CSV:</strong> Accelerometer data with columns: timestamp, accel_x, accel_y, accel_z</li>
          </ul>
        </Card>
        <div className="flex items-center gap-2">
          <span className={`w-2 h-2 rounded-full ${
            pipelineStatus === 'connected' ? 'bg-green-500' :
            pipelineStatus === 'disconnected' ? 'bg-red-500' :
            'bg-yellow-500'
          }`} />
          <span className="text-sm text-gray-500">
            Pipeline: {pipelineStatus}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Upload Form */}
        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-4">Upload Files</h3>

          <div className="space-y-4">
            {/* Road Segment Selection */}
            <div className="space-y-2">
              <Label>Road Segment *</Label>
              <Select value={selectedSegmentId} onValueChange={setSelectedSegmentId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select road segment" />
                </SelectTrigger>
                <SelectContent>
                  {segments.map((segment) => (
                    <SelectItem key={segment.id} value={segment.id}>
                      {segment.name} ({segment.zone})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

          
            <div className="space-y-2">
              <Label>Vehicle ID</Label>
              <Select value={vehicleId} onValueChange={setVehicleId}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">Vehicle 1</SelectItem>
                  <SelectItem value="2">Vehicle 2</SelectItem>
                  <SelectItem value="3">Vehicle 3</SelectItem>
                </SelectContent>
              </Select>
            </div>

            
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Video className="h-4 w-4" />
                Video File (MP4) *
              </Label>
              <input
                ref={videoInputRef}
                type="file"
                accept=".mp4,.avi,.mov,.mkv"
                onChange={(e) => handleFileChange(e, setVideoFile)}
                className="w-full border rounded-md p-2 text-sm"
              />
              {videoFile && (
                <p className="text-xs text-gray-500">
                  {videoFile.name} ({formatFileSize(videoFile.size)})
                </p>
              )}
            </div>

          
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <MapPin className="h-4 w-4" />
                GPS Track (GPX) *
              </Label>
              <input
                ref={gpxInputRef}
                type="file"
                accept=".gpx"
                onChange={(e) => handleFileChange(e, setGpxFile)}
                className="w-full border rounded-md p-2 text-sm"
              />
              {gpxFile && (
                <p className="text-xs text-gray-500">
                  {gpxFile.name} ({formatFileSize(gpxFile.size)})
                </p>
              )}
            </div>

           
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Activity className="h-4 w-4" />
                IMU Data (CSV) *
              </Label>
              <input
                ref={imuInputRef}
                type="file"
                accept=".csv"
                onChange={(e) => handleFileChange(e, setImuFile)}
                className="w-full border rounded-md p-2 text-sm"
              />
              {imuFile && (
                <p className="text-xs text-gray-500">
                  {imuFile.name} ({formatFileSize(imuFile.size)})
                </p>
              )}
            </div>

            {/* Upload Progress */}
            {isUploading && (
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span>Uploading and processing...</span>
                  <span>{Math.round(uploadProgress)}%</span>
                </div>
                <Progress value={uploadProgress} />
              </div>
            )}

            
            <div className="flex gap-2 pt-4">
              <Button
                onClick={handleUpload}
                disabled={isUploading || pipelineStatus === 'disconnected'}
                className="flex-1 bg-[#7D6A55] hover:bg-[#6A5A47]"
              >
                {isUploading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Processing...
                  </>
                ) : (
                  <>
                    <Upload className="h-4 w-4 mr-2" />
                    Upload & Process
                  </>
                )}
              </Button>
              <Button
                variant="outline"
                onClick={resetForm}
                disabled={isUploading}
              >
                Reset
              </Button>
            </div>
          </div>
        </Card>

        {/* Results */}
        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-4">Processing Results</h3>

          {!uploadResult && !uploadError && !isUploading && (
            <div className="flex flex-col items-center justify-center h-64 text-gray-400">
              <Upload className="h-12 w-12 mb-4" />
              <p>Upload files to see results</p>
            </div>
          )}

          {isUploading && (
            <div className="flex flex-col items-center justify-center h-64 text-gray-500">
              <Loader2 className="h-12 w-12 mb-4 animate-spin" />
              <p>Processing video...</p>
              <p className="text-sm text-gray-400 mt-2">
                This may take a few minutes depending on video length
              </p>
            </div>
          )}

          {uploadError && (
            <div className="flex flex-col items-center justify-center h-64 text-red-500">
              <AlertCircle className="h-12 w-12 mb-4" />
              <p className="font-medium">Processing Failed</p>
              <p className="text-sm text-gray-500 mt-2 text-center">{uploadError}</p>
            </div>
          )}

          {uploadResult && (
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-green-600">
                <CheckCircle2 className="h-5 w-5" />
                <span className="font-medium">Processing Complete</span>
              </div>

              {/* Summary Stats */}
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-gray-50 rounded-lg p-3">
                  <p className="text-sm text-gray-500">Defects Detected</p>
                  <p className="text-2xl font-bold text-[#7D6A55]">
                    {uploadResult.data.defects_created}
                  </p>
                </div>
                <div className="bg-gray-50 rounded-lg p-3">
                  <p className="text-sm text-gray-500">IRI Value</p>
                  <p className="text-2xl font-bold text-[#7D6A55]">
                    {uploadResult.data.iri_measurement.value.toFixed(2)}
                  </p>
                </div>
                <div className="bg-gray-50 rounded-lg p-3">
                  <p className="text-sm text-gray-500">Frames Processed</p>
                  <p className="text-lg font-semibold">
                    {uploadResult.data.processing_info.processed_frames}
                  </p>
                </div>
                <div className="bg-gray-50 rounded-lg p-3">
                  <p className="text-sm text-gray-500">Processing FPS</p>
                  <p className="text-lg font-semibold">
                    {uploadResult.data.processing_info.target_fps}
                  </p>
                </div>
              </div>

              {/* Defects List */}
              {uploadResult.data.defects.length > 0 && (
                <div className="mt-4">
                  <h4 className="font-medium mb-2">Detected Defects</h4>
                  <div className="max-h-48 overflow-y-auto space-y-2">
                    {uploadResult.data.defects.map((defect) => (
                      <div
                        key={defect.id}
                        className="flex items-center justify-between bg-gray-50 rounded p-2 text-sm"
                      >
                        <div className="flex items-center gap-2">
                          <span className="capitalize font-medium">{defect.type}</span>
                          <span className={`text-xs px-2 py-0.5 rounded ${
                            defect.severity === 'critical' ? 'bg-red-100 text-red-700' :
                            defect.severity === 'high' ? 'bg-orange-100 text-orange-700' :
                            defect.severity === 'moderate' ? 'bg-yellow-100 text-yellow-700' :
                            'bg-gray-100 text-gray-700'
                          }`}>
                            {defect.severity}
                          </span>
                        </div>
                        <span className="text-xs text-gray-500">
                          {defect.coordinates.lat.toFixed(4)}, {defect.coordinates.lng.toFixed(4)}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* New Upload Button */}
              <Button
                onClick={resetForm}
                variant="outline"
                className="w-full mt-4"
              >
                Upload Another
              </Button>
            </div>
          )}
        </Card>
      </div>

    </div>
  );
}
