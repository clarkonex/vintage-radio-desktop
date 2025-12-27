# Vintage Radio Desktop

A retro-style internet radio player with a beautiful vintage UI.

## Features

- **10 Pre-loaded Stations** — SomaFM, KEXP, Jazz24, Radio Paradise, FIP, BBC Radio 6 Music
- **8 Beautiful Themes** — Bakelite, Retro, Mint, Synthwave, Dracula, Gruvbox, Nord, Vintage Cream
- **Real-time VU Meters** — Audio visualization with Web Audio API
- **CRT Monitor Effect** — Vignette and rounded bezel for authentic retro feel
- **Speaker Grill Design** — Classic radio aesthetics
- **Keyboard Shortcuts** — Full keyboard control

## Installation

### macOS
Download the `.dmg` from [Releases](../../releases), open it, and drag Vintage Radio to Applications.

> **Note:** On first launch, you may need to right-click → Open → "Open" to bypass Gatekeeper.

### Build from Source

Requirements:
- [Node.js](https://nodejs.org/) (v18+)
- [Rust](https://rustup.rs/)
- [Tauri CLI](https://tauri.app/)

```bash
# Install dependencies
npm install

# Run in development
npm run tauri dev

# Build for production
npm run tauri build
```

## Usage

### Keyboard Shortcuts

| Key | Action |
|-----|--------|
| `Space` | Play / Pause |
| `S` | Stop |
| `N` | Next station |
| `P` | Previous station |
| `↑` / `↓` | Volume up / down |
| `T` | Switch theme |
| `Q` | Quit |

### Themes

Press `T` to cycle through themes:
- **Bakelite** — Dark brown with brass accents (default)
- **Retro Radio** — Warm wood tones
- **Mint Retro** — Silver with teal accents
- **Vintage Cream** — Light beige and brown
- **Synthwave** — Neon pink and cyan
- **Dracula** — Purple and green
- **Gruvbox** — Orange and earthy tones
- **Nord** — Cool arctic blues

## Tech Stack

- [Tauri](https://tauri.app/) — Rust + Web frontend
- Vanilla HTML/CSS/JS — No framework overhead
- Web Audio API — Real-time audio visualization

## License

MIT

---

*Vintage Radio Desktop*
