export function setEmptyCart(listEl) {
  if (!listEl) return;
  listEl.innerHTML = `
    <div class="h-full flex flex-col items-center justify-center gap-3 px-6" style="color: var(--muted);">
      <div class="h-16 w-16 rounded-[22px] flex items-center justify-center border border-dashed"
           style="border-color: var(--border); background: rgba(148,163,184,.08);">🧾</div>
      <div class="text-sm font-semibold">ยังไม่มีสินค้าในบิล</div>
    </div>
  `;
}

export function renderCart(listEl, items, { onRemove } = {}) {
  if (!listEl) return;

  if (!items || items.length === 0) {
    setEmptyCart(listEl);
    return;
  }

  listEl.innerHTML = "";

  items.forEach((it, idx) => {
    const row = document.createElement("div");
    row.className =
      "grid grid-cols-[56px_96px_1fr_80px_96px_96px_40px] gap-4 px-6 py-3 border-b items-center";
    row.style.borderColor = "var(--border)";

    row.innerHTML = `
      <div class="text-center text-xs font-mono" style="color: var(--muted);">${idx + 1}</div>
      <div class="text-center text-xs font-mono" style="color: var(--muted);">${it.code}</div>
      <div class="min-w-0">
        <div class="truncate text-sm font-semibold">${it.name}</div>
      </div>
      <div class="text-center text-sm font-bold">${it.qty}</div>
      <div class="text-right text-sm font-mono" style="color: var(--muted);">${it.price.toFixed(2)}</div>
      <div class="text-right text-sm font-mono font-bold">${it.total.toFixed(2)}</div>
      <div class="text-center">
        <button class="inline-flex h-7 w-7 items-center justify-center rounded-full border transition"
          style="border-color: var(--border); background: rgba(148,163,184,.06); color: var(--muted);" title="Remove">×</button>
      </div>
    `;

    row.querySelector("button")?.addEventListener("click", () => onRemove?.(idx));
    listEl.appendChild(row);
  });

  listEl.scrollTop = listEl.scrollHeight;
}
