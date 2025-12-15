import { store } from "./core/state.js";
import { initTheme, toggleTheme } from "./ui/theme.js";
import { openActionSheet } from "./ui/actionsheet.js";
import { toast } from "./ui/toast.js";
import { renderCart, setEmptyCart } from "./ui/cartView.js";
import { initSearch } from "./ui/searchView.js";

const $ = (id) => document.getElementById(id);

// Init theme
initTheme();

// Init empty cart UI
setEmptyCart($("cartItemsList"));

// Demo products for search (ธีมก่อน)
const mockProducts = [
    { code: "1000001", name: "Boots Vitamin C", price: 299 },
    { code: "1000002", name: "No.7 Serum", price: 1290 },
    { code: "1000003", name: "Cerave Cleanser", price: 599 },
    { code: "1000004", name: "Eucerin Lotion", price: 799 },
    { code: "1000005", name: "Accu-Check Strips", price: 1450 },
    { code: "1000006", name: "Omron BP Monitor", price: 2490 },
];

// Wire: Theme
$("btnTheme")?.addEventListener("click", () => toggleTheme());

// Wire: New bill
$("btnNewBill")?.addEventListener("click", () => {
    store.openBill();
    $("connectionStatus").textContent = "Bill Open";
    $("runIdDisplay").textContent = "BILL: DEMO";
    $("inputBarcode").disabled = false;
    $("btnPayCash").disabled = false;
    $("inputBarcode").focus();

    renderAll();
});

// Wire: scan add (demo)
$("inputBarcode")?.addEventListener("keyup", (e) => {
    if (e.key !== "Enter") return;
    if (!store.state.billOpen) return toast("กรุณาเปิดบิลใหม่ก่อน");

    const code = e.target.value.trim();
    const qty = Math.max(1, parseInt($("inputQty").value || "1", 10));
    if (!code) return;

    // demo item
    const price = 100 + Math.floor(Math.random() * 200);
    store.addItem({ code, name: "Mock Product Name", qty, price, note: "Theme preview" });

    e.target.value = "";
    $("inputQty").value = 1;

    renderAll();
});

// Wire: pay cash (demo)
$("btnPayCash")?.addEventListener("click", () => {
    if (!store.state.billOpen) return;

    openActionSheet({
        title: "Payment",
        message: "Choose an action",
        actions: [
            { text: "Confirm Cash Payment", onClick: () => closeBillSuccess() },
            { text: "Void Bill", destructive: true, onClick: () => closeBillVoid() },
        ],
    });
});

function closeBillSuccess() {
    toast("Paid (demo)");
    store.closeBill();
    $("connectionStatus").textContent = "Ready";
    $("runIdDisplay").textContent = "BILL: -";
    $("inputBarcode").disabled = true;
    $("btnPayCash").disabled = true;
    renderAll();
}

function closeBillVoid() {
    toast("Voided (demo)");
    store.closeBill();
    $("connectionStatus").textContent = "Ready";
    $("runIdDisplay").textContent = "BILL: -";
    $("inputBarcode").disabled = true;
    $("btnPayCash").disabled = true;
    renderAll();
}

// Wire: daily summary (theme)
$("btnDailySummary")?.addEventListener("click", () => {
    openActionSheet({
        title: "Daily Summary",
        message: "Theme preview only (ยังไม่ต่อ Firebase).",
        actions: [{ text: "OK", onClick: () => toast("OK") }],
    });
});

// Wire: action sheet demo
$("btnOpenSheet")?.addEventListener("click", () => {
    openActionSheet({
        title: "A Short Title is Best",
        message: "A message should be a short, complete sentence.",
        actions: [
            { text: "Action", onClick: () => toast("Action 1") },
            { text: "Action", onClick: () => toast("Action 2") },
            { text: "Disabled Action", disabled: true },
            { text: "Destructive Action", destructive: true, onClick: () => toast("Danger") },
        ],
    });
});

// Upload (theme)
$("btnUpload")?.addEventListener("click", () => $("fileImport")?.click());
$("fileImport")?.addEventListener("change", (e) => {
    const f = e.target.files?.[0];
    if (!f) return;
    toast(`Selected: ${f.name}`);
    e.target.value = "";
});

// Search module
initSearch({
    inputEl: $("inputSearch"),
    resultsEl: $("searchResults"),
    items: mockProducts,
    onPick: (product) => {
        if (!store.state.billOpen) toast("กรุณาเปิดบิลใหม่ก่อน");
        $("inputBarcode").disabled = false;
        $("inputBarcode").value = product.code;
        $("inputBarcode").focus();
    }
});

// Render loop
function renderAll() {
    const { subtotal, discount, net } = store.getTotals();

    $("summarySubtotal").textContent = subtotal.toFixed(2);
    $("summaryDiscount").textContent = discount.toFixed(2);
    $("summaryNetTotal").textContent = net.toFixed(2);

    const list = $("cartItemsList");
    renderCart(list, store.state.items, {
        onRemove: (index) => {
            store.removeItem(index);
            renderAll();
        }
    });

    $("totalItemsDisplay").textContent = "—"; // theme-only
}

renderAll();
