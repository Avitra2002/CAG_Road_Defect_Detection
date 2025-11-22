
DROP TABLE IF EXISTS coverage_logs, iri_measurements, defect_images,
defect_progress, defects, maintenance_teams,
vehicles, road_segments CASCADE;

-- ============================================================
-- ROAD SEGMENTS
-- ============================================================
CREATE TABLE road_segments (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  zone VARCHAR(50),
  length_km NUMERIC(5,2),
  lanes INT,
  iri NUMERIC(5,2),
  last_inspected TIMESTAMP,
  is_critical BOOLEAN DEFAULT FALSE,
  -- frequency_count INT DEFAULT 0
);
-- polyline with multiple coordinates.
CREATE TABLE road_segment_coordinates (
  id SERIAL PRIMARY KEY,
  segment_id INT REFERENCES road_segments(id) ON DELETE CASCADE,
  lat NUMERIC(9,6) NOT NULL,
  lng NUMERIC(9,6) NOT NULL,
  order_index INT NOT NULL
);

-- ============================================================
-- VEHICLES
-- ============================================================
CREATE TABLE vehicles (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  status VARCHAR(20) CHECK (status IN ('online', 'offline', 'warning')),
  last_upload TIMESTAMP,
  current_route VARCHAR(100),
  upload_size_mb NUMERIC(6,2)
);

-- ============================================================
-- MAINTENANCE TEAMS (the ONLY team table)
-- ============================================================
CREATE TABLE maintenance_teams (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL
);

-- ============================================================
-- DEFECTS (single source of truth for lifecycle)
-- ============================================================
CREATE TABLE defects (
  id SERIAL PRIMARY KEY,

  -- Core metadata
  type VARCHAR(50) CHECK (type IN ('pothole', 'crack', 'marking', 'roughness')),
  severity VARCHAR(20) CHECK (severity IN ('critical', 'high', 'moderate', 'low')),
  priority VARCHAR(20) CHECK (priority IN ('urgent', 'high', 'normal', 'low')),

  -- Lifecycle: covers both OPS and MAINTENANCE
  status VARCHAR(20) CHECK (status IN (
    'for_checking',     -- ops stage
    'checked',          -- ops stage verified
    'false_positive',   -- ops invalid
    'assigned',         -- sent to maintenance
    'in_progress',      -- technician working
    'for_review',       -- technician finished, awaiting QC
    'completed'         -- fully closed
  )) NOT NULL,

  -- Foreign keys
  segment_id INT REFERENCES road_segments(id) ON DELETE SET NULL,
  vehicle_id INT REFERENCES vehicles(id) ON DELETE SET NULL,

  -- Assignment
  assigned_maintenance_team_id INT REFERENCES maintenance_teams(id),

  -- Workflow timestamps
  detected_at TIMESTAMP NOT NULL,
  assigned_at TIMESTAMP,
  started_at TIMESTAMP,
  reviewed_at TIMESTAMP,
  completed_at TIMESTAMP,

  -- Location
  coordinates_lat NUMERIC(9,6),
  coordinates_lng NUMERIC(9,6),

  -- Physical attributes
  size NUMERIC(6,2),

  -- Image
  image_url TEXT,

  -- Worsening tracking
  is_worsening BOOLEAN DEFAULT FALSE,
  prev_size NUMERIC(6,2),
  current_size NUMERIC(6,2),
  check_date TIMESTAMP
);

-- ============================================================
-- DEFECT PROGRESS (size/time history for worsening analysis)
-- ============================================================
CREATE TABLE defect_progress (
  id SERIAL PRIMARY KEY,
  defect_id INT REFERENCES defects(id) ON DELETE CASCADE,
  previous_size NUMERIC(6,2),
  current_size NUMERIC(6,2),
  measured_at TIMESTAMP DEFAULT now()
);

-- ============================================================
-- DEFECT IMAGES (multi-image support)
-- ============================================================
CREATE TABLE defect_images (
  id SERIAL PRIMARY KEY,
  defect_id INT REFERENCES defects(id) ON DELETE CASCADE,
  image_url TEXT NOT NULL,
  image_type VARCHAR(20) CHECK (image_type IN (
    'detected',
    'ops_checked',
    'worsening',
    'maintenance_before',
    'maintenance_after',
    'completed'
  )),
  captured_at TIMESTAMP DEFAULT now(),
  uploaded_by VARCHAR(100)
);

-- ============================================================
-- IRI MEASUREMENTS
-- ============================================================
CREATE TABLE iri_measurements (
  id SERIAL PRIMARY KEY,
  segment_id INT REFERENCES road_segments(id) ON DELETE CASCADE,
  measured_at TIMESTAMP DEFAULT now(),
  iri_value NUMERIC(5,2),
  uploaded_by_vehicle_id INT REFERENCES vehicles(id)
);

-- ============================================================
-- ROAD COVERAGE LOGS
-- ============================================================
CREATE TABLE coverage_logs (
  id SERIAL PRIMARY KEY,
  vehicle_id INT REFERENCES vehicles(id) ON DELETE CASCADE,
  segment_id INT REFERENCES road_segments(id) ON DELETE CASCADE,
  covered_at TIMESTAMP DEFAULT now(),
  sweep_frequency INT DEFAULT 1
);

-- ============================================================
-- INDEXES
-- ============================================================
CREATE INDEX idx_defects_segment ON defects(segment_id);
CREATE INDEX idx_defects_status ON defects(status);
CREATE INDEX idx_defects_team ON defects(assigned_maintenance_team_id);
CREATE INDEX idx_iri_segment_date ON iri_measurements(segment_id, measured_at);
CREATE INDEX idx_coverage_segment ON coverage_logs(segment_id);
CREATE INDEX idx_coverage_vehicle ON coverage_logs(vehicle_id);
CREATE INDEX idx_segment_order ON road_segment_coordinates(segment_id, order_index);

