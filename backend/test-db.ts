import path from "path";
import fs from "fs";

const dbPath = path.resolve(__dirname, "db", "inventory.db");
console.log("Resolved DB Path:", dbPath);
console.log("File exists?", fs.existsSync(dbPath));
