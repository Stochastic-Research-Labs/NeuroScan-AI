# Design System — NeuroScan AI

Designed for a local clinical-research workspace: a high-clarity, light interface with blue
clinical accents, clear protocol steps, and restrained motion. It is intentionally not presented
as a patient-facing diagnostic product.

## Palette

| Token | Hex | Use |
|---|---|---|
| `--bg` | `#F5F9FC` | App background |
| `--surface` | `#EDF5F9` | Section/panel background |
| `--card` | `#FFFFFF` | Card background |
| `--border` | `#D7E3EA` | Default borders |
| `--border-strong` | `#B9CCD7` | Emphasized borders / dividers |
| `--text` | `#102A43` | Primary text |
| `--text-muted` | `#526A7A` | Secondary text |
| `--primary` | `#006DA6` | Primary actions, links, active nav |
| `--primary-glow` | `#27A7D8` | Hover and focus highlight |
| `--success` | `#087C5B` | Healthy status, checkpoint loaded |
| `--warning` | `#A65A00` | Demo-mode banner, caution states |
| `--destructive` | `#BD2C2C` | Errors, destructive actions |

### Segmentation class colors (fixed, used everywhere — legend, overlay, charts)

| Class | Hex | Meaning |
|---|---|---|
| NCR/NET | `#0EA5E9` | Necrotic / non-enhancing tumor core |
| ED | `#FACC15` | Peritumoral edema |
| ET | `#EF4444` | Enhancing tumor |

These three never change meaning or color across the app. Per accessibility guidance, color is
always paired with a text label (legend, tooltip, or badge) — never color alone.

## Typography

- **UI text:** system UI stack (`Inter`, Segoe UI, system-ui) for an offline-capable local build.
- **Numeric / technical:** system monospace stack — case IDs, file names, voxel counts, Dice scores,
  volumes (cm³), timestamps.
- Base size 16px, line-height 1.5, headings use IBM Plex Sans 600/700.

## Motion

CSS transitions and a short page reveal (200–400ms) are used for cards and workflow states. All motion is skipped when
`prefers-reduced-motion: reduce` is set (see `frontend/lib/motion.ts`).

## Icons

`lucide-react` exclusively. No emoji as icons anywhere in the UI.

## Accessibility checklist (verified against `ui-ux-pro-max` pre-delivery checklist)

- [x] Text contrast ≥ 4.5:1 against backgrounds used for that text
- [x] Visible focus rings on every interactive element (`:focus-visible`, 3px ring in
  `--primary-glow`)
- [x] Touch targets ≥ 44×44px
- [x] No color-only meaning (segmentation legend always shows text labels)
- [x] Responsive at 375 / 768 / 1024 / 1440px
- [x] `prefers-reduced-motion` respected
