let JsBarcodeLib = null;

async function getBarcodeLib() {
  if (JsBarcodeLib) return JsBarcodeLib;
  try {
    JsBarcodeLib = await import("https://cdn.jsdelivr.net/npm/jsbarcode@3.11.5/dist/JsBarcode.esm.min.js");
    return JsBarcodeLib;
  } catch (err) {
    console.warn("โหลด JsBarcode ไม่สำเร็จ", err);
    return null;
  }
}

async function renderBarcode(el, code) {
  if (!el || !code) return;
  const lib = await getBarcodeLib();
  if (!lib) {
    el.textContent = code;
    el.classList.add("barcode-fallback");
    return;
  }
  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  svg.setAttribute("aria-label", code);
  try {
    lib.default(svg, code, {
      width: 2,
      height: 70,
      displayValue: true,
      fontSize: 12,
      margin: 6,
      background: "transparent",
    });
    el.innerHTML = "";
    el.appendChild(svg);
  } catch (err) {
    console.warn("Barcode render failed", err);
    el.textContent = code;
    el.classList.add("barcode-fallback");
  }
}

function fmt(n) {
  return Number(n || 0).toLocaleString("th-TH", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export async function renderDailyReport({ container, summaryEl, totalEl }, bills = []) {
  if (!container) return;

  const billCount = bills.length;
  const totalAmount = bills.reduce((s, b) => s + (b.total || 0), 0);
  if (summaryEl) summaryEl.textContent = billCount.toLocaleString("th-TH");
  if (totalEl) totalEl.textContent = fmt(totalAmount);

  container.innerHTML = "";
  for (let i = 0; i < bills.length; i += 1) {
    const bill = bills[i];
    const wrap = document.createElement("div");
    wrap.className = "bill-card";

    wrap.innerHTML = `
      <div class="bill-head">
        <div class="bill-title">บิลที่ ${i + 1}. <span class="bill-code">${bill.code || "-"}</span></div>
        <div class="bill-date">${bill.date || ""}</div>
      </div>
      <div class="bill-table">
        <div class="bill-row bill-row-head">
          <div class="bill-col code">Item Code</div>
          <div class="bill-col name">Item Name</div>
          <div class="bill-col qty">Qty</div>
          <div class="bill-col price">Unit Price</div>
          <div class="bill-col promo">Promotion</div>
          <div class="bill-col deal">Deal Price</div>
          <div class="bill-col sum">Sum Price</div>
        </div>
        ${bill.items
          .map(
            (it) => `
          <div class="bill-row">
            <div class="bill-col code">
              <div class="barcode-box" data-code="${it.code || ""}"></div>
            </div>
            <div class="bill-col name">
              <div class="bill-name">${it.name || "-"}</div>
            </div>
            <div class="bill-col qty ${Number(it.qty) > 1 ? "qty-alert" : ""}">${it.qty}</div>
            <div class="bill-col price">${fmt(it.unitPrice)}</div>
            <div class="bill-col promo">${it.promotion || "-"}</div>
            <div class="bill-col deal">${fmt(it.dealPrice || it.unitPrice)}</div>
            <div class="bill-col sum">${fmt(it.sumPrice)}</div>
          </div>
        `
          )
          .join("")}
      </div>
      <div class="bill-footer">
        <div>ยอดรวมที่บันทึกเมื่อปิดบิล: <span class="bill-strong">${fmt(bill.total)}</span> บาท</div>
        <div>ยอดเงินที่รับชำระ: <span class="bill-strong">${fmt(bill.paid)}</span> บาท</div>
        <div>เงินทอน: <span class="bill-strong">${fmt(bill.change)}</span> บาท</div>
        <div class="bill-end">สิ้นสุดบิลวันที่ ${bill.date || "-"}</div>
      </div>
    `;

    container.appendChild(wrap);
  }

  const barcodeTargets = container.querySelectorAll(".barcode-box");
  await Promise.all(Array.from(barcodeTargets).map((el) => renderBarcode(el, el.dataset.code)));
}
