// src/config/constants.js
// Centralized configuration constants for Boots POS

/**
 * Application configuration settings
 */
export const APP_CONFIG = {
    // Authentication & Security
    INACTIVITY_TIMEOUT_MS: 20 * 60 * 1000, // 20 minutes
    SESSION_DURATION_MS: 8 * 60 * 60 * 1000, // 8 hours maximum session
    SYNTHETIC_EMAIL_DOMAIN: 'boots-pos.local',
    MIN_PASSWORD_LENGTH: 6,
    EMPLOYEE_ID_LENGTH: 7,

    // UI/UX
    LOADING_DELAY_MS: 300,
    TOAST_DURATION_MS: 3000,

    // Data
    PRODUCT_STORAGE_KEYS: {
        productMaster: 'pos_product_master_v1',
        itemExport: 'pos_item_export_v1'
    },

    // Import settings
    IMPORT_BATCH_SIZE: 1000,
    MAX_LOCALSTORAGE_SIZE: 5 * 1024 * 1024, // 5MB

    // Business rules
    MAX_ITEMS_PER_BILL: 100,
    DEFAULT_TAX_RATE: 0.07, // 7% VAT
};

/**
 * User roles
 */
export const USER_ROLES = {
    ADMIN: 'admin',
    USER: 'user'
};

/**
 * Transaction statuses
 */
export const TRANSACTION_STATUS = {
    PENDING: 'pending',
    COMPLETED: 'completed',
    CANCELLED: 'cancelled',
    REFUNDED: 'refunded'
};

/**
 * Error messages
 */
export const ERROR_MESSAGES = {
    NETWORK_ERROR: 'ไม่สามารถเชื่อมต่อกับเซิร์ฟเวอร์ได้ กรุณาตรวจสอบการเชื่อมต่ออินเทอร์เน็ต',
    AUTH_FAILED: 'การเข้าสู่ระบบล้มเหลว กรุณาตรวจสอบรหัสพนักงานและรหัสผ่าน',
    PERMISSION_DENIED: 'คุณไม่มีสิทธิ์เข้าถึงฟังก์ชันนี้',
    INVALID_INPUT: 'ข้อมูลไม่ถูกต้อง กรุณาตรวจสอบอีกครั้ง',
    SESSION_EXPIRED: 'เซสชันหมดอายุ กรุณาเข้าสู่ระบบใหม่',
};

/**
 * Success messages
 */
export const SUCCESS_MESSAGES = {
    LOGIN_SUCCESS: 'เข้าสู่ระบบสำเร็จ',
    LOGOUT_SUCCESS: 'ออกจากระบบสำเร็จ',
    PASSWORD_CHANGED: 'เปลี่ยนรหัสผ่านสำเร็จ',
    DATA_SAVED: 'บันทึกข้อมูลสำเร็จ',
    IMPORT_SUCCESS: 'นำเข้าข้อมูลสำเร็จ',
};
