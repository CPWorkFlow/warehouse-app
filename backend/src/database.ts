import path from "path";
import { open } from "sqlite";
import sqlite3 from "sqlite3";

export async function openDb() {
  // __dirname is backend folder
  const dbPath = path.resolve(__dirname, "db", "inventory.db"); 
  console.log("Opening DB at:", dbPath);

  return open({
    filename: dbPath,
    driver: sqlite3.Database,
  });
}