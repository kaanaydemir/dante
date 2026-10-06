/**
 * The binding Chapter 1 registers of the story bible (docs/script/README.md),
 * as data: §7 scene lists and front-matter values per canto (with what each
 * scene gives), the §3.2 choice inventory with the binding §7 / §2.15 CHOICE
 * blocks, §4.3 cross-canto flags, §4.9 events, §4.6 memories, §4.5 Codex plan
 * and §4.7 system flags.
 *
 * Owner: team A (story-core). Pure data. A SNAPSHOT of the bible taken with
 * `extractBibleRegistry` (src/story/bible.ts) on 2026-10-06; lintCanto uses it
 * in the 'canto' profile (also in the browser, for the debug diagnostics).
 * tests/story/bible.test.ts compares it with the live bible and reports drift;
 * the story-lint test lints against the live bible itself.
 */

import type { ChapterRegistry } from './bible';

export const CHAPTER1_REGISTRY: ChapterRegistry = {
  cantos: {
    inf01: {
      id: 'inf01',
      title: 'The Dark Wood',
      location: 'The Dark Wood',
      lines: '1–136',
      epigraph: 'Inferno I, 1–3',
      closing: 'Inferno I, 136',
      playtime: '8–12',
      mechanics: [
        'move',
        'dash',
        'talk',
        'fear',
        'darkness',
        'look_back',
        'chase',
        'hold_ground',
        'push_back',
        'follow',
      ],
      scenes: [
        {
          id: 'inf01.s0',
          title: 'Opening page',
          lines: '1–3',
          modes: ['page'],
          gives: [],
        },
        {
          id: 'inf01.s1',
          title: 'The Forest Dark',
          lines: '4–12',
          modes: ['play'],
          gives: ['word:Fear', 'word:Way', 'unlock:words', 'codex:inf01.dark_wood'],
        },
        {
          id: 'inf01.s2',
          title: 'The Hill at Dawn',
          lines: '13–30',
          modes: ['play'],
          gives: [],
        },
        {
          id: 'inf01.s3',
          title: 'The Panther',
          lines: '31–43',
          modes: ['play'],
          gives: ['word:Hope', 'codex:inf01.panther', 'inf01.c1'],
        },
        {
          id: 'inf01.s4',
          title: 'The Lion',
          lines: '44–48',
          modes: ['play'],
          gives: ['codex:inf01.lion', 'inf01.c2'],
        },
        {
          id: 'inf01.s5',
          title: 'The She-wolf',
          lines: '49–60',
          modes: ['play'],
          gives: ['codex:inf01.she_wolf', 'inf01.c3'],
        },
        {
          id: 'inf01.s6',
          title: 'The Shade in the Silence',
          lines: '61–90',
          modes: ['dialogue'],
          gives: ['word:Love', 'codex:inf01.virgil'],
        },
        {
          id: 'inf01.s7',
          title: 'Another Road',
          lines: '91–129',
          modes: ['dialogue'],
          gives: ['codex:inf01.greyhound'],
        },
        {
          id: 'inf01.s8',
          title: 'The Motive',
          lines: '130–136',
          modes: ['dialogue', 'play'],
          gives: ['inf01.c4'],
        },
        {
          id: 'inf01.s9',
          title: 'Colophon',
          lines: '136',
          modes: ['colophon'],
          gives: ['unlock:book'],
        },
      ],
      anchors: [{ first: 1, last: 3 }, { first: 4, last: 6 }, { first: 10, last: 12 }, { first: 41, last: 41 }, { first: 58, last: 60 }, { first: 65, last: 66 }, { first: 67, last: 67 }, { first: 83, last: 83 }, { first: 85, last: 87 }, { first: 91, last: 91 }, { first: 136, last: 136 }],
    },
    inf02: {
      id: 'inf02',
      title: 'The Evening of Doubt',
      location: 'The Dark Hillside',
      lines: '1–142',
      epigraph: 'Inferno II, 7–9',
      closing: 'Inferno II, 142',
      playtime: '6–9',
      mechanics: ['talk', 'read_pages', 'compose', 'verse', 'follow'],
      scenes: [
        {
          id: 'inf02.s0',
          title: 'Opening page',
          lines: '7–9',
          modes: ['page'],
          gives: [],
        },
        {
          id: 'inf02.s1',
          title: 'Evening on the Hillside',
          lines: '1–6',
          modes: ['cinematic'],
          gives: [],
        },
        {
          id: 'inf02.s2',
          title: 'The Doubt',
          lines: '10–42',
          modes: ['dialogue'],
          gives: ['codex:inf02.aeneas_paul', 'inf02.c1'],
        },
        {
          id: 'inf02.s3',
          title: 'The Rebuke',
          lines: '43–51',
          modes: ['dialogue'],
          gives: [],
        },
        {
          id: 'inf02.s4',
          title: 'Why Virgil Came',
          lines: '52–126',
          modes: ['page'],
          gives: [
            'word:Go',
            'word:Away',
            'codex:inf02.beatrice',
            'codex:inf02.lucia',
            'codex:inf02.gentle_lady',
            'codex:inf02.rachel',
          ],
        },
        {
          id: 'inf02.s5',
          title: 'Courage',
          lines: '127–140',
          modes: ['dialogue'],
          gives: ['inf02.c2'],
        },
        {
          id: 'inf02.s6',
          title: 'The First Verse',
          lines: '—',
          modes: ['play'],
          gives: ['unlock:compose', 'unlock:verse', 'codex:inf02.terza_rima'],
        },
        {
          id: 'inf02.s7',
          title: 'The Deep and Savage Way',
          lines: '141–142',
          modes: ['cinematic'],
          gives: [],
        },
        {
          id: 'inf02.s8',
          title: 'Colophon',
          lines: '142',
          modes: ['colophon'],
          gives: [],
        },
      ],
      anchors: [{ first: 7, last: 9 }, { first: 45, last: 45 }, { first: 70, last: 72 }, { first: 88, last: 90 }, { first: 116, last: 116 }, { first: 139, last: 140 }, { first: 142, last: 142 }],
    },
    inf03: {
      id: 'inf03',
      title: 'The Gate',
      location: 'Ante-Inferno',
      lines: '1–136',
      epigraph: 'Inferno III, 1–3',
      closing: 'Inferno III, 136',
      playtime: '8–12',
      mechanics: [
        'inscription',
        'fear',
        'darkness',
        'heart',
        'crowd_flow',
        'swarm',
        'hold_ground',
        'guardian',
        'quake',
        'faint',
      ],
      scenes: [
        {
          id: 'inf03.s0',
          title: 'Opening page',
          lines: '1–3',
          modes: ['page'],
          gives: [],
        },
        {
          id: 'inf03.s1',
          title: 'The Gate',
          lines: '4–21',
          modes: ['cinematic', 'dialogue'],
          gives: ['codex:inf03.gate', 'inf03.c1'],
        },
        {
          id: 'inf03.s2',
          title: 'The Air Without a Star',
          lines: '22–51',
          modes: ['dialogue'],
          gives: ['codex:inf03.contrapasso', 'codex:inf03.neutrals', 'unlock:heart', 'inf03.c2'],
        },
        {
          id: 'inf03.s3',
          title: 'The Banner',
          lines: '53–69',
          modes: ['play'],
          gives: ['codex:inf03.great_refusal'],
        },
        {
          id: 'inf03.s4',
          title: 'The Shore',
          lines: '70–81',
          modes: ['play', 'dialogue'],
          gives: ['word:Stay', 'codex:inf03.acheron'],
        },
        {
          id: 'inf03.s5',
          title: 'Charon',
          lines: '82–99',
          modes: ['cinematic', 'play'],
          gives: ['codex:inf03.charon', 'inf03.c3'],
        },
        {
          id: 'inf03.s6',
          title: 'The Leaves',
          lines: '100–129',
          modes: ['play'],
          gives: ['word:Desire'],
        },
        {
          id: 'inf03.s7',
          title: 'The Quake',
          lines: '130–135',
          modes: ['cinematic'],
          gives: [],
        },
        {
          id: 'inf03.s8',
          title: 'Colophon',
          lines: '136',
          modes: ['colophon'],
          gives: [],
        },
      ],
      anchors: [{ first: 1, last: 9 }, { first: 14, last: 15 }, { first: 49, last: 51 }, { first: 58, last: 60 }, { first: 77, last: 77 }, { first: 94, last: 96 }, { first: 112, last: 114 }, { first: 126, last: 126 }, { first: 136, last: 136 }],
    },
    inf04: {
      id: 'inf04',
      title: 'Limbo',
      location: 'Limbo',
      lines: '1–151',
      epigraph: 'Inferno IV, 1–3',
      closing: 'Inferno IV, 151',
      playtime: '10–14',
      mechanics: ['hub', 'talk', 'darkness', 'heart', 'remembrance', 'chain', 'walk_on_water'],
      scenes: [
        {
          id: 'inf04.s0',
          title: 'Opening page',
          lines: '1–3',
          modes: ['page'],
          gives: [],
        },
        {
          id: 'inf04.s1',
          title: 'The Brink',
          lines: '4–24',
          modes: ['cinematic', 'dialogue'],
          gives: [],
        },
        {
          id: 'inf04.s2',
          title: 'Sighs',
          lines: '25–63',
          modes: ['dialogue'],
          gives: ['codex:inf04.limbo', 'codex:inf04.harrowing', 'codex:inf04.virgil_limbo', 'inf04.c1'],
        },
        {
          id: 'inf04.s3',
          title: 'The Forest of Ghosts',
          lines: '64–78',
          modes: ['play'],
          gives: ['word:Fire', 'unlock:remembrance'],
        },
        {
          id: 'inf04.s4',
          title: 'The Four Poets',
          lines: '79–102',
          modes: ['cinematic', 'dialogue'],
          gives: [
            'codex:inf04.homer',
            'codex:inf04.horace',
            'codex:inf04.ovid',
            'codex:inf04.lucan',
            'inf04.c2',
            'unlock:chain',
          ],
        },
        {
          id: 'inf04.s5',
          title: 'Silence on the Way',
          lines: '103–105',
          modes: ['play'],
          gives: ['word:Light'],
        },
        {
          id: 'inf04.s6',
          title: 'The Noble Castle',
          lines: '106–117',
          modes: ['play'],
          gives: ['word:Wall', 'unlock:codex', 'gracemax+1', 'codex:inf04.noble_castle'],
        },
        {
          id: 'inf04.s7',
          title: 'The Great Spirits',
          lines: '118–147',
          modes: ['play'],
          gives: [
            'codex:inf04.heroes',
            'codex:inf04.thinkers',
            'codex:inf04.aristotle',
            'codex:inf04.socrates',
            'codex:inf04.plato',
            'codex:inf04.avicenna',
            'codex:inf04.averroes',
            'codex:inf04.saladin',
          ],
        },
        {
          id: 'inf04.s8',
          title: 'Where Nothing Shines',
          lines: '148–150',
          modes: ['cinematic'],
          gives: [],
        },
        {
          id: 'inf04.s9',
          title: 'Colophon',
          lines: '151',
          modes: ['colophon'],
          gives: [],
        },
      ],
      anchors: [{ first: 1, last: 3 }, { first: 21, last: 21 }, { first: 39, last: 39 }, { first: 42, last: 42 }, { first: 68, last: 68 }, { first: 76, last: 78 }, { first: 80, last: 81 }, { first: 103, last: 103 }, { first: 104, last: 104 }, { first: 107, last: 107 }, { first: 109, last: 109 }, { first: 114, last: 114 }, { first: 151, last: 151 }],
    },
    inf05: {
      id: 'inf05',
      title: 'The Infernal Hurricane',
      location: 'The Second Circle',
      lines: '1–142',
      epigraph: 'Inferno V, 31–33',
      closing: 'Inferno V, 142',
      playtime: '12–16',
      mechanics: [
        'guardian',
        'judgement_game',
        'fear',
        'darkness',
        'wind_field',
        'shelter',
        'wind_lull',
        'talk',
        'heart',
        'faint',
      ],
      scenes: [
        {
          id: 'inf05.s0',
          title: 'Opening page',
          lines: '31–33',
          modes: ['page'],
          gives: [],
        },
        {
          id: 'inf05.s1',
          title: 'The Descent',
          lines: '1–3',
          modes: ['cinematic'],
          gives: [],
        },
        {
          id: 'inf05.s2',
          title: 'Minos',
          lines: '4–24',
          modes: ['cinematic', 'play', 'dialogue'],
          gives: ['codex:inf05.minos', 'codex:inf05.order_of_hell', 'inf05.c1', 'inf05.c2'],
        },
        {
          id: 'inf05.s3',
          title: 'The Hurricane',
          lines: '25–51',
          modes: ['play'],
          gives: ['codex:inf05.second_circle'],
        },
        {
          id: 'inf05.s4',
          title: 'The Shades of Love',
          lines: '52–72',
          modes: ['play'],
          gives: [
            'codex:inf05.semiramis',
            'codex:inf05.dido',
            'codex:inf05.cleopatra',
            'codex:inf05.helen',
            'codex:inf05.achilles',
            'codex:inf05.paris',
            'codex:inf05.tristan',
          ],
        },
        {
          id: 'inf05.s5',
          title: 'The Two Who Go Together',
          lines: '73–96',
          modes: ['dialogue'],
          gives: ['word:Peace', 'codex:inf05.francesca', 'codex:inf05.paolo'],
        },
        {
          id: 'inf05.s6',
          title: 'Francesca',
          lines: '97–138',
          modes: ['dialogue'],
          gives: ['codex:inf05.galeotto', 'inf05.c3', 'inf05.c4'],
        },
        {
          id: 'inf05.s7',
          title: 'As a Dead Body Falls',
          lines: '139–141',
          modes: ['cinematic'],
          gives: [],
        },
        {
          id: 'inf05.s8',
          title: 'Colophon',
          lines: '142',
          modes: ['colophon'],
          gives: ['word:Pity'],
        },
      ],
      anchors: [{ first: 4, last: 6 }, { first: 19, last: 20 }, { first: 21, last: 24 }, { first: 31, last: 33 }, { first: 72, last: 72 }, { first: 92, last: 92 }, { first: 100, last: 107 }, { first: 111, last: 111 }, { first: 121, last: 123 }, { first: 137, last: 138 }, { first: 142, last: 142 }],
    },
  },
  choices: {
    'inf01.c1': {
      id: 'inf01.c1',
      canto: 'inf01',
      scene: 'inf01.s3',
      systemic: true,
      weight: 'minor',
      block: `CHOICE inf01.c1 minor systemic "The panther"
OPTION a [Waited for the dawn] when: event:inf01.waited_dawn
EFFECTS: virtue:temperance+1
OPTION b [Slipped past her] when: else
END CHOICE`,
    },
    'inf01.c2': {
      id: 'inf01.c2',
      canto: 'inf01',
      scene: 'inf01.s4',
      systemic: true,
      weight: 'minor',
      block: `CHOICE inf01.c2 minor systemic "The lion"
OPTION a [Held his ground] when: event:inf01.held_ground
EFFECTS: virtue:fortitude+1
OPTION b [Ran from the roar] when: else
EFFECTS: resolve-1
END CHOICE`,
    },
    'inf01.c3': {
      id: 'inf01.c3',
      canto: 'inf01',
      scene: 'inf01.s5',
      systemic: true,
      weight: 'minor',
      block: `CHOICE inf01.c3 minor systemic "The she-wolf"
OPTION a [Turned to the stranger] when: event:inf01.turned_to_guide
EFFECTS: virtue:prudence+1
OPTION b [Climbed until thrown down] when: else
END CHOICE`,
    },
    'inf01.c4': {
      id: 'inf01.c4',
      canto: 'inf01',
      scene: 'inf01.s8',
      systemic: false,
      weight: 'major',
      block: `CHOICE inf01.c4 major "Why Dante goes"
PROMPT: The long road lay before him. He had to say what he wanted from it.
OPTION a ["Lead me out of this misery."]
EFFECTS: virtue:prudence+1, flag:inf01.motive_escape
OPTION b ["Lead me to Saint Peter's gate."]
EFFECTS: trust+1, flag:inf01.motive_gate
OPTION c ["Show me the ones you spoke of."]
EFFECTS: grace+1, flag:inf01.motive_souls
REVEAL canon=all timing=immediate
QUOTE DANTE (Inferno I, 130–135)
> And I to him: "Poet, I thee entreat,
> By that same God whom thou didst never know,
> So that I may escape this woe and worse,
> Thou wouldst conduct me there where thou hast said,
> That I may see the portal of Saint Peter,
> And those thou makest so disconsolate."
NOTE: He asked for all three: to escape, to see Saint Peter's gate, and to see the lost.
END CHOICE`,
    },
    'inf02.c1': {
      id: 'inf02.c1',
      canto: 'inf02',
      scene: 'inf02.s2',
      systemic: false,
      weight: 'minor',
      block: `CHOICE inf02.c1 minor "How Dante doubts"
PROMPT: Night was coming, and doubt came with it.
OPTION a ["I am no Aeneas. I am no Paul."]
EFFECTS: virtue:temperance+1
OPTION b ["Who allows this? On whose word?"]
EFFECTS: virtue:prudence+1
OPTION c ["I am a poet. Is that not enough?"]
EFFECTS: flag:inf02.doubt_proud
REVEAL canon=a,b timing=immediate
QUOTE DANTE (Inferno II, 31–33)
> But I, why thither come, or who concedes it?
> I not Aeneas am, I am not Paul,
> Nor I, nor others, think me worthy of it.
NOTE: He asked who allowed it, and said he was neither Aeneas nor Paul. He did not feel worthy.
END CHOICE`,
    },
    'inf02.c2': {
      id: 'inf02.c2',
      canto: 'inf02',
      scene: 'inf02.s5',
      systemic: false,
      weight: 'major',
      block: `CHOICE inf02.c2 major "What gives Dante courage"
PROMPT: Three ladies of Heaven cared for him, and his guide had come at once.
OPTION a [Think of her tears.]
EFFECTS: grace+1, flag:inf02.courage_beatrice
OPTION b [Believe the one who came.]
EFFECTS: trust+1, flag:inf02.courage_virgil
OPTION c [Think of the three ladies.]
EFFECTS: virtue:fortitude+1, flag:inf02.courage_ladies
REVEAL canon=a,b timing=immediate
QUOTE DANTE (Inferno II, 133–135)
> "O she compassionate, who succoured me,
> And courteous thou, who hast obeyed so soon
> The words of truth which she addressed to thee!
NOTE: He thanked them both: Beatrice for her pity, and Virgil for coming so soon.
END CHOICE`,
    },
    'inf03.c1': {
      id: 'inf03.c1',
      canto: 'inf03',
      scene: 'inf03.s1',
      systemic: false,
      weight: 'major',
      block: `CHOICE inf03.c1 major "What Dante leaves at the gate"
PROMPT: The gate asked for one thing. His guide asked for another.
OPTION a [Leave your fear at the gate.]
DANTE: Then my fear stays here. I keep the rest.
EFFECTS: shed:Fear, virtue:fortitude+1, trust+1
OPTION b [Leave your hope at the gate.]
DANTE (afraid): The words are cut in stone. I can't argue with stone.
VIRGIL (sad): Then leave it, if you must. But walk with me.
EFFECTS: seal:Hope, flag:inf03.left_hope
REVEAL canon=a timing=immediate
QUOTE DANTE (Inferno III, 12)
> …"Their sense is, Master, hard to me!"
NOTE: Dante did not give up his hope. He told Virgil the words were hard, and Virgil told him to leave his fear there.
END CHOICE`,
    },
    'inf03.c2': {
      id: 'inf03.c2',
      canto: 'inf03',
      scene: 'inf03.s2',
      systemic: false,
      weight: 'minor',
      block: `CHOICE inf03.c2 minor "The runners"
PROMPT: Virgil had told him to look, and to walk on.
OPTION a [Look, and walk on.]
EFFECTS: trust+1
OPTION b [Stop one of them. Ask his name.]
DO: Dante koşan bir ruha yetişir. Ruh durmaz, yüzünü çevirmez, cevap vermez. Eşek arıları sokar. Terazi titrer ve boş kalır; Kitap'ta boş bir anı kartı belirip söner.
EFFECTS: trust-1, resolve-1, flag:inf03.asked_neutral
REVEAL canon=a timing=immediate
QUOTE POET (Inferno III, 52)
> And I, who looked again, beheld a banner,
NOTE: Dante said nothing to them. He looked, as Virgil told him, and saw the banner.
END CHOICE`,
    },
    'inf03.c3': {
      id: 'inf03.c3',
      canto: 'inf03',
      scene: 'inf03.s5',
      systemic: true,
      weight: 'minor',
      block: `CHOICE inf03.c3 minor systemic "Before Charon"
OPTION a [Did not withdraw] when: event:inf03.held_before_charon
EFFECTS: virtue:fortitude+1
OPTION b [Stepped back] when: else
REVEAL canon=a timing=immediate
QUOTE POET (Inferno III, 90)
> But when he saw that I did not withdraw,
NOTE: Dante stood his ground. Charon refused him all the same, until Virgil spoke.
END CHOICE`,
    },
    'inf04.c1': {
      id: 'inf04.c1',
      canto: 'inf04',
      scene: 'inf04.s2',
      systemic: false,
      weight: 'major',
      block: `CHOICE inf04.c1 major "Virgil's own place"
PROMPT: Virgil had said it plainly. He was one of them.
OPTION a [Grieve with him.]
DANTE (weeping): You too, Master. All this time, you too.
EFFECTS: pity+2@limbo
OPTION b [Accept the law of Heaven.]
DANTE (quiet): Heaven's law is just. Even here. Even for you.
EFFECTS: justice+2@limbo
OPTION c [Say nothing yet. Ask your question.]
EFFECTS: virtue:prudence+1
REVEAL canon=a timing=immediate
QUOTE POET (Inferno IV, 43–45)
> Great grief seized on my heart when this I heard,
> Because some people of much worthiness
> I knew, who in that Limbo were suspended.
NOTE: Dante grieved. Then he asked, carefully, whether anyone had ever left this place.
END CHOICE`,
    },
    'inf04.c2': {
      id: 'inf04.c2',
      canto: 'inf04',
      scene: 'inf04.s4',
      systemic: false,
      weight: 'minor',
      block: `CHOICE inf04.c2 minor "The sixth poet"
PROMPT: The four poets welcomed him into their company.
OPTION a [Accept the honour gladly.]
EFFECTS: flag:inf04.sixth_proud
OPTION b [Bow your head and say nothing.]
EFFECTS: virtue:temperance+1
OPTION c [Give the honour to Virgil.]
DANTE: It is his honour. I only walk behind him.
EFFECTS: virtue:justice+1, trust+1
REVEAL canon=a timing=immediate
QUOTE POET (Inferno IV, 100–102)
> And more of honour still, much more, they did me,
> In that they made me one of their own band;
> So that the sixth was I, 'mid so much wit.
NOTE: He accepted, and wrote it down with plain pride. Later, on the mountain of Purgatory, he would feel that pride weigh on him.
END CHOICE`,
    },
    'inf05.c1': {
      id: 'inf05.c1',
      canto: 'inf05',
      scene: 'inf05.s2',
      systemic: true,
      weight: 'minor',
      block: `CHOICE inf05.c1 minor systemic "Minos's court"
OPTION a [Judged as Minos judged] when: event:inf05.minos_two_right
EFFECTS: virtue:justice+1
OPTION b [Watched and learned] when: else
END CHOICE`,
    },
    'inf05.c2': {
      id: 'inf05.c2',
      canto: 'inf05',
      scene: 'inf05.s2',
      systemic: false,
      weight: 'minor',
      block: `CHOICE inf05.c2 minor "Minos's warning"
PROMPT: Minos had stopped judging. He was looking at Dante.
OPTION a [Look to Virgil.]
EFFECTS: trust+1
OPTION b [Answer Minos yourself.]
DANTE (firm): I did not come here to be judged by you.
EFFECTS: virtue:fortitude+1
REVEAL canon=a timing=immediate
QUOTE POET (Inferno V, 21)
> And unto him my Guide:…
NOTE: Dante did not answer. His guide answered for him.
END CHOICE`,
    },
    'inf05.c3': {
      id: 'inf05.c3',
      canto: 'inf05',
      scene: 'inf05.s6',
      systemic: false,
      weight: 'minor',
      block: `CHOICE inf05.c3 minor "Virgil's question"
PROMPT: Dante kept his head bowed until Virgil asked what he was thinking.
OPTION a [Grieve for them.]
DANTE (weeping): So much sweetness. So much longing. And this is where it led them.
EFFECTS: pity+1@lust
OPTION b [Name what brought them here.]
DANTE (quiet): They let desire rule them. This is the end of that road.
EFFECTS: justice+1@lust
REVEAL canon=a timing=deferred
QUOTE DANTE (Inferno V, 112–114)
> …"Alas!
> How many pleasant thoughts, how much desire,
> Conducted these unto the dolorous pass!"
NOTE: He answered with a sigh, not a verdict.
END CHOICE`,
    },
    'inf05.c4': {
      id: 'inf05.c4',
      canto: 'inf05',
      scene: 'inf05.s6',
      systemic: false,
      weight: 'centre',
      block: `CHOICE inf05.c4 centre "The verdict"
PROMPT: The tale was over. Beside her, the other shade was weeping.
OPTION a [Weep with them.]
DO: Dante konuşamaz; başını eğer ve ağlar. Rüzgâr hâlâ susmaktadır.
EFFECTS: pity+3@lust, memory:inf05.paolo_francesca, flag:inf05.verdict_pity
OPTION b [Turn away from them.]
DANTE (stern): Love was the reason. It is not the excuse.
EFFECTS: justice+3@lust, word:Judgment, flag:inf05.verdict_justice
REVEAL canon=a timing=deferred
QUOTE POET (Inferno V, 139–141)
> And all the while one spirit uttered this,
> The other one did weep so, that, for pity,
> I swooned away as if I had been dying,
NOTE: Dante did not judge them aloud. He fainted for pity.
END CHOICE`,
    },
  },
  flags: {
    'inf01.motive_escape': {
      id: 'inf01.motive_escape',
      setBy: 'inf01.c4=a',
      readers: ['inf04.s1'],
    },
    'inf01.motive_gate': {
      id: 'inf01.motive_gate',
      setBy: 'inf01.c4=b',
      readers: ['inf03.s1'],
    },
    'inf01.motive_souls': {
      id: 'inf01.motive_souls',
      setBy: 'inf01.c4=c',
      readers: ['inf03.s2', 'inf05.s5'],
    },
    'inf02.doubt_proud': {
      id: 'inf02.doubt_proud',
      setBy: 'inf02.c1=c',
      readers: ['inf04.s4'],
    },
    'inf02.courage_beatrice': {
      id: 'inf02.courage_beatrice',
      setBy: 'inf02.c2=a',
      readers: ['inf04.s6', 'inf04.s7', 'inf05.s6'],
    },
    'inf02.courage_virgil': {
      id: 'inf02.courage_virgil',
      setBy: 'inf02.c2=b',
      readers: ['inf04.s6', 'inf04.s7'],
    },
    'inf02.courage_ladies': {
      id: 'inf02.courage_ladies',
      setBy: 'inf02.c2=c',
      readers: ['inf04.s6', 'inf04.s7'],
    },
    'inf03.left_hope': {
      id: 'inf03.left_hope',
      setBy: 'inf03.c1=b',
      readers: ['inf03.s1', 'inf04.s2', 'inf04.s6', 'inf04.s7'],
    },
    'inf03.asked_neutral': {
      id: 'inf03.asked_neutral',
      setBy: 'inf03.c2=b',
      readers: [],
    },
    'inf04.hope_returned': {
      id: 'inf04.hope_returned',
      setBy: 'IV s2 (koşullu)',
      readers: [],
    },
    'inf04.sixth_proud': {
      id: 'inf04.sixth_proud',
      setBy: 'inf04.c2=a',
      readers: [],
    },
    'inf05.verdict_pity': {
      id: 'inf05.verdict_pity',
      setBy: 'inf05.c4=a',
      readers: [],
    },
    'inf05.verdict_justice': {
      id: 'inf05.verdict_justice',
      setBy: 'inf05.c4=b',
      readers: [],
    },
  },
  events: [
    'inf01.waited_dawn',
    'inf01.held_ground',
    'inf01.turned_to_guide',
    'inf03.held_before_charon',
    'inf05.minos_two_right',
  ],
  memories: [
    {
      id: 'inf05.paolo_francesca',
      kind: 'kept',
      setBy: 'inf05.c4=a',
    },
  ],
  codexPlan: {
    inf01: ['inf01.dark_wood', 'inf01.panther', 'inf01.lion', 'inf01.she_wolf', 'inf01.virgil', 'inf01.greyhound'],
    inf02: [
      'inf02.aeneas_paul',
      'inf02.terza_rima',
      'inf02.beatrice',
      'inf02.lucia',
      'inf02.gentle_lady',
      'inf02.rachel',
    ],
    inf03: [
      'inf03.gate',
      'inf03.acheron',
      'inf03.contrapasso',
      'inf03.neutrals',
      'inf03.great_refusal',
      'inf03.charon',
    ],
    inf04: [
      'inf04.limbo',
      'inf04.noble_castle',
      'inf04.harrowing',
      'inf04.virgil_limbo',
      'inf04.homer',
      'inf04.horace',
      'inf04.ovid',
      'inf04.lucan',
      'inf04.heroes',
      'inf04.thinkers',
      'inf04.aristotle',
      'inf04.socrates',
      'inf04.plato',
      'inf04.avicenna',
      'inf04.averroes',
      'inf04.saladin',
    ],
    inf05: [
      'inf05.second_circle',
      'inf05.order_of_hell',
      'inf05.galeotto',
      'inf05.minos',
      'inf05.semiramis',
      'inf05.dido',
      'inf05.cleopatra',
      'inf05.helen',
      'inf05.achilles',
      'inf05.paris',
      'inf05.tristan',
      'inf05.francesca',
      'inf05.paolo',
    ],
  },
  systemFlags: ['ch1.heart_tender', 'ch1.heart_stern', 'ch1.heart_even', 'ch1.trust_faithful', 'ch1.trust_wayward'],
};
