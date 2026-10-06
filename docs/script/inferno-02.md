---
id: inf02
canticle: Inferno
canto: 2
title: "The Evening of Doubt"
title_tr: "Kuşku Akşamı"
location: "The Dark Hillside"
source: docs/source/inferno/canto-02.txt
lines: "1–142"
epigraph: "Inferno II, 7–9"
closing: "Inferno II, 142"
characters: [DANTE, VIRGIL, BEATRICE, LUCIA, VIRGIN, AENEAS]
mechanics: [talk, read_pages, compose, verse, follow]
choices: [inf02.c1, inf02.c2]
words: [Go, Away]
memories: []
codex: [inf02.invocation, inf02.aeneas_paul, inf02.beatrice, inf02.gentle_lady, inf02.lucia, inf02.rachel, inf02.terza_rima]
flags_set: [inf02.doubt_proud, inf02.courage_beatrice, inf02.courage_virgil, inf02.courage_ladies]
flags_read: []
unlocks: [compose, verse]
playtime: "6–9"
writer: "Claude (Kanto II senaristi)"
status: draft
version: "0.1"
---

# Inferno II — The Evening of Doubt

Kanto II, Bölüm 1'in en sessiz kantosudur: düşman yok, tehlike yok, terazi henüz yok. Bütün gerilim Dante'nin içindedir. Akşam olur, bütün canlılar dinlenmeye çekilir, yalnızca Dante yola hazırlanır; sonra kuşku gelir. Vergilius onu korkaklıkla suçlar ve neden geldiğini anlatır: Cennet'teki soylu Hanım, Lucia, Beatrice ve Beatrice'in gözyaşları. Dante'nin cesareti, gecenin soğuğunda kapanan çiçeklerin güneşte açılması gibi geri gelir.

Kanto bir **yürüyüş konuşması** olarak kuruldu. Dante ile Vergilius akşam yamaçtan inerken konuşur; konuşmanın parçaları patikadaki duraklarda (`enter:` tetikleyicileri) açılır, aradaki yürüyüşü oyuncu yapar. Vergilius'un anlatısı ise bir taşın üstünde oturularak, resimli kitap sayfaları olarak okunur. Kitap ilk kez burada gerçekten "resimli kitap" olur.

**Oyuncunun payı**

- Kuşkusunu nasıl söylediği (`inf02.c1`, minor): alçakgönüllülük, sağduyu ya da bir şairin gururu.
- Alacakaranlıktaki gölgelere yürüyüp yürümediği (isteğe bağlı vuruş `inf02.s2.b5`). Sistem etkisi yoktur; Vergilius'un sitemindeki cümleyi değiştirir.
- Ne zaman ayağa kalktığı (`inf02.s5.b1`). Vergilius susar ve bekler; kalkma kararı oyuncunundur.
- Cesaretini neyin geri getirdiği (`inf02.c2`, major): Beatrice'in gözyaşları, Vergilius'un sözü ya da üç Hanım. Seçim bu kantoda görünür yankılar bırakır (s5, s7) ve IV, V ve Araf'ta okunan bir bayrak kaldırır.
- İlk tercet (s6). Oyuncu üç sözü kendisi yerleştirir; kayayı ancak ortasında Love olan tercet yerinden oynatır.

**Seçimler ve izleri**

| Seçim | Seçenek | Etki | Bu kantoda | Sonra |
|---|---|---|---|---|
| `inf02.c1` | a | `virtue:temperance+1` | s3'te Vergilius'un cevabı | — |
| | b | `virtue:prudence+1` | s3'te Vergilius'un cevabı | — |
| | c | `flag:inf02.doubt_proud` | s3'te Vergilius'un cevabı | IV s4; Araf X–XIII |
| `inf02.c2` | a | `grace+1`, `flag:inf02.courage_beatrice` | Çiçeklerde çiy; s7'deki anlatım | IV s6–s7, V s6, Araf XXVII |
| | b | `trust+1`, `flag:inf02.courage_virgil` | Vergilius yaklaşır; s7'de eşikte bekler | IV s6–s7, Araf XXVII |
| | c | `virtue:fortitude+1`, `flag:inf02.courage_ladies` | Geçidin üstünde üç yıldız; s7'deki anlatım | IV s6–s7, Araf IX |

- Kalp yoktur (İncil §3.1: Kanto I–II'de karşılaşılan ruh yok). Bu kantoda hiçbir `pity` ya da `justice` etkisi yazılmadı.
- Güvenin bu kantodaki net değişimi en çok +1'dir (`inf02.c2=b`).
- Okunan sayaçlar: `virtue:temperance` (s1; parsın önünde şafağı bekleyen oyuncu) ve `virtue:fortitude` (s3; aslanın önünde kıpırdamayan oyuncu). Bu noktada iki sayaç da yalnızca Kanto I'den gelebilir. Başka kantonun bayrağı okunmaz: §4.3'te Kanto II hiçbir bayrağın okuyucusu değildir.
- Sözler: Go (II 70) ve Away (II 116). İkisi de s4'ün resimli sayfalarında, dizede parlar ve E ile alınır. Söz toplama burada öğretilir (`{tutorial:read}`, s4.b4).
- Kilitler: `unlock:compose`, `unlock:verse` (s6).
- Codex: İncil §4.5'teki altı kayıt ve bir ek kayıt (`inf02.invocation`, Musalara yakarış). Hepsi Codex Kanto IV'te açılana kadar sessizce birikir.

**Programcı için: yerler ve olaylar**

| Yer (`@place` / `enter:`) | Ne |
|---|---|
| `inf02_hillside` | Kanto I'in bittiği yamaç; akşam |
| `inf02_overlook` | Patikanın ilk çıkıntısı; Dante burada durur ve konuşmaya başlar |
| `inf02_switchback` | Patikanın dönemeci; Aeneas ve Pavlus, `inf02.c1` |
| `inf02_dusk_path` | Alacakaranlık patikası; gölgeler ve isteksiz yürüyüş |
| `inf02_bench` | Patikanın kenarındaki yassı taş (kontrol noktası); anlatı ve cesaret |
| `inf02_fallen_stone` | Geçidin ağzını kapatan kaya; ilk tercet |
| `inf02_gorge` | Geçidin içi, "the deep and savage way" |

| Olay | Ne zaman yayılır |
|---|---|
| `inf02.shadow_faced` | Oyuncu hayvan biçimli gölgelerden birine iyice yaklaştığında; gölge çözülür |
| `inf02.dante_halts` | Dante patikada durduğunda. Üç gölge de göründükten sonra: oyuncu iki saniye kıpırdamazsa, yokuş yukarı dönerse ya da Vergilius'la arası on iki karoyu aşarsa. Yürüyüşün başından en geç yirmi saniye sonra |
| `inf02.dante_rises` | Oturan Dante'yi oyuncu ayağa kaldırdığında (herhangi bir hareket tuşu ya da E) |
| `inf02.stone_moved` | Ortasında Love olan (Force) bir tercet kayaya değdiğinde |

**Sessizlikler.** Vergilius iki yerde bilerek susar: isteksiz yürüyüşte (s2.b4) ve Dante'nin ayağa kalkmasını beklerken (s5.b1). Bu vuruşlarda `HINT` yoktur; Q'ya basan oyuncu cevap alamaz. Vergilius'un II 43–126 arasındaki konuşması şiirde kesintisizdir. Dante o sürede tek söz söylemez, oyunda da söylemez; tepkileri yalnızca sayfanın kenarındaki portresinde görünür.

**Süre.** Yaklaşık 110 dize, otuza yakın modern satır, üç kısa yürüyüş ve bir tercet bulmacası: 6–9 dakika.

Sapma ve eklemelerin listesi dosyanın sonundadır.

## [inf02.s0] Opening page

Epigraf Musalara, yüksek dehaya ve belleğe yakarıştır (II 7–9). Bellek burada "gördüklerini yazmış olan" şeydir; bu çağrı oynanabilir kitabın kendisine yapılmış gibi okunmalı. Okurlar Kanto I'i bütün Komedya'nın girişi sayar; Cehennem'in kendi otuz üç kantosu bu yakarışla başlar. Vinyet (96×64, Doré tarzı): alacakaranlıkta bir yamaç; Vergilius önde, Dante bir adım geride ve duraksamış; gökte ilk yıldız.

### [inf02.s0.b1] Title and epigraph

```script
@mode: page
QUOTE POET (Inferno II, 7–9)
> O Muses, O high genius, now assist me!
> O memory, that didst write down what I saw,
> Here thy nobility shall be manifest!
GLOSS: Dante calls on the Muses, on genius, and on his own memory, which he pictures writing down all that he saw.
EFFECTS: codex:inf02.invocation
```

## [inf02.s1] Evening on the Hillside

Kanto I'in son dizesinde Dante, Vergilius'un ardından yürümeye başlamıştı; Kanto II o yürüyüşün akşamında açılır. Oyuncu Vergilius'u izleyerek yamaçtan iner. Bütün canlılar dinlenmeye çekilirken kıpırdayan tek şey onlardır. II 5'teki "woe" İtalyancada *pietate*'dir, yani acıma. GLOSS bunu söyler, çünkü oyunun kalbi olan terazi bir kanto sonra açılacak; okur o kelimeyi burada, yolun başında görmüş olur.

### [inf02.s1.b1] Day Was Departing

```script
@mode: cinematic
@place: inf02_hillside
@music: tek, alçak bir drone; arada kısa, yumuşak bir lavta motifi
@ambience: akşam rüzgârı, kuşların son sesleri, kuru otların hışırtısı
CAM: unengrave — vinyetteki alacakaranlık renge döner: kahverengi bir hava, batıda son ışık
QUOTE POET (Inferno II, 1–3)
> Day was departing, and the embrowned air
> Released the animals that are on earth
> From their fatigues; and I the only one
GLOSS: Embrowned: turned brown, as the air does at dusk. It is the evening of the same day on which Dante met the three beasts.
DO: Ardıç dallarına kuşlar konar ve kanatlarını kapar; bir tavşan yuvasına girer; bir kertenkele taşın altına çekilir. Yamaçta kıpırdayan tek şey Dante ile Vergilius'tur.
IF virtue:temperance>=1
NARRATION: That morning he had waited on the slope for the dawn. Now he watched the day go out.
ELSE
NARRATION: The day had begun with three beasts on the slope. Now it was ending, and the slope was quiet.
END IF
```

### [inf02.s1.b2] Behind Him

```script
@mode: play
DO: Vergilius patikadan aşağı yürür, oyuncu onu izler. Işık her adımda biraz daha azalır, gölgeler uzar. Takip, Kanto I'de öğretildiği gibi çalışır.
HINT: Walk behind me, down the slope. Night comes quickly on this hill.
HINT-SHORT: Behind me, down the slope.
BARK VIRGIL: The light is going. Keep close.
SFX: taş üstünde iki çift ayak sesi; uzakta, yuvasına dönen bir kuş
```

### [inf02.s1.b3] The War of the Way

```script
@mode: cinematic
@trigger: enter:inf02_overlook
CAM: hold — patikanın çıkıntısı; aşağıda vadinin karanlığı, yukarıda tepenin son ışığı
QUOTE POET (Inferno II, 4–6)
> Made myself ready to sustain the war,
> Both of the way and likewise of the woe,
> Which memory that errs not shall retrace.
GLOSS: In Dante's Italian the woe is pietate: pity. The road would be hard, and so would the pity he would feel along it.
DO: Dante durur. Vergilius iki adım aşağıda durur, arkasına döner ve bekler.
```

## [inf02.s2] The Doubt

Dante'nin konuşması (II 10–36) iki parçaya bölündü: ilki çıkıntıda, ikincisi dönemeçte; arada yürünür. Vergilius hiç sözünü kesmez. II 16–27 (Roma'nın ve Petrus'un tahtının Aeneas'ın yolculuğundan doğması) Dante'nin tek bir modern köprüsüyle özetlendi. Seçimin yerini tutan kanonik dizeler (II 31–33) sahnede gösterilmez; kartta açılır (§2.11). Ardından isteksiz yürüyüş gelir: Dante'nin iradesi adım adım çözülür (II 37–42) ve alacakaranlık ona hayvanlar gösterir. Vergilius'un sitemindeki ürken hayvan benzetmesi (II 46–48) böylece önce oynanır, sonra okunur.

### [inf02.s2.b1] Weigh My Strength

```script
@mode: dialogue
@place: inf02_overlook
QUOTE DANTE (Inferno II, 10–12)
> And I began: "Poet, who guidest me,
> Regard my manhood, if it be sufficient,
> Ere to the arduous pass thou dost confide me.
GLOSS: Manhood here means strength and worth. Before the hard pass, Dante asks his guide to weigh him first.
DANTE (afraid): This morning I would have followed you anywhere. Then the light began to go, and I began to think.
DO: Vergilius cevap vermez; dinler. Başıyla patikayı gösterir: konuşurken de yürünebilir.
```

### [inf02.s2.b2] Walking On

```script
@mode: play
DO: Vergilius yavaş adımlarla iner ve Dante'nin hızına uyar. Patika kıvrılarak dönemece iner.
HINT: Say what troubles you. We can walk while you say it.
HINT-SHORT: Walk, and say it.
BARK VIRGIL: Go on. I am listening.
SFX: çakıl, rüzgârın yön değiştirmesi
```

### [inf02.s2.b3] Aeneas and Paul

```script
@mode: dialogue
@trigger: enter:inf02_switchback
EKLEME: Dante'nin sözünü ettiği iki yolculuk, o konuşurken akşam göğünde silik Doré gravürleri olarak belirir. | Dayanak: Inferno II, 13–30
DO: Batı göğünde silik bir gravür belirir: Aeneas, yanında Sibylla, yeraltının ağzından aşağı iniyor.
QUOTE DANTE (Inferno II, 13–15)
> Thou sayest, that of Silvius the parent,
> While yet corruptible, unto the world
> Immortal went, and was there bodily.
GLOSS: Silvius's parent is Aeneas. In Virgil's Aeneid he goes down alive among the dead. Dante is speaking to the man who wrote it.
DANTE: Heaven had its reasons for him. Rome would come from him, and in Rome, one day, the chair of Peter.
DO: İlk gravür söner. Daha yukarıda ikincisi belirir: ışığın içine kaldırılmış bir adam, Pavlus.
QUOTE DANTE (Inferno II, 28–30)
> Thither went afterwards the Chosen Vessel,
> To bring back comfort thence unto that Faith,
> Which of salvation's way is the beginning.
GLOSS: The Chosen Vessel is Saint Paul. He wrote that he was caught up into Heaven, whether in the body or not, he could not tell.
EFFECTS: codex:inf02.aeneas_paul
DO: İkinci gravür de söner. Gökte yalnızca ilk yıldız kalır. Dante durur ve Vergilius'a döner.
CHOICE inf02.c1 minor "How Dante doubts"
PROMPT: Night was coming, and doubt came with it.
OPTION a ["I am no Aeneas. I am no Paul."]
DANTE (ashamed): Who am I, beside those two? No one would call me worthy. I would not call myself so.
EFFECTS: virtue:temperance+1
OPTION b ["Who allows this? On whose word?"]
DANTE (afraid): The living do not walk among the dead. If someone has allowed it, I need to know who.
EFFECTS: virtue:prudence+1
OPTION c ["I am a poet. Is that not enough?"]
DANTE (firm): Aeneas had his sword, and Paul his faith. I have my verses. Surely they count for something.
EFFECTS: flag:inf02.doubt_proud
REVEAL canon=a,b timing=immediate
QUOTE DANTE (Inferno II, 31–33)
> But I, why thither come, or who concedes it?
> I not Aeneas am, I am not Paul,
> Nor I, nor others, think me worthy of it.
NOTE: He asked who allowed it, and said he was neither Aeneas nor Paul. He did not feel worthy.
END CHOICE
QUOTE DANTE (Inferno II, 34–36)
> Therefore, if I resign myself to come,
> I fear the coming may be ill-advised;
> Thou'rt wise, and knowest better than I speak."
GLOSS: Ill-advised: Dante's Italian says folle, mad. He fears the journey would be madness, and that Virgil, being wise, can see it.
```

### [inf02.s2.b4] The Unwilling Walk

Bu yürüyüşte başarısızlık yoktur ve Dante her durumda durur (omurga: II 37–42). Oyuncunun payı gölgelerle ne yaptığıdır. Gölgeler saldırmaz, dokunmaz, Resolve'u azaltmaz; yalnızca yanlış görülen şeylerdir.

```script
@mode: play
@place: inf02_dusk_path
EKLEME: Alacakaranlıkta hayvan biçimine giren gölgeler ve ağırlaşan adımlar şiirde yok; Dante'nin isteksizliğinin (II 37–42) ve Vergilius'un ürken hayvan benzetmesinin (II 48) oyunlaştırılmasıdır. | Dayanak: Inferno II, 37–48
// Vergilius bu yürüyüşte bilerek susar: HINT yok, Q sessiz kalır. Cevabı s3'tedir.
NARRATION: Virgil went on down the path without a word. Dante followed him, and then followed more slowly.
DO: Vergilius cevap vermeden patikadan iner ve eliyle yolu gösterir. Oyuncu yürür; Dante'nin adımları kısalır, birkaç adımda bir duraklayıp tepeye bakar. Oyuncu tuşu bırakırsa Dante yokuş yukarı bir adım geri atar.
DO: Batan ışıkta patikanın kenarındaki üç gölge hayvan biçimine girer: benekli bir yaprak gölgesi (pars), yeleli bir çalı (aslan), sıska, kuru bir ağaç (dişi kurt). Oyuncu birine iyice yaklaşırsa gölge çözülür ve ne olduğu görünür: ardıç, taş, kuru dal {event:inf02.shadow_faced}. Uzak durursa gölgeler patikanın kenarında kalır; Dante her birinin önünden geçerken ürken bir hayvan gibi irkilir ve bir an geri çekilir.
DO: Üç gölge de göründükten sonra, oyuncu iki saniye kıpırdamazsa, yokuş yukarı dönerse ya da Vergilius'la arası on iki karoyu aşarsa Dante durur. Oyuncu ne yaparsa yapsın, yürüyüşün başından en geç yirmi saniye sonra durur {event:inf02.dante_halts}.
SFX: Dante'nin nefesi; çakıl; bir an, uzakta, tanıdık bir hırıltıya benzeyen rüzgâr
```

### [inf02.s2.b5] Brush and Stone

İsteğe bağlı vuruş: yalnızca oyuncu bir gölgeye yürürse oynar. Dante önce durursa (b6) kaçırılmış sayılır. s3'teki `seen:inf02.s2.b5` koşulu bu vuruşu okur.

```script
@mode: play
@trigger: event:inf02.shadow_faced
NARRATION: Up close, the beast was only brush and stone. The dusk had made the rest.
SFX: bir dalın rüzgârda gıcırtısı; hırıltı sanılan ses kesilir
```

### [inf02.s2.b6] Upon That Dark Hillside

```script
@mode: cinematic
@trigger: event:inf02.dante_halts
CAM: hold — Dante patikanın ortasında durmuş, yüzü tepeye dönük; Vergilius aşağıda, karanlıkta
QUOTE POET (Inferno II, 37–42)
> And as he is, who unwills what he willed,
> And by new thoughts doth his intention change,
> So that from his design he quite withdraws,
> Such I became, upon that dark hillside,
> Because, in thinking, I consumed the emprise,
> Which was so very prompt in the beginning.
GLOSS: The emprise is the enterprise: the journey. By thinking it over, he used up all the eagerness he had at the start.
```

## [inf02.s3] The Rebuke

Vergilius geri döner ve sitemini şiirin kendi sözleriyle yapar (II 43–48; çapa dizesi II 45). İki kısa modern cümle onu oyuncunun yaptıklarına bağlar: II 48'in hemen ardından gelen cümle oyuncunun gölgelerle ne yaptığına, II 49–51'in ardından gelen cümle kuşkusunu nasıl söylediğine (`inf02.c1`) cevap verir. Vergilius yargılamaz; Dante'yi gördüğü şeyle yüzleştirir. Sonra anlatmak için oturur. Gölge cümlesinde öncelik sırası: gölgeye yürüyen oyuncu, sonra aslanın önünde kıpırdamamış oyuncu (`virtue:fortitude`), sonra herkes.

### [inf02.s3.b1] Cowardice

```script
@mode: dialogue
CAM: follow — Vergilius patikadan geri çıkar ve Dante'nin önünde durur
QUOTE VIRGIL (Inferno II, 43–48)
> "If I have well thy language understood,"
> Replied that shade of the Magnanimous,
> "Thy soul attainted is with cowardice,
> Which many times a man encumbers so,
> It turns him back from honoured enterprise,
> As false sight doth a beast, when he is shy.
GLOSS: The Magnanimous: the great-souled one, Virgil. A shy beast is a skittish horse that bolts at a shadow it takes for danger.
IF seen:inf02.s2.b5
VIRGIL (gentle): You walked up to one of those beasts a moment ago. It was brush and stone.
ELSE IF virtue:fortitude>=1
VIRGIL (gentle): This morning you stood still before a living lion. These are only shadows.
ELSE
VIRGIL (gentle): Every bush on this slope has been a beast to you tonight.
END IF
QUOTE VIRGIL (Inferno II, 49–51)
> That thou mayst free thee from this apprehension,
> I'll tell thee why I came, and what I heard
> At the first moment when I grieved for thee.
IF choice:inf02.c1=c
VIRGIL (wry): A poet, you said. So was I. It did not open Heaven to me.
ELSE IF choice:inf02.c1=b
VIRGIL: You asked on whose word you go. Now you will hear whose word it was.
ELSE
VIRGIL (gentle): No one has asked you to be Aeneas.
END IF
VIRGIL (quiet): Sit with me a moment. You should hear it the way I heard it.
```

### [inf02.s3.b2] The Stone by the Path

```script
@mode: play
DO: Vergilius patikanın kenarındaki yassı taşa (inf02_bench) yürür ve oturur; yanında bir kişilik yer bırakır. {checkpoint}
HINT: Sit here by me, on the stone. Then listen.
HINT-SHORT: Sit by me.
SFX: gece böcekleri başlar; rüzgâr diner
```

## [inf02.s4] Why Virgil Came

Vergilius'un anlatısı (II 52–126) sekiz resimli sayfa ve bir kapanış vuruşudur. Her sayfa bir vuruştur ve en çok altı dize taşır (İncil §7.2). Sesler İncil'deki gibidir: Vergilius'un anlatımı `VIRGIL`, Beatrice'in sözleri `BEATRICE`, Lucia'nın sözleri `LUCIA`; soylu Hanım'ın sözleri (II 98–99) Beatrice'in ağzından, `BEATRICE` sesiyle gelir. İç içe tırnaklar kaynaktaki gibi kalır (§6.6). Gösterilmeyen dizeler (75–81, 85–87, 91–93, 109–114) kitabın sesiyle, sayfa altı yazısı olarak köprülenir; hepsi kolofonda açılan tam metinde okunur.

Sayfalar resimlidir ama kutsal yüzler kuralı geçerlidir: soylu Hanım yalnızca ışıktır; Lucia koşan bir ışık figürüdür; Beatrice'in yüzü ancak adını söylediği sayfada çizilir. Rahel çizilmez, yalnızca adı geçer. Dante anlatı boyunca konuşmaz; tepkisi sayfa kenarındaki küçük portrede görünür.

| Sayfa | Vuruş | Dizeler | Ses | Verilenler |
|---|---|---|---|---|
| 1 | b1 | 52–57 | VIRGIL | — |
| 2 | b2 | 58–63 | BEATRICE | — |
| 3 | b3 | 64–69 | BEATRICE | — |
| 4 | b4 | 70–74 | BEATRICE | `word:Go`, `codex:inf02.beatrice` |
| 5 | b5 | 82–84, 88–90 | VIRGIL, BEATRICE | — |
| 6 | b6 | 94–99 | BEATRICE | `codex:inf02.gentle_lady` |
| 7 | b7 | 100–102, 103–105 | BEATRICE, LUCIA | `codex:inf02.lucia`, `codex:inf02.rachel` |
| 8 | b8 | 106–108, 115–117 | LUCIA, VIRGIL | `word:Away` |
| — | b9 | 118–126 | VIRGIL | Kitap kapanır; canlı diyalog |

Etkileşim: E sayfayı çevirir; Q sayfadaki dizenin kenar notunu (GLOSS) açar; parlayan söz E ile alınmadan sayfa çevrilmez. Kantonun iki sözü de buradadır: biri Beatrice'in emrinden (go), biri gözyaşından (away). İlk tercetin bir dış yuvası böylece Beatrice'in gözyaşından gelir.

### [inf02.s4.b1] Among Those in Suspense

```script
@mode: page
@trigger: talk:VIRGIL
@place: inf02_bench
@music: tek, yumuşak bir org notası; Limbo'nun durgunluğu
EKLEME: Vergilius'un anlatısı resimli kitap sayfaları olarak okunur; Beatrice ve Lucia kendi sözlerini kendi seslerinde söyler (İncil §6.5'te onaylı). | Dayanak: Inferno II, 52–126
DO: Dante taşa, Vergilius'un yanına oturur.
CAM: engrave — yamaç, taşta oturan iki figürle birlikte gravüre döner
CAM: page-turn — gravür bir kitap sayfası olur; Kitap Vergilius'un anısına açılır
NARRATION: Virgil told it slowly, as if he were seeing it again.
DO: Sayfanın resmi: Limbo'nun griliği ve ortada oturan Vergilius; yukarıdan inen bir ışık. Beatrice henüz yalnızca ışık ve iki göz olarak çizilir. E sayfayı çevirir, Q dizenin kenar notunu açar.
QUOTE VIRGIL (Inferno II, 52–57)
> Among those was I who are in suspense,
> And a fair, saintly Lady called to me
> In such wise, I besought her to command me.
> Her eyes where shining brighter than the Star;
> And she began to say, gentle and low,
> With voice angelical, in her own language:
GLOSS: Those in suspense are the souls of Limbo, Virgil among them. Readers differ on whether the Star is the sun or the morning star.
```

### [inf02.s4.b2] O Spirit Courteous

```script
@mode: page
CAM: page-turn
DO: Sayfanın resmi: ışıktan bir kadın figürü oturan Vergilius'a eğilmiş. Sayfanın alt kenarında küçük bir gravür: yukarıdan, Cennet'ten görüldüğü gibi, çıplak bir yamaçta dişi kurttan geri kaçan bir adam.
QUOTE BEATRICE (Inferno II, 58–63)
> 'O spirit courteous of Mantua,
> Of whom the fame still in the world endures,
> And shall endure, long-lasting as the world;
> A friend of mine, and not the friend of fortune,
> Upon the desert slope is so impeded
> Upon his way, that he has turned through terror,
GLOSS: Mantua was Virgil's city. A friend, but no friend of fortune: he loved her for herself, and luck was never on his side.
```

### [inf02.s4.b3] Too Late

```script
@mode: page
CAM: page-turn
DO: Sayfanın resmi: figürün ışığı "too late" dizesinde bir an titrer, sönecek gibi olur; eli Vergilius'a uzanmıştır. Kenardaki küçük Dante portresi başını eğer.
QUOTE BEATRICE (Inferno II, 64–69)
> And may, I fear, already be so lost,
> That I too late have risen to his succour,
> From that which I have heard of him in Heaven.
> Bestir thee now, and with thy speech ornate,
> And with what needful is for his release,
> Assist him so, that I may be consoled.
GLOSS: Speech ornate: Virgil's eloquence, the art of his poetry. She is trusting his words to bring Dante back.
```

### [inf02.s4.b4] Beatrice

```script
@mode: page
CAM: page-turn
DO: Sayfanın resmi: figürün yüzü ilk kez çizilir. Ad dizesi belirdiğinde kenardaki Dante portresi gözlerini kapar ve elini göğsüne götürür. Dante tek söz söylemez.
DO: Bu sayfada dizedeki bir kelime parlayacak: parlayan söz E ile alınır ve Kitap'a geçer. {tutorial:read}
QUOTE BEATRICE (Inferno II, 70–74)
> Beatrice am I, who do bid thee go;
> I come from there, where I would fain return;
> Love moved me, which compelleth me to speak.
> When I shall be in presence of my Lord,
> Full often will I praise thee unto him.'
GLOSS: Beatrice was the woman Dante loved in Florence. She died in 1290, ten years before this journey.
EFFECTS: word:Go, codex:inf02.beatrice
DO: "go" kelimesi E ile alınınca söz kartı Kitap'a uçar. Söz alınmadan sayfa çevrilmez.
```

### [inf02.s4.b5] Why She Was Not Afraid

```script
@mode: page
CAM: page-turn
NARRATION: Virgil promised to go at once. Then he asked her a question.
DO: Sayfanın resmi: Limbo'nun karanlığında duran bir ışık; çevresindeki gölgeler ona dokunmadan geri çekilir.
QUOTE VIRGIL (Inferno II, 82–84)
> But the cause tell me why thou dost not shun
> The here descending down into this centre,
> From the vast place thou burnest to return to.'
GLOSS: This centre: the bottom of the universe, where Hell is. The vast place: the highest Heaven.
QUOTE BEATRICE (Inferno II, 88–90)
> Of those things only should one be afraid
> Which have the power of doing others harm;
> Of the rest, no; because they are not fearful.
GLOSS: Virgil is repeating these words to a man who has just been frightened by shadows.
```

### [inf02.s4.b6] A Gentle Lady

```script
@mode: page
CAM: page-turn
NARRATION: Nothing in that place could touch her, she said. Then she told him who had sent her.
DO: Sayfanın resmi: sayfanın tepesinde yalnızca beyaz bir ışık; yüz yok, figür yok. Işık aşağı doğru yayılır ve hızlı, küçük bir ikinci ışığa, Lucia'ya ulaşır.
QUOTE BEATRICE (Inferno II, 94–99)
> A gentle Lady is in Heaven, who grieves
> At this impediment, to which I send thee,
> So that stern judgment there above is broken.
> In her entreaty she besought Lucia,
> And said, "Thy faithful one now stands in need
> Of thee, and unto thee I recommend him."
GLOSS: The poem does not name the gentle Lady. Readers have always understood her to be the Virgin Mary. Her pity breaks the hard judgment.
EFFECTS: codex:inf02.gentle_lady
```

### [inf02.s4.b7] Lucia

```script
@mode: page
CAM: page-turn
DO: Sayfanın resmi: Lucia'nın ışığı sayfayı bir uçtan öbür uca koşarak geçer ve oturan Beatrice'in yanına varır. Rahel çizilmez; yalnızca adı geçer.
QUOTE BEATRICE (Inferno II, 100–102)
> Lucia, foe of all that cruel is,
> Hastened away, and came unto the place
> Where I was sitting with the ancient Rachel.
GLOSS: Lucia is Saint Lucy, an early martyr. Rachel, from the Bible, sits beside Beatrice in Heaven.
EFFECTS: codex:inf02.lucia, codex:inf02.rachel
QUOTE LUCIA (Inferno II, 103–105)
> "Beatrice" said she, "the true praise of God,
> Why succourest thou not him, who loved thee so,
> For thee he issued from the vulgar herd?
GLOSS: The vulgar herd is the common crowd. Readers take it that his love for Beatrice lifted Dante above it, and made him her poet.
```

### [inf02.s4.b8] Her Tears

```script
@mode: page
CAM: page-turn
QUOTE LUCIA (Inferno II, 106–108)
> Dost thou not hear the pity of his plaint?
> Dost thou not see the death that combats him
> Beside that flood, where ocean has no vaunt?"
GLOSS: In Canto I, Dante's first words were a cry for pity. Here Lucia asks Beatrice whether she cannot hear it.
NARRATION: No one ever ran from harm as fast as she came down, she said, trusting his words to do the rest.
DO: Sayfanın resmi: Beatrice yüzünü öte yana çevirir; ışıktan bir gözyaşı kâğıda düşer ve mürekkebi hafifçe dağıtır. Gözyaşı düştüğü anda dizedeki "away" kelimesi parlar.
QUOTE VIRGIL (Inferno II, 115–117)
> After she thus had spoken unto me,
> Weeping, her shining eyes she turned away;
> Whereby she made me swifter in my coming;
EFFECTS: word:Away
DO: Söz E ile alınınca kart Kitap'a uçar. Sayfanın köşesindeki küçük Vergilius figürü koşmaya başlar.
```

### [inf02.s4.b9] Why Do You Delay

Kitap kapanır ve Vergilius'un son sözleri anı olarak değil, şimdi ve yüz yüze söylenir. Bu yüzden bu vuruş sayfa değil diyalogdur.

```script
@mode: dialogue
CAM: page-turn — Kitap kapanır
CAM: unengrave — sayfadan yeniden gece yamacına: taş, iki figür, ilk yıldızlar
QUOTE VIRGIL (Inferno II, 118–120)
> And unto thee I came, as she desired;
> I have delivered thee from that wild beast,
> Which barred the beautiful mountain's short ascent.
GLOSS: The wild beast is the she-wolf, which drove Dante back down the slope that morning.
DO: Vergilius ayağa kalkar ve Dante'nin karşısına geçer. Dante taşta oturmaya devam eder.
QUOTE VIRGIL (Inferno II, 121–126)
> What is it, then?  Why, why dost thou delay?
> Why is such baseness bedded in thy heart?
> Daring and hardihood why hast thou not,
> Seeing that three such Ladies benedight
> Are caring for thee in the court of Heaven,
> And so much good my speech doth promise thee?"
GLOSS: Benedight means blessed. The three Ladies are the gentle Lady, Lucia and Beatrice.
SFX: sessizlik; yalnızca gece böcekleri
```

## [inf02.s5] Courage

Kitap kapandıktan sonra bir sessizlik. Vergilius susar ve bekler; Dante'yi ayağa oyuncu kaldırır. Çiçek benzetmesi (II 127–132) taşın çevresindeki gerçek gece çiçekleriyle gösterilir: Dante doğrulurken çiçekler açılır. Benzetmenin son dizesi ("That I began, like an intrepid person:") seçimin kapısıdır: Dante'nin ilk sözünü oyuncu seçer, kart şiirdeki teşekkürü açar (II 133–135). Ardından herkes için II 136–140 gelir (çapa dizeleri 139–140).

Üç seçenek de dürüsttür ve Dante'nin karakterindedir; hiçbiri "doğru cevap" değildir. Yankılar küçüktür ve sayı göstermez: (a) çiyde bir ışık ve bir birim Grace; (b) Vergilius'un yaklaşması (güven, mesafe ve duruşla gösterilir); (c) geçidin üstünde üç yıldız (Fortitude). Üç yıldız, Araf I'deki dört yıldızın sessiz bir habercisidir; hiçbir yerde açıklanmaz.

### [inf02.s5.b1] The Night Flowers

```script
@mode: play
EKLEME: Şiirdeki çiçek benzetmesi (II 127–132) taşın çevresinde gerçek gece çiçekleri olarak gösterilir; Dante'yi ayağa oyuncu kaldırır. | Dayanak: Inferno II, 127–132
// Vergilius burada bilerek susar: HINT yok. Ayağa kalkma kararı oyuncunundur.
DO: Dante taşta oturur, başı eğik. Taşın çevresinde gecenin soğuğuyla kapanmış, sapları eğilmiş küçük beyaz çiçekler. Vergilius birkaç adım ötede durur ve bekler.
DO: Oyuncu bir hareket tuşuna ya da E'ye basınca Dante ayağa kalkar {event:inf02.dante_rises}.
SFX: yalnızca gece böcekleri ve Dante'nin nefesi
```

### [inf02.s5.b2] Like an Intrepid Person

```script
@mode: dialogue
@trigger: event:inf02.dante_rises
EKLEME: Seçeneklere göre değişen görsel yankılar (çiy, Vergilius'un yaklaşması, üç yıldız) şiirde yok. | Dayanak: Inferno II, 124–135
CAM: zoom-in — taşın dibindeki çiçekler
DO: Dante doğrulurken çiçeklere soluk, beyaz bir ışık vurur; çiçekler sapları üstünde birer birer açılır.
QUOTE POET (Inferno II, 127–132)
> Even as the flowerets, by nocturnal chill,
> Bowed down and closed, when the sun whitens them,
> Uplift themselves all open on their stems;
> Such I became with my exhausted strength,
> And such good courage to my heart there coursed,
> That I began, like an intrepid person:
CAM: zoom-out — Dante ayakta, Vergilius'la yüz yüze
CHOICE inf02.c2 major "What gives Dante courage"
PROMPT: Three ladies of Heaven cared for him, and his guide had come at once.
OPTION a [Think of her tears.]
DANTE (weeping): She wept for me. She came all the way down into the dark, and she wept for me.
DO: Açılmış çiçeklerin taçyapraklarında çiy taneleri ışır. HUD'daki Grace damlası bir birim dolar.
EFFECTS: grace+1, flag:inf02.courage_beatrice
OPTION b [Believe the one who came.]
DANTE (firm): You came the moment she asked. I will not be slower than you were.
DO: Vergilius bir adım yaklaşır ve başıyla onaylar. Bundan sonra Dante'ye biraz daha yakın yürür.
EFFECTS: trust+1, flag:inf02.courage_virgil
OPTION c [Think of the three ladies.]
DANTE (awed): Three ladies in Heaven, thinking of me tonight. Then what is there on this hill to fear?
DO: Geçidin üstündeki karanlık gökte üç yıldız belirir.
EFFECTS: virtue:fortitude+1, flag:inf02.courage_ladies
REVEAL canon=a,b timing=immediate
QUOTE DANTE (Inferno II, 133–135)
> "O she compassionate, who succoured me,
> And courteous thou, who hast obeyed so soon
> The words of truth which she addressed to thee!
NOTE: He thanked them both: Beatrice for her pity, and Virgil for coming so soon.
END CHOICE
QUOTE DANTE (Inferno II, 136–140)
> Thou hast my heart so with desire disposed
> To the adventure, with these words of thine,
> That to my first intent I have returned.
> Now go, for one sole will is in us both,
> Thou Leader, and thou Lord, and Master thou."
GLOSS: One sole will: from now on they want the same thing. Leader, Lord and Master: Dante gives Virgil three titles at once.
DO: Vergilius tek söz söylemez; döner ve geçide doğru yürür.
```

## [inf02.s6] The First Verse

EKLEME (GDD 4.0, İncil §7.2): Vergilius ilk terceti öğretir. Şiirde II 140 ile 141 arasında hiçbir şey olmaz; öğretici tam bu araya, Dante'nin "Now go" demesiyle Vergilius'un yürümesi arasına girer. Dayanak II 67'dir: Beatrice, Dante'yi kurtarmak için Vergilius'un "speech ornate"ine güvenmişti; şimdi Vergilius Dante'ye kendi sözlerini kurmayı öğretir.

Bulmaca: Geçidin ağzını yamaçtan düşmüş bir kaya kapatır. Oyuncunun elinde Fear (yük), Way, Hope, Love, Go ve Away vardır. Kafiyeli tek dış çift Way ile Away'dir (`-ay`); ortaya Love, Hope ya da Go girebilir. Kayayı yalnızca Force tercet (ortada Love) devirir. Mend (Hope) ve Swift (Go) tercetleri de kurulur ve atılır; kendi etkilerini gösterirler ama kayayı kıpırdatmazlar. Love'ın arayüz açıklaması ("Moves what stands in your way.") ve Vergilius'un Q ipucu doğru cevabı söyler. Kaya devrilince Vergilius, Beatrice'in "Love moved me" dizesine (II 72) tek bir kuru cümleyle döner; bu, Vergilius'un bu kantodaki tek esprisidir.

Kurulan ilk tercet Kitap'ta köken dizeleriyle şöyle okunur (motor üretir; bu çit ayrıştırıcı tarafından yok sayılır):

```cento
In which I had abandoned the true way. (Inferno I, 12)
Avail me the long study and great love (Inferno I, 83)
Weeping, her shining eyes she turned away; (Inferno II, 116)
```

Kafiye: way / love / away. Oyuncunun Komedya'sındaki ilk tercetin son dizesi böylece Beatrice'in gözyaşından gelir.

### [inf02.s6.b1] Down to the Way

```script
@mode: play
DO: Vergilius yamacın dibine, geçidin ağzına iner. Oyuncu onu izler.
HINT: The way down begins at the foot of the slope. Come.
HINT-SHORT: To the foot of the slope.
BARK VIRGIL: Down here.
```

### [inf02.s6.b2] Three Words

```script
@mode: dialogue
@trigger: enter:inf02_fallen_stone
EKLEME: Geçidi kapatan kaya ve Vergilius'un ilk terceti öğretmesi şiirde yok; GDD 4.0'daki öğretici. | Dayanak: Beatrice, Vergilius'un sözünün gücüne güvenir (Inferno II, 67).
CAM: hold — geçidin ağzında, yamaçtan kopup düşmüş insan boyu bir kaya
VIRGIL (quiet): She trusted my words to bring you this far. From here on, you will need words of your own.
VIRGIL: You carry words now. A verse is made of three of them.
VIRGIL (gentle): The first and the last must answer each other. The middle one is its heart.
EFFECTS: unlock:compose, unlock:verse
DO: Kitap'ın Words ekranı A · B · A yuvalarıyla açılır. Eldeki sözler: Way, Hope, Love, Go, Away; Fear gri durur ve yerleştirilemez. {tutorial:compose}
VIRGIL (quiet): Fear cannot go into a verse. For now, you can only carry it.
```

### [inf02.s6.b3] The Heart of the Verse

```script
@mode: play
EKLEME: Tercetin kurulması ve atılması şiirde yok; oyunun söz sistemi (GDD 2.2, 3.4). | Dayanak: Inferno II, 67
HINT: The heart of a verse decides what it does. Put in the middle the word that moves things.
HINT-SHORT: The word that moves things goes in the middle.
DO: Dış yuvalara yalnızca aynı aileden iki farklı söz girer: bu noktada Way ve Away. Orta yuvaya Love, Hope ya da Go girebilir. Kurulan tercet Words ekranında köken dizeleriyle okunur.
DO: Oyuncu tercetini J tuşuna hazırlar ve kayaya atar. {tutorial:verse}
DO: Love ortadaysa (Force) kaya sarsılır ve geçidin ağzından devrilir {event:inf02.stone_moved}. Hope ortadaysa (Mend) Dante'yi yumuşak bir ışık sarar; Go ortadaysa (Swift) Dante uzun bir atılış yapar. İki durumda da kaya kıpırdamaz ve Vergilius başını iki yana sallar. Öğretici süresince Grace bir atımın altına inmez; oyuncu kilitlenmez.
```

### [inf02.s6.b4] What Love Moves

```script
@mode: cinematic
@trigger: event:inf02.stone_moved
EKLEME: Kayanın devrilip geçidi açması şiirde yok; GDD 4.0'daki ilk tercet sahnesi. | Dayanak: Inferno II, 141–142
CAM: shake — kaya geçidin ağzından devrilir
SFX: taşın uzun düşüşü; derinden gelen yankılar, sonra sessizlik
NARRATION: The stone went over the edge, and for a long time they heard it falling.
EFFECTS: codex:inf02.terza_rima
VIRGIL (quiet): She said love moved her. It moves stones as well.
```

## [inf02.s7] The Deep and Savage Way

Kantonun son iki dizesi ikiye bölünür. II 141 sahnede okunur ("and when he had moved") ve Vergilius yürür; aradaki adımı oyuncu atar; II 142 ("I entered on the deep and savage way.") kolofonun sol sayfasında tek başına basılır. Oyuncu kantonun son dizesini önce yaşar, sonra okur. `inf02.c2`'nin son yankısı da buradadır: Vergilius'a inanan oyuncuyu Vergilius eşikte bekler; kapanış şeridi seçime göre değişir.

### [inf02.s7.b1] When He Had Moved

```script
@mode: cinematic
@music: drone derinleşir; lavta susar
CAM: follow — Vergilius açılan geçide doğru yürür
QUOTE POET (Inferno II, 141)
> Thus said I to him; and when he had moved,
IF flag:inf02.courage_virgil
DO: Vergilius geçidin eşiğinde durur ve Dante yanına gelene kadar bekler.
ELSE
DO: Vergilius bir adım önde, arkasına bakmadan geçide girer.
END IF
HINT: Stay close to me. It is narrow below, and dark.
HINT-SHORT: Stay close.
```

### [inf02.s7.b2] The Threshold

```script
@mode: cinematic
@trigger: enter:inf02_gorge
IF flag:inf02.courage_beatrice
NARRATION: He went down into the dark, and took her tears with him.
ELSE IF flag:inf02.courage_virgil
NARRATION: He went down close behind his guide, and did not look back at the hill.
ELSE IF flag:inf02.courage_ladies
NARRATION: He went down, and the three stars stayed over the gorge until its walls hid them.
ELSE
NARRATION: He went down after his guide.
END IF
CAM: engrave — sahne son kez gravüre döner: geçidin ağzında iki küçük figür
CAM: fade-out
SFX: ayak sesleri taşta yankılanır ve uzaklaşır
```

## [inf02.s8] Colophon

Sol sayfada II 142 tek başına durur. Sağ sayfada "In this canto": iki seçim ve Dante'ninkiler (iki kart da hemen açıldığı için ertelenmiş kart yoktur), Go ve Away sözleri köken dizeleriyle, ilk tercet ("Your verses") ve Codex sayfaları. Terazi henüz yoktur; Kanto III'te açılır. Kantonun tam Longfellow metni Kitap'ta açılır; s4'te gösterilmeyen dizeleri (75–81, 85–87, 91–93, 109–114) okur orada bulur.

### [inf02.s8.b1] I Entered

```script
@mode: colophon
QUOTE POET (Inferno II, 142)
> I entered on the deep and savage way.
```

## Codex

```codex
ID: inf02.invocation
TAB: lore
TITLE: The Call to the Muses
QUOTE POET (Inferno II, 7–9)
> O Muses, O high genius, now assist me!
> O memory, that didst write down what I saw,
> Here thy nobility shall be manifest!
NOTE: In the poem, Dante stops to call for help: on the Muses, on high genius, and on memory, which he pictures as a scribe that wrote down all he saw. Readers have long treated Canto I as a prologue to the whole Comedy, so that the thirty-three cantos of Hell proper begin here, with this call. Purgatory and Paradise open with calls of their own.
RELATED: inf02.terza_rima
```

```codex
ID: inf02.aeneas_paul
TAB: lore
TITLE: Aeneas and Paul
QUOTE DANTE (Inferno II, 32)
> I not Aeneas am, I am not Paul,
NOTE: In the poem, Dante names two men who went alive into the other world. Aeneas, the hero of Virgil's Aeneid, went down among the dead, and from his journey came Rome, its empire and the chair of Peter. Saint Paul, the Chosen Vessel, was caught up into Heaven and brought comfort back to the faith. Historically, the Aeneid's sixth book is a great source of Dante's Hell.
RELATED: inf04.heroes
```

```codex
ID: inf02.beatrice
TAB: souls
TITLE: Beatrice
QUOTE BEATRICE (Inferno II, 70–72)
> Beatrice am I, who do bid thee go;
> I come from there, where I would fain return;
> Love moved me, which compelleth me to speak.
NOTE: Historically, Beatrice was a woman of Florence, very likely Beatrice Portinari, whom Dante first saw when both were children and loved all his life. She died in 1290, at twenty-four, and he wrote of her in the Vita Nuova. In the poem she comes down from Heaven into Limbo to send Virgil to him. Much later, she will be his guide herself.
RELATED: inf02.gentle_lady, inf02.lucia, inf02.rachel
```

```codex
ID: inf02.gentle_lady
TAB: souls
TITLE: The Gentle Lady
QUOTE BEATRICE (Inferno II, 94–96)
> A gentle Lady is in Heaven, who grieves
> At this impediment, to which I send thee,
> So that stern judgment there above is broken.
NOTE: The poem never names her, but readers have always understood her to be the Virgin Mary. In the poem she sees Dante lost on the slope and grieves for him, and her pity breaks the stern judgment above. She sends Lucia, Lucia sends Beatrice, and Beatrice sends Virgil: all the help that reaches Dante begins with her. In this book she appears only as light.
RELATED: inf02.lucia, inf02.beatrice
```

```codex
ID: inf02.lucia
TAB: souls
TITLE: Lucia
QUOTE BEATRICE (Inferno II, 100)
> Lucia, foe of all that cruel is,
NOTE: Historically, Saint Lucy of Syracuse was an early Christian martyr whose name comes from the Latin for light, and who was prayed to for the eyes. Readers have long thought that Dante, who once weakened his eyes with reading, was devoted to her; in the poem the Lady calls him Lucia's faithful one. She carries the Lady's word to Beatrice, and will come again on the mountain of Purgatory.
RELATED: inf02.gentle_lady, inf02.beatrice
```

```codex
ID: inf02.rachel
TAB: souls
TITLE: Rachel
QUOTE BEATRICE (Inferno II, 102)
> Where I was sitting with the ancient Rachel.
NOTE: In the Bible, Rachel is the wife for whom Jacob worked fourteen years. In the poem she sits beside Beatrice in Heaven and is only named. Readers have long followed an old tradition that takes her as the image of the contemplative life, the life spent looking at God. She will be seen again near the end of Paradise, still at Beatrice's side.
RELATED: inf02.beatrice
```

```codex
ID: inf02.terza_rima
TAB: lore
TITLE: Terza Rima
QUOTE POET (Inferno II, 127–129)
> Even as the flowerets, by nocturnal chill,
> Bowed down and closed, when the sun whitens them,
> Uplift themselves all open on their stems;
NOTE: Terza rima is the form Dante invented for the Comedy: lines in threes, rhymed aba bcb cdc, so that the middle sound of each tercet becomes the outer rhyme of the next, and every canto closes on a single line. Longfellow kept the threes but not the rhymes. The words gathered in this book end lines that still rhyme, so a verse made from them is three lines of Longfellow that rhyme again.
RELATED: inf02.invocation
```

**Kapanış notu: sapmalar, eklemeler ve kısaltmalar**

**SAPMA yok.** Bu kantoda şiirle çelişen ya da onu değiştiren bir şey yazılmadı. Olayların sırası, sözlerin sahipleri ve sonuçlar şiirdeki gibidir. Dante'nin şiirdeki sözleri (II 10–36, 133–140) ve Vergilius'un kesintisiz konuşması (II 43–126) Longfellow'la ve İncil'deki seslerle verildi. Seçeneklerdeki modern cümleler, kartların açtığı kanonik dizelerin (II 31–33, 133–135) yerini tutan köprülerdir. Beatrice, Lucia ve soylu Hanım tek bir modern cümle söylemez; Hanım'ın ve Rahel'in yüzü gösterilmez.

**Eklemeler ve gerekçeleri** (her biri ilgili vuruşta `EKLEME` notuyla işaretlidir):

1. Aeneas ile Pavlus'un akşam göğündeki gravürleri (s2.b3). Gerekçe: Dante'nin sözünü ettiği iki yolculuğu resimli kitap katmanında görünür kılmak. Dayanak II 13–30.
2. İsteksiz yürüyüş ve hayvan biçimli gölgeler (s2.b4–b5). Gerekçe: II 37–42'deki iradenin çözülüşünü ve II 48'deki ürken hayvan benzetmesini oynanır kılmak; Vergilius'un sitemi böylece oyuncunun az önce yaşadığı şeyi adlandırır. Vergilius'un cevap vermeden birkaç adım inmesi de bu eklemenin parçasıdır; cevabı (II 43) Dante durunca gelir. Gölgeler zarar vermez ve Dante her yolda durur.
3. Vergilius'un taşa oturması ve anlatının resimli sayfalar olarak okunması (s3.b2, s4). İncil §6.5'te onaylıdır. Gerekçe: kantonun en uzun konuşması güvenli, oturaklı bir okuma anında geçer (GDD §1.2).
4. Gerçek gece çiçekleri ve Dante'yi ayağa oyuncunun kaldırması (s5.b1). Gerekçe: benzetmenin görselleştirilmesi; cesaretin dönüşü bir oyuncu eylemi olur.
5. Seçime göre değişen yankılar (s5.b2, s7): çiy, Vergilius'un yaklaşıp eşikte beklemesi, üç yıldız ve kapanış şeridi. Gerekçe: seçimin sonucu sayı göstermeden hissedilsin.
6. İlk tercet, kaya ve geçidin açılması (s6). GDD 4.0'da ve İncil §7.2'de onaylıdır. II 140 ile 141 arasına girer; şiirde orada hiçbir şey olmaz. Dayanak II 67.

**Kısaltmalar ve sunum kararları** (sapma değildir):

- s4'te gösterilmeyen dizeler: 75–81 (Vergilius'un Beatrice'e övgüsü ve sözü), 85–87 (Beatrice'in cevaba girişi), 91–93 (Tanrı'nın onu acıdan koruması), 109–114 (Beatrice'in aceleyle inişi). Sayfa başına altı dize sınırı yüzünden kitabın sesiyle tek cümlelik köprülerle verildi; hepsi kolofonda açılan tam metinde okunur. II 16–27 ise Dante'nin tek bir modern köprüsüyle özetlendi.
- II 118–126 sayfa olarak değil, kitap kapandıktan sonra canlı diyalog olarak verildi: "What is it, then?" sorusu bir anı değil, şimdiki zamandır. Bu yüzden s4'ün son vuruşu `dialogue` kipindedir.
- s7 iki vuruştur ve arada oyuncu yürür: II 141 sahnede, II 142 kolofonda okunur. Kantonun son adımını oyuncu atar.
- İncil, II 37–42'nin "anlatımla" verilmesini öneriyordu. Bu dizeler oynanışın hemen ardından Longfellow'un sözleriyle gösterildi, çünkü mekaniğin ve dizenin üst üste düştüğü an bu kantonun en güçlü "oynanabilir kitap" anıdır. Kitabın sesi (`NARRATION`) yürüyüşün kendisini anlatır.
- Codex'e İncil'in en az kümesi dışında bir kayıt eklendi: `inf02.invocation`.

**Baş yazar için açık sorular**

- Gölgeye yürümek (s2.b5) bilerek hiçbir sistem etkisi taşımaz; böylece İncil §3.2'deki bağlayıcı seçim envanteri ve §3.6'daki erdem kaynakları değişmez. İstenirse ileride bir sistemik Fortitude ölçümüne dönüşebilir; bu, iki tablonun da güncellenmesini gerektirir.
- `inf02.aeneas_paul` kaydı `RELATED: inf04.heroes` taşır (İncil §4.5'teki kanto aşan bağ). Kanto IV yazarı o kaydı başka bir ID ile açarsa bu bağ güncellenmelidir.
