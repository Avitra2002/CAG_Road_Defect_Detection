import express from "express";
import { pool } from "./db.js";
import cors from "cors";

const app = express();
app.use(cors({ origin: "http://localhost:5173" }));
app.use(express.json());
import defectsRouter from "./routes/defects.routes.js";
import maintenanceRouter from "./routes/maintenance.routes.js";
import segmentRouter from "./routes/segments.routes.js";
import pipelineRouter from "./routes/pipeline.routes.js";



app.use("/defects", defectsRouter);
app.use("/maintenance", maintenanceRouter);
app.use("/segments", segmentRouter);
app.use("/pipeline", pipelineRouter);

app.listen(process.env.PORT || 3000, () => {
  console.log(`Backend running on port ${process.env.PORT || 3000}`);
});