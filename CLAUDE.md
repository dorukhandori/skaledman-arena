# Skaledman Arena

This file is Claude Code's project memory, loaded every session. `AGENTS.md` is the tool-neutral overview (Cursor, Grok, Claude); keep the two in sync when the project identity changes.

Converse with sahip (the owner) in Turkish. Player-facing text is Turkish. Code identifiers are Turkish (K-10); library APIs and commit messages English. Commit messages in English. Never commit unless sahip asks.

Keep the repo **outside iCloud** (`~/dev/skaledman-arena`); a previous project's checkout was corrupted by iCloud evicting `.git` objects.

## What this is

A **real-time 1v1 browser arena** where viewers of the Kick streamer swaggybark fight with their own **Pokémon Infinite Fusion cards** from [skaledman.com](https://skaledman.com). Keyboard moves, mouse aims; each card's two attacks are two skill keys, its type is the basic hit, its ability is a passive, and a 3-card team can be swapped mid-fight. Inspiration and reference: PokeRivals (`docs/research/pokerivals-inceleme.md`). Sahip's words (1 Nov 2026): *"bu platformun sadece dövüş kısmına böyle bir şey yazmak istiyorum."*

**Product framing (sahip, 1 Nov 2026):** a Skaledman user who owns cards will get two choices on Skaledman: **otomatik savaş** (auto-battle, Skaledman's own, not our concern) or **arenada savaş** (fight in the arena). *"biz arenada savaş seçeneğini seçtiğinde kullanıcı olan kısmı kodluyoruz."* We build everything from the moment the user picks "arenada savaş": the hand-off contract (which user, which of their fusion cards), the arena itself, the result. The fusions are Skaledman's own fusions (its head+body combination and the resulting card); we do not invent cards.

What this is **not**: not the album, not card opening, not channel-point redemption, not auto-battle. Those live on Skaledman; we read its public JSON API and add the arena layer.

**Status: planning done, no code yet.** Design, architecture and the animation strategy are written; the next step is the F0 prototype starting with the Birleştirme Lab (see `docs/art/fusion-animasyon.md` § 6).

## Decided (do not reopen without new information)

- **Stack** (`docs/tech/mimari.md`): Vite + TypeScript + **PixiJS 8** client; **Colyseus 0.18** authoritative server with its built-in netcode (`defineInput`, `setFixedTimestep` **60 Hz** (K-6), patches at 20 Hz, `Predict` reconciler, `attachAll` lerp, `allowRewindState` + `lastSeenBy`); single package built on the official `colyseus/vite` starter (one `vite` process, HMR on both sides); shared simulation in `src/paylasilan` that runs on both client and server; Kick OAuth 2.1 (PKCE, `user:read`) for identity; SQLite; deploy on sahip's VPS as its own systemd unit behind a Cloudflare Tunnel.
- **Fighters are real frame-animated 8-direction pixel characters, like PokeRivals** (K-5, `docs/art/fusion-animasyon.md`). Sahip rejected procedural/mesh animation as the base. Base method under test: **compose each fusion from PMD SpriteCollab sprites** (body Pokémon's animation frames, recoloured to the artist's fusion palette, head Pokémon's head placed on the green head marker of the Offsets sheets); 224/226 current cards are coverable, zero per-card human work. PixelLab generation from the artist's sprite is the reward/fallback layer (sahip approves spending). Move effects are still drawn in code.
- **Move rules are data** (`docs/design/oyun-konsepti.md` § 3): hand-written rules for the most common moves, a `(type, power band) → family` fallback for the rest; client and server read the same table.
- **Controls mirror PokeRivals** (K-7): WASD, 1–4 or wheel selects the move, right button hold to aim and release to throw, Shift dash, Space jump, Tab/Q/E team. Reference values for speed, dash, telegraphs, damage and status come from `docs/design/oyun-konsepti.md` § 11.
- **Turkish identifiers** (K-10), **single package + npm** (K-9), Paca project **Skaledman Arena** exists (K-11).
- **Non-profit fan project.** Pokémon IP belongs to Nintendo/Creatures/GAME FREAK; fusion sprites belong to community artists (CC-like, no formal licence). No ads, no sales, artist credits shown in game. Any monetization is sahip's call and would need its own IP.

## Open (sahip decides)

- Skaledman is open source according to sahip (K-12: "sahibi bunu zaten açık kaynak olarak topluluktan birisi yayınladı"); the repository has not been located yet (GitHub search for skaledman/swaggybark/fusion found nothing; `z3x0fly/velutan` is a different Swaggybark community project, a 3D world map). Ask sahip for the link. Once found: does the fight layer live inside that repo or beside it (K-13)?
- Domain (`arena.skaledman.com` or our own); sprite mirroring (ask the Infinite Fusion community, or do what the Skaledman repo does).

## Layout

- `docs/design/` — `oyun-konsepti.md` (pitch, card→fighter mapping, modes, phases), later GDDs and `tuning.md`. Authority on gameplay and numbers.
- `docs/tech/` — `mimari.md` (skeleton choice, repo layout, runtime flow, deploy), `adr/` (one ADR per decision), later `netcode.md`, `backend.md`.
- `docs/art/` — `fusion-animasyon.md` (sprite profile, animation layers, Sprite Lab), later `efekt-dili.md`, sprite pipeline notes.
- `docs/ux/` — controls, HUD, flows, spectator view (to be written).
- `docs/production/` — `roadmap.md` (status + decision log, K-numbers), `ACTIVE_WORK.md` (multi-session claim board).
- `docs/research/` — research outputs; they never decide anything by themselves. Three PokeRivals studies: `pokerivals-inceleme.md` (stack, comparable repos), `pokerivals-oynanis-gozlemi.md` (flow, HUD, economy from watching sahip play; screenshots in `pokerivals-ekranlar/`), `pokerivals-paket-analizi.md` (netcode and simulation constants from the client bundle). Numbers from them are staged as candidates in `docs/design/oyun-konsepti.md` § 11 and `docs/tech/mimari.md` § 3b. `skaledman-sayfa-analizi.md` is everything skaledman.com reveals from outside (API schemas, card rules in its JS, visual tokens, the 401 authenticated surface behind `/giris`) plus the ten open points only the repo can answer.
- `src/paylasilan/` (shared sim + rules, no DOM/Node/`Math.random`), `src/sunucu/`, `src/istemci/`, `veri/` (Skaledman snapshots, type table, sprite meta), `test/`, `deploy/` — created in F0, shape in `docs/tech/mimari.md` § 2.

Design authority: `docs/design/` wins over `docs/art/` and `docs/ux/`; `docs/tech/` owns feasibility and can veto as infeasible; the call is sahip's.

## Claude Code agents

`.claude/agents/` holds the roster (ported from WyrmWar, same nicks). Every agent has a nick + title; every Paca comment and report line starts with `[@nick · Title]`. Paca project **Skaledman Arena** (K-11; id `b7300fdc-94ad-4734-b63c-465e20945d31`, task prefix `SA`, local UI http://localhost:8090). Task titles: `Ortam │ State │ Title`.

| Need | Agent file | Nick · Title |
|---|---|---|
| What's next / coordination / risk | `producer` | `@nile` · Producer |
| Move families, card→fighter rules, modes | `game-designer` | `@helix` · Game Designer |
| Stat formulas, balance, Elo, bot tournament | `economy-designer` | `@ledger` · Balance Designer |
| Arena stages, obstacles, surfaces | `arena-designer` | `@cove` · Arena Designer |
| Sprite Lab, PixelLab test, latency spikes | `prototyper` | `@spark` · Prototyper |
| Shared sim + client gameplay (Pixi) | `gameplay-programmer` | `@byte` · Gameplay Programmer |
| Colyseus 0.18 netcode, prediction, lag comp | `network-programmer` | `@relay` · Network Programmer |
| Kick OAuth, Skaledman sync, SQLite, VPS, webhooks | `backend-engineer` | `@vault` · Backend Engineer |
| HUD, lobby, result screens | `ui-programmer` | `@glyph` · UI Programmer |
| Controls, telegraph readability, spectator flow | `ux-designer` | `@tide` · UX Designer |
| Sprite profile pipeline, movement profiles, effect language, credits | `art-director` | `@iris` · Game Art Director |
| Test strategy, release gates | `qa-lead` | `@flint` · QA Lead |
| Test cases, bug reports | `qa-tester` | `@pebble` · QA Tester |
| Architecture, budgets, dependency risk | `technical-director` | `@axiom` · Technical Director |

There is no human team behind these; sahip is the only other party, and agents ask sahip directly.

## Delegation protocol

When sahip hands over a substantive task that clearly matches one specialist's domain, delegate via the `Agent` tool instead of doing it inline. Cross-cutting or ambiguous work goes to `producer`, which routes it and verifies the result against the specialist's own acceptance criteria. Trivial asks stay inline.

## Standing rules

- **Shared simulation is sacred:** `src/paylasilan` has no DOM, no Node API, no `Date.now`, no unseeded `Math.random`. Prediction only works if client and server run the same step bit for bit. Enforce with ESLint `no-restricted-globals`.
- **Server decides** position, HP, cooldowns, hits, damage, match result. The client sends `Girdi` only; `sanitize` clamps every field.
- **Never call Skaledman live from game code.** Hourly sync into SQLite; `veri/*.json` snapshots are the fixtures.
- **Test under bad networks.** A sync claim needs added latency/jitter/loss (state the values) and two real clients; `@colyseus/sdk/debug` panels exist for this.
- **Look at the real runtime.** Visual and feel work is verified by screenshots or play, not by reading code.
- **Ask before spending:** paid APIs (PixelLab, Gemini, Tripo), domains, cloud resources. Keys only from env or `~/.openclaw/credentials/`; never in the repo or logs.
- **VPS:** follow `~/.claude/rules/vps.md` (own systemd unit + user + `CPUQuota`/`MemoryMax`, bind to 127.0.0.1, tunnel out, back up before changing).
- Never fabricate a missing value; report failures and skipped checks plainly.
