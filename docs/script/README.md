# Senaryo İncili ve Senaryo Biçimi

**Kitap I · Inferno — Bölüm 1 (Kanto I–V)** · Sürüm 1.0 · 6 Ekim 2026

Bu belgenin iki işi var. Birincisi, Kanto I–V'i aynı anda ve birbirinden habersiz yazacak beş senarist için ortak hikâye incili olmak: ton, karakterler, sistemler ve kanto iskeletleri burada. İkincisi, senaryo dosyalarının biçimini tanımlayan bir sözleşme olmak: programcı `docs/script/inferno-0N.md` dosyalarını bu belgeye bakarak oyun verisine çevirecek.

Belge `docs/GDD.md`'yi tamamlar. Çeliştikleri yerler §6.7'de listelenmiştir; GDD o maddelerde güncellenecektir.

Kaynak metin `docs/source/inferno/canto-NN.txt` dosyalarıdır (Longfellow, 1867, kamu malı). Inferno'da Longfellow'un dize numaraları İtalyanca asılla birebir aynıdır.

**İçindekiler**

0. Belge nasıl kullanılır
1. Amaç: oynanabilir kitap
2. Senaryo dosya biçimi
3. Sistem kuralları
4. Kimlik (ID) kaydı
5. Karakter İncili
6. Ton ve yazım kuralları
7. Kanto iskeletleri (I–V)
- Ek A. Teslim kontrol listesi
- Ek B. Terimler sözlüğü

---

## 0. Belge nasıl kullanılır

### 0.1 Bağlayıcılık

- **BAĞLAYICI** maddeleri değiştirmek için baş yazarın onayı gerekir. Bunlar: dosya biçimi (§2), etki ve koşul dilbilgisi, alıntı kuralları, söz tablosu (§3.4.6), ID kaydı (§4) ve §7'deki şu öğeler: sahne kimlikleri, seçim kimlikleri, seçenek harfleri, seçeneklerin etkileri ve REVEAL alıntıları.
- **ÖNERİ** maddelerini yazar geliştirebilir. Bunlar: seçenek metinlerinin ve repliklerin ifadesi, sahne içindeki vuruşların ayrıntısı, örnek replikler.
- Bir kural sahnene uymuyorsa kuralı kendi başına esnetme, baş yazara sor. Paylaşılan kayıtları (§3.4.6 ve §4) yalnızca baş yazar günceller.

### 0.2 Dil kuralı

| Metin | Dil |
|---|---|
| Düzyazı, tasarım notları, sahne yönergeleri (`DO`, `CAM`, `SFX`), `SAPMA` ve `EKLEME` notları, `//` yorumları | Türkçe |
| Oyun içindeki her metin: diyalog, anlatım (`NARRATION`, `PAGE`), seçenekler, `PROMPT`, `NOTE`, `GLOSS`, `HINT`, `BARK`, Codex ve anı metinleri, söz adları, arayüz | İngilizce |
| Longfellow alıntıları | İngilizce. `docs/source` dosyasındaki gibi, harfi harfine ve atıflı: `(Inferno V, 121–123)` |

### 0.3 Kararların özeti

| Konu | Karar | Bölüm |
|---|---|---|
| Kalp (Heart) | İki sayaç vardır: `pity` ve `justice`. Yalnızca artarlar. Her artış hangi günaha karşı olduğunu bir etiketle de kaydeder (`pity+2@limbo`). Ekranda tek bir terazi görünür: kefeler sayaçları, kirişin eğimi dengeyi (`heart = pity − justice`) gösterir. | §3.1 |
| Büyüklükler | `minor` ±1, `major` ±2, `centre` ±3. `centre` bu bölümde yalnızca Francesca sahnesinde kullanılır. | §2.9 |
| Seçim bütçesi | Her kantoda bir `major` (ya da `centre`) seçim, 0–2 `minor` diyalog seçimi ve 0–3 sistemik ölçüm | §3.2 |
| Vergilius'un güveni | `trust` 0–10 arasındadır ve Vergilius ilk konuştuğunda 4 olur. Öğüdüne uymak +1, öğüdüne karşı gitmek −1. | §3.3 |
| Sözler | Bölüm 1'de 14 söz vardır; biri Yük, biri koşullu. Her söz, köken dizesinin **son kelimesidir** (Wall'un dizesi kelimenin çoğuluyla, "walls" ile biter). Bu yüzden oyuncunun tercetleri, sonları gerçekten kafiyeli Longfellow dizelerinden kurulur. | §3.4 |
| Anma | Bölüm 1'de tek anı vardır: `inf05.paolo_francesca`. Kararsızlar hiç anılamaz (III 49). Limbo'dakiler zaten anılıyor (IV 76–78). | §3.5 |
| Erdemler | Dört kardinal erdem +1'lik adımlarla büyür. Kaynakları diyalog seçimleri ve bekçilerin **nasıl** geçildiğidir. | §3.6 |
| "What Dante did" | Her diyalog seçiminden sonra bir kart çıkar. Kanto V'in merkez sahnesindeki iki kart (`inf05.c3`, `inf05.c4`) kanto sonuna ertelenir. | §2.11 |
| Biçim | Markdown ve YAML ön bilgi. Oyun içeriği ` ```script ` bloklarında durur. Örnek ID'ler: `inf05.s6.b3`, `inf05.c4`, `flag:inf05.verdict_pity`. | §2 |

### 0.4 On altın kural

1. **Dante'nin metni yalnızca Longfellow'dur.** Her alıntı harfi harfine kopyalanır ve atıf taşır. Kendi yazdığımız hiçbir cümle Dante'ninmiş gibi sunulmaz.
2. **Arkaik dil yalnızca şiire aittir.** Modern repliklerde *thee, thou, doth, hath, 'tis* yoktur. Okur "thou" gördüğü her yerde bir atıf da görür.
3. **Omurga Dante'nindir.** Rota, mekânlar ve büyük olaylar değişmez. Oyuncu Dante'nin iç tepkisini seçer.
4. **Okur aslını öğrenir.** Her diyalog seçiminden sonra "What Dante did" kartı şiirdeki Dante'nin ne yaptığını gösterir.
5. **Günahkâr düşman değildir.** Öldürmek yoktur. Bekçiler atlatılır, sersemletilir ya da geçilir.
6. **Bazı sesler kutsaldır.** Paolo hiç konuşmaz. Francesca, Beatrice ve Lucia yalnızca Longfellow konuşur. Tanrı, Mesih ve Meryem ekranda yüzle gösterilmez ve hiçbir modern cümle söylemez.
7. **Şiir sustuğunda oyun da susar.** Örneğin şairlerin yoldaki konuşması yazılmaz (IV 104).
8. **Seçenekte sistem dili olmaz.** "Pity", "Justice", "Trust" gibi kelimeler ya da sayılar seçenek metninde görünmez.
9. **Kimlikler kalıcıdır.** Dosya `review` aşamasına geçtikten sonra hiçbir ID yeniden numaralandırılmaz.
10. **Emin değilsen kaynağı aç.** Alıntıyı bellekten yazma. `docs/source/inferno/canto-NN.txt` dosyasından kopyala.

---

## 1. Amaç: oynanabilir kitap

### 1.1 Dördüncü kuşak kitap

Birinci kuşak kitap düz metindir. İkincisi resimli kitap, üçüncüsü çizgi romandır. Bu proje dördüncü kuşağı deniyor: okunan, oynanan ve okurun da etkilediği bir kitap. Merkezde *İlahi Komedya*'nın konuşmaları ve karakterleri var. Oynanış okumaya hizmet eder. Aksiyon uğruna metinden de karakterlerden de ödün verilmez.

Okur kitabın yolunu değiştirmez, Dante'nin içini etkiler. Oyuncunun payı şunlardır:

- Dante'nin bir karşılaşmaya iç tepkisi: acıma ya da adalet, korku ya da cesaret.
- Karakterinin sınırları içinde ne söylediği.
- Ne öğrendiği ve neyi hatırladığı.
- Hangi sözleri topladığı ve hangi dizeleri kurduğu.
- Bu seçimlerin sonraki kantolara ve kitaplara taşınan sonuçları.

Dante yine üç hayvanla karşılaşır, yine Akheron'u geçer, Francesca'dan sonra yine bayılır. Her anlamlı seçimden sonra kitap, şiirdeki Dante'nin ne yaptığını Longfellow'un dizesiyle gösterir. Okur kendi yolunu yürürken aslını da öğrenir.

### 1.2 Üç metin katmanı

| Katman | Script satırı | Ses | Ekranda | Kural |
|---|---|---|---|---|
| **Şiir** | `QUOTE` | Şiirin anlatıcısı (`POET`), şiirde o sözleri söyleyen karakter ya da kapı yazısı (`INSCRIPTION`) | Dize balonu ya da kitap sayfası. Serif piksel yazı, ince altın çizgi, altta atıf. Dizeler harf harf yazılmaz, dize dize belirir. | Yalnızca Longfellow, harfi harfine |
| **Kitabın sesi** | `NARRATION`, `PAGE` | Kitap | Ekranın üstünde parşömen şerit (`NARRATION`) ya da tam sayfa (`PAGE`) | Bizim İngilizcemiz. Üçüncü tekil şahıs, geçmiş zaman. Kısaltma ve arkaik dil yok. |
| **Modern diyalog** | `DANTE: …` vb. | Karakterler | Portreli konuşma balonu, harf harf | Bizim İngilizcemiz. Sade, ağırbaşlı, kısa. |

Seçenekler, istemler (`PROMPT`), kart notları (`NOTE`) ve sade açıklamalar (`GLOSS`) da bizim İngilizcemizdir. Bunlar her zaman kitabın **kenar boşluğunda**, şiirden ayrı bir çerçevede görünür.

İki "Dante" vardır. Karıştırılmamalıdır:

- **POET:** Şiiri yıllar sonra yazan Dante. Yalnızca Longfellow alıntılarında ve birinci tekil şahısla konuşur: *I found myself…* (Inferno I, 2)
- **DANTE:** Oyuncunun oynadığı, yolculuğu yaşayan Dante. Modern repliklerde konuşur. Kitabın sesi ondan "Dante" ya da "he" diye söz eder.

Böylece "I" diyen anlatım her zaman Longfellow'dur, "he" diyen anlatım her zaman bizimdir. Okur hangi cümlenin Dante'nin, hangisinin bizim olduğunu her an görebilir.

### 1.3 Bir kanto nasıl sunulur

1. **Açılış sayfası** (`s0`, `@mode: page`). Ekran kararır ve kitap açılır. Sol sayfada küçük harflerle "INFERNO", büyük tezhipli bir harfle kanto numarası ("CANTO III"), İngilizce başlık ("The Gate") ve kantonun 96×64 piksellik, Doré tarzı siyah-beyaz vinyeti durur. Sağ sayfada en çok üç dizelik epigraf ve atfı vardır. Oyuncu E (gamepad: A) ile sayfayı çevirir. Sayfa ilk okumada en az 3 saniye ekranda kalır; sonraki oynayışlarda atlanabilir. Toplam süre 8–12 saniyedir.
2. **Gravürden dünyaya.** Vinyet büyüyüp ekranı kaplar, renk sızar ve piksel sahne oynanır hâle gelir (`CAM: unengrave`, yaklaşık 2 saniye). GDD 8.1'deki Doré geçişleri bu kalıbı kullanır.
3. **Oynanış ve anlatım şeritleri.** Kitabın sesi ekranın üstünde, en çok iki cümlelik parşömen şeritler olarak gelir. Güvenli alanlarda şerit, oyuncu bir tuşa basana ya da okuma süresi dolana kadar kalır. Tehlikeli alanlarda oyunu durdurmaz.
4. **Diyalog.** Modern balonlar portreyle ve harf harf gelir. Dize balonları farklı çerçevelidir ve dize dize belirir; altında küçük harflerle atıf yazar. Dize balonu açıkken Q (Vergilius'a sor) basılırsa, varsa `GLOSS` notu kenarda açılır.
5. **Seçim.** Kitabın kenar boşluğu ekranın sağından açılır ve 2–3 seçenek gösterir. Süre sınırı yoktur. Seçenekte sayı ya da sistem terimi yoktur. Seçimden sonra üç şey olur:
   - Terazi simgesi bir an kıpırdar (Kanto III'ten itibaren).
   - Güven değişimi sayıyla değil, Vergilius'un duruşu ve mesafesiyle gösterilir.
   - Kazanılan söz, kart animasyonuyla Kitap'a uçar.
6. **"What Dante did" kartı.** Seçimin sonuçları oynandıktan sonra kenardan bir not kartı kayar. Başlığı "What Dante did"dir; oyuncu Dante'yle aynı şeyi seçtiyse "As Dante did" olur. Kartta 1–6 Longfellow dizesi, atıf ve en çok iki kısa cümlelik sade bir not vardır. E ile kapanır. Bazı kartlar kanto sonuna ertelenir (`timing=deferred`).
7. **Kanto sonu.** Bayılmayla biten kantolarda (III, V) ekran beyaza ya da kızıla, sonra siyaha döner ve kitap kapanır.
8. **Kolofon** (son sahne, `@mode: colophon`). Kitap yeniden açılır. Sol sayfada kantonun son dizesi tek başına durur: terza rima her kantoyu tek bir dizeyle bitirir (her kanto 3n+1 dizedir). Sağ sayfada "In this canto" başlığı altında oyuncunun seçimleri ve Dante'ninkiler (ertelenmiş kartlar burada açılır), kazanılan sözler ve köken dizeleri, anılar, Codex sayfaları ve terazi listelenir. "Turn the page" ile sonraki kantoya geçilir. Kolofonla birlikte kantonun tam Longfellow metni Kitap'ta açılır.
9. **Uyanış.** Önceki kanto bayılmayla bittiyse yeni kantonun epigrafı uyanış dizesidir (IV 1–3). Sayfa çevrilince kısa bir sinematikle oynanışa geçilir. Bu, GDD'nin 2. açık sorusu için önerimizdir.

### 1.4 Ekran taslakları

```text
AÇILIŞ SAYFASI (640×360)
┌───────────────────────────────┬───────────────────────────────┐
│            INFERNO            │                               │
│                               │    <epigraf, 1. dize>         │
│        ▓▓ CANTO III           │    <epigraf, 2. dize>         │
│           The Gate            │    <epigraf, 3. dize>         │
│                               │                               │
│    [ Doré vinyeti, 96×64 ]    │              <atıf>           │
│                               │                 [E] Turn ▸    │
└───────────────────────────────┴───────────────────────────────┘

DİZE BALONU                          KİTABIN SESİ (şerit)
╭─ VIRGIL ─────────────────────╮    ┌───────────────────────────────┐
│ <dize>                        │    │ <en çok iki cümle; üçüncü     │
│ <dize>                        │    │  tekil şahıs, geçmiş zaman>   │
│ <dize>                        │    └───────────────────────────────┘
│                      <atıf>   │
╰──────────────────── [Q] gloss ╯

SEÇİM (kenar boşluğu)               "WHAT DANTE DID" KARTI
             ┌──────────────────┐   ╭─ What Dante did ──────────────╮
             │ ▸ <seçenek a>    │   │ <1–6 Longfellow dizesi>       │
             │   <seçenek b>    │   │                   <atıf>      │
             │   <seçenek c>    │   │ <kısa sade not>               │
             └──────────────────┘   ╰─────────────────────── [E] ───╯
```

### 1.5 Okuma modu: Kitap (The Book)

Duraklatma menüsü bir kitaptır. Sekmeleri şunlardır:

| Sekme | İçerik | Kim üretir |
|---|---|---|
| **Cantos** | Oynanmış her kanto için dört bölüm: (a) başlık ve epigraf; (b) "As you lived it": oyuncunun gördüğü `NARRATION` ve `QUOTE` satırları sırasıyla, kenarda seçim notları ("You chose … · Dante …"); (c) "Your verses": o kantoda kurulan tercetler (§3.4.5); (d) "The whole canto": kolofonda açılan tam Longfellow kantosu. Oyuncunun oyunda gördüğü dizeler altınla işaretlidir, her dize numaralıdır. | Otomatik (senaryodan) |
| **Verses** | Görülen bütün Longfellow alıntıları, kanto ve dize sırasıyla | Otomatik |
| **Words** | Söz kartları (ad, kafiye ailesi, kategori, köken dizesi) ve tercet kurma ekranı | Otomatik (§3.4.6) |
| **Souls · Places · Lore** | Codex kayıtları | Yazarlar (§2.12) |
| **Remembrance** | Anılar: "Remembered by the world" ve "Remembered by you" | Yazarlar (§2.13) |
| **Map** | Botticelli tarzı kesit harita (GDD 9) | Tasarım |

Oyunun sonunda **Your Comedy** sayfası açılır; her bölüm sonunda da önizlemesi görünür. Bu sayfada oyuncunun kurduğu bütün tercetler sırayla, aralarında seçimlerinin kenar notlarıyla durur. Her tercet Longfellow dizelerinden kurulduğu için (§3.4.5), bu "oyuncunun kendi Komedya'sı" tek bir sahte Dante dizesi içermez.

### 1.6 Ayarlar ve erişilebilirlik

- **What Dante did:** "After each choice" (varsayılan), "At the end of the canto" ya da "Only in the Book".
- Metin hızı, dize gösterimi ("line by line" ya da "all at once"), yazı boyutu, yüksek karşıtlık.
- Terazi ve kart simgeleri yalnızca renge dayanmaz: acıma bir gözyaşı biçimiyle, adalet bir kefe biçimiyle de ayrılır.
- Atıflar her zaman görünür ve kapatılamaz.

---

## 2. Senaryo dosya biçimi

### 2.1 Dosyalar ve karakterler

- Her kanto için bir dosya: `docs/script/inferno-01.md` … `docs/script/inferno-05.md`. Sonraki kantolar aynı kalıbı izler (`inferno-06.md`, `purgatorio-01.md` …).
- Kodlama UTF-8, satır sonu LF.
- Tırnaklar kaynaktaki gibi **düz** tırnaktır (`"` ve `'`). Editörün bunları akıllı tırnağa (“ ” ‘ ’) çevirmesine izin verme.
- Üç nokta tek karakterdir: `…` (U+2026). `...` yazılmaz.
- Atıflardaki aralık çizgisi en dash'tir: `–` (U+2013). `121-123` yazılmaz.
- Modern repliklerde uzun çizgi (`—`) serbesttir.

### 2.2 Ön bilgi (front matter)

Her dosya YAML ön bilgiyle başlar. Bütün alanlar zorunludur. Boş listeler `[]` diye yazılır.

| Alan | Tür | Açıklama | Örnek |
|---|---|---|---|
| `id` | metin | Kanto öneki (§4.1) | `inf03` |
| `canticle` | metin | | `Inferno` |
| `canto` | tamsayı | | `3` |
| `title` | metin (EN) | Oyun içi başlık | `"The Gate"` |
| `title_tr` | metin (TR) | İç kullanım | `"Kapı"` |
| `location` | metin (EN) | HUD'daki yer adı (GDD 9) | `"Ante-Inferno"` |
| `source` | yol | | `docs/source/inferno/canto-03.txt` |
| `lines` | aralık | Kantonun bütün dizeleri | `"1–136"` |
| `epigraph` | atıf | `s0` sahnesindeki alıntıyla aynı | `"Inferno III, 1–3"` |
| `closing` | atıf | Kolofonun sol sayfasındaki son dize | `"Inferno III, 136"` |
| `characters` | liste | Konuşmacı ID'leri (§4.8) | `[DANTE, VIRGIL, CHARON]` |
| `mechanics` | liste | Mekanik sözlüğünden (§7.0) | `[crowd_flow, swarm]` |
| `choices` | liste | Dosyadaki bütün seçimler | `[inf03.c1, inf03.c2, inf03.c3]` |
| `words` | liste | Bu kantoda **ilk kez** verilen sözler, koşullular dahil. Mühür açan `word:` etkileri (IV'teki `word:Hope`) yazılmaz. | `[Stay, Desire]` |
| `memories` | liste | | `[]` |
| `codex` | liste | | `[inf03.gate, inf03.charon]` |
| `flags_set` | liste | Bu dosyanın kaldırdığı bayraklar | `[inf03.left_hope]` |
| `flags_read` | liste | Başka kantodan okunan bayraklar (yalnızca §4.3'tekiler) | `[inf01.motive_gate]` |
| `unlocks` | liste | `unlock:` ile açılan özellikler | `[heart]` |
| `playtime` | aralık | Dakika, okuma dahil | `"8–12"` |
| `writer` | metin | | `"Ayşe K."` |
| `status` | `draft`, `review` ya da `locked` | | `draft` |
| `version` | metin | | `"0.1"` |

### 2.3 Dosya iskeleti

````markdown
---
id: inf03
canticle: Inferno
(… ön bilginin geri kalanı …)
---

# Inferno III — The Gate

Yazarın genel notu (Türkçe, serbest).

## [inf03.s0] Opening page

### [inf03.s0.b1] Title and epigraph

```script
@mode: page
QUOTE INSCRIPTION (Inferno III, 1–3)
> "Through me the way is to the city dolent;
> Through me the way is to eternal dole;
> Through me the way among the people lost.
```

## [inf03.s1] The Gate

### [inf03.s1.b1] The words over the gate

Bu vuruşa özel tasarım notu (Türkçe, serbest).

```script
@mode: cinematic
// vuruşun satırları
```

## Codex

```codex
ID: inf03.gate
(… §2.12 …)
```

## Memories

```memory
(… yalnızca anı veren kantolarda; §2.13 …)
```
````

- Her dosyada tek bir H1 başlık vardır: `# Inferno III — The Gate` (İngilizce).
- Başlıklarla script blokları arasındaki serbest metin Türkçe tasarım notudur. Ayrıştırıcı bunu yok sayar.
- `## Codex` ve gerekiyorsa `## Memories` bölümleri dosyanın sonundadır.

### 2.4 Sahneler ve vuruşlar

- **Sahne** (`## [inf03.s2] The Air Without a Star`): tek bir mekânda geçen kesintisiz bir zaman dilimidir. Başlıktaki İngilizce ad, Kitap'ın içindekiler listesinde görünür.
- **Vuruş** (`### [inf03.s2.b4] Misericord and Justice`): bir sunum ya da etkileşim birimidir. Her vuruşun altında tam olarak bir ` ```script ` bloğu bulunur.
- `s0` her kantoda açılış sayfasıdır ve tek vuruşu vardır (`s0.b1`). Son sahne kolofondur (`@mode: colophon`).
- **Sahne ID'leri §7'de bağlayıcıdır.** Yazar gerekirse yeni bir sahne ekleyebilir; yeni sahne bir sonraki boş numarayı alır (Kanto I'de `inf01.s10`). Kolofon her zaman dosyanın son sahnesidir; yeni sahne dosyada kolofondan önce durur. Sahnelerin oynanış sırası da dosyadaki sıradır.
- **Vuruş ID'leri yazarındır.** 1'den başlayarak sırayla verilir. Dosya `review` durumuna geçtikten sonra hiçbir ID yeniden numaralandırılmaz. Araya eklenen vuruş, sahnenin bir sonraki boş numarasını alır. Oynanış sırası dosyadaki sıradır, numaraların sırası değildir.
- **Elmas kuralı:** Dallar aynı sahnenin sonunda omurgaya geri döner. Hiçbir dal bir omurga vuruşunu atlayamaz.

### 2.5 Satır türleri

Script bloğundaki her satır aşağıdaki türlerden biridir. Boş satırlar yok sayılır.

| Satır | Anlamı | Dil | Sınır | Örnek |
|---|---|---|---|---|
| `@anahtar: değer` | Yönerge (§2.7) | ID | — | `@mode: dialogue` |
| `NARRATION: …` | Kitabın sesi, şerit | EN | 200 karakter, en çok 2 cümle | `NARRATION: The gate stood open. No one had ever closed it.` |
| `PAGE: …` | Kitabın sesi, tam sayfa | EN | 400 karakter | |
| `SPEAKER: …` ya da `SPEAKER (etiket): …` | Modern diyalog balonu | EN | 140 karakter (kutuda yaklaşık 3 satır) | `VIRGIL (gentle): Leave your fear here, my son.` |
| `QUOTE SES (atıf)` ve ardından `> …` satırları | Longfellow alıntısı (§2.6) | EN (1867) | Blok başına en çok 6 dize | |
| `GLOSS: …` | Hemen üstteki `QUOTE` için sade kenar notu. Q ile açılır. | EN | 160 | |
| `BARK SPEAKER: …` | Oyunu durdurmayan ortam repliği | EN | 60 | `BARK NEUTRAL: —not this way—` |
| `HINT: …` ve `HINT-SHORT: …` | Vergilius'a sor (Q): ilk seferde tam, sonra kısa (GDD 2.5) | EN | 120 ve 60 | |
| `DO: …` | Sahne ve oynanış yönergesi | TR | — | `DO: Kalabalık bayrağın ardından yön değiştirir. {event:inf03.banner_turned}` |
| `CAM: fiil — …` | Kamera ya da sinematik | TR | — | `CAM: zoom-out — kapı yukarıdan` |
| `SFX: …` | Ses yönergesi | TR | — | |
| `EFFECTS: …` | Durum değişikliği (§2.10) | token | — | `EFFECTS: word:Stay, codex:inf03.acheron` |
| `IF`, `ELSE IF`, `ELSE`, `END IF` | Koşul (§2.8) | token | — | `IF flag:inf01.motive_gate` |
| `CHOICE` … `END CHOICE` | Seçim bloğu (§2.9) | — | — | |
| `GOTO <vuruş-id>` | Aynı sahne içinde atlama | — | — | `GOTO inf05.s6.b5` |
| `SAPMA: …` ve `EKLEME: …` | Şiirden ayrılma ya da şiire ekleme notu (§6.5) | TR | — | |
| `// …` | Yorum. Ayrıştırıcı yok sayar. | TR | — | |

**Konuşmacı satırı** şu kalıba uyar: `^([A-Z][A-Z_]*)(?: \(([a-z-]+)\))?: (.+)$`. Konuşmacı §4.8'deki listeden olmalıdır. Parantez içindeki etiket portreyi ve ses tonunu seçer. Etiketler kapalı bir listedir: `afraid`, `gentle`, `stern`, `weeping`, `pale`, `whisper`, `shout`, `awed`, `ashamed`, `sad`, `firm`, `quiet`, `wry`.

**Ayrılmış kelimeler.** Konuşmacı kalıbı `NARRATION: …` gibi satırlara da uyar. Bu yüzden ayrıştırıcı bir satırı önce aşağıdaki kelimelerle dener, konuşmacı kalıbını en son uygular. Bu kelimeler konuşmacı ID'si olamaz: `NARRATION`, `PAGE`, `GLOSS`, `HINT`, `HINT-SHORT`, `BARK`, `DO`, `CAM`, `SFX`, `EFFECTS`, `PROMPT`, `NOTE`, `QUOTE`, `IF`, `ELSE`, `END`, `CHOICE`, `OPTION`, `REVEAL`, `GOTO`, `SAPMA`, `EKLEME` ve Codex/anı alanları (`ID`, `TAB`, `TITLE`, `RELATED`, `NAME`, `KIND`).

**`DO` etiketleri.** `DO` satırı, programcı için makinece okunan şu etiketleri taşıyabilir:

- `{event:<id>}`: programcının yayacağı oynanış olayı. Sistemik seçimler bu olayları dinler.
- `{checkpoint}`: kontrol noktası; Vergilius'un beklediği taş bank (GDD 2.4).
- `{tutorial:<ad>}`: öğretici ipucu. Adlar: `move`, `dash`, `talk`, `follow`, `read`, `compose`, `verse`, `chain`, `shelter`.

**`CAM` fiilleri** kapalı bir listedir. Satır biçimi `CAM: <fiil>` ya da `CAM: <fiil> — <Türkçe açıklama>`dır. Fiiller: `cut`, `fade-in`, `fade-out`, `pan`, `zoom-in`, `zoom-out`, `shake`, `hold`, `follow`, `white-out`, `engrave` (renkli sahne Doré gravürüne döner), `unengrave` (gravürden renge dönüş), `page-turn`.

### 2.6 Longfellow alıntısı: QUOTE

```script
QUOTE VIRGIL (Inferno III, 49–51)
> No fame of them the world permits to be;
> Misericord and Justice both disdain them.
> Let us not speak of them, but look, and pass."
GLOSS: Misericord is an old word for mercy. Neither mercy nor justice will have these souls.
```

- **Başlık:** `QUOTE <SES> (<Kitap> <Roma rakamı>, <ilk>–<son>)`. Tek dize için: `(Inferno III, 9)`.
- **Ses:** `POET` (şiirin anlatıcısı), `INSCRIPTION` (kapı yazısı) ya da şiirde o sözleri söyleyen karakterin ID'si. Ses kimin konuştuğunu gösterir. Bir karakterin dizesi başka bir karaktere verilemez.
- **Dizeler** `> ` ile başlar ve kaynakla harfi harfine aynıdır. Kelimeler, noktalama, büyük harf, yazım, tırnak işaretleri ve kaynaktaki tuhaflıklar (§6.6) olduğu gibi kalır. Blok, `> ` ile başlamayan ilk satırda biter.
- **Kısaltma** yalnızca şu yollarla yapılır:
  1. Dizeler bütün olarak alınır.
  2. Bir dizenin bir parçası alınır ve kesilen yere `…` konur. Kesilmeyen uçta metin dizeyle aynı başlar ya da aynı biter.
  3. Atıf aralığı içinde dize atlamak için satıra yalnızca `…` yazılır.

```script
QUOTE DANTE (Inferno III, 12)
> …"Their sense is, Master, hard to me!"
```

```script
QUOTE FRANCESCA (Inferno V, 100–106)
> Love, that on gentle heart doth swiftly seize,
> …
> Love, that exempts no one beloved from loving,
> …
> Love has conducted us unto one death;
```

- **Atıf**, alınan ilk ve son dizeyi tam olarak kapsar.
- **Sınırlar:** Bir blokta en çok 6 dize olur (iki tercet; motor 3'erli balonlara böler). Bir vuruşta araya `NARRATION`, `DO`, `CAM` ya da seçim girmeden en çok 12 dize art arda gelir. Epigraf en çok 3 dizedir. Kolofonun sol sayfası tek dizedir.
- **GLOSS** isteğe bağlıdır. Dizeyi "çevirmez", okura bir kapı açar: eski bir kelimeyi açıklar, kimin kim olduğunu söyler. Bir dizeden hemen sonra aynı şeyi modern bir balonla tekrar etme; açıklama gerekiyorsa GLOSS'a yaz.

### 2.7 Yönergeler

| Yönerge | Değerler | Açıklama |
|---|---|---|
| `@mode:` | `page`, `cinematic`, `dialogue`, `play`, `colophon` | Vuruşun sunum kipi. Her script bloğunun ilk satırıdır. |
| `@place:` | harita alanı | Tiled alan kimliği: kanto öneki, alt çizgi ve ad (`inf03_gate`) |
| `@trigger:` | `auto`, `enter:<alan>`, `talk:<SPEAKER>`, `event:<id>`, `after:<vuruş-id>` | Vuruşun başlama koşulu. Varsayılan `auto`dur: önceki vuruş bitince başlar. |
| `@music:` ve `@ambience:` | Türkçe açıklama | Ses tasarımı için |
| `@chapter_end:` | `ch1` | Yalnızca Kanto V kolofonunda. Bölüm özetini ve `ch1.*` bayraklarını tetikler (§4.7). |

Bu belgedeki kısa script örnekleri vuruş parçalarıdır; çoğu `@mode` satırı olmadan verilmiştir. Senaryo dosyasında her vuruşun bloğu `@mode` ile başlar (L03).

### 2.8 Koşullar

```text
koşul     := terim { ("and" | "or") terim }       "and", "or"dan önce bağlanır
terim     := "not" terim | "(" koşul ")" | yüklem
yüklem    := flag:<id> | memory:<id> | codex:<id>
           | word:<Söz>                   söz oyuncuda ve mühürsüz
           | sealed:<Söz>                 söz mühürlü
           | choice:<seçim-id>=<harf>     ör. choice:inf05.c4=a
           | seen:<sahne-id | vuruş-id>
           | event:<id>                   yalnızca sistemik seçeneklerin when: kısmında
           | <değişken><işleç><tamsayı>   boşluksuz: trust>=7
değişken  := pity | justice | heart | pity@<günah> | justice@<günah> | trust
           | virtue:prudence | virtue:justice | virtue:fortitude | virtue:temperance
           | resolve | grace
işleç     := >= | <= | > | < | == | !=
tamsayı   := -?[0-9]+                      eksi olabilir: heart<=-3
```

Örnek:

```script
IF flag:inf02.courage_beatrice and not flag:inf03.left_hope
VIRGIL (quiet): She came down into this quiet to send me to you.
ELSE IF trust>=7
VIRGIL (quiet): This is where I was when the call came.
ELSE
VIRGIL (quiet): This is my home. It is quiet here. That is all it is.
END IF
```

- Yüklemlerin içinde boşluk olmaz (`trust>=7`).
- Okunan bayrak yoksa koşul yanlıştır. Her `IF` zinciri ya bir `ELSE` ile biter ya da `ELSE` olmadan da sahnenin anlamlı kaldığı açıktır.
- **M0 notu:** GDD'deki dikey kesitte (M0) Kanto I'den doğrudan Kanto V'e geçilir. O zaman II–IV bayrakları hiç yoktur ve `ELSE` dalları oynar.
- Koşul blokları en çok iki düzey iç içe olur.

### 2.9 Seçimler

```text
CHOICE <seçim-id> <ağırlık> "<kayıt başlığı (EN)>"
PROMPT: <kitabın sesiyle, EN>
OPTION a [<seçenek metni>]
<bu seçeneğe özel satırlar>
EFFECTS: <etkiler>
OPTION b [<seçenek metni>] requires: <koşul>
<…>
REVEAL canon=<harfler> timing=<immediate | deferred>
QUOTE <SES> (<atıf>)
> <dize>
NOTE: <EN, en çok 160 karakter>
END CHOICE
```

Sistemik seçim aynı iskeleti şu satırlarla kullanır:

```text
CHOICE <seçim-id> <ağırlık> systemic "<kayıt başlığı (EN)>"
OPTION a [<etiket>] when: <koşul>
OPTION b [<etiket>] when: else
```

**Gösterim.** `<…>` doldurulacak yerdir. Köşeli parantezler (`[` `]`) seçenek metninin dosyada gerçekten yazılan sınırlarıdır; seçenek metni `]` içermez. Kayıt başlığı çift tırnak içindedir ve kendisi çift tırnak içermez. `<harfler>`: `all`, `none` ya da virgülle ayrılmış, boşluksuz seçenek harfleri (`a`, `a,b`). `PROMPT` satırı isteğe bağlıdır; varsa `CHOICE` satırının hemen altındadır. `requires:` yalnızca diyalog seçimlerinde, `when:` yalnızca sistemik seçimlerde kullanılır. `REVEAL` grubu diyalog seçimlerinde zorunlu, sistemik seçimlerde isteğe bağlıdır.

Dosyada girinti kullanılmaz. Bir `OPTION` satırından sonraki satırlar, bir sonraki `OPTION`, `REVEAL` ya da `END CHOICE` satırına kadar o seçeneğe aittir. Seçimler iç içe yazılmaz. `OPTION`, `REVEAL` ve `END CHOICE` satırları bir `IF` bloğunun içinde olamaz; seçenek gizlemek için `requires:` kullanılır.

Kurallar:

- Bir seçimde **2–3 seçenek** olur. Harfler `a`'dan başlayarak sırayla gider. `requires:` ile bazı seçenekler gizlenebilir, ama her durumda en az iki seçenek görünür.
- **Seçenek metni** en çok 48 karakterdir. İki biçimi vardır: emir kipinde kısa bir eylem (`[Grieve with him.]`) ya da çift tırnak içinde Dante'nin söyleyeceği cümle (`["Lead me out of this misery."]`). Tırnaklı seçenek seçilince, aynı cümle Dante'nin balonu olarak da gösterilir. Sistemik seçeneklerin metni menüde görünmez; Kitap'taki kayıt için geçmiş zamanda kısa bir etikettir (`[Held his ground]`).
- Seçenek metninde sistem terimi ve sayı yazılmaz (L16).
- `END CHOICE`'tan sonraki satırlar herkes için devam eder.
- Seçenek içinde `GOTO` kullanılabilir. Hedef aynı sahnede olmalıdır ve dallar sahne sonunda birleşir. `GOTO` o seçeneğin son satırıdır; `timing=immediate` kart, atlamadan hemen önce çıkar.
- Diyalog seçimlerinde süre sınırı yoktur.
- **Sistemik seçim** (`systemic`) menü göstermez; oyunun nasıl oynandığını ölçer. Her seçeneğin bir `when:` koşulu vardır; koşulu ilk doğru olan seçenek seçilir, son seçenek `when: else` olur. Sistemik seçim, akış `CHOICE` satırına ulaştığında bir kez değerlendirilir; bu yüzden ölçtüğü oynanışın ardından yazılır. `event:<id>` yüklemi, olay aynı sahnede `CHOICE` satırından önce yayıldıysa doğrudur. Sistemik bir seçim isteğe bağlı bir vuruştaysa hiç çözülmeyebilir; o zaman o seçime dair `choice:` yüklemleri yanlıştır. Sistemik seçimlerde REVEAL isteğe bağlıdır.

**Ağırlıklar ve izin verilen büyüklükler**

| Ağırlık | Kalp | Güven | Erdem | Kaynak | Ne zaman |
|---|---|---|---|---|---|
| `minor` | ±1 | ±1 | +1 | ±1 | Küçük bir iç tepki ya da sistemik ölçüm |
| `major` | ±2 | ±1 | +1 | ±1 | Kantonun ana seçimi. Her kantoda en az bir `major` ya da `centre` bulunur. |
| `centre` | ±3 | ±1 | +1 | ±1 | Bölümün merkezi. Bölüm 1'de yalnızca `inf05.c4`. |

Tablodaki değerler üst sınırdır. Kalp sütunu terazinin dengesinin (`heart`) en çok ne kadar oynayacağını gösterir; token'daki N her zaman artıdır (`pity+2@limbo` dengeyi +2, `justice+2@limbo` −2 oynatır). Erdem +2 ve güven ±2 yalnızca baş yazarın onayıyla verilir. Bir seçimin ağırlığı, büyüklüklerin yanı sıra anlatıdaki ağırlığını da gösterir: yalnızca bayrak kaldıran bir seçim de `major` olabilir.

### 2.10 Etki sözlüğü

`EFFECTS:` satırı, virgül ve tek boşlukla (`, `) ayrılmış token'lardan oluşur; bir token'ın içinde boşluk yoktur. N her zaman artı bir tamsayıdır; işaret token'ın içindedir (`trust-1`). Token'lar yazıldığı sırayla uygulanır.

| Token | Anlamı | Örnek |
|---|---|---|
| `pity+N@<günah>` | Acıma sayacına ve o günahın defterine +N (N ağırlığa göre 1–3) | `pity+2@limbo` |
| `justice+N@<günah>` | Adalet sayacına ve o günahın defterine +N | `justice+3@lust` |
| `trust+N`, `trust-N` | Vergilius'un güveni. Sonuç 0–10 arasına kırpılır. | `trust+1` |
| `virtue:<erdem>+N` | Erdemler: `prudence`, `justice`, `fortitude`, `temperance` | `virtue:fortitude+1` |
| `word:<Söz>` | Sözü verir. Söz mühürlüyse mührünü açar. | `word:Stay` |
| `seal:<Söz>` | Sözü mühürler: Kitap'ta görünür ama tercette kullanılamaz. | `seal:Hope` |
| `shed:<Söz>` | Bir Yük sözünü kalıcı olarak bırakır. | `shed:Fear` |
| `memory:<id>` | Anıyı ekler. | `memory:inf05.paolo_francesca` |
| `codex:<id>` | Codex kaydını açar. | `codex:inf03.charon` |
| `flag:<id>` | Bayrağı kalıcı olarak kaldırır (true). | `flag:inf03.left_hope` |
| `resolve+N`, `resolve-N`, `grace+N`, `grace-N` | Kaynaklar. N 1–3 birimdir; 1 birim, çubuğun başlangıç uzunluğunun %10'udur. | `resolve-1` |
| `gracemax+1` | Lütuf üst sınırını bir birim artırır (GDD 4.2). | `gracemax+1` |
| `unlock:<özellik>` | Bir sistemi ya da arayüzü açar: `book`, `words`, `verse`, `compose`, `heart`, `codex`, `remembrance`, `chain` | `unlock:heart` |

Kurallar:

- Kalp etkileri hiçbir zaman eksi olmaz. Hissedilen hissedilmiştir.
- Bir ruha yönelik her kalp etkisi günah etiketi taşır. Bölüm 1'in etiketleri `limbo` ve `lust`'tır (§3.1).
- Bayraklar indirilmez. "Olmadı" bilgisi, bayrağın yokluğudur.
- Bir codex kaydı, söz ya da anı, her oynanış yolunda en çok bir kez verilir.
- Senaryodaki `resolve-N`, Resolve'u 1 birimin altına indirmez; senaryolu bir etki bayılmaya yol açmaz. Bölüm 1'deki bayılmalar omurgadadır (III, V).

### 2.11 "What Dante did": REVEAL

- `REVEAL` satırından sonra 1–3 `QUOTE` bloğu (toplam en çok 6 dize) ve tam olarak bir `NOTE` gelir.
- `canon`, şiirdeki Dante'nin yaptığına denk düşen seçenek ya da seçeneklerdir:
  - `canon=a` ya da `canon=a,b`: Oyuncu bunlardan birini seçtiyse kartın başlığı "As Dante did", seçmediyse "What Dante did" olur.
  - `canon=all`: Dante hepsini yaptı. Başlık her zaman "As Dante did"dir.
  - `canon=none`: Şiir bu konuda susar. Başlık "What Dante did"dir ve NOTE bunu söyler: "The poem does not say. It says only that he was afraid."
- `timing=immediate`: kart, seçeneğin satırları oynandıktan hemen sonra çıkar. `timing=deferred`: kart kolofonda çıkar. Oyuncu ayarı bütün kartları erteleyebilir (§1.6).
- **Tekrar etme.** Kart, sahnede gösterilmeyen kanonik dizeyi taşımalıdır. Seçimin yerini tutan kanonik dizeyi sahnede modern bir köprüyle geç ve asıl dizeyi karta sakla. Seçimden sonra her yolda gösterilecek omurga dizelerini kartta tekrarlama.
- **NOTE:** sade İngilizce, geçmiş zaman, üçüncü tekil şahıs, en çok 160 karakter. Dante'nin ne yaptığını ya da söylediğini anlatır. Ders vermez, alegori açıklamaz.

### 2.12 Codex kaydı

Her kanto dosyasının sonunda, `## Codex` başlığı altında her kayıt için ayrı bir ` ```codex ` bloğu yazılır.

```codex
ID: inf03.charon
TAB: souls
TITLE: Charon
QUOTE POET (Inferno III, 82–84)
> And lo! towards us coming in a boat
> An old man, hoary with the hair of eld,
> Crying: "Woe unto you, ye souls depraved!
NOTE: The ferryman of the dead, whom Dante took from the old Greek and Roman poets. He carries the damned across the river Acheron. He refuses to carry Dante, who is still alive.
RELATED: inf03.acheron
```

| Alan | Kural |
|---|---|
| `ID` | §4.1 biçiminde; dosyanın önekini taşır |
| `TAB` | `souls` (kişiler ve yaratıklar), `places` ya da `lore` (kavramlar, kehanetler, kitaplar) |
| `TITLE` | EN, en çok 40 karakter |
| `QUOTE` | 1–6 dize, §2.6 kurallarıyla. 1–3 dize önerilir. |
| `NOTE` | EN, en çok 400 karakter (yaklaşık 60 kelime) |
| `RELATED` | İsteğe bağlı; virgülle ayrılmış codex ID'leri |

NOTE yazım kuralları:

- Üç tür bilgiyi karıştırma ve hangisi olduğunu belli et: şiirde olan ("In the poem…"), tarih ("Historically…") ve yorum geleneği ("Readers have long thought…"). Kesin olmayan bir tanımlamayı kesinmiş gibi yazma.
- Sonraki kantolardan en çok bir cümlelik ipucu ver. Büyük bir olayı önceden açık etme.
- Kayıt bir `EFFECTS: codex:<id>` ile verilir. Kanto IV'ten önce verilen kayıtlar sessizce birikir ve Codex açıldığında (IV) hepsi görünür.

### 2.13 Anı kaydı

```memory
ID: inf05.paolo_francesca
NAME: Paolo and Francesca
KIND: kept
QUOTE FRANCESCA (Inferno V, 135)
> This one, who ne'er from me shall be divided,
NOTE: Dante carried their story back to the living. Readers have carried it ever since.
```

| Alan | Kural |
|---|---|
| `ID` | §4.1 |
| `NAME` | EN, ruhun adı |
| `KIND` | `asked`: ruh şiirde anılmak ister. `kept`: ruh istemez, ama şiir onun duyulmak istediğini gösterir ve oyuncu anlatıyı taşımayı seçer. |
| `QUOTE` | Ruhun kendi dizesi, 1–3 dize |
| `NOTE` | EN, kitabın sesiyle (üçüncü tekil şahıs, geçmiş zaman), en çok 300 karakter |

### 2.14 Doğrulama kuralları (lint)

Programcı bu kuralları bir derleme betiğiyle denetler. Yazarlar da teslimden önce aynı listeye bakar.

| Kod | Kural |
|---|---|
| L01 | Ön bilgi alanları eksiksizdir ve türleri doğrudur. |
| L02 | Her başlık ID'si biçime uyar ve dosyada bir kez geçer. Sahne ID'leri §7 ile uyumludur. |
| L03 | Her vuruşun altında tam bir `script` bloğu vardır ve bloğun ilk satırı `@mode` yönergesidir. |
| L04 | Her satır §2.5'teki türlerden birine uyar. |
| L05 | Konuşmacı §4.8'de vardır ve konuşma izni vardır. Sessiz karakterler satır alamaz; yalnızca Longfellow konuşan karakterler modern satır alamaz. |
| L06 | `QUOTE` dizeleri kaynakla harfi harfine eşleşir (§2.6'daki kesme kurallarıyla). Atıf aralığı ilk ve son dizeyi tam olarak kapsar. |
| L07 | Bir blokta en çok 6 dize, art arda en çok 12 dize, epigrafta en çok 3 dize, REVEAL'da en çok 6 dize vardır. |
| L08 | Modern satırlarda yasaklı arkaik kelime yoktur (§6.1). |
| L09 | Hiçbir modern satır, aynı kantonun Longfellow metniyle 5 ya da daha fazla kelimelik birebir dizi paylaşmaz. |
| L10 | Uzunluk sınırlarına uyulur (§6.4). |
| L11 | Araya oyuncu eylemi, alıntı ya da seçim girmeden en çok 5 modern balon art arda gelir. |
| L12 | `EFFECTS` token'ları §2.10'a uyar. Büyüklükler seçimin ağırlığına uyar. |
| L13 | Kalp etkileri günah etiketlidir. Kanto ve bölüm tavanları aşılmaz (§3.1). |
| L14 | Sistemik olmayan her `CHOICE`'ta bir `REVEAL` ve bir `NOTE` vardır. |
| L15 | Seçenek harfleri sıralıdır, 2–3 seçenek vardır ve her durumda en az iki seçenek görünür. |
| L16 | Seçenek metninde şu sistem terimleri geçmez: Pity, Justice, Mercy, Trust, Heart, Virtue, Prudence, Fortitude, Temperance, Grace, Resolve. |
| L17 | Ön bilgi listeleri (`choices`, `words`, `codex`, `memories`, `flags_set`, `flags_read`, `unlocks`) dosyanın içeriğiyle birebir uyumludur. |
| L18 | Kaldırılan her bayrak dosyanın önekini taşır. Başka kantodan okunan her bayrak §4.3'te kayıtlıdır. |
| L19 | Her `word:` etkisi ya §3.4.6'da bu kantoya ayrılmış bir sözdür ya da daha önce verilmiş, mühürlü bir sözün açılmasıdır. |
| L20 | Her codex ID'si `## Codex` bölümünde tanımlıdır ve her oynanış yolunda en çok bir kez verilir. |
| L21 | `IF`/`END IF` ve `CHOICE`/`END CHOICE` dengelidir. `GOTO` hedefi aynı sahnededir. |
| L22 | Akıllı tırnak yoktur. `...` yerine `…`, atıflarda `-` yerine `–` kullanılır. |

### 2.15 Tam örnek: Kanto III'ün açılışı

Bu örnek biçim açısından bağlayıcıdır, içerik açısından öneridir. Kanto III yazarı bunu doğrudan kullanabilir ve geliştirebilir.

````markdown
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
codex: [inf03.gate, inf03.contrapasso, inf03.neutrals, inf03.great_refusal, inf03.acheron, inf03.charon]
flags_set: [inf03.left_hope, inf03.asked_neutral]
flags_read: [inf01.motive_gate, inf01.motive_souls]
unlocks: [heart]
playtime: "8–12"
writer: ""
status: draft
version: "0.1"
---

# Inferno III — The Gate

Kapı Bölüm 1'in eşiğidir: yazı oyuncudan bir söz ister, Vergilius başka bir söz.

## [inf03.s0] Opening page

### [inf03.s0.b1] Title and epigraph

```script
@mode: page
QUOTE INSCRIPTION (Inferno III, 1–3)
> "Through me the way is to the city dolent;
> Through me the way is to eternal dole;
> Through me the way among the people lost.
```

## [inf03.s1] The Gate

### [inf03.s1.b1] The words over the gate

```script
@mode: cinematic
@place: inf03_gate
CAM: unengrave — açılış sayfasındaki dizeler kapının taşına dönüşür
QUOTE INSCRIPTION (Inferno III, 4–9)
> Justice incited my sublime Creator;
> Created me divine Omnipotence,
> The highest Wisdom and the primal Love.
> Before me there were no created things,
> Only eterne, and I eternal last.
> All hope abandon, ye who enter in!"
GLOSS: The gate speaks for itself. It says it was made by God's justice, power, wisdom and love, and that it will never end.
DO: Son dizedeki "hope" kelimesi kararır. Kitap'taki "Hope" kartı titrer.
EFFECTS: codex:inf03.gate
```

### [inf03.s1.b2] What the gate asks

Seçimin yerini tutan kanonik dize (III 12) sahnede gösterilmez, karta saklanır (§2.11).

```script
@mode: dialogue
DANTE (afraid): Master, what does it want from me?
IF flag:inf01.motive_gate
DANTE (afraid): This is not the gate you promised me.
VIRGIL: No. Saint Peter's gate is far above us. This one comes first.
END IF
QUOTE VIRGIL (Inferno III, 14–15)
> "Here all suspicion needs must be abandoned,
> All cowardice must needs be here extinct.
VIRGIL (gentle): Those words are for the dead. From you I ask only your fear.
CHOICE inf03.c1 major "What Dante leaves at the gate"
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
END CHOICE
```

### [inf03.s1.b3] His hand on mine

```script
@mode: cinematic
QUOTE POET (Inferno III, 19–21)
> And after he had laid his hand on mine
> With joyful mien, whence I was comforted,
> He led me in among the secret things.
IF flag:inf03.left_hope
NARRATION: He went in without hope. Virgil did not let go of his hand.
END IF
CAM: fade-out — kapının ardındaki karanlık
```

## Codex

```codex
ID: inf03.gate
TAB: places
TITLE: The Gate of Hell
QUOTE INSCRIPTION (Inferno III, 7–9)
> Before me there were no created things,
> Only eterne, and I eternal last.
> All hope abandon, ye who enter in!"
NOTE: In the poem the gate speaks in its own voice. It says Hell was made by divine justice, power, wisdom and love, and that it will last forever. Its last line is meant for those who enter to stay.
RELATED: inf03.acheron
```
````

Bu örnekte görülenler: ön bilgi; açılış sayfasının dünyaya akması (epigraf III 1–3, kapının taşında III 4–9); başka kantodan okunan bir bayrak ve onun varsayılanı (bayrak yoksa satır hiç oynamaz); bir `major` seçim; sahnede gösterilmeyip karta saklanan kanonik dize; bir Codex kaydı.

---

## 3. Sistem kuralları

### 3.1 Kalp (Heart): acıma ve adalet

**Model**

- İki tamsayı sayaç vardır: `pity` ve `justice`. Oyunun başında 0'dırlar ve yalnızca artarlar.
- Her artış bir günah etiketi taşır ve o günahın defterine de yazılır: `pity@lust`, `justice@limbo` …
- Türetilmiş denge: `heart = pity − justice`. Artı değer acımaya, eksi değer adalete eğilimi gösterir.
- Ekranda tek bir terazi vardır. Kefelerdeki ağırlık sayaçları, kirişin eğimi dengeyi gösterir; eğim görsel olarak −6 ile +6 arasında kırpılır. Sayı hiçbir yerde yazmaz.

**Neden iki sayaç, tek eksen değil?**

1. *Şiir bunu kendisi söyler.* Kanto III'te Kararsızlar için Vergilius şöyle der: *Misericord and Justice both disdain them.* (Inferno III, 50). Kararsız ruh, iki kefesi de boş olandır. Tek eksende 5 acıma ile 5 adalet toplamı 0 eder ve hiç seçim yapmamış oyuncuyla aynı görünür. Oysa şiirin en ağır yargılarından biri tam da hiç taraf tutmamaya verilmiştir. İki sayaç "boş terazi"yi (0/0) "dengeli ama dolu terazi"den (5/5) ayırır.
2. *Dante iki yöne de gider.* Şiirde ağzından çıkan ilk söz bir acıma yakarışıdır: *"Have pity on me," unto him I cried,* (Inferno I, 65). Francesca'nın öyküsünde acımadan bayılır (V 139–142). Ama ileride Vergilius acımayı sert bir dille azarlar: *Here pity lives when it is wholly dead;* (Inferno XX, 28). Bu yolculuğu kaydetmek için iki ayrı sayaç gerekir.
3. *Araf bağlantısı bir defter ister.* "En çok hangi günaha acıdın?" sorusu (§3.8) ancak günah etiketli bir kayıtla cevaplanabilir.

**Bölüm 1'de kalbin kıpırdadığı yerler**

| Seçim | Konu | Acıma | Adalet |
|---|---|---|---|
| `inf04.c1` (major) | Vergilius'un kendi yeri | `pity+2@limbo` | `justice+2@limbo` |
| `inf05.c3` (minor) | Vergilius'un sorusu | `pity+1@lust` | `justice+1@lust` |
| `inf05.c4` (centre) | Francesca'nın öyküsünden sonra | `pity+3@lust` | `justice+3@lust` |

Bölüm 1 sonunda her sayaç en çok 6 olur; `heart` −6 ile +6 arasındadır.

Kanto I ve II'de kalp yoktur, çünkü orada karşılaşılan bir ruh yoktur. Kanto III'te terazi III 50 dizesiyle ilk kez açılır (`unlock:heart`) ve **boş** görünür: Kararsızlar ne acımayı ne adaleti hak eder. Oyuncu bir Kararsız'a yaklaşırsa (`inf03.c2=b`) kiriş titrer ve yerine geri döner.

**Günah etiketleri.** Bölüm 1'de iki etiket vardır: `limbo` ve `lust`. Sonraki kantoların etiketleri ve Araf eşlemeleri §3.8'de taslak olarak verilmiştir. Yeni etiketi yalnızca baş yazar ekler.

**Tavanlar**

- Bir kantoda, tek bir oynanış yolunda kalbe yazılan toplam (acıma + adalet) en çok 3'tür. Bölümün merkez kantosunda (V) bu sınır 4'tür.
- `centre` ağırlığı her bölümde bir kez kullanılır.

**Bölüm sonu bayrakları.** Motor bunları Kanto V kolofonunda kaldırır (§4.7):

- `ch1.heart_tender`: heart ≥ 3
- `ch1.heart_stern`: heart ≤ −3
- `ch1.heart_even`: diğer durumlar

**Yazarlar için.** Acıma ve adalet seçeneklerinin ikisi de dürüst olmalı ve Dante'nin karakteri içinde kalmalıdır. Adalet zalimlik değildir; ilahî yargıyı kabul etmektir. Acıma aklamak değildir; acı çekenin yanında durmaktır. Hiçbir seçenek gülünç, kaba ya da açıkça "yanlış" yazılmaz.

### 3.2 Seçim bütçesi

- Her kantoda en az bir `major` (ya da `centre`) seçim bulunur.
- Her kantoda en çok 3 diyalog seçimi (sistemik olmayan) bulunur.
- Sistemik ölçümler (kantoda en çok 3) bu sayıya girmez.
- Seçenekler 2–3 tanedir ve süre sınırı yoktur.

Bölüm 1 seçim envanteri (bağlayıcı):

| ID | Kanto · sahne | Tür | Ağırlık | Konu | Başlıca etkiler |
|---|---|---|---|---|---|
| `inf01.c1` | I · s3 | sistemik | minor | Pars: şafağı beklemek | temperance |
| `inf01.c2` | I · s4 | sistemik | minor | Aslan: kükremede kıpırdamamak | fortitude ya da resolve |
| `inf01.c3` | I · s5 | sistemik | minor | Dişi kurt: gölgeye dönmek | prudence |
| `inf01.c4` | I · s8 | diyalog | major | Yolculuğun nedeni | prudence, trust ya da grace; motive bayrağı |
| `inf02.c1` | II · s2 | diyalog | minor | Kuşkunun dili | temperance, prudence ya da `doubt_proud` |
| `inf02.c2` | II · s5 | diyalog | major | Cesareti ne geri getirir | grace, trust ya da fortitude; courage bayrağı |
| `inf03.c1` | III · s1 | diyalog | major | Kapıda bırakılan söz | Fear bırakılır ya da Hope mühürlenir |
| `inf03.c2` | III · s2 | diyalog | minor | Kararsızlar: bak ve geç | trust +1 ya da −1 |
| `inf03.c3` | III · s5 | sistemik | minor | Kharon'un önünde geri çekilmemek | fortitude |
| `inf04.c1` | IV · s2 | diyalog | major | Vergilius'un kendi yeri | `@limbo` acıma ya da adalet; prudence |
| `inf04.c2` | IV · s4 | diyalog | minor | Altıncı şair | `sixth_proud`, temperance ya da justice ve trust |
| `inf05.c1` | V · s2 | sistemik | minor | Minos'un mahkemesi (isteğe bağlı) | justice erdemi |
| `inf05.c2` | V · s2 | diyalog | minor | Minos'un uyarısı | trust ya da fortitude |
| `inf05.c3` | V · s6 | diyalog | minor | Vergilius'un sorusu | `@lust` ±1 |
| `inf05.c4` | V · s6 | diyalog | centre | Hüküm | `@lust` ±3; anı ya da söz |

### 3.3 Vergilius'un güveni (Trust)

- `trust`, 0–10 arasında bir tamsayıdır. Vergilius'un ilk sözüyle (I 67) **4** olarak başlar ve her değişimde 0–10 arasına kırpılır. Motor değeri oyunun başında 4 olarak kurar; I 67'den önce güveni değiştiren bir şey yoktur.
- **+1:** Vergilius'un açık öğüdüne uymak, bir bekçi karşısında sözü ona bırakmak, onuru ona vermek.
- **−1:** Açık öğüdüne karşı gitmek. Bu seçenekler de oyuncuya bir şey kazandırmalıdır: bir deneyim, bir bayrak, bir bilgi. Güven kaybı ceza değildir, ilişkinin rengidir.
- Bir kantoda güvenin net değişimi en çok ±2'dir.
- **Eşikler:** `trust ≥ 7` "Faithful", `trust ≤ 2` "Wayward". Motor bunları bölüm sonunda `ch1.trust_faithful` ve `ch1.trust_wayward` olarak kaydeder.
- **Etkiler** (tasarımcı ayarlar; öneri):
  - Faithful: Vergilius'un yanındayken Resolve sıfıra inecek olursa, Vergilius her çemberde bir kez Dante'yi tutar ve bayılmayı önler. Q ipuçlarına bir satır eklenir.
  - Wayward: Q ipuçları tek ve kısa bir satırdır. Vergilius bir adım önde yürür ve daha az bekler.
  - Hiçbir durumda Vergilius Dante'yi terk etmez. Güven ilerlemeyi kilitlemez.
- **Gösterim:** Sayı yoktur. Güven Vergilius'un yürüme mesafesinden, duruşundan ve Kitap'taki kenar notlarından okunur.
- **Bölüm 1'deki güven olayları:** `inf01.c4=b` +1, `inf02.c2=b` +1, `inf03.c1=a` +1, `inf03.c2=a` +1, `inf03.c2=b` −1, `inf04.c2=c` +1, umudun geri verilmesi (IV, koşullu) +1, `inf05.c2=a` +1. Bölüm boyunca güven 3'ün altına inmez (en düşük değer, `inf03.c1=b` ve `inf03.c2=b` ile Kanto III sonundaki 3'tür); bölüm sonunda 4 ile 10 arasındadır. Yani Wayward eşiğine Bölüm 1'de inilemez. Bu eşik sonraki bölümler içindir.

### 3.4 Sözler ve terza rima

#### 3.4.1 Söz nedir

Söz, oyuncunun şiirin içinden topladığı tek bir İngilizce kelimedir. Her sözün şunları vardır:

- adı (`Love`),
- kafiye ailesi (`-ove`),
- kategorisi: bir tercetin ortasındayken ne yaptığı,
- köken dizesi: sözün alındığı Longfellow dizesi ve atfı,
- arayüz açıklaması: İngilizce, en çok 12 kelime.

#### 3.4.2 Kurallar

1. **Söz köken dizesinde geçer ve tercihen dizenin son kelimesidir** (kafiye yeri). Bölüm 1'deki bütün sözler son kelimedir; yalnızca Wall'un dizesi kelimenin çoğuluyla ("walls") biter. Böylece oyuncunun tercetleri, sonları gerçekten kafiyeli Longfellow dizelerinden kurulur (§3.4.5).
2. Köken dizesi, sözü veren kantodadır.
3. Her söz oyunda tektir. Söz tablosu (§3.4.6) tek doğru kaynaktır. Yazar söz uyduramaz; yeni bir söz gerekiyorsa baş yazara önerir.
4. Bir kanto 2–4 yeni söz verir; en çok biri koşulludur. İlerleme için gereken sözler koşulsuzdur.
5. **Söz okunarak toplanır.** Köken dizesi ekrandayken (dize balonunda ya da sayfada) kelime parlar ve oyuncu E ile onu alır. Söz alınmadan dize balonu, sayfa ya da kart kapanmaz; `EFFECTS: word:` etkisi E'ye basıldığı anda uygulanır. Böylece koşulsuz bir söz kaçırılamaz. Yük sözleri kendiliğinden yapışır. Söz kartı her durumda köken dizesini gösterir; bu yüzden bir söz sahnede gösterilmeyen bir dizeden de gelebilir (`Pity` ve `Judgment` böyledir).
6. Mühürlü söz (`seal:`) Kitap'ta gri görünür ve tercette kullanılamaz; `word:` ile açılır. Yük sözü `shed:` ile kalıcı olarak bırakılır.
7. Köken dizesi sözü veren vuruşta bir `QUOTE` bloğunda gösteriliyorsa, yazar `EFFECTS: word:<Söz>` satırını o bloğun hemen ardına yazar. Dize sahnede gösterilmiyorsa (`Pity`, `Judgment`) kart onu kendisi gösterir. Söz diyalogda açıklanmaz; kart kendini anlatır.

#### 3.4.3 Kategoriler

Bir tercetin etkisini **ortadaki** sözün kategorisi belirler.

| Kategori | Oynanıştaki etkisi | GDD bağlantısı | Bölüm 1 sözleri |
|---|---|---|---|
| **Force** | İter ve sersemletir | GDD 2.2, "Verse" | Love, Fire, Judgment |
| **Ward** | Darbeyi savuşturur, kısa süreli kalkan | — | Away, Wall |
| **Mend** | Resolve'u onarır, korkuyu yatıştırır | GDD 2.3, Resolve | Hope, Pity |
| **Reveal** | Karanlığı aydınlatır, gizli yolu gösterir | `VisionModifier` | Way, Light |
| **Still** | Yakındaki tehlikeleri yavaşlatır ya da durdurur, rüzgârı dindirir | `WindField`, `PatternHazard` | Stay, Peace |
| **Swift** | Uzun atılma; kalabalıkta ve rüzgârda hız | — | Go, Desire |
| **Burden** | Kullanılamaz. Taşındığı sürece korku Resolve'u daha hızlı azaltır (öneri: %25). | GDD 2.3, korku | Fear |

#### 3.4.4 Kafiye aileleri

- Aile etiketi, sözün vurgulu son hecesinin sesini yazar: `-ay`, `-ire`, `-ove` … Etiket yazımı değil sesi gösterir; çoğu zaman ailenin ilk kaydedilen sözünün yazımını taşır. İstisna `-ow`dur (Go): `-o` yazımı *to*, *do* gibi kafiyesiz kelimeleri de kapsardı.
- Aynı aileden iki farklı söz kafiyelidir. Bir söz kendisiyle kafiye yapmaz.
- Kafiye ailesi olmayan söz (`Judgment`) **kapatıcıdır**: yalnızca ortada durabilir ve zinciri bitirir. Ailesinde henüz tek olan sözler (Love, Hope, Go, Light, Wall, Peace, Pity) Bölüm 1'de pratikte aynı biçimde davranır, ama kapatıcı değildir; ortakları sonraki kantolarda gelir.

| Aile | Bölüm 1 üyeleri | Not |
|---|---|---|
| `-ay` | Way, Away, Stay | İlk zincirin bağlayıcı ailesi |
| `-ire` | Desire, Fire | Kanto IV'te tamamlanır ve ilk zinciri mümkün kılar |
| `-ove` | Love | Ortakları sonraki kantolarda |
| `-ope` | Hope | |
| `-ow` | Go | |
| `-ight` | Light | |
| `-all` | Wall | |
| `-eace` | Peace | |
| `-ity` | Pity | Ortağı Dis şehriyle ("city") gelebilir |
| kapatıcı | Judgment | Ortağı yoktur |
| Yük | Fear | Kafiyeye girmez |

#### 3.4.5 Tercet: referans model

Bu bölüm yazarlara sistemin mantığını, tasarımcıya bir başlangıç modelini verir. Sayısal değerler (Grace bedeli, süreler, güç) sistem tasarımında ayarlanır.

- **Tercet** üç yuvadır: **A · B · A**. Dış yuvalardaki iki söz aynı ailedendir ve birbirinden farklıdır. Ortadaki söz başka bir ailedendir. Yük ve mühürlü sözler yerleştirilemez.
- **Etki** ortadaki sözün kategorisidir; ortadaki söz "tercetin kalbi"dir. Dış sözlerden ortadakiyle aynı kategoride olan her biri etkiyi bir kademe güçlendirir.
- **Zincir (terza rima):** Bir sonraki tercetin dış sözleri, önceki tercetin ortasındaki sözle kafiyelidir. Bu, Dante'nin *aba bcb cdc* örgüsüdür. Zincir, tercetleri tek bir dizi hâlinde ve artan bir bonusla oynatır. Bir zincirde hiçbir söz iki kez geçmez. Zincir Kanto IV'te açılır (`unlock:chain`).
- **Koda:** Her kanto tek bir dizeyle biter. Oyuncu da bir terceti ya da zinciri, son tercetin ortasındaki sözle kafiyeli ve zincirde kullanılmamış tek bir sözle kapatabilir. Koda, kendi kategorisinin güçlendirilmiş "kapanış" versiyonunu tetikler (`seal:` ve mühürlü sözlerle ilgisi yoktur). Koda zincirle birlikte açılır (`unlock:chain`).
- **Okunuşu (cento):** Kitap her terceti, sözlerin köken dizeleriyle gösterir. Sözler kafiye yerinde durduğu için tercet gerçekten kafiyeli okunur ve baştan sona Longfellow'dur. Bölüm 1'in sonunda kurulabilecek iki tercetlik bir zincir şöyle okunur (Fire · Way · Desire / Away · Love · Stay):

```cento
This side the summit, when I saw a fire (Inferno IV, 68)
In which I had abandoned the true way. (Inferno I, 12)
So that their fear is turned into desire. (Inferno III, 126)
Weeping, her shining eyes she turned away; (Inferno II, 116)
Avail me the long study and great love (Inferno I, 83)
To thee, as soon as we our footsteps stay (Inferno III, 77)
```

Kafiye düzeni: fire / way / desire · away / love / stay, yani *aba bcb*.

#### 3.4.6 Söz tablosu: Bölüm 1 (bağlayıcı)

| Söz | Aile | Kategori | Kanto · sahne | Köken dizesi | Kaynak | Koşul | Arayüz açıklaması (EN) |
|---|---|---|---|---|---|---|---|
| Fear | — | Burden | I · s1 | Which in the very thought renews the fear. | Inferno I, 6 | Kendiliğinden yapışır | A weight. Fear wears you down faster. |
| Way | -ay | Reveal | I · s1 | In which I had abandoned the true way. | Inferno I, 12 | Her zaman | Shows the way ahead for a moment. |
| Hope | -ope | Mend | I · s3 | So were to me occasion of good hope, | Inferno I, 41 | Her zaman | Restores your resolve. |
| Love | -ove | Force | I · s6 | Avail me the long study and great love | Inferno I, 83 | Her zaman | Moves what stands in your way. |
| Go | -ow | Swift | II · s4 | Beatrice am I, who do bid thee go; | Inferno II, 70 | Her zaman | A longer, faster dash. |
| Away | -ay | Ward | II · s4 | Weeping, her shining eyes she turned away; | Inferno II, 116 | Her zaman | Turns a blow aside. |
| Stay | -ay | Still | III · s4 | To thee, as soon as we our footsteps stay | Inferno III, 77 | Her zaman | Nearby dangers pause. |
| Desire | -ire | Swift | III · s6 | So that their fear is turned into desire. | Inferno III, 126 | Her zaman | Carries you through crowds and wind. |
| Fire | -ire | Force | IV · s3 | This side the summit, when I saw a fire | Inferno IV, 68 | Her zaman | A blaze that drives demons back. |
| Light | -ight | Reveal | IV · s5 | Thus we went on as far as to the light, | Inferno IV, 103 | Her zaman | Lights the dark and what it hides. |
| Wall | -all | Ward | IV · s6 | Seven times encompassed with lofty walls, | Inferno IV, 107 | Her zaman | A shield that holds for a while. |
| Peace | -eace | Still | V · s5 | We would pray unto him to give thee peace, | Inferno V, 92 | Her zaman | Calms the wind around you. |
| Judgment | kapatıcı | Force | V · s6 | They go by turns each one unto the judgment; | Inferno V, 14 | `inf05.c4=b` | A verdict that holds a demon still. |
| Pity | -ity | Mend | V · s8 | The other one did weep so, that, for pity, | Inferno V, 140 | Her zaman (kolofonda) | Mends you, slowly and deeply. |

Neden bu sözler:

- **Fear** Bölüm 1'in ilk sözüdür ve bir yüktür: orman korkuyu her düşüncede yeniler. Vergilius'un kapıdaki öğüdüne uyan oyuncu onu orada bırakır (`inf03.c1=a`). Umudunu bırakan oyuncu ise korkusunu Limbo'ya kadar taşır ve onu orada, umudunu geri alırken bırakır (IV s2).
- **Love** Dante'nin Vergilius'un kitabına duyduğu sevgiden gelir (I 83). Bu, "oynanabilir kitap"ın ilk sevgisidir: bir kitap sevgisi. Kanto V'te Francesca'yı mahveden de bir kitaptır (V 137). İlk tercetin kalbi bu sözdür.
- **Pity** kolofonda herkese verilir. Oyuncu Francesca'dan yüz çevirmiş olsa bile kitap ona, şiirdeki Dante'nin acımadan bayıldığını söyleyen dizeden bu sözü verir (V 140). Bölüm 1'de toplanan son söz budur.
- **Judgment** adalet yolunun sözüdür. Minos'un mahkemesini anlatan dizeden gelir: Francesca'yı yargılayan oyuncu, sözünü yargıcın dizesinden alır.

#### 3.4.7 Sözler ne zaman ne sağlar

| Ne zaman | Oyuncunun elinde | Yapabildiği |
|---|---|---|
| Kanto I sonu | Fear, Way, Hope, Love | Henüz tercet yok. Kitap'taki Words sekmesi açıktır. |
| Kanto II, s6 | ve Go, Away | İlk tercet: **Way · Love · Away** (Force; GDD'deki "Verse"). Way · Hope · Away ve Way · Go · Away da kurulabilir. |
| Kanto III sonu | ve Stay, Desire; Fear bırakılmış ya da Hope mühürlü | `-ay` ailesinde üç söz vardır, dış çift için üç seçenek doğar (Way·Away, Way·Stay, Away·Stay). Henüz zincir ve koda yoktur. |
| Kanto IV, s3–s4 | ve Fire | `-ire` ailesi tamamlanır (s3). Dante zinciri şairlerin arasında bulur (s4): ilk iki tercetlik zincir (yukarıdaki cento) ve ilk koda (Fire · Way · Desire, koda Stay). |
| Kanto IV sonu | ve Light, Wall | Yeni orta sözler: Reveal ve Ward. |
| Kanto V sonu | ve Peace, Pity, (Judgment) | Daha çok orta söz. Bölüm 1'de bir zincir en çok iki tercettir. |

### 3.5 Anma (Remembrance)

**Nedir.** Cehennem'deki bazı ruhlar, yaşayanlar arasında anılmak ister: Ciacco (VI), Pier delle Vigne (XIII), Brunetto (XV). Oyuncu onların adlarını ve öykülerini toplar. Araf'ta bekleyen ruhlar bu kez dua ister; dualar yardım, kestirme yol ya da yetenek açar.

**Türler ve kimlikler**

- Kimlik biçimi `memory:<kanto>.<ad>` şeklindedir (§4.1). Kayıt biçimi §2.13'tedir.
- `asked`: Ruh şiirde anılmak ister. Bu bir seçim olarak sunulur ve reddetmek de geçerli bir seçimdir.
- `kept`: Ruh anılmayı istemez, ama şiir onun duyulmak istediğini gösterir. Oyuncu anlatıyı taşımayı seçebilir.

**Kurallar**

1. Anı yalnızca şiirin, ruhun duyulmak ya da anılmak istediğini gösterdiği yerde sunulur.
2. Kararsızlar asla anılamaz: *No fame of them the world permits to be;* (Inferno III, 49).
3. Limbo'nun büyükleri zaten anılıyor; onurlu adları onlara gökte lütuf kazandırır (IV 76–78). Anma sekmesi Limbo'da bu dizelerle açılır ve "Remembered by the world" listesini gösterir: Homer, Horace, Ovid, Lucan, Virgil.
4. Lanetlilerin anısı dua değildir; Cehennem'de dua işlemez. Araf'ın dua sistemi ayrı bir kayıt türüdür (`pur…` önekiyle).

**Bölüm 1 kararları**

| Kanto | Anılabilecek ruh | Karar |
|---|---|---|
| I–II | — | Ruh yok, anı yok. |
| III | Kararsızlar | İmkânsız. `inf03.c2=b` seçilirse Kitap'ta boş bir anı kartı belirir ve söner. Geriye bayraktan başka bir şey kalmaz. |
| IV | Limbo'daki ruhlar | Gerek yok, adları zaten yaşıyor. Anma sekmesi burada açılır (`unlock:remembrance`). |
| V | Paolo ve Francesca | Bölümün tek anısı: `memory:inf05.paolo_francesca` (`kept`), yalnızca `inf05.c4=a` ile. Francesca'nın şu dizesi duyulmak istediğini gösterir: *Of what it pleases thee to hear and speak,* (Inferno V, 94) |

**İleride (Bölüm 1'de değil).** İlk `asked` anı Ciacco'nunkidir:

> But when thou art again in the sweet world, / I pray thee to the mind of others bring me; (Inferno VI, 88–89)

Araf'ta anma duaya dönüşür:

> "Do thou remember me who am the Pia; (Purgatorio V, 133)

### 3.6 Erdemler (cardinal virtues)

- Dört sayaç vardır: `virtue:prudence`, `virtue:justice`, `virtue:fortitude`, `virtue:temperance`. Yalnızca artarlar, her seferinde +1.
- **Kalpteki "justice" ile erdem olan "justice" farklı şeylerdir.** Kalp, ruhlara verilen tepkidir. Erdem olan adalet, herkese hakkını vermektir: onur, doğruluk, doğru hüküm.
- Erdemlerin iki kaynağı vardır:
  1. Diyalog seçimleri.
  2. **Bekçilerin nasıl geçildiği.** Her bekçi karşılaşması bir sistemik ölçüm taşır.

| Erdem | Ne büyütür | Bölüm 1'deki kaynaklar |
|---|---|---|
| **Prudence** (sağduyu) | Sınırını tanımak, doğru soruyu sormak, öğüt almak | `inf01.c3=a` dişi kurttan sonra gölgeye dönmek · `inf01.c4=a` · `inf02.c1=b` · `inf04.c1=c` |
| **Justice** (adalet erdemi) | Onuru hak edene vermek, doğru hüküm | `inf04.c2=c` onuru Vergilius'a vermek · `inf05.c1=a` Minos'un mahkemesinde en az iki doğru tahmin |
| **Fortitude** (yiğitlik) | Korkuya karşı durmak | `inf01.c2=a` aslanın kükremesinde kıpırdamamak · `inf02.c2=c` · `inf03.c1=a` korkuyu bırakmak · `inf03.c3=a` Kharon'un önünde geri çekilmemek · `inf05.c2=b` |
| **Temperance** (ölçülülük) | Sabır, alçakgönüllülük, kendini tutmak | `inf01.c1=a` şafağı beklemek · `inf02.c1=a` · `inf04.c2=b` |

- **Kademeler (taslak):** 2, 5 ve 9 puanda birer kademe. Örnek pasifler: Prudence, Vergilius'un ipuçlarını zenginleştirir. Justice, Force tercetlerinin sersemletme süresini uzatır. Fortitude, korkunun Resolve'a etkisini azaltır. Temperance, yürürken Grace'i yavaşça doldurur.
- **Araf bağlantısı:** Araf'ın kıyısında Dante dört yıldız görür. Oyunda bu yıldızların parlaklığı, dört erdemin kademesini gösterir.

> To the right hand I turned, and fixed my mind / Upon the other pole, and saw four stars / Ne'er seen before save by the primal people. (Purgatorio I, 22–24)

- İlahî erdemler (inanç, umut, sevgi) Cehennem'de yoktur; Araf'ta ve Cennet'te gelir. `Hope` sözü, ilahî erdem olan umut değildir.

### 3.7 Kaynak etkileri

- Etkiler: `resolve±N`, `grace±N`, `gracemax+1`. 1 birim, çubuğun %10'udur.
- Kaynak etkileri bir seçimin tuzu biberidir, nedeni olamaz. Hiçbir seçenek kaynak yüzünden açıkça "kârlı" görünmemelidir.
- Bölüm 1'deki kaynak etkileri: `inf01.c2=b` resolve −1, `inf01.c4=c` grace +1, `inf02.c2=a` grace +1, `inf03.c2=b` resolve −1, IV s6'da `gracemax+1` (GDD 4.2).

### 3.8 Sonraki kitaplara bağlar (taslak)

Bu tablo Araf ve Cennet tasarlanırken kesinleşir. Bölüm 1 yazarları için anlamı şudur: buradaki bayrak ve sayaç adları değişmez.

**Günah etiketlerinin Araf terasları (taslak)**

| Etiket | Inferno | Araf terası |
|---|---|---|
| `limbo` | IV | Yok; Cennet XIX–XX'ye bağlanır |
| `lust` | V | 7 · Şehvet |
| `gluttony` | VI | 6 · Oburluk |
| `avarice`, `prodigality` | VII | 5 · Açgözlülük |
| `wrath` | VII–VIII | 3 · Öfke |
| `sullen` | VII | 4 · Tembellik |
| `sodomy` | XV–XVI | 7 · Şehvet |

**Bağlar**

| Bölüm 1 kaynağı | Koşul (Inferno sonunda) | Hedef | Etki |
|---|---|---|---|
| `pity@lust` + `pity@sodomy` | ≥3 / ≥5 / ≥7 | Araf XXVII, ateş duvarı | Duvar 1 / 2 / 3 bölüm uzar. |
| En çok acınan teras | O terasın acıma toplamı ≥4 | İlgili teras | "Ağır teras" düzenleyicisi |
| `heart` | ≥ +6 / ≤ −6 / arası | Araf XXX–XXXI, Beatrice'in sitemi | Üç çeşitleme: gözyaşı, katılık, denge |
| `inf02.courage_beatrice` | bayrak | Araf XXVII 35–36 | Beatrice'in adı ilk söyleyişte işe yarar. |
| `inf02.courage_virgil` ve `trust` | bayrak ve trust ≥7 | Araf XXVII 139–142, Vergilius'un veda sözü | Fazladan bir veda konuşması |
| `inf02.courage_ladies` | bayrak | Araf IX, Lucia Dante'yi uykusunda taşır | Dante Lucia'yı rüyasında tanır. |
| `inf01.motive_gate` | bayrak | Araf IX, Petrus'un anahtarları | Kapıda fazladan bir konuşma |
| `inf03.asked_neutral` | bayrak | Araf XVIII, koşan tembeller | Koşanlar Dante için bir kez yavaşlar. |
| `inf03.left_hope`, `inf04.hope_returned` | bayrak | Araf XXX 49–51, Vergilius'un gidişi | Kitap'taki `Hope` kartı veda anında parlar. |
| `inf02.doubt_proud`, `inf04.sixth_proud` | bayrak sayısı 1 / 2 | Araf X–XII, kibir terası; Dante kendi kibrini XIII 136–138'de itiraf eder | Birinci terasta taşın ağırlığı artar. |
| `memory:inf05.paolo_francesca` | anı | Araf XXVI, Cennet IX | Fazladan bir konuşma |
| `pity@limbo`, `justice@limbo` | ≥2 | Cennet XIX–XX, Kartal ve Ripheus | Dante'nin sorusu ve onun çerçevesi |
| Erdem kademeleri | kademe | Araf I 22–24, dört yıldız | Yıldızların parlaklığı |
| `trust` | ≥7 / 3–6 / ≤2 | Araf XXX 49–51 | Veda çeşitlemesi |

Bağların dayandığı iki dize:

> Somewhat disturbed he said: "Now look thou, Son, / 'Twixt Beatrice and thee there is this wall." (Purgatorio XXVII, 35–36)

> Thee o'er thyself I therefore crown and mitre!" (Purgatorio XXVII, 142)

Not: Ateş duvarının önünde Vergilius korkuyu yeniden bıraktırır. `Fear` yükü Araf XXVII'de geri dönebilir ve şu dizeyle bırakılabilir:

> Now lay aside, now lay aside all fear, (Purgatorio XXVII, 31)

---

## 4. Kimlik (ID) kaydı

### 4.1 Dilbilgisi

```text
kanto     := inf01 … inf34 | pur01 … pur33 | par01 … par33
sahne     := <kanto>.s<n>              n = 0–99   (s0 açılış sayfası)
vuruş     := <sahne>.b<n>              n = 1–99
seçim     := <kanto>.c<n>              n = 1–99
seçenek   := <seçim>=<harf>            harf = a | b | c   (koşulda: choice:inf05.c4=a)
ad        := [a-z][a-z0-9_]{1,31}      küçük harf ve alt çizgi
bayrak    := <kanto>.<ad>              etkide: flag:inf03.left_hope
anı       := <kanto>.<ad>              etkide: memory:inf05.paolo_francesca
codex     := <kanto>.<ad>              etkide: codex:inf03.charon
olay      := <kanto>.<ad>              DO içinde {event:inf01.waited_dawn}; when: event:inf01.waited_dawn
söz       := Büyük harfle başlayan tek İngilizce kelime; oyun genelinde tek (word:Love)
sistem    := ch<n>.<ad> | sys.<ad>     yalnızca motor kaldırır
günah     := limbo | lust | …          (§3.8)
harita    := <kanto>_<ad>              @place: inf03_gate
```

Bayrak, anı, codex ve olay ID'leri ayrı ad alanlarındadır; tür öneki (`flag:`, `memory:`, `codex:`, `event:`) onları ayırır. Bu yüzden aynı kişinin codex kaydıyla anısı benzer adlar taşıyabilir (`codex:inf05.francesca`, `memory:inf05.paolo_francesca`).

### 4.2 Önekler ve sahiplik

| Önek | Sahibi | Dosya |
|---|---|---|
| `inf01` | Kanto I yazarı | `docs/script/inferno-01.md` |
| `inf02` | Kanto II yazarı | `docs/script/inferno-02.md` |
| `inf03` | Kanto III yazarı | `docs/script/inferno-03.md` |
| `inf04` | Kanto IV yazarı | `docs/script/inferno-04.md` |
| `inf05` | Kanto V yazarı | `docs/script/inferno-05.md` |
| `ch1`, `sys` | Motor (programcı) | — |
| Sözler, günah etiketleri | Baş yazar | Bu belge |

Bir yazar yalnızca kendi önekiyle ID üretir. Başka bir kantonun bayrağını ancak §4.3'te kayıtlıysa okuyabilir.

### 4.3 Kanto sınırını aşan bayraklar

| Bayrak | Kaldıran | Okuyan (Bölüm 1) | Okuyan (sonra) | Anlamı ve önerilen kullanım |
|---|---|---|---|---|
| `inf01.motive_escape` | `inf01.c4=a` | IV s1 | — | Dante kaçmak istedi. IV'teki uyanışta: kaçmak istedikçe daha derine iniyor. |
| `inf01.motive_gate` | `inf01.c4=b` | III s1 | Araf IX | Petrus'un kapısını görmek istedi. III'te: "This is not the gate you promised me." |
| `inf01.motive_souls` | `inf01.c4=c` | III s2, V s5 | — | Kayıp ruhları görmek istedi. V'te Vergilius: "You asked to see them." |
| `inf02.doubt_proud` | `inf02.c1=c` | IV s4 | Araf X–XIII | Kuşkusunu bir şairin gururuyla söyledi. |
| `inf02.courage_beatrice` | `inf02.c2=a` | IV s6–s7, V s6 | Araf XXVII | Cesareti Beatrice'in gözyaşlarından geldi. |
| `inf02.courage_virgil` | `inf02.c2=b` | IV s6–s7 | Araf XXVII | Cesareti Vergilius'un sözünden geldi. |
| `inf02.courage_ladies` | `inf02.c2=c` | IV s6–s7 | Araf IX | Cesareti üç Hanım'dan geldi. |
| `inf03.left_hope` | `inf03.c1=b` | III s1, IV s2, IV s6–s7 (§2.8'deki örnek) | Araf XXX | Umudunu kapıda bıraktı. |
| `inf03.asked_neutral` | `inf03.c2=b` | — | Araf XVIII | Bir Kararsız'ın adını sordu. |
| `inf04.hope_returned` | IV s2 (koşullu) | — | Araf XXX | Vergilius umudu geri verdi. |
| `inf04.sixth_proud` | `inf04.c2=a` | — | Araf X–XIII | Altıncı şair olmayı gururla kabul etti. |
| `inf05.verdict_pity` | `inf05.c4=a` | — | VI, Araf XXVI–XXVII, Cennet IX | Francesca için ağladı. |
| `inf05.verdict_justice` | `inf05.c4=b` | — | VI, Araf XXVI–XXVII | Francesca'dan yüz çevirdi. |

Her kantonun okuyabileceği sayaçlar: `pity`, `justice`, `heart`, `pity@limbo`, `justice@limbo`, `pity@lust`, `justice@lust`, `trust`, `virtue:*`.

### 4.4 Söz durumları

| Söz | Değişim | Nerede |
|---|---|---|
| Fear | Verilir, sonra bırakılır | I s1'de verilir. III s1'de (`inf03.c1=a`) ya da IV s2'de (umudun geri verilmesiyle) bırakılır. |
| Hope | Verilir; mühürlenebilir ve açılır | I s3'te verilir. III s1'de mühürlenebilir (`inf03.c1=b`). IV s2'de açılır. |

Kanto IV sonunda her oyuncunun durumu aynıdır: Fear yoktur, Hope açıktır.

### 4.5 Codex kayıtları (Bölüm 1 planı)

Bu liste en az kümedir; yazar kendi önekiyle kayıt ekleyebilir.

| Kanto | Kayıtlar |
|---|---|
| I | `inf01.dark_wood` (places); `inf01.panther`, `inf01.lion`, `inf01.she_wolf`, `inf01.virgil` (souls); `inf01.greyhound` (lore) |
| II | `inf02.aeneas_paul`, `inf02.terza_rima` (lore); `inf02.beatrice`, `inf02.lucia`, `inf02.gentle_lady`, `inf02.rachel` (souls) |
| III | `inf03.gate`, `inf03.acheron` (places); `inf03.contrapasso` (lore); `inf03.neutrals`, `inf03.great_refusal`, `inf03.charon` (souls) |
| IV | `inf04.limbo`, `inf04.noble_castle` (places); `inf04.harrowing` (lore); `inf04.virgil_limbo`, `inf04.homer`, `inf04.horace`, `inf04.ovid`, `inf04.lucan`, `inf04.heroes`, `inf04.thinkers`, `inf04.aristotle`, `inf04.socrates`, `inf04.plato`, `inf04.avicenna`, `inf04.averroes`, `inf04.saladin` (souls) |
| V | `inf05.second_circle` (places); `inf05.order_of_hell`, `inf05.galeotto` (lore); `inf05.minos`, `inf05.semiramis`, `inf05.dido`, `inf05.cleopatra`, `inf05.helen`, `inf05.achilles`, `inf05.paris`, `inf05.tristan`, `inf05.francesca`, `inf05.paolo` (souls) |

Kanto sınırını aşan `RELATED` bağları: `inf04.virgil_limbo` ile `inf01.virgil`; `inf04.heroes` ile `inf02.aeneas_paul` ve `inf01.greyhound` (Camilla iki kantoda da geçer). Kanto içinde zorunlu bağ: `inf05.paolo` ile `inf05.francesca`.

### 4.6 Anılar

| ID | Tür | Kaldıran | Not |
|---|---|---|---|
| `inf05.paolo_francesca` | kept | `inf05.c4=a` | Bölüm 1'in tek anısı |

### 4.7 Sistem bayrakları

| Bayrak | Kaldıran | Koşul |
|---|---|---|
| `ch1.heart_tender` | Motor, Kanto V kolofonunda (`@chapter_end: ch1`) | heart ≥ 3 |
| `ch1.heart_stern` | Motor | heart ≤ −3 |
| `ch1.heart_even` | Motor | Diğer durumlar |
| `ch1.trust_faithful` | Motor | trust ≥ 7 |
| `ch1.trust_wayward` | Motor | trust ≤ 2 |

### 4.8 Konuşmacılar

Konuşmacı ID'leri kanto öneki taşımaz ve oyun genelinde tektir. Adaş kişiler ayırt edici bir ek alır: buradaki `BRUTUS`, Tarquinius'u kovan Brutus'tur (IV 127); Inferno XXXIV'teki Brutus başka bir ID alacaktır. Ayrılmış kelimeler (§2.5) konuşmacı ID'si olamaz.

| ID | Kim | Konuşma izni |
|---|---|---|
| `DANTE` | Oynanan Dante | Modern ve Longfellow |
| `VIRGIL` | Vergilius | Modern ve Longfellow |
| `BEATRICE`, `LUCIA` | Kanto II'deki anlatıda | **Yalnızca Longfellow** |
| `FRANCESCA` | | **Yalnızca Longfellow** |
| `CHARON`, `MINOS`, `VOICE` | Kharon, Minos, Limbo'daki ses (IV 79–81) | **Yalnızca Longfellow** |
| `HOMER`, `HORACE`, `OVID`, `LUCAN` | Dört şair | Modern; kişi başı en çok iki balon |
| `ARISTOTLE`, `SOCRATES`, `PLATO`, `AVICENNA`, `AVERROES`, `ELECTRA`, `HECTOR`, `CAESAR`, `CAMILLA`, `PENTHESILEA`, `LATINUS`, `LAVINIA`, `BRUTUS`, `LUCRETIA`, `JULIA`, `MARCIA`, `CORNELIA`, `DEMOCRITUS`, `DIOGENES`, `ANAXAGORAS`, `THALES`, `ZENO`, `EMPEDOCLES`, `HERACLITUS`, `DIOSCORIDES`, `ORPHEUS`, `TULLY`, `LIVY`, `SENECA`, `EUCLID`, `PTOLEMY`, `GALEN`, `HIPPOCRATES` | Limbo'nun büyükleri | Modern; kişi başı **tek balon**; kantoda en çok sekiz konuşan |
| `SOUL` | Adsız lanetli ruh | Modern (yalnızca Minos'un mahkemesinde) ve `BARK` |
| `NEUTRAL` | Adsız Kararsız | Yalnızca `BARK`; en çok üç kelimelik kopuk parçalar |
| `SHADE` | Adsız Limbo ruhu | Yalnızca `BARK`; tercihen hiç |
| `PANTHER`, `LION`, `SHE_WOLF`, `PAOLO`, `GREAT_REFUSAL`, `AENEAS`, `SALADIN`, `SEMIRAMIS`, `DIDO`, `CLEOPATRA`, `HELEN`, `ACHILLES`, `PARIS`, `TRISTAN`, `VIRGIN`, `RACHEL` | | **Sessiz.** Satır alamaz, `QUOTE` sesi olarak da kullanılamaz. Ön bilgideki `characters` listesine sahnede görünen karakter olarak yazılabilir. |
| `POET`, `INSCRIPTION` | Şiirin anlatıcısı, kapı yazısı | Yalnızca `QUOTE` sesi |

### 4.9 Olaylar (sistemik seçimler için)

Bu tablo yalnızca sistemik seçimlerin dinlediği olayları listeler. Yazar başka oynanış olaylarını da kendi önekiyle tanımlayabilir (§2.5'teki `inf03.banner_turned` gibi).

| Olay | Ne zaman yayılır |
|---|---|
| `inf01.waited_dawn` | Pars sahnesinde oyuncu, şafak ışığı yamaca ulaşana kadar parsa yaklaşmadan bekledi (öneri: yamaçta en az 8 saniye hareketsiz kalmak ya da geri çekilmek). |
| `inf01.held_ground` | Aslan kükrerken oyuncu hareket etmedi ve atılmadı. |
| `inf01.turned_to_guide` | Dişi kurt Dante'yi ilk kez aşağı ittikten sonra oyuncu yeniden tırmanmak yerine aşağıdaki gölgeye yürüdü. |
| `inf03.held_before_charon` | Kharon, Dante'ye ölülerin arasından çekilmesini buyururken (III 88–89) oyuncu kıyıdan geri adım atmadı. |
| `inf05.minos_two_right` | Minos'un mahkemesinde üç tahminden en az ikisi doğruydu. |

---

## 5. Karakter İncili

Her karakter için rolü, sesi, kuralları, örnek modern replikleri ve ona ait Longfellow dizeleri verilmiştir. Örnek replikler öneridir; dizeler kaynaktan harfi harfine kopyalanmıştır.

### 5.1 Dante (`DANTE`)

- **Rol:** Oynanan karakter. Bir yolcudur, savaşçı değildir. Hayatının ortasında yolunu yitirmiş bir şairdir (gelenekte 35 yaşında; şiirin yılı 1300).
- **Ses:** Korkmuş ama dikkatli; çok soru sorar. Vergilius'a saygıyla seslenir ("Master", "Poet", "my guide"); asla laubali değildir. Çabuk acır, çabuk ağlar. Şiire ve şairlere tutkundur: şairlerin adı geçince canlanır, yer yer gururlanır. Dünyayı imgelerle görür ama sade konuşur. Bölüm 1'de şaka yapmaz.
- **Kurallar:** Oyuncunun seçimleri Dante'yi karakterinin dışına çıkarmaz. Zalim, alaycı ya da kayıtsız bir Dante yazılmaz.
- **Örnek replikler:**

```script
DANTE (afraid): I can't say how I came in. I only know the road was gone.
DANTE (awed): I know your book. I know it better than my own name.
DANTE: Master, who are they? Why do they cry like that?
```

- **Longfellow'da Dante:**

> "Have pity on me," unto him I cried, / "Whiche'er thou art, or shade or real man!" (Inferno I, 65–66)

> Thou art my master, and my author thou, / Thou art alone the one from whom I took / The beautiful style that has done honour to me. (Inferno I, 85–87)

> I not Aeneas am, I am not Paul, (Inferno II, 32)

> Whence I: "Their sense is, Master, hard to me!" (Inferno III, 12)

> Said: "How shall I come, if thou art afraid, / Who'rt wont to be a comfort to my fears?" (Inferno IV, 17–18)

> And I began: "Thine agonies, Francesca, / Sad and compassionate to weeping make me. (Inferno V, 116–117)

### 5.2 Vergilius (`VIRGIL`)

- **Rol:** Rehber. Romalı şair (MÖ 70–19), *Aeneis*'in yazarı. Limbo'da yaşayan bir ruhtur; Beatrice'in isteğiyle gelmiştir. Araf'ın sonuna kadar Dante'nin yanındadır (GDD 2.5).
- **Ses:** Sakin, kısa, sıcak; bir öğretmenin sabrı. Bekçilere karşı kesin ve kalıplıdır: onlara her zaman Longfellow'un dizesiyle konuşur. Limbo söz konusu olunca hüzünlenir ama yakınmaz. Dante'ye ara sıra "my son" der (III 121). Mizahı çok seyrek ve kurudur; Bölüm 1'de neredeyse hiç yoktur.
- **Kurallar:** Vergilius ders vermez, alegori açıklamaz ve Dante'nin seçimlerini yargılamaz. Q ipuçları (`HINT`) onun sesidir ve kısa, somut cümlelerdir: "The rocks break the wind. Move when it falls." Kharon'a ve Minos'a aynı formülü söyler, ama formülün çevirisi iki kantoda farklıdır (§6.6).
- **Örnek replikler:**

```script
VIRGIL (gentle): Your fear is honest. Keep it close, and keep walking.
VIRGIL (firm): Not that way. That way belongs to her. We take the long road down.
VIRGIL (quiet): This is my home. It is quiet here. That is all it is.
```

- **Longfellow'da Vergilius:**

> He answered me: "Not man; man once I was, (Inferno I, 67)

> A poet was I, and I sang that just / Son of Anchises, who came forth from Troy, / After that Ilion the superb was burned. (Inferno I, 73–75)

> "Thee it behoves to take another road," (Inferno I, 91)

> "Here all suspicion needs must be abandoned, / All cowardice must needs be here extinct. (Inferno III, 14–15)

> And unto him the Guide: "Vex thee not, Charon; / It is so willed there where is power to do / That which is willed; and farther question not." (Inferno III, 94–96)

> And among such as these am I myself. (Inferno IV, 39)

> That without hope we live on in desire." (Inferno IV, 42)

### 5.3 Pars (`PANTHER`)

- **Rol:** Yamaçta yolu kesen ilk hayvan. Hızlı, benekli, dans eden bir engeldir. Saldırmaz ama geçit de vermez.
- **Ad:** Oyunda Longfellow'daki gibi **"panther"** denir. GDD'deki "Leopar" yalnızca Türkçe belgelerde kalabilir.
- **Ses:** Sessizdir. Yalnızca kısa, ritmik bir hırıltı (SFX).
- **Kurallar:** Öldürülmez, zarar görmez. Gelenekte ona yüklenen anlam (şehvet ya da hile) diyalogda söylenmez; Codex notunda "Readers have long seen…" diye geçer.

```script
NARRATION: The panther did not strike. She only stayed in front of him, wherever he turned.
```

> A panther light and swift exceedingly, / Which with a spotted skin was covered o'er! (Inferno I, 32–33)

> And never moved she from before my face, / Nay, rather did impede so much my way, / That many times I to return had turned. (Inferno I, 34–36)

### 5.4 Aslan (`LION`)

- **Rol:** İkinci hayvan. Başı yukarıda, aç, dosdoğru gelir; havanın bile ondan korktuğu söylenir. Kükremesi bir korku dalgasıdır ve Resolve'u azaltır.
- **Ses:** Sessizdir. SFX: alçak bir kükreme.
- **Kurallar:** Gelenekte ona yüklenen anlam (kibir ya da şiddet) yalnızca Codex'te geçer.

```script
NARRATION: The lion came straight at him, head high, starving.
```

> But not so much, that did not give me fear / A lion's aspect which appeared to me. / He seemed as if against me he were coming / With head uplifted, and with ravenous hunger, / So that it seemed the air was afraid of him; (Inferno I, 44–48)

### 5.5 Dişi kurt (`SHE_WOLF`)

- **Rol:** Geçilemeyen hayvan. Bütün açlıklarla yüklü ve sıskadır; Dante'yi adım adım "güneşin sustuğu" yere geri iter. Bu sahne kazanılamaz. Oyuncu geri itilir, ama bu bir başarısızlık gibi sunulmaz: yolun değiştiği andır.
- **Ses:** Sessizdir. SFX: nefes, pençe sesi.
- **Kurallar:** Vergilius'un anlattığı Tazı (Greyhound) kehaneti çözülmeye çalışılmaz. Codex notu şöyle der: "No one knows for certain who the Greyhound is." Gelenekte kurda yüklenen anlam (açgözlülük) yalnızca Codex'te geçer.

```script
NARRATION: She was all hunger and no flesh. With every step she took, he lost one.
```

> And a she-wolf, that with all hungerings / Seemed to be laden in her meagreness, / And many folk has caused to live forlorn! (Inferno I, 49–51)

> E'en such made me that beast withouten peace, / Which, coming on against me by degrees / Thrust me back thither where the sun is silent. (Inferno I, 58–60)

> And has a nature so malign and ruthless, / That never doth she glut her greedy will, / And after food is hungrier than before. (Inferno I, 97–99)

### 5.6 Beatrice (`BEATRICE`)

- **Rol:** Dante'nin sevdiği, ölmüş kadın. Cennet'ten Limbo'ya iner ve Vergilius'tan Dante'yi kurtarmasını ister. Bölüm 1'de yalnızca Vergilius'un anlatısında görünür (II 52–126). Cennet'te rehber olacaktır (GDD 7).
- **Ses:** Işıklı, yumuşak ve kararlı. Korkusuzdur (II 88–93). Sözünü bitirince ağlar ve parlayan gözlerini öte yana çevirir; Vergilius'u hızlandıran bu gözyaşlarıdır (II 115–117).
- **Kurallar:** Bölüm 1'de **yalnızca Longfellow** konuşur; tek bir modern cümlesi yoktur. Anlatı sayfalarında ışıkla çizilir. Kanto I'de adı geçmez; Vergilius ondan yalnızca "daha layık bir ruh" diye söz eder (I 122) ve oyun da adını orada söylemez.
- **Örnek (kitabın sesiyle):** Modern repliği olmayan karakterler için örnek satır, onları anlatan `NARRATION` satırıdır.

```script
NARRATION: She came down into the dark of Limbo, and the dark did not touch her.
```

> Beatrice am I, who do bid thee go; / I come from there, where I would fain return; / Love moved me, which compelleth me to speak. (Inferno II, 70–72)

> Of those things only should one be afraid / Which have the power of doing others harm; / Of the rest, no; because they are not fearful. (Inferno II, 88–90)

> After she thus had spoken unto me, / Weeping, her shining eyes she turned away; / Whereby she made me swifter in my coming; (Inferno II, 115–117)

### 5.7 Lucia (`LUCIA`)

- **Rol:** Soylu Hanım'ın (Meryem) elçisi. Hanım onu çağırıp Dante'yi ona emanet eder (II 97–99); Lucia da Rahel'in yanında oturan Beatrice'e koşar ve onu Dante'nin yardımına gönderir (II 100–108). Yardım zinciri böyle kurulur: Hanım, Lucia, Beatrice, Vergilius. "Zalim olan her şeyin düşmanı"dır. Araf IX'da yeniden görünecek ve Dante'yi uykusunda taşıyacaktır.
- **Ses ve kurallar:** Yalnızca Longfellow. Anlatı sayfasında hızla hareket eden bir ışık figürüdür.

```script
NARRATION: Sent by the Lady, Lucia hurried across Heaven to where Beatrice sat beside Rachel.
```

> Lucia, foe of all that cruel is, / Hastened away, and came unto the place / Where I was sitting with the ancient Rachel. (Inferno II, 100–102)

> "Beatrice" said she, "the true praise of God, / Why succourest thou not him, who loved thee so, / For thee he issued from the vulgar herd? (Inferno II, 103–105)

### 5.8 Soylu Hanım (`VIRGIN`) ve Rahel (`RACHEL`)

- **Rol:** Cennet'teki soylu Hanım (II 94), yani Meryem. Dante'nin durumuna acır ve katı hükmü kırar; yardım zinciri ondan başlar.
- **Kurallar:** Yalnızca anlatılır. Ekranda yüzle gösterilmez, yalnızca ışık olarak görünür. Sessizdir: sözleri (II 98–99) Beatrice'in anlatısının içinde, `BEATRICE` sesiyle gelir. Codex başlığında "The Gentle Lady" diye geçer; NOTE onun Meryem olduğunu söyler.
- **Rahel** (sessiz): Beatrice'in Cennet'te yanında oturduğu "eski Rahel" (II 102). Yalnızca Codex'te yer alır.

```script
NARRATION: High above them all, a Lady saw the man on the slope, and grieved for him.
```

> A gentle Lady is in Heaven, who grieves / At this impediment, to which I send thee, / So that stern judgment there above is broken. (Inferno II, 94–96)

> In her entreaty she besought Lucia, / And said, "Thy faithful one now stands in need / Of thee, and unto thee I recommend him." (Inferno II, 97–99)

### 5.9 Kararsızlar (`NEUTRAL`) ve büyük reddin gölgesi (`GREAT_REFUSAL`)

- **Rol:** Cehennem'in girişinde, hayatta ne iyiye ne kötüye taraf tutmuş ruhlar ve onlarla karışmış, taraf tutmamış melekler. Dönen bir bayrağın ardından durmadan koşarlar; eşek arıları ve at sinekleri onları sokar. Ne Cennet onları kabul eder ne Cehennem.
- **Ses:** Anlaşılmaz bir uğultu. `BARK NEUTRAL` yalnızca en çok üç kelimelik kopuk parçalardır ("—this way—", "—no, there—"). Asla bir ad, asla kim olduklarına dair bir cümle yoktur.
- **Kurallar:** Hiçbirine ad verilmez. Büyük reddin gölgesi (III 59–60) gösterilir ama **adı söylenmez**; Dante de söylemez. Codex notu: "Dante does not name him. Many readers have thought of Pope Celestine V, who gave up the papacy in 1294." Terazi burada açılır ve boş kalır (§3.1).

```script
BARK NEUTRAL: —this way— no—
NARRATION: They ran after a banner that never stopped turning, and none of them ever looked up.
```

> And he to me: "This miserable mode / Maintain the melancholy souls of those / Who lived withouten infamy or praise. (Inferno III, 34–36)

> No fame of them the world permits to be; / Misericord and Justice both disdain them. / Let us not speak of them, but look, and pass." (Inferno III, 49–51)

> When some among them I had recognised, / I looked, and I beheld the shade of him / Who made through cowardice the great refusal. (Inferno III, 58–60)

> These miscreants, who never were alive, / Were naked, and were stung exceedingly / By gadflies and by hornets that were there. (Inferno III, 64–66)

### 5.10 Kharon (`CHARON`) ve Akheron kıyısındaki ruhlar (`SOUL`)

- **Rol:** Akheron'un kayıkçısı; Cehennem'in ilk iblis bekçisi. Ak saçlı yaşlı bir adamdır, gözlerinin çevresinde alevden çarklar vardır. Ruhları toplar ve geride kalanı küreğiyle döver. Yaşayan Dante'yi taşımayı reddeder; Vergilius'un sözüyle susar.
- **Ses:** Yalnızca Longfellow, bağırarak. Modern repliği yoktur. Gerisi ses ve beden dilidir.
- **Oynanış:** Kıyıda kürek darbelerinden kaçınılır. Kharon'un çekil emri sırasında kıpırdamama ölçülür (`inf03.c3`). **Dante kayığa binmez** (§6.7).
- **Kıyıdaki ruhlar:** Tanrı'ya ve doğumlarına küfrederler (III 103–105). Oyunda bu, söz olarak değil ses olarak verilir. Kayığa güz yaprakları gibi dökülürler: *As in the autumn-time the leaves fall off,* (Inferno III, 112)

```script
NARRATION: The ferryman's eyes burned in rings of fire. He looked at Dante and knew at once that he was alive.
```

> And lo! towards us coming in a boat / An old man, hoary with the hair of eld, / Crying: "Woe unto you, ye souls depraved! (Inferno III, 82–84)

> And thou, that yonder standest, living soul, / Withdraw thee from these people, who are dead!" (Inferno III, 88–89)

> He said: "By other ways, by other ports / Thou to the shore shalt come, not here, for passage; / A lighter vessel needs must carry thee." (Inferno III, 91–93)

> Charon the demon, with the eyes of glede, / Beckoning to them, collects them all together, / Beats with his oar whoever lags behind. (Inferno III, 109–111)

### 5.11 Minos (`MINOS`)

- **Rol:** İkinci çemberin girişindeki yargıç ve bekçi. Hırlar; ruhların itiraflarını dinler ve kuyruğunu, ruhun ineceği çember sayısı kadar bedenine dolar. Dante'yi görünce onu uyarır; Vergilius aynı formülle onu susturur.
- **Ses:** Yalnızca Longfellow (V 16–20). Mini oyunda konuşmaz; kuyruğu konuşur.
- **Kurallar:** Minos'un uyarısı güven sistemine doğrudan bağlanır (`inf05.c2`): *…in whom thou trustest;* (Inferno V, 19)

```script
NARRATION: Minos heard each soul to the end, then wound his tail about himself and sent it down.
```

> There standeth Minos horribly, and snarls; / Examines the transgressions at the entrance; / Judges, and sends according as he girds him. (Inferno V, 4–6)

> Girds himself with his tail as many times / As grades he wishes it should be thrust down. (Inferno V, 11–12)

> "O thou, that to this dolorous hostelry / Comest," said Minos to me, when he saw me, / Leaving the practice of so great an office, / "Look how thou enterest, and in whom thou trustest; / Let not the portal's amplitude deceive thee." (Inferno V, 16–20)

### 5.12 Dört şair (`HOMER`, `HORACE`, `OVID`, `LUCAN`) ve ses (`VOICE`)

- **Rol:** Limbo'da Vergilius'u karşılayan ve Dante'yi altıncı şair olarak aralarına alan dört büyük şair. Önce adı bilinmeyen bir ses Vergilius'u selamlar (`VOICE`). Sesin kime ait olduğu belirsizdir; bir şaire mal edilmez.
  - Homeros: elinde kılıç taşır; "şairlerin hükümdarı"dır.
  - Horatius: "hiciv şairi"; dördünün içinde dili en kuru olan.
  - Ovidius: dönüşümlerin şairi.
  - Lucanus: iç savaşın şairi.
- **Ses:** Ağırbaşlı ve nazik. Yüzlerinde ne hüzün vardır ne sevinç (IV 84). Kişi başı en çok iki balon.
- **YASAK:** Şairlerin yolda Dante'yle konuştukları yazılmaz; Dante bunu bilerek susmuştur (IV 104). Oyunda balonlar açılır ama boştur, ya da kitabın sesi bunun söylenmediğini söyler.

```script
HOMER: Another voice for the old song. Walk with us a while.
HORACE (wry): Six of us now. The world will call it a crowd.
OVID: I wrote of things that change their shape. This place never does.
LUCAN: I wrote of Romans killing Romans. Whatever you see below, set it down plainly.
```

> In the mean time a voice was heard by me: / "All honour be to the pre-eminent Poet; / His shade returns again, that was departed." (Inferno IV, 79–81)

> That one is Homer, Poet sovereign; / He who comes next is Horace, the satirist; / The third is Ovid, and the last is Lucan. (Inferno IV, 88–90)

> And more of honour still, much more, they did me, / In that they made me one of their own band; / So that the sixth was I, 'mid so much wit. (Inferno IV, 100–102)

> Thus we went on as far as to the light, / Things saying 'tis becoming to keep silent, / As was the saying of them where I was. (Inferno IV, 103–105)

### 5.13 Limbo'nun büyükleri

- **Rol:** Soylu kalenin çayırındaki erdemli pagan kahramanlar, kadınlar ve düşünürler. Vaftiz edilmemişlerdir; işkence görmezler ama umutsuz bir özlem içinde yaşarlar.
- **Ses:** "Seyrek ve yumuşak sesle" konuşurlar (IV 114). Her biri **tek balon** konuşur ve kantoda en çok sekiz figür konuşur. Hiçbiri anılmak istemez; adları zaten yaşıyor.
- **Kimler konuşabilir (öneri):** Aristotle, Socrates, Plato, Avicenna, Averroes, Electra, Hector, Camilla, Orpheus. **Sessiz kalanlar:** Aeneas (Vergilius'la yalnızca bir bakışma: yazar ve kahramanı; EKLEME) ve Saladin ("yalnız, bir kenarda", IV 129).
- **Aristotle:** Şiir onun adını vermez, onu "bilenlerin ustası" diye anar (IV 131). Oyun içi adı Aristotle'dır; Codex notu bunu söyler.
- **Kurallar:** Felsefe dersi yoktur, yalnızca tek cümlelik bir iz bırakılır. Anakronizm yoktur.

```script
ARISTOTLE: Everything moves toward what it loves. Remember that, where you are going.
SOCRATES: You came here asking questions. Good. Do not stop when the answers frighten you.
AVERROES: I spent my life explaining another man's book. You will understand that one day.
CAMILLA: Your guide wrote of how I fell. He wrote it kindly.
ORPHEUS: I sang my way down once, for love. You will have to walk.
```

> People were there with solemn eyes and slow, / Of great authority in their countenance; / They spake but seldom, and with gentle voices. (Inferno IV, 112–114)

> I saw that Brutus who drove Tarquin forth, / Lucretia, Julia, Marcia, and Cornelia, / And saw alone, apart, the Saladin. (Inferno IV, 127–129)

> When I had lifted up my brows a little, / The Master I beheld of those who know, / Sit with his philosophic family. (Inferno IV, 130–132)

> Euclid, geometrician, and Ptolemy, / Galen, Hippocrates, and Avicenna, / Averroes, who the great Comment made. (Inferno IV, 142–144)

### 5.14 Aşkın gölgeleri: Semiramis, Dido, Kleopatra, Helen, Akhilleus, Paris, Tristan

- **Rol:** Kasırgada savrulan ve Vergilius'un parmağıyla gösterip adlandırdığı ünlü âşıklar. Konuşmazlar.
- **Oynanış:** Sığırcık ve turna sürüleri gibi geçerler. Oyuncu geçen bir gölgeye E ile bakarsa Codex kaydı açılır. Dido V 61–62'de adsız anılır; adı V 85'te geçer.
- **Kurallar:** Sessizdirler (`SEMIRAMIS`, `DIDO`, `CLEOPATRA`, `HELEN`, `ACHILLES`, `PARIS`, `TRISTAN`). Codex notları yargılamaz, öyküyü bir iki cümleyle anlatır.

```script
NARRATION: They went by like birds in winter, crying, carried wherever the wind wished.
```

> She is Semiramis, of whom we read / That she succeeded Ninus, and was his spouse; / She held the land which now the Sultan rules. (Inferno V, 58–60)

> The next is she who killed herself for love, / And broke faith with the ashes of Sichaeus; / Then Cleopatra the voluptuous." (Inferno V, 61–63)

> Helen I saw, for whom so many ruthless / Seasons revolved; and saw the great Achilles, / Who at the last hour combated with Love. (Inferno V, 64–66)

> Paris I saw, Tristan; and more than a thousand / Shades did he name and point out with his finger, / Whom Love had separated from our life. (Inferno V, 67–69)

### 5.15 Francesca (`FRANCESCA`)

- **Rol:** Ravenna'da doğmuş, Rimini'ye gelin gitmiş Francesca. Kocasının kardeşi Paolo'ya âşık olmuştur; ikisini de kocası öldürmüştür (tarihte 1285 dolayında). Bölüm 1'in merkezidir.
- **Ses:** Kibar, belagatli, acılı. Aşkı bir yasa gibi anlatır: üç tercetine "Love" kelimesiyle başlar (V 100, 103, 106). Kendini savunur ama yalvarmaz. Dante'ye minnetle seslenir.
- **Kurallar:** **Yalnızca Longfellow konuşur**; tek bir modern cümlesi yoktur. Seçenekler onu ne aklar ne aşağılar. O konuşurken rüzgâr gerçekten durur (V 96).

```script
NARRATION: Two shades left the flock and came to them side by side, as light as the wind that had carried them.
```

> "O living creature gracious and benignant, / Who visiting goest through the purple air / Us, who have stained the world incarnadine, (Inferno V, 88–90)

> If were the King of the Universe our friend, / We would pray unto him to give thee peace, / Since thou hast pity on our woe perverse. (Inferno V, 91–93)

> Love, that on gentle heart doth swiftly seize, / Seized this man for the person beautiful / That was ta'en from me, and still the mode offends me. (Inferno V, 100–102)

> Love, that exempts no one beloved from loving, / Seized me with pleasure of this man so strongly, / That, as thou seest, it doth not yet desert me; (Inferno V, 103–105)

> Love has conducted us unto one death; / Caina waiteth him who quenched our life!" (Inferno V, 106–107)

> And she to me: "There is no greater sorrow / Than to be mindful of the happy time / In misery, and that thy Teacher knows. (Inferno V, 121–123)

> One day we reading were for our delight / Of Launcelot, how Love did him enthral. / Alone we were and without any fear. (Inferno V, 127–129)

> Kissed me upon the mouth all palpitating. / Galeotto was the book and he who wrote it. / That day no farther did we read therein." (Inferno V, 136–138)

### 5.16 Paolo (`PAOLO`)

- **Rol:** Paolo Malatesta, Francesca'nın sevgilisi. Hep onun yanındadır ve ondan hiç ayrılmaz.
- **Kurallar:** **Hiç konuşmaz**; ne modern ne Longfellow. Yalnızca ağlar. Animasyonu Francesca'ya dönüktür; oyuncuya hiç doğrudan bakmaz.

```script
NARRATION: The other shade said nothing. He only wept.
```

> This one, who ne'er from me shall be divided, (Inferno V, 135)

> And all the while one spirit uttered this, / The other one did weep so, that, for pity, (Inferno V, 139–140)

---

## 6. Ton ve yazım kuralları

### 6.1 Modern İngilizce

- Sade, açık ve ağırbaşlı yaz. Kısa cümleler, somut isimler, yalın fiiller kullan.
- Dil zamansız olmalı: ne arkaik ne güncel argo.
- Kısaltmalar (it's, don't) diyalogda seyrek kullanılabilir. `NARRATION` ve `PAGE`'de kullanılmaz.
- Ünlem ve üç nokta az kullanılır.
- Oyuncuya göz kırpan ironi, meta şaka ve "oyun dili" yoktur.
- Alegori diyalogda açıklanmaz ("The panther is lust."). Gerekiyorsa Codex notunda, yorum geleneği olarak yazılır.

**Yasaklı arkaik kelimeler** (bunlar yalnızca Longfellow'da bulunur): `thee`, `thou`, `thy`, `thine`, `ye`, `hath`, `doth`, `dost`, `shalt`, `wilt`, `wouldst`, `couldst`, `hast`, `ere`, `o'er`, `'tis`, `'twas`, `nay`, `behold`, `lo`, `whence`, `thence`, `hither`, `thither`, `alas`.

**Yasaklı modern kelimeler** (örnekler): `okay`, `OK`, `hey`, `yeah`, `guys`, `wow`, `cool`, `stuff`, `gonna`, `wanna`, `kinda`, `awesome`, `totally`, `literally`, `basically`, `vibe`, `chill`, `freak out`, `stress`, `trauma`. Zamanı saat ve dakikayla ölçme; "a moment", "the hour" gibi ifadeler kullan.

| Yapma | Yap | Neden |
|---|---|---|
| `VIRGIL: Thou must abandon fear, my son.` | `VIRGIL (gentle): Leave your fear here, my son.` | Arkaik dil yalnızca şiire aittir. |
| `DANTE: Okay, I get it.` | `DANTE: I understand.` | Argo yok. |
| `NARRATION: Dante freaked out.` | `NARRATION: Dante's courage failed him.` | Kitabın sesi ağırbaşlıdır. |
| `VIRGIL: Abandon all hope, you who enter.` | Kapı yazısını `QUOTE INSCRIPTION` olarak göster. | Ünlü dize başka çevirilerden ya da bellekten yazılmaz. |
| `VIRGIL: The panther stands for lust.` | Codex: "Readers have long seen the panther as…" | Alegori diyalogda söylenmez. |
| `NARRATION: I found myself in a dark forest.` | `NARRATION: Dante could not say how he had come into the wood.` | "I" diyen anlatım yalnızca Longfellow'dur. |

### 6.2 Kitabın sesi (`NARRATION`, `PAGE`)

- Üçüncü tekil şahıs ve geçmiş zaman kullanır; Dante'den "Dante" ya da "he" diye söz eder.
- Şerit en çok iki cümle (200 karakter), sayfa en çok 400 karakterdir.
- Olayı söyler, yorum yapmaz. Bir duyguyu adlandırmak yerine göstermeyi seçer.
- Aynı sahnede gösterilen bir Longfellow dizesini modern sözlerle yeniden söylemez.
- Okura "you" diye seslenmez. Arayüz istemleri bunun dışındadır.

### 6.3 Ne zaman Longfellow, ne zaman bizim sözlerimiz

- **Çapa dizeleri** (§7'de her kanto için listelenmiştir) her zaman Longfellow'la ve harfi harfine gösterilir. Bunlar kantonun kimliğidir.
- Olayı ilerleten bağlantı konuşmaları, açıklamalar ve oyun anları modern dille yazılır.
- Bir dizeyi gösterdikten hemen sonra onu modern bir balonla "tercüme" etme. Açıklama gerekiyorsa `GLOSS` yaz.
- Hiçbir modern satır, aynı kantonun Longfellow metniyle 5 ya da daha fazla kelimelik birebir dizi paylaşmaz (L09). Tek bir anahtar kelimeyi ya da kısa bir sözü ("my son", "Master") yankılamak serbesttir.
- Bir karakterin dizesini başka bir karaktere söyletme. Uzun konuşmaları §2.6'daki kurallarla kısaltmak serbesttir; sahibini değiştirmek değildir.
- Seçimin yerini tutan kanonik dizeyi sahnede modern bir köprüyle geç ve asıl dizeyi "What Dante did" kartına sakla (§2.11).
- Başka çevirilerden (Mandelbaum, Hollander vb.) asla alıntı yapma ve onları yakın biçimde yeniden yazma (GDD 10.3).

### 6.4 Uzunluk sınırları

| Öğe | Sınır |
|---|---|
| Modern balon | 140 karakter (kutuda yaklaşık 3 satır) |
| Art arda modern balon | 5 (araya eylem, alıntı ya da seçim girmeden) |
| `NARRATION` / `PAGE` | 200 / 400 karakter |
| Seçenek metni | 48 karakter |
| `PROMPT` | 120 karakter |
| `NOTE` (REVEAL) ve `GLOSS` | 160 karakter |
| `HINT` / `HINT-SHORT` | 120 / 60 karakter |
| `BARK` | 60 karakter |
| `QUOTE` | Blokta en çok 6 dize; art arda en çok 12 dize; epigraf en çok 3; REVEAL en çok 6 |
| Codex `NOTE` / anı `NOTE` | 400 / 300 karakter |

### 6.5 SAPMA ve EKLEME notları

- **SAPMA** (zorunlu): Şiirle çelişen ya da onu değiştiren her şey. Olayların sırasını değiştirmek, bir dizeyi başka bir karaktere vermek, şiirde susan birine konuşma yazmak, şiirde olmayan bir sonuç göstermek ya da adı olan yeni bir karakter yaratmak.
- **EKLEME** (zorunlu, vuruş başına bir kez): Şiirde olmayan ama şiirle çelişmeyen olaylar. Öğretici sahneler, mini oyunlar, adsız ruhların replikleri, Limbo figürlerinin tek balonu, şiirin söylediği bir şeyin görselleştirilmesi.
- Oyuncunun Dante'den farklı bir şey seçmesi **sapma değildir**. Bu, kitabın tasarımıdır ve "What Dante did" kartıyla dengelenir.
- Modern bağlantı replikleri için not gerekmez.

Biçim (tek satır, Türkçe):

```script
SAPMA: Vergilius'un Dante'ye umudunu geri vermesi şiirde yok. | Gerekçe: Kapıda umudunu bırakan oyuncunun yolu burada omurgaya döner. | Dayanak: Vergilius VIII'de Dante'yi umutla güçlendirir (Inferno VIII, 106–107).
EKLEME: Minos'un mahkemesi bir tahmin oyunu olarak oynanır; ruhların itirafları bizimdir ve adsızdır. | Dayanak: Inferno V, 7–15
```

**Bölüm 1'de onaylı sapma ve eklemeler**

| Tür | Yer | Ne |
|---|---|---|
| SAPMA | IV s2 | Vergilius kapıda bırakılan umudu geri verir (yalnızca `inf03.left_hope` ile). |
| EKLEME | I s2 | Geriye bakma etkileşimi (I 22–27'deki benzetmenin oyunlaştırılması) |
| EKLEME | I s3–s5 | Hayvanların nasıl geçildiğinin ölçülmesi |
| EKLEME | II s4 | Vergilius'un anlatısının resimli sayfalar olarak gösterilmesi; Beatrice ve Lucia'nın kendi sözlerini kendi seslerinde söylemesi |
| EKLEME | II s6 | Vergilius'un ilk terceti öğretmesi (GDD 4.0) |
| EKLEME | III s3, s6 | Kalabalık, arı sürüleri ve kürek darbeleri (oynanış) |
| EKLEME | IV s3 | "Ruhlardan orman"ın sessiz ve yol açan bir kalabalık olarak görselleştirilmesi |
| EKLEME | IV s4 | Dört şairin modern selam balonları (IV 97–98'de konuşurlar ama sözleri aktarılmaz); Dante'nin zinciri şairlerin arasında bulması (terza rima Dante'nin buluşudur) |
| EKLEME | IV s7 | Limbo figürlerinin tek balonluk konuşmaları; Vergilius ile Aeneas'ın bakışması |
| EKLEME | V s2 | Minos'un mahkemesi (tahmin oyunu) ve adsız ruhların itirafları |

### 6.6 Kaynak metindeki tuhaflıklar (düzeltme!)

Kaynak, 1867 baskısının Project Gutenberg metnidir. Aşağıdaki dizeler hata gibi görünse de **olduğu gibi** kopyalanır.

"were" yerine "where":

> Her eyes where shining brighter than the Star; (Inferno II, 55)

"then?" sonrasında iki boşluk:

> What is it, then?  Why, why dost thou delay? (Inferno II, 121)

Cümle sürdüğü hâlde satır sonunda nokta:

> And when to gazing farther I betook me. (Inferno III, 70)

Ayrık yazılmış "'t is":

> If by opposing winds 't is combated. (Inferno V, 30)

"And" sonrasında virgül:

> And, he to me: "Thou'lt mark, when they shall be (Inferno V, 76)

Addan sonra virgül yok:

> "Beatrice" said she, "the true praise of God, (Inferno II, 103)

- Kanto II'deki iç içe tırnaklar: Vergilius'un sözleri `"` ile, onun aktardığı Beatrice `'` ile, Beatrice'in aktardığı Lucia ve Meryem yeniden `"` ile yazılır.
- **Vergilius'un formülü iki kantoda farklı çevrilmiştir.** Her seferinde kendi kantosundan kopyala. Kharon'a:

> That which is willed; and farther question not." (Inferno III, 96)

Minos'a:

> That which is willed; and ask no further question." (Inferno V, 24)

### 6.7 GDD ile farklar (GDD güncellenecek)

| GDD | Bu belge | Gerekçe |
|---|---|---|
| 4.1: Kapı yazısı "Abandon all hope, ye who enter here" | Oyunda yalnızca Longfellow'un dizesi kullanılır (tablonun altında). | GDD'deki biçim Longfellow'un çevirisi değildir. |
| 4.1: Kharon'un kayığıyla geçiş; nehirden uzanan eller | Dante kayığa binmez. Kıyı oynanışı kalabalık ve kürekten oluşur. Geçiş bayılmayla olur; Dante IV'te karşı kıyıda uyanır. | III 91–93'te Kharon Dante'yi taşımayı reddeder; IV 1–9 uyanıştır. Kayık sahnesi yine de istenirse ancak bayılmanın içinde, rüya olarak ve SAPMA notuyla yapılabilir. |
| 4.0: "Leopar" | Oyun içinde "Panther" | Longfellow, I 32 |
| 4.2: Aristoteles ve diğerleriyle konuşulur | Kişi başı tek balon, kantoda en çok sekiz konuşan. Aristotle adı Codex'te açıklanır. | IV 114; IV 131 |
| 4.2: Codex Limbo'da tanıtılır | Bu korunur. Ama Words sekmesi Kanto I'de, okuma modu (Kitap) Kanto I'in sonunda açılır. | Söz sistemi ilk kantoda başlar. |
| 7: Her önemli ruhun diyaloğu bir Longfellow alıntısıyla biter | Bu korunur ve genişler: Francesca, Beatrice, Lucia, Kharon ve Minos yalnızca Longfellow konuşur. | §4.8 |
| 9: Codex sekmeleri Verses, Souls, Map | Kitap sekmeleri: Cantos, Verses, Words, Souls · Places · Lore, Remembrance, Map | §1.5 |
| 2.2: "Söz (Verse)" ışıktan bir dize fırlatır | Fırlatılan şey oyuncunun kurduğu tercettir. İlk tercet (Way · Love · Away), GDD'deki iten ve sersemleten dizedir. | §3.4 |
| 12, açık soru 2: Uyanışlar | Öneri: Uyanış dizesi epigraf olarak sayfada gelir, ardından kısa bir sinematik | §1.3 |

Kapı yazısının son dizesi, Longfellow'da:

> All hope abandon, ye who enter in!" (Inferno III, 9)

---

## 7. Kanto iskeletleri (I–V)

### 7.0 Ortak

Her kanto için şunlar verilmiştir: ön bilginin temel değerleri, Türkçe özet, bağlayıcı sahne listesi, çapa dizeleri, bağlayıcı seçim blokları, okunan bayraklar ve yazar notları. Seçim bloklarındaki ID'ler, harfler, etkiler ve REVEAL alıntıları bağlayıcıdır. Seçenek metinleri ve replikler öneridir.

**Mekanik sözlüğü** (ön bilgideki `mechanics` alanı için):

| Ad | Açıklama | GDD sistemi | Kanto |
|---|---|---|---|
| `move`, `dash`, `talk` | Hareket, atılma, konuşma | GDD 2.2 | I |
| `follow` | Vergilius'un takibi | GDD 2.5 | I+ |
| `fear` | Korku bölgelerinde Resolve azalır | GDD 2.3 | I, III, V |
| `darkness` | Görüş daralır | `VisionModifier` | I, III, IV, V |
| `look_back` | Tuşu basılı tutunca geriye bakmak (I 22–27) | — | I |
| `chase` | Kaçış sekansı | — | I |
| `hold_ground` | Kükreme ya da emir anında kıpırdamama ölçümü | yeni | I, III |
| `push_back` | Kazanılamaz itme (dişi kurt) | — | I |
| `read_pages` | Resimli sayfaları çevirerek okumak; dizeden söz toplamak | yeni | II |
| `compose`, `verse` | Tercet kurmak ve atmak | GDD 2.2 "Verse" | II+ |
| `inscription` | Yazının sözlere etki etmesi (kapı) | — | III |
| `heart` | Terazi | yeni | III+ |
| `crowd_flow` | Yön değiştiren kalabalık | yeni (Malebolge 1'de de kullanılır) | III |
| `swarm` | Arı sürüleri | `PatternHazard` | III |
| `guardian` | Bekçi karşılaşması | GDD 2.5 | III, V |
| `quake`, `faint` | Deprem ve senaryolu bayılma | — | III, V |
| `hub` | Savaşsız merkez | GDD 4.2 | IV |
| `walk_on_water` | Derecikten katı zemindeymiş gibi geçmek (IV 109) | — | IV |
| `remembrance`, `chain` | Anma sekmesi, tercet zinciri | yeni | IV |
| `judgement_game` | Minos'un mahkemesi | yeni | V |
| `wind_field`, `shelter`, `wind_lull` | Rüzgâr şeritleri, kayalık sığınak, senaryolu dinme (V 96) | `WindField` | V |

**Kalıcı mekanikler.** `move`, `dash`, `talk`, `follow`, `compose`, `verse`, `heart`, `remembrance` ve `chain` açıldıktan sonra her kantoda çalışır; `mechanics` listesinde yalnızca öğretildikleri ya da öne çıktıkları kantoda yazılırlar. Diğer bütün mekanikler yalnızca listelendikleri kantoda etkindir.

**Süre notu:** Süre hedefleri okuma süresini de kapsar. Bölüm 1'in toplamı 44–63 dakikadır. GDD'deki M0 dikey kesiti için ("10 dakikalık demo") Kanto I ve V'in kısa kurgusu ayrıca planlanır; bu belge tam sürümü tanımlar.

### 7.1 Kanto I — The Dark Wood (Karanlık Orman)

`id: inf01` · `location: "The Dark Wood"` · `lines: "1–136"` · `epigraph: "Inferno I, 1–3"` · `closing: "Inferno I, 136"` · `playtime: "8–12"`
`mechanics: [move, dash, talk, fear, darkness, look_back, chase, hold_ground, push_back, follow]`

**Özet.** Dante yolunu yitirmiş, karanlık bir ormandadır. Ormandan çıkar ve güneşin aydınlattığı bir tepenin eteğine varır; tırmanmak ister. Pars, aslan ve dişi kurt sırayla yolunu keser. Dişi kurt onu "güneşin sustuğu" yere geri iter. Orada Vergilius belirir ve ona başka bir yoldan, Cehennem'den ve Araf'tan geçerek gideceklerini söyler. Dante kabul eder ve onun ardından yürür. Oyunda bu kanto hareket, atılma, konuşma ve takip öğreticisidir; ilk sözler burada toplanır.

| Sahne | Başlık (EN) | Dizeler | Kip | İçerik ve mekanik | Verilenler |
|---|---|---|---|---|---|
| `inf01.s0` | Opening page | 1–3 | page | Epigraf | — |
| `inf01.s1` | The Forest Dark | 4–12 | play | Sık ve karanlık orman, dar görüş. Korku bölgeleri Resolve'u yavaşça azaltır. Hareket öğreticisi. I 4–6 ekrana gelince "fear" kelimesi parlar ve Dante'ye kendiliğinden yapışır (Yük). I 10–12 ile "way" toplanır. | `word:Fear`, `word:Way`, `unlock:words`, `codex:inf01.dark_wood` |
| `inf01.s2` | The Hill at Dawn | 13–30 | play | Vadinin sonu; tepenin omuzları güneşte (I 16–18). I 22–27'deki benzetme: oyuncu tuşu basılı tutarak dönüp ormana bakabilir (`look_back`; isteğe bağlı, ödülsüz, tek bir anlatım şeridi). Yamaç tırmanışı (I 28–30). | — |
| `inf01.s3` | The Panther | 31–43 | play | Pars yolu keser, dans eder, Dante'yi geri döndürür (I 34–36). Şafak gelir (I 37–43): ışık arttıkça pars uzaklaşır. Bekleyen oyuncu için `inf01.waited_dawn`. I 41 ile "hope" toplanır. | `word:Hope`, `codex:inf01.panther`, `inf01.c1` |
| `inf01.s4` | The Lion | 44–48 | play | Aslan başı yukarıda, düz çizgilerle saldırır; kükremesi bir korku dalgasıdır. Kükreme sırasında kıpırdamayan oyuncu için `inf01.held_ground`. | `codex:inf01.lion`, `inf01.c2` |
| `inf01.s5` | The She-wolf | 49–60 | play | Kazanılamaz itme: dişi kurt Dante'yi adım adım aşağı iter (I 58–60). İlk düşüşte aşağıda bir gölge belirir; ona yönelen oyuncu için `inf01.turned_to_guide`. En geç üçüncü düşüşte sahne Dante'yi gölgenin önüne bırakır. Resolve sıfıra inmez, bayılma yoktur. | `codex:inf01.she_wolf`, `inf01.c3` |
| `inf01.s6` | The Shade in the Silence | 61–90 | dialogue | Vergilius belirir (I 61–63). Dante'nin şiirdeki ilk sözleri bir acıma yakarışıdır (I 65–66); bu bir seçim değildir, omurgadır. Vergilius kendini tanıtır (I 67–75) ve Dante'nin neden geri döndüğünü sorar (I 76–78). Dante onu tanır (I 79–87); "love" burada toplanır (I 83). Dante kurdu gösterir (I 88–90). `trust` burada 4 olarak başlar. | `word:Love`, `codex:inf01.virgil` |
| `inf01.s7` | Another Road | 91–129 | dialogue | Vergilius başka bir yol gösterir (I 91). Kurdun doğası (I 94–99) ve Tazı kehaneti (I 100–111) kısaltılarak verilir; kehanet Codex'e gider. Yolculuk teklifi: ebedî yer, ateşteki hoşnutlar, daha layık bir ruh (I 112–129). Beatrice'in adı burada geçmez. | `codex:inf01.greyhound` |
| `inf01.s8` | The Motive | 130–136 | dialogue, sonra play | `inf01.c4`. Ardından I 136 ve takip öğreticisi: Vergilius önde yürür. | `inf01.c4` |
| `inf01.s9` | Colophon | 136 | colophon | Kapanış dizesi I 136 | `unlock:book` |

**Çapa dizeleri:** I 1–3, 4–6, 10–12, 41, 58–60, 65–66, 67, 83, 85–87, 91, 136.

**Seçimler**

```script
CHOICE inf01.c1 minor systemic "The panther"
OPTION a [Waited for the dawn] when: event:inf01.waited_dawn
EFFECTS: virtue:temperance+1
OPTION b [Slipped past her] when: else
END CHOICE
```

```script
CHOICE inf01.c2 minor systemic "The lion"
OPTION a [Held his ground] when: event:inf01.held_ground
EFFECTS: virtue:fortitude+1
OPTION b [Ran from the roar] when: else
EFFECTS: resolve-1
END CHOICE
```

```script
CHOICE inf01.c3 minor systemic "The she-wolf"
OPTION a [Turned to the stranger] when: event:inf01.turned_to_guide
EFFECTS: virtue:prudence+1
OPTION b [Climbed until thrown down] when: else
END CHOICE
```

```script
CHOICE inf01.c4 major "Why Dante goes"
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
END CHOICE
```

**Yazar notları**

- Vergilius'un uzun konuşmasını (I 91–129) böl: en çok iki `QUOTE` bloğu ve aralarında modern köprüler. Tazı kehanetini çözmeye çalışma.
- Pars, aslan ve kurdun gelenekteki anlamlarını diyalogda söyleme. Codex notunda "Readers have long seen…" diye yaz.
- Hayvanlar öldürülmez ve zarar görmez. Bu kantoda henüz "Verse" yoktur; kaçış atılmayla olur.
- Kolofonda yalnızca kapanış dizesi ve `unlock:book` vardır:

```script
@mode: colophon
QUOTE POET (Inferno I, 136)
> Then he moved on, and I behind him followed.
EFFECTS: unlock:book
```

### 7.2 Kanto II — The Evening of Doubt (Kuşku Akşamı)

`id: inf02` · `location: "The Dark Hillside"` · `lines: "1–142"` · `epigraph: "Inferno II, 7–9"` · `closing: "Inferno II, 142"` · `playtime: "6–9"`
`mechanics: [talk, read_pages, compose, verse, follow]`

**Özet.** Akşam olur. Dante yolculuğa hazırlanırken kuşkuya düşer: ne Aeneas'tır ne Pavlus. Vergilius buna korkaklık der ve neden geldiğini anlatır. Limbo'dayken yanına Beatrice inmiştir; onu Lucia, Lucia'yı da Cennet'teki soylu Hanım göndermiştir. Beatrice'in gözyaşları Vergilius'u hızlandırmıştır. Dante'nin cesareti, gece kapanan çiçeklerin güneşte açılması gibi geri gelir ve yola koyulurlar. Oyunda bu kanto, ilk tercetin kurulduğu sessiz bölümdür.

| Sahne | Başlık (EN) | Dizeler | Kip | İçerik ve mekanik | Verilenler |
|---|---|---|---|---|---|
| `inf02.s0` | Opening page | 7–9 | page | Epigraf: Musalara ve belleğe yakarış. Kitabın kendisine yapılan bu çağrı, oynanabilir kitabın ilk sayfası gibi okunmalıdır. | — |
| `inf02.s1` | Evening on the Hillside | 1–6 | cinematic | Akşam; hayvanlar dinlenir; Dante tek başına savaşa hazırlanır (II 3–5). | — |
| `inf02.s2` | The Doubt | 10–42 | dialogue | Dante'nin kuşkusu (II 10–36): Aeneas ve Pavlus. `inf02.c1`. İsteyip istememe hâli (II 37–42) anlatımla verilir. | `codex:inf02.aeneas_paul`, `inf02.c1` |
| `inf02.s3` | The Rebuke | 43–51 | dialogue | Vergilius: korkaklık (II 43–48). "Sana neden geldiğimi anlatayım" (II 49–51). | — |
| `inf02.s4` | Why Virgil Came | 52–126 | page | Vergilius'un anlatısı, resimli sayfalar olarak (`read_pages`): Limbo'da Beatrice (II 52–57); Beatrice'in sözleri (II 58–74), II 70'te "go" parlar; Vergilius'un sorusu (II 76–84); Beatrice'in cevabı (II 85–114): korkunun kuralı (II 88–90), soylu Hanım (II 94–96), Lucia (II 97–108); gözyaşları (II 115–117), II 116'da "away" parlar; Vergilius'un sitemi ve üç Hanım (II 118–126). | `word:Go`, `word:Away`, `codex:inf02.beatrice`, `codex:inf02.lucia`, `codex:inf02.gentle_lady`, `codex:inf02.rachel` |
| `inf02.s5` | Courage | 127–140 | dialogue | Çiçek benzetmesi (II 127–132) görsel olarak. `inf02.c2`. Dante'nin cevabı (II 136–140). | `inf02.c2` |
| `inf02.s6` | The First Verse | — | play | EKLEME (GDD 4.0): Vergilius ilk terceti öğretir. Oyuncu Way · Love · Away tercetini kurar. J ile atılan ilk "Verse" (Love: iter ve sersemletir) yamaçtaki bir taşı yuvarlar ve iniş yolunu açar. Düşman yoktur. | `unlock:compose`, `unlock:verse`, `codex:inf02.terza_rima` |
| `inf02.s7` | The Deep and Savage Way | 141–142 | cinematic | Vergilius yürür, Dante girer. | — |
| `inf02.s8` | Colophon | 142 | colophon | Kapanış II 142 | — |

**Çapa dizeleri:** II 7–9, 45, 70–72, 88–90, 116, 139–140, 142. (II 31–33, `inf02.c1`'in kartındadır; II 133–135, `inf02.c2`'nin kartındadır.)

**Seçimler**

```script
CHOICE inf02.c1 minor "How Dante doubts"
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
END CHOICE
```

```script
CHOICE inf02.c2 major "What gives Dante courage"
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
END CHOICE
```

**İlk tercet (öneri)**

```script
@mode: play
EKLEME: Vergilius'un ilk terceti öğretmesi şiirde yok; GDD 4.0'daki öğretici. | Dayanak: Beatrice, Vergilius'un sözünün gücüne güvenir (Inferno II, 67).
VIRGIL: You carry words now. A verse is made of three of them.
VIRGIL: The first and the last must answer each other. The middle one is its heart.
DO: Words ekranı A · B · A yuvalarıyla açılır. Oyuncu Way ve Away'i dış yuvalara, Love'ı ortaya koyar. {tutorial:compose}
EFFECTS: unlock:compose, unlock:verse, codex:inf02.terza_rima
DO: J ile ilk tercet atılır; yamaçtaki taşı yuvarlar ve iniş yolunu açar. Düşman yoktur. {tutorial:verse}
```

**Yazar notları**

- Beatrice, Lucia ve soylu Hanım yalnızca Longfellow konuşur; modern replikleri yoktur. Soylu Hanım (Meryem) yüzüyle gösterilmez, yalnızca ışık olarak görünür. Rahel'in yalnızca adı geçer.
- Anlatıdaki iç içe tırnaklar kaynaktaki gibi kalır (§6.6). Ses ataması: Beatrice'in sözleri `BEATRICE`, Lucia'nınkiler `LUCIA`, gerisi `VIRGIL`. Meryem'in sözleri (II 98–99) `BEATRICE` sesindedir: Meryem sessizdir (§4.8) ve sözlerini Beatrice aktarır. Lucia'nın sözlerini de Beatrice aktarır, ama Lucia kendi sesiyle konuşur (§6.5'teki onaylı EKLEME).
- II 55'teki "where" kaynakta böyledir; düzeltme.
- Anlatı sayfalarını en çok sekiz sayfada tut; her sayfada en çok 6 dize olsun.
- Söz toplama mekaniği burada öğretilir: dizede parlayan kelimeye E ile basılır.

### 7.3 Kanto III — The Gate (Kapı)

`id: inf03` · `location: "Ante-Inferno"` · `lines: "1–136"` · `epigraph: "Inferno III, 1–3"` · `closing: "Inferno III, 136"` · `playtime: "8–12"`
`mechanics: [inscription, fear, darkness, heart, crowd_flow, swarm, hold_ground, guardian, quake, faint]`

**Özet.** Cehennem kapısının yazısı okunur. Vergilius, Dante'ye kuşkuyu ve korkaklığı bırakmasını söyler ve onu elinden tutar. Yıldızsız havada Kararsızlar koşmaktadır: hiç taraf tutmamış ruhlar, durmadan dönen bir bayrağın ardından koşar ve arılar onları sokar. Akheron kıyısında geçmek için toplanmış ruhlar vardır. Kharon gelir, yaşayan Dante'yi reddeder ve Vergilius'un sözüyle susar. Ruhlar yaprak gibi kayığa dökülür. Deprem, rüzgâr ve kızıl bir ışık gelir; Dante bayılır.

| Sahne | Başlık (EN) | Dizeler | Kip | İçerik ve mekanik | Verilenler |
|---|---|---|---|---|---|
| `inf03.s0` | Opening page | 1–3 | page | Epigraf (`INSCRIPTION`) | — |
| `inf03.s1` | The Gate | 4–21 | cinematic, sonra dialogue | Yazının devamı kapının taşında (III 4–9). Vergilius'un öğüdü (III 14–18). `inf03.c1`. El (III 19–21). Örnek: §2.15. | `codex:inf03.gate`, `inf03.c1` |
| `inf03.s2` | The Air Without a Star | 22–51 | dialogue | Karanlık ve uğultu (III 22–30). Dante'nin soruları ve Vergilius'un cevapları (III 31–51). III 50'de terazi ilk kez ve boş olarak görünür (`unlock:heart`). `inf03.c2`. | `codex:inf03.contrapasso`, `codex:inf03.neutrals`, `unlock:heart`, `inf03.c2` |
| `inf03.s3` | The Banner | 53–69 | play | `crowd_flow`: bayrağın ardındaki kalabalık yön değiştirir. `swarm`: arı sürüleri. Büyük reddin gölgesi (III 58–60) görülür, adı söylenmez. Kurtçuklar (III 67–69) üslupla, kan göstermeden verilir. III 52 `inf03.c2`'nin kartındadır; sahne III 53'ten devam eder. | `codex:inf03.great_refusal` |
| `inf03.s4` | The Shore | 70–81 | play, sonra dialogue | Kıyıdaki ruhlar. Dante sorar, Vergilius cevabı erteler (III 76–78); "stay" burada toplanır. Dante utanır ve susar (III 79–81); bu yürüyüşte Q ipucu da susar (`HINT` yok). | `word:Stay`, `codex:inf03.acheron` |
| `inf03.s5` | Charon | 82–99 | cinematic, sonra play | Kharon gelir (III 82–87). Dante'ye çekilmesini buyurur (III 88–89); bu sırada kıpırdamama ölçülür (`inf03.c3`). Ret (III 91–93). Vergilius'un sözü (III 94–96). Kharon susar (III 97–99). | `codex:inf03.charon`, `inf03.c3` |
| `inf03.s6` | The Leaves | 100–129 | play | Ruhların küfrü (III 100–105) ses olarak. Kharon küreğiyle geride kalanı döver (III 109–111): kıyı kalabalığında kürek darbelerinden kaçınılır. Yaprak benzetmesi (III 112–117). Yeni topluluk (III 118–120). Vergilius'un açıklaması (III 121–129); "desire" burada toplanır. | `word:Desire` |
| `inf03.s7` | The Quake | 130–135 | cinematic | Deprem (`quake`), rüzgâr, kızıl ışık (`white-out` kızıla), bayılma. III 136 kolofonda gösterilir. | — |
| `inf03.s8` | Colophon | 136 | colophon | Kapanış III 136 | — |

**Çapa dizeleri:** III 1–9, 14–15, 49–51, 58–60, 77, 94–96, 112–114, 126, 136.

**Seçimler.** `inf03.c1` için tam blok §2.15'tedir ve bağlayıcıdır.

```script
CHOICE inf03.c2 minor "The runners"
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
END CHOICE
```

```script
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

**Okunan bayraklar:** `inf01.motive_gate` (s1, örnek §2.15'te), `inf01.motive_souls` (s2; öneri: `VIRGIL: You asked to see the lost. These are not even that.`).

**Yazar notları**

- **Dante kayığa binmez** (§6.7). Kıyı oynanışı kalabalık ve kürekten oluşur. Geçiş bayılmayla olur.
- Kararsızlara isim verilmez. Ad sorulduğunda cevap alınmaz. `BARK` replikleri en çok üç kelimelik kopuk parçalardır.
- Terazi burada açılır ama kıpırdamaz: III 50'nin kuralı budur.
- Kurtçuklar ve kan piksel ölçeğinde ima edilir; ayrıntılı vahşet yoktur.

### 7.4 Kanto IV — Limbo

`id: inf04` · `location: "Limbo"` · `lines: "1–151"` · `epigraph: "Inferno IV, 1–3"` · `closing: "Inferno IV, 151"` · `playtime: "10–14"`
`mechanics: [hub, talk, darkness, heart, remembrance, chain, walk_on_water]`

**Özet.** Ağır bir gök gürültüsü Dante'yi uyandırır; uçurumun kıyısındadır. Vergilius'un yüzü sararmıştır, ama korkudan değil acımadandır. Birinci çember Limbo'dur: işkence yoktur, yalnızca iç çekişler vardır. Burada vaftiz edilmemiş erdemliler yaşar ve Vergilius da onlardan biridir. Dante üzülür ve dikkatle sorar: buradan çıkan hiç oldu mu? Bir ateş karanlığı yener. Dört büyük şair Vergilius'u karşılar ve Dante'yi altıncı olarak aralarına alır. Yedi surlu soylu kale, yeşil çayır ve büyük ruhlar gelir. Sonra ışığın olmadığı bir yere inilir.

| Sahne | Başlık (EN) | Dizeler | Kip | İçerik ve mekanik | Verilenler |
|---|---|---|---|---|---|
| `inf04.s0` | Opening page | 1–3 | page | Epigraf: uyanış (§1.3, madde 9) | — |
| `inf04.s1` | The Brink | 4–24 | cinematic, sonra dialogue | Uçurum (IV 7–12): aşağı bakınca hiçbir şey görünmez. Vergilius soluktur (IV 13–15). Dante'nin korkusu (IV 16–18). Korku değil acıma (IV 19–21). Birinci çembere giriş (IV 22–24). `inf01.motive_escape` okunur. | — |
| `inf04.s2` | Sighs | 25–63 | dialogue | İç çekişler (IV 25–30): sessiz bir ses manzarası. Vergilius'un açıklaması (IV 31–42). `inf04.c1`. Ardından herkes için örtülü soru ve cevap (IV 46–63, kısaltılmış). `inf03.left_hope` varsa umudun geri verilmesi (SAPMA). | `codex:inf04.limbo`, `codex:inf04.harrowing`, `codex:inf04.virgil_limbo`, `inf04.c1` |
| `inf04.s3` | The Forest of Ghosts | 64–78 | play | "Ruhlardan orman" (IV 66): sık ve sessiz bir kalabalık, yaklaşınca yol açar (EKLEME). Ateş (IV 67–69); "fire" burada toplanır. Dante'nin sorusu (IV 73–75). Vergilius: onurlu ad (IV 76–78); Anma sekmesi açılır. | `word:Fire`, `unlock:remembrance` |
| `inf04.s4` | The Four Poets | 79–102 | cinematic, sonra dialogue | Ses (IV 79–81, `VOICE`). Dört gölge (IV 82–84). Vergilius onları adlandırır (IV 85–93). Okul (IV 94–96). Selam ve Vergilius'un gülümsemesi (IV 97–99). `inf04.c2`. Ardından zincir (EKLEME). | `codex:inf04.homer`, `codex:inf04.horace`, `codex:inf04.ovid`, `codex:inf04.lucan`, `inf04.c2`, `unlock:chain` |
| `inf04.s5` | Silence on the Way | 103–105 | play | IV 103 ile "light" toplanır. IV 104: şairler konuşur ama metin gösterilmez (YASAK: yazmak). | `word:Light` |
| `inf04.s6` | The Noble Castle | 106–117 | play | Yedi sur (IV 107); "wall" burada toplanır. Derecik üstünden katı zemindeymiş gibi geçilir (IV 109, `walk_on_water`). Yedi kapı, çayır, ağırbaşlı insanlar (IV 110–114). Codex burada bütün sekmeleriyle açılır; Grace üst sınırı artar (GDD 4.2). | `word:Wall`, `unlock:codex`, `gracemax+1`, `codex:inf04.noble_castle` |
| `inf04.s7` | The Great Spirits | 118–147 | play (`hub`) | İsteğe bağlı konuşmalar (EKLEME): her figür en çok bir balon (IV 114). Sessiz kalanlar: Aeneas, Saladin. IV 145–147: kitap da hepsini gösteremez; Codex kataloğu. | `codex:inf04.heroes`, `codex:inf04.thinkers`, `codex:inf04.aristotle`, `codex:inf04.socrates`, `codex:inf04.plato`, `codex:inf04.avicenna`, `codex:inf04.averroes`, `codex:inf04.saladin` |
| `inf04.s8` | Where Nothing Shines | 148–150 | cinematic | Altılı topluluk ikiye ayrılır; sessizlikten titreyen havaya çıkılır (IV 148–150). | — |
| `inf04.s9` | Colophon | 151 | colophon | Kapanış IV 151 | — |

**Çapa dizeleri:** IV 1–3, 21, 39, 42, 68, 76–78, 80–81, 103, 104, 107, 109, 114, 151. (IV 100–102, `inf04.c2`'nin kartındadır.)

**Seçimler**

```script
CHOICE inf04.c1 major "Virgil's own place"
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
END CHOICE
```

Seçimden sonra herkes için örtülü soru gelir. Ardından, yalnızca kapıda umudunu bırakan oyuncu için şu vuruş oynar:

```script
@mode: dialogue
IF flag:inf03.left_hope
SAPMA: Vergilius'un Dante'ye umudunu geri vermesi şiirde yok. | Gerekçe: Kapıda umudunu bırakan oyuncunun yolu burada omurgaya döner. | Dayanak: Vergilius VIII'de Dante'yi umutla güçlendirir (Inferno VIII, 106–107).
VIRGIL (gentle): At the gate you gave up your hope. Those words were never written for you.
VIRGIL (gentle): We live here without it. You do not have to.
DO: Mühürlü "Hope" kartı Vergilius'un elinde ışır ve Dante'ye geri döner. "Fear" kartı Limbo'nun sessizliğinde söner.
EFFECTS: word:Hope, shed:Fear, trust+1, flag:inf04.hope_returned
END IF
```

```script
CHOICE inf04.c2 minor "The sixth poet"
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
END CHOICE
```

Seçimden sonra zincir açılır. Terza rima Dante'nin buluşudur; bu yüzden zinciri şairlere öğretilmiş olarak değil, onların arasında kendisi bulmuş olarak yaz:

```script
@mode: dialogue
EKLEME: Dante zinciri şairlerin arasında kendisi bulur; terza rima Dante'nin buluşudur. | Dayanak: Inferno IV, 100–102
DANTE (awed): What if the middle line gave its sound to the next verse, and that one to the next?
HORACE (wry): Then nothing could stop it. Not even you.
VIRGIL (quiet): Try it.
DO: Words ekranında iki tercet yan yana açılır; ilk tercetin ortası ikincinin dış yuvalarına bir ışık çizgisiyle bağlanır. {tutorial:chain}
EFFECTS: unlock:chain
```

**Okunan bayraklar:** `inf01.motive_escape` (s1; öneri: `DANTE: I wanted to escape. I only keep falling deeper.` ve `VIRGIL: Down is the way out. Trust it.`), `inf03.left_hope` (s2; ayrıca s6–s7'de §2.8'deki örnek), `inf02.doubt_proud` (s4; `inf04.c2=a` seçilirse öneri: `VIRGIL (wry): A poet, not a saint. You said so yourself.`), `inf02.courage_beatrice`, `inf02.courage_virgil`, `inf02.courage_ladies` (s6–s7; §2.8'deki örnek).

**Yazar notları**

- Vergilius'un hüznü burada doruğa çıkar; ama ağlamaz ve yakınmaz. Kısa cümleler kullan.
- Mesih gösterilmez. IV 53'te yalnızca "güçlü biri" diye anılır; oyunda da yalnızca Vergilius'un sözüyle anılır.
- "Aristotle" adı şiirde geçmez (IV 131). Oyun içi adı Aristotle'dır; Codex notu bunu söyler.
- Limbo'da hiçbir ruh anılmak istemez; adları zaten yaşıyor. Anma sekmesi "Remembered by the world" listesiyle açılır: Homer, Horace, Ovid, Lucan, Virgil.
- Konuşan Limbo figürlerinin sayısı en çok sekizdir. Önerilen dokuz figürden birini sessiz bırak.

### 7.5 Kanto V — The Infernal Hurricane (Cehennem Kasırgası)

`id: inf05` · `location: "The Second Circle"` · `lines: "1–142"` · `epigraph: "Inferno V, 31–33"` · `closing: "Inferno V, 142"` · `playtime: "12–16"`
`mechanics: [guardian, judgement_game, fear, darkness, wind_field, shelter, wind_lull, talk, heart, faint]`

**Özet.** İkinci çemberin girişinde Minos hırlar. Ruhların itiraflarını dinler ve kuyruğunu dolayarak her birini yerine gönderir. Dante'yi görünce onu uyarır; Vergilius aynı sözle onu susturur. Işığın olmadığı yerde hiç durmayan bir kasırga, tutkularına yenilenleri savurur. Vergilius aşk yüzünden ölen ünlü gölgeleri gösterir. Dante, birlikte uçan iki ruhla konuşmak ister: Francesca ve Paolo. Francesca aşkın onları nasıl ele geçirdiğini ve Lancelot'u okurken nasıl öpüştüklerini anlatır. Paolo ağlar; Dante acımadan bayılır. Bölüm 1'in merkezi bu sahnedir.

| Sahne | Başlık (EN) | Dizeler | Kip | İçerik ve mekanik | Verilenler |
|---|---|---|---|---|---|
| `inf05.s0` | Opening page | 31–33 | page | Epigraf: kasırga | — |
| `inf05.s1` | The Descent | 1–3 | cinematic | Daha dar çember, daha büyük acı | — |
| `inf05.s2` | Minos | 4–24 | cinematic, play, dialogue | Minos'un mahkemesi (V 4–15). İsteğe bağlı mini oyun (`inf05.c1`, EKLEME): üç ruh itiraf eder (modern, adsız, birer balon), oyuncu kuyruğun kaç kez dolanacağını (2–9) tahmin eder. Minos Dante'yi görür (V 16–20). `inf05.c2`. Vergilius'un sözü (V 21–24). | `codex:inf05.minos`, `codex:inf05.order_of_hell`, `inf05.c1`, `inf05.c2` |
| `inf05.s3` | The Hurricane | 25–51 | play | Işığı olmayan yer (V 28): karanlık. `wind_field` ve `shelter`: atılma, rüzgâra karşı ilerlemenin tek yoludur. Sığırcıklar ve turnalar (V 40–49) sürüler hâlinde geçer. Dante sorar (V 50–51). | `codex:inf05.second_circle` |
| `inf05.s4` | The Shades of Love | 52–72 | play | Vergilius adlandırır: Semiramis, Dido, Kleopatra, Helen, Akhilleus, Paris, Tristan (V 52–69). Geçen gölgeye E ile bakılınca Codex açılır. Sahne şu dizeyle kapanır: *Pity prevailed, and I was nigh bewildered.* (Inferno V, 72) | `codex:inf05.semiramis`, `codex:inf05.dido`, `codex:inf05.cleopatra`, `codex:inf05.helen`, `codex:inf05.achilles`, `codex:inf05.paris`, `codex:inf05.tristan` |
| `inf05.s5` | The Two Who Go Together | 73–96 | dialogue | Dante sorar (V 73–75). Vergilius'un öğüdü (V 76–78). Dante seslenir (V 79–81). Kumrular (V 82–87). Francesca'nın selamı (V 88–96); "peace" burada toplanır (V 92). V 96'da rüzgâr gerçekten durur (`wind_lull`). `inf01.motive_souls` okunur. | `word:Peace`, `codex:inf05.francesca`, `codex:inf05.paolo` |
| `inf05.s6` | Francesca | 97–138 | dialogue | Ravenna (V 97–99). Üç kez "Love" (V 100–107); art arda en çok 12 dize. V 108. Dante başını eğer (V 109–111). `inf05.c3`. Dante'nin sorusu: `inf05.c3=a` ise V 116–120, `inf05.c3=b` ise V 118–120. Francesca: daha büyük acı yok (V 121–126). Okuma ve öpücük (V 127–138). `inf05.c4`. | `codex:inf05.galeotto`, `inf05.c3`, `inf05.c4` |
| `inf05.s7` | As a Dead Body Falls | 139–141 | cinematic | Paolo ağlar, Dante düşer. Dize gösterilmez; REVEAL kartına ve kolofona saklanır. Sahne yalnızca `CAM`, `DO` ve tek bir `NARRATION` ile kurulur. | — |
| `inf05.s8` | Colophon | 142 | colophon | `@chapter_end: ch1`. Sol sayfada V 142. Ertelenmiş kartlar (`inf05.c3`, `inf05.c4`) açılır; `inf05.c4` kartındaki "pity" kelimesi parlar ve herkese verilir. Ardından bölüm özeti. | `word:Pity` |

**Çapa dizeleri:** V 4–6, 19–20, 21–24, 31–33, 72, 92, 100–107, 111, 121–123, 137–138, 142. (V 112–114 ve V 139–141 kartlardadır.)

**Seçimler**

```script
CHOICE inf05.c1 minor systemic "Minos's court"
OPTION a [Judged as Minos judged] when: event:inf05.minos_two_right
EFFECTS: virtue:justice+1
OPTION b [Watched and learned] when: else
END CHOICE
EFFECTS: codex:inf05.order_of_hell
```

```script
CHOICE inf05.c2 minor "Minos's warning"
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
END CHOICE
QUOTE VIRGIL (Inferno V, 21–24)
> …"Why criest thou too?
> Do not impede his journey fate-ordained;
> It is so willed there where is power to do
> That which is willed; and ask no further question."
```

```script
CHOICE inf05.c3 minor "Virgil's question"
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
END CHOICE
```

```script
CHOICE inf05.c4 centre "The verdict"
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
END CHOICE
```

**Kolofon (bölüm sonu)**

```script
@mode: colophon
@chapter_end: ch1
QUOTE POET (Inferno V, 142)
> And fell, even as a dead body falls.
EFFECTS: word:Pity
```

**Minos'un mahkemesi için örnek itiraflar** (EKLEME; oyuncuya üçü sorulur, doğru cevap çember numarasıdır):

```script
SOUL: I lived for pleasure and called it love.
SOUL: I ate and drank while my house went hungry.
SOUL: I kept every coin. I gave nothing away.
SOUL: I raged at everyone, every day of my life.
SOUL: I taught that the soul dies with the body.
SOUL: I took my own life.
SOUL: I sold holy things for silver.
SOUL: I betrayed the friend who trusted me at my own table.
```

Doğru cevaplar sırasıyla: 2, 3, 4, 5, 6, 7, 8, 9. Minos tahminden sonra kuyruğunu dolar ve doğru sayıyı gösterir. Codex kaydı `inf05.order_of_hell`, Map sekmesine Cehennem'in kesitinden ilk sayfayı ekler.

**Okunan bayraklar:** `inf01.motive_souls` (s5; öneri: `VIRGIL (quiet): You asked to see them. Here are two.`), `inf02.courage_beatrice` (s6; Francesca'nın aşkı ile Beatrice'in aşkı arasındaki karşıtlığı tek bir `NARRATION` şeridiyle hissettir, açıklama yapma).

**Yazar notları**

- Francesca yalnızca Longfellow konuşur. Paolo hiç konuşmaz.
- Seçenekler Francesca'yı ne aklamalı ne aşağılamalı.
- Minos, mini oyunda konuşmaz; yalnızca V 16–20'yi söyler.
- `inf05.c3` ve `inf05.c4` kartları ertelenir: merkez sahne, kartlarla bölünmez.
- **M0 dikey kesiti:** Kanto V, Kanto I'den hemen sonra da oynanabilmelidir. II–IV bayrakları yoksa `ELSE` dalları oynar. Programcı M0 profilinde `verse`, `compose`, `heart`, `codex` ve `remembrance` kilitlerini açar, eksikse Way, Love ve Away sözlerini verir ve `Fear` yükünü bırakır (`shed:Fear`). Böylece Kanto V'e her oyuncu Kanto IV sonundaki durumla girer (§4.4).

---

## Ek A. Teslim kontrol listesi

- [ ] Ön bilgi eksiksiz; listeler dosyanın içeriğiyle uyumlu (L01, L17).
- [ ] Sahne ID'leri §7'deki gibi; vuruşlar sıralı.
- [ ] Her alıntı kaynaktan kopyalandı. Atıflar doğru. Düz tırnak, `…` ve `–` kullanıldı.
- [ ] Bütün çapa dizeleri yerinde.
- [ ] Seçim ID'leri, harfler, etkiler ve REVEAL alıntıları §7 ile aynı.
- [ ] Modern repliklerde arkaik kelime ya da argo yok; uzunluk sınırlarına uyuldu.
- [ ] Sessiz karakterler sessiz; yalnızca Longfellow konuşan karakterler modern konuşmuyor.
- [ ] Her söz, tablodaki sahnede ve köken dizesinin yanında veriliyor.
- [ ] Okunan her bayrak §4.3'te kayıtlı; her `IF` zincirinin anlamlı bir varsayılanı var (M0'da II–IV bayrakları yok).
- [ ] SAPMA ve EKLEME notları yazıldı.
- [ ] Codex kayıtları yazıldı; NOTE'lar şiiri, tarihi ve yorumu birbirinden ayırıyor.
- [ ] Süre hedefi tutuyor.

## Ek B. Terimler sözlüğü

| Türkçe | Oyun içi (EN) | Açıklama |
|---|---|---|
| Kalp | Heart | Acıma ve adalet terazisi |
| Acıma / Adalet | Pity / Justice | Kalbin iki kefesi |
| Güven | Trust | Arayüzde sayı olarak görünmez |
| Söz | Word | Şiirden toplanan tek kelime |
| Tercet | Verse | Üç sözden kurulan dize; bir yetenektir |
| Zincir | Chain | Terza rima örgüsüyle bağlanan tercetler |
| Koda | Coda | Zinciri kapatan tek söz |
| Yük | Burden | Kullanılamayan, taşınan söz (Fear) |
| Mühürlü | Sealed | Görünen ama kullanılamayan söz |
| Anma / Anı | Remembrance / Memory | |
| Erdem | Virtue | Dört kardinal erdem |
| Kitap | The Book | Duraklatma menüsü ve okuma modu |
| Kolofon | In this canto | Kantonun kapanış sayfası |
| Kart | What Dante did / As Dante did | Seçimden sonra çıkan asıl metin kartı |
| Omurga | — | Şiirin değişmeyen rotası, mekânları ve büyük olayları |
| Çapa dizesi | — | Her zaman harfi harfine gösterilen dize |
| Sahne / Vuruş | Scene / Beat | |
| Sapma / Ekleme | — | Şiirden ayrılma ya da şiire ekleme notu |
