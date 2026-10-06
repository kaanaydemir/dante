# Divine Comedy — Oyun Tasarım Dokümanı (GDD)

> **Çalışma adı:** *Divine Comedy: The Descent* (ilk sürüm), devamında *The Ascent* ve *The Light*
> **Tür:** 2D üstten görünümlü aksiyon-macera
> **Platform:** Tarayıcı (HTML5 / JavaScript)
> **Oyun içi dil:** İngilizce
> **Doküman durumu:** Taslak v0.1. Bu belge değiştikçe güncellenecek.

---

## 1. Vizyon

Dante Alighieri'nin *İlahi Komedya*'sını oynanabilir bir yolculuğa çeviriyoruz. Oyuncu Dante olur. Karanlık Orman'dan başlayıp Cehennem'in dokuz çemberinden iner, Araf Dağı'na tırmanır ve sonunda Cennet'in ışığına ulaşır.

**Tek cümlelik özet:** *"Her günahın cezasının bir oyun mekaniğine dönüştüğü, şiire sadık bir 2D macera."*

### 1.1 Tasarım ilkeleri

1. **Ceza = mekanik (contrapasso).** Dante'de her günahkârın cezası günahının bir yansımasıdır. Oyunda da her çemberin ana mekaniği o çemberin cezasından türetilir. Örneğin şehvet çemberinde oyuncuyu sürükleyen bir rüzgâr, kâhinler bölmesinde ters dönen kontroller vardır.
2. **Dante bir savaşçı değil, bir yolcudur.** Günahkârlar düşman değildir. Onlar ya tehlikedir ya da konuşulacak ruhlardır. Oyuncunun karşısına çıkan asıl engeller Cehennem'in **bekçileri ve iblisleridir**. Aksiyon; kaçma, kaçınma, sersemletme ve çevreyi kullanmaya dayanır. Öldürmek yoktur.
3. **Rehberle yolculuk.** Vergilius (Araf'ın sonuna kadar), ardından Beatrice, oyuncunun yanında yürüyen bir yol arkadaşıdır. İpucu verirler, hikâyeyi anlatırlar ve bazı engelleri onlar açar.
4. **Metne saygı, ama erişilebilir dil.** Diyaloglar sade, modern İngilizceyle yazılır. Önemli anlarda kamu malı olan **Longfellow çevirisinden (1867)** alıntılar kullanılır. Her alıntının kanto ve dize numarası "Codex"te gösterilir.

### 1.2 Hedef deneyim

- Bir oynanış oturumu 20–40 dakika sürer. Cehennem'in tamamı yaklaşık 3–5 saat.
- Oyuncu oyunu bitirdiğinde eserin yapısını, başlıca karakterlerini ve contrapasso fikrini öğrenmiş olur.
- Ton: karanlık ve ağırbaşlı, ama yer yer kara mizah içerir (Malebranche bölümü gibi). Dante de bu tonu kullanır.

---

## 2. Temel Oynanış

### 2.1 Ana döngü

```
Keşfet  →  Bir ruhla konuş / Codex sayfası bul  →  Çemberin mekaniğini öğren
   ↑                                                         ↓
Bir sonraki çembere in  ←  Bekçiyi geç (boss / set-piece)  ←  Mekaniği ustalaşarak kullan
```

### 2.2 Kontroller (klavye ve gamepad)

| Eylem | Klavye | Gamepad | Açıklama |
|---|---|---|---|
| Hareket | WASD / Ok tuşları | Sol çubuk | 8 yönlü hareket |
| Atılma (Dash) | Shift / Space | A | Kısa süre dokunulmazlık sağlar. Kısa bir bekleme süresi vardır. |
| Söz (Verse) | J / Sol tık | X | Işıktan bir dize fırlatır. İblisleri iter ve sersemletir. *Kaynak harcar.* |
| Konuş / Etkileşim | E | Y | Ruhlarla konuşmak, nesne kullanmak |
| Vergilius'a sor | Q | LB | O anki duruma göre ipucu ve kısa bir anlatım |
| Codex | Tab | Select | Toplanan dize kartları, karakterler, harita |

Kontroller ayarlardan değiştirilebilir. Mobil dokunmatik destek ilk sürümde yoktur, sonraya bırakıldı.

### 2.3 Kaynaklar

- **Resolve (Kararlılık):** Dante'nin canı. İblisler, tehlikeler ve **korku** bu değeri azaltır. Sıfıra düşerse Dante bayılır. *Şiirde de Dante birkaç kez bayılır.* Oyuncu son kontrol noktasında, Vergilius'un yanında uyanır.
- **Grace (Lütuf):** "Verse" yeteneğinin kaynağıdır. Ruhlarla konuştukça ve dize kartı topladıkça dolar. Böylece oyuncu keşfetmeye ve dinlemeye teşvik edilir.
- **Codex sayfaları:** Toplanan her sayfa bir alıntı ve kısa bir açıklama içerir. Tamamlayıcı içerik olarak tasarlanmıştır. Oyunu bitirmek için gerekli değildir.

### 2.4 Kontrol noktaları ve ölüm

- Her çemberde 2–4 kontrol noktası bulunur. Görsel olarak Vergilius'un beklediği bir taş bank şeklindedir.
- Bayılmanın cezası azdır. Oyuncu sadece konum kaybeder. Amaç, keşif ve hikâyenin cezalandırılmamasıdır.

### 2.5 Vergilius (yapay zekâlı yol arkadaşı)

- Oyuncuyu takip eder. Saldırıya uğramaz, oyuncu onu korumak zorunda kalmaz.
- **Anahtar anlar:** Bazı bekçiler yalnızca Vergilius'un sözüyle geçilebilir. Örneğin Kharon, Minos ve Plutus'a karşı Vergilius şu dizeyi söyler: *"It is so willed there where is power to do / That which is willed"*. Oyunda bu anlar kısa sinematik sahnelerdir.
- **Q tuşu:** O odaya özel bir ipucu ya da kısa bir bilgi verir. Her ipucu bir kez oynatılır, sonra kısaltılmış haliyle tekrarlanır.

---

## 3. Yapı: Üç Kitap

| Kitap | Oyun bölümü | Hareket yönü | Görsel palet | Oynanış odağı |
|---|---|---|---|---|
| **Inferno** | *The Descent* | Aşağıya, içe doğru | Kızıl, is karası, kükürt sarısı | Aksiyon, kaçış, bekçi karşılaşmaları |
| **Purgatorio** | *The Ascent* | Yukarıya, dağa | Şafak pembesi, deniz mavisi, yeşil | Platform, yetenek kazanımı, arınma |
| **Paradiso** | *The Light* | Göğe, ışığa | Beyaz, altın, gök mavisi | Uçuş, ışık bulmacaları, ritim |

**Birinci öncelik Inferno'dur.** Purgatorio ve Paradiso bu belgede yalnızca taslak olarak yer alıyor (bkz. Bölüm 5 ve 6).

---

## 4. INFERNO — Bölüm Tasarımı

Her bölüm şu başlıklarla tanımlanmıştır: **Kantolar**, **Ortam**, **Contrapasso mekaniği**, **Karşılaşılan karakterler**, **Bekçi / Set-piece**.

### 4.0 Prolog — The Dark Wood (Kanto I–II)

- **Ortam:** Gece, sisli ve sık bir orman. Uzakta güneşle aydınlanan bir tepe görünür.
- **Amaç:** Öğretici bölüm. Oyuncu hareketi ve atılmayı öğrenir.
- **Set-piece:** Dante tepeye tırmanmaya çalışırken **Leopar**, **Aslan** ve **Dişi Kurt** sırayla yolunu keser. Bu bir kaçış sekansıdır. Dişi Kurt'tan kaçmak mümkün değildir ve oyuncu geri itilir. Tam o anda **Vergilius** belirir.
- **Öğretilenler:** Hareket, atılma, konuşma. Bölümün sonunda Vergilius ilk "Verse" dizesini Dante'ye öğretir.

### 4.1 Cehennem Kapısı ve Ante-Inferno (Kanto III)

- **Ortam:** Üzerinde *"Abandon all hope, ye who enter here"* yazan kapı. Ardında karanlık bir ova uzanır.
- **Contrapasso:** Hayatta hiçbir taraf seçmemiş **Kararsızlar**, hiç durmadan dönen bir bayrağın peşinden koşar ve eşek arılarının sokmasına maruz kalır.
- **Mekanik:** Haritada dolaşan **arı sürüleri** vardır. Bayrağı takip eden kalabalık sürekli yön değiştirir ve oyuncu bu kalabalığın arasından geçmek zorundadır.
- **Set-piece:** **Kharon** ve Akheron Nehri. Kayıkla geçiş, otomatik ilerleyen bir sahnedir. Nehirden uzanan ellerden atılarak kaçılır. Bölüm, Dante'nin bayılmasıyla kararan ekranla biter.

### 4.2 Birinci Çember — Limbo (Kanto IV)

- **Ortam:** Yedi kapılı ve yedi surlu **Soylu Kale**. Yeşil bir çayırı vardır. Cehennem'in tek huzurlu yeri burasıdır.
- **Contrapasso:** Burada işkence yoktur. Vaftiz edilmemiş erdemli ruhlar acı çekmeden ama umutsuzca özlem içinde yaşar.
- **Mekanik:** **Savaş içermeyen bir merkez bölge.** Codex'in tanıtıldığı yerdir. Homeros, Horatius, Ovidius ve Lucanus Dante'yi "altıncı şair" olarak aralarına kabul eder. Aristoteles, Sokrates, İbn Sina ve İbn Rüşd ile konuşulabilir.
- **Ödül:** Grace kaynağının üst sınırı artar.

### 4.3 İkinci Çember — Şehvet (Kanto V)

- **Bekçi:** **Minos.** Her ruhun cezasını, kuyruğunu vücuduna dolama sayısıyla belirler. Çemberin girişinde kısa bir sinematik vardır. Minos, Dante'yi de "yargılamaya" kalkar ama Vergilius araya girer.
- **Contrapasso:** Hayattayken tutkularına kapılan ruhlar, durmak bilmeyen bir **kasırgada** savrulur.
- **Mekanik:** **Rüzgâr akımları.** Ekranda görünen rüzgâr şeritleri oyuncuyu sürekli iter. Kayalıkların arkasında rüzgârdan korunulabilir. Atılma, rüzgâra karşı ilerlemenin tek yoludur.
- **Karakterler:** **Paolo ve Francesca.** Oyunun ilk büyük duygusal sahnesidir. Francesca'nın hikâyesinin sonunda Dante bayılır ve oyuncu sonraki çemberde uyanır.

### 4.4 Üçüncü Çember — Oburluk (Kanto VI)

- **Ortam:** Hiç durmayan soğuk ve pis bir yağmur, çamur.
- **Contrapasso:** Oburlar çamurun içinde yatar.
- **Mekanik:** **Çamur zemin** hareketi yavaşlatır. Yükseltilmiş taş yollar bulunur ve rotalar bunlara göre planlanır.
- **Karakter:** **Ciacco**, Floransa'nın geleceği hakkında kehanette bulunur.
- **Boss — Kerberos:** Üç başlı köpek. Şiirde Vergilius onun ağızlarına bir avuç toprak atarak onu susturur. **Oyunda:** Oyuncu yerden **toprak topakları** toplar ve havlamaya hazırlanan başın ağzına fırlatır. Üç baş farklı ritimlerle saldırır. Başlardan biri susturulduğunda diğer ikisi hızlanır.

### 4.5 Dördüncü Çember — Açgözlülük ve Savurganlık (Kanto VII)

- **Bekçi:** **Plutus.** Anlaşılmaz sözler söyler: *"Papè Satàn, papè Satàn aleppe!"* Vergilius tek bir sözle onu yere yıkar.
- **Contrapasso:** İki grup ruh, göğüsleriyle dev ağırlıklar iterek yarım daire çizer. Karşılaştıklarında birbirlerine *"Neden biriktiriyorsun?"* ve *"Neden saçıyorsun?"* diye bağırırlar, sonra geri dönerler.
- **Mekanik:** **Yuvarlanan kaya şeritleri.** Ağırlıklar belirli şeritlerde ritmik olarak gidip gelir. Oyuncu doğru zamanlamayla aralarından geçer. Bölümün sonunda bu ağırlıkları iterek bir yol açtığı bir bulmaca vardır.

### 4.6 Beşinci Çember — Öfke ve Küskünlük (Kanto VII–IX)

- **Ortam:** **Styx bataklığı.** Uzakta Dis Şehri'nin kızıl kuleleri görünür.
- **Contrapasso:** Öfkeliler çamurun yüzeyinde birbirini parçalar. Küskünler ise çamurun dibinde boğuk bir şekilde mırıldanır ve onlardan yüzeye kabarcıklar yükselir.
- **Mekanik:** **Phlegyas'ın kayığında** ilerlenen bir sekans. Çamurdan kayığa tırmanmaya çalışan öfkeli ruhlar "Verse" ile itilir. Bunlardan biri **Filippo Argenti**'dir. Kabarcıkların çıktığı yerlere basılmaz.
- **Set-piece — Dis'in Kapıları:** Düşmüş melekler kapıyı kapatır. Ardından **Erinyeler** ve **Medusa** gelir.
  - **"Don't look!" mekaniği:** Medusa belirdiğinde Vergilius bağırır. Oyuncu **gözlerini kapatma** tuşunu basılı tutar. Ekran kararır ve oyuncu yalnızca sesle yön bulur. Medusa'ya bakan oyuncu taşa döner ve bayılır.
  - Sonunda **Göksel Haberci** gelir ve kapıyı bir değnekle açar.

### 4.7 Altıncı Çember — Sapkınlar (Kanto IX–XI)

- **Ortam:** Dis'in içinde, uçsuz bucaksız bir mezarlık. Açık lahitlerden alevler yükselir.
- **Contrapasso:** Ruhun ölümsüzlüğünü inkâr edenler yanan mezarlara kapatılmıştır.
- **Mekanik:** **Alev desenleri.** Lahitler sırayla alev püskürtür. Oyuncu deseni öğrenerek ilerler. Bu, ritim ve zamanlama becerisi ister.
- **Karakterler:** **Farinata degli Uberti**, mezarından yarı beline kadar doğrularak konuşur. **Cavalcante** oğlunu sorar.

### 4.8 Yedinci Çember — Şiddet (Kanto XII–XVII)

Bu çember üç halkaya ayrılır. Her halka küçük bir bölüm gibi tasarlanmıştır.

- **Giriş bekçisi — Minotauros:** Yıkık bir kayalıkta oyuncuya saldırır. Vergilius onu kızdırır. Minotauros öfkeyle kendi etrafında döndüğü sırada oyuncu yanından atılarak geçer. Bu bir **kaçış boss'udur**.
- **Halka 1 — Komşuya karşı şiddet:** **Phlegethon**, kaynayan kandan bir nehirdir. Kıyıda devriye gezen **Kentaurlar** ok atar. Atılarak saklanma noktaları arasında ilerlenir. Sonunda **Nessos** oyuncuyu sırtında nehrin sığ yerinden geçirir.
- **Halka 2 — Kendine karşı şiddet:** **İntiharlar Ormanı.** Ruhlar ağaca dönüşmüştür. Bir dal kırıldığında ağaç kanar ve konuşur (**Pier delle Vigne**). **Mekanik:** Etkileşimle bir dal kırıp ağacın sesini dinlemek, yolu açan ipucunu verir. Ama her kırık dal Resolve'dan küçük bir miktar götürür, yani bu bir ahlaki maliyettir. **Harpiler** havadan dalış yapar. Savurganların peşindeki **kara köpekler** ise oyuncuyu kovalar.
- **Halka 3 — Tanrıya, doğaya ve sanata karşı şiddet:** **Yanan kum çölü** ve gökten yağan ateş pulları. **Mekanik:** Ateşin düşeceği yerlerde önceden gölgeler belirir. Oyuncu taş kemerlerin altına sığınarak ilerler. Burada Dante'nin eski hocası **Brunetto Latini** ile duygusal bir karşılaşma vardır.
- **Set-piece — Geryon:** Dürüst bir yüze ve akrep kuyruğuna sahip sahtekârlık canavarı. Oyuncu onun sırtında **aşağı doğru spiral çizen bir uçuş sekansıyla** Malebolge'ye iner. Bu sekans kayan nişancı oyunu (shmup) tarzında, ama saldırısızdır.

### 4.9 Sekizinci Çember — Malebolge (Kanto XVIII–XXX)

On "kötü hendek" taş köprülerle birbirine bağlanır. Her hendek kısa bir **mini bölüm**dür (2–5 dakika). Böylece oyunun en çeşitli kısmı burası olur.

| # | Günah | Contrapasso | Mini mekanik |
|---|---|---|---|
| 1 | Pezevenkler ve baştan çıkarıcılar | Boynuzlu iblisler tarafından kırbaçlanarak yürütülürler | İki yönlü akan kalabalık şeritleri, kırbaç saldırısından kaçınma |
| 2 | Dalkavuklar | Pislik içine gömülmüşlerdir | Koku nedeniyle görüş alanı daralır, kısa bir platform geçişi |
| 3 | Simonistler (din tüccarları) | Kayadaki deliklere baş aşağı gömülmüşlerdir, ayak tabanları yanar | Alevli ayakların arasından geçiş. **Papa III. Nicholas** ile diyalog |
| 4 | Kâhinler | Başları arkaya dönüktür, geriye doğru yürürler | **Kontroller ters döner.** *(Erişilebilirlik ayarıyla kapatılabilir)* |
| 5 | Rüşvetçiler | Kaynayan katranın içindedirler. **Malebranche** iblisleri kancalarla bekler | **Gizlilik ve kovalamaca.** Malebranche bölüğüyle (Malacoda, Barbariccia...) kara mizahlı bir yolculuk. İblisler kızınca kovalarlar ve sonunda Vergilius Dante'yi kucaklayıp yamaçtan aşağı kayar |
| 6 | İkiyüzlüler | Dışı yaldızlı, içi kurşun pelerinler giyip yavaşça yürürler | **Kurşun pelerin:** Oyuncu yavaşlar. Yerde çarmıha gerilmiş **Kayafa**'nın üstünden geçilir |
| 7 | Hırsızlar | Yılanlar tarafından ısırılır ve başka biçimlere dönüşürler | Yılanlar Dante'ye değerse kontroller kısa süreliğine "başkasına" geçer. Görüntü bozulma efekti eşlik eder |
| 8 | Hileli öğütçüler | Alevlerin içine hapsedilmişlerdir | **Ulysses** ile büyük hikâye anı: son yolculuğunun anlatısı. Konuşan alevler takip edilerek ilerlenir |
| 9 | Fitne ve bölücülük tohumu ekenler | Bir iblis kılıçla onları ikiye böler | Dönen kılıç tuzakları. **Bertran de Born** kopmuş başını fener gibi taşır |
| 10 | Sahteciler | İğrenç hastalıklarla cezalandırılırlar | Rastgele "durum etkileri" verilir: titreme, bulanık görüş, yavaşlık |

- **Geçiş — Devler Kuyusu (Kanto XXXI):** **Nemrud** anlamsız sözler söyler: *"Raphèl maì amècche zabì almi"*. Ekrandaki metin karışık harflere dönüşür. **Antaios** Dante'yi avucuna alıp kuyunun dibine bırakır.

### 4.10 Dokuzuncu Çember — Kokytos (Kanto XXXII–XXXIV)

- **Ortam:** Donmuş bir göl. Hainler buzun içine farklı derinliklerde gömülmüştür.
- **Mekanik:** **Kaygan buz fiziği.** Oyuncu ivmeyle kayar ve atılma yönünü değiştirmek için tek araçtır. Göl dört bölgeye ayrılır ve aşağıya inildikçe ruhlar buza daha derin gömülüdür:
  1. **Caina:** Akrabalarına ihanet edenler. Boyunlarına kadar buzdadırlar.
  2. **Antenora:** Vatanına ihanet edenler. Burada **Kont Ugolino** vardır. Oyunun en karanlık hikâyesi anlatılır. Sahne sinematik ve isteğe bağlıdır.
  3. **Ptolomea:** Misafirine ihanet edenler. Gözyaşları gözlerinde donmuştur.
  4. **Judecca:** Efendisine ihanet edenler. Tamamen buzun içindedirler.
- **Final — Lucifer:** Bu bir boss savaşı **değildir.** Üç ağızlı, altı kanatlı dev hareketsizdir. Kanatlarının çırpışı dondurucu rüzgârlar estirir ve bu rüzgârlar **sürekli bir tehlike** oluşturur. Oyuncu Vergilius'un sırtında, Lucifer'in tüylerine tutunarak **aşağı doğru tırmanır**. Dünyanın merkezine varıldığında **yerçekimi ters döner**, ekran 180° çevrilir ve "aşağı" artık "yukarı"dır.
- **Kapanış:** Dar bir patikadan yukarı tırmanılır ve yıldızlı bir gökyüzüne çıkılır.
  > *"And thence we issued forth to see again the stars."* (Inferno XXXIV, 139)

---

## 5. PURGATORIO — Taslak (*The Ascent*)

- **Ana fikir:** Cehennem'de oyuncu "kaçar", Araf'ta ise **arınır ve güçlenir.**
- **Ana mekanik — Yedi "P":** Araf'ın kapısındaki melek Dante'nin alnına yedi "P" (*peccatum*, günah) yazar. Oyuncu her terasta bir P'den kurtulur. Her silinen P **yeni bir yetenek** kazandırır (ör. yüksek zıplama, tırmanma, süzülme). Dante "hafifler". Şiirde de tırmanış her terasta biraz daha kolaylaşır.
- **Görünüm:** Yandan görünüme geçilir. Bu, dağ tırmanışını hissettirmek için yapılır.
- **Bölümler:** Ante-Purgatorio (geç tövbe edenler, Cato) → Araf Kapısı → 7 teras:

| Teras | Günah | Ceza / arınma | Mekanik fikri |
|---|---|---|---|
| 1 | Kibir | Sırtta ağır taşlar taşınır | Yük taşıyarak ilerleme, eğilerek geçme |
| 2 | Kıskançlık | Gözler tel ile dikilmiştir | Görüş çok sınırlıdır, oyuncu sesle ve dokunarak yol bulur |
| 3 | Öfke | Göz yakan kalın bir duman | Sis perdesi (fog of war) |
| 4 | Tembellik | Durmadan koşulur | Sürekli otomatik koşu (auto-runner) |
| 5 | Açgözlülük | Yüzüstü yere yatırılmıştır | Sürünerek geçilen alçak tüneller |
| 6 | Oburluk | Ulaşılamayan meyveli ağaçlar | Ödüle uzanınca geri çekilen platformlar |
| 7 | Şehvet | Ateş duvarı | Beatrice'nin adı söylenerek ateşin içinden geçilir (final anı) |

- **Final:** Dünyevi Cennet. **Matelda**, Lethe ve Eunoe ırmakları. Vergilius'un vedası olan duygusal an ve **Beatrice'nin gelişi** buradadır.

## 6. PARADISO — Taslak (*The Light*)

- **Ana fikir:** Aksiyon yerini **ışık, uçuş ve ritme** bırakır. Düşman yoktur.
- **Yapı:** 9 gök küresi ve ardından Empyreum: Ay, Merkür, Venüs, Güneş, Mars, Jüpiter, Satürn, Sabit Yıldızlar, Primum Mobile.
- **Mekanik fikirleri:**
  - Beatrice'nin gözlerine bakıldığında bir sonraki küreye "yükselinir". Bu, odak ve ritim tabanlı bir geçiştir.
  - **Mars:** Ruhlar ışık noktalarından bir haç oluşturur. Bu bir ışık bulmacasıdır.
  - **Jüpiter:** Ruhlar harflerle gökyüzüne *"DILIGITE IUSTITIAM"* yazar ve harfler bir kartala dönüşür. Bu bir bağla-birleştir bulmacasıdır.
  - **Satürn:** Altın merdiven boyunca dikey bir tırmanış.
- **Final:** **Göksel Gül** ve Tanrı'nın görümü. Oyun etkileşimsiz, sade bir ışık sahnesiyle biter:
  > *"The Love which moves the sun and the other stars."* (Paradiso XXXIII, 145)

---

## 7. Karakterler

| Karakter | Rol | Not |
|---|---|---|
| **Dante** | Oynanabilir karakter | Kırmızı kukuleta ve defne yaprakları. Animasyonları korkuyu ve merakı yansıtır. |
| **Vergilius** | Rehber (Inferno ve Purgatorio) | Bilge ve sakin. Ara sıra hafif bir mizah yapar. |
| **Beatrice** | Rehber (Paradiso) | Işık saçar. Diyalogları daha şiirseldir. |
| **Bekçiler** | Boss ve set-piece | Kharon, Minos, Kerberos, Plutus, Phlegyas, Erinyeler, Minotauros, Geryon, Devler, Lucifer |
| **Ruhlar** | Konuşulan karakterler | Francesca, Ciacco, Farinata, Pier delle Vigne, Brunetto, Ulysses, Ugolino ve diğerleri |

**Diyalog tonu:** Kısa tutulur, her diyalog en fazla 3–5 balondur. Her önemli ruhun diyaloğu bir **Longfellow alıntısıyla** biter ve bu alıntı Codex'e eklenir.

---

## 8. Sanat ve Ses

### 8.1 Görsel stil

- **Pixel art.** Karakterler 32×32 px, karolar 16×16 px. Oyun 640×360 çözünürlükte çizilir ve tam sayı katlarıyla büyütülür.
- **Esin kaynakları:** **Gustave Doré**'nin gravürleri (kompozisyon ve ışık-gölge) ile Botticelli'nin Inferno çizimleri (harita düzeni).
- Her çemberin kendine ait bir **renk paleti** vardır. Böylece oyuncu çemberleri anında ayırt eder.
- Bölüm geçişlerinde Doré tarzında, siyah-beyaz ve tarama efektli kısa ara sahneler kullanılır.

### 8.2 Ses

- Ortam sesleri her çemberde farklıdır: rüzgâr, yağmur, kaynayan kan, buzun çatırdaması.
- Müzik: Ortaçağ ve erken Rönesans esintileri (Gregoryen ilahi motifleri, düşük drone sesler). Paradiso'ya doğru müzik giderek aydınlanır.
- Seslendirme yoktur. Bunun yerine her karakterin kendine ait bir "mırıltı" sesi (blip) vardır.

---

## 9. Arayüz (UI/UX)

- **HUD:** Sol üstte Resolve (alev simgesi) ve Grace (ışık damlası). Sağ üstte çember adı ve kanto numarası.
- **Diyalog kutusu:** Parşömen dokulu. Konuşanın portresi görünür ve metin harf harf yazılır.
- **Codex:** Üç sekmeden oluşur: *Verses* (alıntılar), *Souls* (karakterler) ve *Map*. Map, Botticelli tarzında, Cehennem'in kesitini gösteren bir haritadır.
- **Erişilebilirlik:**
  - Ters kontrol, ekran sallanması ve titreme efektleri kapatılabilir.
  - Kolay mod: Resolve azalmaz.
  - "Gözünü kapat" gibi sese dayalı mekaniklerde görsel ipuçları da gösterilir.
  - Metin hızı ve yazı boyutu ayarlanabilir.

---

## 10. Teknik Tasarım

| Konu | Seçim | Gerekçe |
|---|---|---|
| Oyun motoru | **Phaser 3** | Olgun bir 2D tarayıcı motoru. Fizik, kamera, tilemap ve ses desteği hazır gelir. |
| Dil | **TypeScript** | Proje büyüdükçe tip güvenliği hata yakalamayı kolaylaştırır. |
| Derleme | **Vite** | Hızlı geliştirme sunucusu, kolay statik çıktı. |
| Haritalar | **Tiled** (`.tmj` JSON) | Phaser ile doğrudan uyumlu, görsel harita editörü. |
| Diyaloglar | JSON tabanlı diyalog ağacı | Veriye dayalı olduğu için içerik eklemek kod değiştirmeyi gerektirmez. |
| Kayıt | `localStorage` | Kontrol noktası, Codex ve ayarlar burada tutulur. |
| Yayın | **GitHub Pages** | Ücretsizdir ve link ile paylaşılır. |

### 10.1 Klasör yapısı (önerilen)

```
/src
  /scenes       # Boot, Title, DarkWood, Circle1..9, UI
  /entities     # Dante, Virgil, Guardian, Soul, hazards
  /systems      # Dialogue, Codex, SaveLoad, Input, Wind, Ice...
  /data         # dialogues/*.json, codex.json, circles.json
/public
  /assets       # sprites, tilesets, audio, maps
/docs           # GDD ve diğer tasarım belgeleri
```

### 10.2 Çember başına mekanik sistemleri

Her contrapasso mekaniği **tekrar kullanılabilir bir sistem** olarak yazılır. Böylece Purgatorio ve Paradiso da aynı sistemlerden yararlanır:

- `WindField`: rüzgâr kuvvet alanı (Çember 2)
- `SurfaceModifier`: çamur, buz ve kurşun pelerin hız/sürtünme değişiklikleri (Çember 3, 9, Malebolge 6)
- `PatternHazard`: zamanlamalı alev ve kaya şeritleri (Çember 4, 6)
- `VisionModifier`: karartma, sis ve dar görüş (Dis Kapıları, Malebolge 2, Purgatorio 2–3)
- `InputModifier`: ters kontrol ve otomatik koşu (Malebolge 4, Purgatorio 4)

### 10.3 Metin kaynağı ve lisans

- **Longfellow çevirisi (1867)** kamu malıdır. Proje Gutenberg'den alınabilir.
- Modern çevirilerden (Mandelbaum, Hollander vb.) **alıntı yapılmaz**. Bu çeviriler telif hakkı altındadır.
- Doré gravürleri kamu malıdır ve referans olarak kullanılabilir.

---

## 11. Yol Haritası

| Kilometre taşı | İçerik | Başarı ölçütü |
|---|---|---|
| **M0 — Dikey kesit** | Proje iskeleti, Dante hareketi ve atılma, Vergilius takibi, diyalog sistemi, **Karanlık Orman + Çember 2 (Şehvet)** | 10 dakikalık oynanabilir demo GitHub Pages'te yayında olur |
| **M1 — Inferno I** | Kapı, Kharon, Limbo, Çember 3–5, Kerberos | Dis Kapıları'na kadar oynanabilir |
| **M2 — Inferno II** | Dis, Çember 6–7, Minotauros, Geryon | Malebolge'ye kadar oynanabilir |
| **M3 — Inferno III** | Malebolge'nin 10 hendeği, Devler, Kokytos, Lucifer | *The Descent* baştan sona oynanabilir |
| **M4 — Purgatorio** | Yan görünüm, yedi P sistemi, 7 teras | *The Ascent* |
| **M5 — Paradiso** | Uçuş ve ışık sistemleri, 9 küre | *The Light*, oyunun tamamı |

**Neden ilk Çember 2?** Çünkü oyunun bütün ana fikrini küçük bir alanda gösteriyor. Bu bölümde contrapasso mekaniği (rüzgâr), bir bekçi (Minos) ve güçlü bir hikâye anı (Francesca) bir arada.

---

## 12. Açık Sorular

1. **Oyunun adı** ne olsun? *The Descent* mi, yoksa doğrudan *Inferno* mu?
2. Dante'nin bayılmasından sonraki uyanışlar sinematik mi olsun, yoksa doğrudan oynanış mı devam etsin?
3. Malebolge'nin 10 hendeğinin hepsi ayrı mini bölüm mü olsun, yoksa bazıları tek bir uzun bölümde mi birleştirilsin?
4. Grafikler için hazır (ücretsiz/CC0) pixel art paketleri mi kullanılsın, yoksa özgün çizimler mi yapılsın? Prototipte basit geometrik yer tutucularla başlamak öneriliyor.
5. Mobil (dokunmatik) destek hangi aşamada eklensin?
