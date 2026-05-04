import express from "express";
import cors from "cors";
import multer from "multer";
import * as XLSX from "xlsx";
import sqlite3 from "sqlite3";
import { open, Database } from "sqlite";
import path from "path";
import fs from "fs";

// --- Setup database path ---
const dbPath = path.join(__dirname, "..", "db", "inventory.db"); // <- notice the ".."
console.log("DB Path:", dbPath);

const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error("Failed to connect to DB:", err.message);
  } else {
    console.log("DB exists?", fs.existsSync(dbPath)); // sanity check

// --- Initialize Express ---
const app = express();
app.use(cors());
app.use(express.json());
const upload = multer({ dest: "uploads/" });

// --- Database ---
let db: Database<sqlite3.Database, sqlite3.Statement>;
async function addColumnIfMissing(
  tableName: string,
  columnName: string,
  columnType: string
) {
  const columns = await db.all(`PRAGMA table_info(${tableName})`);
  const exists = columns.some((column) => column.name === columnName);

  if (!exists) {
    await db.exec(`ALTER TABLE ${tableName} ADD COLUMN ${columnName} ${columnType}`);
    console.log(`Added column: ${columnName}`);
  }
}
async function initDB() {
  db = await open({
    filename: dbPath,
    driver: sqlite3.Database,
  });

 await db.exec(`
  CREATE TABLE IF NOT EXISTS inventory (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    sku TEXT,
    area TEXT,
    shelf TEXT,
    stack TEXT,
    productType TEXT,
    model TEXT,
    company TEXT,
    quantity INTEGER,
    listed INTEGER,
     ebayUrl TEXT,
    ebayListedQuantity INTEGER,
    ebayPrice REAL,
    date TEXT
  )
`);

await addColumnIfMissing("inventory", "sku", "TEXT");
await addColumnIfMissing("inventory", "ebayUrl", "TEXT");
await addColumnIfMissing("inventory", "ebayListedQuantity", "INTEGER");
await addColumnIfMissing("inventory", "ebayPrice", "REAL");
await addColumnIfMissing("inventory", "condition", "TEXT");
await addColumnIfMissing("inventory", "notes", "TEXT");


const columns = await db.all("PRAGMA table_info(inventory)");
console.log("INVENTORY COLUMNS:", columns.map((col) => col.name));
}

initDB();

// --- Routes ---
app.get("/", (req, res) => {
  res.redirect("/inventory");
});

app.get("/inventory", async (req, res) => {
  try {
    const query = (req.query.query as string || "").toLowerCase();
    const filters = query.split("AND").map(f => f.trim());

    const rows = await db.all("SELECT * FROM inventory");

    const filtered = filters.length
      ? rows.filter(row =>
          filters.every(f =>
            Object.values(row).some(val =>
              val?.toString().toLowerCase().includes(f)
            )
          )
        )
      : rows;

    // Aggregation
    const totalQuantity = filtered.reduce((sum, row) => sum + (row.quantity || 0), 0);

    const countByModel: Record<string, number> = {};
    const countByArea: Record<string, number> = {};

    filtered.forEach(row => {
      countByModel[row.model] = (countByModel[row.model] || 0) + (row.quantity || 0);
      countByArea[row.area] = (countByArea[row.area] || 0) + (row.quantity || 0);
    });

    res.json({ filtered, totalQuantity, countByModel, countByArea });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch inventory" });
  }
});

app.post("/inventory", async (req, res) => {
const {
  sku,
  area,
  shelf,
  stack,
  productType,
  model,
  company,
  quantity,
  listed,
  ebayUrl,
  ebayListedQuantity,
  ebayPrice,
  condition,
  notes,
  date,
} = req.body;

 await db.run(
  `INSERT INTO inventory 
    (sku, area, shelf, stack, productType, model, company, quantity, listed, ebayUrl, ebayListedQuantity, ebayPrice, condition, notes, date)
   VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  [
    sku || "",
    area,
    shelf,
    stack,
    productType,
    model,
    company,
    Number(quantity) || 0,
    listed ? 1 : 0,
    ebayUrl || "",
    Number(ebayListedQuantity) || 0,
    Number(ebayPrice) || 0,
    condition || "",
    notes || "",
    date || "",
  ]
);
 


  res.json({ success: true });
});

app.patch("/inventory/:id", async (req, res) => {
  const { id } = req.params;
  const keys = Object.keys(req.body);

  if (keys.length === 0) return res.status(400).json({ error: "No field to update provided" });

  const field = keys[0];
 const allowedFields = [
  "sku",
  "area",
  "shelf",
  "stack",
  "productType",
  "model",
  "company",
  "quantity",
  "listed",
  "ebayUrl",
  "ebayListedQuantity",
  "ebayPrice",
  "condition",
  "notes",
  "date",
];

  // ✅ Fix TypeScript 'includes' error
  if (!field || !allowedFields.includes(field as string)) {
    return res.status(400).json({ error: "Invalid field" });
  }

  const value = req.body[field as keyof typeof req.body];

  try {
    await db.run(`UPDATE inventory SET ${field} = ? WHERE id = ?`, [value, id]);
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Update failed" });
  }
});

app.delete("/inventory/:id", async (req, res) => {
  const { id } = req.params;
  await db.run("DELETE FROM inventory WHERE id = ?", [id]);
  res.json({ success: true });
});

// --- Excel import route ---
app.post("/inventory/import", upload.single("file"), async (req, res) => {
  try {
    const filePath = req.file?.path;
    if (!filePath) return res.status(400).json({ error: "No file uploaded" });

    // ✅ Tell TypeScript this is definitely a string
    const workbook = XLSX.readFile(filePath as string);

    const sheetName = workbook.SheetNames[0];
    if (!sheetName) return res.status(400).json({ error: "Excel file has no sheets" });

    const worksheet = workbook.Sheets[sheetName];
    if (!worksheet) return res.status(400).json({ error: `Sheet "${sheetName}" not found` });

    const rows: any[] = XLSX.utils.sheet_to_json(worksheet, { defval: "" });

   const insertStmt = await db.prepare(`
INSERT INTO inventory
  (sku, area, shelf, stack, productType, model, company, quantity, listed, ebayUrl, ebayListedQuantity, ebayPrice, condition, notes, date)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
`);

for (const row of rows) {
  await insertStmt.run(
    row.sku || row.SKU || row["Custom Label"] || row["custom label"] || "",

    row.area || row.Area || row.location || row.Location || "",

    row.shelf || row.Shelf || "",

    row.stack || row.Stack || "",

    row.productType ||
      row["Product Type"] ||
      row["product type"] ||
      row["unit type"] ||
      "",

    row.model || row.Model || row["model number"] || "",

    row.company || row.Company || "",

    Number(row.quantity || row.Quantity || 0),

    row.listed === true ||
    row.listed === "Yes" ||
    row.Listed === "Yes" ||
    row.listed === "yes" ||
    row.Listed === "yes"
      ? 1
      : 0,

    row.ebayUrl || row["eBay URL"] || row["ebay url"] || "",

    Number(
      row.ebayListedQuantity ||
        row["eBay Listed Quantity"] ||
        row["ebay listed quantity"] ||
        0
    ),

    Number(row.ebayPrice || row["eBay Price"] || row["ebay price"] || 0),

    row.condition || row.Condition || row["condition"] || "Used",

    row.notes ||
      row.Notes ||
      row["Item Notes / Specs"] ||
      row["item notes / specs"] ||
      "",

    row.date || row.Date || row["date listed"] || ""
  );
}

await insertStmt.finalize();

    res.json({ success: true, imported: rows.length });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to import Excel file" });
  }
});

// --- Start server ---
app.listen(3001, () => {
  console.log("Backend server running on http://localhost:3001");
});

}})