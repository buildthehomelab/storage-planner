# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev          # dev server at localhost:3000
npm run build        # production build (Next.js server mode)
npm run build:static # static export (sets EXPORT_MODE=true)
npm run lint         # ESLint via next lint
npm start            # serve production build
npm run start:static # serve static export via npx serve out
```

```bash
npm test          # run all tests (vitest)
npm run test:watch # watch mode
```

Docker:
```bash
docker compose up    # build and run via docker-compose.yml
```

## Architecture

Single-page Next.js 14 app (App Router). All logic lives in `src/app/`.

**`page.tsx`** — The entire application. Contains:
- `RAIDCalculator` (default export): root component managing all state
- `StorageConfig` state: array of two configs `{ fileSystem, raidType, selectedDrives, vdevs }` enabling comparison mode
- Drive selection: max 16 drives per config, sizes 1–30 TB
- `calculateStorage()` / `calculateVdevStorage()`: pure functions computing usable capacity, protection, read/write speed estimates, and reliability score (0–100) from RAID type
- ZFS vdev workflow: drives first added to `selectedDrives`, then grouped into vdevs via `createVdev()` — vdev removal returns drives to `selectedDrives`
- Comparison mode: two configs evaluated side-by-side across 5 metrics (capacity, efficiency, read/write speed, reliability)

**`ServerRack.tsx`** — Visual 4×4 grid of drive bays. Occupied bays show honeycomb SVG + TB label; empty bays show dashed border. Clicking a drive calls `onDriveClick(id)` to remove it.

**`VdevRack.tsx`** — Same visual style as ServerRack but read-only; renders drives belonging to a committed ZFS vdev.

**`Footer.tsx`** — Static footer component.

## Key domain constraints

- Drive cap: 16 drives per config (`selectedDrives.length < 16` in `addDrive`)
- ZFS vdev pool: stripes across vdevs (RAID-0 between vdevs), so pool fails if any single vdev fails
- Storage calc uses drive count × base speed × efficiency factor; values are estimates, not benchmarks
- SnapRAID: largest drives become parity; data drives get full capacity
- `EXPORT_MODE=true` triggers static export — the Dockerfile uses server mode (`npm start`), not static
- No backend, no persistence — all state is in-memory React state

## Claude for Chrome

- Use `read_page` to get element refs from the accessibility tree
- Use `find` to locate elements by description
- Click/interact using `ref`, not coordinates
- NEVER take screenshots unless explicitly requested by the user
