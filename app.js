import { initializeApp } from "https://www.gstatic.com/firebasejs/9.22.0/firebase-app.js";
import {
    getFirestore, collection, doc, query, where, onSnapshot, orderBy, writeBatch, setDoc, getDocs, addDoc, Timestamp, getCountFromServer, limit
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
// STATE MANAGEMENT
// ==========================================
const state = {
    currentRunId: null, // Bill ID
    cartItems: [],
    coupons: [],
    loading: false,
    user: null,
    calculatedNetTotal: 0
};

// ==========================================
// HELPER: DYNAMIC DOM ACCESS
// ==========================================
function getElement(id) {
    const el = document.getElementById(id);
    if (!el) {
        console.warn(`DOM Element not found: #${id}`);
        return null; // Handle gracefully
    }
    return el;
}

function setLoading(b) {
    state.loading = b;
    if (b) Swal.showLoading(); else Swal.close();
}

// ==========================================
// AUTH & BOOTSTRAP
// ==========================================
onAuthStateChanged(auth, (user) => {
    const statusEl = getElement('connectionStatus');
    if (user) {
        state.user = user;
        if (statusEl) {
            statusEl.textContent = "Online (Anon)";
            statusEl.className = "px-2 py-1 rounded text-xs font-medium bg-green-100 text-green-800";
        }
        console.log("Signed in as", user.uid);
    } else {
        if (statusEl) {
            statusEl.textContent = "Disconnected";
            statusEl.className = "px-2 py-1 rounded text-xs font-medium bg-red-100 text-red-800";
        }
        // Auto-login silently
        signInAnonymously(auth).catch((error) => {
            console.error("Auth failed", error);
            if (statusEl) statusEl.textContent = "Offline";
        });
    }
});

function enableControls(enabled) {
    const barcodeInput = getElement('inputBarcode');
    const cashBtn = getElement('btnPayCash');

    if (barcodeInput) {
        barcodeInput.disabled = !enabled;
        if (enabled) {
            setTimeout(() => barcodeInput.focus(), 150);
        }
    }
    if (cashBtn) cashBtn.disabled = !enabled;
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
        const fileInput = getElement('fileImport');
        if (fileInput) fileInput.click();
    } else if (password) {
        Swal.fire("Access Denied", "Incorrect Password", "error");
    }
};

const fileImportEl = getElement('fileImport');
if (fileImportEl) {
    fileImportEl.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (file) handleImportData(file);
    });
}

async function handleImportData(file) {
    if (!state.user) return Swal.fire("Error", "Wait for connection...", "error");
    setLoading(true);
    try {
        const data = await file.arrayBuffer();
        const workbook = XLSX.read(data);
        const worksheet = workbook.Sheets[workbook.SheetNames[0]];
        const jsonData = XLSX.utils.sheet_to_json(worksheet);

        const batchSize = 400;
        let batch = writeBatch(db);
        let count = 0;
        let total = 0;

        if (jsonData.length === 0) {
            return Swal.fire("Error", "Excel file appears empty", "warning");
        }

        // Flexible Column Mapping
        const findKey = (row, ...candidates) => {
            const keys = Object.keys(row);
            for (const c of candidates) {
                const match = keys.find(k => k.toLowerCase().trim() === c.toLowerCase().trim());
                if (match) return row[match];
            }
            return null;
        };

        for (const row of jsonData) {
            const pCode = String(findKey(row, 'Itemcode', 'Item Code', 'ProductCode', 'Code') || '').trim();
            const name = findKey(row, 'Item Name', 'ItemName', 'Description', 'Name') || 'Unknown';
            const price = parseFloat(findKey(row, 'Price', 'Retail Price', 'Unit Price') || 0);
            const promo = findKey(row, 'Promotion', 'Promo', 'Tag') || null;
            const barcodeRaw = String(findKey(row, 'Barcodes', 'Barcode', 'EAN') || '');

            if (!pCode) {
                console.warn("Skipping row missing Itemcode:", row);
                continue;
            }

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
        Swal.fire({
            icon: 'success',
            title: 'Import Completed',
            text: `Successfully processed ${total} items.`
        });
        updateTotalCount();
    } catch (e) {
        console.error(e);
        Swal.fire("Error", "Import failed: " + e.message, "error");
    } finally {
        setLoading(false);
        if (fileImportEl) fileImportEl.value = '';
    }
}

// ==========================================
// DAILY SUMMARY
// ==========================================
const btnDailySummary = getElement('btnDailySummary');
if (btnDailySummary) {
    btnDailySummary.addEventListener('click', async () => {
        if (!state.user) return;
        setLoading(true);
        try {
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            const startTimestamp = Timestamp.fromDate(today);

            const q = query(
                collection(db, "runs"),
                where("createdAt", ">=", startTimestamp)
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
}

// ==========================================
// API CLIENT
// ==========================================
async function apiCall(endpoint, method, body = {}) {
    if (API_BASE_URL.includes("YOUR_CLOUD_FUNCTIONS")) {
        throw new Error("Please configure API_BASE_URL in app.js");
    }
    const token = state.user ? await state.user.getIdToken() : null;
    const headers = { 'Content-Type': 'application/json' };
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
const btnNewBill = getElement('btnNewBill');
if (btnNewBill) {
    btnNewBill.addEventListener('click', async () => {
        if (!state.user) return;
        setLoading(true);
        try {
            // BACKEND bypass: Use Direct Firestore due to CORS on localhost
            // const res = await apiCall('/runs/open', 'POST');

            const runRef = await addDoc(collection(db, "runs"), {
                createdAt: Timestamp.now(),
                status: 'open',
                cashierId: state.user.uid,
                subtotal: 0,
                discount: 0,
                netTotal: 0,
                coupons: []
            });

            state.currentRunId = runRef.id;
            state.coupons = [];

            const runIdDisplay = getElement('runIdDisplay');
            if (runIdDisplay) runIdDisplay.innerText = `Run ID: ${runRef.id.slice(0, 8).toUpperCase()}`;

            setupLiveToken(state.currentRunId);
            enableControls(true);

            // Explicit focus
            const barcodeInput = getElement('inputBarcode');
            if (barcodeInput) barcodeInput.focus();

        } catch (e) {
            console.error(e);
            Swal.fire("Error", e.message, "error");
        } finally {
            setLoading(false);
        }
    });
}

// --- 2. SCAN / ADD ITEM ---
async function handleScan(code, qty) {
    if (!state.currentRunId) {
        Swal.fire("Warning", "Open new bill first", "warning");
        return;
    }
    setLoading(true);
    try {
        // BACKEND bypass: Use Direct Firestore Logic

        // 1. Resolve Product
        let product = null;
        let productCode = code;

        // Try direct fetch from products collection
        const productRef = doc(db, "products", code);
        const productSnap = await getDocs(query(collection(db, "products"), where("productCode", "==", code)));

        if (!productSnap.empty) {
            product = productSnap.docs[0].data();
            productCode = product.productCode;
        } else {
            // Try lookup via barcodes collection
            const barcodeRef = doc(db, "barcodes", code);
            const barcodeSnap = await getDocs(query(collection(db, "barcodes"), where("barcode", "==", code)));
            if (!barcodeSnap.empty) {
                const bData = barcodeSnap.docs[0].data();
                productCode = bData.productCode;
                // Fetch actual product
                const pSnap = await getDocs(query(collection(db, "products"), where("productCode", "==", productCode)));
                if (!pSnap.empty) product = pSnap.docs[0].data();
            }
        }

        if (!product) {
            throw new Error(`Product not found: ${code}`);
        }

        // 2. Add Item to Sub-collection
        const lineTotal = (product.unitPrice || 0) * qty;
        await addDoc(collection(db, "runs", state.currentRunId, "items"), {
            productCode: productCode,
            desc: product.desc || 'Unknown',
            qty: qty,
            unitPrice: product.unitPrice || 0,
            lineAmount: lineTotal,
            discountAmount: 0,
            promoTag: product.promoTag || null,
            createdAt: Timestamp.now(),
            void: false
        });

        // UI Reset
        const inputQty = getElement('inputQty');
        const inputBarcode = getElement('inputBarcode');
        if (inputQty) inputQty.value = 1;
        if (inputBarcode) {
            inputBarcode.value = '';
            inputBarcode.focus();
        }

    } catch (e) {
        if (e.message.includes("not found")) {
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
    if (!runId) return; // Detach logic if null?

    // Listen to Items
    const itemsRef = collection(db, "runs", runId, "items");
    const q = query(itemsRef, orderBy("createdAt", "asc"));

    onSnapshot(q, (snapshot) => {
        state.cartItems = [];
        snapshot.forEach(d => state.cartItems.push({ id: d.id, ...d.data() }));
        renderCart();
        recalcTotals();
    });

    // Listen to Run Header
    onSnapshot(doc(db, "runs", runId), (snap) => {
        if (snap.exists()) {
            const data = snap.data();
            state.coupons = data.coupons || [];
            // Re-calc with updated coupons
            recalcTotals();
        }
    });
}

function renderCart() {
    const list = getElement('cartItemsList');
    if (!list) return;

    list.innerHTML = '';

    if (state.cartItems.length === 0) {
        list.innerHTML = `
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
        list.appendChild(row);
    });
    list.scrollTop = list.scrollHeight;
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

    const net = subtotal + lineDiscounts + couponDiscounts;

    const elSub = getElement('summarySubtotal');
    const elDisc = getElement('summaryDiscount');
    const elNet = getElement('summaryNetTotal');

    if (elSub) elSub.textContent = subtotal.toFixed(2);
    if (elDisc) elDisc.textContent = (lineDiscounts + couponDiscounts).toFixed(2);
    if (elNet) elNet.textContent = net.toFixed(2);

    state.calculatedNetTotal = net;
}

// --- 4. VOID ---
window.app.voidItem = async function (itemId) {
    if (!confirm("Confirm Void?")) return;
    setLoading(true);
    try {
        // BACKEND bypass: Direct Update
        // await apiCall(`/runs/${state.currentRunId}/items/${itemId}/void`, 'POST');
        const itemRef = doc(db, "runs", state.currentRunId, "items", itemId);
        await setDoc(itemRef, { void: true }, { merge: true });

    } catch (e) {
        Swal.fire("Error", "Void failed: " + e.message, "error");
    } finally {
        setLoading(false);
    }
}

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
            await addDoc(collection(db, "runs", state.currentRunId, "coupons"), {
                type: type,
                code: code || '',
                amount: parseFloat(amt),
                createdAt: Timestamp.now()
            });
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
    const paymentDetails = { method };
    if (method === 'cash') {
        const { value: paid } = await Swal.fire({
            title: 'Cash Received',
            input: 'number'
        });
        if (!paid) return;
        paymentDetails.paid = parseFloat(paid);
    }

    setLoading(true);
    try {
        // BACKEND bypass: Direct Close
        // const res = await apiCall(`/runs/${state.currentRunId}/close`, 'POST', { payment: paymentDetails });

        const runRef = doc(db, "runs", state.currentRunId);
        const netTotal = state.calculatedNetTotal;
        const change = (paymentDetails.paid || 0) - netTotal;

        await setDoc(runRef, {
            status: 'closed',
            closedAt: Timestamp.now(),
            payment: paymentDetails,
            netTotal: netTotal,
            change: change
        }, { merge: true });

        // Success
        Swal.fire({
            icon: 'success',
            title: 'Bill Closed',
            text: `Change: ${change.toFixed(2)} THB`
        });

        // Reset
        state.currentRunId = null;
        const runIdDisplay = getElement('runIdDisplay');
        if (runIdDisplay) runIdDisplay.textContent = '-';

        setupLiveToken(null);
        renderCart(); // Clears it
        enableControls(false);

    } catch (e) {
        Swal.fire("Error", "Close failed: " + e.message, "error");
    } finally {
        setLoading(false);
    }
}

const btnPayCash = getElement('btnPayCash');
if (btnPayCash) btnPayCash.addEventListener('click', () => handlePayment('cash'));

// --- INPUTS ---
const inputBarcode = getElement('inputBarcode');
const inputQty = getElement('inputQty');
if (inputBarcode) {
    inputBarcode.addEventListener('keyup', (e) => {
        if (e.key === 'Enter') handleScan(inputBarcode.value.trim(), parseInt(inputQty?.value) || 1);
    });
}
document.addEventListener('keydown', (e) => {
    if (e.altKey && e.key.toLowerCase() === 'q') {
        e.preventDefault();
        if (inputQty) {
            inputQty.focus();
            inputQty.select();
        }
    }
});

// --- 7. SEARCH & STATS ---
const searchInput = getElement('inputSearch');
const searchResults = getElement('searchResults');
const totalItemsDisplay = getElement('totalItemsDisplay');

// Debounce helper
function debounce(func, wait) {
    let timeout;
    return function (...args) {
        clearTimeout(timeout);
        timeout = setTimeout(() => func.apply(this, args), wait);
    };
}

async function updateTotalCount() {
    if (!totalItemsDisplay) return;
    try {
        const coll = collection(db, "products");
        const snapshot = await getCountFromServer(coll);
        totalItemsDisplay.textContent = snapshot.data().count.toLocaleString();
    } catch (e) {
        console.error("Count failed", e);
    }
}

// Initial count load
onAuthStateChanged(auth, (user) => {
    if (user) updateTotalCount();
});

if (searchInput && searchResults) {
    searchInput.addEventListener('input', debounce(async (e) => {
        const term = e.target.value.trim();
        if (term.length < 2) {
            searchResults.classList.add('hidden');
            return;
        }

        try {
            // Search by Code (Exact mostly) OR Name (Prefix)
            // Firestore OR queries are limited, better to do two simple queries and merge
            // 1. Code prefix
            const codeQ = query(
                collection(db, "products"),
                where("productCode", ">=", term),
                where("productCode", "<=", term + '\uf8ff'),
                limit(5)
            );

            // 2. Name prefix
            // Note: Case sensitivity is an issue in Firestore. Assuming stored as is.
            // For a robust search, we'd need a normalized lower-case field. 
            // We'll try a direct prefix match on 'desc' for now.
            const nameQ = query(
                collection(db, "products"),
                where("desc", ">=", term),
                where("desc", "<=", term + '\uf8ff'),
                limit(5)
            );

            const [codeSnap, nameSnap] = await Promise.all([getDocs(codeQ), getDocs(nameQ)]);

            const results = new Map();
            codeSnap.forEach(d => results.set(d.id, d.data()));
            nameSnap.forEach(d => results.set(d.id, d.data()));

            renderSearchResults(Array.from(results.values()));

        } catch (e) {
            console.error("Search error", e);
        }
    }, 300));

    // Hide on click outside
    document.addEventListener('click', (e) => {
        if (!searchInput.contains(e.target) && !searchResults.contains(e.target)) {
            searchResults.classList.add('hidden');
        }
    });
}

function renderSearchResults(items) {
    if (!searchResults) return;

    if (items.length === 0) {
        searchResults.innerHTML = `<div class="p-3 text-sm text-gray-500 text-center">No results found</div>`;
    } else {
        searchResults.innerHTML = items.map(item => `
            <div class="px-4 py-3 hover:bg-gray-50 cursor-pointer border-b border-gray-50 last:border-none transition flex justify-between items-center group" 
                 onclick="app.selectSearchItem('${item.productCode}')">
                <div>
                    <div class="font-medium text-gray-800 group-hover:text-brand-600 transition">${item.desc}</div>
                    <div class="text-xs text-gray-400 font-mono">${item.productCode}</div>
                </div>
                <div class="font-bold text-gray-600">${(item.unitPrice || 0).toFixed(2)}</div>
            </div>
        `).join('');
    }
    searchResults.classList.remove('hidden');
}

window.app.selectSearchItem = function (code) {
    const inputBarcode = getElement('inputBarcode');
    if (inputBarcode) {
        inputBarcode.value = code;
        inputBarcode.disabled = false; // Just in case
        inputBarcode.focus();
        // Trigger scan if ready
        const inputQty = getElement('inputQty');
        handleScan(code, parseInt(inputQty?.value) || 1);

        // Clear search
        const searchInput = getElement('inputSearch');
        const searchResults = getElement('searchResults');
        if (searchInput) searchInput.value = '';
        if (searchResults) searchResults.classList.add('hidden');
    }
}
