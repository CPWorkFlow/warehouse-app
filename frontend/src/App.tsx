import React, { useEffect, useState, useRef } from "react";
import "./App.css";

type InventoryItem = {
  id?: number;
  sku?: string;
  area: string;
  shelf?: string;
  stack?: string;
  productType: string;
  model: string;
  quantity: number;
  company: string;
  listed: boolean;
  ebayUrl?: string;
  ebayListedQuantity?: number;
  ebayPrice?: number;
 condition?: string;
  notes?: string;
  date?: string;
};

function App() {
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [search, setSearch] = useState("");

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const rowsPerPage = 25;

  // Form refs
  const ebayUrlRef = useRef<HTMLInputElement>(null);
const ebayListedQuantityRef = useRef<HTMLInputElement>(null);
const ebayPriceRef = useRef<HTMLInputElement>(null);
const conditionRef = useRef<HTMLSelectElement>(null);
const notesRef = useRef<HTMLTextAreaElement>(null);
  const skuRef = useRef<HTMLInputElement>(null);
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
  const [showDetailsEditor, setShowDetailsEditor] = useState(false);
const [selectedDetailsItem, setSelectedDetailsItem] = useState<InventoryItem | null>(null);
  const [showListingBuilder, setShowListingBuilder] = useState(false);
const [selectedListingItem, setSelectedListingItem] = useState<InventoryItem | null>(null);
const [listingTitle, setListingTitle] = useState("");
const [listingDescription, setListingDescription] = useState("");
const [listingNotes, setListingNotes] = useState("");
const [listingPrice, setListingPrice] = useState(0);
const [listingQuantity, setListingQuantity] = useState(1);
const [listingCondition, setListingCondition] = useState("Used");
const [listingCategoryId, setListingCategoryId] = useState("");
  const [ebayUrl, setEbayUrl] = useState("");
const [ebayListedQuantity, setEbayListedQuantity] = useState(0);
const [ebayPrice, setEbayPrice] = useState(0);
const [condition, setCondition] = useState("Used");
const [notes, setNotes] = useState("");
  const [sku, setSku] = useState("");
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
  const [selectedIds, setSelectedIds] = useState<number[]>([]);

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
  const handleArrowNavigation = (
  e: React.KeyboardEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>,
  current: string
) => {
  const refs: Record<
    string,
    React.RefObject<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement | null>
  > = {
    sku: skuRef,
    area: areaRef,
    shelf: shelfRef,
    stack: stackRef,
    productType: productTypeRef,
    model: modelRef,
    company: companyRef,
    ebayUrl: ebayUrlRef,
    ebayListedQuantity: ebayListedQuantityRef,
    ebayPrice: ebayPriceRef,
    condition: conditionRef,
    notes: notesRef,
    quantity: quantityRef,
    listed: listedRef,
    date: dateRef,
  };

  const keys = Object.keys(refs);
  const index = keys.indexOf(current);
  if (index === -1) return;

  const goNext = () => {
    const nextField = refs[keys[index + 1]];
    nextField?.current?.focus();
  };

  const goPrevious = () => {
    const previousField = refs[keys[index - 1]];
    previousField?.current?.focus();
  };

  if (e.key === "ArrowRight" || e.key === "ArrowDown" || e.key === "Enter") {
    if (current === "notes" && e.key === "Enter" && !e.ctrlKey) {
      return;
    }

    if (index < keys.length - 1) {
      goNext();
      e.preventDefault();
    }
  }

  if (e.key === "ArrowLeft" || e.key === "ArrowUp") {
    if (index > 0) {
      goPrevious();
      e.preventDefault();
    }
  }
};



  // Arrow navigation for table rows
  const handleArrowKey = (
    e: React.KeyboardEvent<HTMLInputElement>,
    rowIndex: number,
    field: string
  ) => {
    const row = rowRefs.current[rowIndex];
    if (!row) return;

    const fieldsOrder = [
      "sku",
      "model",
      "company",
      "productType",
      "quantity",
      "ebayPrice",
      "listed",
    ];

    const idx = fieldsOrder.indexOf(field);
    if (idx === -1) return;

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
  sku,
  area,
  shelf: shelf || undefined,
  stack: stack || undefined,
  productType,
  model,
  quantity,
  company,
  listed,
  ebayUrl,
  ebayListedQuantity,
  ebayPrice,
  condition,
  notes,
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
        setEbayUrl("");
        setEbayListedQuantity(0);
        setEbayPrice(0);
        setCondition("Used");
        setNotes("");
        setSku("");
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
//listing builder

const openListingBuilder = (item: InventoryItem) => {
  const title = `${item.company || ""} ${item.model || ""} ${item.productType || ""}`.trim();

  const description = `
${title}

Condition:
This item is used and was pulled from a working environment.

Testing:
Tested to power on only. No further testing was performed unless otherwise stated.

Included:
Only what is pictured or specifically listed is included.

Quantity Available:
${item.quantity || 0}

Suggested Price:
$${Number(item.ebayPrice || 0).toFixed(2)}

SKU / Custom Label:
${item.sku || "N/A"}

Notes:
Please review photos carefully for condition and included items.
`.trim();

 setSelectedListingItem(item);
setListingTitle(title);
setListingDescription(description);
setListingPrice(Number(item.ebayPrice || 0));
setListingQuantity(Math.max(1, Number(item.quantity || 1)));
setListingCondition(item.condition || "Used");
setListingCategoryId("");
setListingNotes(item.notes || "");
setShowListingBuilder(true);
};
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
    const getSingleSelectedItem = () => {
    if (selectedIds.length !== 1) {
      alert("Please select exactly one item.");
      return null;
    }

    const selectedItem = inventory.find((item) => item.id === selectedIds[0]);

    if (!selectedItem) {
      alert("Selected item could not be found.");
      return null;
    }

    return selectedItem;
  };

  const openDetailsEditorForSelected = () => {
    const selectedItem = getSingleSelectedItem();
    if (!selectedItem) return;

    setSelectedDetailsItem(selectedItem);
    setShowDetailsEditor(true);
  };

  const openListingBuilderForSelected = () => {
    const selectedItem = getSingleSelectedItem();
    if (!selectedItem) return;

    openListingBuilder(selectedItem);
  };

  // Delete
  // Select/unselect one item for bulk delete
  const toggleSelectedItem = (id: number) => {
    setSelectedIds((prev) =>
      prev.includes(id)
        ? prev.filter((selectedId) => selectedId !== id)
        : [...prev, id]
    );
  };

  // Delete selected items
  const deleteSelectedItems = async () => {
    if (selectedIds.length === 0) {
      alert("Please select at least one item to delete.");
      return;
    }

    const confirmation = window.prompt(
      `You are about to delete ${selectedIds.length} item(s). Type DELETE to confirm.`
    );

    if (confirmation !== "DELETE") {
      alert("Delete cancelled.");
      return;
    }

    for (const id of selectedIds) {
      await fetch(`http://localhost:3001/inventory/${id}`, {
        method: "DELETE",
      });
    }

    setSelectedIds([]);
    fetchInventory();
  };

  // Copyable model lists

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
      <h1>Chaim's Dashboard</h1>

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

<div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
  <button
    type="button"
    className="primary-button"
    onClick={() => setShowAddForm(true)}
  >
    + Add Item
  </button>

  <button
    type="button"
    onClick={openDetailsEditorForSelected}
    disabled={selectedIds.length !== 1}
  >
    Edit Details
  </button>

  <button
    type="button"
    onClick={openListingBuilderForSelected}
    disabled={selectedIds.length !== 1}
  >
    Create Listing
  </button>

  <button
    type="button"
    onClick={deleteSelectedItems}
    disabled={selectedIds.length === 0}
  >
    Delete Selected ({selectedIds.length})
  </button>
</div>
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
          {
    keyName: "sku",
    placeholder: "SKU / Custom Label",
    value: sku,
    setValue: setSku,
    ref: skuRef,
  },
  {
    keyName: "area",
    placeholder: "Area",
    value: area,
    setValue: setArea,
    ref: areaRef,
    required: true,
  },
  {
    keyName: "shelf",
    placeholder: "Shelf (optional)",
    value: shelf,
    setValue: setShelf,
    ref: shelfRef,
  },
  {
    keyName: "stack",
    placeholder: "Stack (optional)",
    value: stack,
    setValue: setStack,
    ref: stackRef,
  },
  {
    keyName: "productType",
    placeholder: "Product Type",
    value: productType,
    setValue: setProductType,
    ref: productTypeRef,
    required: true,
  },
  {
    keyName: "model",
    placeholder: "Model",
    value: model,
    setValue: setModel,
    ref: modelRef,
    required: true,
  },
  {
    keyName: "company",
    placeholder: "Company",
    value: company,
    setValue: setCompany,
    ref: companyRef,
    required: true,
  },
].map((inputField) => (
  <input
    key={inputField.keyName}
    placeholder={inputField.placeholder}
    value={inputField.value}
    onChange={(e) => inputField.setValue(e.target.value)}
    ref={inputField.ref}
    onKeyDown={(e) => handleArrowNavigation(e, inputField.keyName)}
    required={inputField.required}
  />
))}
<div className="drawer-section-title">eBay Info</div>

<input
  placeholder="eBay URL"
  value={ebayUrl}
  onChange={(e) => setEbayUrl(e.target.value)}
  ref={ebayUrlRef}
  onKeyDown={(e) => handleArrowNavigation(e, "ebayUrl")}
/>

<input
  type="number"
  placeholder="eBay Listed Quantity"
  value={ebayListedQuantity}
  onChange={(e) => setEbayListedQuantity(Number(e.target.value))}
  ref={ebayListedQuantityRef}
  onKeyDown={(e) => handleArrowNavigation(e, "ebayListedQuantity")}
/>

<input
  type="number"
  step="0.01"
  placeholder="eBay Price"
  value={ebayPrice}
  onChange={(e) => setEbayPrice(Number(e.target.value))}
  ref={ebayPriceRef}
  onKeyDown={(e) => handleArrowNavigation(e, "ebayPrice")}
/>
<select
  value={condition}
  onChange={(e) => setCondition(e.target.value)}
>
  <option value="Used">Used</option>
  <option value="New">New</option>
  <option value="For parts or not working">For parts or not working</option>
  <option value="Open box">Open box</option>
</select>

<textarea
  placeholder="Item Notes / Specs. Example: 2x Intel Xeon CPUs, 128GB RAM, no HDD, dual PSU, tested to power on only"
  value={notes}
  onChange={(e) => setNotes(e.target.value)}
  rows={4}
/>
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
{/* Edit Details Drawer */}
{showDetailsEditor && selectedDetailsItem && (
  <div className="drawer-backdrop">
    <div className="drawer">
      <div className="drawer-header">
        <h2>Edit Details</h2>
        <button
          type="button"
          className="drawer-close"
          onClick={() => {
            setShowDetailsEditor(false);
            setSelectedDetailsItem(null);
          }}
        >
          Close
        </button>
      </div>

      <div className="drawer-form">
        <label className="form-label">
          Area
          <input
            value={selectedDetailsItem.area || ""}
            onChange={(e) => {
              const value = e.target.value;
              setSelectedDetailsItem({ ...selectedDetailsItem, area: value });
              handleEdit(selectedDetailsItem.id!, "area", value);
            }}
          />
        </label>

        <label className="form-label">
          Shelf
          <input
            value={selectedDetailsItem.shelf || ""}
            onChange={(e) => {
              const value = e.target.value;
              setSelectedDetailsItem({ ...selectedDetailsItem, shelf: value });
              handleEdit(selectedDetailsItem.id!, "shelf", value);
            }}
          />
        </label>

        <label className="form-label">
          Stack
          <input
            value={selectedDetailsItem.stack || ""}
            onChange={(e) => {
              const value = e.target.value;
              setSelectedDetailsItem({ ...selectedDetailsItem, stack: value });
              handleEdit(selectedDetailsItem.id!, "stack", value);
            }}
          />
        </label>

        <label className="form-label">
          Condition
          <select
            value={selectedDetailsItem.condition || "Used"}
            onChange={(e) => {
              const value = e.target.value;
              setSelectedDetailsItem({
                ...selectedDetailsItem,
                condition: value,
              });
              handleEdit(selectedDetailsItem.id!, "condition", value);
            }}
          >
            <option value="Used">Used</option>
            <option value="New">New</option>
            <option value="For parts or not working">
              For parts or not working
            </option>
            <option value="Open box">Open box</option>
          </select>
        </label>

        <label className="form-label">
          Notes / Specs
          <textarea
            rows={6}
            value={selectedDetailsItem.notes || ""}
            onChange={(e) => {
              const value = e.target.value;
              setSelectedDetailsItem({ ...selectedDetailsItem, notes: value });
              handleEdit(selectedDetailsItem.id!, "notes", value);
            }}
          />
        </label>

        <label className="form-label">
          eBay URL
          <input
            value={selectedDetailsItem.ebayUrl || ""}
            onChange={(e) => {
              const value = e.target.value;
              setSelectedDetailsItem({ ...selectedDetailsItem, ebayUrl: value });
              handleEdit(selectedDetailsItem.id!, "ebayUrl", value);
            }}
          />
        </label>

        <label className="form-label">
          eBay Listed Quantity
          <input
            type="number"
            value={selectedDetailsItem.ebayListedQuantity || 0}
            onChange={(e) => {
              const value = Number(e.target.value);
              setSelectedDetailsItem({
                ...selectedDetailsItem,
                ebayListedQuantity: value,
              });
              handleEdit(selectedDetailsItem.id!, "ebayListedQuantity", value);
            }}
          />
        </label>

        <label className="form-label">
          Date Listed
          <input
            type="date"
            value={selectedDetailsItem.date || ""}
            onChange={(e) => {
              const value = e.target.value;
              setSelectedDetailsItem({ ...selectedDetailsItem, date: value });
              handleEdit(selectedDetailsItem.id!, "date", value);
            }}
          />
        </label>
      </div>
    </div>
  </div>
)}
{/* Listing Builder Drawer */}
{showListingBuilder && selectedListingItem && (
  <div className="drawer-backdrop">
    <div className="drawer listing-drawer">
      <div className="drawer-header">
        <h2>Create Listing</h2>
        <button
          type="button"
          className="drawer-close"
          onClick={() => setShowListingBuilder(false)}
        >
          Close
        </button>
      </div>

      <div className="drawer-form listing-builder-form">
        <div className="drawer-section-title">Item</div>

        <p>
          <strong>SKU:</strong> {selectedListingItem.sku || "N/A"}
        </p>

        <p>
          <strong>Model:</strong> {selectedListingItem.model}
        </p>

        <p>
          <strong>Quantity:</strong> {selectedListingItem.quantity}
        </p>
        <div className="drawer-section-title">Listing Details</div>

<label className="form-label">
  Price
  <input
    type="number"
    step="0.01"
    placeholder="Listing Price"
    value={listingPrice}
    onChange={(e) => setListingPrice(Number(e.target.value))}
  />
</label>

<label className="form-label">
  Quantity to List
  <input
    type="number"
    placeholder="Quantity to List"
    value={listingQuantity}
    onChange={(e) => setListingQuantity(Number(e.target.value))}
  />
</label>
<label className="form-label">
  Condition

<select
  value={listingCondition}
  onChange={(e) => setListingCondition(e.target.value)}
>
  <option value="Used">Used</option>
  <option value="New">New</option>
  <option value="For parts or not working">For parts or not working</option>
  <option value="Open box">Open box</option>
</select>
</label>
<label className="form-label">
  eBay Category ID
  <input
    placeholder="eBay Category ID"
    value={listingCategoryId}
    onChange={(e) => setListingCategoryId(e.target.value)}
  />
</label>

<label className="form-label">  Item Notes / Specs  <textarea    placeholder="Example: 2x Intel Xeon CPUs, 128GB RAM, no HDD, dual PSU, tested to power on only"    value={listingNotes}    onChange={(e) => setListingNotes(e.target.value)}    rows={5}  /></label>


        <div className="drawer-section-title">eBay Title</div>

        <input
          value={listingTitle}
          onChange={(e) => setListingTitle(e.target.value)}
        />

        <div className="drawer-section-title">Description</div>

        <textarea
          value={listingDescription}
          onChange={(e) => setListingDescription(e.target.value)}
          rows={12}
        />

       <div className="copy-buttons">
  <button
    type="button"
    onClick={() => navigator.clipboard.writeText(listingTitle)}
  >
    Copy Title
  </button>

  <button
    type="button"
    onClick={() => navigator.clipboard.writeText(listingDescription)}
  >
    Copy Description
  </button>
</div>
      </div>
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
  <th>Select</th>
  <th>SKU</th>
  <th>Model</th>
  <th>Company</th>
  <th>Product Type</th>
  <th>Quantity</th>
  <th>Available Stock</th>
  <th>Location</th>
  <th>eBay Price</th>
  <th>Listed</th>
</tr>

        </thead>
        <tbody>
          {paginatedInventory.map((item, index) => {
            const rowIndex = startIndex + index;
           return (
  <tr key={item.id!}>
    <td>
      <input
        type="checkbox"
        checked={selectedIds.includes(item.id!)}
        onChange={() => toggleSelectedItem(item.id!)}
      />
    </td>

    {[
      "sku",
      "model",
      "company",
      "productType",
    ].map((field) => (
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
title={
  field === "model"
    ? `Condition: ${item.condition || "N/A"}\nNotes: ${
        item.notes || "No notes"
      }\nDate Listed: ${item.date || "N/A"}\neBay URL: ${
        item.ebayUrl || "N/A"
      }`
    : ""
}
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

                {/* Available */}
                <td>
                  {Number(item.quantity || 0) - Number(item.ebayListedQuantity || 0)}
                </td>
{/* Location */}
<td>
  {[item.area, item.shelf, item.stack].filter(Boolean).join(" / ")}
</td>

{/* eBay Price */}
<td>
  <input
    type="number"
    step="0.01"
    value={item.ebayPrice || 0}
    onChange={(e) =>
      handleEdit(item.id!, "ebayPrice", Number(e.target.value))
    }
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