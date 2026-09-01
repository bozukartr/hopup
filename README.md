# SAPAN

Sapanla potaya at. Süreye karşı basket avı — tek parmakla oynanır.

**Oyna:** [bozukartr.github.io/hopup](https://bozukartr.github.io/hopup)

Tek dosya: `index.html`. Derleme adımı yok, bağımlılık yok — dosyayı bir tarayıcıda
açman yeterli. GitHub Pages'e olduğu gibi yayınlanır.

## Nasıl oynanır

Topa bas, sapanı geri çek ve bırak. Ne kadar çok çekersen o kadar güçlü fırlar.
Yörünge önizlemesi ilk çarpışmada kesilir ve o noktayı işaretler — nereye
gideceğini görürsün.

Pota duvara monteli: panya, çember ve file. Top çemberden **aşağı doğru** geçerse
basket sayılır.

| Atış | Sayı |
|---|---|
| Normal basket | 2 |
| **Temiz atış** — çembere ve panyaya hiç değmeden | 3 |

Her basket saate süre ekler: normal +2,5 sn, temiz atış +4 sn. Süre biterse oyun
biter, başka bitiş yok.

**Seri:** Üst üste her 3 basket çarpanı bir artırır (en fazla ×4). Kaçırırsan
seri sıfırlanır.

## Güçlendirmeler

Havada asılı duran küreler. Toplamak için atışını biraz saptırman gerekir —
bedava değil, bir karar.

| Küre | Etki |
|---|---|
| **Süre** (mavi) | Saate 4 saniye ekler |
| **Geniş pota** (sarı) | 3 atış boyunca çember %50 genişler |
| **Çift atış** (mor) | Top havadayken bir kez daha nişan alıp fırlatırsın |

## Sahalar

Basket sayısı arttıkça saha değişir — palet, mekanik ve zorluk birlikte artar.

`SAHA` → `RÜZGÂR` → `KAYAN POTA` → `ENGEL` → `YÜKSEK` → `FIRTINA`

Sırasıyla: sabit pota, esen rüzgâr, dikey salınan pota, hareketli engel, daha
yüksek ve daralan çember, hepsi birden. Zorluk yolu kapatarak değil, çemberi
daraltıp potayı hızlandırarak artar — engel de yanında her zaman açık bir
koridor bırakır.

## Kontroller

- **Dokunma / fare:** çek ve bırak
- **Esc veya P:** duraklat
- Sekme arka plana geçince oyun kendiliğinden duraklar
- Rekor, en iyi seri ve ses tercihi tarayıcıda saklanır

## Teknik notlar

- Fizik sabit 420×900 birimlik **sanal sahada** işler; ekran yalnızca ölçeklenir.
  Zorluk telefondan tablete aynı kalır, ekran boyutu değişimi koşuyu bozmaz.
- Sabit 60 Hz mantık adımı + kare arası enterpolasyon; yavaş cihazlarda efekt
  bütçesi otomatik düşer.
- Ses WebAudio ile üretilir, dosya indirilmez.
- Çarpışma alt adımlara bölünür; hızlı top çemberi ıskalamaz.
- `prefers-reduced-motion` sarsıntı, parçacık, flaş ve vinyeti kapatır.

## Görsel katman

Sahaya göre değişen iki hızlı parallax arka plan, üç sayı yayı ve boyalı alan
çizgileri, parke zemin, basket anında dalgalanan file, topun dönen basketbol
deseni ve zemin gölgesi, hız çizgileri, tam ekran renk flaşları, seriyle
koyulaşan vinyet, son 10 saniyede kırmızıya dönen saat ve vinyet.

## Testler

`tests/game.test.mjs` oyunu Playwright ile gerçekten oynatıp doğrular: basket
algılama, çember/panya/engel çarpışmaları, sayı ve seri kuralları, saat, saha
ilerlemesi, güçlendirmeler, kayıt ve performans.

Ayrıca **her turun çözülebilirliğini** test eder: oyunun kendi fiziğiyle tüm
açı/güç ızgarasını deneyip o kurulumdan basket atmanın bir yolu olduğunu
doğrular.

Bu yalnızca test değil, oyunun kendi güvencesi: her tur kurulurken oyun,
balistik çözümlerle tohumlanmış bir arama çalıştırıp kurulumun çözülebilir
olduğunu doğrular; olmuyorsa kurulumu kademeli gevşetip yeniden dener. Arama
kare içi süre bütçesine bağlıdır (ölçümde ortanca 1,8 ms, en kötü 9,2 ms), bütçe
biterse engelsiz ve salınımsız bir kuruluma düşer. Böylece **imkânsız tur
üretilemez** ve tur geçişinde kare düşmez.

```
npm i -D playwright && npx playwright install chromium
node tests/game.test.mjs
```
