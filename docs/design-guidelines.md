# Design Guidelines — Spotify-inspired Design System

A design system that mimics the look and feel of the **Spotify Web Player**
(<https://open.spotify.com/>). Use it to build a product that shares Spotify's
dark, music-first, high-contrast personality.

> Tokens were extracted from the live Spotify Web Player computed styles on
> 2026-06-17. Machine-readable values live in
> [`../assets/design-tokens.json`](../assets/design-tokens.json).

---

## 1. Assets

| Asset | File | Notes |
|---|---|---|
| Homepage screenshot | [`../assets/homepage.png`](../assets/homepage.png) | Full-page capture of the logged-out web player |
| Logo (icon) | [`../assets/logo.svg`](../assets/logo.svg) | Spotify circle mark, green `#1ED760`, `viewBox 0 0 24 24` |
| Favicon | [`../assets/favicon.svg`](../assets/favicon.svg) | Rounded dark tile with the green mark, 32×32 |
| Design tokens | [`../assets/design-tokens.json`](../assets/design-tokens.json) | Full token set |

> The original `favicon32.png` is served via a git-LFS-backed CDN and could not be
> downloaded as a binary in this environment, so a crisp, scalable `favicon.svg`
> was produced from the extracted logo path instead.

---

## 2. Colors

Spotify is a **dark theme first**. Almost everything sits on near-black surfaces
with white/grey text and a single vivid green as the only saturated accent.

### Brand

| Token | Hex | Usage |
|---|---|---|
| `brand.primary` | `#1ED760` | Primary actions, play button, active states, brand accent |
| `brand.primaryHover` | `#3BE477` | Hover on green buttons |
| `brand.primaryActive` | `#1AAF4E` | Pressed state |
| `brand.legacyGreen` | `#1DB954` | Legacy Spotify green (alt accent) |
| `brand.error` | `#E22134` | Errors / destructive |
| `brand.warning` | `#FFA42B` | Warnings |

### Backgrounds (dark surfaces)

| Token | Hex | Usage |
|---|---|---|
| `background.default` | `#000000` | App frame, player bar, top of gradients |
| `background.base` | `#121212` | Main content background |
| `background.tinted` | `#181818` | Card / tile background |
| `background.elevated` | `#1F1F1F` | Elevated surfaces, icon buttons, menus |
| `background.elevatedHighlight` | `#2A2A2A` | Card hover, list-row hover |
| `background.press` | `#333333` | Pressed/active fills, dividers |
| `background.overlay` | `rgba(0,0,0,0.7)` | Modal scrims, image overlays |

### Text

| Token | Hex | Usage |
|---|---|---|
| `text.primary` | `#FFFFFF` | Headings, primary content |
| `text.secondary` | `#B3B3B3` | Secondary labels, nav, metadata |
| `text.muted` | `#7C7C7C` | Disabled / least-important text |
| `text.onBrand` | `#000000` | Text/icon on top of the green button |

> **Contrast rule:** text on the green `#1ED760` button is always **black**, never
> white — this is the signature Spotify treatment.

---

## 3. Typography

Spotify ships its own typeface, exposed in computed styles as **`Spotify Mix`**
(`SpotifyMixUI`) for body and **`Spotify Mix Title`** (`SpotifyMixUITitle`) for
large headings — the modern successor to **Circular**. Since these are
proprietary, fall back to **Circular → Helvetica Neue → Helvetica → Arial →
sans-serif**.

```css
--font-primary: "Spotify Mix", "Circular", "Helvetica Neue", Helvetica, Arial, sans-serif;
--font-title:   "Spotify Mix Title", "Circular", "Helvetica Neue", Helvetica, Arial, sans-serif;
```

### Weights

| Name | Value | Usage |
|---|---|---|
| regular | 400 | Body text |
| medium | 500 | Slightly emphasized labels |
| semibold | 600 | Buttons in dialogs, captions |
| bold | 700 | Headings, nav links, primary buttons |
| black | 900 | Hero / display headlines |

### Size scale

| Token | Size | Usage |
|---|---|---|
| `xs` | 11px | Micro labels |
| `sm` | 12px | Metadata, captions |
| `base` | 14px | Body, buttons |
| `md` | 16px | Default body / nav |
| `lg` | 20px | Sub-section titles |
| `xl` | 24px | Section headings (`h2`) |
| `2xl` | 32px | Page titles |
| `3xl` | 48px | Hero titles |
| `4xl` | 72px | Display / playlist hero |

Line heights: tight `1.2` (headings), base `1.4` (body), relaxed `1.6` (long text).

---

## 4. Spacing

Base unit is **4px**; layout is built on a 4/8 grid.

`4 · 8 · 12 · 16 · 20 · 24 · 28 · 32 · 40 · 48 · 64` (px)

Common: card padding `12–16px`, section gaps `24px`, page padding `24–32px`.

---

## 5. Border Radius

Spotify mixes **fully rounded pills** for actions with **gently rounded tiles**
for content.

| Token | Value | Usage |
|---|---|---|
| `xs` | 2px | Tiny chips, progress handles |
| `sm` | 4px | Inputs, small controls |
| `card` | 6px | Album/playlist cards & cover art (most common) |
| `md` | 8px | Larger panels |
| `lg` | 16px | Modals, large containers |
| `pill` / `full` | 9999px | Buttons, tags, search field, avatars |
| `circle` | 50% | Play button, icon buttons, profile picture |

---

## 6. Components

### Primary button (the "green pill")
- Background `#1ED760`, text **black**, weight 700, pill radius `9999px`.
- Padding ~`8px 32px`; hover lightens to `#3BE477` **and scales to ~1.04** with a
  subtle transition — the signature Spotify "grow on hover" micro-interaction.

### Secondary button
- Transparent background, white text, `1px` grey border (`#7C7C7C`), pill radius.
- Hover: border becomes white and the button scales up slightly.

### Text / ghost button
- No background; grey text `#B3B3B3` → white on hover. Used for "Log in", tabs,
  and tertiary actions.

### Play button
- Green circle `#1ED760`, black play glyph, `~48px`. Appears on card hover and in
  the player. Scales up on hover.

### Card / tile
- Background `#181818`, radius `6px`, padding `12px`; hover background `#282828`.
- Cover art on top, bold white title, grey secondary line below.

### Header / top bar
- Background `#121212` (often a color gradient near the top of a playlist), padding
  `16px`. Contains nav, search, and account controls.

### Navigation
- Grey `#B3B3B3` links, weight 700; active item turns white `#FFFFFF`.

### Player bar (bottom)
- Solid black `#000000`, ~`72px` tall, white text/icons, green progress + green
  active controls.

### Input / search
- White `#FFFFFF` field, dark text `#121212`, pill radius `9999px`.

---

## 7. Logo Usage

- [`assets/logo.svg`](../assets/logo.svg) is the green circle mark (`#1ED760`,
  `viewBox 0 0 24 24`). Recolor by changing the `fill`.
- On dark surfaces use the green mark as-is. On light surfaces, place it inside a
  dark tile (see `favicon.svg`) or invert to a single solid color.
- Keep clear space around the mark equal to ~25% of its height. Do not stretch,
  add shadows, or place it on busy imagery without a scrim.

---

## 8. Visual Style Summary

Spotify's identity is **dark, immersive, and content-forward**. Near-black
surfaces let album art and a single electric green (`#1ED760`) carry all the
energy, while bold white type and generous spacing keep the dense music catalog
readable. Rounded pill buttons that subtly grow on hover, perfectly circular play
controls, and softly rounded `6px` cover-art tiles make the interface feel
tactile and playful. The overall vibe is modern, confident, and unmistakably
music-first — minimal chrome, maximum content.
