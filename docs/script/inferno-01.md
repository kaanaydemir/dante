---
id: inf01
canticle: Inferno
canto: 1
title: "The Dark Wood"
title_tr: "Karanlık Orman"
location: "The Dark Wood"
source: docs/source/inferno/canto-01.txt
lines: "1–136"
epigraph: "Inferno I, 1–3"
closing: "Inferno I, 136"
characters: [DANTE, VIRGIL, PANTHER, LION, SHE_WOLF]
mechanics: [move, dash, talk, fear, darkness, look_back, chase, hold_ground, push_back, follow]
choices: [inf01.c1, inf01.c2, inf01.c3, inf01.c4]
words: [Fear, Way, Hope, Love]
memories: []
codex: [inf01.dark_wood, inf01.sunlit_hill, inf01.first_morning, inf01.panther, inf01.lion, inf01.she_wolf, inf01.virgil, inf01.greyhound]
flags_set: [inf01.motive_escape, inf01.motive_gate, inf01.motive_souls]
flags_read: []
unlocks: [words, book]
playtime: "8–12"
writer: "Claude"
status: draft
version: "0.2"
---

# Inferno I — The Dark Wood

Kanto I oyunun ilk on dakikası ve kitabın ilk sayfasıdır. Üç işi var. Birincisi oyuncuya yürümeyi, atılmayı, konuşmayı ve izlemeyi öğretmek. İkincisi Dante'yi korkusuyla ve yalnızlığıyla tanıtmak. Üçüncüsü Vergilius'u, oyunun geri kalanında yanımızda yürüyecek sesi, unutulmaz bir girişle sahneye çıkarmak. Kalp, anma ve tercet bu kantoda yoktur. Oyuncunun payı bedeninin ve dikkatinin payıdır: nasıl beklediği, nereye baktığı, korkunun içinde nasıl durduğu ve sonunda yoldan ne istediği.

**Bu kantonun altı fikri**

1. **Dante'nin ilk sözü bir yakarıştır.** Oyuncunun Dante'si ormanda, yamaçta ve üç hayvanın önünde tek kelime söylemez. Duyduğumuz tek ses şiirin anlatıcısıdır (`POET`). Dante'nin ağzından çıkan ilk söz, şiirdeki ilk sözüdür: *"Have pity on me," unto him I cried,* (Inferno I, 65). Terazi henüz yoktur (III'te açılır), ama "pity" kelimesi oyunda ilk kez Dante'nin kendisi için yalvarırken duyulur.
2. **Kenar boşluğu rehberle dolar.** Vergilius gelene kadar Q tuşu boş bir kenar boşluğu açar ve s0–s5 arasında hiçbir alıntının `GLOSS` notu yoktur. İlk `GLOSS`, Vergilius'un kendi dizesindedir (I 70–72). Okur rehbersiz okumanın nasıl bir şey olduğunu yaşar; rehber gelince kitabın kenarı konuşmaya başlar.
3. **Önce oyna, sonra oku.** Dört yerde oyuncu şiirin bir hareketini kendi eliyle yapar ve dize ardından gelir: geriye bakmak (I 22–27, isteğe bağlı), gölgeye seslenmek (I 65–66), kurdu Vergilius'a göstermek (I 88–90) ve Vergilius'un ardından yürümek (I 136). Sonuncusu sahnede yazılmaz; oyuncu onu yürüdükten sonra kolofonun sol sayfasında, tek başına okur.
4. **Üç hayvan, üç ölçüm, tek yokuş.** Pars sabrı (`inf01.c1`), aslan yiğitliği (`inf01.c2`), dişi kurt sağduyuyu (`inf01.c3`) ölçer. Hiçbiri yazıyla öğretilmez; oyuncu kendisi keşfeder. Üç sistemik seçimin "What Dante did" kartları kolofona ertelenir: üç hayvan tek bir tırmanış ve tek bir düşüştür, kartlarla bölünmemelidir.
5. **Güneşin sustuğu yer bir ses tasarımıdır.** Dişi kurdun her adımında şafağın sesleri katman katman eksilir: kuşlar, rüzgâr, çakıllar, en son nefes. I 60 tam sessizlikte okunur. Vergilius bu sessizliğin içinden, "uzun sessizlikten kısılmış" (I 63) çatlak bir dize balonuyla gelir.
6. **Boş bank, dolu bank.** Oyunun ilk kontrol noktası yamacın dibinde boş bir taş banktır (s2). Kanto, Vergilius'un ilk kez bir bankta oturup Dante'yi beklemesiyle kapanır (s8). Bu karşıtlık hiçbir yerde söylenmez.

**Akış**

| Sahne | Süre (dk) | Oyuncu ne yapar | Verilenler |
|---|---|---|---|
| s0 | 0,2 | Sayfayı çevirir | — |
| s1 | 1,5–2 | Yürür, korkunun içinden geçer, ilk sözünü alır, ormandan atılarak çıkar | Fear, Way; `unlock:words`; `inf01.dark_wood` |
| s2 | 1–1,5 | Tepeye bakar, isterse geriye bakar, bankta dinlenir, tırmanır | `inf01.sunlit_hill` |
| s3 | 1 | Parsla karşılaşır; geçmeye çalışır ya da şafağı bekler | Hope; `inf01.first_morning`, `inf01.panther`; `inf01.c1` |
| s4 | 0,5–1 | Aslanın hamlelerinden atılarak kaçar; kükremede kıpırdar ya da durur | `inf01.lion`; `inf01.c2` |
| s5 | 1–1,5 | Kurt tarafından geri itilir; yeniden tırmanır ya da aşağıdaki gölgeye yürür | `inf01.she_wolf`; `inf01.c3` |
| s6 | 1,5–2 | Gölgeye yaklaşıp seslenir, Vergilius'u dinler, Love'ı alır, kurdu gösterir | Love; `inf01.virgil` |
| s7 | 1–1,5 | Kehaneti dinler, iki yol arasında yürür, yolculuk teklifini dinler | `inf01.greyhound` |
| s8 | 1–1,5 | Yolculuğun nedenini seçer, Vergilius'un ardından yürür | `inf01.c4` |
| s9 | 0,3–0,5 | Kolofonu okur | `unlock:book` |
| **Toplam** | **9–12,5** | Ön bilgideki 8–12 hedefiyle uyumludur; yalnızca her dizeyi yavaşça okuyup geriye da bakan bir ilk oynayış üst sınırı biraz aşabilir. Kısaltma gerekirse aşağıdaki M0 listesinden başlanır. | |

**Seçimler ve izleri**

| Seçim | Seçenek | Etki | Bu kantoda | Sonra |
|---|---|---|---|---|
| `inf01.c1` (sistemik) | a · Waited for the dawn | `virtue:temperance+1` | Kolofonda kart (`canon=none`, I 34–36) | II s1'deki anlatım ("That morning he had waited…"); Temperance kademesi |
| | b · Slipped past her | — | Kolofonda kart | II s1'in `ELSE` anlatımı |
| `inf01.c2` (sistemik) | a · Held his ground | `virtue:fortitude+1` | Kolofonda kart (`canon=none`, I 44–45) | II s3'te Vergilius'un sitemi ("…before a living lion."); Fortitude kademesi |
| | b · Ran from the roar | `resolve-1` | Kolofonda kart | — |
| `inf01.c3` (sistemik) | a · Turned to the stranger | `virtue:prudence+1` | Kolofonda kart (`canon=a`, I 52–54) | Prudence kademesi |
| | b · Climbed until thrown down | — | Kolofonda kart | — |
| `inf01.c4` (major) | a · "Lead me out of this misery." | `virtue:prudence+1`, `flag:inf01.motive_escape` | Vergilius'un cevabı | IV s1 ("Down is the way out.") |
| | b · "Lead me to Saint Peter's gate." | `trust+1`, `flag:inf01.motive_gate` | Vergilius bir adım yaklaşır | III s1 ("This is not the gate you promised me."); Araf IX |
| | c · "Show me the ones you spoke of." | `grace+1`, `flag:inf01.motive_souls` | Vergilius'un cevabı | III s2 ve V s5 ("You asked…") |

Güvenin bu kantodaki net değişimi en çok +1'dir (`inf01.c4=b`). Kalp yoktur.

**Programcı için: yerler ve olaylar**

| Yer (`@place` / `enter:`) | Ne |
|---|---|
| `inf01_wood` | Karanlık orman (s1.b1–b4): korku bölgeleri, en karanlık geçit, eski taş döşeme |
| `inf01_wood_edge` | Ormanın kenarı (s1.b5): ardından akan gölge, dikenler arasındaki dar açıklık. Vuruş oyuncu buraya yürüyünce başlar. |
| `inf01_valley_end` | Vadinin sonu (s2.b1–b2): ilk açık gök; geriye bakma yalnızca burada |
| `inf01_slope` | Yamacın dibi (s2.b3): boş taş bank, ilk kontrol noktası |
| `inf01_slope_lower` | Yamacın alt yarısı (s3): pars ve şafak. Sahne oyuncu buraya tırmanınca başlar. |
| `inf01_slope_upper` | Yamacın üst yarısı (s4–s5.b4): aslan, sonra dişi kurt ve düşüşler. Sahne oyuncu buraya tırmanınca başlar. |
| `inf01_shade` | Vadinin gölgeye döndüğü dip (s5.b5–s7.b2): güneşin sustuğu yer, Vergilius |
| `inf01_other_road` | Batıda, tepenin omzunu dolanan gölgeli patikanın başı (s7.b3–s8.b1) |
| `inf01_hillside_path` | Patika (s8.b2): takip öğreticisi, Vergilius'un oturduğu bank |

| Olay | Ne zaman yayılır |
|---|---|
| `inf01.looked_back` | s2.b1: vadinin sonunda R (gamepad: RB) basılı tutulup geriye bakılınca. İsteğe bağlı b2'yi açar. |
| `inf01.waited_dawn` | s3.b1: ışık parsa ulaşmadan, parsa yaklaşmadan 8 saniye hareketsiz kalınınca ya da yokuş aşağı geri çekilince |
| `inf01.held_ground` | s4.b1: bir kükremenin tamamı boyunca ne yürünüp ne atılınca |
| `inf01.turned_to_guide` | s5.b3: ilk düşüşten sonra aşağıdaki biçime yürününce |
| `inf01.climbed_again` | s5.b3: ilk düşüşten sonra yeniden tırmanılınca. b4'ü açar. |
| `inf01.reached_shadow` | s5.b3–b4: Dante biçimin önüne varınca, her yolda (kararsız kalan oyuncuyu kurt iter). b5'i açar. |

- s1.b2, s1.b3 ve s1.b4 tetikleyicisizdir (`auto`). Seviye, her birinin ilk `DO` satırında Dante'nin o noktaya (çukur, geçit, taş döşemenin bittiği yer) varmasını beklemelidir; yoksa üç orman dizesi art arda açılır.
- Seviye kancaları `DO` satırlarının sırasına bağlıdır (`onDo(i)`, `src/levels/_framework/chapter1/inf01.ts`). Kancalı vuruşlarda `DO` satırı eklenir, silinir ya da yer değiştirirse seviye de güncellenmelidir.

**Kanto boyunca geçerli kurallar.** Resolve 1 birimin altına inmez ve bayılma yoktur; bölümün bayılmaları III ve V'te omurgadadır. Codex kayıtları sessizce birikir ve Kanto IV'te görünür (§2.12). Duraklatma menüsünde kolofona kadar yalnızca Words sekmesi (ve her zaman açık olan ayarlar) vardır. Bu kanto hiçbir bayrak okumaz; bu yüzden `IF` bloğu yoktur.

**M0 kısa kurgusu için** atlanabilecek vuruşlar: `s1.b3`, `s2.b2` (zaten isteğe bağlı), `s5.b4` (zaten koşullu) ve `s7.b2`. Omurga vuruşları ve dört seçim kalmalıdır. `s1.b3` atlanırsa `codex:inf01.dark_wood` etkisi s1.b4'ün `EFFECTS` satırına taşınmalıdır.

## [inf01.s0] Opening page

### [inf01.s0.b1] Title and epigraph

Oyunun açılan ilk sayfası. Önce kitabın kapağı açılır (kapak ayrıca tasarlanacak), sonra bu sayfa gelir. Epigraf şiirin ilk tercetidir ve dize dize belirir.

```script
@mode: page
@music: Tek bir alçak drone; sayfa çevrilince kesilir.
DO: Sol sayfa: küçük harflerle "INFERNO", tezhipli büyük harfle "CANTO I", başlık "The Dark Wood" ve 96×64 piksellik siyah-beyaz vinyet: sık gövdeler arasında küçük, yalnız bir figür. Ne patika var ne ayak izi.
QUOTE POET (Inferno I, 1–3)
> Midway upon the journey of our life
> I found myself within a forest dark,
> For the straightforward pathway had been lost.
DO: Bu, oyunun açılan ilk sayfasıdır. İlk okumada en az 3 saniye ekranda kalır; sonra sağ altta "[E] Turn ▸" belirir.
CAM: page-turn
```

## [inf01.s1] The Forest Dark

Orman güneyden kuzeye uzanan, yaklaşık üç ekran boyunda dar ve kıvrımlı bir alandır. Her şey öğreticidir ama hiçbiri öyle görünmemelidir: oyuncu yürümeyi karanlıkta yol ararken, korkuyu korku bölgelerinde, söz toplamayı kaybolmuş bir yolun bittiği yerde, atılmayı da ormandan kaçarken öğrenir. Palet: is mavisi, yosun yeşili, siyah gövdeler. Doré'nin orman gravürlerindeki gibi ışık yalnızca gövdelerin kenarlarına düşer.

### [inf01.s1.b1] Waking

```script
@mode: play
@place: inf01_wood
@ambience: Rüzgârsız, boğuk bir orman. Uzakta dal çıtırtıları; yakında yalnızca Dante'nin nefesi. Müzik yok.
CAM: unengrave — vinyetteki küçük figür büyür; gravürün tarama çizgileri ağaç gövdelerine dönüşür, is mavisi ve yosun yeşili yavaşça sızar
EKLEME: Dante'nin köklerin arasında uyanması ve hareket öğreticisi şiirde yok. | Dayanak: Inferno I, 10–12 (Dante ormana uykulu bir hâlde girmiştir)
DO: Dante köklerin arasında yüzüstü yatar. Oyuncunun ilk girdisiyle doğrulur, bir eliyle gözlerini ovar ve çevresine bakar.
NARRATION: When he woke, there was no path. There were only trees, and the dark between them.
DO: Görüş dardır (darkness): Dante'nin çevresinde yaklaşık 5 karoluk soluk bir halka seçilir, ötesi siyah gövdelerdir. Ormanda işaretli bir yol yoktur; gövdelerin dizilişi oyuncuyu fark ettirmeden kuzeye yönlendirir. {tutorial:move}
DO: Vergilius henüz yok. Oyuncu Q'ya basarsa kitabın kenar boşluğu açılır, boş kalır ve kapanır. Bu davranış Vergilius ilk kez konuşana kadar (s6.b3) sürer.
DO: Resolve en alt birime inerse Dante yavaşlar, omuzları çöker ve titrer; korkunun kaynağından uzaklaşınca toparlanır. Bu kantoda bayılma yoktur.
```

### [inf01.s1.b2] The Fear

Fear oyunun ilk sözüdür ve oyuncu onu seçmez: kelime kendiliğinden yapışır. Kartın kitap simgesine uçuşu, Words sekmesinin açılışıdır.

```script
@mode: play
EKLEME: Korku bölgeleri şiirde yok; ormanın korkuyu her düşüncede yenilemesinin oyunlaştırılmasıdır. | Dayanak: Inferno I, 4–6
DO: İlk korku bölgesi: gövdelerin sıklaştığı, hiçbir ışığın girmediği bir çukur. Dante içine girince Resolve yavaşça azalır, ekranın kenarları kararır ve nefes sesi sıklaşır (fear). Çukurun ortasında dize balonu açılır.
QUOTE POET (Inferno I, 4–6)
> Ah me! how hard a thing it is to say
> What was this forest savage, rough, and stern,
> Which in the very thought renews the fear.
EFFECTS: unlock:words, word:Fear
DO: Son dizedeki "fear" kelimesi E beklemeden balondan kopar ve Dante'ye yapışır (Yük). Kart, ekranın köşesindeki kapalı kitap simgesine uçar; duraklatma menüsünde Words sekmesi açılır.
DO: Fear taşındığı sürece korku Resolve'u daha hızlı azaltır (öneri: %25, §3.4.3). Kart Words sekmesinde koyu kırmızıdır ve hiçbir yuvaya yerleştirilemez.
SFX: Kart Dante'ye yapışırken tek, boğuk bir kalp vuruşu.
```

### [inf01.s1.b3] Bitter

```script
@mode: play
EKLEME: Ormanın en karanlık yerinin iç içe geçmiş korku bölgeleri ve daralan görüşle oynanması şiirde yok; ormanın acılığının oyunlaştırılmasıdır. | Dayanak: Inferno I, 7
DO: Ormanın en karanlık yeri. İki korku bölgesi iç içe geçer; aralarında dar ve kıvrımlı bir geçit vardır. Görüş halkası 3 karoya iner. Geçidin ortasında dize balonu açılır.
QUOTE POET (Inferno I, 7–9)
> So bitter is it, death is little more;
> But of the good to treat, which there I found,
> Speak will I of the other things I saw there.
EFFECTS: codex:inf01.dark_wood
SFX: Dizeler belirirken orman tamamen susar; yalnızca Dante'nin kalp atışı kalır. Son dizeyle birlikte çok uzakta, kuzeyde, tek bir kuş öter.
```

### [inf01.s1.b4] The True Way

Söz toplama burada ilk kez öğretilir. Way, kaybedilmiş yolun dizesinden gelir: oyuncunun kitaptan aldığı ilk şey, yitirilen şeyin adıdır.

```script
@mode: play
EKLEME: Sözün Kitap'a uçarken ormanın kenarına doğru kısa bir ışık izi bırakması şiirde yok; öğretici bir yön işaretidir. | Dayanak: Inferno I, 12
DO: Dikenlerin altında kalmış eski bir taş döşeme: bir zamanlar burada bir yol vardı. Döşeme bir yerde birden biter. Dante taşların bittiği yere gelince dize balonu açılır; son dizedeki "way" kelimesi parlar ve üstünde "[E] Take the word" istemi belirir. Söz alınmadan balon kapanmaz. {tutorial:read}
QUOTE POET (Inferno I, 10–12)
> I cannot well repeat how there I entered,
> So full was I of slumber at the moment
> In which I had abandoned the true way.
EFFECTS: word:Way
DO: Way kartı kitap simgesine uçarken ardında soluk bir ışık izi bırakır. İz kuzeydeki gövdelerin arasından ormanın kenarına doğru uzanır ve birkaç saniyede söner.
```

### [inf01.s1.b5] The Edge of the Wood

```script
@mode: play
@place: inf01_wood_edge
@trigger: enter:inf01_wood_edge
EKLEME: Dante'nin ardından akan karanlık ve atılma öğreticisi şiirde yok; korkunun oyunlaştırılmasıdır. | Dayanak: Inferno I, 25 (Dante'nin ruhu hâlâ kaçmaktadır)
DO: Ormanın kenarına yaklaşıldıkça gövdelerin arasından gri bir alacakaranlık görünür. Arkada karanlık koyulaşır ve Dante'ye doğru akmaya başlar: kenarı dalgalı, sessiz bir gölge (chase). Gölgeye değen Dante'nin Resolve'u hızla azalır.
DO: Son düzlükte sık dikenler arasında dar bir açıklık vardır. Gölge yaklaşınca "Dash" istemi belirir; atılma kısa bir dokunulmazlık verir ve Dante'yi dikenlerin arasından geçirir. {tutorial:dash}
DO: Oyuncu açıklığı birkaç denemede geçemezse gölge yavaşlar. Burada yakalanmak bir son değildir.
SFX: Arkada gövdelerin arasından yükselen boğuk bir uğultu; atılmayla birlikte kesilir. Ormandan çıkınca ilk kez açık havanın serin rüzgârı.
CAM: follow — gölge kadrajın altından yukarı tırmanır; Dante açıklığa atılınca kamera geri çekilir
```

## [inf01.s2] The Hill at Dawn

Vadinin bittiği yer. Oyuncu ilk kez gökyüzünü görür ve ilk kez korkusu azalır. Şiirin ünlü benzetmesi (I 22–27) isteğe bağlıdır: geriye bakmayan oyuncu onu burada görmez, ama kolofondan sonra Kitap'taki tam kantoda bu dizeleri altınla işaretsiz bulur. Palet: gece mavisinden şafak grisine; tepenin omuzlarında tek bir altın şerit.

### [inf01.s2.b1] The Valley's End

```script
@mode: play
@place: inf01_valley_end
@ambience: Açık hava; seyrek, kuru otlar arasında hafif rüzgâr. Çok uzaktan ilk kuş sesleri.
EKLEME: Tepedeki ışığa bakarken Resolve'un dolması şiirde yok; korkunun biraz yatışmasının oyunlaştırılmasıdır. | Dayanak: Inferno I, 19–21
DO: Dante orman kenarındaki çıplak, taşlık zemine sendeleyerek çıkar ve durur. Gök hâlâ gece mavisidir ama kuzeyde, yukarıda, bir şey aydınlanmaktadır.
QUOTE POET (Inferno I, 13–15)
> But after I had reached a mountain's foot,
> At that point where the valley terminated,
> Which had with consternation pierced my heart,
DO: Oyuncu yukarı bastığında Dante başını kaldırır ve kamera yamaç boyunca tepeye kayar. Oyuncu yukarı basmazsa kamera birkaç saniye sonra kendiliğinden kayar.
CAM: pan — yamaç boyunca yukarı; tepenin omuzları güneşin ilk ışığıyla altın rengindedir, eteği hâlâ karanlıktadır
QUOTE POET (Inferno I, 16–18)
> Upward I looked, and I beheld its shoulders,
> Vested already with that planet's rays
> Which leadeth others right by every road.
EFFECTS: codex:inf01.sunlit_hill
CAM: pan — kamera Dante'ye geri döner
DO: Tepedeki ışık Dante'ye ulaşmaz, ama oyuncu ona baktığı sürece Resolve yavaşça dolar. Kitap simgesindeki Fear kartı bir parça solar; düşmez.
QUOTE POET (Inferno I, 19–21)
> Then was the fear a little quieted
> That in my heart's lake had endured throughout
> The night, which I had passed so piteously.
DO: Dante'nin arkasında, orman kenarında "Hold [R] — Look back" istemi belirir (gamepad: RB; GDD 2.2). İstem isteğe bağlıdır ve hiçbir ödül vermez. Oyuncu R'yi basılı tutarsa {event:inf01.looked_back} yayılır ve b2 oynar. Oyuncu yamaca girerse (inf01_slope) istem söner ve b2 atlanır.
```

### [inf01.s2.b2] Looking Back

```script
@mode: play
@trigger: event:inf01.looked_back
EKLEME: Geriye bakma etkileşimi, I 22–27'deki benzetmenin oyunlaştırılmasıdır; isteğe bağlıdır ve ödülsüzdür. | Dayanak: Inferno I, 22–27
DO: Dante yavaşça döner; kamera omzunun üstünden ormana bakar. Gövdelerin arasındaki karanlık siyah bir su gibi kıpırdar. Oyuncu R'yi bıraksa da dize sonuna kadar oynar.
QUOTE POET (Inferno I, 22–27)
> And even as he, who, with distressful breath,
> Forth issued from the sea upon the shore,
> Turns to the water perilous and gazes;
> So did my soul, that still was fleeing onward,
> Turn itself back to re-behold the pass
> Which never yet a living person left.
NARRATION: The dark stood at the edge of the trees and came no farther.
CAM: pan — kamera yeniden tepeye döner
SFX: Ormandan dalga sesi değil, nefese benzeyen alçak bir uğultu gelir; dize bitince o da çekilir.
```

### [inf01.s2.b3] The Desert Slope

```script
@mode: play
@place: inf01_slope
@trigger: enter:inf01_slope
EKLEME: Boş taş bank (ilk kontrol noktası) şiirde yok; Dante'nin yamaçta dinlenmesini oyunlaştırır. | Dayanak: Inferno I, 28
DO: Yamacın dibinde yosun tutmuş, boş bir taş bank durur. Yanından geçmek kaydı alır; "[E] Rest" ile üstüne oturan Dante'nin Resolve'u tamamen dolar. {checkpoint}
// Bank boştur. Vergilius geldikten sonra her kontrol noktasında o bekleyecek. Bu karşıtlık oyunda hiçbir yerde söylenmez.
DO: Dante bankın yanından ayrılıp yamaca adım atınca dize balonu açılır. Oyuncu bankta dinlenmeden geçtiyse Dante önce bankın yanında durur, ellerini dizlerine dayayıp bir an soluklanır; dize ondan sonra açılır. Böylece I 28 her yolda doğru kalır.
QUOTE POET (Inferno I, 28–30)
> After my weary body I had rested,
> The way resumed I on the desert slope,
> So that the firm foot ever was the lower.
DO: Yamaç tırmanışı. Zemin dik, kuru ve çakıllıdır. Yukarı yürüyüş yavaştır: Dante her adımda ağırlığını alttaki ayağına verir. Atılma yokuş yukarı kısadır. Yamaç yer yer alçak taş setlerle basamaklanır; oyuncu en az eğimli yolu kendisi bulur. Tırmanış, oyuncu yamacın alt yarısına (inf01_slope_lower) girince biter; s3 orada başlar.
SFX: Ayağın altından kayan çakıllar; tepeden gelen, gittikçe çoğalan kuş sesleri.
```

## [inf01.s3] The Panther

Üç hayvanın ilki. Pars bir engeldir, düşman değil: dans eder, yolu keser, Dante'yi döndürür. Oyuncunun bilmediği şey, şafağın zaten gelmekte olduğudur. Atılan, zorlayan, yanından sıyrılmaya çalışan oyuncu da sonunda geçer; ama bekleyen oyuncu, ışığın parsı nasıl dağıttığını izlemiş olur. Bu sahnede yazılı hiçbir ipucu "bekle" demez; yalnızca kitabın sesi ışığın yaklaştığını söyler.

### [inf01.s3.b1] Light and Swift

```script
@mode: play
@place: inf01_slope_lower
@trigger: enter:inf01_slope_lower
@music: Kuru, hızlı bir el davulu; yalnızca pars göründüğü sürece.
EKLEME: Parsın Dante'nin önünde dans etmesi ve şafağı beklemenin ölçülmesi şiirde yok; hayvanların nasıl geçildiği ölçülür. | Dayanak: Inferno I, 31–43
DO: Tırmanışın başladığı yerde kayaların arasından benekli bir hayvan sıçrar ve Dante'nin önüne iner.
QUOTE POET (Inferno I, 31–33)
> And lo! almost where the ascent began,
> A panther light and swift exceedingly,
> Which with a spotted skin was covered o'er!
DO: Pars saldırmaz ve zarar görmez. Hep Dante ile tepe arasında kalır: Dante sağa giderse sağa, sola giderse sola geçer (chase). Oyuncu yanından geçmeye ya da atılmaya çalışırsa pars önüne sıçrar ve Dante'yi yokuş aşağı döndürür; Dante'nin yüzü bir an aşağıya, ormana döner. Her temas biraz korku verir.
NARRATION: The panther did not strike. She only stayed in front of him, wherever he turned.
DO: Bu sırada şafak yamaçtan aşağı iner. Tepenin altın ışığı geniş ve görünür bir çizgi hâlinde, yaklaşık 25 saniyede parsın bulunduğu yere ulaşır.
NARRATION: Above them, the light was coming down the mountain.
DO: Oyuncu ışık parsa ulaşmadan önce, parsa yaklaşmadan yamaçta toplam en az 8 saniye hareketsiz kalırsa ya da yokuş aşağı geri çekilirse {event:inf01.waited_dawn} yayılır. Geçmeyi denemeye devam eden oyuncu için de şafak gelir. Vuruş, ışık parsa ulaşınca biter (en geç yaklaşık 25 saniye).
SFX: Pars her sıçradığında kısa, ritmik bir hırıltı; pençelerin taşa değmesi.
```

### [inf01.s3.b2] Occasion of Good Hope

Hope, parsın derisinin güneşte parladığı anda toplanır: şiirde umudu veren şey hem saat ve mevsim hem de hayvanın alacalı derisidir (I 41–43). Kart, parsın şiirdeki Dante'yi defalarca geri döndürdüğünü söyleyen dizeleri (I 34–36) taşır; bu dizeler sahnede gösterilmez.

```script
@mode: play
EKLEME: Parsın şafakla birlikte kayalara çekilip yolu açması şiirde yok; şiir Dante'nin parsı nasıl geçtiğini söylemez, yalnızca saatin ve mevsimin ona umut verdiğini söyler. | Dayanak: Inferno I, 37–43
DO: Işık parsa ulaşır. Benekleri güneşte kıvılcım gibi parlar. Pars bir an durur, başını ışığa çevirir ve yamacın yanındaki kayalara doğru süzülür. Yol açılır. Kontrol birkaç saniye kilitlenir.
QUOTE POET (Inferno I, 37–40)
> The time was the beginning of the morning,
> And up the sun was mounting with those stars
> That with him were, what time the Love Divine
> At first in motion set those beauteous things;
EFFECTS: codex:inf01.first_morning
DO: Işık Dante'ye ulaşır ve ilk kez sıcak renkler, bal sarısı ve gül pembesi, bütün ekrana yayılır. Sonraki dize balonunda "hope" kelimesi parlar ve "[E] Take the word" istemi belirir.
QUOTE POET (Inferno I, 41–43)
> So were to me occasion of good hope,
> The variegated skin of that wild beast,
> The hour of time, and the delicious season;
EFFECTS: word:Hope, codex:inf01.panther
CHOICE inf01.c1 minor systemic "The panther"
OPTION a [Waited for the dawn] when: event:inf01.waited_dawn
EFFECTS: virtue:temperance+1
OPTION b [Slipped past her] when: else
REVEAL canon=none timing=deferred
QUOTE POET (Inferno I, 34–36)
> And never moved she from before my face,
> Nay, rather did impede so much my way,
> That many times I to return had turned.
NOTE: The poem does not say how he got past her. It says she turned him back again and again, until the hour and the season gave him hope.
END CHOICE
SFX: Davul susar. Bütün yamaç boyunca kuşlar.
```

## [inf01.s4] The Lion

Umut uzun sürmez. Şiirde I 44, I 43'teki umudu "but" ile keser; oyunda da aslan, Hope kartı kitaba konduktan yalnızca kısa bir tırmanış sonra, oyuncu yamacın üst yarısına adım atınca gelir. Aslan bir kükreme ve hamle desenidir. Kükreme bir korku dalgasıdır: kaçan oyuncu korkuyu yanında taşır, duran oyuncunun etrafından yarılarak geçer. Hamleler atılmayla savuşturulur. Aslanın Dante'yi korkuttuğunu söyleyen dizeler (I 44–45) sahnede gösterilmez, kartta saklanır.

### [inf01.s4.b1] Head Uplifted

```script
@mode: play
@place: inf01_slope_upper
@trigger: enter:inf01_slope_upper
@music: Davul dönmez. Yerine gövdeyi titreten, çok alçak bir drone.
EKLEME: Aslanın hamleleri ve kükremesinde kıpırdamamanın ölçülmesi şiirde yok; şiirde aslan Dante'nin üstüne geliyormuş gibi görünür. | Dayanak: Inferno I, 44–48
DO: Dante yamacın üst yarısına varınca rüzgâr bir anda durur. Kuşlar susar.
NARRATION: Then, on the rocks above the path, something lifted its head.
QUOTE POET (Inferno I, 46–48)
> He seemed as if against me he were coming
> With head uplifted, and with ravenous hunger,
> So that it seemed the air was afraid of him;
DO: Aslan yolun üst ucundadır ve zarar görmez. Deseni üç adımdır: (1) başı yukarıda, yolun bir yanından öbür yanına yürür; (2) kükrer: görünür bir korku dalgası halka hâlinde yayılır, otları yatırır ve havayı titretir, dalga geçerken Resolve azalır (fear); (3) Dante'ye düz bir çizgide atılır. Hamle çizgisi bir an önceden yerde toz olarak belirir.
DO: Kükreme kuralı (hold_ground): Dalga geçerken yürüyen ya da atılan Dante paniğe kapılır ve korku iki kat işler. Kıpırdamayan Dante ayaklarını yere basar; dalga onun çevresinden yarılarak geçer ve yarı etkiyle işler. Kural hiçbir yerde yazılmaz; oyuncu ilk kükremede görür.
DO: Hamle kuralı (chase): Hamle çizgisinden yana atılmak hamleyi boşa çıkarır. Temas Dante'yi yokuş aşağı savurur ve Resolve'dan 1 birim alır. Aslan Dante'ye ne dişini ne pençesini geçirir.
DO: İlk kükreme biter bitmez şu şerit gelir. Şerit oyuncunun ne yaptığından bağımsız olarak doğrudur ve kuralı yalnızca sezdirir.
NARRATION: The lion's roar laid the grass flat as it passed. Only the stones held still.
DO: Aslan iki kez kükrer ve üç kez hamle eder. Oyuncu bir kükremenin tamamı boyunca ne yürür ne atılırsa {event:inf01.held_ground} yayılır.
SFX: Kükreme önce bir sessizlikle gelir, sonra yerden yükselen derin bir titreşimle. Gamepad titrer (erişilebilirlik ayarıyla kapatılabilir).
```

### [inf01.s4.b2] The Lion Waits

```script
@mode: play
DO: Üçüncü hamleden sonra aslan yolun üst ucuna döner ve orada, başı yukarıda, durur. Yolu kapatmaya devam eder ama artık saldırmaz.
EFFECTS: codex:inf01.lion
CHOICE inf01.c2 minor systemic "The lion"
OPTION a [Held his ground] when: event:inf01.held_ground
EFFECTS: virtue:fortitude+1
OPTION b [Ran from the roar] when: else
EFFECTS: resolve-1
REVEAL canon=none timing=deferred
QUOTE POET (Inferno I, 44–45)
> But not so much, that did not give me fear
> A lion's aspect which appeared to me.
NOTE: The poem does not say whether he stood his ground or ran. It says only that he was afraid.
END CHOICE
```

## [inf01.s5] The She-wolf

Kazanılamaz sahne. Kurt Dante'ye dokunmaz, yalnızca yürür; her adımı Dante'den bir adım, şafaktan bir ses alır. Bu bir başarısızlık gibi sunulmaz: yolun değiştiği andır. İlk düşüşten sonra oyuncu iki yön arasında yalnız kalır: yukarıda kurt, aşağıda kıpırdamayan bir biçim. Hiçbir ok yön göstermez. Şiirdeki Dante'nin tepenin umudunu bıraktığını söyleyen dizeler (I 52–54) sahnede gösterilmez, kartta saklanır.

### [inf01.s5.b1] All Hungerings

```script
@mode: cinematic
@music: Drone kesilir. Yalnızca nefes.
DO: Aslanın yanındaki kayaların arasından sıska bir şekil çıkar: kaburgaları sayılan, gözleri çukura kaçmış bir dişi kurt. Aslan yerinden kıpırdamaz; ikisi birlikte yolun ucunda durur.
QUOTE POET (Inferno I, 49–51)
> And a she-wolf, that with all hungerings
> Seemed to be laden in her meagreness,
> And many folk has caused to live forlorn!
EFFECTS: codex:inf01.she_wolf
CAM: zoom-in — kurdun gözleri; sonra Dante'nin yüzü
```

### [inf01.s5.b2] By Degrees

```script
@mode: play
EKLEME: Kurdun Dante'yi adım adım geri itmesi kazanılamaz bir sekans olarak oynanır; düşüşler ve aşağıdaki biçim oyunlaştırmadır. | Dayanak: Inferno I, 52–61
DO: Kurt yolun ortasına iner ve Dante'ye doğru yavaş, düzenli adımlarla yürür (push_back). Kurdun her adımında Dante bir adım geri kayar. Yukarı basmak hiçbir zaman yol kazandırmaz; en çok, iki adım arasında Dante'yi olduğu yerde tutar. Atılma onu kurdun yanından geçirmez: kurt her seferinde önüne çıkar.
DO: Kurt Dante'ye dokunmaz; yalnızca yürür. Yaklaştıkça Dante ağırlaşır: yürüme hızı her adımda biraz düşer. Resolve azalır ama 1 birimin altına inmez.
DO: Kurdun her adımında şafağın seslerinden bir katman eksilir: önce kuşlar, sonra rüzgâr, sonra çakıllar. Kitap simgesindeki Hope kartı her adımda titrer (yalnızca görsel; sözün durumu değişmez).
DO: İlk düşüş (öneri: kurdun beşinci adımında): Kurt son bir adım atar; Dante sendeler ve bir taş setin altına yuvarlanır. Kurt yukarıda durur ve bekler.
DO: Aşağıda, vadinin gölgeye döndüğü yerde, kıpırdamayan bir insan biçimi belirir. Yüzü seçilmez; yalnızca dimdik duruşu ve soluk bir giysinin kenarı görünür.
```

### [inf01.s5.b3] Up, or Down

```script
@mode: play
DO: Oyuncu serbesttir. Yukarıda kurt bekler, aşağıda biçim bekler. Hiçbir istem, ok ya da ses yön göstermez. Oyuncu hiçbir yöne gitmezse (öneri: 45 saniye) kurt yeniden iner ve onu adım adım biçimin önüne kadar iter; Dante oraya varınca reached_shadow yayılır. Bu yolda turned_to_guide ve climbed_again yayılmaz, b4 atlanır.
DO: Oyuncu yeniden tırmanmak yerine aşağıdaki biçime doğru yürürse {event:inf01.turned_to_guide} yayılır. Kurt onun ardından iner ve onu adım adım biçimin önüne kadar iter. Dante biçimin önüne varınca {event:inf01.reached_shadow} yayılır; b4 atlanır.
DO: Oyuncu yeniden yukarı tırmanırsa {event:inf01.climbed_again} yayılır ve b4 oynar.
```

### [inf01.s5.b4] Again

```script
@mode: play
@trigger: event:inf01.climbed_again
DO: İkinci tırmanış. Kurt yine iner ve yine adım adım iter. İkinci düşüş Dante'yi öncekinden daha aşağıya bırakır. Aşağıdaki biçim yerinden kıpırdamaz.
NARRATION: He climbed again. She came down to meet him, one slow step at a time.
DO: Oyuncu şimdi aşağıya yürürse ya da yerinde kalırsa kurt onu biçimin önüne kadar iter. Üçüncü kez tırmanırsa kurt hiç durmadan iter ve Dante'yi vadinin dibine, biçimin önüne kadar indirir. Her iki durumda da Dante biçimin önüne varınca {event:inf01.reached_shadow} yayılır.
// inf01.turned_to_guide bu vuruşta yayılmaz: §4.9'a göre olay yalnızca ilk düşüşten hemen sonraki dönüşü ölçer.
```

### [inf01.s5.b5] Where the Sun Is Silent

```script
@mode: cinematic
@place: inf01_shade
@trigger: event:inf01.reached_shadow
EKLEME: "Güneşin sustuğu yer" ses tasarımında gerçek bir sessizlik olarak verilir. | Dayanak: Inferno I, 60
DO: Dante vadinin dibinde, gölgenin içindedir. Tepeden düşen ışık artık ona ulaşmaz. Kurt yamacın ortasında durur, döner ve yukarı çıkar.
QUOTE POET (Inferno I, 55–60)
> And as he is who willingly acquires,
> And the time comes that causes him to lose,
> Who weeps in all his thoughts and is despondent,
> E'en such made me that beast withouten peace,
> Which, coming on against me by degrees
> Thrust me back thither where the sun is silent.
SFX: Son dizeyle birlikte kalan bütün sesler kesilir: kuş yok, rüzgâr yok, nefes yok. İki uzun soluk boyunca tam sessizlik.
CHOICE inf01.c3 minor systemic "The she-wolf"
OPTION a [Turned to the stranger] when: event:inf01.turned_to_guide
EFFECTS: virtue:prudence+1
OPTION b [Climbed until thrown down] when: else
REVEAL canon=a timing=deferred
QUOTE POET (Inferno I, 52–54)
> She brought upon me so much heaviness,
> With the affright that from her aspect came,
> That I the hope relinquished of the height.
NOTE: He gave up hope of the summit. As she drove him down, a figure appeared before him, and Dante cried out to him for help.
END CHOICE
```

## [inf01.s6] The Shade in the Silence

Kantonun kalbi. Sessizliğin içinden biri çıkar ve Dante ilk kez konuşur. Sahne dört şeyi aynı anda yapar: konuşma öğreticisini oynatır, Vergilius'u kendi dizeleriyle tanıtır, kitabın ilk sevgisini (Love, I 83) verir ve Q tuşunu ilk kez anlamlı kılar. Vergilius bu sahnede hiç modern cümle söylemez: oyundaki ilk sözleri Longfellow'dur, sesi "uzun sessizlikten kısılmış"tır (I 63) ve balonu önce çatlak harflerle belirir. Dante'nin de bu sahnede modern repliği yoktur; şiir kendi sesiyle konuşur. Vergilius'un görünüşü: solgun gri-mavi bir pelerin, solmuş bir defne çelengi, yaşlı ama dimdik bir yüz. Palet: gölgenin mavisi, Vergilius'un çevresinde soluk, sıcaklığı olmayan bir ışık.

### [inf01.s6.b1] Hoarse from Silence

```script
@mode: cinematic
@place: inf01_shade
@music: Müzik yok. Sessizliğin içinde, çok uzaktan, tek ve sürekli bir nota.
QUOTE POET (Inferno I, 61–63)
> While I was rushing downward to the lowland,
> Before mine eyes did one present himself,
> Who seemed from long-continued silence hoarse.
DO: Biçim gölgeden bir adım öne çıkar: solgun gri-mavi bir pelerin, solmuş bir defne çelengi, yaşlı ama dimdik bir yüz. Dudakları kıpırdar ama ses çıkmaz.
CAM: hold — ikisi arasındaki boşluk
DO: Bu andan sonra kontrol noktalarında Vergilius bekler. {checkpoint}
```

### [inf01.s6.b2] The Cry

```script
@mode: play
EKLEME: Dante'nin seslenmesi konuşma öğreticisi olarak oynanır. | Dayanak: Inferno I, 64–66
DO: Oyuncu kontrolü geri alır. Biçim yerinden kıpırdamaz. Dante ona yaklaşınca "[E] Call to him" istemi belirir; dize E'ye basılınca gelir. Oyuncu uzun süre seslenmezse (öneri: 60 saniye) Dante kendiliğinden seslenir. {tutorial:talk}
// Dante oyunun başından beri tek kelime söylemedi. İlk sözü, şiirdeki ilk sözüdür: bir acıma yakarışı (§3.1). Terazi III'te açılır; burada etki yoktur.
QUOTE DANTE (Inferno I, 65–66)
> "Have pity on me," unto him I cried,
> "Whiche'er thou art, or shade or real man!"
SFX: Dante'nin ilk konuşma sesi: kırık, tiz, neredeyse bir hıçkırık.
```

### [inf01.s6.b3] Not Man

```script
@mode: dialogue
DO: Vergilius'un ilk dize balonu çatlak, soluk harflerle belirir; ikinci balondan itibaren harfler netleşir. Konuşma sesi de ilk balonda kısık ve kırıktır.
QUOTE VIRGIL (Inferno I, 67–69)
> He answered me: "Not man; man once I was,
> And both my parents were of Lombardy,
> And Mantuans by country both of them.
DO: Vergilius'un güveni burada başlar (motor; trust 4). Bir sonraki dize balonunun köşesinde ilk kez "[Q] gloss" işareti belirir: kitabın kenar boşluğu artık boş değildir.
QUOTE VIRGIL (Inferno I, 70–72)
> 'Sub Julio' was I born, though it was late,
> And lived at Rome under the good Augustus,
> During the time of false and lying gods.
GLOSS: Sub Julio is Latin for "under Julius". Virgil was born in Julius Caesar's time, though late in it, and lived on under Augustus.
QUOTE VIRGIL (Inferno I, 73–75)
> A poet was I, and I sang that just
> Son of Anchises, who came forth from Troy,
> After that Ilion the superb was burned.
GLOSS: The just son of Anchises is Aeneas, the hero of Virgil's Aeneid. Ilion is another name for Troy.
EFFECTS: codex:inf01.virgil
QUOTE VIRGIL (Inferno I, 76–78)
> But thou, why goest thou back to such annoyance?
> Why climb'st thou not the Mount Delectable,
> Which is the source and cause of every joy?"
GLOSS: In older English, annoyance meant harm and misery. The Mount Delectable is the sunlit hill.
```

### [inf01.s6.b4] That Fountain

Dante Vergilius'u tanır ve kitabın ilk sevgisi bir kitap sevgisidir: Love, Vergilius'un "volume"una duyulan uzun çalışma ve büyük sevgiden gelir (I 83). Kanto V'te Francesca'yı mahveden de bir kitap olacaktır.

```script
@mode: dialogue
DO: Dante'nin portresi önce şaşkın (awed), sonra utangaç (ashamed) kipine geçer; Dante başını eğer.
QUOTE DANTE (Inferno I, 79–81)
> "Now, art thou that Virgilius and that fountain
> Which spreads abroad so wide a river of speech?"
> I made response to him with bashful forehead.
GLOSS: Virgilius is the Latin form of Virgil's name.
DO: Bir sonraki dize balonunda "love" kelimesi parlar ve "[E] Take the word" istemi belirir.
QUOTE DANTE (Inferno I, 82–84)
> "O, of the other poets honour and light,
> Avail me the long study and great love
> That have impelled me to explore thy volume!
GLOSS: Avail me: let them help me now. Dante pleads his long study of Virgil's book, and his love for it.
EFFECTS: word:Love
DO: Love kartı kitap simgesine uçarken bir an küçük, açık bir kitap biçimini alır.
QUOTE DANTE (Inferno I, 85–87)
> Thou art my master, and my author thou,
> Thou art alone the one from whom I took
> The beautiful style that has done honour to me.
DO: Vergilius cevap vermez; yalnızca başını hafifçe eğer. Bu, oyunda bir gülümsemeye en yakın şeydir.
```

### [inf01.s6.b5] The Beast He Fled

```script
@mode: play
EKLEME: Dante'nin kurdu göstermesi bir etkileşim olarak oynanır; oyuncu korktuğu şeye dönüp bakmak zorundadır. | Dayanak: Inferno I, 88–90
DO: Yamacın ortasında kurt bir aşağı bir yukarı yürür. Dante yamaca, kurda dönünce "[E] Show him the beast" istemi belirir. Oyuncu Dante'yi kurda çevirip E'ye basmadan sahne ilerlemez; Vergilius bekler. Oyuncu uzun süre dönmezse (öneri: 60 saniye) Dante kendiliğinden kurda döner ve dize gelir.
QUOTE DANTE (Inferno I, 88–90)
> Behold the beast, for which I have turned back;
> Do thou protect me from her, famous Sage,
> For she doth make my veins and pulses tremble."
DO: Dante'nin portresi ağlayan (weeping) kipine geçer.
SFX: Kalp atışı hızlanır; gamepad dize boyunca kalp ritminde titrer (erişilebilirlik ayarıyla kapatılabilir).
```

## [inf01.s7] Another Road

Vergilius'un uzun konuşması (I 91–129) iki `QUOTE` bloğuyla verilir: başka yol (I 91–93) ve yolculuk teklifi (I 112–117). Kurdun doğası, Tazı kehaneti, Araf, "daha layık ruh" ve Vergilius'un kendi yasağı modern köprülerle gelir. Kehanetin dizeleri (I 101–105) Codex'e gider; tamamı kolofondan sonra Kitap'taki tam kantoda okunur. Şiirde Dante bu konuşmayı hiç kesmez, yalnızca ağlar (I 92). Oyunda iki kısa soru sorar (s7.b1, EKLEME): kurdu hiç kimsenin geçip geçemeyeceğini ve Tazı'nın kim olduğunu. İkinci sorunun cevabı kehaneti çözmez. Vergilius burada ilk kez modern konuşur: kısa, sıcak ve kesin cümlelerle. Beatrice'in adı geçmez; Vergilius ondan yalnızca "her" diye söz eder. Kendi dışlanmışlığını yakınmadan, bir gerçeği söyler gibi söyler; bu hüzün Kanto IV'te doruğa çıkacak.

### [inf01.s7.b1] Another Road

```script
@mode: dialogue
@music: Çok alçak, tek bir yaylı. Tazı vinyetinde kısa bir boru sesi.
EKLEME: Tazı kehaneti kısa bir gravür vinyetiyle gösterilir; vinyet tazının kim olduğunu ima etmez. Dante'nin araya giren iki kısa sorusu şiirde yok (Vergilius I 91–129'u kesintisiz söyler); uzun konuşmayı modern köprülere böler ve kehaneti çözmeye çalışmaz. | Dayanak: Inferno I, 92 ve 100–111
QUOTE VIRGIL (Inferno I, 91–93)
> "Thee it behoves to take another road,"
> Responded he, when he beheld me weeping,
> "If from this savage place thou wouldst escape;
GLOSS: Behoves is an old word for "is needful". Virgil means the hill cannot be climbed this way.
VIRGIL (gentle): She lets no one pass. She harries all who try until she destroys them, and the more she eats, the hungrier she grows.
DANTE (afraid): Then no one will ever get past her?
VIRGIL (quiet): Not until the Greyhound comes. He will hunger only for wisdom, love and virtue, and he will hunt her back into Hell.
CAM: engrave — arka plandaki geniş ova bir Doré gravürüne döner: şehirler, ırmaklar ve aralarında koşan iki karaltı, bir tazı ve bir kurt
DO: Vinyet üç saniye sürer. Tazının yüzü hiç görünmez; yalnızca koşan bir siluettir. Kurt şehirden şehre kaçar ve gravürün alt kenarındaki karanlığa düşer.
CAM: unengrave
EFFECTS: codex:inf01.greyhound
DANTE (quiet): Who is he?
VIRGIL (quiet): I cannot name him. I can tell you only that he will come.
```

### [inf01.s7.b2] Two Roads

```script
@mode: play
EKLEME: İki yol arasındaki serbest yürüyüş ve Vergilius'un uyarısı şiirde yok. | Dayanak: Inferno I, 91–96
DO: Oyuncu kontrolü geri alır. Yukarıda tepe güneşte parlar; yamacın ortasında kurt dolaşır, aslan yolun üst ucunda bekler. Vergilius vadinin batı ucunda, tepenin omzunu dolanıp aşağı inen dar ve gölgeli bir patikanın başında durur. Kontrol geri gelir gelmez Dante'nin başı bir an tepeye, güneşe döner; Vergilius'un sesi onu oradan çağırır.
// BARK akışta koşulsuz oynar (runner onu sırası gelince gösterir); bu yüzden tepkiye değil, Dante'nin tepeye bakışına bağlandı.
BARK VIRGIL: Not that way. That way is hers.
DO: Oyuncu yine de yamaca, kurda doğru yürürse kurdun nefesi yükselir ve korku bölgesi başlar; kurt yolun ortasına iner ve Dante'yi yavaşça geri iter. Ceza yoktur; Vergilius patikanın başında bekler.
HINT: The hill is closed to us now. Our road goes around it, and down.
HINT-SHORT: Around the hill, and down.
```

### [inf01.s7.b3] The Eternal Place

```script
@mode: dialogue
@place: inf01_other_road
@trigger: enter:inf01_other_road
VIRGIL: Listen, then. This is the road I can give you.
QUOTE VIRGIL (Inferno I, 112–117)
> Therefore I think and judge it for thy best
> Thou follow me, and I will be thy guide,
> And lead thee hence through the eternal place,
> Where thou shalt hear the desperate lamentations,
> Shalt see the ancient spirits disconsolate,
> Who cry out each one for the second death;
GLOSS: The eternal place is Hell. Readers differ on the second death: damnation itself, or a death the damned beg for, to end their pain.
VIRGIL: After that, you will see souls who burn and are content, because one day they hope to rise.
VIRGIL (quiet): If you would climb higher still, a soul worthier than I will lead you. I will leave you with her.
VIRGIL (quiet): I cannot take you there. I lived outside the law of the Emperor who reigns above, and he wills that none enter his city through me.
VIRGIL (quiet): He rules everywhere, but that city is his own. Happy is the one he calls to it.
```

## [inf01.s8] The Motive

Kantonun ana seçimi. Şiirde Dante, Vergilius'un sözü biter bitmez yakarır ve üçünü birden ister: kaçmayı, Aziz Petrus'un kapısını görmeyi ve kayıp ruhları görmeyi (I 130–135). Bu yüzden seçimden önce modern bir konuşma yoktur, yalnızca kısa bir anlatım şeridi vardır: Dante son bir kez tepeye bakar ve rehberine döner. Şerit, kayıttan devam eden oyuncuya da (kayıt noktası sahne başıdır) seçimin bağlamını verir. Oyuncu birini seçer; kart, Dante'nin üçünü de istediğini gösterir (`canon=all`, başlık her durumda "As Dante did"). Seçilen neden üç ayrı bayrak olarak III, IV ve V'e taşınır. Vergilius'un her seçeneğe verdiği kısa cevap, o bayrağın ileride nasıl yankılanacağını sezdirir ama hiçbir seçeneği yargılamaz. Güven değişimi (b) sayıyla değil, Vergilius'un bir adım yaklaşmasıyla gösterilir.

### [inf01.s8.b1] What Dante Asked

```script
@mode: dialogue
NARRATION: Dante looked once more at the sunlit hill. Then he turned to his guide.
CHOICE inf01.c4 major "Why Dante goes"
PROMPT: The long road lay before him. He had to say what he wanted from it.
OPTION a ["Lead me out of this misery."]
VIRGIL (gentle): Then keep close. There is no short road out.
EFFECTS: virtue:prudence+1, flag:inf01.motive_escape
OPTION b ["Lead me to Saint Peter's gate."]
DO: Vergilius bir adım yaklaşır.
VIRGIL (quiet): You will see it. Not from here, and not soon.
EFFECTS: trust+1, flag:inf01.motive_gate
OPTION c ["Show me the ones you spoke of."]
VIRGIL (sad): You will see them. Some will want to be heard. Some will want to be remembered.
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
END CHOICE
```

### [inf01.s8.b2] Behind Him

Kantonun son dizesi burada oynanır, okunmaz. Vergilius önde yürür, oyuncu ardından gider; dize kolofonun sol sayfasında tek başına durduğunda oyuncu onu zaten yürümüş olur. Oyunun ilk melodisi bu yürüyüşle başlar. Kanto II günün bitişiyle açıldığı için (II 1) yürüyüş akşamdan önce, güneş batıya kayarken biter; akşam ve karanlık yamaç (II 40) Kanto II'ye bırakılmıştır.

```script
@mode: play
@place: inf01_hillside_path
@music: Oyunun ilk melodisi: Gregoryen esintili, iki sesli, ağır bir yürüyüş teması.
EKLEME: Takip öğreticisi; Vergilius'un önde yürümesi I 136'nın oynanmasıdır. Dize burada gösterilmez, kolofonda okunur. | Dayanak: Inferno I, 136
DO: Vergilius döner ve patikaya yürür. "Follow" istemi belirir. {tutorial:follow}
DO: Oyuncu geride kalırsa Vergilius durur, yarım döner ve bekler; oyuncu yaklaşınca yürümeye devam eder. Aradaki mesafe Vergilius'un güvenini gösterir (motor; sayı yoktur).
DO: Patika tepenin omzunu dolanır ve hafifçe aşağı iner. Yürüdükçe güneş batıya kayar, gölgeler uzar. Arkada, tepenin üstünde kurdun karaltısı küçülür.
HINT: Walk behind me and keep my pace. When I stop, you may rest.
HINT-SHORT: Stay behind me.
DO: Patikanın bir dönemecinde yosunlu bir taş bank vardır. Vergilius bir an oturur ve Dante'yi bekler. Bu kez bank boş değildir. {checkpoint}
DO: Dante yetişince Vergilius kalkar ve yürümeye devam eder. Birkaç adım sonra kontrol kilitlenir.
CAM: engrave — sahne bir Doré gravürüne döner: patikada önde yürüyen uzun bir gölge ve ardından gelen küçük bir figür
CAM: page-turn
```

## [inf01.s9] Colophon

### [inf01.s9.b1] In this canto

Sol sayfada kantonun son dizesi tek başına durur. Oyuncu bu dizeyi bir dakika önce yürümüştür.

Sağ sayfa ("In this canto"): dört seçim, oyuncunun kaydı ve Dante'ninki yan yana; üç ertelenmiş kart (`inf01.c1`, `inf01.c2`, `inf01.c3`) burada açılır. Dört söz köken dizeleriyle: Fear (I 6), Way (I 12), Hope (I 41), Love (I 83). Codex kayıtları Kanto IV'e kadar başlıksız, kapalı sayfalar olarak sayılır (öneri: "8 pages, not yet read"). Terazi yoktur; III'te açılır.

`unlock:book` ile Kitap açılır: Cantos, Verses ve Words sekmeleri. Kantonun tam Longfellow metni Cantos sekmesine eklenir; oyuncunun gördüğü dizeler altınla işaretlidir. Geriye bakmayan oyuncu I 22–27'yi burada işaretsiz bulur. Codex ve Remembrance sekmeleri Kanto IV'te açılır. "Turn the page" ile Kanto II'ye geçilir.

```script
@mode: colophon
QUOTE POET (Inferno I, 136)
> Then he moved on, and I behind him followed.
EFFECTS: unlock:book
```

## Codex

Kanto I'in sekiz kaydı sessizce birikir ve Kanto IV'te Codex açıldığında görünür (§2.12). `inf01.sunlit_hill` ve `inf01.first_morning`, §4.5'teki en az kümeye eklenmiş kayıtlardır.

```codex
ID: inf01.dark_wood
TAB: places
TITLE: The Dark Wood
QUOTE POET (Inferno I, 1–3)
> Midway upon the journey of our life
> I found myself within a forest dark,
> For the straightforward pathway had been lost.
NOTE: In the poem Dante finds himself in a dark wood and cannot say how he entered it. Readers usually take midway to mean thirty-five, half of the seventy years the Psalms allow a life; Dante, born in 1265, was thirty-five in 1300. Readers have long seen the wood as a life gone astray.
RELATED: inf01.sunlit_hill
```

```codex
ID: inf01.sunlit_hill
TAB: places
TITLE: The Mount Delectable
QUOTE VIRGIL (Inferno I, 77–78)
> Why climb'st thou not the Mount Delectable,
> Which is the source and cause of every joy?"
NOTE: In the poem a hill rises where the dark valley ends, its shoulders lit by the sun, which Dante, like the astronomers of his day, counts among the planets. Three beasts bar his climb, and the last drives him back. Virgil offers him a longer road instead. Readers have long seen the hill as the happy life, which no one reaches by his own strength alone.
RELATED: inf01.dark_wood, inf01.she_wolf
```

```codex
ID: inf01.first_morning
TAB: lore
TITLE: The Hour and the Season
QUOTE POET (Inferno I, 37–40)
> The time was the beginning of the morning,
> And up the sun was mounting with those stars
> That with him were, what time the Love Divine
> At first in motion set those beauteous things;
NOTE: In the poem the sun rises among the same stars that were with it when divine love first set the heavens moving. Medieval tradition held that the world was created in spring, with the sun in Aries. Readers traditionally date the journey to Easter week of the year 1300.
RELATED: inf01.panther
```

```codex
ID: inf01.panther
TAB: souls
TITLE: The Panther
QUOTE POET (Inferno I, 32–33)
> A panther light and swift exceedingly,
> Which with a spotted skin was covered o'er!
NOTE: The first of the three beasts on the slope. In the poem she does not attack; she keeps herself in front of Dante until he turns back, again and again. Dante's Italian word, lonza, is rare and may mean a leopard, a lynx or a panther. Readers have long seen her as lust, or as fraud.
RELATED: inf01.lion, inf01.she_wolf
```

```codex
ID: inf01.lion
TAB: souls
TITLE: The Lion
QUOTE POET (Inferno I, 46–48)
> He seemed as if against me he were coming
> With head uplifted, and with ravenous hunger,
> So that it seemed the air was afraid of him;
NOTE: The second beast. In the poem he only seems to come at Dante, head high and starving, so fierce that the very air seems to fear him. Readers have long seen the lion as pride, or as violence.
RELATED: inf01.panther, inf01.she_wolf
```

```codex
ID: inf01.she_wolf
TAB: souls
TITLE: The She-wolf
QUOTE VIRGIL (Inferno I, 97–99)
> And has a nature so malign and ruthless,
> That never doth she glut her greedy will,
> And after food is hungrier than before.
NOTE: The third beast, and the one Dante cannot pass. In the poem she drives him back toward the dark, step by step, until he gives up hope of the summit. Virgil says that she lets no one pass, and that many more beasts will mate with her before the Greyhound comes. Readers have long seen her as greed: a hunger that is never satisfied.
RELATED: inf01.greyhound, inf01.panther, inf01.lion
```

```codex
ID: inf01.virgil
TAB: souls
TITLE: Virgil
QUOTE VIRGIL (Inferno I, 73–75)
> A poet was I, and I sang that just
> Son of Anchises, who came forth from Troy,
> After that Ilion the superb was burned.
NOTE: Publius Vergilius Maro (70–19 BC), the Roman poet of the Aeneid, the story of Aeneas, who fled burning Troy and became the forefather of Rome. Dante calls him his master and his author. In the poem he appears out of the silence when Dante is lost and offers to guide him through Hell and Purgatory. Why he came, Dante learns that same evening.
RELATED: inf04.virgil_limbo
```

```codex
ID: inf01.greyhound
TAB: lore
TITLE: The Greyhound
QUOTE VIRGIL (Inferno I, 101–105)
> And more they shall be still, until the Greyhound
> Comes, who shall make her perish in her pain.
> He shall not feed on either earth or pelf,
> But upon wisdom, and on love and virtue;
> 'Twixt Feltro and Feltro shall his nation be;
NOTE: Virgil foretells a hound that will hunt the she-wolf back to Hell, living not on land or money (pelf) but on wisdom, love and virtue. No one knows for certain who the Greyhound is: readers have proposed an emperor, a pope, Dante's patron Cangrande della Scala, even Christ. Virgil also names heroes of his own Aeneid who died for Italy, among them Camilla.
RELATED: inf01.she_wolf, inf04.heroes
```

**Kapanış notu: sapmalar, eklemeler ve baş yazara açık sorular**

- **SAPMA: yok.** Omurga olduğu gibi duruyor: orman, vadinin sonu, güneşli tepe, sırasıyla üç hayvan, kurdun Dante'yi geri itmesi, Vergilius'un gelişi ve kendini tanıtması, başka yol, Tazı kehaneti, yolculuk teklifi, Dante'nin isteği ve son dize: *Then he moved on, and I behind him followed.* (Inferno I, 136). Şiirde susan hiçbir karaktere söz verilmedi: hayvanlar sessiz, Beatrice'in adı geçmiyor, Vergilius'un dizeleri başka bir sese verilmedi. Dante'nin s6'ya kadar susması da bir sapma değil, şiire sadakattir: şiirde de yolcu Dante'nin ilk sözü I 65'tir.
- **EKLEME'ler** (her biri kendi vuruşunda not edildi): uyanış ve hareket öğreticisi (s1.b1); korku bölgeleri (s1.b2); en karanlık geçit (s1.b3); sözün bıraktığı ışık izi (s1.b4); ardından akan karanlık ve atılma (s1.b5); ışığa bakarken yatışan korku (s2.b1); geriye bakma (s2.b2, onaylı); boş taş bank (s2.b3); parsın dansı ve şafağı bekleme (s3.b1, onaylı); parsın şafakla çekilmesi (s3.b2, onaylı "hayvanların nasıl geçildiği" kapsamında); aslanın hamleleri ve kükreme (s4.b1, onaylı); kurdun geri itmesi ve aşağıdaki biçim (s5.b2, onaylı); güneşin sustuğu yerin gerçek sessizliği (s5.b5); seslenme öğreticisi (s6.b2); kurdu gösterme (s6.b5); Tazı vinyeti ve Dante'nin Vergilius'un konuşmasına giren iki kısa sorusu (s7.b1); iki yol (s7.b2); takip öğreticisi (s8.b2).
- **Onay bekleyen biçim kararları:**
  1. Üç sistemik seçime (`inf01.c1`–`c3`) isteğe bağlı birer REVEAL eklendi ve kolofona ertelendi (§2.9 izin verir). Bağlayıcı ID, harf ve etkiler değişmedi. Kanon: c1 `none` (I 34–36), c2 `none` (I 44–45), c3 `a` (I 52–54). Üç dize de sahnede gösterilmiyor (§2.11, "Tekrar etme").
  2. I 136 s8'de oynanıyor, metni yalnızca kolofonda çıkıyor; §7.1'deki "Ardından I 136" önerisinden bu yönde ayrılıyor. Gerekçe: dize iki kez görünmesin; oyuncu dizeyi önce yürüsün, sonra okusun.
  3. Söz toplama E ile Kanto I'de başladığı için `{tutorial:read}` burada (Way, s1.b4) kullanıldı. §7.2'deki "Söz toplama mekaniği burada öğretilir" notu II'de sayfa okumaya daraltılabilir.
  4. s0–s5'te hiçbir alıntıda GLOSS yok ve Q boş bir kenar açıyor; ilk GLOSS Vergilius'un dizesinde (s6.b3). Bu dizelerin açıklamaları Codex'te.
  5. İncil'deki aslan örneği ("The lion came straight at him, head high, starving.") kullanılmadı: I 46–48 aynı sahnede gösterildiği için §6.2'ye aykırı olurdu.
  6. Kanto II'yle süreklilik: Kanto I, yamaçtaki patikada güneş batıya kayarken biter; akşam Kanto II'nin açılışına bırakıldı.
  7. Vergilius'un görünüşü bölüm içinde tutarsız: bu dosya ve hazır sprite (`src/art/figures/virgil.ts`) soluk gri-mavi bir pelerin ve solmuş bir defne çelengi tanımlıyor; Kanto IV (s2) ise Limbo'daki tek rengi "Vergilius'un pelerininin soluk kırmızısı" diye anlatıyor. Biri seçilmeli; bu dosya değiştirilmedi.
- **Sürüm 0.2 (editör geçişi).** Kimlikler, bayraklar, olaylar, yerler, söz ve seçim kimlikleri ile bütün Longfellow alıntıları aynen kaldı; kancalı vuruşlarda `DO` satırlarının sayısı ve sırası korundu. Değişenler: geriye bakma tuşu E'den R'ye (GDD 2.2 ve motorla uyum); s1.b5, s3.b1 ve s4.b1'e `enter:` tetikleyicisi (yürüyüş ve tırmanış artık ışınlanmayla atlanmıyor); aslan şeridi (koşmayan oyuncu için de doğru); kurdun doğası ve Tazı (s7.b1) ile Vergilius'un yasağı (s7.b3) şiire daha yakın; s8.b1'deki uydurma ön konuşma yerine kısa bir anlatım şeridi; c3 kartının notu; üç Codex notunda kesinlik; eksik EKLEME notları; kararsız kalan oyuncu için zaman aşımları (s5.b3, s5.b4, s6.b2, s6.b5); süre tablosu; seçimlerin izleri ve yer/olay tabloları.
