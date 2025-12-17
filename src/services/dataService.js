import { db, doc, writeBatch, collection, serverTimestamp } from './firebase';
import * as XLSX from 'xlsx';

export const importMasterData = async (file, onProgress) => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = async (e) => {
            try {
                const data = new Uint8Array(e.target.result);
                const workbook = XLSX.read(data, { type: 'array' });
                const firstSheetName = workbook.SheetNames[0];
                const worksheet = workbook.Sheets[firstSheetName];
                const jsonData = XLSX.utils.sheet_to_json(worksheet);

                if (jsonData.length === 0) {
                    throw new Error("Empty file");
                }

                const batchSize = 400;
                const total = jsonData.length;
                let processed = 0;

                // Chucking for Firestore Batch (limit 500)
                for (let i = 0; i < total; i += batchSize) {
                    const chunk = jsonData.slice(i, i + batchSize);
                    const batch = writeBatch(db);

                    chunk.forEach((row) => {
                        // Map Columns based on user request:
                        // "Bill number, scan number (used for look up), product code"
                        // Column L = Product? 
                        // User said: "scan number (use this search L in Product, if found... else H product code)"
                        // We need to store everything to allow flexible search.
                        // Let's normalize keys

                        // Assumed Keys based on typical Excel headers, we might need to adjust based on actual file.
                        // For now, store strictly what we get but ensure 'code' and 'barcode' exist.

                        // Row usually has: "Item Code", "Barcode", "Reg. Price", "Deal Price"
                        // I'll assume English headers or standard mapping.
                        // Let's rely on User providing standard headers or map them here?
                        // User mentioned: "Item_Export".

                        // Helper to find key case-insensitive
                        const getVal = (obj, keyPart) => {
                            const foundKey = Object.keys(obj).find(k => k.toLowerCase().includes(keyPart.toLowerCase()));
                            return foundKey ? obj[foundKey] : null;
                        };

                        const code = getVal(row, 'product code') || getVal(row, 'item code') || String(i);
                        const barcode = getVal(row, 'barcode') || code;
                        const name = getVal(row, 'name') || getVal(row, 'description') || 'Unknown Item';
                        const regPrice = getVal(row, 'reg. price') || getVal(row, 'price') || 0;
                        const dealPrice = getVal(row, 'deal price') || 0;

                        // Store in 'products' collection
                        // Use Code as ID
                        const docRef = doc(db, "products", String(code));
                        batch.set(docRef, {
                            code: String(code),
                            barcode: String(barcode),
                            name: String(name),
                            price: Number(regPrice),
                            dealPrice: Number(dealPrice),
                            raw: row, // Store raw for safety
                            updatedAt: serverTimestamp()
                        });
                    });

                    await batch.commit();
                    processed += chunk.length;
                    if (onProgress) onProgress(Math.round((processed / total) * 100));
                }

                resolve({ count: total });
            } catch (err) {
                reject(err);
            }
        };
        reader.onerror = (err) => reject(err);
        reader.readAsArrayBuffer(file);
    });
};
