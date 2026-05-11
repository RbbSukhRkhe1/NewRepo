# Vaultex frontend

React (Vite) app for the capstone UI. Run from repo root: `npm run dev`.

## Design tokens — glass & elevation (F-017)

Panels use shared CSS variables in `src/index.css`. Prefer these over ad-hoc multi-stop gradients.

| Token | Role |
|-------|------|
| `--glass-bg` / `background-color` | Tint behind the frost; kept slightly transparent so blur reads |
| `--glass-bg-fallback` | Solid fill when `prefers-reduced-motion: reduce` disables blur |
| `--glass-border` | Panel edge |
| `--glass-border-outer` | Ultra-soft outer ring folded into shadows (specular rim) |
| `--glass-blur` | Standard card blur radius |
| `--glass-blur-strong` | Stronger frost on sticky header / popovers |
| `--glass-saturate` / `--glass-brightness` | Fed into `backdrop-filter` with blur ( richer “glass” ) |
| `--glass-rim-top` / `--glass-rim-bot` | Inset highlight + depth on cards and inset chips |
| `--elevation-1` … `--elevation-3` | Rim + diffuse shadow stack |

Utility classes:

- `.vtx-surface` — card shell: blur + saturate + faint diagonal glaze (`SurfaceCard`).
- `.vtx-glass-header` — stronger blur/glaze over scrolling content.
- `.vtx-glass-popover` — strongest elevation + frost (admin menu, dialogs).
- `.vtx-glass-inset` — etched chip (rim shadows only; no per-row backdrop blur).

Under **reduced motion**, frosted panels drop blur, glaze gradient, and use `--glass-bg-fallback`; rim shadows remain for depth.
