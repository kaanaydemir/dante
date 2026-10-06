# Divine Comedy — Oyun Tasarım Dokümanı (GDD)

- **Çalışma adı:** *The Divine Comedy — A Playable Book*. Üç kitap: *Inferno · The Descent*, *Purgatorio · The Ascent*, *Paradiso · The Light*
- **Tür:** Oynanabilir kitap / 2D anlatı odaklı aksiyon-macera (üstten görünüm, pixel art)
- **Platform:** Tarayıcı (HTML5; Phaser 3.90, TypeScript, Vite)
- **Oyun içi dil:** İngilizce. Şiir yalnızca Longfellow çevirisinden (1867, kamu malı) alıntılanır.
- **Kardeş belge:** [Senaryo İncili ve Senaryo Biçimi](script/README.md). Sistemlerin kesin kuralları, sayılar, kimlikler ve Bölüm 1'in kanto iskeletleri oradadır.
- **Doküman durumu:** Taslak v0.2 (6 Ekim 2026). Değişiklikler en sondaki "Sürüm notları"ndadır.

> Midway upon the journey of our life / I found myself within a forest dark, / For the straightforward pathway had been lost. (Inferno I, 1–3)

**Bu belge nasıl okunur.** GDD oyunun neyi ve neden yaptığını anlatır. Kesin kurallar, sayılar ve kimlikler Senaryo İncili'ndedir; iki belge çelişirse Senaryo İncili geçerlidir ve GDD güncellenir. Senaryo İncili ve kod bu belgenin § numaralarına atıf yapar (ör. GDD 2.2, 4.0, 8.1, 9), bu yüzden v0.1'deki numaralar korunmuştur; yalnızca eski §3 (Yapı) §1.6'ya taşınmış ve yeri yeni sistemlere verilmiştir. Bu belgede atıflı her İngilizce dize Longfellow'dur ve `docs/source`'tan harfi harfine kopyalanmıştır. Atıfsız İngilizce ifadeler bizim yazdığımız oyun içi metinlerdir (arayüz, başlıklar, söz adları).

---

## 1. Vizyon: Oynanabilir Kitap

### 1.1 Dördüncü kuşak kitap

Birinci kuşak kitap düz metindir. İkincisi resimli kitap, üçüncüsü çizgi romandır. Bu proje dördüncü kuşağı deniyor: **oynanabilir kitap**. Okunan, oynanan ve okurun da etkilediği bir kitap.

Dante Alighieri'nin *İlahi Komedya*'sını böyle bir kitaba çeviriyoruz. Oyuncu Dante olur; şiiri hem okur hem yürür. Karanlık Orman'dan başlar, Cehennem'in dokuz çemberinden iner, Araf Dağı'na tırmanır ve sonunda Cennet'in ışığına ulaşır. Yol boyunca Dante'nin gördüklerine nasıl karşılık verdiğini, ne söylediğini ve neyi hatırladığını oyuncu belirler.

Kitabın kalbi *İlahi Komedya*'nın **konuşmaları ve karakterleridir**: Vergilius'un sabrı, Francesca'nın öyküsü, Farinata'nın gururu, Ulysses'in son yolculuğu, Ugolino'nun karanlığı. Oynanış bunlara hizmet eder.

**Tek cümlelik özet:** Şiirin rotası Dante'nin, kalbi oyuncunun: okunan, oynanan ve okurun etkilediği bir *İlahi Komedya*.

**Okurun deneyimi.** Her kanto bir kitap sayfasıyla açılır: kanto numarası, başlık, Doré tarzı bir vinyet ve Longfellow'dan bir epigraf. Sayfa çevrilince gravür renklenir ve oynanabilir bir dünyaya dönüşür. Kitabın sesi olayları anlatır, ruhlar konuşur, şiirin kendisi dize dize belirir. Önemli anlarda oyuncu Dante'nin iç tepkisini seçer; ardından kitap, şiirdeki Dante'nin ne yaptığını Longfellow'un dizesiyle gösterir. Kanto bir kolofonla kapanır: o kantoda oyuncunun yaptıkları, topladığı sözler ve kantonun tam metni. Ayrıntılar §9'dadır.

### 1.2 Öncelikler: önce metin ve karakterler

Tasarım kararları çatıştığında şu sıra geçerlidir:

1. **Metin ve karakterler.** Şiirin dizeleri, olayları ve karakterleri oynanış uğruna değiştirilmez, karakter dışına çıkarılmaz.
2. **Okuma deneyimi.** Okunaklılık, tempo ve sayfa hissi. Bir konuşma bir aksiyon anının içinde boğulmaz.
3. **Oyuncunun katkısı.** Seçimler, sözler, anılar ve bunların sonuçları (§3).
4. **Aksiyon.** Contrapasso mekanikleri, bekçiler, kaçışlar. Cezayı hissettirir ve okumayı taşır; okumanın önüne geçmez.

Bu sıranın somut sonuçları:

- Büyük konuşmalar güvenli anlarda geçer. Şiir de buna izin verir; Francesca konuşurken kasırga durur:

  > While silent is the wind, as it is now. (Inferno V, 96)

- Seçimlerde süre sınırı yoktur. Tehlikeli alanlarda anlatım şeritleri oyunu durdurmaz; uzun metinler güvenli alanlara konur.
- Süre hedefleri okuma süresini de kapsar (§1.5).
- Zorluk hikâyeyi kilitlemez. Bayılmanın bedeli azdır (§2.4); kolay modda Resolve azalmaz (§9.6).
- Şiir sustuğunda oyun da susar. Örneğin Dante'nin Limbo'da şairlerle yoldaki konuşması yazılmaz: *Things saying 'tis becoming to keep silent,* (Inferno IV, 104)

### 1.3 Omurga Dante'nin, iç tepki oyuncunun

Okur kitabın yolunu değiştirmez, Dante'nin içini etkiler. Bu ilke bütün sistemlerde geçerlidir.

- **Omurga (değişmez):** Rota, mekânlar ve büyük olaylar. Dante yine üç hayvanla karşılaşır, yine Akheron'u geçer, Francesca'dan sonra yine bayılır.
- **Oyuncunun payı:**
  - Dante'nin bir karşılaşmaya iç tepkisi: acıma ya da adalet, korku ya da cesaret.
  - Karakterinin sınırları içinde ne söylediği.
  - Ne öğrendiği ve neyi hatırladığı.
  - Hangi sözleri topladığı, hangi tercetleri kurduğu.
  - Bu seçimlerin sonraki kantolara ve kitaplara taşınan sonuçları.
- **Okur aslını öğrenir.** Her anlamlı seçimden sonra bir "What Dante did" kartı, şiirdeki Dante'nin ne yaptığını Longfellow'un dizesi ve atfıyla gösterir. Oyuncu Dante'yle aynı şeyi seçtiyse kartın başlığı "As Dante did" olur (§9.3).
- **Elmas kuralı.** Dallar aynı sahnenin sonunda omurgaya döner. Hiçbir dal bir omurga olayını atlayamaz (Senaryo İncili §2.4).
- Oyuncunun Dante'den farklı bir şey seçmesi şiirden sapma sayılmaz. Bu, kitabın tasarımıdır ve "What Dante did" kartıyla dengelenir.

**Örnek: Cehennem Kapısı (Kanto III).** Kapının yazısı umudu bırakmayı ister, Vergilius ise yalnızca korkuyu. Oyuncu Dante'nin kapıda neyi bıraktığını seçer. Şiirdeki Dante korkusunu bırakır. Umudunu bırakan oyuncu Limbo'ya umutsuz yürür; orada Vergilius umudunu ona geri verir ve yol yeniden omurgaya bağlanır. Seçimin izi yine de kalır: Araf'ın sonunda, Vergilius'un vedasında Kitap'taki "Hope" kartı parlar (§3.8).

### 1.4 Tasarım ilkeleri

1. **Önce kitap.** Metin ve karakterler önce gelir; oynanış okumaya hizmet eder (§1.2).
2. **Ceza = mekanik (contrapasso).** Dante'de her günahkârın cezası günahının bir yansımasıdır. Oyunda da her çemberin ana mekaniği o çemberin cezasından türetilir. Örneğin şehvet çemberinde oyuncuyu sürükleyen bir rüzgâr, kâhinler hendeğinde ters dönen kontroller vardır. Mekanik cezayı açıklamaz, hissettirir.
3. **Dante bir savaşçı değil, bir yolcudur.** Günahkârlar düşman değildir. Onlar ya tehlikedir ya da konuşulacak ruhlardır. Oyuncunun karşısına çıkan asıl engeller Cehennem'in **bekçileri ve iblisleridir**; onlar atlatılır, sersemletilir ya da geçilir. Öldürmek yoktur. Dante'nin elindeki tek güç, şiirden topladığı sözlerle kurduğu tercetlerdir: iter, sersemletir, korur, iyileştirir, yol gösterir; asla öldürmez.
4. **Rehberle yolculuk.** Vergilius (Araf'ın sonuna kadar), ardından Beatrice, oyuncunun yanında yürüyen bir yol arkadaşıdır. Rehber açıklar, ipucu verir ve bazı engeller yalnızca onun sözüyle açılır. Dante'nin Vergilius'a güveni ilişkinin rengini belirler (§3.7).
5. **Metne sadakat.** Dante'nin metni yalnızca Longfellow'dur: harfi harfine ve her zaman atıflı. Bizim yazdığımız her cümle sade ve açık İngilizcedir ve asla Dante'ninmiş gibi sunulmaz. Arkaik dil yalnızca şiire aittir. Atıflar ekranda her zaman görünür.
6. **Omurga Dante'nin, iç tepki oyuncunun.** Oyuncu yolun kendisini değil, Dante'nin bu yoldaki iç tepkisini ve onun sonuçlarını belirler. Her anlamlı seçimden sonra okur aslını görür (§1.3).

### 1.5 Hedef deneyim

- Her kanto bir kitap sayfasıyla açılır ve bir kolofonla kapanır, bu yüzden her kanto doğal bir duraklama yeridir. Bir oturum 20–40 dakikadır, yani iki ile dört kanto.
- Bölüm 1 (Kanto I–V) okuma dahil 44–63 dakikadır (Senaryo İncili §7.0). Bu yoğunlukla Inferno'nun tamamı v0.1'deki 3–5 saat hedefini aşar; kaba hesap 5–7 saattir. Hedef süre M1'den sonra yeniden belirlenecek (§12, soru 7).
- Oyuncu oyunu bitirdiğinde eserin yapısını, başlıca karakterlerini ve contrapasso fikrini öğrenmiş olur. Her kantonun çapa dizelerini Longfellow'un sözleriyle okumuştur ve oynadığı her kantonun tam metni Kitap'ta durur.
- Oyunun sonunda Kitap'ta **Your Comedy** sayfası açılır: oyuncunun kurduğu bütün tercetler, seçimlerinin kenar notlarıyla. Bu "oyuncunun Komedya'sı" baştan sona Longfellow dizelerinden oluşur (§3.4).
- **Ton:** Karanlık ve ağırbaşlı, ama yer yer kara mizah içerir (Malebranche hendeği gibi). Dante de bu tonu kullanır. Bölüm 1'de mizah neredeyse yoktur.

### 1.6 Yapı: üç kitap, bölümler, kantolar

Oyun şiirin kendi yapısını izler: üç kitap (canticle) ve her kitapta kantolar. Oynanabilir kitapta kantolar **bölümlere** (chapter) toplanır. Her kanto sahnelere, her sahne vuruşlara ayrılır (Senaryo İncili §2.4). İlk bölüm Inferno'nun Kanto I–V'idir. Bu belgede "bölüm" yalnızca bu anlamda kullanılır; oynanış alanlarına "alan" denir, belgenin kendi kısımlarına § ile atıf yapılır.

| Kitap | Alt başlık | Hareket yönü | Görsel palet | Oynanış odağı |
|---|---|---|---|---|
| **Inferno** | *The Descent* | Aşağıya, içe doğru | Kızıl, is karası, kükürt sarısı | Karşılaşmalar ve seçimler, kaçış, bekçiler |
| **Purgatorio** | *The Ascent* | Yukarıya, dağa | Şafak pembesi, deniz mavisi, yeşil | Platform, arınma, dua, yetenek kazanımı |
| **Paradiso** | *The Light* | Göğe, ışığa | Beyaz, altın, gök mavisi | Uçuş, ışık bulmacaları, ritim |

**Birinci öncelik Inferno'dur.** Purgatorio ve Paradiso bu belgede yalnızca taslak olarak yer alıyor (§5 ve §6). Inferno'nun Bölüm 1'den sonraki kısmının bölümlere nasıl ayrılacağı henüz kesin değil (§12, soru 6).

---

## 2. Temel Oynanış

### 2.1 Ana döngü

İki iç içe döngü vardır. **Kanto döngüsü** kitabın ritmidir:

```
Açılış sayfası → Oku ve yürü → Konuş, söz topla → Seç (iç tepki) → "What Dante did" kartı
      ↑                                                                     ↓
Sonraki kanto  ←  Kolofon ("In this canto")  ←  Bekçiyi ve çemberin mekaniğini geç
```

Sıra kantoya göre değişir. Örneğin Kanto V'te bekçi (Minos) büyük konuşmadan önce gelir.

**Çember döngüsü** oynanışın ritmidir:

```
Keşfet  →  Bir ruhla konuş / söz ve Codex topla  →  Çemberin mekaniğini öğren
   ↑                                                          ↓
Bir sonraki çembere in  ←  Bekçiyi geç (boss / set-piece)  ←  Mekaniği ustalaşarak kullan
```

### 2.2 Kontroller (klavye ve gamepad)

| Eylem | Klavye | Gamepad | Açıklama |
|---|---|---|---|
| Hareket | WASD / Ok tuşları | Sol çubuk / D-pad | 8 yönlü hareket |
| Atılma (Dash) | Shift / Space | A | Kısa süre dokunulmazlık sağlar. Kısa bir bekleme süresi vardır. |
| Tercet (Verse) | J / Sol tık | X | Hazırlanan terceti ya da zinciri okur. Etkisini ortadaki sözün kategorisi belirler: iter ve sersemletir, korur, iyileştirir, yol gösterir, tehlikeyi durdurur ya da hız verir (§3.4). *Grace harcar.* |
| Konuş / Etkileşim | E | Y | Ruhlarla konuşmak, nesne kullanmak, dizede parlayan sözü almak |
| İlerlet / Sayfa çevir | E / Enter (kontrol kilitliyken Space de) | A / Y | Metni ilerletir, kitabın sayfasını çevirir |
| Seçenek | 1 / 2 / 3 ya da tıklama | D-pad + A | Kitabın kenar boşluğundaki seçenekler. Süre sınırı yoktur. |
| Vergilius'a sor | Q | LB | O ana özel bir ipucu. Ekranda bir dize balonu varsa, o dizenin sade açıklaması (GLOSS). |
| Geriye bak / Gözünü kapat | R (basılı tut) | RB (basılı tut) | Kanto I'de dönüp ormana bakmak; Dis Kapıları'nda Medusa'ya karşı gözleri kapatmak (§4.6) |
| Kitap (The Book) | Tab / Esc | Select / Start | Duraklatma menüsü ve okuma kipi: kantolar, sözler ve tercet kurma, Codex, anılar, harita (§9.4) |

Tercetler Kitap'ın Words sekmesinde kurulur ve J tuşuna hazırlanır. Menülerde geri dönmek için Esc / Backspace (gamepad: B) kullanılır. Kontroller ayarlardan değiştirilebilir. Mobil dokunmatik destek ilk sürümde yoktur, sonraya bırakıldı (§12, soru 5).

### 2.3 Kaynaklar

- **Resolve (Kararlılık):** Dante'nin canı. İblisler, tehlikeler ve **korku** bu değeri azaltır. Korku bölgeleri (Kanto I'in ormanı gibi) onu yavaş yavaş eritir; Dante "Fear" yükünü taşıdığı sürece korku onu daha hızlı eritir (§3.4). Sıfıra düşerse Dante bayılır. *Şiirde de Dante birkaç kez bayılır.* Oyuncu son kontrol noktasında, Vergilius'un yanında uyanır. Mend tercetleri Resolve'u onarır.
- **Grace (Lütuf):** Tercetlerin kaynağıdır; okunan her tercet Grace harcar. Ruhlarla konuştukça ve söz topladıkça dolar. Böylece oyuncu dinlemeye ve okumaya teşvik edilir. Üst sınırı Limbo'da artar (§4.2). Bedeli ve dolum hızı sistem tasarımında ayarlanır (§12, soru 8).
- **Sözler (Words):** Şiirden toplanan kelimelerdir. Harcanmazlar; tercetler onlardan kurulur (§3.4).
- **Codex kayıtları:** Ruhlar, yerler ve kavramlar. Her kayıt bir Longfellow alıntısı ve kısa bir açıklama içerir. Tamamlayıcı içerik olarak tasarlanmıştır, oyunu bitirmek için gerekli değildir.
- **Anılar (Memories):** Oyuncunun yaşayanlar arasına taşımayı seçtiği adlar ve öyküler (§3.5).

Senaryodaki kaynak etkileri birimle yazılır: 1 birim, çubuğun başlangıç uzunluğunun %10'udur. Senaryolu bir etki Dante'yi bayıltmaz; Bölüm 1'deki bayılmalar omurgadadır, Kanto III ve V'in sonunda (Senaryo İncili §2.10).

### 2.4 Kontrol noktaları ve bayılma

- Her çemberde 2–4 kontrol noktası bulunur. Görsel olarak Vergilius'un beklediği bir taş bank şeklindedir.
- Bayılmanın cezası azdır. Oyuncu sadece konum kaybeder. Amaç, keşfin, okumanın ve hikâyenin cezalandırılmamasıdır.
- Vergilius'a güveni yüksek (Faithful) oyuncunun Resolve'u Vergilius'un yanındayken sıfıra inecek olursa, Vergilius her çemberde bir kez Dante'yi tutar ve bayılmayı önler (öneri; §3.7).
- Şiirdeki bayılmalar (Kanto III ve V'in sonu) başarısızlık değildir. Omurgadadırlar ve kantoyu kapatırlar (§9.2).

### 2.5 Vergilius (yol arkadaşı)

- Oyuncuyu takip eder. Saldırıya uğramaz, oyuncu onu korumak zorunda kalmaz. Araf'ın sonuna kadar Dante'nin yanındadır ve onu hiçbir durumda terk etmez.
- **Ses:** Sakin, kısa ve sıcak; bir öğretmenin sabrı. Ders vermez, alegori açıklamaz, Dante'nin seçimlerini yargılamaz. Mizahı çok seyrek ve kurudur.
- **Anahtar anlar:** Bazı bekçiler yalnızca Vergilius'un sözüyle geçilebilir. Vergilius bekçilere her zaman Longfellow'un dizesiyle konuşur. Kharon'a ve Minos'a aynı formülü söyler:

  > And unto him the Guide: "Vex thee not, Charon; / It is so willed there where is power to do / That which is willed; and farther question not." (Inferno III, 94–96)

  Longfellow formülün son dizesini Kanto V'te başka biçimde çevirmiştir: *That which is willed; and ask no further question."* (Inferno V, 24). Bu yüzden formül her seferinde kendi kantosundan kopyalanır. Plutus'a ise başka bir söz söyler: *Thus is it willed on high, where Michael wrought* (Inferno VII, 11). Oyunda bu anlar kısa sinematik sahnelerdir.
- **Q tuşu:** O odaya özel bir ipucu ya da kısa bir bilgi verir. Her ipucu bir kez tam oynatılır, sonra kısaltılmış haliyle tekrarlanır. Ekranda bir dize balonu açıksa Q, o dizenin sade açıklamasını (GLOSS) kenarda açar.
- **Güven:** Vergilius'un ne kadar yakın yürüdüğü ve ipuçlarının ne kadar zengin olduğu, Dante'nin ona güvenine bağlıdır (§3.7).

---

## 3. Anlatı ve Oyuncu Katkısı Sistemleri

Oyuncu hikâyeye katkıda bulunur, ama omurgayı kırmadan (§1.3). Bu kısım o katkıyı taşıyan sistemleri özetler. Kesin kurallar, sayılar, etki dilbilgisi ve Bölüm 1'in tam envanteri Senaryo İncili §2–§4'tedir. Bu bölümdeki bütün sayılar oradan alınmıştır.

### 3.1 Genel bakış

| Sistem | Öncelik | Oyuncu ne yapar | Ne değişir | İlk kez | Senaryo İncili |
|---|---|---|---|---|---|
| Acıma ve Adalet (Kalp) | Çekirdek | Önemli karşılaşmalarda Dante'nin tepkisini seçer | Terazi; Araf terasları; Beatrice'in sözleri | Kanto III (boş terazi), IV, V | §3.1 |
| Terza Rima tercetleri | Çekirdek | Şiirden söz toplar, tercet ve zincir kurar | Yetenekler; *Your Comedy* | Kanto I (sözler), II (ilk tercet), IV (zincir) | §3.4 |
| Anma | İkincil | Anılmak isteyen ruhların adlarını ve öykülerini taşır | Anılar; Araf'ta dualar | Kanto IV (sekme), V (ilk anı) | §3.5 |
| Erdemler | İkincil | Seçimleriyle ve bekçileri nasıl geçtiğiyle erdem kazanır | Pasif yetenekler; Araf'taki dört yıldız | Kanto I | §3.6 |
| Çevreyi kullanmak | Ek | Cezanın ortamını bekçilere karşı kullanır | Bekçi geçişleri; erdemler | Kanto VI (Kerberos) | §3.6 |
| Minos'un mahkemesi | Ek | Bir ruhun hangi çembere gideceğini tahmin eder | Adalet erdemi; harita | Kanto V | §7.5 |
| Vergilius'un güveni | Ek | Öğüdüne uyar ya da kendi yolundan gider | Vergilius'un mesafesi, ipuçları, vedası | Kanto I (I 67) | §3.3 |

### 3.2 Seçimler: ortak kurallar

- **Seçim anı:** Kitabın kenar boşluğu açılır ve 2–3 seçenek gösterir. Süre sınırı yoktur. Seçenek metninde sayı ya da sistem terimi (Pity, Justice, Trust, Virtue …) geçmez. Seçenek ya kısa bir eylemdir ya da Dante'nin söyleyeceği bir cümledir.
- **Dürüst seçenekler:** Her seçenek Dante'nin karakteri içinde kalır. Adalet zalimlik değildir; ilahî yargıyı kabul etmektir. Acıma aklamak değildir; acı çekenin yanında durmaktır. Hiçbir seçenek gülünç, kaba ya da açıkça "yanlış" yazılmaz. Zalim, alaycı ya da kayıtsız bir Dante yazılmaz.
- **Ağırlıklar:** `minor`, `major` ve `centre`. Kalbin dengesini en çok ±1, ±2 ve ±3 oynatırlar. `centre` her bölümde bir kez kullanılır; Bölüm 1'de yalnızca Francesca sahnesindedir.
- **Seçim bütçesi:** Her kantoda en az bir `major` (ya da `centre`) seçim, en çok üç diyalog seçimi ve en çok üç sistemik ölçüm bulunur. Bölüm 1'de 15 seçim vardır: 10 diyalog seçimi ve 5 sistemik ölçüm (Senaryo İncili §3.2).
- **Sistemik ölçüm:** Menü göstermez, oyuncunun nasıl oynadığını ölçer. Örneğin aslan kükrerken kıpırdamamak ya da Kharon'un önünde geri çekilmemek.
- **Kart:** Her diyalog seçiminden sonra bir "What Dante did" kartı gelir (§9.3).
- **İz:** Seçimler bayrak ve sayaç bırakır. Bunlar sonraki kantolarda, sonraki bölümlerde ve sonraki kitaplarda okunur (§3.8).

### 3.3 Acıma ve Adalet: Dante'nin Kalbi (çekirdek)

Önemli karşılaşmalarda oyuncu, Dante'nin acı çeken ruha nasıl karşılık verdiğini seçer:

- **Acıma (Pity):** dinlemek, teselli etmek, onunla birlikte yas tutmak.
- **Adalet (Justice):** yargılamak, hükmü kabul etmek, yüz çevirmek.

Şiir bu ikiliği kendisi kurar. Kararsızlar için Vergilius şöyle der: *Misericord and Justice both disdain them.* (Inferno III, 50). Dante iki yöne de gider. Şiirde ağzından çıkan ilk söz bir acıma yakarışıdır: *"Have pity on me," unto him I cried,* (Inferno I, 65). Francesca'nın öyküsünden sonra ona acıdığı için bayılır. Ama ileride Vergilius acımayı sert bir dille azarlar: *Here pity lives when it is wholly dead;* (Inferno XX, 28).

**Model**

- İki sayaç vardır: `pity` ve `justice`. Oyunun başında 0'dırlar ve yalnızca artarlar. Hissedilen hissedilmiştir.
- Her artış bir günah etiketi taşır (`pity+2@limbo`) ve o günahın defterine de yazılır. Araf'taki sonuçlar bu deftere dayanır.
- Denge: `heart = pity − justice`. Ekranda tek bir terazi vardır: kefeler sayaçları, kirişin eğimi dengeyi gösterir. Sayı hiçbir yerde yazmaz.
- **Neden iki sayaç?** Kararsızların terazisi boştur (0/0). Tek bir eksende 5 acıma ile 5 adalet de 0 eder ve hiç seçim yapmamış oyuncuyla aynı görünür. İki sayaç "boş terazi"yi "dengeli ama dolu terazi"den ayırır.

**Bölüm 1'de terazi**

| Kanto | An | Ağırlık | Acıma | Adalet |
|---|---|---|---|---|
| I–II | Karşılaşılan ruh yoktur, terazi yoktur | — | — | — |
| III | Terazi III 50 ile açılır ve boş kalır: Kararsızlar ne acımayı ne adaleti hak eder | — | — | — |
| IV | `inf04.c1`: Vergilius'un kendi yeri | major | `pity+2@limbo` | `justice+2@limbo` |
| V | `inf05.c3`: Vergilius'un sorusu | minor | `pity+1@lust` | `justice+1@lust` |
| V | `inf05.c4`: Francesca'nın öyküsünden sonra hüküm | centre | `pity+3@lust` | `justice+3@lust` |

Bölüm 1 sonunda her sayaç en çok 6'dır; denge −6 ile +6 arasındadır. Tek bir oynanış yolunda bir kantonun kalbe yazdığı toplam en çok 3'tür, bölümün merkez kantosunda (V) en çok 4. Bölüm sonunda motor üç bayraktan birini kaldırır: `ch1.heart_tender` (denge ≥ 3), `ch1.heart_stern` (denge ≤ −3) ya da `ch1.heart_even`.

**Inferno boyunca öngörülen kalp anları (taslak).** Seçimler ve etiketler o kantolar yazılırken kesinleşir. Etiketi henüz olmayan karşılaşmalara etiketi baş yazar ekler (Senaryo İncili §3.1, §3.8).

| Kanto | Karşılaşma | Şiirdeki Dante | Etiket |
|---|---|---|---|
| VI | Ciacco | Onun acısına ağlamaklı olur (VI 58–59) | `gluttony` |
| VIII | Filippo Argenti | Sert davranır; Vergilius bu sertliği över (VIII 37–45) | `wrath` |
| XIII | Pier delle Vigne | Acıdan konuşamaz (XIII 82–84) | — |
| XV | Brunetto Latini | Derin bir saygı ve minnet duyar (XV 79–87) | `sodomy` |
| XX | Kâhinler | Ağlar; Vergilius onu azarlar (XX 25–30) | — |
| XXXIII | Fra Alberigo | Ona verdiği sözü tutmaz, gözlerindeki buzu açmaz (XXXIII 115–117, 148–150) | — |

**Sonuçlar.** Kalp sonraki kitaplarda görünür olur (§3.8, §5). Dante'nin en çok acıdığı günahın Araf terası zorlaşır: Francesca'ya (ve Brunetto'ya) çok acıyan oyuncu için Şehvet Terası'ndaki ateş duvarı uzar. Beatrice'in Araf'taki sitemi kalbin dengesine göre üç biçimde gelir: gözyaşı, katılık ya da denge.

### 3.4 Terza Rima: sözler ve tercetler (çekirdek)

Terza rima Dante'nin buluşudur: üç dizelik kıtalar ve *aba bcb cdc* diye zincirlenen kafiyeler. Oyunda Dante'nin gücü bu biçimden gelir. Oyuncu ruhların ve şiirin dizelerinden **sözler** toplar, onlarla üç sözlük **tercetler** kurar. Her tercet bir yetenektir; kafiye zinciri tercetleri birbirine bağlar. Oyunun sonunda Kitap, oyuncunun kendi Komedya'sı gibi okunur. (Bu belgede "söz" (Word) şiirden toplanan kelimedir, "tercet" (Verse) üç sözden kurulan yetenektir.)

**Söz.** Şiirden toplanan tek bir İngilizce kelimedir. Her sözün bir adı (`Love`), bir kafiye ailesi (`-ove`), bir kategorisi, bir köken dizesi (Longfellow, atıflı) ve en çok 12 kelimelik bir arayüz açıklaması vardır.

- Söz, köken dizesinin **son kelimesidir**, yani kafiye yerindedir. Bölüm 1'de yalnızca Wall'un dizesi kelimenin çoğuluyla ("walls") biter.
- Söz okunarak toplanır: köken dizesi ekrandayken kelime parlar ve oyuncu E ile onu alır. Söz alınmadan dize kapanmaz, bu yüzden ilerleme için gereken sözler kaçırılamaz.
- Her söz oyunda tektir. Bir kanto 2–4 yeni söz verir; en çok biri koşulludur. Söz tablosunu yalnızca baş yazar günceller.
- **Yük (Burden)** sözü kendiliğinden yapışır ve tercette kullanılamaz. **Mühürlü** söz Kitap'ta görünür ama tercette kullanılamaz.

**Tercet.** Üç yuvadır: **A · B · A**. Dış yuvalardaki iki söz aynı kafiye ailesindendir ve birbirinden farklıdır. Ortadaki söz başka bir ailedendir. Tercetin etkisini **ortadaki** sözün kategorisi belirler; ortadaki söz "tercetin kalbi"dir. Dış sözlerden ortadakiyle aynı kategoride olan her biri etkiyi bir kademe güçlendirir.

| Kategori | Etkisi | Bölüm 1 sözleri |
|---|---|---|
| **Force** | İter ve sersemletir (v0.1'deki "Verse") | Love, Fire, Judgment |
| **Ward** | Darbeyi savuşturur, kısa süreli kalkan | Away, Wall |
| **Mend** | Resolve'u onarır, korkuyu yatıştırır | Hope, Pity |
| **Reveal** | Karanlığı aydınlatır, gizli yolu gösterir | Way, Light |
| **Still** | Yakındaki tehlikeleri yavaşlatır ya da durdurur, rüzgârı dindirir | Stay, Peace |
| **Swift** | Uzun atılma; kalabalıkta ve rüzgârda hız | Go, Desire |
| **Burden** | Kullanılamaz. Taşındığı sürece korku Resolve'u daha hızlı azaltır. | Fear |

**Zincir ve koda.** Bir sonraki tercetin dış sözleri önceki tercetin ortasındaki sözle kafiyeliyse tercetler bir **zincir** olur. Bu, Dante'nin *aba bcb cdc* örgüsüdür. Zincir tercetleri tek bir dizi hâlinde ve artan bir bonusla oynatır; bir zincirde hiçbir söz iki kez geçmez. Şiirde her kanto tek bir dizeyle biter. Oyuncu da bir terceti ya da zinciri, son tercetin ortasındaki sözle kafiyeli tek bir sözle kapatabilir: bu **koda**, kendi kategorisinin güçlendirilmiş bir kapanışını tetikler. Zincir ve koda Kanto IV'te, Dante dört büyük şairin arasındayken açılır. Bölüm 1'de bir zincir en çok iki tercettir.

**Bölüm 1'in sözleri.** 14 söz vardır; biri yük (Fear), biri koşulludur (Judgment).

| Kanto | Sözler |
|---|---|
| I | Fear (yük), Way, Hope, Love |
| II | Go, Away |
| III | Stay, Desire |
| IV | Fire, Light, Wall |
| V | Peace, Judgment (yalnızca hükümde yüz çeviren oyuncuya), Pity (kolofonda, herkese) |

Kanto I'de henüz tercet yoktur; kaçış atılmayla olur. İlk tercet Kanto II'nin sonunda kurulur: **Way · Love · Away** (Force). Atılan ilk tercet yamaçtaki bir taşı yuvarlar ve iniş yolunu açar. Düşman yoktur (§4.0).

**Okunuş.** Kitap her terceti sözlerin köken dizeleriyle gösterir. Sözler kafiye yerinde durduğu için tercet gerçekten kafiyeli okunur ve baştan sona Longfellow'dur. Bölüm 1'in sonunda kurulabilen iki tercetlik bir zincir (Fire · Way · Desire / Away · Love · Stay) Kitap'ta şöyle okunur:

```text
This side the summit, when I saw a fire (Inferno IV, 68)
In which I had abandoned the true way. (Inferno I, 12)
So that their fear is turned into desire. (Inferno III, 126)
Weeping, her shining eyes she turned away; (Inferno II, 116)
Avail me the long study and great love (Inferno I, 83)
To thee, as soon as we our footsteps stay (Inferno III, 77)
```

Kafiye düzeni: fire / way / desire · away / love / stay, yani *aba bcb*. Oyunun sonunda **Your Comedy** sayfası bütün tercetleri sırayla ve seçimlerin kenar notlarıyla gösterir; içinde tek bir sahte Dante dizesi yoktur.

Sayısal değerler (Grace bedeli, süreler, güç, zincir bonusu) sistem tasarımında ayarlanır. Söz tablosu, kafiye aileleri ve kurallar: Senaryo İncili §3.4.

### 3.5 Anma (ikincil)

Cehennem'deki bazı ruhlar yaşayanlar arasında anılmak ister. Şiirde bunu açıkça isteyenler vardır. İlki Ciacco'dur:

> But when thou art again in the sweet world, / I pray thee to the mind of others bring me; (Inferno VI, 88–89)

Pier delle Vigne (XIII 76–78) ve Brunetto Latini (XV 119–120) de aynı şeyi ister. Oyuncu bu ruhların adlarını ve öykülerini toplar ve Kitap'taki **Remembrance** sekmesinde taşır.

- **İki tür anı vardır.** `asked`: Ruh şiirde anılmak ister. Bu bir seçim olarak sunulur ve reddetmek de geçerli bir seçimdir. `kept`: Ruh anılmayı istemez, ama şiir onun duyulmak istediğini gösterir; oyuncu öyküyü taşımayı seçebilir.
- **Anı yalnızca şiirin gösterdiği yerde sunulur.** Kararsızlar asla anılamaz: *No fame of them the world permits to be;* (Inferno III, 49). Açgözlüler ve savurganlar da anılamaz, çünkü şiir onları tanınmaz kılar (VII 52–54). Limbo'nun büyükleri ise zaten anılıyor (IV 76–78). Anma sekmesi Limbo'da "Remembered by the world" listesiyle açılır: Homer, Horace, Ovid, Lucan, Virgil.
- **Lanetlilerin anısı dua değildir.** Cehennem'de dua işlemez.
- **Bölüm 1'de tek anı vardır:** Paolo ve Francesca (`kept`). Yalnızca hükümde onlarla ağlayan oyuncu bu anıyı taşır. Francesca'nın şu dizesi duyulmak istediğini gösterir: *Of what it pleases thee to hear and speak,* (Inferno V, 94). İlk `asked` anı Kanto VI'da, Ciacco'nunkidir.
- **Araf'ta anma duaya dönüşür.** Bekleyen ruhlar (Manfred, Belacqua, Pia …) yaşayanların duasını ister. Oyuncunun duaları yardım, kestirme yol ya da yetenek açar (taslak; §5). Manfred bunun nedenini söyler: *For those on earth can much advance us here."* (Purgatorio III, 145). Pia ise yalnızca hatırlanmak ister: *"Do thou remember me who am the Pia;* (Purgatorio V, 133). Araf'ın dua kaydı, Cehennem'in anılarından ayrı bir kayıt türüdür.

### 3.6 Erdemler (ikincil)

Cehennem'de dört kardinal erdem büyür: **Prudence** (sağduyu), **Justice** (adalet), **Fortitude** (yiğitlik) ve **Temperance** (ölçülülük). Her biri bir sayaçtır; yalnızca artar ve her seferinde +1 büyür.

- **İki kaynağı vardır:** diyalog seçimleri ve bekçilerin **nasıl** geçildiği. Her bekçi karşılaşması bir sistemik ölçüm taşır. Cezanın ortamını bekçiye karşı kullanmak da bu ölçümün parçasıdır (§3.7).
- **Kalpteki adalet ile erdem olan adalet farklıdır.** Kalp, ruhlara verilen tepkidir. Erdem olan adalet, herkese hakkını vermektir: onur, doğruluk, doğru hüküm.

| Erdem | Ne büyütür | Bölüm 1'den örnek | Pasif (taslak) |
|---|---|---|---|
| **Prudence** | Sınırını tanımak, doğru soruyu sormak, öğüt almak | Dişi kurttan sonra aşağıdaki gölgeye dönmek | Vergilius'un ipuçları zenginleşir |
| **Justice** | Onuru hak edene vermek, doğru hüküm | Altıncı şair onurunu Vergilius'a vermek; Minos'un mahkemesinde doğru tahmin | Force tercetlerinin sersemletmesi uzar |
| **Fortitude** | Korkuya karşı durmak | Aslan kükrerken kıpırdamamak; kapıda korkuyu bırakmak; Kharon'un önünde geri çekilmemek | Korkunun Resolve'a etkisi azalır |
| **Temperance** | Sabır, alçakgönüllülük, kendini tutmak | Parsın önünde şafağı beklemek | Yürürken Grace yavaşça dolar |

- **Kademeler (taslak):** 2, 5 ve 9 puanda birer kademe.
- **Araf bağlantısı:** Araf'ın kıyısında Dante dört yıldız görür. Oyunda bu yıldızların parlaklığı dört erdemin kademesini gösterir.

  > To the right hand I turned, and fixed my mind / Upon the other pole, and saw four stars / Ne'er seen before save by the primal people. (Purgatorio I, 22–24)

- **İlahî erdemler** (Faith, Hope, Charity) Cehennem'de yoktur; Araf'ta ve Cennet'te gelir. Araf'ta yedi P silindikçe erdem ağacının ikinci dalı açılır. Cennet'te Dante'nin inanç, umut ve sevgi üzerine sınandığı kantolar (Cennet XXIV–XXVI) ağacın doruğudur (taslak). Bölüm 1'deki `Hope` sözü, ilahî erdem olan umut değildir.

### 3.7 Ek sistemler: çevre, Minos'un mahkemesi, Vergilius'un güveni

**Çevreyi bekçilere karşı kullanmak.** Cezanın ortamı yalnızca bir engel değil, bir araçtır. Dante bekçileri öldürmez; ortamı onlara karşı kullanarak onları atlatır, oyalar ya da susturur. Bekçinin nasıl geçildiği erdemlere yazılır (§3.6).

| Bekçi | Çevrenin kullanımı | Şiirdeki dayanak |
|---|---|---|
| Kerberos (VI) | Yerdeki toprak topakları havlayan ağızlara atılır | Vergilius'un yaptığı budur (VI 25–27) |
| Minotauros (XII) | Öfkesi kışkırtılır; sendeleyip kendi etrafında dönerken yanından geçilir | XII 16–27 |
| Malebranche (XXII) | İblisler birbirine düşürülür; kavga edip kaynayan katrana düşerler | XXII 133–141 |

**Minos'un mahkemesi.** Kanto V'te isteğe bağlı bir mini oyun; şiire bir eklemedir. Şiir Minos'un yargısını şöyle anlatır:

> Girds himself with his tail as many times / As grades he wishes it should be thrust down. (Inferno V, 11–12)

Üç adsız ruh suçunu itiraf eder. İtiraflar bizim yazdığımız modern ve adsız cümlelerdir. Oyuncu Minos'un kuyruğunu kaç kez dolayacağını (2–9) tahmin eder. Üç tahminden en az ikisi doğruysa adalet erdemi +1 büyür. Mini oyun oynandığında, sonuç ne olursa olsun, Kitap'ın haritasına Cehennem'in kesitinden ilk sayfa eklenir. Minos oyunda konuşmaz, kuyruğu konuşur.

**Vergilius'un güveni.** Oyuncu Vergilius'un öğüdüne uyabilir ya da kendi yolundan gidebilir.

- `trust` 0–10 arasındadır. Vergilius'un ilk sözüyle (I 67) 4 olarak başlar.
- **+1:** Açık öğüdüne uymak, bir bekçinin karşısında sözü ona bırakmak, onuru ona vermek. **−1:** Açık öğüdüne karşı gitmek. Karşı gitmek de oyuncuya bir şey kazandırır: bir deneyim, bir bilgi. Güven kaybı ceza değil, ilişkinin rengidir. Bir kantoda net değişim en çok ±2'dir.
- **Eşikler:** `trust ≥ 7` **Faithful**, `trust ≤ 2` **Wayward**. Motor bunları bölüm sonunda kaydeder (`ch1.trust_faithful`, `ch1.trust_wayward`).
- **Etkiler (öneri):** Faithful oyuncunun Resolve'u Vergilius'un yanındayken sıfıra inecek olursa, Vergilius her çemberde bir kez Dante'yi tutar; ipuçlarına da bir satır eklenir. Wayward oyuncunun ipuçları tek ve kısa bir satırdır; Vergilius bir adım önde yürür ve daha az bekler. Vergilius hiçbir durumda Dante'yi terk etmez ve güven ilerlemeyi kilitlemez.
- **Gösterim:** Sayı yoktur. Güven, Vergilius'un yürüme mesafesinden, duruşundan ve Kitap'taki kenar notlarından okunur.
- Bölüm 1'de güven 3'ün altına inmez ve bölüm 4 ile 10 arasında biter; Wayward eşiği sonraki bölümler içindir. Minos'un uyarısı güveni doğrudan sınar: *"Look how thou enterest, and in whom thou trustest;* (Inferno V, 19)

### 3.8 Sonraki kitaplara taşınanlar (taslak)

Bölüm 1'in bıraktığı izlerin Araf ve Cennet'teki karşılıkları. Seçmeler aşağıdadır; tam liste Senaryo İncili §3.8'dedir. Bu bağlar Araf ve Cennet tasarlanırken kesinleşir, ama bayrak ve sayaç adları değişmez.

| Inferno'daki iz | Nerede görünür | Ne olur |
|---|---|---|
| Şehvet terasına bağlı acıma (`pity@lust` + `pity@sodomy`) ≥3 / ≥5 / ≥7 | Araf XXVII, ateş duvarı | Duvar 1 / 2 / 3 bölüm uzar |
| En çok acınan günah (o terasın acıma toplamı ≥4) | İlgili Araf terası | "Ağır teras": teras zorlaşır |
| Kalbin dengesi ≥ +6 / ≤ −6 / arası | Araf XXX–XXXI, Beatrice'in sitemi | Üç çeşitleme: gözyaşı, katılık, denge |
| Cesareti Beatrice'in gözyaşlarından aldı (Kanto II) | Araf XXVII | Beatrice'in adı ilk söyleyişte işe yarar |
| Cesareti üç Hanım'dan aldı (Kanto II) | Araf IX | Dante Lucia'yı rüyasında tanır |
| Cesareti Vergilius'tan aldı ve güven ≥7 | Araf XXVII | Vergilius'un son sözünden önce fazladan bir veda konuşması |
| Kapıda bırakılan ve geri verilen umut | Araf XXX, Vergilius'un gidişi | Kitap'taki "Hope" kartı veda anında parlar |
| Gururlu seçimler (Kanto II ve IV) | Araf X–XII, kibir terası | Taşın ağırlığı artar |
| Paolo ve Francesca'nın anısı | Araf XXVI, Cennet IX | Fazladan bir konuşma |
| Limbo'ya acıma ya da adalet ≥2 | Cennet XIX–XX, Kartal ve Ripheus | Dante'nin sorusu ve onun çerçevesi |
| Erdem kademeleri | Araf I, dört yıldız | Yıldızların parlaklığı |
| Güven ≥7 / 3–6 / ≤2 | Araf XXX, Vergilius'un gidişi | Vedanın çeşitlemesi |

Vergilius'un Dante'ye son sözü şudur:

> Thee o'er thyself I therefore crown and mitre!" (Purgatorio XXVII, 142)

---

## 4. INFERNO — Kanto ve Çember Tasarımı

Her alan şu başlıklarla tanımlanmıştır: **Kantolar**, **Ortam**, **Contrapasso mekaniği**, **Karşılaşılan karakterler**, **Bekçi / Set-piece**. Bölüm 1'in kantolarında ayrıca **oyuncunun payı** (seçimler) ve **sözler** yazılıdır. Sahne listeleri, çapa dizeleri ve seçimlerin bağlayıcı blokları Senaryo İncili §7'dedir.

**Bölüm 1: Kanto I–V**

| Kanto | GDD | Başlık (oyunda) | Yer (HUD) | Süre (dk) | Ana seçim | Yeni sözler |
|---|---|---|---|---|---|---|
| I | §4.0 | The Dark Wood | The Dark Wood | 8–12 | Why Dante goes (`inf01.c4`) | Fear, Way, Hope, Love |
| II | §4.0 | The Evening of Doubt | The Dark Hillside | 6–9 | What gives Dante courage (`inf02.c2`) | Go, Away |
| III | §4.1 | The Gate | Ante-Inferno | 8–12 | What Dante leaves at the gate (`inf03.c1`) | Stay, Desire |
| IV | §4.2 | Limbo | Limbo | 10–14 | Virgil's own place (`inf04.c1`) | Fire, Light, Wall |
| V | §4.3 | The Infernal Hurricane | The Second Circle | 12–16 | The verdict (`inf05.c4`, centre) | Peace, Judgment, Pity |

Bölüm 1 okuma dahil 44–63 dakikadır ve Kanto V'in kolofonunda biter: ertelenmiş kartlar açılır, ardından bölüm özeti ve *Your Comedy* önizlemesi gelir.

### 4.0 Prolog — The Dark Wood (Kanto I–II)

- **Ortam:** Gece, sisli ve sık bir orman. Uzakta güneşle aydınlanan bir tepe görünür. Görüş dardır; korku bölgeleri Resolve'u yavaşça eritir.
- **Amaç:** Öğretici kantolar. Oyuncu hareketi, atılmayı, konuşmayı, Vergilius'u takip etmeyi ve şiirden söz toplamayı öğrenir. Words sekmesi Kanto I'de, Kitap'ın tamamı Kanto I'in sonunda açılır.
- **Set-piece:** Dante tepeye tırmanmaya çalışırken **pars** (oyunda Longfellow'daki gibi *panther*; I 32), **aslan** ve **dişi kurt** sırayla yolunu keser. Bu bir kaçış sekansıdır. Hayvanlar öldürülmez ve zarar görmez. Kanto I'de henüz tercet yoktur, kaçış atılmayla olur. Her hayvan bir sistemik ölçüm taşır: şafağı beklemek (Temperance), kükremede kıpırdamamak (Fortitude), aşağıdaki gölgeye dönmek (Prudence).
- **Dişi kurt geçilemez.** Dante'yi adım adım geri iter. Bu bir başarısızlık gibi sunulmaz, yolun değiştiği andır:

  > E'en such made me that beast withouten peace, / Which, coming on against me by degrees / Thrust me back thither where the sun is silent. (Inferno I, 58–60)

  Tam o anda **Vergilius** belirir. Dante'nin ona ilk sözü bir acıma yakarışıdır (I 65–66). Bu bir seçim değil, omurgadır.
- **Oyuncunun payı (Kanto I):** Yolculuğun nedeni (`inf01.c4`, major): bu sefaletten kaçmak, Aziz Petrus'un kapısını görmek ya da Vergilius'un sözünü ettiği ruhları görmek. Şiirdeki Dante üçünü birden ister (I 130–135). Seçim, sonraki kantolarda ve Araf'ta okunan bir bayrak bırakır.
- **Kanto II — Kuşku akşamı:** Akşam olur ve Dante kuşkuya düşer: ne Aeneas'tır ne Pavlus. Kuşkusunu nasıl dile getirdiğini oyuncu seçer (`inf02.c1`). Vergilius neden geldiğini anlatır; anlatı resimli kitap sayfaları olarak okunur. Cennet'teki soylu Hanım (Meryem) Dante'ye acır ve Lucia'yı gönderir. Lucia, Rahel'in yanında oturan Beatrice'e koşar. Beatrice Limbo'ya iner ve Vergilius'tan Dante'yi kurtarmasını ister:

  > Beatrice am I, who do bid thee go; / I come from there, where I would fain return; / Love moved me, which compelleth me to speak. (Inferno II, 70–72)

  Beatrice ve Lucia yalnızca Longfellow konuşur. Meryem yüzüyle gösterilmez, yalnızca ışık olarak görünür. Dante'nin cesaretini ne geri getirir (`inf02.c2`, major): Beatrice'in gözyaşları, Vergilius'un sözü ya da üç Hanım.
- **İlk tercet:** Kanto II'nin sonunda Vergilius ilk terceti öğretir: **Way · Love · Away**. Atılan ilk tercet yamaçtaki bir taşı yuvarlar ve iniş yolunu açar (§3.4).
- **Öğretilenler:** Hareket, atılma, konuşma, takip, söz toplama, tercet kurma ve atma.
- **Sözler:** Fear (yük), Way, Hope, Love (I); Go, Away (II).

### 4.1 Cehennem Kapısı ve Ante-Inferno (Kanto III)

- **Ortam:** Cehennem'in kapısı ve yazısı. Yazı oyunda yalnızca Longfellow'un dizeleriyle görünür. Açılış sayfasında başlar, kapının taşında sürer:

  > "Through me the way is to the city dolent; / Through me the way is to eternal dole; / Through me the way among the people lost. (Inferno III, 1–3)

  Yazının son dizesi: *All hope abandon, ye who enter in!"* (Inferno III, 9). Kapının ardında yıldızsız ve karanlık bir ova uzanır.
- **Oyuncunun payı — kapıda ne bırakılır** (`inf03.c1`, major): Yazı umudu bırakmayı ister, Vergilius korkuyu. Korkusunu bırakan oyuncu "Fear" yükünden kurtulur (Fortitude, güven +1). Umudunu bırakan oyuncunun "Hope" sözü mühürlenir; Vergilius onu Limbo'da geri verir (§4.2). Şiirdeki Dante umudunu bırakmaz: yazının sözlerini ağır bulur, Vergilius da ona kuşkuyu ve korkaklığı orada bırakmasını söyler (III 12–15).
- **Contrapasso:** Hayatta hiçbir taraf seçmemiş **Kararsızlar**, hiç durmadan dönen bir bayrağın peşinden koşar ve at sinekleriyle eşek arılarının sokmasına maruz kalır (III 64–66).
- **Mekanik:** Haritada dolaşan **arı sürüleri** vardır. Bayrağı takip eden kalabalık sürekli yön değiştirir ve oyuncu bu kalabalığın arasından geçmek zorundadır.
- **Terazi burada açılır ve boş kalır.** Kararsızlar ne acımayı ne adaleti hak eder (III 50). Vergilius onlara bakıp geçmesini söyler: *Let us not speak of them, but look, and pass."* (Inferno III, 51). Oyuncu bu öğüde uyabilir ya da bir Kararsız'ı durdurup adını sorabilir (`inf03.c2`). Soran oyuncu cevap alamaz, arılar onu sokar ve Kitap'ta boş bir anı kartı belirip söner. Büyük reddin gölgesi gösterilir ama adı söylenmez.
- **Set-piece — Kharon ve Akheron:** Kıyıda ruhlar geçmek için toplanmıştır. Kharon gelir ve yaşayan Dante'yi taşımayı reddeder:

  > He said: "By other ways, by other ports / Thou to the shore shalt come, not here, for passage; / A lighter vessel needs must carry thee." (Inferno III, 91–93)

  Kharon'un çekil emri sırasında geri adım atmayan oyuncu ölçülür (Fortitude). Vergilius'un sözü Kharon'u susturur (§2.5). Kıyı kalabalığında Kharon'un kürek darbelerinden kaçınılır. Ruhlar güz yaprakları gibi kayığa dökülür.
- **Dante kayığa binmez.** v0.1'deki kayıkla geçiş ve nehirden uzanan eller kaldırıldı: şiirde Kharon Dante'yi taşımayı reddeder ve geçiş bayılmayla olur. Deprem, rüzgâr ve kızıl bir ışık gelir. Ekran kızıla, sonra siyaha döner ve kitap kapanır. Dante Kanto IV'te karşı kıyıda uyanır. Kayık sahnesi istenirse ancak bayılmanın içinde, rüya olarak ve şiirden sapma notuyla yapılabilir (§12, soru 9). Kantonun son dizesi:

  > And as a man whom sleep hath seized I fell. (Inferno III, 136)

- **Sözler:** Stay (III 77), Desire (III 126).

### 4.2 Birinci Çember — Limbo (Kanto IV)

- **Ortam:** Kanto bir uyanışla açılır:

  > Broke the deep lethargy within my head / A heavy thunder, so that I upstarted, / Like to a person who by force is wakened; (Inferno IV, 1–3)

  Yedi kapılı ve yedi surlu **Soylu Kale**. Yeşil bir çayırı vardır. Cehennem'in tek huzurlu yeri burasıdır. Kaleyi çevreleyen dereden katı zemindeymiş gibi geçilir (IV 109).
- **Contrapasso:** Burada işkence yoktur. Vaftiz edilmemiş erdemli ruhlar acı çekmeden ama umutsuz bir özlem içinde yaşar. Vergilius da onlardan biridir: *That without hope we live on in desire."* (Inferno IV, 42)
- **Mekanik:** **Savaş içermeyen bir merkez bölge.** Codex burada bütün sekmeleriyle açılır; daha önce toplanan kayıtlar burada görünür. Anma sekmesi de burada, "Remembered by the world" listesiyle açılır (§3.5).
- **Oyuncunun payı:**
  - **Vergilius'un kendi yeri** (`inf04.c1`, major): Onunla yas tutmak (acıma), Cennet'in yasasını kabul etmek (adalet) ya da şimdilik susup sorusunu sormak (Prudence). Şiirdeki Dante derin bir kedere kapılır (IV 43–45). Kapıda umudunu bırakan oyuncuya Vergilius umudunu burada geri verir ve "Fear" yükü söner. Kanto IV sonunda her oyuncu aynı durumdadır: Fear yoktur, Hope açıktır.
  - **Altıncı şair** (`inf04.c2`): Homeros, Horatius, Ovidius ve Lucanus, Dante'yi aralarına altıncı şair olarak kabul eder. Oyuncu onuru sevinçle kabul eder, başını eğip susar ya da onuru Vergilius'a verir. Şiirdeki Dante onuru açık bir gururla yazar: *So that the sixth was I, 'mid so much wit.* (Inferno IV, 102). Bu gurur Araf'ın kibir terasında karşısına çıkacaktır.
- **Zincir:** Dante tercet zincirini şairlerin arasında kendisi bulur; terza rima onun buluşudur (§3.4).
- **Sessizlik:** Şairlerin yoldaki konuşması yazılmaz, çünkü şiir de söylemez (IV 104).
- **Büyük ruhlar:** Aristoteles, Sokrates, Platon, İbn Sina, İbn Rüşd ve diğerleriyle konuşulabilir. Hepsi az ve yumuşak sesle konuşur: *They spake but seldom, and with gentle voices.* (Inferno IV, 114). Oyunda her figür tek balon konuşur ve bir kantoda en çok sekiz figür konuşur. Aeneas ve Selahaddin sessizdir. Şiir Aristoteles'in adını vermez, onu yalnızca şöyle anar: *The Master I beheld of those who know,* (Inferno IV, 131). Oyun içi adı Aristotle'dır; Codex bunu açıklar.
- **Ödül:** Grace kaynağının üst sınırı artar.
- **Sözler:** Fire (IV 68), Light (IV 103), Wall (IV 107).

### 4.3 İkinci Çember — Şehvet (Kanto V)

- **Bekçi:** **Minos.** Her ruhun cezasını, kuyruğunu vücuduna dolama sayısıyla belirler. Çemberin girişinde kısa bir sinematik vardır. İsteğe bağlı mini oyun: Minos'un mahkemesi (§3.7). Minos Dante'yi görünce onu uyarır. Oyuncu Vergilius'a bakar ya da Minos'a kendisi cevap verir (`inf05.c2`). Şiirde Vergilius cevap verir ve Minos'u aynı formülle susturur (V 21–24).
- **Contrapasso:** Hayattayken tutkularına kapılan ruhlar, durmak bilmeyen bir **kasırgada** savrulur:

  > The infernal hurricane that never rests / Hurtles the spirits onward in its rapine; / Whirling them round, and smiting, it molests them. (Inferno V, 31–33)

- **Mekanik:** **Rüzgâr akımları.** Ekranda görünen rüzgâr şeritleri oyuncuyu sürekli iter. Kayalıkların arkasında rüzgârdan korunulabilir. Atılma, rüzgâra karşı ilerlemenin tek yoludur. Still tercetleri (Peace) çevredeki rüzgârı dindirir, Swift tercetleri (Desire) rüzgârda hız verir. Francesca konuşurken rüzgâr gerçekten durur (V 96).
- **Karakterler:** Vergilius aşk yüzünden ölen ünlü gölgeleri gösterir: Semiramis, Dido, Kleopatra, Helen, Akhilleus, Paris, Tristan. Sürüler hâlinde geçerler; geçen bir gölgeye bakan oyuncu onun Codex kaydını açar. Ardından **Paolo ve Francesca** gelir. Bu, oyunun ilk büyük duygusal sahnesi ve Bölüm 1'in merkezidir. Francesca yalnızca Longfellow konuşur. Paolo hiç konuşmaz, yalnızca ağlar.

  > And she to me: "There is no greater sorrow / Than to be mindful of the happy time / In misery, and that thy Teacher knows. (Inferno V, 121–123)

- **Oyuncunun payı:** Vergilius'un sorusu (`inf05.c3`, minor) ve hüküm (`inf05.c4`, centre). Hükümde oyuncu onlarla ağlar (Paolo ve Francesca'nın anısı) ya da onlardan yüz çevirir ("Judgment" sözü). İki kart da kanto sonuna ertelenir; merkez sahne kartlarla bölünmez. Şiirdeki Dante onları yüksek sesle yargılamaz; onlara acıdığı için bayılır (V 139–141).
- **Son:** Francesca'nın öyküsünün sonunda Dante bayılır ve Bölüm 1 kapanır:

  > And fell, even as a dead body falls. (Inferno V, 142)

  Kolofonda "Pity" sözü herkese verilir (V 140). Yüz çeviren oyuncu bile şiirdeki Dante'nin onlara acıdığı için bayıldığını böylece öğrenir. Ardından bölüm özeti gelir. Dante bir sonraki çemberde, Kanto VI'da uyanır.
- **Sözler:** Peace (V 92), Judgment (V 14; yalnızca yüz çeviren oyuncuya), Pity (V 140; kolofonda).

### 4.4 Üçüncü Çember — Oburluk (Kanto VI)

- **Ortam:** Hiç durmayan soğuk ve pis bir yağmur, çamur.
- **Contrapasso:** Oburlar çamurun içinde yatar.
- **Mekanik:** **Çamur zemin** hareketi yavaşlatır. Yükseltilmiş taş yollar bulunur ve rotalar bunlara göre planlanır.
- **Karakter:** **Ciacco**, Floransa'nın geleceği hakkında kehanette bulunur. Oyunun ilk `asked` anısı onundur: yaşayanlar arasında anılmak ister (VI 88–89; §3.5). Kalp anı (taslak): şiirdeki Dante onun acısına ağlamaklı olur (VI 58–59).
- **Boss — Kerberos:** Üç başlı köpek. Şiirde Vergilius onun ağızlarına avuç avuç toprak atarak onu susturur (VI 25–27). **Oyunda:** Oyuncu yerden **toprak topakları** toplar ve havlamaya hazırlanan başın ağzına fırlatır. Üç baş farklı ritimlerle saldırır. Başlardan biri susturulduğunda diğer ikisi hızlanır. Bu, cezanın ortamını bekçiye karşı kullanmanın ilk örneğidir (§3.7).

### 4.5 Dördüncü Çember — Açgözlülük ve Savurganlık (Kanto VII)

- **Bekçi:** **Plutus.** Anlaşılmaz sözler söyler: *"Pape Satan, Pape Satan, Aleppe!"* (Inferno VII, 1). Vergilius tek bir sözle onu yere yıkar (§2.5).
- **Contrapasso:** İki grup ruh, göğüsleriyle dev ağırlıklar iterek yarım daire çizer. Karşılaştıklarında birbirlerine bağırırlar, sonra geri dönerler: *Crying, "Why keepest?" and, "Why squanderest thou?"* (Inferno VII, 30)
- **Mekanik:** **Yuvarlanan kaya şeritleri.** Ağırlıklar belirli şeritlerde ritmik olarak gidip gelir. Oyuncu doğru zamanlamayla aralarından geçer. Alanın sonunda bu ağırlıkları iterek bir yol açtığı bir bulmaca vardır.
- **Anma yok:** Bu ruhların hiçbiri tanınmaz (VII 52–54), bu yüzden bu çemberde anı sunulmaz (§3.5).

### 4.6 Beşinci Çember — Öfke ve Küskünlük (Kanto VII–IX)

- **Ortam:** **Styx bataklığı.** Uzakta Dis Şehri'nin kızıl kuleleri görünür.
- **Contrapasso:** Öfkeliler çamurun yüzeyinde birbirini parçalar. Küskünler ise çamurun dibinde boğuk bir şekilde mırıldanır ve onlardan yüzeye kabarcıklar yükselir.
- **Mekanik:** **Phlegyas'ın kayığında** ilerlenen bir sekans. Çamurdan kayığa tırmanmaya çalışan öfkeli ruhlar Force tercetleriyle itilir. Kabarcıkların çıktığı yerlere basılmaz.
- **Kalp anı — Filippo Argenti:** Kayığa tırmanmaya çalışan ruhlardan biridir. Şiirde Dante ona sert davranır ve Vergilius bu sertliği över (VIII 37–45). Bölüm 1'in tersine, burada şiirdeki tepki adalettir (taslak).
- **Set-piece — Dis'in Kapıları:** Düşmüş melekler kapıyı kapatır. Ardından **Erinyeler** ve **Medusa** gelir.
  - **"Gözünü kapat" mekaniği:** Medusa belirdiğinde Vergilius uyarır:

    > "Turn thyself round, and keep thine eyes close shut, / For if the Gorgon appear, and thou shouldst see it, / No more returning upward would there be." (Inferno IX, 55–57)

    Oyuncu **gözlerini kapatma** tuşunu basılı tutar. Ekran kararır ve oyuncu yalnızca sesle yön bulur; ses ipuçları görsel olarak da gösterilir (§9.6). Medusa'ya bakan oyuncu taşa döner ve bayılır. Şiirde Vergilius Dante'nin gözlerini kendi elleriyle de kapatır (IX 58–60). Güveni yüksek oyuncuya Vergilius'un elleri bir kez yardım eder (öneri).
  - Sonunda **Göksel Haberci** gelir ve kapıyı bir değnekle açar.

### 4.7 Altıncı Çember — Sapkınlar (Kanto IX–XI)

- **Ortam:** Dis'in içinde, uçsuz bucaksız bir mezarlık. Açık lahitlerden alevler yükselir.
- **Contrapasso:** Ruhun ölümsüzlüğünü inkâr edenler yanan mezarlara kapatılmıştır.
- **Mekanik:** **Alev desenleri.** Lahitler sırayla alev püskürtür. Oyuncu deseni öğrenerek ilerler. Bu, ritim ve zamanlama becerisi ister.
- **Karakterler:** **Farinata degli Uberti**, mezarından yarı beline kadar doğrularak konuşur. **Cavalcante** oğlunu sorar.

### 4.8 Yedinci Çember — Şiddet (Kanto XII–XVII)

Bu çember üç halkaya ayrılır. Her halka küçük bir alan gibi tasarlanmıştır.

- **Giriş bekçisi — Minotauros:** Yıkık bir kayalıkta oyuncuya saldırır. Vergilius onu kızdırır. Minotauros öfkeyle sendeleyip kendi etrafında döndüğü sırada oyuncu yanından atılarak geçer (XII 16–27). Bu bir **kaçış boss'udur**.
- **Halka 1 — Komşuya karşı şiddet:** **Phlegethon**, kaynayan kandan bir nehirdir. Kıyıda devriye gezen **Kentaurlar** ok atar. Atılarak saklanma noktaları arasında ilerlenir. Sonunda **Nessos** oyuncuyu sırtında nehrin sığ yerinden geçirir.
- **Halka 2 — Kendine karşı şiddet:** **İntiharlar Ormanı.** Ruhlar ağaca dönüşmüştür. Bir dal kırıldığında ağaç kanar ve konuşur (**Pier delle Vigne**): *Hast thou no spirit of pity whatsoever?* (Inferno XIII, 36). **Mekanik:** Etkileşimle bir dal kırıp ağacın sesini dinlemek, yolu açan ipucunu verir. Ama her kırık dal Resolve'dan küçük bir miktar götürür, yani bu bir ahlaki maliyettir. Pier anılmak ister (`asked` anı): *Let him my memory comfort, which is lying* (Inferno XIII, 77). Kalp anı (taslak): şiirdeki Dante acıdan konuşamaz (XIII 82–84). **Harpiler** havadan dalış yapar. Savurganların peşindeki **kara köpekler** ise oyuncuyu kovalar.
- **Halka 3 — Tanrıya, doğaya ve sanata karşı şiddet:** **Yanan kum çölü** ve gökten yağan ateş pulları. **Mekanik:** Ateşin düşeceği yerlerde önceden gölgeler belirir. Oyuncu taş kemerlerin altına sığınarak ilerler. Burada Dante'nin eski hocası **Brunetto Latini** ile duygusal bir karşılaşma vardır. Brunetto da anılmak ister (`asked` anı): *Commended unto thee be my Tesoro,* (Inferno XV, 119). Kalp anı (taslak, `sodomy`): Bu karşılaşmadaki acıma, Araf'taki ateş duvarına da yazılır (§3.8).
- **Set-piece — Geryon:** Dürüst bir yüze ve akrep kuyruğuna sahip sahtekârlık canavarı. Oyuncu onun sırtında **aşağı doğru spiral çizen bir uçuş sekansıyla** Malebolge'ye iner. Bu sekans kayan nişancı oyunu (shmup) tarzında, ama saldırısızdır.

### 4.9 Sekizinci Çember — Malebolge (Kanto XVIII–XXX)

On kötü hendek taş köprülerle birbirine bağlanır. Her hendek kısa bir **mini alandır** (2–5 dakika). Böylece oyunun en çeşitli kısmı burası olur.

| # | Günah | Contrapasso | Mini mekanik |
|---|---|---|---|
| 1 | Pezevenkler ve baştan çıkarıcılar | Boynuzlu iblisler tarafından kırbaçlanarak yürütülürler | İki yönlü akan kalabalık şeritleri, kırbaç saldırısından kaçınma |
| 2 | Dalkavuklar | Pislik içine gömülmüşlerdir | Koku nedeniyle görüş alanı daralır, kısa bir platform geçişi |
| 3 | Simonistler (din tüccarları) | Kayadaki deliklere baş aşağı gömülmüşlerdir, ayak tabanları yanar | Alevli ayakların arasından geçiş. **Papa III. Nicholas** ile diyalog |
| 4 | Kâhinler | Başları arkaya dönüktür, geriye doğru yürürler | **Kontroller ters döner.** *(Erişilebilirlik ayarıyla kapatılabilir)*. Kalp anı: Dante ağlar, Vergilius onu azarlar (XX 25–30) |
| 5 | Rüşvetçiler | Kaynayan katranın içindedirler. **Malebranche** iblisleri kancalarla bekler | **Gizlilik ve kovalamaca.** Malebranche bölüğüyle (Malacoda, Barbariccia …) kara mizahlı bir yolculuk. İblisler birbirine düşürülebilir; kavga edip katrana düşerler (XXII 133–141). İblisler kızınca kovalarlar ve sonunda Vergilius Dante'yi kucaklayıp yamaçtan aşağı kayar |
| 6 | İkiyüzlüler | Dışı yaldızlı, içi kurşun pelerinler giyip yavaşça yürürler | **Kurşun pelerin:** Oyuncu yavaşlar. Yerde çarmıha gerilmiş **Kayafa**'nın üstünden geçilir |
| 7 | Hırsızlar | Yılanlar tarafından ısırılır ve başka biçimlere dönüşürler | Yılanlar Dante'ye değerse kontroller kısa süreliğine "başkasına" geçer. Görüntü bozulma efekti eşlik eder |
| 8 | Hileli öğütçüler | Alevlerin içine hapsedilmişlerdir | **Ulysses** ile büyük hikâye anı: son yolculuğunun anlatısı. Konuşan alevler takip edilerek ilerlenir |
| 9 | Fitne ve bölücülük tohumu ekenler | Bir iblis kılıçla onları ikiye böler | Dönen kılıç tuzakları. **Bertran de Born** kopmuş başını fener gibi taşır |
| 10 | Sahteciler | İğrenç hastalıklarla cezalandırılırlar | Rastgele "durum etkileri" verilir: titreme, bulanık görüş, yavaşlık |

- **Geçiş — Devler Kuyusu (Kanto XXXI):** **Nemrud** anlamsız sözler söyler: *"Raphael mai amech izabi almi,"* (Inferno XXXI, 67). Dize balonunda Longfellow'un dizesi olduğu gibi kalır; çevresindeki arayüz yazıları bir an karışık harflere dönüşür. **Antaios** Dante'yi avucuna alıp kuyunun dibine bırakır.

### 4.10 Dokuzuncu Çember — Kokytos (Kanto XXXII–XXXIV)

- **Ortam:** Donmuş bir göl. Hainler buzun içine farklı derinliklerde gömülmüştür.
- **Mekanik:** **Kaygan buz fiziği.** Oyuncu ivmeyle kayar ve atılma yönünü değiştirmek için tek araçtır. Göl dört bölgeye ayrılır ve aşağıya inildikçe ruhlar buza daha derin gömülüdür:
  1. **Caina:** Akrabalarına ihanet edenler. Boyunlarına kadar buzdadırlar.
  2. **Antenora:** Vatanına ihanet edenler. Burada **Kont Ugolino** vardır. Oyunun en karanlık hikâyesi anlatılır. Sahne sinematik ve isteğe bağlıdır.
  3. **Ptolomea:** Misafirine ihanet edenler. Gözyaşları gözlerinde donmuştur. Kalp anı (taslak): Fra Alberigo gözlerindeki buzun açılmasını ister; şiirdeki Dante ona verdiği sözü tutmaz (XXXIII 115–117, 148–150).
  4. **Judecca:** Efendisine ihanet edenler. Tamamen buzun içindedirler.
- **Final — Lucifer:** Bu bir boss savaşı **değildir.** Üç ağızlı, altı kanatlı dev hareketsizdir. Kanatlarının çırpışı dondurucu rüzgârlar estirir ve bu rüzgârlar **sürekli bir tehlike** oluşturur. Oyuncu Vergilius'un sırtında, Lucifer'in tüylerine tutunarak **aşağı doğru tırmanır**. Dünyanın merkezine varıldığında **yerçekimi ters döner**, ekran 180° çevrilir ve "aşağı" artık "yukarı"dır.
- **Kapanış:** Dar bir patikadan yukarı tırmanılır ve yıldızlı bir gökyüzüne çıkılır. *Your Comedy*'nin Inferno kısmı burada tamamlanır; kalp, erdemler, güven ve anılar Araf'a taşınır (§3.8).

  > Thence we came forth to rebehold the stars. (Inferno XXXIV, 139)

---

## 5. PURGATORIO — Taslak (*The Ascent*)

- **Ana fikir:** Cehennem'de oyuncu "kaçar", Araf'ta ise **arınır ve güçlenir.** Cehennem'deki seçimlerin sonuçları burada görünür olur.
- **Ana mekanik — Yedi "P":** Araf'ın kapısındaki melek Dante'nin alnına yedi "P" (*peccatum*, günah) yazar:

  > Seven P's upon my forehead he described / With the sword's point, and, "Take heed that thou wash / These wounds, when thou shalt be within," he said. (Purgatorio IX, 112–114)

  Oyuncu her terasta bir P'den kurtulur. Her silinen P **yeni bir yetenek** kazandırır (ör. yüksek zıplama, tırmanma, süzülme) ve ilahî erdemlerin dalını büyütür (§3.6). Dante "hafifler". Şiirde de tırmanış her terasta biraz daha kolaylaşır.
- **Görünüm:** Yandan görünüme geçilir. Bu, dağ tırmanışını hissettirmek için yapılır.
- **Inferno'dan gelenler (§3.8):**
  - **Dört yıldız:** Kıyıdaki yıldızların parlaklığı kardinal erdemlerin kademesini gösterir.
  - **Dua:** Anma duaya dönüşür. Bekleyen ruhlar (Manfred, Belacqua, Pia …) dua ister; dualar yardım, kestirme yol ya da yetenek açar.
  - **Ağır teras:** Dante'nin Cehennem'de en çok acıdığı günahın terası zorlaşır.
  - **Beatrice'in sözleri** kalbin dengesini yansıtır.
  - **Vergilius'un vedası** güvene göre değişir.
- **Bölümler:** Ante-Purgatorio (geç tövbe edenler, Cato) → Araf Kapısı → 7 teras:

| Teras | Günah | Ceza / arınma | Mekanik fikri |
|---|---|---|---|
| 1 | Kibir | Sırtta ağır taşlar taşınır | Yük taşıyarak ilerleme, eğilerek geçme. Inferno'daki gururlu seçimler taşı ağırlaştırır. |
| 2 | Kıskançlık | Gözler tel ile dikilmiştir | Görüş çok sınırlıdır, oyuncu sesle ve dokunarak yol bulur |
| 3 | Öfke | Göz yakan kalın bir duman | Sis perdesi (fog of war) |
| 4 | Tembellik | Durmadan koşulur | Sürekli otomatik koşu (auto-runner) |
| 5 | Açgözlülük | Yüzüstü yere yatırılmıştır | Sürünerek geçilen alçak tüneller |
| 6 | Oburluk | Ulaşılamayan meyveli ağaçlar | Ödüle uzanınca geri çekilen platformlar |
| 7 | Şehvet | Ateş duvarı | Beatrice'nin adı söylenerek ateşin içinden geçilir (final anı). Duvarın uzunluğu Inferno'daki şehvete acımaya bağlıdır. |

Ateş duvarının önünde Vergilius, Dante'ye korkuyu yeniden bıraktırır. "Fear" yükü burada geri dönebilir ve şu dizeyle bırakılır: *Now lay aside, now lay aside all fear,* (Purgatorio XXVII, 31). Dante yine de kıpırdamayınca Vergilius onu Beatrice'in adıyla yüreklendirir:

> Somewhat disturbed he said: "Now look thou, Son, / 'Twixt Beatrice and thee there is this wall." (Purgatorio XXVII, 35–36)

- **Final:** Dünyevi Cennet. **Matelda**, Lethe ve Eunoe ırmakları. Vergilius'un vedası olan duygusal an ve **Beatrice'nin gelişi** buradadır. Beatrice'in sitemi (Araf XXX–XXXI) kalbin dengesine göre üç biçimde gelir.

## 6. PARADISO — Taslak (*The Light*)

- **Ana fikir:** Aksiyon yerini **ışık, uçuş ve ritme** bırakır. Düşman yoktur.
- **Yapı:** 9 gök küresi ve ardından Empyreum: Ay, Merkür, Venüs, Güneş, Mars, Jüpiter, Satürn, Sabit Yıldızlar, Primum Mobile.
- **Rehber:** Beatrice. Bölüm 1'deki kural (Beatrice yalnızca Longfellow konuşur) Cennet'te de esas alınır (taslak).
- **Mekanik fikirleri:**
  - Beatrice'nin gözlerine bakıldığında bir sonraki küreye "yükselinir". Bu, odak ve ritim tabanlı bir geçiştir.
  - **Mars:** Ruhlar ışık noktalarından bir haç oluşturur. Bu bir ışık bulmacasıdır.
  - **Jüpiter:** Ruhlar harflerle gökyüzüne bir cümle yazar. İlk sözler *'Diligite justitiam,' these were* (Paradiso XVIII, 91), son sözler *'Qui judicatis terram' were the last.* (Paradiso XVIII, 93). Harfler bir kartala dönüşür. Bu bir bağla-birleştir bulmacasıdır. Kartalın kantolarında (XIX–XX) Limbo'daki seçimler geri döner (§3.8).
  - **Satürn:** Altın merdiven boyunca dikey bir tırmanış.
  - **Sabit Yıldızlar:** Dante inanç, umut ve sevgi üzerine sınanır (Cennet XXIV–XXVI). Bu, erdem ağacının doruğudur (§3.6).
- **Final:** **Göksel Gül** ve Tanrı'nın görümü. Tanrı yüzle gösterilmez. Oyun etkileşimsiz, sade bir ışık sahnesiyle biter; ardından Kitap son kez açılır ve *Your Comedy* tamamlanır:

  > The Love which moves the sun and the other stars. (Paradiso XXXIII, 145)

---

## 7. Karakterler

| Karakter | Rol | Not |
|---|---|---|
| **Dante** | Oynanabilir karakter | Kırmızı kukuleta ve defne yaprakları. Animasyonları korkuyu ve merakı yansıtır. Korkmuş ama dikkatlidir; çok soru sorar, çabuk acır, şiire ve şairlere tutkundur. Oyuncunun seçimleri onu karakterinin dışına çıkarmaz: zalim, alaycı ya da kayıtsız bir Dante yoktur. |
| **Vergilius** | Rehber (Inferno ve Purgatorio) | Bilge, sakin ve sıcak. Mizahı çok seyrek ve kurudur. Bekçilere yalnızca Longfellow'un dizeleriyle konuşur. Güven sistemi onunla ilişkiyi renklendirir (§3.7). |
| **Beatrice** | Rehber (Paradiso) | Işık saçar. Inferno'da yalnızca Vergilius'un anlatısında görünür ve yalnızca Longfellow konuşur. Araf'taki sözleri oyuncunun kalbini yansıtır. |
| **Lucia, soylu Hanım (Meryem), Rahel** | Yardım zinciri (Kanto II) | Lucia yalnızca Longfellow konuşur. Meryem yüzüyle gösterilmez, yalnızca ışık olarak görünür ve konuşmaz. Rahel yalnızca Codex'te yer alır. |
| **Bekçiler** | Boss ve set-piece | Kharon, Minos, Kerberos, Plutus, Phlegyas, Erinyeler, Medusa, Minotauros, Geryon, Devler, Lucifer. Kharon ve Minos yalnızca Longfellow konuşur. |
| **Ruhlar** | Konuşulan karakterler | Francesca, Ciacco, Farinata, Pier delle Vigne, Brunetto, Ulysses, Ugolino ve diğerleri. Francesca yalnızca Longfellow konuşur; Paolo hiç konuşmaz. |
| **Kararsızlar** | Ante-Inferno'nun adsız kalabalığı | Hiçbirine ad verilmez. Yalnızca en çok üç kelimelik kopuk sesler çıkarırlar. Anılamazlar. |
| **Limbo'nun büyükleri** | Erdemli paganlar | Her biri tek balon konuşur; bir kantoda en çok sekiz figür konuşur. Hiçbiri anılmak istemez. |

**İki Dante.** Şiiri yıllar sonra yazan Dante (anlatıcı) yalnızca Longfellow alıntılarında ve birinci tekil şahısla konuşur. Oyuncunun oynadığı Dante modern repliklerde konuşur; kitabın sesi ondan "Dante" ya da "he" diye söz eder. Böylece "I" diyen anlatım her zaman Longfellow'dur.

**Kutsal sesler.** Paolo hiç konuşmaz. Francesca, Beatrice ve Lucia yalnızca Longfellow konuşur. Tanrı, Mesih ve Meryem ekranda yüzle gösterilmez ve hiçbir modern cümle söylemez.

**Diyalog tonu:** Modern replikler sade, ağırbaşlı ve kısadır. Bir balon en çok 140 karakterdir; araya bir eylem, alıntı ya da seçim girmeden en çok beş balon art arda gelir. Arkaik dil (thee, thou, doth, hath) yalnızca şiire aittir. Alegori diyalogda açıklanmaz; gerekiyorsa Codex notunda yorum geleneği olarak yazılır. Her önemli ruhun diyaloğu bir **Longfellow alıntısıyla** biter ve bu alıntı Kitap'a eklenir. Yazım kuralları: Senaryo İncili §5–§6.

---

## 8. Sanat ve Ses

### 8.1 Görsel stil

- **Pixel art.** Karakterler 32×32 px, karolar 16×16 px. Oyun dünyası 640×360 piksellik bir görünümde çizilir ve tam sayı katlarıyla büyütülür. Kitap sayfaları ve metinler okunaklılık için daha yüksek çözünürlükte (şu an 1280×720) çizilir.
- **Esin kaynakları:** **Gustave Doré**'nin gravürleri (kompozisyon ve ışık-gölge) ile Botticelli'nin Inferno çizimleri (harita düzeni).
- Her çemberin (Bölüm 1'de her kantonun) kendine ait bir **renk paleti** vardır. Böylece oyuncu çemberleri anında ayırt eder. Paletler Doré'nin ışık-gölgesini izler: güçlü karanlıklar ve az sayıda ışık.
- **Gravürden renge:** Her kantonun açılış sayfasında 96×64 piksellik, Doré tarzı siyah-beyaz bir vinyet vardır. Sayfa çevrilince vinyet büyür, renk sızar ve sahne oynanır hâle gelir (yaklaşık 2 saniye). Tersi de vardır: büyük anlarda renkli sahne gravüre döner. Kanto ve bölüm geçişlerinde de Doré tarzında, siyah-beyaz ve tarama efektli kısa ara sahneler kullanılır.
- **Tipografi:** Kitap, dize ve anlatım için IM Fell English; arayüz için Pixelify Sans. Dize balonu ince altın bir çizgiyle çerçevelenir.

### 8.2 Ses

- Ortam sesleri her çemberde farklıdır: rüzgâr, yağmur, kaynayan kan, buzun çatırdaması.
- Müzik: Ortaçağ ve erken Rönesans esintileri (Gregoryen ilahi motifleri, düşük drone sesler). Paradiso'ya doğru müzik giderek aydınlanır.
- Seslendirme yoktur. Bunun yerine her karakterin kendine ait bir "mırıltı" sesi (blip) vardır. Dize balonları harf harf değil, dize dize ve yumuşak bir sesle belirir. Longfellow dizelerinin seslendirilmesi açık bir sorudur (§12, soru 11).
- **Sessizlik de tasarımdır:** Francesca konuşurken kasırga susar. Limbo'nun iç çekişleri sessiz bir ses manzarasıdır.

---

## 9. Kitap Katmanı: Sunum ve Arayüz (UI/UX)

Oyunun arayüzü bir kitaptır. Bu bölüm kitabın nasıl okunduğunu ve oynandığını özetler; ayrıntılar ve ekran taslakları Senaryo İncili §1'dedir.

### 9.1 Üç metin katmanı

| Katman | Kim konuşur | Ekranda | Kural |
|---|---|---|---|
| **Şiir** | Şiirin anlatıcısı, şiirde o sözleri söyleyen karakter ya da kapı yazısı | Dize balonu ya da kitap sayfası. Serif yazı, ince altın çizgi, altta atıf. Dizeler dize dize belirir. | Yalnızca Longfellow, harfi harfine ve atıflı |
| **Kitabın sesi** | Kitap | Ekranın üstünde parşömen bir şerit ya da tam sayfa | Bizim İngilizcemiz. Üçüncü tekil şahıs, geçmiş zaman. Şerit en çok iki cümledir. |
| **Modern diyalog** | Karakterler | Portreli konuşma balonu, harf harf | Bizim İngilizcemiz. Sade, ağırbaşlı, kısa. |

Seçenekler, istemler, kart notları ve sade açıklamalar (GLOSS) da bizim İngilizcemizdir. Bunlar her zaman kitabın **kenar boşluğunda**, şiirden ayrı bir çerçevede görünür. Okur hangi cümlenin Dante'nin, hangisinin bizim olduğunu her an görebilir.

### 9.2 Bir kanto nasıl sunulur

1. **Açılış sayfası.** Ekran kararır ve kitap açılır. Sol sayfada "INFERNO", tezhipli bir harfle kanto numarası, İngilizce başlık ve Doré tarzı vinyet durur. Sağ sayfada en çok üç dizelik epigraf ve atfı vardır. Oyuncu sayfayı çevirir. Sayfa ilk okumada en az 3 saniye ekranda kalır; sonraki oynayışlarda atlanabilir.
2. **Gravürden dünyaya.** Vinyet büyür, renk sızar ve sahne oynanır hâle gelir (§8.1).
3. **Oynanış ve anlatım şeritleri.** Kitabın sesi ekranın üstünde kısa şeritler olarak gelir. Güvenli alanlarda şerit oyuncu okuyana kadar kalır; tehlikeli alanlarda oyunu durdurmaz.
4. **Diyalog.** Modern balonlar harf harf, dize balonları dize dize gelir. Dize balonu açıkken Q, varsa sade açıklamayı (GLOSS) kenarda açar. Dizede parlayan söz E ile alınır ve kart animasyonuyla Kitap'a uçar.
5. **Seçim.** Kitabın kenar boşluğu açılır ve 2–3 seçenek gösterir. Süre sınırı yoktur. Seçimden sonra terazi bir an kıpırdar (Kanto III'ten itibaren), Vergilius'un duruşu güvenin değişimini gösterir ve kazanılan söz Kitap'a uçar.
6. **"What Dante did" kartı** (§9.3).
7. **Kanto sonu.** Bayılmayla biten kantolarda (III, V) ekran beyaza ya da kızıla, sonra siyaha döner ve kitap kapanır.
8. **Kolofon.** Kitap yeniden açılır. Sol sayfada kantonun son dizesi tek başına durur, çünkü terza rima her kantoyu tek bir dizeyle bitirir. Sağ sayfada "In this canto" başlığı altında oyuncunun seçimleri ve Dante'ninkiler, kazanılan sözler ve köken dizeleri, anılar, Codex kayıtları ve terazi listelenir. Ertelenmiş kartlar burada açılır. Kantonun tam Longfellow metni Kitap'ta açılır. "Turn the page" ile sonraki kantoya geçilir.
9. **Uyanış.** Önceki kanto bayılmayla bittiyse yeni kantonun epigrafı uyanış dizesidir (Kanto IV'te IV 1–3). Sayfa çevrilince kısa bir sinematikle oynanışa geçilir.

### 9.3 "What Dante did" kartı

- Her diyalog seçiminden sonra kenardan bir not kartı kayar. Başlığı "What Dante did"dir; oyuncu Dante'yle aynı şeyi seçtiyse "As Dante did" olur. Dante seçeneklerin hepsini yaptıysa başlık her zaman "As Dante did"dir. Şiir bu konuda susuyorsa kart bunu açıkça söyler.
- Kartta 1–6 Longfellow dizesi, atfı ve en çok iki kısa cümlelik sade bir not vardır. Not ders vermez, alegori açıklamaz; yalnızca Dante'nin ne yaptığını ya da söylediğini anlatır.
- Seçimin yerini tutan asıl dize sahnede gösterilmez, karta saklanır. Böylece kart bir tekrar değil, bir açılıştır.
- Bazı kartlar kanto sonuna ertelenir. Bölüm 1'de Francesca sahnesinin iki kartı (`inf05.c3`, `inf05.c4`) kolofonda açılır.
- Örnek: Kanto IV'te Vergilius'un kendi yeri üzerine yapılan seçimden sonra kart şunu gösterir:

  > Great grief seized on my heart when this I heard, / Because some people of much worthiness / I knew, who in that Limbo were suspended. (Inferno IV, 43–45)

- Ayar: "After each choice" (varsayılan), "At the end of the canto" ya da "Only in the Book".

### 9.4 Kitap (The Book): okuma kipi ve Codex

Duraklatma menüsü bir kitaptır ve aynı zamanda okuma kipidir. Words sekmesi Kanto I'de, ilk sözle açılır; Kitap'ın tamamı Kanto I'in sonunda açılır.

| Sekme | İçerik |
|---|---|
| **Cantos** | Oynanmış her kanto için başlık ve epigraf; "As you lived it" (oyuncunun gördüğü anlatım ve dizeler, kenarda seçim notları); "Your verses" (o kantoda kurulan tercetler); "The whole canto" (kolofonda açılan tam Longfellow metni; oyunda görülen dizeler altınla işaretli, her dize numaralı) |
| **Verses** | Görülen bütün Longfellow alıntıları, kanto ve dize sırasıyla |
| **Words** | Söz kartları (ad, kafiye ailesi, kategori, köken dizesi) ve tercet kurma ekranı |
| **Souls · Places · Lore** | Codex kayıtları. Kanto IV'ten önce toplananlar sessizce birikir ve Codex Limbo'da açılınca görünür. |
| **Remembrance** | Anılar: "Remembered by the world" ve "Remembered by you" |
| **Map** | Botticelli tarzında, Cehennem'in kesitini gösteren harita. Minos'un mahkemesi ilk sayfasını ekler. |

Oyunun sonunda **Your Comedy** sayfası açılır; her bölüm sonunda da önizlemesi görünür. Bu sayfada oyuncunun kurduğu bütün tercetler sırayla, aralarında seçimlerinin kenar notlarıyla durur.

### 9.5 HUD, diyalog kutusu ve balonlar

- **HUD:** Sol üstte Resolve (alev simgesi) ve Grace (ışık damlası). Kanto III'ten itibaren yanlarında küçük bir terazi durur: kefeler acımayı ve adaleti, kiriş dengeyi gösterir. Sayı yoktur. Sağ üstte yer adı (ör. Ante-Inferno) ve kanto numarası. Hazırlanan tercetin üç sözü küçük bir şeritte görünür (öneri).
- **Diyalog kutusu:** Parşömen dokulu. Konuşanın portresi görünür ve metin harf harf yazılır.
- **Dize balonu:** Koyu sayfa ve ince altın çizgi. Dizeler dize dize belirir, altında küçük harflerle atıf yazar. Köşede Q ile açılan GLOSS işareti durur.
- **Kenar boşluğu:** Seçimler ve kartlar ekranın sağından açılan kenarda durur.

### 9.6 Ayarlar ve erişilebilirlik

- "What Dante did" zamanlaması: "After each choice", "At the end of the canto" ya da "Only in the Book".
- Metin hızı, dize gösterimi ("line by line" ya da "all at once"), yazı boyutu ve yüksek karşıtlık ayarlanabilir.
- Ters kontrol, ekran sallanması ve titreme efektleri kapatılabilir.
- Kolay mod: Resolve azalmaz.
- "Gözünü kapat" gibi sese dayalı mekaniklerde görsel ipuçları da gösterilir.
- Terazi ve kart simgeleri yalnızca renge dayanmaz: acıma bir gözyaşı biçimiyle, adalet bir kefe biçimiyle de ayrılır.
- **Atıflar her zaman görünür ve kapatılamaz.**

---

## 10. Teknik Tasarım

| Konu | Seçim | Gerekçe |
|---|---|---|
| Oyun motoru | **Phaser 3.90** (sürüm sabit; `package-lock.json`'da 3.90.0) | Olgun bir 2D tarayıcı motoru. Fizik, kamera, tilemap ve ses desteği hazır gelir. Sürüm, davranış değişmesin diye sabitlenmiştir. |
| Dil | **TypeScript** (strict) | Proje büyüdükçe tip güvenliği hata yakalamayı kolaylaştırır. |
| Derleme | **Vite** | Hızlı geliştirme sunucusu, kolay statik çıktı. Göreli yollar sayesinde oyun bir alt dizinden de çalışır. |
| Test | **Vitest** | Saf mantık testleri Node'da, Phaser ve DOM olmadan koşar: senaryo ayrıştırıcı, lint, koşullar, etkiler, tercetler (`npm test`, `npm run lint:story`). Tarayıcıdaki duman testi Playwright ile yapılır (`npm run smoke`). |
| Metin kaynağı | `docs/source` | Longfellow 1867, kanto başına bir dosya, her dize numaralı. Alıntıların tek kaynağıdır. |
| Senaryo kaynağı | `docs/script` | Senaryo İncili ve kanto dosyaları (`inferno-01.md` …): Markdown, YAML ön bilgi ve `script` blokları |
| Hikâye verisi | Senaryo biçiminden türetilir | Kanto dosyaları ayrıştırılır, tipli bir ağaca çevrilir ve lint kurallarından geçer. Elle yazılmış diyalog JSON'u yoktur (§10.4). |
| Haritalar | **Tiled** (`.tmj` JSON) | Phaser ile doğrudan uyumlu, görsel harita editörü. Harita alanlarının kimlikleri senaryodaki `@place` değerleridir (`inf03_gate`). |
| Yazı tipleri | IM Fell English, Pixelify Sans (`@fontsource`) | Oyunla birlikte paketlenir; ağ isteği yoktur. |
| Kayıt | `localStorage` | Kontrol noktası, seçimler, bayraklar, sayaçlar (acıma, adalet, güven, erdemler), sözler ve tercetler, anılar, Codex ve ayarlar burada tutulur. |
| Yayın | **GitHub Pages** | Ücretsizdir ve link ile paylaşılır. |

### 10.1 Klasör yapısı

Modüllerin sınırları, dosya sahipliği ve çalışma kuralları `docs/ENGINE.md`'dedir (İngilizce). Özet:

```
/docs
  GDD.md                      # bu belge
  ENGINE.md                   # motor mimarisi, modüller ve sahiplik
  /script                     # Senaryo İncili (README.md) ve kanto senaryoları (inferno-01.md …)
  /source                     # Longfellow 1867: özgün e-metinler ve kanto başına numaralı dosyalar
/src
  config.ts                   # çözünürlük, paletler, tuşlar, ayarlanabilir değerler
  /story                      # senaryo tipleri, ayrıştırıcı, koşullar, etkiler, alıntı doğrulama, lint, söz tablosu
  /state  /runtime  /verse    # oyun durumu ve kayıt, hikâye çalıştırıcısı, tercet / zincir / koda mantığı (Phaser'sız)
  /scenes  /ui  /audio        # kitap katmanı: sayfalar, şeritler, balonlar, kenar, kartlar, Kitap menüsü, HUD, ses
  /world  /entities  /mechanics  /levels  /art   # dünya, Dante ve Vergilius, contrapasso mekanikleri, alanlar
/tests                        # Vitest: senaryo lint'i, fixture kanto, çalışma zamanı testleri
/scripts                      # tarayıcı duman testi (Playwright)
```

### 10.2 Çember başına mekanik sistemleri

Her contrapasso mekaniği **tekrar kullanılabilir bir sistem** olarak yazılır. Böylece Purgatorio ve Paradiso da aynı sistemlerden yararlanır:

- `WindField`: rüzgâr kuvvet alanı, sığınak ve senaryolu dinme (Çember 2)
- `SurfaceModifier`: çamur, buz ve kurşun pelerin hız/sürtünme değişiklikleri; Limbo'daki dereden katı zemindeymiş gibi geçiş (Çember 1, 3, 9, Malebolge 6)
- `PatternHazard`: zamanlamalı alev ve kaya şeritleri, arı sürüleri, yön değiştiren kalabalık (Ante-Inferno, Çember 4, 6, Malebolge 1)
- `VisionModifier`: karartma, sis ve dar görüş (Karanlık Orman, Dis Kapıları, Malebolge 2, Purgatorio 2–3)
- `InputModifier`: ters kontrol ve otomatik koşu (Malebolge 4, Purgatorio 4)

Anlatı sistemleri de aynı ilkeyle yazılır ve üç kitapta da kullanılır: `Heart` (terazi ve günah defteri), `Trust`, `Words` (söz, tercet, zincir, koda), `Remembrance` (anılar; Araf'ta dualar) ve `Virtues`. Senaryo dosyalarının `mechanics` alanı bu sistemlere bağlanır (Senaryo İncili §7.0).

### 10.3 Metin kaynağı ve lisans

- **Longfellow çevirisi (1867)** kamu malıdır. `docs/source`, Project Gutenberg e-metinlerini (#1001, #1002, #1003) lisans başlıklarıyla ve kanto başına numaralı dosyalar olarak içerir. Inferno'da Longfellow'un dize numaraları İtalyanca asılla birebir aynıdır.
- Alıntılar yalnızca bu dosyalardan, harfi harfine kopyalanır. Kaynaktaki tuhaflıklar da düzeltilmez (Senaryo İncili §6.6).
- Modern çevirilerden (Mandelbaum, Hollander vb.) **alıntı yapılmaz** ve bu çeviriler yakın biçimde yeniden yazılmaz. Bu çeviriler telif hakkı altındadır.
- Doré gravürleri kamu malıdır ve referans olarak kullanılabilir.
- Yazı tipleri (IM Fell English, Pixelify Sans) SIL Open Font License 1.1 ile dağıtılır.

### 10.4 Hikâye verisi: senaryodan oyuna

```
docs/script/inferno-0N.md ──ayrıştır──▶ tipli kanto ağacı ──lint (L01–L22)──▶ oyun verisi ──▶ hikâye çalıştırıcısı
docs/source/<kitap>/canto-NN.txt ───────────────▶ alıntı doğrulama (L06)
```

- Hikâye verisinin biçimi senaryo biçiminden türetilir. Tipler `src/story/types.ts`'tedir ve Senaryo İncili §2'yi birebir izler. Biçim değişecekse önce Senaryo İncili, sonra tipler değişir.
- Lint kuralları (Senaryo İncili §2.14) Vitest testleri olarak koşar: `npm run lint:story`. Bir alıntı kaynakla harfi harfine eşleşmezse lint hata verir.
- Senaryo dosyaları ve kaynak metinler derleme sırasında ham metin olarak içe aktarılır (`import.meta.glob`, `?raw`).
- **M0 profili:** Kanto I'den doğrudan Kanto V'e geçildiğinde motor eksik kilitleri açar, eksik sözleri verir ve "Fear" yükünü bırakır. Böylece Kanto V'e her oyuncu Kanto IV sonundaki durumla girer (Senaryo İncili §7.5).

---

## 11. Yol Haritası

Her kilometre taşı senaryoyla başlar: kantolar Senaryo İncili'ne göre yazılır ve lint'ten geçer, oynanış bu senaryonun üstüne kurulur.

| Kilometre taşı | İçerik | Başarı ölçütü |
|---|---|---|
| **M0 — Bölüm 1 senaryosu (Kanto I–V) + dikey kesit (Karanlık Orman + Çember 2)** | **Senaryo:** `docs/script/inferno-01.md` … `inferno-05.md`. **Motor:** Proje iskeleti, senaryo ayrıştırıcı ve lint, hikâye çalıştırıcısı; Dante hareketi ve atılma, Vergilius takibi; kitap katmanının temeli (açılış sayfası, şerit, dize balonu, seçim, "What Dante did" kartı, kolofon); sözler ve ilk tercet; terazi ve güven. **Dikey kesit:** Kanto I'den doğrudan Kanto V'e (M0 profili): üç hayvan ve Vergilius; Minos, kasırga ve Francesca. | Beş kanto dosyası lint'ten hatasız geçer ve `review` durumundadır. Kanto I ve V'in yaklaşık 10 dakikalık kısa kurgusu GitHub Pages'te yayında olur. Her alıntı `docs/source` ile doğrulanmıştır. |
| **M1 — Bölüm 1 tam** | Kanto II–IV: resimli sayfalar; kapı ve Kararsızlar (kalabalık, arı sürüleri); Kharon'un kıyısı ve bayılma; Limbo merkezi, dört şair ve zincir; Codex ve Anma sekmeleri; *Your Comedy* önizlemesi | Bölüm 1 baştan sona oynanabilir (44–63 dakika) |
| **M2 — Inferno II** | Kanto VI–IX: Çember 3–5, Kerberos, Plutus, Styx, Dis Kapıları (Medusa) | Dis Kapıları'na kadar oynanabilir |
| **M3 — Inferno III** | Kanto X–XVII: Dis, Çember 6–7, Minotauros, Geryon | Malebolge'ye kadar oynanabilir |
| **M4 — Inferno IV** | Kanto XVIII–XXXIV: Malebolge'nin 10 hendeği, Devler, Kokytos, Lucifer | *The Descent* baştan sona oynanabilir; *Your Comedy*'nin Inferno kısmı tamamdır |
| **M5 — Purgatorio** | Yan görünüm, yedi P sistemi, 7 teras, dualar, ilahî erdemler, Inferno'dan taşınan sonuçlar | *The Ascent* |
| **M6 — Paradiso** | Uçuş ve ışık sistemleri, 9 küre, *Your Comedy*'nin tamamı | *The Light*, oyunun tamamı |

**Neden önce Bölüm 1 ve Çember 2?** Bölüm 1 bütün anlatı sistemlerini ilk kez kurar: kitap katmanı, sözler ve tercetler, terazi, güven, erdemler ve anma. Dikey kesitteki Çember 2 ise oyunun bütün ana fikrini küçük bir alanda gösterir. Bu alanda contrapasso mekaniği (rüzgâr), bir bekçi (Minos), güçlü bir hikâye anı (Francesca) ve onun ortasında bölümün tek `centre` seçimi bir arada. Karanlık Orman da hareketi, sözleri ve Vergilius'u öğretir.

---

## 12. Açık Sorular

Soru numaraları v0.1'deki gibi korunmuştur. Kapanan sorular listenin sonundadır.

- **1. Oyunun ve kitapların adı.** Çalışma adı *The Divine Comedy — A Playable Book*. Inferno kitabının adı *The Descent* mi olsun, yoksa doğrudan *Inferno* mu?
- **3. Malebolge'nin bölünüşü.** On hendeğin hepsi ayrı mini alan mı olsun, yoksa bazıları tek bir uzun alanda mı birleştirilsin? Bu kantolar kaç bölüme ayrılacak?
- **4. Grafikler.** Hazır (ücretsiz/CC0) pixel art paketleri mi kullanılsın, yoksa özgün çizimler mi yapılsın? Kanto vinyetleri Doré gravürlerinden piksel uyarlama mı olacak? Prototipte basit geometrik yer tutucularla başlamak öneriliyor.
- **5. Mobil (dokunmatik) destek** hangi aşamada eklensin? Okuma ağırlıklı yapı tableti doğal bir platform yapıyor.
- **6. Sonraki bölümler.** Inferno'nun geri kalanı bölümlere nasıl ayrılacak? Her bölümde tek bir `centre` seçim olduğu için bu karar, bölümlerin merkez karşılaşmalarını da seçer (ör. Ulysses, Ugolino).
- **7. Toplam süre.** Bölüm 1'in yoğunluğuyla Inferno 5–7 saat sürer (v0.1 hedefi 3–5 saatti). Bütün kantolar aynı yoğunlukta mı olacak, yoksa bazı kantolar daha kısa, okuma ağırlıklı bir biçimde mi sunulacak?
- **8. Tercetlerin sayıları.** Grace bedeli, Grace'in dolum hızı, etki süreleri, zincir bonusu ve koda gücü M0 prototipinde ayarlanacak. Zincirde her tercet ayrı mı ödenir?
- **9. Akheron'da rüya.** Bayılmanın içinde, rüya olarak ve şiirden sapma notuyla bir kayık sahnesi isteniyor mu, yoksa geçiş yalnızca bayılmayla mı olsun?
- **10. Okur kipi.** Aksiyonu en aza indiren bir kip (Resolve azalmaz, tehlikeler yavaşlar), oyunun başında "okur" ve "yolcu" seçenekleri olarak sunulsun mu?
- **11. Seslendirme.** Longfellow dizeleri, en azından epigraflar, bir anlatıcı sesiyle okunsun mu? Modern replikler için "seslendirme yok" kararı korunuyor.
- **12. Yeniden oynama.** Kitap'tan bir kanto yeniden oynanabilsin mi? Oynanabilirse seçimler sayaçları yeniden mi yazar, yoksa yeni bir okuma (yeni kayıt) mı başlar?
- **13. Türkçe baskı.** Oyun içi dil İngilizce ve şiir yalnızca Longfellow'dan alıntılanıyor. İleride bir Türkçe baskı yapılırsa şiir katmanı nasıl çözülecek?

**Kapanan sorular**

- **2. Dante'nin bayılmasından sonraki uyanışlar.** Kapandı: Uyanış dizesi yeni kantonun açılış sayfasında epigraf olarak gelir; sayfa çevrilince kısa bir sinematikle oynanışa geçilir (§9.2, madde 9; Senaryo İncili §1.3).

---

## Sürüm notları

- **v0.2 (6 Ekim 2026):** Oynanabilir kitap vizyonu ve öncelikler eklendi (§1.1–§1.3); tasarım ilkeleri güncellendi (§1.4). Anlatı ve oyuncu katkısı sistemleri eklendi (§3); v0.1'deki §3 "Yapı" §1.6'ya taşındı. Arayüz kısmı kitap katmanı olarak yeniden yazıldı (§9). "Verse" yeteneği Terza Rima tercetlerine dönüştü (§2.2, §2.3, §3.4). Longfellow'a ait olmayan bütün alıntılar düzeltildi ve her alıntı `docs/source`'tan doğrulandı. Kharon geçişi şiire uyduruldu (§4.1). Teknik tasarım, yol haritası ve açık sorular güncellendi. Senaryo İncili §6.7'deki farklar bu sürümde giderildi. Senaryo İncili ve kodun atıf yaptığı § numaraları korundu.
- **v0.1:** İlk taslak.
