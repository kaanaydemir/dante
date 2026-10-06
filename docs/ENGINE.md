# Engine Architecture — The Divine Comedy, a Playable Book

This is the technical companion to the story bible (`docs/script/README.md`, Turkish; "the bible") and the game design document (`docs/GDD.md`). The bible is the spec for the script format and every story system. This document says how the engine is cut into modules, who owns which file, and the exact runtime semantics every module codes against.

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
npm run smoke -- --autoplay             # autoplay Chapter 1 through window.__dante
npm run smoke -- --autoplay --fixture   # autoplay the engine fixture chapter (canto inf99)
```

Open `http://localhost:5173/?debug=1` to get `window.__dante` in any build. Chromium for Playwright is preinstalled (`PLAYWRIGHT_BROWSERS_PATH`); never run `playwright install`.

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

## 3. File ownership (next phase)

Four implementers work in parallel. Each owns a disjoint set of files. **Do not edit files you do not own**; if a contract must change, ask the architect / integrator.

| Team | Owns | Delivers |
|---|---|---|
| **A story-core** | `src/story/**` except `types.ts` (`parser.ts`, `conditions.ts`, `effects.ts`, `lint.ts`, `quotes.ts`, `words.ts`, `cite.ts`, `load.ts`, any new helpers), `tests/story*/**` | Parser, condition grammar, effect tokens, quote verification, lint L01–L22, word table, library |
| **B runtime** | `src/state/**`, `src/runtime/**` except `contracts.ts` (`bus.ts`, `runner.ts`, `session.ts`, headless presenter/world, autoplay), `src/verse/**`, `tests/runtime/**`, `tests/verse/**`, `tests/state/**` | Store, runner, session, autoplay, tercet / chain / coda logic |
| **C presentation** | `src/ui/**`, `src/scenes/TitleScene.ts`, `src/scenes/BookPageScene.ts`, `src/scenes/UIScene.ts`, `src/scenes/BookMenuScene.ts`, `src/audio/**` | The book: pages, strips, bubbles, margin, cards, colophon, Book menu + settings, HUD, input for text, audio |
| **D world** | `src/world/**`, `src/entities/**`, `src/mechanics/**`, `src/art/**`, `src/scenes/BootScene.ts`, `src/scenes/WorldScene.ts`, `src/levels/_framework/**` | World scene, player, Virgil, generic fallback level, LevelModule framework, mechanics library, procedural art |
| **Architect / integrator** | `src/story/types.ts`, `src/runtime/contracts.ts`, `src/config.ts`, `src/main.ts`, `src/app/**`, `src/scenes/keys.ts`, `src/scenes/registry.ts`, `src/debug/**`, `scripts/**`, `tests/fixtures/**`, `index.html`, `vite.config.ts`, `vitest.config.ts`, `tsconfig.json`, `package.json`, `docs/ENGINE.md` | Contracts, composition root, debug API, smoke tests |

Later phase: per-canto levels in `src/levels/<cantoId>/` (one owner per canto).

### 3.1 Entry points (signatures frozen)

Every entry point already exists as a compiling stub or starter implementation, so all four teams compile from day one. Replace the bodies; **keep the file path, export name and type**. Types live in `src/runtime/contracts.ts` and `src/story/types.ts`.

| File | Export | Type | State today |
|---|---|---|---|
| `src/story/parser.ts` | `parseCanto(text, file)` | `(string, string) => ParseResult` | stub |
| `src/story/conditions.ts` | `parseCondition(text, pos?)`, `evaluateCondition(cond, ctx)` | `ConditionParse`, `boolean` | parse stub, evaluate done |
| `src/story/effects.ts` | `parseEffects(text, pos?)`, `formatEffect(effect)` | `EffectsParse`, `string` | parse stub, format done |
| `src/story/quotes.ts` | `parseSourceText(text, file)`, `verifyQuote(quote, source)`, `sourceKey()` | `SourceCanto \| null`, `QuoteCheck` | source done, verify stub |
| `src/story/lint.ts` | `lintCanto(script, ctx)` | `(CantoScript, LintContext) => Diagnostic[]` | stub |
| `src/story/words.ts` | `WORDS`, `getWord`, `isRhyme`, `findWordInLine` | §3.4.6 table | done (verified against sources) |
| `src/story/cite.ts` | `parseCitation`, `formatCitation`, `toRoman`, `fromRoman`, `cantoLabel` | | done |
| `src/story/load.ts` | `loadStoryLibrary(opts?)`, `buildStoryLibrary(scripts, sources)`, `RAW_SCRIPTS`, `RAW_SOURCES`, `RAW_FIXTURES`, `cantoIdFromPath` | `LoadStoryLibrary` | starter (uses the stub parser) |
| `src/runtime/bus.ts` | `createEventBus()` | `CreateEventBus` | done |
| `src/state/initial.ts` | `createInitialState(profile?)` | | done |
| `src/state/store.ts` | `createGameStateStore({ bus, storage })` | `CreateGameStateStore` | stub |
| `src/runtime/runner.ts` | `createStoryRunner(deps)` | `CreateStoryRunner` | stub |
| `src/runtime/session.ts` | `createGameSession(deps)` | `CreateGameSession` | stub |
| `src/verse/tercet.ts` | `evaluateVerse(verse, ctx)` | `EvaluateVerse` | stub |
| `src/ui/presenter.ts` | `createPresenter(deps)` | `CreatePresenter` | stub |
| `src/audio/audio.ts` | `createAudio(deps)` | `CreateAudio` | stub |
| `src/world/bridge.ts` | `createWorldBridge(deps)` | `CreateWorldBridge` | stub |
| `src/art/textures.ts` | `generateTextures(scene)` | `(Phaser.Scene) => void` | stub |
| `src/levels/_framework/registry.ts` | `getLevel`, `listLevels`, `registerLevel` | | done (auto-discovers `src/levels/<id>/index.ts`) |
| scenes | `BootScene`, `TitleScene`, `WorldScene`, `UIScene`, `BookPageScene`, `BookMenuScene` | Phaser scenes, keys in `src/scenes/keys.ts` | placeholders |

Stubs use `stubObject()` (`src/app/stub.ts`): listed members return values, every other member is an async no-op. Delete the stub call when you implement the module.

### 3.2 Cross-team dependencies

- B imports from A: `evaluateCondition`, `getWord`, `findWordInLine`, `formatCitation`, `cantoLabel`, `toRoman`. These already work.
- C imports from A (`WORDS`, `getWord`, `SPEAKERS` from types) and from B (`evaluateVerse` for the compose screen).
- D imports from B (`evaluateVerse` for casting) and the level registry.
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

## 5. Runner semantics (team B implements; everyone relies on them)

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
- `stopAt` pauses autoplay on reaching a beat or canto.

### 5.13 Cancellation

`runner.stop()` aborts an `AbortController`: `presenter.cancelAll()` and `world.cancel()` settle every pending promise, beat hooks see `ctx.signal.aborted`, and `runCanto` resolves `{ status: 'stopped' }`.

---

## 6. State (team B)

`GameStateData` (contracts §2) is the public shape and the save file (version 1). Arrays, not Sets, so it serialises as is.

- Starting values come from `config.ts`: trust 4, Resolve 10 of 10, Grace 3, Grace max 6 (bars are 10 units; 1 unit = 10 %).
- `store.conditions()` implements `ConditionContext` (story types): `hasWord` = owned and not sealed; `value()` covers pity, justice, heart (pity − justice), pity@sin, justice@sin, trust, virtues, resolve, grace; `hasEvent` reads `state.events`, and the runner overrides it with its scene-scoped event set when it evaluates conditions (5.6).
- Save: `store.save()` writes `{ version, state }` to `localStorage['dante.save.v1']`; settings live apart in `dante.settings.v1` and survive new games. Every storage call is in try/catch; with no storage the game plays and `hasSave()` is false.
- `adjustResolve(delta, cause)` is for continuous gameplay changes (fear, hits); it ignores decreases in easy mode and emits `resources:changed`. Reaching 0 is the world's cue to faint (GDD 2.3–2.4): fade, respawn at the last checkpoint next to Virgil, `refillResolve()`, `recordFaint()`.
- Heart caps, trust caps and weights are lint's job (bible §3); the store only clamps trust to 0–10 and bars to their bounds.

---

## 7. Presentation (team C)

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
| HUD | UIScene | Top left: Resolve (flame) and Grace (light drop), and from `unlock:heart` (Canto III) a small scale beside them: pans for pity and justice, the beam for the balance, no numbers. Top right: place name and canto numeral. Suggested: a small strip with the equipped tercet's three words. Trust is never shown. |

### 7.2 Book tabs and gating

| Tab | Content | Visible when |
|---|---|---|
| Settings | §1.6 settings (below) | always |
| Words | word cards (name, family, category, origin line); compose screen (A · B · A slots, chains, coda) using `evaluateVerse` | `unlock:words`; composing needs `compose`, chains `chain` |
| Cantos | per played canto: title + epigraph; "As you lived it" (log, with choice margin notes); "Your verses"; "The whole canto" (Longfellow, seen lines in gold, numbered) after its colophon | `unlock:book` |
| Verses | every Longfellow quote seen, in canto and line order | `unlock:book` |
| Souls · Places · Lore | codex entries by tab | `unlock:codex` |
| Remembrance | "Remembered by the world" (Homer, Horace, Ovid, Lucan, Virgil) and "Remembered by you" (memories) | `unlock:remembrance` |
| Map | Botticelli-style section; first page from `codex:inf05.order_of_hell` | `unlock:codex` |

### 7.3 Settings and accessibility (bible §1.6, GDD 9)

`Settings` in contracts: text speed (slow / normal / fast / instant), verse display (line by line / all at once), font scale (1, 1.15, 1.3), high contrast (`UI_COLORS_HIGH_CONTRAST`), "What Dante did" timing (after each choice / end of canto / only in the Book), volumes, screen shake, flashes, easy mode. Pity and justice differ by shape as well as colour (a tear and a scale pan). Citations can never be hidden. Body text is never below 20 px (`FONT_SIZE` × `fontScale`).

### 7.4 Input arbitration

- UI (C) owns: text advance (E, Enter, Space while control is locked, click, pad A / Y), choices (arrows / W S, E / Enter, 1–3, click, pad), Q (ask Virgil / gloss), Tab / Esc (the Book), taking a glowing word (E while a quote with collectibles is on screen).
- World (D) owns: movement, dash (Shift / Space), interact (E), verse (J / left click), look back (hold R / pad RB), only while player control is on and no blocking UI element is open (`presenter.busy === false`).
- In play mode, non-blocking strips do not consume E; Enter or a click dismisses them.
- Key map and pad map: `config.ts` `KEYS`, `PAD_BUTTONS`.

### 7.5 Audio

`AudioService` (contracts §7): a tiny WebAudio synth. The context is created in `unlock()` on the first user gesture; with no AudioContext every call is a no-op. `describe()` maps Turkish SFX prose by keywords (deprem -> quake, rüzgâr -> wind, gök gürültüsü -> thunder, kükreme -> roar, adım / ayak -> step, …). `cue()` maps `@music` / `@ambience` prose and the canto to a drone and an ambience bed.

---

## 8. World (team D)

### 8.1 WorldScene

- Camera zoom 2 (`WORLD_ZOOM`): a 640×360 view of world pixels; 16 px tiles, 32 px characters; `roundPixels`; actors y-sorted with `actorDepth(y)`.
- Player (Dante: red robe and hood, laurel): 8-way walk, dash with brief invulnerability and cooldown, interact radius, look-back hold.
- Virgil (grey-white robe, beard): follows at `virgilFollowDistance(trust)`, never attacked, waits at checkpoints, can be directed by hooks (`moveTo`). Trust changes show as distance and a small gesture.
- Places are named rectangles; entering one publishes `world:signal { kind: 'enter', place }`, leaving publishes `exit`. Talking to an NPC (E in range) publishes `talk`. Events publish `event`.
- `world.beginBeat`: if the beat has `@place` and the player is elsewhere, move player and Virgil there (fade if far).
- Resolve, fear and fainting: fear zones drain Resolve (`RESOURCES.fearDrainPerSecond`, ×1.25 while carrying the Fear word); at 0 the player faints and respawns at the last checkpoint (`DO … {checkpoint}`, Virgil's stone bench). Suggested (GDD 2.4): with trust ≥ 7 (Faithful) Virgil catches Dante once per circle instead. The scripted faints at the end of Cantos III and V are story beats (`faint` mechanic, CAM white-out), not failures.
- Verse casting (J): needs `unlock:verse`, an equipped verse (`state.equippedVerse`, set from the Words screen) that `evaluateVerse` accepts, and Grace (`graceCost`). Effect by category of the middle word: Force pushes and stuns, Ward shields, Mend restores Resolve, Reveal lights the dark, Still slows hazards and calms wind, Swift a long dash. Nothing is ever killed.

### 8.2 Levels

- A per-canto level is a `LevelModule` (contracts §10) default-exported from `src/levels/<cantoId>/index.ts`; the registry discovers it. `build(ctx)` creates the map, places (ids exactly as the script's `@place` / `enter:`), spawns, NPCs and mechanics; `emits` lists the events it can produce; `beatHooks[beatId]` implements that beat's DO lines (phases `start`, `do` with `doIndex`, `end`) and must honour `ctx.signal`.
- **Generic fallback level** (used when no LevelModule exists; makes every script playable now): collect place ids in order of first appearance (`@place` and `enter:` triggers), lay them out left to right along a path in the canto palette, put an NPC for every `talk:` speaker in its beat's place (or the next one), mark armed places / NPCs with a glint, and report `canSatisfy(event:…) = false` so event triggers fall back (5.3).
- Mechanics (`MECHANIC_NAMES`, bible §7.0) are reusable classes in `src/mechanics/`, one per file, created by `ctx.createMechanic(name, config)`. `PERSISTENT_MECHANICS` (move, dash, talk, follow, compose, verse, heart, remembrance, chain) work in every canto once unlocked or taught; every other mechanic is active only in cantos whose front matter lists it. Player abilities (move, dash, talk, follow, verse, look_back) live in the world, not as level mechanics. GDD 10.2 systems map to: `wind_field` / `shelter` / `wind_lull` (WindField), `swarm` and `crowd_flow` (PatternHazard), `darkness` (VisionModifier), `walk_on_water` (SurfaceModifier), plus `fear`, `hold_ground`, `push_back`, `chase`, `guardian`, `quake`, `faint`, `inscription`, `hub`, `judgement_game`.

### 8.3 Art

All art is generated in code at boot (`generateTextures`): ASCII pixel maps plus a palette per sprite, turned into canvas textures. No image files, no network. Doré-like: strong darks, limited per-canto palettes (`PALETTES`). Texture keys: `dante`, `virgil`, `npc-<speaker lowercase>` (e.g. `npc-charon`, `npc-she_wolf`), `npc-generic`, `portrait-<speaker lowercase>[-<tag>]`, `tile-<cantoId>-<name>`, `prop-<name>`, `vignette-<cantoId>`, `vignette-generic`, `icon-<name>` (heart scale, tear, pan, flame, drop, word card). Characters: Dante, Virgil, panther (spotted), lion, she-wolf (gaunt), Charon, Minos (with tail), souls, Francesca and Paolo, the four poets.

---

## 9. Debug API, autoplay, smoke tests

`window.__dante` (`DanteDebugApi` in contracts §12; `src/debug/DebugApi.ts`) exists with `?debug=1` and in `vite dev`. It never changes how the game plays.

```js
__dante.autoplay({ choices: 'canon', textDelayMs: 40 });   // or false to turn it off
__dante.newGame();                       // returns at once; poll __dante.status / __dante.beat
__dante.newGame({ chapter: 'fixture' }); // play tests/fixtures/test-canto.md (debug builds only)
__dante.jump('inf05');  __dante.jump('inf03.s2');  __dante.jump('inf05.s6.b3', { profile: 'm0' });
__dante.choose('b');  __dante.skipText();  __dante.teleport('inf03_gate');
__dante.emit('inf01.waited_dawn');  __dante.talk('VIRGIL');  __dante.armed();
__dante.state;  __dante.beat;  __dante.errors();  __dante.events();  __dante.diagnostics();
```

`scripts/smoke.mjs` opens the game in headless Chromium and fails on any console error, page error, failed request or `__dante.errors()` entry; with `--autoplay` it must reach `status === 'chapter_complete'`.

---

## 10. Testing rules

- Vitest runs in Node (`vitest.config.ts`). There is no `@types/node`: do not import `node:*` modules in tests or `src`. Load text with `import text from '…/file.md?raw'` or `import.meta.glob(…, { query: '?raw', import: 'default', eager: true })`, exactly like the game.
- A: parser, conditions, effects, quotes and lint tests against the fixture and against small inline scripts; `lint:story` lints every real script (profile `canto`) and the fixture (profile `fixture`) and fails on errors.
- B: runner tests with headless presenter / world doubles (record calls, answer choices, fire signals) on the fixture: scheduling (auto, enter, talk, event, after, optional beats, next-scene head, fallback), GOTO diamond, nested IF, choices (requires, spoken, systemic, reveal timings and settings), effects and idempotency, collectible words, colophon and chapter end, save / continue, autoplay, cancellation.
- C and D: keep logic that can be pure (layout maths, text wrapping, input mapping, level layout from a script) in plain functions with tests; Phaser code is covered by `npm run smoke`.
- Definition of done for every team: `npm run typecheck`, `npm test`, `npm run build` and `npm run smoke` all pass with no console errors.

---

## 11. Conventions

- TypeScript strict (`tsconfig.json`: `verbatimModuleSyntax`, so type-only imports use `import type`). Import Phaser as `import * as Phaser from 'phaser'` (the ESM build has no default export), or `import type * as Phaser from 'phaser'` for types.
- English for all in-game text, code, identifiers and comments. Designer prose in scripts stays Turkish and is never shown.
- No network at runtime: fonts come from `@fontsource` (bundled), art is generated, text is bundled.
- Never throw from a Phaser `update` loop or a bus handler; report through `bus.emit('debug:log', { level: 'error', … })` (the bus already catches handler errors). A `console.error` fails the smoke test, so use it only for real errors.
- Wrap every `localStorage` access in try/catch; guard WebAudio and gamepad APIs.
- Constants live in `src/config.ts` (resolution, depths, palettes, fonts, keys, timings, resources); do not hard-code them elsewhere.
- Every ID in code follows bible §4.1; engine-raised flags use the `ch<n>.` and `sys.` prefixes only.
