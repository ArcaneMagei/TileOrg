const defaultTileTypes = [
  { name: "Carrara", color: "#efeae2", packs: 4, perPack: 12, image: "" },
  { name: "Slate", color: "#7e838d", packs: 4, perPack: 10, image: "" },
  { name: "Terracotta", color: "#c87852", packs: 4, perPack: 9, image: "" },
  { name: "Sea Glass", color: "#79c7ba", packs: 4, perPack: 8, image: "" },
  { name: "Sand", color: "#dcc69d", packs: 4, perPack: 11, image: "" }
];

const controls = {
  columns: document.getElementById("columns"),
  rows: document.getElementById("rows"),
  tileWidthCm: document.getElementById("tileWidthCm"),
  tileHeightCm: document.getElementById("tileHeightCm"),
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

    row.querySelector(".tile-name").value = tile.name;
    row.querySelector(".tile-color").value = tile.color;
    row.querySelector(".tile-pack").value = tile.packs;
    row.querySelector(".tiles-per-pack").value = tile.perPack;

    const imageUrl = row.querySelector(".tile-image-url");
    const imageFile = row.querySelector(".tile-image-file");
    const clearImage = row.querySelector(".clear-image");

    row.querySelectorAll("input:not(.tile-image-file)").forEach((input) => {
      input.dataset.index = index;
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

function fileToDataURL(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(new Error("Failed to read image file"));
    reader.readAsDataURL(file);
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

function generateTileSelection(totalTiles, patternType, tileTypes) {
  if (patternType !== "random") {
    return Array.from({ length: totalTiles }, (_, i) => tileTypes[i % tileTypes.length]);
  }

  const pool = tileTypes.flatMap((tile) => {
    const variance = Math.floor(Math.random() * 21) - 10;
    const count = Math.max(0, tile.total + variance);
    return Array.from({ length: count }, () => tile);
  });

  if (!pool.length) {
    return Array.from({ length: totalTiles }, () => tileTypes[0]);
  }

  for (let i = pool.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }

  if (pool.length >= totalTiles) return pool.slice(0, totalTiles);
  return Array.from({ length: totalTiles }, (_, i) => pool[i % pool.length]);
}

function tileRect(row, col, w, h, pw, ph) {
  return {
    left: col * pw,
    top: row * ph,
    width: w * pw,
    height: h * ph
  };
}

function buildPatternRects(rows, cols, patternType) {
  const rects = [];

  if (patternType === "brick") {
    for (let r = 0; r < rows; r += 1) {
      for (let c = 0; c < cols; c += 1) {
        const offset = r % 2 === 1 ? 0.5 : 0;
        rects.push({ r, c: c + offset, w: 1, h: 1 });
      }
    }
    return rects;
  }

  if (patternType === "herringbone") {
    for (let r = 0; r < rows; r += 1) {
      for (let c = 0; c < cols; c += 1) {
        rects.push({ r, c, w: 1, h: 1, rotate: (r + c) % 2 === 0 ? 0 : 90 });
      }
    }
    return rects;
  }

  if (patternType === "basketweave") {
    for (let r = 0; r < rows; r += 2) {
      for (let c = 0; c < cols; c += 2) {
        rects.push({ r, c, w: 1, h: 2 });
        if (c + 1 < cols) rects.push({ r, c: c + 1, w: 1, h: 2, rotate: 90 });
      }
    }
    return rects;
  }

  if (patternType === "checker") {
    for (let r = 0; r < rows; r += 1) {
      for (let c = 0; c < cols; c += 1) {
        rects.push({ r, c, w: 1, h: 1, alt: (r + c) % 2 });
      }
    }
    return rects;
  }

  for (let r = 0; r < rows; r += 1) {
    for (let c = 0; c < cols; c += 1) {
      rects.push({ r, c, w: 1, h: 1 });
    }
  }

  return rects;
}

function renderOverlays() {
  wall.querySelectorAll(".overlay").forEach((x) => x.remove());
  overlayState.forEach((overlay) => {
    const el = document.createElement("div");
    el.className = `overlay ${overlay.shape === "ellipse" ? "ellipse" : ""}`;
    Object.assign(el.style, {
      left: `${overlay.x}px`,
      top: `${overlay.y}px`,
      width: `${overlay.width}px`,
      height: `${overlay.height}px`
    });

    const handle = document.createElement("div");
    handle.className = "resize-handle";
    el.appendChild(handle);

    attachOverlayDrag(el, overlay);
    attachOverlayResize(handle, overlay);
    wall.appendChild(el);
  });
}

function attachOverlayDrag(el, overlay) {
  let startX = 0;
  let startY = 0;
  let pointerDown = false;

  el.addEventListener("pointerdown", (event) => {
    if (event.target.classList.contains("resize-handle")) return;
    pointerDown = true;
    startX = event.clientX - overlay.x;
    startY = event.clientY - overlay.y;
    el.setPointerCapture(event.pointerId);
  });

  el.addEventListener("pointermove", (event) => {
    if (!pointerDown) return;
    overlay.x = Math.max(0, Math.min(wall.clientWidth - overlay.width, event.clientX - startX));
    overlay.y = Math.max(0, Math.min(wall.clientHeight - overlay.height, event.clientY - startY));
    renderOverlays();
  });

  el.addEventListener("pointerup", () => {
    pointerDown = false;
  });
}

function attachOverlayResize(handle, overlay) {
  let pointerDown = false;
  let startW = 0;
  let startH = 0;
  let x = 0;
  let y = 0;

  handle.addEventListener("pointerdown", (event) => {
    event.stopPropagation();
    pointerDown = true;
    startW = overlay.width;
    startH = overlay.height;
    x = event.clientX;
    y = event.clientY;
    handle.setPointerCapture(event.pointerId);
  });

  handle.addEventListener("pointermove", (event) => {
    if (!pointerDown) return;
    overlay.width = Math.max(30, Math.min(wall.clientWidth - overlay.x, startW + (event.clientX - x)));
    overlay.height = Math.max(30, Math.min(wall.clientHeight - overlay.y, startH + (event.clientY - y)));
    renderOverlays();
  });

  handle.addEventListener("pointerup", () => {
    pointerDown = false;
  });
}

function renderWall() {
  const columns = Math.max(1, Number(controls.columns.value));
  const rows = Math.max(1, Number(controls.rows.value));
  const tileWidthCm = Math.max(1, Number(controls.tileWidthCm.value));
  const tileHeightCm = Math.max(1, Number(controls.tileHeightCm.value));
  const groutSize = Number(controls.groutSize.value);
  controls.groutSizeValue.textContent = String(groutSize);

  const totalWidth = columns * tileWidthCm;
  const totalHeight = rows * tileHeightCm;
  wall.style.aspectRatio = `${totalWidth} / ${totalHeight}`;
  wall.style.background = controls.groutColor.value;

  wall.querySelectorAll(".tile").forEach((tile) => tile.remove());

  const tileTypes = getTileTypes();
  const patternType = controls.patternType.value;
  const rects = buildPatternRects(rows, columns, patternType);
  const pickedTiles = generateTileSelection(rects.length, patternType, tileTypes);

  const pitchW = wall.clientWidth / columns;
  const pitchH = wall.clientHeight / rows;

  rects.forEach((rect, index) => {
    const tile = document.createElement("div");
    const chosen = patternType === "checker" && rect.alt
      ? pickedTiles[(index + 1) % pickedTiles.length]
      : pickedTiles[index % pickedTiles.length];

    tile.className = "tile";
    tile.style.backgroundColor = chosen.color;
    if (chosen.image) {
      tile.style.backgroundImage = `url(${chosen.image})`;
      tile.style.backgroundSize = "cover";
      tile.style.backgroundPosition = "center";
    }
    tile.title = chosen.name;

    const dimensions = tileRect(rect.r, rect.c, rect.w, rect.h, pitchW, pitchH);
    tile.style.left = `${dimensions.left + groutSize / 2}px`;
    tile.style.top = `${dimensions.top + groutSize / 2}px`;
    tile.style.width = `${Math.max(2, dimensions.width - groutSize)}px`;
    tile.style.height = `${Math.max(2, dimensions.height - groutSize)}px`;
    if (rect.rotate) {
      tile.style.transform = `rotate(${rect.rotate}deg)`;
      tile.style.transformOrigin = "center";
    }

    wall.appendChild(tile);
  });

  renderOverlays();
}

["columns", "rows", "tileWidthCm", "tileHeightCm", "groutColor", "groutSize", "patternType"].forEach((key) => {
  controls[key].addEventListener("input", renderWall);
});

controls.addOverlay.addEventListener("click", () => {
  overlayState.push({
    shape: controls.overlayShape.value,
    x: 24 + (overlayState.length * 14),
    y: 24 + (overlayState.length * 14),
    width: 140,
    height: 92
  });
  renderOverlays();
});

window.addEventListener("resize", renderWall);

buildTileTypeControls();
renderWall();
