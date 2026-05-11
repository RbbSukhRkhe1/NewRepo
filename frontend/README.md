# Vaultex frontend

React (Vite) app for the capstone UI. Run from repo root: `npm run dev`.

## Design tokens — glass & elevation (F-017)

Panels use shared CSS variables in `src/index.css`. Prefer these over ad-hoc multi-stop gradients.

| Token | Role |
|-------|------|
| `--glass-bg` | Frosted panel fill (with `backdrop-filter`) |
| `--glass-bg-fallback` | Opaque fill when `prefers-reduced-motion: reduce` disables blur |
| `--glass-border` | Single hairline for cards, header, and ledger dividers |
| `--glass-blur` | Backdrop blur radius |
| `--glass-highlight` | Subtle top inner highlight (folded into shadows) |
| `--elevation-1` … `--elevation-3` | Restrained shadows (default surface = `--elevation-1`) |

Utility classes:

- `.vtx-surface` — default card shell (`SurfaceCard`).
- `.vtx-glass-header` — sticky app header.
- `.vtx-glass-popover` — floating menus (e.g. admin dropdown).
- `.vtx-glass-inset` — nested list rows / chips without gradient fills.

Under **reduced motion**, frosted layers drop blur and use `--glass-bg-fallback` for predictable contrast.
