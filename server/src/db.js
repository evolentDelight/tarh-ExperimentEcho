import sqlite3 from "sqlite3";
import { open } from "sqlite";
import path from "path";
import fs from "fs";

let dbInstance = null;

export async function initDb() {
  const dataDir = path.resolve("data");

  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }

  dbInstance = await open({
    filename: path.join(dataDir, "experimentecho.db"),
    driver: sqlite3.Database
  });

  await dbInstance.exec(`
    CREATE TABLE IF NOT EXISTS experiments (
      id TEXT PRIMARY KEY,
      task TEXT NOT NULL,
      dataset TEXT NOT NULL,
      model TEXT NOT NULL,
      strategy TEXT NOT NULL,
      variables_json TEXT NOT NULL,
      results_json TEXT NOT NULL,
      outcome TEXT NOT NULL,
      notes TEXT NOT NULL,
      created_at TEXT NOT NULL
    )
  `);

  return dbInstance;
}

export function getDb() {
  if (!dbInstance) {
    throw new Error("Database not initialized.");
  }

  return dbInstance;
}