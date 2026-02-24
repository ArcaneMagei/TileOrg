const STORAGE_KEY = "tile-wall-simulator-state-v4";

const defaultTileTypes = [
  { name: "Carrara", color: "#efeae2", packs: 4, perPack: 12, image: "" },
  { name: "Slate", color: "#7e838d", packs: 4, perPack: 10, image: "" },
  { name: "Terracotta", color: "#c87852", packs: 4, perPack: 9, image: "" },
  { name: "Sea Glass", color: "#79c7ba", packs: 4, perPack: 8, image: "" },
  { name: "Sand", color: "#dcc69d", packs: 4, perPack: 11, image: "" },
  { name: "Graphite", color: "#5f6675", packs: 3, perPack: 14, image: "" },
  { name: "Pearl", color: "#f2f2f4", packs: 3, perPack: 13, image: "" },
  { name: "Olive", color: "#9ba26e", packs: 3, perPack: 12, image: "" },
  { name: "Navy", color: "#3c4f82", packs: 3, perPack: 10, image: "" }
];

const controls = {
  columns: document.getElementById("columns"),
  rows: document.getElementById("rows"),
  tileWidthCm: document.getElementById("tileWidthCm"),
  tileHeightCm: document.getElementById("tileHeightCm"),
  viewerScale: document.getElementById("viewerScale"),
  viewerScaleValue: document.getElementById("viewerScaleValue"),
  groutColor: document.getElementById("groutColor"),
  groutSizeMm: document.getElementById("groutSizeMm"),
  groutSizeValue: document.getElementById("groutSizeValue"),
  patternType: document.getElementById("patternType"),
  tileTypes: document.getElementById("tileTypes"),
  overlayShape: document.getElementById("overlayShape"),
  overlayColor: document.getElementById("overlayColor"),
  overlayOpacity: document.getElementById("overlayOpacity"),
  addOverlay: document.getElementById("addOverlay")
};

const wall = document.getElementById("wall");
const tileTemplate = document.getElementById("tileTypeTemplate");
const overlayState = [];
let hydrating = false;

function fileToDataURL(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(new Error("Failed to read image file"));
    reader.readAsDataURL(file);
  });
}

async function fileToOptimizedDataURL(file) {
  try {
    const img = await createImageBitmap(file);
    const maxEdge = 320;
    const ratio = Math.min(1, maxEdge / Math.max(img.width, img.height));
    const w = Math.max(1, Math.round(img.width * ratio));
    const h = Math.max(1, Math.round(img.height * ratio));
    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    canvas.getContext("2d", { alpha: false }).drawImage(img, 0, 0, w, h);
    img.close();
    return canvas.toDataURL("image/jpeg", 0.82);
  } catch {
    return fileToDataURL(file);
  }
}

function safeSetStorage(key, value) {
  try {
    localStorage.setItem(key, value);
    return true;
  } catch {
    return false;
  }
}

function saveState() {
  if (hydrating) return;
  const tileRows = [...controls.tileTypes.querySelectorAll(".tile-type-row")];
  const tileTypes = tileRows.map((row) => ({
    name: row.querySelector(".tile-name").value,
    color: row.querySelector(".tile-color").value,
    packs: Number(row.querySelector(".tile-pack").value || 0),
    perPack: Number(row.querySelector(".tiles-per-pack").value || 0),
    image: row.dataset.image || ""
  }));

  const payload = {
    controls: Object.fromEntries(Object.entries(controls)
      .filter(([k, v]) => v instanceof HTMLInputElement || v instanceof HTMLSelectElement)
      .map(([k, v]) => [k, v.value])),
    tileTypes,
    overlays: overlayState
  };

  const serialized = JSON.stringify(payload);
  if (!safeSetStorage(STORAGE_KEY, serialized)) {
    const trimmed = { ...payload, tileTypes: payload.tileTypes.map((t) => ({ ...t, image: "" })) };
    safeSetStorage(STORAGE_KEY, JSON.stringify(trimmed));
  }
}

function loadState() {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return;
  try {
    hydrating = true;
    const saved = JSON.parse(raw);

    if (saved.controls) {
      Object.entries(saved.controls).forEach(([k, v]) => {
        if (controls[k] && v != null) controls[k].value = v;
      });
    }

    if (Array.isArray(saved.tileTypes)) {
      saved.tileTypes.slice(0, 9).forEach((tile, i) => {
        defaultTileTypes[i] = {
          ...defaultTileTypes[i],
          ...tile,
          packs: Number.isFinite(tile.packs) ? tile.packs : defaultTileTypes[i].packs,
          perPack: Number.isFinite(tile.perPack) ? tile.perPack : defaultTileTypes[i].perPack
        };
      });
    }

    if (Array.isArray(saved.overlays)) {
      overlayState.length = 0;
      saved.overlays.forEach((o) => overlayState.push(o));
    }
  } catch {
    localStorage.removeItem(STORAGE_KEY);
  } finally {
    hydrating = false;
  }
}

function buildTileTypeControls() {
  controls.tileTypes.textContent = "";
  defaultTileTypes.slice(0, 9).forEach((tile, index) => {
    const fragment = tileTemplate.content.cloneNode(true);
    const row = fragment.querySelector(".tile-type-row");
    row.querySelector(".tile-model-id").textContent = `Model ${index + 1}`;
    row.dataset.image = tile.image || "";

    row.querySelector(".tile-name").value = tile.name;
    row.querySelector(".tile-color").value = tile.color;
    row.querySelector(".tile-pack").value = tile.packs;
    row.querySelector(".tiles-per-pack").value = tile.perPack;

    const imageFile = row.querySelector(".tile-image-file");
    const clearImage = row.querySelector(".clear-image");
    const thumb = row.querySelector(".tile-thumb");

    const paintThumb = () => {
      thumb.style.backgroundImage = row.dataset.image ? `url(${row.dataset.image})` : "none";
      thumb.classList.toggle("has-image", Boolean(row.dataset.image));
    };

    row.querySelectorAll("input:not(.tile-image-file)").forEach((input) => {
      input.addEventListener("input", () => {
        saveState();
        renderWall();
      });
    });

    imageFile.addEventListener("change", async () => {
      const [file] = imageFile.files || [];
      if (!file) return;
      row.dataset.image = await fileToOptimizedDataURL(file);
      paintThumb();
      saveState();
      renderWall();
    });

    clearImage.addEventListener("click", () => {
      row.dataset.image = "";
      imageFile.value = "";
      paintThumb();
      saveState();
      renderWall();
    });

    paintThumb();
    controls.tileTypes.appendChild(fragment);
  });
}

function getTileTypes() {
  return [...controls.tileTypes.querySelectorAll(".tile-type-row")].map((row, index) => ({
    id: index,
    name: row.querySelector(".tile-name").value || `Tile ${index + 1}`,
    color: row.querySelector(".tile-color").value,
    total: Number(row.querySelector(".tile-pack").value || 0) * Number(row.querySelector(".tiles-per-pack").value || 0),
    image: row.dataset.image || ""
  }));
}

function noAdjAssign(rows, cols, order) {
  const grid = Array.from({ length: rows }, () => Array(cols).fill(0));
  const n = order.length;
  for (let r = 0; r < rows; r += 1) {
    for (let c = 0; c < cols; c += 1) {
      const left = c > 0 ? grid[r][c - 1] : -1;
      const up = r > 0 ? grid[r - 1][c] : -1;
      const base = (r * 3 + c * 5 + (r % 2) * 2) % n;
      let pick = order[base];
      if (pick === left || pick === up) {
        for (let k = 1; k < n; k += 1) {
          const candidate = order[(base + k) % n];
          if (candidate !== left && candidate !== up) {
            pick = candidate;
            break;
          }
        }
      }
      grid[r][c] = pick;
    }
  }
  return grid;
}

function ensureAllModelsUsed(grid, n) {
  const rows = grid.length;
  const cols = grid[0]?.length || 0;
  const used = new Set(grid.flat());
  for (let model = 0; model < n; model += 1) {
    if (used.has(model)) continue;
    for (let r = 0; r < rows; r += 1) {
      let placed = false;
      for (let c = 0; c < cols; c += 1) {
        const left = c > 0 ? grid[r][c - 1] : -1;
        const right = c + 1 < cols ? grid[r][c + 1] : -1;
        const up = r > 0 ? grid[r - 1][c] : -1;
        const down = r + 1 < rows ? grid[r + 1][c] : -1;
        if (![left, right, up, down].includes(model)) {
          grid[r][c] = model;
          used.add(model);
          placed = true;
          break;
        }
      }
      if (placed) break;
    }
  }
}

function buildPatternGrid(pattern, rows, cols, tileTypes) {
  const n = tileTypes.length;
  const indices = [...Array(n).keys()];
  let grid;

  if (pattern === "antiNeighborRandom") {
    const shuffled = [...indices].sort(() => Math.random() - 0.5);
    grid = noAdjAssign(rows, cols, shuffled);
  } else if (pattern === "antiNeighborBands") {
    const order = [0, 3, 6, 1, 4, 7, 2, 5, 8].map((x) => x % n);
    grid = noAdjAssign(rows, cols, order);
  } else if (pattern === "antiNeighborSpiral") {
    const order = [0, 4, 8, 2, 6, 1, 5, 7, 3].map((x) => x % n);
    grid = noAdjAssign(rows, cols, order);
  } else if (pattern === "antiNeighborDiagonal") {
    const order = [0, 5, 1, 6, 2, 7, 3, 8, 4].map((x) => x % n);
    grid = noAdjAssign(rows, cols, order);
  } else if (pattern === "antiNeighborBlocks") {
    const order = [0, 2, 4, 6, 8, 1, 3, 5, 7].map((x) => x % n);
    grid = noAdjAssign(rows, cols, order);
  } else if (pattern === "inventoryBlend") {
    const pool = tileTypes.flatMap((t, i) => {
      const variance = Math.floor(Math.random() * 21) - 10;
      const count = Math.max(0, t.total + variance);
      return Array.from({ length: count }, () => i);
    });
    if (!pool.length) pool.push(...indices);
    for (let i = pool.length - 1; i > 0; i -= 1) {
      const j = Math.floor(Math.random() * (i + 1));
      [pool[i], pool[j]] = [pool[j], pool[i]];
    }
    const order = [...new Set(pool.concat(indices))];
    grid = noAdjAssign(rows, cols, order);
  } else if (pattern === "latinShift") {
    grid = noAdjAssign(rows, cols, [0, 3, 6, 1, 4, 7, 2, 5, 8].map((x) => x % n));
  } else if (pattern === "diamondWave") {
    grid = noAdjAssign(rows, cols, [8, 4, 0, 7, 3, 6, 2, 5, 1].map((x) => x % n));
  } else {
    grid = noAdjAssign(rows, cols, [0, 5, 2, 7, 4, 1, 6, 3, 8].map((x) => x % n));
  }

  if (rows * cols >= n) ensureAllModelsUsed(grid, n);
  return grid;
}

function applyOverlayStyle(el, overlay) {
  el.style.left = `${overlay.x}px`;
  el.style.top = `${overlay.y}px`;
  el.style.width = `${overlay.width}px`;
  el.style.height = `${overlay.height}px`;
  el.style.backgroundColor = overlay.color;
  el.style.opacity = String(overlay.opacity);
}

function renderOverlays() {
  wall.querySelectorAll(".overlay").forEach((x) => x.remove());
  overlayState.forEach((overlay, index) => {
    const el = document.createElement("div");
    el.className = `overlay ${overlay.shape === "ellipse" ? "ellipse" : ""}`;
    applyOverlayStyle(el, overlay);

    const del = document.createElement("button");
    del.className = "overlay-delete";
    del.type = "button";
    del.textContent = "×";
    del.addEventListener("click", () => {
      overlayState.splice(index, 1);
      saveState();
      renderOverlays();
    });

    const handle = document.createElement("div");
    handle.className = "resize-handle";

    let drag = false;
    let sx = 0;
    let sy = 0;
    el.addEventListener("pointerdown", (e) => {
      if (e.target === handle || e.target === del) return;
      drag = true;
      sx = e.clientX - overlay.x;
      sy = e.clientY - overlay.y;
      el.setPointerCapture(e.pointerId);
    });
    el.addEventListener("pointermove", (e) => {
      if (!drag) return;
      overlay.x = Math.max(0, Math.min(wall.clientWidth - overlay.width, e.clientX - sx));
      overlay.y = Math.max(0, Math.min(wall.clientHeight - overlay.height, e.clientY - sy));
      applyOverlayStyle(el, overlay);
    });
    el.addEventListener("pointerup", () => {
      if (drag) saveState();
      drag = false;
    });

    let resize = false;
    let sw = 0;
    let sh = 0;
    let rx = 0;
    let ry = 0;
    handle.addEventListener("pointerdown", (e) => {
      e.stopPropagation();
      resize = true;
      sw = overlay.width;
      sh = overlay.height;
      rx = e.clientX;
      ry = e.clientY;
      handle.setPointerCapture(e.pointerId);
    });
    handle.addEventListener("pointermove", (e) => {
      if (!resize) return;
      overlay.width = Math.max(30, Math.min(wall.clientWidth - overlay.x, sw + e.clientX - rx));
      overlay.height = Math.max(30, Math.min(wall.clientHeight - overlay.y, sh + e.clientY - ry));
      applyOverlayStyle(el, overlay);
    });
    handle.addEventListener("pointerup", () => {
      if (resize) saveState();
      resize = false;
    });

    el.append(del, handle);
    wall.appendChild(el);
  });
}

function renderWall() {
  const columns = Math.max(1, Number(controls.columns.value));
  const rows = Math.max(1, Number(controls.rows.value));
  const tileWidthCm = Math.max(1, Number(controls.tileWidthCm.value));
  const tileHeightCm = Math.max(1, Number(controls.tileHeightCm.value));
  const scale = Number(controls.viewerScale.value) / 100;
  const groutMm = Number(controls.groutSizeMm.value);

  controls.viewerScaleValue.textContent = `${controls.viewerScale.value}%`;
  controls.groutSizeValue.textContent = `${groutMm.toFixed(1)} mm`;

  const pxPerCm = 3.2 * scale;
  const tilePxW = tileWidthCm * pxPerCm;
  const tilePxH = tileHeightCm * pxPerCm;
  const groutPx = (groutMm / 10) * pxPerCm;

  const pitchX = tilePxW + groutPx;
  const pitchY = tilePxH + groutPx;
  const wallW = Math.round(columns * tilePxW + (columns + 1) * groutPx);
  const wallH = Math.round(rows * tilePxH + (rows + 1) * groutPx);

  wall.style.width = `${wallW}px`;
  wall.style.height = `${wallH}px`;
  wall.style.background = controls.groutColor.value;

  wall.querySelectorAll(".tile").forEach((x) => x.remove());
  const tileTypes = getTileTypes();
  const patternGrid = buildPatternGrid(controls.patternType.value, rows, columns, tileTypes);

  for (let r = 0; r < rows; r += 1) {
    for (let c = 0; c < columns; c += 1) {
      const idx = patternGrid[r][c] % tileTypes.length;
      const model = tileTypes[idx];

      const tile = document.createElement("div");
      tile.className = "tile";
      tile.style.left = `${groutPx + c * pitchX}px`;
      tile.style.top = `${groutPx + r * pitchY}px`;
      tile.style.width = `${tilePxW}px`;
      tile.style.height = `${tilePxH}px`;
      tile.style.backgroundColor = model.color;
      if (model.image) {
        tile.style.backgroundImage = `url(${model.image})`;
        tile.style.backgroundSize = "cover";
        tile.style.backgroundPosition = "center";
      }
      tile.title = model.name;
      wall.appendChild(tile);
    }
  }

  renderOverlays();
}

["columns", "rows", "tileWidthCm", "tileHeightCm", "viewerScale", "groutColor", "groutSizeMm", "patternType", "overlayColor", "overlayOpacity"].forEach((k) => {
  controls[k].addEventListener("input", () => {
    saveState();
    renderWall();
  });
});

controls.addOverlay.addEventListener("click", () => {
  overlayState.push({
    shape: controls.overlayShape.value,
    color: controls.overlayColor.value,
    opacity: Number(controls.overlayOpacity.value),
    x: 18 + overlayState.length * 10,
    y: 18 + overlayState.length * 10,
    width: 140,
    height: 100
  });
  saveState();
  renderOverlays();
});

loadState();
buildTileTypeControls();
renderWall();
