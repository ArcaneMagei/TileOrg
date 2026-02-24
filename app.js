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
  groutSize: document.getElementById("groutSize"),
  groutSizeValue: document.getElementById("groutSizeValue"),
  patternType: document.getElementById("patternType"),
  tileTypes: document.getElementById("tileTypes"),
  overlayShape: document.getElementById("overlayShape"),
  addOverlay: document.getElementById("addOverlay")
};

const wall = document.getElementById("wall");
const tileTemplate = document.getElementById("tileTypeTemplate");
const overlayState = [];

function fileToDataURL(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(new Error("Failed to read image file"));
    reader.readAsDataURL(file);
  });
}

function updateTileThumb(row) {
  const thumb = row.querySelector(".tile-thumb");
  const image = row.dataset.image || "";
  thumb.style.backgroundImage = image ? `url(${image})` : "none";
  thumb.classList.toggle("has-image", Boolean(image));
}

function buildTileTypeControls() {
  defaultTileTypes.forEach((tile, index) => {
    const fragment = tileTemplate.content.cloneNode(true);
    const row = fragment.querySelector(".tile-type-row");
    row.dataset.image = tile.image || "";
    row.querySelector(".tile-model-id").textContent = `Model ${index + 1}`;

    row.querySelector(".tile-name").value = tile.name;
    row.querySelector(".tile-color").value = tile.color;
    row.querySelector(".tile-pack").value = tile.packs;
    row.querySelector(".tiles-per-pack").value = tile.perPack;

    const imageUrl = row.querySelector(".tile-image-url");
    const imageFile = row.querySelector(".tile-image-file");
    const clearImage = row.querySelector(".clear-image");

    row.querySelectorAll("input:not(.tile-image-file)").forEach((input) => {
      input.addEventListener("input", () => {
        if (input.classList.contains("tile-image-url")) {
          row.dataset.image = input.value.trim();
          updateTileThumb(row);
        }
        renderWall();
      });
    });

    imageFile.addEventListener("change", async () => {
      const [file] = imageFile.files || [];
      if (!file) return;
      const dataUrl = await fileToDataURL(file);
      row.dataset.image = dataUrl;
      imageUrl.value = "";
      updateTileThumb(row);
      renderWall();
    });

    clearImage.addEventListener("click", () => {
      row.dataset.image = "";
      imageUrl.value = "";
      imageFile.value = "";
      updateTileThumb(row);
      renderWall();
    });

    updateTileThumb(row);
    controls.tileTypes.appendChild(fragment);
  });
}

function getTileTypes() {
  const rows = controls.tileTypes.querySelectorAll(".tile-type-row");
  return [...rows].map((row, index) => ({
    id: index,
    name: row.querySelector(".tile-name").value || `Tile ${index + 1}`,
    color: row.querySelector(".tile-color").value,
    image: row.dataset.image || row.querySelector(".tile-image-url").value.trim(),
    total: Number(row.querySelector(".tile-pack").value || 0) * Number(row.querySelector(".tiles-per-pack").value || 0)
  }));
}

function buildStackRects(rows, cols) {
  const rects = [];
  for (let r = 0; r < rows; r += 1) {
    for (let c = 0; c < cols; c += 1) {
      rects.push({ r, c, w: 1, h: 1 });
    }
  }
  return rects;
}

function generateTileSelection(totalTiles, tileTypes) {
  const pool = tileTypes.flatMap((tile) => {
    const variance = Math.floor(Math.random() * 21) - 10;
    const count = Math.max(0, tile.total + variance);
    return Array.from({ length: count }, () => tile);
  });

  if (!pool.length) return Array.from({ length: totalTiles }, () => tileTypes[0]);

  for (let i = pool.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }

  if (pool.length >= totalTiles) return pool.slice(0, totalTiles);
  return Array.from({ length: totalTiles }, (_, i) => pool[i % pool.length]);
}

function arrangementForCell(patternType, row, col, tileTypes) {
  const totalTypes = tileTypes.length;
  const indexBy = {
    aligned: (row + col) % totalTypes,
    checker: (row + col) % 2 === 0 ? row % totalTypes : (row + 1) % totalTypes,
    diagonal: (row * 2 + col) % totalTypes,
    pinwheel: ((Math.floor(row / 2) + Math.floor(col / 2)) % totalTypes)
  };

  const rotateBy = {
    aligned: 0,
    checker: (row + col) % 2 === 0 ? 0 : 90,
    diagonal: ((row + col) % 4) * 90,
    pinwheel: (row % 2) * 180 + (col % 2) * 90
  };

  return {
    tile: tileTypes[indexBy[patternType] ?? 0],
    rotate: rotateBy[patternType] ?? 0
  };
}

function applyOverlayStyle(el, overlay) {
  el.style.left = `${overlay.x}px`;
  el.style.top = `${overlay.y}px`;
  el.style.width = `${overlay.width}px`;
  el.style.height = `${overlay.height}px`;
}

function attachOverlayDrag(el, overlay) {
  let startX = 0;
  let startY = 0;
  let dragging = false;

  el.addEventListener("pointerdown", (event) => {
    if (event.target.classList.contains("resize-handle")) return;
    dragging = true;
    startX = event.clientX - overlay.x;
    startY = event.clientY - overlay.y;
    el.setPointerCapture(event.pointerId);
  });

  el.addEventListener("pointermove", (event) => {
    if (!dragging) return;
    overlay.x = Math.max(0, Math.min(wall.clientWidth - overlay.width, event.clientX - startX));
    overlay.y = Math.max(0, Math.min(wall.clientHeight - overlay.height, event.clientY - startY));
    applyOverlayStyle(el, overlay);
  });

  el.addEventListener("pointerup", () => {
    dragging = false;
  });
}

function attachOverlayResize(handle, host, overlay) {
  let resizing = false;
  let startW = 0;
  let startH = 0;
  let startX = 0;
  let startY = 0;

  handle.addEventListener("pointerdown", (event) => {
    event.stopPropagation();
    resizing = true;
    startW = overlay.width;
    startH = overlay.height;
    startX = event.clientX;
    startY = event.clientY;
    handle.setPointerCapture(event.pointerId);
  });

  handle.addEventListener("pointermove", (event) => {
    if (!resizing) return;
    overlay.width = Math.max(30, Math.min(wall.clientWidth - overlay.x, startW + (event.clientX - startX)));
    overlay.height = Math.max(30, Math.min(wall.clientHeight - overlay.y, startH + (event.clientY - startY)));
    applyOverlayStyle(host, overlay);
  });

  handle.addEventListener("pointerup", () => {
    resizing = false;
  });
}

function renderOverlays() {
  wall.querySelectorAll(".overlay").forEach((el) => el.remove());
  overlayState.forEach((overlay) => {
    const el = document.createElement("div");
    el.className = `overlay ${overlay.shape === "ellipse" ? "ellipse" : ""}`;
    applyOverlayStyle(el, overlay);

    const handle = document.createElement("div");
    handle.className = "resize-handle";
    el.appendChild(handle);

    attachOverlayDrag(el, overlay);
    attachOverlayResize(handle, el, overlay);

    wall.appendChild(el);
  });
}

function renderWall() {
  const columns = Math.max(1, Number(controls.columns.value));
  const rows = Math.max(1, Number(controls.rows.value));
  const tileWidthCm = Math.max(1, Number(controls.tileWidthCm.value));
  const tileHeightCm = Math.max(1, Number(controls.tileHeightCm.value));
  const groutSize = Number(controls.groutSize.value);
  const viewerScale = Number(controls.viewerScale.value) / 100;

  controls.groutSizeValue.textContent = `${groutSize}px`;
  controls.viewerScaleValue.textContent = `${controls.viewerScale.value}%`;

  const totalWidth = columns * tileWidthCm;
  const totalHeight = rows * tileHeightCm;
  wall.style.aspectRatio = `${totalWidth} / ${totalHeight}`;
  wall.style.background = controls.groutColor.value;
  wall.style.width = `${Math.round(700 * viewerScale)}px`;

  wall.querySelectorAll(".tile").forEach((tile) => tile.remove());

  const tileTypes = getTileTypes();
  const rects = buildStackRects(rows, columns);
  const patternType = controls.patternType.value;
  const randomTiles = patternType === "random" ? generateTileSelection(rects.length, tileTypes) : null;

  const pitchW = wall.clientWidth / columns;
  const pitchH = wall.clientHeight / rows;

  rects.forEach((rect, index) => {
    const tile = document.createElement("div");
    const arrangement = patternType === "random"
      ? { tile: randomTiles[index % randomTiles.length], rotate: [0, 90, 180, 270][index % 4] }
      : arrangementForCell(patternType, rect.r, rect.c, tileTypes);

    const chosen = arrangement.tile;
    tile.className = "tile";
    tile.style.backgroundColor = chosen.color;
    if (chosen.image) {
      tile.style.backgroundImage = `url(${chosen.image})`;
      tile.style.backgroundSize = "cover";
      tile.style.backgroundPosition = "center";
    }

    tile.title = chosen.name;

    tile.style.left = `${rect.c * pitchW + groutSize / 2}px`;
    tile.style.top = `${rect.r * pitchH + groutSize / 2}px`;
    tile.style.width = `${Math.max(2, pitchW - groutSize)}px`;
    tile.style.height = `${Math.max(2, pitchH - groutSize)}px`;
    if (arrangement.rotate) {
      tile.style.transform = `rotate(${arrangement.rotate}deg)`;
      tile.style.transformOrigin = "center";
    }

    wall.appendChild(tile);
  });

  renderOverlays();
}

["columns", "rows", "tileWidthCm", "tileHeightCm", "viewerScale", "groutColor", "groutSize", "patternType"].forEach((key) => {
  controls[key].addEventListener("input", renderWall);
});

controls.addOverlay.addEventListener("click", () => {
  overlayState.push({
    shape: controls.overlayShape.value,
    x: 20 + overlayState.length * 12,
    y: 20 + overlayState.length * 12,
    width: 150,
    height: 110
  });
  renderOverlays();
});

window.addEventListener("resize", renderWall);

buildTileTypeControls();
renderWall();
