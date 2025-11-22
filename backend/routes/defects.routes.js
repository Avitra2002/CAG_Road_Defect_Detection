import express from "express";
import { pool } from "../db.js";

const router = express.Router();

const formatDefect = (row) => ({
  id: row.id.toString(),
  type: row.type,
  severity: row.severity,
  status: row.status,
  priority: row.priority,

  segment: row.segment,
  zone: row.zone,

  detectedAt: row.detected_at ? new Date(row.detected_at) : null,
  assignedAt: row.assigned_at ? new Date(row.assigned_at) : null,
  startedAt: row.started_at  ? new Date(row.started_at) : null,
  reviewedAt: row.reviewed_at ? new Date(row.reviewed_at) : null,
  completedAt: row.completed_at ? new Date(row.completed_at) : null,


//   coordinates:
//     row.lat != null && row.lng != null
//       ? { lat: Number(row.lat), lng: Number(row.lng) }
//       : null,

coordinates:
  row.coordinates_lat != null && row.coordinates_lng != null
      ? { lat: Number(row.coordinates_lat), lng: Number(row.coordinates_lng) }
      : null,

  size: row.size != null ? Number(row.size) : null,
  image: row.image_url || null,

  images: Array.isArray(row.images)
    ? row.images.map(img => ({
        url: img.url,
        type: img.type,
        capturedAt: img.capturedat ? new Date(img.capturedat) : null
      }))
    : [],

  assignedMaintenanceTeamId: row.assigned_maintenance_team_id || null,
  assignedMaintenanceTeamName: row.maintenance_team_name || null,

  isWorsening: row.is_worsening || false,
  worseningData: row.current_size
    ? {
        previousSize: Number(row.prev_size),
        currentSize: Number(row.current_size),
        checkDate: row.check_date ? new Date(row.check_date) : null
      }
    : null
});


const BASE_DEFECT_SELECT = `
  SELECT
    d.*,
    rs.name AS segment,
    rs.zone AS zone,
    mt.id AS maintenance_team_id,
    mt.name AS maintenance_team_name
  FROM defects d
  LEFT JOIN road_segments rs ON d.segment_id = rs.id
  LEFT JOIN maintenance_teams mt ON d.assigned_maintenance_team_id = mt.id
`;

const BASE_DEFECT_WITH_IMAGES_SELECT = `
  SELECT
    d.*,
    rs.name AS segment,
    rs.zone AS zone,
    mt.id AS maintenance_team_id,
    mt.name AS maintenance_team_name,
    COALESCE(json_agg(
      json_build_object(
        'url', di.image_url,
        'type', di.image_type,
        'capturedat', di.captured_at
      )
    ) FILTER (WHERE di.id IS NOT NULL), '[]') AS images
  FROM defects d
  LEFT JOIN road_segments rs ON d.segment_id = rs.id
  LEFT JOIN maintenance_teams mt ON d.assigned_maintenance_team_id = mt.id
  LEFT JOIN defect_images di ON di.defect_id = d.id
`;


//all defcets
router.get("/", async (req, res) => {
  const query = `
    ${BASE_DEFECT_WITH_IMAGES_SELECT}
    GROUP BY d.id, rs.name, rs.zone, mt.id, mt.name
    ORDER BY d.id DESC
  `;
  const { rows } = await pool.query(query);
  res.json(rows.map(formatDefect));
});

//unassigned defcts
router.get("/unassigned", async (req, res) => {
  const query = `
    ${BASE_DEFECT_WITH_IMAGES_SELECT}
    WHERE d.status = 'for_checking'
    GROUP BY d.id, rs.name, rs.zone, mt.id, mt.name
    ORDER BY d.detected_at DESC;
  `;
  const { rows } = await pool.query(query);
  res.json(rows.map(formatDefect));
});

//urgent defects
router.get("/urgent", async (req, res) => {
  const query = `
    ${BASE_DEFECT_WITH_IMAGES_SELECT}
    WHERE d.status NOT IN ('completed', 'false_positive')
      AND (d.severity IN ('critical', 'high')
        OR d.priority IN ('urgent', 'high'))
    GROUP BY d.id, rs.name, rs.zone, mt.id, mt.name
    ORDER BY d.detected_at DESC;
  `;
  const { rows } = await pool.query(query);
  res.json(rows.map(formatDefect));
});

//active defects
router.get("/active", async (req, res) => {
  const query = `
    ${BASE_DEFECT_WITH_IMAGES_SELECT}
    WHERE d.status NOT IN ('completed', 'false_positive')
    GROUP BY d.id, rs.name, rs.zone, mt.id, mt.name
    ORDER BY d.detected_at DESC;
  `;
  const { rows } = await pool.query(query);
  res.json(rows.map(formatDefect));
});

//Assign maintenance team
router.patch("/:id/assign", async (req, res) => {
  const { id } = req.params;
  const { teamId, priority } = req.body;

  const { rows } = await pool.query(
    `UPDATE defects 
     SET assigned_maintenance_team_id=$1, 
         status='assigned',
         assigned_at=NOW(),
         priority=COALESCE($2, priority)
     WHERE id=$3
     RETURNING *`,
    [teamId, priority, id]
  );

  if (!rows.length) return res.status(404).json({ error: "Not found" });

  const full = await pool.query(`${BASE_DEFECT_SELECT} WHERE d.id=$1`, [id]);
  res.json(formatDefect(full.rows[0]));
});



//inidividual defect status
router.patch("/:id/status", async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;


  let timestampField = null;

  switch (status) {
    case "assigned":
      timestampField = "assigned_at";
      break;
    case "in_progress":
      timestampField = "started_at";
      break;
    case "for_review":
      timestampField = "reviewed_at";
      break;
    case "completed":
      timestampField = "completed_at";
      break;
    default:
      timestampField = null;
  }

  let query;
  let params;

  if (timestampField) {
    query = `
      UPDATE defects
      SET status = $1,
          ${timestampField} = NOW()
      WHERE id = $2
      RETURNING *
    `;
    params = [status, id];
  } else {
    query = `
      UPDATE defects
      SET status = $1
      WHERE id = $2
      RETURNING *
    `;
    params = [status, id];
  }

  const { rows } = await pool.query(query, params);
  if (!rows.length) return res.status(404).json({ error: "Not found" });

  const full = await pool.query(`${BASE_DEFECT_SELECT} WHERE d.id = $1`, [id]);
  res.json(formatDefect(full.rows[0]));
});

//delete specific defect
router.delete("/:id/delete", async (req, res) => {
  const { id } = req.params;

  try {
    
    const check = await pool.query(
      `SELECT id FROM defects WHERE id=$1`,
      [id]
    );

    if (check.rows.length === 0) {
      return res.status(404).json({ error: "Defect not found" });
    }

    // Delete main defect row 
    await pool.query(`DELETE FROM defects WHERE id=$1`, [id]);

    return res.json({ success: true, message: `Defect ${id} deleted` });

  } catch (err) {
    console.error("Error deleting defect:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

//get specific defect

router.get("/:id", async (req, res) => {
  const { id } = req.params;

  const query = `
    ${BASE_DEFECT_WITH_IMAGES_SELECT}
    WHERE d.id = $1
    GROUP BY d.id, rs.name, rs.zone, mt.id, mt.name;
  `;

  const { rows } = await pool.query(query, [id]);
  res.json(rows.length ? formatDefect(rows[0]) : null);
});

export default router;
