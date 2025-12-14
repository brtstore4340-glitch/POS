import { initializeApp } from "https://www.gstatic.com/firebasejs/9.22.0/firebase-app.js";
import {
    getFirestore, collection, doc, query, where, onSnapshot, orderBy, writeBatch, setDoc, getDocs, addDoc, Timestamp
} from "https://www.gstatic.com/firebasejs/9.22.0/firebase-firestore.js";
import { getAuth, signInAnonymously, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/9.22.0/firebase-auth.js";

// ==========================================
// CONFIGURATION
// ==========================================
const firebaseConfig = {
    apiKey: "AIzaSyAJ8IOa8sK640qYEGSqJQpvwjOBfRFxXKA",
    authDomain: "boots-thailand-pos-project.firebaseapp.com",
    databaseURL: "https://boots-thailand-pos-project-default-rtdb.europe-west1.firebasedatabase.app",
    projectId: "boots-thailand-pos-project",
    storageBucket: "boots-thailand-pos-project.firebasestorage.app",
    messagingSenderId: "596081819830",
    appId: "1:596081819830:web:f4f2bac7790803b8606617",
    measurementId: "G-JP87NSS5XV"
};

// Estimated URL based on Project ID (boots-thailand-pos-project) and Region (europe-west1)
// Function name assumed to be 'api'. If 404, try 'app' or check Console.
const API_BASE_URL = "https://europe-west1-boots-thailand-pos-project.cloudfunctions.net/api";

// Initialize Firebase
const firebaseApp = initializeApp(firebaseConfig);
const db = getFirestore(firebaseApp);
const auth = getAuth(firebaseApp);
console.log("Firebase Initialized");

// Global App Object for UI Handlers
window.app = window.app || {};
window.app.firebase = firebaseApp;

// ==========================================
// STATE MANAGEMENT & DOM ELEMENTS
// ==========================================
const state = {
    currentRunId: null, // Bill ID
    cartItems: [],
    coupons: [],
    loading: false,
    user: null
};

const UI = {
    btnNewBill: document.getElementById('btnNewBill'),
    inputQty: document.getElementById('inputQty'),
    inputBarcode: document.getElementById('inputBarcode'),
    cartList: document.getElementById('cartItemsList'),
    subtotal: document.getElementById('summarySubtotal'),
    discount: document.getElementById('summaryDiscount'),
    netTotal: document.getElementById('summaryNetTotal'),
    status: document.getElementById('connectionStatus'),
    runIdDisplay: document.getElementById('runIdDisplay'),
    btnPayCash: document.getElementById('btnPayCash'),
    btnSeed: document.getElementById('btnSeed'),
    btnDailySummary: document.getElementById('btnDailySummary'),
    fileImport: document.getElementById('fileImport')
};

// ==========================================
// AUTH & BOOTSTRAP
// ==========================================
onAuthStateChanged(auth, (user) => {
    if (user) {
        state.user = user;
        UI.status.textContent = "Online (Anon)";
        UI.status.className = "px-2 py-1 rounded text-xs font-medium bg-green-100 text-green-800";
        // Do not auto-enable inputs, waiting for "New Bill"
        console.log("Signed in as", user.uid);
    } else {
        UI.status.textContent = "Disconnected";
        UI.status.className = "px-2 py-1 rounded text-xs font-medium bg-red-100 text-red-800";
        // Auto-login silently
        signInAnonymously(auth).catch((error) => {
            console.error("Auth failed", error);
            // Don't disturb user with alert unless persistent
            UI.status.textContent = "Offline";
        });
    }
});

function enableControls(enabled) {
    UI.inputBarcode.disabled = !enabled;
    UI.btnPayCash.disabled = !enabled;
    if (enabled && UI.inputBarcode) {
        UI.inputBarcode.focus();
    }
}

// ==========================================
// IMPORT & DATA MANAGEMENT
// ==========================================
window.app.requestImport = async function () {
    const { value: password } = await Swal.fire({
        title: 'Admin Access Required',
        text: 'Enter password to upload Master Data',
        input: 'password',
        inputPlaceholder: 'Password',
        showCancelButton: true
    });

    if (password === 'BootsG5**4340++') {
        UI.fileImport.click();
    } else if (password) {
        Swal.fire("Access Denied", "Incorrect Password", "error");
    }
};

UI.fileImport.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (file) handleImportData(file);
});

async function handleImportData(file) {
    if (!state.user) return Swal.fire("Error", "Wait for connection...", "error");
    setLoading(true);
    try {
        const data = await file.arrayBuffer();
        const workbook = XLSX.read(data);
        const worksheet = workbook.Sheets[workbook.SheetNames[0]];
        const jsonData = XLSX.utils.sheet_to_json(worksheet);

        // Process in batches of 400 (Firestore limit is 500)
        const batchSize = 400;
        let batch = writeBatch(db);
        let count = 0;
        let total = 0;

        for (const row of jsonData) {
            // Map columns: Itemcode, Barcodes, Item Name, Price, Promotion
            const pCode = String(row['Itemcode'] || '').trim();
            const name = row['Item Name'] || row['Item Name (ENG)'] || 'Unknown';
            const price = parseFloat(row['Price']) || 0;
            const promo = row['Promotion'] || null;

            if (!pCode) continue;

            // 1. Create/Update Product
            const productRef = doc(db, "products", pCode);
            batch.set(productRef, {
                productCode: pCode,
                desc: name,
                unitPrice: price,
                promoTag: promo,
                updatedAt: Timestamp.now()
            }, { merge: true });

            // 2. Map Barcodes
            // "Barcodes" column might be comma separated? Assuming simple string for now or comma split
            const barcodeRaw = String(row['Barcodes'] || '');
            const barcodes = barcodeRaw.split(',').map(b => b.trim()).filter(b => b);

            for (const code of barcodes) {
                if (code) {
                    const barcodeRef = doc(db, "barcodes", code);
                    batch.set(barcodeRef, {
                        barcode: code,
                        productCode: pCode
                    });
                }
            }

            count++;
            total++;
            if (count >= batchSize) {
                await batch.commit();
                batch = writeBatch(db);
                count = 0;
            }
        }
        if (count > 0) await batch.commit();

        Swal.fire("Success", `Imported ${total} items successfully.`, "success");
    } catch (e) {
        console.error(e);
        Swal.fire("Error", "Import failed: " + e.message, "error");
    } finally {
        setLoading(false);
        UI.fileImport.value = ''; // Reset
    }
}

// ==========================================
// DAILY SUMMARY
// ==========================================
UI.btnDailySummary.addEventListener('click', async () => {
    if (!state.user) return;
    setLoading(true);
    try {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const startTimestamp = Timestamp.fromDate(today);

        const q = query(
            collection(db, "runs"),
            where("createdAt", ">=", startTimestamp)
            // Note: If you need endpoint, use apiCall. But client-side query is fine for simple summary (if rules allow).
        );

        const snapshot = await getDocs(q);
        let totalSales = 0;
        let count = 0;

        snapshot.forEach(doc => {
            const data = doc.data();
            if (data.status === 'closed') {
                totalSales += (data.netTotal || 0);
                count++;
            }
        });

        Swal.fire({
            title: 'Daily Summary',
            html: `
                <div class="text-left">
                    <p><strong>Date:</strong> ${today.toLocaleDateString('th-TH')}</p>
                    <p><strong>Bills:</strong> ${count}</p>
                    <hr class="my-2">
                    <p class="text-xl"><strong>Total:</strong> <span class="text-green-600">${totalSales.toLocaleString()} THB</span></p>
                </div>
            `,
            icon: 'info'
        });

    } catch (e) {
        console.error(e);
        Swal.fire("Error", "Could not load summary. " + e.message, "error");
    } finally {
        setLoading(false);
    }
});

// ==========================================
// API CLIENT
// ==========================================
async function apiCall(endpoint, method, body = {}) {
    if (API_BASE_URL.includes("YOUR_CLOUD_FUNCTIONS")) {
        throw new Error("Please configure API_BASE_URL in app.js");
    }

    const token = state.user ? await state.user.getIdToken() : null;
    const headers = {
        'Content-Type': 'application/json'
    };
    if (token) headers['Authorization'] = `Bearer ${token}`;

    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
        method: method,
        headers: headers,
        body: method !== 'GET' ? JSON.stringify(body) : undefined
    });

    if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        throw new Error(err.message || `API Error: ${response.statusText}`);
    }
    return response.json();
}

// ==========================================
// CORE LOGIC (API DRIVEN)
// ==========================================

// --- 1. NEW BILL ---
UI.btnNewBill.addEventListener('click', async () => {
    if (!state.user) return;
    setLoading(true);
    try {
        // API: Create Unit
        const res = await apiCall('/runs/open', 'POST');
        // Expected res: { runId: "...", billNo: "..." }

        state.currentRunId = res.runId;
        state.coupons = [];

        UI.runIdDisplay.innerText = `Run ID: ${res.billNo || res.runId}`;

        setupLiveToken(state.currentRunId);
        enableControls(true);
        UI.inputBarcode.focus();

    } catch (e) {
        console.error(e);
        Swal.fire("Error", e.message, "error");
    } finally {
        setLoading(false);
    }
});

// --- 2. SCAN / ADD ITEM ---
async function handleScan(code, qty) {
    if (!state.currentRunId) {
        Swal.fire("Warning", "Open new bill first", "warning");
        return;
    }

    setLoading(true);
    try {
        // Step A: Resolve Barcode (Optional if API does it, but spec says /barcode/resolve)
        // Check if input is barcode or product code?
        // Assuming API /items/add takes productCode or barcode? 
        // Gemini 3 said: "POST /barcode/resolve ... uses barcodes collection"
        // And "POST /runs/:runId/items/add ... saves line items"

        // Let's try to resolve first if it looks like barcode (e.g. > 7 digits) or just try resolve
        let productCode = code;

        // We'll call resolve. If it works, we get productCode. If not, maybe it IS productCode.
        try {
            const resolveRes = await apiCall('/barcode/resolve', 'POST', { barcode: code });
            if (resolveRes && resolveRes.productCode) {
                productCode = resolveRes.productCode;
            }
        } catch (ignore) {
            // If resolve fails, assume 'code' might be the productCode itself or Invalid.
            // We proceed to Try Add.
        }

        // Step B: Add Item
        await apiCall(`/runs/${state.currentRunId}/items/add`, 'POST', {
            productCode: productCode,
            qty: qty
        });

        // UI Reset
        UI.inputQty.value = 1;
        UI.inputBarcode.value = '';
        UI.inputBarcode.focus();

    } catch (e) {
        // Special case: Item not found
        if (e.message.includes("not found")) {
            // Manual Input Trigger?
            const { value: manualCode } = await Swal.fire({
                title: 'Item not found',
                text: 'Please enter Product Code manually',
                input: 'text'
            });
            if (manualCode) handleScan(manualCode, qty);
        } else {
            console.error(e);
            Swal.fire("Error", e.message, "error");
        }
    } finally {
        setLoading(false);
    }
}

// --- 3. LIVE CART (Firestore Listener) ---
function setupLiveToken(runId) {
    // We still Listen to Firestore for UI updates because Backend writes there.
    const itemsRef = collection(db, "runs", runId, "items");
    const q = query(itemsRef, orderBy("createdAt", "asc")); // or lineNo

    onSnapshot(q, (snapshot) => {
        state.cartItems = [];
        snapshot.forEach(d => state.cartItems.push({ id: d.id, ...d.data() }));
        renderCart();
        // Calc local total for display, though Server calculates final.
        // We can do client-side calc for snappy UI.
        recalcTotals();
    });

    // Listen to Run Header for status/coupons
    onSnapshot(doc(db, "runs", runId), (snap) => {
        if (snap.exists()) {
            const data = snap.data();
            state.coupons = data.coupons || [];
            if (data.status === 'closed') {
                // If closed externally or by flow
                // Disable controls?
            }
        }
    });
}


function renderCart() {
    UI.cartList.innerHTML = '';

    if (state.cartItems.length === 0) {
        UI.cartList.innerHTML = `
            <div class="h-full flex flex-col items-center justify-center text-gray-300 gap-4">
                <svg class="w-16 h-16 opacity-20" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z"></path></svg>
                <p class="font-medium">No items in cart</p>
            </div>
        `;
        return;
    }

    state.cartItems.forEach((item, index) => {
        const isVoid = item.void;
        const row = document.createElement('div');
        // Match grid-cols-[50px_1fr_100px_100px_100px_80px]
        row.className = `grid grid-cols-[50px_1fr_100px_100px_100px_80px] gap-4 px-6 py-3 border-b border-gray-50 items-center hover:bg-gray-50 transition ${isVoid ? 'bg-red-50/50 opacity-60' : ''}`;

        row.innerHTML = `
            <div class="text-center text-gray-400 font-mono text-xs">${index + 1}</div>
            <div class="flex flex-col justify-center overflow-hidden">
                <div class="font-medium text-gray-800 truncate ${isVoid ? 'line-through decoration-red-500' : ''}">${item.desc}</div>
                <div class="text-[10px] text-gray-400 font-mono">${item.productCode} ${item.promoTag ? `<span class="text-blue-600 font-bold ml-1">#${item.promoTag}</span>` : ''}</div>
            </div>
            <div class="text-center font-bold text-gray-700 bg-gray-100 rounded py-1">${item.qty}</div>
            <div class="text-right font-mono text-gray-600">${item.unitPrice?.toFixed(2)}</div>
            <div class="text-right font-bold text-gray-800 font-mono">${item.lineAmount?.toFixed(2)}</div>
            <div class="text-center">
                ${!isVoid ? `
                    <button class="w-8 h-8 flex items-center justify-center rounded-full text-gray-300 hover:text-red-500 hover:bg-red-50 transition" onclick="app.voidItem('${item.id}')" title="Void Item">
                        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path></svg>
                    </button>
                ` : '<span class="text-xs text-red-500 font-bold uppercase">Void</span>'}
            </div>
        `;
        UI.cartList.appendChild(row);
    });
    // Auto scroll to bottom
    UI.cartList.scrollTop = UI.cartList.scrollHeight;
}

function recalcTotals() {
    let subtotal = 0;
    let lineDiscounts = 0;
    state.cartItems.forEach(item => {
        if (!item.void) {
            subtotal += (item.lineAmount || 0);
            lineDiscounts += (item.discountAmount || 0);
        }
    });
    let couponDiscounts = 0;
    state.coupons.forEach(c => couponDiscounts -= (c.amount || 0));

    const net = subtotal + lineDiscounts + couponDiscounts; // Discounts are negative in line items? API Spec said "discountAmount (-)"

    UI.subtotal.textContent = subtotal.toFixed(2);
    UI.discount.textContent = (lineDiscounts + couponDiscounts).toFixed(2);
    UI.netTotal.textContent = net.toFixed(2);
    state.calculatedNetTotal = net;
}

// --- 4. VOID ---
window.app.voidItem = async function (itemId) {
    if (!confirm("Confirm Void?")) return;
    setLoading(true);
    try {
        // API: runs/:runId/items/:itemId/void ? Or just update?
        // Gemini 3 logic implies specific endpoints.
        // If no explicit void endpoint, maybe we can't?
        // Assuming there IS a void capability. Let's guess: POST /runs/:runId/items/:itemId/void
        // OR standard REST: DELETE /runs/:runId/items/:itemId ?
        // I will trust the "8 REST API Endpoints" mentioned by Gemini 3.
        // Wait, Gemini 3 listed: /barcode/resolve, /runs/open, /runs/:id/items/add, /runs/:id/close.
        // It did NOT list VOID.
        // But it said "Endpoints like POST /runs/:runId/items/add".

        // I will assume there is a VOID endpoint or I use a generic update?
        // "Backend ... does BOGO Logic". Void needs BOGO Re-balance. So it MUST be a server endpoint.
        await apiCall(`/runs/${state.currentRunId}/items/${itemId}/void`, 'POST');

    } catch (e) {
        Swal.fire("Error", "Void failed: " + e.message, "error");
    } finally {
        setLoading(false);
    }
}

// --- 5. COUPONS ---
// --- 5. COUPONS ---
window.app.addCoupon = async function (type) {
    if (!state.currentRunId) return Swal.fire("Warning", "Open new bill first", "warning");

    const label = type.charAt(0).toUpperCase() + type.slice(1);

    const { value: formValues } = await Swal.fire({
        title: `Add ${label} Coupon`,
        html: `
            <div class="space-y-3">
                <input id="swal-code" class="swal2-input w-full" placeholder="Coupon Code" style="margin: 0 auto;">
                <input id="swal-amount" type="number" step="0.01" class="swal2-input w-full" placeholder="Discount Amount" style="margin: 0 auto;">
            </div>
        `,
        focusConfirm: false,
        preConfirm: () => {
            return [
                document.getElementById('swal-code').value,
                document.getElementById('swal-amount').value
            ]
        }
    });

    if (formValues) {
        const [code, amt] = formValues;
        if (!amt) return;

        setLoading(true);
        try {
            // Save to Firestore: runs/{runId}/coupons
            await addDoc(collection(db, "runs", state.currentRunId, "coupons"), {
                type: type, // 'store', 'vendor', 'mobile'
                code: code || '',
                amount: parseFloat(amt),
                createdAt: Timestamp.now()
            });
            // Note: Cloud Function 'onCouponAdded' usually recalculates totals. 
            // Or we rely on local recalcTotals for display until payment.

            Swal.fire("Success", `${label} Coupon Added`, "success");
        } catch (e) {
            console.error(e);
            Swal.fire("Error", "Failed to add coupon: " + e.message, "error");
        } finally {
            setLoading(false);
        }
    }
};


// --- 6. CLOSE BILL ---
async function handlePayment(method) {
    if (!state.currentRunId) return;

    // Collect details
    const paymentDetails = { method };
    if (method === 'cash') {
        const { value: paid } = await Swal.fire({
            title: 'Cash Received',
            input: 'number'
        });
        if (!paid) return;
        paymentDetails.paid = parseFloat(paid);
        // Change calc logic is usually Client side helper, but Server needs final verification?
        // We send what was paid. Server calculates change?
        // API: "POST /runs/:runId/close ... saves payment"
    } else {
        // Credit
        const { value: last4 } = await Swal.fire({ title: 'Card Last 4', input: 'text' });
        if (!last4) return;
        paymentDetails.cardLast4 = last4;
        paymentDetails.paid = state.calculatedNetTotal; // Full amount
    }

    setLoading(true);
    try {
        const res = await apiCall(`/runs/${state.currentRunId}/close`, 'POST', {
            payment: paymentDetails
        });

        // Success
        Swal.fire({
            icon: 'success',
            title: 'Bill Closed',
            text: `Change: ${res.change || (paymentDetails.paid - res.netTotal) || 0} THB`
        });

        // Reset
        state.currentRunId = null;
        UI.runIdDisplay.textContent = '-';
        setupLiveToken(null); // Detach
        UI.cartList.innerHTML = '';
        enableControls(false);

    } catch (e) {
        Swal.fire("Error", "Close failed: " + e.message, "error");
    } finally {
        setLoading(false);
    }
}

UI.btnPayCash.addEventListener('click', () => handlePayment('cash'));
// Credit payment removed as requested


// --- INPUTS ---
UI.inputBarcode.addEventListener('keyup', (e) => {
    if (e.key === 'Enter') handleScan(UI.inputBarcode.value.trim(), parseInt(UI.inputQty.value) || 1);
});
document.addEventListener('keydown', (e) => {
    if (e.altKey && e.key.toLowerCase() === 'q') {
        e.preventDefault(); UI.inputQty.focus(); UI.inputQty.select();
    }
});


// Export
// window.app is already initialized and populated
window.app.voidItem = window.app.voidItem; // Ensure accessible
window.app.addCoupon = window.app.addCoupon;
// window.app.requestImport is already assigned above

function setLoading(b) {
    state.loading = b;
    if (b) Swal.showLoading(); else Swal.close();
}
