// src/services/dataService.js
import * as XLSX from 'xlsx';
import { APP_CONFIG } from '../config/constants';

export const PRODUCT_STORAGE_KEYS = APP_CONFIG.PRODUCT_STORAGE_KEYS;

// ฟังก์ชันอ่านไฟล์ รองรับทั้ง .xlsx, .xls และ .csv
const readFile = (file) => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();

        reader.onload = (e) => {
            try {
                const data = new Uint8Array(e.target.result);
                // type: 'array' รองรับไฟล์ได้ครอบคลุมที่สุดทั้ง Excel รุ่นเก่า/ใหม่ และ CSV
                const workbook = XLSX.read(data, { type: 'array' });

                // อ่าน Sheet แรกเสมอ
                const firstSheetName = workbook.SheetNames[0];
                const worksheet = workbook.Sheets[firstSheetName];

                // แปลงเป็น JSON โดยใช้ header: 'A' เพื่ออ้างอิง Column เป็นตัวอักษร A, B, C...
                // defval: '' ป้องกันค่า undefined ในช่องว่าง
                const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 'A', defval: '' });
                resolve(jsonData);
            } catch (err) {
                console.error("Error parsing file:", err);
                reject(new Error("ไม่สามารถอ่านไฟล์ได้ กรุณาตรวจสอบว่าเป็นไฟล์ Excel หรือ CSV ที่ถูกต้อง"));
            }
        };

        reader.onerror = (err) => reject(new Error("การอ่านไฟล์ล้มเหลว"));

        // ใช้ readAsArrayBuffer เพื่อรองรับทุก Format (.xlsx, .xls, .csv)
        reader.readAsArrayBuffer(file);
    });
};

export const importItemExport = async (file, onProgress) => {
    if (onProgress) onProgress(10);

    try {
        // ตรวจสอบนามสกุลไฟล์เบื้องต้น (Optional validation)
        const fileName = file.name.toLowerCase();
        if (!fileName.endsWith('.xlsx') && !fileName.endsWith('.xls') && !fileName.endsWith('.csv')) {
            throw new Error("รองรับเฉพาะไฟล์ .xlsx, .xls และ .csv เท่านั้น");
        }

        const rawData = await readFile(file);
        if (onProgress) onProgress(40);

        // Mapping Data ตาม Column 
        // B: Description (Name)
        // F: Method
        // G: Reg. Price
        // H: Product Code
        // I: Deal Price
        // L: Barcode
        const processedData = rawData.slice(1).map(row => {
            return {
                name: row['B'] ? String(row['B']).trim() : 'Unknown Item',
                method: row['F'] ? parseInt(row['F']) : 0,
                price: row['G'] ? parseFloat(row['G']) : 0,
                code: row['H'] ? String(row['H']).trim().toUpperCase() : '',
                dealPrice: row['I'] ? parseFloat(row['I']) : 0,
                barcode: row['L'] ? String(row['L']).trim().toUpperCase() : ''
            };
        }).filter(item => item.code || item.barcode); // กรองเอาเฉพาะแถวที่มี Code หรือ Barcode

        // บันทึกลง LocalStorage
        localStorage.setItem(PRODUCT_STORAGE_KEYS.itemExport, JSON.stringify(processedData));

        if (onProgress) onProgress(100);
        return processedData;
    } catch (error) {
        console.error("Error importing Item Export:", error);
        throw error;
    }
};

export const importProductMaster = async (file, onProgress) => {
    // ใช้ Logic เดียวกัน หรือแยกถ้าโครงสร้างไฟล์ต่างกัน
    // ในที่นี้ให้เรียกใช้ importItemExport ไปก่อน
    return importItemExport(file, onProgress);
};