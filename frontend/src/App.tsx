import React, { useEffect, useState, useRef } from "react";

type InventoryItem = {
  id?: number;
  area: string;
  shelf?: string;
  stack?: string;
  productType: string;
  model: string;
  quantity: number;
  company: string;
  listed: boolean;
  date?: string;
};

function App() {
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [search, setSearch] = useState("");

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const rowsPerPage = 25;

  // Form refs
  const areaRef = useRef<HTMLInputElement>(null);
  const shelfRef = useRef<HTMLInputElement>(null);
  const stackRef = useRef<HTMLInputElement>(null);
  const productTypeRef = useRef<HTMLInputElement>(null);
  const modelRef = useRef<HTMLInputElement>(null);
  const companyRef = useRef<HTMLInputElement>(null);
  const quantityRef = useRef<HTMLInputElement>(null);
  const listedRef = useRef<HTMLInputElement>(null);
  const dateRef = useRef<HTMLInputElement>(null);

  // Row refs for table arrow navigation
  const rowRefs = useRef<Array<{ [key: string]: HTMLInputElement | null }>>([]);

  // Form state
  const [area, setArea] = useState("");
  const [shelf, setShelf] = useState("");
  const [stack, setStack] = useState("");
  const [productType, setProductType] = useState("");
  const [model, setModel] = useState("");
  const [company, setCompany] = useState("");
  const [quantity, setQuantity] = useState(0);
  const [listed, setListed] = useState(false);
  const [date, setDate] = useState("");
  const [showAddForm, setShowAddForm] = useState(false);

  // Totals
  const [totalQuantity, setTotalQuantity] = useState(0);
  const [countByModel, setCountByModel] = useState<Record<string, number>>({});
  const [countByArea, setCountByArea] = useState<Record<string, number>>({});

  // Fetch inventory
  const fetchInventory = () => {
    fetch(`http://localhost:3001/inventory?query=${encodeURIComponent(search)}`)
      .then((res) => res.json())
      .then((data) => {
        setInventory(data.filtered || []);
        setTotalQuantity(data.totalQuantity || 0);
        setCountByModel(data.countByModel || {});
        setCountByArea(data.countByArea || {});
      })
      .catch((err) => {
        console.error("Failed to fetch inventory:", err);
        setInventory([]);
        setTotalQuantity(0);
        setCountByModel({});
        setCountByArea({});
      });
  };

  // Run once on mount
  useEffect(() => {
    fetchInventory();
  }, []);

  // Fetch whenever search changes
  useEffect(() => {
    fetchInventory();
    setCurrentPage(1); // reset page when search changes
  }, [search]);

  // Arrow navigation for Add Product form
  const handleArrowNavigation = (e: React.KeyboardEvent<HTMLInputElement>, current: string) => {
    const refs: Record<string, React.RefObject<HTMLInputElement | null>> = {
      area: areaRef,
      shelf: shelfRef,
      stack: stackRef,
      productType: productTypeRef,
      model: modelRef,
      company: companyRef,
      quantity: quantityRef,
      listed: listedRef,
      date: dateRef,
    };
    const keys = Object.keys(refs);
    const index = keys.indexOf(current);
    if (index === -1) return;

    if (e.key === "ArrowRight" && index < keys.length - 1) {
      refs[keys[index + 1]].current?.focus();
      e.preventDefault();
    } else if (e.key === "ArrowLeft" && index > 0) {
      refs[keys[index - 1]].current?.focus();
      e.preventDefault();
    }
  };

  // Arrow navigation for table rows
  const handleArrowKey = (e: React.KeyboardEvent<HTMLInputElement>, rowIndex: number, field: string) => {
    const row = rowRefs.current[rowIndex];
    if (!row) return;
    const fieldsOrder = ["area", "shelf", "stack", "productType", "model", "company", "quantity", "listed", "date"];
    const idx = fieldsOrder.indexOf(field);

    if (e.key === "ArrowRight") {
      const nextField = fieldsOrder[idx + 1];
      if (nextField && row[nextField]) {
        row[nextField]!.focus();
        e.preventDefault();
      }
    } else if (e.key === "ArrowLeft") {
      const prevField = fieldsOrder[idx - 1];
      if (prevField && row[prevField]) {
        row[prevField]!.focus();
        e.preventDefault();
      }
    }
  };

  // Add product
  const addProduct = async (e: React.SyntheticEvent<HTMLFormElement>) => {
    e.preventDefault();
    const newItem: InventoryItem = {
      area,
      shelf: shelf || undefined,
      stack: stack || undefined,
      productType,
      model,
      quantity,
      company,
      listed,
      date: date || undefined,
    };

    fetch("http://localhost:3001/inventory", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(newItem),
    })
      .then((res) => res.json())
      .then(() => {
        fetchInventory();
        setArea("");
        setShelf("");
        setStack("");
        setProductType("");
        setModel("");
        setQuantity(0);
        setCompany("");
        setListed(false);
        setDate("");

        setShowAddForm(false);

       // areaRef.current?.focus();
      });
  };
<button
  type="button"
  className="primary-button"
  onClick={() => setShowAddForm(true)}
>
  + Add Item
</button>
  // Inline edit
  const handleEdit = (id: number, field: keyof InventoryItem, value: any) => {
    setInventory((prev) =>
      prev.map((item) => (item.id === id ? { ...item, [field]: value } : item))
    );
    fetch(`http://localhost:3001/inventory/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ [field]: value }),
    });
  };

  // Delete
  const handleDelete = (id: number) => {
    if (!confirm("Are you sure you want to delete this item?")) return;
    fetch(`http://localhost:3001/inventory/${id}`, { method: "DELETE" }).then(() =>
      fetchInventory()
    );
  };

  // Copyable model lists
  const sortedModelEntries = Object.entries(countByModel || {}).sort(([modelA], [modelB]) =>
    modelA.localeCompare(modelB)
  );

  const copyableModelsText = sortedModelEntries
    .map(([model]) => model)
    .join("\n");

  const copyableModelsWithCountsText = sortedModelEntries
    .map(([model, count]) => `${model}: ${count}`)
    .join("\n");

  const handleCopyModels = async () => {
    try {
      await navigator.clipboard.writeText(copyableModelsText);
      alert("Model list copied to clipboard");
    } catch (err) {
      console.error("Failed to copy model list:", err);
      alert("Could not copy model list");
    }
  };

  const handleCopyModelsWithCounts = async () => {
    try {
      await navigator.clipboard.writeText(copyableModelsWithCountsText);
      alert("Model list with counts copied to clipboard");
    } catch (err) {
      console.error("Failed to copy model list with counts:", err);
      alert("Could not copy model list with counts");
    }
  };

  // Pagination calculations
  const startIndex = (currentPage - 1) * rowsPerPage;
  const paginatedInventory = inventory.slice(startIndex, startIndex + rowsPerPage);
  const totalPages = Math.ceil(inventory.length / rowsPerPage);

  return (
    <div style={{ padding: "2rem", fontFamily: "Arial, sans-serif" }}>
      <h1>Chaim's Inventory Dashboard</h1>

      {/* File Import */}
      <input
        type="file"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (!file) return;

          const formData = new FormData();
          formData.append("file", file);

          fetch("http://localhost:3001/inventory/import", {
            method: "POST",
            body: formData,
          })
            .then((res) => res.json())
            .then(() => {
              alert("Import successful");
              fetchInventory();
            });
        }}
        style={{ marginBottom: "1rem" }}
      />

      <div className="page-header">
  <div>
    <h1>Inventory Manager</h1>
    <p>Track, search, and manage warehouse stock</p>
  </div>

<button
  type="button"
  className="primary-button"
  onClick={() => setShowAddForm(true)}
>
  + Add Item
</button>
</div>
      {/* Add Product Form */}
      {showAddForm && (
  <div className="drawer-backdrop">
    <div className="drawer">
      <div className="drawer-header">
        <h2>Add Item</h2>
        <button
          type="button"
          className="drawer-close"
          onClick={() => setShowAddForm(false)}
        >
          Great Job!
        </button>
      </div>
      
      <form onSubmit={addProduct} className="drawer-form">
        {[
          { placeholder: "Area", value: area, setValue: setArea, ref: areaRef, required: true },
          { placeholder: "Shelf (optional)", value: shelf, setValue: setShelf, ref: shelfRef },
          { placeholder: "Stack (optional)", value: stack, setValue: setStack, ref: stackRef },
          { placeholder: "Product Type", value: productType, setValue: setProductType, ref: productTypeRef, required: true },
          { placeholder: "Model", value: model, setValue: setModel, ref: modelRef, required: true },
          { placeholder: "Company", value: company, setValue: setCompany, ref: companyRef, required: true },
        ].map((field, idx) => (
          <input
            key={idx}
            placeholder={field.placeholder}
            value={field.value}
            onChange={(e) => field.setValue(e.target.value)}
            ref={field.ref}
            onKeyDown={(e) => handleArrowNavigation(e, field.placeholder.split(" ")[0].toLowerCase())}
            required={field.required}
            style={{ marginRight: "0.5rem" }}
          />
        ))}
        <input
          type="number"
          placeholder="Quantity"
          value={quantity}
          onChange={(e) => setQuantity(Number(e.target.value))}
          ref={quantityRef}
          onKeyDown={(e) => handleArrowNavigation(e, "quantity")}
          required
          style={{ marginRight: "0.5rem", width: "80px" }}
        />
        <label style={{ marginRight: "0.5rem" }}>
          Listed?
          <input
            type="checkbox"
            checked={listed}
            onChange={(e) => setListed(e.target.checked)}
            ref={listedRef}
            onKeyDown={(e) => handleArrowNavigation(e, "listed")}
            style={{ marginLeft: "0.25rem" }}
          />
        </label>
        <input
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          ref={dateRef}
          onKeyDown={(e) => handleArrowNavigation(e, "date")}
          style={{ marginRight: "0.5rem" }}
        />
        <button type="submit">Add Product</button>
      </form>
    </div>
  </div>
)}

      {/* Search */}
      <div style={{ marginBottom: "1rem" }}>
        <input
          placeholder="Search inventory..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{ padding: "6px", width: "300px" }}
        />
      </div>

      {/* Totals */}
      <div style={{ marginBottom: "1rem" }}>
        <strong>Total Quantity:</strong> {totalQuantity}
        <br />
        <div style={{ marginBottom: "1rem", marginTop: "1rem" }}>
          <strong>Count by Model:</strong>{" "}
          <select
            style={{ maxHeight: "150px", overflowY: "scroll", display: "block", width: "320px", marginTop: "0.5rem" }}
            size={5}
          >
            {sortedModelEntries.map(([model, count]) => (
              <option key={model} value={model}>
                {model}: {count}
              </option>
            ))}
          </select>

          <div style={{ marginTop: "0.75rem", display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
            <button type="button" onClick={handleCopyModels}>
              Copy Models
            </button>
            <button type="button" onClick={handleCopyModelsWithCounts}>
              Copy Models + Counts
            </button>
          </div>

          <textarea
            value={copyableModelsWithCountsText}
            readOnly
            rows={10}
            style={{
              width: "320px",
              marginTop: "0.75rem",
              padding: "8px",
              fontFamily: "monospace",
              resize: "vertical",
            }}
          />
        </div>
        <br />
        <strong>Count by Area:</strong>{" "}
        {Object.entries(countByArea || {}).map(([area, count]) => (
          <span key={area} style={{ marginRight: "1rem" }}>
            {area}: {count}
          </span>
        ))}
      </div>

      {/* Inventory Table */}
      <table border={1} cellPadding={5}>
        <thead>
          <tr>
            <th>Area</th>
            <th>Shelf</th>
            <th>Stack</th>
            <th>Product Type</th>
            <th>Model</th>
            <th>Company</th>
            <th>Quantity</th>
            <th>Listed</th>
            <th>Date</th>
            <th>Delete</th>
          </tr>
        </thead>
        <tbody>
          {paginatedInventory.map((item, index) => {
            const rowIndex = startIndex + index;
            return (
              <tr key={item.id!}>
                {["area", "shelf", "stack", "productType", "model", "company"].map((field) => (
                  <td key={field}>
                    <input
                      ref={(el) => {
                        if (!rowRefs.current[rowIndex]) rowRefs.current[rowIndex] = {};
                        rowRefs.current[rowIndex][field] = el;
                      }}
                      value={String(item[field as keyof InventoryItem] ?? "")}
                      onChange={(e) =>
                        handleEdit(item.id!, field as keyof InventoryItem, e.target.value)
                      }
                      onKeyDown={(e) => handleArrowKey(e, rowIndex, field)}
                    />
                  </td>
                ))}
                {/* Quantity */}
                <td>
                  <input
                    type="number"
                    ref={(el) => {
                      if (!rowRefs.current[rowIndex]) rowRefs.current[rowIndex] = {};
                      rowRefs.current[rowIndex].quantity = el;
                    }}
                    value={item.quantity}
                    onChange={(e) => handleEdit(item.id!, "quantity", Number(e.target.value))}
                    onKeyDown={(e) => handleArrowKey(e, rowIndex, "quantity")}
                  />
                </td>
                {/* Listed */}
                <td>
                  <input
                    type="checkbox"
                    ref={(el) => {
                      if (!rowRefs.current[rowIndex]) rowRefs.current[rowIndex] = {};
                      rowRefs.current[rowIndex].listed = el;
                    }}
                    checked={item.listed}
                    onChange={(e) => handleEdit(item.id!, "listed", e.target.checked)}
                    onKeyDown={(e) => handleArrowKey(e, rowIndex, "listed")}
                  />
                </td>
                {/* Date */}
                <td>
                  <input
                    type="date"
                    ref={(el) => {
                      if (!rowRefs.current[rowIndex]) rowRefs.current[rowIndex] = {};
                      rowRefs.current[rowIndex].date = el;
                    }}
                    value={item.date || ""}
                    onChange={(e) => handleEdit(item.id!, "date", e.target.value)}
                    onKeyDown={(e) => handleArrowKey(e, rowIndex, "date")}
                  />
                </td>
                {/* Delete */}
                <td>
                  <button type="button" onClick={() => handleDelete(item.id!)}>
                    Delete
                  </button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>

      {/* Pagination Controls */}
      <div style={{ marginTop: "1rem" }}>
        <button onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))} disabled={currentPage === 1}>
          Prev
        </button>

        <span style={{ margin: "0 1rem" }}>
          Page {currentPage} of {totalPages}
        </span>

        <button
          onClick={() =>
            setCurrentPage((p) => Math.min(p + 1, totalPages))
          }
          disabled={currentPage === totalPages}
        >
          Next
        </button>
      </div>
    </div>
  );
}

export default App;