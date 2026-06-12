# Changelog

All notable changes to this project are documented here.

---

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
