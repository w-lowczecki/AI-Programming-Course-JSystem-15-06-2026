# Design Guidelines — Spotify-inspired Design System

A **dark-first** design system that mimics the look and feel (vibe) of the **Spotify Web Player** (`https://open.spotify.com/`). Use these tokens for any UI we build so it stays visually consistent with the Spotify brand.

> Extracted from the live Spotify Web Player on 2026-06-17 using Playwright. Values map to Spotify's internal **Encore** CSS custom properties (e.g. `--background-base`, `--text-subdued`, `--text-bright-accent`).

---

## 1. Assets

| Asset | File | Usage |
|---|---|---|
| Homepage screenshot | [../assets/homepage.png](../assets/homepage.png) | Reference layout / vibe |
| Logo wordmark (SVG) | [../assets/logo.svg](../assets/logo.svg) | Full "Spotify" wordmark, `fill: currentColor` |
| Logo icon (SVG) | [../assets/logo-icon.svg](../assets/logo-icon.svg) | Green circle icon only, `#1ED760` |
| Favicon (SVG) | [../assets/favicon.svg](../assets/favicon.svg) | Browser tab icon (green circle, black mark) |
| Design tokens (JSON) | [../assets/design-tokens.json](../assets/design-tokens.json) | Machine-readable tokens |

---

## 2. Colors

The system is **dark-first**. The signature element is **Spotify Green** on near-black surfaces.

### Brand
| Token | Hex | Usage |
|---|---|---|
| `brand.primary` | `#1ED760` | Primary CTA, play button, active states, accents |
| `brand.primaryHover` | `#3BE477` | Hover state for primary green |
| `brand.primaryPress` | `#1AB955` | Pressed state |
| `brand.classic` | `#1DB954` | Classic Spotify green (legacy buttons) |
| `brand.error` | `#F15E6C` | Errors / destructive |
| `brand.warning` | `#FFA42B` | Warnings |

### Backgrounds (surfaces)
| Token | Value | Usage |
|---|---|---|
| `background.base` | `#121212` | App background |
| `background.highlight` | `#1F1F1F` | Hovered rows / raised surfaces |
| `background.elevatedBase` | `#1F1F1F` | Cards, menus, modals |
| `background.elevatedHighlight` | `#2A2A2A` | Hovered card / menu item |
| `background.press` | `#000000` | Sidebar, now-playing bar, pressed |
| `background.tintedBase` | `rgba(255,255,255,0.07)` | Subtle fills over art |
| `background.overlay` | `rgba(0,0,0,0.7)` | Image/scrim overlays |

### Text
| Token | Hex | Usage |
|---|---|---|
| `text.base` / `primary` | `#FFFFFF` | Headings, primary text |
| `text.secondary` / `subdued` | `#B3B3B3` | Secondary text, metadata, inactive nav |
| `text.muted` | `#6A6A6A` | Disabled |
| `text.brightAccent` | `#1ED760` | Links / accent text |
| `text.onAccent` | `#000000` | Text on green buttons (black, not white) |

> **Key rule:** text on the green primary button is **black (`#000000`)**, not white — this is core to the Spotify look.

---

## 3. Typography

Spotify ships a proprietary font (**SpotifyMixUI**, evolved from **Circular**). We don't have license to it; use the fallback stack — `Helvetica Neue`/`Arial` render closely. If self-hosting, a near match is **Circular Std** or the open alternative **Gotham**/**Montserrat** for display.

```css
--font-primary: "SpotifyMixUI", "Circular", "Helvetica Neue", Helvetica, Arial, sans-serif;
--font-title:   "SpotifyMixUITitle", "Circular", "Helvetica Neue", Helvetica, Arial, sans-serif;
```

### Weights
| Name | Value |
|---|---|
| regular | 400 |
| medium | 500 |
| semibold | 600 |
| bold | 700 |
| black | 900 (large hero titles) |

### Size scale
| Token | Size | Usage |
|---|---|---|
| `xs` | 11px | Tiny labels |
| `sm` | 12px | Captions, metadata |
| `base` | 14px | Body, buttons |
| `md` | 16px | Default body / inputs |
| `lg` | 20px | Sub-headings |
| `xl` | 24px | Section titles (e.g. "Utwory na czasie") |
| `2xl` | 32px | Page titles |
| `3xl`–`5xl` | 48–96px | Hero / playlist header titles (use weight 700–900, `letterSpacing: -0.04em`) |

Section headings use **font weight 700** at **24px**. Hero/playlist titles scale up dramatically (Spotify uses up to ~96px black).

---

## 4. Spacing

Base unit **4px**. Scale: `4, 8, 12, 16, 20, 24, 28, 32, 40, 48, 64`. Card padding is typically `16px`; nav items `8px 12px`.

---

## 5. Border Radius

| Token | Value | Usage |
|---|---|---|
| `xs` | 2px | Progress bars |
| `sm` | 4px | Small chips |
| `md` | 6px | Album/track art, small cards |
| `lg` | 8px | Cards, sidebar, modals |
| `xl` | 16px | Large containers |
| `pill` / `full` | 500px / 9999px | Buttons, search input, chips |
| `circle` | 50% | Play buttons, avatars, icon buttons |

> The most common radii on the page are **9999px (pills)**, **6px (art)**, and **50% (circles)** — these three define the shape language.

---

## 6. Components

### Buttons
- **Primary** — green pill. Background `#1ED760`, **black** text, weight 700, `padding 12px 32px`, `min-height 48px`, `border-radius 9999px`. Hover: scale `1.04` + lighten to `#3BE477`. Use for the single most important action (Sign up, Play).
- **Secondary** — transparent pill, white text, `1px solid rgba(255,255,255,0.3)` border, white border on hover.
- **Chip / filter** — `#1F1F1F` pill, white text, 32px tall; hover `#2A2A2A`.
- **Icon circle** — 48px circle, `#1F1F1F`, white icon.
- **Play button** — 48px green circle (`#1ED760`), black icon, hover scale `1.06`. The iconic floating play control.

### Search input
`#1F1F1F` background, white text, `#B3B3B3` placeholder, **full pill** radius, 48px tall, transparent border → white border on focus.

### Card (album / playlist)
`#181818` background → `#282828` on hover, `8px` radius, `16px` padding, `background-color 0.3s ease` transition. Art image uses `6px` radius. Reveals a green play button on hover.

### Top bar
Semi-transparent black (`rgba(0,0,0,0.5)`), ~64px tall, white controls. Often becomes opaque/tinted on scroll.

### Sidebar
Black (`#000000`), `8px` radius panels. Inactive items `#B3B3B3`, active/hover `#FFFFFF`.

### Now-playing bar
Fixed bottom bar, black, ~86px tall. Progress track `rgba(255,255,255,0.3)`, fill white — turning **green (`#1ED760`)** on hover/scrub.

---

## 7. Logo Usage

- **Wordmark** ([logo.svg](../assets/logo.svg)) uses `fill: currentColor` — set the color in CSS. On dark backgrounds use white (`#FFFFFF`); the green version is reserved for marketing.
- **Icon** ([logo-icon.svg](../assets/logo-icon.svg)) is the green circle — use in compact spaces, avatars, app icons.
- Keep clear space around the logo equal to the height of the circle icon.
- Never stretch, recolor to arbitrary colors, or place the green logo on a clashing background. On light backgrounds use the black wordmark.

---

## 8. Visual Style Summary

Spotify's vibe is **bold, dark, and immersive** — near-black surfaces (`#121212`) let album art and a single electric **green (`#1ED760`)** accent pop. Typography is clean, geometric, and confident, with **huge bold display titles** and quiet gray (`#B3B3B3`) secondary text. Shapes are **rounded and friendly**: pill buttons, circular play controls, and soft-cornered cards that lift on hover. The interface feels **content-first and tactile** — minimal chrome, smooth hover transitions, and the green accent always signalling "play" and energy.
