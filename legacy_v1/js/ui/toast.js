export function toast(text) {
    const el = document.createElement("div");
    el.textContent = text;

    el.style.position = "fixed";
    el.style.left = "50%";
    el.style.bottom = "24px";
    el.style.transform = "translateX(-50%)";
    el.style.padding = "10px 14px";
    el.style.borderRadius = "999px";
    el.style.background = "rgba(15,23,42,.90)";
    el.style.color = "#fff";
    el.style.fontWeight = "700";
    el.style.fontSize = "12px";
    el.style.zIndex = "80";
    el.style.boxShadow = "0 18px 50px rgba(0,0,0,.25)";

    document.body.appendChild(el);
    setTimeout(() => el.remove(), 1100);
}
