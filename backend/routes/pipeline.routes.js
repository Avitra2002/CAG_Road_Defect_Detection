import express from "express";
import { pool } from "../db.js";
import multer from "multer";
import FormData from "form-data";
import fetch from "node-fetch";

const router = express.Router();

// multer for file uploads
const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: {
    fileSize: 700 * 1024 * 1024,
  },
});

const PIPELINE_URL = process.env.PIPELINE_URL || "http://localhost:8000";


router.post(
  "/upload",
  upload.fields([
    { name: "video", maxCount: 1 },
    { name: "gpx", maxCount: 1 },
    { name: "imu", maxCount: 1 },
  ]),
  async (req, res) => {
    try {
      const { segment_id, vehicle_id } = req.body;

      if (!req.files.video || !req.files.gpx || !req.files.imu) {
        return res.status(400).json({
          error: "Missing required files: video, gpx, and imu are required",
        });
      }

      if (!segment_id) {
        return res.status(400).json({
          error: "segment_id is required",
        });
      }

      //form data for pipeline microservice
      const formData = new FormData();
      formData.append("video", req.files.video[0].buffer, {
        filename: req.files.video[0].originalname,
        contentType: req.files.video[0].mimetype,
      });
      formData.append("gpx", req.files.gpx[0].buffer, {
        filename: req.files.gpx[0].originalname,
        contentType: "application/gpx+xml",
      });
      formData.append("imu", req.files.imu[0].buffer, {
        filename: req.files.imu[0].originalname,
        contentType: "text/csv",
      });
      formData.append("segment_id", segment_id);
      formData.append("vehicle_id", vehicle_id || "1");

      // Call pipeline microservice
      const pipelineResponse = await fetch(`${PIPELINE_URL}/process`, {
        method: "POST",
        body: formData,
        headers: formData.getHeaders(),
      });

      if (!pipelineResponse.ok) {
        const errorText = await pipelineResponse.text();
        return res.status(pipelineResponse.status).json({
          error: `Pipeline processing failed: ${errorText}`,
        });
      }

      const pipelineResult = await pipelineResponse.json();

      
      const client = await pool.connect();

      try {
        await client.query("BEGIN");

        // 1. Insert defects
        const insertedDefects = [];
        for (const defect of pipelineResult.defects) {
          
          const defectResult = await client.query(
            `INSERT INTO defects (
              type, severity, status, priority, segment_id, vehicle_id,
              coordinates_lat, coordinates_lng, size, detected_at
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
            RETURNING id`,
            [
              defect.type,
              defect.severity,
              defect.status,
              defect.priority || "normal",
              defect.segment_id,
              defect.vehicle_id,
              defect.coordinates_lat,
              defect.coordinates_lng,
              defect.size,
              defect.detected_at,
            ]
          );

          const defectId = defectResult.rows[0].id;

          // Insert defect image if available
          if (defect.image_base64) {
            // Store as data URI for now
            const imageUrl = `data:image/jpeg;base64,${defect.image_base64}`;
            await client.query(
              `INSERT INTO defect_images (defect_id, image_url, image_type)
               VALUES ($1, $2, $3)`,
              [defectId, imageUrl, "detected"]
            );

            // Update primary image_url on defect
            await client.query(
              `UPDATE defects SET image_url = $1 WHERE id = $2`,
              [imageUrl, defectId]
            );
          }

          insertedDefects.push({
            id: defectId,
            ...defect,
          });
        }

        // 2. Insert IRI measurement
        const iriResult = await client.query(
          `INSERT INTO iri_measurements (
            segment_id, iri_value, uploaded_by_vehicle_id, measured_at
          ) VALUES ($1, $2, $3, $4)
          RETURNING id`,
          [
            pipelineResult.iri_measurement.segment_id,
            pipelineResult.iri_measurement.iri_value,
            pipelineResult.iri_measurement.vehicle_id,
            pipelineResult.iri_measurement.measured_at,
          ]
        );

        // Update segment's IRI and last_inspected
        await client.query(
          `UPDATE road_segments
           SET iri = $1, last_inspected = $2, frequency_count = COALESCE(frequency_count, 0) + 1
           WHERE id = $3`,
          [
            pipelineResult.iri_measurement.iri_value,
            pipelineResult.iri_measurement.measured_at,
            pipelineResult.iri_measurement.segment_id,
          ]
        );

        // 3. Insert coverage log
        await client.query(
          `INSERT INTO coverage_logs (
            vehicle_id, segment_id, covered_at, sweep_frequency
          ) VALUES ($1, $2, $3, $4)`,
          [
            pipelineResult.coverage_log.vehicle_id,
            pipelineResult.coverage_log.segment_id,
            pipelineResult.coverage_log.covered_at,
            pipelineResult.coverage_log.sweep_frequency,
          ]
        );

        await client.query("COMMIT");

        // Return success response
        res.json({
          success: true,
          message: "Processing complete",
          data: {
            defects_created: insertedDefects.length,
            defects: insertedDefects.map((d) => ({
              id: d.id,
              type: d.type,
              severity: d.severity,
              coordinates: {
                lat: d.coordinates_lat,
                lng: d.coordinates_lng,
              },
            })),
            iri_measurement: {
              id: iriResult.rows[0].id,
              value: pipelineResult.iri_measurement.iri_value,
            },
            processing_info: pipelineResult.processing_info,
          },
        });
      } catch (dbError) {
        await client.query("ROLLBACK");
        throw dbError;
      } finally {
        client.release();
      }
    } catch (error) {
      console.error("Pipeline upload error:", error);
      res.status(500).json({
        error: `Failed to process upload: ${error.message}`,
      });
    }
  }
);


router.get("/status", async (req, res) => {
  try {
    const response = await fetch(`${PIPELINE_URL}/health`);
    const data = await response.json();
    res.json({
      status: "connected",
      pipeline: data,
    });
  } catch (error) {
    res.json({
      status: "disconnected",
      error: error.message,
    });
  }
});

export default router;
