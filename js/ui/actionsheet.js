const $ = (id) => document.getElementById(id);

export function openActionSheet({ title = "Menu", message = "", actions = [], onClose = null }) {
    const backdrop = $("iosBackdrop");
    const wrap = $("iosSheetWrap");
    const titleEl = $("iosSheetTitle");
    const msgEl = $("iosSheetMsg");
    const actionsEl = $("iosSheetActions");
    const cancelBtn = $("iosSheetCancel");

    titleEl.textContent = title;
    msgEl.textContent = message || "";
    msgEl.style.display = message ? "block" : "none";

    actionsEl.innerHTML = "";
    actions.forEach((a) => {
        const btn = document.createElement("button");
        btn.className = "ios-sheet-btn" + (a.destructive ? " danger" : "");
        btn.textContent = a.text || "Action";
        btn.disabled = !!a.disabled;
        btn.onclick = () => {
            close();
            if (typeof a.onClick === "function") a.onClick();
        };
        actionsEl.appendChild(btn);
    });

    function escClose(e) { if (e.key === "Escape") close(); }

    function close() {
        backdrop.style.display = "none";
        wrap.style.display = "none";
        document.removeEventListener("keydown", escClose);
        if (typeof onClose === "function") onClose();
    }

    cancelBtn.onclick = close;
    backdrop.onclick = close;
    document.addEventListener("keydown", escClose);

    backdrop.style.display = "block";
    wrap.style.display = "flex";
}
