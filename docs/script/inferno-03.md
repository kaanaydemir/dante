---
id: inf03
canticle: Inferno
canto: 3
title: "The Gate"
title_tr: "Kapı"
location: "Ante-Inferno"
source: docs/source/inferno/canto-03.txt
lines: "1–136"
epigraph: "Inferno III, 1–3"
closing: "Inferno III, 136"
characters: [DANTE, VIRGIL, NEUTRAL, GREAT_REFUSAL, SOUL, CHARON]
mechanics: [inscription, fear, darkness, heart, crowd_flow, swarm, hold_ground, guardian, quake, faint]
choices: [inf03.c1, inf03.c2, inf03.c3]
words: [Stay, Desire]
memories: []
codex: [inf03.gate, inf03.ante_inferno, inf03.neutrals, inf03.contrapasso, inf03.great_refusal, inf03.acheron, inf03.charon, inf03.leaves]
flags_set: [inf03.left_hope, inf03.asked_neutral]
flags_read: [inf01.motive_gate, inf01.motive_souls]
unlocks: [heart]
playtime: "8–12"
writer: "Claude"
status: draft
version: "0.1"
---

# Inferno III — The Gate

Kanto III, Bölüm 1'in eşiğidir. İlk iki kantoda Dante'nin karşısında hayvanlar ve kendi kuşkusu vardı; burada ilk kez ruhlar, ilk kez bir bekçi ve ilk kez şiirin kendi hükmü var. Kanto üç geçitten geçer: taştan bir geçit (kapı ve yazısı), insanlardan bir geçit (bayrağın ardındaki şerit) ve sudan bir geçit (Akheron). Üçünde de oyuncunun payı aynı sorudan doğar: Dante korkusuyla ne yapar? Kapıda onu bırakabilir (`inf03.c1`), Kharon'un önünde ona yenilmeyebilir (`inf03.c3`). Kararsızların önündeyse korkusuyla değil, merakıyla ve acımasıyla sınanır (`inf03.c2`). Kanto, Dante'nin ilk bayılmasıyla biter: kızıl bir ışık ve uykuya dalar gibi bir düşüş.

**Bu kantonun yedi fikri**

1. **İki söz, bir eşik.** Yazı umudu ister, Vergilius korkuyu (`inf03.c1`). Bırakılan söz eşikte görünür kalır. Korku eşiğin taşına düşer ve taşın rengine döner. Umut ise yere bırakılmış küçük bir ışık olur ve Vergilius onu tek söz söylemeden alıp pelerinine koyar: Limbo'da (IV s2) umudu Dante'ye geri verecek el, onu kapıda yerden alan eldir. Yazının kendisi de bir mekaniktir (`inscription`): son dizedeki "hope" taşta karardığı anda Kitap'taki Hope kartı titrer, Fear kartı ağırlaşır.
2. **Boş terazi.** Kalp sistemi şiirin kendi dizesiyle açılır: *Misericord and Justice both disdain them.* (Inferno III, 50). Terazi iki kefesi boş olarak gelir ve bu kantoda hiç kıpırdamaz. Bu bir eksiklik değil, şiirin Kararsızlar üzerine verdiği hükümdür. Kirişin titrediği tek an, oyuncunun bir Kararsız'a adını sorduğu andır; titrer ve yerine döner.
3. **Şairin acıması, şiirin hükmü.** Kararsız'a adını soran Dante ona yaşayanların arasında bir yer vaat eder: "I will write it where the living can read it." Bu cümlede bir şairin acıması da kibri de vardır. Ruh cevap vermez; Kitap'ta boş bir anı kartı belirip söner. Anma sistemi oyunda ilk kez burada, olumsuzuyla görünür: dünya onların adını tutmaz (III 49) ve bir şair de tutamaz.
4. **Soru ve cevap: Stay ve Desire.** Kantonun iki sözü aynı konuşmanın iki ucudur. Dante kıyıdaki kalabalığı sorar; Vergilius cevabı "adımlarımız kıyıda durunca"ya erteler (Stay, III 77). Cevap Kharon'dan sonra gelir: o ruhların korkusu arzuya dönmüştür (Desire, III 126). Oyuncu sorunun sözünü yamaçta, cevabın sözünü kıyıda alır; kolofonda ikisi yan yana durur.
5. **Susmak bir mekaniktir.** III 79–81'de Dante utanır ve ırmağa kadar susar. Bu yürüyüşte `HINT` yoktur: Q tuşu sessizdir, ruhlara E ile seslenmek de ağızdan bir söz çıkarmaz. Dante başını kaldırır, sonra indirir. Oyuncu Dante'nin susmasını kendi parmaklarında yaşar.
6. **El.** Kanto bir elle açılır ve bir elle kapanır. Vergilius kapıda elini Dante'nin eline koyar (III 19); yıldızsız karanlıkta o el oyuncuyu taşır (korku yarı etkiyle işler); depremde Vergilius elini yeniden uzatır. Ama kızıl ışık iki elin buluşup buluşmadığını göstermez: şiir de Akheron'un nasıl geçildiğini söylemez.
7. **Ustadan alınan yaprak.** Ruhların kayığa dökülüşü (III 112–117) bir Doré gravürüne döner: kıyı çıplak bir dal, ruhlar yaprak olur. Bu benzetme Vergilius'un kendi *Aeneis*'inden gelir (Codex: `inf03.leaves`). Öğrenci ustasının imgesini, ustası yanında dururken kullanır.

**Akış**

| Sahne | Süre (dk) | Oyuncu ne yapar | Verilenler |
|---|---|---|---|
| s0 | 0,2 | Taştan sayfayı çevirir | — |
| s1 | 1,5–2 | Geçitten kapıya iner, yazıyı kemerin altında yürüyerek okur, kapıda bir söz bırakır, elini Vergilius'a verir | `inf03.gate`; `inf03.c1` (Fear bırakılır ya da Hope mühürlenir) |
| s2 | 1,5–2 | Karanlıkta Vergilius'un elini tutarak yürür, seslerin girdaplarından geçer, Kararsızları sorar, teraziyi görür; koşanlara bakıp geçer ya da birini durdurur | `inf03.ante_inferno`, `inf03.neutrals`, `inf03.contrapasso`; `unlock:heart`; `inf03.c2` |
| s3 | 1,5–2 | Bayrağın ardındaki şeridi iki kez keser, sürülerden kaçar, adacıkta büyük reddin gölgesini görür | `inf03.great_refusal` |
| s4 | 1–1,5 | Irmağı görür, sorar, Stay'i alır, kıyıya kadar susarak yürür | Stay; `inf03.acheron` |
| s5 | 1–1,5 | Kharon'un buyruğu sırasında yerinde durur ya da geri çekilir; Vergilius'un sözünü dinler | `inf03.charon`; `inf03.c3` |
| s6 | 1,5–2 | Kürek darbelerinden kaçarak kalabalıktan çıkar, yaprakları izler, Desire'ı alır | Desire; `inf03.leaves` |
| s7 | 0,5 | Sarsılan kayada Vergilius'un uzattığı ele yürür; kızıl ışık | — |
| s8 | 0,3 | Kolofonu okur | — |

**Kanto boyunca geçerli kurallar**

- **Bayılma yalnızca omurgadadır.** Bu kantoda oynanış (girdaplar, sokmalar, Kharon'un buyruğu, kürek) Resolve'u 1 birimin altına indirmez. 1 birime inen Dante dizlerinin üstüne çöker; Vergilius gelir, onu kaldırır ve Resolve 3 birime döner. Kontrol noktasına dönüş yoktur. Kantonun tek bayılması s7'dedir.
- **Korku ve Fear yükü.** Korku bölgeleri: kapının önü (s1), seslerin girdapları (s2), sokmalar (s3) ve Kharon'un buyruğu (s5). Kapıda umudunu bırakan oyuncu (`inf03.c1=b`) Fear yükünü taşımaya devam eder ve kanto boyunca korku onda %25 daha hızlı işler (§3.4.3). Bu, `inf03.c1`'in kanto boyunca hissedilen mekanik sonucudur. Korkusunu bırakan oyuncuda (`inf03.c1=a`) kapının korku bölgesi o anda söner.
- **Tercetler isteğe bağlıdır.** Oyuncunun elinde (Kanto II'den) Way · Love · Away (Force), Way · Hope · Away (Mend; Hope mühürlü değilse) ve Way · Go · Away (Swift) vardır. s4'te Stay gelince -ay ailesi üç söze çıkar (dış çiftler: Way · Away, Way · Stay, Away · Stay); s6'da Desire ikinci bir Swift ortası olur. Tercetler ruhlara dokunmaz, içlerinden geçer. Force sürüleri dağıtır (s3) ve küreği savuşturur (s6). Hiçbir geçiş tercet gerektirmez.
- **Q.** Her oynanış vuruşunda bir `HINT` vardır; yalnızca s4'ün sessiz yürüyüşünde yoktur.
- **Kalp, güven, erdem.** Terazi s2'de açılır; bu kantoda kalbe hiçbir etki yazılmaz. Güvenin net değişimi −1 ile +2 arasıdır (`inf03.c1=a` +1, `inf03.c2=a` +1, `inf03.c2=b` −1). Fortitude iki yerden büyüyebilir: `inf03.c1=a` ve `inf03.c3=a`.
- **Bayraklar.** Okunanlar: `inf01.motive_gate` (s1), `inf01.motive_souls` (s2). Bayrak yoksa o satırlar hiç oynamaz ve sahne eksiksiz kalır. Codex kayıtları sessizce birikir ve Kanto IV'te görünür (§2.12).
- **M0.** Dikey kesit bu kantoyu atlar. `inf03.left_hope` ve `inf03.asked_neutral` M0'da hiç kalkmaz; IV ve Araf'taki okuyucuları `ELSE` dallarını oynar.

## [inf03.s0] Opening page

### [inf03.s0.b1] Title and epigraph

Kanto II'nin son dizesiyle (II 142) bu sayfa arasında hiçbir geçiş yoktur: şiirde de kapının yazısı habersiz başlar. Bu kantoda açılış sayfasının sağ yaprağı kâğıt değil taştır; epigraf yazılmaz, oyulur. Harfler taştan koyudur (III 10'daki "sombre colour").

```script
@mode: page
@music: Müzik yok. Çok uzaktan, tek ve boğuk bir uğultu; sayfa çevrilince yaklaşır.
DO: Sol sayfa: küçük harflerle "INFERNO", tezhipli büyük harfle "CANTO III", başlık "The Gate" ve 96×64 piksellik siyah-beyaz vinyet: kayaya oyulmuş dev bir kapı, kemerinde okunamayan satırlar, ardında yalnızca karanlık; önünde biri uzun, biri küçük iki figür.
DO: Sağ sayfa kül rengi bir taş dokusundadır. Epigrafın her dizesi taşa çentik çentik oyularak belirir; harfler taştan koyudur.
QUOTE INSCRIPTION (Inferno III, 1–3)
> "Through me the way is to the city dolent;
> Through me the way is to eternal dole;
> Through me the way among the people lost.
GLOSS: Dolent means sorrowful, and dole means grief. It is the gate itself that speaks.
DO: İlk okumada sayfa en az 3 saniye ekranda kalır; sonra sağ altta "[E] Turn ▸" belirir.
SFX: Her dize oyulurken taşın içinden kısa, kuru bir keski vuruşu.
CAM: page-turn
```

## [inf03.s1] The Gate

Kanto II'nin "derin ve yabani yolu" (II 142) burada oynanır: karanlığa inen dar bir kaya geçidi ve dibinde kapı. Yazının ilk üç dizesi kemerin tepesinde, açılış sayfasından taşa geçmiş olarak durur; geri kalanı Dante kemerin altında yürüdükçe okunur. Sahne kantonun ana seçimiyle (`inf03.c1`) ve kantonun ilk eliyle biter. Palet: kül grisi kaya, kaynağı belirsiz soluk bir okra ışık, kemerin altında mutlak siyah.

### [inf03.s1.b1] Down to the Gate

```script
@mode: play
@place: inf03_gorge
@ambience: Geçitte rüzgâr yok. Kendi adımlarının yankısı; aşağıdan, çok uzaktan, insan sesine benzeyen ama insan sesi olmayan bir uğultu.
CAM: unengrave — vinyetteki kapı büyür ve geçidin dibine çekilir; gravürün tarama çizgileri kaya duvarlarına dönüşür, kül grisi ve soluk okra yavaşça sızar
EKLEME: Kapıya inen geçit ve başındaki taş bank şiirde yok; II 142'deki "derin ve yabani yol"un oynanmasıdır. | Dayanak: Inferno II, 142
DO: Akşamın son ışığı geçidin ağzında, yukarıda kalır. Geçidin başında çıplak bir taş bank vardır; Vergilius bir an oturur, Dante yetişince kalkar. {checkpoint}
HINT: The path ends at the gate. Walk down to it; I am beside you.
HINT-SHORT: Down to the gate.
DO: Geçit dar ve dik bir iniştir; Vergilius önde yürür. İndikçe yukarıdaki ışık daralır ve Dante'nin çevresindeki görüş halkası küçülür (darkness). Aşağıdan gelen uğultu her dönemeçte biraz büyür.
NARRATION: The path went down between walls of rock, and the last of the evening stayed behind them.
DO: Son dönemeçten sonra geçit bir kaya duvarıyla biter. Duvarın ortasında kayaya oyulmuş bir kapı durur: ardına kadar açıktır ve kapatacak bir sürgüsü yoktur. Kemerin tepesinde açılış sayfasındaki üç dize okunur. Kemerin altı mutlak siyahtır.
SFX: Kapı görününce uğultu bir an kesilir, sonra geri gelir: şimdi içinde iç çekişler seçilir.
```

### [inf03.s1.b2] The Words over the Gate

Yazı, okumanın taşa dönüşmüş hâlidir (`inscription`). Dizeler Dante kemerin altında yürüdükçe belirir ve son dize oyuncunun Kitap'ındaki sözlere dokunur. Kart animasyonları yalnızca görseldir; sözlerin durumunu seçim (`inf03.c1`) değiştirir.

```script
@mode: play
@place: inf03_gate
@trigger: enter:inf03_gate
@music: Tek, çok alçak bir org notası; yazı bitince kesilir.
EKLEME: Yazının Dante kemerin altında yürüdükçe tercet tercet okunması ve Kitap'taki kartlara dokunması şiirde yok; kapının yazısının oyunlaştırılmasıdır. | Dayanak: Inferno III, 1–12
DO: Dante kemerin altına girince yazı sürer (inscription). Harfler taştan koyudur ve ancak yakından seçilir. Kemer geniştir: Dante bir ayağından öbürüne yürüdükçe satırlar sırayla, tercet tercet belirir. Vergilius eşiğin önünde durur ve bekler.
QUOTE INSCRIPTION (Inferno III, 4–6)
> Justice incited my sublime Creator;
> Created me divine Omnipotence,
> The highest Wisdom and the primal Love.
GLOSS: The gate speaks for itself. It says it was made by God's justice, power, wisdom and love.
DO: Dante kemerin ortasını geçince son tercet belirir. Kontrol kısa bir süre kilitlenir.
QUOTE INSCRIPTION (Inferno III, 7–9)
> Before me there were no created things,
> Only eterne, and I eternal last.
> All hope abandon, ye who enter in!"
GLOSS: Eterne means eternal: only eternal things were made before this gate.
EFFECTS: codex:inf03.gate
DO: Son dizedeki "hope" kelimesi taşta kararır, sanki taşın içine çekilir. Aynı anda Kitap simgesindeki Hope kartı titrer ve soluklaşır; Fear kartının koyu kırmızısı koyulaşır ve kart ağırlaşır. Kartların durumu değişmez.
DO: Kemerin altı bir korku bölgesidir (fear): Dante orada kaldıkça Resolve yavaşça azalır, Fear yüküyle %25 daha hızlı. Bu sahnede Resolve 2 birimin altına inmez.
SFX: Yazı belirirken taşın içinden keskiyle oyulur gibi kısa, kuru vuruşlar. Son dizede tek bir vuruş, ötekilerden derin.
```

### [inf03.s1.b3] What the Gate Asks

Kantonun ana seçimi. Seçimin yerini tutan kanonik dize (III 12) sahnede gösterilmez, karta saklanır (§2.11); yerine Dante'nin modern köprüsü gelir. Vergilius "the ones who stay" derken bir an yazıya bakar: kapının son dizesi Vergilius'un kendisi için de yazılmıştır (IV 42). Bu gerçek Kanto IV'te açılır; burada hiçbir yerde söylenmez. Umudunu bırakan oyuncunun yolunda Vergilius yere bırakılan ışığı tek söz söylemeden alıp pelerinine koyar: IV s2'deki geri verişin (onaylı SAPMA) görsel hazırlığıdır.

```script
@mode: dialogue
QUOTE POET (Inferno III, 10–11)
> These words in sombre colour I beheld
> Written upon the summit of a gate;
GLOSS: Sombre colour: dark letters. The summit: the top of the arch.
DANTE (afraid): Master, what does it want from me?
IF flag:inf01.motive_gate
DANTE (afraid): This is not the gate you promised me.
VIRGIL (gentle): No. Saint Peter's gate is far above us. This one comes first.
END IF
QUOTE VIRGIL (Inferno III, 13–15)
> And he to me, as one experienced:
> "Here all suspicion needs must be abandoned,
> All cowardice must needs be here extinct.
GLOSS: Suspicion is used in an old sense: doubt, wavering, dread.
DO: Vergilius bir an yazıya, son dizeye bakar. Sonra yeniden Dante'ye döner.
VIRGIL (gentle): Those words are for the ones who stay. From you I ask only your fear.
EKLEME: Umudunu bırakan Dante'nin eşiğe bıraktığı ışığı Vergilius'un yerden alıp pelerinine koyması şiirde yok; IV s2'deki geri verişi (onaylı SAPMA) görünür kılar. | Dayanak: Inferno III, 19–21
CHOICE inf03.c1 major "What Dante leaves at the gate"
PROMPT: The gate asked for one thing. His guide asked for another.
OPTION a [Leave your fear at the gate.]
DANTE (firm): Then my fear stays at this door. The rest I keep.
DO: Fear kartı Dante'den kopar ve eşiğin taşına düşer. Koyu kırmızısı solar, taşın rengine döner: korku eşikte kalır. Kemerin altındaki korku bölgesi söner.
EFFECTS: shed:Fear, virtue:fortitude+1, trust+1
DO: Vergilius bir adım yaklaşır.
OPTION b [Leave your hope at the gate.]
DANTE (afraid): The words are cut in stone. I can't argue with stone.
VIRGIL (sad): Then leave it, if you must. But walk with me.
DO: Hope kartı griye döner (mühürlü). Dante'nin avucundan küçük, sıcak bir ışık eşiğin taşına düşer ve orada titrer. Vergilius bir an ona bakar, sonra eğilir, ışığı yerden alır ve tek söz söylemeden pelerininin içine koyar. Fear kartı Dante'de kalır; korku bölgesi sürer.
EFFECTS: seal:Hope, flag:inf03.left_hope
REVEAL canon=a timing=immediate
QUOTE DANTE (Inferno III, 12)
> …"Their sense is, Master, hard to me!"
NOTE: Dante did not give up his hope. He told Virgil the words were hard, and Virgil told him to leave his fear there.
END CHOICE
```

### [inf03.s1.b4] The Good of Intellect

```script
@mode: play
QUOTE VIRGIL (Inferno III, 16–18)
> We to the place have come, where I have told thee
> Thou shalt behold the people dolorous
> Who have foregone the good of intellect."
GLOSS: Readers have long taken the good of intellect to mean God, the truth the mind was made to know.
EKLEME: Elin oyuncunun kendi hareketiyle verilmesi şiirde yok; III 19'daki el bir etkileşim olarak oynanır. | Dayanak: Inferno III, 19–21
HINT: Give me your hand. We go in together.
HINT-SHORT: Your hand.
DO: Vergilius eşiğin üstünde, kemerin karanlığına yarı dönük durur ve elini Dante'ye uzatır. Kontrol oyuncudadır. Dante ona yaklaşınca "[E] Give him your hand" istemi belirir. Oyuncu Vergilius'a gitmeden sahne ilerlemez; Vergilius bekler ve elini indirmez.
```

### [inf03.s1.b5] His Hand on Mine

```script
@mode: cinematic
@trigger: talk:VIRGIL
DO: Dante elini uzatır; Vergilius kendi elini onun elinin üstüne koyar. Vergilius'un portresi bu kantoda ilk ve son kez gülümser.
QUOTE POET (Inferno III, 19–21)
> And after he had laid his hand on mine
> With joyful mien, whence I was comforted,
> He led me in among the secret things.
GLOSS: Mien means face or bearing. The secret things are what is hidden from the living.
IF flag:inf03.left_hope
NARRATION: He went in without hope. Virgil did not let go of his hand.
END IF
DO: İkisi el ele eşikten geçer. Arkalarında kapının ağzı bir süre gri bir dikdörtgen olarak kalır, sonra o da kararır.
CAM: fade-out — kemerin ardındaki karanlık
```

## [inf03.s2] The Air Without a Star

Kapının ardında yıldızsız bir ova vardır. Sahnenin ilk yarısı karanlıkta, Vergilius'un elini tutarak yürünür; sesler girdaplar hâlinde dolaşır. İkinci yarısı alçak bir kaya sırtında, aşağıda koşan gölgelere bakarak geçen bir konuşmadır. Terazi burada, şiirin kendi dizesiyle ve boş olarak açılır (III 50). III 37–44 sahnede yazıyla gösterilmez: meleklerin ve çifte reddin anlatımı Vergilius'un modern sözleriyle gelir, Dante'nin ikinci sorusu modern bir köprüdür; III 40–42 Codex'tedir (`inf03.neutrals`). Palet: neredeyse siyah; kaynağı belirsiz, kül rengi bir alacakaranlık yalnızca yakın zemini seçtirir. Girdapların içinde koyu kum.

### [inf03.s2.b1] Without a Star

```script
@mode: play
@place: inf03_dark_plain
@ambience: Her yönden gelen, yönü seçilmeyen sesler: iç çekişler, yakınmalar, uzun ulumalar; araya karışan el şaklamaları. Müzik yok.
CAM: fade-in — mutlak karanlık; yalnızca iki figürün çevresinde soluk bir halka
EKLEME: El ele yürüyüş şiirde yok; III 19–21'deki elin ve tesellinin oynanmasıdır. | Dayanak: Inferno III, 19–21
DO: Dante Vergilius'un elini tutarak yürür (follow). Vergilius önde ve yavaş yürür; oyuncu yönü kendisi seçer, ama Vergilius'tan bir karodan fazla uzaklaşırsa el bırakılır. El bırakılınca görüş halkası 4 karodan 2 karoya iner ve korku iki kat işler (darkness, fear). Vergilius durur, döner ve elini uzatır; Dante ona varıp E'ye basınca el yeniden tutulur.
HINT: Keep hold of my hand. Walk where I walk.
HINT-SHORT: Hold on. Walk with me.
IF flag:inf03.left_hope
DO: Vergilius'un pelerininin içinden, kapıda yerden aldığı ışık soluk bir sıcaklıkla belli belirsiz parlar. Yalnızca görseldir; görüşü değiştirmez.
END IF
DO: Birkaç adım sonra sesler bütün ovadan aynı anda yükselir. Kontrol kısa bir süre kilitlenir.
QUOTE POET (Inferno III, 22–24)
> There sighs, complaints, and ululations loud
> Resounded through the air without a star,
> Whence I, at the beginning, wept thereat.
GLOSS: Ululations are long howls of grief.
DO: Dante'nin portresi ağlayan (weeping) kipine geçer; yürürken bir eliyle gözlerini siler. Vergilius'un eli onun elini sıkar. Kontrol geri gelir.
EFFECTS: codex:inf03.ante_inferno
VIRGIL (gentle): Keep hold of me. I have walked this road before.
```

### [inf03.s2.b2] Like the Sand

```script
@mode: play
EKLEME: Seslerin ovada girdaplar hâlinde dolaşması ve gezen korku bölgeleri olarak oynanması şiirde yok; III 28–30'daki benzetmenin oyunlaştırılmasıdır. | Dayanak: Inferno III, 25–30
DO: Ova boyunca sesler girdaplar hâlinde dolaşır: her girdap yerden kalkan koyu bir kum bulutu ve içinde birbirine karışan seslerdir. Girdaplar sabit yollar izler; geçecekleri yerde zemin önceden titreşir (fear).
DO: Girdabın içinde kalan Dante'nin Resolve'u azalır: Vergilius'un elini tutuyorsa yarı etkiyle, tutmuyorsa tam etkiyle. Girdap geçerken ekranda okunamayan harf parçaları uçuşur; sesler bir an anlaşılacak gibi olur, ama hiçbir söz seçilmez.
HINT: The voices move in rings. Let one pass over us, then walk.
HINT-SHORT: Let it pass. Then walk.
DO: İlk girdap ikisinin üstünden geçerken kontrol kilitlenir.
QUOTE POET (Inferno III, 25–30)
> Languages diverse, horrible dialects,
> Accents of anger, words of agony,
> And voices high and hoarse, with sound of hands,
> Made up a tumult that goes whirling on
> For ever in that air for ever black,
> Even as the sand doth, when the whirlwind breathes.
GLOSS: With sound of hands: the souls strike their hands together, or against themselves, as they cry.
DO: Kontrol geri gelir. Ovanın öbür ucunda, karanlıktan bir ton açık, alçak bir kaya sırtı seçilir. Vergilius oraya yürür.
SFX: Girdap yaklaşırken bütün sesler aynı noktaya toplanır ve uğultu bir kum fırtınası gibi kabarır; geçince arkada yalnız iç çekişler kalır.
```

### [inf03.s2.b3] What Folk Is This

Kararsızlarla ilgili bütün bilgi bu sırtta, güvenli bir yerde verilir. Aşağıda koşanlar görünür ama seçilmez; bayrak henüz görünmez (III 52 `inf03.c2`'nin kartındadır).

```script
@mode: dialogue
@place: inf03_ridge
@trigger: enter:inf03_ridge
DO: Alçak sırtın üstünde ses bir parça azalır; ikisi burada durur. Aşağıda, alacakaranlığın içinde sayısız gölge bir yöne doğru koşar. Ne yüzleri seçilir ne neyin ardından koştukları. Vergilius Dante'nin elini bırakır. {checkpoint}
QUOTE DANTE (Inferno III, 31–33)
> And I, who had my head with horror bound,
> Said: "Master, what is this which now I hear?
> What folk is this, which seems by pain so vanquished?"
QUOTE VIRGIL (Inferno III, 34–36)
> And he to me: "This miserable mode
> Maintain the melancholy souls of those
> Who lived withouten infamy or praise.
GLOSS: Withouten is an old form of without. They lived so that no one could blame them, and no one could praise them.
EFFECTS: codex:inf03.neutrals
VIRGIL (quiet): Angels run with them. When Heaven was at war, those angels kept out of it. They were for no one but themselves.
VIRGIL (quiet): Heaven cast them out to keep its beauty. The deep will not take them either, or the damned would have someone to look down on.
IF flag:inf01.motive_souls
VIRGIL (quiet): You asked to see the lost. These are not even that.
END IF
```

### [inf03.s2.b4] Misericord and Justice

```script
@mode: dialogue
DANTE (sad): Master, what weighs on them so? I have never heard anyone cry like that.
QUOTE VIRGIL (Inferno III, 45–48)
> He answered: "I will tell thee very briefly.
> These have no longer any hope of death;
> And this blind life of theirs is so debased,
> They envious are of every other fate.
GLOSS: Debased means brought low. Every other fate includes the torments of Hell itself.
DO: Bir sonraki dize balonunda ikinci dize (III 50) belirdiği anda HUD'da, Resolve ve Grace'in yanında küçük bir terazi belirir. İki kefesi de boştur, kirişi dümdüzdür. Kayıt aşağıdaki EFFECTS ile yapılır; bu satır yalnızca zamanlamayı söyler.
QUOTE VIRGIL (Inferno III, 49–51)
> No fame of them the world permits to be;
> Misericord and Justice both disdain them.
> Let us not speak of them, but look, and pass."
GLOSS: Misericord is an old word for mercy. Neither mercy nor justice will have these souls.
EFFECTS: unlock:heart
DO: Aşağıdan koşanlar geçer; terazi kıpırdamaz. Kefelerin biri gözyaşı, öbürü kefe biçimli küçük bir işaret taşır (§1.6); ikisi de boştur. Terazinin ilk görünüşünde hiçbir açıklama ya da arayüz istemi yoktur.
```

### [inf03.s2.b5] Look, and Pass

Kararsızlar için tek seçim. İki seçenek de Dante'nin karakteri içindedir: Vergilius'un öğüdüne uymak ya da bir şairin acımasıyla (ve biraz da kibriyle) bir Kararsız'a, dünyanın tutmadığı adını sormak. Soran oyuncu cevap alamaz; ama bayrağı (`inf03.asked_neutral`) Araf XVIII'de karşılık bulur: koşan tembeller onun için bir kez yavaşlar. Seçimden sonra her iki yolda da kart gelir; kartın dizesi (III 52) s3'ün ilk dizesine (III 53) köprü olur.

```script
@mode: dialogue
DO: Koşanlardan biri sırtın dibinden, Dante'ye bir kol mesafesi kadar yakından geçer. Yüzü öbür yana dönüktür.
CHOICE inf03.c2 minor "The runners"
PROMPT: The runners went by close enough to touch. Not one of them looked up.
OPTION a [Look, and walk on.]
DO: Dante Vergilius'un yanında kalır. Bakışını koşanlardan kaldırır ve uzağa, karanlığın ortasına bakar: orada bir şey dönmekte, koşmaktadır. Vergilius bir adım yaklaşır.
EFFECTS: trust+1
OPTION b [Stop one of them. Ask his name.]
DO: Dante sırttan aşağı, koşanların akışına iner. Kamera onu izler. Bir ruha yetişir ve yanında koşar; ruhun yüzü hep öbür yana dönüktür.
DANTE: Wait. Tell me your name. I will write it where the living can read it.
DO: Ruh durmaz, başını çevirmez, tek bir söz söylemez. Onu izleyen sürü Dante'yi de sarar; sokmalar ekranın kenarlarını bir an karartır. Kitap simgesinden boş bir anı kartı yükselir: adın yazılacağı satır boştur. Kart bir an parlar ve söner. HUD'daki terazinin kirişi titrer, sonra boş ve düz hâline döner.
EFFECTS: trust-1, resolve-1, flag:inf03.asked_neutral
DO: Dante sırta geri tırmanır. Vergilius onu bekler, ama eskisinden bir adım uzakta durur.
VIRGIL (sad): Come back to me. Not even a poet can give them a name.
REVEAL canon=a timing=immediate
QUOTE POET (Inferno III, 52)
> And I, who looked again, beheld a banner,
NOTE: Dante said nothing to them. He looked, as Virgil told him, and saw the banner.
END CHOICE
EFFECTS: codex:inf03.contrapasso
DO: Karanlığın ortasında dönen şey artık seçilir: soluk bir bayrak. Vergilius sırttan ovaya iner.
```

## [inf03.s3] The Banner

Kararsızların cezası oynanışa döner (`crowd_flow`, `swarm`; onaylı EKLEME). Dante ovayı kuzeyden güneye geçmek zorundadır ve bayrağın ardındaki şerit ovayı iki kez keser: önce dış kol, ortada bir taş adacık, sonra iç kol. Şeridin içine dalmak Dante'yi sürükler; geçit yalnızca bayrak döndüğünde, bükümde açılır. Büyük reddin gölgesi adacıkta, bir kol mesafesinden geçer; adı söylenmez. Kan ve kurtçuklar piksel ölçeğinde, kırmızı kullanılmadan, üslupla verilir. III 52 `inf03.c2`'nin kartındadır; sahne III 53'ten devam eder. Palet: kül grisi ova, soluk ve armasız bir bayrak, şeridin üstünde titreşen koyu sürü bulutları.

### [inf03.s3.b1] So Long a Train

```script
@mode: play
@trigger: enter:inf03_plain_north
@ambience: Binlerce çıplak ayağın kumda çıkardığı kesintisiz bir gürültü; üstünde dalga dalga kabarıp sönen bir vızıltı.
EKLEME: Bayrağın ardındaki şeridin geçilmesi ve arı sürüleri şiirde yok; Kararsızların cezasının oynanışa çevrilmesidir (onaylı). | Dayanak: Inferno III, 52–69
DO: Sırtın eteğinden ova açılır. Ovanın ortasında soluk, rengi seçilmeyen, üstünde hiçbir arma olmayan bir bayrak döner ve koşar. Kimin taşıdığı seçilmez.
CAM: pan — bayraktan geriye, ucu görünmeyen bir insan şeridi boyunca
QUOTE POET (Inferno III, 53–57)
> Which, whirling round, ran on so rapidly,
> That of all pause it seemed to me indignant;
> And after it there came so long a train
> Of people, that I ne'er would have believed
> That ever Death so many had undone.
GLOSS: Of all pause indignant: the banner seemed to scorn every rest. Undone: destroyed.
CAM: follow — Dante
NARRATION: When the banner swung about, the line swung after it, and at the bend it thinned for a moment.
HINT: Watch the banner. When it turns, the line thins at the bend. Cross there.
HINT-SHORT: Cross at the bend.
BARK NEUTRAL: —this way—
BARK NEUTRAL: —no— that way—
BARK VIRGIL: Watch the banner, not the crowd.
DO: Şerit (crowd_flow) bayrağın çizdiği yolu izler ve ovayı iki kez keser. Bayrak birkaç saniyede bir keskin bir dönüş yapar {event:inf03.banner_turned}; şerit dönüş noktasında bükülür. Büküm boyunca birkaç saniye şeridin iç yanında koşucular sıklaşır, dış yanında seyrelir: geçit orada açılır.
DO: Şeride giren Dante koşuculara çarpar ve akışın yönünde 3–4 karo sürüklenir. Atılma (dash), kısa dokunulmazlığıyla seyrek bir yerden geçirir. Ruhlar Dante'ye bakmaz, ona yol da açmaz. Vergilius şeridin içinden yürür; koşucular onun çevresinden, taşın çevresinden akan su gibi ayrılır.
DO: Arı ve at sineği sürüleri (swarm) şeridin üstünde, koşucularla birlikte gider. Bazı sürüler şeritten kopar ve ovada yavaşça salınır; gölgeleri yerde önceden görünür. Sokma Resolve'dan küçük bir pay alır ve kısa bir korku nabzı verir (ekranın kenarı kararır). Fear yükünü taşıyan Dante'de nabız daha uzun sürer.
DO: Tercetler (varsa): Force bir sürüyü birkaç saniye dağıtır; tercet ruhlara dokunmaz, içlerinden geçer. Swift dış kolu tek atılışta geçirir. Mend, Hope mühürlü değilse, Resolve'u onarır.
SFX: Bayrak her döndüğünde şeridin gürültüsü bir an kesilir ve yeni yönde yeniden başlar.
```

### [inf03.s3.b2] The Great Refusal

```script
@mode: play
@place: inf03_island
@trigger: enter:inf03_island
EKLEME: Büyük reddin gölgesinin Dante'nin bir kol mesafesinden geçmesi ve başını çevirecek gibi olup çevirmemesi şiirde yok; III 58–60'taki tanımanın sahnelenmesidir. | Dayanak: Inferno III, 58–60
DO: Ovanın ortasında yarım halka hâlinde iri taşlar: şerit bu adacığın çevresinden akar, sürüler taşların üstüne inmez. Vergilius taşların arasında bekler. {checkpoint}
DO: Bayrak adacığın çevresinde dar bir döngü çizer; şerit taşların hemen dibinden geçer. Koşan yüzler birer birer seçilir hâle gelir; bazılarını Dante tanır. Kontrol kilitlenir.
CAM: zoom-in — yüzlerden biri: yaşlı, uzun boylu bir gölge, öbürlerinden bir an daha yavaş geçer
QUOTE POET (Inferno III, 58–60)
> When some among them I had recognised,
> I looked, and I beheld the shade of him
> Who made through cowardice the great refusal.
GLOSS: Who made the great refusal, the poem never says. Readers have argued over his name for seven hundred years.
EFFECTS: codex:inf03.great_refusal
DO: Gölge başını Dante'ye çevirecek gibi olur; çevirmez. Şerit onu alıp götürür.
NARRATION: Dante knew the face. He did not say the name, then or ever.
QUOTE POET (Inferno III, 61–63)
> Forthwith I comprehended, and was certain,
> That this the sect was of the caitiff wretches
> Hateful to God and to his enemies.
GLOSS: Caitiff means wretched and base. God's enemies are the devils: even they despise these souls.
CAM: zoom-out
DO: Kontrol geri gelir. Şeridin ikinci, iç kolu adacığın güneyinden akar.
```

### [inf03.s3.b3] Stung Exceedingly

```script
@mode: play
HINT: The swarms ride above the runners. Wait for the bend, then go fast.
HINT-SHORT: Wait for the bend. Then go.
BARK NEUTRAL: —wait— wait—
BARK NEUTRAL: —don't stop—
DO: İç kol daha sıktır ve üstündeki sürüler daha kalabalıktır. Bayrak burada daha sık döner; bükümler daha kısa açık kalır. Sürülerden biri şeritten kopar ve Dante'nin yolunu kesen bir yay çizer.
DO: Resolve 1 birime inerse Dante dizlerinin üstüne çöker. Vergilius gelir ve onu kaldırır; Resolve 3 birime döner ve Dante bulunduğu yerden devam eder.
SFX: Sokmalarda kısa, tiz bir vızıltı ve Dante'nin kesilen nefesi. Kalabalığın gürültüsünde tek bir söz seçilmez.
```

### [inf03.s3.b4] At Their Feet

```script
@mode: cinematic
@place: inf03_plain_edge
@trigger: enter:inf03_plain_edge
DO: Dante ovanın güney kenarındaki alçak bir sete çıkar ve döner. Şerit aşağıda akmaya devam eder. Vergilius yanına gelir.
CAM: pan — şeridin üstünden, yakından: çıplak sırtlar, savrulan kollar, sürüler
QUOTE POET (Inferno III, 64–66)
> These miscreants, who never were alive,
> Were naked, and were stung exceedingly
> By gadflies and by hornets that were there.
GLOSS: Miscreants: wretches. Readers take never were alive to mean they never truly lived, because they never chose.
DO: Görüntü piksel ölçeğinde ve üsluplu kalır: yüzlerden koyu damlalar düşer; koşucuların ayak izlerinde zemin ince, kıpırdayan bir dokuyla kaynar. Kırmızı kullanılmaz: damlalar da doku da zeminle aynı koyu tondadır.
QUOTE POET (Inferno III, 67–69)
> These did their faces irrigate with blood,
> Which, with their tears commingled, at their feet
> By the disgusting worms was gathered up.
CAM: zoom-out — şerit bayrağın ardından karanlığa döner
SFX: Vızıltı uzaklaşır. Arkada yalnızca ayak sesleri kalır.
```

## [inf03.s4] The Shore

Kantonun ilk sözü burada, bir soru ve ertelenmiş bir cevaptan gelir. Dante, Vergilius'un önüne geçecek kadar hevesle sorar; Vergilius cevabı kıyıya bırakır (III 76–78). Ardından şiirin en insani anlarından biri: Dante utanır ve ırmağa kadar susar (III 79–81). Bu yürüyüşte `HINT` yoktur; Q tuşu da, ruhlara E ile seslenmek de sessizdir. Kitabın kenar boşluğu da susar: III 79–81'in `GLOSS` notu yoktur. Palet: kül grisi yamaç, aşağıda geniş ve kara bir ırmak; kıyıda, suya dönük, kıpırtısız bir kalabalık.

### [inf03.s4.b1] A Great River's Bank

```script
@mode: play
@trigger: enter:inf03_rise
@ambience: Arkada kalabalığın uğultusu söner. Önde, çok geniş ve çok alçak bir su sesi.
DO: Setin ardında zemin yükselir. Dante tepeye varınca aşağıda, yamacın dibinde geniş ve kara bir ırmak görünür. Kıyısında sayısız insan suya dönük bekler.
CAM: pan — yamaçtan aşağı, ırmağa ve kıyıdaki kalabalığa
QUOTE POET (Inferno III, 70–71)
> And when to gazing farther I betook me.
> People I saw on a great river's bank;
GLOSS: Betook me: turned myself. Dante looked past the runners, farther off.
DO: Dante yamaçtan aşağı birkaç adım koşar, Vergilius'un önüne geçer ve kıyıyı gösterir.
```

### [inf03.s4.b2] These Things Shall All Be Known

Stay, kantonun ilk sözüdür ve bir ertelemeden gelir: cevap, "adımlarımız durunca" verilecektir. Söz kartının köken dizesi, oyuncuya s6'da tutulacak bir sözü hatırlatır.

```script
@mode: dialogue
QUOTE DANTE (Inferno III, 72–75)
> …"Master, now vouchsafe to me,
> That I may know who these are, and what law
> Makes them appear so ready to pass over,
> As I discern athwart the dusky light."
GLOSS: Vouchsafe means grant. Athwart the dusky light: through the dim light.
DO: Bir sonraki dize balonunda "stay" kelimesi parlar ve "[E] Take the word" istemi belirir.
QUOTE VIRGIL (Inferno III, 76–78)
> And he to me: "These things shall all be known
> To thee, as soon as we our footsteps stay
> Upon the dismal shore of Acheron."
GLOSS: Acheron is a river of the dead in the old Greek and Roman poets. Here it is the first river of Hell.
EFFECTS: word:Stay
DO: Stay kartı kitap simgesine uçar. Words sekmesinde -ay ailesi üç söze çıkar; dış yuvalar için iki yeni çift (Way · Stay, Away · Stay) açılır.
EFFECTS: codex:inf03.acheron
DO: Vergilius Dante'yi geçer ve yamaçtan aşağı yürümeye devam eder. Başka bir şey söylemez.
```

### [inf03.s4.b3] Eyes Cast Down

```script
@mode: play
EKLEME: Sessiz yürüyüşte Q'nun ve seslenmenin susması şiirde yok; III 79–81'deki utancın ve susmanın oynanmasıdır. | Dayanak: Inferno III, 79–81
DO: Dante'nin portresi utangaç (ashamed) kipine geçer.
QUOTE POET (Inferno III, 79–81)
> Then with mine eyes ashamed and downward cast,
> Fearing my words might irksome be to him,
> From speech refrained I till we reached the river.
DO: Sessiz yürüyüş. Dante'nin yürüyüşü yavaştır, başı öne eğiktir; kamera alçalır. Vergilius bir adım önde yürür ve bir kez bile dönmez.
DO: Bu sahnede HINT yoktur; s3'ün ipucu sahne başında silinir. Oyuncu Q'ya basarsa Dante başını kaldırır, Vergilius'un sırtına bakar ve yeniden indirir; kenar boşluğu açılmaz. Kıyıya yaklaştıkça bekleyen ruhların arasından geçilir; birine E ile seslenmek de aynı şeyi yapar: Dante ağzını açar ve kapatır.
BARK SOUL: —is it coming?—
BARK SOUL: —let me through—
SFX: Yürüyüş boyunca yalnızca iki çift ayak sesi ve suyun alçak sesi.
```

### [inf03.s4.b4] The Dismal Shore

```script
@mode: cinematic
@place: inf03_shore
@trigger: enter:inf03_shore
DO: Kıyıda, suyun bir adım gerisinde, alçak bir kaya vardır. Vergilius onun yanında durur. Dante de durur. Ayak sesleri kesilir. {checkpoint}
NARRATION: The river was wide and black. Every face on its bank was turned toward the water.
CAM: hold — ikisi kalabalığın kenarında, suya bakarken
```

## [inf03.s5] Charon

Cehennem'in ilk bekçisi. Kharon yalnızca Longfellow konuşur ve bağırarak. Sahne üç anlıdır: geliş (sinematik), buyruk (oynanış: `hold_ground`, `inf03.c3`) ve Vergilius'un sözü. Sistemik seçim ölçtüğü buyruktan sonra, sahnenin sonunda çözülür; böylece kartı (III 90) Kharon susturulduktan sonra, karşılaşmanın özeti olarak açılır. Bu sahneden kantonun sonuna kadar Dante tek bir modern söz söylemez; şiirde de III 79–81'den sonra konuşmaz. Dante kayığa binmez (§6.7). Palet: kara su, kül grisi kıyı; Kharon'un gözlerinin çevresinde iki küçük alev çarkı, sahnenin tek sıcak rengi.

### [inf03.s5.b1] Hoary with the Hair of Eld

```script
@mode: cinematic
@place: inf03_shore
@music: Suyun üstünden düzenli ve ağır kürek vuruşları; her vuruşta biraz daha yakın.
DO: Karanlık suyun üstünde iki küçük ateş halkası belirir ve yaklaşır. Sonra kayığın burnu, sonra kürek, sonra kayığı süren yaşlı adam: ak saçlı, ak sakallı, çıplak kollarında yaşına uymayan bir güç.
CAM: zoom-in — suyun üstünden yaklaşan iki alev halkası
QUOTE POET (Inferno III, 82–83)
> And lo! towards us coming in a boat
> An old man, hoary with the hair of eld,
GLOSS: Hoary: white with age. Eld is an old word for old age.
QUOTE CHARON (Inferno III, 84–87)
> …"Woe unto you, ye souls depraved!
> Hope nevermore to look upon the heavens;
> I come to lead you to the other shore,
> To the eternal shades in heat and frost.
GLOSS: In heat and frost: Hell holds both fire and ice, as Dante will see.
DO: "Hope nevermore" dizesi belirirken Kitap simgesindeki Hope kartı titrer: mühürlüyse gri, değilse soluk altın. Kıyıdaki kalabalık tek bir beden gibi irkilir.
SFX: Kharon'un sesi bir insan sesi değil, suyun üstünden yuvarlanan bir gök gürültüsüdür.
```

### [inf03.s5.b2] Living Soul

```script
@mode: play
EKLEME: Kharon'un buyruğunun bir korku dalgası olarak oynanması ve Dante'nin geri çekilip çekilmediğinin ölçülmesi şiirde yok; III 88–90'daki karşılaşmanın oyunlaştırılmasıdır. | Dayanak: Inferno III, 88–90
DO: Kayık kıyıya dayanır. Kharon'un alev çarkları ölülerin üstünden geçer ve Dante'de durur. Ölüler Dante'nin çevresinden bir adım çekilir; Dante kıyıda, boş bir halkanın ortasında yalnız kalır. Kontrol açıktır.
HINT: He shouts at every soul he carries. Let him shout.
HINT-SHORT: Let him shout.
QUOTE CHARON (Inferno III, 88–89)
> And thou, that yonder standest, living soul,
> Withdraw thee from these people, who are dead!"
DO: Buyruk dize balonunda belirirken kontrol kilitlenmez. Kharon'un sesi kıyıya bir korku dalgası gibi çarpar (guardian, hold_ground, fear): ekranın kenarları içe kapanır ve Dante'nin bir ayağı geri kayar, ama oyuncu girdi vermedikçe adım atılmaz. Dalga balon açıkken ve ardından dört saniye sürer.
DO: Kural hiçbir yerde yazılmaz. Dalga boyunca sudan uzaklaşan yönde bir karodan fazla yürümeyen ve o yöne atılmayan oyuncu için {event:inf03.held_before_charon} yayılır. Yerinde duran ya da suya doğru yürüyen Dante korkuyu yarı etkiyle, geri çekilen Dante tam etkiyle yaşar.
SFX: Buyruk boyunca su, Dante'nin ayaklarının önünden geri çekilir.
```

### [inf03.s5.b3] By Other Ports

```script
@mode: dialogue
DO: Kontrol kilitlenir. Kharon küreğini kaldırır ve onunla Dante'yi değil, karanlığın başka bir yönünü gösterir.
QUOTE CHARON (Inferno III, 91–93)
> He said: "By other ways, by other ports
> Thou to the shore shalt come, not here, for passage;
> A lighter vessel needs must carry thee."
GLOSS: Charon will not carry a living man. Readers often hear in the lighter vessel the angel's boat that brings saved souls to Purgatory.
DO: Dante'nin portresi korkmuş (afraid) kipindedir. Dante Vergilius'a bakar.
```

### [inf03.s5.b4] It Is So Willed

Vergilius'un bekçilere söylediği formül burada ilk kez duyulur. Kanto V'te Minos'a aynı formülü söyleyecektir, ama Longfellow orada son dizeyi başka çevirir (§6.6); bu dize kendi kantosundan kopyalanmıştır.

```script
@mode: cinematic
DO: Vergilius Dante'nin önüne geçer. Sesini yükseltmez; dize balonu Kharon'unkinden küçüktür.
QUOTE VIRGIL (Inferno III, 94–96)
> And unto him the Guide: "Vex thee not, Charon;
> It is so willed there where is power to do
> That which is willed; and farther question not."
GLOSS: The place where power and will are one is Heaven. Vex means trouble: Charon need not trouble himself.
CAM: zoom-in — Kharon'un yüzü
QUOTE POET (Inferno III, 97–99)
> Thereat were quieted the fleecy cheeks
> Of him the ferryman of the livid fen,
> Who round about his eyes had wheels of flame.
GLOSS: Fleecy cheeks: his white-bearded face. The livid fen: the leaden, marshy river.
EFFECTS: codex:inf03.charon
DO: Kharon Dante'den yüzünü çevirir. Bundan sonra onu görmez: küreği de bakışı da yalnızca ölüler içindir.
CHOICE inf03.c3 minor systemic "Before Charon"
OPTION a [Did not withdraw] when: event:inf03.held_before_charon
EFFECTS: virtue:fortitude+1
OPTION b [Stepped back] when: else
REVEAL canon=a timing=immediate
QUOTE POET (Inferno III, 90)
> But when he saw that I did not withdraw,
NOTE: Dante stood his ground. Charon refused him all the same, until Virgil spoke.
END CHOICE
```

## [inf03.s6] The Leaves

Kharon'un ölülere söylediği sözler (III 84–87) şimdi yerine ulaşır. Ruhların küfrü (III 103–105) sahnede yazıyla gösterilmez, yalnızca duyulur: tek bir sözü seçilmeyen, bin dilli bir uğultu. Şiirin bu dizeleri kolofondan sonra Kitap'taki tam kantoda durur. Kürek darbeleri onaylı eklemedir; Kharon Dante'yi hedef almaz, Dante yalnızca hep "geride kalan"dır, çünkü kayığa binmeyecektir. Sahne bir gravürle ve Vergilius'un tuttuğu sözle biter. Palet: kara su, kül grisi kıyı; gravürde mürekkep ve kâğıt.

### [inf03.s6.b1] Whoever Lags Behind

```script
@mode: play
@ambience: Kıyıda bekleyenlerin nefesleri; kayığın tahtalarına çarpan su.
DO: Kıyıdaki kalabalığın yüzleri birden solar. Kalabalık kabarır ve Dante'yi kıyının ortasına sürükler; Vergilius kıyının kenarındaki alçak kayaya çıkar.
QUOTE POET (Inferno III, 100–102)
> But all those souls who weary were and naked
> Their colour changed and gnashed their teeth together,
> As soon as they had heard those cruel words.
SFX: Bin dilde yükselen bir uğultu: küfür, ama tek bir sözü seçilmez. Diş gıcırtıları. Uğultu birden hıçkırığa döner.
QUOTE POET (Inferno III, 106–108)
> Thereafter all together they drew back,
> Bitterly weeping, to the accursed shore,
> Which waiteth every man who fears not God.
CAM: zoom-out — kıyının tamamı: kayık, kalabalık ve kalabalığın yanında, alçak bir kayanın üstünde Vergilius
QUOTE POET (Inferno III, 109–111)
> Charon the demon, with the eyes of glede,
> Beckoning to them, collects them all together,
> Beats with his oar whoever lags behind.
GLOSS: Glede is an old word for a live coal. Charon's eyes glow like embers.
EKLEME: Kürek darbelerinden kaçınma şiirde yok; III 111'in oynanmasıdır (onaylı). | Dayanak: Inferno III, 109–111
HINT: His oar falls on whoever is last. Get out of the crowd and up onto the rock.
HINT-SHORT: Out of the crowd. Up to me.
BARK SOUL: —now, now—
BARK VIRGIL: Up here. Out of his reach.
DO: Kalabalık kayığa doğru akar (crowd_flow). Dante bu akışın ortasındadır ve kayığa binemez; Vergilius'un beklediği kayaya ulaşmak için akışın içinden yana doğru ilerler. {checkpoint}
DO: Kürek (guardian): Kharon küreğini kalabalığın arkasına, geride kalanların üstüne indirir. Her darbeden önce yerde küreğin uzun gölgesi belirir (yaklaşık bir saniye). Akışa karşı ya da yana yürüyen Dante hep geride kalandır: gölgenin altından çıkmazsa kürek ona da iner. Darbe 1 birim Resolve alır ve Dante'yi iki karo savurur. Kharon'un hedefi Dante değildir; onu görmez bile.
DO: Force tercet inen küreğe isabet ederse kürek geri seker ve o darbe boşa gider; Kharon'un alev çarkları bir an parlar, ama dönüp bakmaz. Swift tercet akışın içinden yana uzun bir atılış verir.
SFX: Küreğin havayı yaran sesi; darbeler boğuk ve kısadır.
```

### [inf03.s6.b2] As the Leaves

```script
@mode: cinematic
@place: inf03_virgil_rock
@trigger: enter:inf03_virgil_rock
DO: Dante kayanın üstüne, Vergilius'un yanına çıkar. Kontrol kilitlenir. Aşağıda Kharon eliyle işaret eder; ruhlar birer birer kıyıdan kayığa atlar.
EKLEME: Ruhların yaprağa dönüşmesi bir gravür olarak gösterilir; III 112–117'deki benzetmenin görselleştirilmesidir. | Dayanak: Inferno III, 112–117
CAM: engrave — renkli sahne bir Doré gravürüne döner: kıyının yerinde kara suyun üstüne eğilmiş çıplak bir dal; ruhların yerinde birer birer kopup suya düşen yapraklar
QUOTE POET (Inferno III, 112–117)
> As in the autumn-time the leaves fall off,
> First one and then another, till the branch
> Unto the earth surrenders all its spoils;
> In similar wise the evil seed of Adam
> Throw themselves from that margin one by one,
> At signals, as a bird unto its lure.
GLOSS: A lure is the falconer's decoy: at the signal, the trained bird flies to it. The souls leap the same way.
EFFECTS: codex:inf03.leaves
CAM: unengrave — dalın son yaprağı düşerken renk geri gelir; kayık doludur
QUOTE POET (Inferno III, 118–120)
> So they depart across the dusky wave,
> And ere upon the other side they land,
> Again on this side a new troop assembles.
DO: Kayık karanlığa çekilir ve kaybolur. Kıyı bir an boş kalır; sonra yamaçtan, karanlıktan yeni yüzler iner ve suya dönük durur.
```

### [inf03.s6.b3] My Son

Vergilius s4'te verdiği sözü tutar. Desire, Stay'in cevabıdır: soru "adımlarımız durunca" diye ertelenmişti, cevap kıyıda gelir. Umudunu kapıda bırakan oyuncu için Fear kartı bir an titrer ve dönüşmez: Dante o ruhlardan biri değildir. Bunu III 127–129 söyler; oyun söylemez.

```script
@mode: dialogue
DO: Vergilius Dante'ye döner.
VIRGIL (gentle): You asked me on the slope who they were. Now we stand on the shore.
DO: Bir sonraki dize balonunun son dizesinde "desire" kelimesi parlar ve "[E] Take the word" istemi belirir.
QUOTE VIRGIL (Inferno III, 121–126)
> "My son," the courteous Master said to me,
> "All those who perish in the wrath of God
> Here meet together out of every land;
> And ready are they to pass o'er the river,
> Because celestial Justice spurs them on,
> So that their fear is turned into desire.
GLOSS: It is not only Charon who drives them. Divine justice spurs them from within, until they long for what they dread.
EFFECTS: word:Desire
DO: Desire kartı kitap simgesine uçar. Words sekmesinde Desire, Go'nun yanına ikinci bir Swift ortası olarak yerleşir; -ire ailesi henüz tek sözlüdür.
IF flag:inf03.left_hope
DO: Desire kartı uçarken Dante'nin taşıdığı Fear kartı bir an titrer. Dönüşmez.
END IF
QUOTE VIRGIL (Inferno III, 127–129)
> This way there never passes a good soul;
> And hence if Charon doth complain of thee,
> Well mayst thou know now what his speech imports."
GLOSS: Charon's anger was good news: no good soul ever crosses here, so a soul he refuses is not one of the damned.
```

## [inf03.s7] The Quake

Vergilius'un sözü biter bitmez toprak sarsılır. Sahne kısa ve sözsüzdür: iki tercet ve bir ışık. Oyuncu son kez yürür, sarsılan kayada Vergilius'un uzattığı ele doğru. Kızıl ışık iki elin buluşup buluşmadığını göstermez; şiir de Akheron'un nasıl geçildiğini söylemez (GDD §12, 9. soru: bayılmanın içinde rüya kayık sahnesi yazılmadı). Kantonun son dizesi (III 136) burada yaşanır, kolofonda okunur.

### [inf03.s7.b1] The Dusk Champaign Trembled

```script
@mode: play
@music: Müzik yok.
SFX: Yerin altından, uzaktan gelen ve hızla büyüyen bir deprem gürültüsü.
CAM: shake — önce hafif, sonra şiddetli
QUOTE POET (Inferno III, 130–132)
> This being finished, all the dusk champaign
> Trembled so violently, that of that terror
> The recollection bathes me still with sweat.
GLOSS: Champaign is open, level country.
EKLEME: Depremde Vergilius'un elini uzatması ve Dante'nin ona doğru yürümesi şiirde yok; kantonun ilk elinin (III 19) yankısıdır. | Dayanak: Inferno III, 19–21 ve 130–135
HINT: Come to me.
HINT-SHORT: To me.
DO: Kontrol açıktır (quake). Kaya ve kıyı dalga dalga kalkar; zemin yarılır, yarıklardan kül rengi toz fışkırır. Dante'nin yürüyüşü ağırlaşır ve sık sık sendeler; atılma kullanılamaz. Vergilius dört karo ötede, kayanın öbür ucunda, sarsıntıya rağmen dimdik durur ve elini Dante'ye uzatır.
DO: Dante Vergilius'a bir karo kalana kadar yaklaşınca ya da 12 saniye geçince {event:inf03.reached_for_hand} yayılır.
```

### [inf03.s7.b2] A Vermilion Light

```script
@mode: cinematic
@trigger: event:inf03.reached_for_hand
SFX: Gözyaşı toprağından bir rüzgâr patlar; bütün sesler onun içinde boğulur.
QUOTE POET (Inferno III, 133–135)
> The land of tears gave forth a blast of wind,
> And fulminated a vermilion light,
> Which overmastered in me every sense,
GLOSS: Fulminated: flashed out like lightning. Vermilion is a bright red.
DO: Dante'nin eli Vergilius'un eline uzanır. İki el arasındaki boşluk bir parmak kalınlığına iner; tam o anda kızıl ışık her şeyi kaplar. Ellerin buluşup buluşmadığı görünmez.
CAM: white-out — kızıl; ışık ekranı doldurur ve bir an orada kalır
DO: Kızılın içinde Dante'nin silueti, uykuya yenik düşen biri gibi yavaşça yere iner (faint).
CAM: fade-out — kızıldan siyaha
CAM: page-turn
```

## [inf03.s8] Colophon

### [inf03.s8.b1] In this canto

Kitap yeniden açılır. Sol sayfada kantonun son dizesi tek başına durur; oyuncu bu düşüşü bir an önce yaşamıştır.

Sağ sayfa ("In this canto"): üç seçim, oyuncunun kaydı ve Dante'ninki yan yana. Üç kart (`inf03.c1`, `inf03.c2`, `inf03.c3`) sahnede açılmıştır; oyuncunun ayarı "At the end of the canto" ise burada açılır. İki söz köken dizeleriyle yan yana durur, kantonun sorusu ve cevabı gibi: Stay (III 77) ve Desire (III 126). Codex kayıtları Kanto IV'e kadar kapalı sayfalar olarak sayılır (öneri: "8 pages, not yet read"). Terazi bir kolofonda ilk kez yer alır: iki kefesi de boştur ve altında yalnızca III 50'nin atfı durur. `inf03.c2=b` seçen oyuncu için boş anı kartı burada görünmez; geriye bayraktan başka bir şey kalmaz (§3.5).

Kantonun tam Longfellow metni Cantos sekmesine eklenir. Oyunda yazıyla görülmeyen dizeler (III 37–44, 103–105) burada işaretsiz durur; kartlardaki dizeler (III 12, 52, 90) görülmüş sayılır. "Turn the page" ile Kanto IV'e geçilir; IV'ün epigrafı uyanıştır (IV 1–3).

```script
@mode: colophon
QUOTE POET (Inferno III, 136)
> And as a man whom sleep hath seized I fell.
```

## Codex

Kanto III'ün sekiz kaydı sessizce birikir ve Kanto IV'te Codex açıldığında görünür (§2.12). `inf03.ante_inferno` ve `inf03.leaves`, §4.5'teki en az kümeye eklenmiş kayıtlardır. Kayıtların alıntıları, mümkün olduğunca sahnede yazıyla gösterilmeyen dizelerden seçilmiştir (III 40–42, 52); böylece Codex okura yeni bir dize de verir.

```codex
ID: inf03.gate
TAB: places
TITLE: The Gate of Hell
QUOTE INSCRIPTION (Inferno III, 7–9)
> Before me there were no created things,
> Only eterne, and I eternal last.
> All hope abandon, ye who enter in!"
NOTE: In the poem the gate speaks in its own voice. It says Hell was made by divine justice, power, wisdom and love, and that it will last forever; its last line is meant for those who enter to stay. Readers have long seen the Trinity in the power, wisdom and love that made it. Later in the poem Virgil says the gate still stands without a fastening.
RELATED: inf03.ante_inferno, inf03.acheron
```

```codex
ID: inf03.ante_inferno
TAB: places
TITLE: The Ante-Inferno
QUOTE POET (Inferno III, 28–30)
> Made up a tumult that goes whirling on
> For ever in that air for ever black,
> Even as the sand doth, when the whirlwind breathes.
NOTE: In the poem, the starless plain between the gate and the river Acheron. Hell proper begins only across the river. Here run the souls that neither Heaven nor Hell will take, and here the dead wait for Charon's boat. Readers call it the Ante-Inferno, or the Vestibule of Hell.
RELATED: inf03.gate, inf03.neutrals, inf03.acheron
```

```codex
ID: inf03.neutrals
TAB: souls
TITLE: The Neutrals
QUOTE VIRGIL (Inferno III, 40–42)
> The heavens expelled them, not to be less fair;
> Nor them the nethermore abyss receives,
> For glory none the damned would have from them."
NOTE: In the poem, the souls who lived without infamy or praise, mixed with the angels who took neither God's side nor the rebels'. Heaven cast them out, and the deep will not take them, or the damned would have someone to look down on. None of them is named, and none can be remembered. Readers have traced the neutral angels to medieval legend rather than Scripture.
RELATED: inf03.contrapasso, inf03.great_refusal, inf03.ante_inferno
```

```codex
ID: inf03.contrapasso
TAB: lore
TITLE: Contrapasso
QUOTE POET (Inferno III, 52–54)
> And I, who looked again, beheld a banner,
> Which, whirling round, ran on so rapidly,
> That of all pause it seemed to me indignant;
NOTE: Readers have long seen a rule at work here: every punishment in Hell answers its sin. Souls who never took a side in life now chase a banner forever, and souls who were never stirred are stung without rest. Dante names the rule only much later, through a soul in the eighth circle: contrapasso, which Longfellow renders as counterpoise.
RELATED: inf03.neutrals
```

```codex
ID: inf03.great_refusal
TAB: souls
TITLE: The Great Refusal
QUOTE POET (Inferno III, 58–60)
> When some among them I had recognised,
> I looked, and I beheld the shade of him
> Who made through cowardice the great refusal.
NOTE: In the poem Dante recognises this shade among the runners and does not name him. Many readers have thought of Pope Celestine V, who gave up the papacy in 1294, months after his election; historically, his successor Boniface VIII helped bring about Dante's exile. Others have proposed Esau or Pontius Pilate. The poem leaves him without a name.
RELATED: inf03.neutrals
```

```codex
ID: inf03.acheron
TAB: places
TITLE: Acheron
QUOTE POET (Inferno III, 118–120)
> So they depart across the dusky wave,
> And ere upon the other side they land,
> Again on this side a new troop assembles.
NOTE: In the poem, the first river of Hell, which every damned soul crosses in Charon's boat. Dante took it from the old poets: in Greek myth and in Virgil's Aeneid, Acheron is a river of the underworld. Hell proper lies beyond it. How Dante himself crossed it, the poem does not say.
RELATED: inf03.charon, inf03.ante_inferno
```

```codex
ID: inf03.charon
TAB: souls
TITLE: Charon
QUOTE POET (Inferno III, 82–84)
> And lo! towards us coming in a boat
> An old man, hoary with the hair of eld,
> Crying: "Woe unto you, ye souls depraved!
NOTE: The ferryman of the dead, whom Dante took from the old Greek and Roman poets; in Virgil's Aeneid, too, Charon's eyes are full of flame. In the poem he refuses to carry Dante, who is still alive, until Virgil silences him. Readers have long heard in his lighter vessel the angel's boat that brings saved souls to Purgatory.
RELATED: inf03.acheron, inf03.leaves
```

```codex
ID: inf03.leaves
TAB: lore
TITLE: As the Leaves Fall
QUOTE POET (Inferno III, 112–114)
> As in the autumn-time the leaves fall off,
> First one and then another, till the branch
> Unto the earth surrenders all its spoils;
NOTE: In the poem the souls leap into the boat one by one, like leaves from an autumn branch, or like a hawk to the lure. The image comes from Virgil's Aeneid, where the dead crowding the bank are as many as the leaves that fall at the first cold of autumn. Readers have noticed the change: Virgil's leaves are countless; Dante's fall one at a time.
RELATED: inf03.charon, inf03.acheron
```

**Kapanış notu: sapmalar, eklemeler ve baş yazara açık sorular**

- **SAPMA: yok.** Omurga olduğu gibi duruyor: kapının yazısı, Dante'nin yazıyı ağır bulması (kartta), Vergilius'un öğüdü ve eli, yıldızsız havadaki sesler, Kararsızlar ve tarafsız melekler, bayrak ve uzun şerit, adı söylenmeyen büyük reddin gölgesi, sokmalar ve kurtçuklar, ırmak ve ertelenen cevap, Dante'nin utancı ve susması, Kharon'un gelişi, buyruğu ve reddi, Vergilius'un sözü, ruhların küfrü ve ağlayışı, kürek, yapraklar, yeni topluluk, Vergilius'un açıklaması, deprem, kızıl ışık ve bayılma. Dante kayığa binmez; Akheron'un nasıl geçildiği gösterilmez. Şiirde susan hiçbir karaktere söz verilmedi: büyük reddin gölgesi sessiz, Kharon yalnızca Longfellow, Kararsızlar yalnızca üç kelimelik kopuk parçalar, kıyıdaki ruhlar yalnızca `BARK` (küfürleri yazılmadı). Dante, III 79–81'deki susmadan sonra şiirde olduğu gibi tek bir modern söz söylemez.
- **Sapmaya en yakın kararlar (ve neden sapma değiller):**
  1. *Vergilius'un kapıda yere bırakılan umudu alması* (yalnızca `inf03.c1=b`). Şiirde yok, ama şiirle çelişmez; IV s2'deki onaylı SAPMA'nın (umudun geri verilmesi) görsel hazırlığıdır. IV yazarına öneri: "Mühürlü Hope kartı Vergilius'un elinde ışır" yönergesi, Vergilius'un ışığı pelerininden çıkarmasıyla sahnelenirse iki kanto birbirine bağlanır.
  2. *Depremde uzatılan el.* Şiirde yok. Ellerin buluşup buluşmadığı bilerek gösterilmez; Dante'nin nasıl karşıya geçtiğini şiir söylemez, oyun da söylemez. Açık soru 9'daki rüya kayık sahnesi yazılmadı.
  3. *Kartların sırası.* `inf03.c3`'ün kartı (III 90) Kharon susturulduktan sonra açılır; olay sırası değişmez, yalnızca kanonik dizenin açıldığı an ertelenir. Ölçüm (`inf03.held_before_charon`) aynı sahnede, CHOICE satırından önce yayılır (§2.9).
  4. *Yazıyla gösterilmeyen dizeler.* III 103–105 (küfür) yalnızca ses olarak verilir (§7.3, "ses olarak"); III 37–44 Vergilius'un ve Dante'nin modern sözleriyle gelir, III 40–42 Codex'tedir. Kolofondan sonra hepsi tam kantoda okunur.
- **EKLEME'ler** (her biri kendi vuruşunda not edildi): kapıya inen geçit ve taş bank (s1.b1); yazının yürüyerek okunması ve kartlara dokunması (s1.b2); umudun yerden alınması (s1.b3); elin oyuncunun hareketiyle verilmesi (s1.b4); el ele yürüyüş (s2.b1); seslerin girdapları (s2.b2); şerit ve sürüler (s3.b1, onaylı); büyük reddin gölgesinin yakından geçişi (s3.b2); sessiz yürüyüş (s4.b3); Kharon'un buyruğunun korku dalgası olarak oynanması (s5.b2); kürek darbeleri (s6.b1, onaylı); yaprak gravürü (s6.b2); depremde uzatılan el (s7.b1).
- **Onay bekleyen biçim kararları:**
  1. İki Codex kaydı eklendi: `inf03.ante_inferno` (places) ve `inf03.leaves` (lore). §4.5 en az kümeyi tanımlar; ikisi de kantonun önekini taşır ve yalnızca kanto içi `RELATED` bağları kullanır.
  2. Sahne kiplerine oynanış vuruşları eklendi: s1 (iniş, yazı, el), s2 (karanlık ve girdaplar, konuşmadan önce), s6 (gravür ve Vergilius'un açıklaması) ve s7 (depremde yürüyüş). §7.3'teki kip sütunu bağlayıcı listede değildir; Kanto I de aynı yolu izledi.
  3. `inf03.c2`'nin istemi değiştirildi (ÖNERİ): "The runners went by close enough to touch. Not one of them looked up." İncil'deki istem, sahnede az önce gösterilen III 51'i modern sözlerle yeniden söylüyordu (§6.3). Seçenek metinleri, harfler, etkiler ve REVEAL aynen korundu. `inf03.c1`'de yalnızca a seçeneğinin repliği inceltildi ("Then my fear stays at this door. The rest I keep.") ve iki seçeneğe sonuçlarını gösteren `DO` satırları eklendi.
  4. **Kanto kuralı (motor):** Oynanış Resolve'u 1 birimin altına indirmez; 1 birimde Dante diz çöker, Vergilius onu kaldırır ve Resolve 3 birime döner. Gerekçe: kantonun tek bayılması omurgadaki bayılmadır (s7); arı sokmasıyla bir "oyun bayılması" onu ucuzlatır. Motorda kanto başına bir ayar gerektirir.
  5. **s4'ün sessizliği (motor):** Betik dilinde ipucunu silen bir satır yok. s4 başında geçerli ipucunun silinmesi gerekir (ENGINE §5.10 bu davranışı zaten anar). Q'ya basınca Dante'nin başını kaldırıp indirmesi sunum katmanının işidir.
  6. Olaylar: `inf03.banner_turned` (oynanış, belgeleme), `inf03.reached_for_hand` (s7.b2'nin tetiği) bu kantonun önekiyle tanımlandı; `inf03.held_before_charon` §4.9'dadır.
