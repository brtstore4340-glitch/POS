import { db, fb } from "../data/firebase.js";
import { toast } from "../ui/toast.js";
import { openActionSheet } from "../ui/actionsheet.js";

function norm(s) {
    return String(s ?? "").trim();
}

function findKey(row, ...candidates) {
    const keys = Object.keys(row);
    for (const c of candidates) {
        const k = keys.find(x => x.toLowerCase().trim() === c.toLowerCase().trim());
        if (k) return row[k];
    }
    return null;
}

function parseBarcodes(v) {
    const raw = norm(v);
    if (!raw) return [];
    return raw.split(/[,;\s]+/).map(x => x.trim()).filter(Boolean);
}

export async function importMasterFile(file, { userId, onProgress } = {}) {
    if (!file) return;

    if (!window.XLSX) {
        toast("XLSX library not loaded");
        return;
    }

    toast("Reading file...");
    const buf = await file.arrayBuffer();
    const wb = window.XLSX.read(buf);
    const ws = wb.Sheets[wb.SheetNames[0]];
    const rows = window.XLSX.utils.sheet_to_json(ws);

    if (!rows.length) {
        toast("File is empty");
        return;
    }

    // Build ops
    const ops = [];
    let productCount = 0;

    for (const r of rows) {
        const productCode = norm(findKey(r, "productCode", "Product Code", "Itemcode", "Item Code", "Code"));
        if (!productCode) continue;

        const desc = norm(findKey(r, "desc", "Description", "Item Name", "ItemName", "Name")) || "Unknown";
        const unitPrice = parseFloat(findKey(r, "unitPrice", "Unit Price", "Price", "Retail Price") || 0) || 0;
        const promoTag = norm(findKey(r, "promoTag", "Promo", "Promotion", "Tag")) || null;
        const barcodeRaw = findKey(r, "barcodes", "Barcodes", "barcode", "Barcode", "EAN");

        // products/{productCode}
        ops.push({
            kind: "product",
            ref: fb.doc(db, "products", productCode),
            data: {
                productCode,
                desc,
                unitPrice,
                promoTag,
                updatedAt: fb.serverTimestamp(),
            }
        });

        // barcodes/{barcode}
        const barcodes = parseBarcodes(barcodeRaw);
        for (const b of barcodes) {
            ops.push({
                kind: "barcode",
                ref: fb.doc(db, "barcodes", b),
                data: {
                    barcode: b,
                    productCode,
                    updatedAt: fb.serverTimestamp(),
                }
            });
        }

        productCount++;
    }

    if (!productCount) {
        openActionSheet({
            title: "Import error",
            message: "ไม่พบข้อมูลสินค้า (ตรวจสอบชื่อคอลัมน์ในไฟล์)",
            actions: [{ text: "OK" }]
        });
        return;
    }

    // Batch write
    const BATCH_LIMIT = 450; // safe
    const batches = [];
    let batch = fb.writeBatch(db);
    let n = 0;

    for (const op of ops) {
        batch.set(op.ref, op.data, { merge: true });
        n++;
        if (n >= BATCH_LIMIT) {
            batches.push(batch);
            batch = fb.writeBatch(db);
            n = 0;
        }
    }
    if (n > 0) batches.push(batch);

    // commit sequential (stable)
    const total = batches.length;
    for (let i = 0; i < total; i++) {
        await batches[i].commit();
        const pct = Math.round(((i + 1) / total) * 100);
        onProgress?.(pct);
    }

    // Save metadata: system/masterData
    await fb.setDoc(
        fb.doc(db, "system", "masterData"),
        {
            lastUploadAt: fb.serverTimestamp(),
            lastFileName: file.name,
            productCount,
            updatedBy: userId || null,
        },
        { merge: true }
    );

    toast(`Import done: ${productCount} products`);
}

export async function getMasterMeta() {
    const ref = fb.doc(db, "system", "masterData");
    const snap = await fb.getDoc(ref);
    return snap.exists() ? snap.data() : null;
}
