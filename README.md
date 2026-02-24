# Tile Wall Simulator – Quick Start

A lightweight browser app to simulate a tiled wall layout with grout settings, multiple tile patterns, inventory-aware randomization, and draggable overlay objects.

## Run in 30 seconds

1. Open a terminal in this project.
2. Start a local web server:

```bash
python -m http.server 4173
```

3. Open: `http://localhost:4173`

## Main features

- Default wall setup: **3 columns x 13 rows**, tile size **20x20 cm**.
- Grout controls for color and thickness.
- Patterns: Stack, Brick, Herringbone, Basketweave, Checkerboard, Random by Inventory (±10 per tile type).
- Tile type controls for name, color, pack count, and tiles per pack.
- **Image support per tile type** via URL or file upload.
- Overlay objects (rectangle/ellipse) that can be moved and resized.

## Notes

- The app is fully static (`index.html`, `styles.css`, `app.js`) and does not require a build step.
- Uploaded images are used immediately in the current session.
