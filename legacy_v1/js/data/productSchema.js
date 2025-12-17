const normalizer = (str = "") => String(str).trim().toLowerCase().replace(/[^a-z0-9]/g, "");

export const csvColumns = [
  { name: "Dept", key: "dept", required: true },
  { name: "ID", key: "id", required: true },
  { name: "DeptCode", key: "deptcode", required: true },
  { name: "DeptDesc", key: "deptdesc", required: true },
  { name: "GroupCode", key: "groupcode", required: true },
  { name: "GroupDesc", key: "groupdesc", required: true },
  { name: "SubGroupCode", key: "subgroupcode", required: true },
  { name: "ProductCode", key: "productcode", required: true },
  { name: "Promo", key: "promo", required: false },
  { name: "ProductDesc", key: "productdesc", required: true },
  { name: "Size", key: "size", required: false },
  { name: "Barcode", key: "barcode", required: true },
  { name: "SupplierCode", key: "suppliercode", required: true },
  { name: "SupplierName", key: "suppliername", required: true },
  { name: "VatRate", key: "vatrate", required: true },
  { name: "ProductType", key: "producttype", required: true },
  { name: "ProductStatus", key: "productstatus", required: true },
  { name: "RecallPeriod", key: "recallperiod", required: false },
  { name: "SuppUnit", key: "suppunit", required: false },
  { name: "LatestCost", key: "latestcost", required: true },
  { name: "SellPrice", key: "sellprice", required: true },
  { name: "DateCreated", key: "datecreated", required: true },
  { name: "DateLastAmended", key: "datelastamended", required: false },
  { name: "DateLastSold", key: "datelastsold", required: false },
  { name: "DateLastOrdered", key: "datelastordered", required: false },
  { name: "GridProductCode", key: "gridproductcode", required: false },
];

export const normalizeHeader = normalizer;

export function mapCsvRowToProduct(row = {}) {
  const n = (val) => {
    const num = Number(String(val ?? "").replace(/,/g, ""));
    return Number.isFinite(num) ? num : null;
  };
  const dateIso = (val) => {
    if (!val) return null;
    const d = new Date(val);
    return Number.isNaN(d.getTime()) ? null : d.toISOString();
  };
  const boolish = (val) => {
    const v = String(val ?? "").trim().toLowerCase();
    return v === "true" || v === "1" || v === "y" || v === "yes";
  };

  return {
    productCode: row.productcode ?? "",
    productDesc: row.productdesc ?? "",
    barcode: row.barcode ?? "",
    dept: {
      id: row.id ?? "",
      code: row.deptcode ?? "",
      desc: row.deptdesc ?? "",
      group: {
        code: row.groupcode ?? "",
        desc: row.groupdesc ?? "",
        subGroupCode: row.subgroupcode ?? "",
      },
    },
    supplier: {
      code: row.suppliercode ?? "",
      name: row.suppliername ?? "",
    },
    pricing: {
      latestCost: n(row.latestcost),
      sellPrice: n(row.sellprice),
      vatRate: n(row.vatrate),
      promo: boolish(row.promo),
    },
    meta: {
      productType: row.producttype ?? "",
      status: row.productstatus ?? "",
      size: row.size ?? "",
      recallPeriodDays: n(row.recallperiod),
      suppUnit: row.suppunit ?? "",
      gridProductCode: row.gridproductcode ?? "",
    },
    dates: {
      created: dateIso(row.datecreated),
      lastAmended: dateIso(row.datelastamended),
      lastSold: dateIso(row.datelastsold),
      lastOrdered: dateIso(row.datelastordered),
    },
  };
}
