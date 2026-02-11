import fs from "node:fs";
import path from "node:path";

const projectRoot = process.cwd();

export const DATA_DIR = path.resolve(projectRoot, "data");
export const UPLOADS_DIR = path.resolve(DATA_DIR, "uploads");
export const OUTPUTS_DIR = path.resolve(DATA_DIR, "outputs");

export function ensureDataDirs() {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
  fs.mkdirSync(OUTPUTS_DIR, { recursive: true });
}

export function getDatabasePath() {
  const configured = process.env.DATABASE_PATH?.trim();
  if (!configured) return path.resolve(DATA_DIR, "app.db");
  return path.isAbsolute(configured)
    ? configured
    : path.resolve(projectRoot, configured);
}

export function safeJoinDataPath(...parts: string[]) {
  const absolute = path.resolve(DATA_DIR, path.normalize(path.join(...parts)));
  if (!absolute.startsWith(DATA_DIR)) throw new Error("Invalid data path.");
  return absolute;
}
