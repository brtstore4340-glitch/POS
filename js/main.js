import { initTheme, toggleTheme } from "./ui/theme.js";
import { openActionSheet } from "./ui/actionsheet.js";
import { toast } from "./ui/toast.js";
import { initSearch } from "./ui/searchView.js";
import { fetchItemExport } from "./data/sheets.js";
import { renderDailyReport } from "./ui/dailyReport.js";

const $ = (id) => document.getElementById(id);

// Init theme
initTheme();

// State
let sheetItems = [];
let sheetLoaded = false;

const demoBills = [
  {
    code: "BILL-001",
    date: "2025-12-16 18:45",
    paid: 1500,
    total: 1438,
    change: 62,
    items: [
      { code: "8850001001", name: "Boots Vitamin C Brightening Serum 30ml", qty: 1, unitPrice: 599, promotion: "-", dealPrice: 599, sumPrice: 599 },
      { code: "8850002002", name: "No7 Protect & Perfect Intense ADV Night Cream 50ml", qty: 2, unitPrice: 420, promotion: "Buy 2 Save 10%", dealPrice: 378, sumPrice: 756 },
      { code: "8850003003", name: "Eucerin pH5 Shower Oil 400ml", qty: 1, unitPrice: 83, promotion: "-", dealPrice: 83, sumPrice: 83 },
    ],
  },
  {
    code: "BILL-002",
    date: "2025-12-16 19:05",
    paid: 980,
    total: 920,
    change: 60,
    items: [
      { code: "8850004004", name: "CeraVe Hydrating Cleanser 473ml", qty: 1, unitPrice: 520, promotion: "-", dealPrice: 520, sumPrice: 520 },
      { code: "8850005005", name: "Accu-Check Guide Test Strips 50s", qty: 1, unitPrice: 400, promotion: "Member", dealPrice: 400, sumPrice: 400 },
    ],
  },
];

// Daily report render
renderDailyReport(
  {
    container: $("billList"),
    summaryEl: $("summaryBillCount"),
    totalEl: $("summaryBillAmount"),
  },
  demoBills
);

// Theme toggle
$("btnTheme")?.addEventListener("click", () => toggleTheme());

// New bill prep: focus scan box
$("btnNewBill")?.addEventListener("click", () => {
  $("runIdDisplay").textContent = "BILL: NEW";
  $("connectionStatus").textContent = sheetLoaded ? "READY" : "LOADING SHEET";
  $("inputBarcode").focus();
});

// Daily summary button scrolls into view
$("btnDailySummary")?.addEventListener("click", () => {
  const report = $("dailyReport");
  if (report) report.scrollIntoView({ behavior: "smooth", block: "start" });
});

// Action sheet sample
$("btnOpenSheet")?.addEventListener("click", () => {
  openActionSheet({
    title: "Master Data",
    message: "เลือกรายการ",
    actions: [
      { text: "ดูสถานะ Google Sheet", onClick: () => toast(sheetLoaded ? "พร้อมใช้งาน" : "ยังไม่โหลด") },
      { text: "ปิด", onClick: () => null },
    ],
  });
});

// Upload Master (existing button) still triggers hidden file input if provided
$("btnUpload")?.addEventListener("click", () => $("fileImport")?.click());
$("fileImport")?.addEventListener("change", (e) => {
  const f = e.target.files?.[0];
  if (f) toast(`เลือกไฟล์: ${f.name}`);
  e.target.value = "";
});

// Search box (demo/local)
const mockProducts = [
  { code: "1000001", name: "Boots Vitamin C", price: 299 },
  { code: "1000002", name: "No.7 Serum", price: 1290 },
  { code: "1000003", name: "Cerave Cleanser", price: 599 },
  { code: "1000004", name: "Eucerin Lotion", price: 799 },
  { code: "1000005", name: "Accu-Check Strips", price: 1450 },
  { code: "1000006", name: "Omron BP Monitor", price: 2490 },
];

initSearch({
  inputEl: $("inputSearch"),
  resultsEl: $("searchResults"),
  items: mockProducts,
  onPick: (product) => {
    $("inputBarcode").value = product.code;
    $("inputBarcode").focus();
  },
});

// Google Sheet dynamic search for Scan / Code
const scanInput = $("inputBarcode");
const scanResults = $("scanResults");

const debounce = (fn, ms) => {
  let t;
  return (...args) => {
    clearTimeout(t);
    t = setTimeout(() => fn(...args), ms);
  };
};

const filterSheet = (term) => {
  if (!sheetItems.length) return [];
  const lower = term.toLowerCase();
  return sheetItems
    .filter((p) => (p.name || "").toLowerCase().includes(lower))
    .slice(0, 8);
};

const renderScanResults = (items) => {
  if (!scanResults) return;
  if (!items.length) {
    scanResults.classList.add("hidden");
    scanResults.innerHTML = "";
    return;
  }
  scanResults.innerHTML = items
    .map(
      (it) => `
    <div class="scan-row" data-code="${it.code}">
      <div class="scan-code">${it.code || "-"}</div>
      <div>
        <div class="scan-name">${it.name || "-"}</div>
        <div class="scan-price">฿${(it.dealPrice || it.unitPrice || 0).toFixed(2)}</div>
      </div>
    </div>
  `
    )
    .join("");
  scanResults.classList.remove("hidden");

  scanResults.querySelectorAll("[data-code]").forEach((el) => {
    el.addEventListener("click", () => {
      const code = el.getAttribute("data-code");
      scanInput.value = code || "";
      scanResults.classList.add("hidden");
    });
  });
};

scanInput?.addEventListener(
  "input",
  debounce((e) => {
    const term = (e.target.value || "").trim();
    if (term.length < 2) {
      renderScanResults([]);
      return;
    }
    const results = filterSheet(term);
    renderScanResults(results);
  }, 180)
);

document.addEventListener("click", (e) => {
  if (scanResults && !scanResults.contains(e.target) && !scanInput.contains(e.target)) {
    scanResults.classList.add("hidden");
  }
});

// Sheet load
async function initSheet() {
  $("connectionStatus").textContent = "LOADING SHEET";
  try {
    sheetItems = await fetchItemExport();
    sheetLoaded = true;
    $("connectionStatus").textContent = "SHEET READY";
    $("dbUpdateDisplay").textContent = new Date().toLocaleString("th-TH");
    toast("โหลด Google Sheet สำเร็จ");
  } catch (err) {
    console.error(err);
    $("connectionStatus").textContent = "SHEET ERROR";
    toast("โหลด Google Sheet ไม่สำเร็จ");
  }
}

initSheet();
