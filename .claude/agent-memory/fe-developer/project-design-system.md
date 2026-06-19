---
name: project-design-system
description: Design token naming convention and Tailwind v4 @theme setup for the Hardware Service Decision Copilot PoC
metadata:
  type: project
---

Tailwind v4 (CSS-first, no tailwind.config.js) — tokens are in `app/globals.css` under `@theme`.

**Why:** Next 16 scaffolds Tailwind v4 which uses `@theme` instead of JS config.

**How to apply:** When writing components, use these Tailwind utility classes derived from the tokens:

### Colors (Tailwind utilities: bg-*, text-*, ring-*)
| Utility | Value | Usage |
|---|---|---|
| `bg-brand-primary` / `text-brand-primary` | `#1ED760` | Green accent, primary button bg |
| `bg-brand-primary-hover` | `#3BE477` | Hover on green |
| `bg-brand-primary-press` | `#1AB955` | Pressed state |
| `text-on-brand` | `#000000` | Text ON green button (always black) |
| `bg-bg-base` | `#121212` | Main page background |
| `bg-bg-tinted` | `#181818` | Card background |
| `bg-bg-elevated` | `#1F1F1F` | Elevated surface |
| `bg-bg-elevated-highlight` | `#2A2A2A` | Card hover |
| `text-text-primary` | `#FFFFFF` | Headings, primary content |
| `text-text-secondary` | `#B3B3B3` | Secondary labels |
| `text-text-muted` | `#6A6A6A` | Disabled / least important |

### Typography
| Token | Value |
|---|---|
| `font-sans` | SpotifyMixUI → Circular → Helvetica Neue → sans-serif |
| `font-title` | SpotifyMixUITitle → Circular → Helvetica Neue → sans-serif |

### Border radii
| Utility | Value | Usage |
|---|---|---|
| `rounded-full` | 9999px | Pill buttons, search, tags |
| `rounded-[var(--radius-card)]` | 6px | Cards/tiles |
| `rounded-md` (Tailwind default 6px override not set — use radius-card) | 8px | Panels |

### Raw CSS vars (also available)
`:root` exposes `--brand-primary`, `--bg-base`, `--text-on-brand`, `--font-primary`, `--radius-pill`, etc.

### Key files
- `app/globals.css` — all token definitions
- `app/components/PrimaryButton.tsx` — reference implementation for green pill button
- `app/layout.tsx` — dark root layout, `lang="pl"`, favicon via metadata
- `app/favicon.svg` — favicon (SVG, dark tile + green mark)
- `public/logo.svg` — full Spotify-style wordmark
- `public/logo-icon.svg` — circle mark only
