# Changelog

All notable changes to this project are documented here.

---

## [Unreleased]

### Features

- Move the room server from hosted PartyKit, which has shut down, to PartyServer on Cloudflare Workers with hibernating Durable Objects; production clients now connect to the Workers host by default ([ea13a1a](https://github.com/kud/planning-poker/commit/ea13a1a), [7e732e7](https://github.com/kud/planning-poker/commit/7e732e7))
- Other players' votes stay hidden on the wire until the reveal, not just on screen ([a1168a9](https://github.com/kud/planning-poker/commit/a1168a9))
- Rage arena snacks can be picked up in multiplayer, with the server deciding who got there first ([3b53e40](https://github.com/kud/planning-poker/commit/3b53e40))

## [1.0.2] — 2026-06-29

### Features

- The host now schedules the cat's stroll and broadcasts it, so everyone watches the same cat walk the same path ([78d8ea8](https://github.com/kud/planning-poker/commit/78d8ea8))
- Prop pokes arrive as slide-in toasts, brawling players wear a flame badge at the table, and the rage arena gains crowd heckles, snack healing and a curtain exit ([78d8ea8](https://github.com/kud/planning-poker/commit/78d8ea8))

## [1.0.1] — 2026-06-29

The table gets rowdy.

### Features

- Rage Mode: a multiplayer brawl mini-game with a grabbable chair, snacks that land and stay, a janitor, a KO leaderboard and AZERTY-aware controls ([338fdf8](https://github.com/kud/planning-poker/commit/338fdf8), [7566214](https://github.com/kud/planning-poker/commit/7566214), [8d8e51d](https://github.com/kud/planning-poker/commit/8d8e51d), [2d17129](https://github.com/kud/planning-poker/commit/2d17129), [83095cf](https://github.com/kud/planning-poker/commit/83095cf))
- Story memory: a topic per round, auto-reveal once everyone has voted, and a round history the host can save to and edit in a large modal ([3f81de1](https://github.com/kud/planning-poker/commit/3f81de1), [0731892](https://github.com/kud/planning-poker/commit/0731892), [563cbc6](https://github.com/kud/planning-poker/commit/563cbc6))
- Spectator mode, plus a session recap of rounds, consensus and streaks ([510c396](https://github.com/kud/planning-poker/commit/510c396))
- Breaks are asked for and decided by majority vote; the waiter walks in and a countdown the host can extend runs while it lasts ([138dd1d](https://github.com/kud/planning-poker/commit/138dd1d))
- Optional host approval: new joiners wait until the host lets them in ([8dbe28d](https://github.com/kud/planning-poker/commit/8dbe28d))
- Meet-style emoji reactions, join and leave toasts, and pokeable props (dealer, cat, plants) that everyone sees ([da8ea6a](https://github.com/kud/planning-poker/commit/da8ea6a), [e19c232](https://github.com/kud/planning-poker/commit/e19c232), [3ad2001](https://github.com/kud/planning-poker/commit/3ad2001))
- The dealer has more to say: reaction comebacks, idle small talk, streak call-outs and varied reveal quips ([45569b2](https://github.com/kud/planning-poker/commit/45569b2), [4a3ba9f](https://github.com/kud/planning-poker/commit/4a3ba9f))
- Light mode across the room, a card reveal animation and a new pixel plant ([4873409](https://github.com/kud/planning-poker/commit/4873409), [18be309](https://github.com/kud/planning-poker/commit/18be309), [45569b2](https://github.com/kud/planning-poker/commit/45569b2))
- Rooms expire on the server after 24 hours without anyone in them, and old room keys are pruned from the browser ([0b1c5d1](https://github.com/kud/planning-poker/commit/0b1c5d1))

### Fixes

- An error boundary and state normalisation stop the room going blank when client and server disagree on its shape ([501b4d6](https://github.com/kud/planning-poker/commit/501b4d6))
- Announcement bubbles no longer get stuck open ([45569b2](https://github.com/kud/planning-poker/commit/45569b2))
- Bare room-server URLs redirect to the app instead of returning a blank page ([ab384ab](https://github.com/kud/planning-poker/commit/ab384ab))
- Warmer crowd cheer, a more convincing cat purr, and the header and emoji picker no longer clash ([4374cb1](https://github.com/kud/planning-poker/commit/4374cb1), [96d2789](https://github.com/kud/planning-poker/commit/96d2789), [e211c6e](https://github.com/kud/planning-poker/commit/e211c6e), [b983a24](https://github.com/kud/planning-poker/commit/b983a24))

## [1.0.0] — 2026-06-12

The casino release. 🃏

### Features

- Migrate real-time transport from WebRTC/PeerJS to a PartyKit room server on Cloudflare's edge — rooms survive host refreshes, reconnects no longer drop votes ([ced98f0](https://github.com/kud/planning-poker/commit/ced98f0), [66e5d81](https://github.com/kud/planning-poker/commit/66e5d81))
- Six-character room codes and a single `/room/[id]` page for hosts and guests alike ([ced98f0](https://github.com/kud/planning-poker/commit/ced98f0))
- Responsive room: poker table with seated avatars on desktop, roster grid on mobile; cards appear on the felt only once a player votes ([66e5d81](https://github.com/kud/planning-poker/commit/66e5d81))
- Speaker ritual: pass the mic after the reveal — highest vote first, lowest second, then random; driven entirely by <kbd>space</kbd> ([b8e5d7b](https://github.com/kud/planning-poker/commit/b8e5d7b))
- Keyboard shortcuts: 1–9/0 to vote, space to reveal / next speaker / new round ([f870072](https://github.com/kud/planning-poker/commit/f870072))
- Pixel-art cast: a croupier who announces rounds, commentates results and does small talk; a waiter who delivers coffee on ☕ votes; a cat that strolls, sniffs, and purrs (or flees) when clicked ([f870072](https://github.com/kud/planning-poker/commit/f870072), [fddff80](https://github.com/kud/planning-poker/commit/fddff80), [b8e5d7b](https://github.com/kud/planning-poker/commit/b8e5d7b))
- Synthesized sound design with persisted mute toggle: card swishes, reveal flips, consensus chime, dice clicks, room-entry chime, breathing purr ([55a0e7e](https://github.com/kud/planning-poker/commit/55a0e7e))
- Host control bar under the header, host badge, live "waiting for…" status, room code on the felt when alone, live tab title ([55a0e7e](https://github.com/kud/planning-poker/commit/55a0e7e), [b8e5d7b](https://github.com/kud/planning-poker/commit/b8e5d7b))
- Anchored onboarding tour with spotlight rings, shown once per browser ([f870072](https://github.com/kud/planning-poker/commit/f870072))
- Marketing landing page: casino hero, animated table preview, features, how-it-works ([fddff80](https://github.com/kud/planning-poker/commit/fddff80))
- PWA support: manifest, standalone display, branded ace-of-spades icon set ([f045bb1](https://github.com/kud/planning-poker/commit/f045bb1))
- Deck preferences persisted locally and auto-applied to fresh rooms; purely numeric Numeric preset ([f870072](https://github.com/kud/planning-poker/commit/f870072))
- `npm run crew` — inject auto-voting fake users into any room for testing ([b8e5d7b](https://github.com/kud/planning-poker/commit/b8e5d7b))

### Fixes

- Reference-count connections per client so reconnecting players (phone sleep, network blips) keep their votes instead of becoming ghosts ([66e5d81](https://github.com/kud/planning-poker/commit/66e5d81))
- Ignore votes that arrive after the reveal ([b8e5d7b](https://github.com/kud/planning-poker/commit/b8e5d7b))
- Flying card launches from the clicked card, speaker ring stays glued to the avatar, stats layer above cards on the felt ([f045bb1](https://github.com/kud/planning-poker/commit/f045bb1), [8fdc0f4](https://github.com/kud/planning-poker/commit/8fdc0f4))

## [0.1.0] — 2026-05-06

### Features

- Initial peer-to-peer planning poker app ([7e0d01f](https://github.com/kud/planning-poker/commit/7e0d01f))

### Documentation

- Add MIT licence and project overview ([d85b022](https://github.com/kud/planning-poker/commit/d85b022))
