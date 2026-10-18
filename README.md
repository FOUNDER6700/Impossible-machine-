# THE IMPOSSIBLE MACHINE — Prototype 001

A mobile-first 3D sci-fi atmospheric exploration prototype built with **Three.js** and **Vite**. Designed to be edited, built, and deployed entirely from an Android phone using GitHub and GitHub Pages.

## Core Gameplay
- Explore a 100×100 ruined containment basin housing a gravity-defying central anomaly.
- Navigate using the left virtual thumbstick and right touch-look area (or `WASD` + Mouse on desktop).
- Locate and recover **3 resonant Energy Fragments** by approaching each shrine and pressing **INTERACT**.
- Once all 3 fragments are collected, the far-side **Portal** activates. Approach and interact with the active portal to trigger the machine harmonization sequence.
- Progress and look sensitivity are automatically persisted in `localStorage`.

## Local / Cloud Commands
- `npm install` — Install dependencies (`three` and `vite`)
- `npm run dev` — Start Vite development server
- `npm run build` — Compile static production bundle into `./dist`
- `npm run preview` — Preview production build
