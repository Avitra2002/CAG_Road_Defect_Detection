import express from "express";
import { pool } from "../db.js";

const router = express.Router();

router.get("/teams", async (req, res) => {
  const result = await pool.query(
    `SELECT id, name FROM maintenance_teams ORDER BY id`
  );
  res.json(result.rows);
});



export default router;
