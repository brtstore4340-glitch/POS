import { store } from "./core/state.js";
import { initTheme, toggleTheme } from "./ui/theme.js";
import { openActionSheet } from "./ui/actionsheet.js";
import { toast } from "./ui/toast.js";
import { renderCart, setEmptyCart } from "./ui/cartView.js";
import { initSearch } from "./ui/searchView.js";

import { auth, fb } from "./data/firebase.js";
import { importMasterFile, getMasterMeta } from "./features/importMaster.js";

const $ = (id) => document.getElementById(id);

// -------------------- Theme + Icon --------------------
initTheme();
renderThemeIcon();

$("btnTheme")?.addEventListener("click", () => {
    toggleTheme();
    renderThemeIcon();
});

function renderThemeIcon() {
    const isDark = document.documentElement.classList.contains("dark");
    const iconWrap = $("themeIcon");
    if (!iconWrap) return;

    iconWrap.innerHTML = isDark
        ? `<!-- sun -->
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M12 18a6 6 0 1 0 0-12 6 6 0 0 0 0 12Z"></path>
        <path d="M12 2v2"></path><path d="M12 20v2"></path>
        <path d="M4.93 4.93l1.41 1.41"></path><path d="M17.66 17.66l1.41 1.41"></path>
        <path d="M2 12h2"></path><path d="M20 12h2"></path>
        <path d="M4.93 19.07l1.41-1.41"></path><path d="M17.66 6.34l1.41-1.41"></path>
      </svg>`
        : `<!-- moon -->
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8Z"></path>
      </svg>`;
}

// -------------------- Initial UI --------------------
setEmptyCart($("cartItemsList"));

// Search demo dataset (ชั่วคราว—ต่อไปค่อยต่อ DB)
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
        if (!store.state.billOpen) return toast("กรุณาเปิดบิลใหม่ก่อน");
        $("inputBarcode").disabled = false;
        $("inputBarcode").value = product.code;
        $("inputBarcode").focus();
    }
});

// -------------------- Auth (Anon) + DB meta --------------------
fb.onAuthStateChanged(auth, async (user) => {
    if (user) {
        $("connectionStatus").textContent = "READY";
        await refreshMasterMeta();
    } else {
        $("connectionStatus").textContent = "CONNECTING";
        fb.signInAnonymously(auth).catch(() => {
            $("connectionStatus").textContent = "OFFLINE";
        });
    }
});

async function refreshMasterMeta() {
    try {
        const meta = await getMasterMeta();
        const el = $("dbUpdateDisplay");
        if (!el) return;

        if (!meta?.lastUploadAt) {
            el.textContent = "-";
            return;
        }

        // Firestore timestamp -> Date
        const dt = meta.lastUploadAt.toDate ? meta.lastUploadAt.toDate() : null;
        if (!dt) {
            el.textContent = "-";
            return;
        }

        const fmt = new Intl.DateTimeFormat("th-TH", {
            year: "2-digit",
            month: "2-digit",
            day: "2-digit",
            hour: "2-digit",
            minute: "2-digit"
        });
        el.textContent = fmt.format(dt);
    } catch (e) {
        console.warn("meta read failed", e);
    }
}

// -------------------- New Bill --------------------
$("btnNewBill")?.addEventListener("click", () => {
    store.openBill();
    $("runIdDisplay").textContent = "BILL: OPEN";
    $("inputBarcode").disabled = false;
    $("btnPayCash").disabled = false;
    $("inputBarcode").focus();
    renderAll();
});

// Scan add (ยังเป็น placeholder — ต่อไปค่อยต่อ DB engine)
$("inputBarcode")?.addEventListener("keyup", (e) => {
    if (e.key !== "Enter") return;
    if (!store.state.billOpen) return toast("กรุณาเปิดบิลใหม่ก่อน");

    const code = e.target.value.trim();
    const qty = Math.max(1, parseInt($("inputQty").value || "1", 10));
    if (!code) return;

    const price = 100 + Math.floor(Math.random() * 200);
    store.addItem({ code, name: "Mock Product Name", qty, price, note: "" });

    e.target.value = "";
    $("inputQty").value = 1;
    renderAll();
});

// Pay cash (theme sheet)
$("btnPayCash")?.addEventListener("click", () => {
    if (!store.state.billOpen) return;

    openActionSheet({
        title: "Payment",
        message: "Confirm cash payment?",
        actions: [
            { text: "Confirm", onClick: () => closeBillSuccess() },
            { text: "Void Bill", destructive: true, onClick: () => closeBillVoid() },
        ],
    });
});

function closeBillSuccess() {
    toast("Paid");
    store.closeBill();
    $("runIdDisplay").textContent = "BILL: -";
    $("inputBarcode").disabled = true;
    $("btnPayCash").disabled = true;
    renderAll();
}

function closeBillVoid() {
    toast("Voided");
    store.closeBill();
    $("runIdDisplay").textContent = "BILL: -";
    $("inputBarcode").disabled = true;
    $("btnPayCash").disabled = true;
    renderAll();
}

// Daily Summary (ยังไม่ต่อ DB ยอดขายจริง)
$("btnDailySummary")?.addEventListener("click", () => {
    openActionSheet({
        title: "Daily Summary",
        message: "ยังไม่เชื่อมยอดขาย (ขั้นถัดไป)",
        actions: [{ text: "OK" }],
    });
});

// Action sheet demo
$("btnOpenSheet")?.addEventListener("click", () => {
    openActionSheet({
        title: "Menu",
        message: "",
        actions: [
            { text: "Action", onClick: () => toast("Action") },
            { text: "Destructive Action", destructive: true, onClick: () => toast("Danger") },
        ],
    });
});

// -------------------- Upload Master Data (WORKING) --------------------
$("btnUpload")?.addEventListener("click", () => $("fileImport")?.click());

$("fileImport")?.addEventListener("change", async (e) => {
    const f = e.target.files?.[0];
    e.target.value = "";
    if (!f) return;

    const user = auth.currentUser;
    if (!user) return toast("รอเชื่อมต่อ Firebase ก่อน");

    let lastPct = 0;
    toast("Uploading...");

    try {
        await importMasterFile(f, {
            userId: user.uid,
            onProgress: (pct) => {
                // ลด spam
                if (pct - lastPct >= 20 || pct === 100) {
                    lastPct = pct;
                    toast(`Upload ${pct}%`);
                }
            }
        });

        await refreshMasterMeta();
    } catch (err) {
        console.error(err);
        openActionSheet({
            title: "Upload failed",
            message: err?.message || "Unknown error",
            actions: [{ text: "OK" }]
        });
    }
});

// -------------------- Render --------------------
function renderAll() {
    const { subtotal, discount, net } = store.getTotals();
    $("summarySubtotal").textContent = subtotal.toFixed(2);
    $("summaryDiscount").textContent = discount.toFixed(2);
    $("summaryNetTotal").textContent = net.toFixed(2);

    renderCart($("cartItemsList"), store.state.items, {
        onRemove: (index) => {
            store.removeItem(index);
            renderAll();
        }
    });
}

renderAll();
