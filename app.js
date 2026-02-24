const STORAGE_KEY = "tile-wall-simulator-state-v3";

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
    controls: {
      columns: controls.columns.value,
      rows: controls.rows.value,
      tileWidthCm: controls.tileWidthCm.value,
      tileHeightCm: controls.tileHeightCm.value,
      viewerScale: controls.viewerScale.value,
      groutColor: controls.groutColor.value,
      groutSizeMm: controls.groutSizeMm.value,
      patternType: controls.patternType.value
    },
    tileTypes,
    overlays: overlayState
  };

  localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
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
        if (!defaultTileTypes[i]) return;
        defaultTileTypes[i] = {
          name: tile.name || defaultTileTypes[i].name,
          color: tile.color || defaultTileTypes[i].color,
          packs: Number.isFinite(tile.packs) ? tile.packs : defaultTileTypes[i].packs,
          perPack: Number.isFinite(tile.perPack) ? tile.perPack : defaultTileTypes[i].perPack,
          image: tile.image || ""
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
      row.dataset.image = await fileToDataURL(file);
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
    packs: Number(row.querySelector(".tile-pack").value || 0),
    perPack: Number(row.querySelector(".tiles-per-pack").value || 0),
    total: Number(row.querySelector(".tile-pack").value || 0) * Number(row.querySelector(".tiles-per-pack").value || 0),
    image: row.dataset.image || ""
  }));
}

function randomNoAdjacent(rows, cols, tileTypes) {
  const grid = Array.from({ length: rows }, () => Array(cols).fill(0));
  for (let r = 0; r < rows; r += 1) {
    for (let c = 0; c < cols; c += 1) {
      const left = c > 0 ? grid[r][c - 1] : -1;
      const up = r > 0 ? grid[r - 1][c] : -1;
      const options = tileTypes.map((_, i) => i).filter((i) => i !== left && i !== up);
      grid[r][c] = options[Math.floor(Math.random() * options.length)];
    }
  }
  return grid;
}

function inventoryPool(tileTypes) {
  const pool = [];
  tileTypes.forEach((tile, i) => {
    const variance = Math.floor(Math.random() * 21) - 10;
    const count = Math.max(0, tile.total + variance);
    for (let x = 0; x < count; x += 1) pool.push(i);
  });
  for (let i = pool.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }
  return pool;
}

function buildPatternGrid(pattern, rows, cols, tileTypes) {
  const n = tileTypes.length;
  const grid = Array.from({ length: rows }, () => Array(cols).fill(0));

  if (pattern === "antiNeighborRandom") return randomNoAdjacent(rows, cols, tileTypes);

  if (pattern === "inventoryBlend") {
    const pool = inventoryPool(tileTypes);
    let cursor = 0;
    for (let r = 0; r < rows; r += 1) {
      for (let c = 0; c < cols; c += 1) {
        if (!pool.length) {
          grid[r][c] = (r * 3 + c * 5) % n;
          continue;
        }
        let tries = 0;
        let idx = pool[cursor % pool.length];
        while (tries < pool.length) {
          const left = c > 0 ? grid[r][c - 1] : -1;
          const up = r > 0 ? grid[r - 1][c] : -1;
          if (idx !== left && idx !== up) break;
          cursor += 1;
          idx = pool[cursor % pool.length];
          tries += 1;
        }
        grid[r][c] = idx;
        cursor += 1;
      }
    }
    return grid;
  }

  for (let r = 0; r < rows; r += 1) {
    for (let c = 0; c < cols; c += 1) {
      if (pattern === "latinShift") grid[r][c] = (r * 4 + c * 2 + Math.floor(r / 2)) % n;
      else if (pattern === "diamondWave") grid[r][c] = (Math.abs(r - c) + r + c) % n;
      else if (pattern === "checker9") grid[r][c] = (r * 5 + c * 7 + (r % 2) * 3) % n;
      else grid[r][c] = (r + c) % n;
    }
  }

  return grid;
}

function applyOverlayStyle(el, overlay) {
  el.style.left = `${overlay.x}px`;
  el.style.top = `${overlay.y}px`;
  el.style.width = `${overlay.width}px`;
  el.style.height = `${overlay.height}px`;
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

  const wallW = Math.round(columns * tilePxW);
  const wallH = Math.round(rows * tilePxH);

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
      tile.style.left = `${c * tilePxW + groutPx / 2}px`;
      tile.style.top = `${r * tilePxH + groutPx / 2}px`;
      tile.style.width = `${Math.max(1, tilePxW - groutPx)}px`;
      tile.style.height = `${Math.max(1, tilePxH - groutPx)}px`;
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

["columns", "rows", "tileWidthCm", "tileHeightCm", "viewerScale", "groutColor", "groutSizeMm", "patternType"].forEach((k) => {
  controls[k].addEventListener("input", () => {
    saveState();
    renderWall();
  });
});

controls.addOverlay.addEventListener("click", () => {
  overlayState.push({
    shape: controls.overlayShape.value,
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
