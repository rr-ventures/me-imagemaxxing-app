import fs from "node:fs";
import path from "node:path";
import Database from "better-sqlite3";
import { ensureDataDirs, getDatabasePath } from "@/lib/paths";

ensureDataDirs();
const dbPath = getDatabasePath();
fs.mkdirSync(path.dirname(dbPath), { recursive: true });

const db = new Database(dbPath);
db.pragma("journal_mode = WAL");

db.exec(`
CREATE TABLE IF NOT EXISTS images (
  id TEXT PRIMARY KEY,
  original_path TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE TABLE IF NOT EXISTS runs (
  id TEXT PRIMARY KEY,
  image_id TEXT NOT NULL,
  mode TEXT NOT NULL,
  provider TEXT,
  preset_id TEXT,
  intensity INTEGER,
  user_prompt TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (image_id) REFERENCES images(id)
);
CREATE TABLE IF NOT EXISTS attempts (
  id TEXT PRIMARY KEY,
  run_id TEXT NOT NULL,
  "index" INTEGER NOT NULL,
  output_path TEXT NOT NULL,
  meta_json TEXT,
  revised_prompt TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (run_id) REFERENCES runs(id)
);
CREATE TABLE IF NOT EXISTS winners (
  id TEXT PRIMARY KEY,
  run_id TEXT NOT NULL UNIQUE,
  attempt_id TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (run_id) REFERENCES runs(id),
  FOREIGN KEY (attempt_id) REFERENCES attempts(id)
);
CREATE TABLE IF NOT EXISTS saved_outputs (
  id TEXT PRIMARY KEY,
  attempt_id TEXT NOT NULL,
  saved_path TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (attempt_id) REFERENCES attempts(id)
);
`);

export default db;
