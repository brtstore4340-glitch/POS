import { toast } from "./toast.js";
import { csvColumns, mapCsvRowToProduct, normalizeHeader } from "../data/productSchema.js";

const prettyBytes = (bytes) => {
  if (!bytes && bytes !== 0) return "-";
  const units = ["B", "KB", "MB", "GB"];
  let i = 0;
  let val = bytes;
  while (val >= 1024 && i < units.length - 1) {
    val /= 1024;
    i += 1;
  }
  return `${val.toFixed(val >= 10 || i === 0 ? 0 : 1)} ${units[i]}`;
};

const parseCsvLine = (line, expectedLen) => {
  const cells = [];
  let cur = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i += 1) {
    const ch = line[i];
    if (ch === '"' && line[i + 1] === '"' && inQuotes) {
      cur += '"';
      i += 1;
    } else if (ch === '"') {
      inQuotes = !inQuotes;
    } else if (ch === "," && !inQuotes) {
      cells.push(cur);
      cur = "";
    } else {
      cur += ch;
    }
  }
  cells.push(cur);

  while (cells.length < expectedLen) cells.push("");
  return cells;
};

async function quickScanCsv(file) {
  const SAMPLE_BYTES = 512 * 1024;
  const chunk = await file.slice(0, SAMPLE_BYTES).text();
  const lines = chunk.split(/\r?\n/).filter((l) => l.trim() !== "");
  if (!lines.length) return { error: "ไฟล์ว่าง" };

  const rawHeaders = lines[0].split(",").map((h) => h.trim());
  const normalizedHeaders = rawHeaders.map((h) => normalizeHeader(h));

  const missing = csvColumns.filter((c) => c.required && !normalizedHeaders.includes(normalizeHeader(c.name)));
  const sampleRows = lines.slice(1, Math.min(lines.length, 6)).map((line) => {
    const cells = parseCsvLine(line, rawHeaders.length);
    const obj = {};
    rawHeaders.forEach((h, idx) => {
      obj[normalizeHeader(h)] = cells[idx]?.trim() ?? "";
    });
    return obj;
  });

  const avgBytes = Math.max(1, Math.round(chunk.length / Math.max(lines.length, 1)));
  const estimatedRows = Math.max(0, Math.round(file.size / avgBytes) - 1);

  return {
    headers: rawHeaders,
    missing,
    sampleRows,
    estimatedRows,
  };
}

const statusCopy = {
  idle: { title: "Ready to upload", note: "รองรับไฟล์ .csv ขนาดไม่เกิน 20MB" },
  validating: { title: "Validating headers", note: "ตรวจสอบ 26 คอลัมน์และรูปแบบ" },
  uploading: { title: "Uploading securely", note: "สตรีมขึ้น Firebase/worker (จำลอง)" },
  completed: { title: "Upload completed", note: "แปลงข้อมูลพร้อมยิงเข้า Firestore" },
  error: { title: "Upload failed", note: "ตรวจสอบข้อความแจ้งเตือนด้านล่าง" },
};

export function initUploadModule({
  dropZone,
  browseBtn,
  fileInput,
  progressEl,
  statusEl,
  statusNoteEl,
  fileNameEl,
  fileSizeEl,
  rowsEl,
  previewEl,
  errorsEl,
  columnsEl,
  firebaseHintEl,
}) {
  if (!dropZone || !fileInput) return;

  const state = {
    step: "idle",
    progress: 0,
    fileName: "ยังไม่เลือกไฟล์",
    fileSize: "-",
    estimatedRows: 0,
    sampleRows: [],
    firebasePreview: null,
    errors: [],
  };

  const renderColumns = () => {
    if (!columnsEl) return;
    columnsEl.innerHTML = csvColumns
      .map(
        (c) => `
        <div class="upload-chip ${c.required ? "required" : ""}">
          <span>${c.name}</span>
          ${c.required ? "<em>required</em>" : "<em>optional</em>"}
        </div>
      `
      )
      .join("");
  };

  renderColumns();

  const setStep = (step, progress) => {
    state.step = step;
    if (typeof progress === "number") state.progress = progress;
    render();
  };

  const setErrors = (errs) => {
    state.errors = errs;
    render();
  };

  const render = () => {
    if (progressEl) progressEl.style.width = `${state.progress}%`;
    if (statusEl) statusEl.textContent = statusCopy[state.step]?.title || "-";
    if (statusNoteEl) statusNoteEl.textContent = statusCopy[state.step]?.note || "";
    if (fileNameEl) fileNameEl.textContent = state.fileName;
    if (fileSizeEl) fileSizeEl.textContent = state.fileSize;
    if (rowsEl) rowsEl.textContent = state.estimatedRows ? state.estimatedRows.toLocaleString() : "กำลังประเมิน...";

    if (previewEl) {
      if (state.firebasePreview) {
        previewEl.textContent = JSON.stringify(state.firebasePreview, null, 2);
      } else if (state.sampleRows.length) {
        previewEl.textContent = JSON.stringify(state.sampleRows[0], null, 2);
      } else {
        previewEl.textContent = "// preview จะโชว์ที่นี่หลังเลือกไฟล์";
      }
    }

    if (errorsEl) {
      if (!state.errors.length) {
        errorsEl.classList.add("hidden");
        errorsEl.innerHTML = "";
      } else {
        errorsEl.classList.remove("hidden");
        errorsEl.innerHTML = state.errors.map((e) => `<div class="upload-error">${e}</div>`).join("");
      }
    }

    if (firebaseHintEl) {
      firebaseHintEl.textContent = "Collection: products (per store or global), Batch: 500 rows/writeBatch";
    }
  };

  const handleFile = async (file) => {
    if (!file) return;
    state.fileName = file.name;
    state.fileSize = prettyBytes(file.size);
    state.firebasePreview = null;
    setErrors([]);
    setStep("validating", 8);

    try {
      const scan = await quickScanCsv(file);
      if (scan.error) {
        setStep("error", 0);
        setErrors([scan.error]);
        toast(scan.error);
        return;
      }

      if (scan.missing.length) {
        setStep("error", 0);
        setErrors(scan.missing.map((c) => `ขาดคอลัมน์: ${c.name}`));
        toast("โครงสร้างไม่ครบ 26 คอลัมน์");
        return;
      }

      state.sampleRows = scan.sampleRows;
      state.estimatedRows = scan.estimatedRows;
      render();

      await simulateUpload(scan);
    } catch (err) {
      console.error(err);
      setStep("error", 0);
      setErrors(["อ่านไฟล์ไม่สำเร็จ", err?.message].filter(Boolean));
    }
  };

  const simulateUpload = async (scan) => {
    setStep("uploading", 30);
    await animateTo(70);

    if (scan.sampleRows?.length) {
      const preview = mapCsvRowToProduct(scan.sampleRows[0]);
      state.firebasePreview = preview;
    }

    await animateTo(96);
    setStep("completed", 100);
    toast("อัปโหลดเสร็จ (จำลอง)");
  };

  const animateTo = (target) =>
    new Promise((resolve) => {
      const tick = () => {
        if (state.progress >= target) return resolve();
        state.progress += Math.max(1, Math.round((target - state.progress) / 8));
        render();
        requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    });

  const onInputChange = (e) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    handleFile(file);
  };

  const onDrop = (e) => {
    e.preventDefault();
    dropZone.classList.remove("dragging");
    const file = e.dataTransfer.files?.[0];
    handleFile(file);
  };

  const onDrag = (e) => {
    e.preventDefault();
    if (e.type === "dragover") dropZone.classList.add("dragging");
    else dropZone.classList.remove("dragging");
  };

  dropZone.addEventListener("click", () => fileInput.click());
  dropZone.addEventListener("dragover", onDrag);
  dropZone.addEventListener("dragleave", onDrag);
  dropZone.addEventListener("drop", onDrop);
  fileInput.addEventListener("change", onInputChange);
  browseBtn?.addEventListener("click", (e) => {
    e.stopPropagation();
    fileInput.click();
  });

  render();
}
