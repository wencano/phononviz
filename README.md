# Phonon Junction Explorer

Interactive web visualization inspired by:
- Eduardo C. Cuansing and Juan Rafael K. Bautista
- "Steady-state phonon heat currents and differential thermal conductance across a junction of two harmonic phonon reservoirs"
- arXiv: [2604.09390](https://arxiv.org/abs/2604.09390)

## Features

- Interactive controls for temperatures, coupling, asymmetry, and flow direction
- 3D rotatable junction scene with thermal effects
- Canvas-based plots for overlap, heat current, conductance, and symmetry
- Prominent model equations rendered with LaTeX (KaTeX)

## Project files

- `index.html` - app layout and imports
- `styles.css` - styling
- `app.js` - simulation, charts, and 3D scene
- `plan.md` - planning document
- `temp/` - temporary/reference files (ignored by git)

## Run locally

Open `index.html` in a modern browser, or serve the folder with a static server.

Example:

```bash
python3 -m http.server 8080
```

Then visit [http://localhost:8080](http://localhost:8080).
