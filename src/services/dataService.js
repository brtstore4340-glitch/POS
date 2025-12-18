import { db, doc, writeBatch, collection, serverTimestamp } from './firebase';
import * as XLSX from 'xlsx';

export const PRODUCT_STORAGE_KEYS = {
    itemExport: 'pos.itemExport',
    productMaster: 'pos.productMaster',
};

const normalizeNumber = (value) => {
    const num = Number(value);
    return Number.isFinite(num) ? num : 0;
};

const normalizeText = (value) => {
    if (value === null || value === undefined) return '';
    return String(value).trim();
};

const buildProduct = ({ code, barcode, name, price, dealPrice, method }) => {
    const normalizedCode = normalizeText(code);
    const normalizedBarcode = normalizeText(barcode);

    return {
        code: normalizedCode,
        barcode: normalizedBarcode || normalizedCode,
        name: normalizeText(name) || 'Unknown Item',
        price: normalizeNumber(price),
        dealPrice: normalizeNumber(dealPrice),
        method: normalizeNumber(method),
        updatedAt: Date.now(),
    };
};

const saveToFirestore = async (products, onProgress) => {
    const batchSize = 400;
    const total = products.length;
    let processed = 0;

    for (let i = 0; i < total; i += batchSize) {
        const chunk = products.slice(i, i + batchSize);
        const batch = writeBatch(db);

        chunk.forEach((product) => {
            if (!product.code) return;
            const docRef = doc(db, 'products', product.code);
            batch.set(docRef, {
                ...product,
                updatedAt: serverTimestamp(),
            });
        });

        await batch.commit();
        processed += chunk.length;
        if (onProgress) onProgress(Math.round((processed / total) * 100));
    }
};

const readSheetRows = async (file) => {
    const buffer = await file.arrayBuffer();
    const data = new Uint8Array(buffer);
    const workbook = XLSX.read(data, { type: 'array' });
    const firstSheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[firstSheetName];
    return XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: '' });
};

export const importItemExport = async (file, onProgress) => {
    const rows = await readSheetRows(file);

    if (!rows.length) {
        throw new Error('Empty file');
    }

    const products = [];

    rows.forEach((row, index) => {
        if (!Array.isArray(row)) return;

        if (index === 0) {
            const headerText = normalizeText(row.join(' ')).toLowerCase();
            if (headerText.includes('product') || headerText.includes('barcode')) {
                return;
            }
        }

        const name = row[1]; // Column B
        const method = row[5]; // Column F
        const regPrice = row[6]; // Column G
        const code = row[7]; // Column H
        const dealPrice = row[8]; // Column I
        const barcode = row[11]; // Column L

        const product = buildProduct({
            code,
            barcode,
            name,
            price: regPrice,
            dealPrice,
            method,
        });

        if (!product.code && !product.barcode) return;
        products.push(product);
    });

    if (!products.length) {
        throw new Error('No valid rows found');
    }

    localStorage.setItem(PRODUCT_STORAGE_KEYS.itemExport, JSON.stringify(products));
    await saveToFirestore(products, onProgress);

    return { count: products.length };
};

export const importProductMaster = async (file, onProgress) => {
    const rows = await readSheetRows(file);

    if (!rows.length) {
        throw new Error('Empty file');
    }

    const header = rows[0] || [];
    const headerMap = {};
    header.forEach((cell, idx) => {
        const key = normalizeText(cell).toLowerCase();
        if (key) headerMap[key] = idx;
    });

    const findIndex = (keyPart, fallback) => {
        const match = Object.keys(headerMap).find((key) => key.includes(keyPart));
        return match ? headerMap[match] : fallback;
    };

    const idxName = findIndex('name', 1);
    const idxMethod = findIndex('method', 5);
    const idxRegPrice = findIndex('reg', 6);
    const idxCode = findIndex('product code', 7);
    const idxDealPrice = findIndex('deal', 8);
    const idxBarcode = findIndex('barcode', 11);

    const products = [];

    rows.slice(1).forEach((row) => {
        if (!Array.isArray(row)) return;

        const product = buildProduct({
            code: row[idxCode],
            barcode: row[idxBarcode],
            name: row[idxName],
            price: row[idxRegPrice],
            dealPrice: row[idxDealPrice],
            method: row[idxMethod],
        });

        if (!product.code && !product.barcode) return;
        products.push(product);
    });

    if (!products.length) {
        throw new Error('No valid rows found');
    }

    localStorage.setItem(PRODUCT_STORAGE_KEYS.productMaster, JSON.stringify(products));
    await saveToFirestore(products, onProgress);

    return { count: products.length };
};
