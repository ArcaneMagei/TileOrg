# Tile Wall Simulator – Quick Start

A lightweight browser app to simulate a tiled wall with square stack-bond tiles, configurable arrangements, grout controls, tile inventory, image textures, and draggable overlay objects.

## Run in 30 seconds

1. Open a terminal in this project.
2. Start a local web server:

```bash
python -m http.server 4173
```

3. Open: `http://localhost:4173`

## Main features

- Default wall setup: **3 columns x 13 rows**, tile size **20x20 cm**.
- Square stack-bond layout with different arrangement styles (including rotation-based variants).
- Grout controls for color and thickness.
- Nine tile models with controls for name, color, pack count, and tiles per pack.
- Organized texture picker per tile model with preview, URL input, upload button, and clear action.
- Viewer scale control to resize the wall preview.
- Overlay objects (rectangle/ellipse) that can be moved and resized.

## Notes

- The app is fully static (`index.html`, `styles.css`, `app.js`) and does not require a build step.
