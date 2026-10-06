---
id: inf99
canticle: Inferno
canto: 99
title: "The Test Wood"
title_tr: "Deneme Ormanı"
location: "The Test Wood"
source: docs/source/inferno/canto-01.txt
lines: "1–136"
epigraph: "Inferno I, 1–3"
closing: "Inferno I, 136"
characters: [DANTE, VIRGIL, PANTHER, SHADE]
mechanics: [move, dash, talk, follow, fear, darkness, look_back, heart, compose, verse, chain, remembrance]
choices: [inf99.c1, inf99.c2, inf99.c3, inf99.c4]
words: [Fear, Way, Hope, Love]
memories: [inf99.virgil_mantua]
codex: [inf99.dark_wood, inf99.panther, inf99.virgil]
flags_set: [inf99.motive_escape, inf99.motive_gate, inf99.motive_souls, inf99.hope_put_away]
flags_read: [inf01.motive_gate]
unlocks: [words, codex, heart, remembrance, compose, verse, chain, book]
playtime: "4–6"
writer: "Architect (engine fixture)"
status: draft
version: "0.1"
---

# Inferno XCIX — The Test Wood

Bu dosya bir **test fikstürüdür**, gerçek bir kanto değildir. Kimlik öneki `inf99` motor testleri için ayrılmıştır (`FIXTURE_CANTO_ID`, src/story/types.ts); gerçek içerik bu öneki asla kullanmaz. Dosya senaryo biçiminin (docs/script/README.md §2) her satır türünü, iki düzey iç içe IF'i, her seçim türünü, her etki token'ını, GOTO'yu ve toplanabilir sözleri kullanır. Bütün alıntılar `docs/source/inferno/canto-01.txt` dosyasından harfi harfine kopyalanmıştır. Lint bu dosyayı `fixture` profiliyle denetler.

Aşağıdaki `text` çiti ayrıştırıcı tarafından yok sayılmalıdır; içindeki satırlar oyunda asla görünmez.

```text
NARRATION: This line belongs to a text fence and must never be played.
CHOICE inf99.c9 minor "Ignored"
```

## [inf99.s0] Opening page

### [inf99.s0.b1] Title and epigraph

```script
@mode: page
QUOTE POET (Inferno I, 1–3)
> Midway upon the journey of our life
> I found myself within a forest dark,
> For the straightforward pathway had been lost.
```

## [inf99.s1] The Forest Dark

Orman: hareket öğreticisi, ilk iki söz (Fear kendiliğinden yapışır, Way toplanır), isteğe bağlı geriye bakış ve bir kontrol noktası.

### [inf99.s1.b1] Into the wood

```script
@mode: play
@place: inf99_wood
@music: alçak, tek notalı bir drone; çok seyrek
@ambience: rüzgârsız orman, uzakta kırılan dallar
// Açılış sayfasındaki gravür renge döner.
CAM: unengrave — epigraf sayfasındaki ağaçlar oynanabilir ormana dönüşür
NARRATION: Dante could not say how he had come into the wood. The path behind him was gone.
DO: Oyuncu doğuya yürür; ağaçlar sıklaştıkça görüş daralır. {tutorial:move}
HINT: Walk east, toward the grey light between the trees.
HINT-SHORT: East, toward the light.
QUOTE POET (Inferno I, 4–6)
> Ah me! how hard a thing it is to say
> What was this forest savage, rough, and stern,
> Which in the very thought renews the fear.
EFFECTS: word:Fear
SFX: kuru yaprak hışırtısı, Dante'nin hızlanan nefesi
```

### [inf99.s1.b2] The true way

```script
@mode: play
@trigger: enter:inf99_clearing
QUOTE POET (Inferno I, 10–12)
> I cannot well repeat how there I entered,
> So full was I of slumber at the moment
> In which I had abandoned the true way.
GLOSS: Dante is remembering. He cannot say how he lost his road; he was half asleep.
EFFECTS: word:Way, unlock:words, codex:inf99.dark_wood
BARK SHADE: —cold here—
DO: Kitap'taki Words sekmesi ilk kez parlar. {tutorial:dash}
```

### [inf99.s1.b3] Looking back

İsteğe bağlı vuruş: oyuncu geriye bakma tuşunu basılı tutarsa oynar. Oyuncu yamaca bakmadan girerse sahne yine biter ve bu vuruş kaçırılmış sayılır.

```script
@mode: play
@trigger: event:inf99.looked_back
EKLEME: Geriye bakma etkileşimi şiirdeki benzetmenin oyunlaştırılmasıdır. | Dayanak: Inferno I, 22–27
QUOTE POET (Inferno I, 25–27)
> So did my soul, that still was fleeing onward,
> Turn itself back to re-behold the pass
> Which never yet a living person left.
NARRATION: He looked back once at the dark pass. Then he turned to the hill.
```

### [inf99.s1.b4] The foot of the hill

```script
@mode: play
@trigger: enter:inf99_slope
@place: inf99_slope
CAM: zoom-out — tepe bütünüyle görünür, omuzları güneşte
QUOTE POET (Inferno I, 28–30)
> After my weary body I had rested,
> The way resumed I on the desert slope,
> So that the firm foot ever was the lower.
DO: Yamacın dibinde düz bir kaya; oyuncu burada dinlenir. {checkpoint}
EFFECTS: resolve+1
```

## [inf99.s2] The Panther

Sistemik ölçüm: oyuncu şafağı bekler mi? Olaylar `DO` etiketleriyle belgelenir; dünya katmanı onları yayar.

### [inf99.s2.b1] Where the ascent began

```script
@mode: play
@trigger: enter:inf99_ascent
@place: inf99_ascent
CAM: zoom-in — pars kayalığın üstünde belirir
QUOTE POET (Inferno I, 31–33)
> And lo! almost where the ascent began,
> A panther light and swift exceedingly,
> Which with a spotted skin was covered o'er!
EFFECTS: codex:inf99.panther
CAM: shake — pars sıçrar, taşlar kayar
DO: Pars yolu keser ve dans eder; Dante yaklaştıkça geri döndürülür. Oyuncu yamaçta sekiz saniye kıpırdamadan beklerse {event:inf99.waited_dawn} yayılır. Şafak ışığı yamaca ulaşınca pars çekilir {event:inf99.panther_gone}.
HINT: Do not rush her. Let the morning come to you.
HINT-SHORT: Wait for the light.
SFX: uzaktan bir kuş, ilk ışıkla birlikte
```

### [inf99.s2.b2] The hour of the morning

```script
@mode: play
@trigger: event:inf99.panther_gone
CAM: pan — ışık yamaçtan aşağı iner
@ambience: kuş sesleri çoğalır
QUOTE POET (Inferno I, 40–42)
> At first in motion set those beauteous things;
> So were to me occasion of good hope,
> The variegated skin of that wild beast,
EFFECTS: word:Hope
CHOICE inf99.c1 minor systemic "The panther"
OPTION a [Waited for the dawn] when: event:inf99.waited_dawn
EFFECTS: virtue:temperance+1
// Sistemik seçimin son seçeneği her zaman `when: else` olur.
OPTION b [Slipped past her] when: else
EFFECTS: resolve-1
REVEAL canon=a timing=immediate
QUOTE POET (Inferno I, 37–38)
> The time was the beginning of the morning,
> And up the sun was mounting with those stars
NOTE: Dante waited. The morning came, and with it a little hope.
END CHOICE
```

## [inf99.s3] The Shade in the Silence

Vergilius belirir. İki düzey iç içe IF, `major` seçim (konuşulan seçenekler, `requires:`, GOTO ile elmas), başka kantodan okunan bir bayrak, `minor` seçim ve ertelenmiş kart.

### [inf99.s3.b1] One who seemed hoarse

```script
@mode: dialogue
@trigger: talk:VIRGIL
@place: inf99_glade
CAM: cut — yamaçtan ağaçlıklı açıklığa
CAM: hold — gölge ağaçların arasından çıkar
QUOTE POET (Inferno I, 61–63)
> While I was rushing downward to the lowland,
> Before mine eyes did one present himself,
> Who seemed from long-continued silence hoarse.
QUOTE DANTE (Inferno I, 65–66)
> "Have pity on me,"…
> "Whiche'er thou art, or shade or real man!"
QUOTE VIRGIL (Inferno I, 67–69)
> …"Not man; man once I was,
> And both my parents were of Lombardy,
> And Mantuans by country both of them.
GLOSS: Lombardy and Mantua are in the north of Italy. The shade was born there, long ago.
EFFECTS: codex:inf99.virgil, unlock:codex
IF seen:inf99.s1.b3
IF trust>=5
VIRGIL (gentle): You looked back at the dark pass. Everyone does, once.
ELSE
VIRGIL (quiet): You looked back. It does not help.
END IF
ELSE IF word:Hope and not sealed:Hope
VIRGIL (gentle): The morning gave you something. Keep it close.
ELSE
VIRGIL: Come away from that slope.
END IF
DANTE (afraid): I know your name. I have read it a hundred times.
```

### [inf99.s3.b2] Another road

```script
@mode: dialogue
@trigger: auto
QUOTE VIRGIL (Inferno I, 91–93)
> "Thee it behoves to take another road,"
> Responded he, when he beheld me weeping,
> "If from this savage place thou wouldst escape;
VIRGIL (quiet): There is a longer way around: it goes down before it goes up.
CHOICE inf99.c2 major "Why Dante goes"
PROMPT: Virgil waited for an answer. What did Dante want from the road?
OPTION a ["Lead me out of this wood."]
EFFECTS: virtue:prudence+1, flag:inf99.motive_escape
GOTO inf99.s3.b4
OPTION b ["Take me to the gate you spoke of."]
VIRGIL (gentle): Then we have a long walk ahead.
EFFECTS: trust+1, flag:inf99.motive_gate
OPTION c ["Show me the lost."] requires: word:Hope or (codex:inf99.panther and not flag:inf99.motive_gate)
EFFECTS: grace+1, flag:inf99.motive_souls
REVEAL canon=all timing=immediate
QUOTE DANTE (Inferno I, 130–135)
> And I to him: "Poet, I thee entreat,
> By that same God whom thou didst never know,
> So that I may escape this woe and worse,
> Thou wouldst conduct me there where thou hast said,
> That I may see the portal of Saint Peter,
> And those thou makest so disconsolate."
NOTE: He asked for all three at once: a way out, Saint Peter's gate, and the lost.
END CHOICE
NARRATION: Virgil turned toward the low ground, where the road began.
```

### [inf99.s3.b3] The gate he wanted

Yalnızca `b` ve `c` yollarında oynar: `a` seçeneği GOTO ile bu vuruşu atlar ve dallar `s3.b4`'te birleşir. Başka kantodan okunan bayrak (`inf01.motive_gate`) M0 profilinde yoktur; o zaman yalnızca bu dosyanın bayrağı sayılır.

```script
@mode: dialogue
IF flag:inf99.motive_gate or flag:inf01.motive_gate
DANTE (firm): The gate first. Whatever lies before it.
ELSE
DANTE (quiet): I want to see them, if you will show me.
END IF
VIRGIL (wry): You will see more than you asked for.
```

### [inf99.s3.b4] The long study

```script
@mode: dialogue
QUOTE DANTE (Inferno I, 82–87)
> "O, of the other poets honour and light,
> Avail me the long study and great love
> That have impelled me to explore thy volume!
> …
> The beautiful style that has done honour to me.
EFFECTS: word:Love, unlock:heart
CHOICE inf99.c3 minor "What Dante asks first"
PROMPT: Dante had a hundred questions for the shade of a poet.
OPTION a ["Where did you live, before all this?"]
DO: Vergilius bir an susar; sonra Mantua'yı anlatır. {event:inf99.asked_home}
VIRGIL (quiet): By a slow river, among my parents' fields. It was long ago.
EFFECTS: pity+1@limbo, memory:inf99.virgil_mantua, unlock:remembrance
OPTION b ["Why are you here, and not in Heaven?"]
VIRGIL (stern): That is a question for the road, not for this hillside.
EFFECTS: justice+1@limbo, virtue:justice+1, trust-1
REVEAL canon=none timing=deferred
QUOTE DANTE (Inferno I, 79–80)
> "Now, art thou that Virgilius and that fountain
> Which spreads abroad so wide a river of speech?"
NOTE: The poem does not say he asked either. It says only that he knew the poet by name.
END CHOICE
```

## [inf99.s4] Another Road

İlk tercet öğreticisi ve son seçim. Ayrıştırıcı aşağıdaki `cento` çitini yok saymalıdır:

```cento
In which I had abandoned the true way. (Inferno I, 12)
Avail me the long study and great love (Inferno I, 83)
Weeping, her shining eyes she turned away; (Inferno II, 116)
```

### [inf99.s4.b1] The page turns

```script
@mode: cinematic
CAM: fade-in
CAM: page-turn — kitap bir sayfa çevirir; ışık değişir
PAGE: The sun stood higher now, and the hill was no nearer. Virgil did not climb. He walked down toward the low ground, and Dante followed a little way behind him.
CAM: follow — kamera Vergilius'u izler
SFX: ayak sesleri, taş üstünde
```

### [inf99.s4.b2] Three words

```script
@mode: play
@trigger: after:inf99.s4.b1
@place: inf99_road
EKLEME: Vergilius'un ilk terceti öğretmesi şiirde yok; motor testleri için. | Dayanak: Inferno I, 112–114
VIRGIL: You carry words now. A verse is made of three of them.
VIRGIL (gentle): The first and the last must answer each other. The middle one is its heart.
DO: Words ekranı A · B · A yuvalarıyla açılır. {tutorial:compose}
EFFECTS: unlock:compose, unlock:verse, unlock:chain, gracemax+1
DO: J ile ilk tercet atılır; yoldaki dal kenara savrulur. {tutorial:verse}
BARK VIRGIL: Keep close.
```

### [inf99.s4.b3] What Dante carries

```script
@mode: dialogue
CHOICE inf99.c4 minor "What Dante carries"
PROMPT: The road went down. Some things were too heavy to carry on it.
OPTION a [Set your fear down here.] requires: word:Fear
EFFECTS: shed:Fear, virtue:fortitude+1
OPTION b [Keep your hope close.]
DANTE (quiet): I will keep it, whatever the road does.
OPTION c [Put your hope away for now.]
EFFECTS: seal:Hope, flag:inf99.hope_put_away, grace-1
REVEAL canon=a,b timing=deferred
QUOTE POET (Inferno I, 19–21)
> Then was the fear a little quieted
> That in my heart's lake had endured throughout
> The night, which I had passed so piteously.
NOTE: His fear grew quiet when he saw the light on the hill, and he did not give up his hope.
END CHOICE
IF sealed:Hope
SAPMA: Vergilius'un mühürlenen umudu hemen geri vermesi şiirde yok. | Gerekçe: Fikstür mühür açmayı sınar. | Dayanak: Inferno I, 41
VIRGIL (gentle): Not yet. You will need it before the night is out.
EFFECTS: word:Hope, trust+1
END IF
CAM: white-out — kısa, soluk bir ışık
CAM: engrave — sahne yeniden gravüre döner
CAM: fade-out — yol karanlığa iner
```

## [inf99.s5] Colophon

### [inf99.s5.b1] Then he moved on

```script
@mode: colophon
@chapter_end: ch1
QUOTE POET (Inferno I, 136)
> Then he moved on, and I behind him followed.
EFFECTS: unlock:book
```

## Codex

```codex
ID: inf99.dark_wood
TAB: places
TITLE: The Test Wood
QUOTE POET (Inferno I, 1–3)
> Midway upon the journey of our life
> I found myself within a forest dark,
> For the straightforward pathway had been lost.
NOTE: A fixture entry. In the poem the dark wood is where Dante finds himself lost in the middle of his life. Readers have long taken it as an image of a life gone astray.
RELATED: inf99.panther, inf99.virgil
```

```codex
ID: inf99.panther
TAB: souls
TITLE: The Panther
QUOTE POET (Inferno I, 32–33)
> A panther light and swift exceedingly,
> Which with a spotted skin was covered o'er!
NOTE: A fixture entry. In the poem a quick, spotted beast blocks the way up the hill. Readers have long seen the panther as the image of a sin, though they disagree about which one.
RELATED: inf99.dark_wood
```

```codex
ID: inf99.virgil
TAB: souls
TITLE: Virgil
QUOTE VIRGIL (Inferno I, 73–75)
> A poet was I, and I sang that just
> Son of Anchises, who came forth from Troy,
> After that Ilion the superb was burned.
NOTE: A fixture entry. Historically, Virgil was a Roman poet who wrote the Aeneid, the story of Aeneas, son of Anchises. In the poem he is Dante's guide through Hell.
RELATED: inf99.dark_wood
```

## Memories

```memory
ID: inf99.virgil_mantua
NAME: Virgil of Mantua
KIND: kept
QUOTE VIRGIL (Inferno I, 68–69)
> And both my parents were of Lombardy,
> And Mantuans by country both of them.
NOTE: A fixture entry. Dante remembered that his guide had once been a man, with parents and a home by a river in the north.
```
