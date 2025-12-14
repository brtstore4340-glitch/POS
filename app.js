import { initializeApp } from "https://www.gstatic.com/firebasejs/9.22.0/firebase-app.js";
import { 
    getFirestore, collection, doc, getDoc, setDoc, updateDoc, 
    addDoc, query, where, getDocs, onSnapshot, serverTimestamp, 
    runTransaction, writeBatch, orderBy, limit
} from "https://www.gstatic.com/firebasejs/9.22.0/firebase-firestore.js";
import { getAuth, signInAnonymously, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/9.22.0/firebase-auth.js";

// ==========================================
// CONFIGURATION (USER MUST REPLACE THIS)
// ==========================================
// TODO: Replace with your actual Firebase project config
const firebaseConfig = {
    apiKey: "REPLACE_WITH_YOUR_KEY",
    authDomain: "REPLACE_WITH_YOUR_PROJECT.firebaseapp.com",
    projectId: "REPLACE_WITH_YOUR_PROJECT",
    storageBucket: "REPLACE_WITH_YOUR_PROJECT.appspot.com",
    messagingSenderId: "REPLACE_WITH_YOUR_ID",
    appId: "REPLACE_WITH_YOUR_APP_ID"
};

// Initialize Firebase
let app, db, auth;
try {
    app = initializeApp(firebaseConfig);
    db = getFirestore(app);
    auth = getAuth(app);
    console.log("Firebase Initialized");
} catch (e) {
    console.error("Firebase init error. Make sure config is set.", e);
    Swal.fire({
        icon: 'error',
        title: 'Config Needed',
        text: 'Please edit app.js and put your Firebase Config keys.'
    });
}

// ==========================================
// STATE MANAGEMENT & DOM ELEMENTS
// ==========================================
const state = {
    currentRunId: null,
    cartItems: [], // Local mirror of Firestore items for UI rendering
    coupons: [],
    loading: false
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
    btnPayCredit: document.getElementById('btnPayCredit'),
    btnSeed: document.getElementById('btnSeed')
};

// ==========================================
// AUTH & BOOTSTRAP
// ==========================================
onAuthStateChanged(auth, (user) => {
    if (user) {
        UI.status.textContent = "Online (Anon)";
        UI.status.className = "px-2 py-1 rounded text-xs font-medium bg-green-100 text-green-800";
        enableControls(false); // Valid connection, but wait for 'New Bill' to enable inputs
        console.log("Signed in as", user.uid);
    } else {
        UI.status.textContent = "Disconnected";
        UI.status.className = "px-2 py-1 rounded text-xs font-medium bg-red-100 text-red-800";
        signInAnonymously(auth).catch((error) => {
            console.error("Auth failed", error);
            Swal.fire("Login Failed", error.message, "error");
        });
    }
});

function enableControls(enabled) {
    UI.inputBarcode.disabled = !enabled;
    UI.btnPayCash.disabled = !enabled;
    UI.btnPayCredit.disabled = !enabled;
    if (enabled) {
        UI.inputBarcode.focus();
    }
}

// ==========================================
// CORE LOGIC: BOGO & CART
// ==========================================

// --- 1. PRODUCT LOOKUP & ADD ---
async function handleScan(code, qty) {
    if (!state.currentRunId) {
        Swal.fire("Error", "Please open a new bill first.", "warning");
        return;
    }

    setLoading(true);
    try {
        let productCode = code;
        
        // 1. Lookup Barcode first
        const barcodeRef = doc(db, "barcodes", code);
        const barcodeSnap = await getDoc(barcodeRef);
        
        if (barcodeSnap.exists()) {
            productCode = barcodeSnap.data().productCode;
        }

        // 2. Lookup Product
        const productRef = doc(db, "products", productCode);
        const productSnap = await getDoc(productRef);

        if (!productSnap.exists()) {
            // Not Found -> Manual Input Dialog
            setLoading(false);
            const { value: manualCode } = await Swal.fire({
                title: 'ไม่พบรหัสสินค้า',
                text: 'กรุณาใช้ HHT แสกน และกรอกรหัสสินค้า',
                input: 'text',
                inputLabel: 'Product Code (7 digits)',
                showCancelButton: true
            });
            
            if (manualCode) {
                // Recursive call with manual code (assuming manual code is product code)
                handleScan(manualCode, qty); 
            }
            return;
        }

        const product = productSnap.data();
        await addItemToCart(productCode, product, qty);
        
        // Reset Inputs
        UI.inputQty.value = 1;
        UI.inputBarcode.value = '';
        UI.inputBarcode.focus();

    } catch (e) {
        console.error(e);
        Swal.fire("Error", "Scan failed: " + e.message, "error");
    } finally {
        setLoading(false);
    }
}

// --- 2. ADD ITEM ALGORITHM (BOGO) ---
async function addItemToCart(productCode, product, inputQty) {
    const runRef = doc(db, "runs", state.currentRunId);
    
    // Logic for BOGO
    // Rules:
    // If flagG == 101:
    //   Analyze current cart items for this product that are "unpaired" (promoTag != 'D', pairedWithLine == null).
    //   Also split inputQty into Pairs and Singles.
    //   Match Singles with existing Singles.
    
    // We run this inside a transaction or simply use optimistic updates. 
    // Given the complexity and "Add" nature, we'll fetch latest items to ensure integrity locally or rely on Firestore rules/functions.
    // Ideally, for a robust POS, we recalculate the whole cart order or use a Transaction.
    // Here we will use a Transaction to ensure atomic pairing.

    await runTransaction(db, async (transaction) => {
        // Read current items to find pairs
        // NOTE: In a real high-concurrency app, reading all items might be heavy. But for a POS single terminal per bill, it's fine.
        const itemsRef = collection(runRef, "items");
        const itemsQuery = query(itemsRef, where("void", "==", false)); 
        const itemsSnap = await getDocs(itemsQuery);
        let items = itemsSnap.docs.map(d => ({id: d.id, ...d.data()}));
        
        // Filter for same product and available for pairing
        // "Available" means: productCode match, flagG=101, promptTag != 'D' (not already discounted/paired)
        // AND verify logic: if it's already in the cart, it should currently be at full price (or Q price).
        
        let pendingQty = inputQty;

        // Determine Base Price Logic
        const getBasePrice = (p) => (p.priceH > 0 ? p.priceH : p.priceQ);

        // Prepare new writes
        let newItems = [];
        let updateOps = [];

        // Function to create a line item object
        const createItem = (q, price, promo = null, pairId = null, discount = 0) => {
            const lineRef = doc(collection(runRef, "items")); // Auto ID
            return {
                ref: lineRef,
                data: {
                    lineNo: Date.now(), // Simplified auto-inc for demo
                    productCode: productCode,
                    desc: product.desc,
                    qty: q,
                    unitPrice: price,
                    lineAmount: q * price,
                    discountAmount: discount, // Negative value
                    promoTag: promo,
                    pairedWithLine: pairId,
                    void: false,
                    createdAt: serverTimestamp()
                }
            };
        };

        if (product.flagG === 101) {
            // BOGO LOGIC
            // Look for existing single waiting for pair
            const existingSingle = items.find(i => i.productCode === productCode && i.promoTag !== 'D' && !i.pairedWithLine);

            if (existingSingle && pendingQty > 0) {
                // ** MATCH 1 **
                // We have one in cart, adding at least one.
                // Pair existingSingle with ONE of the new items.
                pendingQty--;

                // Logic to pair:
                // Both get effective price = priceM / 2? Or one full one discounted?
                // Spec says: "Pair price = priceM", "discountAmount (-Price)"
                // Make neat: Each item effectively costs priceM/2 for simplicity? 
                // OR: Buy 1 @ Full, Get 1 @ (PriceM - Full).
                // Usually BOGO in POS:
                // Item A: UnitPrice = Full, Discount = 0
                // Item B: UnitPrice = Full, Discount = -(2*Full - PriceM) -> To make Header + Line = PriceM?
                // Spec says: "เลือก ราคาต่อหน่วยที่ต่ำกว่า เป็นตัวทำส่วนลด (ทำให้สุทธิเท่าราคาคู่ priceM)"
                // But here they are SAME product. So same price.
                
                // Let's go with:
                // Item 1 (Existing): Update to be paired.
                // Item 2 (New): Created as paired.
                
                // Effective Total for 2 items should be product.priceM.
                // Current Existing Item Amount = existingSingle.lineAmount (usually priceH).
                // New Item Amount = priceH.
                // Total Pre-Disc = 2 * priceH.
                // Target = priceM.
                // Total Discount = Target - Pre-Disc.
                // Apply discount to the NEW item (or spread). 
                // Spec: "create discount item (-Price)... promoTag=D ... pairedWithLine"
                
                const basePrice = getBasePrice(product);
                const totalTarget = product.priceM;
                const discountValue = (2 * basePrice) - totalTarget; 
                // Note: discountAmount needs to be negative? Spec says "เป็นลบเมื่อมีส่วนลด"
                const discountAmount = -Math.abs(discountValue);

                // Update Existing Item
                // Just mark it as paired, no discount (keep full price), or share discount?
                // Spec: "Select lower price unit to discount... to make net = priceM"
                // For valid pairing of same product, we apply discount to the second one (current one).
                
                // Update Existing ID
                transaction.update(doc(itemsRef, existingSingle.id), {
                    promoTag: 'D', 
                    // We need the ID of the new item. We generate ref first.
                }); // Will fill pairedWithLine later

                // Create New Item (The pair)
                const newItemObj = createItem(1, basePrice, 'D', null, discountAmount);
                // Link them
                transaction.update(doc(itemsRef, existingSingle.id), { pairedWithLine: newItemObj.ref.id });
                newItemObj.data.pairedWithLine = existingSingle.id;
                
                transaction.set(newItemObj.ref, newItemObj.data);
            }
            
            // Now handle remaining pendingQty
            // If we have >= 2 remaining, they pair themselves.
            while (pendingQty >= 2) {
                pendingQty -= 2;
                // Pair internal
                const basePrice = getBasePrice(product);
                const totalTarget = product.priceM;
                const discountValue = (2 * basePrice) - totalTarget; 
                const discountAmount = -Math.abs(discountValue);

                const item1 = createItem(1, basePrice, 'D', null, 0); // Paying full
                const item2 = createItem(1, basePrice, 'D', null, discountAmount); // Getting discount

                item1.data.pairedWithLine = item2.ref.id;
                item2.data.pairedWithLine = item1.ref.id;

                transaction.set(item1.ref, item1.data);
                transaction.set(item2.ref, item2.data);
            }

            // If 1 left
            if (pendingQty === 1) {
                const basePrice = getBasePrice(product);
                const singleItem = createItem(1, basePrice, null, null, 0); // Normal price, waiting for pair
                transaction.set(singleItem.ref, singleItem.data);
            }

        } else {
            // NORMAL ITEM (Not 101)
            // Loop add (or just add qty if we want to update line, but spec implies "Add Row")
            // Specs says "Add row runs/{runId}/items". I will add separate rows for simplicity and history tracking.
            if (inputQty > 0) {
                const basePrice = getBasePrice(product);
                // Can group qty in one line if not BOGO? 
                // User spec: "Subcollection items/{lineId}... qty" 
                // So yes, we can put qty=inputQty in one line.
                const item = createItem(inputQty, basePrice);
                transaction.set(item.ref, item.data);
            }
        }
    });
}

// --- 3. VOID LOGIC ---
async function handleVoid(itemId) {
    if (!confirm("Confirm Void?")) return;
    
    setLoading(true);
    try {
        const itemRef = doc(db, "runs", state.currentRunId, "items", itemId);
        
        await runTransaction(db, async (transaction) => {
            const itemSnap = await transaction.get(itemRef);
            if (!itemSnap.exists()) throw "Item not found";
            
            const item = itemSnap.data();
            if (item.void) throw "Already voided";

            // Mark Void
            transaction.update(itemRef, { void: true, voidAt: serverTimestamp() });

            // BOGO Re-balance
            if (item.pairedWithLine) {
                const partnerRef = doc(db, "runs", state.currentRunId, "items", item.pairedWithLine);
                const partnerSnap = await transaction.get(partnerRef);
                
                if (partnerSnap.exists()) {
                    // Reset partner to normal single status
                    // 1. Remove pairedWithLine
                    // 2. Remove promoTag
                    // 3. Reset DiscountAmount to 0
                    transaction.update(partnerRef, {
                        pairedWithLine: null,
                        promoTag: null,
                        discountAmount: 0
                        // Note: unitPrice stays as is (it was basePrice)
                    });
                }
            }
        });
        
    } catch (e) {
        console.error(e);
        Swal.fire("Error", "Void failed: " + e, "error");
    } finally {
        setLoading(false);
    }
}


// ==========================================
// UI HANDLING
// ==========================================

// --- Event Listeners ---
UI.btnNewBill.addEventListener('click', async () => {
    // Create new Run
    if (!auth.currentUser) { Swal.fire("Error", "Offline", "error"); return; }
    
    setLoading(true);
    try {
        // Create Doc
        // Note: Using client-side timestamp for ID or random, spec says "Cloud Function gen" optionally. 
        // We will use random ID for ease or Timestamp.
        const runId = "BILL-" + Date.now();
        const runRef = doc(db, "runs", runId); // Specific ID for cleaner URLs/Ref
        
        await setDoc(runRef, {
            billNo: runId,
            status: "open",
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
            coupons: [] // Init empty
        });
        
        state.currentRunId = runId;
        state.coupons = [];
        
        // Listen to Items
        setupLiveCart(runId);
        
        // Update UI
        UI.runIdDisplay.innerText = "Run ID: " + runId;
        enableControls(true);
        UI.inputBarcode.focus();

    } catch (e) {
        console.error(e);
        Swal.fire("Error", "Could not create bill", "error");
    } finally {
        setLoading(false);
    }
});

function setupLiveCart(runId) {
    // Unsubscribe previous if any (omitted for brevity)
    
    // Subscribe to items Subcollection
    const itemsRef = collection(db, "runs", runId, "items");
    const q = query(itemsRef, orderBy("createdAt", "asc"));
    
    // Also subscribe to Run Doc for coupons update
    onSnapshot(doc(db, "runs", runId), (snap) => {
       if(snap.exists()) {
           state.coupons = snap.data().coupons || [];
           recalcTotals();
       } 
    });

    onSnapshot(q, (snapshot) => {
        state.cartItems = [];
        UI.cartList.innerHTML = '';
        
        snapshot.forEach(doc => {
            const data = doc.data();
            data.id = doc.id;
            state.cartItems.push(data);
        });
        
        renderCart();
        recalcTotals();
    });
}

function renderCart() {
    UI.cartList.innerHTML = '';
    
    state.cartItems.forEach((item, index) => {
        const isVoid = item.void;
        const row = document.createElement('div');
        row.className = `flex items-center px-4 py-2 border-b border-gray-100 hover:bg-gray-50 text-sm ${isVoid ? 'bg-red-50 opacity-50' : ''}`;
        
        // HTML Template
        row.innerHTML = `
            <div class="w-10 text-center text-gray-400">${index + 1}</div>
            <div class="w-24 font-mono text-gray-600">${item.productCode}</div>
            <div class="flex-1 font-medium text-gray-800 ${isVoid ? 'line-through decoration-red-500' : ''}">${item.desc}</div>
            <div class="w-16 text-center font-bold">${item.qty}</div>
            <div class="w-20 text-right text-gray-600">${item.unitPrice.toFixed(2)}</div>
            <div class="w-24 text-right font-bold text-gray-800">${item.lineAmount.toFixed(2)}</div>
            <div class="w-20 text-right text-red-500 text-xs">${item.discountAmount ? item.discountAmount.toFixed(2) : '-'}</div>
            <div class="w-12 text-center text-xs font-bold text-blue-600">${item.promoTag || '-'}</div>
            <div class="w-12 text-center">
                ${!isVoid ? `<button class="text-red-400 hover:text-red-700 font-bold" onclick="app.voidItem('${item.id}')">X</button>` : '<span class="text-red-500 text-xs">VOID</span>'}
            </div>
        `;
        UI.cartList.appendChild(row);
    });
    
    // Auto scroll to bottom
    UI.cartList.scrollTop = UI.cartList.scrollHeight;
}

function recalcTotals() {
    // 1. Subtotal (Sum of non-void lineAmounts)
    // 2. Discount (Sum of non-void discountAmounts + Coupons)
    // 3. Net Total
    
    let subtotal = 0;
    let lineDiscounts = 0;
    
    state.cartItems.forEach(item => {
        if (!item.void) {
            subtotal += item.lineAmount;
            lineDiscounts += (item.discountAmount || 0); // these are negative
        }
    });

    let couponDiscounts = 0;
    state.coupons.forEach(c => {
        couponDiscounts -= c.amount; // Coupon amounts are positive in DB? Spec says "runs/{runId}.coupons[] {amount...}". Usually subtracted. Assuming amount is positive value to be subtracted.
    });

    const totalDiscount = lineDiscounts + couponDiscounts;
    const netTotal = subtotal + totalDiscount;
    
    UI.subtotal.textContent = subtotal.toFixed(2);
    UI.discount.textContent = totalDiscount.toFixed(2);
    UI.netTotal.textContent = netTotal.toFixed(2);
    
    state.calculatedNetTotal = netTotal;
}

// --- Inputs Handling ---
UI.inputBarcode.addEventListener('keyup', (e) => {
    if (e.key === 'Enter') {
        const code = UI.inputBarcode.value.trim();
        const qty = parseInt(UI.inputQty.value) || 1;
        if (code) {
            handleScan(code, qty);
        }
    }
});

// Shortcut Alt+Q
document.addEventListener('keydown', (e) => {
    if (e.altKey && e.key.toLowerCase() === 'q') {
        e.preventDefault();
        UI.inputQty.focus();
        UI.inputQty.select();
    }
});


// --- Coupons ---
window.app.addCoupon = async function(type) {
    if (!state.currentRunId) return;
    
    const colors = {
        store: '#e0f2fe', // blue
        vendor: '#fce7f3', // pink
        mobile: '#dcfce7' // green
    };
    
    const { value: formValues } = await Swal.fire({
        title: `Add ${type.toUpperCase()} Coupon`,
        background: colors[type],
        html:
            '<input id="swal-code" class="swal2-input" placeholder="Coupon Code">' +
            '<input id="swal-amount" type="number" class="swal2-input" placeholder="Amount (Baht)">',
        focusConfirm: false,
        preConfirm: () => {
            return [
                document.getElementById('swal-code').value,
                document.getElementById('swal-amount').value
            ];
        }
    });

    if (formValues) {
        const [code, amountStr] = formValues;
        const amount = parseFloat(amountStr);
        if (!code || isNaN(amount) || amount <= 0) return;

        // Add to Firestore array
        const runRef = doc(db, "runs", state.currentRunId);
        // We read-modify-write coupons array (or use arrayUnion if simple)
        // Since we need to append object, arrayUnion works.
        await updateDoc(runRef, {
            coupons: [...state.coupons, { type, code, amount }]
        });
        
        Swal.fire("Added", "Coupon added", "success");
    }
};

// --- Payment ---
async function handlePayment(method) {
    if (!state.currentRunId || state.calculatedNetTotal <= 0) return;
    
    if (method === 'cash') {
        const { value: cashReceived } = await Swal.fire({
            title: 'Receive Cash',
            html: `<h2 class="text-3xl font-bold mb-4">${state.calculatedNetTotal.toFixed(2)}</h2>`,
            input: 'number',
            inputLabel: 'Amount Received',
            inputValue: '',
            showCancelButton: true
        });
        
        if (cashReceived) {
            const paid = parseFloat(cashReceived);
            const change = paid - state.calculatedNetTotal;
            
            if (change < 0) {
                Swal.fire("Error", "Not enough cash", "error");
                return;
            }
            
            await closeBill({
                method: 'cash',
                paid: paid,
                change: change
            });

            // Receipt Dialog
            await Swal.fire({
                title: 'Payment Success',
                icon: 'success',
                html: `
                    <div class="text-left font-mono">
                        <p>Total: ${state.calculatedNetTotal.toFixed(2)}</p>
                        <p>Cash:  ${paid.toFixed(2)}</p>
                        <hr>
                        <p class="font-bold text-xl">Change: ${change.toFixed(2)}</p>
                    </div>
                `,
                confirmButtonText: 'New Bill' // This could trigger new bill
            });
            UI.inputBarcode.value = '';
            UI.inputQty.value = 1;
            // Optionally auto open new bill or wait for click
        }
    } else {
        // Credit
        const { value: cardNo } = await Swal.fire({
            title: 'Credit Card',
            input: 'text',
            inputLabel: 'Last 4 Digits',
            showCancelButton: true
        });
        
        if (cardNo) {
            await closeBill({
                method: 'credit',
                paid: state.calculatedNetTotal,
                change: 0,
                cardLast4: cardNo
            });
            
            await Swal.fire("Success", "Card Payment Approved", "success");
        }
    }
}

async function closeBill(paymentData) {
    const runRef = doc(db, "runs", state.currentRunId);
    await updateDoc(runRef, {
        status: 'closed',
        payment: paymentData,
        closedAt: serverTimestamp(),
        netTotalAtClose: state.calculatedNetTotal
    });
    
    // Clear State
    state.currentRunId = null;
    state.cartItems = [];
    state.coupons = [];
    UI.cartList.innerHTML = '';
    UI.runIdDisplay.textContent = "Run ID: -";
    UI.subtotal.textContent = "0.00";
    UI.discount.textContent = "0.00";
    UI.netTotal.textContent = "0.00";
    enableControls(false);
}

UI.btnPayCash.addEventListener('click', () => handlePayment('cash'));
UI.btnPayCredit.addEventListener('click', () => handlePayment('credit'));

// --- Helpers: Seed Data ---
UI.btnSeed.addEventListener('click', async () => {
    if (!confirm("Add sample products (Reset old ones)?")) return;
    setLoading(true);
    try {
        const batch = writeBatch(db);
        
        // 1. Products
        const products = [
             { code: "1001", desc: "Coca Cola 325ml", priceH: 15, flagG: 0, priceM: 0, priceQ: 15 },
             { code: "1002", desc: "Lays Classic (BOGO)", priceH: 30, flagG: 101, priceM: 30, priceQ: 30 }, 
             // Note: BOGO items usually have priceM = price for 2? 
             // Spec: "priceM // ราคาโปร/ราคาคู่ใน BOGO" -> So if Buy 1 Get 1 Free, PriceM is 30 (cost of 1). 
             // If Buy 2 for 50, PriceM is 50.
             // Im making Lays 30 THB per bag. If BOGO (101), PriceM should be 30 THB (Buy 2 Pay 30).
        ];
        
        products.forEach(p => {
            const ref = doc(db, "products", p.code);
            batch.set(ref, p);
        });

        // 2. Barcodes
        const barcodes = [
            { barcode: "8851001", productCode: "1001" },
            { barcode: "8851002", productCode: "1002" }
        ];

        barcodes.forEach(b => {
             const ref = doc(db, "barcodes", b.barcode);
             batch.set(ref, b);
        });

        await batch.commit();
        Swal.fire("Done", "Sample data added. \nCodes: 1001, 1002\nBarcodes: 8851001, 8851002", "success");

    } catch (e) {
        console.error(e);
        Swal.fire("Error", e.message, "error");
    } finally {
        setLoading(false);
    }
});


// Global exports for inline HTML onclicks
window.app = {
    addCoupon,
    voidItem: handleVoid
};

function setLoading(isLoading) {
    state.loading = isLoading;
    if (isLoading) Swal.showLoading();
    else Swal.close();
}
