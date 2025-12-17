function debounce(fn, ms) {
    let t;
    return (...args) => {
        clearTimeout(t);
        t = setTimeout(() => fn(...args), ms);
    };
}

export function initSearch({ inputEl, resultsEl, items = [], onPick }) {
    if (!inputEl || !resultsEl) return;

    const show = (list) => {
        if (!list.length) {
            resultsEl.innerHTML = `<div class="px-4 py-4 text-sm" style="color: var(--muted);">No results</div>`;
        } else {
            resultsEl.innerHTML = list.map(it => `
        <div class="px-4 py-3 flex items-center justify-between cursor-pointer"
             style="border-top: 1px solid var(--border);"
             data-code="${it.code}">
          <div class="min-w-0">
            <div class="truncate text-sm font-semibold">${it.name}</div>
            <div class="text-[11px] font-mono" style="color: var(--muted);">${it.code}</div>
          </div>
          <div class="text-sm font-mono font-bold">${Number(it.price || 0).toFixed(2)}</div>
        </div>
      `).join("");

            resultsEl.querySelectorAll("[data-code]").forEach(el => {
                el.addEventListener("click", () => {
                    const code = el.getAttribute("data-code");
                    const picked = items.find(x => x.code === code) || { code };
                    resultsEl.classList.add("hidden");
                    inputEl.value = "";
                    onPick?.(picked);
                });
            });
        }
        resultsEl.classList.remove("hidden");
    };

    inputEl.addEventListener("input", debounce((e) => {
        const term = (e.target.value || "").trim().toLowerCase();
        if (term.length < 2) {
            resultsEl.classList.add("hidden");
            return;
        }
        const results = items
            .filter(p => String(p.code).includes(term) || String(p.name).toLowerCase().includes(term))
            .slice(0, 5);
        show(results);
    }, 180));

    document.addEventListener("click", (e) => {
        if (!inputEl.contains(e.target) && !resultsEl.contains(e.target)) {
            resultsEl.classList.add("hidden");
        }
    });
}
