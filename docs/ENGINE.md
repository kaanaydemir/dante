# Engine Architecture — The Divine Comedy, a Playable Book

This is the technical companion to the story bible (`docs/script/README.md`, Turkish; "the bible") and the game design document (`docs/GDD.md`). The bible is the spec for the script format and every story system. This document says how the engine is cut into modules, where each part lives, and the exact runtime semantics every module codes against.

The product is a book first. The story, the characters and the conversations come first; play serves the reading. When a technical choice trades text quality against anything else, text wins.

---

## 1. Quick start

```bash
npm run dev          # Vite dev server (debug API on: window.__dante)
npm run build        # tsc --noEmit && vite build  ->  dist/ (relative paths; works under a GitHub Pages sub-path)
npm run preview      # serve dist/
npm test             # vitest (Node environment, tests/**/*.test.ts)
npm run typecheck    # tsc --noEmit
npm run lint:story   # vitest run tests/story-lint  (lints every docs/script/inferno-*.md)
npm run smoke        # Playwright: boots the game in headless Chromium, fails on any console error
npm run smoke -- --dist                 # same against the production build (run `npm run build` first)
npm run smoke -- --url <url>            # same against a server that is already running
npm run smoke -- --autoplay             # autoplay Chapter 1 through window.__dante (must reach chapter_complete)
npm run smoke -- --autoplay --fixture   # autoplay the engine fixture chapter (canto inf99)
npm run smoke -- --autoplay --timeout 600   # autoplay time limit in seconds (default 420)
```

Open `http://localhost:5173/?debug=1` to get `window.__dante` in any build (`vite dev` has it without the parameter; `?debug=0` turns it off). In the project's dev container Chromium for Playwright is preinstalled (`PLAYWRIGHT_BROWSERS_PATH`): never run `playwright install` there. On another machine, install it once with `npx playwright install chromium`.

Deployment: `.github/workflows/deploy.yml` runs `npm ci` and `npm run build` on Node 22 and publishes `dist/` to GitHub Pages on every push to `main` (and on manual dispatch). `vite.config.ts` sets `base: './'`, so `dist/index.html` loads `./assets/…` and the game works under `https://<owner>.github.io/<repo>/`. The game makes no network requests at runtime.

---

## 2. Architecture at a glance

```text
 docs/script/inferno-NN.md ──┐  import.meta.glob(?raw, eager)      docs/source/inferno/canto-NN.txt
 tests/fixtures/*.md (debug) ┤                                      (Longfellow 1867, numbered)
                             ▼                                                   │
                ┌──────────────────────────┐                                     │
   A story-core │ parser → CantoScript AST │── lint (L01–L22), quotes (L06) ◄────┤
                │ load.ts → StoryLibrary   │◄────────────────────────────────────┘
                └────────────┬─────────────┘
                             │ scripts, codex, memories, sources
                ┌────────────▼─────────────┐        ┌──────────────────────────┐
   B runtime    │ GameSession (chapter)    │        │ GameStateStore (state/)  │
                │   └ StoryRunner (beats)  │◄──────►│ effects, save/load,      │
                │ verse/ (tercets, chains) │        │ settings, conditions ctx │
                └───┬──────────────────┬───┘        └────────────▲─────────────┘
       awaits       │                  │ awaits                  │ reads / adjusts
   ┌────────────────▼───┐        ┌─────▼──────────────────┐      │
 C │ StoryPresenter     │        │ WorldBridge            │ D ───┘
   │ UI / BookPage /    │        │ WorldScene, player,    │
   │ BookMenu / Title   │        │ Virgil, LevelModule or │
   │ scenes, audio      │        │ generic level, mechanics│
   └────────────────────┘        └──────────┬─────────────┘
                                            │ bus 'world:signal' (enter / talk / event)
                        EventBus  ◄─────────┘  (typed, synchronous; debug log listens to everything)
```

- **Pure layer** (no Phaser, no DOM at import time; runs under Node/vitest): `src/story/**`, `src/state/**`, `src/runtime/**`, `src/verse/**`, `src/config.ts`. Type-only imports of Phaser (`import type * as Phaser from 'phaser'`) are allowed in `src/runtime/contracts.ts` because they are erased.
- **Phaser layer**: `src/scenes/**`, `src/ui/**`, `src/world/**`, `src/entities/**`, `src/mechanics/**`, `src/art/**`, `src/levels/**`, `src/audio/**`, `src/app/**`, `src/debug/**`.
- The runner never touches Phaser. It awaits two interfaces, `StoryPresenter` (team C) and `WorldBridge` (team D). Both are plugged into `session.ports` at boot; until then headless stand-ins are used, which is also how runner tests work.
- Scenes get services through `services()` (`src/app/services.ts`), set once by `bootstrap()` before the first frame.

---

## 3. Module map

The engine was built by four parallel teams plus an architect / integrator. File headers still name the owner (`Owner: team D (world)`); the table maps those names to directories. Keep a module's public surface stable when you change it, and change a contract (`src/runtime/contracts.ts`, `src/story/types.ts`) together with every implementation and test that uses it.

| Team (file headers) | Directories | What lives there |
|---|---|---|
| **A story-core** | `src/story/**` (`parser.ts`, `conditions.ts`, `effects.ts`, `quotes.ts`, `lint.ts`, `words.ts`, `cite.ts`, `load.ts`, `ast.ts`, `bible.ts`, `registry.ts`), `tests/story*/**` | Parser, condition grammar, effect tokens, quote verification against Longfellow, lint L01–L22, the word table, the story library, the bible's Chapter 1 registers (`registry.ts`, a snapshot checked against the live bible by `tests/story/bible.test.ts`) |
| **B runtime** | `src/runtime/**` (`bus.ts`, `runner.ts`, `session.ts`, `chapters.ts`, `autoplay.ts`, `specs.ts`, `headless.ts`, `clock.ts`), `src/state/**`, `src/verse/**`, `tests/runtime/**`, `tests/state/**`, `tests/verse/**` | Event bus, story runner, game session, autoplay, headless ports; state store, effects, persistence, selectors; tercets, chains, codas, cento |
| **C presentation** | `src/ui/**`, `src/audio/**`, `src/scenes/{Title,BookPage,UI,BookMenu}Scene.ts`, `tests/ui/**`, `tests/audio/**` | The book: presenter, pages, strips, bubbles, margin, cards, colophon, the Book menu and its tabs, HUD, text input, the WebAudio synth |
| **D world** | `src/world/**`, `src/entities/**`, `src/mechanics/**`, `src/art/**`, `src/levels/**`, `src/scenes/{Boot,World}Scene.ts`, `tests/world/**` | World scene and bridge, Dante, Virgil and NPCs, the mechanics library, procedural art, the level framework and the Chapter 1 levels |
| **Architect / integrator** | `src/story/types.ts`, `src/runtime/contracts.ts`, `src/config.ts`, `src/main.ts`, `src/app/**`, `src/scenes/keys.ts`, `src/scenes/registry.ts`, `src/debug/**`, `scripts/**`, `tests/fixtures/**`, `index.html`, `vite.config.ts`, `vitest.config.ts`, `tsconfig.json`, `package.json`, `.github/workflows/**`, `docs/ENGINE.md` | Contracts, constants, composition root, debug API, smoke test, build and deploy |

Levels: the Chapter 1 levels live in `src/levels/_framework/chapter1/` (`inf01.ts` … `inf05.ts` on the shared `common.ts`). A canto may instead get a folder of its own, `src/levels/<cantoId>/index.ts`, which the registry prefers (§8.2).

### 3.1 Entry points

Each module is reached through one factory or function; the types live in `src/runtime/contracts.ts` and `src/story/types.ts`. Keep the file path, export name and type when you change an implementation.

| File | Export | Type |
|---|---|---|
| `src/story/parser.ts` | `parseCanto(text, file)` | `(string, string) => ParseResult` |
| `src/story/conditions.ts` | `parseCondition(text, pos?)`, `evaluateCondition(cond, ctx)` | `ConditionParse`, `boolean` |
| `src/story/effects.ts` | `parseEffects(text, pos?)`, `formatEffect(effect)` | `EffectsParse`, `string` |
| `src/story/quotes.ts` | `parseSourceText(text, file)`, `verifyQuote(quote, source)`, `sourceKey()` | `SourceCanto \| null`, `QuoteCheck` |
| `src/story/lint.ts` | `lintCanto(script, ctx)` | `(CantoScript, LintContext) => Diagnostic[]` |
| `src/story/words.ts` | `WORDS`, `getWord`, `isRhyme`, `findWordInLine` | bible §3.4.6 table |
| `src/story/cite.ts` | `parseCitation`, `formatCitation`, `toRoman`, `fromRoman`, `cantoLabel` | |
| `src/story/load.ts` | `loadStoryLibrary(opts?)`, `buildStoryLibrary(scripts, sources)`, `RAW_SCRIPTS`, `RAW_SOURCES`, `RAW_FIXTURES`, `cantoIdFromPath` | `LoadStoryLibrary` |
| `src/runtime/bus.ts` | `createEventBus()` | `CreateEventBus` |
| `src/state/initial.ts` | `createInitialState(profile?)` | |
| `src/state/store.ts` | `createGameStateStore({ bus, storage })` | `CreateGameStateStore` |
| `src/runtime/runner.ts` | `createStoryRunner(deps)` | `CreateStoryRunner` |
| `src/runtime/session.ts` | `createGameSession(deps)` | `CreateGameSession` |
| `src/verse/tercet.ts` | `evaluateVerse(verse, ctx)` | `EvaluateVerse` |
| `src/ui/presenter.ts` | `createPresenter(deps)` | `CreatePresenter` |
| `src/audio/audio.ts` | `createAudio(deps)` | `CreateAudio` |
| `src/world/bridge.ts` | `createWorldBridge(deps)` | `CreateWorldBridge` |
| `src/art/textures.ts` | `generateTextures(scene)` | `(Phaser.Scene) => void` |
| `src/levels/_framework/registry.ts` | `getLevel`, `listLevels`, `registerLevel` | |
| `src/mechanics/index.ts` | `createLibraryMechanic(name, ctx, config)`, `libraryMechanicNames()` | |
| scenes | `BootScene`, `TitleScene`, `WorldScene`, `UIScene`, `BookPageScene`, `BookMenuScene` | Phaser scenes, keys in `src/scenes/keys.ts`, render order in `src/scenes/registry.ts` |

`src/app/stub.ts` (`stubObject()`) is what the modules started from; nothing uses it any more.

### 3.2 Dependencies between modules

- Runtime imports from story-core: `evaluateCondition`, `getWord`, `findWordInLine`, `formatCitation`, `cantoLabel`, `toRoman`.
- Presentation imports from story-core (`WORDS`, `getWord`, `SPEAKERS` from types) and from runtime / verse (`evaluateVerse` for the compose screen).
- World imports from verse (`evaluateVerse` for casting) and the level registry.
- Nobody imports a scene class except `src/scenes/registry.ts`. Presenter and world reach scenes through `game.scene.getScene(SceneKeys.X)`.

---

## 4. The script format in code

The bible §2 is the format. `src/story/types.ts` mirrors it one to one.

| Script | AST |
|---|---|
| YAML front matter | `CantoScript.front: FrontMatter` (+ derived `canticle`, `cantoNumber`, `roman`, `lineRange`, `epigraph`, `closing`) |
| `# Inferno III — The Gate` | `CantoScript.heading` |
| `## [inf03.s1] The Gate` | `Scene { id, title, index, number, beats }` |
| `### [inf03.s1.b1] Title` + one ```` ```script ```` block | `Beat { id, title, mode, place, trigger, music, ambience, chapterEnd, lines }` |
| leading `@mode/@place/@trigger/@music/@ambience/@chapter_end` | `Beat` fields (`trigger` defaults to `{ kind: 'auto' }`) |
| later `@music/@ambience/@place` | `DirectiveStmt` (applied in sequence) |
| `NARRATION:` / `PAGE:` | `NarrationStmt` / `PageStmt` |
| `SPEAKER:` / `SPEAKER (tag):` | `SayStmt { speaker, tag, text }` |
| `QUOTE VOICE (citation)` + `> …` lines + optional `GLOSS:` | `QuoteStmt { voice, citation, lines: (QuoteVerse \| QuoteSkip)[], gloss }` |
| `BARK SPEAKER:` | `BarkStmt` |
| `HINT:` (+ `HINT-SHORT:`) | `HintStmt { text, short }` |
| `DO: … {event:x} {checkpoint} {tutorial:y}` | `DoStmt { text, tags }` |
| `CAM: verb — text` | `CamStmt { verb, text }` |
| `SFX:` | `SfxStmt` |
| `EFFECTS: a, b` | `EffectsStmt { effects: Effect[], raw, invalid }` |
| `IF / ELSE IF / ELSE / END IF` | `IfStmt { branches: IfBranch[], elseBody }` (a tree) |
| `CHOICE … END CHOICE` | `ChoiceStmt { id, weight, systemic, title, prompt, options, reveal, beatId }` |
| `OPTION a [text] requires: … when: …` + body | `ChoiceOption { letter, text, spoken, speech, requires, when, body, effects }` |
| `REVEAL canon=… timing=…` + QUOTEs + `NOTE:` | `Reveal { canon, timing, quotes, note }` |
| `GOTO id` | `GotoStmt` |
| `SAPMA:` / `EKLEME:` | `NoteStmt` (ignored at runtime) |
| `// comment`, blank lines, prose, other fences | dropped |
| anything else | `UnknownStmt` + diagnostic (skipped at runtime) |
| ```` ```codex ```` / ```` ```memory ```` | `CodexEntry` / `MemoryEntry` |

Parser rules: try the §2.5 reserved words (`RESERVED_WORDS` in types) before the speaker pattern; a QUOTE block ends at the first line not starting with `> `; `CAM: <verb>` may have no description; integers in comparisons may be negative (`heart<=-3`); EFFECTS tokens are separated by `, `. Never throw; every node has `pos.line` (1-based markdown line); diagnostics use codes `P..` (parse) and `L01`–`L22` (lint). A canto whose parse yields at least one scene with one beat is playable (`status: 'ok'`) even with diagnostics. Verse lines get `lineNo` from the parser when the block has no skip line; `load.ts` resolves the rest with `verifyQuote`, so after loading every verifiable verse has a line number (needed for collectible words and the gold "lines you saw" in the Book).

The fixture `tests/fixtures/test-canto.md` uses the reserved canto id `inf99` and exercises every construct with real Canto I quotes. `tests/fixtures/fixture.test.ts` guards it. Lint runs it with profile `fixture`, which skips rules tied to real cantos (the §7 scene list, the §3.4.6 word-to-canto map, the §4.3 cross-canto registry, id range 01–34, source path vs canto number). It should lint clean in that profile.

---

## 5. Runner semantics (runtime; everyone relies on them)

### 5.1 Session and chapter

1. `session.newGame({ chapter?, startAt?, profile? })`: `store.reset(profile)`, then plays `chapterById(chapter).cantos` in order from `startAt`. Profile `m0` (bible §7.5, GDD 10.4: Canto I straight into Canto V) applies `config.M0_PROFILE` as system effects, only what is missing: unlock `verse`, `compose`, `heart`, `codex`, `remembrance` (and `words`, `book`), give `Way`, `Love`, `Away`, shed `Fear`. Every player then enters Canto V in the state of the end of Canto IV.
2. For each canto: `story.canto(id)`. If its status is not `ok`: `presenter.missingCanto({ cantoLabel, title, status, message: 'This canto is still being written.' })`, emit `canto:missing`, continue with the next canto. Missing or broken scripts never crash the game.
3. Otherwise `runner.runCanto(script, { at })`.
4. After the last canto: status `chapter_complete`, `presenter.showTitle()`.
5. `continueGame()`: `store.load()` -> `store.restore()` -> play on from `position.scene` of the saved canto.
6. `jump(target, { profile? })`: `runner.stop()`, keep the state (with `profile: 'm0'`, first apply the missing parts of the M0 kit), play on from the canto / scene / beat.
7. `stop()`: stop the runner, status `stopped`.

Every session promise resolves (never rejects). Unexpected exceptions are caught, reported as `debug:log` errors, and play continues with the next statement or beat.

### 5.2 Canto lifecycle

`runCanto(script, { at })`:
1. emit `canto:start`; `store.setPosition({ canto })`; `await presenter.beginCanto(meta)`; `await world.loadCanto(script, id)` (the world builds the level while the opening page covers it).
2. Run scenes in file order from `at` (default `s0`). At each scene start: `store.markSeen(scene)`, `store.setPosition({ scene, beat: null })`, `store.save()` (**the save point is the scene start**; continuing replays that scene from its beginning, so no effect is ever applied twice), emit `scene:start`. The current HINT is cleared at each scene start.
3. After the colophon scene: `store.completeCanto(id)`, `await presenter.endCanto(meta)`, emit `canto:end`, resolve `{ status: 'completed', missed, chapterEnd }`.

### 5.3 Beat scheduling (triggers)

One beat runs at a time. Inside a scene the **cursor** is the first beat (file order) that has neither run nor been missed.

- `auto` (default): runs as soon as the cursor reaches it.
- `after:<beat>`: like `auto`, once that beat has run (or has been missed).
- `enter:<place>`, `talk:<SPEAKER>`, `event:<id>`: the runner **waits**. While waiting, the **armed set** is: the cursor beat, every later not-yet-run non-auto beat of the scene, and the first beat of the next scene when that beat is non-auto. The world is told via `world.setArmed(armed)`; the player has control (`world.setPlayerControl(true)`).
  - `enter:P` is satisfied when the player enters P, or already stands in it when armed (`world.isSatisfied`).
  - `event:E` is satisfied when E is emitted while armed, or was emitted earlier in the current scene (events are scene-scoped, like the systemic `event:` predicate of bible §2.9).
  - `talk:S` is satisfied only by an interaction while armed.
  - Signals that arrive while a beat runs are buffered and checked at the next wait, in arrival order.
- The runner subscribes to `world:signal`. Every `event` signal is recorded with `store.recordEvent` and in the runner's scene-scoped event set (cleared at each scene start).
- When several armed beats are satisfied at once, the earliest in file order fires.
- **The cursor beat fires**: run it; the cursor moves on.
- **A later beat of the same scene fires** (optional or out-of-order beats, hubs): run it plus the `auto` beats directly after it. If that chain reaches the scene's last beat, the scene ends and every beat not run becomes **missed**. Otherwise the cursor stays where it was and the runner waits again.
- **The next scene's head fires**: the current scene ends (unrun beats missed) and the next scene starts with that head running at once.
- A scene ends when its last beat has run. Then the next scene starts (its head runs at once if `auto`, else it is armed).
- **Fallback**: if the cursor beat's trigger cannot be produced by the current level (`world.canSatisfy(trigger) === false`: unknown place, no such NPC, an event no level declares), the runner fires it itself after `TIMINGS.triggerFallbackMs` and logs a `debug:log` warning. Scripts therefore play even before their levels exist.

### 5.4 Running a beat

1. Compute `firstVisit` (beat not in `state.seen`), then emit `beat:start`; `store.markSeen(beat)`; `store.setPosition({ beat })`.
2. `await presenter.setMode(mode, ctx)` (`ctx` carries place, music, ambience, firstVisit); `world.setPlayerControl(mode === 'play')`; `await world.beginBeat(info)` (moves player and Virgil to `@place` if they are elsewhere, runs the level hook phase `start`).
3. Execute the lines (5.5). Special beats:
   - **Opening page** (scene number 0, mode `page`): the first QUOTE is the epigraph -> `presenter.openPage({ kind: 'opening', canticleLabel: 'INFERNO', cantoLabel: 'CANTO III', vignette: 'vignette-<cantoId>', epigraph, firstReading: firstVisit, awakening })`. `awakening` is true when the previous canto of the chapter lists `faint` in `mechanics`.
   - **Colophon** (mode `colophon`): see 5.9.
4. `await world.endBeat(info)` (hook phase `end`); emit `beat:end`.

### 5.5 Statements

| Statement | Runner action |
|---|---|
| `directive` | `music` / `ambience`: `presenter.setMode` again with the updated cues; `place`: `world.teleport(place)` when the player is not already there. `mode` / `trigger` / `chapter_end` mid-beat are ignored (lint error). |
| `narration` | log it (`ReadingLogEntry`); `await presenter.narration(text, { mode, blocking: mode !== 'play' })` |
| `page` | log it; `await presenter.openPage({ kind: 'text', text })` |
| `say` | `await presenter.say({ speaker, name: SPEAKERS[id].name, tag, text, mode, fromChoice: false })` |
| `quote` | build `QuoteSpec` (collectible words: 5.8); log it; `store.markLinesSeen`; `await presenter.quote(spec)` |
| `bark` | `presenter.bark(speaker, name, text)` (not awaited) |
| `hint` | becomes the current hint (key `beatId#index`); `presenter.hintAvailable(true)` |
| `do` | `await world.direct(stmt, doIndex, info)`; then tags: `{checkpoint}` -> `world.checkpoint()`; `{tutorial:x}` -> `presenter.tutorial(x)`; `{event:x}` is documentation of what the world emits (autoplay emits it, 5.12) |
| `cam` | `await Promise.all([presenter.camera(cmd), world.camera(cmd)])` (5.11) |
| `sfx` | `presenter.sfx(text)` (not awaited) |
| `effects` | apply in order (5.7) |
| `if` | evaluate branches in order with `evaluateCondition(cond, ctx)` where `ctx` is `store.conditions()` with the runner's scene-scoped `hasEvent`; run the first true body, else `elseBody` |
| `choice` | 5.6 |
| `goto` | Only as an option's last line (bible §2.9). The choice's `timing=immediate` card is shown first (5.6); then this beat stops (lines after `END CHOICE` are skipped); the target beat (same scene) runs next regardless of its trigger; beats between are missed; play continues after the target in file order. A GOTO to another scene is ignored with an error log. At most 50 GOTOs per scene run (loop guard). |
| `note`, `unknown` | skipped |

### 5.6 Choices

Dialogue choice (`systemic: false`):
1. Visible options = options whose `requires` holds. If fewer than two are visible, show all (log a warning; lint L15 should prevent it).
2. `letter = await presenter.choose(spec, visibleOptions)`. No time limit. Option texts never show numbers or system terms.
3. Spoken option (`["…"]`): `await presenter.say({ speaker: 'DANTE', text: speech, fromChoice: true })`.
4. Record: `store.recordChoice(...)` with `heading` = `As Dante did` if the letter is canonical (`canon` contains it, or `all`), else `What Dante did` (`none` always gives `What Dante did`); emit `choice:made`; log a `choice` entry (the Book's margin note).
5. Run the option body.
6. REVEAL card (`RevealCard` with `QuoteSpec`s, `note`, `heading`): `timing=immediate` and setting `after_choice` -> `await presenter.reveal(card)` right after the option's lines (and before a GOTO jump); `timing=deferred` or setting `end_of_canto` -> `store.pushPendingReveal` (opened at the colophon); setting `book_only` -> not shown in play (the Book shows the note).
7. Continue after `END CHOICE` (unless the option ended with a GOTO).

Systemic choice (`systemic: true`): no menu. It is evaluated once, when the flow reaches the `CHOICE` line (scripts place it after the play it measures). The first option whose `when` holds is chosen; `when: else` always holds; an `event:` predicate is true when that event was emitted **in the same scene before the CHOICE line** (the runner gives `evaluateCondition` a context whose `hasEvent` reads its scene-scoped set). Steps 4–7 as above; REVEAL is optional. A systemic choice in a beat that never runs stays unresolved and its `choice:` predicates are false. The option text is a past-tense label for the Book, never a menu.

### 5.7 Effects and feedback

`store.apply(effect, source)` implements bible §2.10; results drive the feedback:

| Effect | Store | Feedback |
|---|---|---|
| `pity+N@sin`, `justice+N@sin` | counter and ledger += N (never subtract) | `presenter.heartShift({ visible: unlocks has 'heart' })` |
| `trust±N` | clamp 0–10 | `world.setVirgilTrust(trust, delta)` (distance and posture, never a number) |
| `virtue:x+N` | += N | none |
| `word:X` | add, or unseal if sealed; a shed word never returns | `presenter.wordGained({ change: 'gained' \| 'unsealed', collected })` |
| `seal:X` | mark sealed (adds the word if missing) | `wordGained({ change: 'sealed' })` |
| `shed:X` | remove for good | `wordGained({ change: 'shed' })` |
| `memory:` / `codex:` | add once per playthrough | `memoryGained` / `codexGained({ silent: !unlocks.codex })` |
| `flag:` | raise (never lowered) | none |
| `resolve±N`, `grace±N`, `gracemax+N` | bar units, clamped; a scripted `resolve-N` never goes below 1 unit (script effects never cause a faint) | bus `resources:changed` (HUD) |
| `unlock:x` | add feature | `presenter.unlock(x)` |

Outcome `duplicate` / `ignored` gives no feedback. Codex entries, words and memories are given at most once per playthrough.

### 5.8 Collectible words

When a QUOTE is immediately followed by an EFFECTS line with `word:X`, and X's origin line (`WORDS`) is one of the quote's resolved verse lines, X is collectible in that quote: `CollectibleWord { word, lineIndex, start, end (findWordInLine), auto: acquisition === 'auto' }`. The presenter makes it glow. Bible §3.4.2 rule 5: **the bubble, page or card does not close until the word is taken with E**, and the `word:` effect applies at that press: `presenter.quote()` resolves on the press and the runner applies the EFFECTS line at once (`wordGained({ collected: true })`). An unconditional word therefore cannot be missed. Burden words (`Fear`) stick by themselves without input. `presenter.skip()` (debug, autoplay) takes pending words. Words whose line is not shown in the scene (`Pity`, `Judgment`) come with their origin line on the word card (`WordDef.origin`).

### 5.9 Colophon and chapter end

Colophon beat (`@mode: colophon`): the first QUOTE is the closing line (left page). Apply the beat's EFFECTS first (their words become `highlightWords`; the take on the card is then the flourish), then `store.takePendingReveals(canto)`. A highlighted word whose origin line appears in a deferred card's quote is made collectible there (Chapter 1: `Pity`, V 140, glows on the `inf05.c4` card and is taken with E; bible §7.5). Then build `ColophonSpec` (choices of this canto, deferred cards to open, words / codex / memories gained in this canto, the scale, `fullTextUnlocked: true`, next canto label). `await presenter.colophon(spec)` resolves on "Turn the page". With `@chapter_end: ch1` the runner then raises (as system effects) `ch1.heart_tender` (heart ≥ 3) / `ch1.heart_stern` (≤ −3) / `ch1.heart_even`, plus `ch1.trust_faithful` (trust ≥ 7) / `ch1.trust_wayward` (≤ 2), and `await presenter.chapterEnd(summary)`.

### 5.10 Ask Virgil (Q) and glosses

- While a verse bubble with a `GLOSS` is on screen, Q opens that gloss in the margin; the presenter handles this itself.
- Otherwise Q calls `session.askVirgil()`: the current hint, full the first time (`markHintUsed`), then `HINT-SHORT` (falls back to the full text). Trust ≤ 2 (Wayward) always gets the short line. No current hint -> `null`: Virgil is silent (bible: the silent walk of III s4).

### 5.11 Camera verbs

Both sides receive every `CAM` and resolve at once for verbs they do not handle:
- World (D): `cut`, `pan`, `zoom-in`, `zoom-out`, `shake` (skipped if `settings.screenShake` is off), `hold`, `follow`, plus the world half of `engrave` / `unengrave` (desaturate and hatch the scene, or bring the colour back).
- Presenter (C): `fade-in`, `fade-out`, `white-out` (a red white-out when the text says `kızıl`; respects `settings.flashes`), `page-turn`, plus the overlay half of `engrave` / `unengrave` (the opening page's vignette grows to fill the screen, about `TIMINGS.unengraveMs`).

### 5.12 Autoplay (debug and smoke tests)

`session.setAutoplay(opts)` / `runner.setAutoplay`. While on:
- every awaited presenter call gets `presenter.skip()` after `textDelayMs` (cancelled when it resolves earlier);
- choices are answered with `presenter.answer(letter)`: `canon` = first canonical visible letter (`all` -> first visible), `first`, `last`, or a per-choice map;
- waiting on triggers: after `triggerDelayMs` the runner calls `world.satisfy(cursorTrigger)` (teleport / talk / emit);
- `DO … {event:x}` tags: when `events` is `all` or lists x, the runner emits x after `world.direct` resolves, so systemic options that measure good play resolve to their first option;
- `stopAt` pauses autoplay (autoplay becomes `null`, the game keeps running) when that beat starts or that canto starts; turning autoplay on again also picks up the presenter call that is waiting.
- Defaults (`DEFAULT_AUTOPLAY`): `choices: 'canon'`, `textDelayMs` 40, `triggers: true`, `triggerDelayMs` 80, `events: 'all'`, `stopAt: null`. A per-choice map falls back to the canonical letter for choices it does not list.
- `presenter.skip()` finishes what is on screen at once (takes pending words, completes transitions); after a skipped transition the screen ends where the transition was going (for example, a skipped `unengrave` from the dark curtain leaves the world visible).

### 5.13 Cancellation

`runner.stop()` aborts an `AbortController`: `presenter.cancelAll()` and `world.cancel()` settle every pending promise, beat hooks see `ctx.signal.aborted`, and `runCanto` resolves `{ status: 'stopped' }`.

---

## 6. State (runtime)

`GameStateData` (contracts §2) is the public shape and the save file (version 1). Arrays, not Sets, so it serialises as is.

- Starting values come from `config.ts`: trust 4, Resolve 10 of 10, Grace 3, Grace max 6 (bars are 10 units; 1 unit = 10 %).
- `store.conditions()` implements `ConditionContext` (story types): `hasWord` = owned and not sealed; `value()` covers pity, justice, heart (pity − justice), pity@sin, justice@sin, trust, virtues, resolve, grace; `hasEvent` reads `state.events`, and the runner overrides it with its scene-scoped event set when it evaluates conditions (5.6).
- Save: `store.save()` writes `{ version, state }` to `localStorage['dante.save.v1']`; settings live apart in `dante.settings.v1` and survive new games. Every storage call is in try/catch; with no storage the game plays and `hasSave()` is false.
- `adjustResolve(delta, cause)` is for continuous gameplay changes (fear, hits); it ignores decreases in easy mode and emits `resources:changed`. Reaching 0 is the world's cue to faint (GDD 2.3–2.4): fade, respawn at the last checkpoint next to Virgil, `refillResolve()`, `recordFaint()`.
- Heart caps, trust caps and weights are lint's job (bible §3); the store only clamps trust to 0–10 and bars to their bounds.

---

## 7. Presentation

### 7.1 Screens (bible §1.3–§1.5)

| What | Where | Notes |
|---|---|---|
| Opening page (`s0`) | BookPageScene | Left page: `INFERNO` small caps, illuminated `CANTO III`, English title, 96×64 vignette (`vignette-<cantoId>`, fallback `vignette-generic`). Right page: ≤ 3-line epigraph + citation. `[E] Turn ▸`. First reading ≥ 3 s. |
| Narration strip | UIScene, top | Parchment, ≤ 2 sentences. Blocking (wait for input) outside play mode; non-blocking in play mode (reading time, Enter / click). |
| Modern dialogue | UIScene | Portrait (speaker + tag), name, typewriter at `textSpeed`, per-speaker blip. |
| Verse bubble | UIScene (or book page in page mode) | Different frame (dark paper, thin gold rule), appears line by line (or all at once per setting), never letter by letter; citation under it, always visible; `[Q] gloss` mark when there is a GLOSS; 4–6 lines split into tercet-sized bubbles; collectible words glow. |
| Choice margin | UIScene, right edge | 2–3 options, prompt above, keyboard / pad / mouse, no timer. After a choice: scale twitch (from Canto III), word card flies to the Book. |
| "What Dante did" card | UIScene | Slides from the margin: heading (`What Dante did` / `As Dante did`), 1–6 lines, citation, a plain note of at most two short sentences, `[E]`. |
| Colophon | BookPageScene | Left: the canto's last line alone. Right: "In this canto": your choices and Dante's, deferred cards opening, words with origin lines, memories, codex pages, the scale; "Turn the page". |
| Chapter end | BookPageScene | Summary and a preview of "Your Comedy" (the player's tercets as Longfellow lines). |
| Missing canto | BookPageScene | "CANTO II — This canto is still being written." Turn the page to go on. |
| The Book | BookMenuScene | Tabs below; opening it pauses the World and UI scenes, closing resumes them. |
| HUD | UIScene | Top left: Resolve (flame) and Grace (light drop), and from `unlock:heart` (Canto III) a small scale beside them: pans for pity and justice, the beam for the balance, no numbers. Top right: place name and canto numeral, and the [Q] Ask Virgil mark while a hint is available. Bottom right: the Book icon, where gained words fly. The equipped verse's words show in a small strip. Trust is never shown. |

### 7.2 Book tabs and gating

Tabs in their order on the page (`BOOK_TABS` in `src/ui/models/book.ts`):

| Tab | Content | Visible when |
|---|---|---|
| Cantos | per played canto: title + epigraph; "As you lived it" (log, with choice margin notes); "Your verses"; "The whole canto" (Longfellow, seen lines in gold, numbered) after its colophon | `unlock:book` |
| Verses | every Longfellow quote seen, in canto and line order | `unlock:book` |
| Words | word cards (name, family, category, origin line); compose screen (A · B · A slots, chains, coda) using `evaluateVerse` | `unlock:words`; composing needs `compose`, chains `chain` |
| Souls · Places · Lore | codex entries by tab | `unlock:codex` |
| Remembrance | "Remembered by the world" (Homer, Horace, Ovid, Lucan, Virgil) and "Remembered by you" (memories) | `unlock:remembrance` |
| Map | Botticelli-style section; first page from `codex:inf05.order_of_hell` | `unlock:codex` |
| Settings | §1.6 settings (below) | always |

### 7.3 Settings and accessibility (bible §1.6, GDD 9)

`Settings` in contracts: text speed (slow / normal / fast / instant), verse display (line by line / all at once), font scale (1, 1.15, 1.3), high contrast (`UI_COLORS_HIGH_CONTRAST`), "What Dante did" timing (after each choice / end of canto / only in the Book), volumes (all, music and air, sounds), screen shake, flashes, easy mode (shown as "Gentle mode": Resolve does not fall). Settings are also reachable from the title page. Pity and justice differ by shape as well as colour (a tear and a scale pan). Citations can never be hidden. Body text is never below 20 px (`FONT_SIZE` × `fontScale`).

### 7.4 Input arbitration

- UI (C) owns: text advance (E, Enter, Space while control is locked, click, pad A / Y), choices (arrows / W S, E / Enter, 1–3, click, pad), Q (ask Virgil / gloss), Tab / Esc (the Book), taking a glowing word (E while a quote with collectibles is on screen). Every element ignores advance input for `INPUT_GRACE_MS` (140 ms) after it appears, and a choice ignores E / Enter / Space for 450 ms, so the press that closed the line before it cannot pick an option; arrows and 1–3 work at once.
- World (D) owns: movement, dash (Shift / Space), interact (E), verse (J / left click), look back (hold R / pad RB), only while player control is on and no blocking UI element is open (`presenter.busy === false`).
- In play mode, non-blocking strips do not consume E; Enter or a click dismisses them.
- Key map and pad map: `config.ts` `KEYS`, `PAD_BUTTONS`.

### 7.5 Audio

`AudioService` (contracts §7): a tiny WebAudio synth. The context is created in `unlock()` on the first user gesture; with no AudioContext every call is a no-op. `describe()` maps Turkish SFX prose by keywords (deprem -> quake, rüzgâr -> wind, gök gürültüsü -> thunder, kükreme -> roar, adım / ayak -> step, …). `cue()` maps `@music` / `@ambience` prose and the canto to a drone and an ambience bed.

---

## 8. World

### 8.1 WorldScene

- Camera zoom 2 (`WORLD_ZOOM`): a 640×360 view of world pixels; 16 px tiles, 32 px characters; `roundPixels`; actors y-sorted with `actorDepth(y)`.
- Player (Dante: red robe and hood, laurel): 8-way walk, dash with brief invulnerability and cooldown, interact radius, look-back hold.
- Virgil (grey-white robe, beard): follows at `virgilFollowDistance(trust)`, never attacked, waits at checkpoints, can be directed by hooks (`moveTo`). Trust changes show as distance and a small gesture.
- Places are named rectangles; entering one publishes `world:signal { kind: 'enter', place }`, leaving publishes `exit`. Talking to an NPC (E in range) publishes `talk`. Events publish `event`.
- `world.beginBeat`: if the beat has `@place` and the player is elsewhere, move player and Virgil there (fade if far).
- Resolve, fear and fainting: fear zones drain Resolve (`RESOURCES.fearDrainPerSecond`, ×1.25 while carrying the Fear word); at 0 the player faints and respawns at the last checkpoint (`DO … {checkpoint}`, Virgil's stone bench). A level can set a rescue rule instead (`setRescue({ at, to })`, bible §7.3 / §7.5): when Resolve falls to `at` units, Dante sinks to his knees and Virgil comes and lifts him back to `to` units. Cantos I, III and V use it (`{ at: 1, to: 3 }`), so the reader is never sent back. The scripted faints at the end of Cantos III and V are story beats (`faint` mechanic, CAM white-out), not failures.
- `world.beginBeat` with `@place`: Dante and Virgil are brought to the place when Dante is elsewhere. With `setKeepAhead(true)` (Cantos IV and V), a play beat triggered by `enter:` whose place Dante has already walked through leaves him where he is, so a traversal is never undone by a beat that waited its turn.
- Verse casting (J): needs `unlock:verse`, an equipped verse (`state.equippedVerse`, set from the Words screen) that `evaluateVerse` accepts, and Grace (`graceCost`). Effect by category of the middle word: Force pushes and stuns, Ward shields, Mend restores Resolve, Reveal lights the dark, Still slows hazards and calms wind, Swift a long dash. Nothing is ever killed.

### 8.2 Levels

- **Registry** (`src/levels/_framework/registry.ts`): a canto's level is a `LevelModule` (contracts §10). A folder `src/levels/<cantoId>/index.ts` that default-exports one is discovered at build time (`import.meta.glob('/src/levels/{inf,pur,par}*/index.ts')`) and wins. Otherwise Chapter 1 uses the story levels of `src/levels/_framework/chapter1/`, and the fixture canto `inf99` uses `demo.ts`. A canto with no level at all gets the generic level built from its script.
- **LevelModule**: `build(ctx)` creates the map, places (ids exactly as the script's `@place` / `enter:`), spawns, NPCs and mechanics; `emits` lists the events it can produce (the runner then waits for the player instead of firing them itself, §5.3); `beatHooks[beatId]` implements that beat's DO lines (phases `start`, `do` with `doIndex`, `end`) and must honour `ctx.signal`; optional `update(dt, level)` and `destroy()`.
- **Generic level** (`layout.ts` plans, `generic.ts` builds, `map.ts` draws, `ambient.ts` adds mechanics; the planners are pure and unit-tested): place ids in order of first appearance (`@place` and `enter:` triggers) are laid out left to right along a path, themed by their ids, in the canto palette; a talkable NPC stands where each `talk:` beat happens; silent figures dress the scenes that name them; Virgil appears from the scene that first brings him; armed places and NPCs get a glint. The canto's front-matter mechanics that make sense without hand-made moments come as gentle ambience (darkness, fear hollows with a Resolve floor, wind lanes and lee rocks, the runners and their wasps, a walkable stream, the inscription). The generic level emits no events, so `event:` triggers fall back (5.3).
- **Chapter 1 story levels** (`src/levels/_framework/chapter1/`): `inf01.ts` … `inf05.ts`, each made with `storyLevel({ id, emits, overrides, build, everyBeat, hooks })` from `common.ts`. A story level is the generic layout of its script (with `overrides` to retune or drop ambient mechanics) plus a hand-made layer: figures and props in `build`, staging that depends on where the story is in `everyBeat` (so jumps and Continue find the world in the right state), and beat hooks that stage the poem's moments and produce the events their DO lines name. Rules every moment follows: a declared event is always produced in the end, by play or by the moment's own time limit; a hook that holds its beat never holds it under autoplay and always has a time limit in game time (the Book's pause stops it); a moment that outlives its beat is bound to the level's lifetime (`levelSignal`). `kit.ts` has the bounded helpers (`onStart`, `onDo`, `onEnd`, `until`, …); `tests/world/chapter1.test.ts` checks that each level emits only events its script names, produces every event its beats wait for and hooks only real beats; `cantos-1-3.test.ts` and `inf04.test.ts` check the layout rules of the wood, the banner and Limbo.
- **World extras** (`src/world/extras.ts`, `worldExtras(ctx.level)`): the world's API for levels and mechanics beyond the frozen `LevelRuntime`: hurt, drain, push and slow Dante; interactables and runtime solids; control locks and input capture (Minos's court); NPCs and extra actors; Virgil's staging (`showVirgil`, `setVirgilLeads`, `setLeadPath`, follow / hold modes); benches and checkpoints; fog, camera "ahead" point, look-back pose; scripted faint; `setRescue`, `setKeepAhead`.
- **Mechanics** (`MECHANIC_NAMES`, bible §7.0) are reusable classes in `src/mechanics/`, one per file (pure maths in `src/mechanics/logic/`), created by `ctx.createMechanic(name, config)` and found again with `ctx.mechanic(idOrName)`. `PERSISTENT_MECHANICS` (move, dash, talk, follow, compose, verse, heart, remembrance, chain) work in every canto once unlocked or taught; every other mechanic is active only in cantos whose front matter lists it. Player abilities (move, dash, talk, follow, verse, look_back) live in the world, and compose, heart, remembrance, chain and read_pages in the book, not as level mechanics (`NON_LEVEL_MECHANICS`). The library: `fear`, `darkness`, `look_back`, `chase`, `hold_ground`, `push_back`, `crowd_flow`, `swarm`, `guardian`, `quake`, `faint`, `inscription`, `hub`, `walk_on_water`, `wind_field` / `shelter` / `wind_lull`, `judgement_game`. Options added for Chapter 1 are opt-in and off by default, for example the wind's "brace" (a Dante who stands still is pushed at 15 % after 0.45 s), the crowd's thinning at the sharp bends of its loop, and `quench()` for a fear zone.

### 8.3 Art

All art is generated in code at boot (`generateTextures`): ASCII pixel maps plus a palette per sprite, turned into canvas textures. No image files, no network. Doré-like: strong darks, limited per-canto palettes (`PALETTES`). Texture keys: `dante`, `virgil`, `npc-<speaker lowercase>` (e.g. `npc-charon`, `npc-she_wolf`), `npc-generic`, `portrait-<speaker lowercase>[-<tag>]`, `tile-<cantoId>-<name>`, `prop-<name>`, `vignette-<cantoId>`, `vignette-generic`, `icon-<name>` (heart scale, tear, pan, flame, drop, word card). Characters: Dante, Virgil, panther (spotted), lion, she-wolf (gaunt), Charon, Minos (with tail), souls, Francesca and Paolo, the four poets.

---

## 9. Debug API, autoplay, smoke tests

`window.__dante` (`DanteDebugApi` in contracts §12; `src/debug/DebugApi.ts`) exists with `?debug=1` and in `vite dev` (`?debug=0` turns it off). Installing it never changes how the game plays; debug builds also load the fixture chapter.

```js
__dante.autoplay({ choices: 'canon', textDelayMs: 40 });   // or false to turn it off
__dante.autoplay({ choices: { 'inf03.c1': 'b' } });         // per-choice letters, canon for the rest
__dante.autoplay({ stopAt: 'inf05.s6.b3' });                // pause autoplay when that beat (or canto) starts
__dante.newGame();                       // returns at once; poll __dante.status / __dante.beat
__dante.newGame({ chapter: 'fixture' }); // play tests/fixtures/test-canto.md (debug builds only)
__dante.continueGame();                  // like Continue on the title: replay the saved scene from its start
__dante.jump('inf05');  __dante.jump('inf03.s2');  __dante.jump('inf05.s6.b3', { profile: 'm0' });
__dante.choose('b');  __dante.skipText();  __dante.teleport('inf03_gate');
__dante.emit('inf01.waited_dawn');  __dante.talk('VIRGIL');  __dante.armed();
__dante.setSettings({ textSpeed: 'fast' });
__dante.state;  __dante.status;  __dante.runnerStatus;  __dante.canto;  __dante.scene;  __dante.beat;  __dante.mode;
__dante.errors();  __dante.events();  __dante.diagnostics();
__dante.session;  __dante.runner;  __dante.store;  __dante.story;   // the live services, for tools
```

`errors()` collects uncaught errors, unhandled rejections and `debug:log` errors; `events()` is a ring buffer of the last 600 bus events (without `resources:changed` and `state:changed`); `diagnostics()` lists the parse and lint diagnostics of every loaded script.

`scripts/smoke.mjs` (`npm run smoke`) opens the game in headless Chromium (1280×720) and fails on any console error, page error, failed request or `__dante.errors()` entry; without `--autoplay` it starts a journey, presses an arrow key, and opens and closes the Book; with `--autoplay` it must reach `status === 'chapter_complete'` within `--timeout` seconds (default 420; the whole chapter takes about three minutes on an idle 4-core machine). By default it starts its own Vite dev server without file watching or HMR, so editing files during a run cannot reload the page; `--dist` serves `dist/` with `vite preview` instead, and `--url` tests a server that is already running. Screenshots go to `test-results/`.

---

## 10. Testing rules

- Vitest runs in Node (`vitest.config.ts`). There is no `@types/node`: do not import `node:*` modules in tests or `src`. Load text with `import text from '…/file.md?raw'` or `import.meta.glob(…, { query: '?raw', import: 'default', eager: true })`, exactly like the game.
- Layout: `tests/story/**` and `tests/story-lint/**` (story-core), `tests/runtime/**`, `tests/state/**`, `tests/verse/**` (runtime), `tests/ui/**`, `tests/audio/**` (presentation), `tests/world/**` (world: geometry, art, mechanics logic, generic layout, the Chapter 1 levels), `tests/fixtures/**` (the fixture canto and its guard).
- Story-core: parser, conditions, effects, quotes and lint tests against the fixture and against small inline scripts; `lint:story` lints every real script (profile `canto`) and the fixture (profile `fixture`) and fails on errors. `tests/story/bible.test.ts` compares the registry snapshot with the live bible.
- Runtime: runner tests with headless presenter / world doubles (record calls, answer choices, fire signals) on the fixture: scheduling (auto, enter, talk, event, after, optional beats, next-scene head, fallback), GOTO diamond, nested IF, choices (requires, spoken, systemic, reveal timings and settings), effects and idempotency, collectible words, colophon and chapter end, save / continue, autoplay, cancellation.
- Presentation and world: keep logic that can be pure (layout maths, text wrapping, input mapping, view models, level layout from a script, wind / crowd / path maths) in plain functions with tests; Phaser code is covered by `npm run smoke`.
- Definition of done: `npm run typecheck`, `npm test`, `npm run lint:story`, `npm run build` and `node scripts/smoke.mjs --autoplay` all pass with no console errors.

---

## 11. Conventions

- TypeScript strict (`tsconfig.json`: `verbatimModuleSyntax`, so type-only imports use `import type`). Import Phaser as `import * as Phaser from 'phaser'` (the ESM build has no default export), or `import type * as Phaser from 'phaser'` for types.
- English for all in-game text, code, identifiers and comments. Designer prose in scripts stays Turkish and is never shown.
- No network at runtime: fonts come from `@fontsource` (bundled), art is generated, text is bundled.
- Never throw from a Phaser `update` loop or a bus handler; report through `bus.emit('debug:log', { level: 'error', … })` (the bus already catches handler errors). A `console.error` fails the smoke test, so use it only for real errors.
- Wrap every `localStorage` access in try/catch; guard WebAudio and gamepad APIs.
- Constants live in `src/config.ts` (resolution, depths, palettes, fonts, keys, timings, resources); do not hard-code them elsewhere.
- Every ID in code follows bible §4.1; engine-raised flags use the `ch<n>.` and `sys.` prefixes only.
