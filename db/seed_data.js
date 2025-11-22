import pkg from "pg";
import { faker } from "@faker-js/faker";
import fs from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const { Client } = pkg;
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const client = new Client({
  user: process.env.DB_USER,
  password: process.env.DB_PASS,
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  port: process.env.PGPORT || 5432,
});


const rand = (arr) => arr[Math.floor(Math.random() * arr.length)];
const randomBetween = (min, max) => Math.random() * (max - min) + min;


function parseGPXFile(filePath) {
  const gpxContent = fs.readFileSync(filePath, "utf-8");
  const trkptRegex = /<trkpt lat="([^"]+)" lon="([^"]+)"\/>/g;
  const coordinates = [];

  let match;
  while ((match = trkptRegex.exec(gpxContent)) !== null) {
    coordinates.push({
      lat: parseFloat(match[1]),
      lng: parseFloat(match[2]),
    });
  }

  return coordinates;
}


function splitRouteIntoSegments(coordinates, numSegments) {
  const pointsPerSegment = Math.floor(coordinates.length / numSegments);
  const segments = [];

  for (let i = 0; i < numSegments; i++) {
    const startIdx = i * pointsPerSegment;
    const endIdx = i === numSegments - 1 ? coordinates.length : (i + 1) * pointsPerSegment;
    const segmentCoords = coordinates.slice(startIdx, endIdx);
    segments.push(segmentCoords);
  }

  return segments;
}

function calculateDistance(lat1, lng1, lat2, lng2) {
  const R = 6371; // Earth's radius in km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLng / 2) * Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}


function calculateSegmentLength(coords) {
  let totalLength = 0;
  for (let i = 1; i < coords.length; i++) {
    totalLength += calculateDistance(
      coords[i - 1].lat,
      coords[i - 1].lng,
      coords[i].lat,
      coords[i].lng
    );
  }
  return totalLength;
}

async function seed() {
  await client.connect();
  console.log("Connected to DB");

  console.log("Checking if database is already seeded...");
  const check = await client.query("SELECT COUNT(*) FROM road_segments");
  const count = Number(check.rows[0].count);

  if (count > 0) {
    console.log("🚫 Database already has seed data. Skipping.");
    await client.end();
    return;
  }

  console.log("🧹 Clearing tables...");
  await client.query(`
    TRUNCATE coverage_logs, iri_measurements, defect_images,
             defect_progress, defects, maintenance_teams,
             vehicles, road_segments
    RESTART IDENTITY CASCADE;
  `);

 
  console.log("📌 Loading GPX route data...");


  const gpxPath = join(__dirname, "CAG_Test (9km).gpx");
  const routeCoordinates = parseGPXFile(gpxPath);
  console.log(`✅ Loaded ${routeCoordinates.length} coordinates from GPX file`);


  const segmentNames = [
    ["Runway 02C/20C", "Zone A", 2],
    ["Runway 02L/20R", "Zone A", 2],
    ["Taxiway Alpha", "Zone B", 1],
    ["Taxiway Bravo", "Zone B", 1],
    ["Apron 1", "Zone C", 3],
    ["Apron 2", "Zone C", 3],
    ["Service Road A", "Zone D", 1],
    ["Service Road B", "Zone D", 1],
    ["Perimeter Road North", "Zone E", 2],
    ["Perimeter Road South", "Zone E", 2],
  ];

 
  const segmentCoordinates = splitRouteIntoSegments(routeCoordinates, segmentNames.length);

  console.log("📌 Inserting road segments...");
  const insertedSegments = [];
  const segmentCoordMap = new Map(); 

  for (let i = 0; i < segmentNames.length; i++) {
    const [name, zone, lanes] = segmentNames[i];
    const coords = segmentCoordinates[i];
    const length_km = Number(calculateSegmentLength(coords).toFixed(2));
    const iri = Number((2 + Math.random() * 3).toFixed(2));

    const res = await client.query(
      `INSERT INTO road_segments
      (name, zone, length_km, lanes, iri, last_inspected, is_critical, frequency_count)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
      RETURNING id`,
      [
        name,
        zone,
        length_km,
        lanes,
        iri,
        faker.date.recent({ days: 5 }),
        iri > 4.0,
        Math.floor(Math.random() * 100),
      ]
    );

    const segmentId = res.rows[0].id;
    insertedSegments.push(segmentId);
    segmentCoordMap.set(segmentId, coords);
  }

  // OLD CODE (using random coordinates):
  // const segments = [
  //   ["Runway 02C/20C", "Zone A", 4.0, 2],
  //   ["Runway 02L/20R", "Zone A", 3.9, 2],
  //   ["Taxiway Alpha", "Zone B", 2.4, 1],
  //   ["Taxiway Bravo", "Zone B", 2.8, 1],
  //   ["Apron 1", "Zone C", 1.2, 3],
  //   ["Apron 2", "Zone C", 1.4, 3],
  //   ["Service Road A", "Zone D", 3.1, 1],
  //   ["Service Road B", "Zone D", 3.3, 1],
  //   ["Perimeter Road North", "Zone E", 8.0, 2],
  //   ["Perimeter Road South", "Zone E", 7.5, 2],
  // ];
  //
  // const insertedSegments = [];
  //
  // for (const [name, zone, length_km, lanes] of segments) {
  //   const iri = Number((2 + Math.random() * 3).toFixed(2));
  //
  //   const res = await client.query(
  //     `INSERT INTO road_segments
  //     (name, zone, length_km, lanes, iri, last_inspected, is_critical, frequency_count)
  //     VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
  //     RETURNING id`,
  //     [
  //       name,
  //       zone,
  //       length_km,
  //       lanes,
  //       iri,
  //       faker.date.recent({ days: 5 }),
  //       iri > 4.0,
  //       Math.floor(Math.random() * 100),
  //     ]
  //   );
  //
  //   insertedSegments.push(res.rows[0].id);
  // }
  console.log("📍 Inserting road segment coordinates...");

  for (const segmentId of insertedSegments) {
    const coords = segmentCoordMap.get(segmentId);

    for (let i = 0; i < coords.length; i++) {
      await client.query(
        `INSERT INTO road_segment_coordinates
         (segment_id, lat, lng, order_index)
         VALUES ($1,$2,$3,$4)`,
        [
          segmentId,
          Number(coords[i].lat.toFixed(6)),
          Number(coords[i].lng.toFixed(6)),
          i
        ]
      );
    }
  }

  // OLD CODE (using random coordinates):
  // for (const segmentId of insertedSegments) {
  //   // Create 5–12 coordinate points per segment
  //   const points = Math.floor(Math.random() * 7) + 5;
  //
  //   let baseLat = 1.350 + Math.random() * 0.020;
  //   let baseLng = 103.980 + Math.random() * 0.020;
  //
  //   for (let i = 0; i < points; i++) {
  //     // Slight jitter for polyline effect
  //     baseLat += (Math.random() - 0.5) * 0.002;
  //     baseLng += (Math.random() - 0.5) * 0.002;
  //
  //     await client.query(
  //       `INSERT INTO road_segment_coordinates
  //        (segment_id, lat, lng, order_index)
  //        VALUES ($1,$2,$3,$4)`,
  //       [
  //         segmentId,
  //         Number(baseLat.toFixed(6)),
  //         Number(baseLng.toFixed(6)),
  //         i
  //       ]
  //     );
  //   }
  // }


  console.log("🚐 Inserting vehicles...");

  const vehicleTemplates = ["Inspection Bus 1", "Inspection Bus 2", "Inspection Bus 3", "Inspection Bus 4", "Inspection Bus 5"];
  const insertedVehicles = [];

  for (let name of vehicleTemplates) {
    const res = await client.query(
      `INSERT INTO vehicles
      (name, status, last_upload, current_route, upload_size_mb)
      VALUES ($1,$2,$3,$4,$5)
      RETURNING id`,
      [
        name,
        rand(["online", "offline", "warning"]),
        faker.date.recent({ days: 3 }),
        rand(["Route A", "Route B", "Route C"]),
        Number((100 + Math.random() * 300).toFixed(2)),
      ]
    );

    insertedVehicles.push(res.rows[0].id);
  }

 
  console.log("🛠 Inserting maintenance teams...");

  const maintTeams = ["Maintenance Team Alpha", "Maintenance Team Beta", "Maintenance Team Gamma"];
  const insertedMaintTeams = [];

  for (let name of maintTeams) {
    const res = await client.query(
      `INSERT INTO maintenance_teams(name)
       VALUES ($1)
       RETURNING id`,
      [name]
    );
    insertedMaintTeams.push(res.rows[0].id);
  }

 
  console.log("⚠️ Inserting defects...");

  const defectTypes = ["pothole", "crack", "marking", "roughness"];
  const severities = ["critical", "high", "moderate", "low"];
  const priorities = ["urgent", "high", "normal", "low"];

  const lifecycle = [
    "for_checking",
    "checked",
    "false_positive",
    "assigned",
    "in_progress",
    "for_review",
    "completed",
  ];

  const insertedDefects = [];

  for (let i = 0; i < 50; i++) {
    const segmentId = rand(insertedSegments);
    const vehicleId = rand(insertedVehicles);

    // Get a random coordinate from this segment
    const segmentCoords = segmentCoordMap.get(segmentId);
    const randomCoord = rand(segmentCoords);

    const severity = rand(severities);
    const priority = severity === "critical" ? "urgent" : rand(priorities);

    const status = rand(lifecycle);
    const detectedAt = faker.date.recent({ days: 30 });

    const res = await client.query(
      `INSERT INTO defects
      (type, severity, status, priority, segment_id, vehicle_id,
       detected_at, coordinates_lat, coordinates_lng, size,
       is_worsening, prev_size, current_size, check_date,
       assigned_maintenance_team_id, assigned_at, started_at, reviewed_at, completed_at)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,
              $11,$12,$13,$14,$15,$16,$17,$18,$19)
      RETURNING id`,
      [
        rand(defectTypes),
        severity,
        status,
        priority,
        segmentId,
        vehicleId,
        detectedAt,
        randomCoord.lat,
        randomCoord.lng,
        Number((10 + Math.random() * 80).toFixed(1)),

        // worsening
        Math.random() > 0.85,
        Math.random() > 0.85 ? Number((10 + Math.random() * 30).toFixed(1)) : null,
        Math.random() > 0.85 ? Number((30 + Math.random() * 50).toFixed(1)) : null,
        faker.date.recent({ days: 10 }),

        // maintenance team
        status !== "for_checking" && status !== "checked" && status !== "false_positive"
          ? rand(insertedMaintTeams)
          : null,

        // lifecycle timestamps
        faker.date.recent({ days: 20 }),
        faker.date.recent({ days: 15 }),
        faker.date.recent({ days: 7 }),
        status === "completed" ? faker.date.recent({ days: 3 }) : null,
      ]
    );

    insertedDefects.push(res.rows[0].id);
  }

  // OLD CODE (using random coordinates):
  // for (let i = 0; i < 50; i++) {
  //   const segmentId = rand(insertedSegments);
  //   const vehicleId = rand(insertedVehicles);
  //
  //   const severity = rand(severities);
  //   const priority = severity === "critical" ? "urgent" : rand(priorities);
  //
  //   const status = rand(lifecycle);
  //   const detectedAt = faker.date.recent({ days: 30 });
  //
  //   const res = await client.query(
  //     `INSERT INTO defects
  //     (type, severity, status, priority, segment_id, vehicle_id,
  //      detected_at, coordinates_lat, coordinates_lng, size,
  //      is_worsening, prev_size, current_size, check_date,
  //      assigned_maintenance_team_id, assigned_at, started_at, reviewed_at, completed_at)
  //     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,
  //             $11,$12,$13,$14,$15,$16,$17,$18,$19)
  //     RETURNING id`,
  //     [
  //       rand(defectTypes),
  //       severity,
  //       status,
  //       priority,
  //       segmentId,
  //       vehicleId,
  //       detectedAt,
  //       1.35 + Math.random() * 0.02,
  //       103.98 + Math.random() * 0.02,
  //       Number((10 + Math.random() * 80).toFixed(1)),
  //
  //       // worsening
  //       Math.random() > 0.85,
  //       Math.random() > 0.85 ? Number((10 + Math.random() * 30).toFixed(1)) : null,
  //       Math.random() > 0.85 ? Number((30 + Math.random() * 50).toFixed(1)) : null,
  //       faker.date.recent({ days: 10 }),
  //
  //       // maintenance team
  //       status !== "for_checking" && status !== "checked" && status !== "false_positive"
  //         ? rand(insertedMaintTeams)
  //         : null,
  //
  //       // lifecycle timestamps
  //       faker.date.recent({ days: 20 }),
  //       faker.date.recent({ days: 15 }),
  //       faker.date.recent({ days: 7 }),
  //       status === "completed" ? faker.date.recent({ days: 3 }) : null,
  //     ]
  //   );
  //
  //   insertedDefects.push(res.rows[0].id);
  // }

 
  console.log("📈 Inserting defect progress...");

  for (let id of insertedDefects) {
    const entries = Math.floor(Math.random() * 3);

    for (let n = 0; n < entries; n++) {
      await client.query(
        `INSERT INTO defect_progress
        (defect_id, previous_size, current_size, measured_at)
        VALUES ($1,$2,$3,$4)`,
        [
          id,
          Number((10 + Math.random() * 20).toFixed(1)),
          Number((30 + Math.random() * 40).toFixed(1)),
          faker.date.recent({ days: 10 }),
        ]
      );
    }
  }

  console.log("🖼 Inserting defect images...");

  const imageTypes = ["detected", "ops_checked", "worsening", "maintenance_before", "maintenance_after", "completed"];

  for (let id of insertedDefects) {
    const entries = Math.floor(Math.random() * 3) + 1;

    for (let n = 0; n < entries; n++) {
      await client.query(
        `INSERT INTO defect_images
        (defect_id, image_url, image_type, captured_at, uploaded_by)
        VALUES ($1,$2,$3,$4,$5)`,
        [
          id,
          "https://images.unsplash.com/photo-1658223684971-f262da87168f",
          rand(imageTypes),
          faker.date.recent({ days: 14 }),
          faker.person.fullName(),
        ]
      );
    }
  }

  console.log("📏 Inserting IRI measurements...");

  for (let s of insertedSegments) {
    for (let i = 0; i < 5; i++) {
      await client.query(
        `INSERT INTO iri_measurements
        (segment_id, measured_at, iri_value, uploaded_by_vehicle_id)
        VALUES ($1,$2,$3,$4)`,
        [
          s,
          faker.date.recent({ days: 14 }),
          Number((2 + Math.random() * 3).toFixed(2)),
          rand(insertedVehicles),
        ]
      );
    }
  }

 
  console.log("🛣 Inserting coverage logs...");

  for (let s of insertedSegments) {
    for (let i = 0; i < 5; i++) {
      await client.query(
        `INSERT INTO coverage_logs
        (vehicle_id, segment_id, covered_at, sweep_frequency)
        VALUES ($1,$2,$3,$4)`,
        [
          rand(insertedVehicles),
          s,
          faker.date.recent({ days: 14 }),
          Math.ceil(randomBetween(1, 5)),
        ]
      );
    }
  }

  console.log("🎉 Seed complete!");
  await client.end();
}

seed().catch((err) => {
  console.error("❌ Seed failed", err);
  client.end();
});
