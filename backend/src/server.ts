import "dotenv/config";
import express from "express";
import cors from "cors";
import multer from "multer";
import * as XLSX from "xlsx";
import sqlite3 from "sqlite3";
import { open, Database } from "sqlite";
import path from "path";
import fs from "fs";
import OpenAI from "openai";

// --- Setup database path ---
const dbPath = path.join(__dirname, "..", "db", "inventory.db");
console.log("DB Path:", dbPath);
console.log("DB exists?", fs.existsSync(dbPath));

// --- Initialize Express ---
const app = express();
app.use(cors());
app.use(express.json());

const upload = multer({ dest: "uploads/" });

// --- OpenAI ---
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// --- Database ---
let db: Database<sqlite3.Database, sqlite3.Statement>;

async function addColumnIfMissing(
  tableName: string,
  columnName: string,
  columnType: string,
) {
  const columns = await db.all(`PRAGMA table_info(${tableName})`);
  const exists = columns.some((column) => column.name === columnName);

  if (!exists) {
    await db.exec(
      `ALTER TABLE ${tableName} ADD COLUMN ${columnName} ${columnType}`,
    );
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
ebayItemId TEXT,
ebayOfferId TEXT,
ebayInventoryItemSku TEXT,
ebayTitle TEXT,
ebayListedQuantity INTEGER,
ebayPrice REAL,
listedSource TEXT,
listedSyncedAt TEXT,
listingCheckStatus TEXT,
condition TEXT,
notes TEXT,
date TEXT
    )
  `);
  await db.exec(`
  CREATE TABLE IF NOT EXISTS ebay_order_sync (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    ebayOrderId TEXT NOT NULL UNIQUE,
    syncedAt TEXT NOT NULL
  )
`);
  await addColumnIfMissing("inventory", "sku", "TEXT");
  await addColumnIfMissing("inventory", "ebayUrl", "TEXT");
  await addColumnIfMissing("inventory", "ebayItemId", "TEXT");
  await addColumnIfMissing("inventory", "ebayOfferId", "TEXT");
  await addColumnIfMissing("inventory", "ebayInventoryItemSku", "TEXT");
  await addColumnIfMissing("inventory", "ebayTitle", "TEXT");
  await addColumnIfMissing("inventory", "listedSource", "TEXT");
  await addColumnIfMissing("inventory", "listedSyncedAt", "TEXT");
  await addColumnIfMissing("inventory", "listingCheckStatus", "TEXT");
  await addColumnIfMissing("inventory", "ebayListedQuantity", "INTEGER");
  await addColumnIfMissing("inventory", "ebayPrice", "REAL");
  await addColumnIfMissing("inventory", "condition", "TEXT");
  await addColumnIfMissing("inventory", "notes", "TEXT");
  await addColumnIfMissing("inventory", "date", "TEXT");

  const columns = await db.all("PRAGMA table_info(inventory)");
  console.log(
    "INVENTORY COLUMNS:",
    columns.map((col) => col.name),
  );
}

// --- Routes ---
app.get("/", (req, res) => {
  res.redirect("/inventory");
});

app.get("/inventory", async (req, res) => {
  try {
    const query = ((req.query.query as string) || "").toLowerCase();
    const filters = query
      .split("AND")
      .map((f) => f.trim())
      .filter(Boolean);

    const rows = await db.all("SELECT * FROM inventory");

    const filtered =
      filters.length > 0
        ? rows.filter((row) =>
            filters.every((f) =>
              Object.values(row).some((val) =>
                val?.toString().toLowerCase().includes(f),
              ),
            ),
          )
        : rows;

    const totalQuantity = filtered.reduce(
      (sum, row) => sum + (Number(row.quantity) || 0),
      0,
    );

    const countByModel: Record<string, number> = {};
    const countByArea: Record<string, number> = {};

    filtered.forEach((row) => {
      const model = row.model || "Unknown";
      const area = row.area || "Unknown";
      const qty = Number(row.quantity) || 0;

      countByModel[model] = (countByModel[model] || 0) + qty;
      countByArea[area] = (countByArea[area] || 0) + qty;
    });

    res.json({ filtered, totalQuantity, countByModel, countByArea });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch inventory" });
  }
});

app.post("/inventory", async (req, res) => {
  try {
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
      ebayItemId,
      ebayOfferId,
      ebayInventoryItemSku,
      ebayTitle,
      ebayListedQuantity,
      ebayPrice,
      listedSource,
      listedSyncedAt,
      listingCheckStatus,
      condition,
      notes,
      date,
    } = req.body;
    await db.run(
      `INSERT INTO inventory 
    (
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
      ebayItemId,
      ebayOfferId,
      ebayInventoryItemSku,
      ebayTitle,
      ebayListedQuantity,
      ebayPrice,
      listedSource,
      listedSyncedAt,
      listingCheckStatus,
      condition,
      notes,
      date
    )
   VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        sku || "",
        area || "",
        shelf || "",
        stack || "",
        productType || "",
        model || "",
        company || "",
        Number(quantity) || 0,
        listed ? 1 : 0,
        ebayUrl || "",
        ebayItemId || "",
        ebayOfferId || "",
        ebayInventoryItemSku || "",
        ebayTitle || "",
        Number(ebayListedQuantity) || 0,
        Number(ebayPrice) || 0,
        listedSource || (listed ? "manual" : ""),
        listedSyncedAt || "",
        listingCheckStatus || (listed ? "listed" : "not_listed"),
        condition || "Used",
        notes || "",
        date || "",
      ],
    );

    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to add inventory item" });
  }
});

app.patch("/inventory/:id", async (req, res) => {
  const { id } = req.params;
  const keys = Object.keys(req.body);

  if (keys.length === 0) {
    return res.status(400).json({ error: "No field to update provided" });
  }

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
    "ebayItemId",
    "ebayOfferId",
    "ebayInventoryItemSku",
    "ebayTitle",
    "ebayListedQuantity",
    "ebayPrice",
    "listedSource",
    "listedSyncedAt",
    "listingCheckStatus",
    "condition",
    "notes",
    "date",
  ];

  if (!field || !allowedFields.includes(field)) {
    return res.status(400).json({ error: "Invalid field" });
  }

  const value = req.body[field];

  try {
    await db.run(`UPDATE inventory SET ${field} = ? WHERE id = ?`, [value, id]);
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Update failed" });
  }
});

app.delete("/inventory/:id", async (req, res) => {
  try {
    const { id } = req.params;
    await db.run("DELETE FROM inventory WHERE id = ?", [id]);
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Delete failed" });
  }
});
// --- Manual eBay sync test route ---
app.post("/ebay/sync-test", async (req, res) => {
  try {
    const { ebayOrderId, sku, quantitySold } = req.body;

    if (!ebayOrderId || !sku || !quantitySold) {
      return res.status(400).json({
        error: "ebayOrderId, sku, and quantitySold are required",
      });
    }

    // 1. Check if this eBay order was already synced
    const alreadySynced = await db.get(
      "SELECT * FROM ebay_order_sync WHERE ebayOrderId = ?",
      [ebayOrderId],
    );

    if (alreadySynced) {
      return res.json({
        success: true,
        skipped: true,
        message:
          "This eBay order was already synced. No inventory was deducted.",
      });
    }

    // 2. Find the inventory item by SKU
    const item = await db.get("SELECT * FROM inventory WHERE sku = ?", [sku]);

    if (!item) {
      return res.status(404).json({
        error: `No inventory item found with SKU: ${sku}`,
      });
    }

    // 3. Make sure there is enough quantity
    const currentQuantity = Number(item.quantity) || 0;
    const soldQuantity = Number(quantitySold) || 0;

    if (soldQuantity <= 0) {
      return res.status(400).json({
        error: "quantitySold must be greater than 0",
      });
    }

    const newQuantity = currentQuantity - soldQuantity;

    // 4. Deduct inventory
    await db.run("UPDATE inventory SET quantity = ? WHERE sku = ?", [
      newQuantity,
      sku,
    ]);

    // 5. Mark this eBay order as synced
    await db.run(
      "INSERT INTO ebay_order_sync (ebayOrderId, syncedAt) VALUES (?, ?)",
      [ebayOrderId, new Date().toISOString()],
    );

    res.json({
      success: true,
      skipped: false,
      message: "Inventory deducted and eBay order marked as synced.",
      sku,
      oldQuantity: currentQuantity,
      quantitySold: soldQuantity,
      newQuantity,
    });
  } catch (err) {
    console.error("Manual eBay sync test failed:", err);
    res.status(500).json({ error: "Manual eBay sync test failed" });
  }
});

// --- AI listing generator route ---
app.post("/ai/generate-listing", async (req, res) => {
  try {
    const {
      sku,
      model,
      company,
      productType,
      condition,
      notes,
      quantity,
      price,
      categoryId,
    } = req.body;

    if (!model && !notes) {
      return res.status(400).json({
        error: "Please provide at least a model or notes/specs.",
      });
    }

    const prompt = `
You are helping create a professional eBay listing for used IT hardware.

Create an eBay title and full eBay description.

IMPORTANT RULES:
- Do not invent specs.
- Do not claim RAM, CPU, storage, RAID card, PSU count, licensing, warranty, accessories, or testing unless provided in the item data.
- If testing is not clearly provided, say: "Tested to power on only. No further testing was performed."
- If included items are not clearly provided, say: "Only what is pictured or specifically listed is included."
- Keep the title under 80 characters if possible.
- Make the listing professional, clear, and sales-focused.

ITEM DATA:
SKU: ${sku || "N/A"}
Company / Brand: ${company || "N/A"}
Model: ${model || "N/A"}
Product Type: ${productType || "N/A"}
Condition: ${condition || "Used"}
Quantity Available: ${quantity || 1}
Suggested Price: $${Number(price || 0).toFixed(2)}
eBay Category ID: ${categoryId || "N/A"}
Item Notes / Specs: ${notes || "N/A"}

Return JSON only in this exact format:
{
  "title": "eBay title here",
  "description": "Full eBay description here"
}
`;

    const completion = await openai.chat.completions.create({
      model: "gpt-4.1-mini",
      messages: [
        {
          role: "system",
          content:
            "You write accurate eBay listings for used IT hardware. You never invent specs.",
        },
        {
          role: "user",
          content: prompt,
        },
      ],
      temperature: 0.3,
    });

    const text = completion.choices[0]?.message?.content || "";

    let parsed;
    try {
      parsed = JSON.parse(text);
    } catch {
      return res.status(500).json({
        error: "AI response was not valid JSON.",
        raw: text,
      });
    }

    res.json(parsed);
  } catch (err) {
    console.error("AI listing generation failed:", err);
    res.status(500).json({ error: "AI listing generation failed" });
  }
});

// --- Excel import route ---
app.post("/inventory/import", upload.single("file"), async (req, res) => {
  try {
    const filePath = req.file?.path;
    if (!filePath) return res.status(400).json({ error: "No file uploaded" });

    const workbook = XLSX.readFile(filePath);

    const sheetName = workbook.SheetNames[0];
    if (!sheetName) {
      return res.status(400).json({ error: "Excel file has no sheets" });
    }

    const worksheet = workbook.Sheets[sheetName];
    if (!worksheet) {
      return res.status(400).json({ error: `Sheet "${sheetName}" not found` });
    }

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
            0,
        ),
        Number(row.ebayPrice || row["eBay Price"] || row["ebay price"] || 0),
        row.condition || row.Condition || row["condition"] || "Used",
        row.notes ||
          row.Notes ||
          row["Item Notes / Specs"] ||
          row["item notes / specs"] ||
          "",
        row.date || row.Date || row["date listed"] || "",
      );
    }

    await insertStmt.finalize();

    res.json({ success: true, imported: rows.length });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to import Excel file" });
  }
});

// --- Start everything ---
initDB()
  .then(() => {
    app.listen(3001, () => {
      console.log("Backend server running on http://localhost:3001");
    });
  })
  .catch((err) => {
    console.error("Failed to initialize database:", err);
    process.exit(1);
  });
