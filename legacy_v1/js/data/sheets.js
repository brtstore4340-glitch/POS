const SHEET_ID = "1NqcpmpwYWRlxuSXjiU5eIYh2wFadUld91QI2kN-PMMQ";
const ITEM_EXPORT_SHEET = "Item_Export";

const csvUrl = (sheetName) =>
  `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:csv&sheet=${encodeURIComponent(sheetName)}`;

function parseCsv(text) {
  const lines = text.split(/\r?\n/).filter((l) => l.trim() !== "");
  if (!lines.length) return [];
  const headers = lines[0].split(",").map((h) => h.trim());
  return lines.slice(1).map((line) => {
    const cells = [];
    let cur = "";
    let inQuotes = false;
    for (let i = 0; i < line.length; i += 1) {
      const ch = line[i];
      if (ch === '"' && line[i + 1] === '"' && inQuotes) {
        cur += '"';
        i += 1;
      } else if (ch === '"') {
        inQuotes = !inQuotes;
      } else if (ch === "," && !inQuotes) {
        cells.push(cur);
        cur = "";
      } else {
        cur += ch;
      }
    }
    cells.push(cur);
    const row = {};
    headers.forEach((h, idx) => {
      row[h] = cells[idx]?.trim() ?? "";
    });
    return row;
  });
}

export async function fetchItemExport() {
  const res = await fetch(csvUrl(ITEM_EXPORT_SHEET));
  if (!res.ok) throw new Error("โหลด Google Sheet ไม่สำเร็จ");
  const text = await res.text();
  const rows = parseCsv(text);

  // Map: assume Column A = Item Code, Column B = Description, C = Unit Price, D = Promotion, E = Deal Price
  const items = rows.map((r) => ({
    code: r["Item Code"] || r["Code"] || r["Barcode"] || r["A"] || "",
    name: r["Item Name"] || r["ProductDesc"] || r["B"] || "",
    unitPrice: Number(r["Unit Price"] || r["Price"] || r["C"] || 0) || 0,
    promotion: r["Promotion"] || r["Promo"] || r["D"] || "",
    dealPrice: Number(r["Deal Price"] || r["E"] || r["SellPrice"] || 0) || 0,
  }));

  return items.filter((it) => it.name || it.code);
}
