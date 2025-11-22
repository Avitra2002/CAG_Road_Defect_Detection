import express from "express";
import { pool } from "../db.js";

const router = express.Router();


const formatSegment = (seg) => ({
  id: seg.id,
  name: seg.name,
  zone: seg.zone,
  length: Number(seg.length_km),
  iri: Number(seg.iri),
  lastInspected: seg.last_inspected ? new Date(seg.last_inspected) : null,
  isCritical: seg.is_critical,
  frequencyCount: Number(seg.frequency_count ?? 0),
  defectCount: Number(seg.defect_count ?? 0),
  lanes: Number(seg.lanes), 
  coordinates: seg.coordinates || [] 
});


router.get("/", async (req, res) => {
  const query = `
    SELECT 
        rs.*,
        COALESCE(SUM(cl.sweep_frequency), 0) AS frequency_count,

        -- return defect count
        (
            SELECT COUNT(*) 
            FROM defects d 
            WHERE d.segment_id = rs.id
        ) AS defect_count,

        -- always return coordinates as non-null json array
        (
            SELECT COALESCE(
            json_agg(
                json_build_object(
                'lat', c.lat,
                'lng', c.lng
                ) ORDER BY c.order_index
            ),
            '[]'::json
            )
            FROM road_segment_coordinates c
            WHERE c.segment_id = rs.id
        ) AS coordinates

        FROM road_segments rs
        LEFT JOIN coverage_logs cl ON cl.segment_id = rs.id
        GROUP BY rs.id
        ORDER BY rs.id ASC;
    `;

  const { rows } = await pool.query(query);
  res.json(rows.map(formatSegment));
});


router.get("/critical", async (req, res) => {
  const IRI_THRESHOLD = 4.0;

  const query = `
    SELECT 
        rs.*,
        COALESCE(SUM(cl.sweep_frequency), 0) AS frequency_count,
        (
        SELECT json_agg(
            json_build_object(
            'lat', c.lat,
            'lng', c.lng
            ) ORDER BY c.order_index
        )
        FROM road_segment_coordinates c
        WHERE c.segment_id = rs.id
        ) AS coordinates
    FROM road_segments rs
    LEFT JOIN coverage_logs cl ON cl.segment_id = rs.id
    WHERE rs.iri >= $1
    GROUP BY rs.id
    ORDER BY rs.iri DESC;
    `;

  const { rows } = await pool.query(query, [IRI_THRESHOLD]);
  res.json(rows.map(formatSegment));
});


router.get("/iri-average", async (req, res) => {
  const query = `SELECT AVG(iri) AS avg_iri FROM road_segments;`;

  const { rows } = await pool.query(query);

  res.json({
    average: Number(rows[0].avg_iri || 0),
  });
});

export default router;
