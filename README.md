<div align="center">

&nbsp;

# planning-poker

&nbsp;

[![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?style=flat-square&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Next.js](https://img.shields.io/badge/Next.js_16-000000?style=flat-square&logo=nextdotjs&logoColor=white)](https://nextjs.org/)
[![React](https://img.shields.io/badge/React_19-61DAFB?style=flat-square&logo=react&logoColor=black)](https://react.dev/)
[![MIT](https://img.shields.io/badge/MIT-22C55E?style=flat-square)](LICENSE)

**Estimate user stories together in real time — peer-to-peer, no server, no account required.**

[Features](#-features) • [Quick Start](#-quick-start) • [How It Works](#-how-it-works) • [Development](#-development)

</div>

---

## 🌟 Features

- 🔗 **Serverless & private** — rooms run entirely over WebRTC (PeerJS); no data ever touches a server or database
- 🃏 **Multiple deck presets** — Fibonacci (0–21 + ? + ☕), Numeric (t-shirt sizes as numbers), T-shirt (XS–XXL), or a fully custom deck
- 🎭 **Pixel-art avatars** — DiceBear-generated identicons, selectable on join and changeable at any point mid-session
- 🎰 **Casino-style reveal** — votes stay hidden until the host dramatically flips them all at once
- 🎉 **Consensus confetti** — canvas-confetti fires automatically when every participant votes the same value
- 🌗 **Dark & light theme** — toggled with a single click, preference persisted across sessions
- 💾 **Persistent settings** — name and avatar seed saved to `localStorage` so returning users skip the setup screen

---

## 🚀 Quick Start

```bash
# Clone and install
git clone https://github.com/kud/planning-poker.git
cd planning-poker
npm install

# Start the dev server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

1. Click **Host a room** — a unique room code and shareable link are generated instantly.
2. Share the link (or code) with your team.
3. Each guest opens the link, picks a name and avatar, and joins.
4. Everyone votes; the host clicks **Reveal** to flip all cards simultaneously.
5. Celebrate consensus with confetti, or discuss and re-vote.

---

## 🧩 How It Works

```
Host browser  ──────────────────────────────────────────────────────────┐
              PeerJS (WebRTC DataChannel)                                │
Guest 1 ──────────────────────────────────────────────────────────────► │
Guest 2 ──────────────────────────────────────────────────────────────► │ room state
Guest 3 ──────────────────────────────────────────────────────────────► │
                                                                         └── kept in-memory only
```

The host's browser acts as the hub. Guests connect directly to the host via WebRTC data channels brokered by the public PeerJS signalling server. Once connected, all message passing is peer-to-peer. There is no backend, no database, and no persistent state.

### Routes

| Route        | Purpose                                  |
| ------------ | ---------------------------------------- |
| `/`          | Landing page — create or join a room     |
| `/host`      | Host lobby — configure deck, share code  |
| `/room/[id]` | Guest view — vote and watch results      |
| `/demo`      | Solo demo — try the UI without any peers |

### Deck Presets

| Preset    | Cards                                          |
| --------- | ---------------------------------------------- |
| Fibonacci | 0, ½, 1, 2, 3, 5, 8, 13, 21, ?, ☕             |
| Numeric   | 1 (XS), 2 (S), 4 (M), 8 (L), 16 (XL), 32 (XXL) |
| T-shirt   | XS, S, M, L, XL, XXL                           |
| Custom    | Comma-separated values of your choice          |

---

## 🔧 Development

### Project structure

```
src/
├── app/
│   ├── page.tsx          # Landing — create or join
│   ├── host/             # Host room setup
│   ├── room/[id]/        # Guest room view
│   └── demo/             # Demo mode
├── components/
│   ├── room-view.tsx     # Core voting UI
│   ├── participant-card.tsx
│   ├── playing-card.tsx
│   ├── avatar-picker.tsx
│   ├── deck-selector.tsx
│   ├── settings-dialog.tsx
│   ├── vote-summary.tsx
│   └── ui/               # Base UI primitives
├── hooks/
│   ├── use-peer-host.ts  # Host WebRTC logic
│   └── use-peer-guest.ts # Guest WebRTC logic
└── lib/
    ├── decks.ts          # Deck presets & parser
    ├── types.ts          # Shared TypeScript types
    ├── settings.ts       # localStorage persistence
    ├── avatar.ts         # DiceBear helpers
    └── utils.ts          # Shared utilities
```

### Scripts

| Script          | Description                       |
| --------------- | --------------------------------- |
| `npm run dev`   | Start Next.js dev server with HMR |
| `npm run build` | Production build                  |
| `npm run start` | Serve the production build        |
| `npm run lint`  | Run ESLint                        |

### Clone → install → run

```bash
git clone https://github.com/kud/planning-poker.git
cd planning-poker
npm install
npm run dev
```

---

## 🏗 Tech Stack

| Package                                                      | Purpose                            |
| ------------------------------------------------------------ | ---------------------------------- |
| [Next.js 16](https://nextjs.org/)                            | React framework & routing          |
| [React 19](https://react.dev/)                               | UI rendering                       |
| [PeerJS 1.5](https://peerjs.com/)                            | WebRTC peer-to-peer connections    |
| [Framer Motion 12](https://www.framer.com/motion/)           | Card flip & flying-card animations |
| [Base UI](https://base-ui.com/)                              | Unstyled accessible primitives     |
| [Tailwind CSS v4](https://tailwindcss.com/)                  | Utility-first styling              |
| [next-themes](https://github.com/pacocoursey/next-themes)    | Dark / light theme switching       |
| [DiceBear](https://www.dicebear.com/)                        | Pixel-art avatar generation        |
| [canvas-confetti](https://github.com/catdad/canvas-confetti) | Consensus celebration effect       |
| [Sonner](https://sonner.emilkowal.ski/)                      | Toast notifications                |
| [Lucide React](https://lucide.dev/)                          | Icon set                           |

---

<div align="center">

MIT © [kud](https://github.com/kud) — Made with ❤️

</div>
